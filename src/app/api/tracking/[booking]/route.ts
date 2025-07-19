
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
    const getShipmentUrl = `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=50`;
    
    // 1. Tentar buscar o shipment
    let res = await fetch(getShipmentUrl, {
        headers: {
          'X-DPW-ApiKey': API_KEY,
          'X-DPW-Org-Token': ORG_TOKEN
        }
    });

    let data;
    let initialErrorText = null;

    if (res.ok) {
        data = await res.json();
    } else {
        initialErrorText = await res.text(); // Read the error body only once
    }

    const notFound = !res.ok || (Array.isArray(data) && data.length === 0);
    
    // 2. Se não encontrado e permitido criar, tenta registrar
    if (notFound && !skipCreate) {
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
          errorBody = await createRes.json();
        } catch {
          errorBody = await createRes.text();
        }
        return NextResponse.json({ error: 'Erro ao registrar o embarque na Cargo-flows.', detail: errorBody }, { status: createRes.status });
      }

      // Aguardar processamento
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Rebuscar
      res = await fetch(getShipmentUrl, { 
          headers: { 'X-DPW-ApiKey': API_KEY, 'X-DPW-Org-Token': ORG_TOKEN } 
      });

      if (res.ok) {
        data = await res.json();
      } else {
        const errorText = await res.text();
        return NextResponse.json({
          error: 'Erro ao buscar shipment após a criação.',
          detail: errorText
        }, { status: res.status });
      }
    } else if (notFound && skipCreate) {
        return NextResponse.json({
            error: 'Erro ao buscar shipment na Cargo-flows.',
            detail: initialErrorText // Use the error text read earlier
        }, { status: res.status });
    }
    
    // 4. Processar o resultado final
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
