

'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid, differenceInDays, addDays } from 'date-fns';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter as DialogFooterComponent,
} from '@/components/ui/dialog';
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
    FileText, 
    FileDown, 
    Edit, 
    ChevronsUpDown, 
    Check, 
    Map as MapIcon, 
    Calculator
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
import { runGetTrackingInfo, runGetCourierStatus, runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runGenerateHblPdf, runUpdateShipmentInTracking, runGetRouteMap } from '@/app/actions';
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { BLDraftForm } from './bl-draft-form';
import { PartnerSelectionDialog } from './partner-selection-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { ShipmentMap } from './shipment-map';


const containerDetailSchema = z.object({
  id: z.string(),
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

const blDraftSchemaForSheet = z.object({
  shipper: z.string().optional(),
  consignee: z.string().optional(),
  notify: z.string().optional(),
  marksAndNumbers: z.string().optional(),
  descriptionOfGoods: z.string().optional(),
  grossWeight: z.string().optional(),
  measurement: z.string().optional(),
  ncms: z.array(z.string()).optional(),
  due: z.string().optional(),
  blType: z.enum(['original', 'express']).optional(),
  containers: z.array(z.object({ 
        number: z.string(), 
        seal: z.string(),
        tare: z.string(),
        grossWeight: z.string(),
        volumes: z.string(),
        measurement: z.string(),
    })).optional()
}).optional();

const shipmentDetailsSchema = z.object({
  id: z.string(),
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
  sharingLink: z.string().optional(),
  containers: z.array(containerDetailSchema).optional(),
  documents: z.array(z.object({
      name: z.string(),
      status: z.string(),
      fileName: z.string().optional(),
      uploadedAt: z.date().optional()
  })).optional(),
  charges: z.array(quoteChargeSchemaForSheet).optional(),
  commodityDescription: z.string().optional(),
  ncms: z.array(z.string()).optional(),
  netWeight: z.string().optional(),
  transshipments: z.array(transshipmentDetailSchema).optional(),
  notifyName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  ceMaster: z.string().optional(),
  ceHouse: z.string().optional(),
  manifesto: z.string().optional(),
  terminalRedestinacaoId: z.string().optional(),
  emptyPickupTerminalId: z.string().optional(),
  fullDeliveryTerminalId: z.string().optional(),
  custoArmazenagem: z.coerce.number().optional(),
  details: z.object({ // Add details object to the schema
    incoterm: z.string().optional(),
    cargo: z.string().optional(),
  }),
  blDraftData: blDraftSchemaForSheet, // Use the new partial schema
  shipper: z.any().optional(),
  consignee: z.any().optional(),
  agent: z.any().optional(),
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

interface ShipmentDetailsSheetProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedShipment: Shipment) => void;
}

interface JustificationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (justification: string) => void;
    chargeName: string;
    field: 'Custo' | 'Venda';
    oldValue: string;
    newValue: string;
}

const JustificationDialog = ({ isOpen, onClose, onConfirm, chargeName, field, oldValue, newValue }: JustificationDialogProps) => {
    const [justification, setJustification] = useState('');
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Justificar Alteração de Valor</DialogTitle>
                    <DialogDescription>
                        A alteração de valor para a taxa "{chargeName}" requer uma justificativa para aprovação gerencial.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">{field} Anterior</p>
                            <p className="font-bold text-lg line-through">{oldValue}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{field} Novo</p>
                            <p className="font-bold text-lg text-primary">{newValue}</p>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="justification">Motivo da Alteração</Label>
                        <Textarea
                            id="justification"
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Ex: Negociação com o fornecedor, ajuste de margem, etc."
                            className="mt-2"
                        />
                    </div>
                </div>
                <DialogFooterComponent>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={() => onConfirm(justification)} disabled={justification.trim().length < 10}>
                        Confirmar e Enviar para Aprovação
                    </Button>
                </DialogFooterComponent>
            </DialogContent>
        </Dialog>
    );
};


