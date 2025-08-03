
// /src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';
import { buildTrackingPayload } from '@/lib/buildTrackingPayload';
import { pollShipmentStatus } from '@/lib/shipmentPoller';
import { EnhancedPollingError } from '@/lib/errors';
import { findCarrierByName } from '@/lib/carrier-data';
import { getShipmentById } from '@/app/actions';
import { getAuthHeaders } from '@/lib/apiUtils';

const BASE_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1';
const CREATE_URL = `${BASE_URL}/createShipments`;

// Type guard to validate the tracking type
type TrackingType = "containerNumber" | "mblNumber" | "bookingNumber";
function isValidTrackingType(type: string): type is TrackingType {
    return ["containerNumber", "mblNumber", "bookingNumber"].includes(type);
}

async function attemptCreateShipment(trackingId: string, type: TrackingType, carrierName: string | null) {
  const carrier = carrierName ? findCarrierByName(carrierName) : null;
  const oceanLine = carrier?.name || undefined;
  
  const internalShipment = await getShipmentById(trackingId); 

  const payload = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: oceanLine, shipment: internalShipment || undefined });
  
  console.log("📦 Creating Shipment with payload:", JSON.stringify(payload, null, 2));

  try {
    const createRes = await fetch(CREATE_URL, { 
      method: 'POST', 
      headers: getAuthHeaders(), 
      body: JSON.stringify(payload) 
    });

    const contentType = createRes.headers.get('content-type') || '';
    if (!createRes.ok || !contentType.includes('application/json')) {
      const errorBody = await createRes.text();
      console.error(`❌ Failed to create shipment. Status: ${createRes.status}`, `Content-Type: ${contentType}`, errorBody.substring(0, 500));
      throw new EnhancedPollingError(new Error(`API creation failed or returned non-JSON response with status ${createRes.status}`), trackingId, 1, payload);
    }
    
    return await createRes.json();
    
  } catch (error) {
    if (error instanceof EnhancedPollingError) {
      throw error;
    }
    throw new EnhancedPollingError(error, trackingId, 1, payload);
  }
}

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const typeParam = url.searchParams.get('type') || 'bookingNumber';
  
  if (!isValidTrackingType(typeParam)) {
      return NextResponse.json({
          status: 'error',
          message: `Invalid tracking type provided: ${typeParam}. Must be one of 'bookingNumber', 'containerNumber', or 'mblNumber'.`
      }, { status: 400 });
  }

  const carrierName = url.searchParams.get('carrierName');

  try {
    console.log(`Polling for ${typeParam}: ${trackingId}`);
    let pollingResult = await pollShipmentStatus(trackingId, typeParam, carrierName);
    
    if (pollingResult.status === 'found') {
      console.log('✅ Shipment found via polling.');
      return NextResponse.json({
        status: 'success',
        data: pollingResult.shipment
      });
    }

    console.log(`ℹ️ Shipment not found. Attempting to create...`);
    const createResponse = await attemptCreateShipment(trackingId, typeParam, carrierName);
    console.log(`✅ Creation initiated for ${trackingId}.`, createResponse);
    
    console.log(`Verifying shipment creation for ${trackingId}...`);
    const verification = await pollShipmentStatus(trackingId, typeParam, carrierName, 8);
    
    if (verification.status === 'found') {
        console.log('✅ Shipment found after creation.');
      return NextResponse.json({
        status: 'success',
        data: verification.shipment,
        created: true
      });
    }

    console.error(`❌ Shipment still not found after creation attempt for ${trackingId}.`);
    throw new EnhancedPollingError(new Error("Shipment not available after creation request."), trackingId, verification.attempts);

  } catch (error) {
    if (error instanceof EnhancedPollingError) {
      return NextResponse.json(error.toResponse(), { status: 503 });
    }
    
    console.error("❌ GENERAL ERROR IN TRACKING ROUTE:", error);
    return NextResponse.json({
      status: 'error',
      message: 'Unexpected tracking error',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
