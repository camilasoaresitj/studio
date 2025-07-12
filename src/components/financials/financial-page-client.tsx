
'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { FinancialEntry, BankAccount, PartialPayment, saveBankAccounts, saveFinancialEntries, getFinancialEntries, getBankAccounts, addFinancialEntry } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { BankAccountDialog } from '@/components/financials/bank-account-form';
import { NfseGenerationDialog } from '@/components/financials/nfse-generation-dialog';
import type { Shipment } from '@/lib/shipment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankAccountStatementDialog } from '@/components/financials/bank-account-statement-dialog';
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runSendQuote } from '@/app/actions';
import { FinancialEntryImporter } from '@/components/financials/financial-entry-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialDetailsDialog } from '@/components/financials/financial-details-dialog';
import { Input } from '@/components/ui/input';
import { SendToLegalDialog } from '@/components/financials/send-to-legal-dialog';
import { getShipments } from '@/lib/shipment';
import { FinancialEntryDialog } from './financial-entry-dialog';

type Status = 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico' | 'Pendente de Aprovação';
const allStatuses: Status[] = ['Aberto', 'Vencido', 'Parcialmente Pago', 'Pago', 'Pendente de Aprovação'];

interface FinancialPageClientProps {
    initialEntries: FinancialEntry[];
    initialAccounts: BankAccount[];
    initialShipments: Shipment[];
}