const MilestoneIcon = ({ status, predictedDate }: { status: Milestone['status'], predictedDate?: Date | null }) => {
    if (!predictedDate || !isValid(predictedDate)) {
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = isPast(predictedDate) && status !== 'completed';

    if (isOverdue) {
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
    if (status === 'completed') {
        return <CheckCircle className="h-6 w-6 text-success" />;
    }
    if (status === 'in_progress') {
        return <Hourglass className="h-6 w-6 text-primary animate-pulse" />;
    }
    return <Circle className="h-6 w-6 text-muted-foreground" />;
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

const chargeTypeOptions = [
    'Por Contêiner', 'Por BL', 'Por Processo', 'W/M', 'Por KG', 'Por AWB', 'Fixo', 'Percentual',
];


export function ShipmentDetailsSheet({ shipment, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCourierSyncing, setIsCourierSyncing] = useState(false);
  const [isInvoicing, setIsInvoicing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const [isGeneratingHbl, setIsGeneratingHbl] = useState(false);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = useState(false);
  const [selectedFees, setSelectedFees] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [editingPartnerType, setEditingPartnerType] = useState<'shipper' | 'consignee' | 'agent' | null>(null);
  const [justificationRequest, setJustificationRequest] = useState<{
        index: number;
        field: 'cost' | 'sale';
        oldValue: number;
        newValue: number;
    } | null>(null);

  
  const form = useForm<ShipmentDetailsFormData>({
    resolver: zodResolver(shipmentDetailsSchema),
  });

  useEffect(() => {
    setPartners(getPartners());
    setFees(getFees());
  }, [open]);

  const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
    control: form.control,
    name: "containers"
  });
  
  const { fields: transshipmentFields, append: appendTransshipment, remove: removeTransshipment } = useFieldArray({
    control: form.control,
    name: "transshipments"
  });
  
  const { fields: documentFields } = useFieldArray({
    control: form.control,
    name: "documents"
  });
  
  const { fields: chargeFields, append: appendCharge, remove: removeCharge, update: updateCharge } = useFieldArray({
    control: form.control,
    name: "charges"
  });

  const { fields: ncmFields, append: appendNcm, remove: removeNcm } = useFieldArray({
    control: form.control,
    name: "ncms",
  });

  const assembledMilestones = useMemo(() => {
    if (!shipment) return [];
    
    const sortedMilestones = [...(shipment.milestones || [])].sort((a, b) => {
        const dateA = a.predictedDate ? new Date(a.predictedDate).getTime() : 0;
        const dateB = b.predictedDate ? new Date(b.predictedDate).getTime() : 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    return sortedMilestones.map(m => ({
        ...m,
        details: m.name === 'Embarque' && shipment.vesselName 
                    ? `${shipment.vesselName} / ${shipment.voyageNumber || ''}` 
                    : m.details,
    }));
  }, [shipment]);

  const { progressPercentage, completedCount, totalCount } = useMemo(() => {
    if (!shipment?.milestones || shipment.milestones.length === 0) {
      return { progressPercentage: 0, completedCount: 0, totalCount: 0 };
    }
    const completed = shipment.milestones.filter(m => m.status === 'completed').length;
    const total = shipment.milestones.length;
    return {
      progressPercentage: total > 0 ? (completed / total) * 100 : 0,
      completedCount: completed,
      totalCount: total,
    };
  }, [shipment]);
  
  const { shipper, consignee, agent } = shipment || {};

  useEffect(() => {
    if (shipment) {
      form.reset({
        id: shipment.id,
        shipper: shipment.shipper,
        consignee: shipment.consignee,
        agent: shipment.agent,
        carrier: shipment.carrier || '',
        vesselName: shipment.vesselName || '',
        voyageNumber: shipment.voyageNumber || '',
        masterBillNumber: shipment.masterBillNumber || '',
        houseBillNumber: shipment.houseBillNumber || '',
        bookingNumber: shipment.bookingNumber || '',
        mblPrintingAtDestination: shipment.mblPrintingAtDestination || false,
        mblPrintingAuthDate: shipment.mblPrintingAuthDate && isValid(new Date(shipment.mblPrintingAuthDate)) ? new Date(shipment.mblPrintingAuthDate) : undefined,
        courier: shipment.courier,
        courierNumber: shipment.courierNumber || '',
        courierLastStatus: shipment.courierLastStatus || '',
        etd: shipment.etd && isValid(new Date(shipment.etd)) ? new Date(shipment.etd) : undefined,
        eta: shipment.eta && isValid(new Date(shipment.eta)) ? new Date(shipment.eta) : undefined,
        origin: shipment.origin || '',
        destination: shipment.destination || '',
        collectionAddress: shipment.collectionAddress || '',
        deliveryAddress: shipment.deliveryAddress || '',
        dischargeTerminal: shipment.dischargeTerminal || '',
        sharingLink: shipment.sharingLink || '',
        containers: shipment.containers?.map(c => ({...c, freeTime: shipment.details?.freeTime || c.freeTime, volumes: c.volumes || '', measurement: c.measurement || ''})) || [],
        charges: shipment.charges.map(c => ({ ...c, approvalStatus: c.approvalStatus || 'aprovada' })) || [],
        documents: shipment.documents || [],
        commodityDescription: shipment.commodityDescription || '',
        ncms: shipment.ncms || [],
        netWeight: shipment.netWeight || '',
        transshipments: shipment.transshipments?.map(t => ({
          ...t,
          etd: t.etd && isValid(new Date(t.etd)) ? new Date(t.etd) : undefined,
          eta: t.eta && isValid(new Date(t.eta)) ? new Date(t.eta) : undefined,
        })) || [],
        notifyName: shipment.notifyName || '',
        invoiceNumber: shipment.invoiceNumber || '',
        purchaseOrderNumber: shipment.purchaseOrderNumber || '',
        ceMaster: shipment.ceMaster || '',
        ceHouse: shipment.ceHouse || '',
        manifesto: shipment.manifesto || '',
        terminalRedestinacaoId: shipment.terminalRedestinacaoId || '',
        emptyPickupTerminalId: shipment.emptyPickupTerminalId || '',
        fullDeliveryTerminalId: shipment.fullDeliveryTerminalId || '',
        custoArmazenagem: shipment.custoArmazenagem || undefined,
        details: {
          incoterm: shipment.details?.incoterm,
          cargo: shipment.details?.cargo,
        },
        blDraftData: shipment.blDraftData,
      });
    }
  }, [shipment, form]);

  const watchedCourier = form.watch('courier');
  const watchedCourierNumber = form.watch('courierNumber');
  const mblPrintingAtDestination = form.watch('mblPrintingAtDestination');
  const mblPrintingAuthDate = form.watch('mblPrintingAuthDate');
  const watchedCharges = form.watch('charges');
  const watchedContainers = form.watch('containers');
  const watchedCustoArmazenagem = form.watch('custoArmazenagem');
  const incoterm = form.watch('details.incoterm');

  const totalsSummary = useMemo(() => {
    if (!watchedContainers) return { containerCount: 0, totalGrossWeight: 0, totalVolumes: 0 };
    
    const containerCount = watchedContainers.length;
    const totalGrossWeight = watchedContainers.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0);
    const totalVolumes = watchedContainers.reduce((sum, c) => sum + (parseInt(c.volumes || '0') || 0), 0);

    return { containerCount, totalGrossWeight, totalVolumes };
  }, [watchedContainers]);

  const freeTimeInfo = useMemo(() => {
    if (!shipment || !shipment.milestones) return null;
  
    const isImport = shipment.destination.toUpperCase().includes('BR');
  
    if (isImport) { // Import Demurrage
      const arrivalMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('chegada'));
      const arrivalDate = arrivalMilestone?.effectiveDate || arrivalMilestone?.predictedDate;
      const freeDays = parseInt(shipment.details?.freeTime || '7', 10);

      if (isNaN(freeDays) || !arrivalDate || !isValid(new Date(arrivalDate))) return null;
      
      const freeTimeDueDate = addDays(new Date(arrivalDate), freeDays - 1); // Day 0 is arrival day
      const daysRemaining = differenceInDays(freeTimeDueDate, new Date());
      let variant: 'success' | 'warning' | 'destructive' = 'success';
      if (daysRemaining <= 3 && daysRemaining >= 0) variant = 'warning';
      if (daysRemaining < 0) variant = 'destructive';
      return {
        dueDate: format(freeTimeDueDate, 'dd/MM/yyyy'),
        daysRemaining,
        variant,
      };
    } else { // Export Detention
      const emptyPickupMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('retirada do vazio'));
      const emptyPickupDate = emptyPickupMilestone?.effectiveDate || emptyPickupMilestone?.predictedDate;
      const freeDays = parseInt(shipment.details?.freeTime || '7', 10);
      if (isNaN(freeDays) || !emptyPickupDate || !isValid(new Date(emptyPickupDate))) return null;
      const freeTimeDueDate = addDays(new Date(emptyPickupDate), freeDays - 1);
      const daysRemaining = differenceInDays(freeTimeDueDate, new Date());
      let variant: 'success' | 'warning' | 'destructive' = 'success';
      if (daysRemaining <= 3 && daysRemaining >= 0) variant = 'warning';
      if (daysRemaining < 0) variant = 'destructive';
      return {
        dueDate: format(freeTimeDueDate, 'dd/MM/yyyy'),
        daysRemaining,
        variant,
      };
    }
  }, [shipment]);


  useEffect(() => {
    if (watchedCustoArmazenagem && watchedCustoArmazenagem > 0) {
        const terminalId = form.getValues('terminalRedestinacaoId');
        const terminal = partners.find(p => p.id?.toString() === terminalId);
        
        const chargesWithoutStorage = watchedCharges.filter(c => 
            c.name !== 'ARMAZENAGEM' && c.name !== 'COMISSÃO SOBRE ARMAZENAGEM'
        );
        
        let newCharges = [...chargesWithoutStorage];
        
        newCharges.push({
            id: `storage-${Date.now()}`,
            name: 'ARMAZENAGEM',
            type: 'Fixo',
            cost: watchedCustoArmazenagem,
            costCurrency: 'BRL',
            sale: watchedCustoArmazenagem,
            saleCurrency: 'BRL',
            supplier: terminal?.name || 'Terminal a Definir',
            sacado: shipment?.customer,
            approvalStatus: 'aprovada',
            financialEntryId: null
        });

        if (terminal && terminal.terminalCommission && terminal.terminalCommission.amount) {
            const commissionRate = terminal.terminalCommission.amount / 100;
            const commissionValue = watchedCustoArmazenagem * commissionRate;
            
            const debitEntryId = addFinancialEntry({
                type: 'debit',
                partner: terminal.name,
                invoiceId: `COMM-${shipment?.id}`,
                dueDate: addDays(new Date(), 30).toISOString(),
                amount: commissionValue,
                currency: 'BRL',
                processId: shipment!.id,
                status: 'Aberto',
                description: `Comissão sobre armazenagem do processo ${shipment?.id}`
            });
            
            newCharges.push({
                id: `commission-${Date.now()}`,
                name: 'COMISSÃO SOBRE ARMAZENAGEM',
                type: 'Fixo',
                cost: 0, 
                costCurrency: 'BRL',
                sale: commissionValue, 
                saleCurrency: 'BRL',
                supplier: 'CargaInteligente',
                sacado: terminal.name, 
                approvalStatus: 'aprovada',
                financialEntryId: debitEntryId,
            });

             toast({
                title: 'Fatura de Comissão Gerada!',
                description: `Uma fatura de BRL ${commissionValue.toFixed(2)} foi gerada para o terminal ${terminal.name}.`,
                className: 'bg-success text-success-foreground'
            });
        }
        form.setValue('charges', newCharges as any);
    }
  }, [watchedCustoArmazenagem]); 


  const onSubmit = (data: ShipmentDetailsFormData) => {
    if (!shipment) return;
    const updatedShipment: Shipment = {
      ...shipment,
      ...data,
      collectionAddress: data.collectionAddress || shipment.collectionAddress,
      deliveryAddress: data.deliveryAddress || shipment.deliveryAddress,
      dischargeTerminal: data.dischargeTerminal || shipment.dischargeTerminal,
    };
    onUpdate(updatedShipment);
  };
  
  const handleMilestoneUpdate = (milestoneIndex: number, field: 'predictedDate' | 'effectiveDate', value: Date | undefined) => {
    if (!shipment || !value) return;

    let updatedMilestones = [...shipment.milestones];
    const targetMilestone = updatedMilestones[milestoneIndex];
    if(targetMilestone) {
        (targetMilestone as any)[field] = value;

        if (field === 'effectiveDate' && value) {
            targetMilestone.status = 'completed';
        }
        
        updatedMilestones.sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());
        
        onUpdate({
            ...shipment,
            milestones: updatedMilestones
        });
    }
  };

  const handleDocumentChange = (index: number, newStatus: DocumentStatus['status'], fileName?: string) => {
      if (!shipment) return;
      
      const currentDocuments = [...(form.getValues('documents') || [])];
  
      if (currentDocuments[index]) {
          currentDocuments[index].status = newStatus;
          if (fileName) {
              currentDocuments[index].fileName = fileName;
              currentDocuments[index].uploadedAt = new Date();
          }
          const updatedShipment: Shipment = { ...shipment, documents: currentDocuments };
          onUpdate(updatedShipment);
      }
  };

  const handleUploadClick = (index: number) => {
    const uploader = fileInputRef.current;
    if (uploader) {
      uploader.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          handleDocumentChange(index, 'uploaded', file.name);
          toast({
            title: "Arquivo Selecionado!",
            description: `${file.name} foi carregado com sucesso.`,
            className: 'bg-success text-success-foreground'
          });
        }
        uploader.value = '';
      };
      uploader.click();
    }
  };
  
  const handleInvoiceShipment = async () => {
    if (!shipment) return;
    setIsInvoicing(true);
    
    try {
        const chargesToInvoice = (form.getValues('charges') || []).filter(c => !c.financialEntryId);

        if (chargesToInvoice.length === 0) {
            toast({ title: "Nenhuma nova despesa", description: "Todas as despesas deste processo já foram faturadas." });
            setIsInvoicing(false);
            return;
        }

        const updatedChargesMap = new Map<string, string>();
        let entriesCreated = 0;
        
        const groupBy = <T, K extends keyof any>(list: T[], getKey: (item: T) => K) =>
            list.reduce((previous, currentItem) => {
                const group = getKey(currentItem);
                if (!previous[group]) previous[group] = [];
                previous[group].push(currentItem);
                return previous;
            }, {} as Record<K, T[]>);

        const creditCharges = chargesToInvoice.filter(c => c.sacado === shipment.customer);
        const debitCharges = chargesToInvoice.filter(c => c.sacado !== shipment.customer);

        const groupedCredits = groupBy(creditCharges, charge => `${charge.sacado}-${charge.saleCurrency}`);
        const groupedDebits = groupBy(debitCharges, charge => `${charge.supplier}-${charge.costCurrency}`);
        
        for (const key in groupedCredits) {
            const [partner, currency] = key.split('-');
            const charges = groupedCredits[key];
            const totalAmount = charges.reduce((sum, charge) => sum + charge.sale, 0);

            if (totalAmount > 0) {
                const entryId = addFinancialEntry({
                    type: 'credit', partner, currency: currency as any,
                    invoiceId: `INV-${shipment.id}`,
                    dueDate: addDays(new Date(), 30).toISOString(),
                    amount: totalAmount, processId: shipment.id, status: 'Aberto',
                });
                charges.forEach(c => updatedChargesMap.set(c.id, entryId!));
                entriesCreated++;
            }
        }
        
        for (const key in groupedDebits) {
            const [partner, currency] = key.split('-');
            const charges = groupedDebits[key];
            const totalAmount = charges.reduce((sum, charge) => sum + charge.cost, 0);
             if (totalAmount > 0) {
                const entryId = addFinancialEntry({
                    type: 'debit', partner, currency: currency as any,
                    invoiceId: `BILL-${shipment.id}-${partner.substring(0,3).toUpperCase()}`,
                    dueDate: addDays(new Date(), 30).toISOString(),
                    amount: totalAmount, processId: shipment.id, status: 'Aberto',
                });
                charges.forEach(c => updatedChargesMap.set(c.id, entryId!));
                entriesCreated++;
            }
        }
        
        const finalCharges = (form.getValues('charges') || []).map(c => {
            if (updatedChargesMap.has(c.id)) {
                return { ...c, financialEntryId: updatedChargesMap.get(c.id) };
            }
            return c;
        });

        onUpdate({ ...shipment, charges: finalCharges as any });

        toast({
            title: "Processo Faturado com Sucesso!",
            description: `${entriesCreated} lançamento(s) financeiro(s) foram gerados.`,
            className: 'bg-success text-success-foreground'
        });
        router.refresh();
      
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Erro ao Faturar", description: error.message });
    } finally {
        setIsInvoicing(false);
    }
  };

  const handleSyncBookingInfo = async () => {
    const trackingNumber = form.getValues('bookingNumber');
    const carrier = form.getValues('carrier');

    if (!trackingNumber) {
        toast({ variant: 'destructive', title: 'Nenhum Número de Booking', description: 'Por favor, insira um número de Booking para sincronizar.' });
        return;
    }
    if (!carrier) {
        toast({ variant: 'destructive', title: 'Nenhum Armador', description: 'Por favor, insira o nome do Armador para sincronizar.' });
        return;
    }
    setIsSyncing(true);

    const trackingResponse = await runGetTrackingInfo({ trackingNumber, carrier });

    if (trackingResponse.success && shipment) {
      const { shipmentDetails } = trackingResponse.data;
      const updatedShipmentData = {
          ...shipment,
          ...shipmentDetails,
          id: shipment.id,
          customer: shipment.customer,
          shipper: shipment.shipper,
          consignee: shipment.consignee,
          agent: shipment.agent,
          charges: shipment.charges,
          details: shipment.details,
      };
      
      onUpdate(updatedShipmentData as Shipment);
      
      toast({
        title: 'Embarque Sincronizado!',
        description: `Os dados de ${trackingNumber} foram atualizados.`,
        className: 'bg-success text-success-foreground'
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro na Sincronização',
        description: trackingResponse.error,
      });
    }
    
    setIsSyncing(false);
  };

  const handleSyncCourierStatus = async () => {
      const courier = form.getValues('courier');
      const trackingNumber = form.getValues('courierNumber');

      if (!courier || !trackingNumber) {
          toast({ variant: 'destructive', title: 'Dados Incompletos', description: 'Por favor, selecione um courrier e insira o número de rastreio.' });
          return;
      }
      setIsCourierSyncing(true);
      const response = await runGetCourierStatus({ courier, trackingNumber });
      if (response.success) {
          form.setValue('courierLastStatus', response.data.lastStatus);
          toast({ title: 'Status do Courrier Sincronizado!', className: 'bg-success text-success-foreground' });
      } else {
          toast({ variant: 'destructive', title: 'Erro ao Sincronizar', description: response.error });
      }
      setIsCourierSyncing(false);
  };

  const handleToggleMblPrinting = () => {
      const isEnabled = form.getValues('mblPrintingAtDestination');
      form.setValue('mblPrintingAtDestination', !isEnabled);
      if (!isEnabled) {
          form.setValue('mblPrintingAuthDate', new Date());
          form.setValue('courier', undefined);
          form.setValue('courierNumber', '');
          form.setValue('courierLastStatus', '');
      } else {
          form.setValue('mblPrintingAuthDate', undefined);
      }
  };

  const handleAddSelectedFees = () => {
    if (!shipment) return;
    
    const newCharges = fees
        .filter(fee => selectedFees.has(fee.id!))
        .map((fee): QuoteCharge => ({
            id: `fee-${fee.id}-${Date.now()}`,
            name: fee.name,
            type: fee.unit,
            cost: parseFloat(fee.value) || 0,
            costCurrency: fee.currency,
            sale: parseFloat(fee.value) || 0,
            saleCurrency: fee.currency,
            supplier: 'CargaInteligente',
            sacado: shipment.customer,
            approvalStatus: 'aprovada',
            financialEntryId: null,
        }));
        
    newCharges.forEach(charge => appendCharge(charge as any));
    setIsFeeDialogOpen(false);
    setSelectedFees(new Set());
  };
  
  const handleChargeValueChange = (index: number, field: 'cost' | 'sale', value: string) => {
      const parsedValue = parseFloat(value) || 0;
      const charge = watchedCharges[index];
      const oldValue = Number(charge[field]) || 0;
      
      if (charge.approvalStatus === 'aprovada' && parsedValue !== oldValue) {
          setJustificationRequest({
              index,
              field,
              oldValue: oldValue,
              newValue: parsedValue,
          });
      } else {
          updateCharge(index, { ...charge, [field]: parsedValue });
      }
  };
    
    const handleJustificationSubmit = (justification: string) => {
        if (!justificationRequest) return;

        const { index, field, newValue } = justificationRequest;
        const charge = watchedCharges[index];

        updateCharge(index, {
            ...charge,
            [field]: newValue,
            approvalStatus: 'pendente',
            justification: justification,
        });
        
        toast({
            title: "Alteração Enviada para Aprovação",
            description: `A alteração na despesa "${charge.name}" foi registrada e aguarda aprovação da gerência.`,
            className: "bg-amber-100 dark:bg-amber-900/30 border-amber-400"
        });
        
        setJustificationRequest(null);
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
       toast({
        title: "Taxa Atualizada",
        description: `A despesa foi atualizada para ${fee.name} e marcada como pendente de aprovação.`,
        className: "bg-amber-100 dark:bg-amber-900/30 border-amber-400"
      });
    }
  };

  const handleGenerateInvoicePdf = async (charge: QuoteCharge) => {
    if (!shipment || !charge.financialEntryId) {
        toast({ variant: 'destructive', title: "Fatura não encontrada", description: "Esta despesa ainda não foi faturada."});
        return;
    }
    setIsGeneratingPdf(charge.id);
    const financialEntries = getFinancialEntries();
    
    const entry = financialEntries.find(e => e.id === charge.financialEntryId);

    if (!entry) {
        toast({ variant: 'destructive', title: "Lançamento não encontrado", description: `Não foi possível localizar o lançamento financeiro.` });
        setIsGeneratingPdf(null);
        return;
    }
    
    const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const response = await runGenerateClientInvoicePdf({
        invoiceNumber: entry.invoiceId,
        customerName: entry.partner,
        customerAddress: shipment.consignee?.address ? `${shipment.consignee.address.street}, ${shipment.consignee.address.city}` : 'Endereço não disponível',
        date: new Date().toLocaleDateString('pt-br'),
        charges: [{
            description: charge.name,
            quantity: 1,
            value: formatValue(charge.sale),
            total: formatValue(charge.sale),
            currency: charge.saleCurrency
        }],
        total: formatValue(entry.amount),
        exchangeRate: 5.0,
        bankDetails: {
            bankName: "LTI GLOBAL",
            accountNumber: "PIX: 10.298.168/0001-89"
        }
    });

    if (response.success && response.data?.html) {
        const newWindow = window.open();
        newWindow?.document.write(response.data.html);
        newWindow?.document.close();
    } else {
         toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: response.error });
    }
    setIsGeneratingPdf(null);
  };

  const getPaymentStatus = (charge: QuoteCharge): { saleStatus: 'Pago' | 'Aberto', costStatus: 'Pago' | 'Aberto' | 'N/A' } => {
    const financialEntries = getFinancialEntries();
    
    const saleEntry = financialEntries.find(e => e.id === charge.financialEntryId && e.type === 'credit' && e.partner === charge.sacado);
    const costEntry = financialEntries.find(e => e.id === charge.financialEntryId && e.type === 'debit' && e.partner === charge.supplier);

    const isSalePaid = saleEntry ? (saleEntry.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0) >= saleEntry.amount : false;
    const isCostPaid = costEntry ? (costEntry.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0) >= costEntry.amount : false;
    
    return {
        saleStatus: !saleEntry ? 'Aberto' : isSalePaid ? 'Pago' : 'Aberto',
        costStatus: !costEntry ? 'Aberto' : isCostPaid ? 'Pago' : 'Aberto'
    };
  };

  const docStatusMap: Record<DocumentStatus['status'], { variant: 'secondary' | 'default' | 'success'; text: string; icon: React.ElementType }> = {
    pending: { variant: 'secondary', text: 'Pendente', icon: Circle },
    uploaded: { variant: 'default', text: 'Enviado', icon: CircleDot },
    approved: { variant: 'success', text: 'Aprovado', icon: FileCheck },
  };

  const hasPendingCharges = useMemo(() => {
    return watchedCharges?.some(c => c.approvalStatus === 'pendente');
  }, [watchedCharges]);

  const allChargesInvoiced = useMemo(() => {
    if (!watchedCharges || watchedCharges.length === 0) return true;
    return watchedCharges.every(c => !!c.financialEntryId);
  }, [watchedCharges]);

  const handleGenerateHbl = async (isOriginal: boolean) => {
      if (!shipment) return;

      if (!shipment.blDraftData) {
          toast({ variant: 'destructive', title: 'Draft não encontrado', description: 'O cliente ainda não preencheu as instruções de embarque.' });
          return;
      }
      setIsGeneratingHbl(true);
      try {
          const { blDraftData, carrier, etd } = shipment;
          const companySettings = JSON.parse(localStorage.getItem('company_settings') || '{}');
          const logoDataUrl = companySettings.logoDataUrl;
          const signatureUrl = 'https://placehold.co/200x60.png?text=Assinatura'; // Simplified

          const payload = {
              isOriginal,
              blNumber: shipment.houseBillNumber || `HBL-${shipment.id}`,
              shipper: blDraftData.shipper,
              consignee: blDraftData.consignee,
              notifyParty: blDraftData.notify,
              vesselAndVoyage: `${shipment.vesselName || ''} / ${shipment.voyageNumber || ''}`,
              portOfLoading: shipment.origin,
              portOfDischarge: shipment.destination,
              finalDestination: shipment.destination,
              marksAndNumbers: blDraftData.marksAndNumbers,
              packageDescription: blDraftData.descriptionOfGoods,
              grossWeight: blDraftData.grossWeight,
              measurement: blDraftData.measurement,
              containerAndSeal: shipment.containers?.map(c => `${c.number} / ${c.seal}`).join('\n') || 'N/A',
              freightPayableAt: 'Origin',
              numberOfOriginals: blDraftData.blType === 'original' ? '3 (TRÊS)' : '0 (ZERO)',
              issueDate: format(new Date(), 'dd-MMM-yyyy'),
              shippedOnBoardDate: etd ? format(etd, 'dd-MMM-yyyy') : format(new Date(), 'dd-MMM-yyyy'),
              signatureUrl: signatureUrl,
              companyLogoUrl: logoDataUrl,
              companyName: companySettings.razaoSocial || 'CargaInteligente',
          };

          const response = await runGenerateHblPdf(payload);

          if (response.success && response.data.html) {
              const newWindow = window.open();
              newWindow?.document.write(response.data.html);
              newWindow?.document.close();
          } else {
              throw new Error(response.error || 'Falha ao gerar o HTML do HBL.');
          }
      } catch (e: any) {
          toast({ variant: "destructive", title: "Erro ao Gerar HBL", description: e.message });
      } finally {
          setIsGeneratingHbl(false);
      }
  };


  if (!shipment) {
    return null;
  }
  
  const cargoDescription = shipment.details?.cargo?.toLowerCase() || '';
  const isMaritimeImport = shipment.destination.toUpperCase().includes('BR') && !cargoDescription.includes('kg');
  const isMaritimeExport = shipment.origin.toUpperCase().includes('BR') && !cargoDescription.includes('kg');
  const deliveryIncoterms = ['DAP', 'DPU', 'DDP', 'DDU'];
  const showDeliveryField = deliveryIncoterms.includes(incoterm || '');

  const handleViewQuote = async () => {
    setIsGeneratingPdf(shipment.quoteId);
     const allShipments = getShipments();
     const relatedQuoteShipment = allShipments.find(s => s.id === shipment.id);
     
     if (!relatedQuoteShipment) {
         toast({variant: 'destructive', title: 'Embarque não encontrado'});
         setIsGeneratingPdf(null);
         return;
     }

    const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const charges = relatedQuoteShipment.charges.map(c => ({
        description: c.name,
        quantity: 1,
        value: formatValue(c.sale),
        total: formatValue(c.sale),
        currency: c.saleCurrency
    }));
    
    const totalBRL = relatedQuoteShipment.charges.reduce((sum, charge) => {
        const rate = charge.saleCurrency === 'USD' ? 5.0 : 1;
        return sum + (charge.sale * rate);
    }, 0);

    const response = await runGenerateClientInvoicePdf({
        invoiceNumber: relatedQuoteShipment.quoteId,
        customerName: relatedQuoteShipment.customer,
        customerAddress: relatedQuoteShipment.consignee?.address ? `${relatedQuoteShipment.consignee.address.street}, ${relatedQuoteShipment.consignee.address.city}` : 'Endereço não disponível',
        date: new Date(relatedQuoteShipment.milestones[0]?.predictedDate || Date.now()).toLocaleDateString('pt-br'),
        charges,
        total: formatValue(totalBRL),
        exchangeRate: 5.0,
        bankDetails: { bankName: "LTI GLOBAL", accountNumber: "PIX: 10.298.168/0001-89" }
    });

    if (response.success && response.data?.html) {
        const newWindow = window.open();
        newWindow?.document.write(response.data.html);
        newWindow?.document.close();
    } else {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: response.error });
    }
    setIsGeneratingPdf(null);
};

