

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
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { Shipment, Milestone, TransshipmentDetail, DocumentStatus, QuoteCharge, Partner } from '@/lib/shipment';
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
    Anchor, 
    Clock, 
    Ship, 
    GanttChart, 
    Link as LinkIcon, 
    RefreshCw, 
    Loader2, 
    Printer, 
    Upload, 
    FileCheck,
    Map as MapIcon,
    FileText,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { Checkbox } from './ui/checkbox';
import { getFees } from '@/lib/fees-data';
import type { Fee } from '@/lib/fees-data';
import { ScrollArea } from './ui/scroll-area';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { getPartners } from '@/lib/partners-data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { BLDraftForm } from './bl-draft-form';
import { ShipmentMap } from './shipment-map';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from './ui/switch';


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

const newMilestoneSchema = z.object({
    name: z.string().min(3, "Nome da tarefa é obrigatório."),
    predictedDate: z.date({ required_error: "Data prevista é obrigatória."}),
    details: z.string().optional(),
});
type NewMilestoneFormData = z.infer<typeof newMilestoneSchema>;

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
  origin: z.string().optional(), // Added
  destination: z.string().optional(), // Added
  collectionAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  dischargeTerminal: z.string().optional(),
  terminalRedestinacaoId: z.string().optional(),
  containers: z.array(containerDetailSchema).optional(),
  transshipments: z.array(transshipmentDetailSchema).optional(),
  milestones: z.array(milestoneSchema).optional(),
  charges: z.array(quoteChargeSchemaForSheet).optional(),
  ceMaster: z.string().optional(),
  ceHouse: z.string().optional(),
  manifesto: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  commodityDescription: z.string().optional(),
  ncms: z.array(z.string()).optional(),
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
    const [isManualMilestoneOpen, setIsManualMilestoneOpen] = useState(false);
    
    const form = useForm<ShipmentDetailsFormData>({
        resolver: zodResolver(shipmentDetailsSchema),
    });

    const terminalPartners = useMemo(() => partners.filter(p => p.roles.fornecedor && p.tipoFornecedor?.terminal), [partners]);

    const newMilestoneForm = useForm<NewMilestoneFormData>({
        resolver: zodResolver(newMilestoneSchema),
        defaultValues: { name: '', details: '' }
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
                transshipments: (shipment.transshipments || []).map(t => ({...t, etd: t.etd ? new Date(t.etd) : undefined, eta: t.eta ? new Date(t.eta) : undefined })),
                charges: shipment.charges || [],
                ncms: shipment.ncms || [],
            });
        }
    }, [shipment, form, open]);
    
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

    const { fields: milestoneFields } = useFieldArray({
        control: form.control,
        name: 'milestones'
    });

    const mblPrintingAtDestination = form.watch('mblPrintingAtDestination');

    const handleUpdate = form.handleSubmit(async (data) => {
        if (!shipment) return;
        setIsUpdating(true);
        const updatedData = {
            ...shipment, 
            ...data,
            milestones: (data.milestones || []).map(m => ({
                ...m,
                status: m.effectiveDate ? 'completed' as const : m.status,
            }))
        };
        onUpdate(updatedData as Shipment);
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
                    total: '0.00',
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
            } else { 
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

    const getMilestoneLocationDetails = (milestoneName: string): string => {
        const lowerName = milestoneName.toLowerCase();
        if (lowerName.includes('embarque') || lowerName.includes('gate in') || lowerName.includes('partida')) {
            return `${shipment?.origin || ''} | ${shipment?.vesselName || ''}`;
        }
        if (lowerName.includes('chegada') || lowerName.includes('desembarque')) {
            return `${shipment?.destination || ''} | ${shipment?.vesselName || ''}`;
        }
        if (lowerName.includes('transbordo')) {
            const transshipment = shipment?.transshipments?.[0]; 
            return `${transshipment?.port || ''} | ${transshipment?.vessel || ''}`;
        }
        return '';
    };

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
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-full">
                                        <GanttChart className="h-8 w-8 text-primary"/>
                                    </div>
                                    <div>
                                        <SheetTitle>Detalhes do Processo: {shipment.id}</SheetTitle>
                                        <SheetDescription className="text-xs md:text-sm">
                                            Shipper: <span className="font-semibold">{shipment.shipper?.name}</span> | 
                                            Consignee: <span className="font-semibold">{shipment.consignee?.name}</span> | 
                                            Notify: <span className="font-semibold">{shipment.notifyName}</span> | 
                                            Agente: <span className="font-semibold">{shipment.agent?.name || 'N/A'}</span>
                                        </SheetDescription>
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
                                                <Button size="sm" type="button" variant="outline" onClick={() => setIsManualMilestoneOpen(true)}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Milestone Manual
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="relative pl-12">
                                            <div className="absolute left-[23px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                            {milestoneFields.map((milestone, index) => {
                                                const overdue = isPast(new Date(milestone.predictedDate)) && milestone.status !== 'completed';
                                                const locationDetails = getMilestoneLocationDetails(milestone.name);
                                                return (
                                                    <div key={milestone.id} className="relative mb-6 flex items-center gap-4">
                                                        <div className={cn('absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full -translate-x-1/2', 
                                                            milestone.effectiveDate ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
                                                            overdue && 'bg-destructive text-destructive-foreground')}>
                                                            {milestone.effectiveDate ? <CheckCircle className="h-5 w-5" /> : (overdue ? <AlertTriangle className="h-5 w-5" /> : <Circle className="h-5 w-5" />)}
                                                        </div>
                                                        <div className="flex-grow space-y-1 pl-4">
                                                            <p className="font-semibold text-base">{milestone.name}</p>
                                                             {locationDetails && (
                                                                <p className="text-sm text-muted-foreground">{locationDetails}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Controller control={form.control} name={`milestones.${index}.predictedDate`} render={({ field }) => (
                                                                <Popover><PopoverTrigger asChild><FormControl>
                                                                    <Button variant="outline" size="sm" className="h-7 text-xs">
                                                                        <CalendarIcon className="mr-2 h-3 w-3" /> {field.value ? `Prev: ${format(new Date(field.value), 'dd/MM/yy')}`: 'Prevista'}
                                                                    </Button>
                                                                </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                                                            )} />
                                                            <Controller control={form.control} name={`milestones.${index}.effectiveDate`} render={({ field }) => (
                                                                <Popover><PopoverTrigger asChild><FormControl>
                                                                    <Button variant="outline" size="sm" className={cn("h-7 text-xs", !field.value && "text-muted-foreground")}>
                                                                        <CalendarIcon className="mr-2 h-3 w-3" /> {field.value ? `Efet: ${format(new Date(field.value), 'dd/MM/yy')}`: 'Efetiva'}
                                                                    </Button>
                                                                </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent></Popover>
                                                            )} />
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
                                                    <FormField control={form.control} name="origin" render={({ field }) => (<FormItem><FormLabel>Origem</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                    <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                     <FormField control={form.control} name="etd" render={({ field }) => (
                                                        <FormItem className="flex flex-col"><FormLabel>ETD</FormLabel>
                                                            <Popover><PopoverTrigger asChild><FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Selecione a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                        </FormItem>
                                                    )} />
                                                     <FormField control={form.control} name="eta" render={({ field }) => (
                                                        <FormItem className="flex flex-col"><FormLabel>ETA</FormLabel>
                                                            <Popover><PopoverTrigger asChild><FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Selecione a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="carrier" render={({ field }) => (<FormItem><FormLabel>Transportadora</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                <div className="grid grid-cols-2 gap-4">
                                                     <FormField control={form.control} name="vesselName" render={({ field }) => (<FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                     <FormField control={form.control} name="voyageNumber" render={({ field }) => (<FormItem><FormLabel>Viagem</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                </div>
                                                <FormField control={form.control} name="bookingNumber" render={({ field }) => (
                                                    <FormItem><FormLabel>Booking Number</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl><Input {...field} /></FormControl>
                                                        <Button type="button" variant="secondary" onClick={handleRefreshTracking} disabled={isUpdating}>
                                                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                                                        </Button>
                                                    </div>
                                                    </FormItem>
                                                )} />
                                                <div className="grid grid-cols-2 gap-4">
                                                     <FormField control={form.control} name="masterBillNumber" render={({ field }) => (<FormItem><FormLabel>Master BL / AWB</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                     <FormField control={form.control} name="houseBillNumber" render={({ field }) => (<FormItem><FormLabel>House BL / AWB</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="ceMaster" render={({ field }) => (<FormItem><FormLabel>CE Master</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                    <FormField control={form.control} name="ceHouse" render={({ field }) => (<FormItem><FormLabel>CE House</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                </div>
                                                <FormField control={form.control} name="manifesto" render={({ field }) => (<FormItem><FormLabel>Manifesto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="purchaseOrderNumber" render={({ field }) => (<FormItem><FormLabel>Ref. Cliente (PO)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                    <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Invoice Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                                                </div>
                                                {shipment.details?.incoterm === 'EXW' && <FormField control={form.control} name="collectionAddress" render={({ field }) => (<FormItem><FormLabel>Local de Coleta</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />}
                                                {(shipment.details?.incoterm.startsWith('D') || shipment.charges.some(c => c.name.toLowerCase().includes('entrega'))) && <FormField control={form.control} name="deliveryAddress" render={({ field }) => (<FormItem><FormLabel>Local de Entrega</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />}
                                                
                                                <FormField
                                                    control={form.control}
                                                    name="dischargeTerminal"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Terminal de Chegada (Descarga)</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um terminal..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {terminalPartners.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="terminalRedestinacaoId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Terminal de Redestinação</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um terminal..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                     {terminalPartners.map(t => <SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />

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
                                                        <div key={field.id} className="grid grid-cols-2 md:grid-cols-7 gap-2 items-center p-2 border rounded-md relative">
                                                            <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-1" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                            <FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => <Input placeholder="Nº Contêiner" {...field} className="h-8 col-span-2"/>} />
                                                            <FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => <Input placeholder="Lacre" {...field} className="h-8"/>} />
                                                            <FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => <Input placeholder="Tara" {...field} className="h-8"/>} />
                                                            <FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => <Input placeholder="Peso Bruto" {...field} className="h-8"/>} />
                                                            <FormField control={form.control} name={`containers.${index}.volumes`} render={({ field }) => <Input placeholder="Volumes" {...field} className="h-8"/>} />
                                                            <FormField control={form.control} name={`containers.${index}.measurement`} render={({ field }) => <Input placeholder="M³" {...field} className="h-8"/>} />
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader>
                                                    <div className="flex justify-between items-center">
                                                        <CardTitle className="text-lg">Portos de Transbordo</CardTitle>
                                                        <Button type="button" size="sm" variant="outline" onClick={() => appendTransshipment({ id: `ts-${Date.now()}`, port: '', vessel: '' })}>
                                                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="space-y-2">
                                                    {transshipmentFields.map((field, index) => (
                                                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center p-2 border rounded-md relative">
                                                            <Button type="button" variant="ghost" size="icon" className="absolute -top-1 -right-1" onClick={() => removeTransshipment(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                            <FormField control={form.control} name={`transshipments.${index}.port`} render={({ field }) => <Input placeholder="Porto de Transbordo" {...field} className="h-8"/>} />
                                                            <FormField control={form.control} name={`transshipments.${index}.vessel`} render={({ field }) => <Input placeholder="Navio/Voo" {...field} className="h-8"/>} />
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="financials">
                                  {/* Financials Tab Content Placeholder */}
                                </TabsContent>
                                
                                <TabsContent value="documents">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                            {(shipment.documents || []).map((doc, index) => (
                                                                <TableRow key={index}>
                                                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                                                    <TableCell>
                                                                        <Badge variant={doc.status === 'approved' ? 'success' : (doc.status === 'uploaded' ? 'default' : 'secondary')}>
                                                                            {doc.status}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {doc.fileName ? (
                                                                            <a href="#" className="text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                                                                                {doc.fileName}
                                                                            </a>
                                                                        ) : 'N/A'}
                                                                    </TableCell>
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
                                        <Card>
                                            <CardHeader><CardTitle className="text-lg">Informações do Courier</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <FormField control={form.control} name="mblPrintingAtDestination" render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                        <div className="space-y-0.5"><FormLabel>Impressão do MBL no Destino?</FormLabel></div>
                                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                                    </FormItem>
                                                )} />
                                                {mblPrintingAtDestination && (
                                                    <FormField control={form.control} name="mblPrintingAuthDate" render={({ field }) => (
                                                        <FormItem className="flex flex-col animate-in fade-in-50"><FormLabel>Data Autorização de Impressão</FormLabel>
                                                            <Popover><PopoverTrigger asChild><FormControl>
                                                                <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Selecione a data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                        </FormItem>
                                                    )} />
                                                )}
                                                <FormField control={form.control} name="courier" render={({ field }) => (
                                                    <FormItem><FormLabel>Empresa de Courier</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={mblPrintingAtDestination}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="DHL">DHL</SelectItem>
                                                                <SelectItem value="UPS">UPS</SelectItem>
                                                                <SelectItem value="FedEx">FedEx</SelectItem>
                                                                <SelectItem value="Outro">Outro</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="courierNumber" render={({ field }) => (
                                                    <FormItem><FormLabel>Número de Rastreio do Courier</FormLabel>
                                                    <div className="flex gap-2">
                                                        <FormControl><Input {...field} disabled={mblPrintingAtDestination} /></FormControl>
                                                        <Button type="button" variant="secondary" onClick={() => {}} disabled={isFetchingCourier || mblPrintingAtDestination}>
                                                            {isFetchingCourier ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                                                        </Button>
                                                    </div>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="courierLastStatus" render={({ field }) => (
                                                    <FormItem><FormLabel>Último Status do Courier</FormLabel><FormControl><Input {...field} disabled /></FormControl></FormItem>
                                                )} />
                                            </CardContent>
                                        </Card>
                                    </div>
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
            </SheetContent>
        </Sheet>
    );
}
