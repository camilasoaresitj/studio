
'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid, addDays, parseISO } from 'date-fns';
import Image from 'next/image';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { Shipment, Milestone, TransshipmentDetail, DocumentStatus, QuoteCharge, Partner, UploadedDocument, ActivityLog, ApprovalLog } from '@/lib/shipment';
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
    ChevronsUpDown,
    Check,
    FileCode
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
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runGenerateHblPdf, addManualMilestone } from '@/app/actions';
import { Checkbox } from './ui/checkbox';
import { getFees } from '@/lib/fees-data';
import type { Fee } from '@/lib/fees-data';
import { ScrollArea } from './ui/scroll-area';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { BLDraftForm } from './bl-draft-form';
import { ShipmentMap } from './shipment-map';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from './ui/switch';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Label } from './ui/label';
import { addFinancialEntries, getFinancialEntries } from '@/lib/financials-data';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { CustomsClearanceTab } from './customs-clearance-tab';
import { findPortByTerm } from '@/lib/ports';

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
    containerType: z.string().optional(),
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
  shipperId: z.number().optional(),
  consigneeId: z.number().optional(),
  agentId: z.number().optional(),
  notifyId: z.number().optional(),
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
  origin: z.string().optional(), 
  destination: z.string().optional(), 
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
  operationalNotes: z.string().optional(),
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

