
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
import { Trash2, PlusCircle, ChevronsUpDown, Check, Wallet, FileText } from 'lucide-react';
import type { Shipment, Partner, QuoteCharge } from '@/lib/shipment-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getFees, Fee } from '@/lib/fees-data';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { addFinancialEntriesAction } from '@/app/actions';
import { exchangeRateService } from '@/services/exchange-rate-service';

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

const containerTypeOptions = ['Todos', 'Dry', 'Reefer', 'Especiais'];
const chargeTypeOptions = ['Contêiner', 'BL', 'Processo', 'W/M', 'KG', 'AWB', 'Fixo', 'Percentual'];


export const ShipmentFinancialsTab = forwardRef<{ submit: () => Promise<any> }, ShipmentFinancialsTabProps>(({ shipment, partners, onOpenDetails }, ref) => {
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
    }, []);

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

    const handleInvoiceSelected = async () => {
        const chargesToInvoice = watchedCharges?.filter(c => selectedChargeIds.has(c.id)) || [];
        if (chargesToInvoice.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhuma taxa selecionada.'});
            return;
        }

        const newEntries: Omit<import('/src/lib/financials-data').FinancialEntry, 'id'>[] = [];
        const updatedChargeMap = new Map<string, QuoteCharge>();

        // Agrupa por sacado para gerar uma fatura por parceiro
        const bySacado = chargesToInvoice.reduce((acc, charge) => {
            const key = charge.sacado || 'N/A';
            if (!acc[key]) acc[key] = [];
            acc[key].push(charge);
            return acc;
        }, {} as Record<string, QuoteCharge[]>);
        
        for (const sacadoName of Object.keys(bySacado)) {
            const partnerCharges = bySacado[sacadoName];
            const isCredit = sacadoName === shipment.customer;
            const entryType = isCredit ? 'credit' : 'debit';
            const invoicePrefix = isCredit ? 'INV' : 'BILL';
            const financialEntryId = `fin-${entryType}-${shipment.id}-${sacadoName.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

            const { total, currency } = partnerCharges.reduce((acc, charge) => {
                const value = isCredit ? charge.sale : charge.cost;
                const curr = isCredit ? charge.saleCurrency : charge.costCurrency;
                // Simple logic: assumes all charges for one partner have the same currency. A real app would group by currency too.
                acc.total += value;
                acc.currency = curr;
                return acc;
            }, { total: 0, currency: 'BRL' as QuoteCharge['saleCurrency'] });

            newEntries.push({
                type: entryType, partner: sacadoName,
                invoiceId: `${invoicePrefix}-${shipment.id.replace('PROC-','')}`, dueDate: new Date().toISOString(),
                amount: total, currency: currency,
                processId: shipment.id, status: 'Aberto', expenseType: 'Operacional'
            });

            partnerCharges.forEach(c => {
                 updatedChargeMap.set(c.id, { ...c, financialEntryId });
            });
        }

        await addFinancialEntriesAction(newEntries);
        
        // Update the form state to reflect the invoicing
        const newCharges = chargesFields.map(c => updatedChargeMap.get(c.id) || c);
        form.setValue('charges', newCharges);

        toast({ title: `${newEntries.length} fatura(s) gerada(s) com sucesso!`, className: 'bg-success text-success-foreground' });
        setSelectedChargeIds(new Set());
    };

    const calculateBRLValues = (charge: QuoteCharge) => {
        const costPartner = partners.find(p => p.name === charge.supplier);
        const salePartner = partners.find(p => p.name === charge.sacado);

        const costAgio = costPartner?.exchangeRateAgio ?? 0;
        const saleAgio = salePartner?.exchangeRateAgio ?? 0;
        
        const costPtax = exchangeRates[charge.costCurrency] || 1;
        const salePtax = exchangeRates[charge.saleCurrency] || 1;
        
        const costRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + costAgio / 100);
        const saleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + saleAgio / 100);

        return {
            costBRL: charge.cost * costRate,
            saleBRL: charge.sale * saleRate,
        };
    };

    const totals = React.useMemo(() => {
        const costTotals: Record<string, number> = {};
        const saleTotals: Record<string, number> = {};

        watchedCharges?.forEach(charge => {
            const chargeCost = Number(charge.cost) || 0;
            const chargeSale = Number(charge.sale) || 0;

            costTotals[charge.costCurrency] = (costTotals[charge.costCurrency] || 0) + chargeCost;
            saleTotals[charge.saleCurrency] = (saleTotals[charge.saleCurrency] || 0) + chargeSale;
        });

        const { costBRL, saleBRL } = watchedCharges?.reduce((acc, charge) => {
            const { costBRL, saleBRL } = calculateBRLValues(charge);
            acc.costBRL += costBRL;
            acc.saleBRL += saleBRL;
            return acc;
        }, { costBRL: 0, saleBRL: 0 }) || { costBRL: 0, saleBRL: 0 };

        return {
            cost: costTotals,
            sale: saleTotals,
            profitBRL: saleBRL - costBRL,
        };
    }, [watchedCharges, exchangeRates, partners]);

    const formatTotals = (totals: Record<string, number>) => {
        const parts = Object.entries(totals)
            .filter(([, value]) => value !== 0)
            .map(([currency, value]) => 
                `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            );
        return parts.length > 0 ? parts.join(' | ') : 'N/A';
    };

    return (
        <Form {...form}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Planilha de Custos e Vendas</CardTitle>
                        <div className="flex items-center gap-2">
                             <Button type="button" variant="secondary" size="sm" onClick={handleInvoiceSelected} disabled={selectedChargeIds.size === 0}>
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
                                    <TableHead className="w-[150px]">Taxa</TableHead>
                                    <TableHead className="w-[150px]">Fornecedor</TableHead>
                                    <TableHead className="w-[200px]">Custo</TableHead>
                                    <TableHead className="w-[120px] text-right">Custo (BRL)</TableHead>
                                    <TableHead className="w-[150px]">Sacado</TableHead>
                                    <TableHead className="w-[200px]">Venda</TableHead>
                                    <TableHead className="w-[120px] text-right">Venda (BRL)</TableHead>
                                    <TableHead className="w-[50px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chargesFields.map((field, index) => {
                                    const charge = watchedCharges?.[index];
                                    if (!charge) return null;
                                    const isFaturado = !!charge.financialEntryId;
                                    const { costBRL, saleBRL } = calculateBRLValues(charge);
                                    
                                    return (
                                        <TableRow key={field.id} data-state={isFaturado ? 'selected' : ''}>
                                            <TableCell className="p-1 align-top">
                                                <Checkbox
                                                    checked={selectedChargeIds.has(charge.id)}
                                                    onCheckedChange={() => toggleChargeSelection(charge.id)}
                                                    disabled={isFaturado}
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <div className="flex items-center gap-1">
                                                    {isFaturado ? (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenDetails(charge)}>
                                                                        <FileText className="h-4 w-4 text-primary" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Ver Fatura</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ) : null}
                                                    <span className={cn(isFaturado && "text-muted-foreground text-xs")}>{charge.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                 <div className="flex gap-1">
                                                    <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>)} />
                                                    <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => <Input type="number" {...field} className="h-8" disabled={isFaturado}/>} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1 align-top text-right font-mono text-sm">
                                                {costBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <div className="flex gap-1">
                                                    <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value} disabled={isFaturado}><SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>)} />
                                                    <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => <Input type="number" {...field} className="h-8" disabled={isFaturado}/>} />
                                                </div>
                                                {charge.approvalStatus === 'pendente' && <Badge variant="default" className="mt-1">Pendente</Badge>}
                                                {charge.approvalStatus === 'rejeitada' && <Badge variant="destructive" className="mt-1">Rejeitada</Badge>}
                                            </TableCell>
                                            <TableCell className="p-1 align-top text-right font-mono text-sm">
                                                 {saleBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </TableCell>
                                            <TableCell className="p-1 align-top text-center">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCharge(index)} disabled={isFaturado}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-4 pt-0">
                    <Card>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">Custo Total</CardTitle></CardHeader>
                        <CardContent className="p-2 text-base font-semibold font-mono">{formatTotals(totals.cost)}</CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">Venda Total</CardTitle></CardHeader>
                        <CardContent className="p-2 text-base font-semibold font-mono">{formatTotals(totals.sale)}</CardContent>
                    </Card>
                    <Card className={cn(totals.profitBRL < 0 ? 'border-destructive' : 'border-success')}>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">Resultado (em BRL)</CardTitle></CardHeader>
                        <CardContent className={cn("p-2 text-base font-semibold font-mono", totals.profitBRL < 0 ? "text-destructive" : "text-success")}>
                            {totals.profitBRL.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </CardContent>
                    </Card>
                </div>
            </Card>
        </Form>
    );
});

ShipmentFinancialsTab.displayName = 'ShipmentFinancialsTab';
