
'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid, addDays, parseISO } from 'date-fns';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';

import type { Shipment, Milestone, TransshipmentDetail, DocumentStatus, QuoteCharge, Partner, UploadedDocument, ActivityLog, ApprovalLog, FinancialEntry } from '@/lib/shipment-data';
import { 
    Save, 
    GanttChart, 
    Link as LinkIcon, 
    RefreshCw, 
    Loader2, 
    Printer,
    Map as MapIcon,
    FileText,
    FileCode,
    Clock,
    ChevronsUpDown,
    Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runGenerateHblPdf } from '@/app/actions';
import { BLDraftForm } from './bl-draft-form';
import { CustomsClearanceTab } from './customs-clearance-tab';
import { findPortByTerm } from '@/lib/ports';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

// Import new tab components
import { ShipmentTimelineTab } from './shipment-details/shipment-timeline-tab';
import { ShipmentDetailsTab } from './shipment-details/shipment-details-tab';
import { ShipmentFinancialsTab } from './shipment-details/shipment-financials-tab';
import { ShipmentDocumentsTab } from './shipment-details/shipment-documents-tab';
import { FinancialDetailsDialog } from './financials/financial-details-dialog';
import { getStoredFinancialEntries } from '@/lib/financials-data';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { AutocompleteInput } from './autocomplete-input';


