
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { HandCoins } from 'lucide-react';
import type { Partner, QuoteCharge } from '@/lib/shipment';
import type { Shipment } from '@/lib/shipment';

interface CommissionManagementProps {
  partners: Partner[];
  shipments: Shipment[];
  exchangeRates: Record<string, number>;
}

interface CommissionData {
  partner: Partner;
  commissionableShipments: {
    shipment: Shipment;
    profitBRL: number;
    commissionRate: number;
    commissionValue: number;
  }[];
  totalCommission: number;
}

export function CommissionManagement({ partners, shipments, exchangeRates }: CommissionManagementProps) {
  const commissionData = useMemo(() => {
    const commissionPartners = partners.filter(p => p.roles.comissionado && p.commissionAgreement?.amount);

    return commissionPartners.map(partner => {
      // Find shipments where this partner acted as an agent
      const associatedShipments = shipments.filter(s => s.agent?.id === partner.id);
      
      let totalCommission = 0;

      const commissionableShipments = associatedShipments.map(shipment => {
        // Calculate profit for each shipment in BRL
        const profitBRL = shipment.charges.reduce((acc, charge) => {
          const saleRate = charge.saleCurrency === 'BRL' ? 1 : (exchangeRates[charge.saleCurrency] || 1);
          const costRate = charge.costCurrency === 'BRL' ? 1 : (exchangeRates[charge.costCurrency] || 1);
          const saleBRL = charge.sale * saleRate;
          const costBRL = charge.cost * costRate;
          return acc + (saleBRL - costBRL);
        }, 0);

        // Calculate commission for this shipment
        const agreement = partner.commissionAgreement!;
        let commissionValue = 0;
        if (agreement.unit === 'porcentagem_lucro') {
          commissionValue = profitBRL * (agreement.amount! / 100);
        } else {
          commissionValue = agreement.amount!; // Assuming fixed value is in BRL for simplicity
        }
        
        totalCommission += commissionValue;
        
        return {
          shipment,
          profitBRL,
          commissionRate: agreement.amount!,
          commissionValue,
        };
      });

      return {
        partner,
        commissionableShipments,
        totalCommission,
      };
    });
  }, [partners, shipments, exchangeRates]);

  return (
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{data.partner.name}</h3>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total a Pagar</p>
                    <p className="text-xl font-bold text-success">
                        BRL {data.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.commissionableShipments.map(({ shipment, profitBRL, commissionRate, commissionValue }) => (
                    <TableRow key={shipment.id}>
                      <TableCell className="font-medium">{shipment.id}</TableCell>
                      <TableCell className="text-right font-mono">
                        {profitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {commissionRate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" variant="outline">Pagar</Button>
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
  );
}
