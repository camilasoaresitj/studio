
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

// Endpoint para listar carriers com cache de 24h
export async function OPTIONS() {
  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({
      error: 'Credenciais ausentes',
      detail: 'Configure CARGOFLOWS_API_KEY e CARGOFLOWS_ORG_TOKEN.'
    }, { status: 500 });
  }

  const now = Date.now();
  if (cachedCarriers && now - lastCacheTime < CACHE_DURATION) {
    return NextResponse.json({ carriers: cachedCarriers, cached: true });
  }

  try {
    const res = await fetch(`${BASE_URL}/carrierList`, {
      headers: {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN
      }
    });
    const list = await res.json();
    cachedCarriers = list;
    lastCacheTime = now;
    return NextResponse.json({ carriers: list, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao buscar lista de carriers', detail: err.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;
  const url = new URL(req.url);
  const skipCreate = url.searchParams.get('skipCreate') === 'true';
  const carrierName = url.searchParams.get('carrierName');

  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({
      error: 'As credenciais da API da Cargo-flows não estão configuradas.',
      detail: 'Verifique as variáveis de ambiente CARGOFLOWS_API_KEY e CARGOFLOWS_ORG_TOKEN.'
    }, { status: 500 });
  }

  try {
    let res = await fetch(`${BASE_URL}/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=1`, {
      headers: {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN
      }
    });

    let data = await res.json();

    if (!skipCreate && (res.status === 204 || (Array.isArray(data) && data.length === 0))) {
      const carrierInfo = findCarrierByName(carrierName || '');

      if (carrierName && (!carrierInfo || !carrierInfo.scac)) {
          return NextResponse.json({
            error: 'Carrier não encontrado.',
            detail: `Nenhum armador com nome ${carrierName} foi localizado.`
          }, { status: 400 });
      }

      if (!bookingNumber) {
        return NextResponse.json({
          error: 'Payload incompleto',
          detail: 'O número do booking é obrigatório.'
        }, { status: 400 });
      }
      
      const payload = buildTrackingPayload({ bookingNumber });

      console.log('🧾 Enviando payload para Cargo-flows:', JSON.stringify(payload, null, 2));

      const createRes = await fetch(`${BASE_URL}/createShipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📥 Resposta Cargo-flows status:', createRes.status);
      const raw = await createRes.text();
      console.log('📥 Body (raw):', raw);

      if (!createRes.ok) {
        let errorBody;
        try { errorBody = JSON.parse(raw); } catch { errorBody = raw; }
        
        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows.',
          detail: typeof errorBody === 'string' && errorBody.includes('<html>')
            ? 'Resposta HTML inválida recebida do servidor CargoFlows. O payload pode estar incompleto ou mal formatado.'
            : errorBody,
          payload: payload,
        }, { status: createRes.status });
      }

      await new Promise(resolve => setTimeout(resolve, 5000));

      res = await fetch(`${BASE_URL}/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=1`, {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({
          error: 'Erro ao buscar shipment após a criação.',
          detail: errorText,
        }, { status: res.status });
      }

      data = await res.json();
    }

    if (res.status === 204 || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({
        status: 'processing',
        message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
        fallback: {
          eventName: 'Rastreamento em processamento',
          location: 'Aguardando dados do armador',
          actualTime: new Date().toISOString()
        }
      }, { status: 202 });
    }

    const eventos = data.flatMap((shipment: any) =>
      (shipment.shipmentEvents || []).map((ev: any) => ({
        eventName: ev.name,
        location: ev.location,
        actualTime: ev.actualTime || ev.estimateTime
      }))
    );

    return NextResponse.json({ status: 'ready', eventos });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Erro inesperado no servidor.',
      detail: err.message,
    }, { status: 500 });
  }
}
