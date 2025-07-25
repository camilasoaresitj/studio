
'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader as GoogleMapsLoader } from '@googlemaps/js-api-loader';
import { runGetRouteMap } from '@/app/actions';
import type { GetRouteMapOutput } from '@/ai/flows/get-route-map';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ShipmentMapProps {
  shipmentNumber: string;
}

export function ShipmentMap({ shipmentNumber }: ShipmentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndInitializeMap = async () => {
      setIsLoading(true);
      setError(null);
      
      const response = await runGetRouteMap(shipmentNumber);
      if (!response.success || !response.data) {
        setError(response.error || 'Não foi possível carregar os dados da rota do embarque.');
        setIsLoading(false);
        return;
      }
      
      if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        setError("A chave da API do Google Maps não está configurada.");
        setIsLoading(false);
        return;
      }
      
      if (!mapRef.current) return;

      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        version: 'weekly',
      });
      
      try {
        const google = await loader.load();
        const map = new google.maps.Map(mapRef.current, {
            mapId: 'CARGA_INTELIGENTE_MAP',
            disableDefaultUI: true,
            zoomControl: true,
            styles: [ // Optional: Add a subtle style to the map
                {
                    "featureType": "poi",
                    "stylers": [
                        { "visibility": "off" }
                    ]
                },
                {
                    "featureType": "transit",
                    "stylers": [
                        { "visibility": "off" }
                    ]
                }
            ]
        });

        const bounds = new google.maps.LatLngBounds();
        
        // Draw route
        if (response.data.routes.portToPort.length > 0) {
            const routePath = response.data.routes.portToPort.map(p => ({ lat: p.lat, lng: p.lon }));
            const polyline = new google.maps.Polyline({
                path: routePath,
                geodesic: true,
                strokeColor: '#30475E', // Deep blue
                strokeOpacity: 0.8,
                strokeWeight: 4,
            });
            polyline.setMap(map);
            routePath.forEach(p => bounds.extend(p));
        }

        // Add markers for journey stops
        response.data.journeyStops.forEach(stop => {
            const position = { lat: stop.lat, lng: stop.lon };
            bounds.extend(position);

            let iconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'; // Transshipment
            if (stop.type === 'ORIGIN_PORT') iconUrl = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
            if (stop.type === 'DESTINATION_HUB') iconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
            if (stop.type === 'CURRENT_LOCATION') iconUrl = '/ship-icon.png'; // Custom ship icon
            
            new google.maps.Marker({
              position,
              map,
              title: stop.name,
              icon: { 
                  url: iconUrl,
                  scaledSize: stop.type === 'CURRENT_LOCATION' ? new google.maps.Size(32, 32) : new google.maps.Size(32, 32)
              },
            });
        });
        
        // Wait for the map to be idle before fitting bounds to avoid race conditions
        google.maps.event.addListenerOnce(map, 'idle', () => {
            if (response.data.journeyStops.length > 0) {
                map.fitBounds(bounds);
            }
        });

      } catch (e) {
          console.error("Error loading Google Maps: ", e);
          setError("Falha ao carregar a livraria do Google Maps.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (shipmentNumber) {
        fetchAndInitializeMap();
    } else {
        setError("Número do embarque não fornecido.");
        setIsLoading(false);
    }
  }, [shipmentNumber]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa da Rota</CardTitle>
        <CardDescription>Visualização da rota estimada do embarque.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-video border rounded-lg overflow-hidden bg-muted">
            {isLoading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Carregando mapa...</p>
                </div>
            )}
            {error && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center h-full">
                    <Alert variant="destructive" className="m-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Erro ao Carregar o Mapa</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </div>
            )}
             <div ref={mapRef} className={cn("w-full h-full", (isLoading || error) && "invisible")} />
        </div>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-4">
            <div className="flex items-center gap-2"><img src="https://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="Origem" className="h-4 w-4"/> Origem</div>
            <div className="flex items-center gap-2"><img src="https://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="Destino" className="h-4 w-4"/> Destino</div>
            <div className="flex items-center gap-2"><img src="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" alt="Transbordo" className="h-4 w-4"/> Transbordo</div>
            <div className="flex items-center gap-2"><img src="/ship-icon.png" alt="Posição Atual" className="h-4 w-4"/> Posição Atual</div>
        </div>
      </CardContent>
    </Card>
  );
}
