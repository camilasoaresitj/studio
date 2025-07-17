
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileDown, PlusCircle, RefreshCw, Loader2, ArrowRight, AlertTriangle, List, FileText, Ship, Anchor } from 'lucide-react';
import { getShipments, Shipment } from '@/lib/shipment';
import { getFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { getInitialQuotes, Quote } from '@/lib/initial-data';
import { useRouter } from 'next/navigation';
import { format, isValid, differenceInDays, isPast, isWithinInterval, addDays } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DraftAlert {
    shipment: Shipment;
    daysRemaining: number;
    isOverdue: boolean;
}

interface ReportData {
    title: string;
    shipments: Shipment[];
}


export default function CustomerPortalPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [invoices, setInvoices] = useState<FinancialEntry[]>([]);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [draftAlerts, setDraftAlerts] = useState<DraftAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const router = useRouter();

    // In a real app, customerId would come from an authentication context
    const customerId = "Nexus Imports"; 

    useEffect(() => {
        const fetchData = () => {
            setIsLoading(true);
            // Simulate fetching data for the logged-in customer
            const allShipments = getShipments();
            const customerShipments = allShipments.filter(s => s.customer === customerId);
            setShipments(customerShipments);

            const allInvoices = getFinancialEntries();
            const customerInvoices = allInvoices.filter(i => i.partner === customerId && i.type === 'credit');
            setInvoices(customerInvoices);
            
            const allQuotes = getInitialQuotes();
            const customerQuotes = allQuotes.filter(q => q.customer === customerId && (q.status === 'Aprovada' || q.status === 'Perdida'));
            setQuotes(customerQuotes);
            setIsLoading(false);
        };

        const calculateAlerts = () => {
             // Calculate Draft Alerts
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const allShipments = getShipments(); // Make sure to get fresh data
            const customerShipments = allShipments.filter(s => s.customer === customerId);
            const alerts: DraftAlert[] = customerShipments
                .map(shipment => {
                    const draftMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('documental'));
                    
                    if (!draftMilestone || !draftMilestone.predictedDate || !isValid(new Date(draftMilestone.predictedDate))) {
                        return null;
                    }

                    const dueDate = new Date(draftMilestone.predictedDate);
                    const draftAlreadySent = shipment.blDraftData; 

                    if (draftAlreadySent) return null; 

                    const daysRemaining = differenceInDays(dueDate, today);
                    
                    
                    if (daysRemaining <= 5) {
                        return {
                            shipment,
                            daysRemaining,
                            isOverdue: isPast(dueDate) && daysRemaining < 0
                        };
                    }
                    return null;
                })
                .filter((alert): alert is DraftAlert => alert !== null)
                .sort((a,b) => a.daysRemaining - b.daysRemaining);
            setDraftAlerts(alerts);
        }

        fetchData();
        calculateAlerts();
        
        window.addEventListener('storage', fetchData);
        window.addEventListener('shipmentsUpdated', calculateAlerts);
        return () => {
            window.removeEventListener('storage', fetchData);
            window.removeEventListener('shipmentsUpdated', calculateAlerts);
        };
    }, [customerId]);

    const kpiData = useMemo(() => {
        const now = new Date();
        const sevenDaysFromNow = addDays(now, 7);
        const interval = { start: now, end: sevenDaysFromNow };

        const departingSoon = shipments.filter(s => s.etd && isValid(new Date(s.etd)) && isWithinInterval(new Date(s.etd), interval));
        const arrivingSoon = shipments.filter(s => s.eta && isValid(new Date(s.eta)) && isWithinInterval(new Date(s.eta), interval));

        return {
            departingSoon,
            arrivingSoon,
        };
    }, [shipments]);


    const handleRefresh = () => {
        // The useEffect will refetch data automatically on storage/focus events,
        // but a manual trigger can be useful.
        const event = new Event('storage');
        window.dispatchEvent(event);
    };
    
    const getShipmentStatus = (shipment: Shipment): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
        if (!shipment.milestones || shipment.milestones.length === 0) {
          return { text: 'Não iniciado', variant: 'secondary' };
        }
      
        const firstPending = shipment.milestones.find(m => m.status === 'pending' || m.status === 'in_progress');
      
        if (!firstPending) {
          return { text: 'Finalizado', variant: 'outline' };
        }
      
        const firstPendingName = firstPending.name.toLowerCase();
        
        const departureCompleted = shipment.milestones.some(m => 
          (m.name.toLowerCase().includes('departure') || m.name.toLowerCase().includes('vessel departure') || m.name.toLowerCase().includes('embarque')) 
          && m.status === 'completed'
        );
      
        if (departureCompleted) {
            if (firstPendingName.includes('chegada') || firstPendingName.includes('arrival') || firstPendingName.includes('discharged')) {
                return { text: 'Chegada no Destino', variant: 'default' };
            }
            return { text: 'Em Trânsito', variant: 'default' };
        }
      
        return { text: `Aguardando Embarque`, variant: 'secondary' };
    };

    return (
        <>
        <div className="p-4 md:p-8 space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">Portal do Cliente</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Bem-vindo, {customerId}. Acompanhe seus embarques e faturas aqui.
                    </p>
                </div>
                 <div className="flex gap-2 mt-4 md:mt-0">
                    <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Atualizar
                    </Button>
                    <Button onClick={() => router.push('/comercial')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Cotação
                    </Button>
                 </div>
            </header>

            <div className="grid gap-6 sm:grid-cols-2">
                <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Embarques Partindo nos Próximos 7 Dias', shipments: kpiData.departingSoon })}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Embarques Partindo</CardTitle>
                        <Ship className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.departingSoon.length}</div>
                        <p className="text-xs text-muted-foreground">nos próximos 7 dias</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setReportData({ title: 'Embarques Chegando nos Próximos 7 Dias', shipments: kpiData.arrivingSoon })}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Embarques Chegando</CardTitle>
                        <Anchor className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpiData.arrivingSoon.length}</div>
                        <p className="text-xs text-muted-foreground">nos próximos 7 dias</p>
                    </CardContent>
                </Card>
            </div>
            
            {draftAlerts.length > 0 && (
                <Card className="border-destructive bg-destructive/5 animate-in fade-in-50 duration-500">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5"/> Ações Pendentes</CardTitle>
                        <CardDescription className="text-destructive/80">Você tem instruções de embarque que precisam da sua atenção.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {draftAlerts.map(({ shipment, daysRemaining, isOverdue }) => (
                            <Link key={shipment.id} href={`/bl-draft/${shipment.id}`} className="block">
                                <div className="p-3 border rounded-lg bg-background hover:bg-muted transition-colors flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">Enviar Draft do BL - Processo <span className="text-primary">{shipment.id}</span></p>
                                        <p className="text-sm text-muted-foreground">{shipment.origin} &rarr; {shipment.destination}</p>
                                    </div>
                                    <div className="text-right">
                                        {isOverdue ? (
                                             <Badge variant="destructive">ATRASADO ({Math.abs(daysRemaining)} dias)</Badge>
                                        ) : (
                                             <Badge variant="default" className="bg-amber-500">Vence em {daysRemaining} dia(s)</Badge>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Meus Embarques</CardTitle>
                    <CardDescription>Acompanhe o status de todos os seus embarques ativos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Processo</TableHead>
                                    <TableHead>Rota</TableHead>
                                    <TableHead>Master / AWB</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>ETA</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : shipments.length > 0 ? shipments.map((shipment) => (
                                    <TableRow key={shipment.id} className="hover:bg-muted/50">
                                        <TableCell className="font-medium text-primary">
                                             <Link href={`/portal/${shipment.id}`} className="hover:underline">
                                                {shipment.id}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{shipment.origin} &rarr; {shipment.destination}</TableCell>
                                        <TableCell>{shipment.masterBillNumber || 'N/A'}</TableCell>
                                        <TableCell><Badge variant={getShipmentStatus(shipment).variant}>{getShipmentStatus(shipment).text}</Badge></TableCell>
                                        <TableCell>{shipment.eta && isValid(new Date(shipment.eta)) ? format(new Date(shipment.eta), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/portal/${shipment.id}`}>
                                                    Ver Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhum embarque ativo encontrado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Minhas Cotações</CardTitle>
                    <CardDescription>Visualize o histórico de suas cotações aprovadas e reprovadas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cotação ID</TableHead>
                                    <TableHead>Rota</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : quotes.length > 0 ? quotes.map((quote) => (
                                    <TableRow key={quote.id}>
                                        <TableCell className="font-medium">{quote.id.replace('-DRAFT', '')}</TableCell>
                                        <TableCell>{quote.origin} &rarr; {quote.destination}</TableCell>
                                        <TableCell>
                                            <Badge variant={quote.status === 'Aprovada' ? 'success' : 'destructive'}>
                                                {quote.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{quote.date}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">
                                                <FileText className="mr-2 h-4 w-4" /> Ver Proposta
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma cotação encontrada.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Minhas Faturas</CardTitle>
                    <CardDescription>Acesse o histórico de suas faturas e documentos financeiros.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fatura nº</TableHead>
                                    <TableHead>Processo</TableHead>
                                    <TableHead>Vencimento</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : invoices.length > 0 ? invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceId}</TableCell>
                                        <TableCell>{invoice.processId}</TableCell>
                                        <TableCell>{format(new Date(invoice.dueDate), 'dd/MM/yyyy')}</TableCell>
                                        <TableCell>{invoice.currency} {invoice.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell><Badge variant={invoice.status === 'Pago' ? 'success' : 'destructive'}>{invoice.status}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm">
                                                <FileDown className="mr-2 h-4 w-4" /> Baixar PDF
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">Nenhuma fatura encontrada.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        <Dialog open={!!reportData} onOpenChange={(isOpen) => !isOpen && setReportData(null)}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{reportData?.title}</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-hidden">
                    <ScrollArea className="h-full">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>PO Number</TableHead>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Shipper</TableHead>
                            <TableHead>Consignee</TableHead>
                            <TableHead>ETD</TableHead>
                            <TableHead>ETA</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {reportData?.shipments.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum embarque para exibir.</TableCell></TableRow>
                        ) : (
                            reportData?.shipments.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.purchaseOrderNumber || 'N/A'}</TableCell>
                                <TableCell>{item.invoiceNumber || 'N/A'}</TableCell>
                                <TableCell>{item.shipper?.name || 'N/A'}</TableCell>
                                <TableCell>{item.consignee?.name || 'N/A'}</TableCell>
                                <TableCell>{item.etd && isValid(new Date(item.etd)) ? format(new Date(item.etd), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                <TableCell>{item.eta && isValid(new Date(item.eta)) ? format(new Date(item.eta), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                            </TableRow>
                            ))
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
