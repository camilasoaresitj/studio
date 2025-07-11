
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ArrowUpRight, ArrowDownRight, DollarSign, FileText, Download, Upload, Filter, MoreHorizontal, FileDown } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const kpiData = {
    dueToday: 15250.75,
    overdue: 45800.00,
    receivablesMonth: 185400.50,
    payablesMonth: 95320.00,
};

export default function FinanceiroPage() {
    const [entries, setEntries] = useState<FinancialEntry[]>(getFinancialEntries);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const getStatusVariant = (entry: FinancialEntry): 'default' | 'secondary' | 'destructive' | 'success' => {
        if (entry.status === 'Pago') return 'success';
        if (isPast(new Date(entry.dueDate)) && !isToday(new Date(entry.dueDate))) return 'destructive';
        if (isToday(new Date(entry.dueDate))) return 'default';
        return 'secondary';
    };
    
    const handleAction = (action: string, entryId: string) => {
        alert(`Ação "${action}" para a fatura ${entryId} ainda não implementada.`);
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">A Vencer Hoje</CardTitle>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {kpiData.dueToday.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <p className="text-xs text-muted-foreground">Soma de pagamentos e recebimentos.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Faturas Vencidas</CardTitle>
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">R$ {kpiData.overdue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <p className="text-xs text-muted-foreground">Total de contas a receber vencidas.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receber no Mês</CardTitle>
                <ArrowUpRight className="h-5 w-5 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">R$ {kpiData.receivablesMonth.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <p className="text-xs text-muted-foreground">Expectativa de recebimentos para este mês.</p>
              </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pagar no Mês</CardTitle>
                <ArrowDownRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ {kpiData.payablesMonth.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <p className="text-xs text-muted-foreground">Expectativa de pagamentos para este mês.</p>
              </CardContent>
            </Card>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Financeiros</CardTitle>
          <CardDescription>Visualize e gerencie todas as suas contas a pagar e a receber.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <Input placeholder="Filtrar por Cliente/Fornecedor..." className="flex-grow" />
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
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal sm:w-[240px]", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : <span>Filtrar por vencimento</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent>
              </Popover>
               <Button variant="outline"><Filter className="mr-2 h-4 w-4" />Filtrar</Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Fatura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant={entry.type === 'credit' ? 'success' : 'destructive'} className="capitalize">{entry.type === 'credit' ? 'Crédito' : 'Débito'}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.partner}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.invoiceId}</TableCell>
                    <TableCell>
                       <Badge variant={getStatusVariant(entry)} className="capitalize">{entry.status}</Badge>
                    </TableCell>
                    <TableCell className={cn(getStatusVariant(entry) === 'destructive' && 'text-destructive font-bold')}>
                      {format(new Date(entry.dueDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono", entry.type === 'credit' ? 'text-success' : 'text-foreground')}>
                      R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAction('Baixar', entry.id)}>Baixar Pagamento</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('Emitir Boleto', entry.id)}>Emitir Boleto</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction('Emitir NF', entry.id)}>Emitir NF de Serviço</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline"><Upload className="mr-2 h-4 w-4"/> Importar Extrato</Button>
            <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/> Exportar Extrato</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
