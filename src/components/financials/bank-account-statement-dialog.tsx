
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BankAccount, FinancialEntry } from '@/lib/financials-data';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface BankAccountStatementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  entries: FinancialEntry[];
}

export function BankAccountStatementDialog({ isOpen, onClose, account, entries }: BankAccountStatementDialogProps) {
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set());

  if (!account) return null;

  const handleToggleReconciled = (id: string) => {
    setReconciledIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const runningBalance = entries
    .slice() // Create a shallow copy to avoid mutating the original array
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .reduce((acc, entry, index) => {
        const previousBalance = index > 0 ? acc[index - 1].balance : account.balance;
        const amount = entry.type === 'credit' ? entry.amount : -entry.amount;
        acc.push({
            ...entry,
            balance: previousBalance + amount
        });
        return acc;
    }, [] as (FinancialEntry & { balance: number })[]);

  const finalBalance = runningBalance.length > 0 ? runningBalance[runningBalance.length - 1].balance : account.balance;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Extrato da Conta: {account.name}</DialogTitle>
          <DialogDescription>
            Visualize as movimentações e realize a conciliação bancária. Saldo inicial: {account.currency} {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-secondary">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runningBalance.length > 0 ? runningBalance.map((entry) => (
                    <TableRow key={entry.id} data-state={reconciledIds.has(entry.id) && 'selected'}>
                      <TableCell>
                        <Checkbox
                          checked={reconciledIds.has(entry.id)}
                          onCheckedChange={() => handleToggleReconciled(entry.id)}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(entry.dueDate), 'dd/MM/yy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           {entry.type === 'credit' 
                           ? <ArrowUpCircle className="h-4 w-4 text-success" /> 
                           : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                           <div>
                            <p className="font-medium">{entry.partner}</p>
                            <p className="text-xs text-muted-foreground">Fatura: {entry.invoiceId} | Processo: {entry.processId}</p>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {entry.type === 'debit' ? `${entry.currency} ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                       <TableCell className="text-right font-mono text-success">
                        {entry.type === 'credit' ? `${entry.currency} ${entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{entry.currency} {entry.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">Nenhuma movimentação no período.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-lg font-bold">
                Saldo Final: <Badge className="text-lg">{account.currency} {finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge>
            </div>
            <Button>Fechar Dia</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
