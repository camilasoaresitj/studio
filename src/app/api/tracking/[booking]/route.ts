
// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;

export async function GET(_: Request, { params }: { params: { booking: string } }) {
  const bookingNumber = params.booking;

  if (!API_KEY || !ORG_TOKEN) {
    return NextResponse.json({
      error: 'As credenciais da API da Cargo-flows não estão configuradas.',
      detail: 'Verifique as variáveis de ambiente CARGOFLOWS_API_KEY e CARGOFLOWS_ORG_TOKEN.'
    }, { status: 500 });
  }

  try {
    // 1. Tentar buscar o shipment diretamente
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
    
    // Se a busca inicial retornar 204 ou um array vazio, significa que precisamos registrar o embarque
    if (res.status === 204 || (Array.isArray(data) && data.length === 0)) {
        console.log(`Shipment ${bookingNumber} not found, attempting to create...`);
        
        // 2. Criar o shipment se não for encontrado
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
            const errorBody = await createRes.json();
            return NextResponse.json({ error: 'Erro ao registrar o embarque na Cargo-flows.', detail: errorBody }, { status: createRes.status });
        }
        
        // 3. Aguardar o processamento
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 4. Buscar novamente após a criação
        res = await fetch(
          `https://connect.cargoes.com/flow/api/public_tracking/v1/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${bookingNumber}&_limit=1`,
          { headers: { 'X-DPW-ApiKey': API_KEY, 'X-DPW-Org-Token': ORG_TOKEN } }
        );
        data = await res.json();
    }
    
    // 5. Processar a resposta final
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

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao buscar shipment após a criação.', detail: data }, { status: res.status });
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
