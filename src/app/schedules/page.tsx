'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Ship, Plane } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runGetVesselSchedules, runGetFlightSchedules } from '@/app/actions';
import type { GetVesselSchedulesOutput } from '@/ai/flows/get-ship-schedules';
import type { GetFlightSchedulesOutput } from '@/ai/flows/get-flight-schedules';

const schedulesFormSchema = z.object({
  origin: z.string().min(3, "Mínimo 3 caracteres").max(5, "Máximo 5 caracteres"),
  destination: z.string().min(3, "Mínimo 3 caracteres").max(5, "Máximo 5 caracteres"),
});

type SchedulesFormData = z.infer<typeof schedulesFormSchema>;

export default function SchedulesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [vesselSchedules, setVesselSchedules] = useState<GetVesselSchedulesOutput>([]);
  const [flightSchedules, setFlightSchedules] = useState<GetFlightSchedulesOutput>([]);
  const { toast } = useToast();

  const vesselForm = useForm<SchedulesFormData>({
    resolver: zodResolver(schedulesFormSchema),
    defaultValues: { origin: 'CNSHA', destination: 'BRSSZ' }
  });

  const flightForm = useForm<SchedulesFormData>({
    resolver: zodResolver(schedulesFormSchema),
    defaultValues: { origin: 'GRU', destination: 'MIA' }
  });

  const onVesselSubmit = async (data: SchedulesFormData) => {
    setIsLoading(true);
    setVesselSchedules([]);
    const response = await runGetVesselSchedules(data);
    if (response.success) {
      setVesselSchedules(response.data);
      if (response.data.length === 0) {
        toast({ title: "Nenhuma programação encontrada." });
      }
    } else {
      toast({ variant: 'destructive', title: "Erro ao buscar programação", description: response.error });
    }
    setIsLoading(false);
  };

  const onFlightSubmit = async (data: SchedulesFormData) => {
    setIsLoading(true);
    setFlightSchedules([]);
    const response = await runGetFlightSchedules(data);
    if (response.success) {
      setFlightSchedules(response.data);
      if (response.data.length === 0) {
        toast({ title: "Nenhum voo encontrado." });
      }
    } else {
      toast({ variant: 'destructive', title: "Erro ao buscar voos", description: response.error });
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Consulta de Schedules</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Consulte programações de navios e voos em tempo real.
        </p>
      </header>
      <Tabs defaultValue="vessel" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-lg">
          <TabsTrigger value="vessel"><Ship className="mr-2 h-4 w-4" />Vessel Schedules</TabsTrigger>
          <TabsTrigger value="flight"><Plane className="mr-2 h-4 w-4" />Flight Schedules</TabsTrigger>
        </TabsList>
        <TabsContent value="vessel" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Programação de Navios</CardTitle>
              <CardDescription>Use códigos UN/LOCODE para a busca (ex: CNSHA para Xangai, BRSSZ para Santos).</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...vesselForm}>
                <form onSubmit={vesselForm.handleSubmit(onVesselSubmit)} className="flex flex-col md:flex-row gap-4 items-start">
                  <FormField control={vesselForm.control} name="origin" render={({ field }) => (
                    <FormItem className="w-full"><FormLabel>Porto de Origem</FormLabel><FormControl><Input placeholder="Ex: CNSHA" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={vesselForm.control} name="destination" render={({ field }) => (
                    <FormItem className="w-full"><FormLabel>Porto de Destino</FormLabel><FormControl><Input placeholder="Ex: BRSSZ" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <div className="w-full md:w-auto pt-6">
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                      Buscar
                    </Button>
                  </div>
                </form>
              </Form>
              <div className="mt-6 border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Navio</TableHead><TableHead>Viagem</TableHead><TableHead>Armador</TableHead>
                    <TableHead>ETD</TableHead><TableHead>ETA</TableHead><TableHead>Transit Time</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                    ) : vesselSchedules.length > 0 ? (
                      vesselSchedules.map((s, i) => (
                        <TableRow key={i}><TableCell className="font-medium">{s.vesselName}</TableCell><TableCell>{s.voyage}</TableCell>
                        <TableCell>{s.carrier}</TableCell><TableCell>{format(new Date(s.etd), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{format(new Date(s.eta), 'dd/MM/yyyy HH:mm')}</TableCell><TableCell>{s.transitTime}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma programação para exibir.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="flight" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Programação de Voos</CardTitle>
              <CardDescription>Use códigos IATA para a busca (ex: GRU para Guarulhos, MIA para Miami).</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...flightForm}>
                <form onSubmit={flightForm.handleSubmit(onFlightSubmit)} className="flex flex-col md:flex-row gap-4 items-start">
                  <FormField control={flightForm.control} name="origin" render={({ field }) => (
                    <FormItem className="w-full"><FormLabel>Aeroporto de Origem</FormLabel><FormControl><Input placeholder="Ex: GRU" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                  <FormField control={flightForm.control} name="destination" render={({ field }) => (
                    <FormItem className="w-full"><FormLabel>Aeroporto de Destino</FormLabel><FormControl><Input placeholder="Ex: MIA" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
                   <div className="w-full md:w-auto pt-6">
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                      Buscar
                    </Button>
                  </div>
                </form>
              </Form>
              <div className="mt-6 border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Cia Aérea</TableHead><TableHead>Voo</TableHead><TableHead>Aeronave</TableHead>
                    <TableHead>ETD</TableHead><TableHead>ETA</TableHead><TableHead>Transit Time</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                    ) : flightSchedules.length > 0 ? (
                      flightSchedules.map((s, i) => (
                         <TableRow key={i}><TableCell className="font-medium">{s.carrier}</TableCell><TableCell>{s.flightNumber}</TableCell>
                        <TableCell>{s.aircraft}</TableCell><TableCell>{format(new Date(s.etd), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell>{format(new Date(s.eta), 'dd/MM/yyyy HH:mm')}</TableCell><TableCell>{s.transitTime}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhum voo para exibir.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
