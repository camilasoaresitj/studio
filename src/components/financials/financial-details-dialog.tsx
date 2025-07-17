
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import { Trash2, Receipt, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exchangeRateService } from '@/services/exchange-rate-service';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';
import { Input } from '../ui/input';

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
  const [editedRates, setEditedRates] = React.useState<Record<string, { costRate?: number; saleRate?: number }>>({});

  React.useEffect(() => {
    if (isOpen) {
        const fetchAndSetData = async () => {
            const rates = await exchangeRateService.getRates();
            setExchangeRates(rates);
            setPartners(getPartners());
            setEditedRates({}); // Reset on open to use fresh initial rates
        };
        fetchAndSetData();
    }
  }, [isOpen]);
  
  const handleRateChange = (chargeId: string, type: 'cost' | 'sale', value: string) => {
      const rate = parseFloat(value);
      if (isNaN(rate)) return;

      setEditedRates(prev => ({
          ...prev,
          [chargeId]: {
              ...prev[chargeId],
              [type === 'cost' ? 'costRate' : 'saleRate']: rate
          }
      }));
  };
  
  const getChargeRates = React.useCallback((charge: QuoteCharge) => {
    const costPartner = partners.find(p => p.name === charge.supplier);
    const salePartner = partners.find(p => p.name === charge.sacado);

    const costAgio = costPartner?.exchangeRateAgio ?? 0;
    const saleAgio = salePartner?.exchangeRateAgio ?? 0;
    
    const costPtax = exchangeRates[charge.costCurrency] || 1;
    const salePtax = exchangeRates[charge.saleCurrency] || 1;
    
    const initialCostRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + costAgio / 100);
    const initialSaleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + saleAgio / 100);

    return {
        costRate: editedRates[charge.id]?.costRate ?? initialCostRate,
        saleRate: editedRates[charge.id]?.saleRate ?? initialSaleRate,
    };
  }, [partners, exchangeRates, editedRates]);

  const totals = React.useMemo(() => {
    if (!shipment || partners.length === 0 || Object.keys(exchangeRates).length === 0) {
        return { totalCostBRL: 0, totalSaleBRL: 0, totalProfitBRL: 0 };
    }
    
    let totalCostBRL = 0;
    let totalSaleBRL = 0;

    shipment.charges.forEach(charge => {
        const { costRate, saleRate } = getChargeRates(charge);
        totalCostBRL += charge.cost * costRate;
        totalSaleBRL += charge.sale * saleRate;
    });
    
    return {
        totalCostBRL,
        totalSaleBRL,
        totalProfitBRL: totalSaleBRL - totalCostBRL
    };

  }, [shipment, partners, exchangeRates, getChargeRates]);

  const handleEmitRecibo = () => {
    if (!shipment) return;
    
    const nfseCharge = shipment.charges.find(c => c.name.toLowerCase().includes("serviço"));
    const chargesForReceipt = shipment.charges.filter(c => !nfseCharge || c.id !== nfseCharge.id);

    const newWindow = window.open();
    if (newWindow) {
        let receiptHtml = `
            <html>
                <head><title>Recibo - Processo ${shipment.id}</title>
                 <style>
                    body { font-family: sans-serif; margin: 2rem; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { color: #333; }
                </style>
                </head>
                <body>
                    <h1>Recibo - Processo ${shipment.id}</h1>
                    <p><strong>Cliente:</strong> ${shipment.customer}</p>
                    <p>Recebemos o valor referente aos seguintes serviços:</p>
                    <table>
                        <thead>
                            <tr><th>Descrição</th><th>Valor</th></tr>
                        </thead>
                        <tbody>
        `;
        chargesForReceipt.forEach(charge => {
            receiptHtml += `<tr><td>${charge.name}</td><td>${charge.saleCurrency} ${charge.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td></tr>`;
        });
        receiptHtml += `
                        </tbody>
                    </table>
                    <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                </body>
            </html>
        `;
        newWindow.document.write(receiptHtml);
        newWindow.document.close();
    }
  };

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
                            const { costRate, saleRate } = getChargeRates(charge);
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
                                <TableCell className="text-right font-mono text-xs text-muted-foreground w-28">
                                    <Input 
                                      type="number" 
                                      step="0.0001"
                                      defaultValue={costRate.toFixed(4)} 
                                      onChange={e => handleRateChange(charge.id, 'cost', e.target.value)}
                                      className="h-8 text-right"
                                      disabled={charge.costCurrency === 'BRL'}
                                    />
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  R$ {costInBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {charge.saleCurrency} {charge.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs text-muted-foreground w-28">
                                     <Input 
                                      type="number" 
                                      step="0.0001"
                                      defaultValue={saleRate.toFixed(4)} 
                                      onChange={e => handleRateChange(charge.id, 'sale', e.target.value)}
                                      className="h-8 text-right"
                                      disabled={charge.saleCurrency === 'BRL'}
                                    />
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
        
        <DialogFooter className="pt-4 border-t flex-col md:flex-row md:justify-between items-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <Card>
              <CardHeader className="p-2"><CardTitle className="text-base">Custo Total (BRL)</CardTitle></CardHeader>
              <CardContent className="p-2 pt-0 text-sm">
                <div className="flex justify-between font-semibold text-base">
                    <span>BRL:</span>
                    <span className="font-mono">{totals.totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-2"><CardTitle className="text-base">Venda Total (BRL)</CardTitle></CardHeader>
              <CardContent className="p-2 pt-0 text-sm">
                  <div className="flex justify-between font-semibold text-base">
                    <span>BRL:</span>
                    <span className="font-mono">{totals.totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
              </CardContent>
            </Card>
            <Card className={cn(totals.totalProfitBRL < 0 ? 'border-destructive' : 'border-success')}>
              <CardHeader className="p-2"><CardTitle className="text-base">Resultado (BRL)</CardTitle></CardHeader>
              <CardContent className="p-2 pt-0 text-sm">
                <div className={cn("flex justify-between font-semibold text-base", totals.totalProfitBRL < 0 ? 'text-destructive' : 'text-success')}>
                    <span>BRL:</span>
                    <span className="font-mono">{totals.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
              </CardContent>
            </Card>
          </div>
          <Button onClick={handleEmitRecibo} variant="outline" className="mt-4 md:mt-0">
            <Receipt className="mr-2 h-4 w-4"/> Emitir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
