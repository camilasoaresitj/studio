
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import type { FinancialEntry } from '@/lib/financials-data';
import { getPartners, Partner } from '@/lib/partners-data';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, ChevronsUpDown, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

const entrySchema = z.object({
  partner: z.string().min(1, 'Selecione um parceiro.'),
  description: z.string().min(1, 'Descrição é obrigatória.'),
  amount: z.coerce.number().min(0.01, 'O valor deve ser maior que zero.'),
  currency: z.enum(['BRL', 'USD', 'EUR']),
  dueDate: z.date({ required_error: 'Data de vencimento é obrigatória.' }),
  recurrence: z.enum(['Única', 'Mensal', 'Anual']),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface FinancialEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<FinancialEntry, 'id'>) => void;
}

export function FinancialEntryDialog({ isOpen, onClose, onSave }: FinancialEntryDialogProps) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isPartnerPopoverOpen, setIsPartnerPopoverOpen] = useState(false);

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
        partner: '',
        description: '',
        amount: undefined,
        currency: 'BRL',
        dueDate: new Date(),
        recurrence: 'Única'
    }
  });

  useEffect(() => {
    if (isOpen) {
        setPartners(getPartners().filter(p => p.roles.fornecedor));
        form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = (data: EntryFormData) => {
    onSave({
        ...data,
        type: 'debit',
        invoiceId: `ADM-${data.partner.substring(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        processId: 'Administrativo',
        status: 'Pendente de Aprovação',
        expenseType: 'Administrativa',
        dueDate: data.dueDate.toISOString(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lançar Nova Despesa Administrativa</DialogTitle>
          <DialogDescription>
            Preencha os dados da despesa. Ela será enviada para aprovação gerencial.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="partner"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fornecedor</FormLabel>
                  <Popover open={isPartnerPopoverOpen} onOpenChange={setIsPartnerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? partners.find(p => p.name === field.value)?.name
                            : "Selecione um fornecedor"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar fornecedor..." />
                        <CommandList>
                            <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                            <CommandGroup>
                            {partners.map((p) => (
                                <CommandItem
                                value={p.name}
                                key={p.id}
                                onSelect={() => {
                                    form.setValue("partner", p.name);
                                    setIsPartnerPopoverOpen(false);
                                }}
                                >
                                <Check className={cn("mr-2 h-4 w-4", p.name === field.value ? "opacity-100" : "opacity-0")}/>
                                {p.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição da Despesa</FormLabel><FormControl><Textarea placeholder="Ex: Aluguel do escritório de Itajaí" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Moeda</FormLabel>
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
                )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="dueDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Data de Vencimento</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                        </Popover>
                    <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="recurrence" render={({ field }) => (
                    <FormItem><FormLabel>Recorrência</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Única">Única</SelectItem>
                                <SelectItem value="Mensal">Mensal</SelectItem>
                                <SelectItem value="Anual">Anual</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit">Salvar para Aprovação</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
