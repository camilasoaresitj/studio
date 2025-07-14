
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileDown, PlusCircle, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { getShipments, Shipment } from '@/lib/shipment';
import { getFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { useRouter } from 'next/navigation';
import { format, isValid } from 'date-fns';
import Link from 'next/link';

export default function CustomerPortalPage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [invoices, setInvoices] = useState<FinancialEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // In a real app, customerId would come from an authentication context
    const customerId = "Nexus Imports"; 

    useEffect(() => {
        setIsLoading(true);
        // Simulate fetching data for the logged-in customer
        const allShipments = getShipments();
        const customerShipments = allShipments.filter(s => s.customer === customerId);
        setShipments(customerShipments);

        const allInvoices = getFinancialEntries();
        const customerInvoices = allInvoices.filter(i => i.partner === customerId && i.type === 'credit');
        setInvoices(customerInvoices);
        
        setIsLoading(false);
    }, [customerId]);

    const handleRefresh = () => {
        setIsLoading(true);
        // Re-fetch data
        setTimeout(() => {
            const allShipments = getShipments();
            const customerShipments = allShipments.filter(s => s.customer === customerId);
            setShipments(customerShipments);

            const allInvoices = getFinancialEntries();
            const customerInvoices = allInvoices.filter(i => i.partner === customerId && i.type === 'credit');
            setInvoices(customerInvoices);
            setIsLoading(false);
        }, 500);
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
    );
}
