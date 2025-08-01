
'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, Search, Loader2, Wand2, UserPlus, ChevronsUpDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { runExtractPartnerInfo } from '@/app/actions';
import { cn } from '@/lib/utils';
import type { Partner } from '@/lib/partners-data';
import type { Quote } from '@/lib/initial-data';
import { Label } from './ui/label';

const contactSchema = z.object({
  name: z.string().min(1, 'Nome do contato é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  departments: z.array(z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro', 'Despachante'])).min(1, "Selecione ao menos um departamento"),
});

const partnerSchema = z.object({
  name: z.string().min(2, 'O nome do parceiro é obrigatório'),
  type: z.enum(['Cliente', 'Fornecedor', 'Agente']),
  cnpj: z.string().optional(),
  paymentTerm: z.coerce.number().optional(),
  exchangeRateAgio: z.coerce.number().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }),
  contacts: z.array(contactSchema).min(1, 'Adicione pelo menos um contato'),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

interface OverseasPartnerDialogProps {
  quote: Quote | null;
  partners: Partner[];
  onPartnerConfirmed: (partner: Partner, quote: Quote) => void;
  onClose: () => void;
}

export function OverseasPartnerDialog({ quote, partners, onPartnerConfirmed, onClose }: OverseasPartnerDialogProps) {
  const [activeTab, setActiveTab] = useState('select');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAutofillText, setAiAutofillText] = useState('');
  const { toast } = useToast();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      type: 'Fornecedor',
      cnpj: '',
      paymentTerm: undefined,
      exchangeRateAgio: undefined,
      address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
      contacts: [{ name: '', email: '', phone: '', departments: ['Operacional'] }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  if (!quote) return null;

  const isImport = quote.destination.toUpperCase().includes('BR');
  const partnerRole = isImport ? 'Shipper' : 'Consignee';

  const handleSelectConfirm = () => {
    if (!selectedPartnerId) {
      toast({ variant: 'destructive', title: 'Nenhum parceiro selecionado' });
      return;
    }
    const selectedPartner = partners.find(p => p.id?.toString() === selectedPartnerId);
    if (selectedPartner) {
      onPartnerConfirmed(selectedPartner, quote);
    }
  };

  const handleCreateConfirm = (data: PartnerFormData) => {
    const newPartnerData: Partner = {
        ...data,
        id: Math.max(...partners.map(p => p.id ?? 0), 0) + 1,
        roles: {
            cliente: data.type === 'Cliente',
            fornecedor: data.type === 'Fornecedor',
            agente: data.type === 'Agente',
            comissionado: false
        },
        contacts: data.contacts.map(c => ({...c, despachanteId: null, loginEmail: '', password: ''}))
    };
    onPartnerConfirmed(newPartnerData, quote);
  };

  const handleAiAutofill = async () => {
    if (!aiAutofillText.trim()) {
      toast({ variant: 'destructive', title: 'Nenhum texto para analisar' });
      return;
    }
    setIsAiLoading(true);
    const response = await runExtractPartnerInfo(aiAutofillText);
    if (response.success) {
      const { data } = response;
      form.setValue('name', data.name);
      form.setValue('cnpj', data.cnpj);
      form.setValue('address', data.address as any);
      if (data.contacts && data.contacts.length > 0) {
        replace(data.contacts.map(c => ({...c, departments: c.departments[0] ? [c.departments[0]] : ['Outro'] })) as any);
      }
      toast({ title: 'Dados preenchidos com sucesso!', className: 'bg-success text-success-foreground' });
    } else {
      toast({ variant: 'destructive', title: 'Erro na análise', description: response.error });
    }
    setIsAiLoading(false);
  };

  return (
    <Dialog open={!!quote} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cotação Aprovada: Informar {partnerRole}</DialogTitle>
          <DialogDescription>
            Selecione um parceiro existente ou cadastre um novo para o embarque {quote.id.replace('-DRAFT', '')}.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="select">Selecionar Existente</TabsTrigger>
                <TabsTrigger value="create">Cadastrar Novo</TabsTrigger>
            </TabsList>
            <TabsContent value="select" className="mt-4">
                <div className="space-y-4">
                    <Label>Selecione o {partnerRole} da sua lista de parceiros</Label>
                     <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isPopoverOpen} className="w-full justify-between font-normal">
                                {selectedPartnerId ? partners.find(p => p.id?.toString() === selectedPartnerId)?.name : `Selecione um parceiro...`}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
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
                                                setSelectedPartnerId(partner.id!.toString());
                                                setIsPopoverOpen(false);
                                            }}
                                            >
                                        <Check className={cn("mr-2 h-4 w-4", selectedPartnerId === partner.id!.toString() ? "opacity-100" : "opacity-0")}/>
                                        {partner.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <Button onClick={handleSelectConfirm} className="w-full">Confirmar {partnerRole}</Button>
                </div>
            </TabsContent>
            <TabsContent value="create" className="mt-4">
               <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateConfirm)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                     <div>
                        <Label>Autofill com IA</Label>
                        <Textarea
                            placeholder="Cole aqui a assinatura de e-mail ou os dados de contato do parceiro..."
                            value={aiAutofillText}
                            onChange={(e) => setAiAutofillText(e.target.value)}
                            className="mt-1"
                        />
                        <Button type="button" variant="secondary" onClick={handleAiAutofill} disabled={isAiLoading} className="mt-2">
                            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                            Preencher com IA
                        </Button>
                    </div>

                    <Separator />
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address.country" render={({ field }) => (
                        <FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="USA" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold">Contatos</h4>
                        <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', departments: ['Operacional'] })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Contato
                        </Button>
                    </div>
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-lg space-y-4 relative">
                            {fields.length > 1 && (
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`contacts.${index}.name`} render={({ field }) => (
                                    <FormItem><FormLabel>Nome do Contato</FormLabel><FormControl><Input placeholder="John Smith" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => (
                                    <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contact@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field }) => (
                                    <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="+1 555-555-5555" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name={`contacts.${index}.departments`} render={({ field }) => (
                                    <FormItem><FormLabel>Departamento</FormLabel>
                                        <Select onValueChange={(value) => field.onChange([value])} defaultValue={field.value[0]}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Comercial">Comercial</SelectItem>
                                            <SelectItem value="Operacional">Operacional</SelectItem>
                                            <SelectItem value="Financeiro">Financeiro</SelectItem>
                                            <SelectItem value="Importação">Importação</SelectItem>
                                            <SelectItem value="Exportação">Exportação</SelectItem>
                                            <SelectItem value="Outro">Outro</SelectItem>
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                            </div>
                        </div>
                    ))}
                    <Button type="submit" className="w-full">Salvar e Confirmar {partnerRole}</Button>
                </form>
               </Form>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
