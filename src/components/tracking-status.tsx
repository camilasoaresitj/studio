'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader, Search, Ship, Warehouse, Anchor, AlertTriangle, PackageSearch } from 'lucide-react';

const trackingData = {
  'ABC123456': {
    id: 'ABC123456',
    origin: 'Porto de Santos, BR',
    destination: 'Porto de Roterdã, NL',
    status: 'Em trânsito',
    events: [
      { status: 'Reserva confirmada', date: '2023-10-01', location: 'Santos, BR', completed: true },
      { status: 'Carga coletada', date: '2023-10-05', location: 'Armazém, Santos', completed: true },
      { status: 'Embarcado no navio "MSC LEO"', date: '2023-10-07', location: 'Porto de Santos', completed: true },
      { status: 'Em trânsito', date: '2023-10-15', location: 'Oceano Atlântico', completed: false },
      { status: 'Chegada no porto de destino', date: '2023-10-30 (estimado)', location: 'Porto de Roterdã', completed: false },
      { status: 'Disponível para retirada', date: '2023-11-01 (estimado)', location: 'Roterdã, NL', completed: false },
    ]
  },
  'XYZ789012': {
    id: 'XYZ789012',
    origin: 'Aeroporto de Guarulhos, BR',
    destination: 'Aeroporto JFK, US',
    status: 'Entregue',
    events: [
        { status: 'Reserva confirmada', date: '2024-05-10', location: 'São Paulo, BR', completed: true },
        { status: 'Carga recebida no terminal', date: '2024-05-11', location: 'Aeroporto de Guarulhos', completed: true },
        { status: 'Embarcado no voo LA8180', date: '2024-05-11', location: 'Aeroporto de Guarulhos', completed: true },
        { status: 'Chegada em Nova Iorque', date: '2024-05-12', location: 'Aeroporto JFK', completed: true },
        { status: 'Liberado pela alfândega', date: '2024-05-12', location: 'Aeroporto JFK', completed: true },
        { status: 'Carga entregue ao destinatário', date: '2024-05-13', location: 'Nova Iorque, US', completed: true },
    ]
  },
   'PQR345678': {
    id: 'PQR345678',
    origin: 'Porto de Xangai, CN',
    destination: 'Porto de Itajaí, BR',
    status: 'Retido na Alfândega',
    events: [
        { status: 'Reserva confirmada', date: '2024-04-20', location: 'Xangai, CN', completed: true },
        { status: 'Carga embarcada', date: '2024-04-25', location: 'Porto de Xangai', completed: true },
        { status: 'Chegada no Brasil', date: '2024-05-30', location: 'Porto de Itajaí', completed: true },
        { status: 'Retido para inspeção alfandegária', date: '2024-06-02', location: 'Alfândega de Itajaí', completed: false },
    ]
  }
};

type TrackingEvent = {
  status: string;
  date: string;
  location: string;
  completed: boolean;
};

type TrackingResult = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  events: TrackingEvent[];
} | null;


export function TrackingStatus() {
  const [trackingId, setTrackingId] = useState('');
  const [lastSearchedId, setLastSearchedId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult>(null);

  const handleSearch = () => {
    if (!trackingId) return;
    setIsLoading(true);
    setResult(null);
    setLastSearchedId(trackingId);
    setTimeout(() => {
      setResult(trackingData[trackingId.toUpperCase() as keyof typeof trackingData] || null);
      setIsLoading(false);
    }, 1500);
  };
  
  const getIconForStatus = (status: string, completed: boolean) => {
    if (completed) return <CheckCircle2 className="w-5 h-5" />;
    if (status.toLowerCase().includes('retido')) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    if (status.toLowerCase().includes('embarcado')) return <Ship className="w-5 h-5" />;
    if (status.toLowerCase().includes('coletada') || status.toLowerCase().includes('recebida')) return <Warehouse className="w-5 h-5" />;
    if (status.toLowerCase().includes('chegada')) return <Anchor className="w-5 h-5" />;
    return <Circle className="w-5 h-5" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rastreamento de Carga</CardTitle>
        <CardDescription>Insira o código de rastreamento (ex: ABC123456, XYZ789012, PQR345678) para ver o status.</CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Input
            placeholder="Insira o código de rastreamento..."
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-grow"
          />
          <Button onClick={handleSearch} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Rastrear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-[300px] flex items-center justify-center">
        {isLoading && 
            <div className="text-center p-8 text-muted-foreground animate-pulse">
                <Loader className="mx-auto h-12 w-12 mb-4" />
                Buscando informações...
            </div>
        }
        {!isLoading && !result && !lastSearchedId &&
             <div className="text-center text-muted-foreground">
                <PackageSearch className="mx-auto h-16 w-16 mb-4" />
                <p>Aguardando o código de rastreamento.</p>
             </div>
        }
        {!isLoading && !result && lastSearchedId && 
            <div className="text-center p-8 text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold">Carga não encontrada</p>
                <p>Nenhum resultado encontrado para o código "{lastSearchedId}".</p>
                <p>Verifique o código e tente novamente.</p>
            </div>
        }
        {result && (
          <div className="w-full mt-6 animate-in fade-in-50 duration-500">
            <div className="mb-6 p-4 border rounded-lg bg-secondary/50">
                <h3 className="font-bold text-lg text-primary">Status da Carga: {result.id}</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm">
                    <p><span className="font-semibold text-muted-foreground">Origem:</span> {result.origin}</p>
                    <p><span className="font-semibold text-muted-foreground">Destino:</span> {result.destination}</p>
                    <p><span className="font-semibold text-muted-foreground">Status Atual:</span> <span className="font-bold">{result.status}</span></p>
                </div>
            </div>
            <div className="relative pl-8">
              <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
              {result.events.map((event: TrackingEvent, index) => (
                <div key={index} className="relative mb-8 flex items-start gap-4">
                   <div className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ${event.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} -translate-x-1/2`}>
                     {getIconForStatus(event.status, event.completed)}
                   </div>
                  <div className="pt-1.5">
                    <p className={`font-semibold ${!event.completed ? 'text-foreground' : 'text-primary'}`}>{event.status}</p>
                    <p className="text-sm text-muted-foreground">{event.date} - {event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
