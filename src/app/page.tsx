
'use client';

import { useEffect, useState } from 'react';

type Evento = {
  eventName: string;
  location: string;
  actualTime: string;
};

type ResponseStatus =
  | { status: 'ready'; eventos: Evento[] }
  | { status: 'processing'; message: string; fallback: Evento }
  | { error: string; detail?: any; suggestion?: string; raw?: string; statusCode?: number, contentType?: string };

export default function MapaRastreamento() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading');
  const [mensagem, setMensagem] = useState<string>('');
  const [diagnostico, setDiagnostico] = useState<string>('');
  const bookingNumber = '255372222';

  useEffect(() => {
    fetch(`/api/tracking/${bookingNumber}`)
      .then(res => res.json())
      .then((data: ResponseStatus) => {
        if ('status' in data && data.status === 'ready') {
          setEventos(data.eventos);
          setStatus('ready');
        } else if ('status' in data && data.status === 'processing') {
          setEventos([data.fallback]);
          setStatus('processing');
          setMensagem(data.message);
        } else if ('error' in data) {
          setStatus('error');
          setMensagem(data.error);
          const detail = data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : 'N/A';
          const raw = data.raw ? `Raw: ${data.raw}` : '';
          setDiagnostico(`Diagnóstico da API: ${data.error}. Detalhes: ${detail}. ${raw}`);
        } else {
          throw new Error('Resposta inesperada da API.');
        }
      })
      .catch(err => {
        setStatus('error');
        setMensagem('Erro inesperado ao buscar rastreamento.');
        setDiagnostico(err.toString());
      });
  }, [bookingNumber]);

  useEffect(() => {
    if (typeof window === 'undefined' || eventos.length === 0 || (window as any).google) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&callback=initMap`;
    script.async = true;
    
    (window as any).initMap = () => initMap(eventos);
    
    document.head.appendChild(script);

    return () => {
      const scripts = document.head.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].src.includes('maps.googleapis.com')) {
          scripts[i].remove();
        }
      }
      if ((window as any).initMap) {
        delete (window as any).initMap;
      }
    };
  }, [eventos]);

  const initMap = async (eventos: Evento[]) => {
    if (typeof window === 'undefined' || !(window as any).google) return;
    
    const map = new (window as any).google.maps.Map(document.getElementById('map')!, {
      zoom: 2,
      center: { lat: 0, lng: -30 }
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

        const marker = new (window as any).google.maps.Marker({
          map,
          position: coords,
          title: ev.eventName
        });

        const popup = new (window as any).google.maps.InfoWindow({
          content: `<strong>${ev.eventName}</strong><br>${ev.location}<br><small>${new Date(ev.actualTime).toLocaleString()}</small>`
        });

        marker.addListener('click', () => popup.open(map, marker));
      } catch (err) {
        console.error("Geocoding or marker creation failed for", ev, err);
      }
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }
  
  return (
    <div className="w-full h-screen">
      {status === 'processing' && (
        <div className="p-4 text-yellow-800 bg-yellow-100 text-center">
          ⚠️ {mensagem}
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 text-red-800 bg-red-100 text-center">
          <p className="font-bold">❌ Erro ao Carregar Rastreamento</p>
          <p className="text-sm">Por favor, envie o diagnóstico abaixo para o suporte:</p>
          <pre className="mt-2 text-xs text-left bg-red-50 p-2 rounded-md whitespace-pre-wrap">{diagnostico}</pre>
        </div>
      )}
      <div id="map" className="w-full h-full" />
    </div>
  );
}