const shipmentDetailsSchema = z.object({
  shipperId: z.string().optional(),
  consigneeId: z.string().optional(),
  agentId: z.string().optional(),
  notifyId: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  origin: z.string().min(1, "Origem é obrigatória."),
  destination: z.string().min(1, "Destino é obrigatório."),
  charges: z.array(z.any()).optional(), // Simplified for the main sheet
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

const PartnerCombobox = ({
  partners,
  value,
  onValueChange,
  placeholder,
}: {
  partners: Partner[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedPartner = partners.find((p) => p.id?.toString() === value);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
            >
              {selectedPartner ? selectedPartner.name : placeholder}
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
                {partners.map((partner) => (
                  <CommandItem
                    value={partner.name}
                    key={partner.id}
                    onSelect={() => {
                      onValueChange(partner.id!.toString());
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", partner.id?.toString() === value ? "opacity-100" : "opacity-0")} />
                    {partner.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedPartner && (
        <div className="text-xs text-muted-foreground p-2 border rounded-md bg-secondary/50">
          <p className="truncate">{selectedPartner.address?.street}, {selectedPartner.address?.number}</p>
          <p>{selectedPartner.cnpj || selectedPartner.vat}</p>
        </div>
      )}
    </div>
  );
};


export function ShipmentDetailsSheet({ shipment, partners, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('timeline');
    const [isUpdating, setIsUpdating] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [detailsEntry, setDetailsEntry] = useState<FinancialEntry | null>(null);
    
    const formRefs = useRef<Record<string, { submit: () => Promise<any> }>>({});

    const form = useForm<ShipmentDetailsFormData>({
        resolver: zodResolver(shipmentDetailsSchema),
    });
    
    useEffect(() => {
        if (shipment) {
            form.reset({
                shipperId: shipment.shipper?.id?.toString(),
                consigneeId: shipment.consignee?.id?.toString(),
                agentId: shipment.agent?.id?.toString(),
                notifyId: partners.find(p => p.name === shipment.notifyName)?.id?.toString(),
                purchaseOrderNumber: shipment.purchaseOrderNumber,
                invoiceNumber: shipment.invoiceNumber,
                origin: shipment.origin,
                destination: shipment.destination,
                charges: shipment.charges,
            });
        }
    }, [shipment, form, open, partners]);

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
    
    const handleMasterSave = async () => {
        if (!shipment) return;
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
                ...shipment, 
                ...headerData,
                shipper: shipper || shipment.shipper,
                consignee: consignee || shipment.consignee,
                agent: agent || shipment.agent,
                notifyName: notify?.name || shipment.notifyName,
                ...combinedTabData
            };

            onUpdate(updatedShipmentData);

            toast({
                title: "Processo Atualizado!",
                description: "As alterações foram salvas com sucesso.",
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

    const handleOpenDetailsDialog = (charge: QuoteCharge) => {
        const allEntries = getStoredFinancialEntries();
        const entry = allEntries.find(e => e.id === charge.financialEntryId);
        if (entry) {
            setDetailsEntry(entry);
        } else {
            toast({ variant: 'destructive', title: 'Fatura não encontrada', description: 'Não foi possível localizar o lançamento financeiro associado.' });
        }
    };
    
    const handleInvoiceCharges = async (chargesToInvoice: QuoteCharge[]): Promise<QuoteCharge[]> => {
        if (chargesToInvoice.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhuma taxa selecionada.'});
            return [];
        }

        const newEntries: Omit<import('@/lib/financials-data').FinancialEntry, 'id'>[] = [];
        const entryMap = new Map<string, { partner: string; charges: QuoteCharge[] }>();

        // Group charges by 'sacado' to create one invoice per partner
        chargesToInvoice.forEach(charge => {
            const sacado = charge.sacado || shipment!.customer;
            if (!entryMap.has(sacado)) {
                entryMap.set(sacado, { partner: sacado, charges: [] });
            }
            entryMap.get(sacado)!.charges.push(charge);
        });

        entryMap.forEach(({ partner, charges }) => {
            const totalAmount = charges.reduce((sum, ch) => sum + ch.sale, 0);
            const currency = charges[0].saleCurrency; // Assuming all charges for one invoice have the same currency
            
            newEntries.push({
                type: 'credit',
                partner: partner,
                invoiceId: `INV-${shipment!.id}-${partner.slice(0,3).toUpperCase()}`,
                status: 'Aberto',
                dueDate: addDays(new Date(), 30).toISOString(),
                amount: totalAmount,
                currency: currency,
                processId: shipment!.id,
                payments: [],
                expenseType: 'Operacional',
                description: `Serviços de frete ref. processo ${shipment!.id}`
            });
        });

        const response = await addFinancialEntriesAction(newEntries);

        if (response.success && response.data) {
            const allCurrentCharges = form.getValues('charges') as QuoteCharge[];
            let entryIndexOffset = response.data.length - newEntries.length;

            newEntries.forEach(newEntry => {
                 const originalCharges = entryMap.get(newEntry.partner)!.charges;
                 originalCharges.forEach(chargeToUpdate => {
                     const idx = allCurrentCharges.findIndex(c => c.id === chargeToUpdate.id);
                     if(idx > -1) {
                         allCurrentCharges[idx].financialEntryId = response.data[entryIndexOffset].id;
                     }
                 });
                 entryIndexOffset++;
            });
            
            toast({ title: `${newEntries.length} fatura(s) gerada(s) com sucesso!`, className: 'bg-success text-success-foreground' });
            return allCurrentCharges;
        } else {
             toast({ variant: 'destructive', title: 'Erro ao faturar', description: response.error });
             return chargesToInvoice; // Return original charges on failure
        }
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
        <>
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-7xl w-full p-0">
                <div className="flex flex-col h-full">
                <Form {...form}>
                    <SheetHeader className="p-4 border-b space-y-2">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-full">
                                    <GanttChart className="h-8 w-8 text-primary"/>
                                </div>
                                <div>
                                    <SheetTitle>Detalhes do Processo: {shipment.id}</SheetTitle>
                                    <div className="text-muted-foreground text-xs md:text-sm flex items-center gap-2">
                                        <span>Ref. Cliente: {shipment.purchaseOrderNumber}</span>
                                        <Separator orientation="vertical" className="h-4"/>
                                        <span>Invoice: {shipment.invoiceNumber}</span>
                                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 items-start pt-2">
                             <FormField control={form.control} name="shipperId" render={({ field }) => (<FormItem><FormLabel>Shipper</FormLabel><PartnerCombobox partners={partners} placeholder="Selecione..." value={field.value} onValueChange={field.onChange} /></FormItem>)} />
                             <FormField control={form.control} name="consigneeId" render={({ field }) => (<FormItem><FormLabel>Consignee</FormLabel><PartnerCombobox partners={partners} placeholder="Selecione..." value={field.value} onValueChange={field.onChange} /></FormItem>)} />
                             <FormField control={form.control} name="notifyId" render={({ field }) => (<FormItem><FormLabel>Notify</FormLabel><PartnerCombobox partners={partners} placeholder="Selecione..." value={field.value} onValueChange={field.onChange} /></FormItem>)} />
                             <FormField control={form.control} name="agentId" render={({ field }) => (<FormItem><FormLabel>Agente</FormLabel><PartnerCombobox partners={partners.filter(p=> p.roles.agente)} placeholder="Selecione..." value={field.value} onValueChange={field.onChange} /></FormItem>)} />
                             <FormField control={form.control} name="origin" render={({ field }) => (<FormItem><FormLabel>Origem</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)} />
                             <FormField control={form.control} name="destination" render={({ field }) => (<FormItem><FormLabel>Destino</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>)} />
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
                                <TabsTrigger value="desembaraco">Desembaraço</TabsTrigger>
                            </TabsList>
                            </div>

                            <div className="p-4">
                                <TabsContent value="timeline">
                                    <ShipmentTimelineTab
                                        ref={(el) => { if (el) formRefs.current['timeline'] = el; }}
                                        shipment={shipment}
                                        onUpdate={onUpdate}
                                    />
                                </TabsContent>
                                <TabsContent value="details">
                                     <ShipmentDetailsTab
                                        ref={(el) => { if (el) formRefs.current['details'] = el; }}
                                        shipment={shipment}
                                        partners={partners}
                                    />
                                </TabsContent>
                                <TabsContent value="financials">
                                     <ShipmentFinancialsTab
                                        ref={(el) => { if (el) formRefs.current['financials'] = el; }}
                                        shipment={shipment}
                                        partners={partners}
                                        onOpenDetails={handleOpenDetailsDialog}
                                    />
                                </TabsContent>
                                <TabsContent value="documents">
                                     <ShipmentDocumentsTab
                                        ref={(el) => { if (el) formRefs.current['documents'] = el; }}
                                        shipment={shipment}
                                    />
                                </TabsContent>
                                <TabsContent value="bl_draft">
                                     <BLDraftForm
                                        ref={(el) => { if (el) formRefs.current['bl_draft'] = el as any; }}
                                        shipment={shipment} 
                                        onUpdate={onUpdate} 
                                        isSheet 
                                    />
                                </TabsContent>
                                <TabsContent value="desembaraco">
                                    <CustomsClearanceTab shipment={shipment} onUpdate={onUpdate}/>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </Form>
                </div>
            </SheetContent>
        </Sheet>
        <FinancialDetailsDialog
            entry={detailsEntry}
            isOpen={!!detailsEntry}
            onClose={() => setDetailsEntry(null)}
            findEntryForPayment={(paymentId) => getStoredFinancialEntries().find(e => e.payments?.some(p => p.id === paymentId))}
            findShipmentForEntry={(entry) => shipment?.id === entry.processId ? shipment : undefined}
            onEntryUpdate={()=>{}}
        />
        </>
    );
}

