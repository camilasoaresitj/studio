
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MoreHorizontal,
  DollarSign,
  FileDown,
  Edit,
  Pencil,
  FileText,
  Send,
  Printer,
  Eye,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  ListFilter
} from 'lucide-react';
import { format, isPast, isToday, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFinancialEntries, FinancialEntry, BankAccount, getBankAccounts, saveBankAccounts } from '@/lib/financials-data';
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

type FilterType = 'all' | 'dueTodayReceivable' | 'dueTodayPayable' | 'dueThisMonth';

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
        const todayEntries = entries.filter(e => isToday(new Date(e.dueDate)));
        const monthEntries = entries.filter(e => isThisMonth(new Date(e.dueDate)));

        return {
            dueTodayReceivable: todayEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0),
            dueTodayPayable: todayEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0),
            dueMonthTotal: monthEntries.length,
        }
    }, [entries]);

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            const dueDate = new Date(entry.dueDate);
            switch (activeFilter) {
                case 'dueTodayReceivable':
                    return isToday(dueDate) && entry.type === 'credit';
                case 'dueTodayPayable':
                    return isToday(dueDate) && entry.type === 'debit';
                case 'dueThisMonth':
                    return isThisMonth(dueDate);
                case 'all':
                default:
                    return true;
            }
        });
    }, [entries, activeFilter]);


    const getStatusVariant = (entry: FinancialEntry): 'default' | 'secondary' | 'destructive' | 'success' => {
        if (entry.status === 'Pago') return 'success';
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

    if (!isClient) {
        return null;
    }

    return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Financeiro</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas contas, faturas, notas fiscais e boletos.
        </p>
      </header>
      
        <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onClick={() => setActiveFilter('all')}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><ListFilter />Visão Geral</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">&nbsp;</div>
                    <p className="text-xs text-muted-foreground">Clique para ver todos os lançamentos</p>
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:ring-2 hover:ring-green-500/50 transition-all" onClick={() => setActiveFilter('dueTodayReceivable')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">A Receber Hoje</CardTitle>
                    <ArrowUpCircle className="h-5 w-5 text-success" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-success">R$ {dashboardData.dueTodayReceivable.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <p className="text-xs text-muted-foreground">Vencendo em {format(new Date(), 'dd/MM/yyyy')}</p>
                </CardContent>
            </Card>
             <Card className="cursor-pointer hover:ring-2 hover:ring-red-500/50 transition-all" onClick={() => setActiveFilter('dueTodayPayable')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">A Pagar Hoje</CardTitle>
                    <ArrowDownCircle className="h-5 w-5 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-destructive">R$ {dashboardData.dueTodayPayable.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                     <p className="text-xs text-muted-foreground">Vencendo em {format(new Date(), 'dd/MM/yyyy')}</p>
                </CardContent>
            </Card>
            <Card className="cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all" onClick={() => setActiveFilter('dueThisMonth')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vencimentos no Mês</CardTitle>
                    <CalendarDays className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-blue-500">{dashboardData.dueMonthTotal} Lançamentos</div>
                     <p className="text-xs text-muted-foreground">Para o mês de {format(new Date(), 'MMMM', {locale: ptBR})}</p>
                </CardContent>
            </Card>
        </div>

        <Tabs defaultValue="lancamentos" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-4xl">
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
                <TabsTrigger value="nfse">Consulta NFS-e</TabsTrigger>
                <TabsTrigger value="boletos">Consulta Boletos</TabsTrigger>
            </TabsList>

            <TabsContent value="lancamentos" className="mt-6">
                <Card>
                    <CardHeader>
                    <CardTitle>Lançamentos Financeiros</CardTitle>
                    <CardDescription>
                        {activeFilter !== 'all' 
                            ? <span className="text-primary font-medium">Mostrando filtro ativo. Clique em "Visão Geral" para limpar.</span>
                            : 'Visualize e gerencie todas as suas contas a pagar e a receber.'
                        }
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    
                    {unifiedSettlementData && (
                        <div className="flex items-center justify-between p-3 mb-4 border rounded-lg bg-secondary/50 animate-in fade-in-50 duration-300">
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
                            {filteredEntries.map((entry) => (
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
                    </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="contas" className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Contas Bancárias</CardTitle>
                        <CardDescription>Gerencie suas contas e veja os extratos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome da Conta</TableHead>
                                        <TableHead>Banco</TableHead>
                                        <TableHead>Agência</TableHead>
                                        <TableHead>Conta</TableHead>
                                        <TableHead>Moeda</TableHead>
                                        <TableHead className="text-right">Saldo</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     {accounts.map(account => (
                                         <TableRow key={account.id} className="cursor-pointer" onClick={() => setStatementAccount(account)}>
                                            <TableCell className="font-medium">{account.name}</TableCell>
                                            <TableCell>{account.bankName}</TableCell>
                                            <TableCell>{account.agency}</TableCell>
                                            <TableCell>{account.accountNumber}</TableCell>
                                            <TableCell><Badge variant="secondary">{account.currency}</Badge></TableCell>
                                            <TableCell className="text-right font-mono">{account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-center">
                                                 <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingAccount(account); }}>
                                                    <Pencil className="h-4 w-4" />
                                                 </Button>
                                            </TableCell>
                                         </TableRow>
                                     ))}
                                </TableBody>
                            </Table>
                        </div>
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

            <TabsContent value="boletos" className="mt-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Consulta de Boletos</CardTitle>
                        <CardDescription>Visualize todos os boletos emitidos para seus clientes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nosso Número</TableHead>
                                        <TableHead>Sacado</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                     <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Nenhum boleto emitido ainda.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
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
            isOpen={!!editingAccount}
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
