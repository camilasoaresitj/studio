
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShipmentsChart } from '@/components/shipments-chart';
import { RecentShipments } from '@/components/recent-shipments';
import { ApprovalsPanel } from '@/components/approvals-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Ship, CheckCircle, TrendingUp, AlertTriangle, Scale } from 'lucide-react';
import { getShipments, Shipment } from '@/lib/shipment';
import { getInitialQuotes, Quote } from '@/lib/initial-data';
import { getFinancialEntries } from '@/lib/financials-data';
import { isThisMonth, parseISO } from 'date-fns';

const formatCurrency = (value: number, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
    }).format(value);
};

export function GerencialPage() {
    const [kpiData, setKpiData] = useState({
        monthlyProfit: 0,
        operationalProfit: 0,
        exchangeProfit: 0,
        demurrageProfit: 0,
        activeShipments: 0,
        approvedQuotesThisMonth: 0,
    });

    useEffect(() => {
        const shipments = getShipments();
        const quotes = getInitialQuotes(); // Assuming quotes that become shipments are here
        const financialEntries = getFinancialEntries();
        
        // KPI: Active Shipments
        const activeShipments = shipments.filter(s => {
            const lastMilestone = s.milestones[s.milestones.length - 1];
            return !lastMilestone || lastMilestone.status !== 'completed';
        }).length;

        // KPI: Approved Quotes this Month
        const approvedQuotesThisMonth = quotes.filter(q => {
            const quoteDate = parseISO(q.date.split('/').reverse().join('-'));
            return q.status === 'Aprovada' && isThisMonth(quoteDate);
        }).length;
        
        // KPI: Monthly Profit from Approved Quotes
        const monthlyProfit = shipments.reduce((totalProfit, shipment) => {
            if (shipment.etd && isThisMonth(new Date(shipment.etd))) {
                const profit = shipment.charges.reduce((chargeProfit, charge) => {
                    const saleBRL = charge.sale * (charge.saleCurrency === 'BRL' ? 1 : 5.25); // Simplified rate
                    const costBRL = charge.cost * (charge.costCurrency === 'BRL' ? 1 : 5.25);
                    return chargeProfit + (saleBRL - costBRL);
                }, 0);
                return totalProfit + profit;
            }
            return totalProfit;
        }, 0);

        // KPI: Demurrage Profit (simplified)
        const demurrageProfit = financialEntries
            .filter(e => e.description?.toLowerCase().includes('demurrage'))
            .reduce((sum, entry) => {
                 if (entry.type === 'credit') return sum + entry.amount;
                 if (entry.type === 'debit') return sum - entry.amount;
                 return sum;
            }, 0);

        // Simulating other profits as they are complex
        const operationalProfit = 12540.75; // Simulated extra fees profit
        const exchangeProfit = 3450.21; // Simulated exchange gains

        setKpiData({
            monthlyProfit,
            operationalProfit,
            exchangeProfit,
            demurrageProfit,
            activeShipments,
            approvedQuotesThisMonth,
        });

    }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Gerencial</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Visão geral e KPIs da sua operação.
        </p>
      </header>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro do Mês (Cotações)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.monthlyProfit)}</div>
            <p className="text-xs text-muted-foreground">Resultado de fretes aprovados no mês</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Operacional Extra</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.operationalProfit)}</div>
            <p className="text-xs text-muted-foreground">Taxas extras adicionadas nos processos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro com Demurrage</CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.demurrageProfit)}</div>
            <p className="text-xs text-muted-foreground">Resultado de sobrestadia de contêineres</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Cambiais</CardTitle>
            <Scale className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.exchangeProfit)}</div>
            <p className="text-xs text-muted-foreground">Resultado de negociações de câmbio</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embarques em Andamento</CardTitle>
            <Ship className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeShipments}</div>
            <p className="text-xs text-muted-foreground">Processos operacionais ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotações Aprovadas (Mês)</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{kpiData.approvedQuotesThisMonth}</div>
            <p className="text-xs text-muted-foreground">Novos negócios fechados este mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ShipmentsChart />
          <RecentShipments />
        </div>
        <div className="lg:col-span-1 space-y-8">
          <ApprovalsPanel />
        </div>
      </div>
    </div>
  );
}
