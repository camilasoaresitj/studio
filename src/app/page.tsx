

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Truck, DollarSign, ClipboardList, UserX, ArrowUpRight, ArrowDownRight, Briefcase, Settings, Landmark } from 'lucide-react';
import { ShipmentsChart } from '@/components/shipments-chart';
import { RecentShipments } from '@/components/recent-shipments';
import { ApprovalsPanel } from '@/components/approvals-panel';
import { getShipments, Shipment } from '@/lib/shipment';
import { getPartners, Partner } from '@/lib/partners-data';
import { getFinancialEntries } from '@/lib/financials-data';
import { getLtiTariffs } from '@/lib/lti-tariffs-data';
import { getDemurrageTariffs } from '@/lib/demurrage-tariffs-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { isThisMonth, subDays, format, isValid } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProfitDetails {
  commercial: number;
  operational: number;
  financial: number;
  total: number;
}

interface KpiData {
    monthlyShipments: Shipment[];
    profitDetails: ProfitDetails;
    overdueTasks: (Shipment & { milestone: any })[];
    inactiveClients: Partner[];
}

interface ReportData {
    title: string;
    description: string;
    data: any[];
    headers: string[];
    renderRow: (item: any) => React.ReactNode;
}

export default function Home() {
    const [kpiData, setKpiData] = useState<KpiData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [report, setReport] = useState<ReportData | null>(null);

    const allPartners = useMemo(() => getPartners(), []);

    useEffect(() => {
        const calculateKpis = async () => {
            const shipments = getShipments();
            const financialEntries = getFinancialEntries();
            const ltiTariffs = getLtiTariffs();
            const costTariffs = getDemurrageTariffs();
            const rates = await exchangeRateService.getRates();

            // --- KPI Calculations ---
            const monthlyShipments = shipments.filter(s => s.etd && isValid(new Date(s.etd)) && isThisMonth(new Date(s.etd)));

            // 1. Commercial Profit
            const commercialProfit = monthlyShipments.reduce((totalProfit, shipment) => {
                const shipmentProfit = shipment.charges.reduce((chargeProfit, charge) => {
                    const costInBrl = (charge.costCurrency === 'BRL' ? charge.cost : charge.cost * (rates[charge.costCurrency] || 1));
                    const saleInBrl = (charge.saleCurrency === 'BRL' ? charge.sale : charge.sale * (rates[charge.saleCurrency] || 1));
                    return chargeProfit + (saleInBrl - costInBrl);
                }, 0);
                return totalProfit + shipmentProfit;
            }, 0);

            // 2. Operational Profit (Late Fees)
            const operationalProfit = monthlyShipments.reduce((totalProfit, shipment) => {
                const lateFeeProfit = (shipment.charges || [])
                    .filter(c => c.name.toUpperCase().includes('TAXA DE CORREÇÃO DE BL'))
                    .reduce((sum, c) => sum + (c.sale - c.cost), 0);
                return totalProfit + lateFeeProfit;
            }, 0);
            
            // 3. Financial Profit (Demurrage + Exchange Rate Gains)
            const demurrageEntries = financialEntries.filter(e => e.description?.toLowerCase().includes('demurrage') && isThisMonth(new Date(e.dueDate)));
            const demurrageProfit = demurrageEntries.reduce((totalProfit, entry) => {
                 const containerNumber = entry.invoiceId.replace('DEM-', '');
                 const shipment = shipments.find(s => s.containers?.some(c => c.number === containerNumber));
                 if (!shipment) return totalProfit;
                 
                 // Simplified cost calculation for demonstration
                 const containerType = shipment.containers?.find(c => c.number === containerNumber)?.type.toLowerCase();
                 let tariffType: 'dry' | 'reefer' | 'special' = 'dry';
                 if (containerType?.includes('rf')) tariffType = 'reefer';
                 if (containerType?.includes('ot') || containerType?.includes('fr')) tariffType = 'special';
                 const costTariff = costTariffs.find(t => t.carrier.toLowerCase() === shipment.carrier?.toLowerCase() && t.containerType === tariffType);
                 const cost = costTariff ? costTariff.costPeriods[0].rate * 5 : 0; // Simplified cost
                 
                 return totalProfit + (entry.amount - cost);
            }, 0);

            // For now, Exchange Rate profit is not calculated here as it depends on user input at payment time.
            // This would require a more complex data structure to track saved rates vs paid rates.
            const exchangeProfit = 0; 
            const financialProfit = demurrageProfit + exchangeProfit;

            const profitDetails = {
                commercial: commercialProfit,
                operational: operationalProfit,
                financial: financialProfit,
                total: commercialProfit + operationalProfit + financialProfit
            };

            // 4. Overdue Tasks
            const overdueTasks = shipments.flatMap(s => 
                s.milestones
                 .filter(m => m.status !== 'completed' && m.predictedDate && isValid(new Date(m.predictedDate)) && isPast(new Date(m.predictedDate)))
                 .map(milestone => ({...s, milestone}))
            );

            // 5. Inactive Clients
            const ninetyDaysAgo = subDays(new Date(), 90);
            const clientPartners = allPartners.filter(p => p.roles.cliente);
            const activeClients = new Set(
                shipments
                    .filter(s => s.etd && isValid(new Date(s.etd)) && new Date(s.etd) > ninetyDaysAgo)
                    .map(s => s.customer)
            );
            const inactiveClients = clientPartners.filter(p => !activeClients.has(p.name));
            
            setKpiData({
                monthlyShipments,
                profitDetails,
                overdueTasks,
                inactiveClients,
            });
            setIsLoading(false);
        };

        calculateKpis();
    }, [allPartners]);

    const handleOpenReport = (type: 'shipments' | 'profit' | 'tasks' | 'clients') => {
        if (!kpiData) return;

        let reportData: ReportData;

        switch (type) {
            case 'shipments':
                reportData = {
                    title: 'Relatório de Embarques no Mês',
                    description: 'Lista de todos os embarques com ETD no mês corrente.',
                    data: kpiData.monthlyShipments,
                    headers: ['Processo', 'Cliente', 'Origem', 'Destino', 'ETD', 'Modal', 'Detalhe Carga'],
                    renderRow: (item: Shipment) => {
                        const isAir = item.details.cargo.toLowerCase().includes('kg');
                        const modal = isAir ? 'Aéreo' : 'Marítimo';
                        const cargoDetail = isAir 
                            ? item.details.cargo 
                            : item.containers?.map(c => `${c.quantity}x${c.number}`).join(', ') || item.details.cargo;

                        return (
                            <TableRow key={item.id}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.customer}</TableCell>
                                <TableCell>{item.origin}</TableCell>
                                <TableCell>{item.destination}</TableCell>
                                <TableCell>{item.etd && isValid(new Date(item.etd)) ? format(new Date(item.etd), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{modal}</TableCell>
                                <TableCell>{cargoDetail}</TableCell>
                            </TableRow>
                        )
                    },
                };
                break;
            case 'profit':
                 const profitData = [
                    { department: 'Comercial', icon: Briefcase, profit: kpiData.profitDetails.commercial, description: 'Lucro da venda de fretes e taxas.' },
                    { department: 'Operacional', icon: Settings, profit: kpiData.profitDetails.operational, description: 'Receita de taxas extras (ex: correção de BL).' },
                    { department: 'Financeiro', icon: Landmark, profit: kpiData.profitDetails.financial, description: 'Lucro de demurrage e ganhos de câmbio.' },
                 ];
                 reportData = {
                    title: 'Detalhamento do Lucro Bruto (Mês)',
                    description: 'Lucratividade consolidada por departamento.',
                    data: profitData,
                    headers: ['Departamento', 'Descrição', 'Lucro Bruto (BRL)'],
                    renderRow: (item: typeof profitData[0]) => (
                        <TableRow key={item.department}>
                            <TableCell className="font-medium flex items-center gap-2"><item.icon className="h-4 w-4 text-muted-foreground"/>{item.department}</TableCell>
                            <TableCell className="text-muted-foreground">{item.description}</TableCell>
                            <TableCell className="text-right font-mono text-success">{item.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                        </TableRow>
                    ),
                };
                break;
            case 'tasks':
                reportData = {
                    title: 'Relatório de Tarefas Atrasadas',
                    description: 'Lista de todas as tarefas operacionais que estão com data vencida.',
                    data: kpiData.overdueTasks,
                    headers: ['Processo', 'Cliente', 'Tarefa', 'Data Prevista', 'Responsável Operacional'],
                    renderRow: (item: Shipment & { milestone: any }) => {
                        return (
                        <TableRow key={`${item.id}-${item.milestone.name}`}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell>{item.customer}</TableCell>
                            <TableCell>{item.milestone.name}</TableCell>
                            <TableCell className="text-destructive">{format(new Date(item.milestone.predictedDate), 'dd/MM/yyyy')}</TableCell>
                             <TableCell>{item.responsibleUser || 'N/A'}</TableCell>
                        </TableRow>
                    )},
                };
                break;
            case 'clients':
                 reportData = {
                    title: 'Relatório de Clientes Inativos',
                    description: 'Clientes que não possuem embarques nos últimos 90 dias.',
                    data: kpiData.inactiveClients,
                    headers: ['Cliente', 'Contato Principal', 'Email'],
                    renderRow: (item: Partner) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.contacts[0]?.name}</TableCell>
                            <TableCell>{item.contacts[0]?.email}</TableCell>
                        </TableRow>
                    ),
                };
                break;
            default:
                return;
        }
        setReport(reportData);
    };

    const kpis = useMemo(() => {
        if (!kpiData) return [];
        return [
            { title: "Embarques no Mês", value: kpiData.monthlyShipments.length.toString(), change: "+12.5%", icon: <Truck className="h-6 w-6 text-muted-foreground" />, positive: true, onClick: () => handleOpenReport('shipments') },
            { title: "Lucro Bruto (Mês)", value: kpiData.profitDetails.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), change: "+8.2%", icon: <DollarSign className="h-6 w-6 text-muted-foreground" />, positive: true, onClick: () => handleOpenReport('profit') },
            { title: "Tarefas Atrasadas", value: kpiData.overdueTasks.length.toString(), change: "+5.1%", icon: <ClipboardList className="h-6 w-6 text-muted-foreground" />, positive: false, onClick: () => handleOpenReport('tasks') },
            { title: "Clientes Inativos", value: kpiData.inactiveClients.length.toString(), change: "Últimos 90 dias", icon: <UserX className="h-6 w-6 text-muted-foreground" />, positive: false, onClick: () => handleOpenReport('clients') },
        ]
    }, [kpiData, allPartners]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-4">Carregando dashboard gerencial...</p>
      </div>
    );
  }

  return (
    <>
      <main className="flex-1 p-4 md:p-8">
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Gerencial</h1>
          <p className="text-muted-foreground mt-2 text-lg">Visão geral da performance e dos indicadores chave do negócio.</p>
        </header>

        <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map(kpi => (
            <Card key={kpi.title} className="hover:bg-accent hover:cursor-pointer transition-colors" onClick={kpi.onClick}>
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

       <Dialog open={!!report} onOpenChange={(isOpen) => !isOpen && setReport(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{report?.title}</DialogTitle>
            <DialogDescription>{report?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    {report?.headers.map(header => <TableHead key={header}>{header}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report?.data.length === 0 ? (
                    <TableRow><TableCell colSpan={report.headers.length} className="text-center h-24">Nenhum dado a exibir.</TableCell></TableRow>
                  ) : (
                    report?.data.map((item, index) => report.renderRow(item))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
