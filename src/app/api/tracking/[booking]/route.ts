
import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;

type Evento = {
  eventName: string;
  location: string;
  actualTime: string;
};

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;
  const url = new URL(req.url);
  const skipCreate = url.searchParams.get('skipCreate') === 'true';

  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({
      error: 'As credenciais da API da Cargo-flows não estão configuradas.',
      detail: 'Verifique as variáveis de ambiente CARGOFLOWS_API_KEY e CARGOFLOWS_ORG_TOKEN.'
    }, { status: 500 });
  }

  try {
    // 1. Buscar shipment diretamente
    let res = await fetch(
      `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=1`,
      {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
      }
    );

    let data = await res.json();

    // 2. Se não encontrado, tentar criar (se não for skipCreate)
    if (!skipCreate && (res.status === 204 || (Array.isArray(data) && data.length === 0))) {
      console.log(`Shipment ${bookingNumber} not found. Creating...`);

      const createRes = await fetch('https://connect.cargoes.com/flow/api/public_tracking/v1/createShipments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        },
        body: JSON.stringify({
          formData: [{
            uploadType: 'FORM_BY_BOOKING_NUMBER',
            bookingNumber,
            shipmentType: 'INTERMODAL_SHIPMENT'
          }]
        })
      });

      // ✅ Evita "Body is unusable"
      if (!createRes.ok) {
        const errorRaw = await createRes.text();
        let errorBody;
        try {
          errorBody = JSON.parse(errorRaw);
        } catch {
          errorBody = errorRaw;
        }

        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows.',
          detail: errorBody
        }, { status: createRes.status });
      }

      // 3. Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 4. Buscar novamente
      res = await fetch(
        `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=1`,
        {
          headers: {
            'X-DPW-ApiKey': API_KEY,
            'X-DPW-Org-Token': ORG_TOKEN
          }
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        return NextResponse.json({
          error: 'Erro ao buscar shipment após a criação.',
          detail: errorText
        }, { status: res.status });
      }

      data = await res.json();
    }

    // 5. Se ainda não houver dados
    if (res.status === 204 || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({
        status: 'processing',
        message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis. Tente novamente em alguns minutos.',
        fallback: {
          eventName: 'Rastreamento em processamento',
          location: 'Aguardando dados do armador',
          actualTime: new Date().toISOString()
        }
      }, { status: 202 });
    }

    // 6. Extrair eventos
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
