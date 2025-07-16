
'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { runGetRouteMap } from '@/app/actions';
import type { GetRouteMapOutput } from '@/ai/flows/get-route-map';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Loader2, MapIcon, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface ShipmentMapProps {
  shipmentNumber: string;
}

function encodePolyline(points: { lat: number; lon: number }[]): string {
  let plat = 0;
  let plng = 0;
  let encoded_points = "";

  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lon * 1e5);
    let dlat = lat - plat;
    let dlng = lng - plng;

    dlat = (dlat < 0) ? ~(dlat << 1) : (dlat << 1);
    dlng = (dlng < 0) ? ~(dlng << 1) : (dlng << 1);

    plat = lat;
    plng = lng;

    while (dlat >= 0x20) {
      encoded_points += String.fromCharCode((0x20 | (dlat & 0x1f)) + 63);
      dlat >>= 5;
    }
    encoded_points += String.fromCharCode(dlat + 63);

    while (dlng >= 0x20) {
      encoded_points += String.fromCharCode((0x20 | (dlng & 0x1f)) + 63);
      dlng >>= 5;
    }
    encoded_points += String.fromCharCode(dlng + 63);
  }
  return encoded_points;
}

export function ShipmentMap({ shipmentNumber }: ShipmentMapProps) {
  const [mapData, setMapData] = useState<GetRouteMapOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMapData = async () => {
      setIsLoading(true);
      setError(null);
      const response = await runGetRouteMap(shipmentNumber);
      if (response.success && response.data) {
        setMapData(response.data);
      } else {
        setError(response.error || 'Não foi possível carregar os dados do mapa.');
      }
      setIsLoading(false);
    };
    fetchMapData();
  }, [shipmentNumber]);

  const mapUrl = useMemo(() => {
    if (!mapData) return null;
    const { journeyStops, routes, shipmentLocation } = mapData;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API Key is missing.");
      setError("A chave da API de Mapas não está configurada.");
      return null;
    }

    const path = routes.portToPort.length > 0 ? routes.portToPort : [];
    const encodedPath = encodePolyline(path);

    const markers = journeyStops
      .filter(stop => ["ORIGIN_PORT", "DESTINATION_HUB", "TRANSSHIPMENT_PORT"].includes(stop.type))
      .map(stop => {
        let color = 'blue';
        let label = stop.name.charAt(0).toUpperCase();
        if (stop.type === 'ORIGIN_PORT') { color = 'green'; label = 'O'; }
        if (stop.type === 'DESTINATION_HUB') { color = 'red'; label = 'D'; }
        return `markers=color:${color}%7Clabel:${label}%7C${stop.lat},${stop.lon}`;
      }).join('&');

    const currentLocationMarker = shipmentLocation
      ? `&markers=icon:https://maps.google.com/mapfiles/ms/icons/orange-dot.png%7C${shipmentLocation.lat},${shipmentLocation.lon}`
      : '';

    return `https://maps.googleapis.com/maps/api/staticmap?size=640x400&maptype=roadmap&path=color:0x0000ff%7Cweight:3%7Cenc:${encodedPath}&${markers}${currentLocationMarker}&key=${apiKey}`;
  }, [mapData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  if (error) {
    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar o Mapa</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );
  }
  
  if (!mapData || !mapUrl) {
    return (
        <Alert>
            <MapIcon className="h-4 w-4" />
            <AlertTitle>Mapa Não Disponível</AlertTitle>
            <AlertDescription>Não há dados de rota para exibir o mapa deste embarque.</AlertDescription>
        </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapa da Rota</CardTitle>
        <CardDescription>Visualização da rota do embarque desde a origem até o destino.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full aspect-video border rounded-lg overflow-hidden">
            <Image
                src={mapUrl}
                alt={`Mapa da rota para o embarque ${shipmentNumber}`}
                layout="fill"
                objectFit="cover"
                unoptimized
            />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-4">
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500"/> Origem</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500"/> Destino</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-blue-500"/> Transbordo</div>
            <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-orange-500"/> Posição Atual</div>
        </div>
      </CardContent>
    </Card>
  );
}
