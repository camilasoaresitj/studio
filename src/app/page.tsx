'use client';
import { useEffect, useState } from 'react';

type Evento = {
  eventName: string;
  location: string;
  actualTime: string;
};

export default function RastreamentoMapa() {
  const [eventos, setEventos] = useState<Evento[]>([]);

  useEffect(() => {
    fetch('/api/eventos')
      .then(res => res.json())
      .then(setEventos);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || eventos.length === 0) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&callback=initMap`;
    script.async = true;
    document.head.appendChild(script);

    (window as any).initMap = async () => {
      const map = new google.maps.Map(document.getElementById("map")!, {
        zoom: 2,
        center: { lat: 0, lng: -30 }
      });

      for (const ev of eventos) {
        try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(ev.location)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`);
            const geo = await res.json();
            const loc = geo.results?.[0]?.geometry?.location;
            if (!loc) continue;

            const marker = new google.maps.Marker({ map, position: loc, title: ev.eventName });

            const popup = new google.maps.InfoWindow({
            content: `<strong>${ev.eventName}</strong><br>${ev.location}<br><small>${new Date(ev.actualTime).toLocaleString()}</small>`
            });

            marker.addListener("click", () => popup.open(map, marker));
        } catch (error) {
            console.error('Error geocoding location:', ev.location, error);
        }
      }
    };

    return () => {
        // Clean up the script tag and the callback function
        const scripts = document.head.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            if (scripts[i].src.includes('maps.googleapis.com')) {
                scripts[i].remove();
            }
        }
        if ((window as any).initMap) {
            delete (window as any).initMap;
        }
    }
  }, [eventos]);

  return <div id="map" className="w-full h-screen" />;
}
