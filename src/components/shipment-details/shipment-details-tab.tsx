
'use client';

import React, { forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
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
    Loader2
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


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
});

const transshipmentDetailSchema = z.object({
  id: z.string().optional(),
  port: z.string().min(1, "Obrigatório"),
  vessel: z.string().min(1, "Obrigatório"),
  etd: z.date().optional(),
  eta: z.date().optional(),
});

const detailsFormSchema = z.object({
  carrier: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  masterBillNumber: z.string().optional(),
  houseBillNumber: z.string().optional(),
  bookingNumber: z.string().optional(),
  etd: z.date().optional(),
  eta: z.date().optional(),
  origin: z.string().optional(), 
  destination: z.string().optional(), 
  collectionAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
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
}

export const ShipmentDetailsTab = forwardRef<{ submit: () => Promise<any> }, ShipmentDetailsTabProps>(({ shipment, partners }, ref) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [trackingError, setTrackingError] = useState<string | null>(null);
    const { toast } = useToast();

    const form = useForm<DetailsFormData>({
        resolver: zodResolver(detailsFormSchema),
        defaultValues: {
            ...shipment,
            etd: shipment.etd ? new Date(shipment.etd) : undefined,
            eta: shipment.eta ? new Date(shipment.eta) : undefined,
            transshipments: (shipment.transshipments || []).map(t => ({...t, etd: t.etd ? new Date(t.etd) : undefined, eta: t.eta ? new Date(t.eta) : undefined })),
        }
    });

    useImperativeHandle(ref, () => ({
        submit: async () => {
            const isValid = await form.trigger();
            if (!isValid) throw new Error("Por favor, corrija os erros na aba Detalhes.");
            return form.getValues();
        }
    }));

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

    return (
        <Form {...form}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-lg">Informações do Processo</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {/* Tracking Error Alert can be placed here */}
                        {/* The rest of the form fields... */}
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
                        <CardHeader><CardTitle className="text-lg">Detalhes dos Contêineres</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                             {containerFields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-2 md:grid-cols-8 gap-2 items-center p-2 border rounded-md relative">
                                    <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-1" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    <div className="col-span-2"><Label>Nº Contêiner</Label><FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => <Input placeholder="MSCU1234567" {...field} className="h-8 mt-1"/>} /></div>
                                    <div><Label>Lacre</Label><FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => <Input placeholder="SEAL12345" {...field} className="h-8 mt-1"/>} /></div>
                                    <div><Label>Tara (Kg)</Label><FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => <Input placeholder="2250" {...field} className="h-8 mt-1"/>} /></div>
                                    <div><Label>Peso Bruto</Label><FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => <Input placeholder="24000" {...field} className="h-8 mt-1"/>} /></div>
                                    <div><Label>Volumes</Label><FormField control={form.control} name={`containers.${index}.volumes`} render={({ field }) => <Input placeholder="1000" {...field} className="h-8 mt-1"/>} /></div>
                                    <div><Label>M³</Label><FormField control={form.control} name={`containers.${index}.measurement`} render={({ field }) => <Input placeholder="28.5" {...field} className="h-8 mt-1"/>} /></div>
                                    <div><Label>Free Time</Label><FormField control={form.control} name={`containers.${index}.freeTime`} render={({ field }) => <Input {...field} value={shipment.details.freeTime} className="h-8 mt-1" disabled/>} /></div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Form>
    );
});

ShipmentDetailsTab.displayName = 'ShipmentDetailsTab';