const terminalPartners = partners.filter(p => p.tipoFornecedor?.terminal);

const handlePartnerUpdate = (partner: Partner) => {
    if (!editingPartnerType) return;
    
    form.setValue(editingPartnerType, partner);
    
    toast({
        title: 'Parceiro Atualizado!',
        description: `O ${editingPartnerType} foi alterado para ${partner.name}. Salve para confirmar.`,
        className: 'bg-primary text-primary-foreground'
    });
    setEditingPartnerType(null);
};


  return (
      <>
      <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="sm:max-w-6xl w-full flex flex-col">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                  <SheetHeader>
                      <SheetTitle>Detalhes do Embarque: {shipment.id}</SheetTitle>
                      <SheetDescription>
                          Rota de {shipment.origin} para {shipment.destination} para <strong>{shipment.customer}</strong>
                      </SheetDescription>
                  </SheetHeader>
                  <input type="file" ref={fileInputRef} className="hidden" />

                  <Tabs defaultValue="milestones" className="flex-grow flex flex-col overflow-hidden mt-4">
                    <TabsList className="grid w-full grid-cols-7 mb-4">
                        <TabsTrigger value="dados_embarque">Dados do Embarque</TabsTrigger>
                        <TabsTrigger value="bl_draft">Draft BL</TabsTrigger>
                        <TabsTrigger value="documentos">Documentos</TabsTrigger>
                        <TabsTrigger value="milestones">Milestones & Tracking</TabsTrigger>
                        <TabsTrigger value="mapa">Mapa</TabsTrigger>
                        <TabsTrigger value="mercadoria">Mercadoria & Container</TabsTrigger>
                        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                        <TabsContent value="dados_embarque" className="mt-0 space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2 flex-row items-center justify-between">
                                        <CardTitle className="text-base">Shipper (Exportador)</CardTitle>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingPartnerType('shipper')}><Edit className="h-4 w-4"/></Button>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <p className="font-semibold">{form.watch('shipper')?.name}</p>
                                        <p className="text-muted-foreground">{form.watch('shipper')?.address?.city}, {form.watch('shipper')?.address?.country}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2 flex-row items-center justify-between">
                                        <CardTitle className="text-base">Consignee (Importador)</CardTitle>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingPartnerType('consignee')}><Edit className="h-4 w-4"/></Button>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <p className="font-semibold">{form.watch('consignee')?.name}</p>
                                        <p className="text-muted-foreground">{form.watch('consignee')?.address?.city}, {form.watch('consignee')?.address?.country}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2 flex-row items-center justify-between">
                                        <CardTitle className="text-base">Agente</CardTitle>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingPartnerType('agent')}><Edit className="h-4 w-4"/></Button>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        {form.watch('agent') ? (
                                            <>
                                                <p className="font-semibold">{form.watch('agent')?.name}</p>
                                                <p className="text-muted-foreground">{form.watch('agent')?.address?.city}, {form.watch('agent')?.address?.country}</p>
                                            </>
                                        ) : (
                                            <p className="text-muted-foreground">Embarque Direto</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            
                            {freeTimeInfo && (
                                <Card className={cn("border-2", freeTimeInfo.variant === 'warning' && 'border-amber-500', freeTimeInfo.variant === 'destructive' && 'border-destructive')}>
                                    <CardHeader className="flex flex-row items-center justify-between p-4">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Clock className={cn(freeTimeInfo.variant === 'warning' && 'text-amber-500', freeTimeInfo.variant === 'destructive' && 'text-destructive')} /> Controle de Free Time
                                            </CardTitle>
                                            <CardDescription>
                                                O prazo para devolução/entrega do contêiner é <strong>{freeTimeInfo.dueDate}</strong>.
                                            </CardDescription>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-2xl font-bold", freeTimeInfo.variant === 'warning' && 'text-amber-500', freeTimeInfo.variant === 'destructive' && 'text-destructive')}>
                                                {freeTimeInfo.daysRemaining}
                                            </p>
                                            <p className="text-xs text-muted-foreground">dias restantes</p>
                                        </div>
                                    </CardHeader>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Dados da Viagem/Voo e Documentos</CardTitle>
                                    <CardDescription>
                                        Cotação de origem:
                                        <Button variant="link" className="p-0 h-auto ml-1 text-base" onClick={handleViewQuote} disabled={isGeneratingPdf === shipment.quoteId}>
                                            {isGeneratingPdf === shipment.quoteId ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                            {shipment.quoteId}
                                        </Button>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 items-end">
                                        {incoterm === 'EXW' && (
                                            <FormField control={form.control} name="collectionAddress" render={({ field }) => (
                                                <FormItem><FormLabel>Local de Coleta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        )}
                                        {showDeliveryField && (
                                            <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                                                <FormItem><FormLabel>Local de Entrega</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                        )}
                                        <FormField control={form.control} name="origin" render={({ field }) => (
                                            <FormItem><FormLabel>Porto/Aeroporto Origem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="destination" render={({ field }) => (
                                            <FormItem><FormLabel>Porto/Aeroporto Destino</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                         {isMaritimeImport && (
                                            <FormField
                                                control={form.control}
                                                name="dischargeTerminal"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Terminal de Descarga</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {terminalPartners.map(t => (<SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                         )}
                                        {isMaritimeExport && (
                                            <>
                                                <FormField
                                                    control={form.control}
                                                    name="emptyPickupTerminalId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Terminal de Retirada (Vazio)</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {terminalPartners.map(t => (<SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="fullDeliveryTerminalId"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Terminal de Entrega (Cheio)</FormLabel>
                                                             <Select onValueChange={field.onChange} value={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {terminalPartners.map(t => (<SelectItem key={t.id} value={t.id!.toString()}>{t.name}</SelectItem>))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </>
                                        )}
                                        <FormField control={form.control} name="details.incoterm" render={({ field }) => (
                                            <FormItem><FormLabel>Incoterm</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                        <FormField control={form.control} name="carrier" render={({ field }) => (
                                            <FormItem><FormLabel>Armador</FormLabel><FormControl><Input placeholder="Maersk" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="bookingNumber" render={({ field }) => (
                                            <FormItem><FormLabel>Booking Reference</FormLabel>
                                                <div className="flex items-center gap-2">
                                                <FormControl><Input placeholder="BKG123456" {...field} value={field.value ?? ''} /></FormControl>
                                                <Button type="button" variant="outline" size="icon" onClick={() => runUpdateShipmentInTracking({ shipmentNumber: form.getValues('bookingNumber') })} disabled={isSyncing} title="Forçar atualização dos dados do booking">
                                                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                </Button>
                                                </div>
                                            <FormMessage />
                                            </FormItem>
                                        )}/>
                                        <FormField control={form.control} name="masterBillNumber" render={({ field }) => (
                                            <FormItem><FormLabel>Master Bill of Lading / MAWB</FormLabel><FormControl><Input placeholder="MSCU12345678" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="vesselName" render={({ field }) => (
                                            <FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input placeholder="MSC LEO" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="voyageNumber" render={({ field }) => (
                                            <FormItem><FormLabel>Viagem / Nº Voo</FormLabel><FormControl><Input placeholder="AB123C" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="houseBillNumber" render={({ field }) => (
                                            <FormItem><FormLabel>House Bill of Lading / HAWB</FormLabel><FormControl><Input placeholder="MYHBL12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                         <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                                            <FormItem><FormLabel>Invoice Nº</FormLabel><FormControl><Input placeholder="INV-12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="purchaseOrderNumber" render={({ field }) => (
                                            <FormItem><FormLabel>Purchase Order (PO) Nº</FormLabel><FormControl><Input placeholder="PO-67890" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="notifyName" render={({ field }) => (
                                            <FormItem><FormLabel>Notify Party</FormLabel><FormControl><Input placeholder="Nome do Notify" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                        <FormField control={form.control} name="etd" render={({ field }) => (
                                            <FormItem className="flex flex-col"><FormLabel>ETD</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild><FormControl>
                                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : (<span>Selecione a data</span>)}
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
                                                            {field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : (<span>Selecione a data</span>)}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl></PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                                </Popover>
                                            <FormMessage /></FormItem>
                                        )}/>
                                        <div>
                                            <Label>Transit Time</Label>
                                            <Input value={shipment.details.transitTime} disabled className="mt-2" />
                                        </div>
                                    </div>
                                    {isMaritimeImport && (
                                        <>
                                            <Separator/>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in-50 duration-300">
                                                <FormField control={form.control} name="ceMaster" render={({ field }) => (
                                                    <FormItem><FormLabel>CE MASTER</FormLabel><FormControl><Input placeholder="Nº CE Master" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <FormField control={form.control} name="ceHouse" render={({ field }) => (
                                                    <FormItem><FormLabel>CE HOUSE</FormLabel><FormControl><Input placeholder="Nº CE House" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                                <FormField control={form.control} name="manifesto" render={({ field }) => (
                                                    <FormItem><FormLabel>MANIFESTO</FormLabel><FormControl><Input placeholder="Nº Manifesto" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                                )}/>
                                            </div>
                                        </>
                                    )}
                                    {isMaritimeImport && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="terminalRedestinacaoId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Terminal de Redestinação</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione um terminal..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {terminalPartners.map(t => (
                                                                    <SelectItem key={t.id} value={t.id!.toString()}>
                                                                        {t.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg flex items-center gap-2"><GanttChart />Transbordos / Conexões</CardTitle>
                                        <Button type="button" size="sm" variant="outline" onClick={() => appendTransshipment({ id: `new-${transshipmentFields.length}`, port: '', vessel: '' })}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {transshipmentFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border rounded-lg items-end relative">
                                            <FormField control={form.control} name={`transshipments.${index}.port`} render={({ field }) => (
                                                <FormItem className="col-span-1 md:col-span-2"><FormLabel>Porto / Aeroporto</FormLabel><FormControl><Input placeholder="Ex: Antuérpia" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`transshipments.${index}.vessel`} render={({ field }) => (
                                                <FormItem className="col-span-1 md:col-span-1"><FormLabel>Navio / Voo</FormLabel><FormControl><Input placeholder="Ex: MAERSK HONAM" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`transshipments.${index}.etd`} render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>ETD</FormLabel>
                                                    <Popover><PopoverTrigger asChild><FormControl>
                                                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value && isValid(field.value) ? format(field.value, "dd/MM/yy") : <span>Data</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                <FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`transshipments.${index}.eta`} render={({ field }) => (
                                                <FormItem className="flex flex-col"><FormLabel>ETA</FormLabel>
                                                    <Popover><PopoverTrigger asChild><FormControl>
                                                        <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value && isValid(field.value) ? format(field.value, "dd/MM/yy") : <span>Data</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover>
                                                <FormMessage /></FormItem>
                                            )}/>
                                            <div className="absolute top-1 right-1">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeTransshipment(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                    {transshipmentFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum transbordo adicionado.</p>}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="bl_draft" className="mt-0 space-y-6">
                           <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle>Instruções de Embarque (Draft BL)</CardTitle>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" disabled={isGeneratingHbl}>
                                                    {isGeneratingHbl ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4" />}
                                                    Emitir HBL
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => handleGenerateHbl(false)}>Gerar Draft</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleGenerateHbl(true)}>Gerar Original</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    <CardDescription>
                                    Visualize e edite as informações do Draft do Bill of Lading.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <BLDraftForm shipment={shipment} isSheet={true} onUpdate={onUpdate} />
                                </CardContent>
                            </Card>
                        </TabsContent>
                         <TabsContent value="documentos" className="mt-0 space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <Card>
                                  <CardHeader>
                                      <CardTitle className="text-lg">Envio de Documentos Originais</CardTitle>
                                      {mblPrintingAtDestination && (
                                          <CardDescription className="text-primary font-medium">Impressão do MBL será feita no destino.</CardDescription>
                                      )}
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                          <FormField control={form.control} name="courier" render={({ field }) => (
                                          <FormItem><FormLabel>Courrier</FormLabel>
                                              <Select onValueChange={field.onChange} value={field.value} disabled={mblPrintingAtDestination}>
                                                  <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                  <SelectContent>
                                                      <SelectItem value="DHL">DHL</SelectItem>
                                                      <SelectItem value="UPS">UPS</SelectItem>
                                                      <SelectItem value="FedEx">FedEx</SelectItem>
                                                      <SelectItem value="Outro">Outro</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                          <FormMessage /></FormItem>
                                      )}/>
                                      <FormField control={form.control} name="courierNumber" render={({ field }) => (
                                          <FormItem><FormLabel>Nº Rastreio Courrier</FormLabel><FormControl><Input placeholder="1234567890" {...field} value={field.value ?? ''} disabled={mblPrintingAtDestination} /></FormControl><FormMessage /></FormItem>
                                      )}/>
                                      <FormField control={form.control} name="courierLastStatus" render={({ field }) => (
                                          <FormItem className=""><FormLabel>Último Status do Courrier</FormLabel>
                                              <div className="flex items-center gap-2">
                                                  <FormControl><Input placeholder="Aguardando sincronização..." {...field} value={field.value ?? ''} /></FormControl>
                                                  <Button type="button" variant="outline" size="icon" onClick={handleSyncCourierStatus} disabled={isCourierSyncing || mblPrintingAtDestination} title="Sincronizar último status">
                                                      {isCourierSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                  </Button>
                                              </div>
                                              <FormMessage />
                                          </FormItem>
                                      )}/>
                                      <div className="flex items-center gap-2 pt-2">
                                          <Button type="button" variant={mblPrintingAtDestination ? 'default' : 'secondary'} className="w-full" onClick={handleToggleMblPrinting} title="Marcar/desmarcar impressão do MBL no destino">
                                              <Printer className="mr-2 h-4 w-4" />
                                              {mblPrintingAtDestination ? `Autorizado em ${mblPrintingAuthDate && isValid(mblPrintingAuthDate) ? format(mblPrintingAuthDate, 'dd/MM/yy') : format(new Date(), 'dd/MM/yy')}` : 'Impressão no Destino'}
                                          </Button>
                                      </div>
                                  </CardContent>
                              </Card>
                              <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Gerenciamento de Documentos</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                      {documentFields.map((doc, index) => {
                                      const { name, status, fileName, uploadedAt } = form.getValues(`documents.${index}`) as DocumentStatus;
                                      const statusInfo = docStatusMap[status] || docStatusMap.pending;
                                      return (
                                          <div key={doc.id} className="p-3 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                          <div className="flex-grow">
                                              <div className="flex items-center gap-2">
                                              <statusInfo.icon className={cn("h-5 w-5", status === 'approved' && 'text-success', status === 'uploaded' && 'text-primary' )} />
                                              <p className="font-medium">{name}</p>
                                              <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                                              </div>
                                              {status !== 'pending' && fileName && (
                                                  <a href="#" onClick={(e) => { e.preventDefault(); window.open('', '_blank')?.document.write(`Exibindo ${fileName}`); }} className="text-xs text-muted-foreground mt-1 ml-7 hover:underline text-primary">
                                                      {fileName} {uploadedAt && isValid(new Date(uploadedAt)) ? ` - ${format(new Date(uploadedAt), 'dd/MM/yy HH:mm')}` : ''}
                                                  </a>
                                              )}
                                          </div>
                                          <div className="flex gap-2 self-end sm:self-center">
                                              {status === 'pending' && (
                                              <Button type="button" variant="outline" size="sm" onClick={() => handleUploadClick(index)}>
                                                  <Upload className="mr-2 h-4 w-4" /> Upload
                                              </Button>
                                              )}
                                              {status === 'uploaded' && (
                                              <>
                                                  <Button type="button" variant="outline" size="sm" onClick={() => handleUploadClick(index)}>
                                                  <Upload className="mr-2 h-4 w-4" /> Substituir
                                                  </Button>
                                                  <Button type="button" size="sm" onClick={() => handleDocumentChange(index, 'approved')}>
                                                  <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                                                  </Button>
                                              </>
                                              )}
                                              {status === 'approved' && (
                                              <Button type="button" variant="secondary" size="sm" onClick={() => handleUploadClick(index)}>
                                                  <Upload className="mr-2 h-4 w-4" /> Substituir
                                              </Button>
                                              )}
                                          </div>
                                          </div>
                                      );
                                      })}
                                  </CardContent>
                              </Card>
                           </div>
                         </TabsContent>
                         <TabsContent value="milestones" className="mt-0 space-y-6">
                             <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">Milestones</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground font-medium">{completedCount} de {totalCount} concluídos</span>
                                        </div>
                                    </div>
                                    <Progress value={progressPercentage} className="w-full mt-2" />
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {assembledMilestones.map((milestone, index) => {
                                        const predictedDate = milestone.predictedDate && isValid(new Date(milestone.predictedDate)) ? new Date(milestone.predictedDate) : null;
                                        const effectiveDate = milestone.effectiveDate && isValid(new Date(milestone.effectiveDate)) ? new Date(milestone.effectiveDate) : null;

                                        return (
                                        <Card key={`${milestone.name}-${index}`} className="p-4">
                                            <div className="flex items-start gap-4">
                                                <div className="pt-1">
                                                    <MilestoneIcon status={milestone.status} predictedDate={predictedDate} />
                                                </div>
                                                <div className="flex-grow grid gap-4 grid-cols-1 md:grid-cols-2">
                                                    <div>
                                                        <div className="flex justify-between items-center">
                                                            <p className="font-semibold">{milestone.name}</p>
                                                            {milestone.status === 'completed' && <Badge variant="success" className="capitalize">Completed</Badge>}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">{milestone.details || 'Detalhes não disponíveis'}</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Data Prevista</Label>
                                                            <Popover>
                                                                <PopoverTrigger asChild><Button variant="outline" size="sm" className="w-full justify-start font-normal text-xs">
                                                                    <CalendarIcon className="mr-2 h-3 w-3"/>
                                                                    {predictedDate ? format(predictedDate, 'dd/MM/yyyy') : 'N/A'}
                                                                </Button></PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={predictedDate || undefined} onSelect={(d) => handleMilestoneUpdate(index, 'predictedDate', d)}/></PopoverContent>
                                                            </Popover>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs text-muted-foreground">Data Efetiva</Label>
                                                            <Popover>
                                                                <PopoverTrigger asChild><Button variant="outline" size="sm" className="w-full justify-start font-normal text-xs">
                                                                    <CalendarIcon className="mr-2 h-3 w-3"/>
                                                                    {effectiveDate ? format(effectiveDate, 'dd/MM/yyyy') : 'N/A'}
                                                                </Button></PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={effectiveDate || undefined} onSelect={(d) => handleMilestoneUpdate(index, 'effectiveDate', d)}/></PopoverContent>
                                                            </Popover>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    )})}
                                </CardContent>
                            </Card>
                         </TabsContent>
                         <TabsContent value="mapa" className="mt-0 space-y-6">
                             {shipment.bookingNumber && <ShipmentMap shipmentNumber={shipment.bookingNumber} />}
                         </TabsContent>
                         <TabsContent value="mercadoria" className="mt-0 space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Detalhes da Mercadoria</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="commodityDescription" render={({ field }) => (
                                        <FormItem><FormLabel className="flex items-center gap-2"><CaseSensitive />Descrição da Mercadoria</FormLabel><FormControl><Input placeholder="Peças automotivas" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="netWeight" render={({ field }) => (
                                            <FormItem><FormLabel className="flex items-center gap-2"><Weight/> Peso Líquido</FormLabel><FormControl><Input placeholder="1200 KG" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <div className="space-y-2">
                                          <Label>NCMs</Label>
                                          {ncmFields.map((field, index) => (
                                            <div key={field.id} className="flex items-center gap-2">
                                              <FormField control={form.control} name={`ncms.${index}`} render={({ field }) => (
                                                <Input {...field} placeholder="Ex: 8708.99.90" />
                                              )} />
                                              <Button type="button" variant="ghost" size="icon" onClick={() => removeNcm(index)} disabled={ncmFields.length <= 1}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                            </div>
                                          ))}
                                          <Button type="button" variant="outline" size="sm" onClick={() => appendNcm('')}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar NCM
                                          </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-medium p-3 bg-muted/50 rounded-lg">
                                        <div className="flex justify-between md:flex-col"><span>Total Contêineres:</span> <span className="text-primary">{totalsSummary.containerCount}</span></div>
                                        <div className="flex justify-between md:flex-col"><span>Peso Bruto Total:</span> <span className="text-primary">{totalsSummary.totalGrossWeight.toLocaleString('pt-BR')} KG</span></div>
                                        <div className="flex justify-between md:flex-col"><span>Volumes Totais:</span> <span className="text-primary">{totalsSummary.totalVolumes.toLocaleString('pt-BR')}</span></div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg">Contêineres</CardTitle>
                                    <Button type="button" size="sm" variant="outline" onClick={() => appendContainer({ id: `new-${containerFields.length}`, number: '', seal: '', tare: '', grossWeight: '', volumes: '', measurement: '' })}>
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
                                                    <TableHead>Volumes</TableHead>
                                                    <TableHead>Cubagem</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {containerFields && containerFields.length > 0 ? containerFields.map((field, index) => (
                                                    <TableRow key={field.id}>
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.volumes`} render={({ field }) => (<Input placeholder="1000" {...field}/>)}/></TableCell>
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.measurement`} render={({ field }) => (<Input placeholder="28.5" {...field}/>)}/></TableCell>
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow><TableCell colSpan={7} className="text-center h-24">Nenhum contêiner adicionado.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                         </TabsContent>
                         <TabsContent value="financeiro" className="mt-0 space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Detalhes Financeiros</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <FormField control={form.control} name="custoArmazenagem" render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center gap-2">
                                                        <Label>Custo Armazenagem (BRL)</Label>
                                                        <Input type="number" placeholder="0.00" {...field} className="w-32 h-8" />
                                                    </div>
                                                </FormItem>
                                            )}/>
                                            <Button type="button" variant="outline" size="sm" onClick={() => setIsFeeDialogOpen(true)}>
                                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Taxa
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription>
                                        Adicione ou edite despesas do processo. Alterações requerem aprovação gerencial.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[180px]">Taxa</TableHead>
                                                    <TableHead className="min-w-[150px]">Fornecedor</TableHead>
                                                    <TableHead className="min-w-[150px]">Sacado</TableHead>
                                                    <TableHead className="text-right min-w-[200px]">Compra</TableHead>
                                                    <TableHead className="text-right min-w-[200px]">Venda</TableHead>
                                                    <TableHead className="w-[50px]">Ação</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {chargeFields.map((field, index) => {
                                                    const charge = watchedCharges[index];
                                                    const paymentStatus = getPaymentStatus(charge);
                                                    const availableFees = fees.filter(
                                                        fee => !watchedCharges.some(c => c.name === fee.name) || fee.name === charge.name
                                                    );
                                                    return (
                                                    <TableRow key={field.id} className={cn(charge.approvalStatus === 'pendente' && 'bg-amber-50')}>
                                                        <TableCell className="p-1 min-w-[180px]">
                                                            <div className="flex items-center gap-2">
                                                                <FeeCombobox
                                                                    fees={availableFees}
                                                                    value={charge.name}
                                                                    onValueChange={(value) => handleFeeSelection(value, index)}
                                                                />
                                                                {charge.approvalStatus === 'pendente' && <Badge variant="destructive">Pendente</Badge>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-1 min-w-[150px]">
                                                            <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                                                    <SelectContent>
                                                                        {(partners.filter(p => p.roles.fornecedor || p.roles.agente)).map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )} />
                                                        </TableCell>
                                                        <TableCell className="p-1 min-w-[150px]">
                                                            <FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (
                                                                <Select onValueChange={field.onChange} value={field.value || shipment.customer}>
                                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {(partners.filter(p => p.roles.cliente)).map(p => (
                                                                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )} />
                                                        </TableCell>
                                                        <TableCell className="text-right p-1 min-w-[200px]">
                                                            <div className="flex items-center gap-1">
                                                                <div className={cn("w-2.5 h-2.5 rounded-full", paymentStatus.costStatus === 'Pago' ? 'bg-green-500' : 'bg-gray-400')} title={`Custo: ${paymentStatus.costStatus}`} />
                                                                <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (
                                                                    <Select onValueChange={(value) => updateCharge(index, {...watchedCharges[index], costCurrency: value as any})} value={field.value}>
                                                                        <SelectTrigger className="w-[80px] h-9"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="CHF">CHF</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )} />
                                                                <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => (
                                                                    <Input type="number" {...field} onBlur={(e) => handleChargeValueChange(index, 'cost', e.target.value)} className="w-full h-9" />
                                                                )} />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right p-1 min-w-[200px]">
                                                            <div className="flex items-center gap-1">
                                                                <div className={cn("w-2.5 h-2.5 rounded-full", paymentStatus.saleStatus === 'Pago' ? 'bg-green-500' : 'bg-gray-400')} title={`Venda: ${paymentStatus.saleStatus}`} />
                                                                <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (
                                                                    <Select onValueChange={(value) => updateCharge(index, {...watchedCharges[index], saleCurrency: value as any})} value={field.value}>
                                                                        <SelectTrigger className="w-[80px] h-9"><SelectValue /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="JPY">JPY</SelectItem><SelectItem value="CHF">CHF</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                )} />
                                                                <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => (
                                                                    <Input type="number" {...field} onBlur={(e) => handleChargeValueChange(index, 'sale', e.target.value)} className="w-full h-9" />
                                                                )} />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeCharge(index)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )})}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <Button type="button" onClick={handleInvoiceShipment} disabled={isInvoicing || hasPendingCharges || allChargesInvoiced} title={hasPendingCharges ? "Existem despesas pendentes de aprovação" : allChargesInvoiced ? "Todas as despesas já foram faturadas" : ""}>
                                            <Calculator className="mr-2 h-4 w-4" />
                                            Faturar Processo
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                         </TabsContent>
                    </div>
                  </Tabs>
                  
                  <SheetFooter className="pt-4 mt-auto border-t">
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </Button>
                  </SheetFooter>
                </form>
              </Form>
          </SheetContent>
      </Sheet>

      <Dialog open={isFeeDialogOpen} onOpenChange={setIsFeeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Adicionar Taxas ao Processo</DialogTitle>
                <DialogDescription>
                    Selecione as taxas padrão que deseja adicionar a este embarque.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <ScrollArea className="h-96">
                    <div className="space-y-2 pr-4">
                        {fees.map(fee => (
                            <div key={fee.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                <Checkbox
                                    id={`fee-${fee.id}`}
                                    checked={selectedFees.has(fee.id!)}
                                    onCheckedChange={(checked) => {
                                        setSelectedFees(prev => {
                                            const newSet = new Set(prev);
                                            if (checked) {
                                                newSet.add(fee.id!);
                                            } else {
                                                newSet.delete(fee.id!);
                                            }
                                            return newSet;
                                        });
                                    }}
                                />
                                <Label htmlFor={`fee-${fee.id}`} className="flex-grow font-normal cursor-pointer">
                                    <div className="flex justify-between">
                                        <span>{fee.name}</span>
                                        <Badge variant="secondary">{fee.currency} {fee.value}</Badge>
                                    </div>
                                </Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooterComponent>
                 <Button variant="outline" onClick={() => setIsFeeDialogOpen(false)}>Cancelar</Button>
                 <Button onClick={handleAddSelectedFees}>Adicionar Taxas Selecionadas</Button>
            </DialogFooterComponent>
        </DialogContent>
      </Dialog>
      <PartnerSelectionDialog
        isOpen={!!editingPartnerType}
        onClose={() => setEditingPartnerType(null)}
        partners={partners}
        onPartnerSelect={handlePartnerUpdate}
        title={`Selecionar ${editingPartnerType}`}
      />
       <JustificationDialog
            isOpen={!!justificationRequest}
            onClose={() => setJustificationRequest(null)}
            onConfirm={handleJustificationSubmit}
            chargeName={justificationRequest ? watchedCharges[justificationRequest.index]?.name : ''}
            field={justificationRequest?.field === 'cost' ? 'Custo' : 'Venda'}
            oldValue={`${watchedCharges[justificationRequest?.index || 0]?.costCurrency} ${(justificationRequest?.oldValue ?? 0).toFixed(2)}`}
            newValue={`${watchedCharges[justificationRequest?.index || 0]?.saleCurrency} ${(justificationRequest?.newValue ?? 0).toFixed(2)}`}
        />
      </>
  );
}
