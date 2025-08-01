
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  DollarSign,
  Send,
  FileText,
  Banknote,
  PlusCircle,
  ShieldAlert,
  Loader2,
  Printer,
  Gavel,
  Check,
  Split,
  HandCoins,
} from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';
import { FinancialEntry, BankAccount, PartialPayment, saveBankAccounts, saveFinancialEntries, getStoredFinancialEntries, getStoredBankAccounts } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { BankAccountDialog } from '@/components/financials/bank-account-form';
import { NfseGenerationDialog } from '@/components/financials/nfse-generation-dialog';
import type { Shipment } from '@/lib/shipment-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankAccountStatementDialog } from '@/components/financials/bank-account-statement-dialog';
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runSendQuote, savePartnerAction, addFinancialEntriesAction, updateFinancialEntryAction } from '@/app/actions';
import { FinancialEntryImporter } from '@/components/financials/financial-entry-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialDetailsDialog } from '@/components/financials/financial-details-dialog';
import { Input } from '@/components/ui/input';
import { SendToLegalDialog } from '@/components/financials/send-to-legal-dialog';
import { getStoredShipments } from '@/lib/shipment-data';
import { FinancialEntryDialog } from '@/components/financials/financial-entry-dialog';
import { RenegotiationDialog } from '@/components/financials/renegotiation-dialog';
import { NfseConsulta } from '@/components/financials/nfse-consulta';
import { PartnersRegistry } from '@/components/partners-registry';
import { Partner, getStoredPartners } from '@/lib/partners-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { CommissionManagement } from '@/components/financials/commission-management';


type Status = 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico' | 'Pendente de Aprovação' | 'Renegociado';
const allStatuses: Status[] = ['Aberto', 'Vencido', 'Parcialmente Pago', 'Pago', 'Pendente de Aprovação'];

