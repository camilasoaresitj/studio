
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
        if (text.trim().toLowerCase().startsWith('<html>')) {
            console.error("Received HTML response instead of JSON:", text.substring(0, 500));
            throw new Error("A API de rastreamento retornou uma resposta inesperada (HTML). Verifique se o número de rastreamento é válido para a transportadora selecionada e se as chaves de API estão corretas.");
        }
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

// Helper function to create a shipment with a given payload
async function tryCreateShipment(payload: any, headers: HeadersInit) {
    console.log('➡️  Tentando criar embarque com payload:', JSON.stringify(payload, null, 2));
    const createRes = await fetch(CREATE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
    return createRes;
}

export async function GET(req: Request, { params }: { params: { booking: string } }) {
  const trackingId = params.booking;
  const url = new URL(req.url);
  const carrierName = url.searchParams.get('carrierName');
  const type = (url.searchParams.get('type') || 'bookingNumber') as 'bookingNumber' | 'containerNumber' | 'mblNumber';

  try {
    const headers = getAuthHeaders();
    
    // 1. Tenta buscar o embarque primeiro
    const getShipmentUrl = `${SHIPMENT_URL}?${type}=${trackingId}`;
    console.log('➡️  GET Shipment URL:', getShipmentUrl);
    const getRes = await fetch(getShipmentUrl, { headers });
    
    if (getRes.ok && getRes.status !== 204) {
        const data = await safelyParseJSON(getRes);
        const firstShipment = Array.isArray(data) ? data[0] : data;
        if (firstShipment) {
             console.log('✅ Embarque encontrado com sucesso na primeira busca.');
             return NextResponse.json({ status: 'ready', shipment: firstShipment });
        }
    }

    // 2. Se não encontrado, tenta criar (com fallbacks)
    console.log('ℹ️ Embarque não encontrado. Iniciando fluxo de criação...');
    const carrier = findCarrierByName(carrierName || '');

    // Tentativa 1: Criar com SCAC Code (padrão da indústria)
    const payloadWithScac = buildTrackingPayload({ type, trackingNumber: trackingId, oceanLine: carrier?.scac });
    let createRes = await tryCreateShipment(payloadWithScac, headers);
    
    // Fallback: Se a criação com SCAC falhar, tenta criar sem o oceanLine
    if (createRes.status === 404 || createRes.status === 400) {
        console.warn('⚠️  Criação com SCAC falhou. Tentando fallback sem oceanLine...');
        const payloadWithoutOceanLine = buildTrackingPayload({ type, trackingNumber: trackingId });
        createRes = await tryCreateShipment(payloadWithoutOceanLine, headers);
    }

    if (!createRes.ok) {
        const errorBody = await safelyParseJSON(createRes);
        console.error('❌ CREATE Shipment Error (Final):', errorBody);
        return NextResponse.json({
          error: 'Erro ao registrar o embarque na Cargo-flows após todas as tentativas.',
          detail: errorBody?.message || JSON.stringify(errorBody),
          payloadSent: payloadWithScac, // Mostra o payload principal que foi tentado
        }, { status: createRes.status });
    }

    console.log('✅ Embarque criado com sucesso. Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Aguarda processamento

    console.log('➡️  GET Shipment URL (Após Criação):', getShipmentUrl);
    const finalGetRes = await fetch(getShipmentUrl, { headers });
      
    if (finalGetRes.ok && finalGetRes.status !== 204) {
        const finalData = await safelyParseJSON(finalGetRes);
        const firstShipment = Array.isArray(finalData) ? finalData[0] : finalData;

        if (firstShipment?.state === 'PROCESSING' && firstShipment.fallback) {
            return NextResponse.json({
                status: 'processing',
                message: 'O embarque foi registrado, mas os dados de rastreio ainda não estão disponíveis.',
                shipment: firstShipment.fallback,
            }, { status: 202 });
        }
        
        return NextResponse.json({ status: 'ready', shipment: firstShipment });
    }
    
    return NextResponse.json({
        status: 'processing',
        message: 'O embarque foi registrado com sucesso, mas os dados de rastreio ainda não estão disponíveis. Tente novamente em alguns minutos.',
    }, { status: 202 });

  } catch (err: any) {
    console.error("❌ ERRO GERAL NA ROTA DE TRACKING:", err);
    return NextResponse.json({
      error: 'Erro inesperado no servidor de rastreamento.',
      detail: err.message,
    }, { status: 500 });
  }
}
