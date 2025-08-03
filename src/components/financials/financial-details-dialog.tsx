

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
import type { Shipment, QuoteCharge } from '@/lib/shipment-data';
import type { PartialPayment, FinancialEntry } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Trash2, Receipt, FileText, Gavel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exchangeRateService } from '@/services/exchange-rate-service';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface FinancialDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry: FinancialEntry | null;
  onReversePayment?: (paymentId: string, entryId: string) => void;
  findEntryForPayment: (paymentId: string) => FinancialEntry | undefined;
  findShipmentForEntry: (entry: FinancialEntry) => Shipment | undefined;
  onEntryUpdate?: (entry: FinancialEntry) => void;
}

export function FinancialDetailsDialog({ isOpen, onClose, entry, onReversePayment, findEntryForPayment, findShipmentForEntry, onEntryUpdate }: FinancialDetailsDialogProps) {
  const { toast } = useToast();
  const [partners, setPartners] = React.useState<Partner[]>([]);
  const [exchangeRates, setExchangeRates] = React.useState<Record<string, number>>({});
  const [editedRates, setEditedRates] = React.useState<Record<string, { costRate?: number; saleRate?: number }>>({});
  const [shipment, setShipment] = React.useState<Shipment | null>(null);
  
  const [legalStatus, setLegalStatus] = React.useState<string | undefined>('');
  const [processoJudicial, setProcessoJudicial] = React.useState<string | undefined>('');
  const [legalComments, setLegalComments] = React.useState<string | undefined>('');


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

  React.useEffect(() => {
    if (isOpen && entry) {
        const fetchAndSetData = async () => {
            const partnersData = getPartners();
            const ratesData = await exchangeRateService.getRates();
            const associatedShipment = findShipmentForEntry(entry);
            setPartners(partnersData);
            setExchangeRates(ratesData);
            setShipment(associatedShipment || null);
            setLegalStatus(entry.legalStatus);
            setProcessoJudicial(entry.processoJudicial);
            setLegalComments(entry.legalComments);

            if(associatedShipment) {
                const initialEditedRates: Record<string, { costRate?: number; saleRate?: number }> = {};
                (associatedShipment.charges || []).forEach(charge => {
                    const costPartner = partnersData.find(p => p.name === charge.supplier);
                    const salePartner = partnersData.find(p => p.name === charge.sacado);
                    const costAgio = costPartner?.exchangeRateAgio ?? 0;
                    const saleAgio = salePartner?.exchangeRateAgio ?? 0;
                    const costPtax = ratesData[charge.costCurrency] || 1;
                    const salePtax = ratesData[charge.saleCurrency] || 1;
                    const costRate = charge.costCurrency === 'BRL' ? 1 : costPtax * (1 + costAgio / 100);
                    const saleRate = charge.saleCurrency === 'BRL' ? 1 : salePtax * (1 + saleAgio / 100);

                    initialEditedRates[charge.id] = { costRate, saleRate };
                });
                setEditedRates(initialEditedRates);
            } else {
                 setEditedRates({});
            }
        };
        fetchAndSetData();
    }
  }, [isOpen, entry, findShipmentForEntry]);
  
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

  const totals = React.useMemo(() => {
    if (!shipment || partners.length === 0 || Object.keys(exchangeRates).length === 0) {
        return { totalCostBRL: 0, totalSaleBRL: 0, totalProfitBRL: 0 };
    }
    
    let totalCostBRL = 0;
    let totalSaleBRL = 0;

    (shipment.charges || []).forEach(charge => {
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
    
    const nfseCharge = (shipment.charges || []).find(c => c.name.toLowerCase().includes("serviço"));
    const chargesForReceipt = (shipment.charges || []).filter(c => !nfseCharge || c.id !== nfseCharge.id);

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

  const handleSaveChanges = () => {
    if (entry && onEntryUpdate) {
      onEntryUpdate({
        ...entry,
        legalStatus: legalStatus as FinancialEntry['legalStatus'],
        processoJudicial,
        legalComments,
      });
      toast({
        title: 'Informações Salvas!',
        description: 'As observações do processo jurídico foram atualizadas.',
        className: 'bg-success text-success-foreground'
      });
    }
  };

  if (!entry) return null;
  const isLegalCase = entry.status === 'Jurídico';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes Financeiros do Processo: {entry.processId}</DialogTitle>
          <DialogDescription>
            Análise de custos, vendas e lucro para o embarque de {entry.partner}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4 space-y-6">
            {!shipment && (
                <Card className="flex items-center justify-center h-48">
                    <p className="text-muted-foreground">Processo administrativo ou dados do embarque não encontrados.</p>
                </Card>
            )}

            {shipment && (
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
                          {(shipment.charges || []).map(charge => {
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
                                      value={editedRates[charge.id]?.costRate?.toFixed(4) || ''}
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
                                      value={editedRates[charge.id]?.saleRate?.toFixed(4) || ''}
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
            )}

            {isLegalCase && (
                <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Gavel/> Acompanhamento Jurídico</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Status do Processo</Label>
                                <Select value={legalStatus} onValueChange={setLegalStatus}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Extrajudicial">Extrajudicial</SelectItem>
                                        <SelectItem value="Fase Inicial">Fase Inicial</SelectItem>
                                        <SelectItem value="Fase de Execução">Fase de Execução</SelectItem>
                                        <SelectItem value="Desconsideração da Personalidade Jurídica">Desconsideração PJ</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>Nº do Processo Judicial</Label>
                                <Input value={processoJudicial} onChange={(e) => setProcessoJudicial(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-1">
                            <Label>Comentários / Observações</Label>
                            <Textarea value={legalComments} onChange={(e) => setLegalComments(e.target.value)} className="min-h-[100px]" />
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={handleSaveChanges}>Salvar Observações</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {entry.payments && entry.payments.length > 0 && (
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
                                    {entry.payments.map(payment => {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
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
              <CardContent className={cn("p-2 pt-0 text-sm font-semibold text-base", totals.totalProfitBRL < 0 ? 'text-destructive' : 'text-success')}>
                <div className="flex justify-between">
                    <span>BRL:</span>
                    <span className="font-mono">{totals.totalProfitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
              </CardContent>
            </Card>
          </div>
          {shipment && (
            <Button onClick={handleEmitRecibo} variant="outline" className="mt-4 md:mt-0">
                <Receipt className="mr-2 h-4 w-4"/> Emitir Recibo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
