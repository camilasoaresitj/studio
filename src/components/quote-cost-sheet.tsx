
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
      charges: quote.charges || [],
    },
  });

  const clientPartners = React.useMemo(() => partners.filter(p => p.roles.cliente), [partners]);

  React.useEffect(() => {
    form.reset({ charges: quote.charges });
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
    const cost: Record<string, number> = { BRL: 0, USD: 0, EUR: 0, JPY: 0, CHF: 0, GBP: 0 };
    const sale: Record<string, number> = { BRL: 0, USD: 0, EUR: 0, JPY: 0, CHF: 0, GBP: 0 };
    const profit: Record<string, number> = { BRL: 0, USD: 0, EUR: 0, JPY: 0, CHF: 0, GBP: 0 };

    watchedCharges.forEach(charge => {
      const chargeCost = Number(charge.cost) || 0;
      const chargeSale = Number(charge.sale) || 0;

      cost[charge.costCurrency] = (cost[charge.costCurrency] || 0) + chargeCost;
      sale[charge.saleCurrency] = (sale[charge.saleCurrency] || 0) + chargeSale;
      
      profit[charge.saleCurrency] = (profit[charge.saleCurrency] || 0) + chargeSale;
      profit[charge.costCurrency] = (profit[charge.costCurrency] || 0) - chargeCost;
    });

    return { cost, sale, profit };
  }, [watchedCharges]);

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
          <div className="flex-grow overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                  <TableHead className="w-[15%]">Taxa</TableHead>
                  <TableHead>Tipo Cobrança</TableHead>
                  <TableHead>Local Pagamento</TableHead>
                  <TableHead>Moeda Compra</TableHead>
                  <TableHead>Compra</TableHead>
                  <TableHead>Moeda Venda</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Sacado</TableHead>
                  <TableHead>Ação</TableHead>
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
                           <Input placeholder="Ex: FRETE" {...field} className="w-36" />
                         )} />
                      </TableCell>
                      <TableCell>
                         <FormField control={form.control} name={`charges.${index}.type`} render={({ field }) => (
                           <Input placeholder="Ex: Por Contêiner" {...field} className="w-32" />
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
                      <TableCell>
                        <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BRL">BRL</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="JPY">JPY</SelectItem>
                                <SelectItem value="CHF">CHF</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </TableCell>
                       <TableCell>
                         <FormField control={form.control} name={`charges.${index}.cost`} render={({ field }) => (
                           <Input type="number" {...field} className="w-24" />
                         )} />
                       </TableCell>
                       <TableCell>
                         <FormField control={form.control} name={`charges.${index}.saleCurrency`} render={({ field }) => (
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BRL">BRL</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="JPY">JPY</SelectItem>
                                <SelectItem value="CHF">CHF</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                         )} />
                       </TableCell>
                       <TableCell>
                         <FormField control={form.control} name={`charges.${index}.sale`} render={({ field }) => (
                           <Input type="number" {...field} className="w-24" />
                         )} />
                       </TableCell>
                       <TableCell className={cn('font-semibold', canCalculateProfit ? (isLoss ? 'text-destructive' : 'text-success') : 'text-muted-foreground')}>
                          {canCalculateProfit ? `${profitCurrency} ${profit.toFixed(2)}` : 'N/A'}
                       </TableCell>
                       <TableCell>
                         <FormField control={form.control} name={`charges.${index}.supplier`} render={({ field }) => (
                           <Input placeholder="Ex: Maersk" {...field} className="w-32" />
                         )} />
                       </TableCell>
                       <TableCell>
                        <FormField control={form.control} name={`charges.${index}.sacado`} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || quote.customer}>
                                <SelectTrigger className="w-40"><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
              <Card className={cn(Object.values(totals.profit).some(p => p < 0) ? "border-destructive" : "border-success")}>
                  <CardHeader><CardTitle className="text-lg">Lucro Total</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                      {Object.entries(totals.profit).filter(([, value]) => value !== 0).map(([key, value]) => (
                        <div key={key} className={cn("flex justify-between font-semibold", value < 0 ? "text-destructive" : "text-success")}><span>{key}:</span><span className="font-mono">{value.toFixed(2)}</span></div>
                      ))}
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
