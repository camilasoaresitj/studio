import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;

export async function GET(_: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;

  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({ error: 'As credenciais da API da Cargo-flows não estão configuradas.' }, { status: 500 });
  }

  try {
    // 1. Criar o shipment corretamente via formData[]
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

    const created = await create.json();
    console.log('🚢 Resultado do createShipment:', created);

    if (!create.ok) {
      return NextResponse.json({ error: 'Erro ao criar shipment', detail: created }, { status: create.status });
    }

    // 2. Esperar alguns segundos
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 3. Consultar o shipment
    const res = await fetch(
      `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}`,
      {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
      }
    );

    const data = await res.json();
    console.log('📦 Resultado do shipment GET:', data);

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao buscar shipment', detail: data }, { status: res.status });
    }

    // 4. Extrair eventos relevantes
    const eventos = data.flatMap((shipment: any) =>
      (shipment.shipmentEvents || []).map((ev: any) => ({
        eventName: ev.name,
        location: ev.location,
        actualTime: ev.actualTime || ev.estimateTime
      }))
    );

    return NextResponse.json(eventos);
  } catch (err: any) {
    console.error('Erro inesperado na API de rastreamento:', err);
    return NextResponse.json({ error: 'Erro inesperado', detail: err.message }, { status: 500 });
  }
}
