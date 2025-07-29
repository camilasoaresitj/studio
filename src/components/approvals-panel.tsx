
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, DollarSign, Settings, ArrowRight } from 'lucide-react';
import { getFinancialEntries, saveFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { getShipments, saveShipments, Shipment, QuoteCharge, ApprovalLog } from '@/lib/shipment';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

type ApprovalItem = 
    | { type: 'finance'; item: FinancialEntry }
    | { type: 'operations'; item: { charge: QuoteCharge; shipment: Shipment }};

export function ApprovalsPanel() {
    const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
    const [viewingItem, setViewingItem] = useState<ApprovalItem | null>(null);
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
        
        const handleDataChange = () => fetchPendingItems();
        // Using focus and storage events is a robust way to ensure data is fresh when the user interacts with the app.
        window.addEventListener('storage', handleDataChange);
        window.addEventListener('focus', handleDataChange);
        window.addEventListener('financialsUpdated', handleDataChange);
        window.addEventListener('shipmentsUpdated', handleDataChange);
        
        return () => {
            window.removeEventListener('storage', handleDataChange);
            window.removeEventListener('focus', handleDataChange);
            window.removeEventListener('financialsUpdated', handleDataChange);
            window.removeEventListener('shipmentsUpdated', handleDataChange);
        };
    }, []);

    const handleApproval = (approved: boolean) => {
        if (!viewingItem) return;

        if (viewingItem.type === 'finance') {
            const updatedEntries = getFinancialEntries().map(e => {
                if (e.id === viewingItem.item.id) {
                    // Only change status if approved. Rejection keeps it pending.
                    const newStatus: FinancialEntry['status'] = approved ? 'Aberto' : 'Pendente de Aprovação';
                    return { ...e, status: newStatus };
                }
                return e;
            });
            saveFinancialEntries(updatedEntries);
            toast({
                title: `Despesa ${approved ? 'Aprovada' : 'Rejeitada'}`,
                description: `A despesa para ${viewingItem.item.partner} foi atualizada.`,
                className: approved ? 'bg-success text-success-foreground' : ''
            });
        } else if (viewingItem.type === 'operations') {
            const { charge, shipment } = viewingItem.item;
            const allShipments = getShipments();
            const updatedShipments = allShipments.map(s => {
                if (s.id === shipment.id) {
                    const originalCharge = shipment.charges.find(c => c.id === charge.id);
                    const newApprovalLog: ApprovalLog = {
                        timestamp: new Date(),
                        user: 'Admin Geral', // Em um app real, viria do contexto de autenticação
                        chargeName: charge.name,
                        originalValue: `${originalCharge?.saleCurrency} ${originalCharge?.sale.toFixed(2)}`,
                        newValue: `${charge.saleCurrency} ${charge.sale.toFixed(2)}`,
                        justification: charge.justification || 'N/A',
                        status: approved ? 'approved' : 'rejected',
                    };
                    const updatedCharges = s.charges.map(c => {
                        if (c.id === charge.id) {
                            return { ...c, approvalStatus: approved ? 'aprovada' : 'rejeitada', justification: undefined };
                        }
                        return c;
                    });
                    return { ...s, charges: updatedCharges, approvalLogs: [...(s.approvalLogs || []), newApprovalLog] };
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
        setViewingItem(null);
        fetchPendingItems(); // Refresh the list
    };
    
    const renderFinanceItem = (item: FinancialEntry) => (
        <div className="flex-1 cursor-pointer" onClick={() => setViewingItem({ type: 'finance', item })}>
            <p className="text-sm font-medium leading-none">{item.description || `Despesa para ${item.partner}`}</p>
            <p className="text-sm text-muted-foreground">
                <Badge variant="secondary" className="mr-2">{item.expenseType}</Badge>
                {item.currency} {item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
        </div>
    );

    const renderOperationsItem = (item: { charge: QuoteCharge; shipment: Shipment }) => (
         <div className="flex-1 cursor-pointer" onClick={() => setViewingItem({ type: 'operations', item })}>
            <p className="text-sm font-medium leading-none">Aprovar alteração de despesa</p>
            <p className="text-sm text-muted-foreground">
                <Badge variant="secondary" className="mr-2">Processo {item.shipment.id}</Badge>
                {item.charge.name}: {item.charge.saleCurrency} {item.charge.sale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
        </div>
    );
    
    const renderDialogContent = () => {
        if (!viewingItem) return null;

        if (viewingItem.type === 'finance') {
            const { item } = viewingItem;
            return (
                <>
                <DialogHeader>
                    <DialogTitle>Aprovação de Despesa Financeira</DialogTitle>
                    <DialogDescription>
                        Revise os detalhes da despesa antes de aprovar.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Fornecedor:</span> <span className="font-semibold">{item.partner}</span></div>
                    <div className="flex justify-between"><span>Descrição:</span> <span className="font-semibold">{item.description}</span></div>
                    <div className="flex justify-between"><span>Valor:</span> <span className="font-semibold">{item.currency} {item.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
                    <div className="flex justify-between"><span>Vencimento:</span> <span className="font-semibold">{new Date(item.dueDate).toLocaleDateString('pt-BR')}</span></div>
                    <div className="flex justify-between"><span>Tipo:</span> <span className="font-semibold">{item.expenseType}</span></div>
                </div>
                </>
            );
        }

        if (viewingItem.type === 'operations') {
            const { charge, shipment } = viewingItem.item;
            // Safe check for the original shipment and charge
            const originalShipment = getShipments().find(s => s.id === shipment.id);
            const originalCharge = originalShipment?.charges.find(c => c.id === charge.id);

            return (
                 <DialogHeader>
                    <DialogTitle>Aprovação de Alteração Operacional</DialogTitle>
                    <DialogDescription>
                        Revise a alteração de despesa para o processo <span className="font-semibold">{shipment.id}</span>.
                    </DialogDescription>
                    <div className="space-y-4 pt-4 text-sm">
                        <p><strong>Taxa:</strong> {charge.name}</p>
                         {charge.justification && (
                            <div className="p-3 border rounded-md bg-amber-50 border-amber-200">
                                <p className="font-semibold">Justificativa da alteração:</p>
                                <p className="text-muted-foreground">"{charge.justification}"</p>
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 p-2 border rounded-md">
                            <span className="font-semibold"></span>
                            <span className="font-semibold text-muted-foreground">Original</span>
                            <span className="font-semibold">Novo Valor</span>
                            
                            <span className="text-muted-foreground">Custo:</span>
                            <span className="text-muted-foreground">{originalCharge?.costCurrency} {originalCharge?.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2}) ?? 'N/A'}</span>
                            <span className="font-bold flex items-center">{charge.costCurrency} {charge.cost.toLocaleString('pt-BR', {minimumFractionDigits: 2})} <ArrowRight className="h-4 w-4 ml-1 text-primary"/></span>

                            <span className="text-muted-foreground">Venda:</span>
                            <span className="text-muted-foreground">{originalCharge?.saleCurrency} {originalCharge?.sale.toLocaleString('pt-BR', {minimumFractionDigits: 2}) ?? 'N/A'}</span>
                            <span className="font-bold flex items-center">{charge.saleCurrency} {charge.sale.toLocaleString('pt-BR', {minimumFractionDigits: 2})} <ArrowRight className="h-4 w-4 ml-1 text-primary"/></span>
                        </div>
                        <p className="text-xs text-muted-foreground">Solicitado por: {shipment.responsibleUser || 'Não definido'}</p>
                    </div>
                </DialogHeader>
            )
        }
    };


    return (
        <>
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
                        {pendingItems.length > 0 ? pendingItems.map((approvalItem, index) => {
                            const key = approvalItem.type === 'finance'
                                ? approvalItem.item.id
                                : approvalItem.item.charge.id;
                            return (
                                <div key={`${approvalItem.type}-${key}-${index}`} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                                     <div className="pt-1">
                                        {approvalItem.type === 'finance' ? <DollarSign className="h-5 w-5 text-blue-500" /> : <Settings className="h-5 w-5 text-orange-500" />}
                                    </div>
                                    {approvalItem.type === 'finance' 
                                        ? renderFinanceItem(approvalItem.item as FinancialEntry) 
                                        : renderOperationsItem(approvalItem.item as { charge: QuoteCharge; shipment: Shipment })}
                                </div>
                            );
                        }) : (
                            <div className="text-center text-muted-foreground py-10">
                                <CheckCircle className="mx-auto h-12 w-12 text-success mb-2" />
                                <p>Nenhuma pendência de aprovação.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
        <Dialog open={!!viewingItem} onOpenChange={(isOpen) => !isOpen && setViewingItem(null)}>
            <DialogContent>
                {renderDialogContent()}
                 <DialogFooter>
                    <Button variant="destructive" onClick={() => handleApproval(false)}>
                        <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                    </Button>
                    <Button className="bg-success hover:bg-success/90" onClick={() => handleApproval(true)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}
