
'use client';

import { useEffect, useState } from 'react';
import { runDetectCarrier } from '@/app/actions';
import { findCarrierByName } from '@/lib/carrier-data';

type Evento = {
  eventName: string;
  location: string;
  actualTime: string;
};

type ResponseStatus =
  | { status: 'ready'; eventos: Evento[] }
  | { status: 'processing'; message: string; fallback: Evento }
  | { error: string; detail?: any; statusCode?: number; raw?: string; suggestion?: string };

export default function MapaRastreamento() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'error'>('idle');
  const [mensagem, setMensagem] = useState<string>('');
  const [diagnostico, setDiagnostico] = useState<string>('');
  const [bookingNumber, setBookingNumber] = useState<string>('254285462');

  const carregarRastreamento = async () => {
    if (!bookingNumber.trim()) {
      setStatus('error');
      setMensagem('Por favor, insira um número de booking.');
      return;
    }
    setStatus('loading');
    setEventos([]);
    setMensagem('');
    setDiagnostico('');

    try {
      // Etapa 1: Detectar o armador
      const carrierResponse = await runDetectCarrier(bookingNumber);
      if (!carrierResponse.success || !carrierResponse.data || carrierResponse.data.carrier === 'Unknown') {
          throw new Error(`Não foi possível identificar o armador para o tracking "${bookingNumber}".`);
      }
      
      const carrierName = carrierResponse.data.carrier;
      const carrierInfo = findCarrierByName(carrierName);
      
      // Etapa 2: Validar se encontramos as informações do armador
      if (!carrierInfo || !carrierInfo.scac) {
          const detailedError = `Armador detectado: "${carrierName}", mas não encontramos um código SCAC correspondente em nossa base interna. Verifique se o armador está cadastrado corretamente em /src/lib/carrier-data.ts.`;
          throw new Error(detailedError);
      }
      
      console.log(`Carrier detected: ${carrierName}, SCAC: ${carrierInfo.scac}`);

      // Etapa 3: Chamar a API de rastreamento com o código e nome do armador validados
      const res = await fetch(`/api/tracking/${bookingNumber}?carrierCode=${carrierInfo.scac}&carrierName=${encodeURIComponent(carrierName)}`);
      const data: ResponseStatus = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMensagem(data.error || 'Ocorreu um erro na API.');
        setDiagnostico(`Diagnóstico da API: ${data.error}. Detalhes: ${JSON.stringify(data.detail || data.raw)}`);
        return;
      }
      
      if ('status' in data && data.status === 'ready') {
        setEventos(data.eventos);
        setStatus('ready');
      } else if ('status' in data && data.status === 'processing') {
        setEventos([data.fallback]);
        setStatus('processing');
        setMensagem(data.message);
      } else { // Fallback for unexpected success responses
         setStatus('error');
         setMensagem(data.error || 'Resposta inesperada da API.');
         setDiagnostico(`Resposta inesperada: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setStatus('error');
      setMensagem(err.message || 'Erro de conexão ao tentar buscar o rastreamento.');
      setDiagnostico('Verifique a conexão de rede ou o console do navegador para mais detalhes.');
    }
  };

  useEffect(() => {
    if (eventos.length === 0 || typeof window === 'undefined' || !(window as any).google) return;

    const scriptId = 'google-maps-script';
    // Remove existing script if it's there to avoid conflicts
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&callback=initMap`;
    script.async = true;
    
    (window as any).initMap = () => initMap(eventos);
    
    document.head.appendChild(script);

    return () => {
      const scriptElement = document.getElementById(scriptId);
      if (scriptElement) {
        scriptElement.remove();
      }
      if ((window as any).initMap) {
        delete (window as any).initMap;
      }
    };
  }, [eventos]);

  const initMap = async (eventos: Evento[]) => {
    if (typeof window === 'undefined' || !(window as any).google || !document.getElementById('map')) return;
    
    try {
        const { Map } = await (window as any).google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await (window as any).google.maps.importLibrary("marker");

        const map = new Map(document.getElementById('map')!, {
            zoom: 2,
            center: { lat: 0, lng: -30 },
            mapId: 'CARGA_INTELIGENTE_MAP'
        });

        for (const ev of eventos) {
            if (!ev.location || ev.location.toLowerCase() === 'n/a' || ev.location.toLowerCase().includes('aguardando')) continue;

            try {
                const geoRes = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(ev.location)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
                );
                const geo = await geoRes.json();
                const coords = geo.results?.[0]?.geometry?.location;
                if (!coords) continue;

                const marker = new AdvancedMarkerElement({
                    map,
                    position: coords,
                    title: ev.eventName
                });

                const popup = new (window as any).google.maps.InfoWindow({
                    content: `<strong>${ev.eventName}</strong><br>${ev.location}<br><small>${new Date(ev.actualTime).toLocaleString()}</small>`
                });

                marker.addListener('gmp-click', () => popup.open(map, marker));
            } catch (err) {
                console.error("Geocoding or marker creation failed for", ev, err);
            }
        }
    } catch (e) {
        console.error("Error loading Google Maps libraries:", e);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="p-4 bg-white shadow flex items-center gap-4">
        <input
          value={bookingNumber}
          onChange={(e) => setBookingNumber(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && carregarRastreamento()}
          placeholder="Digite o Booking Number"
          className="border p-2 rounded w-64"
        />
        <button
          onClick={carregarRastreamento}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Carregando...' : 'Atualizar Rastreamento'}
        </button>
      </div>

      {status === 'processing' && (
        <div className="p-4 text-yellow-800 bg-yellow-100 text-center">
          ⚠️ {mensagem}
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 text-red-800 bg-red-100 text-center">
          <h3 className="font-bold">❌ Erro ao Carregar Rastreamento</h3>
          <p>{mensagem}</p>
          <pre className="mt-2 text-xs text-left bg-red-50 p-2 rounded">{diagnostico}</pre>
        </div>
      )}

      <div id="map" className="w-full flex-1 bg-gray-200" />
    </div>
  );
}
