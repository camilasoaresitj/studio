
import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;

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
    // 1. Tentar buscar o shipment diretamente
    const getShipmentUrl = `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=50`;
    let res = await fetch(getShipmentUrl, {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
    });
    
    let data;
    if (res.ok) {
        data = await res.json();
    } else {
        // Se a primeira busca falhar, não consumimos o corpo ainda, apenas verificamos o status.
        // O corpo será consumido abaixo apenas se necessário.
    }
    
    // Se não encontrado e permitido criar, tenta registrar
    if (!skipCreate && (!res.ok || (Array.isArray(data) && data.length === 0))) {
      console.log(`Shipment ${bookingNumber} not found, attempting to create...`);

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

      if (!createRes.ok) {
        let errorBody;
        try {
          // AQUI lemos o corpo da resposta de ERRO da criação.
          errorBody = await createRes.json();
        } catch {
          errorBody = await createRes.text();
        }
        return NextResponse.json({ error: 'Erro ao registrar o embarque na Cargo-flows.', detail: errorBody }, { status: createRes.status });
      }

      // Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Rebuscar
      res = await fetch(getShipmentUrl, { 
          headers: { 'X-DPW-ApiKey': API_KEY, 'X-DPW-Org-Token': ORG_TOKEN } 
      });

      if (res.ok) {
        data = await res.json(); // Lemos o corpo da SEGUNDA busca bem-sucedida.
      } else {
        const errorText = await res.text(); // Lemos o corpo da SEGUNDA busca com erro.
        return NextResponse.json({
          error: 'Erro ao buscar shipment após a criação.',
          detail: errorText
        }, { status: res.status });
      }
    }

    if (!res.ok) {
      // Se chegamos aqui, a primeira busca falhou e não tentamos criar.
      const errorText = await res.text();
      return NextResponse.json({
        error: 'Erro ao buscar shipment na Cargo-flows.',
        detail: errorText
      }, { status: res.status });
    }
    
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

    const eventos = data.flatMap((shipment: any) =>
      (shipment.shipmentEvents || []).map((ev: any) => ({
        eventName: ev.name,
        location: ev.location,
        actualTime: ev.actualTime || ev.estimateTime
      }))
    );
    
    return NextResponse.json({ status: 'ready', eventos });

  } catch (err: any) {
    return NextResponse.json({ error: 'Erro inesperado no servidor.', detail: err.message }, { status: 500 });
  }
}
