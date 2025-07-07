'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader, Search, Ship, Warehouse, Anchor } from 'lucide-react';

const trackingData = {
  'ABC123456': {
    origin: 'Porto de Santos',
    destination: 'Porto de Roterdã',
    status: 'Em trânsito',
    events: [
      { status: 'Reserva confirmada', date: '2023-10-01', location: 'Santos, BR', completed: true },
      { status: 'Carga coletada', date: '2023-10-05', location: 'Santos, BR', completed: true },
      { status: 'Embarcado no navio', date: '2023-10-07', location: 'Porto de Santos', completed: true },
      { status: 'Em trânsito', date: '2023-10-15', location: 'Oceano Atlântico', completed: false },
      { status: 'Chegada no porto de destino', date: '2023-10-30', location: 'Porto de Roterdã', completed: false },
      { status: 'Disponível para retirada', date: '2023-11-01', location: 'Roterdã, NL', completed: false },
    ]
  }
};

type TrackingEvent = {
  status: string;
  date: string;
  location: string;
  completed: boolean;
};

export function TrackingStatus() {
  const [trackingId, setTrackingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<typeof trackingData['ABC123456'] | null>(null);

  const handleSearch = () => {
    if (!trackingId) return;
    setIsLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(trackingData['ABC123456' as keyof typeof trackingData] || null);
      setIsLoading(false);
    }, 1500);
  };
  
  const getIconForStatus = (status: string) => {
    if(status.toLowerCase().includes('embarcado')) return <Ship className="w-5 h-5" />;
    if(status.toLowerCase().includes('coletada')) return <Warehouse className="w-5 h-5" />;
    if(status.toLowerCase().includes('chegada')) return <Anchor className="w-5 h-5" />;
    return <Circle className="w-5 h-5" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Ex: ABC123456"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSearch} disabled={isLoading} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Buscar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-center p-8">Buscando informações...</div>}
        {result && (
          <div className="mt-6">
            <CardTitle className="mb-4">Status da Carga: {trackingId}</CardTitle>
            <div className="relative pl-8">
              <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
              {result.events.map((event: TrackingEvent, index) => (
                <div key={index} className="relative mb-8 flex items-start gap-4">
                   <div className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ${event.completed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} -translate-x-1/2`}>
                     {event.completed ? <CheckCircle2 className="w-5 h-5" /> : getIconForStatus(event.status)}
                   </div>
                  <div className="pt-1.5">
                    <p className="font-semibold text-foreground">{event.status}</p>
                    <p className="text-sm text-muted-foreground">{event.date} - {event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!isLoading && !result && trackingId && <div className="text-center p-8 text-muted-foreground">Nenhum resultado encontrado para este código.</div>}
      </CardContent>
    </Card>
  );
}
