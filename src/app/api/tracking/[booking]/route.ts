
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
        if (text === '') return null; // Handle empty responses gracefully
        return JSON.parse(text);
    } catch (e) {
        if (text.trim().toLowerCase().startsWith('<html>')) {
            console.error("Received HTML response instead of JSON:", text.substring(0, 500));
            // This specific error message will be caught and shown to the user.
            throw new Error("A API de rastreamento retornou uma resposta inesperada (HTML). Verifique se o número de rastreamento é válido para a transportadora selecionada e se as chaves de API estão corretas.");
        }
        // For other parsing errors, throw a more generic message.
        throw new Error(`Falha ao analisar a resposta da API. Conteúdo recebido: ${text.substring(0, 200)}`);
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

  const CREATE_URL = `${BASE_URL}/createShipments`;
  const SHIPMENT_URL = `${BASE_URL}/shipments`;

  try {
    const headers = getAuthHeaders();
    
    const getShipmentUrl = `${SHIPMENT_URL}?shipmentType=INTERMODAL_SHIPMENT&shipmentReferenceNumber=${trackingId}`;
    
    console.log('➡️  GET Shipment URL:', getShipmentUrl);
    let res = await fetch(getShipmentUrl, { headers });
    
    let data;
    if (res.status !== 204) {
      data = await safelyParseJSON(res);
    }

    if (!skipCreate && (res.status === 204 || (Array.isArray(data) && data.length === 0) || (data && Object.keys(data).length === 0) )) {
      const carrierInfo = findCarrierByName(carrierName || '');

      if (!carrierName || !carrierInfo || !carrierInfo.scac) {
          return NextResponse.json({
            error: 'Transportadora inválida ou não encontrada.',
            detail: `Nenhuma transportadora com nome '${carrierName}' e código SCAC foi localizada. Verifique o nome e tente novamente.`
          }, { status: 400 });
      }

      if (!trackingId) {
        return NextResponse.json({
          error: 'Payload incompleto',
          detail: 'O número de rastreamento é obrigatório.'
        }, { status: 400 });
      }
      
      const payload = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: carrierInfo.scac });
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
        try { 
            errorBody = JSON.parse(rawResponseText); 
        } catch { 
            errorBody = rawResponseText; 
        }
        
        const detailMessage = typeof errorBody === 'object' && errorBody !== null && 'message' in errorBody 
            ? (errorBody as any).message 
            : rawResponseText;

        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows.',
          detail: detailMessage,
          payloadSent: payload,
        }, { status: createRes.status });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      const getShipmentUrlAfterCreate = `${SHIPMENT_URL}?shipmentType=INTERMODAL_SHIPMENT&shipmentReferenceNumber=${trackingId}`;
      console.log('➡️  GET Shipment URL (After Create):', getShipmentUrlAfterCreate);
      res = await fetch(getShipmentUrlAfterCreate, { headers });
      
      if (res.status !== 204) {
        data = await safelyParseJSON(res);
      }
    }

    const firstShipment = Array.isArray(data) ? data[0] : data;
    
    console.log('📥 GET Shipment Response Body (parsed):', JSON.stringify(firstShipment, null, 2));


    if (firstShipment?.state === 'PROCESSING' && firstShipment.fallback) {
        return NextResponse.json({
            status: 'processing',
            message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
            shipment: firstShipment.fallback,
        }, { status: 202 });
    }

    if (res.status === 204 || !firstShipment || Object.keys(firstShipment).length === 0) {
        return NextResponse.json({
            status: 'processing',
            message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
        }, { status: 202 });
    }

    const eventos = (firstShipment?.shipmentEvents || []).map((ev: any) => ({
      eventName: ev.name,
      location: ev.location,
      actualTime: ev.actualTime || ev.estimateTime,
    }));

    return NextResponse.json({ status: 'ready', eventos, shipment: firstShipment });
  } catch (err: any) {
    // This block will now catch errors from safelyParseJSON, including the HTML one.
    console.error("ERRO GERAL NA ROTA DE TRACKING:", err);
    return NextResponse.json({
      error: 'Erro inesperado no servidor de rastreamento.',
      detail: err.message, // The clear message from safelyParseJSON will be here
    }, { status: 500 });
  }
}
