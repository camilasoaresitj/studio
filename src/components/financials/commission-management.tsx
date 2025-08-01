
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { HandCoins, FileText, FileDown, MoreHorizontal, CheckCircle, Circle } from 'lucide-react';
import type { Partner } from '@/lib/partners-data';
import type { Shipment, QuoteCharge } from '@/lib/shipment-data';
import { addFinancialEntriesAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { CommissionDetailsDialog } from './commission-details-dialog'; 
import { getFinancialEntries } from '@/lib/financials-data';

interface CommissionManagementProps {
  partners: Partner[];
  shipments: Shipment[];
  exchangeRates: Record<string, number>;
}

export interface CommissionableShipment {
    shipment: Shipment;
    profitBRL: number;
    commissionRate: number;
    commissionValue: number;
    status: 'Em Aberto' | 'Pago';
    charges: (QuoteCharge & { profitBRL: number })[];
}

export interface CommissionData {
  partner: Partner;
  commissionableShipments: CommissionableShipment[];
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
}

export function CommissionManagement({ partners, shipments, exchangeRates }: CommissionManagementProps) {
  const [commissionData, setCommissionData] = useState<CommissionData[]>([]);
  const [detailsShipment, setDetailsShipment] = useState<CommissionableShipment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const commissionPartners = partners.filter(p => p.roles.comissionado && p.commissionAgreement?.amount);
    const financialEntries = getFinancialEntries();

    const data = commissionPartners.map(partner => {
      const commissionableClientNames = new Set(partner.commissionAgreement?.commissionClients || []);
      
      const associatedShipments = shipments.filter(s => commissionableClientNames.has(s.customer));
      
      const commissionableShipments: CommissionableShipment[] = associatedShipments.map(shipment => {
        const chargesWithProfit = shipment.charges.map(charge => {
          const saleRate = charge.saleCurrency === 'BRL' ? 1 : (exchangeRates[charge.saleCurrency] || 1);
          const costRate = charge.costCurrency === 'BRL' ? 1 : (exchangeRates[charge.costCurrency] || 1);
          const saleBRL = charge.sale * saleRate;
          const costBRL = charge.cost * costRate;
          return { ...charge, profitBRL: saleBRL - costBRL };
        });

        const profitBRL = chargesWithProfit.reduce((acc, charge) => acc + charge.profitBRL, 0);

        const agreement = partner.commissionAgreement!;
        let commissionValue = 0;
        if (agreement.unit === 'porcentagem_lucro') {
          commissionValue = profitBRL * (agreement.amount! / 100);
        } else {
          commissionValue = agreement.amount!;
        }
        
        const isPaid = financialEntries.some(e => 
            e.type === 'debit' &&
            e.processId === shipment.id &&
            e.partner === partner.name &&
            e.description?.toLowerCase().includes('comissão')
        );

        return {
          shipment,
          profitBRL,
          charges: chargesWithProfit,
          commissionRate: agreement.amount!,
          commissionValue,
          status: isPaid ? 'Pago' : 'Em Aberto',
        };
      });

      const totalCommission = commissionableShipments.reduce((acc, s) => acc + s.commissionValue, 0);
      const totalPaid = commissionableShipments.filter(s => s.status === 'Pago').reduce((acc, s) => acc + s.commissionValue, 0);

      return {
        partner,
        commissionableShipments,
        totalCommission,
        totalPaid,
        totalPending: totalCommission - totalPaid
      };
    });

    setCommissionData(data);
  }, [partners, shipments, exchangeRates]);

  const handlePayCommission = (partner: Partner, shipment: CommissionableShipment) => {
    // 1. Create a debit entry in financials
    addFinancialEntriesAction([{
        type: 'debit',
        partner: partner.name,
        invoiceId: `COM-${shipment.shipment.id}`,
        dueDate: new Date().toISOString(),
        amount: shipment.commissionValue,
        currency: 'BRL',
        processId: shipment.shipment.id,
        status: 'Pago',
        expenseType: 'Operacional',
        description: `Pagamento de comissão ref. processo ${shipment.shipment.id}`
    }]);

    // 2. Refresh data and show toast
    const updatedData = commissionData.map(cd => {
        if (cd.partner.id === partner.id) {
            return {
                ...cd,
                commissionableShipments: cd.commissionableShipments.map(cs => 
                    cs.shipment.id === shipment.shipment.id ? { ...cs, status: 'Pago' as const } : cs
                ),
                totalPaid: cd.totalPaid + shipment.commissionValue,
                totalPending: cd.totalPending - shipment.commissionValue,
            };
        }
        return cd;
    });
    setCommissionData(updatedData);

    toast({
        title: "Comissão Paga!",
        description: `A despesa de comissão para ${partner.name} foi registrada no financeiro.`,
        className: 'bg-success text-success-foreground'
    });
  };

  const handleGenerateConsolidatedReport = (data: CommissionData) => {
    toast({
        title: "Gerando Relatório Consolidado (Simulação)",
        description: `PDF para ${data.partner.name} com ${data.commissionableShipments.length} processos.`,
    });
    // PDF generation logic would go here
  }


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary"/>
            Controle de Comissões
        </CardTitle>
        <CardDescription>
          Acompanhe e gerencie as comissões a serem pagas para seus parceiros comissionados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {commissionData.length > 0 ? commissionData.map(data => (
            <div key={data.partner.id} className="border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                <h3 className="text-lg font-semibold">{data.partner.name}</h3>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Pendente</p>
                        <p className="text-xl font-bold text-success">
                            BRL {data.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateConsolidatedReport(data)}>
                        <FileDown className="mr-2 h-4 w-4"/>
                        Relatório Consolidado
                    </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead className="text-right">Lucro (BRL)</TableHead>
                    <TableHead className="text-center">Acordo (%)</TableHead>
                    <TableHead className="text-right">Comissão (BRL)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.commissionableShipments.map((shipment) => (
                    <TableRow key={shipment.shipment.id}>
                      <TableCell className="font-medium">{shipment.shipment.id}</TableCell>
                      <TableCell className="text-right font-mono">
                        {shipment.profitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {shipment.commissionRate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {shipment.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={shipment.status === 'Pago' ? 'success' : 'secondary'}>
                          {shipment.status === 'Pago' 
                            ? <CheckCircle className="mr-1 h-3 w-3" />
                            : <Circle className="mr-1 h-3 w-3" />
                          }
                          {shipment.status}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-center">
                         <Button size="sm" variant="ghost" onClick={() => setDetailsShipment(shipment)}>
                            Detalhes
                         </Button>
                         <Button 
                            size="sm" 
                            variant={shipment.status === 'Pago' ? "outline" : "default"}
                            onClick={() => handlePayCommission(data.partner, shipment)}
                            disabled={shipment.status === 'Pago'}
                          >
                           Pagar
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )) : (
            <div className="text-center text-muted-foreground py-12">
                Nenhum parceiro comissionado com processos associados encontrado.
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    <CommissionDetailsDialog 
        isOpen={!!detailsShipment}
        onClose={() => setDetailsShipment(null)}
        commissionableShipment={detailsShipment}
        partner={detailsShipment ? commissionData.find(cd => cd.commissionableShipments.some(cs => cs.shipment.id === detailsShipment.shipment.id))?.partner ?? null : null}
    />
    </>
  );
}
