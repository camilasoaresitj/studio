
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShipmentsChart } from '@/components/shipments-chart';
import { RecentShipments } from '@/components/recent-shipments';
import { ApprovalsPanel } from '@/components/approvals-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Ship, CheckCircle, TrendingUp, AlertTriangle, Scale, ListTodo, Users, UserPlus, UserCheck, Package } from 'lucide-react';
import { getStoredShipments, Shipment } from '@/lib/shipment-data-client';
import { getStoredQuotes, Quote } from '@/lib/initial-data';
import { getStoredFinancialEntries } from '@/lib/financials-data';
import { isThisMonth, parseISO, isPast, differenceInDays, isValid, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { format } from 'date-fns';
import { Partner, getStoredPartners } from '@/lib/partners-data';

const formatCurrency = (value: number, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
    }).format(value);
};

interface ReportData {
    title: string;
    data: any[];
    type: 'shipments' | 'quotes' | 'tasks' | 'clients' | 'profit' | 'profit_detail';
}

export function GerencialPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [kpiData, setKpiData] = useState({
        totalProfit: 0,
        monthlyProfit: 0,
        operationalProfit: 0,
        exchangeProfit: 0,
        demurrageProfit: 0,
        activeShipments: [] as Shipment[],
        approvedQuotesThisMonth: [] as (Quote & { profitBRL: number })[],
        overdueTasks: [] as (Milestone & { shipment: Shipment })[],
        newClients: [] as Partner[],
        activeClients: [] as string[],
        monthlyContainers: 0,
        monthlyTEUs: 0,
    });

    useEffect(() => {
        const shipments = getStoredShipments();
        const storedQuotes = getStoredQuotes();
        setQuotes(storedQuotes);
        const financialEntries = getStoredFinancialEntries();
        const allPartners = getStoredPartners();
        setPartners(allPartners);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const activeShipments = shipments.filter(s => {
            const lastMilestone = s.milestones[s.milestones.length - 1];
            return !lastMilestone || lastMilestone.status !== 'completed';
        });

        const approvedQuotesThisMonth = storedQuotes.filter(q => {
            if (!q.date) return false;
            try {
                const quoteDateParts = q.date.split('/');
                const quoteDate = new Date(parseInt(quoteDateParts[2]), parseInt(quoteDateParts[1]) - 1, parseInt(quoteDateParts[0]));
                return q.status === 'Aprovada' && isThisMonth(quoteDate);
            } catch {
                return false;
            }
        }).map(quote => {
             const profit = quote.charges.reduce((chargeProfit, charge) => {
                const saleBRL = charge.sale * (charge.saleCurrency === 'BRL' ? 1 : 5.25); 
                const costBRL = charge.cost * (charge.costCurrency === 'BRL' ? 1 : 5.25);
                return chargeProfit + (saleBRL - costBRL);
            }, 0);
            return { ...quote, profitBRL: profit };
        });
        
        const monthlyProfit = approvedQuotesThisMonth.reduce((total, quote) => total + quote.profitBRL, 0);

        const demurrageProfit = financialEntries
            .filter(e => e.description?.toLowerCase().includes('demurrage'))
            .reduce((sum, entry) => {
                 if (entry.type === 'credit') return sum + entry.amount;
                 if (entry.type === 'debit') return sum - entry.amount;
                 return sum;
            }, 0);
        
        const overdueTasks = shipments.flatMap(shipment => 
            shipment.milestones
                .filter(m => m.status !== 'completed' && m.predictedDate && isValid(new Date(m.predictedDate)) && isPast(new Date(m.predictedDate)))
                .map(m => ({ ...m, shipment }))
        );
        
        const thirtyDaysAgo = subDays(today, 30);
        const newClients = allPartners.filter(p => p.roles.cliente && p.createdAt && new Date(p.createdAt) > thirtyDaysAgo);

        const ninetyDaysAgo = subDays(today, 90);
        const activeClientNames = new Set(
            shipments
                .filter(s => s.etd && new Date(s.etd) > ninetyDaysAgo)
                .map(s => s.customer)
        );
        const activeClients = Array.from(activeClientNames);

        let monthlyContainers = 0;
        let monthlyTEUs = 0;
        const shipmentsThisMonth = shipments.filter(s => s.etd && isValid(new Date(s.etd)) && isThisMonth(new Date(s.etd)));
        
        shipmentsThisMonth.forEach(s => {
            if (s.containers) {
                s.containers.forEach(c => {
                    const quantity = 1; // Assuming each entry is one container
                    monthlyContainers += quantity;
                    if (c.type && c.type.includes("20'")) {
                        monthlyTEUs += 1 * quantity;
                    } else if (c.type && c.type.includes("40'")) {
                        monthlyTEUs += 2 * quantity;
                    }
                });
            }
        });

        // Simulated values
        const operationalProfit = 12540.75; 
        const exchangeProfit = 3450.21;
        const totalProfit = monthlyProfit + operationalProfit + demurrageProfit + exchangeProfit;

        setKpiData({
            totalProfit,
            monthlyProfit,
            operationalProfit,
            exchangeProfit,
            demurrageProfit,
            activeShipments,
            approvedQuotesThisMonth,
            overdueTasks,
            newClients,
            activeClients,
            monthlyContainers,
            monthlyTEUs,
        });

    }, []);

    const profitBreakdown = useMemo(() => [
        { item: 'Lucro do Mês (Cotações)', value: kpiData.monthlyProfit, details: kpiData.approvedQuotesThisMonth },
        { item: 'Lucro Operacional Extra', value: kpiData.operationalProfit, details: [] }, // Placeholder
        { item: 'Lucro com Demurrage', value: kpiData.demurrageProfit, details: [] }, // Placeholder
        { item: 'Ganhos Cambiais', value: kpiData.exchangeProfit, details: [] }, // Placeholder
    ], [kpiData]);

    const renderReportContent = () => {
        if (!reportData) return null;

        if (reportData.type === 'profit_detail') {
            return (
                <Table>
                    <TableHeader><TableRow><TableHead>Processo</TableHead><TableHead>Cliente</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right">Lucro (BRL)</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.data.length === 0 ? (
                             <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhum dado detalhado para este KPI.</TableCell></TableRow>
                        ) : reportData.data.map((item: any) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.id}</TableCell>
                                <TableCell>{item.customer}</TableCell>
                                <TableCell>{item.responsibleUser || 'N/A'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.profitBRL)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )
        }

        if (reportData.type === 'profit') {
            return (
                 <Table>
                    <TableHeader><TableRow><TableHead>Componente do Lucro</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {profitBreakdown.map(item => (
                            <TableRow key={item.item}>
                                <TableCell>{item.item}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.value)}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-bold bg-secondary">
                            <TableCell>Lucro Total</TableCell>
                            <TableCell className="text-right">{formatCurrency(kpiData.totalProfit)}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            )
        }

        if (reportData.type === 'tasks') {
            return (
                <Table>
                    <TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Processo</TableHead><TableHead>Responsável</TableHead><TableHead>Atraso (dias)</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.data.map(task => (
                            <TableRow key={`${task.shipment.id}-${task.name}`}>
                                <TableCell>{task.name}</TableCell>
                                <TableCell>{task.shipment.id}</TableCell>
                                <TableCell>{task.shipment.responsibleUser || 'N/A'}</TableCell>
                                <TableCell className="text-destructive font-bold">{differenceInDays(new Date(), new Date(task.predictedDate))}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }

        if (reportData.type === 'shipments') {
             return (
                <Table>
                    <TableHeader><TableRow><TableHead>Processo</TableHead><TableHead>Cliente</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>ETD</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.data.map(shipment => (
                            <TableRow key={shipment.id}>
                                <TableCell>{shipment.id}</TableCell>
                                <TableCell>{shipment.customer}</TableCell>
                                <TableCell>{shipment.origin}</TableCell>
                                <TableCell>{shipment.destination}</TableCell>
                                <TableCell>{shipment.etd ? format(new Date(shipment.etd), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }
        
         if (reportData.type === 'quotes') {
             return (
                <Table>
                    <TableHeader><TableRow><TableHead>Cotação</TableHead><TableHead>Cliente</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.data.map(quote => (
                            <TableRow key={quote.id}>
                                <TableCell>{quote.id}</TableCell>
                                <TableCell>{quote.customer}</TableCell>
                                <TableCell>{quote.origin}</TableCell>
                                <TableCell>{quote.destination}</TableCell>
                                <TableCell>{quote.date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }
        
        if (reportData.type === 'clients') {
            return (
                <Table>
                    <TableHeader><TableRow><TableHead>Nome do Cliente</TableHead><TableHead>País</TableHead><TableHead>Contato Principal</TableHead><TableHead>Data de Cadastro</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {reportData.data.map(client => (
                            <TableRow key={client.id}>
                                <TableCell>{client.name}</TableCell>
                                <TableCell>{client.address?.country}</TableCell>
                                <TableCell>{client.contacts[0]?.name} ({client.contacts[0]?.email})</TableCell>
                                <TableCell>{client.createdAt ? format(new Date(client.createdAt), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }

        return <p>Tipo de relatório não suportado.</p>;
    };

  return (
    <>
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Gerencial</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Visão geral e KPIs da sua operação.
        </p>
      </header>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="col-span-2 sm:col-span-1 lg:col-span-2 cursor-pointer bg-primary/10 border-primary hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Detalhamento do Lucro Total', data: [], type: 'profit' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Total do Mês</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{formatCurrency(kpiData.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">Soma de todos os resultados do período.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Detalhamento: Lucro de Cotações', data: kpiData.approvedQuotesThisMonth, type: 'profit_detail' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro do Mês (Cotações)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.monthlyProfit)}</div>
            <p className="text-xs text-muted-foreground">Resultado de fretes aprovados no mês</p>
          </CardContent>
        </Card>
         <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Detalhamento: Lucro Operacional Extra', data: [], type: 'profit_detail' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Operacional Extra</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.operationalProfit)}</div>
            <p className="text-xs text-muted-foreground">Taxas extras adicionadas nos processos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Detalhamento: Lucro com Demurrage', data: [], type: 'profit_detail' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro com Demurrage</CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.demurrageProfit)}</div>
            <p className="text-xs text-muted-foreground">Resultado de sobrestadia de contêineres</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Detalhamento: Ganhos Cambiais', data: [], type: 'profit_detail' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganhos Cambiais</CardTitle>
            <Scale className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.exchangeProfit)}</div>
            <p className="text-xs text-muted-foreground">Resultado de negociações de câmbio</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
         <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Volume (TEUs) no Mês', data: getStoredShipments().filter(s => s.etd && isValid(new Date(s.etd)) && isThisMonth(new Date(s.etd))), type: 'shipments' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Volume (TEUs) no Mês</CardTitle>
                <Ship className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{kpiData.monthlyTEUs}</div>
                <p className="text-xs text-muted-foreground">Total de TEUs embarcados</p>
            </CardContent>
        </Card>
         <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Contêineres Embarcados no Mês', data: getStoredShipments().filter(s => s.etd && isValid(new Date(s.etd)) && isThisMonth(new Date(s.etd))), type: 'shipments' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contêineres no Mês</CardTitle>
                <Package className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{kpiData.monthlyContainers}</div>
                <p className="text-xs text-muted-foreground">Total de contêineres embarcados</p>
            </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: `Cotações Aprovadas em ${format(new Date(), 'MMMM')}`, data: kpiData.approvedQuotesThisMonth, type: 'quotes' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotações Aprovadas (Mês)</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{kpiData.approvedQuotesThisMonth.length}</div>
            <p className="text-xs text-muted-foreground">Novos negócios fechados este mês</p>
          </CardContent>
        </Card>
         <Card className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all" onClick={() => setReportData({ title: 'Tarefas Atrasadas', data: kpiData.overdueTasks, type: 'tasks' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
            <ListTodo className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{kpiData.overdueTasks.length}</div>
            <p className="text-xs text-muted-foreground">Milestones operacionais vencidos</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Clientes Novos (Últimos 30 Dias)', data: kpiData.newClients, type: 'clients' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Novos</CardTitle>
                <UserPlus className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+{kpiData.newClients.length}</div>
                <p className="text-xs text-muted-foreground">nos últimos 30 dias</p>
            </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Clientes Ativos (Últimos 90 Dias)', data: partners.filter(p => kpiData.activeClients.includes(p.name)), type: 'clients' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                <UserCheck className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{kpiData.activeClients.length}</div>
                <p className="text-xs text-muted-foreground">com embarques nos últimos 90 dias</p>
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
    <Dialog open={!!reportData} onOpenChange={(isOpen) => !isOpen && setReportData(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{reportData?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-grow overflow-hidden">
                <ScrollArea className="h-full">
                    {renderReportContent()}
                </ScrollArea>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
