
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
import { Loader2, FileText, ChevronsUpDown, Check } from 'lucide-react';
import type { FinancialEntry } from '@/lib/financials-data';
import type { Shipment, QuoteCharge, Partner } from '@/lib/shipment';
import { runGenerateNfseXml } from '@/app/actions';
import { getPartners } from '@/lib/partners-data';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';

interface NfseGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: { entry: FinancialEntry; shipment: Shipment } | null;
}

const tomadorSchema = z.object({
  cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
  razaoSocial: z.string().min(1, 'Obrigatório'),
  endereco: z.string().min(1, 'Obrigatório'),
  numero: z.string().min(1, 'Obrigatório'),
  bairro: z.string().min(1, 'Obrigatório'),
  codigoMunicipio: z.string().length(7, 'Código IBGE deve ter 7 dígitos'),
  uf: z.string().length(2, 'UF deve ter 2 letras'),
  cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
});

const nfseDialogSchema = z.object({
  selectedTomadorId: z.string().min(1, 'Selecione um tomador.'),
  tomador: tomadorSchema,
  selectedCharges: z.array(z.string()).min(1, 'Selecione pelo menos uma despesa para a nota fiscal.'),
});

type NfseDialogFormData = z.infer<typeof nfseDialogSchema>;

export function NfseGenerationDialog({ isOpen, onClose, data }: NfseGenerationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isPartnerPopoverOpen, setIsPartnerPopoverOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<NfseDialogFormData>({
    resolver: zodResolver(nfseDialogSchema),
    defaultValues: { selectedCharges: [], selectedTomadorId: '' },
  });
  
  const watchedCharges = form.watch('selectedCharges');
  const watchedTomadorId = form.watch('selectedTomadorId');

  useEffect(() => {
    if (isOpen) {
      setPartners(getPartners().filter(p => p.roles.cliente));
    }
  }, [isOpen]);

  const chargesToDisplay = useMemo(() => {
    if (!data) return [];
    // Show only charges that are credits (contas a receber) and not already invoiced under another NFS-e.
    return data.shipment.charges.filter(c => c.sacado === data.entry.partner);
  }, [data]);

  const totalValue = useMemo(() => {
    return chargesToDisplay
      .filter(charge => watchedCharges.includes(charge.id))
      .reduce((sum, charge) => sum + charge.sale, 0);
  }, [watchedCharges, chargesToDisplay]);


  useEffect(() => {
    if (data && partners.length > 0) {
        const consignee = data.shipment.consignee;
        const initialTomador = partners.find(p => p.id === consignee?.id) || partners.find(p => p.name === data.entry.partner) || partners[0];
        
        const isMaritime = data.shipment.details.cargo?.toLowerCase().includes('container') || !data.shipment.details.cargo?.toLowerCase().includes('kg');
        const isImport = data.shipment.destination.toUpperCase().includes('BR');
        
        let defaultCharges: string[] = [];
        if (isMaritime && isImport) {
            defaultCharges = ['DESCONSOLIDAÇÃO', 'BL FEE'];
        } else if (!isMaritime && isImport) {
            defaultCharges = ['DESCONSOLIDAÇÃO', 'COLLECT FEE'];
        } else if (!isMaritime && !isImport) {
            defaultCharges = ['AWB FEE', 'HANDLING FEE', 'DESPACHO ADUANEIRO'];
        } else if (isMaritime && !isImport) {
            defaultCharges = ['BL FEE', 'LACRE'];
        }

        const defaultChargeIds = chargesToDisplay
            .filter(c => defaultCharges.some(dc => c.name.toUpperCase().includes(dc)))
            .map(c => c.id);

        form.reset({
            selectedTomadorId: initialTomador.id!.toString(),
            tomador: {
              cpfCnpj: initialTomador.cnpj?.replace(/\D/g, '') || '',
              razaoSocial: initialTomador.name || '',
              endereco: initialTomador.address?.street || '',
              numero: initialTomador.address?.number || '',
              bairro: initialTomador.address?.district || '',
              codigoMunicipio: '4208203', // Itajai
              uf: initialTomador.address?.state || '',
              cep: initialTomador.address?.zip?.replace(/\D/g, '') || '',
            },
            selectedCharges: defaultChargeIds,
        });
    }
  }, [data, partners, chargesToDisplay, form]);

  useEffect(() => {
      if (watchedTomadorId) {
          const selectedPartner = partners.find(p => p.id?.toString() === watchedTomadorId);
          if (selectedPartner) {
              form.setValue('tomador', {
                  cpfCnpj: selectedPartner.cnpj?.replace(/\D/g, '') || '',
                  razaoSocial: selectedPartner.name || '',
                  endereco: selectedPartner.address?.street || '',
                  numero: selectedPartner.address?.number || '',
                  bairro: selectedPartner.address?.district || '',
                  codigoMunicipio: '4208203', // Itajai
                  uf: selectedPartner.address?.state || '',
                  cep: selectedPartner.address?.zip?.replace(/\D/g, '') || '',
              });
          }
      }
  }, [watchedTomadorId, partners, form]);


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
            valorIss: 0,
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
                 <FormField
                    control={form.control}
                    name="selectedCharges"
                    render={() => (
                        <FormItem>
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
                                             <FormField
                                                key={charge.id}
                                                control={form.control}
                                                name="selectedCharges"
                                                render={({ field }) => {
                                                    return (
                                                    <TableRow>
                                                        <TableCell>
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(charge.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                        ? field.onChange([...(field.value || []), charge.id])
                                                                        : field.onChange(field.value?.filter((value) => value !== charge.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                        </TableCell>
                                                        <TableCell>{charge.name}</TableCell>
                                                        <TableCell className="text-right font-mono">{charge.saleCurrency} {charge.sale.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                )}}
                                            />
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="text-right font-bold text-lg">
                    Valor Total da Nota: BRL {totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </div>

                <Separator />

                <h3 className="text-lg font-semibold">Dados do Tomador</h3>
                 <FormField
                    control={form.control}
                    name="selectedTomadorId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Selecionar Tomador</FormLabel>
                        <Popover open={isPartnerPopoverOpen} onOpenChange={setIsPartnerPopoverOpen}>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button variant="outline" role="combobox" className={cn("w-[300px] justify-between", !field.value && "text-muted-foreground")}>
                                {field.value ? partners.find((p) => p.id?.toString() === field.value)?.name : "Selecione o Tomador"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar parceiro..." />
                                <CommandList>
                                <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
                                <CommandGroup>
                                    {partners.map((partner) => (
                                    <CommandItem
                                        value={partner.name}
                                        key={partner.id}
                                        onSelect={() => {
                                        form.setValue("selectedTomadorId", partner.id!.toString());
                                        setIsPartnerPopoverOpen(false);
                                        }}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", partner.id?.toString() === field.value ? "opacity-100" : "opacity-0")} />
                                        {partner.name}
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
