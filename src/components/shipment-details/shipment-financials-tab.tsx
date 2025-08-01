
'use client';

import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle, ChevronsUpDown, Check } from 'lucide-react';
import type { Shipment, Partner, QuoteCharge } from '@/lib/shipment-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getFees, Fee } from '@/lib/fees-data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Wallet } from 'lucide-react';

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

const financialsFormSchema = z.object({
    charges: z.array(quoteChargeSchemaForSheet).optional(),
});

type FinancialsFormData = z.infer<typeof financialsFormSchema>;

interface ShipmentFinancialsTabProps {
    shipment: Shipment;
    partners: Partner[];
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

export const ShipmentFinancialsTab = forwardRef<{ submit: () => Promise<any> }, ShipmentFinancialsTabProps>(({ shipment, partners }, ref) => {
    const { toast } = useToast();
    const [fees] = useState<Fee[]>(getFees());

    const form = useForm<FinancialsFormData>({
        resolver: zodResolver(financialsFormSchema),
        defaultValues: {
            charges: shipment.charges || [],
        }
    });

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

    return (
        <Form {...form}>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Planilha de Custos e Vendas</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => {}}>Faturar Processo</Button>
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
                                    <TableHead className="w-[180px]">Taxa</TableHead>
                                    <TableHead className="w-[180px]">Fornecedor</TableHead>
                                    <TableHead className="w-[200px]">Custo</TableHead>
                                    <TableHead className="w-[180px]">Sacado</TableHead>
                                    <TableHead className="w-[200px]">Venda</TableHead>
                                    <TableHead className="w-[50px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chargesFields.map((field, index) => {
                                    const charge = watchedCharges?.[index];
                                    if (!charge) return null;
                                    return (
                                        <TableRow key={field.id}>
                                            <TableCell className="p-1 align-top"><FeeCombobox fees={fees} value={charge.name} onValueChange={() => {}} /></TableCell>
                                            <TableCell className="p-1 align-top">
                                                <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..."/></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                 <div className="flex gap-1">
                                                    <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>)} />
                                                    <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => <Input type="number" {...field} className="h-8" />} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-1 align-top">
                                                <div className="flex gap-1">
                                                    <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (<Select onValueChange={field.onChange} value={field.value}><SelectTrigger className="h-8 w-[80px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>)} />
                                                    <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => <Input type="number" {...field} className="h-8" />} />
                                                </div>
                                                {charge.approvalStatus === 'pendente' && <Badge variant="default" className="mt-1">Pendente</Badge>}
                                                {charge.approvalStatus === 'rejeitada' && <Badge variant="destructive" className="mt-1">Rejeitada</Badge>}
                                            </TableCell>
                                            <TableCell className="p-1 align-top text-center">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCharge(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </Form>
    );
});

ShipmentFinancialsTab.displayName = 'ShipmentFinancialsTab';
