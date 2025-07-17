
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid } from 'date-fns';

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { Shipment, Milestone, TransshipmentDetail, DocumentStatus, QuoteCharge } from '@/lib/shipment';
import { cn } from '@/lib/utils';
import { 
    Calendar as CalendarIcon, 
    PlusCircle, 
    Save, 
    Trash2, 
    Circle, 
    CheckCircle, 
    Hourglass, 
    AlertTriangle, 
    Wallet, 
    Receipt, 
    Anchor, 
    CaseSensitive, 
    Weight, 
    Package, 
    Clock, 
    Ship, 
    GanttChart, 
    Link as LinkIcon, 
    RefreshCw, 
    Loader2, 
    Printer, 
    Upload, 
    FileCheck, 
    CircleDot,
    Map as MapIcon,
    FileText,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { runGetTrackingInfo, runGetCourierStatus, runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runGenerateHblPdf, runUpdateShipmentInTracking, runGetRouteMap, addManualMilestone } from '@/app/actions';
import { addFinancialEntry, getFinancialEntries } from '@/lib/financials-data';
import { Checkbox } from './ui/checkbox';
import { getFees } from '@/lib/fees-data';
import type { Fee } from '@/lib/fees-data';
import { ScrollArea } from './ui/scroll-area';
import { exchangeRateService } from '@/services/exchange-rate-service';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';
import { getShipments } from '@/lib/shipment';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { BLDraftForm } from './bl-draft-form';
import { ShipmentMap } from './shipment-map';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';

const containerDetailSchema = z.object({
  id: z.string(),
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
  volumes: z.string().optional(),
  measurement: z.string().optional(), // CBM
  freeTime: z.string().optional(),
  type: z.string().optional(),
});

const transshipmentDetailSchema = z.object({
  id: z.string(),
  port: z.string().min(1, "Obrigatório"),
  vessel: z.string().min(1, "Obrigatório"),
  etd: z.date().optional(),
  eta: z.date().optional(),
});

const quoteChargeSchemaForSheet = z.object({
    id: z.string(),
    name: z.string().min(1, 'Obrigatório'),
    type: z.string(),
    localPagamento: z.enum(['Origem', 'Frete', 'Destino']).optional(),
    cost: z.coerce.number().default(0),
    costCurrency: z.enum(['USD', 'BRL', 'EUR', 'JPY', 'CHF', 'GBP']),
    sale: z.coerce.number().default(0),
    saleCurrency: z.enum(['USD', 'BRL', 'EUR', 'JPY', 'CHF', 'GBP']),
    supplier: z.string().min(1, 'Obrigatório'),
    sacado: z.string().optional(),
    approvalStatus: z.enum(['aprovada', 'pendente', 'rejeitada']),
    justification: z.string().optional(),
    financialEntryId: z.string().nullable().optional(),
});

const milestoneSchema = z.object({
    name: z.string().min(1, "O nome do milestone é obrigatório."),
    status: z.enum(['pending', 'in_progress', 'completed']),
    predictedDate: z.date({ required_error: "A data prevista é obrigatória." }),
    effectiveDate: z.date().nullable(),
    details: z.string().optional(),
    isTransshipment: z.boolean().optional(),
});

const shipmentDetailsSchema = z.object({
  carrier: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  masterBillNumber: z.string().optional(),
  houseBillNumber: z.string().optional(),
  bookingNumber: z.string().optional(),
  mblPrintingAtDestination: z.boolean().optional(),
  mblPrintingAuthDate: z.date().optional(),
  courier: z.enum(['DHL', 'UPS', 'FedEx', 'Outro']).optional(),
  courierNumber: z.string().optional(),
  courierLastStatus: z.string().optional(),
  etd: z.date().optional(),
  eta: z.date().optional(),
  containers: z.array(containerDetailSchema).optional(),
  transshipments: z.array(transshipmentDetailSchema).optional(),
  milestones: z.array(milestoneSchema).optional(),
  charges: z.array(quoteChargeSchemaForSheet).optional(),
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;


interface ShipmentDetailsSheetProps {
    shipment: Shipment | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (updatedShipment: Shipment) => void;
}

export function ShipmentDetailsSheet({ shipment, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('timeline');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isFetchingCourier, setIsFetchingCourier] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [fees, setFees] = useState<Fee[]>([]);
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});
    
    const form = useForm<ShipmentDetailsFormData>({
        resolver: zodResolver(shipmentDetailsSchema),
    });

    const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
        control: form.control,
        name: "containers",
    });

    const { fields: transshipmentFields, append: appendTransshipment, remove: removeTransshipment } = useFieldArray({
        control: form.control,
        name: "transshipments",
    });

    const { fields: chargesFields, append: appendCharge, remove: removeCharge, update: updateCharge } = useFieldArray({
        control: form.control,
        name: "charges",
    });

    const { fields: milestoneFields, update: updateMilestone } = useFieldArray({
        control: form.control,
        name: 'milestones'
    });
    
    useEffect(() => {
        if (shipment) {
            setPartners(getPartners());
            setFees(getFees());
            exchangeRateService.getRates().then(setExchangeRates);
            form.reset({
                ...shipment,
                etd: shipment.etd ? new Date(shipment.etd) : undefined,
                eta: shipment.eta ? new Date(shipment.eta) : undefined,
                mblPrintingAuthDate: shipment.mblPrintingAuthDate ? new Date(shipment.mblPrintingAuthDate) : undefined,
                milestones: (shipment.milestones || []).map(m => ({...m, predictedDate: new Date(m.predictedDate), effectiveDate: m.effectiveDate ? new Date(m.effectiveDate) : null})),
                charges: shipment.charges || [],
            });
        }
    }, [shipment, form]);

    const mblPrintingAtDestination = form.watch('mblPrintingAtDestination');

    const handleUpdate = form.handleSubmit(async (data) => {
        if (!shipment) return;
        setIsUpdating(true);
        onUpdate({ ...shipment, ...data } as Shipment);
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsUpdating(false);
        toast({
            title: "Processo Atualizado!",
            description: "As alterações foram salvas com sucesso.",
            className: "bg-success text-success-foreground",
        });
    });

    const handleRefreshTracking = async () => {
        if(!shipment) return;
        setIsUpdating(true);
        const trackingNumber = form.getValues('masterBillNumber') || form.getValues('bookingNumber');
        const carrier = form.getValues('carrier');

        if (!trackingNumber || !carrier) {
            toast({
                variant: 'destructive',
                title: 'Dados insuficientes',
                description: 'O processo precisa de um Armador e Master BL/Booking para ser rastreado.',
            });
            setIsUpdating(false);
            return;
        }

        const response = await runGetTrackingInfo({ trackingNumber, carrier });
        if (response.success && response.data) {
            const fetchedDetails = response.data.shipmentDetails || {};
            onUpdate({ ...shipment, ...fetchedDetails } as Shipment);
            toast({ title: 'Rastreamento Atualizado', description: `Status: ${response.data.status}` });
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao rastrear',
                description: response.error,
            });
        }

        setIsUpdating(false);
    };

    const generatePdf = async (type: 'client' | 'agent' | 'hbl') => {
        if (!shipment) return;
        setIsGenerating(true);

        let response;
        try {
            if (type === 'client') {
                 const partner = partners.find(p => p.name === shipment.customer);
                 if (!partner) throw new Error("Cliente não encontrado");

                const charges = shipment.charges
                    .filter(c => c.sacado === shipment.customer)
                    .map(c => ({
                        description: c.name,
                        value: c.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        currency: c.saleCurrency
                    }));

                response = await runGenerateClientInvoicePdf({
                    invoiceNumber: `INV-${shipment.id}`,
                    customerName: shipment.customer,
                    customerAddress: `${partner.address?.street}, ${partner.address?.number}`,
                    date: format(new Date(), 'dd/MM/yyyy'),
                    dueDate: format(new Date(), 'dd/MM/yyyy'),
                    charges,
                    total: '0.00', // needs full calculation
                    exchangeRate: 5.25,
                    bankDetails: { bankName: "LTI GLOBAL", accountNumber: "PIX: 10.298.168/0001-89" }
                });
            } else if (type === 'agent') {
                 if (!shipment.agent) throw new Error("Agente não encontrado no processo.");
                 response = await runGenerateAgentInvoicePdf({
                     invoiceNumber: `AINV-${shipment.id}`,
                     processId: shipment.id,
                     agentName: shipment.agent.name,
                 });
            } else { // HBL
                if (!shipment.blDraftData) throw new Error("Draft do BL não foi preenchido.");
                response = await runGenerateHblPdf({
                    isOriginal: true,
                    blNumber: shipment.houseBillNumber,
                    shipper: shipment.blDraftData.shipper,
                    consignee: shipment.blDraftData.consignee,
                    notifyParty: shipment.blDraftData.notify,
                    vesselAndVoyage: `${shipment.vesselName} / ${shipment.voyageNumber}`,
                    portOfLoading: shipment.origin,
                    portOfDischarge: shipment.destination,
                    finalDestination: shipment.destination,
                    marksAndNumbers: shipment.blDraftData.marksAndNumbers,
                    packageDescription: `${shipment.blDraftData.containers.reduce((sum, c) => sum + parseInt(c.volumes || '0'), 0)} packages, ${shipment.blDraftData.descriptionOfGoods}`,
                    grossWeight: shipment.blDraftData.grossWeight,
                    measurement: shipment.blDraftData.measurement,
                    containerAndSeal: shipment.blDraftData.containers.map(c => `${c.number} / ${c.seal}`).join('\n'),
                    freightPayableAt: 'Destino',
                    numberOfOriginals: shipment.blType === 'original' ? '3 (TRÊS)' : '0 (ZERO)',
                    issueDate: format(new Date(), 'dd-MMM-yyyy'),
                    shippedOnBoardDate: shipment.etd ? format(shipment.etd, 'dd-MMM-yyyy') : 'N/A',
                });
            }

            if (response.success && response.data.html) {
                const newWindow = window.open();
                newWindow?.document.write(response.data.html);
                newWindow?.document.close();
            } else {
                throw new Error(response.error || "A geração do HTML falhou.");
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: `Erro ao gerar ${type}`, description: err.message });
        }
        setIsGenerating(false);
    };

    const watchedCharges = useWatch({ control: form.control, name: 'charges' });

    const totals = React.useMemo(() => {
        let totalCostBRL = 0;
        let totalSaleBRL = 0;

        if (!watchedCharges) return { totalCostBRL: 0, totalSaleBRL: 0, totalProfitBRL: 0 };

        watchedCharges.forEach(charge => {
            const chargeCost = Number(charge.cost) || 0;
            const chargeSale = Number(charge.sale) || 0;

            const customer = partners.find(p => p.name === charge.sacado);
            const supplier = partners.find(p => p.name === charge.supplier);

            const customerAgio = customer?.exchangeRateAgio ?? 0;
            const supplierAgio = supplier?.exchangeRateAgio ?? 0;

            const salePtax = exchangeRates[charge.saleCurrency] || 1;
            const costPtax = exchangeRates[charge.costCurrency] || 1;

            const saleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + customerAgio / 100);
            const costRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + supplierAgio / 100);

            totalSaleBRL += chargeSale * saleRate;
            totalCostBRL += chargeCost * costRate;
        });

        const totalProfitBRL = totalSaleBRL - totalCostBRL;

        return { totalCostBRL, totalSaleBRL, totalProfitBRL };
    }, [watchedCharges, exchangeRates, partners]);

    if (!shipment) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                 <SheetContent className="sm:max-w-7xl w-full p-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                 </SheetContent>
            </Sheet>
        );
    }
    
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-7xl w-full p-0">
                <Form {...form}>
                    <form onSubmit={handleUpdate} className="flex flex-col h-full">
                        <SheetHeader className="p-4 border-b">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-full">
                                        <GanttChart className="h-8 w-8 text-primary"/>
                                    </div>
                                    <div>
                                        <SheetTitle>Detalhes do Processo: {shipment.id}</SheetTitle>
                                        <SheetDescription>Gerencie todos os aspectos do embarque de {shipment.customer}.</SheetDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" disabled={isGenerating}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => generatePdf('client')}>Fatura do Cliente</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => generatePdf('agent')}>Invoice do Agente</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => generatePdf('hbl')}>HBL</DropdownMenuItem>
                                        </DropdownMenuContent>
                                     </DropdownMenu>
                                    <Button type="button" onClick={() => {}} variant="outline"><LinkIcon className="mr-2 h-4 w-4"/>Compartilhar</Button>
                                    <Button type="submit" disabled={isUpdating}>
                                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </div>
                        </SheetHeader>
                        
                        <div className="flex-grow overflow-y-auto">
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <div className="p-4 border-b">
                                <TabsList>
                                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                                    <TabsTrigger value="details">Detalhes</TabsTrigger>
                                    <TabsTrigger value="financials">Financeiro</TabsTrigger>
                                    <TabsTrigger value="documents">Documentos</TabsTrigger>
                                    <TabsTrigger value="bl_draft">Draft do BL</TabsTrigger>
                                    <TabsTrigger value="map">Mapa</TabsTrigger>
                                </TabsList>
                                </div>

                                <div className="p-4">
                                <TabsContent value="timeline">
                                    <Card>
                                        <CardHeader>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <CardTitle>Timeline do Processo</CardTitle>
                                                    <CardDescription>Acompanhe e atualize os marcos do embarque.</CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="relative pl-8">
                                            <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                            {milestoneFields.map((milestone, index) => {
                                                const overdue = isPast(new Date(milestone.predictedDate)) && milestone.status !== 'completed';
                                                return (
                                                    <div key={milestone.id} className="relative mb-6 flex items-start gap-4">
                                                        <div className={cn('absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full -translate-x-1/2', 
                                                            milestone.status === 'completed' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                                                            overdue && 'bg-destructive text-destructive-foreground')}>
                                                            {milestone.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : (overdue ? <AlertTriangle className="h-5 w-5" /> : <Circle className="h-5 w-5" />)}
                                                        </div>
                                                        <div className="pt-1.5 flex-grow space-y-2">
                                                            <div className="flex items-center gap-4">
                                                                <p className="font-semibold text-base">{milestone.name}</p>
                                                                <Controller control={form.control} name={`milestones.${index}.predictedDate`} render={({ field }) => (
                                                                    <Popover><PopoverTrigger asChild><FormControl>
                                                                        <Button variant="outline" size="sm" className="h-7 text-xs">
                                                                            <CalendarIcon className="mr-2 h-3 w-3" /> {field.value ? format(new Date(field.value), 'dd/MM/yy') : 'N/A'}
                                                                        </Button>
                                                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                                                                )} />
                                                                <Controller control={form.control} name={`milestones.${index}.status`} render={({ field }) => (
                                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                                        <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="pending">Pendente</SelectItem>
                                                                            <SelectItem value="in_progress">Em Andamento</SelectItem>
                                                                            <SelectItem value="completed">Concluído</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                                
                                <TabsContent value="details">
                                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Informações do Processo</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                     <FormField control={form.control} name="etd" render={({ field }) => (
                                                        <FormItem className="flex flex-col"><FormLabel>ETD</FormLabel>
                                                            <Popover><PopoverTrigger asChild><FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                        </FormItem>
                                                    )} />
                                                     <FormField control={form.control} name="eta" render={({ field }) => (
                                                        <FormItem className="flex flex-col"><FormLabel>ETA</FormLabel>
                                                            <Popover><PopoverTrigger asChild><FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="carrier" render={({ field }) => (
                                                    <FormItem><FormLabel>Transportadora</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                                )} />
                                                <div className="grid grid-cols-2 gap-4">
                                                     <FormField control={form.control} name="vesselName" render={({ field }) => (
                                                        <FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                                    )} />
                                                     <FormField control={form.control} name="voyageNumber" render={({ field }) => (
                                                        <FormItem><FormLabel>Viagem</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                     <FormField control={form.control} name="masterBillNumber" render={({ field }) => (
                                                        <FormItem><FormLabel>Master BL / AWB</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                                    )} />
                                                     <FormField control={form.control} name="houseBillNumber" render={({ field }) => (
                                                        <FormItem><FormLabel>House BL / AWB</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="bookingNumber" render={({ field }) => (
                                                    <FormItem><FormLabel>Booking Number</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl><Input {...field} /></FormControl>
                                                        <Button type="button" variant="secondary" onClick={handleRefreshTracking} disabled={isUpdating}>
                                                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                                                        </Button>
                                                        <Button type="button" variant="secondary" onClick={() => runUpdateShipmentInTracking({ shipmentNumber: form.getValues('bookingNumber')})} disabled={isUpdating}>
                                                            <RefreshCw className="h-4 w-4 text-green-500"/>
                                                        </Button>
                                                    </div>
                                                    </FormItem>
                                                )} />
                                            </CardContent>
                                        </Card>
                                        
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Parceiros do Processo</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <FormItem><FormLabel>Shipper</FormLabel><FormControl><Input value={shipment.shipper.name} disabled/></FormControl></FormItem>
                                                <FormItem><FormLabel>Consignee</FormLabel><FormControl><Input value={shipment.consignee.name} disabled/></FormControl></FormItem>
                                                <FormItem><FormLabel>Agente</FormLabel><FormControl><Input value={shipment.agent?.name || 'N/A'} disabled/></FormControl></FormItem>
                                            </CardContent>
                                        </Card>

                                        {/* Container Details */}
                                        <div className="lg:col-span-2">
                                        <Card>
                                            <CardHeader>
                                                <div className="flex justify-between items-center">
                                                    <CardTitle className="text-lg">Detalhes dos Contêineres</CardTitle>
                                                    <Button type="button" size="sm" variant="outline" onClick={() => appendContainer({ id: `cont-${Date.now()}`, number: '', seal: '', tare: '', grossWeight: '' })}>
                                                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                                                    </Button>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {containerFields.map((field, index) => (
                                                    <div key={field.id} className="grid grid-cols-2 md:grid-cols-5 gap-2 items-center p-2 border rounded-md">
                                                        <FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => <Input placeholder="Nº Contêiner" {...field} className="h-8"/>} />
                                                        <FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => <Input placeholder="Lacre" {...field} className="h-8"/>} />
                                                        <FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => <Input placeholder="Tara" {...field} className="h-8"/>} />
                                                        <FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => <Input placeholder="Peso Bruto" {...field} className="h-8"/>} />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="financials">
                                  {/* Financials content goes here */}
                                </TabsContent>
                                
                                <TabsContent value="documents">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Gestão de Documentos</CardTitle>
                                            <CardDescription>Anexe, aprove e gerencie os documentos do processo.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="border rounded-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Documento</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Arquivo</TableHead>
                                                            <TableHead className="text-right">Ações</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {shipment.documents.map((doc, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell className="font-medium">{doc.name}</TableCell>
                                                                <TableCell>
                                                                     <Badge variant={doc.status === 'approved' ? 'success' : (doc.status === 'uploaded' ? 'default' : 'secondary')}>
                                                                        {doc.status}
                                                                     </Badge>
                                                                </TableCell>
                                                                <TableCell>{doc.fileName || 'N/A'}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button variant="outline" size="sm" className="mr-2"><Upload className="mr-2 h-4 w-4"/> Anexar</Button>
                                                                    <Button variant="ghost" size="sm" disabled={doc.status !== 'uploaded'}><FileCheck className="mr-2 h-4 w-4"/> Aprovar</Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="bl_draft">
                                    <BLDraftForm shipment={shipment} onUpdate={onUpdate} isSheet />
                                </TabsContent>
                                
                                <TabsContent value="map">
                                    {shipment.bookingNumber ? (
                                        <ShipmentMap shipmentNumber={shipment.bookingNumber} />
                                    ) : (
                                        <div className="text-center p-8 text-muted-foreground">
                                            <MapIcon className="mx-auto h-12 w-12 mb-4" />
                                            <p>É necessário um Booking Number para visualizar o mapa da rota.</p>
                                        </div>
                                    )}
                                </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </form>
                </Form>
            </SheetContent>
        </Sheet>
    );
}