interface EntriesTableProps {
    tableEntries: FinancialEntry[];
    selectedRows: Set<string>;
    toggleRowSelection: (id: string, isChecked: boolean) => void;
    isLegalTable?: boolean;
    handleProcessClick: (entry: FinancialEntry) => void;
    handleOpenSettleDialog: (entry: FinancialEntry) => void;
    handleOpenNfseDialog: (entry: FinancialEntry) => void;
    setEntryToRenegotiate: (entry: FinancialEntry | null) => void;
    handleOpenLegalDialog: (entry: FinancialEntry) => void;
    isGenerating: boolean;
    handleGenerateClientInvoicePdf: (entry: FinancialEntry) => void;
    handleGenerateAgentInvoicePdf: (entry: FinancialEntry) => void;
    handleResendInvoice: (entry: FinancialEntry) => void;
    getEntryStatus: (entry: FinancialEntry) => { status: Status; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
    getBalanceInBRL: (entry: FinancialEntry) => number;
    handleLegalEntryUpdate: (entryId: string, field: 'legalStatus' | 'processoJudicial' | 'legalComments', value: any) => Promise<void>;
}


const EntriesTable = ({
    tableEntries,
    selectedRows,
    toggleRowSelection,
    isLegalTable = false,
    handleProcessClick,
    handleLegalEntryUpdate,
    handleOpenSettleDialog,
    handleOpenNfseDialog,
    setEntryToRenegotiate,
    handleOpenLegalDialog,
    isGenerating,
    handleGenerateClientInvoicePdf,
    handleGenerateAgentInvoicePdf,
    handleResendInvoice,
    getEntryStatus,
    getBalanceInBRL,
}: EntriesTableProps) => {
    return (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                {!isLegalTable && <TableHead className="w-10">
                    <Checkbox
                        checked={selectedRows.size > 0 && tableEntries.length > 0 && tableEntries.every(e => selectedRows.has(e.id))}
                        onCheckedChange={(checked) => {
                            tableEntries.forEach(e => toggleRowSelection(e.id, !!checked));
                        }}
                        aria-label="Selecionar todos"
                    />
                </TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead>{isLegalTable ? 'Nº Processo Judicial' : 'Processo LTI'}</TableHead>
                <TableHead className="w-40">Status</TableHead>
                {isLegalTable && <TableHead>Comentários</TableHead>}
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo (BRL)</TableHead>
                <TableHead className="text-center">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableEntries.length > 0 ? tableEntries.map((entry) => {
                    const { status, variant } = getEntryStatus(entry);
                    const balanceBRL = getBalanceInBRL(entry);
                    return (
                        <TableRow key={entry.id} data-state={selectedRows.has(entry.id) && "selected"} className={isLegalTable ? 'cursor-pointer' : ''} onClick={() => isLegalTable && handleProcessClick(entry)}>
                            {!isLegalTable && <TableCell>
                                <Checkbox
                                    checked={selectedRows.has(entry.id)}
                                    onCheckedChange={(checked) => toggleRowSelection(entry.id, !!checked)}
                                    aria-label="Selecionar linha"
                                />
                            </TableCell>}
                            <TableCell>
                                <Badge variant={entry.type === 'credit' ? 'success' : 'destructive'} className="capitalize">{entry.type === 'credit' ? 'Crédito' : 'Débito'}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{entry.partner}</TableCell>
                            <TableCell>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry); }} className="text-muted-foreground hover:text-primary hover:underline">
                                    {entry.invoiceId}
                                </a>
                            </TableCell>
                            <TableCell>
                                {isLegalTable ? (
                                    <Input
                                        value={entry.processoJudicial || ''}
                                        onChange={(e) => handleLegalEntryUpdate(entry.id, 'processoJudicial', e.target.value)}
                                        placeholder="Adicionar nº"
                                        className="h-8 text-xs bg-transparent border-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry); }} className="text-muted-foreground hover:text-primary hover:underline">
                                        {entry.processId}
                                    </a>
                                )}
                            </TableCell>
                            <TableCell>
                                {isLegalTable ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Select
                                            value={entry.legalStatus}
                                            onValueChange={(value) => handleLegalEntryUpdate(entry.id, 'legalStatus', value)}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-transparent border-0"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Extrajudicial">Extrajudicial</SelectItem>
                                                <SelectItem value="Fase Inicial">Fase Inicial</SelectItem>
                                                <SelectItem value="Fase de Execução">Fase de Execução</SelectItem>
                                                <SelectItem value="Desconsideração da Personalidade Jurídica">Desconsideração PJ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <Badge variant={variant} className="capitalize w-[130px] justify-center">{status}</Badge>
                                )}
                            </TableCell>
                            {isLegalTable && (
                                 <TableCell className="w-64">
                                    <Input
                                        value={entry.legalComments || ''}
                                        onChange={(e) => handleLegalEntryUpdate(entry.id, 'legalComments', e.target.value)}
                                        placeholder="Adicionar comentário..."
                                        className="h-8 text-xs bg-transparent border-0"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </TableCell>
                            )}
                            <TableCell className={cn(variant === 'destructive' && !isLegalTable && 'text-destructive font-bold')}>
                                {format(new Date(entry.dueDate), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {entry.currency} {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                             <TableCell className={cn("text-right font-mono font-bold", entry.type === 'credit' ? 'text-success' : 'text-destructive')}>
                                R$ {balanceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGenerating}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleProcessClick(entry)}>
                                            <FileText className="mr-2 h-4 w-4" /> Detalhes do Processo
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGenerateClientInvoicePdf(entry)} disabled={entry.type === 'debit'}>
                                            <Printer className="mr-2 h-4 w-4" /> Emitir Fatura (PDF)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGenerateAgentInvoicePdf(entry)} disabled={entry.type === 'credit'}>
                                            <Printer className="mr-2 h-4 w-4" /> Imprimir Invoice Agente
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleResendInvoice(entry)}>
                                            <Send className="mr-2 h-4 w-4" /> Reenviar Fatura
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOpenSettleDialog(entry)} disabled={status === 'Pago' || status === 'Renegociado'}>
                                            <DollarSign className="mr-2 h-4 w-4" /> Baixar Pagamento
                                        </DropdownMenuItem>
                                        {entry.type === 'credit' && !isLegalTable && (
                                            <>
                                                <DropdownMenuItem onClick={() => handleOpenNfseDialog(entry)}>
                                                    <FileText className="mr-2 h-4 w-4" /> Emitir NF de Serviço
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setEntryToRenegotiate(entry)} className="text-blue-600 focus:text-blue-700">
                                                    <Split className="mr-2 h-4 w-4" /> Renegociar Dívida
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleOpenLegalDialog(entry)} className="text-destructive focus:text-destructive">
                                                    <Gavel className="mr-2 h-4 w-4" /> Enviar para Jurídico
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                }) : (
                    <TableRow>
                        <TableCell colSpan={isLegalTable ? 8 : 10} className="h-24 text-center">Nenhum lançamento encontrado para este filtro.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
    );
};


