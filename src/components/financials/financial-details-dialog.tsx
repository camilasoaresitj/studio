
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
import type { PartialPayment, FinancialEntry } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exchangeRateService } from '@/services/exchange-rate-service';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';

interface FinancialDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shipment: (Shipment & { payments?: PartialPayment[] }) | null;
  onReversePayment?: (paymentId: string, entryId: string) => void;
  findEntryForPayment: (paymentId: string) => FinancialEntry | undefined;
}

export function FinancialDetailsDialog({ isOpen, onClose, shipment, onReversePayment, findEntryForPayment }: FinancialDetailsDialogProps) {
  const { toast } = useToast();
  const [partners, setPartners] = React.useState<Partner[]>([]);
  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (isOpen) {
        const fetchRates = async () => {
            const rates = await exchangeRateService.getRates();
            setExchangeRates(rates);
        };
        fetchRates();
        setPartners(getPartners());
    }
  }, [isOpen]);

  const totals = React.useMemo(() => {
    if (!shipment) return { totalCostBRL: 0, totalSaleBRL: 0, totalProfitBRL: 0 };
    
    let totalCostBRL = 0;
    let totalSaleBRL = 0;

    shipment.charges.forEach(charge => {
        const costPartner = partners.find(p => p.name === charge.supplier);
        const salePartner = partners.find(p => p.name === charge.sacado);

        const costAgio = costPartner?.exchangeRateAgio ?? 0;
        const saleAgio = salePartner?.exchangeRateAgio ?? 0;
        
        const costPtax = exchangeRates[charge.costCurrency] || 1;
        const salePtax = exchangeRates[charge.saleCurrency] || 1;
        
        const costRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + costAgio / 100);
        const saleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + saleAgio / 100);

        totalCostBRL += charge.cost * costRate;
        totalSaleBRL += charge.sale * saleRate;
    });
    
    return {
        totalCostBRL,
        totalSaleBRL,
        totalProfitBRL: totalSaleBRL - totalCostBRL
    };

  }, [shipment, partners, exchangeRates]);

  if (!shipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
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
                            <TableHead className="text-right">Câmbio C.</TableHead>
                            <TableHead className="text-right">Custo (BRL)</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                             <TableHead className="text-right">Câmbio V.</TableHead>
                            <TableHead className="text-right">Venda (BRL)</TableHead>
                            <TableHead className="text-right">Lucro (BRL)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shipment.charges.map(charge => {
                            const costPartner = partners.find(p => p.name === charge.supplier);
                            const salePartner = partners.find(p => p.name === charge.sacado);

                            const costAgio = costPartner?.exchangeRateAgio ?? 0;
                            const saleAgio = salePartner?.exchangeRateAgio ?? 0;
                            
                            const costPtax = exchangeRates[charge.costCurrency] || 1;
                            const salePtax = exchangeRates[charge.saleCurrency] || 1;
                            
                            const costRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + costAgio / 100);
                            const saleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + saleAgio / 100);

                            const costInBrl = charge.cost * costRate;
                            const saleInBrl = charge.sale * saleRate;
                            const profitInBrl = saleInBrl - costInBrl;
                            const isLoss = profitInBrl < 0;

                            return (
                              <TableRow key={charge.id} className={cn(isLoss && 'bg-destructive/10')}>
                                <TableCell>{charge.name}</TableCell>
                                <TableCell className="text-muted-foreground">{charge.supplier}</TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {charge.costCurrency} {charge.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                    {charge.costCurrency !== 'BRL' ? costRate.toFixed(4) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  R$ {costInBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {charge.saleCurrency} {charge.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                    {charge.saleCurrency !== 'BRL' ? saleRate.toFixed(4) : '-'}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  R$ {saleInBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className={cn(
                                  'text-right font-mono font-semibold text-sm',
                                  isLoss ? 'text-destructive' : 'text-success'
                                )}>
                                  R$ {profitInBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                            <TableCell className="text-right font-mono">{relatedEntry?.currency} {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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
            <CardHeader><CardTitle className="text-lg">Custo Total (BRL)</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
               <div className="flex justify-between font-semibold text-base">
                  <span>BRL:</span>
                  <span className="font-mono">{totals.totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Venda Total (BRL)</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between font-semibold text-base">
                  <span>BRL:</span>
                  <span className="font-mono">{totals.totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </CardContent>
          </Card>
          <Card className={cn(totals.totalProfitBRL < 0 ? 'border-destructive' : 'border-success')}>
            <CardHeader><CardTitle className="text-lg">Resultado (BRL)</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
               <div className={cn("flex justify-between font-semibold text-base", totals.totalProfitBRL < 0 ? 'text-destructive' : 'text-success')}>
                  <span>BRL:</span>
                  <span className="font-mono">{totals.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
