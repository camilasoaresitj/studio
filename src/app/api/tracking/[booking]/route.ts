
// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;
const BASE_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1';
const SHIPMENT_URL = `${BASE_URL}/shipment`;

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
        'X-DPW-Token': ORG_TOKEN,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') || 'bookingNumber') as 'bookingNumber' | 'containerNumber' | 'mblNumber';

  try {
    const headers = getAuthHeaders();
    
    // The only strategy is now to poll for the shipment, not create it.
    const getShipmentUrl = `${SHIPMENT_URL}?${type}=${trackingId}`;
    console.log('➡️  Polling for Shipment:', getShipmentUrl);
    
    const getRes = await fetch(getShipmentUrl, { headers, cache: 'no-store' });
    
    if (getRes.ok && getRes.status !== 204) {
        const data = await safelyParseJSON(getRes);
        const firstShipment = Array.isArray(data) ? data[0] : data;
        
        if (firstShipment) {
             console.log('✅ Shipment found successfully.');
             // Check for processing state with fallback data
             if (firstShipment.state === 'PROCESSING' && firstShipment.fallback) {
                return NextResponse.json({
                    status: 'processing',
                    message: 'Shipment is being processed, some data might be from fallback.',
                    shipment: firstShipment.fallback,
                }, { status: 202 });
            }
             return NextResponse.json({ status: 'ready', shipment: firstShipment });
        }
    }
    
    // If we are here, the shipment was not found (404 or 204)
    console.log(`ℹ️ Shipment not yet found for booking ${trackingId}. The frontend will retry.`);
    return NextResponse.json({
        status: 'not_found',
        message: 'The shipment could not be found. This might be due to a data sync delay. Please wait.',
    }, { status: 404 });

  } catch (err: any) {
    console.error("❌ GENERAL ERROR IN TRACKING ROUTE:", err);
    return NextResponse.json({
      error: 'Unexpected error in the tracking server.',
      detail: err.message,
    }, { status: 500 });
  }
}
