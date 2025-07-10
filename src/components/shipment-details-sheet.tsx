
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import type { Shipment, Milestone, TransshipmentDetail, DocumentStatus } from '@/lib/shipment';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Save, Trash2, Circle, CheckCircle, Hourglass, AlertTriangle, ArrowRight, Wallet, Receipt, Anchor, CaseSensitive, Weight, Package, Clock, Ship, GanttChart, LinkIcon, RefreshCw, Loader2, Printer, Upload, Check, FileCheck, CircleDot, FileText } from 'lucide-react';
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
import { runGetTrackingInfo, runDetectCarrier, runGetCourierStatus } from '@/app/actions';


const containerDetailSchema = z.object({
  id: z.string(),
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
  freeTime: z.string().optional(),
});

const transshipmentDetailSchema = z.object({
  id: z.string(),
  port: z.string().min(1, "Obrigatório"),
  vessel: z.string().min(1, "Obrigatório"),
  etd: z.date().optional(),
  eta: z.date().optional(),
});


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
  containers: z.array(containerDetailSchema).optional(),
  documents: z.array(z.object({
      name: z.string(),
      status: z.string(),
      fileName: z.string().optional(),
      uploadedAt: z.date().optional()
  })).optional(),
  commodityDescription: z.string().optional(),
  ncm: z.string().optional(),
  netWeight: z.string().optional(),
  packageQuantity: z.string().optional(),
  freeTimeDemurrage: z.string().optional(),
  transshipments: z.array(transshipmentDetailSchema).optional(),
  notifyName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

interface ShipmentDetailsSheetProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedShipment: Shipment) => void;
}

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


