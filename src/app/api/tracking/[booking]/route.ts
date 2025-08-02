// /src/app/api/tracking/[trackingId]/route.ts
import { NextResponse } from 'next/server';
import { buildTrackingPayload } from '@/lib/buildTrackingPayload';
import { pollShipmentStatus } from '@/lib/shipmentPoller';
import { EnhancedPollingError } from '@/lib/errors';
import { findCarrierByName } from '@/lib/carrier-data';
import { getShipmentById } from '@/app/actions';
import { getAuthHeaders } from '@/lib/apiUtils';

const BASE_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1';
const CREATE_URL = `${BASE_URL}/createShipments`;
const SHIPMENT_URL = `${BASE_URL}/shipments`;


async function attemptCreateShipment(trackingId: string, type: string, carrierName: string | null) {
  const carrier = carrierName ? findCarrierByName(carrierName) : null;
  const oceanLine = carrier?.name || undefined;
  
  const internalShipment = await getShipmentById(trackingId); 

  const payload = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: oceanLine, shipment: internalShipment });
  
  console.log("📦 Creating Shipment with payload:", JSON.stringify(payload, null, 2));

  const createRes = await fetch(CREATE_URL, { 
    method: 'POST', 
    headers: getAuthHeaders(), 
    body: JSON.stringify(payload) 
  });

  if (!createRes.ok) {
    const errorBody = await createRes.text();
    console.error(`❌ Failed to create shipment. Status: ${createRes.status}`, errorBody);
    throw new Error(`API creation failed with status ${createRes.status}: ${errorBody}`);
  }

  return await createRes.json();
}

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'bookingNumber';
  const carrierName = url.searchParams.get('carrierName');

  try {
    // 1. Tentar encontrar shipment existente
    console.log(`Polling for ${type}: ${trackingId}`);
    let pollingResult = await pollShipmentStatus(trackingId, type, carrierName);
    
    if (pollingResult.status === 'found') {
      console.log('✅ Shipment found via polling.');
      return NextResponse.json({
        status: 'success',
        data: pollingResult.shipment
      });
    }

    // 2. Se não encontrado, tentar criar
    console.log(`ℹ️ Shipment not found. Attempting to create...`);
    const createResponse = await attemptCreateShipment(trackingId, type, carrierName);
    console.log(`✅ Creation initiated for ${trackingId}.`, createResponse);
    
    // 3. Verificar novamente após criação
    console.log(`Verifying shipment creation for ${trackingId}...`);
    const verification = await pollShipmentStatus(trackingId, type, carrierName, 8); // More attempts after creation
    
    if (verification.status === 'found') {
        console.log('✅ Shipment found after creation.');
      return NextResponse.json({
        status: 'success',
        data: verification.shipment,
        created: true
      });
    }

    // 4. Se ainda não encontrado, logar e retornar erro
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
