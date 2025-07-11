
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
  Gavel
} from 'lucide-react';
import { format, isPast, isToday, isThisMonth } from 'date-fns';
import { getFinancialEntries, FinancialEntry, BankAccount, getBankAccounts, saveBankAccounts, saveFinancialEntries, PartialPayment, addFinancialEntry } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { BankAccountDialog } from '@/components/financials/bank-account-form';
import { NfseGenerationDialog } from '@/components/financials/nfse-generation-dialog';
import { getShipments } from '@/lib/shipment';
import type { Shipment } from '@/lib/shipment';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankAccountStatementDialog } from '@/components/financials/bank-account-statement-dialog';
import { runGenerateClientInvoicePdf, runGenerateAgentInvoicePdf, runSendQuote } from '@/app/actions';
import { FinancialEntryImporter } from '@/components/financials/financial-entry-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinancialDetailsDialog } from '@/components/financials/financial-details-dialog';
import { Input } from '@/components/ui/input';
import { SendToLegalDialog } from '@/components/financials/send-to-legal-dialog';
import { getPartners } from '@/lib/partners-data';

type FilterType = 'all' | 'dueToday' | 'dueThisMonth';

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
    const [statementAccount, setStatementAccount] = useState<BankAccount | null>(null);
    const [nfseData, setNfseData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [legalData, setLegalData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [detailsShipment, setDetailsShipment] = useState<(Shipment & { payments?: PartialPayment[] }) | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [isGenerating, setIsGenerating] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const handleStorageChange = () => {
            setEntries(getFinancialEntries());
            setAccounts(getBankAccounts());
            setAllShipments(getShipments());
        };

        window.addEventListener('storage', handleStorageChange);
        // Also trigger on focus to catch changes from other tabs
        window.addEventListener('focus', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', handleStorageChange);
        };
    }, []);

    const getEntryBalance = (entry: FinancialEntry): number => {
        const totalPaid = (entry.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return entry.amount - totalPaid;
    };

    const getEntryStatus = (entry: FinancialEntry): { status: 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico'; variant: 'default' | 'secondary' | 'destructive' | 'success' } => {
        if (entry.status === 'Jurídico') {
            return { status: 'Jurídico', variant: 'default' };
        }
        const balance = getEntryBalance(entry);
        const totalPaid = entry.amount - balance;

        if (balance <= 0) {
            return { status: 'Pago', variant: 'success' };
        }
        if (isPast(new Date(entry.dueDate)) && !isToday(new Date(entry.dueDate))) {
            return { status: 'Vencido', variant: 'destructive' };
        }
        if (totalPaid > 0 && balance > 0) {
            return { status: 'Parcialmente Pago', variant: 'default' };
        }
        return { status: 'Aberto', variant: 'secondary' };
    };

    const filteredEntries = useMemo(() => {
        const nonJuridicoEntries = entries.filter(e => e.status !== 'Jurídico');
        if (activeFilter === 'all') {
            return nonJuridicoEntries;
        }

        return nonJuridicoEntries.filter(entry => {
            const { status } = getEntryStatus(entry);
            if (status === 'Pago' || status === 'Jurídico') return false;

            const dueDate = new Date(entry.dueDate);
            if (activeFilter === 'dueToday') {
                return isToday(dueDate);
            }
            if (activeFilter === 'dueThisMonth') {
                return isThisMonth(dueDate);
            }
            return true;
        });
    }, [entries, activeFilter]);
    
    const juridicoEntries = useMemo(() => {
        return entries.filter(e => e.status === 'Jurídico');
    }, [entries]);

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
        if (amount > balance) {
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
                return { ...e, payments: updatedPayments };
            }
            return e;
        });

        saveFinancialEntries(updatedEntries);
        setEntries(updatedEntries);

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
                currency: c.saleCurrency, // Assuming sale currency is the primary one
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
        const currentEntries = getFinancialEntries();
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

    const renderEntriesTable = (tableEntries: FinancialEntry[], isLegalTable = false) => (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                {!isLegalTable && <TableHead className="w-10">
                    <Checkbox
                        checked={selectedRows.size > 0 && tableEntries.every(e => selectedRows.has(e.id))}
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
                {!isLegalTable && <TableHead>Tipo</TableHead>}
                <TableHead>Parceiro</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead>Processo</TableHead>
                {!isLegalTable && <TableHead>Status</TableHead>}
                {isLegalTable && <TableHead>Status Jurídico</TableHead>}
                {isLegalTable && <TableHead>Comentários</TableHead>}
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                {!isLegalTable && <TableHead className="text-center">Ações</TableHead>}
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
                            {!isLegalTable && <TableCell>
                                <Badge variant={entry.type === 'credit' ? 'success' : 'destructive'} className="capitalize">{entry.type === 'credit' ? 'Crédito' : 'Débito'}</Badge>
                            </TableCell>}
                            <TableCell className="font-medium">{entry.partner}</TableCell>
                            <TableCell>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry.processId); }} className="text-muted-foreground hover:text-primary hover:underline">
                                    {entry.invoiceId}
                                </a>
                            </TableCell>
                            <TableCell>
                                <a href="#" onClick={(e) => { e.preventDefault(); handleProcessClick(entry.processId); }} className="text-muted-foreground hover:text-primary hover:underline">
                                    {entry.processId}
                                </a>
                            </TableCell>
                            {!isLegalTable && <TableCell>
                                <Badge variant={variant} className="capitalize">{status}</Badge>
                            </TableCell>}
                            {isLegalTable && (
                                <>
                                 <TableCell className="w-48">
                                    <Select
                                        value={entry.legalStatus}
                                        onValueChange={(value) => handleLegalEntryUpdate(entry.id, 'legalStatus', value)}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Fase Inicial">Fase Inicial</SelectItem>
                                            <SelectItem value="Fase de Execução">Fase de Execução</SelectItem>
                                            <SelectItem value="Desconsideração da Personalidade Jurídica">Desconsideração PJ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="w-64">
                                    <Input
                                        value={entry.legalComments || ''}
                                        onChange={(e) => handleLegalEntryUpdate(entry.id, 'legalComments', e.target.value)}
                                        placeholder="Adicionar comentário..."
                                    />
                                </TableCell>
                                </>
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
                            {!isLegalTable && <TableCell className="text-center">
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
                                        {entry.type === 'credit' && (
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
                            </TableCell>}
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
                             <div className="flex items-center gap-2 self-start sm:self-center">
                                <Label htmlFor="date-filter" className="text-sm font-medium">Filtrar por</Label>
                                <Select onValueChange={(value) => setActiveFilter(value as FilterType)} defaultValue="all">
                                    <SelectTrigger id="date-filter" className="w-[180px]">
                                        <SelectValue placeholder="Filtrar por" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="dueToday">Vencendo Hoje</SelectItem>
                                        <SelectItem value="dueThisMonth">Vencendo no Mês</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                    <FinancialEntryImporter onEntriesImported={handleEntriesImported} />
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
                        <CardTitle className="flex items-center gap-2">
                           <ShieldAlert className="h-5 w-5 text-destructive" /> Processos em Jurídico
                        </CardTitle>
                        <CardDescription>Faturas que foram enviadas para cobrança judicial ou protesto.</CardDescription>
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

        <BankAccountStatementDialog
            account={statementAccount}
            entries={entries.filter(e => e.accountId === statementAccount?.id)}
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
        />

    </div>
  );
}
