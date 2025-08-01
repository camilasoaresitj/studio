
// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';
import { buildTrackingPayload } from '@/lib/buildTrackingPayload';
import { findCarrierByName } from '@/lib/carrier-data';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;
const BASE_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1';

let cachedCarriers: any[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

async function safelyParseJSON(response: Response) {
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        if (text.trim().startsWith('<html>')) {
            console.error("Received HTML response instead of JSON:", text.substring(0, 500));
            throw new Error("A API de rastreamento retornou uma resposta inesperada (HTML). Verifique se o número de rastreamento é válido para a transportadora selecionada e se as chaves de API estão corretas.");
        }
        throw new Error(`Resposta inválida da API: ${text}`);
    }
}

const getAuthHeaders = () => {
    if (!API_KEY || !ORG_TOKEN) {
        throw new Error('As credenciais da API da Cargo-flows não estão configuradas.');
    }
    return {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Token': ORG_TOKEN,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};

export async function OPTIONS() {
  try {
    const headers = getAuthHeaders();
    const now = Date.now();
    if (cachedCarriers && now - lastCacheTime < CACHE_DURATION) {
        return NextResponse.json({ carriers: cachedCarriers, cached: true });
    }
    const res = await fetch(`${BASE_URL}/carrierList`, { headers });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Erro na API Cargo-flows: ${res.status} ${errorText}`);
    }
    const list = await res.json();
    cachedCarriers = list;
    lastCacheTime = now;
    return NextResponse.json({ carriers: list, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar lista de carriers', detail: err.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const skipCreate = url.searchParams.get('skipCreate') === 'true';
  const carrierName = url.searchParams.get('carrierName');
  const type = (url.searchParams.get('type') || 'bookingNumber') as 'bookingNumber' | 'containerNumber' | 'mblNumber';

  const CREATE_URL = `${BASE_URL}/createShipments`; // Use plural endpoint
  const SHIPMENT_URL = `${BASE_URL}/shipments`; // Use plural endpoint

  try {
    const headers = getAuthHeaders();
    
    // **CORRECTION:** The API uses a generic 'shipmentReferenceNumber' for GET requests, not the specific type name.
    const getShipmentUrl = `${SHIPMENT_URL}?shipmentType=INTERMODAL_SHIPMENT&shipmentReferenceNumber=${trackingId}`;
    
    console.log('➡️  GET Shipment URL:', getShipmentUrl);
    let res = await fetch(getShipmentUrl, { headers });

    let data;
    if (res.status !== 204) {
      data = await safelyParseJSON(res);
    }

    if (!skipCreate && (res.status === 204 || (Array.isArray(data) && data.length === 0) || (data && Object.keys(data).length === 0) )) {
      const carrierInfo = findCarrierByName(carrierName || '');

      if (!carrierName || !carrierInfo) {
          return NextResponse.json({
            error: 'Transportadora não encontrada.',
            detail: `Nenhuma transportadora com nome '${carrierName}' foi localizada em nossa base de dados. Verifique o nome e tente novamente.`
          }, { status: 400 });
      }

      if (!trackingId) {
        return NextResponse.json({
          error: 'Payload incompleto',
          detail: 'O número de rastreamento é obrigatório.'
        }, { status: 400 });
      }
      
      const payload = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: carrierInfo.name });
      console.log('➡️  CREATE Shipment Payload:', JSON.stringify(payload, null, 2));

      const createRes = await fetch(CREATE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      const rawResponseText = await createRes.text();
      console.log('📥 CREATE Shipment Response Status:', createRes.status);
      console.log('📥 CREATE Shipment Response Body (raw):', rawResponseText);

      if (!createRes.ok) {
        let errorBody;
        try { errorBody = JSON.parse(rawResponseText); } catch { errorBody = rawResponseText; }
        
        const detailMessage = typeof errorBody === 'string' && errorBody.toLowerCase().includes('<html>')
            ? 'Resposta HTML inválida recebida do servidor CargoFlows. O payload pode estar incompleto ou mal formatado.'
            : errorBody;

        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows.',
          detail: detailMessage,
          payloadSent: payload,
        }, { status: createRes.status });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Use the corrected URL for the post-creation GET request as well
      const getShipmentUrlAfterCreate = `${SHIPMENT_URL}?shipmentType=INTERMODAL_SHIPMENT&shipmentReferenceNumber=${trackingId}`;
      console.log('➡️  GET Shipment URL (After Create):', getShipmentUrlAfterCreate);
      res = await fetch(getShipmentUrlAfterCreate, { headers });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({
          error: 'Erro ao buscar shipment após a criação.',
          detail: errorText,
        }, { status: res.status });
      }

      if (res.status !== 204) {
        data = await safelyParseJSON(res);
      }
    }

    // Handle case where shipment is registered but tracking data is not yet available
    if (res.status === 204 || (Array.isArray(data) && data.length === 0) || (data && Object.keys(data).length === 0)) {
        return NextResponse.json({
            status: 'processing',
            message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
        }, { status: 202 });
    }

    const firstShipment = Array.isArray(data) ? data[0] : data;
    
    console.log('📥 GET Shipment Response Body (parsed):', JSON.stringify(firstShipment, null, 2));


    // If still processing, return the partial data
    if (firstShipment.state === 'PROCESSING') {
        return NextResponse.json({
            status: 'processing',
            message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
            shipment: firstShipment, // Send partial shipment data
        }, { status: 202 });
    }

    const eventos = (firstShipment?.shipmentEvents || []).map((ev: any) => ({
      eventName: ev.name,
      location: ev.location,
      actualTime: ev.actualTime || ev.estimateTime,
    }));

    return NextResponse.json({ status: 'ready', eventos, shipment: firstShipment });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Erro inesperado no servidor.',
      detail: err.message,
    }, { status: 500 });
  }
}
