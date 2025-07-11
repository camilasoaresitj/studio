
'use client';

import { useState, useMemo } from 'react';
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

  const statementEntries = useMemo(() => {
    if (!account) return [];
    
    // Flatten entries and their payments into a single list of transactions for this account
    const transactions = entries.flatMap(entry => 
      (entry.payments || [])
        .filter(p => p.accountId === account.id)
        .map(payment => {
          let amountInAccountCurrency = payment.amount;
          if (entry.currency !== account.currency && payment.exchangeRate) {
            amountInAccountCurrency = payment.amount * payment.exchangeRate;
          }
          const transactionType = entry.type === 'credit' ? 'credit' : 'debit';
          return {
            id: payment.id,
            date: new Date(payment.date),
            description: `Pgto. Fatura ${entry.invoiceId} (${entry.partner})`,
            type: transactionType,
            amount: amountInAccountCurrency,
          };
        })
    );

    // Sort transactions by date
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    let currentBalance = account.balance;
    const transactionsWithBalance = transactions.map(tx => {
      const newBalance = tx.type === 'credit' ? currentBalance + tx.amount : currentBalance - tx.amount;
      const result = { ...tx, balance: newBalance };
      currentBalance = newBalance;
      return result;
    });

    // We need to reverse the logic for the final balance calculation.
    // The balance shown on the card is the "current" final balance.
    // The statement should show the initial balance and how we arrived at the current one.
    let runningBalance = account.balance;
    const reversedTransactions = transactions.slice().sort((a, b) => b.date.getTime() - a.date.getTime());
    const historicalTransactions = reversedTransactions.map(tx => {
        const balanceBeforeTx = tx.type === 'credit' ? runningBalance - tx.amount : runningBalance + tx.amount;
        const result = { ...tx, balance: runningBalance };
        runningBalance = balanceBeforeTx;
        return result;
    }).reverse();


    return {
        transactions: historicalTransactions,
        initialBalance: runningBalance
    }

  }, [account, entries]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Extrato da Conta: {account.name}</DialogTitle>
          <DialogDescription>
            Visualize as movimentações e realize a conciliação bancária. Saldo inicial: {account.currency} {statementEntries.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  {statementEntries.transactions.length > 0 ? statementEntries.transactions.map((tx) => (
                    <TableRow key={tx.id} data-state={reconciledIds.has(tx.id) && 'selected'}>
                      <TableCell>
                        <Checkbox
                          checked={reconciledIds.has(tx.id)}
                          onCheckedChange={() => handleToggleReconciled(tx.id)}
                        />
                      </TableCell>
                      <TableCell>{format(new Date(tx.date), 'dd/MM/yy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           {tx.type === 'credit' 
                           ? <ArrowUpCircle className="h-4 w-4 text-success" /> 
                           : <ArrowDownCircle className="h-4 w-4 text-destructive" />}
                           <div>
                            <p className="font-medium">{tx.description}</p>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {tx.type === 'debit' ? `${account.currency} ${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                       <TableCell className="text-right font-mono text-success">
                        {tx.type === 'credit' ? `${account.currency} ${tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">{account.currency} {tx.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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
                Saldo Final: <Badge className="text-lg">{account.currency} {account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge>
            </div>
            <Button>Fechar Dia</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
