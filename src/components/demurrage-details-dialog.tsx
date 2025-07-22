
'use client';

import { useMemo, useState } from 'react';
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
import { FileText, Receipt, Banknote, Loader2, AlertTriangle, Ship, ArrowUp, ArrowDown } from 'lucide-react';
import type { DemurrageItem } from '@/app/gerencial/demurrage/page';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addFinancialEntry } from '@/lib/financials-data';
import { getBankAccounts } from '@/lib/financials-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { runSendDemurrageInvoice } from '@/app/actions';
import { DemurrageTariff } from '@/lib/demurrage-tariffs-data';
import { LtiTariff } from '@/lib/lti-tariffs-data';

interface DemurrageDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: DemurrageItem | null;
  costTariffs: DemurrageTariff[];
  saleTariffs: LtiTariff[];
}


export function DemurrageDetailsDialog({ isOpen, onClose, item, costTariffs, saleTariffs }: DemurrageDetailsDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const financialBreakdown = useMemo(() => {
    if (!item || item.overdueDays <= 0) return { breakdown: [], totalCost: 0, totalSale: 0, totalProfit: 0 };
    
    const containerType = item.container.type.toLowerCase();
    let tariffType: 'dry' | 'reefer' | 'special' = 'dry';
    if (containerType.includes('rf') || containerType.includes('reefer')) tariffType = 'reefer';
    if (containerType.includes('ot') || containerType.includes('fr')) tariffType = 'special';

    const costTariff = costTariffs.find(t => 
        t.carrier.toLowerCase() === item.shipment.carrier?.toLowerCase() &&
        t.containerType === tariffType
    );

    const saleTariff = saleTariffs.find(t => t.containerType === tariffType);
    
    if (!costTariff || !saleTariff) return { breakdown: [], totalCost: 0, totalSale: 0, totalProfit: 0, missingTariff: !costTariff ? item.shipment.carrier : "LTI Venda" };

    const breakdown: { period: string; days: number; costRate: number; saleRate: number; cost: number; sale: number; profit: number }[] = [];
    
    let daysToProcess = item.overdueDays;
    let periodIndex = 0;
    
    while (daysToProcess > 0 && periodIndex < Math.max(costTariff.costPeriods.length, saleTariff.salePeriods.length)) {
        const costPeriod = costTariff.costPeriods[periodIndex] || costTariff.costPeriods[costTariff.costPeriods.length - 1];
        const salePeriod = saleTariff.salePeriods[periodIndex] || saleTariff.salePeriods[saleTariff.salePeriods.length - 1];
        
        const from = Math.max(costPeriod.from, salePeriod.from);
        const to = Math.min(costPeriod.to || Infinity, salePeriod.to || Infinity);
        
        const currentPeriodStartDay = item.freeDays + (from - 1);
        const effectivePeriodStartDay = Math.max(item.freeDays, currentPeriodStartDay);
        
        const daysInThisTier = Math.min(daysToProcess, (to - from + 1));

        if (daysInThisTier <= 0) {
          periodIndex++;
          continue;
        }

        const cost = daysInThisTier * costPeriod.rate;
        const sale = daysInThisTier * salePeriod.rate;
        const profit = sale - cost;

        breakdown.push({
            period: `Dias ${from} a ${to === Infinity ? '...' : to}`,
            days: daysInThisTier,
            costRate: costPeriod.rate,
            saleRate: salePeriod.rate,
            cost,
            sale,
            profit,
        });
        
        daysToProcess -= daysInThisTier;
        periodIndex++;
    }

    const totalCost = breakdown.reduce((sum, row) => sum + row.cost, 0);
    const totalSale = breakdown.reduce((sum, row) => sum + row.sale, 0);
    const totalProfit = breakdown.reduce((sum, row) => sum + row.profit, 0);

    return { breakdown, totalCost, totalSale, totalProfit, missingTariff: null };
  }, [item, costTariffs, saleTariffs]);

  if (!item) return null;
  
  const { breakdown, totalCost, totalSale, totalProfit, missingTariff } = financialBreakdown;
  const isDetention = item.type === 'detention';

  const handleGenerateInvoice = async () => {
    if (!item || totalSale <= 0 || !item.effectiveEndDate) {
      toast({
        variant: 'destructive',
        title: 'Ação Bloqueada',
        description: 'É necessário ter um valor a faturar e uma data de devolução/gate-in efetiva para gerar a fatura.',
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

        const invoiceId = `${isDetention ? 'DET' : 'DEM'}-${item.container.number}`;
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
            description: `${isDetention ? 'Detention' : 'Demurrage'}/Detention ref. Container ${item.container.number}`
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
            console.log(`----- SIMULATING ${isDetention ? 'DETENTION' : 'DEMURRAGE'} INVOICE EMAIL -----`);
            console.log("SUBJECT:", emailResponse.data.emailSubject);
            console.log("BODY (HTML):", emailResponse.data.emailBody);
            console.log("-------------------------------------------");
            toast({
                title: `E-mail de Cobrança de ${isDetention ? 'Detention' : 'Demurrage'} Enviado (Simulação)`,
                description: 'A fatura foi enviada para o cliente.',
            });
        } else {
            throw new Error(emailResponse.error || 'Falha ao gerar o e-mail de cobrança.');
        }
        
        toast({
            title: "Boleto Gerado (Simulação)",
            description: "O boleto para esta fatura foi gerado e enviado ao cliente.",
        });


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
          <DialogTitle>Extrato de {isDetention ? 'Detention' : 'Demurrage'} - Contêiner {item.container.number}</DialogTitle>
          <DialogDescription>
            Detalhes financeiros para o processo <span className="font-semibold text-primary">{item.shipment.id}</span> do cliente <span className="font-semibold text-primary">{item.shipment.customer}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-4 mt-4">
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Resumo do Prazo</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                    <div className="flex justify-between"><span>{isDetention ? 'Retirada Vazio:' : 'Chegada:'}</span> <span className="font-medium">{item.startDate ? format(item.startDate, 'dd/MM/yyyy') : 'N/A'}</span></div>
                    <div className="flex justify-between"><span>Dias Livres:</span> <span className="font-medium">{item.freeDays}</span></div>
                    <div className="flex justify-between"><span>Devolução Prevista:</span> <span className="font-medium">{item.endDate ? format(item.endDate, 'dd/MM/yyyy') : 'N/A'}</span></div>
                    <div className="flex justify-between"><span>{isDetention ? 'Gate-In Efetivo:' : 'Devolução Efetiva:'}</span> <span className="font-medium">{item.effectiveEndDate ? format(item.effectiveEndDate, 'dd/MM/yyyy') : 'Pendente'}</span></div>
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
                {missingTariff && (
                    <div className="text-center text-destructive border border-destructive/50 bg-destructive/10 p-4 rounded-md">
                        <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                        <p className="font-semibold">Tarifa não cadastrada!</p>
                        <p className="text-sm">Nenhuma tabela de {isDetention ? 'detention' : 'demurrage'} foi encontrada para '{missingTariff}'. Os cálculos não podem ser realizados.</p>
                    </div>
                )}
                {!missingTariff && (
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Período</TableHead>
                                    <TableHead>Dias</TableHead>
                                    <TableHead className="text-right">Custo (dia)</TableHead>
                                    <TableHead className="text-right">Venda (dia)</TableHead>
                                    <TableHead className="text-right">Total Custo</TableHead>
                                    <TableHead className="text-right">Total Venda</TableHead>
                                    <TableHead className="text-right">Lucro</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {breakdown.length > 0 ? (
                                    breakdown.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{row.period}</TableCell>
                                            <TableCell>{row.days}</TableCell>
                                            <TableCell className="text-right font-mono">USD {row.costRate.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">USD {row.saleRate.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">USD {row.cost.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono">USD {row.sale.toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold text-success">USD {row.profit.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                            Nenhum valor a ser cobrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleGenerateInvoice} disabled={isGenerating || item.status === 'invoiced' || !!missingTariff}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {item.status === 'invoiced' ? 'Faturado' : 'Gerar Fatura e Enviar'}
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

    