export function ShipmentDetailsSheet({ shipment, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCourierSyncing, setIsCourierSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<ShipmentDetailsFormData>({
    resolver: zodResolver(shipmentDetailsSchema),
  });

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

  const assembledMilestones = useMemo(() => {
    if (!shipment) return [];
    
    return [...(shipment.milestones || [])].map(m => ({
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
        containers: shipment.containers?.map(c => ({...c, freeTime: c.freeTime || ''})) || [],
        documents: shipment.documents || [],
        commodityDescription: shipment.commodityDescription || '',
        ncm: shipment.ncm || '',
        netWeight: shipment.netWeight || '',
        packageQuantity: shipment.packageQuantity || shipment.details?.cargo || '',
        freeTimeDemurrage: shipment.freeTimeDemurrage || shipment.details?.freeTime || '',
        transshipments: shipment.transshipments?.map(t => ({
          ...t,
          etd: t.etd && isValid(new Date(t.etd)) ? new Date(t.etd) : undefined,
          eta: t.eta && isValid(new Date(t.eta)) ? new Date(t.eta) : undefined,
        })) || [],
        notifyName: shipment.notifyName || '',
        invoiceNumber: shipment.invoiceNumber || '',
        purchaseOrderNumber: shipment.purchaseOrderNumber || '',
      });
    }
  }, [shipment, form]);

  const watchedCourier = form.watch('courier');
  const watchedCourierNumber = form.watch('courierNumber');
  const mblPrintingAtDestination = form.watch('mblPrintingAtDestination');
  const mblPrintingAuthDate = form.watch('mblPrintingAuthDate');

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
  
  const handleMilestoneUpdate = (milestoneIndex: number, field: 'predictedDate' | 'effectiveDate', value: Date | undefined) => {
    if (!shipment || !value) return;

    const updatedMilestones = [...shipment.milestones];
    const targetMilestone = updatedMilestones[milestoneIndex];
    if(targetMilestone) {
        (targetMilestone as any)[field] = value;

        if (field === 'effectiveDate' && value) {
            targetMilestone.status = 'completed';
        }
        
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
  
  const handleBillingClick = (type: 'receber' | 'pagar') => {
    toast({
        title: `Função em Desenvolvimento`,
        description: `A ação de "Faturar Contas a ${type === 'receber' ? 'Receber' : 'Pagar'}" será integrada ao módulo Financeiro.`,
    });
  };

  const handleSyncBookingInfo = async () => {
    const trackingNumber = form.getValues('masterBillNumber') || form.getValues('bookingNumber');
    if (!trackingNumber) {
        toast({ variant: 'destructive', title: 'Nenhum Número de Rastreio', description: 'Por favor, insira um número de Booking ou Master BL para sincronizar.' });
        return;
    }
    setIsSyncing(true);

    const carrierResponse = await runDetectCarrier(trackingNumber);
    if (!carrierResponse.success || carrierResponse.data.carrier === 'Unknown') {
        toast({
            variant: 'destructive',
            title: "Armador não identificado",
            description: carrierResponse.error || `Não foi possível identificar o armador para o tracking "${trackingNumber}".`,
        });
        setIsSyncing(false);
        return;
    }
    const carrier = carrierResponse.data.carrier;
    toast({ title: "Armador Detectado!", description: `Identificamos o armador: ${carrier}. Buscando dados...` });
    
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

  const docStatusMap: Record<DocumentStatus['status'], { variant: 'secondary' | 'default' | 'success'; text: string; icon: React.ElementType }> = {
    pending: { variant: 'secondary', text: 'Pendente', icon: Circle },
    uploaded: { variant: 'default', text: 'Enviado', icon: CircleDot },
    approved: { variant: 'success', text: 'Aprovado', icon: FileCheck },
  };

  return (
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
                    <TabsList className="grid w-full grid-cols-5 mb-4">
                        <TabsTrigger value="dados_embarque">Dados do Embarque</TabsTrigger>
                        <TabsTrigger value="documentos">Documentos</TabsTrigger>
                        <TabsTrigger value="milestones">Milestones & Tracking</TabsTrigger>
                        <TabsTrigger value="mercadoria">Mercadoria & Containers</TabsTrigger>
                        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                    </TabsList>

                    <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                        <TabsContent value="dados_embarque" className="mt-0 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-base">Shipper (Exportador)</CardTitle></CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <p className="font-semibold">{shipper?.name}</p>
                                        <p className="text-muted-foreground">{shipper?.address?.street}, {shipper?.address?.number}</p>
                                        <p className="text-muted-foreground">{shipper?.address?.city}, {shipper?.address?.state} - {shipper?.address?.country}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-base">Consignee (Importador)</CardTitle></CardHeader>
                                    <CardContent className="text-sm space-y-1">
                                        <p className="font-semibold">{consignee?.name}</p>
                                        <p className="text-muted-foreground">{consignee?.address?.street}, {consignee?.address?.number}</p>
                                        <p className="text-muted-foreground">{consignee?.address?.city}, {consignee?.address?.state} - {consignee?.address?.country}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-base">Agente</CardTitle></CardHeader>
                                    <CardContent className="text-sm space-y-1">
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
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Dados da Viagem/Voo</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <FormField control={form.control} name="carrier" render={({ field }) => (
                                        <FormItem><FormLabel>Armador</FormLabel><FormControl><Input placeholder="Maersk" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="vesselName" render={({ field }) => (
                                        <FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input placeholder="MSC LEO" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="voyageNumber" render={({ field }) => (
                                        <FormItem><FormLabel>Viagem / Nº Voo</FormLabel><FormControl><Input placeholder="AB123C" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                                    )}/>
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
                                     <FormField control={form.control} name="notifyName" render={({ field }) => (
                                        <FormItem className="lg:col-span-2"><FormLabel>Notify Party</FormLabel><FormControl><Input placeholder="Nome do Notify" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
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
                         <TabsContent value="documentos" className="mt-0 space-y-6">
                             <Card>
                                <CardHeader className="flex flex-row justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">Rastreio e Numerações</CardTitle>
                                        <CardDescription>Cotação de origem: <span className="font-semibold text-primary">{shipment.quoteId}</span></CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField control={form.control} name="bookingNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Booking Reference</FormLabel>
                                        <div className="flex items-center gap-2">
                                        <FormControl><Input placeholder="BKG123456" {...field} value={field.value ?? ''} /></FormControl>
                                        </div>
                                    <FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="masterBillNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Master Bill of Lading / MAWB</FormLabel><FormControl><Input placeholder="MSCU12345678" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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
                                              <p className="text-xs text-muted-foreground mt-1 ml-7">
                                                {fileName} {uploadedAt && isValid(new Date(uploadedAt)) ? ` - ${format(new Date(uploadedAt), 'dd/MM/yy HH:mm')}` : ''}
                                              </p>
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
                                                  <Check className="mr-2 h-4 w-4" /> Aprovar
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
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Envio de Documentos Originais</CardTitle>
                                    {mblPrintingAtDestination && (
                                        <CardDescription className="text-primary font-medium">Impressão do MBL será feita no destino.</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
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
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant={mblPrintingAtDestination ? 'default' : 'secondary'} className="w-full" onClick={handleToggleMblPrinting} title="Marcar/desmarcar impressão do MBL no destino">
                                            <Printer className="mr-2 h-4 w-4" />
                                            {mblPrintingAtDestination ? `Autorizado em ${mblPrintingAuthDate && isValid(mblPrintingAuthDate) ? format(mblPrintingAuthDate, 'dd/MM/yy') : format(new Date(), 'dd/MM/yy')}` : 'Impressão no Destino'}
                                        </Button>
                                    </div>
                                    <FormField control={form.control} name="courierLastStatus" render={({ field }) => (
                                        <FormItem className="md:col-span-3"><FormLabel>Último Status do Courrier</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <FormControl><Input placeholder="Aguardando sincronização..." {...field} value={field.value ?? ''} /></FormControl>
                                                <Button type="button" variant="outline" size="icon" onClick={handleSyncCourierStatus} disabled={isCourierSyncing || mblPrintingAtDestination} title="Sincronizar último status">
                                                    {isCourierSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </CardContent>
                            </Card>
                         </TabsContent>
                         <TabsContent value="milestones" className="mt-0 space-y-6">
                             <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">Milestones</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-muted-foreground font-medium">{completedCount} de {totalCount} concluídos</span>
                                            <Button type="button" variant="outline" size="icon" onClick={handleSyncBookingInfo} disabled={isSyncing} title="Sincronizar dados do booking">
                                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            </Button>
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
                         <TabsContent value="mercadoria" className="mt-0 space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Detalhes da Mercadoria</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="commodityDescription" render={({ field }) => (
                                        <FormItem><FormLabel className="flex items-center gap-2"><CaseSensitive />Descrição da Mercadoria</FormLabel><FormControl><Input placeholder="Peças automotivas" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="ncm" render={({ field }) => (
                                            <FormItem><FormLabel className="flex items-center gap-2">NCM</FormLabel><FormControl><Input placeholder="8708.99.90" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="packageQuantity" render={({ field }) => (
                                            <FormItem><FormLabel className="flex items-center gap-2"><Package /> Quantidade de Volumes</FormLabel><FormControl><Input placeholder="10 caixas" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                        <FormField control={form.control} name="netWeight" render={({ field }) => (
                                            <FormItem><FormLabel className="flex items-center gap-2"><Weight/> Peso Líquido</FormLabel><FormControl><Input placeholder="1200 KG" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                        )}/>
                                    </div>
                                    <FormField control={form.control} name="freeTimeDemurrage" render={({ field }) => (
                                        <FormItem><FormLabel className="flex items-center gap-2"><Clock /> Free Time Demurrage / Detention</FormLabel><FormControl><Input placeholder="14 dias" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg">Contêineres</CardTitle>
                                    <Button type="button" size="sm" variant="outline" onClick={() => appendContainer({ id: `new-${containerFields.length}`, number: '', seal: '', tare: '', grossWeight: '', freeTime: '' })}>
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
                                                    <TableHead>Free Time</TableHead>
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
                                                        <TableCell><FormField control={form.control} name={`containers.${index}.freeTime`} render={({ field }) => (<Input placeholder="14 dias" {...field}/>)}/></TableCell>
                                                        <TableCell>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )) : (
                                                    <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum contêiner adicionado.</TableCell></TableRow>
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
                                    <CardTitle className="text-lg">Detalhes Financeiros</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Taxa</TableHead>
                                                    <TableHead>Fornecedor</TableHead>
                                                    <TableHead className="text-right">Custo</TableHead>
                                                    <TableHead className="text-right">Venda</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {shipment.charges && shipment.charges.map(charge => (
                                                    <TableRow key={charge.id}>
                                                        <TableCell>{charge.name}</TableCell>
                                                        <TableCell className="text-muted-foreground">{charge.supplier}</TableCell>
                                                        <TableCell className="text-right font-mono">{charge.costCurrency} {charge.cost.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{charge.saleCurrency} {charge.sale.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <Button variant="outline" type="button" onClick={() => handleBillingClick('pagar')}>
                                            <Receipt className="mr-2 h-4 w-4" />
                                            Faturar Contas a Pagar
                                        </Button>
                                        <Button variant="outline" type="button" onClick={() => handleBillingClick('receber')}>
                                            <Wallet className="mr-2 h-4 w-4" />
                                            Faturar Contas a Receber
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
  );
}
