
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BankAccount } from '@/lib/financials-data';
import { useEffect } from 'react';

const accountSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Nome da conta é obrigatório'),
  bankName: z.string().min(1, 'Nome do banco é obrigatório'),
  agency: z.string().min(1, 'Agência é obrigatória'),
  accountNumber: z.string().min(1, 'Número da conta é obrigatório'),
  currency: z.enum(['BRL', 'USD', 'EUR']),
  balance: z.coerce.number(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface BankAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: BankAccount) => void;
  account: BankAccount | null;
}

export function BankAccountDialog({ isOpen, onClose, onSave, account }: BankAccountDialogProps) {
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });

  useEffect(() => {
    if (isOpen) {
        if (account && account.id) {
            form.reset(account);
        } else {
            form.reset({
                name: '',
                bankName: '',
                agency: '',
                accountNumber: '',
                currency: 'BRL',
                balance: 0,
            });
        }
    }
  }, [account, form, isOpen]);

  const onSubmit = (data: AccountFormData) => {
    onSave({ ...data, id: account?.id ?? 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account?.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle>
          <DialogDescription>
            Preencha os dados da conta para conciliação.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conta Corrente BRL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome do Banco</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Banco do Brasil" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Moeda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="BRL">BRL</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="agency"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: 1234-5" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                 <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Número da Conta</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: 123.456-7" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
            </div>
             <FormField
                control={form.control}
                name="balance"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Saldo Inicial</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit">Salvar Conta</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
