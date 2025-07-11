
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Trash2, PlusCircle } from 'lucide-react';
import type { Quote, QuoteCharge } from './customer-quotes-list';
import type { Partner } from './partners-registry';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { exchangeRateService } from '@/services/exchange-rate-service';

const quoteChargeSchema = z.object({
  charges: z.array(z.object({
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
    financialEntryId: z.string().nullable().optional(),
  }))
});

type QuoteCostSheetFormData = z.infer<typeof quoteChargeSchema>;

interface QuoteCostSheetProps {
  quote: Quote;
  partners: Partner[];
  onUpdate: (data: QuoteCostSheetFormData) => void;
}

export function QuoteCostSheet({ quote, partners, onUpdate }: QuoteCostSheetProps) {
  const form = useForm<QuoteCostSheetFormData>({
    resolver: zodResolver(quoteChargeSchema),
    defaultValues: {
      charges: [],
    },
  });

  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});
  const clientPartners = React.useMemo(() => partners.filter(p => p.roles.cliente), [partners]);

  React.useEffect(() => {
    // This effect now correctly resets the form whenever the quote prop changes.
    // This is the key to solving the stale data issue.
    if (quote) {
      form.reset({ charges: quote.charges || [] });
    }
  }, [quote, form]);

  React.useEffect(() => {
    const fetchRates = async () => {
        const rates = await exchangeRateService.getRates();
        setExchangeRates(rates);
    };
    fetchRates();
  }, []);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "charges",
  });

  const handleAddNewCharge = () => {
    append({
        id: `new-charge-${Date.now()}`,
        name: '',
        type: 'Fixo',
        localPagamento: 'Frete',
        cost: 0,
        costCurrency: 'USD',
        sale: 0,
        saleCurrency: 'USD',
        supplier: '',
        sacado: quote.customer,
        approvalStatus: 'pendente',
        financialEntryId: null,
    });
  };

  const watchedCharges = form.watch('charges');

  const totalsBRL = React.useMemo(() => {
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

    return { 
        totalCostBRL, 
        totalSaleBRL, 
        totalProfitBRL: totalSaleBRL - totalCostBRL 
    };
  }, [watchedCharges, partners, exchangeRates]);

  const onSubmit = (data: QuoteCostSheetFormData) => {
    onUpdate(data);
  };

  return (
    <div className="flex flex-col h-full space-y-2">
        <Card>
            <CardHeader className="p-3">
                <CardTitle className="text-base">Detalhes do Embarque</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm p-3 pt-0">
                <div><strong className="text-muted-foreground">Origem:</strong> {quote.origin}</div>
                <div><strong className="text-muted-foreground">Destino:</strong> {quote.destination}</div>
                <div><strong className="text-muted-foreground">Carga:</strong> {quote.details.cargo}</div>
                <div><strong className="text-muted-foreground">Incoterm:</strong> {quote.details.incoterm}</div>
                <div><strong className="text-muted-foreground">Trânsito:</strong> {quote.details.transitTime}</div>
                <div><strong className="text-muted-foreground">Free Time:</strong> {quote.details.freeTime}</div>
                <div className="col-span-2"><strong className="text-muted-foreground">Validade:</strong> {quote.details.validity}</div>
            </CardContent>
        </Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 flex-grow flex flex-col overflow-hidden">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tabela de Custos e Vendas</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddNewCharge}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Taxa
            </Button>
          </div>
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-secondary z-10">
                    <TableRow>
                      <TableHead className="h-9 w-[200px]">Taxa</TableHead>
                      <TableHead className="h-9 w-[120px]">Tipo Cobrança</TableHead>
                      <TableHead className="h-9 w-[180px] text-right">Compra</TableHead>
                      <TableHead className="h-9 w-[180px] text-right">Venda</TableHead>
                      <TableHead className="h-9 w-[120px] text-right">Lucro</TableHead>
                      <TableHead className="h-9 w-[180px]">Fornecedor</TableHead>
                      <TableHead className="h-9 w-[180px]">Sacado</TableHead>
                      <TableHead className="h-9 w-[50px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const charge = watchedCharges[index];
                      const canCalculateProfit = charge.saleCurrency === charge.costCurrency;
                      const profit = canCalculateProfit ? (Number(charge.sale) || 0) - (Number(charge.cost) || 0) : 0;
                      const profitCurrency = charge.saleCurrency;
                      const isLoss = canCalculateProfit && profit < 0;
                      
                      return (
                        <TableRow key={field.id}>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`charges.${index}.name`} render={({ field }) => (
                              <Input placeholder="Ex: FRETE" {...field} className="h-8"/>
                            )} />
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`charges.${index}.type`} render={({ field }) => (
                              <Input placeholder="Ex: Por Contêiner" {...field} className="h-8"/>
                            )} />
                          </TableCell>
                          <TableCell className="text-right p-1">
                            <div className="flex items-center gap-1">
                              <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                </Select>
                              )} />
                              <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => (
                                <Input type="number" {...field} className="w-full h-8" />
                              )} />
                            </div>
                          </TableCell>
                          <TableCell className="text-right p-1">
                            <div className="flex items-center gap-1">
                              <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <SelectTrigger className="w-[80px] h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                                </Select>
                              )} />
                              <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => (
                                <Input type="number" {...field} className="w-full h-8" />
                              )} />
                            </div>
                          </TableCell>
                          <TableCell className={cn('font-semibold text-right p-1', canCalculateProfit ? (isLoss ? 'text-destructive' : 'text-success') : 'text-muted-foreground')}>
                              {canCalculateProfit ? `${profitCurrency} ${profit.toFixed(2)}` : 'N/A'}
                          </TableCell>
                          <TableCell className="p-1">
                            <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                              <Input placeholder="Ex: Maersk" {...field} className="h-8"/>
                            )} />
                          </TableCell>
                          <TableCell className="p-1">
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
                          <TableCell className="p-1">
                              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
          
          <Separator className="!mt-auto" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
              <Card>
                  <CardHeader className="p-2"><CardTitle className="text-base">Custo Total (em BRL)</CardTitle></CardHeader>
                  <CardContent className="p-2 pt-0 text-sm">
                      <div className="flex justify-between font-semibold">
                          <span>BRL:</span>
                          <span className="font-mono">{totalsBRL.totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader className="p-2"><CardTitle className="text-base">Venda Total (em BRL)</CardTitle></CardHeader>
                  <CardContent className="p-2 pt-0 text-sm">
                       <div className="flex justify-between font-semibold">
                          <span>BRL:</span>
                          <span className="font-mono">{totalsBRL.totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  </CardContent>
              </Card>
              <Card className={cn(totalsBRL.totalProfitBRL < 0 ? "border-destructive" : "border-success")}>
                  <CardHeader className="p-2"><CardTitle className="text-base">Lucro Total (em BRL)</CardTitle></CardHeader>
                  <CardContent className="p-2 pt-0 text-sm">
                      <div className={cn("flex justify-between font-semibold", totalsBRL.totalProfitBRL < 0 ? "text-destructive" : "text-success")}>
                          <span>BRL:</span>
                          <span className="font-mono">{totalsBRL.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  </CardContent>
              </Card>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
