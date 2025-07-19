// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';

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
  let carrierCode = url.searchParams.get('carrierCode');
  let carrierName = url.searchParams.get('carrierName');

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
      if (!carrierCode && carrierName) {
        if (!cachedCarriers || Date.now() - lastCacheTime > CACHE_DURATION) {
          const carrierListRes = await fetch(`${BASE_URL}/carrierList`, {
            headers: {
              'X-DPW-ApiKey': API_KEY,
              'X-DPW-Org-Token': ORG_TOKEN
            }
          });
          cachedCarriers = await carrierListRes.json();
          lastCacheTime = Date.now();
        }

        const carrier = cachedCarriers.find((c: any) => c.carrierName.toLowerCase() === carrierName.toLowerCase());

        if (!carrier) {
          return NextResponse.json({
            error: 'Carrier não encontrado.',
            detail: `Nenhum armador com nome ${carrierName} foi localizado.`
          }, { status: 400 });
        }

        if (!carrier.supportsTrackByBookingNumber) {
          return NextResponse.json({
            error: 'Este armador não suporta rastreamento por Booking Number.',
            detail: `carrierName: ${carrier.carrierName}, utilize MBL.`
          }, { status: 400 });
        }

        carrierCode = carrier.carrierScac;
        carrierName = carrier.carrierName;
        console.log('Carrier resolved from carrierList:', carrier);
      }

      if (!carrierCode || !carrierName) {
        return NextResponse.json({
          error: 'Erro ao registrar o embarque.',
          detail: 'O código e o nome do armador são obrigatórios.'
        }, { status: 400 });
      }
      
      const payload = {
        formData: [{
          uploadType: 'FORM_BY_BOOKING_NUMBER',
          bookingNumber,
          shipmentType: 'INTERMODAL_SHIPMENT',
          carrierCode,
          oceanLine: carrierName
        }]
      };

      console.log('Payload do POST createShipments:', JSON.stringify(payload, null, 2));

      const createRes = await fetch(`${BASE_URL}/createShipments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        },
        body: JSON.stringify(payload)
      });

      console.log('Create shipment status:', createRes.status);

      if (!createRes.ok) {
        const errorRaw = await createRes.text();
        let errorBody;
        try { errorBody = JSON.parse(errorRaw); } catch { errorBody = errorRaw; }

        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows.',
          detail: errorBody
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
          detail: errorText
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
      detail: err.message
    }, { status: 500 });
  }
}
