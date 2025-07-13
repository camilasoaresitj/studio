
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
import { isPast, isThisMonth, subDays, format, isValid } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';


interface KpiData {
    monthlyShipments: Shipment[];
    profitableShipments: (Shipment & { profit: number })[];
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
            const rates = await exchangeRateService.getRates();

            // 1. Embarques no Mês
            const monthlyShipments = shipments.filter(s => s.etd && isValid(new Date(s.etd)) && isThisMonth(new Date(s.etd)));

            // 2. Lucro Bruto (Mês)
            const profitableShipments = monthlyShipments.map(shipment => {
                const profit = shipment.charges.reduce((chargeProfit, charge) => {
                    const costInBrl = (charge.costCurrency === 'BRL' ? charge.cost : charge.cost * (rates[charge.costCurrency] || 1));
                    const saleInBrl = (charge.saleCurrency === 'BRL' ? charge.sale : charge.sale * (rates[charge.saleCurrency] || 1));
                    return chargeProfit + (saleInBrl - costInBrl);
                }, 0);
                return { ...shipment, profit };
            });

            // 3. Tarefas Atrasadas
            const overdueTasks = shipments.flatMap(s => 
                s.milestones
                 .filter(m => m.status !== 'completed' && m.predictedDate && isValid(new Date(m.predictedDate)) && isPast(new Date(m.predictedDate)))
                 .map(milestone => ({...s, milestone}))
            );

            // 4. Clientes Inativos (sem embarques nos últimos 90 dias)
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
                profitableShipments,
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
                 reportData = {
                    title: 'Relatório de Lucro Bruto (Mês)',
                    description: 'Detalhamento do lucro por embarque no mês corrente.',
                    data: kpiData.profitableShipments.sort((a,b) => b.profit - a.profit),
                    headers: ['Processo', 'Cliente', 'Modal', 'Responsável Comercial', 'Lucro Bruto (BRL)'],
                    renderRow: (item: Shipment & { profit: number }) => {
                        const isAir = item.details.cargo.toLowerCase().includes('kg');
                        const modal = isAir ? 'Aéreo' : 'Marítimo';
                        const customerPartner = allPartners.find(p => p.name === item.customer);
                        const commercialContact = customerPartner?.contacts.find(c => c.departments.includes('Comercial')) || customerPartner?.contacts[0];
                        return (
                            <TableRow key={item.id}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.customer}</TableCell>
                                <TableCell>{modal}</TableCell>
                                <TableCell>{commercialContact?.name || 'N/A'}</TableCell>
                                <TableCell className="text-right font-mono text-success">{item.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                            </TableRow>
                        )
                    },
                };
                break;
            case 'tasks':
                reportData = {
                    title: 'Relatório de Tarefas Atrasadas',
                    description: 'Lista de todas as tarefas operacionais que estão com data vencida.',
                    data: kpiData.overdueTasks,
                    headers: ['Processo', 'Cliente', 'Tarefa', 'Data Prevista', 'Responsável Operacional'],
                    renderRow: (item: Shipment & { milestone: any }) => {
                        const customerPartner = allPartners.find(p => p.name === item.customer);
                        const operationalContact = customerPartner?.contacts.find(c => c.departments.includes('Operacional')) || customerPartner?.contacts[0];
                        return (
                        <TableRow key={`${item.id}-${item.milestone.name}`}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell>{item.customer}</TableCell>
                            <TableCell>{item.milestone.name}</TableCell>
                            <TableCell className="text-destructive">{format(new Date(item.milestone.predictedDate), 'dd/MM/yyyy')}</TableCell>
                             <TableCell>{operationalContact?.name || 'N/A'}</TableCell>
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
            { title: "Lucro Bruto (Mês)", value: kpiData.profitableShipments.reduce((sum, s) => sum + s.profit, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), change: "+8.2%", icon: <DollarSign className="h-6 w-6 text-muted-foreground" />, positive: true, onClick: () => handleOpenReport('profit') },
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
                    report?.data.map(item => report.renderRow(item))
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
