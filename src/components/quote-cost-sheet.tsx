
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
import { Trash2 } from 'lucide-react';
import type { Quote, QuoteCharge } from './customer-quotes-list';
import { cn } from '@/lib/utils';

const quoteChargeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  cost: z.coerce.number().default(0),
  costCurrency: z.enum(['USD', 'BRL']),
  sale: z.coerce.number().default(0),
  saleCurrency: z.enum(['USD', 'BRL']),
  supplier: z.string(),
});

const quoteCostSheetSchema = z.object({
  charges: z.array(quoteChargeSchema),
});

type QuoteCostSheetFormData = z.infer<typeof quoteCostSheetSchema>;

interface QuoteCostSheetProps {
  quote: Quote;
  onUpdate: (data: QuoteCostSheetFormData) => void;
}

export function QuoteCostSheet({ quote, onUpdate }: QuoteCostSheetProps) {
  const form = useForm<QuoteCostSheetFormData>({
    resolver: zodResolver(quoteCostSheetSchema),
    defaultValues: {
      charges: quote.charges,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "charges",
  });

  const watchedCharges = form.watch('charges');

  const totals = React.useMemo(() => {
    const cost = { BRL: 0, USD: 0 };
    const sale = { BRL: 0, USD: 0 };
    const profit = { BRL: 0, USD: 0 };

    watchedCharges.forEach(charge => {
      // Accumulate total costs and sales per currency
      cost[charge.costCurrency] += charge.cost;
      sale[charge.saleCurrency] += charge.sale;
      
      // To calculate profit, we add the sale value to its currency bucket
      // and subtract the cost value from its currency bucket.
      // This correctly handles multi-currency profit calculation.
      profit[charge.saleCurrency] += charge.sale;
      profit[charge.costCurrency] -= charge.cost;
    });

    return { cost, sale, profit };
  }, [watchedCharges]);

  const onSubmit = (data: QuoteCostSheetFormData) => {
    onUpdate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow flex flex-col">
          <div className="flex-grow overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader className="sticky top-0 bg-secondary z-10">
                <TableRow>
                  <TableHead className="w-[20%]">Taxa</TableHead>
                  <TableHead>Tipo Cobrança</TableHead>
                  <TableHead>Moeda Compra</TableHead>
                  <TableHead>Compra</TableHead>
                  <TableHead>Moeda Venda</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const charge = watchedCharges[index];
                  const canCalculateProfit = charge.saleCurrency === charge.costCurrency;
                  const profit = canCalculateProfit ? charge.sale - charge.cost : 0;
                  const profitCurrency = charge.saleCurrency;
                  const isLoss = canCalculateProfit && profit < 0;
                  
                  return (
                    <TableRow key={field.id}>
                      <TableCell>{charge.name}</TableCell>
                      <TableCell>{charge.type}</TableCell>
                      <TableCell>
                        <FormField control={form.control} name={`charges.${index}.costCurrency`} render={({ field }) => (
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
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
                            <SelectContent><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
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
                           <Input {...field} />
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
                      <div className="flex justify-between"><span>USD:</span><span className="font-mono">{totals.cost.USD.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>BRL:</span><span className="font-mono">{totals.cost.BRL.toFixed(2)}</span></div>
                  </CardContent>
              </Card>
               <Card>
                  <CardHeader><CardTitle className="text-lg">Totais de Venda</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>USD:</span><span className="font-mono">{totals.sale.USD.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>BRL:</span><span className="font-mono">{totals.sale.BRL.toFixed(2)}</span></div>
                  </CardContent>
              </Card>
              <Card className={cn(totals.profit.BRL < 0 || totals.profit.USD < 0 ? "border-destructive" : "border-success")}>
                  <CardHeader><CardTitle className="text-lg">Lucro Total</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>USD:</span><span className="font-mono">{totals.profit.USD.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>BRL:</span><span className="font-mono">{totals.profit.BRL.toFixed(2)}</span></div>
                  </CardContent>
              </Card>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit">Atualizar Cotação</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
