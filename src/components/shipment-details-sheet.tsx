
'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Shipment, Milestone } from '@/lib/shipment-data';
import type { Partner } from '@/lib/partners-data';
import { 
    Save, 
    GanttChart, 
    Link as LinkIcon, 
    Printer,
    Clock,
    ChevronsUpDown,
    Check,
    Loader2,
    CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runGenerateHblPdf, runUpdateShipmentInTracking } from '@/app/actions';
import { BLDraftForm } from '@/components/bl-draft-form';
import { CustomsClearanceTab } from '@/components/customs-clearance-tab';
import { findPortByTerm } from '@/lib/ports';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

import { ShipmentTimelineTab } from './shipment-details/shipment-timeline-tab';
import { ShipmentDetailsTab } from './shipment-details/shipment-details-tab';
import { ShipmentFinancialsTab } from './shipment-details/shipment-financials-tab';
import { ShipmentDocumentsTab } from './shipment-details/shipment-documents-tab';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';


const shipmentDetailsSchema = z.object({
  shipperId: z.string().optional(),
  consigneeId: z.string().optional(),
  agentId: z.string().optional(),
  notifyId: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  charges: z.array(z.any()).optional(),
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

interface ShipmentDetailsSheetProps {
    shipment: Shipment | null;
    partners: Partner[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (updatedShipment: Shipment) => void;
}

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

interface PartnerSelectorProps {
    label: string;
    partners: Partner[];
    field: any;
}

const PartnerSelector = ({ label, partners, field }: PartnerSelectorProps) => {
    const [open, setOpen] = useState(false);
    const selectedPartner = partners.find(p => p.id?.toString() === field.value);

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <FormControl>
                        <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-8">
                            {field.value ? selectedPartner?.name : "Selecione..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar parceiro..." />
                        <CommandList>
                            <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
                            <CommandGroup>
                                {partners.map(p => (
                                    <CommandItem value={p.name} key={p.id} onSelect={() => { field.onChange(p.id!.toString()); setOpen(false); }}>
                                        <Check className={cn("mr-2 h-4 w-4", p.id?.toString() === field.value ? "opacity-100" : "opacity-0")} />
                                        {p.name}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
             {selectedPartner && (
                <div className="text-xs text-muted-foreground mt-1 p-2 border rounded-md bg-secondary/50">
                    <p className="truncate"><strong>End:</strong> {`${selectedPartner.address.street || ''}, ${selectedPartner.address.city || ''}`}</p>
                    <p className="truncate"><strong>CNPJ/VAT:</strong> {selectedPartner.cnpj || selectedPartner.vat || 'N/A'}</p>
                </div>
            )}
            <FormMessage />
        </FormItem>
    );
};

export function ShipmentDetailsSheet({ shipment: initialShipment, partners, open, onOpenChange, onUpdate: onMasterUpdate }: ShipmentDetailsSheetProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('timeline');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentShipment, setCurrentShipment] = useState<Shipment | null>(initialShipment);
    
    const formRefs = useRef<Record<string, { submit: () => Promise<any> }>>({});

    const form = useForm<ShipmentDetailsFormData>({
        resolver: zodResolver(shipmentDetailsSchema),
    });
    
    useEffect(() => {
        setCurrentShipment(initialShipment);
        if (initialShipment) {
            form.reset({
                shipperId: initialShipment.shipper?.id?.toString(),
                consigneeId: initialShipment.consignee?.id?.toString(),
                agentId: initialShipment.agent?.id?.toString(),
                notifyId: partners.find(p => p.name === initialShipment.notifyName)?.id?.toString(),
                purchaseOrderNumber: initialShipment.purchaseOrderNumber,
                invoiceNumber: initialShipment.invoiceNumber,
                charges: initialShipment.charges,
            });
            setActiveTab('timeline');
        }
    }, [initialShipment, form, open, partners]);

    const foreignLocationClock = useMemo(() => {
        if (!currentShipment) return null;
        const originPort = findPortByTerm(currentShipment.origin);
        const destPort = findPortByTerm(currentShipment.destination);

        if (originPort && originPort.country !== 'BR') {
            return { label: originPort.name, timeZone: originPort.timeZone };
        }
        if (destPort && destPort.country !== 'BR') {
            return { label: destPort.name, timeZone: destPort.timeZone };
        }
        return null;
    }, [currentShipment]);

    const onUpdate = (updatedData: Partial<Shipment>) => {
        if (!currentShipment) return;
        const updatedShipment = { ...currentShipment, ...updatedData };
        setCurrentShipment(updatedShipment);
        onMasterUpdate(updatedShipment);
    };
    
    const handleMasterSave = async () => {
        if (!currentShipment) return;
        setIsUpdating(true);
        
        try {
            const headerData = form.getValues();
            const tabDataPromises = Object.values(formRefs.current).map(ref => ref.submit());
            const tabDataResults = await Promise.all(tabDataPromises);
            const combinedTabData = tabDataResults.reduce((acc, data) => ({ ...acc, ...data }), {});
            
            const shipper = partners.find(p => p.id?.toString() === headerData.shipperId);
            const consignee = partners.find(p => p.id?.toString() === headerData.consigneeId);
            const agent = partners.find(p => p.id?.toString() === headerData.agentId);
            const notify = partners.find(p => p.id?.toString() === headerData.notifyId);

            let updatedShipmentData = { 
                ...currentShipment, 
                ...headerData,
                shipper: shipper || currentShipment.shipper,
                consignee: consignee || currentShipment.consignee,
                agent: agent || currentShipment.agent,
                notifyName: notify?.name || currentShipment.notifyName,
                ...combinedTabData
            };

            onMasterUpdate(updatedShipmentData);

            await runUpdateShipmentInTracking(updatedShipmentData);

            toast({
                title: "Processo Atualizado e Sincronizado!",
                description: "As alterações foram salvas e enviadas para o sistema de rastreamento.",
                className: "bg-success text-success-foreground",
            });
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ variant: "destructive", title: "Erro ao Salvar", description: error.message || "Não foi possível salvar os dados." });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const generatePdf = async (type: 'client' | 'agent' | 'hbl') => {
        if (!currentShipment) return;
        setIsGenerating(true);

        let response;
        try {
            if (type === 'client') {
                 const partner = partners.find(p => p.name === currentShipment.customer);
                 if (!partner) throw new Error("Cliente não encontrado");

                const charges = currentShipment.charges
                    .filter(c => c.sacado === currentShipment.customer)
                    .map(c => ({
                        description: c.name,
                        value: (Number(c.sale) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        currency: c.saleCurrency
                    }));

                response = await runGenerateClientInvoicePdf({
                    invoiceNumber: `INV-${currentShipment.id}`,
                    customerName: currentShipment.customer,
                    customerAddress: `${partner.address?.street}, ${partner.address?.number}`,
                    date: format(new Date(), 'dd/MM/yyyy'),
                    dueDate: format(new Date(), 'dd/MM/yyyy'),
                    charges,
                    total: '0.00',
                    exchangeRate: 5.25,
                    bankDetails: { bankName: "LTI GLOBAL", accountNumber: "PIX: 10.298.168/0001-89" }
                });
            } else if (type === 'agent') {
                 if (!currentShipment.agent) throw new Error("Agente não encontrado no processo.");
                 response = await runGenerateAgentInvoicePdf({
                     invoiceNumber: `AINV-${currentShipment.id}`,
                     processId: currentShipment.id,
                     agentName: currentShipment.agent.name,
                 });
            } else { 
                if (!currentShipment.blDraftData) throw new Error("Draft do BL não foi preenchido.");
                response = await runGenerateHblPdf({
                    isOriginal: true,
                    blNumber: currentShipment.houseBillNumber,
                    shipper: currentShipment.blDraftData.shipper,
                    consignee: currentShipment.blDraftData.consignee,
                    notifyParty: currentShipment.blDraftData.notify,
                    vesselAndVoyage: `${currentShipment.vesselName} / ${currentShipment.voyageNumber}`,
                    portOfLoading: currentShipment.origin,
                    portOfDischarge: currentShipment.destination,
                    finalDestination: currentShipment.destination,
                    marksAndNumbers: currentShipment.blDraftData.marksAndNumbers,
                    packageDescription: `${currentShipment.blDraftData.containers.reduce((sum, c) => sum + parseInt(c.volumes || '0'), 0)} packages, ${currentShipment.blDraftData.descriptionOfGoods}`,
                    grossWeight: currentShipment.blDraftData.grossWeight,
                    measurement: currentShipment.blDraftData.measurement,
                    containerAndSeal: currentShipment.blDraftData.containers.map(c => `${c.number} / ${c.seal}`).join('\n'),
                    freightPayableAt: 'Destino',
                    numberOfOriginals: currentShipment.blType === 'original' ? '3 (TRÊS)' : '0 (ZERO)',
                    issueDate: format(new Date(), 'dd-MMM-yyyy'),
                    shippedOnBoardDate: currentShipment.etd ? format(currentShipment.etd, 'dd-MMM-yyyy') : 'N/A',
                });
            }

            if (response.success && response.data?.html) {
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

    const handleFinalizeShipment = () => {
        if (!currentShipment) return;
        const now = new Date();
        const updatedMilestones = (currentShipment.milestones || []).map(m => {
            if (m.status !== 'completed') {
                return { ...m, status: 'completed' as const, effectiveDate: now };
            }
            return m;
        });

        const updatedShipment = {
            ...currentShipment,
            status: 'Finalizado' as const,
            milestones: updatedMilestones,
        };
        onMasterUpdate(updatedShipment);
        toast({
            title: "Processo Finalizado!",
            description: "O status do processo foi alterado para 'Finalizado' e os milestones pendentes foram concluídos.",
            className: "bg-success text-success-foreground",
        });
    };
    
    if (!currentShipment) {
        return (
             <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="sm:max-w-7xl w-full p-0 flex flex-col items-center justify-center">
                    <p className="text-muted-foreground">Selecione um processo para ver os detalhes.</p>
                </SheetContent>
            </Sheet>
        );
    }
    
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-7xl w-full p-0 flex flex-col">
                <SheetHeader className="p-4 border-b space-y-2">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-full">
                                <GanttChart className="h-8 w-8 text-primary"/>
                            </div>
                            <div>
                                <SheetTitle>Detalhes do Processo: {currentShipment.id}</SheetTitle>
                                <div className="text-muted-foreground text-xs md:text-sm flex items-center gap-2">
                                     <span>Cliente: {currentShipment.customer}</span>
                                     <Separator orientation="vertical" className="h-4"/>
                                      <span className="flex items-center gap-1.5">
                                        Última Sincronização: 
                                        <span className="font-semibold text-foreground">
                                            {currentShipment.lastTrackingUpdate 
                                                ? format(new Date(currentShipment.lastTrackingUpdate), 'dd/MM/yy HH:mm', { locale: ptBR }) 
                                                : 'Nunca'}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             {foreignLocationClock && (
                                <TimeZoneClock label={foreignLocationClock.label} timeZone={foreignLocationClock.timeZone} />
                            )}
                            {currentShipment.status !== 'Finalizado' && (
                                <Button variant="secondary" onClick={handleFinalizeShipment}><CheckCircle className="mr-2 h-4 w-4"/>Finalizar Processo</Button>
                            )}
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
                        </div>
                    </div>
                    {currentShipment.status === 'Finalizado' && (
                        <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800 dark:text-green-300">Processo Finalizado</AlertTitle>
                            <AlertDescription className="text-green-700 dark:text-green-400">
                                Este processo foi marcado como finalizado. As edições estão desabilitadas.
                            </AlertDescription>
                        </Alert>
                    )}
                     <Form {...form}>
                        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start pt-2">
                            <FormField control={form.control} name="shipperId" render={({ field }) => (
                                <PartnerSelector label="Shipper" partners={partners} field={field} />
                            )}/>
                            <FormField control={form.control} name="consigneeId" render={({ field }) => (
                                <PartnerSelector label="Consignee" partners={partners} field={field} />
                            )}/>
                            <FormField control={form.control} name="agentId" render={({ field }) => (
                                <PartnerSelector label="Agente" partners={partners.filter(p=>p.roles.agente)} field={field} />
                            )}/>
                            <FormField control={form.control} name="notifyId" render={({ field }) => (
                                <PartnerSelector label="Notify" partners={partners} field={field} />
                            )}/>
                        </form>
                    </Form>
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
                            <TabsTrigger value="desembaraco">Desembaraço</TabsTrigger>
                        </TabsList>
                        </div>
                        <div className="p-4">
                            <TabsContent value="timeline">
                                <ShipmentTimelineTab
                                    ref={(el) => { if (el) formRefs.current['timeline'] = el; }}
                                    shipment={currentShipment}
                                    onUpdate={onUpdate}
                                />
                            </TabsContent>
                            <TabsContent value="details">
                                 <ShipmentDetailsTab
                                    ref={(el) => { if (el) formRefs.current['details'] = el; }}
                                    shipment={currentShipment}
                                    partners={partners}
                                    onUpdate={onUpdate}
                                />
                            </TabsContent>
                            <TabsContent value="financials">
                                 <ShipmentFinancialsTab
                                    ref={(el) => { if (el) formRefs.current['financials'] = el; }}
                                    shipment={currentShipment}
                                    partners={partners}
                                    onOpenDetails={() => {}}
                                    onInvoiceCharges={() => Promise.resolve({updatedCharges:[]})}
                                    onUpdate={onUpdate}
                                />
                            </TabsContent>
                            <TabsContent value="documents">
                                 <ShipmentDocumentsTab
                                    ref={(el) => { if (el) formRefs.current['documents'] = el; }}
                                    shipment={currentShipment}
                                />
                            </TabsContent>
                            <TabsContent value="bl_draft">
                                 <BLDraftForm
                                    ref={(el) => { if (el) formRefs.current['bl_draft'] = el as any; }}
                                    shipment={currentShipment} 
                                    onUpdate={onUpdate} 
                                    isSheet 
                                />
                            </TabsContent>
                            <TabsContent value="desembaraco">
                                <CustomsClearanceTab shipment={currentShipment} onUpdate={onUpdate}/>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
                 <div className="p-4 border-t flex justify-end">
                    <Button type="button" onClick={handleMasterSave} disabled={isUpdating || currentShipment.status === 'Finalizado'}>
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Salvar Todas as Alterações
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
