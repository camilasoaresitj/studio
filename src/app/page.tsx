
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runGetTrackingInfo, runDetectCarrier } from '@/app/actions';
import type { TrackingEvent } from '@/ai/flows/get-tracking-info';

type ApiResponse = {
    status: 'ready' | 'processing';
    eventos: TrackingEvent[];
    message?: string;
    error?: string;
    detail?: any;
}

export default function MapaRastreamento() {
  const [eventos, setEventos] = useState<TrackingEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const bookingNumber = '255372222'; // pode tornar dinâmico depois

  useEffect(() => {
    const fetchTracking = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Step 1: Detect Carrier (Simulated for this page)
            const carrier = 'Maersk'; // Em um app real, isso seria detectado
            
            // Step 2: Get Tracking Info
            const res = await runGetTrackingInfo({ trackingNumber: bookingNumber, carrier });
            
            if (res.success && res.data?.events) {
                setEventos(res.data.events);
            } else {
                 throw new Error(`Diagnóstico: ${res.error || 'Falha ao buscar dados'}.`);
            }
            
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    fetchTracking();
  }, [bookingNumber, toast]);

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

  const initMap = async (eventos: TrackingEvent[]) => {
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
          title: ev.status
        });

        const popup = new (window as any).google.maps.InfoWindow({
          content: `<strong>${ev.status}</strong><br>${ev.location}<br><small>${new Date(ev.date).toLocaleString()}</small>`
        });

        marker.addListener('click', () => popup.open(map, marker));
      } catch (err) {
        console.error("Geocoding or marker creation failed for", ev, err);
      }
    }
  };
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  if (error) {
     return (
        <div className="flex h-screen w-full items-center justify-center p-4">
             <Alert variant="destructive" className="max-w-xl break-words">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Rastreamento</AlertTitle>
                <AlertDescription>
                    <p className="font-semibold">Por favor, envie o diagnóstico abaixo para o suporte:</p>
                    <pre className="mt-2 w-full whitespace-pre-wrap rounded-md bg-secondary p-2 font-mono text-xs">
                        {error}
                    </pre>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <div id="map" className="w-full h-screen" />;
}
