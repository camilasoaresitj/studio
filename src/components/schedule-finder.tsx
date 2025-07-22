
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Loader2, Search, Ship, Plane } from 'lucide-react';
import { runGetVesselSchedules, runGetFlightSchedules } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type VesselSchedule = {
  vesselName: string;
  voyage: string;
  carrier: string;
  etd: string;
  eta: string;
  transitTime: string;
};

type FlightSchedule = {
  flightNumber: string;
  carrier: string;
  etd: string;
  eta: string;
  transitTime: string;
  aircraft: string;
};

export function ScheduleFinder() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [vesselSchedules, setVesselSchedules] = useState<VesselSchedule[]>([]);
  const [flightSchedules, setFlightSchedules] = useState<FlightSchedule[]>([]);
  const { toast } = useToast();

  const handleSearch = async (type: 'vessel' | 'flight') => {
    if (!origin || !destination) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha a origem e o destino.',
      });
      return;
    }

    setIsLoading(true);
    if (type === 'vessel') {
      const response = await runGetVesselSchedules({ origin, destination });
      if (response.success) {
        setVesselSchedules(response.data);
        if (response.data.length === 0) toast({ title: 'Nenhuma programação de navio encontrada.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: response.error });
      }
    } else {
      const response = await runGetFlightSchedules({ origin, destination });
      if (response.success) {
        setFlightSchedules(response.data);
        if (response.data.length === 0) toast({ title: 'Nenhuma programação de voo encontrada.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: response.error });
      }
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Busca de Programação</CardTitle>
        <CardDescription>
          Encontre os próximos navios e voos para sua rota. Use códigos de porto/aeroporto (ex: BRSSZ, GRU).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="vessel">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vessel"><Ship className="mr-2 h-4 w-4" />Navios</TabsTrigger>
            <TabsTrigger value="flight"><Plane className="mr-2 h-4 w-4" />Voos</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-col sm:flex-row gap-4 my-6">
            <Input placeholder="Origem" value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} />
            <Input placeholder="Destino" value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} />
            <Button onClick={() => handleSearch(document.querySelector('[data-state="active"]')?.getAttribute('data-value') as 'vessel' | 'flight')} disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar
            </Button>
          </div>

          <TabsContent value="vessel">
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Navio / Viagem</TableHead>
                            <TableHead>Armador</TableHead>
                            <TableHead>ETD</TableHead>
                            <TableHead>ETA</TableHead>
                            <TableHead>Tempo de Trânsito</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vesselSchedules.map((s, i) => (
                            <TableRow key={i}>
                                <TableCell>{s.vesselName} / {s.voyage}</TableCell>
                                <TableCell>{s.carrier}</TableCell>
                                <TableCell>{format(new Date(s.etd), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{format(new Date(s.eta), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>{s.transitTime}</TableCell>
                            </TableRow>
                        ))}
                         {vesselSchedules.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Nenhum resultado para exibir.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </TabsContent>
          <TabsContent value="flight">
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Voo</TableHead>
                            <TableHead>Cia Aérea</TableHead>
                            <TableHead>ETD</TableHead>
                            <TableHead>ETA</TableHead>
                            <TableHead>Aeronave</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {flightSchedules.map((s, i) => (
                            <TableRow key={i}>
                                <TableCell>{s.flightNumber}</TableCell>
                                <TableCell>{s.carrier}</TableCell>
                                <TableCell>{format(new Date(s.etd), 'dd/MM/yyyy HH:mm')}</TableCell>
                                <TableCell>{format(new Date(s.eta), 'dd/MM/yyyy HH:mm')}</TableCell>
                                <TableCell>{s.aircraft}</TableCell>
                            </TableRow>
                        ))}
                        {flightSchedules.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Nenhum resultado para exibir.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
