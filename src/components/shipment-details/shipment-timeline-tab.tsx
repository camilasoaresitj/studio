
'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Shipment, Milestone } from '@/lib/shipment-data';
import { cn } from '@/lib/utils';
import { 
    Calendar as CalendarIcon, 
    PlusCircle, 
    Circle, 
    CheckCircle, 
    AlertTriangle, 
    RefreshCw, 
    Loader2, 
    Map as MapIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { addManualMilestone } from '@/app/actions';
import { ShipmentMap } from '@/components/shipment-map';

const milestoneSchema = z.object({
    name: z.string().min(1, "O nome do milestone é obrigatório."),
    status: z.enum(['pending', 'in_progress', 'completed']),
    predictedDate: z.date({ required_error: "A data prevista é obrigatória." }),
    effectiveDate: z.date().nullable(),
    details: z.string().optional(),
    isTransshipment: z.boolean().optional(),
});

const timelineFormSchema = z.object({
    milestones: z.array(milestoneSchema).optional(),
    operationalNotes: z.string().optional(),
});

type TimelineFormData = z.infer<typeof timelineFormSchema>;

const newMilestoneSchema = z.object({
    name: z.string().min(3, "Nome da tarefa é obrigatório."),
    predictedDate: z.date({ required_error: "Data prevista é obrigatória."}),
    details: z.string().optional(),
});
type NewMilestoneFormData = z.infer<typeof newMilestoneSchema>;


interface ShipmentTimelineTabProps {
    shipment: Shipment;
    onUpdate: (updatedShipment: Shipment) => void;
}

export const ShipmentTimelineTab = forwardRef<{ submit: () => Promise<any> }, ShipmentTimelineTabProps>(({ shipment, onUpdate }, ref) => {
    const [isManualMilestoneOpen, setIsManualMilestoneOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [trackingError, setTrackingError] = useState<any | null>(null);

    const form = useForm<TimelineFormData>({
        resolver: zodResolver(timelineFormSchema),
        defaultValues: {
            milestones: (shipment.milestones || []).map(m => ({...m, predictedDate: new Date(m.predictedDate!), effectiveDate: m.effectiveDate ? new Date(m.effectiveDate) : null})),
            operationalNotes: shipment.operationalNotes || '',
        }
    });

    useImperativeHandle(ref, () => ({
        submit: async () => {
            const isValid = await form.trigger();
            if (!isValid) throw new Error("Por favor, corrija os erros na aba Timeline.");
            return form.getValues();
        }
    }));
    
    const { fields: milestoneFields } = useForm<TimelineFormData>({ control: form.control, name: 'milestones' });
    
    const newMilestoneForm = useForm<NewMilestoneFormData>({
        resolver: zodResolver(newMilestoneSchema),
        defaultValues: { name: '', details: '' }
    });

    const handleAddManualMilestone = newMilestoneForm.handleSubmit(async (data) => {
        if (!shipment) return;
        const response = await addManualMilestone(shipment.id, data);
        if (response.success && response.data) {
            onUpdate(response.data);
            toast({ title: 'Milestone adicionado!', className: 'bg-success text-success-foreground' });
            setIsManualMilestoneOpen(false);
            newMilestoneForm.reset();
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: response.error });
        }
    });

    const sortedMilestones = useMemo(() => {
        const currentMilestones = form.getValues('milestones');
        if(!currentMilestones || !Array.isArray(currentMilestones)) return [];
        return [...currentMilestones].sort((a, b) => {
            const dateA = a.predictedDate ? new Date(a.predictedDate).getTime() : 0;
            const dateB = b.predictedDate ? new Date(b.predictedDate).getTime() : 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });
    }, [form, shipment.milestones]); 

    return (
        <Form {...form}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Timeline do Processo</CardTitle>
                                <CardDescription>Acompanhe e atualize os marcos do embarque.</CardDescription>
                            </div>
                            <Button size="sm" type="button" variant="outline" onClick={() => setIsManualMilestoneOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Milestone
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="relative pl-4 space-y-6">
                            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border -translate-x-1/2"></div>
                            {sortedMilestones.map((milestone, index) => {
                                const overdue = isPast(new Date(milestone.predictedDate!)) && milestone.status !== 'completed';
                                const isCompleted = !!milestone.effectiveDate;
                                return (
                                    <div key={index} className="grid grid-cols-[auto,1fr] items-start gap-x-4">
                                        <div className="flex h-full justify-center row-span-2">
                                            <div className="absolute left-4 top-1 -translate-x-1/2 z-10">
                                                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', 
                                                    isCompleted ? 'bg-success' : 'bg-muted',
                                                    overdue && 'bg-destructive')}>
                                                    {isCompleted ? <CheckCircle className="h-5 w-5 text-white" /> : (overdue ? <AlertTriangle className="h-5 w-5 text-white" /> : <Circle className="h-5 w-5 text-muted-foreground" />)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-2 pt-1">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className={cn("font-semibold text-base", milestone.isTransshipment && "text-red-500", isCompleted && "text-success")}>{milestone.isTransshipment ? milestone.name.toUpperCase() : milestone.name}</p>
                                                    <p className="text-sm text-muted-foreground -mt-1">{milestone.details}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Controller control={form.control} name={`milestones.${index}.predictedDate`} render={({ field }) => (
                                                        <Popover><PopoverTrigger asChild><FormControl>
                                                            <Button variant="outline" size="sm" className="h-7 text-xs w-32 justify-start">
                                                                <CalendarIcon className="mr-2 h-3 w-3" /> {field.value ? `Prev: ${format(new Date(field.value), 'dd/MM/yy')}`: 'Prevista'}
                                                            </Button>
                                                        </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                                                    )} />
                                                    <Controller control={form.control} name={`milestones.${index}.effectiveDate`} render={({ field }) => (
                                                        <Popover><PopoverTrigger asChild><FormControl>
                                                            <Button variant="outline" size="sm" className={cn("h-7 text-xs w-32 justify-start", !field.value && "text-muted-foreground")}>
                                                                <CalendarIcon className="mr-2 h-3 w-3" /> {field.value ? `Efet: ${format(new Date(field.value), 'dd/MM/yy')}`: 'Efetiva'}
                                                            </Button>
                                                        </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                                                    )} />
                                                </div>
                                            </div>
                                            {index < sortedMilestones.length - 1 && <Separator className="my-4"/>}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <Separator className="my-4"/>
                        <FormField control={form.control} name="operationalNotes" render={({ field }) => (<FormItem><FormLabel className="text-base font-semibold">Informações Adicionais (Visível ao Cliente)</FormLabel><FormControl><Textarea placeholder="Adicione aqui observações importantes sobre o processo que devem ser visíveis ao cliente no portal..." className="min-h-[100px]" {...field} /></FormControl></FormItem>)} />
                    </CardContent>
                </Card>
                <div className="lg:col-span-1">
                    {shipment.id ? (
                        <ShipmentMap shipmentNumber={shipment.id} />
                    ) : (
                        <div className="text-center p-8 text-muted-foreground h-full flex flex-col justify-center items-center border rounded-lg bg-muted/50">
                            <MapIcon className="mx-auto h-12 w-12 mb-4" />
                            <p>É necessário um ID de Processo para visualizar o mapa da rota.</p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isManualMilestoneOpen} onOpenChange={setIsManualMilestoneOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Adicionar Milestone Manual</DialogTitle>
                        <DialogDescription>
                            Insira os detalhes da nova tarefa operacional.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...newMilestoneForm}>
                        <form onSubmit={handleAddManualMilestone} className="space-y-4 pt-4">
                             <FormField control={newMilestoneForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome da Tarefa</FormLabel><FormControl><Input placeholder="Ex: Enviar pré-alerta ao cliente" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={newMilestoneForm.control} name="predictedDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Data Prevista</FormLabel>
                                    <Popover><PopoverTrigger asChild><FormControl>
                                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(new Date(field.value), "PPP") : <span>Selecione a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
                                <FormMessage /></FormItem>
                            )}/>
                             <FormField control={newMilestoneForm.control} name="details" render={({ field }) => (
                                <FormItem><FormLabel>Detalhes (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Aguardando numerário" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                                <Button type="submit">Adicionar Tarefa</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </Form>
    );
});

ShipmentTimelineTab.displayName = 'ShipmentTimelineTab';
