// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOFLOWS_API_KEY || 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN || '9H31zRWYCGihV5U3th5JJXZI3h7LGen6';

export async function GET(_: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;

  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({ error: 'As credenciais da API da Cargo-flows não estão configuradas.' }, { status: 500 });
  }

  try {
    // 1. Criar o shipment com formData[]
    const create = await fetch('https://connect.cargoes.com/flow/api/public_tracking/v1/createShipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN
      },
      body: JSON.stringify({
        formData: [
          {
            uploadType: 'FORM_BY_BOOKING_NUMBER',
            bookingNumber,
            shipmentType: 'INTERMODAL_SHIPMENT'
          }
        ]
      })
    });

    const contentTypeCreate = create.headers.get('content-type');
    if (!create.ok || !contentTypeCreate?.includes('application/json')) {
      const raw = await create.text();
      return NextResponse.json({
        error: 'Erro inesperado ao criar shipment.',
        statusCode: create.status,
        contentType: contentTypeCreate,
        raw: raw.slice(0, 500)
      }, { status: 500 });
    }

    const created = await create.json();

    // 2. Aguardar tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Buscar shipment
    const res = await fetch(
      `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}`,
      {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
      }
    );

    const contentType = res.headers.get('content-type');
    if (res.status === 204) {
      return NextResponse.json({
        status: 'processing',
        message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis. Isso é comum nos primeiros minutos após a criação.',
        fallback: {
          eventName: 'Rastreamento em processamento',
          location: 'Aguardando confirmação do armador',
          actualTime: new Date().toISOString()
        }
      }, { status: 202 });
    }

    if (!res.ok || !contentType?.includes('application/json')) {
      const raw = await res.text();
      return NextResponse.json({
        error: 'Erro inesperado ao consultar a Cargoes Flow.',
        statusCode: res.status,
        contentType,
        raw: raw.slice(0, 500)
      }, { status: 500 });
    }

    const data = await res.json();

    // Extrair eventos
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
      error: 'Erro inesperado no rastreamento.',
      detail: err.message,
      suggestion: 'Failed to generate tracking information. Please try again.'
    }, { status: 500 });
  }
}
