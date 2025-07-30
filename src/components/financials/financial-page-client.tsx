
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
import { FinancialEntryDialog } from './financial-entry-dialog';
import { RenegotiationDialog } from './renegotiation-dialog';
import { NfseConsulta } from './nfse-consulta';
import { PartnersRegistry } from '../partners-registry';
import { Partner, getStoredPartners } from '@/lib/partners-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { CommissionManagement } from './commission-management';


type Status = 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico' | 'Pendente de Aprovação' | 'Renegociado';
const allStatuses: Status[] = ['Aberto', 'Vencido', 'Parcialmente Pago', 'Pago', 'Pendente de Aprovação'];


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
    const [statusFilter, setStatusFilter] = useState<string[]>(['Aberto', 'Parcialmente Pago', 'Vencido', 'Pendente de Aprovação']);
    const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
    const [textFilters, setTextFilters] = useState({ partner: '', processId: '', value: '' });
    const [isGenerating, setIsGenerating] = useState(false);
    const [ptaxRates, setPtaxRates] = useState<Record<string, number>>({});
    const { toast } = useToast();
    
    useEffect(() => {
        const loadData = async () => {
            setEntries(getStoredFinancialEntries());
            setAccounts(getStoredBankAccounts());
            setAllShipments(getStoredShipments());
            setPartners(getStoredPartners());
            const rates = await exchangeRateService.getRates();
            setPtaxRates(rates);
        };
        
        loadData();

        window.addEventListener('storage', loadData);
        window.addEventListener('focus', loadData);
        window.addEventListener('financialsUpdated', loadData);
        window.addEventListener('partnersUpdated', loadData);
        
        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('focus', loadData);
            window.removeEventListener('financialsUpdated', loadData);
             window.removeEventListener('partnersUpdated', loadData);
        };
    }, []);
    
    const getEntryBalance = (entry: FinancialEntry): number => {
        const totalPaid = (entry.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return entry.amount - totalPaid;
    };

    const getEntryStatus = (entry: FinancialEntry): { status: Status; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline' } => {
        if (entry.status === 'Renegociado') {
            return { status: 'Renegociado', variant: 'outline' };
        }
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
        if (lowerProcessId && !entry.processId.toLowerCase().includes(lowerProcessId) && !entry.invoiceId.toLowerCase().includes(lowerProcessId)) return false;
        if (lowerValue && !entry.amount.toString().includes(lowerValue)) return false;

        return true;
    };

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const { status } = getEntryStatus(entry);
            if (entry.status === 'Jurídico' || entry.status === 'Renegociado') return false;

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
    
    const handleSettlePayment = async () => {
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

        const response = await updateFinancialEntryAction({
            entryId: entryToSettle.id,
            payment: newPayment,
            settlementAccountId: parseInt(settlementAccountId, 10),
        });
        
        if (response.success && response.data) {
            setEntries(response.data.entries);
            setAccounts(response.data.accounts);
            toast({
                title: 'Baixa de Pagamento Realizada!',
                description: `Pagamento de ${entryToSettle.currency} ${amount.toFixed(2)} para a fatura ${entryToSettle.invoiceId} foi registrado.`,
                className: 'bg-success text-success-foreground'
            });
            setEntryToSettle(null);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao processar baixa', description: response.error });
        }
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

    const findShipmentForEntry = (entry: FinancialEntry): Shipment | undefined => {
        return allShipments.find(s => 
            s.id === entry.processId || 
            (s.quoteId && s.quoteId === entry.processId) ||
            (s.quoteId && s.quoteId === entry.invoiceId)
        );
    };

    const handleProcessClick = (entry: FinancialEntry) => {
        setDetailsEntry(entry);
    };
    
    const handleCloseDetails = () => {
        setDetailsEntry(null);
    }
    
    const handleDetailsEntryUpdate = async (entry: FinancialEntry) => {
        const response = await updateFinancialEntryAction(entry);
        if (response.success && response.data) {
            setEntries(response.data);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao atualizar', description: response.error });
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

    const handleNewEntrySave = async (newEntryData: Omit<FinancialEntry, 'id'>) => {
        const response = await addFinancialEntriesAction([newEntryData]);
        if (response.success && response.data) {
            setEntries(response.data);
            setIsEntryDialogOpen(false);
            toast({
                title: "Despesa Lançada para Aprovação!",
                description: `A despesa para "${newEntryData.partner}" foi enviada.`,
                className: 'bg-success text-success-foreground',
            });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: response.error });
        }
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
    
    const handleGenerateClientInvoicePdf = async (entry: FinancialEntry) => {
        setIsGenerating(true);
        const shipment = findShipmentForEntry(entry);
        if (!shipment) {
            toast({ variant: 'destructive', title: 'Processo não encontrado', description: `Não foi possível localizar o processo para a fatura ${entry.invoiceId}` });
            setIsGenerating(false);
            return;
        }

        const partner = partners.find(p => p.name === entry.partner);
        const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const charges = shipment.charges
            .filter(c => c.sacado === entry.partner)
            .map(c => ({
                description: c.name,
                value: formatValue(c.sale),
                currency: c.saleCurrency
            }));
        
        const customerAgio = partner?.exchangeRateAgio ?? 0;
        const ptaxUsd = ptaxRates['USD'] || 5.0; // Fallback
        const finalPtaxUsd = parseFloat((ptaxUsd * (1 + (customerAgio / 100))).toFixed(4));
        const totalInBRL = getBalanceInBRL(entry);

        const response = await runGenerateClientInvoicePdf({
            invoiceNumber: entry.invoiceId,
            customerName: entry.partner,
            customerAddress: `${partner?.address?.street || ''}, ${partner?.address?.number || ''} - ${partner?.address?.city || ''}`,
            date: format(new Date(), 'dd/MM/yyyy'),
            dueDate: format(new Date(entry.dueDate), 'dd/MM/yyyy'),
            charges,
            total: `R$ ${totalInBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            exchangeRate: entry.currency !== 'BRL' ? finalPtaxUsd : undefined,
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
        
        const companySettings = JSON.parse(localStorage.getItem('company_settings') || '{}');
        const logoDataUrl = companySettings.logoDataUrl;

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
            companyLogoUrl: logoDataUrl,
            companyName: companySettings.razaoSocial || 'CargaInteligente',
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

        if (response.success && response.data) {
            console.log("----- SIMULATING INVOICE EMAIL SEND -----");
            console.log("SUBJECT:", response.data.emailSubject);
            console.log("BODY (HTML):", response.data.emailBody);
            console.log("---------------------------------------");
            toast({ title: 'Fatura reenviada! (Simulação)', description: `E-mail para ${entry.partner} gerado no console.` });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao reenviar', description: response.error });
        }
    };

    const handleEntriesImported = async (importedEntries: Omit<FinancialEntry, 'id'>[]) => {
        const response = await addFinancialEntriesAction(importedEntries);
        if (response.success && response.data) {
            setEntries(response.data);
            toast({
                title: 'Importação Concluída!',
                description: `${importedEntries.length} lançamentos financeiros foram importados com sucesso.`,
                className: 'bg-success text-success-foreground'
            });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao Importar', description: response.error });
        }
    };
    
    const handleLegalImported = (importedData: { invoiceId: string }[]) => {
        let updatedCount = 0;
        const updatedEntries = entries.map(entry => {
            const match = importedData.find(imp => imp.invoiceId === entry.invoiceId);
            if (match && entry.status !== 'Jurídico') {
                updatedCount++;
                return { ...entry, status: 'Jurídico' as const, legalStatus: 'Fase Inicial' as const };
            }
            return entry;
        });
        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);
        toast({
            title: 'Importação para Jurídico Concluída!',
            description: `${updatedCount} processo(s) foram movidos para a aba Jurídico.`,
            className: 'bg-success text-success-foreground'
        });
    };

    const handleLegalEntryUpdate = async (id: string, field: 'legalStatus' | 'processoJudicial' | 'legalComments', value: string) => {
        const entryToUpdate = entries.find(e => e.id === id);
        if (entryToUpdate) {
            const response = await updateFinancialEntryAction({ ...entryToUpdate, [field]: value });
            if (response.success && response.data) {
                setEntries(response.data);
            } else {
                 toast({ variant: 'destructive', title: 'Erro ao atualizar', description: response.error });
            }
        }
    };
    
    const handleSendToLegal = async (entry: FinancialEntry) => {
        const response = await updateFinancialEntryAction({ ...entry, status: 'Jurídico', legalStatus: 'Fase Inicial' });
        if (response.success && response.data) {
            setEntries(response.data);
            setLegalData(null);
        } else {
            toast({ variant: 'destructive', title: 'Erro ao mover para jurídico', description: response.error });
        }
    };

    const handleRenegotiation = async (installments: Omit<FinancialEntry, 'id'>[]) => {
        if (!entryToRenegotiate) return;
        
        // Mark original entry as Renegotiado
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
                                    onCheckedChange={() => toggleRowSelection(entry.id)}
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
            <TabsList className="grid w-full grid-cols-5 max-w-5xl">
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="comissoes">Comissões</TabsTrigger>
                <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
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
                            <Input placeholder="Filtrar por Processo/Fatura..." value={textFilters.processId} onChange={(e) => handleTextFilterChange('processId', e.target.value)} />
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
            
            <TabsContent value="comissoes" className="mt-6">
                <CommissionManagement
                    partners={partners}
                    shipments={allShipments}
                    exchangeRates={ptaxRates}
                />
            </TabsContent>

            <TabsContent value="parceiros" className="mt-6">
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>Cadastro de Parceiros</CardTitle>
                            <CardDescription>Gerencie seus clientes, fornecedores e agentes.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PartnersRegistry partners={partners} onPartnerSaved={handlePartnerSaved} />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="nfse" className="mt-6">
                <NfseConsulta />
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
                                <FinancialEntryImporter onEntriesImported={handleLegalImported} importType='legal' />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            <Input placeholder="Filtrar por Parceiro..." value={textFilters.partner} onChange={(e) => handleTextFilterChange('partner', e.target.value)} />
                            <Input placeholder="Filtrar por Nº Processo..." value={textFilters.processId} onChange={(e) => handleTextFilterChange('processId', e.target.value)} />
                            <Input placeholder="Filtrar por Valor..." value={textFilters.value} onChange={(e) => handleTextFilterChange('value', e.target.value)} />
                        </div>
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
            isOpen={!!editingAccount}
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
        
        <RenegotiationDialog
            isOpen={!!entryToRenegotiate}
            onClose={() => setEntryToRenegotiate(null)}
            entry={entryToRenegotiate}
            onConfirm={handleRenegotiation}
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
            entry={detailsEntry}
            isOpen={!!detailsEntry}
            onClose={handleCloseDetails}
            onReversePayment={handleReversePayment}
            findEntryForPayment={findEntryForPayment}
            findShipmentForEntry={findShipmentForEntry}
            onEntryUpdate={handleDetailsEntryUpdate}
        />

    </div>
  );
}
