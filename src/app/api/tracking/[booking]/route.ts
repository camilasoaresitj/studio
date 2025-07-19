import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOES_API_KEY;
const ORG_TOKEN = process.env.CARGOES_ORG_TOKEN;

export async function GET(_: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;

  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({ error: 'As credenciais da API da Cargoes Flow não estão configuradas.' }, { status: 500 });
  }

  try {
    // 1. Cria o shipment
    const createRes = await fetch('https://connect.cargoes.com/flow/api/public_tracking/v1/createShipments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN
      },
      body: JSON.stringify({
        uploadType: 'FORM_BY_BOOKING_NUMBER',
        formData: [{
          bookingNumber,
          shipmentType: 'INTERMODAL_SHIPMENT'
        }]
      })
    });

    const created = await createRes.json();

    if (!createRes.ok) {
      return NextResponse.json({ error: "Erro ao criar shipment", detail: created }, { status: createRes.status });
    }

    // 2. Aguarda 3 segundos para garantir disponibilidade
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Consulta o shipment criado
    const res = await fetch(
      `https://connect.cargoes.com/flow/api/public_tracking/v1/shipment?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}`,
      {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao buscar shipment", detail: data }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: "Falha inesperada", detail: err.message }, { status: 500 });
  }
}