export function FinancialPageClient({ initialEntries, initialAccounts, initialShipments }: FinancialPageClientProps) {
    const router = useRouter();
    const [entries, setEntries] = useState<FinancialEntry[]>(initialEntries);
    const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
    const [allShipments, setAllShipments] = useState<Shipment[]>(initialShipments);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [entryToSettle, setEntryToSettle] = useState<FinancialEntry | null>(null);
    const [settlementAccountId, setSettlementAccountId] = useState<string>('');
    const [settlementAmount, setSettlementAmount] = useState<string>('');
    const [exchangeRate, setExchangeRate] = useState<string>('');
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
    const [statementAccount, setStatementAccount] = useState<BankAccount | null>(null);
    const [nfseData, setNfseData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [legalData, setLegalData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [detailsShipment, setDetailsShipment] = useState<(Shipment & { payments?: PartialPayment[] }) | null>(null);
    const [statusFilter, setStatusFilter] = useState<string[]>(['Aberto', 'Parcialmente Pago', 'Vencido', 'Pendente de Aprovação']);
    const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
    const [textFilters, setTextFilters] = useState({ partner: '', processId: '', value: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const handleStorageChange = () => {
            setEntries(getFinancialEntries());
            setAccounts(getBankAccounts());
            setAllShipments(getShipments());
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('financialsUpdated', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('financialsUpdated', handleStorageChange);
        };
    }, []);
    
    const getEntryBalance = (entry: FinancialEntry): number => {
        const totalPaid = (entry.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return entry.amount - totalPaid;
    };

    const getEntryStatus = (entry: FinancialEntry): { status: Status; variant: 'default' | 'secondary' | 'destructive' | 'success' } => {
        if (entry.status === 'Pendente de Aprovação') {
            return { status: 'Pendente de Aprovação', variant: 'default' };
        }
        if (entry.status === 'Jurídico') {
            return { status: 'Jurídico', variant: 'default' };
        }
        const balance = getEntryBalance(entry);
        
        if (balance <= 0.009) { // Using a small epsilon for float comparison
            return { status: 'Pago', variant: 'success' };
        }
        if (isPast(new Date(entry.dueDate)) && !isToday(new Date(entry.dueDate))) {
            return { status: 'Vencido', variant: 'destructive' };
        }
        if ((entry.payments?.length || 0) > 0 && balance > 0) {
            return { status: 'Parcialmente Pago', variant: 'default' };
        }
        return { status: 'Aberto', variant: 'secondary' };
    };

    const applyFilters = (entry: FinancialEntry) => {
        const lowerPartner = textFilters.partner.toLowerCase();
        const lowerProcessId = textFilters.processId.toLowerCase();
        const lowerValue = textFilters.value;

        if (lowerPartner && !entry.partner.toLowerCase().includes(lowerPartner)) return false;
        if (lowerProcessId && !entry.processId.toLowerCase().includes(lowerProcessId)) return false;
        if (lowerValue && !entry.amount.toString().includes(lowerValue)) return false;

        return true;
    };

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const { status } = getEntryStatus(entry);
            if (entry.status === 'Jurídico') return false;

            if (!applyFilters(entry)) return false;
            
            const typeMatch = typeFilter === 'all' || entry.type === typeFilter;
            const statusMatch = statusFilter.length === 0 ? true : statusFilter.includes(status);

            return typeMatch && statusMatch;
        });
    }, [entries, statusFilter, typeFilter, textFilters]);
    
    const juridicoEntries = useMemo(() => {
        return entries.filter(e => e.status === 'Jurídico' && applyFilters(e));
    }, [entries, textFilters]);

    const needsExchangeRate = useMemo(() => {
        if (!entryToSettle || !settlementAccountId) return false;
        const account = accounts.find(a => a.id.toString() === settlementAccountId);
        return account && account.currency !== entryToSettle.currency;
    }, [entryToSettle, settlementAccountId, accounts]);
    
    const handleSettlePayment = () => {
        if (!entryToSettle || !settlementAccountId || !settlementAmount) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Todos os campos são obrigatórios.' });
            return;
        }
        if (needsExchangeRate && !exchangeRate) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Taxa de câmbio é obrigatória.' });
            return;
        }
        const amount = parseFloat(settlementAmount);
        const balance = getEntryBalance(entryToSettle);
        if (amount > balance + 0.01) { // Add tolerance for floating point issues
            toast({ variant: 'destructive', title: 'Valor Inválido', description: 'O valor do pagamento não pode ser maior que o saldo devedor.' });
            return;
        }

        const newPayment: PartialPayment = {
            id: `pay-${Date.now()}`,
            amount,
            date: new Date().toISOString(),
            accountId: parseInt(settlementAccountId, 10),
            exchangeRate: needsExchangeRate ? parseFloat(exchangeRate) : undefined,
        };

        const updatedEntries = entries.map(e => {
            if (e.id === entryToSettle.id) {
                const updatedPayments = [...(e.payments || []), newPayment];
                const newBalance = getEntryBalance({ ...e, payments: updatedPayments });
                // If payment settles the balance, update status.
                const newStatus = newBalance <= 0.009 ? 'Pago' : e.status;
                return { ...e, payments: updatedPayments, status: newStatus as Status };
            }
            return e;
        });

        const accountToUpdate = accounts.find(a => a.id.toString() === settlementAccountId);
        if (!accountToUpdate) {
             toast({ variant: 'destructive', title: 'Conta não encontrada' });
             return;
        }
        
        let amountInAccountCurrency = amount;
        if (needsExchangeRate && exchangeRate) {
            amountInAccountCurrency = amount * parseFloat(exchangeRate);
        }

        const updatedAccounts = accounts.map(acc => {
            if (acc.id.toString() === settlementAccountId) {
                const newBalance = entryToSettle.type === 'credit' 
                    ? acc.balance + amountInAccountCurrency 
                    : acc.balance - amountInAccountCurrency;
                return { ...acc, balance: newBalance };
            }
            return acc;
        });
        
        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);
        saveBankAccounts(updatedAccounts);
        setAccounts(updatedAccounts);

        toast({
            title: 'Baixa de Pagamento Realizada!',
            description: `Pagamento de ${entryToSettle.currency} ${amount.toFixed(2)} para a fatura ${entryToSettle.invoiceId} foi registrado.`,
            className: 'bg-success text-success-foreground'
        });
        
        setEntryToSettle(null);
    };
    
    const toggleRowSelection = (id: string) => {
        setSelectedRows(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return newSelection;
        });
    };

    const unifiedSettlementData = useMemo(() => {
        if (selectedRows.size === 0) return null;

        const selectedEntries = entries.filter(e => selectedRows.has(e.id));
        const totalsByCurrency: { [key: string]: number } = {};
        
        selectedEntries.forEach(entry => {
            if (!totalsByCurrency[entry.currency]) {
                totalsByCurrency[entry.currency] = 0;
            }
            const balance = getEntryBalance(entry);
            const value = entry.type === 'credit' ? balance : -balance;
            totalsByCurrency[entry.currency] += value;
        });

        return {
            count: selectedRows.size,
            totalsByCurrency,
        };
    }, [selectedRows, entries]);

    const handleUnifiedSettlement = () => {
        if (!unifiedSettlementData) return;
        
        const totalsString = Object.entries(unifiedSettlementData.totalsByCurrency)
            .map(([currency, total]) => `${currency} ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)
            .join(' | ');

        toast({
            title: 'Baixa Unificada (Simulação)',
            description: `${unifiedSettlementData.count} lançamento(s) selecionado(s). Totais: ${totalsString}`,
            className: 'bg-success text-success-foreground'
        });
        setSelectedRows(new Set());
    };

    const findEntryForPayment = (paymentId: string) => {
        return entries.find(e => e.payments?.some(p => p.id === paymentId));
    };

    const handleReversePayment = (paymentId: string, entryId: string) => {
        const entry = entries.find(e => e.id === entryId);
        const payment = entry?.payments?.find(p => p.id === paymentId);

        if (!entry || !payment) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Pagamento ou lançamento não encontrado.' });
            return;
        }

        const account = accounts.find(a => a.id === payment.accountId);
        if (!account) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Conta bancária associada não encontrada.' });
            return;
        }
        
        // Update financial entries: remove payment and reset status if needed
        const updatedEntries = entries.map(e => {
            if (e.id === entryId) {
                return {
                    ...e,
                    payments: e.payments?.filter(p => p.id !== paymentId),
                    status: 'Aberto' as Status,
                };
            }
            return e;
        });
        
        // Update bank account balance
        let amountInAccountCurrency = payment.amount;
        if (payment.exchangeRate && entry.currency !== account.currency) {
            amountInAccountCurrency = payment.amount * payment.exchangeRate;
        }
        
        const updatedAccounts = accounts.map(acc => {
            if (acc.id === payment.accountId) {
                const newBalance = entry.type === 'credit' 
                    ? acc.balance - amountInAccountCurrency 
                    : acc.balance + amountInAccountCurrency;
                return { ...acc, balance: newBalance };
            }
            return acc;
        });

        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);
        saveBankAccounts(updatedAccounts);
        setAccounts(updatedAccounts);

        toast({
            title: 'Pagamento Revertido!',
            description: `A baixa de ${entry.currency} ${payment.amount.toFixed(2)} foi revertida.`,
            className: 'bg-success text-success-foreground'
        });
    };

    const handleProcessClick = (processId: string) => {
        const shipment = allShipments.find(s => s.id === processId || s.quoteId === processId);
        if (shipment) {
            const relatedEntries = entries.filter(e => e.processId === processId || e.invoiceId === shipment.quoteId);
            const allPayments = relatedEntries.flatMap(e => e.payments || []);
            const shipmentWithPayments = { ...shipment, payments: allPayments };
            setDetailsShipment(shipmentWithPayments as Shipment & { payments: PartialPayment[] });
        } else {
            toast({
                variant: "destructive",
                title: "Processo não encontrado",
                description: `O embarque para o processo ${processId} não foi localizado.`
            });
        }
    };

    const handleOpenNfseDialog = (entry: FinancialEntry) => {
        const relatedShipment = findShipmentForEntry(entry);
        if (relatedShipment) {
            setNfseData({ entry, shipment: relatedShipment });
        } else {
            toast({
                variant: 'destructive',
                title: 'Processo não encontrado',
                description: `Não foi possível encontrar o processo de embarque vinculado a esta fatura.`,
            });
        }
    };
    
    const handleOpenLegalDialog = (entry: FinancialEntry) => {
        const relatedShipment = findShipmentForEntry(entry);
        if (relatedShipment) {
            setLegalData({ entry, shipment: relatedShipment });
        } else {
            toast({
                variant: 'destructive',
                title: 'Processo não encontrado',
                description: `Não foi possível encontrar o processo de embarque vinculado a esta fatura.`,
            });
        }
    };

    const handleAccountSave = (accountToSave: BankAccount) => {
        let updatedAccounts;
        if (accountToSave.id !== 0) { // Existing account
            updatedAccounts = accounts.map(acc => acc.id === accountToSave.id ? accountToSave : acc);
        } else { // New account
            const newId = Math.max(0, ...accounts.map(a => a.id)) + 1;
            updatedAccounts = [...accounts, { ...accountToSave, id: newId }];
        }
        setAccounts(updatedAccounts);
        saveBankAccounts(updatedAccounts);
        toast({
            title: "Conta Bancária Salva!",
            description: `A conta "${accountToSave.name}" foi salva com sucesso.`,
            className: 'bg-success text-success-foreground',
        });
        setEditingAccount(null);
    };

    const handleNewEntrySave = (newEntryData: Omit<FinancialEntry, 'id'>) => {
        addFinancialEntry(newEntryData);
        setEntries(getFinancialEntries()); // Refresh state
        setIsEntryDialogOpen(false);
        toast({
            title: "Despesa Lançada para Aprovação!",
            description: `A despesa para "${newEntryData.partner}" foi enviada.`,
            className: 'bg-success text-success-foreground',
        });
    };

    const openGeneratedHtml = (html: string | undefined, entryId: string) => {
        if (!html) {
            toast({ variant: 'destructive', title: 'Erro ao gerar fatura', description: 'O conteúdo da fatura não pôde ser gerado.' });
            return;
        }
        const newWindow = window.open();
        newWindow?.document.write(html);
        newWindow?.document.close();
    };

    const findShipmentForEntry = (entry: FinancialEntry) => {
        return allShipments.find(s => s.id === entry.processId || s.quoteId === entry.invoiceId);
    };
    
    const handleGenerateClientInvoicePdf = async (entry: FinancialEntry) => {
        setIsGenerating(true);
        const shipment = findShipmentForEntry(entry);
        if (!shipment) {
            toast({ variant: 'destructive', title: 'Processo não encontrado', description: `Não foi possível localizar o processo para a fatura ${entry.invoiceId}` });
            setIsGenerating(false);
            return;
        }

        const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const charges = shipment.charges.map(c => ({
            description: c.name,
            quantity: 1,
            value: formatValue(c.sale),
            total: formatValue(c.sale),
            currency: c.saleCurrency
        }));

        const totalBRL = shipment.charges.reduce((sum, charge) => {
            const rate = charge.saleCurrency === 'USD' ? 5.0 : 1; // Simplified rate
            return sum + (charge.sale * rate);
        }, 0);
        
        const response = await runGenerateClientInvoicePdf({
            invoiceNumber: entry.invoiceId,
            customerName: entry.partner,
            customerAddress: shipment.consignee?.address ? `${shipment.consignee.address.street}, ${shipment.consignee.address.city}` : 'Endereço não disponível',
            date: new Date().toLocaleDateString('pt-br'),
            charges: charges,
            total: formatValue(totalBRL),
            exchangeRate: 5.0, // Simplified rate
            bankDetails: {
                bankName: "LTI GLOBAL",
                accountNumber: "PIX: 10.298.168/0001-89"
            }
        });

        if (response.success) {
            openGeneratedHtml(response.data?.html, entry.invoiceId);
        } else {
             toast({ variant: 'destructive', title: 'Erro ao gerar fatura', description: response.error });
        }
        setIsGenerating(false);
    };

    const handleGenerateAgentInvoicePdf = async (entry: FinancialEntry) => {
        setIsGenerating(true);
        const shipment = findShipmentForEntry(entry);
        if (!shipment || !shipment.agent) {
            toast({ variant: 'destructive', title: 'Processo ou Agente não encontrado' });
            setIsGenerating(false);
            return;
        }

        const formatValue = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const mainCurrency = 'USD'; // Agent invoices are usually in USD

        const charges = shipment.charges.map(c => {
            const profit = (c.saleCurrency === c.costCurrency) ? c.sale - c.cost : 0;
            return {
                description: c.name,
                cost: formatValue(c.cost),
                sale: formatValue(c.sale),
                profit: formatValue(profit),
                currency: c.saleCurrency,
            };
        });

        const totalCost = shipment.charges.reduce((sum, c) => sum + (c.costCurrency === mainCurrency ? c.cost : 0), 0);
        const totalSale = shipment.charges.reduce((sum, c) => sum + (c.saleCurrency === mainCurrency ? c.sale : 0), 0);

        const response = await runGenerateAgentInvoicePdf({
            invoiceNumber: `AINV-${entry.invoiceId}`,
            processId: entry.processId,
            agentName: shipment.agent.name,
            date: new Date().toLocaleDateString('en-US'),
            charges,
            totalCost: formatValue(totalCost),
            totalSale: formatValue(totalSale),
            totalProfit: formatValue(totalSale - totalCost),
            currency: mainCurrency,
        });
        
        if (response.success) {
            openGeneratedHtml(response.data?.html, `agent-${entry.invoiceId}`);
        } else {
             toast({ variant: 'destructive', title: 'Erro ao gerar invoice do agente', description: response.error });
        }
        setIsGenerating(false);
    };
    
    const handleResendInvoice = async (entry: FinancialEntry) => {
        const response = await runSendQuote({
            customerName: entry.partner,
            quoteId: entry.invoiceId,
            rateDetails: {
                origin: 'Diversos',
                destination: 'Diversos',
                carrier: 'N/A',
                transitTime: 'N/A',
                finalPrice: `${entry.currency} ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            },
            approvalLink: `https://cargainteligente.com/pay/${entry.id}`,
            rejectionLink: `https://cargainteligente.com/dispute/${entry.id}`,
            isInvoice: true,
        });

        if (response.success) {
            console.log("----- SIMULATING INVOICE EMAIL SEND -----");
            console.log("SUBJECT:", response.data.emailSubject);
            console.log("BODY (HTML):", response.data.emailBody);
            console.log("---------------------------------------");
            toast({ title: 'Fatura reenviada! (Simulação)', description: `E-mail para ${entry.partner} gerado no console.` });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao reenviar', description: response.error });
        }
    };

    const handleEntriesImported = (importedEntries: FinancialEntry[]) => {
        const currentEntries = entries;
        const updatedEntries = [...currentEntries, ...importedEntries];
        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);
    };

    const handleLegalEntryUpdate = (id: string, field: 'legalStatus' | 'legalComments', value: string) => {
        const updatedEntries = entries.map(entry => {
            if (entry.id === id) {
                return { ...entry, [field]: value };
            }
            return entry;
        });
        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);
    };
    
    const handleSendToLegal = (entry: FinancialEntry) => {
        const updatedEntries = entries.map(e => 
            e.id === entry.id ? { ...e, status: 'Jurídico' as const, legalStatus: 'Fase Inicial' as const } : e
        );
        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);
        setLegalData(null);
    };

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

    const renderEntriesTable = (tableEntries: FinancialEntry[], isLegalTable = false) => (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                {!isLegalTable && <TableHead className="w-10">
                    <Checkbox
                        checked={selectedRows.size > 0 && tableEntries.length > 0 && tableEntries.every(e => selectedRows.has(e.id))}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                setSelectedRows(new Set(tableEntries.map(e => e.id)));
                            } else {
                                setSelectedRows(new Set());
                            }
                        }}
                        aria-label="Selecionar todos"
                    />
                </TableHead>}
                <TableHead>Tipo</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead className="w-40">{isLegalTable ? 'Status Jurídico' : 'Status'}</TableHead>
                {isLegalTable && <TableHead>Comentários</TableHead>}
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-center">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableEntries.length > 0 ? tableEntries.map((entry) => {
                    const { status, variant } = getEntryStatus(entry);
                    const balance = getEntryBalance(entry);
                    return (
                        <TableRow key={entry.id} data-state={selectedRows.has(entry.id) && "selected"}>
                            {!isLegalTable && <TableCell>
                                <Checkbox
                                    checked={selectedRows.has(entry.id)}
                                    onCheckedChange={() => toggleRowSelection(entry.id)}
                                    aria-label="Selecionar linha"
                                />
                            </TableCell>}
                            <TableCell>
                                <Badge variant={entry.type === 'credit' ? 'success' : 'destructive'} className="capitalize">{entry.type === 'credit' ? 'Crédito' : 'Débito'}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{entry.partner}</TableCell>
                            <TableCell>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(isLegalTable ? entry.processId : entry.invoiceId); }} className="text-muted-foreground hover:text-primary hover:underline">
                                    {entry.invoiceId}
                                </a>
                            </TableCell>
                            <TableCell>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry.processId); }} className="text-muted-foreground hover:text-primary hover:underline">
                                    {entry.processId}
                                </a>
                            </TableCell>
                            <TableCell>
                                {isLegalTable ? (
                                    <Select
                                        value={entry.legalStatus}
                                        onValueChange={(value) => handleLegalEntryUpdate(entry.id, 'legalStatus', value)}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Fase Inicial">Fase Inicial</SelectItem>
                                            <SelectItem value="Fase de Execução">Fase de Execução</SelectItem>
                                            <SelectItem value="Desconsideração da Personalidade Jurídica">Desconsideração PJ</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                        className="h-8 text-xs"
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
                                {entry.currency} {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={isGenerating}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleGenerateClientInvoicePdf(entry)} disabled={isGenerating}>
                                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />} 
                                            Visualizar/Imprimir Fatura (Cliente)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGenerateAgentInvoicePdf(entry)} disabled={isGenerating || !findShipmentForEntry(entry)?.agent}>
                                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />} 
                                            Visualizar/Imprimir Invoice (Agente)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleResendInvoice(entry)}>
                                            <Send className="mr-2 h-4 w-4" /> Reenviar Fatura
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleOpenSettleDialog(entry)} disabled={status === 'Pago'}>
                                            <DollarSign className="mr-2 h-4 w-4" /> Baixar Pagamento
                                        </DropdownMenuItem>
                                        {entry.type === 'credit' && !isLegalTable && (
                                            <>
                                                <DropdownMenuItem onClick={() => handleOpenNfseDialog(entry)}>
                                                    <FileText className="mr-2 h-4 w-4" /> Emitir NF de Serviço
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
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
                        <TableCell colSpan={isLegalTable ? 8 : 9} className="h-24 text-center">Nenhum lançamento encontrado para este filtro.</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
    );

    return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Financeiro</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas contas, faturas, notas fiscais e processos jurídicos.
        </p>
      </header>
      
        <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
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
             <Card className="flex flex-col items-center justify-center">
                <CardContent className="p-4">
                    <Button variant="outline" size="sm" onClick={() => setEditingAccount({} as BankAccount)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nova Conta
                    </Button>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="lancamentos" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="nfse">Consulta NFS-e</TabsTrigger>
                <TabsTrigger value="juridico">Jurídico</TabsTrigger>
            </TabsList>

            <TabsContent value="lancamentos" className="mt-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle>Lançamentos Financeiros</CardTitle>
                                <CardDescription>
                                    Visualize e gerencie todas as suas contas a pagar e a receber.
                                </CardDescription>
                            </div>
                            <Button onClick={() => setIsEntryDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Nova Despesa
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <Input placeholder="Filtrar por Parceiro..." value={textFilters.partner} onChange={(e) => handleTextFilterChange('partner', e.target.value)} />
                            <Input placeholder="Filtrar por Processo..." value={textFilters.processId} onChange={(e) => handleTextFilterChange('processId', e.target.value)} />
                            <Input placeholder="Filtrar por Valor..." value={textFilters.value} onChange={(e) => handleTextFilterChange('value', e.target.value)} />
                            <FinancialEntryImporter onEntriesImported={handleEntriesImported} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                            <Label className="font-semibold">Filtrar por Status:</Label>
                            {allStatuses.map((s) => (
                                <div key={s} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`status-${s}`}
                                        checked={statusFilter.includes(s)}
                                        onCheckedChange={(checked) => {
                                            setStatusFilter(prev => 
                                                checked ? [...prev, s] : prev.filter(item => item !== s)
                                            );
                                        }}
                                    />
                                    <label htmlFor={`status-${s}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {s}
                                    </label>
                                </div>
                            ))}
                        </div>
                        {unifiedSettlementData && (
                            <div className="flex items-center justify-between p-3 my-4 border rounded-lg bg-secondary/50 animate-in fade-in-50 duration-300">
                                <div className="text-sm font-medium">
                                    {unifiedSettlementData.count} item(s) selecionado(s). Totais: 
                                    {Object.entries(unifiedSettlementData.totalsByCurrency).map(([currency, total]) => (
                                        <span key={currency} className={cn("font-bold ml-2", total >= 0 ? 'text-success' : 'text-destructive' )}>
                                            {currency} {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    ))}
                                </div>
                                <Button size="sm" onClick={handleUnifiedSettlement}>
                                    <DollarSign className="mr-2 h-4 w-4"/>
                                    Realizar Baixa Unificada
                                </Button>
                            </div>
                        )}

                        {renderEntriesTable(filteredEntries)}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="nfse" className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Consulta de Notas Fiscais de Serviço (NFS-e)</CardTitle>
                        <CardDescription>Visualize todas as notas fiscais emitidas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nº NFS-e</TableHead>
                                        <TableHead>Tomador</TableHead>
                                        <TableHead>Data Emissão</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Nenhuma NFS-e emitida ainda.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                         </div>
                    </CardContent>
                 </Card>
            </TabsContent>

            <TabsContent value="juridico" className="mt-6">
                 <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5 text-destructive" /> Processos em Jurídico
                                </CardTitle>
                                <CardDescription>Faturas que foram enviadas para cobrança judicial ou protesto.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center">
                                <Input placeholder="Filtrar por Parceiro..." value={textFilters.partner} onChange={(e) => handleTextFilterChange('partner', e.target.value)} className="w-48" />
                                <Input placeholder="Filtrar por Processo..." value={textFilters.processId} onChange={(e) => handleTextFilterChange('processId', e.target.value)} className="w-48" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {renderEntriesTable(juridicoEntries, true)}
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
      
        <AlertDialog open={!!entryToSettle} onOpenChange={(isOpen) => !isOpen && setEntryToSettle(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Baixa de Pagamento</AlertDialogTitle>
                    <AlertDialogDescription>
                        Fatura <strong>{entryToSettle?.invoiceId}</strong> | Saldo: <strong>{entryToSettle?.currency} {entryToSettle ? getEntryBalance(entryToSettle).toLocaleString('pt-BR', {minimumFractionDigits: 2}) : '0.00'}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="payment-amount">Valor do Pagamento</Label>
                        <Input
                            id="payment-amount"
                            type="number"
                            placeholder="0.00"
                            value={settlementAmount}
                            onChange={(e) => setSettlementAmount(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <Label htmlFor="bank-account-select">Conta Bancária</Label>
                        <Select onValueChange={setSettlementAccountId} value={settlementAccountId}>
                            <SelectTrigger id="bank-account-select" className="mt-2">
                                <SelectValue placeholder="Selecione a conta..." />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(account => (
                                    <SelectItem key={account.id} value={account.id.toString()}>
                                        {account.name} ({account.currency})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {needsExchangeRate && (
                        <div className="animate-in fade-in-50 duration-300">
                             <Label htmlFor="exchange-rate">Taxa de Câmbio (Fatura {entryToSettle?.currency} &rarr; Conta {accounts.find(a => a.id.toString() === settlementAccountId)?.currency})</Label>
                             <Input 
                                id="exchange-rate"
                                type="number"
                                placeholder="Ex: 5.43"
                                value={exchangeRate}
                                onChange={(e) => setExchangeRate(e.target.value)}
                                className="mt-2"
                             />
                        </div>
                    )}
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setEntryToSettle(null)}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettlePayment} disabled={!settlementAccountId || !settlementAmount || (needsExchangeRate && !exchangeRate)}>
                        Confirmar Baixa
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <BankAccountDialog
            isOpen={!!editingAccount || !!(editingAccount && editingAccount.name === undefined)}
            onClose={() => setEditingAccount(null)}
            onSave={handleAccountSave}
            account={editingAccount}
        />
        
        <FinancialEntryDialog
            isOpen={isEntryDialogOpen}
            onClose={() => setIsEntryDialogOpen(false)}
            onSave={handleNewEntrySave}
        />

        <BankAccountStatementDialog
            account={statementAccount}
            entries={entries}
            isOpen={!!statementAccount}
            onClose={() => setStatementAccount(null)}
        />

        <NfseGenerationDialog
            data={nfseData}
            isOpen={!!nfseData}
            onClose={() => setNfseData(null)}
        />

        <SendToLegalDialog
            data={legalData}
            isOpen={!!legalData}
            onClose={() => setLegalData(null)}
            onConfirm={handleSendToLegal}
        />
        
        <FinancialDetailsDialog
            shipment={detailsShipment}
            isOpen={!!detailsShipment}
            onClose={() => setDetailsShipment(null)}
            onReversePayment={handleReversePayment}
            findEntryForPayment={findEntryForPayment}
        />

    </div>
  );
}