export function FinancialPageClient() {
    const router = useRouter();
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [allShipments, setAllShipments] = useState<Shipment[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [entryToSettle, setEntryToSettle] = useState<FinancialEntry | null>(null);
    const [entryToRenegotiate, setEntryToRenegotiate] = useState<FinancialEntry | null>(null);
    const [settlementAccountId, setSettlementAccountId] = useState<string>('');
    const [settlementAmount, setSettlementAmount] = useState<string>('');
    const [exchangeRate, setExchangeRate] = useState<string>('');
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [statementAccount, setStatementAccount] = useState<BankAccount | null>(null);
    const [nfseData, setNfseData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [legalData, setLegalData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [detailsEntry, setDetailsEntry] = useState<FinancialEntry | null>(null);
    const [statusFilter, setStatusFilter] = useState<Status[]>(['Aberto', 'Vencido', 'Parcialmente Pago', 'Pendente de Aprovação']);
    const [textFilters, setTextFilters] = useState({ partner: '', invoiceId: '', processId: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [ptaxRates, setPtaxRates] = useState<Record<string, number>>({});
    const { toast } = useToast();

    useEffect(() => {
        const loadInitialData = async () => {
            setEntries(getStoredFinancialEntries());
            setAccounts(getStoredBankAccounts());
            setAllShipments(getStoredShipments());
            setPartners(getStoredPartners());
            const rates = await exchangeRateService.getRates();
            setPtaxRates(rates);
        };
        loadInitialData();
    }, []);

    const findEntryForPayment = (paymentId: string) => entries.find(e => e.payments?.some(p => p.id === paymentId));

    const findShipmentForEntry = (entry: FinancialEntry) => allShipments.find(s => s.id === entry.processId);

    const getEntryBalance = (entry: FinancialEntry): number => {
        const totalPaid = entry.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
        return entry.amount - totalPaid;
    };
    
    const getEntryStatus = useCallback((entry: FinancialEntry): { status: Status, variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
        if (entry.status === 'Pago') return { status: 'Pago', variant: 'outline' };
        if (entry.status === 'Renegociado') return { status: 'Renegociado', variant: 'secondary' };
        if (entry.status === 'Jurídico') return { status: 'Jurídico', variant: 'destructive' };
        if (entry.status === 'Pendente de Aprovação') return { status: 'Pendente de Aprovação', variant: 'default' };

        const balance = getEntryBalance(entry);
        if (balance <= 0 && entry.amount > 0) {
            return { status: 'Pago', variant: 'outline' };
        }
        if (balance < entry.amount && balance > 0) return { status: 'Parcialmente Pago', variant: 'default' };

        if (isPast(new Date(entry.dueDate)) && !isToday(new Date(entry.dueDate))) return { status: 'Vencido', variant: 'destructive' };
        return { status: 'Aberto', variant: 'secondary' };
    }, []);

    const handleSettlePayment = async () => {
        if (!entryToSettle || !settlementAccountId || !settlementAmount) return;

        const amount = parseFloat(settlementAmount);
        const accountIdNum = parseInt(settlementAccountId);
        const needsRate = entryToSettle.currency !== accounts.find(a => a.id === accountIdNum)?.currency;
        const rate = parseFloat(exchangeRate);

        if (needsRate && (isNaN(rate) || rate <= 0)) {
            toast({ variant: 'destructive', title: 'Taxa de câmbio inválida.' });
            return;
        }

        const newPayment: PartialPayment = {
            id: `pay-${Date.now()}`,
            amount,
            date: new Date().toISOString(),
            accountId: accountIdNum,
            ...(needsRate && { exchangeRate: rate }),
        };

        const response = await updateFinancialEntryAction({ entryId: entryToSettle.id, payment: newPayment, settlementAccountId: accountIdNum });
        if (response.success && response.data) {
            setEntries(response.data.entries);
            setAccounts(response.data.accounts);
            toast({ title: "Pagamento baixado com sucesso!", className: 'bg-success text-success-foreground' });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao baixar pagamento', description: response.error });
        }
        setEntryToSettle(null);
    };

    const handleGenerateClientInvoicePdf = async (entry: FinancialEntry) => {
        const shipment = findShipmentForEntry(entry);
        if (!shipment) {
            toast({ variant: "destructive", title: "Embarque não encontrado", description: "Não é possível gerar a fatura sem um embarque associado." });
            return;
        }
        setIsGenerating(true);
        const partner = partners.find(p => p.name === entry.partner);
        const response = await runGenerateClientInvoicePdf({
            invoiceNumber: entry.invoiceId,
            customerName: entry.partner,
            customerAddress: `${partner?.address?.street}, ${partner?.address?.number}`,
            date: format(new Date(), 'dd/MM/yyyy'),
            dueDate: format(new Date(entry.dueDate), 'dd/MM/yyyy'),
            charges: shipment.charges.map(c => ({
                description: c.name,
                value: c.sale.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                currency: c.saleCurrency
            })),
            total: `${entry.currency} ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            bankDetails: { bankName: "LTI GLOBAL", accountNumber: "PIX: 10.298.168/0001-89" }
        });

        if (response.success && response.data?.html) {
             const newWindow = window.open();
             newWindow?.document.write(response.data.html);
        } else {
            toast({ variant: "destructive", title: "Erro ao gerar PDF", description: response.error });
        }
        setIsGenerating(false);
    };

    const handleGenerateAgentInvoicePdf = async (entry: FinancialEntry) => {
        const shipment = findShipmentForEntry(entry);
        if (!shipment || !shipment.agent) {
            toast({ variant: "destructive", title: "Dados do agente ou embarque não encontrados." });
            return;
        }
        setIsGenerating(true);
        const response = await runGenerateAgentInvoicePdf({
             invoiceNumber: entry.invoiceId,
             processId: shipment.id,
             agentName: shipment.agent.name,
             date: format(new Date(), 'dd/MM/yyyy'),
             charges: shipment.charges.map(c => {
                 const profit = (c.sale * (c.saleCurrency === 'BRL' ? 1/5.25 : 1)) - (c.cost * (c.costCurrency === 'BRL' ? 1/5.25 : 1));
                 return {
                    description: c.name,
                    cost: c.cost.toFixed(2),
                    sale: c.sale.toFixed(2),
                    profit: profit.toFixed(2),
                    currency: 'USD'
                 }
             }),
             totalCost: shipment.charges.reduce((sum, c) => sum + c.cost, 0).toFixed(2),
             totalSale: shipment.charges.reduce((sum, c) => sum + c.sale, 0).toFixed(2),
             totalProfit: shipment.charges.reduce((sum, c) => sum + (c.sale-c.cost), 0).toFixed(2),
             currency: 'USD',
        });

        if (response.success && response.data?.html) {
             const newWindow = window.open();
             newWindow?.document.write(response.data.html);
        } else {
            toast({ variant: "destructive", title: "Erro ao gerar PDF", description: response.error });
        }
        setIsGenerating(false);
    }
    
    const handleResendInvoice = async (entry: FinancialEntry) => {
        setIsGenerating(true);
        const shipment = findShipmentForEntry(entry);
        if (!shipment || !shipment.agent) {
             toast({ variant: "destructive", title: "Embarque ou agente não encontrados" });
             setIsGenerating(false);
             return;
        }
        
        const response = await runSendQuote({
            customerName: entry.partner,
            quoteId: entry.invoiceId,
            rateDetails: {
                origin: shipment.origin,
                destination: shipment.destination,
                carrier: shipment.carrier || 'N/A',
                transitTime: shipment.details.transitTime,
                finalPrice: `${entry.currency} ${entry.amount.toFixed(2)}`,
            },
            approvalLink: `https://cargainteligente.com/pay/${entry.id}`,
            rejectionLink: `https://cargainteligente.com/dispute/${entry.id}`,
            isInvoice: true,
            isClientAgent: shipment.agent?.name === entry.partner
        });
        
        if (response.success && response.data) {
             console.log("----- SIMULATING INVOICE EMAIL -----");
             console.log("SUBJECT:", response.data.emailSubject);
             console.log("BODY (HTML):", response.data.emailBody);
             toast({ title: 'Fatura enviada (simulação)', description: `E-mail para ${entry.partner} gerado no console.` });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao gerar e-mail', description: response.error });
        }
        setIsGenerating(false);
    }

    const toggleRowSelection = (id: string, isChecked: boolean) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleStatusFilterChange = (status: Status, checked: boolean) => {
        setStatusFilter(prev => {
            if (checked) {
                return [...prev, status];
            } else {
                return prev.filter(s => s !== status);
            }
        });
    };
    
    const handleOpenNfseDialog = (entry: FinancialEntry) => {
        const shipment = findShipmentForEntry(entry);
        if(!shipment) {
            toast({ variant: "destructive", title: "Embarque não encontrado", description: "Não é possível emitir NFS-e sem um embarque." });
            return;
        }
        setNfseData({ entry, shipment });
    };

    const handleOpenLegalDialog = (entry: FinancialEntry) => {
        const shipment = findShipmentForEntry(entry);
        if (!shipment) {
             toast({ variant: "destructive", title: "Embarque não encontrado", description: "Não é possível enviar para o jurídico sem um embarque." });
            return;
        }
        setLegalData({ entry, shipment });
    };

    const handleProcessClick = (entry: FinancialEntry) => {
        setDetailsEntry(entry);
    };

    const handleCloseDetails = () => {
        setDetailsEntry(null);
    };

    const handleDetailsEntryUpdate = async (entry: FinancialEntry) => {
        const response = await updateFinancialEntryAction(entry);
        if (response.success && response.data) {
            setEntries(response.data.entries);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao atualizar', description: response.error });
        }
    };
    
    const handleLegalEntryUpdate = async (entryId: string, field: 'legalStatus' | 'processoJudicial' | 'legalComments', value: any) => {
        const entry = entries.find(e => e.id === entryId);
        if (entry) {
            const updatedEntry = { ...entry, [field]: value };
            const response = await updateFinancialEntryAction(updatedEntry);
            if (response.success && response.data) {
                setEntries(response.data.entries);
            } else {
                 toast({ variant: 'destructive', title: 'Erro ao atualizar', description: response.error });
            }
        }
    };

    const handleSendToLegal = async (entry: FinancialEntry) => {
        const response = await updateFinancialEntryAction({ ...entry, status: 'Jurídico', legalStatus: 'Fase Inicial' });
        if (response.success && response.data) {
            setEntries(response.data.entries);
            setAccounts(response.data.accounts);
            setLegalData(null);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao mover para jurídico', description: response.error });
        }
    };

    const handleRenegotiation = async (installments: Omit<FinancialEntry, 'id'>[]) => {
        if (!entryToRenegotiate) return;
        
        // Mark original entry as Renegociado
        await updateFinancialEntryAction({ ...entryToRenegotiate, status: 'Renegociado' });
        
        // Add new installment entries
        const response = await addFinancialEntriesAction(installments);
        
        if(response.success && response.data) {
            setEntries(response.data);
            toast({
                title: 'Renegociação Salva!',
                description: `${installments.length} novas faturas de parcela foram criadas.`,
                className: 'bg-success text-success-foreground'
            });
            setEntryToRenegotiate(null);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao salvar renegociação', description: response.error });
            // Revert original entry status if installments fail
            await updateFinancialEntryAction(entryToRenegotiate);
        }
    }

    const handleOpenSettleDialog = (entry: FinancialEntry) => {
        const balance = getEntryBalance(entry);
        setSettlementAmount(balance.toFixed(2));
        setSettlementAccountId('');
        setExchangeRate('');
        setEntryToSettle(entry);
    };

    const handleTextFilterChange = (filterName: keyof typeof textFilters, value: string) => {
        setTextFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const handlePartnerSaved = async (partnerToSave: Partner) => {
        const response = await savePartnerAction(partnerToSave);
        if (response.success && response.data) {
            setPartners(response.data);
            window.dispatchEvent(new Event('partnersUpdated'));
        } else {
            toast({ variant: 'destructive', title: 'Erro ao salvar parceiro', description: response.error });
        }
    };

    const getBalanceInBRL = (entry: FinancialEntry): number => {
        const balance = getEntryBalance(entry);
        if (entry.currency === 'BRL') return balance;
        
        const partner = partners.find(p => p.name === entry.partner);
        const agio = partner?.exchangeRateAgio ?? 0;
        const rate = (ptaxRates[entry.currency] || 0) * (1 + (agio / 100));
        
        return balance * rate;
    }

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const statusInfo = getEntryStatus(entry);
            const statusMatch = statusFilter.includes(statusInfo.status);
            const partnerMatch = !textFilters.partner || entry.partner.toLowerCase().includes(textFilters.partner.toLowerCase());
            const invoiceMatch = !textFilters.invoiceId || entry.invoiceId.toLowerCase().includes(textFilters.invoiceId.toLowerCase());
            const processMatch = !textFilters.processId || entry.processId.toLowerCase().includes(textFilters.processId.toLowerCase());
            return statusMatch && partnerMatch && invoiceMatch && processMatch;
        });
    }, [entries, statusFilter, textFilters, getEntryStatus]);
    
    const handleSaveAccount = (account: BankAccount) => {
        const updatedAccounts = [...accounts];
        if (editingAccount && editingAccount.id) {
            const index = updatedAccounts.findIndex(a => a.id === editingAccount.id);
            if (index > -1) {
                updatedAccounts[index] = { ...account, id: editingAccount.id };
            }
        } else {
            const newId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
            updatedAccounts.push({ ...account, id: newId });
        }
        setAccounts(updatedAccounts);
        saveBankAccounts(updatedAccounts);
        setEditingAccount(null);
    };

    const handleSaveEntry = async (entryData: Omit<FinancialEntry, 'id'>) => {
        const response = await addFinancialEntriesAction([entryData]);
        if (response.success && response.data) {
            setEntries(response.data);
            toast({
                title: "Despesa enviada para aprovação!",
                className: 'bg-success text-success-foreground'
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar despesa',
                description: response.error
            });
        }
        setIsEntryDialogOpen(false);
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Módulo Financeiro
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Gerencie suas contas, faturas, notas fiscais e processos jurídicos.
                </p>
            </header>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {accounts.map(account => (
                    <Card key={account.id} className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setStatementAccount(account)}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                            <Banknote className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{account.currency} {account.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                            <p className="text-xs text-muted-foreground">{account.bankName}</p>
                        </CardContent>
                    </Card>
                ))}
                 <Button variant="outline" className="h-full" onClick={() => setEditingAccount({} as BankAccount)}>
                    <div className="flex flex-col items-center justify-center">
                        <PlusCircle className="h-6 w-6 mb-2"/>
                        <span className="text-sm">Nova Conta</span>
                    </div>
                </Button>
            </div>

            <Tabs defaultValue="lancamentos" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                    <TabsTrigger value="comissoes">Comissões</TabsTrigger>
                    <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
                    <TabsTrigger value="consulta_nfse">Consulta NFS-e</TabsTrigger>
                    <TabsTrigger value="juridico">Jurídico</TabsTrigger>
                </TabsList>

                <TabsContent value="lancamentos" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <CardTitle>Lançamentos Financeiros</CardTitle>
                                    <CardDescription>Visualize e gerencie todas as suas contas a pagar e a receber.</CardDescription>
                                </div>
                                <Button onClick={() => setIsEntryDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/>
                                    Nova Despesa
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border rounded-lg bg-secondary/50 flex flex-col md:flex-row gap-4 items-center">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-grow">
                                    <Input placeholder="Buscar por parceiro..." value={textFilters.partner} onChange={(e) => handleTextFilterChange('partner', e.target.value)} />
                                    <Input placeholder="Buscar por fatura..." value={textFilters.invoiceId} onChange={(e) => handleTextFilterChange('invoiceId', e.target.value)} />
                                    <Input placeholder="Buscar por processo..." value={textFilters.processId} onChange={(e) => handleTextFilterChange('processId', e.target.value)} />
                                </div>
                                <FinancialEntryImporter onEntriesImported={() => {}} />
                            </div>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <Label className="font-semibold self-center">Filtrar por Status:</Label>
                            {allStatuses.map((s) => (
                                <div key={s} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`status-${s}`}
                                        checked={statusFilter.includes(s)}
                                        onCheckedChange={(checked) => handleStatusFilterChange(s, !!checked)}
                                    />
                                    <label htmlFor={`status-${s}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {s}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <EntriesTable
                            tableEntries={filteredEntries.filter(e => e.status !== 'Jurídico')}
                            selectedRows={selectedRows}
                            toggleRowSelection={toggleRowSelection}
                            handleProcessClick={handleProcessClick}
                            handleLegalEntryUpdate={handleLegalEntryUpdate}
                            handleOpenSettleDialog={handleOpenSettleDialog}
                            handleOpenNfseDialog={handleOpenNfseDialog}
                            setEntryToRenegotiate={setEntryToRenegotiate}
                            handleOpenLegalDialog={handleOpenLegalDialog}
                            isGenerating={isGenerating}
                            handleGenerateClientInvoicePdf={handleGenerateClientInvoicePdf}
                            handleGenerateAgentInvoicePdf={handleGenerateAgentInvoicePdf}
                            handleResendInvoice={handleResendInvoice}
                            getEntryStatus={getEntryStatus}
                            getBalanceInBRL={getBalanceInBRL}
                        />
                    </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parceiros" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cadastro de Parceiros</CardTitle>
                            <CardDescription>Gerencie seus clientes, fornecedores e agentes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PartnersRegistry partners={partners} onPartnerSaved={handlePartnerSaved} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="comissoes" className="mt-6">
                    <CommissionManagement partners={partners} shipments={allShipments} exchangeRates={ptaxRates} />
                </TabsContent>

                <TabsContent value="consulta_nfse" className="mt-6">
                    <NfseConsulta />
                </TabsContent>

                 <TabsContent value="juridico" className="mt-6">
                     <Card>
                         <CardHeader>
                             <div className="flex justify-between items-center">
                                 <div>
                                     <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5 text-destructive"/> Processos em Jurídico</CardTitle>
                                     <CardDescription>Faturas que foram enviadas para cobrança judicial ou protesto.</CardDescription>
                                 </div>
                                 <FinancialEntryImporter onEntriesImported={() => {}} importType="legal"/>
                             </div>
                         </CardHeader>
                         <CardContent>
                              <EntriesTable
                                tableEntries={entries.filter(e => e.status === 'Jurídico')}
                                selectedRows={selectedRows}
                                toggleRowSelection={toggleRowSelection}
                                isLegalTable={true}
                                handleProcessClick={handleProcessClick}
                                handleLegalEntryUpdate={handleLegalEntryUpdate}
                                handleOpenSettleDialog={handleOpenSettleDialog}
                                handleOpenNfseDialog={handleOpenNfseDialog}
                                setEntryToRenegotiate={setEntryToRenegotiate}
                                handleOpenLegalDialog={handleOpenLegalDialog}
                                isGenerating={isGenerating}
                                handleGenerateClientInvoicePdf={handleGenerateClientInvoicePdf}
                                handleGenerateAgentInvoicePdf={handleGenerateAgentInvoicePdf}
                                handleResendInvoice={handleResendInvoice}
                                getEntryStatus={getEntryStatus}
                                getBalanceInBRL={getBalanceInBRL}
                              />
                         </CardContent>
                     </Card>
                 </TabsContent>
            </Tabs>
      
        <AlertDialog open={!!entryToSettle}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Baixa de Pagamento</AlertDialogTitle>
                    <AlertDialogDescription>Fatura {entryToSettle?.invoiceId} | Saldo: {entryToSettle?.currency} {entryToSettle && getEntryBalance(entryToSettle).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="settlement-amount">Valor do Pagamento</Label>
                        <Input id="settlement-amount" value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} type="number" placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="settlement-account">Conta Bancária</Label>
                        <Select onValueChange={setSettlementAccountId} value={settlementAccountId}>
                            <SelectTrigger id="settlement-account"><SelectValue placeholder="Selecione a conta..." /></SelectTrigger>
                            <SelectContent>
                                {accounts.map(account => (
                                    <SelectItem key={account.id} value={account.id.toString()}>{account.name} ({account.currency})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {entryToSettle && settlementAccountId && entryToSettle.currency !== accounts.find(a => a.id.toString() === settlementAccountId)?.currency && (
                        <div className="p-2 border rounded-md bg-secondary/50 animate-in fade-in-50">
                            <div className="space-y-1">
                                <Label htmlFor="exchange-rate"> Taxa de Câmbio (Fatura {entryToSettle?.currency} → Conta {accounts.find(a => a.id.toString() === settlementAccountId)?.currency})</Label>
                                <Input id="exchange-rate" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} type="number" placeholder="Ex: 5.43" />
                            </div>
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEntryToSettle(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettlePayment}>
                        <Check className="mr-2 h-4 w-4"/>Confirmar Baixa
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <BankAccountDialog isOpen={!!editingAccount} onClose={() => setEditingAccount(null)} onSave={handleSaveAccount} account={editingAccount} />
        <FinancialEntryDialog isOpen={isEntryDialogOpen} onClose={() => setIsEntryDialogOpen(false)} onSave={handleSaveEntry} />
        
        <BankAccountStatementDialog
            account={statementAccount}
            entries={entries}
            isOpen={!!statementAccount}
            onClose={() => setStatementAccount(null)}
        />

        <RenegotiationDialog
            isOpen={!!entryToRenegotiate}
            onClose={() => setEntryToRenegotiate(null)}
            entry={entryToRenegotiate}
            onConfirm={handleRenegotiation}
        />

        <NfseGenerationDialog
            isOpen={!!nfseData}
            onClose={() => setNfseData(null)}
            data={nfseData}
        />

        <SendToLegalDialog
            isOpen={!!legalData}
            onClose={() => setLegalData(null)}
            data={legalData}
            onConfirm={handleSendToLegal}
        />
        <FinancialDetailsDialog
            entry={detailsEntry}
            isOpen={!!detailsEntry}
            onClose={handleCloseDetails}
            onReversePayment={()=>{}}
            findEntryForPayment={findEntryForPayment}
            findShipmentForEntry={findShipmentForEntry}
            onEntryUpdate={handleDetailsEntryUpdate}
        />

    </div>
  );
}
