// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';

const API_KEY = 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
const ORG_TOKEN = '9H31zRWYCGihV5U3th5JJXZI3h7LGen6';

export async function GET(_: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;

  try {
    const res = await fetch(
      `https://connect.cargoes.com/flow/api/public_tracking/v1/shipment?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}`,
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
        message: 'O embarque foi encontrado, mas os dados de rastreio ainda não estão disponíveis.',
        fallback: {
          eventName: 'Rastreamento em processamento',
          location: 'Aguardando dados do armador',
          actualTime: new Date().toISOString()
        }
      }, { status: 202 });
    }

    if (!res.ok || !contentType?.includes('application/json')) {
      const raw = await res.text();
      return NextResponse.json({
        error: 'Erro inesperado ao consultar rastreamento.',
        statusCode: res.status,
        raw: raw.slice(0, 500)
      }, { status: 500 });
    }

    const data = await res.json();

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
      error: 'Erro inesperado ao rastrear booking.',
      detail: err.message
    }, { status: 500 });
  }
}
