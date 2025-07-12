
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, DollarSign, ClipboardList, UserX, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ShipmentsChart } from '@/components/shipments-chart';
import { RecentShipments } from '@/components/recent-shipments';
import { ApprovalsPanel } from '@/components/approvals-panel';
import { getShipments, Shipment } from '@/lib/shipment';
import { getPartners, Partner } from '@/lib/partners-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { isPast, isThisMonth, subDays } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface KpiData {
    monthlyShipments: number;
    grossProfit: number;
    overdueTasks: number;
    inactiveClients: number;
}

export default function Home() {
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const calculateKpis = async () => {
            const shipments = getShipments();
            const partners = getPartners();
            const rates = await exchangeRateService.getRates();

            // 1. Embarques no Mês
            const monthlyShipments = shipments.filter(s => s.etd && isThisMonth(new Date(s.etd))).length;

            // 2. Lucro Bruto (Mês)
            const grossProfit = shipments
                .filter(s => s.etd && isThisMonth(new Date(s.etd)))
                .reduce((totalProfit, shipment) => {
                    const shipmentProfit = shipment.charges.reduce((chargeProfit, charge) => {
                        const costInBrl = (charge.costCurrency === 'BRL' ? charge.cost : charge.cost * (rates[charge.costCurrency] || 1));
                        const saleInBrl = (charge.saleCurrency === 'BRL' ? charge.sale : charge.sale * (rates[charge.saleCurrency] || 1));
                        return chargeProfit + (saleInBrl - costInBrl);
                    }, 0);
                    return totalProfit + shipmentProfit;
                }, 0);

            // 3. Tarefas Atrasadas
            const overdueTasks = shipments.flatMap(s => s.milestones)
                .filter(m => m.status !== 'completed' && m.predictedDate && isPast(new Date(m.predictedDate)))
                .length;

            // 4. Clientes Inativos (sem embarques nos últimos 90 dias)
            const ninetyDaysAgo = subDays(new Date(), 90);
            const clientPartners = partners.filter(p => p.roles.cliente);
            const activeClients = new Set(
                shipments
                    .filter(s => s.etd && new Date(s.etd) > ninetyDaysAgo)
                    .map(s => s.customer)
            );
            const inactiveClients = clientPartners.filter(p => !activeClients.has(p.name)).length;
            
            setKpiData({
                monthlyShipments,
                grossProfit,
                overdueTasks,
                inactiveClients,
            });
            setIsLoading(false);
        };

        calculateKpis();
    }, []);

    const kpis = useMemo(() => {
        if (!kpiData) return [];
        return [
            { title: "Embarques no Mês", value: kpiData.monthlyShipments.toString(), change: "+12.5%", icon: <Truck className="h-6 w-6 text-muted-foreground" />, positive: true },
            { title: "Lucro Bruto (Mês)", value: kpiData.grossProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), change: "+8.2%", icon: <DollarSign className="h-6 w-6 text-muted-foreground" />, positive: true },
            { title: "Tarefas Atrasadas", value: kpiData.overdueTasks.toString(), change: "+5.1%", icon: <ClipboardList className="h-6 w-6 text-muted-foreground" />, positive: false },
            { title: "Clientes Inativos", value: kpiData.inactiveClients.toString(), change: "Últimos 90 dias", icon: <UserX className="h-6 w-6 text-muted-foreground" />, positive: false },
        ]
    }, [kpiData]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4">Carregando dashboard gerencial...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 p-4 md:p-8">
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Gerencial</h1>
          <p className="text-muted-foreground mt-2 text-lg">Visão geral da performance e dos indicadores chave do negócio.</p>
        </header>

        <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(kpi => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  { kpi.change.includes('%') ? (
                      <>
                        { kpi.positive ? 
                            <ArrowUpRight className="h-4 w-4 mr-1 text-success" /> : 
                            <ArrowDownRight className="h-4 w-4 mr-1 text-destructive" /> 
                        }
                        <span className={kpi.positive ? 'text-success' : 'text-destructive'}>{kpi.change}</span>
                        <span className='ml-1'>em relação ao mês passado</span>
                      </>
                    ) : (
                      <span>{kpi.change}</span>
                    )
                  }
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3">
              <ShipmentsChart />
          </div>
          <div className="lg:col-span-2">
              <ApprovalsPanel />
          </div>
          <div className="lg:col-span-5">
              <RecentShipments />
          </div>
        </div>
      </main>
    </div>
  );
}