interface ShipmentDetailsSheetProps {
    shipment: Shipment | null;
    partners: Partner[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (updatedShipment: Shipment) => void;
}

const JustificationDialog = ({ open, onOpenChange, onConfirm }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: (justification: string) => void }) => {
    const [justification, setJustification] = useState('');
    const { toast } = useToast();

    const handleConfirm = () => {
        if (justification.trim().length < 10) {
            toast({ variant: 'destructive', title: 'Justificativa muito curta', description: 'Por favor, detalhe o motivo da alteração com pelo menos 10 caracteres.' });
            return;
        }
        onConfirm(justification);
        setJustification('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Justificar Alteração de Valor</DialogTitle>
                    <DialogDescription>
                        Esta taxa já foi aprovada. Por favor, insira uma justificativa para a alteração do valor. A alteração ficará pendente de aprovação gerencial.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Textarea
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Ex: Cliente solicitou remoção do seguro, reduzindo o valor final."
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm}>Confirmar e Enviar para Aprovação</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const chargeTypeOptions = [
    'Por Contêiner',
    'Por BL',
    'Por Processo',
    'W/M',
    'Por KG',
    'Por AWB',
    'Fixo',
    'Percentual',
];

const PartnerSelectField = ({ name, label, control, partners }: { name: any, label: string, control: any, partners: Partner[] }) => {
    const selectedId = useWatch({ control, name });
    const selectedPartner = partners.find(p => p.id === selectedId);
    
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                        <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={`Selecione um ${label.toLowerCase()}...`} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {partners.map(p => (
                                <SelectItem key={p.id} value={p.id!.toString()}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {selectedPartner && (
                        <div className="text-xs text-muted-foreground mt-1 p-2 border rounded-md bg-secondary/50">
                            <p className="font-semibold truncate">{selectedPartner.cnpj ? `CNPJ: ${selectedPartner.cnpj}` : (selectedPartner.vat ? `VAT: ${selectedPartner.vat}`: '')}</p>
                            <p className="truncate">{selectedPartner.address.street}, {selectedPartner.address.number} - {selectedPartner.address.city}, {selectedPartner.address.country}</p>
                        </div>
                    )}
                </FormItem>
            )}
        />
    )
};

const FeeCombobox = ({ value, onValueChange, fees }: { value: string, onValueChange: (value: string) => void, fees: Fee[] }) => {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-8 font-normal">
                    {value ? value : "Selecione..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Buscar taxa..." />
                    <CommandList>
                        <CommandEmpty>Nenhuma taxa encontrada.</CommandEmpty>
                        <CommandGroup>
                            {fees.map((fee) => (
                                <CommandItem
                                    key={fee.id}
                                    value={fee.name}
                                    onSelect={(currentValue) => {
                                        onValueChange(currentValue === value ? "" : fee.name);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === fee.name ? "opacity-100" : "opacity-0")} />
                                    {fee.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

const milestoneMapping: { [key: string]: string[] } = {
    'Confirmação de Embarque': ['vessel departure', 'gate out', 'saída do navio', 'departed'],
    'Chegada ao Destino': ['vessel arrival', 'discharged', 'unloaded from vessel', 'chegada do navio', 'arrived'],
    'Container Gate In (Entregue no Porto)': ['gate in', 'container received', 'container entregue no porto'],
};

const TimeZoneClock = ({ timeZone, label }: { timeZone: string, label: string }) => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            try {
                const newTime = new Date().toLocaleTimeString('pt-BR', {
                    timeZone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                setTime(newTime);
            } catch (error) {
                console.error(`Invalid time zone: ${timeZone}`);
                setTime('Inválido');
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeZone]);

    return (
        <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-secondary">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
                <span className="font-semibold">{label}:</span>
                <span className="font-mono ml-1 font-bold text-primary">{time}</span>
            </div>
        </div>
    );
};

function mapEventToMilestone(eventName: string): string | null {
    const lowerEventName = eventName.toLowerCase();
    for (const milestoneName in milestoneMapping) {
        if (milestoneMapping[milestoneName].some(keyword => lowerEventName.includes(keyword))) {
            return milestoneName;
        }
    }
    return null;
}

const containerTypes = ["20'GP", "40'GP", "40'HC", "20'RF", "40'RF", "40'NOR", "20'OT", "40'OT", "20'FR", "40'FR"];

export function ShipmentDetailsSheet({ shipment, partners, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('timeline');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isFetchingCourier, setIsFetchingCourier] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [fees, setFees] = useState<Fee[]>([]);
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});
    const [isManualMilestoneOpen, setIsManualMilestoneOpen] = useState(false);
    const [documentPreviews, setDocumentPreviews] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
    const [justificationData, setJustificationData] = useState<{ chargeIndex: number; field: 'cost' | 'sale'; newValue: number } | null>(null);
    const [financialEntries, setFinancialEntries] = useState(getFinancialEntries());
    const [detailsEntry, setDetailsEntry] = useState<any>(null); // State for finance details dialog
    const [isFaturarDialogOpen, setIsFaturarDialogOpen] = useState(false);
    const [chargesToFaturar, setChargesToFaturar] = useState<Set<string>>(new Set());

    const blDraftFormRef = useRef<{ submit: () => void }>(null);

    const form = useForm<ShipmentDetailsFormData>({
        resolver: zodResolver(shipmentDetailsSchema),
    });
    
    const { control } = form; 
    const watchedCharges = useWatch({ control, name: 'charges' });

    const terminalPartners = useMemo(() => partners.filter(p => p.roles.fornecedor && p.tipoFornecedor?.terminal), [partners]);
    const carrierPartners = useMemo(() => partners.filter(p => p.roles.fornecedor && (p.tipoFornecedor?.ciaMaritima || p.tipoFornecedor?.ciaAerea) && p.scac), [partners]);

    const newMilestoneForm = useForm<NewMilestoneFormData>({
        resolver: zodResolver(newMilestoneSchema),
        defaultValues: { name: '', details: '' }
    });

    const foreignLocationClock = useMemo(() => {
        if (!shipment) return null;
        const originPort = findPortByTerm(shipment.origin);
        const destPort = findPortByTerm(shipment.destination);

        if (originPort && originPort.country !== 'BR') {
            return { label: originPort.name, timeZone: originPort.timeZone };
        }
        if (destPort && destPort.country !== 'BR') {
            return { label: destPort.name, timeZone: destPort.timeZone };
        }
        return null;
    }, [shipment]);
    
    useEffect(() => {
        if (shipment) {
            setFees(getFees());
            exchangeRateService.getRates().then(setExchangeRates);
            form.reset({
                ...shipment,
                shipperId: shipment.shipper?.id,
                consigneeId: shipment.consignee?.id,
                agentId: shipment.agent?.id,
                notifyId: partners.find(p => p.name === shipment.notifyName)?.id,
                etd: shipment.etd ? new Date(shipment.etd) : undefined,
                eta: shipment.eta ? new Date(shipment.eta) : undefined,
                mblPrintingAuthDate: shipment.mblPrintingAuthDate ? new Date(shipment.mblPrintingAuthDate) : undefined,
                milestones: (shipment.milestones || []).map(m => ({...m, predictedDate: new Date(m.predictedDate), effectiveDate: m.effectiveDate ? new Date(m.effectiveDate) : null})),
                transshipments: (shipment.transshipments || []).map(t => ({...t, etd: t.etd ? new Date(t.etd) : undefined, eta: t.eta ? new Date(t.eta) : undefined })),
                charges: shipment.charges || [],
                ncms: shipment.ncms || [],
                operationalNotes: shipment.operationalNotes || '',
            });
            // Reset local file state
            setUploadedFiles([]);
            setDocumentPreviews({});
            setFinancialEntries(getFinancialEntries());
        }
    }, [shipment, form, open, partners]);
    
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

    const handleMasterSave = async () => {
        if (activeTab === 'bl_draft' && blDraftFormRef.current) {
            blDraftFormRef.current.submit();
        } else {
            await form.handleSubmit(onMainFormSubmit)();
        }
    };

    const onMainFormSubmit = async (data: ShipmentDetailsFormData) => {
        if (!shipment) return;
        setIsUpdating(true);
        
        const updatedDocuments = (shipment.documents || []).map(doc => {
            const uploadedFile = uploadedFiles.find(f => f.name === doc.name);
            if (uploadedFile) {
                return {
                    ...doc,
                    status: 'uploaded' as const,
                    fileName: uploadedFile.file.name,
                    uploadedAt: new Date(),
                };
            }
            return doc;
        });
        
        const updatedData = {
            ...shipment, 
            ...data,
            shipper: partners.find(p => p.id === data.shipperId) || shipment.shipper,
            consignee: partners.find(p => p.id === data.consigneeId) || shipment.consignee,
            agent: partners.find(p => p.id === data.agentId) || shipment.agent,
            notifyName: partners.find(p => p.id === data.notifyId)?.name || shipment.notifyName,
            documents: updatedDocuments,
            milestones: (data.milestones || []).map(m => ({
                ...m,
                status: m.effectiveDate ? 'completed' as const : m.status,
            }))
        };
        onUpdate(updatedData as Shipment);
        setUploadedFiles([]); // Clear after save
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsUpdating(false);
        toast({
            title: "Processo Atualizado!",
            description: "As alterações foram salvas com sucesso.",
            className: "bg-success text-success-foreground",
        });
    };

    const handleRefreshTracking = async () => {
        if (!shipment?.bookingNumber || !shipment.carrier) {
            toast({ variant: 'destructive', title: 'Dados Incompletos', description: 'É necessário ter um Booking Number e uma Transportadora definidos para o rastreamento.' });
            return;
        }

        setIsUpdating(true);
        try {
            const response = await fetch(`/api/tracking/${shipment.bookingNumber}?carrierName=${encodeURIComponent(shipment.carrier)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || data.error || 'Erro desconhecido');
            }
            
            if (data.status === 'ready' && Array.isArray(data.eventos) && data.eventos.length > 0) {
                let updatedMilestones = [...(form.getValues('milestones') || [])];
                let newEventsCount = 0;
                let masterDataUpdated = false;

                // Update Master Data if available from the first event object
                const trackingShipmentData = data.eventos[0]?.shipment;
                if (trackingShipmentData) {
                    if (trackingShipmentData.vesselName) form.setValue('vesselName', trackingShipmentData.vesselName);
                    if (trackingShipmentData.voyageNumber) form.setValue('voyageNumber', trackingShipmentData.voyageNumber);
                    if (trackingShipmentData.etd) form.setValue('etd', parseISO(trackingShipmentData.etd));
                    if (trackingShipmentData.eta) form.setValue('eta', parseISO(trackingShipmentData.eta));
                    if (trackingShipmentData.containers && trackingShipmentData.containers.length > 0) {
                        form.setValue('containers', trackingShipmentData.containers);
                    }
                    masterDataUpdated = true;
                }
                
                // Update Milestones
                data.eventos.forEach((evento: any) => {
                    const milestoneName = mapEventToMilestone(evento.eventName);
                    if (milestoneName) {
                        const milestoneIndex = updatedMilestones.findIndex(m => m.name === milestoneName);
                        if (milestoneIndex > -1 && !updatedMilestones[milestoneIndex].effectiveDate) {
                            updatedMilestones[milestoneIndex] = {
                                ...updatedMilestones[milestoneIndex],
                                effectiveDate: parseISO(evento.actualTime),
                                status: 'completed',
                                details: evento.location
                            };
                            newEventsCount++;
                        }
                    }
                });

                if (newEventsCount > 0 || masterDataUpdated) {
                    form.setValue('milestones', updatedMilestones);
                    toast({ title: 'Rastreamento Atualizado', description: `${newEventsCount} marco(s) e/ou dados do embarque foram atualizados.`, className: 'bg-success text-success-foreground' });
                } else {
                    toast({ title: 'Rastreamento Sincronizado', description: `Nenhum novo evento acionável encontrado. ${data.eventos.length} eventos totais.` });
                }
            } else if (data.status === 'processing') {
                 toast({ title: 'Rastreamento em Processamento', description: data.message });
            } else {
                 toast({ title: 'Rastreamento Encontrado', description: `${data.eventos?.length || 0} eventos encontrados.` });
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao Rastrear', description: error.message });
        } finally {
            setIsUpdating(false);
        }
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
                        value: (Number(c.sale) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
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

    const handleDocTypeChange = (value: UploadedDocument['name'], index: number) => {
        const newDocs = [...uploadedFiles];
        newDocs[index].name = value;
        setUploadedFiles(newDocs);
    };
    
    const handleAddDocumentSlot = () => {
        setUploadedFiles(prev => [...prev, { name: 'Outros', file: null as any }]);
    };

    const removeDocumentSlot = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = event.target.files?.[0];
        if (file) {
          const newDocs = [...uploadedFiles];
          newDocs[index].file = file;
          setUploadedFiles(newDocs);
          
          const reader = new FileReader();
          reader.onload = (e) => {
              setDocumentPreviews(prev => ({ ...prev, [newDocs[index].name]: e.target?.result as string }));
          };
          reader.readAsDataURL(file);
        }
    };
    
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

    const handleFaturarProcesso = () => {
        if (!shipment) return;
    
        const chargesToFaturarNow = watchedCharges.filter(c => chargesToFaturar.has(c.id));
        if (chargesToFaturarNow.length === 0) {
            toast({ title: 'Nenhuma taxa selecionada para faturar.' });
            setIsFaturarDialogOpen(false);
            return;
        }
    
        const groupedCredits: { [partner: string]: QuoteCharge[] } = {};
        const groupedDebits: { [partner: string]: QuoteCharge[] } = {};
    
        chargesToFaturarNow.forEach(charge => {
            if (charge.sacado) {
                if (!groupedCredits[charge.sacado]) groupedCredits[charge.sacado] = [];
                groupedCredits[charge.sacado].push(charge);
            }
            if (charge.supplier) {
                if (!groupedDebits[charge.supplier]) groupedDebits[charge.supplier] = [];
                groupedDebits[charge.supplier].push(charge);
            }
        });
    
        const newFinancialEntries: Omit<any, 'id'>[] = [];
        const now = new Date();
    
        const calculateTotalInBRL = (charges: QuoteCharge[], partnerName: string, type: 'cost' | 'sale') => {
            const partner = partners.find(p => p.name === partnerName);
            const agio = partner?.exchangeRateAgio ?? 0;
            return charges.reduce((total, charge) => {
                const currency = type === 'sale' ? charge.saleCurrency : charge.costCurrency;
                const value = type === 'sale' ? Number(charge.sale) || 0 : Number(charge.cost) || 0;
                const ptax = exchangeRates[currency] || 1;
                const finalRate = currency === 'BRL' ? 1 : ptax * (1 + agio / 100);
                return total + (value * finalRate);
            }, 0);
        };
    
        for (const partnerName in groupedCredits) {
            const charges = groupedCredits[partnerName];
            const totalBRL = calculateTotalInBRL(charges, partnerName, 'sale');
            newFinancialEntries.push({
                type: 'credit',
                partner: partnerName,
                invoiceId: `INV-${shipment.id.replace('PROC-', '')}`,
                dueDate: (charges[0].localPagamento === 'Origem' ? shipment.etd : shipment.eta) || addDays(now, 15),
                amount: totalBRL,
                currency: 'BRL',
                processId: shipment.id,
                status: 'Aberto',
                expenseType: 'Operacional'
            });
        }
    
        for (const partnerName in groupedDebits) {
            const charges = groupedDebits[partnerName];
            const totalBRL = calculateTotalInBRL(charges, partnerName, 'cost');
            newFinancialEntries.push({
                type: 'debit',
                partner: partnerName,
                invoiceId: `BILL-${shipment.id.replace('PROC-', '')}-${partnerName.substring(0, 3).toUpperCase()}`,
                dueDate: (charges[0].localPagamento === 'Origem' ? shipment.etd : shipment.eta) || addDays(now, 15),
                amount: totalBRL,
                currency: 'BRL',
                processId: shipment.id,
                status: 'Aberto',
                expenseType: 'Operacional'
            });
        }
    
        const createdEntries = addFinancialEntries(newFinancialEntries);
        
        const updatedCharges = form.getValues('charges').map(charge => {
            const entryForCharge = createdEntries.find(entry => 
                (entry.type === 'credit' && entry.partner === charge.sacado && chargesToFaturar.has(charge.id)) ||
                (entry.type === 'debit' && entry.partner === charge.supplier && chargesToFaturar.has(charge.id))
            );
            return entryForCharge ? { ...charge, financialEntryId: entryForCharge.id } : charge;
        });

        form.setValue('charges', updatedCharges);
        onMainFormSubmit(form.getValues());
        setFinancialEntries(getFinancialEntries());
        setIsFaturarDialogOpen(false);
        setChargesToFaturar(new Set());
    
        toast({
            title: 'Processo Faturado!',
            description: `${createdEntries.length} lançamento(s) financeiro(s) criado(s).`,
            className: 'bg-success text-success-foreground'
        });
    };

    const handleValueChange = (index: number, field: 'cost' | 'sale', newValue: string) => {
        const numericValue = parseFloat(newValue) || 0;
        const charge = watchedCharges[index];
        if (charge.approvalStatus === 'aprovada' && numericValue !== charge[field]) {
            setJustificationData({ chargeIndex: index, field, newValue: numericValue });
        } else {
            updateCharge(index, { ...charge, [field]: numericValue });
        }
    };
    
    const handleConfirmJustification = (justification: string) => {
        if (justificationData) {
            const { chargeIndex, field, newValue } = justificationData;
            const charge = watchedCharges[chargeIndex];
            const updatedCharge = {
                ...charge,
                [field]: newValue,
                approvalStatus: 'pendente' as const,
                justification,
            };
            updateCharge(chargeIndex, updatedCharge);
            onMainFormSubmit(form.getValues());
        }
        setJustificationData(null);
    };
    
    const handleFeeSelection = (feeName: string, index: number) => {
        const fee = fees.find(f => f.name === feeName);
        if (fee) {
            updateCharge(index, {
                ...watchedCharges[index],
                name: fee.name,
                type: fee.unit,
                cost: parseFloat(fee.value) || 0,
                costCurrency: fee.currency,
                sale: parseFloat(fee.value) || 0,
                saleCurrency: fee.currency,
                approvalStatus: 'pendente',
            });
        }
    };


    const sortedMilestones = useMemo(() => {
        if (!shipment) return [];
        return [...(form.getValues('milestones') || [])].sort((a, b) => {
            const dateA = a.predictedDate ? new Date(a.predictedDate).getTime() : 0;
            const dateB = b.predictedDate ? new Date(b.predictedDate).getTime() : 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateA - dateB;
        });
    }, [shipment, form.watch('milestones')]);

    if (!shipment) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                 <SheetContent className="sm:max-w-7xl w-full p-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                 </SheetContent>
            </Sheet>
        );
    }
    
    const isImport = shipment.destination.toUpperCase().includes('BR');

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-7xl w-full p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-4 border-b">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <GanttChart className="h-8 w-8 text-primary"/>
                                </div>
                                <div>
                                    <SheetTitle>Detalhes do Processo: {shipment.id}</SheetTitle>
                                    <Form {...form}>
                                    <div className="text-muted-foreground text-xs md:text-sm flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="po-header">Ref. Cliente:</Label>
                                            <FormField control={form.control} name="purchaseOrderNumber" render={({ field }) => (
                                                <Input id="po-header" {...field} className="h-6 text-xs w-24"/>
                                            )}/>
                                        </div>
                                        <Separator orientation="vertical" className="h-4"/>
                                        <div className="flex items-center gap-1">
                                            <Label htmlFor="inv-header">Invoice:</Label>
                                            <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                                                <Input id="inv-header" {...field} className="h-6 text-xs w-24"/>
                                            )}/>
                                        </div>
                                    </div>
                                    </Form>
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
                                <Button type="button" onClick={handleMasterSave} disabled={isUpdating}>
                                    {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                        <div className="pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <Form {...form}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
                                    <PartnerSelectField name="shipperId" label="Shipper" control={form.control} partners={partners} />
                                    <PartnerSelectField name="consigneeId" label="Consignee" control={form.control} partners={partners} />
                                    <PartnerSelectField name="agentId" label="Agente" control={form.control} partners={partners.filter(p => p.roles.agente)} />
                                    <PartnerSelectField name="notifyId" label="Notify" control={form.control} partners={partners} />
                                </div>
                            </Form>
                            {foreignLocationClock && (
                                <TimeZoneClock label={foreignLocationClock.label} timeZone={foreignLocationClock.timeZone} />
                            )}
                        </div>
                    </SheetHeader>
                    
                    <div className="flex-grow overflow-y-auto">
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onMainFormSubmit)}>
                                <Tabs value={activeTab} onValueChange={setActiveTab}>
                                    <div className="p-4 border-b">
                                    <TabsList>
                                        <TabsTrigger value="timeline">Timeline</TabsTrigger>
                                        <TabsTrigger value="details">Detalhes</TabsTrigger>
                                        <TabsTrigger value="financials">Financeiro</TabsTrigger>
                                        <TabsTrigger value="documents">Documentos</TabsTrigger>
                                        <TabsTrigger value="bl_draft">Draft BL</TabsTrigger>
                                        <TabsTrigger value="desembaraco">Desembaraço</TabsTrigger>
                                    </TabsList>
                                    </div>

                                    <div className="p-4">
                                        <TabsContent value="timeline">
                                            {/* Conteúdo da Timeline aqui */}
                                        </TabsContent>
                                        
                                        <TabsContent value="details">
                                            {/* Conteúdo de Detalhes aqui */}
                                        </TabsContent>

                                        <TabsContent value="financials">
                                        {/* Conteúdo Financeiro aqui */}
                                        </TabsContent>
                                        
                                        <TabsContent value="documents">
                                            {/* Conteúdo de Documentos aqui */}
                                        </TabsContent>
                                        
                                        <TabsContent value="bl_draft">
                                            <BLDraftForm ref={blDraftFormRef} shipment={shipment} onUpdate={onUpdate} isSheet />
                                        </TabsContent>

                                        <TabsContent value="desembaraco">
                                            {isImport 
                                                ? <CustomsClearanceTab shipment={shipment} onUpdate={onUpdate} /> 
                                                : <BLDraftForm ref={blDraftFormRef} shipment={shipment} onUpdate={onUpdate} isSheet />
                                            }
                                        </TabsContent>
                                    
                                    </div>
                                </Tabs>
                            </form>
                        </Form>
                    </div>
                </div>
                
                 <Dialog open={isManualMilestoneOpen} onOpenChange={setIsManualMilestoneOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Tarefa Manual</DialogTitle>
                            <DialogDescription>Insira os detalhes da nova tarefa para este processo.</DialogDescription>
                        </DialogHeader>
                        <Form {...newMilestoneForm}>
                            <form onSubmit={handleAddManualMilestone} className="space-y-4 py-4">
                                <FormField control={newMilestoneForm.control} name="name" render={({field}) => (
                                    <FormItem><FormLabel>Nome da Tarefa</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                                )}/>
                                 <FormField control={newMilestoneForm.control} name="predictedDate" render={({field}) => (
                                    <FormItem className="flex flex-col"><FormLabel>Data Prevista</FormLabel>
                                    <Popover><PopoverTrigger asChild><FormControl>
                                        <Button type="button" variant="outline"><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecione'}</Button>
                                    </FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange}/></PopoverContent></Popover>
                                    <FormMessage/>
                                    </FormItem>
                                )}/>
                                <FormField control={newMilestoneForm.control} name="details" render={({field}) => (
                                    <FormItem><FormLabel>Detalhes (Opcional)</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>
                                )}/>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                                    <Button type="submit">Adicionar Tarefa</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                
                <JustificationDialog
                    open={!!justificationData}
                    onOpenChange={(open) => !open && setJustificationData(null)}
                    onConfirm={handleConfirmJustification}
                />
                 <Dialog open={isFaturarDialogOpen} onOpenChange={setIsFaturarDialogOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Faturar Processo: {shipment.id}</DialogTitle>
                            <DialogDescription>Selecione as despesas que deseja incluir nos lançamentos financeiros.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Taxa</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Parceiro</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {watchedCharges.filter(c => !c.financialEntryId).flatMap(charge => {
                                            const items = [];
                                            if (charge.sacado) {
                                                items.push({ charge, partner: charge.sacado, type: 'credit' as const });
                                            }
                                            if (charge.supplier) {
                                                items.push({ charge, partner: charge.supplier, type: 'debit' as const });
                                            }
                                            return items;
                                        }).map(({ charge, partner, type }) => (
                                            <TableRow key={`${charge.id}-${type}`}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={chargesToFaturar.has(charge.id)}
                                                        onCheckedChange={(checked) => {
                                                            setChargesToFaturar(prev => {
                                                                const newSet = new Set(prev);
                                                                if (checked) newSet.add(charge.id);
                                                                else newSet.delete(charge.id);
                                                                return newSet;
                                                            });
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{charge.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant={type === 'credit' ? 'success' : 'destructive'}>{type === 'credit' ? 'Venda' : 'Custo'}</Badge>
                                                </TableCell>
                                                <TableCell>{partner}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {type === 'credit' ? charge.saleCurrency : charge.costCurrency}{' '}
                                                    {type === 'credit' ? (Number(charge.sale) || 0).toFixed(2) : (Number(charge.cost) || 0).toFixed(2)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                            <Button onClick={handleFaturarProcesso}>Gerar Lançamentos</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </SheetContent>
        </Sheet>
    );
}

    