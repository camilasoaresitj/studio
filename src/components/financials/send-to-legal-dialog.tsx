
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import type { FinancialEntry } from '@/lib/financials-data';
import type { Shipment } from '@/lib/shipment-data';
import { runSendToLegal } from '@/app/actions';
import { getPartners, Partner } from '@/lib/partners-data';

interface SendToLegalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: { entry: FinancialEntry; shipment: Shipment } | null;
  onConfirm: (entry: FinancialEntry) => void;
}

const sendToLegalSchema = z.object({
  lawyerId: z.string().min(1, 'Selecione um advogado.'),
  comments: z.string().min(10, 'Adicione um comentário com pelo menos 10 caracteres.'),
});

type SendToLegalFormData = z.infer<typeof sendToLegalSchema>;

export function SendToLegalDialog({ isOpen, onClose, data, onConfirm }: SendToLegalDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [lawyers, setLawyers] = useState<Partner[]>([]);

  const form = useForm<SendToLegalFormData>({
    resolver: zodResolver(sendToLegalSchema),
    defaultValues: {
      lawyerId: '',
      comments: '',
    },
  });
  
  useEffect(() => {
    const allPartners = getPartners();
    const legalPartners = allPartners.filter(p => p.name.toLowerCase().includes('advoca'));
    if(legalPartners.length > 0) {
        setLawyers(legalPartners);
    } else {
        const dummyLawyer = { id: 99, name: "Escritório de Advocacia Exemplo", roles: {}, contacts: [{ name: "Dr. Exemplo", email: "advogado@example.com", phone: "11999999999", departments: ['Outro']}]} as Partner;
        setLawyers([dummyLawyer]);
    }
  }, []);

   useEffect(() => {
    if (data) {
      form.reset({
        lawyerId: lawyers.length > 0 ? lawyers[0].id!.toString() : '',
        comments: '',
      });
    }
  }, [data, form, lawyers]);


  const onSubmit = async (formData: SendToLegalFormData) => {
    if (!data) return;
    setIsLoading(true);

    const selectedLawyer = lawyers.find(l => l.id.toString() === formData.lawyerId);
    if (!selectedLawyer) {
        toast({ variant: 'destructive', title: 'Advogado não encontrado' });
        setIsLoading(false);
        return;
    }

    const response = await runSendToLegal({
        lawyerName: selectedLawyer.contacts[0].name,
        customerName: data.entry.partner,
        invoiceId: data.entry.invoiceId,
        processId: data.entry.processId,
        invoiceAmount: `${data.entry.currency} ${data.entry.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`,
        comments: formData.comments,
    });
    
    if(response.success){
        toast({
            title: 'Processo Enviado para Jurídico!',
            description: `E-mail de cobrança para ${data.entry.partner} foi enviado para ${selectedLawyer.contacts[0].email}.`,
            className: 'bg-success text-success-foreground'
        });
        onConfirm(data.entry);
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro ao Enviar',
            description: response.error || "Ocorreu um erro inesperado."
        });
    }

    setIsLoading(false);
  };
  
  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar para Jurídico: Fatura {data.entry.invoiceId}</DialogTitle>
          <DialogDescription>
            Selecione o advogado e adicione instruções para iniciar o processo de cobrança.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                    control={form.control}
                    name="lawyerId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Advogado / Escritório Responsável</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o advogado..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {lawyers.map(lawyer => (
                                    <SelectItem key={lawyer.id} value={lawyer.id!.toString()}>
                                        {lawyer.name} ({lawyer.contacts[0]?.email})
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Comentários / Instruções para o Advogado</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Ex: Cliente não responde aos nossos contatos há 30 dias. Solicitamos o início da cobrança extrajudicial..."
                                className="min-h-[120px]"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Confirmar e Enviar
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

      