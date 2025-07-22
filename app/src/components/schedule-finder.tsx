
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Ship, Plane } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { runGetVesselSchedules, runGetFlightSchedules } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { findPortByTerm } from '@/lib/ports';

const scheduleSearchSchema = z.object({
  origin: z.string().min(3, 'Origem é obrigatória (mínimo 3 caracteres).'),
  destination: z.string().min(3, 'Destino é obrigatório (mínimo 3 caracteres).'),
});

type ScheduleSearchFormData = z.infer<typeof scheduleSearchSchema>;

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
  const [isLoading, setIsLoading] = useState(false);
  const [vesselSchedules, setVesselSchedules] = useState<VesselSchedule[]>([]);
  const [flightSchedules, setFlightSchedules] = useState<FlightSchedule[]>([]);
  const { toast } = useToast();

  const form = useForm<ScheduleSearchFormData>({
    resolver: zodResolver(scheduleSearchSchema),
    defaultValues: {
      origin: '',
      destination: '',
    },
  });

  const onSubmit = async (data: ScheduleSearchFormData) => {
    setIsLoading(true);
    setVesselSchedules([]);
    setFlightSchedules([]);
    
    const originPort = findPortByTerm(data.origin);
    const destinationPort = findPortByTerm(data.destination);

    if (!originPort?.unlocode || !destinationPort?.unlocode) {
        toast({ variant: 'destructive', title: 'Portos inválidos', description: 'Não foi possível encontrar códigos UN/LOCODE para a rota informada.' });
        setIsLoading(false);
        return;
    }
    
    // Fetch both simultaneously
    const [vesselRes, flightRes] = await Promise.all([
      runGetVesselSchedules({ origin: originPort.unlocode, destination: destinationPort.unlocode }),
      runGetFlightSchedules({ origin: originPort.unlocode, destination: destinationPort.unlocode })
    ]);

    if (vesselRes.success) {
      setVesselSchedules(vesselRes.data);
    } else {
      toast({ variant: 'destructive', title: 'Erro ao buscar navios', description: vesselRes.error });
    }

    if (flightRes.success) {
      setFlightSchedules(flightRes.data);
    } else {
      toast({ variant: 'destructive', title: 'Erro ao buscar voos', description: flightRes.error });
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Busca de Programação</CardTitle>
        <CardDescription>Encontre as próximas saídas de navios e voos.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4 items-end">
            <FormField
              control={form.control}
              name="origin"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Origem (Porto/Aeroporto)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Santos ou GRU" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Destino (Porto/Aeroporto)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Shanghai ou MIA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Buscar
            </Button>
          </form>
        </Form>
        
        <Tabs defaultValue="vessels" className="mt-6">
            <TabsList>
                <TabsTrigger value="vessels"><Ship className="mr-2 h-4 w-4"/> Navios ({vesselSchedules.length})</TabsTrigger>
                <TabsTrigger value="flights"><Plane className="mr-2 h-4 w-4"/> Voos ({flightSchedules.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="vessels">
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableHead>Navio</TableHead><TableHead>Viagem</TableHead><TableHead>Armador</TableHead><TableHead>ETD</TableHead><TableHead>ETA</TableHead><TableHead>Transit Time</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                            : vesselSchedules.length > 0 ? vesselSchedules.map((s, i) => (
                                <TableRow key={i}><TableCell>{s.vesselName}</TableCell><TableCell>{s.voyage}</TableCell><TableCell>{s.carrier}</TableCell><TableCell>{s.etd}</TableCell><TableCell>{s.eta}</TableCell><TableCell>{s.transitTime}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma programação de navio encontrada.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
            <TabsContent value="flights">
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader><TableRow><TableHead>Voo</TableHead><TableHead>Cia Aérea</TableHead><TableHead>ETD</TableHead><TableHead>ETA</TableHead><TableHead>Transit Time</TableHead><TableHead>Aeronave</TableHead></TableRow></TableHeader>
                        <TableBody>
                             {isLoading ? <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                            : flightSchedules.length > 0 ? flightSchedules.map((s, i) => (
                                <TableRow key={i}><TableCell>{s.flightNumber}</TableCell><TableCell>{s.carrier}</TableCell><TableCell>{s.etd}</TableCell><TableCell>{s.eta}</TableCell><TableCell>{s.transitTime}</TableCell><TableCell>{s.aircraft}</TableCell></TableRow>
                            )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma programação de voo encontrada.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
