
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, FileText } from 'lucide-react';
import type { FinancialEntry } from '@/lib/financials-data';
import type { Shipment, QuoteCharge } from '@/lib/shipment';
import { runGenerateNfseXml } from '@/app/actions';

interface NfseGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: { entry: FinancialEntry; shipment: Shipment } | null;
}

const tomadorSchema = z.object({
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido').default('08315383000107'),
  razaoSocial: z.string().min(1, 'Obrigatório').default('LTI DO BRASIL LTDA'),
  endereco: z.string().min(1, 'Obrigatório').default('RUA DOMINGOS FASCIN neto'),
  numero: z.string().min(1, 'Obrigatório').default('584'),
  bairro: z.string().min(1, 'Obrigatório').default('Vila faschin'),
  codigoMunicipio: z.string().length(7, 'Código IBGE deve ter 7 dígitos').default('3552205'),
  uf: z.string().length(2, 'UF deve ter 2 letras').default('SP'),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos').default('08240000'),
});

const nfseDialogSchema = z.object({
  tomador: tomadorSchema,
  selectedCharges: z.array(z.string()).min(1, 'Selecione pelo menos uma despesa para a nota fiscal.'),
});

type NfseDialogFormData = z.infer<typeof nfseDialogSchema>;

export function NfseGenerationDialog({ isOpen, onClose, data }: NfseGenerationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<NfseDialogFormData>({
    resolver: zodResolver(nfseDialogSchema),
    defaultValues: {
      tomador: {
        cpfCnpj: '08315383000107',
        razaoSocial: 'LTI DO BRASIL LTDA',
        endereco: 'RUA DOMINGOS FASCIN NETO',
        numero: '584',
        bairro: 'VILA FASCIN',
        codigoMunicipio: '3552205',
        uf: 'SP',
        cep: '08240000',
      },
      selectedCharges: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "selectedCharges" as never,
  });

  useEffect(() => {
    if (data) {
      // Reset form with default values when new data is provided
      form.reset({
        tomador: {
          cpfCnpj: '08315383000107',
          razaoSocial: 'LTI DO BRASIL LTDA',
          endereco: 'RUA DOMINGOS FASCIN NETO',
          numero: '584',
          bairro: 'VILA FASCIN',
          codigoMunicipio: '3552205',
          uf: 'SP',
          cep: '08240000',
        },
        selectedCharges: [],
      });
    }
  }, [data, form]);
  
  const watchedCharges = form.watch('selectedCharges');

  const chargesToDisplay = useMemo(() => {
    if (!data) return [];
    return data.shipment.charges.filter(c => c.sacado === data.entry.partner);
  }, [data]);

  const totalValue = useMemo(() => {
    return chargesToDisplay
      .filter(charge => watchedCharges.includes(charge.id))
      .reduce((sum, charge) => sum + charge.sale, 0);
  }, [watchedCharges, chargesToDisplay]);


  const onSubmit = async (formData: NfseDialogFormData) => {
    if (!data) return;
    setIsLoading(true);

    const discriminacao = chargesToDisplay
        .filter(c => watchedCharges.includes(c.id))
        .map(c => `${c.name}: ${c.saleCurrency} ${c.sale.toFixed(2)}`)
        .join('; ');

    const nfseInputData = {
        prestador: { cnpj: '10298168000189', inscricaoMunicipal: '348' },
        rps: { numero: Math.floor(1000 + Math.random() * 9000), loteId: Math.floor(100 + Math.random() * 900)},
        tomador: formData.tomador,
        servico: {
            valorServicos: totalValue,
            aliquota: 0.05,
            issRetido: '2',
            itemListaServico: '04.02',
            discriminacao: `Ref. Fatura ${data.entry.invoiceId}. ${discriminacao}`,
            codigoMunicipioPrestacao: '4208203',
        },
    };

    const response = await runGenerateNfseXml(nfseInputData);
    
    if(response.success){
        const encodedData = encodeURIComponent(JSON.stringify({
            formData: nfseInputData,
            xml: response.data.xml
        }));
        router.push(`/nfse?data=${encodedData}`);
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro ao gerar XML',
            description: response.error || "Ocorreu um erro inesperado."
        });
    }

    setIsLoading(false);
  };
  
  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar NFS-e para Fatura {data.entry.invoiceId}</DialogTitle>
          <DialogDescription>
            Selecione as despesas a serem incluídas na nota e confirme os dados do tomador.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow flex flex-col overflow-y-auto pr-2">
                
                <h3 className="text-lg font-semibold">Despesas da Fatura</h3>
                <ScrollArea className="h-48 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chargesToDisplay.map((charge) => (
                                <TableRow key={charge.id}>
                                    <TableCell>
                                        <FormField
                                            control={form.control}
                                            name="selectedCharges"
                                            render={({ field }) => (
                                                <Checkbox
                                                    checked={field.value?.includes(charge.id)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), charge.id])
                                                        : field.onChange(field.value?.filter((value) => value !== charge.id))
                                                    }}
                                                />
                                            )}
                                        />
                                    </TableCell>
                                    <TableCell>{charge.name}</TableCell>
                                    <TableCell className="text-right font-mono">{charge.saleCurrency} {charge.sale.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <div className="text-right font-bold text-lg">
                    Valor Total da Nota: BRL {totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>

                <Separator />

                <h3 className="text-lg font-semibold">Dados do Tomador</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="tomador.cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="tomador.razaoSocial" render={({ field }) => (<FormItem><FormLabel>Nome/Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <FormField control={form.control} name="tomador.endereco" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="tomador.numero" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tomador.bairro" render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tomador.cep" render={({ field }) => (<FormItem><FormLabel>CEP (s/ traço)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tomador.codigoMunicipio" render={({ field }) => (<FormItem><FormLabel>Cód. Município</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tomador.uf" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <DialogFooter className="pt-4 !mt-8">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Gerar XML da NFS-e
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
