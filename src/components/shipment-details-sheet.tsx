
'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { Shipment, ContainerDetail } from '@/lib/shipment';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Save, Trash2 } from 'lucide-react';

const containerDetailSchema = z.object({
  id: z.string(),
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
});

const shipmentDetailsSchema = z.object({
  id: z.string(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  masterBillNumber: z.string().optional(),
  houseBillNumber: z.string().optional(),
  etd: z.date().optional(),
  eta: z.date().optional(),
  containers: z.array(containerDetailSchema).optional(),
  // Add other fields from Shipment type that should be editable
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

interface ShipmentDetailsSheetProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedShipment: Shipment) => void;
}

export function ShipmentDetailsSheet({ shipment, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
  
  const form = useForm<ShipmentDetailsFormData>({
    resolver: zodResolver(shipmentDetailsSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "containers"
  });

  useEffect(() => {
    if (shipment) {
      form.reset({
        id: shipment.id,
        vesselName: shipment.vesselName || '',
        voyageNumber: shipment.voyageNumber || '',
        masterBillNumber: shipment.masterBillNumber || '',
        houseBillNumber: shipment.houseBillNumber || '',
        etd: shipment.etd,
        eta: shipment.eta,
        containers: shipment.containers || [],
      });
    }
  }, [shipment, form]);

  if (!shipment) {
      return null;
  }
  
  const onSubmit = (data: ShipmentDetailsFormData) => {
    if (!shipment) return;
    const updatedShipment: Shipment = {
        ...shipment,
        ...data,
    };
    onUpdate(updatedShipment);
  };
  
  const { overseasPartner, agent } = shipment;

  return (
      <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="sm:max-w-4xl w-full flex flex-col">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                  <SheetHeader>
                      <SheetTitle>Detalhes do Embarque: {shipment.id}</SheetTitle>
                      <SheetDescription>
                          {shipment.origin} &rarr; {shipment.destination} para <strong>{shipment.customer}</strong>
                      </SheetDescription>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                      {/* Partners Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                              <CardHeader className="pb-2"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
                              <CardContent className="text-sm">
                                  <p className="font-semibold">{shipment.customer}</p>
                              </CardContent>
                          </Card>
                          <Card>
                              <CardHeader className="pb-2"><CardTitle className="text-base">{shipment.destination.includes('BR') ? 'Exportador' : 'Importador'}</CardTitle></CardHeader>
                              <CardContent className="text-sm">
                                  <p className="font-semibold">{overseasPartner?.name}</p>
                                  <p className="text-muted-foreground">{overseasPartner?.address?.city}, {overseasPartner?.address?.country}</p>
                              </CardContent>
                          </Card>
                          <Card>
                              <CardHeader className="pb-2"><CardTitle className="text-base">Agente</CardTitle></CardHeader>
                              <CardContent className="text-sm">
                                  {agent ? (
                                      <>
                                          <p className="font-semibold">{agent.name}</p>
                                          <p className="text-muted-foreground">{agent.address.city}, {agent.address.country}</p>
                                      </>
                                  ) : (
                                      <p className="text-muted-foreground">Embarque Direto</p>
                                  )}
                              </CardContent>
                          </Card>
                      </div>

                      {/* Voyage Details */}
                      <Card>
                        <CardHeader><CardTitle className="text-lg">Dados da Viagem/Voo</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField control={form.control} name="vesselName" render={({ field }) => (
                                <FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input placeholder="MSC LEO" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="voyageNumber" render={({ field }) => (
                                <FormItem><FormLabel>Viagem / Nº Voo</FormLabel><FormControl><Input placeholder="AB123C" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="etd" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>ETD</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "dd/MM/yyyy") : (<span>Select date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="eta" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>ETA</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "dd/MM/yyyy") : (<span>Select date</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                        </CardContent>
                      </Card>

                      {/* Bill Numbers */}
                      <Card>
                        <CardHeader><CardTitle className="text-lg">Documentos</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="masterBillNumber" render={({ field }) => (
                                <FormItem><FormLabel>Master Bill of Lading / MAWB</FormLabel><FormControl><Input placeholder="MSCU12345678" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="houseBillNumber" render={({ field }) => (
                                <FormItem><FormLabel>House Bill of Lading / HAWB</FormLabel><FormControl><Input placeholder="MYHBL12345" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </CardContent>
                      </Card>

                      {/* Cargo Details */}
                       <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Detalhes da Carga</CardTitle>
                             <Button type="button" size="sm" variant="outline" onClick={() => append({ id: `new-${fields.length}`, number: '', seal: '', tare: '', grossWeight: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                           <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nº Contêiner</TableHead>
                                            <TableHead>Lacre</TableHead>
                                            <TableHead>Tara</TableHead>
                                            <TableHead>Peso Bruto</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length > 0 ? fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhum contêiner adicionado.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                      </Card>
                  </div>
                  <SheetFooter className="pt-4 mt-4 border-t">
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </Button>
                  </SheetFooter>
                </form>
              </Form>
          </SheetContent>
      </Sheet>
  );
}
