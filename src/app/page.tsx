'use client';

import { useEffect, useState } from 'react';

type Evento = {
  eventName: string;
  location: string;
  actualTime: string;
};

export default function MapaRastreamento() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const bookingNumber = '255372222'; // pode tornar dinâmico depois

  useEffect(() => {
    fetch(`/api/tracking/${bookingNumber}`)
      .then(res => res.json())
      .then(setEventos);
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
      if (!ev.location) continue;

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

  return <div id="map" className="w-full h-screen" />;
}