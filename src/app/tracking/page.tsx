'use client';

import { useEffect, useState, useRef } from 'react';
import { runDetectCarrier } from '@/app/actions';
import { findCarrierByName } from '@/lib/carrier-data';
import { Loader } from "@googlemaps/js-api-loader";

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


export default function TrackingPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'processing' | 'error'>('idle');
  const [mensagem, setMensagem] = useState<string>('');
  const [diagnostico, setDiagnostico] = useState<string>('');
  const [bookingNumber, setBookingNumber] = useState<string>('254285462');
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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
  
  // Effect to load the Google Maps
  useEffect(() => {
    const initMap = async () => {
      if (!googleMapsApiKey) {
        setStatus('error');
        setMensagem("A chave da API de Mapas não está configurada.");
        console.error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
        return;
      }
      if (!mapRef.current) return;

      try {
        const loader = new Loader({
          apiKey: googleMapsApiKey,
          version: "weekly",
          libraries: ["marker"]
        });

        const { Map } = await loader.importLibrary('maps');
        
        mapInstance.current = new Map(mapRef.current as HTMLElement, {
          center: { lat: 0, lng: -30 },
          zoom: 2,
          mapId: 'CARGA_INTELIGENTE_MAP'
        });

      } catch (error) {
        console.error("Erro ao carregar mapa:", error);
        setStatus('error');
        setMensagem("Falha ao carregar o mapa.");
      }
    };

    initMap();
  }, [googleMapsApiKey]);
  
   // Effect to update markers when 'eventos' change
   useEffect(() => {
    if (!mapInstance.current || eventos.length === 0 || !googleMapsApiKey) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];
    
    const bounds = new google.maps.LatLngBounds();
    let markersCreated = 0;

    const addMarkers = async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      const { InfoWindow } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;

      for (const ev of eventos) {
        if (!ev.location || ev.location.toLowerCase() === 'n/a' || ev.location.toLowerCase().includes('aguardando')) continue;
        
        try {
          const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(ev.location)}&key=${googleMapsApiKey}`);
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
   }, [eventos, googleMapsApiKey]);


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
          <pre className="mt-2 text-xs text-left bg-red-50 p-2 rounded max-h-60 overflow-auto">{diagnostico}</pre>
        </div>
      )}

      <div id="map" ref={mapRef} className="w-full flex-1 bg-gray-200" />
    </div>
  );
}
