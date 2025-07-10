'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader, Search, Ship, Warehouse, Anchor, AlertTriangle, PackageSearch, Plane } from 'lucide-react';
import { runGetTrackingInfo } from '@/app/actions';
import { GetTrackingInfoOutput, TrackingEvent } from '@/ai/flows/get-tracking-info';

type TrackingResult = GetTrackingInfoOutput | null;

export function TrackingStatus() {
  const [trackingId, setTrackingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!trackingId) return;
    setIsLoading(true);
    setResult(null);
    setError(null);

    const response = await runGetTrackingInfo(trackingId);

    if (response.success) {
      setResult(response.data);
    } else {
      setError(response.error);
    }
    
    setIsLoading(false);
  };
  
  const getIconForStatus = (status: string, completed: boolean) => {
    const lowerStatus = status.toLowerCase();
    if (completed) return <CheckCircle2 className="w-5 h-5" />;
    if (lowerStatus.includes('retido')) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    if (lowerStatus.includes('embarcado') || lowerStatus.includes('loaded')) return <Ship className="w-5 h-5" />;
    if (lowerStatus.includes('coletada') || lowerStatus.includes('recebida')) return <Warehouse className="w-5 h-5" />;
    if (lowerStatus.includes('chegada') || lowerStatus.includes('discharged')) return <Anchor className="w-5 h-5" />;
    return <Circle className="w-5 h-5" />;
  }

  // Determine the overall status from the last non-pending event
  const currentStatus = result?.events.filter(e => e.completed).pop()?.status || result?.status || 'Aguardando informações';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rastreamento de Carga Universal</CardTitle>
        <CardDescription>Insira o código de rastreamento (ex: BL, AWB, Container) para ver o status.</CardDescription>
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
        {!isLoading && !result && !error &&
             <div className="text-center text-muted-foreground">
                <PackageSearch className="mx-auto h-16 w-16 mb-4" />
                <p>Aguardando o código de rastreamento.</p>
             </div>
        }
        {!isLoading && error && 
            <div className="text-center p-8 text-destructive">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p className="font-semibold">Erro na Busca</p>
                <p>{error}</p>
            </div>
        }
        {result && (
          <div className="w-full mt-6 animate-in fade-in-50 duration-500">
            <div className="mb-6 p-4 border rounded-lg bg-secondary/50">
                <h3 className="font-bold text-lg text-primary">Status da Carga: {result.id}</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm">
                    <p><span className="font-semibold text-muted-foreground">Origem:</span> {result.origin}</p>
                    <p><span className="font-semibold text-muted-foreground">Destino:</span> {result.destination}</p>
                    <p><span className="font-semibold text-muted-foreground">Status Atual:</span> <span className="font-bold">{currentStatus}</span></p>
                    <p><span className="font-semibold text-muted-foreground">Transportadora:</span> <span className="font-bold">{result.carrier}</span></p>
                    {result.vesselName && <p><span className="font-semibold text-muted-foreground">Navio/Voo:</span> <span className="font-bold">{result.vesselName} / {result.voyageNumber}</span></p>}
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
                    <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} - {event.location}</p>
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
