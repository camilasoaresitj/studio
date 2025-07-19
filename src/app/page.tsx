
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
  | { error: string; detail?: string; suggestion?: string };

export default function MapaRastreamento() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [status, setStatus] = useState<'ready' | 'processing' | 'error'>('ready');
  const [mensagem, setMensagem] = useState<string>('');
  const [bookingNumber, setBookingNumber] = useState<string>('255372222');
  const [loading, setLoading] = useState<boolean>(false);

  const carregarRastreamento = async () => {
    if (!bookingNumber.trim()) {
        return;
    }
    setLoading(true);
    setStatus('ready');
    setEventos([]);
    setMensagem('');

    try {
      const res = await fetch(`/api/tracking/${bookingNumber}`);
      const data: ResponseStatus = await res.json();

      if ('status' in data && data.status === 'ready') {
        setEventos(data.eventos);
        setStatus('ready');
      } else if ('status' in data && data.status === 'processing') {
        setEventos([data.fallback]);
        setStatus('processing');
        setMensagem(data.message);
      } else {
        setStatus('error');
        setMensagem(data.error + (data.suggestion ? ` - ${data.suggestion}` : ''));
      }
    } catch (err) {
      setStatus('error');
      setMensagem('Erro inesperado ao buscar rastreamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRastreamento();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (eventos.length === 0 || typeof window === 'undefined' || !(window as any).google) return;

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
          disabled={loading}
        >
          {loading ? 'Carregando...' : 'Atualizar Rastreamento'}
        </button>
      </div>

      {status === 'processing' && (
        <div className="p-4 text-yellow-800 bg-yellow-100 text-center">
          ⚠️ {mensagem}
        </div>
      )}
      {status === 'error' && (
        <div className="p-4 text-red-800 bg-red-100 text-center">
          ❌ Erro ao Carregar Rastreamento<br />
          {mensagem}
        </div>
      )}

      <div id="map" className="w-full flex-1" />
    </div>
  );
}
