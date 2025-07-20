
'use client';

import { useEffect, useState, useRef } from 'react';
import { runDetectCarrier } from '@/app/actions';
import { findCarrierByName } from '@/lib/carrier-data';
import Link from 'next/link';

type Evento = {
  eventName: string;
  location: string;
  actualTime: string;
};

type ErrorResponse = {
    error: string;
    detail?: any;
    payload?: any;
}

type ResponseStatus =
  | { status: 'ready'; eventos: Evento[] }
  | { status: 'processing'; message: string; fallback: Evento }
  | ErrorResponse;


export default function MapaRastreamento() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'error'>('idle');
  const [mensagem, setMensagem] = useState<string>('');
  const [diagnostico, setDiagnostico] = useState<string>('');
  const [bookingNumber, setBookingNumber] = useState<string>('254285462');
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);

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
      
      if ('error' in data) {
        setStatus('error');
        setMensagem(data.error);
        let diagString = `Detalhes: ${JSON.stringify(data.detail, null, 2)}`;
        if (data.payload) {
            diagString += `\n\nPayload Enviado: ${JSON.stringify(data.payload, null, 2)}`;
        }
        setDiagnostico(diagString);
        return;
      }
      
      if ('status' in data && data.status === 'ready') {
        setEventos(data.eventos);
        setStatus('ready');
      } else if ('status' in data && data.status === 'processing') {
        setEventos([data.fallback]);
        setStatus('processing');
        setMensagem(data.message);
      } else {
         setStatus('error');
         setMensagem('Resposta inesperada da API.');
         setDiagnostico(`Resposta: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setStatus('error');
      setMensagem(err.message || 'Erro de conexão ao tentar buscar o rastreamento.');
      setDiagnostico('Verifique a conexão de rede ou o console do navegador para mais detalhes.');
    }
  };
  
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
          throw new Error('Chave da API não configurada no ambiente frontend');
        }
        
        if (window.google?.maps) {
          // Map is already loaded
        } else {
            await new Promise<void>((resolve, reject) => {
              const scriptId = 'google-maps-script';
              if (document.getElementById(scriptId)) {
                resolve();
                return;
              }
              const script = document.createElement('script');
              script.id = scriptId;
              script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&loading=async&libraries=marker`;
              script.async = true;
              script.onload = () => resolve();
              script.onerror = (e) => reject(new Error('Falha ao carregar o script do Google Maps'));
              document.head.appendChild(script);
            });
        }

        const mapElement = mapRef.current;
        if (!mapElement) {
          throw new Error('Elemento do mapa não encontrado no DOM');
        }
        if (mapInstance.current) return;

        const { Map } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary;

        mapInstance.current = new Map(mapElement, {
          center: { lat: 0, lng: -30 },
          zoom: 2,
          mapId: 'CARGA_INTELIGENTE_MAP',
        });

      } catch (error) {
        console.error('Erro no mapa:', error);
        setMapError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar o mapa');
      }
    };

    initMap();

  }, []);
  
   // Effect to update markers when 'eventos' change
   useEffect(() => {
    if (!mapInstance.current || eventos.length === 0 || typeof window.google?.maps?.importLibrary !== 'function') return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    
    const bounds = new google.maps.LatLngBounds();
    let markersCreated = 0;

    const addMarkers = async () => {
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      const { InfoWindow } = await window.google.maps.importLibrary("maps") as google.maps.MapsLibrary;

      for (const ev of eventos) {
        if (!ev.location || ev.location.toLowerCase() === 'n/a' || ev.location.toLowerCase().includes('aguardando')) continue;
        
        try {
          // Geocoding is expensive, in a real app, cache results or get lat/lng from backend
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(ev.location)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`);
          const geo = await geoRes.json();
          const coords = geo.results?.[0]?.geometry?.location;
          
          if (coords) {
            markersCreated++;
            bounds.extend(coords);

            const marker = new AdvancedMarkerElement({
              map: mapInstance.current,
              position: coords,
              title: ev.eventName,
            });
            markersRef.current.push(marker);
            
            const infoWindow = new InfoWindow({
                content: `<strong>${ev.eventName}</strong><br>${ev.location}<br><small>${new Date(ev.actualTime).toLocaleString()}</small>`
            });
            
            marker.addListener('gmp-click', () => infoWindow.open({map: mapInstance.current, anchor: marker}));
          }
        } catch (err) {
          console.error("Geocoding or marker creation failed for", ev, err);
        }
      }

      if (mapInstance.current && markersCreated > 0) {
        if (markersCreated === 1) {
            mapInstance.current.setCenter(bounds.getCenter());
            mapInstance.current.setZoom(5);
        } else {
            mapInstance.current.fitBounds(bounds);
        }
      }
    };
    
    addMarkers();
   }, [eventos]);


  return (
    <div className="w-full h-screen flex flex-col">
      <header className="p-4 bg-white shadow flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
        <Link href="/gerencial" passHref>
          <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
            Acessar Sistema
          </button>
        </Link>
      </header>

      {status === 'processing' && (
        <div className="p-4 text-yellow-800 bg-yellow-100 text-center">
          ⚠️ {mensagem}
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 text-red-800 bg-red-100 text-center">
          <h3 className="font-bold">❌ Erro ao Carregar Rastreamento</h3>
          <p>{mensagem}</p>
          <pre className="mt-2 text-xs text-left bg-red-50 p-2 rounded max-h-60 overflow-auto">{diagnostico}</pre>
        </div>
      )}
        <div className="relative w-full flex-1 bg-gray-200">
            <div id="map" ref={mapRef} className="h-full w-full" />
            {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 p-4">
                <div className="max-w-md rounded-lg bg-white p-6 shadow-lg">
                    <h3 className="mb-2 text-lg font-bold text-red-600">Erro no Mapa</h3>
                    <p className="mb-4 text-sm">{mapError}</p>
                    <button 
                    onClick={() => window.location.reload()}
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                    Tentar Novamente
                    </button>
                </div>
                </div>
            )}
        </div>
    </div>
  );
}
