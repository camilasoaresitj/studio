
'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from './ui/badge';
import { FileText, Receipt, Banknote, Loader2 } from 'lucide-react';
import type { DemurrageItem } from '@/app/demurrage/page';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addFinancialEntry } from '@/lib/financials-data';
import { getBankAccounts } from '@/lib/financials-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { runSendDemurrageInvoice } from '@/app/actions';
import { useState } from 'react';

interface DemurrageDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: DemurrageItem | null;
}

// Simulated tariff data. In a real app, this would come from a database.
const SIMULATED_TARIFFS = {
  COST: [ // Per day rates from carrier
    { from: 1, to: 5, rate: 75 },
    { from: 6, to: 10, rate: 150 },
    { from: 11, to: Infinity, rate: 300 },
  ],
  SALE: [ // Per day rates charged to the client
    { from: 1, to: 5, rate: 100 },
    { from: 6, to: 10, rate: 200 },
    { from: 11, to: Infinity, rate: 400 },
  ],
};

export function DemurrageDetailsDialog({ isOpen, onClose, item }: DemurrageDetailsDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const financialBreakdown = useMemo(() => {
    if (!item || item.overdueDays <= 0) return [];

    const breakdown: { period: string; cost: number; sale: number; profit: number }[] = [];
    let remainingDays = item.overdueDays;
    
    // Calculate cost
    const costPeriods = [];
    let costTotal = 0;
    for (const tariff of SIMULATED_TARIFFS.COST) {
        if (remainingDays <= 0) break;
        const daysInPeriod = Math.min(remainingDays, tariff.to - tariff.from + 1);
        const periodCost = daysInPeriod * tariff.rate;
        costPeriods.push({ period: `De ${tariff.from} a ${tariff.to > 100 ? '...' : tariff.to} dias`, days: daysInPeriod, rate: tariff.rate, total: periodCost });
        costTotal += periodCost;
        remainingDays -= daysInPeriod;
    }

    // Calculate sale
    remainingDays = item.overdueDays;
    const salePeriods = [];
    let saleTotal = 0;
    for (const tariff of SIMULATED_TARIFFS.SALE) {
        if (remainingDays <= 0) break;
        const daysInPeriod = Math.min(remainingDays, tariff.to - tariff.from + 1);
        const periodSale = daysInPeriod * tariff.rate;
        salePeriods.push({ period: `De ${tariff.from} a ${tariff.to > 100 ? '...' : tariff.to} dias`, days: daysInPeriod, rate: tariff.rate, total: periodSale });
        saleTotal += periodSale;
        remainingDays -= daysInPeriod;
    }
    
    breakdown.push({
        period: `Total Demurrage (${item.overdueDays} dias)`,
        cost: costTotal,
        sale: saleTotal,
        profit: saleTotal - costTotal
    });

    return breakdown;
  }, [item]);

  if (!item) return null;
  
  const totalCost = financialBreakdown.reduce((sum, row) => sum + row.cost, 0);
  const totalSale = financialBreakdown.reduce((sum, row) => sum + row.sale, 0);
  const totalProfit = financialBreakdown.reduce((sum, row) => sum + row.profit, 0);

  const handleGenerateInvoice = async () => {
    if (!item || totalSale <= 0) {
      toast({
        variant: 'destructive',
        title: 'Fatura Vazia',
        description: 'Não é possível gerar uma fatura sem valor de demurrage a cobrar.',
      });
      return;
    }
    setIsGenerating(true);

    try {
        const accounts = getBankAccounts();
        const usdAccount = accounts.find(a => a.currency === 'USD');

        if (!usdAccount) {
        throw new Error('Nenhuma conta em USD encontrada para vincular a fatura.');
        }

        const invoiceId = `DEM-${item.container.number}`;
        const dueDate = addDays(new Date(), 30);

        // 1. Create financial entry
        addFinancialEntry({
            type: 'credit',
            partner: item.shipment.customer,
            invoiceId: invoiceId,
            status: 'Aberto',
            dueDate: dueDate.toISOString(),
            amount: totalSale,
            currency: 'USD',
            processId: item.shipment.id,
            accountId: usdAccount.id,
        });
        toast({
            title: 'Lançamento Financeiro Criado!',
            description: `Fatura de ${totalSale.toFixed(2)} USD para ${item.shipment.customer} adicionada ao financeiro.`,
            className: 'bg-success text-success-foreground'
        });
        
        // 2. Get exchange rate and generate email
        const rates = await exchangeRateService.getRates();
        const ptaxRate = rates['USD'] || 5.0; // Fallback
        const finalRate = ptaxRate * 1.08;

        const emailResponse = await runSendDemurrageInvoice({
            customerName: item.shipment.customer,
            invoiceId: invoiceId,
            processId: item.shipment.id,
            containerNumber: item.container.number,
            dueDate: format(dueDate, 'dd/MM/yyyy'),
            totalAmountUSD: `USD ${totalSale.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            exchangeRate: finalRate.toFixed(4),
        });

        if (emailResponse.success) {
            console.log("----- SIMULATING DEMURRAGE INVOICE EMAIL -----");
            console.log("SUBJECT:", emailResponse.data.emailSubject);
            console.log("BODY (HTML):", emailResponse.data.emailBody);
            console.log("-------------------------------------------");
            toast({
                title: 'E-mail de Cobrança Enviado (Simulação)',
                description: 'A fatura de demurrage foi enviada para o cliente.',
            });
        } else {
            throw new Error(emailResponse.error || 'Falha ao gerar o e-mail de cobrança.');
        }

        onClose();

    } catch (e: any) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Gerar Fatura',
            description: e.message,
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleOtherActions = (action: string) => {
    toast({
      title: `Ação: ${action}`,
      description: `Funcionalidade para ${action.toLowerCase()} o demurrage do contêiner ${item.container.number} será implementada em breve.`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Extrato de Demurrage - Contêiner {item.container.number}</DialogTitle>
          <DialogDescription>
            Detalhes financeiros para o processo <span className="font-semibold text-primary">{item.shipment.id}</span> do cliente <span className="font-semibold text-primary">{item.shipment.customer}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Resumo do Prazo</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between"><span>Chegada:</span> <span className="font-medium">{item.arrivalDate ? format(item.arrivalDate, 'dd/MM/yyyy') : 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Dias Livres:</span> <span className="font-medium">{item.freeDays}</span></div>
                    <div className="flex justify-between"><span>Devolução Prevista:</span> <span className="font-medium">{item.returnDate ? format(item.returnDate, 'dd/MM/yyyy') : 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Devolução Efetiva:</span> <span className="font-medium">{item.effectiveReturnDate ? format(item.effectiveReturnDate, 'dd/MM/yyyy') : 'Pendente'}</span></div>
                    <div className="flex justify-between font-bold"><span>Dias Excedidos:</span> <Badge variant={item.overdueDays > 0 ? 'destructive' : 'success'}>{item.overdueDays}</Badge></div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                     <div className="flex justify-between"><span>Custo Total:</span> <span className="font-mono font-medium">USD {totalCost.toFixed(2)}</span></div>
                     <div className="flex justify-between"><span>Venda Total:</span> <span className="font-mono font-medium">USD {totalSale.toFixed(2)}</span></div>
                     <div className="flex justify-between font-bold text-lg text-success"><span>Lucro Total:</span> <span className="font-mono">USD {totalProfit.toFixed(2)}</span></div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader><CardTitle className="text-base">Detalhamento Financeiro</CardTitle></CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Período</TableHead>
                                <TableHead className="text-right">Custo</TableHead>
                                <TableHead className="text-right">Venda</TableHead>
                                <TableHead className="text-right">Lucro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {financialBreakdown.length > 0 ? (
                                financialBreakdown.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">{row.period}</TableCell>
                                        <TableCell className="text-right font-mono">USD {row.cost.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">USD {row.sale.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono font-semibold text-success">USD {row.profit.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        Nenhum valor de demurrage a ser cobrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => handleGenerateInvoice()} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Gerar Fatura e Enviar
          </Button>
          <Button variant="outline" onClick={() => handleOtherActions("Gerar Boleto")} disabled={isGenerating}>
            <Banknote className="mr-2 h-4 w-4" />
            Gerar Boleto
          </Button>
          <Button onClick={() => handleOtherActions("Emitir Recibo")} disabled={isGenerating}>
            <Receipt className="mr-2 h-4 w-4" />
            Emitir Recibo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
