
'use client';

import { useState } from 'react';
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
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Split } from 'lucide-react';
import type { FinancialEntry } from '@/lib/financials-data';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface RenegotiationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  entry: FinancialEntry | null;
  onConfirm: (installments: Omit<FinancialEntry, 'id'>[]) => void;
}

const renegotiationSchema = z.object({
  entryAmount: z.coerce.number().optional(),
  installments: z.coerce.number().min(1, 'Mínimo de 1 parcela.').max(48, 'Máximo de 48 parcelas.'),
  startDate: z.date({ required_error: 'Data de início é obrigatória.' }),
});

type RenegotiationFormData = z.infer<typeof renegotiationSchema>;

export function RenegotiationDialog({ isOpen, onClose, entry, onConfirm }: RenegotiationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<RenegotiationFormData>({
    resolver: zodResolver(renegotiationSchema),
    defaultValues: {
        installments: 2,
        startDate: addMonths(new Date(), 1)
    },
  });
  
  const onSubmit = (data: RenegotiationFormData) => {
    if (!entry) return;

    setIsLoading(true);

    const totalAmount = data.entryAmount || entry.amount;
    const installmentAmount = totalAmount / data.installments;

    const newInstallments: Omit<FinancialEntry, 'id'>[] = [];

    for (let i = 0; i < data.installments; i++) {
        const dueDate = addMonths(data.startDate, i);
        newInstallments.push({
            type: 'credit',
            partner: entry.partner,
            invoiceId: `${entry.invoiceId}-P${i + 1}/${data.installments}`,
            dueDate: dueDate.toISOString(),
            amount: installmentAmount,
            currency: entry.currency,
            processId: entry.processId,
            status: 'Aberto',
            expenseType: 'Operacional',
            originalEntryId: entry.id,
            description: `Parcela ${i + 1}/${data.installments} da renegociação da fatura ${entry.invoiceId}`
        });
    }

    onConfirm(newInstallments);
    setIsLoading(false);
  };
  
  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renegociar Fatura: {entry.invoiceId}</DialogTitle>
          <DialogDescription>
            Divida o saldo devedor de {entry.currency} {entry.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})} em novas parcelas.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField control={form.control} name="entryAmount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Valor da Entrada (Opcional)</FormLabel>
                        <FormControl><Input type="number" placeholder="Ex: 500.00" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="installments" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nº de Parcelas (Saldo Restante)</FormLabel>
                        <FormControl><Input type="number" placeholder="Ex: 3" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="startDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Data de Vencimento da 1ª Parcela</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild><FormControl>
                                <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                    {field.value ? format(field.value, "PPP") : <span>Selecione a data</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}/>
                
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Split className="mr-2 h-4 w-4" />}
                        Confirmar Parcelamento
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
