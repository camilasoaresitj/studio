
// src/app/api/tracking/[booking]/route.ts
import { NextResponse } from 'next/server';
import { buildTrackingPayload } from '@/lib/buildTrackingPayload';
import { findCarrierByName } from '@/lib/carrier-data';

const API_KEY = process.env.CARGOFLOWS_API_KEY;
const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;
const BASE_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1';
const CREATE_URL = `${BASE_URL}/createShipment`;
const SHIPMENT_URL = `${BASE_URL}/shipment`;

async function safelyParseJSON(response: Response) {
    const text = await response.text();
    try {
        if (text === '') return null;
        return JSON.parse(text);
    } catch (e) {
        // Se a resposta for HTML, é um erro claro da API ou do gateway.
        if (text.trim().toLowerCase().startsWith('<html>')) {
            console.error("Received HTML response instead of JSON:", text.substring(0, 500));
            throw new Error("A API de rastreamento retornou uma resposta inesperada (HTML). Verifique se o número de rastreamento é válido para a transportadora selecionada e se as chaves de API estão corretas.");
        }
        // Se não for JSON nem HTML, mas tiver texto, mostre o texto.
        throw new Error(`Falha ao analisar a resposta da API. Conteúdo recebido: ${text.substring(0, 200)}`);
    }
}

const getAuthHeaders = () => {
    if (!API_KEY || !ORG_TOKEN) {
        throw new Error('As credenciais da API da Cargo-flows não estão configuradas.');
    }
    return {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Token': ORG_TOKEN,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const skipCreate = url.searchParams.get('skipCreate') === 'true';
  const carrierName = url.searchParams.get('carrierName');
  const type = (url.searchParams.get('type') || 'bookingNumber') as 'bookingNumber' | 'containerNumber' | 'mblNumber';

  try {
    const headers = getAuthHeaders();
    
    // 1. Tentar buscar o embarque primeiro
    const getShipmentUrl = `${SHIPMENT_URL}?${type}=${trackingId}`;
    console.log('➡️  GET Shipment URL:', getShipmentUrl);
    let res = await fetch(getShipmentUrl, { headers });
    
    let data;
    // Handle 204 No Content, que significa que o embarque não foi encontrado
    if (res.status === 204) {
      data = null;
    } else if (res.ok) {
      data = await safelyParseJSON(res);
    } else {
      // Se a busca inicial já falhar com um erro (ex: 400, 500), retorne o erro imediatamente.
      const errorBody = await safelyParseJSON(res);
      console.error('❌ GET Shipment Initial Error:', errorBody);
      return NextResponse.json({
          error: 'Erro ao buscar embarque na Cargo-flows.',
          detail: errorBody?.message || JSON.stringify(errorBody),
      }, { status: res.status });
    }


    // 2. Se não encontrou (204 ou array vazio) e não for para pular a criação, crie o embarque.
    if (!skipCreate && (!data || (Array.isArray(data) && data.length === 0))) {
      console.log('ℹ️ Embarque não encontrado. Tentando criar...');
      const carrierInfo = findCarrierByName(carrierName || '');

      if ((type === 'bookingNumber' || type === 'containerNumber') && (!carrierName || !carrierInfo)) {
          return NextResponse.json({
            error: 'Transportadora inválida ou não encontrada.',
            detail: `Nenhuma transportadora com nome '${carrierName}' foi localizada. É obrigatória para este tipo de rastreamento.`
          }, { status: 400 });
      }

      const payload = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: carrierInfo?.name });
      
      console.log('🔍 Diagnóstico de Criação:');
      console.log('URL:', CREATE_URL);
      console.log('Headers:', JSON.stringify(headers, null, 2));
      console.log('Payload:', JSON.stringify(payload, null, 2));

      const createRes = await fetch(CREATE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      if (!createRes.ok) {
        const errorBody = await safelyParseJSON(createRes);
        console.error('❌ CREATE Shipment Error:', errorBody);
        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows.',
          detail: errorBody?.message || JSON.stringify(errorBody),
          payloadSent: payload,
        }, { status: createRes.status });
      }
      
      console.log('✅ Embarque criado com sucesso. Aguardando processamento...');
      // Aguarda um tempo para a API processar o novo embarque
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Busca novamente após a criação
      console.log('➡️  GET Shipment URL (After Create):', getShipmentUrl);
      res = await fetch(getShipmentUrl, { headers });
      
      if (res.status === 204) {
        data = null;
      } else if (res.ok) {
        data = await safelyParseJSON(res);
      } else {
         const errorBody = await safelyParseJSON(res);
         console.error('❌ GET Shipment After Create Error:', errorBody);
         return NextResponse.json({
             error: 'Erro ao buscar embarque após a criação.',
             detail: errorBody?.message || JSON.stringify(errorBody),
         }, { status: res.status });
      }
    }

    const firstShipment = Array.isArray(data) ? data[0] : data;
    
    console.log('📥 GET Shipment Response Body (parsed final):', JSON.stringify(firstShipment, null, 2));

    // Se o embarque foi criado mas ainda está processando
    if (firstShipment?.state === 'PROCESSING' && firstShipment.fallback) {
        return NextResponse.json({
            status: 'processing',
            message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
            shipment: firstShipment.fallback,
        }, { status: 202 });
    }

    // Se a resposta ainda for vazia após a tentativa de criação
    if (!firstShipment || Object.keys(firstShipment).length === 0) {
        return NextResponse.json({
            status: 'processing',
            message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis. Tente novamente em alguns minutos.',
        }, { status: 202 });
    }
    
    // Se o embarque foi encontrado com sucesso
    const eventos = (firstShipment?.shipmentEvents || []).map((ev: any) => ({
      eventName: ev.name,
      location: ev.location,
      actualTime: ev.actualTime || ev.estimateTime,
    }));

    return NextResponse.json({ status: 'ready', eventos, shipment: firstShipment });
  } catch (err: any) {
    console.error("❌ ERRO GERAL NA ROTA DE TRACKING:", err);
    return NextResponse.json({
      error: 'Erro inesperado no servidor de rastreamento.',
      detail: err.message,
    }, { status: 500 });
  }
}
