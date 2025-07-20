
'use client';
import { useEffect } from 'react';

export default function MapComponent() {
  useEffect(() => {
    const loadMap = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
        script.async = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        initializeMap();
      }
    };

    const initializeMap = () => {
      if (document.getElementById('map')) {
        new window.google.maps.Map(document.getElementById('map') as HTMLElement, {
          center: { lat: -23.5505, lng: -46.6333 },
          zoom: 12
        });
      }
    };

    loadMap();

    return () => {
      document.querySelectorAll('script[src*="googleapis"]').forEach(s => s.remove());
    };
  }, []);

  return <div id="map" style={{ height: '500px', width: '100%' }} />;
}
