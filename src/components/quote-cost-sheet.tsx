

'use client';

import * as React from 'react';
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, PlusCircle, Save, ChevronsUpDown, Check, Wallet, FileText } from 'lucide-react';
import type { Quote, QuoteCharge } from '@/lib/initial-data';
import type { Partner } from '@/lib/partners-data';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { getFees } from '@/lib/fees-data';
import type { Fee } from '@/lib/fees-data';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const quoteChargeSchema = z.object({
  charges: z.array(z.object({
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
  })),
  details: z.object({
      validity: z.string().optional(),
      freeTime: z.string().optional(),
  }),
  shipperId: z.string().optional(),
  consigneeId: z.string().optional(),
  agentId: z.string().optional(),
});

type QuoteCostSheetFormData = z.infer<typeof quoteChargeSchema>;

interface QuoteCostSheetProps {
  quote: Quote;
  partners: Partner[];
  onUpdate: (data: { charges: QuoteCharge[], details: Quote['details'], shipper?: Partner, consignee?: Partner, agent?: Partner }) => void;
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

export function QuoteCostSheet({ quote, partners, onUpdate }: QuoteCostSheetProps) {
  const { toast } = useToast();
  const form = useForm<QuoteCostSheetFormData>({
    resolver: zodResolver(quoteChargeSchema),
    defaultValues: {
      charges: quote.charges,
      details: {
        validity: quote.details.validity,
        freeTime: quote.details.freeTime,
      },
      shipperId: quote.shipper?.id?.toString(),
      consigneeId: quote.consignee?.id?.toString(),
      agentId: quote.agent?.id?.toString(),
    },
  });

  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});
  const [fees, setFees] = React.useState<Fee[]>([]);
  const [isFeeDialogOpen, setIsFeeDialogOpen] = React.useState(false);
  const [selectedFees, setSelectedFees] = React.useState<Set<number>>(new Set());

  const clientPartners = React.useMemo(() => partners.filter(p => p.roles.cliente), [partners]);
  const supplierPartners = React.useMemo(() => partners.filter(p => p.roles.fornecedor || p.roles.agente), [partners]);
  const agentPartners = React.useMemo(() => partners.filter(p => p.roles.agente), [partners]);


  React.useEffect(() => {
    const fetchRates = async () => {
        const rates = await exchangeRateService.getRates();
        setExchangeRates(rates);
    };
    setFees(getFees());
    fetchRates();
  }, []);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "charges",
  });

  const handleAddSelectedFees = () => {
    if (selectedFees.size === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma taxa selecionada.' });
      return;
    }
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
            sacado: quote.customer,
            approvalStatus: 'pendente', // New charges require approval
            financialEntryId: null,
        }));
        
    newCharges.forEach(charge => append(charge as any));
    setIsFeeDialogOpen(false);
    setSelectedFees(new Set());
  };

  const watchedCharges = useWatch({ control: form.control, name: 'charges' });

  const totals = React.useMemo(() => {
    let totalCostBRL = 0;
    let totalSaleBRL = 0;

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

  const onSubmit = (data: QuoteCostSheetFormData) => {
    const updatedDetails = {
        ...quote.details,
        validity: data.details.validity || quote.details.validity,
        freeTime: data.details.freeTime || quote.details.freeTime,
    }
    onUpdate({
        charges: data.charges as QuoteCharge[],
        details: updatedDetails,
        shipper: partners.find(p => p.id?.toString() === data.shipperId),
        consignee: partners.find(p => p.id?.toString() === data.consigneeId),
        agent: partners.find(p => p.id?.toString() === data.agentId),
    });
  };
  
  const handleFeeSelection = (feeName: string, index: number) => {
    const fee = fees.find(f => f.name === feeName);
    if (fee && watchedCharges && watchedCharges[index]) {
      update(index, {
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
    <>
    <div className="flex flex-col h-full space-y-2">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex-grow flex flex-col overflow-hidden">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">Detalhes do Embarque</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm p-4 pt-0">
                        <div><strong className="text-muted-foreground">Origem:</strong> {quote.origin}</div>
                        <div><strong className="text-muted-foreground">Destino:</strong> {quote.destination}</div>
                        <div><strong className="text-muted-foreground">Carga:</strong> {quote.details.cargo}</div>
                        <div><strong className="text-muted-foreground">Incoterm:</strong> {quote.details.incoterm}</div>
                        <div><strong className="text-muted-foreground">Trânsito:</strong> {quote.details.transitTime}</div>
                        <FormField control={form.control} name="details.freeTime" render={({ field }) => (
                            <FormItem><FormLabel className="text-muted-foreground">Free Time:</FormLabel><FormControl><Input {...field} className="h-7"/></FormControl></FormItem>
                        )} />
                         <FormField control={form.control} name="details.validity" render={({ field }) => (
                           <FormItem className="flex flex-col col-span-2">
                                <FormLabel className="text-muted-foreground">Validade:</FormLabel>
                                <FormControl><Input {...field} className="h-7"/></FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">Parceiros do Embarque</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 pt-2">
                        <FormField control={form.control} name="shipperId" render={({ field }) => (
                            <FormItem><FormLabel>Shipper</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{partners.map(p => (<SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>))}</SelectContent></Select></FormItem>
                        )}/>
                         <FormField control={form.control} name="consigneeId" render={({ field }) => (
                            <FormItem><FormLabel>Consignee</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{partners.map(p => (<SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>))}</SelectContent></Select></FormItem>
                        )}/>
                         <FormField control={form.control} name="agentId" render={({ field }) => (
                            <FormItem><FormLabel>Agente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{agentPartners.map(p => (<SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>))}</SelectContent></Select></FormItem>
                        )}/>
                    </CardContent>
                </Card>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Tabela de Custos</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsFeeDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Taxa
                    </Button>
                </div>
                <div className="flex-grow overflow-hidden border rounded-lg">
                    <ScrollArea className="h-full">
                        <Table>
                        <TableHeader className="sticky top-0 bg-secondary z-10">
                            <TableRow>
                            <TableHead className="w-1/6">Taxa</TableHead>
                            <TableHead className="w-1/6">Fornecedor</TableHead>
                            <TableHead className="w-1/4 text-right">Compra</TableHead>
                            <TableHead className="w-1/6">Sacado</TableHead>
                            <TableHead className="w-1/4 text-right">Venda</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                            const charge = watchedCharges?.[index];
                             if (!charge) {
                                return null;
                            }
                            const availableFees = fees.filter(
                                fee => !watchedCharges.some(c => c.name === fee.name) || fee.name === charge.name
                            );
                            
                            return (
                                <TableRow key={field.id}>
                                <TableCell className="p-1 align-top">
                                    <FeeCombobox
                                        fees={availableFees}
                                        value={charge.name}
                                        onValueChange={(value) => handleFeeSelection(value, index)}
                                    />
                                </TableCell>
                                <TableCell className="p-1 align-top">
                                    <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..."/></SelectTrigger>
                                            <SelectContent>
                                                {supplierPartners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )} />
                                </TableCell>
                                <TableCell className="text-right p-1 align-top">
                                    <div className="flex items-center gap-1">
                                    <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="BRL">BRL</SelectItem>
                                          <SelectItem value="USD">USD</SelectItem>
                                          <SelectItem value="EUR">EUR</SelectItem>
                                          <SelectItem value="GBP">GBP</SelectItem>
                                          <SelectItem value="JPY">JPY</SelectItem>
                                          <SelectItem value="CHF">CHF</SelectItem>
                                        </SelectContent>
                                        </Select>
                                    )} />
                                    <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => (
                                        <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="w-full h-8" />
                                    )} />
                                    </div>
                                </TableCell>
                                <TableCell className="p-1 align-top">
                                    <FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || quote.customer}>
                                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                {clientPartners.map(p => (
                                                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )} />
                                </TableCell>
                                <TableCell className="text-right p-1 align-top">
                                    <div className="flex items-center gap-1">
                                    <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="BRL">BRL</SelectItem>
                                          <SelectItem value="USD">USD</SelectItem>
                                          <SelectItem value="EUR">EUR</SelectItem>
                                          <SelectItem value="GBP">GBP</SelectItem>
                                          <SelectItem value="JPY">JPY</SelectItem>
                                          <SelectItem value="CHF">CHF</SelectItem>
                                        </SelectContent>
                                        </Select>
                                    )} />
                                    <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => (
                                        <Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} className="w-full h-8" />
                                    )} />
                                    </div>
                                </TableCell>
                                <TableCell className="p-1 align-top text-center">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                                </TableRow>
                            );
                            })}
                        </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                
                <Separator className="!mt-auto" />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                    <Card>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-base">Custo Total (em BRL)</CardTitle></CardHeader>
                        <CardContent className="p-2 pt-0 text-sm">
                            <div className="flex justify-between font-semibold text-base">
                                <span>BRL:</span>
                                <span className="font-mono">{totals.totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-base">Venda Total (em BRL)</CardTitle></CardHeader>
                        <CardContent className="p-2 pt-0 text-sm">
                            <div className="flex justify-between font-semibold text-base">
                                <span>BRL:</span>
                                <span className="font-mono">{totals.totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className={cn(totals.totalProfitBRL < 0 ? "border-destructive" : "border-success")}>
                        <CardHeader className="p-2 pb-0"><CardTitle className="text-base">Resultado (Lucro)</CardTitle></CardHeader>
                        <CardContent className={cn("p-2 pt-0 text-sm font-semibold text-base", totals.totalProfitBRL < 0 ? "text-destructive" : "text-success")}>
                            <div className="flex justify-between">
                                <span>BRL:</span>
                                <span className="font-mono">{totals.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit">
                        <Save className="mr-2 h-4 w-4"/>
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Form>
    </div>

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
            <DialogFooter>
                 <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                 <Button onClick={handleAddSelectedFees}>Adicionar Taxas Selecionadas</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
