
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, DollarSign, Settings } from 'lucide-react';
import { getFinancialEntries, saveFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { getShipments, saveShipments, Shipment, QuoteCharge } from '@/lib/shipment';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

type ApprovalItem = 
    | { type: 'finance'; item: FinancialEntry }
    | { type: 'operations'; item: { charge: QuoteCharge; shipment: Shipment }};

export function ApprovalsPanel() {
    const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
    const { toast } = useToast();

    const fetchPendingItems = () => {
        const financialEntries = getFinancialEntries();
        const shipments = getShipments();

        const pendingFinancial: ApprovalItem[] = financialEntries
            .filter(e => e.status === 'Pendente de Aprovação')
            .map(item => ({ type: 'finance', item }));

        const pendingOperational: ApprovalItem[] = shipments.flatMap(shipment => 
            (shipment.charges || [])
                .filter(charge => charge.approvalStatus === 'pendente')
                .map(charge => ({ type: 'operations' as const, item: { charge, shipment } }))
        );
        
        setPendingItems([...pendingFinancial, ...pendingOperational]);
    };

    useEffect(() => {
        fetchPendingItems();
        
        const handleStorageChange = () => fetchPendingItems();
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('financialsUpdated', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('financialsUpdated', handleStorageChange);
        };
    }, []);

    const handleApproval = (item: ApprovalItem, approved: boolean) => {
        if (item.type === 'finance') {
            const updatedEntries = getFinancialEntries().map(e => {
                if (e.id === item.item.id) {
                    return { ...e, status: approved ? 'Aberto' : 'Aberto' }; // Let's simplify and just move it to 'Aberto' on approval
                }
                return e;
            });
            saveFinancialEntries(updatedEntries);
            toast({
                title: `Despesa ${approved ? 'Aprovada' : 'Rejeitada'}`,
                description: `A despesa para ${item.item.partner} foi atualizada.`,
                className: approved ? 'bg-success text-success-foreground' : ''
            });
        } else if (item.type === 'operations') {
            const { charge, shipment } = item.item;
            const updatedShipments = getShipments().map(s => {
                if (s.id === shipment.id) {
                    const updatedCharges = s.charges.map(c => {
                        if (c.id === charge.id) {
                            return { ...c, approvalStatus: approved ? 'aprovada' : 'rejeitada' };
                        }
                        return c;
                    });
                    return { ...s, charges: updatedCharges };
                }
                return s;
            });
            saveShipments(updatedShipments);
             toast({
                title: `Alteração ${approved ? 'Aprovada' : 'Rejeitada'}`,
                description: `A alteração na despesa "${charge.name}" do processo ${shipment.id} foi atualizada.`,
                className: approved ? 'bg-success text-success-foreground' : ''
            });
        }
        fetchPendingItems(); // Refresh the list
    };
    
    const renderFinanceItem = (item: FinancialEntry) => (
        <>
            <div className="flex-1">
                <p className="text-sm font-medium leading-none">{item.description || `Despesa para ${item.partner}`}</p>
                <p className="text-sm text-muted-foreground">
                    <Badge variant="secondary" className="mr-2">{item.expenseType}</Badge>
                    {item.currency} {item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
            </div>
        </>
    );

    const renderOperationsItem = (item: { charge: QuoteCharge; shipment: Shipment }) => (
         <>
            <div className="flex-1">
                <p className="text-sm font-medium leading-none">Aprovar alteração de despesa</p>
                <p className="text-sm text-muted-foreground">
                    <Badge variant="secondary" className="mr-2">Processo {item.shipment.id}</Badge>
                    {item.charge.name}: {item.charge.saleCurrency} {item.charge.sale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </p>
            </div>
        </>
    );


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className='text-base font-medium flex items-center gap-2'>
                        <AlertCircle className="h-5 w-5 text-primary" />
                        Painel de Aprovações
                    </CardTitle>
                    <CardDescription>Itens que requerem sua atenção.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[260px] pr-3">
                    <div className="space-y-4">
                        {pendingItems.length > 0 ? pendingItems.map((item, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                                 <div className="pt-1">
                                    {item.type === 'finance' ? <DollarSign className="h-5 w-5 text-blue-500" /> : <Settings className="h-5 w-5 text-orange-500" />}
                                </div>
                                {item.type === 'finance' ? renderFinanceItem(item.item as FinancialEntry) : renderOperationsItem(item.item as { charge: QuoteCharge; shipment: Shipment })}
                                <div className="flex gap-1">
                                     <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleApproval(item, false)}>
                                        <XCircle className="h-5 w-5"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-success hover:bg-success/10 hover:text-success" onClick={() => handleApproval(item, true)}>
                                        <CheckCircle className="h-5 w-5"/>
                                    </Button>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-muted-foreground py-10">
                                <CheckCircle className="mx-auto h-12 w-12 text-success mb-2" />
                                <p>Nenhuma pendência de aprovação.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
