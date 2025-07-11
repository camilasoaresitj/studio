
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ArrowUpRight, ArrowDownRight, DollarSign, FileText, Download, Upload, Filter, MoreHorizontal, FileDown, Trash2, Landmark } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFinancialEntries, FinancialEntry, BankAccount, getBankAccounts } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const kpiData = {
    dueToday: 15250.75,
    overdue: 45800.00,
    receivablesMonth: 185400.50,
    payablesMonth: 95320.00,
};

export default function FinanceiroPage() {
    const [entries, setEntries] = useState<FinancialEntry[]>(getFinancialEntries);
    const [accounts, setAccounts] = useState<BankAccount[]>(getBankAccounts);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const getStatusVariant = (entry: FinancialEntry): 'default' | 'secondary' | 'destructive' | 'success' => {
        if (entry.status === 'Pago') return 'success';
        if (isPast(new Date(entry.dueDate)) && !isToday(new Date(entry.dueDate))) return 'destructive';
        if (isToday(new Date(entry.dueDate))) return 'default';
        return 'secondary';
    };
    
    const handleAction = (action: string, entryId: string) => {
        toast({
            title: 'Funcionalidade em Desenvolvimento',
            description: `A ação "${action}" para a fatura ${entryId} será implementada em breve.`,
        });
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
        if (selectedRows.size === entries.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(entries.map(e => e.id)));
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
        // In a real scenario, you'd update the status of selected items here and clear selection.
        setSelectedRows(new Set());
    };

    const handleInvoiceClick = (processId: string) => {
        toast({
            title: "Visualização de Detalhes",
            description: `Em breve, será possível ver os detalhes da fatura vinculada ao processo ${processId}.`
        });
    };

    return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Financeiro</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas contas a pagar e receber, e acompanhe a saúde financeira da empresa.
        </p>
      </header>
      
        <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            {accounts.map(account => (
                 <Card key={account.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                        <Landmark className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{account.currency} {account.balance.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                        <p className="text-xs text-muted-foreground">{account.bankName} - Ag: {account.agency} C/C: {account.accountNumber}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Financeiros</CardTitle>
          <CardDescription>Visualize e gerencie todas as suas contas a pagar e a receber.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Input placeholder="Filtrar por Cliente/Fornecedor..." className="flex-grow" />
              <Select defaultValue="all-accounts">
                  <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Contas Bancárias" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all-accounts">Todas as Contas</SelectItem>
                      {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id.toString()}>{account.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
              <Select defaultValue="all-status">
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent><SelectItem value="all-status">Todos Status</SelectItem><SelectItem value="aberto">Aberto</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="vencido">Vencido</SelectItem></SelectContent>
              </Select>
               <Select defaultValue="all-types">
                  <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent><SelectItem value="all-types">Todos Tipos</SelectItem><SelectItem value="credito">Crédito</SelectItem><SelectItem value="debito">Débito</SelectItem></SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal sm:w-auto", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : <span>Filtrar por vencimento</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent>
              </Popover>
               <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtrar</Button>
          </div>
          
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
                        checked={selectedRows.size === entries.length && entries.length > 0}
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
                                <DropdownMenuItem onClick={() => handleAction('Baixar Pagamento', entry.invoiceId)}>Baixar Pagamento</DropdownMenuItem>
                                {entry.type === 'credit' && (
                                    <>
                                        <DropdownMenuItem onClick={() => handleAction('Emitir Boleto', entry.invoiceId)}>Emitir Boleto</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAction('Emitir NF de Serviço', entry.invoiceId)}>Emitir NF de Serviço</DropdownMenuItem>
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
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento.' })}>
              <Upload className="mr-2 h-4 w-4"/> Importar Extrato
            </Button>
            <Button variant="outline" onClick={() => toast({ title: 'Funcionalidade em desenvolvimento.' })}>
              <FileDown className="mr-2 h-4 w-4"/> Exportar Extrato
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
