
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  MoreHorizontal,
  DollarSign,
  Eye,
  Send,
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  ListFilter,
  ShieldAlert,
  Banknote,
  PlusCircle
} from 'lucide-react';
import { format, isPast, isToday, isThisMonth, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFinancialEntries, FinancialEntry, BankAccount, getBankAccounts, saveBankAccounts, saveFinancialEntries } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { runGenerateQuotePdfHtml, runSendQuote } from '@/app/actions';
import { FinancialEntryImporter } from '@/components/financials/financial-entry-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


type FilterType = 'all' | 'dueToday' | 'dueThisMonth';

export default function FinanceiroPage() {
    const [isClient, setIsClient] = useState(false);
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [allShipments, setAllShipments] = useState<Shipment[]>([]);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [entryToSettle, setEntryToSettle] = useState<FinancialEntry | null>(null);
    const [settlementAccountId, setSettlementAccountId] = useState<string>('');
    const [exchangeRate, setExchangeRate] = useState<string>('');
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [statementAccount, setStatementAccount] = useState<BankAccount | null>(null);
    const [nfseData, setNfseData] = useState<{ entry: FinancialEntry; shipment: Shipment } | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
        setEntries(getFinancialEntries());
        setAccounts(getBankAccounts());
        setAllShipments(getShipments());
    }, []);

    const dashboardData = useMemo(() => {
        const todayEntries = entries.filter(e => isToday(new Date(e.dueDate)) && e.status !== 'Pago');

        return {
            dueTodayReceivable: todayEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0),
            dueTodayPayable: todayEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0),
        }
    }, [entries]);

    const filteredEntries = useMemo(() => {
        const nonJuridicoEntries = entries.filter(e => e.status !== 'Jurídico');
        if (activeFilter === 'all') {
            return nonJuridicoEntries;
        }

        return nonJuridicoEntries.filter(entry => {
            const dueDate = new Date(entry.dueDate);
            if (entry.status === 'Pago') return false;

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


    const getStatusVariant = (entry: FinancialEntry): 'default' | 'secondary' | 'destructive' | 'success' => {
        if (entry.status === 'Pago') return 'success';
        if (entry.status === 'Jurídico') return 'default';
        if (isPast(new Date(entry.dueDate)) && !isToday(new Date(entry.dueDate))) return 'destructive';
        if (isToday(new Date(entry.dueDate))) return 'default';
        return 'secondary';
    };

    const needsExchangeRate = useMemo(() => {
        if (!entryToSettle || !settlementAccountId) return false;
        const account = accounts.find(a => a.id.toString() === settlementAccountId);
        return account && account.currency !== entryToSettle.currency;
    }, [entryToSettle, settlementAccountId, accounts]);
    
    const handleSettlePayment = () => {
        if (!entryToSettle || !settlementAccountId) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Fatura ou conta bancária não selecionada.' });
            return;
        }
        if (needsExchangeRate && !exchangeRate) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Taxa de câmbio é obrigatória.' });
            return;
        }

        let description = `A fatura ${entryToSettle.invoiceId} foi marcada como paga na conta ID ${settlementAccountId}.`;
        if (needsExchangeRate) {
            description += ` Câmbio utilizado: ${exchangeRate}.`;
        }

        toast({
            title: 'Baixa de Pagamento (Simulação)',
            description,
            className: 'bg-success text-success-foreground'
        });
        
        // In a real app, you would update the entry status here.
        setEntryToSettle(null);
        setSettlementAccountId('');
        setExchangeRate('');
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

    const toggleSelectAll = () => {
        if (selectedRows.size === filteredEntries.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(filteredEntries.map(e => e.id)));
        }
    };

    const unifiedSettlementData = useMemo(() => {
        if (selectedRows.size === 0) return null;

        const selectedEntries = entries.filter(e => selectedRows.has(e.id));
        const totalsByCurrency: { [key: string]: number } = {};
        
        selectedEntries.forEach(entry => {
            if (!totalsByCurrency[entry.currency]) {
                totalsByCurrency[entry.currency] = 0;
            }
            const value = entry.type === 'credit' ? entry.amount : -entry.amount;
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

    const handleInvoiceClick = (processId: string) => {
        toast({
            title: "Visualização de Detalhes",
            description: `Em breve, será possível ver os detalhes da fatura vinculada ao processo ${processId}.`
        });
    };

    const handleOpenNfseDialog = (entry: FinancialEntry) => {
        const relatedShipment = allShipments.find(s => s.id === entry.processId);
        if (relatedShipment) {
            setNfseData({ entry, shipment: relatedShipment });
        } else {
            toast({
                variant: 'destructive',
                title: 'Processo não encontrado',
                description: `Não foi possível encontrar o processo de embarque ${entry.processId} vinculado a esta fatura.`,
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

    const handleGenerateInvoicePdf = async (entry: FinancialEntry) => {
        const shipment = allShipments.find(s => s.id === entry.processId);
        if (!shipment) {
            toast({ variant: 'destructive', title: 'Processo não encontrado' });
            return;
        }

        const formatValue = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const totalsByCurrency: { [key: string]: number } = {};
        shipment.charges.forEach(charge => {
            totalsByCurrency[charge.saleCurrency] = (totalsByCurrency[charge.saleCurrency] || 0) + charge.sale;
        });
        const totalAllIn = Object.entries(totalsByCurrency).map(([currency, total]) => `${currency} ${formatValue(total)}`).join(' + ');

        const response = await runGenerateQuotePdfHtml({
            quoteNumber: entry.invoiceId,
            customerName: entry.partner,
            date: new Date().toLocaleDateString('pt-br'),
            validity: format(new Date(entry.dueDate), 'dd/MM/yyyy'),
            origin: shipment.origin,
            destination: shipment.destination,
            incoterm: shipment.details.incoterm,
            transitTime: shipment.details.transitTime,
            modal: shipment.details.cargo.toLowerCase().includes('kg') ? 'Aéreo' : 'Marítimo',
            equipment: shipment.details.cargo,
            freightCharges: shipment.charges.filter(c => c.localPagamento === 'Frete').map(c => ({ name: c.name, type: c.type, currency: c.saleCurrency, total: formatValue(c.sale) })),
            localCharges: shipment.charges.filter(c => c.localPagamento !== 'Frete').map(c => ({ name: c.name, type: c.type, currency: c.saleCurrency, total: formatValue(c.sale) })),
            totalAllIn: totalAllIn,
            observations: "Pagamento referente a serviços de agenciamento de carga."
        });

        if (response.success && response.data?.html) {
            const newTab = window.open();
            newTab?.document.write(response.data.html);
            newTab?.document.close();
        } else {
            toast({ variant: 'destructive', title: 'Erro ao gerar fatura', description: response.error });
        }
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
        setEntries(currentEntries => {
            const newEntries = [...currentEntries, ...importedEntries];
            saveFinancialEntries(newEntries);
            return newEntries;
        });
    };

    if (!isClient) {
        return null;
    }

    const renderTable = (entries: FinancialEntry[]) => (
        <div className="border rounded-lg">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-10">
                    <Checkbox
                        checked={selectedRows.size === filteredEntries.length && filteredEntries.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                    />
                </TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.map((entry) => (
                <TableRow key={entry.id} data-state={selectedRows.has(entry.id) && "selected"}>
                    <TableCell>
                        <Checkbox
                            checked={selectedRows.has(entry.id)}
                            onCheckedChange={() => toggleRowSelection(entry.id)}
                            aria-label="Selecionar linha"
                        />
                    </TableCell>
                    <TableCell>
                    <Badge variant={entry.type === 'credit' ? 'success' : 'destructive'} className="capitalize">{entry.type === 'credit' ? 'Crédito' : 'Débito'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.partner}</TableCell>
                    <TableCell>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleInvoiceClick(entry.processId); }} className="text-muted-foreground hover:text-primary hover:underline">
                            {entry.invoiceId}
                        </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                        {accounts.find(a => a.id === entry.accountId)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                    <Badge variant={getStatusVariant(entry)} className="capitalize">{entry.status}</Badge>
                    </TableCell>
                    <TableCell className={cn(getStatusVariant(entry) === 'destructive' && 'text-destructive font-bold')}>
                    {format(new Date(entry.dueDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", entry.type === 'credit' ? 'text-success' : 'text-foreground')}>
                    {entry.currency} {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEntryToSettle(entry)}>Baixar Pagamento</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleGenerateInvoicePdf(entry)}>
                                    <Eye className="mr-2 h-4 w-4" /> Visualizar Fatura
                                </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleResendInvoice(entry)}>
                                    <Send className="mr-2 h-4 w-4" /> Reenviar Fatura
                                </DropdownMenuItem>
                                {entry.type === 'credit' && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleOpenNfseDialog(entry)}>
                                            <FileText className="mr-2 h-4 w-4" /> Emitir NF de Serviço
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))}
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

                    {renderTable(filteredEntries)}
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
                        {renderTable(juridicoEntries)}
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
      
        <AlertDialog open={!!entryToSettle} onOpenChange={(isOpen) => !isOpen && setEntryToSettle(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Baixa de Pagamento</AlertDialogTitle>
                    <AlertDialogDescription>
                        Selecione a conta bancária para realizar a baixa da fatura <strong>{entryToSettle?.invoiceId}</strong> no valor de <strong>{entryToSettle?.currency} {entryToSettle?.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4 space-y-4">
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
                    <AlertDialogAction onClick={handleSettlePayment} disabled={!settlementAccountId || (needsExchangeRate && !exchangeRate)}>
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

    </div>
  );
}
