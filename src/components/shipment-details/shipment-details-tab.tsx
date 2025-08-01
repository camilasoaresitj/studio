
'use client';

import React, { forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Shipment, Partner } from '@/lib/shipment-data';
import { cn } from '@/lib/utils';
import { 
    Calendar as CalendarIcon, 
    PlusCircle, 
    Trash2, 
    RefreshCw,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const containerDetailSchema = z.object({
  id: z.string().optional(),
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
  volumes: z.string().optional(),
  measurement: z.string().optional(),
  freeTime: z.string().optional(),
  type: z.string().optional(),
  effectiveReturnDate: z.date().optional().nullable(),
  effectiveGateInDate: z.date().optional().nullable(),
});

const transshipmentDetailSchema = z.object({
  id: z.string().optional(),
  port: z.string().min(1, "Obrigatório"),
  vessel: z.string().min(1, "Obrigatório"),
  etd: z.date().optional().nullable(),
  eta: z.date().optional().nullable(),
});

const detailsFormSchema = z.object({
  origin: z.string().min(1, "Origem é obrigatória."),
  destination: z.string().min(1, "Destino é obrigatório."),
  collectionAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  carrier: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  masterBillNumber: z.string().optional(),
  houseBillNumber: z.string().optional(),
  bookingNumber: z.string().optional(),
  etd: z.date().optional().nullable(),
  eta: z.date().optional().nullable(),
  dischargeTerminal: z.string().optional(),
  terminalRedestinacaoId: z.string().optional(),
  containers: z.array(containerDetailSchema).optional(),
  transshipments: z.array(transshipmentDetailSchema).optional(),
  ceMaster: z.string().optional(),
  ceHouse: z.string().optional(),
  manifesto: z.string().optional(),
  commodityDescription: z.string().optional(),
  ncms: z.array(z.string()).optional(),
});

type DetailsFormData = z.infer<typeof detailsFormSchema>;

interface ShipmentDetailsTabProps {
    shipment: Shipment;
    partners: Partner[];
    onUpdate: (updatedShipment: Partial<Shipment>) => void;
    isTracking: boolean;
    setIsTracking: (isTracking: boolean) => void;
}

export const ShipmentDetailsTab = forwardRef<{ submit: () => Promise<any> }, ShipmentDetailsTabProps>(({ shipment, partners, onUpdate, isTracking, setIsTracking }, ref) => {
    const [trackingError, setTrackingError] = useState<string | null>(null);

    const form = useForm<DetailsFormData>({
        resolver: zodResolver(detailsFormSchema),
        defaultValues: {
            ...shipment,
            etd: shipment.etd ? new Date(shipment.etd) : null,
            eta: shipment.eta ? new Date(shipment.eta) : null,
            transshipments: (shipment.transshipments || []).map(t => ({...t, etd: t.etd ? new Date(t.etd) : undefined, eta: t.eta ? new Date(t.eta) : undefined })),
            containers: (shipment.containers || []).map(c => ({...c, effectiveReturnDate: c.effectiveReturnDate ? new Date(c.effectiveReturnDate) : undefined, effectiveGateInDate: c.effectiveGateInDate ? new Date(c.effectiveGateInDate) : undefined })),
        }
    });

    useImperativeHandle(ref, () => ({
        submit: async () => {
            const isValid = await form.trigger();
            if (!isValid) throw new Error("Por favor, corrija os erros na aba Detalhes.");
            return form.getValues();
        }
    }));
    
    const handleRefreshTracking = async () => {
        const currentCarrierName = form.getValues('carrier');
        if (!shipment?.bookingNumber || !currentCarrierName) {
            setTrackingError("Número do booking e transportadora são necessários para o rastreamento.");
            return;
        }
        setIsTracking(true);
        setTrackingError(null);
        try {
            const res = await fetch(`/api/tracking/${shipment.bookingNumber}?carrierName=${encodeURIComponent(currentCarrierName)}`);
            const data = await res.json();
            
            if (!res.ok) {
                 throw new Error(data.detail || data.error || `HTTP error! status: ${res.status}`);
            }

            if(data.status === 'ready' || (data.status === 'processing' && data.shipment)) {
                onUpdate({
                    lastTrackingUpdate: new Date(),
                    vesselName: data.shipment.vesselName || shipment.vesselName,
                    voyageNumber: data.shipment.voyageNumber || shipment.voyageNumber,
                    etd: data.shipment.departureDate ? new Date(data.shipment.departureDate) : shipment.etd,
                    eta: data.shipment.arrivalDate ? new Date(data.shipment.arrivalDate) : shipment.eta,
                });
            } else {
                 setTrackingError(data.message || "Status de rastreamento desconhecido.");
            }
        } catch (error: any) {
            console.error("Tracking failed:", error);
            setTrackingError(error.message);
        } finally {
            setIsTracking(false);
        }
    };


    const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
        control: form.control,
        name: "containers",
    });

    const { fields: transshipmentFields, append: appendTransshipment, remove: removeTransshipment } = useFieldArray({
        control: form.control,
        name: "transshipments",
    });
    
    const watchedContainers = form.watch('containers');
    const containerTotals = React.useMemo(() => {
        if (!watchedContainers) return { qty: 0, weight: 0, volumes: 0, cbm: 0 };
        return {
            qty: watchedContainers.length,
            weight: watchedContainers.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0),
            volumes: watchedContainers.reduce((sum, c) => sum + (parseInt(c.volumes || '0') || 0), 0),
            cbm: watchedContainers.reduce((sum, c) => sum + (parseFloat(c.measurement || '0') || 0), 0),
        }
    }, [watchedContainers]);
    
    const terminalPartners = useMemo(() => partners.filter(p => p.roles.fornecedor && p.tipoFornecedor?.terminal), [partners]);
    const carrierPartners = useMemo(() => partners.filter(p => p.roles.fornecedor && (p.tipoFornecedor?.ciaMaritima || p.tipoFornecedor?.ciaAerea) && p.scac), [partners]);

    const showCollectionAddress = shipment.details?.incoterm === 'EXW';
    const deliveryTerms = ['DAP', 'DPU', 'DDP', 'DDU'];
    const showDeliveryAddress = deliveryTerms.includes(shipment.details?.incoterm || '');

    return (
        <Form {...form}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Informações da Viagem</CardTitle>
                            <Button size="sm" type="button" variant="outline" onClick={handleRefreshTracking} disabled={isTracking}>
                                {isTracking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Rastrear
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {trackingError && (
                             <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Status do Rastreamento</AlertTitle>
                                <AlertDescription>
                                    <pre className="text-xs whitespace-pre-wrap">{trackingError}</pre>
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="origin" render={({ field }) => (<FormItem><FormLabel>Origem</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                             <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                        {showCollectionAddress && (
                            <FormField control={form.control} name="collectionAddress" render={({ field }) => (<FormItem><FormLabel>Local de Coleta (EXW)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        )}
                        {showDeliveryAddress && (
                             <FormField control={form.control} name="deliveryAddress" render={({ field }) => (<FormItem><FormLabel>Local de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="carrier" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transportadora</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {carrierPartners.map(c => <SelectItem key={c.id} value={c.name}>{c.name} ({c.scac})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="bookingNumber" render={({ field }) => (<FormItem><FormLabel>Booking Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="vesselName" render={({ field }) => (<FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="voyageNumber" render={({ field }) => (<FormItem><FormLabel>Viagem / Voo nº</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <FormField control={form.control} name="masterBillNumber" render={({ field }) => (<FormItem><FormLabel>Master BL / AWB</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                           <FormField control={form.control} name="houseBillNumber" render={({ field }) => (<FormItem><FormLabel>House BL / AWB</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="etd" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>ETD</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-auto h-4 w-4 opacity-50" />{field.value ? format(new Date(field.value), "PPP") : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>)} />
                             <FormField control={form.control} name="eta" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>ETA</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-auto h-4 w-4 opacity-50" />{field.value ? format(new Date(field.value), "PPP") : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>)} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="ceMaster" render={({ field }) => (<FormItem><FormLabel>CE Master</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="ceHouse" render={({ field }) => (<FormItem><FormLabel>CE House</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="manifesto" render={({ field }) => (<FormItem><FormLabel>Manifesto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                        </div>
                    </CardContent>
                </Card>
                 <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Detalhes da Carga</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="commodityDescription" render={({ field }) => (<FormItem><FormLabel>Descrição da Mercadoria</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="ncms" render={({ field }) => (<FormItem><FormLabel>NCMs</FormLabel><FormControl><Input placeholder="Separados por vírgula" {...field} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} value={Array.isArray(field.value) ? field.value.join(', ') : ''} /></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="text-lg">Detalhes dos Contêineres</CardTitle>
                             <Button type="button" size="sm" variant="outline" onClick={() => appendContainer({ number: '', seal: '', tare: '', grossWeight: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {containerFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end p-2 border rounded-md relative">
                                    <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-1" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    <div className="col-span-2"><Label>Nº Contêiner</Label><FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => <Input placeholder="MSCU1234567" {...field} className="h-8 mt-1"/>} /></div>
                                    <div className="col-span-2 md:col-span-1"><Label>Lacre</Label><FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => <Input placeholder="SEAL12345" {...field} className="h-8 mt-1"/>} /></div>
                                    <div className="col-span-2 md:col-span-1"><Label>Tara (Kg)</Label><FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => <Input placeholder="2250" {...field} className="h-8 mt-1"/>} /></div>
                                    <div className="col-span-2 md:col-span-1"><Label>Peso Bruto</Label><FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => <Input placeholder="24000" {...field} className="h-8 mt-1"/>} /></div>
                                    <div className="col-span-2 md:col-span-1"><Label>Volumes</Label><FormField control={form.control} name={`containers.${index}.volumes`} render={({ field }) => <Input placeholder="1000" {...field} className="h-8 mt-1"/>} /></div>
                                </div>
                            ))}
                            <div className="flex justify-end gap-4 text-sm font-semibold pt-2">
                                <span>Total Contêineres: {containerTotals.qty}</span>
                                <span>Peso Total: {containerTotals.weight.toLocaleString('pt-BR')} Kg</span>
                            </div>
                        </CardContent>
                    </Card>
                      <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle className="text-lg">Transbordos</CardTitle>
                            <Button type="button" size="sm" variant="outline" onClick={() => appendTransshipment({ port: '', vessel: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {transshipmentFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end p-2 border rounded-md relative">
                                    <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-1" onClick={() => removeTransshipment(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    <div className="col-span-2"><Label>Porto</Label><FormField control={form.control} name={`transshipments.${index}.port`} render={({ field }) => <Input {...field} className="h-8 mt-1"/>} /></div>
                                    <div className="col-span-2"><Label>Navio/Voo</Label><FormField control={form.control} name={`transshipments.${index}.vessel`} render={({ field }) => <Input {...field} className="h-8 mt-1"/>} /></div>
                                    <div className="col-span-1"><Label>ETA</Label><FormField control={form.control} name={`transshipments.${index}.eta`} render={({ field }) => (<Popover><PopoverTrigger asChild><FormControl><Button variant="outline" size="sm" className="h-8 w-full justify-start text-xs"><CalendarIcon className="mr-1 h-3 w-3" />{field.value ? format(new Date(field.value), "dd/MM/yy") : 'Data'}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>)} /></div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader><CardTitle className="text-lg">Terminais</CardTitle></CardHeader>
                         <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="dischargeTerminal" render={({ field }) => (<FormItem><FormLabel>Terminal de Descarga</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{terminalPartners.map(t => <SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                            <FormField control={form.control} name="terminalRedestinacaoId" render={({ field }) => (<FormItem><FormLabel>Terminal de Redestinação</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{terminalPartners.map(t => <SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                         </CardContent>
                    </Card>
                </div>
            </div>
        </Form>
    );
});

ShipmentDetailsTab.displayName = 'ShipmentDetailsTab';
