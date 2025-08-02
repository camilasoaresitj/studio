
// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';
import { buildTrackingPayload } from '@/lib/buildTrackingPayload';
import { findCarrierByName } from '@/lib/carrier-data';
import { getShipmentById } from '@/app/actions';
import { Milestone, ContainerDetail, TransshipmentDetail } from '@/lib/shipment-data';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;
const BASE_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1';
const SHIPMENT_URL = `${BASE_URL}/shipments`;
// Correct the CREATE_URL to include shipmentType as a query parameter
const CREATE_URL = `${BASE_URL}/createShipment?shipmentType=INTERMODAL_SHIPMENT`;

async function safelyParseJSON(response: Response) {
    const text = await response.text();
    try {
        if (text === '') return null;
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse API response:", text.substring(0, 500));
        throw new Error(`Failed to parse API response. Content received: ${text.substring(0, 200)}`);
    }
}

const getAuthHeaders = () => {
    if (!API_KEY || !ORG_TOKEN) {
        throw new Error('Cargo-flows API credentials are not configured.');
    }
    return {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};

// Helper to transform Cargo-flows events into our Milestone format
const transformEventsToMilestones = (events: any[], transshipments: any[]): Milestone[] => {
    if (!events) return [];
    
    // Create a set of transshipment port names for easy lookup
    const transshipmentPorts = new Set(transshipments.map(t => t.port).filter(Boolean));

    return events.map(event => {
        const isTransshipmentEvent = event.location?.portName && transshipmentPorts.has(event.location.portName);
        
        let status: Milestone['status'] = 'pending';
        if (event.status === 'COMPLETED') {
            status = 'completed';
        } else if (event.status === 'IN_TRANSIT' || event.status === 'IN_PROGRESS') {
            status = 'in_progress';
        }

        return {
            name: event.milestoneName || 'Status Update',
            status: status,
            predictedDate: event.estimatedDate ? new Date(event.estimatedDate) : null,
            effectiveDate: event.actualDate ? new Date(event.actualDate) : null,
            details: event.location?.portName ? `Local: ${event.location.portName}` : event.remarks,
            isTransshipment: isTransshipmentEvent,
        };
    }).filter(m => m.predictedDate || m.effectiveDate); // Only include milestones with a date
};

// Helper to transform Cargo-flows containers to our format
const transformContainers = (containers: any[]): ContainerDetail[] => {
    if (!containers) return [];
    const containerArray = Array.isArray(containers) ? containers : [containers];
    return containerArray.map(c => ({
        id: c.containerId || c.containerNumber,
        number: c.containerNumber,
        seal: c.sealNumber || 'N/A',
        tare: `${c.tareWeight || 0} ${c.weightUom || 'KG'}`,
        grossWeight: `${c.grossWeight || 0} ${c.weightUom || 'KG'}`,
        type: c.containerType,
    }));
};

// Helper to extract transshipment details
const extractTransshipments = (legs: any): TransshipmentDetail[] => {
    if (!legs) return [];
    const legsArray = Array.isArray(legs) ? legs : [legs];
    if (legsArray.length <= 1) return [];

    // Transshipments are intermediate legs
    return legsArray.slice(0, -1).map((leg: any, index: number) => ({
        id: `ts-${index}`,
        port: leg.destination?.portName || 'Unknown',
        vessel: leg.vesselName || 'N/A',
        eta: leg.arrivalDate ? new Date(leg.arrivalDate) : undefined,
        etd: legsArray[index + 1]?.departureDate ? new Date(legsArray[index + 1].departureDate) : undefined,
    }));
};


export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'bookingNumber') as 'bookingNumber' | 'containerNumber' | 'mblNumber';
  const carrierName = url.searchParams.get('carrierName');
  
  let finalPayload: any = null;

  try {
    const headers = getAuthHeaders();
    
    // Construct the GET URL with carrierName if available, which is crucial for finding existing shipments.
    let getShipmentUrl = `${SHIPMENT_URL}?shipmentType=INTERMODAL_SHIPMENT&${type}=${trackingId}`;
    if (carrierName) {
        getShipmentUrl += `&carrierName=${encodeURIComponent(carrierName)}`;
    }

    console.log('➡️  Polling for Shipment:', getShipmentUrl);
    
    const getRes = await fetch(getShipmentUrl, { headers, cache: 'no-store' });
    
    if (getRes.ok && getRes.status !== 204) {
        const data = await safelyParseJSON(getRes);
        const firstShipment = Array.isArray(data) ? data[0] : data;
        
        if (firstShipment) {
             console.log('✅ Shipment found successfully.');

             const transshipments = extractTransshipments(firstShipment.shipmentLegs);

             // Map the detailed data from the API response
             const mappedData = {
                vesselName: firstShipment.vesselName,
                voyageNumber: firstShipment.voyageNumber,
                etd: firstShipment.departureDate ? new Date(firstShipment.departureDate) : null,
                eta: firstShipment.arrivalDate ? new Date(firstShipment.arrivalDate) : null,
                origin: firstShipment.origin?.portName,
                destination: firstShipment.destination?.portName,
                containers: transformContainers(firstShipment.containers),
                transshipments: transshipments,
                milestones: transformEventsToMilestones(firstShipment.shipmentEvents, transshipments),
             };

             if (firstShipment.state === 'PROCESSING' && firstShipment.fallback) {
                return NextResponse.json({
                    status: 'processing',
                    message: 'Shipment is being processed, some data might be from fallback.',
                    shipment: firstShipment.fallback,
                }, { status: 202 });
            }
             return NextResponse.json({ status: 'ready', shipment: mappedData });
        }
    }
    
    console.log(`ℹ️ Shipment not found for ${type} ${trackingId}. Attempting to create...`);
    
    const carrier = carrierName ? findCarrierByName(carrierName) : null;
    // Use the full carrier name for oceanLine as per API behavior.
    const oceanLine = carrier?.name || undefined;
    
    // Fetch full internal shipment details to enrich the creation payload.
    const internalShipment = await getShipmentById(trackingId); 

    finalPayload = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: oceanLine, shipment: internalShipment });
    
    console.log("📦 Creating Shipment with payload:", JSON.stringify(finalPayload, null, 2));
    const createRes = await fetch(CREATE_URL, { method: 'POST', headers, body: JSON.stringify(finalPayload) });

    if (createRes.ok) {
        console.log('✅ Shipment creation initiated. The frontend will now poll for the result.');
        return NextResponse.json({
            status: 'creating',
            message: 'Shipment creation has been initiated. The system will now check for the tracking data to become available.',
        }, { status: 202 });
    }

    const errorBody = await safelyParseJSON(createRes);
    console.error(`❌ Failed to create shipment. Status: ${createRes.status}`, errorBody);
    
    return NextResponse.json({
        status: 'not_found',
        message: 'The shipment could not be found, and an attempt to create it failed. This might be due to a data sync delay. The system will keep trying.',
        error: errorBody?.errors?.[0]?.message || 'Unknown creation error',
        payload: finalPayload,
        diagnostic: errorBody
    }, { status: 400 });


  } catch (err: any) {
    console.error("❌ GENERAL ERROR IN TRACKING ROUTE:", err);
    return NextResponse.json({
      error: 'Unexpected error in the tracking server.',
      detail: err.message,
      payload: finalPayload,
    }, { status: 500 });
  }
}
