
'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShipmentsChart } from '@/components/shipments-chart';
import { RecentShipments } from '@/components/recent-shipments';
import { ApprovalsPanel } from '@/components/approvals-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Ship, CheckCircle, TrendingUp, AlertTriangle, Scale, ListTodo } from 'lucide-react';
import { getShipments, Shipment, Milestone } from '@/lib/shipment';
import { getInitialQuotes, Quote } from '@/lib/initial-data';
import { getFinancialEntries } from '@/lib/financials-data';
import { isThisMonth, parseISO, isPast, differenceInDays, isValid } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from './ui/scroll-area';
import { format } from 'date-fns';

const formatCurrency = (value: number, currency = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currency,
    }).format(value);
};

interface ReportData {
    title: string;
    data: any[];
    type: 'shipments' | 'quotes' | 'tasks';
}

export function GerencialPage() {
    const [reportData, setReportData] = useState<ReportData | null>(null);

    const [kpiData, setKpiData] = useState({
        monthlyProfit: 0,
        operationalProfit: 0,
        exchangeProfit: 0,
        demurrageProfit: 0,
        activeShipments: [] as Shipment[],
        approvedQuotesThisMonth: [] as Quote[],
        overdueTasks: [] as (Milestone & { shipment: Shipment })[],
    });

    useEffect(() => {
        const shipments = getShipments();
        const quotes = getInitialQuotes(); 
        const financialEntries = getFinancialEntries();
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const activeShipments = shipments.filter(s => {
            const lastMilestone = s.milestones[s.milestones.length - 1];
            return !lastMilestone || lastMilestone.status !== 'completed';
        });

        const approvedQuotesThisMonth = quotes.filter(q => {
            if (!q.date) return false;
            try {
                const quoteDateParts = q.date.split('/');
                const quoteDate = new Date(parseInt(quoteDateParts[2]), parseInt(quoteDateParts[1]) - 1, parseInt(quoteDateParts[0]));
                return q.status === 'Aprovada' && isThisMonth(quoteDate);
            } catch {
                return false;
            }
        });
        
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

        const operationalProfit = 12540.75; 
        const exchangeProfit = 3450.21;

        setKpiData({
            monthlyProfit,
            operationalProfit,
            exchangeProfit,
            demurrageProfit,
            activeShipments,
            approvedQuotesThisMonth,
            overdueTasks,
        });

    }, []);

    const renderReportContent = () => {
        if (!reportData) return null;

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
         <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Embarques em Andamento', data: kpiData.activeShipments, type: 'shipments' })}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embarques em Andamento</CardTitle>
            <Ship className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeShipments.length}</div>
            <p className="text-xs text-muted-foreground">Processos operacionais ativos</p>
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
