
'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle, Save, ChevronsUpDown, Check, Wallet, FileText } from 'lucide-react';
import type { Shipment, QuoteCharge } from '@/lib/shipment-data';
import type { Partner } from '@/lib/partners-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { getFees, Fee } from '@/lib/fees-data';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const financialsFormSchema = z.object({
    charges: z.array(quoteChargeSchemaForSheet).optional(),
});

type FinancialsFormData = z.infer<typeof financialsFormSchema>;

interface ShipmentFinancialsTabProps {
    shipment: Shipment;
    partners: Partner[];
    onOpenDetails: (charge: QuoteCharge) => void;
    onInvoiceCharges: (charges: QuoteCharge[], shipment: Shipment) => Promise<{ updatedCharges: QuoteCharge[] }>;
}

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
    'Contêiner',
    'BL',
    'Processo',
    'W/M',
    'KG',
    'AWB',
    'Fixo',
    'Percentual',
];

export const ShipmentFinancialsTab = forwardRef<{ submit: () => Promise<any> }, ShipmentFinancialsTabProps>(({ shipment, partners, onOpenDetails, onInvoiceCharges }, ref) => {
    const { toast } = useToast();
    const [fees] = useState<Fee[]>(getFees());
    const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());
    const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});

    const form = useForm<FinancialsFormData>({
        resolver: zodResolver(financialsFormSchema),
        defaultValues: {
            charges: shipment.charges || [],
        }
    });
    
    React.useEffect(() => {
        const fetchRates = async () => {
            const rates = await exchangeRateService.getRates();
            setExchangeRates(rates);
        };
        fetchRates();
        form.reset({ charges: shipment.charges || [] });
    }, [shipment, form]);

    useImperativeHandle(ref, () => ({
        submit: async () => {
            const isValid = await form.trigger();
            if (!isValid) throw new Error("Por favor, corrija os erros na aba Financeiro.");
            return form.getValues();
        }
    }));
    
    const { fields: chargesFields, append: appendCharge, remove: removeCharge, update: updateCharge } = useFieldArray({
        control: form.control,
        name: "charges",
    });

    const watchedCharges = form.watch('charges');

    const handleInvoiceSelectedWrapper = async () => {
        const chargesToInvoice = watchedCharges?.filter(c => selectedChargeIds.has(c.id)) || [];
        if (chargesToInvoice.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhuma taxa selecionada.'});
            return;
        }
        
        const { updatedCharges } = await onInvoiceCharges(chargesToInvoice as QuoteCharge[], shipment);

        form.setValue('charges', updatedCharges as any);
        setSelectedChargeIds(new Set());
    };


    const calculateBRLValues = React.useCallback((charge: QuoteCharge) => {
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

        return {
            costInBrl: chargeCost * costRate,
            saleInBrl: chargeSale * saleRate,
        };
    }, [partners, exchangeRates]);

    const totals = React.useMemo(() => {
        let totalCostBRL = 0;
        let totalSaleBRL = 0;

        watchedCharges?.forEach(charge => {
            const { costInBrl, saleInBrl } = calculateBRLValues(charge as QuoteCharge);
            totalCostBRL += costInBrl;
            totalSaleBRL += saleInBrl;
        });

        const totalProfitBRL = totalSaleBRL - totalCostBRL;

        return { totalCostBRL, totalSaleBRL, totalProfitBRL };
    }, [watchedCharges, calculateBRLValues]);
    
    const toggleChargeSelection = (chargeId: string) => {
        setSelectedChargeIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chargeId)) {
                newSet.delete(chargeId);
            } else {
                newSet.add(chargeId);
            }
            return newSet;
        });
    };
    
    const handleFeeSelection = (feeName: string, index: number) => {
        const fee = fees.find(f => f.name === feeName);
        if (fee && watchedCharges && watchedCharges[index]) {
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


    return (
        <Form {...form}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Planilha de Custos e Vendas</CardTitle>
                        <div className="flex items-center gap-2">
                             <Button type="button" variant="secondary" size="sm" onClick={handleInvoiceSelectedWrapper} disabled={selectedChargeIds.size === 0}>
                                <FileText className="mr-2 h-4 w-4"/> Faturar Selecionados ({selectedChargeIds.size})
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => appendCharge({ id: `custom-${Date.now()}`, name: '', type: 'Fixo', cost: 0, costCurrency: 'BRL', sale: 0, saleCurrency: 'BRL', supplier: '', sacado: shipment.customer, approvalStatus: 'pendente', financialEntryId: null })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Taxa
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Taxa</TableHead>
                                    <TableHead>Fornecedor</TableHead>
                                    <TableHead>Cobrança por</TableHead>
                                    <TableHead>Tipo Cont.</TableHead>
                                    <TableHead className="text-right">Custo</TableHead>
                                    <TableHead className="text-right">Custo Total</TableHead>
                                    <TableHead>Sacado</TableHead>
                                    <TableHead className="text-right">Venda</TableHead>
                                    <TableHead className="text-right">Venda Total</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chargesFields.map((field, index) => {
                                    const charge = watchedCharges?.[index];
                                    if (!charge) return null;
                                    const isFaturado = !!charge.financialEntryId;
                                    
                                    return (
                                        <TableRow key={field.id} data-state={isFaturado ? 'selected' : ''}>
                                            <TableCell className="p-1 align-top">
                                                <Checkbox
                                                    checked={selectedChargeIds.has(charge.id)}
                                                    onCheckedChange={() => toggleChargeSelection(charge.id)}
                                                    disabled={isFaturado}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 align-top min-w-[200px]">
                                                <div className="flex items-center gap-1">
                                                    {isFaturado && (
                                                        <TooltipProvider>
                                                            <Tooltip><TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenDetails(charge as QuoteCharge)}><FileText className="h-4 w-4 text-primary" /></Button>
                                                            </TooltipTrigger><TooltipContent><p>Ver Fatura</p></TooltipContent></Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    <span className={cn(isFaturado && "text-muted-foreground")}>{charge.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1 align-top min-w-[150px]"><FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                            <TableCell className="p-1 align-top min-w-[150px]"><FormField control={form.control} name={`charges.${index}.type`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{chargeTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                            <TableCell className="p-1 align-top min-w-[150px]"><FormField control={form.control} name={`charges.${index}.containerType`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado || charge.type !== 'Contêiner'}><SelectTrigger className="h-8"><SelectValue placeholder="N/A"/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Dry">Dry</SelectItem><SelectItem value="Reefer">Reefer</SelectItem><SelectItem value="Especiais">Especiais</SelectItem></SelectContent></Select>)} /></TableCell>
                                            <TableCell className="p-1 align-top text-right min-w-[150px]"><FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => <Input type="number" {...field} className="h-8" disabled={isFaturado}/>} /></TableCell>
                                            <TableCell className="p-1 align-top text-right min-w-[150px]"><div className="flex gap-1"><FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>)} /><span>{(charge.cost || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div></TableCell>
                                            <TableCell className="p-1 align-top min-w-[150px]"><FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>)} /></TableCell>
                                            <TableCell className="p-1 align-top text-right min-w-[150px]"><FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => <Input type="number" {...field} className="h-8" disabled={isFaturado}/>} /></TableCell>
                                            <TableCell className="p-1 align-top text-right min-w-[150px]"><div className="flex gap-1"><FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>)} /><span>{(charge.sale || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div></TableCell>
                                            <TableCell className="p-1 align-top text-center"><Button type="button" variant="ghost" size="icon" onClick={() => removeCharge(index)} disabled={isFaturado}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 pt-0">
                    <Card>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">Custo Total (em BRL)</CardTitle></CardHeader>
                        <CardContent className="p-2 text-base font-semibold font-mono">BRL {totals.totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">Venda Total (em BRL)</CardTitle></CardHeader>
                        <CardContent className="p-2 text-base font-semibold font-mono">BRL {totals.totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</CardContent>
                    </Card>
                    <Card className={cn(totals.totalProfitBRL < 0 ? "border-destructive" : "border-success")}>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">Resultado (Lucro)</CardTitle></CardHeader>
                        <CardContent className={cn("p-2 text-base font-semibold font-mono", totals.totalProfitBRL < 0 ? "text-destructive" : "text-success")}>
                           BRL {totals.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </CardContent>
                    </Card>
                </div>
            </Card>
        </Form>
    );
});

ShipmentFinancialsTab.displayName = 'ShipmentFinancialsTab';
