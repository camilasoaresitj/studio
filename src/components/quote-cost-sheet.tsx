
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
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
    approvalStatus: z.enum(['approved', 'pending']),
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
    if (quote) {
      form.reset({ charges: quote.charges || [] });
    }
    const fetchRates = async () => {
        const rates = await exchangeRateService.getRates();
        setExchangeRates(rates);
    };
    fetchRates();
  }, [quote, form]);

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
        approvalStatus: 'pending',
        financialEntryId: null,
    });
  };

  const watchedCharges = form.watch('charges');

  const totals = React.useMemo(() => {
    const cost: Record<string, number> = {};
    const sale: Record<string, number> = {};
    let totalProfitBRL = 0;

    watchedCharges.forEach(charge => {
        const chargeCost = Number(charge.cost) || 0;
        const chargeSale = Number(charge.sale) || 0;

        cost[charge.costCurrency] = (cost[charge.costCurrency] || 0) + chargeCost;
        sale[charge.saleCurrency] = (sale[charge.saleCurrency] || 0) + chargeSale;

        // --- BRL Profit Calculation ---
        const customer = partners.find(p => p.name === charge.sacado);
        const supplier = partners.find(p => p.name === charge.supplier);

        const customerAgio = customer?.exchangeRateAgio ?? 0;
        const supplierAgio = supplier?.exchangeRateAgio ?? 0;

        const salePtax = exchangeRates[charge.saleCurrency] || 1;
        const costPtax = exchangeRates[charge.costCurrency] || 1;

        const saleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + customerAgio / 100);
        const costRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + supplierAgio / 100);

        const saleInBRL = chargeSale * saleRate;
        const costInBRL = chargeCost * costRate;
        
        totalProfitBRL += (saleInBRL - costInBRL);
    });

    return { cost, sale, totalProfitBRL };
  }, [watchedCharges, partners, exchangeRates]);

  const onSubmit = (data: QuoteCostSheetFormData) => {
    onUpdate(data);
  };

  return (
    <div className="flex flex-col h-full">
        <Card className="mb-4">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg">Detalhes do Embarque</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow flex flex-col">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tabela de Custos e Vendas</h3>
            <Button type="button" variant="outline" size="sm" onClick={handleAddNewCharge}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Nova Taxa
            </Button>
          </div>
          <div className="flex-grow overflow-hidden border rounded-lg">
            <ScrollArea className="h-full">
              <Table className="min-w-[1200px]">
                <TableHeader className="sticky top-0 bg-secondary z-10">
                  <TableRow>
                    <TableHead className="w-[150px]">Taxa</TableHead>
                    <TableHead className="w-[150px]">Tipo Cobrança</TableHead>
                    <TableHead className="w-[150px]">Local Pagamento</TableHead>
                    <TableHead className="w-[200px] text-right">Compra</TableHead>
                    <TableHead className="w-[200px] text-right">Venda</TableHead>
                    <TableHead className="w-[120px] text-right">Lucro</TableHead>
                    <TableHead className="w-[150px]">Fornecedor</TableHead>
                    <TableHead className="w-[150px]">Sacado</TableHead>
                    <TableHead className="w-[50px]">Ação</TableHead>
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
                        <TableCell>
                          <FormField control={form.control} name={`charges.${index}.name`} render={({ field }) => (
                            <Input placeholder="Ex: FRETE" {...field} />
                          )} />
                        </TableCell>
                        <TableCell>
                           <FormField control={form.control} name={`charges.${index}.type`} render={({ field }) => (
                            <Input placeholder="Ex: Por Contêiner" {...field} />
                          )} />
                        </TableCell>
                        <TableCell>
                          <FormField control={form.control} name={`charges.${index}.localPagamento`} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger><SelectValue placeholder="Selecione..."/></SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="Origem">Origem</SelectItem>
                                  <SelectItem value="Frete">Frete</SelectItem>
                                  <SelectItem value="Destino">Destino</SelectItem>
                              </SelectContent>
                            </Select>
                          )} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1">
                            <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                              </Select>
                            )} />
                            <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => (
                              <Input type="number" {...field} className="w-full" />
                            )} />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1">
                            <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                              </Select>
                            )} />
                            <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => (
                              <Input type="number" {...field} className="w-full" />
                            )} />
                          </div>
                        </TableCell>
                        <TableCell className={cn('font-semibold text-right', canCalculateProfit ? (isLoss ? 'text-destructive' : 'text-success') : 'text-muted-foreground')}>
                            {canCalculateProfit ? `${profitCurrency} ${profit.toFixed(2)}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                            <Input placeholder="Ex: Maersk" {...field} />
                          )} />
                        </TableCell>
                        <TableCell>
                          <FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || quote.customer}>
                                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                      {clientPartners.map(p => (
                                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          )} />
                        </TableCell>
                        <TableCell>
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
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                  <CardHeader><CardTitle className="text-lg">Totais de Custo</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                      {Object.entries(totals.cost).filter(([, value]) => value !== 0).map(([key, value]) => (
                        <div key={key} className="flex justify-between"><span>{key}:</span><span className="font-mono">{value.toFixed(2)}</span></div>
                      ))}
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader><CardTitle className="text-lg">Totais de Venda</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                       {Object.entries(totals.sale).filter(([, value]) => value !== 0).map(([key, value]) => (
                        <div key={key} className="flex justify-between"><span>{key}:</span><span className="font-mono">{value.toFixed(2)}</span></div>
                      ))}
                  </CardContent>
              </Card>
              <Card className={cn(totals.totalProfitBRL < 0 ? "border-destructive" : "border-success")}>
                  <CardHeader><CardTitle className="text-lg">Lucro Total (em BRL)</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                      <div className={cn("flex justify-between font-semibold", totals.totalProfitBRL < 0 ? "text-destructive" : "text-success")}>
                          <span>BRL:</span>
                          <span className="font-mono">{totals.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  </CardContent>
              </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit">Salvar Alterações</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
