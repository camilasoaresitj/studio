
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { Shipment } from '@/lib/shipment';
import type { PartialPayment } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FinancialDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: (Shipment & { payments?: PartialPayment[] }) | null;
  onReversePayment?: (paymentId: string, entryId: string) => void;
  findEntryForPayment: (paymentId: string) => any;
}

export function FinancialDetailsDialog({ isOpen, onClose, shipment, onReversePayment, findEntryForPayment }: FinancialDetailsDialogProps) {
  const { toast } = useToast();
  
  const totals = React.useMemo(() => {
    if (!shipment) return { cost: {}, sale: {}, profit: {} };

    const cost: { [key: string]: number } = {};
    const sale: { [key: string]: number } = {};
    const profit: { [key: string]: number } = {};

    shipment.charges.forEach(charge => {
      const chargeCost = Number(charge.cost) || 0;
      const chargeSale = Number(charge.sale) || 0;

      cost[charge.costCurrency] = (cost[charge.costCurrency] || 0) + chargeCost;
      sale[charge.saleCurrency] = (sale[charge.saleCurrency] || 0) + chargeSale;

      if (charge.costCurrency === charge.saleCurrency) {
        profit[charge.saleCurrency] = (profit[charge.saleCurrency] || 0) + (chargeSale - chargeCost);
      } else {
        profit[charge.saleCurrency] = (profit[charge.saleCurrency] || 0) + chargeSale;
        profit[charge.costCurrency] = (profit[charge.costCurrency] || 0) - chargeCost;
      }
    });

    return { cost, sale, profit };
  }, [shipment]);

  if (!shipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes Financeiros do Processo: {shipment.id}</DialogTitle>
          <DialogDescription>
            Análise de custos, vendas e lucro para o embarque de {shipment.customer}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4 space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-lg">Tabela de Custos e Vendas</CardTitle></CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Taxa</TableHead>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead className="text-right">Custo</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                            <TableHead className="text-right">Lucro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shipment.charges.map(charge => {
                            const canCalculateProfit = charge.saleCurrency === charge.costCurrency;
                            const profit = canCalculateProfit ? charge.sale - charge.cost : 0;
                            const isLoss = canCalculateProfit && profit < 0;

                            return (
                              <TableRow key={charge.id} className={cn(isLoss && 'bg-destructive/10')}>
                                <TableCell>{charge.name}</TableCell>
                                <TableCell className="text-muted-foreground">{charge.supplier}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {charge.costCurrency} {charge.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {charge.saleCurrency} {charge.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className={cn(
                                  'text-right font-mono font-semibold',
                                  canCalculateProfit ? (isLoss ? 'text-destructive' : 'text-success') : 'text-muted-foreground'
                                )}>
                                  {canCalculateProfit
                                    ? `${charge.saleCurrency} ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                    : 'N/A'
                                  }
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                </CardContent>
            </Card>

            {shipment.payments && shipment.payments.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-lg">Histórico de Pagamentos</CardTitle></CardHeader>
                    <CardContent>
                         <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Fatura</TableHead>
                                        <TableHead className="text-right">Valor Pago</TableHead>
                                        <TableHead>Conta</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shipment.payments.map(payment => {
                                      const relatedEntry = findEntryForPayment(payment.id);
                                      return (
                                        <TableRow key={payment.id}>
                                            <TableCell>{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{relatedEntry?.invoiceId || 'N/A'}</TableCell>
                                            <TableCell className="text-right font-mono">{payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell>Conta ID: {payment.accountId}</TableCell>
                                            <TableCell className="text-center">
                                                {onReversePayment && relatedEntry && (
                                                    <Button variant="ghost" size="icon" onClick={() => onReversePayment(payment.id, relatedEntry.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive"/>
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                </Card>
            )}

          </ScrollArea>
        </div>

        <Separator className="my-4" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Total de Custo</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(totals.cost).map(([currency, value]) => (
                <div key={currency} className="flex justify-between">
                  <Badge variant="secondary">{currency}</Badge>
                  <span className="font-mono">{value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Total de Venda</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(totals.sale).map(([currency, value]) => (
                <div key={currency} className="flex justify-between">
                  <Badge variant="secondary">{currency}</Badge>
                  <span className="font-mono">{value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Resultado (Lucro)</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {Object.entries(totals.profit).map(([currency, value]) => (
                <div key={currency} className={cn("flex justify-between font-semibold", value >= 0 ? 'text-success' : 'text-destructive')}>
                  <Badge variant="secondary">{currency}</Badge>
                  <span className="font-mono">{value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
