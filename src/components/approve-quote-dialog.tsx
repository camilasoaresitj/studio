
'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, PlusCircle, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { runExtractPartnerInfo } from '@/app/actions';
import { cn } from '@/lib/utils';
import type { Partner } from './partners-registry';
import type { Quote } from './customer-quotes-list';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

const departmentEnum = z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro']);
const departmentsArray = ['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'];

const contactSchema = z.object({
  name: z.string().min(1, 'Nome do contato é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  departments: z.array(departmentEnum).min(1, 'Selecione pelo menos um departamento'),
});


const partnerSchema = z.object({
  name: z.string().min(2, 'O nome do parceiro é obrigatório'),
  nomeFantasia: z.string().optional(),
  type: z.enum(['Cliente', 'Fornecedor', 'Agente']),
  cnpj: z.string().optional(),
  paymentTerm: z.coerce.number().optional(),
  exchangeRateAgio: z.coerce.number().optional(),
  
  // Cliente specific
  limiteCredito: z.coerce.number().optional(),
  tipoCliente: z.object({
    importacao: z.boolean().default(false),
    exportacao: z.boolean().default(false),
  }).optional(),

  // Agente specific
  tipoAgente: z.object({
    fcl: z.boolean().default(false),
    lcl: z.boolean().default(false),
    air: z.boolean().default(false),
    projects: z.boolean().default(false),
  }).optional(),
  
  // Fornecedor specific
  tipoFornecedor: z.string().optional(),
  
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

interface ApproveQuoteDialogProps {
  quote: Quote | null;
  partners: Partner[];
  onApprovalConfirmed: (quote: Quote, overseasPartner: Partner, agent?: Partner) => void;
  onClose: () => void;
}

export function ApproveQuoteDialog({ quote, partners, onApprovalConfirmed, onClose }: ApproveQuoteDialogProps) {
  const [activeTab, setActiveTab] = useState('select');
  const [selectedOverseasPartnerId, setSelectedOverseasPartnerId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('none'); // Default to 'none' for direct shipment
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAutofillText, setAiAutofillText] = useState('');
  const { toast } = useToast();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      type: 'Cliente',
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

  // Reset state when dialog opens for a new quote
  useEffect(() => {
    if (quote) {
      setActiveTab('select');
      setSelectedOverseasPartnerId(null);
      setSelectedAgentId('none');
      setAiAutofillText('');
      form.reset({
        name: '',
        type: 'Cliente',
        cnpj: '',
        address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
        contacts: [{ name: '', email: '', phone: '', departments: ['Operacional'] }],
      });
    }
  }, [quote, form]);

  if (!quote) return null;

  const isImport = quote.destination.toUpperCase().includes('BR');
  const partnerRole = isImport ? 'Shipper' : 'Consignee';
  const agentPartners = partners.filter(p => p.type === 'Agente');

  const handleConfirm = async () => {
    let overseasPartner: Partner | null = null;
    if (activeTab === 'select') {
      if (!selectedOverseasPartnerId) {
        toast({ variant: 'destructive', title: `Nenhum ${partnerRole} selecionado` });
        return;
      }
      overseasPartner = partners.find(p => p.id.toString() === selectedOverseasPartnerId) || null;
    } else { // 'create' tab
      const isValid = await form.trigger();
      if (!isValid) {
        toast({ variant: 'destructive', title: 'Formulário do parceiro inválido', description: 'Por favor, corrija os erros.' });
        return;
      }
      const newPartnerData = form.getValues();
      overseasPartner = {
        ...newPartnerData,
        id: Math.max(...partners.map(p => p.id), 0) + 1, // Create a new temporary ID
      };
    }

    if (!overseasPartner) {
        toast({ variant: 'destructive', title: `Erro ao definir o ${partnerRole}` });
        return;
    }

    const agent = selectedAgentId !== 'none' 
        ? partners.find(p => p.id.toString() === selectedAgentId)
        : undefined;

    onApprovalConfirmed(quote, overseasPartner, agent);
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
      form.setValue('address', data.address);
      if (data.contacts && data.contacts.length > 0) {
        replace(data.contacts);
      }
      toast({ title: 'Dados preenchidos com sucesso!', className: 'bg-success text-success-foreground' });
    } else {
      toast({ variant: 'destructive', title: 'Erro na análise', description: response.error });
    }
    setIsAiLoading(false);
  };

  return (
    <Dialog open={!!quote} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirmar Detalhes do Embarque</DialogTitle>
          <DialogDescription>
            Informe o {partnerRole} e o Agente (opcional) para o embarque {quote.id.replace('-DRAFT', '')}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto pr-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{partnerRole} (Obrigatório)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="select">Selecionar Existente</TabsTrigger>
                            <TabsTrigger value="create">Cadastrar Novo</TabsTrigger>
                        </TabsList>
                        <TabsContent value="select" className="mt-4">
                           <Label>Selecione o {partnerRole} da sua lista de parceiros</Label>
                           <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" role="combobox" aria-expanded={isPopoverOpen} className="w-full justify-between font-normal mt-1">
                                        {selectedOverseasPartnerId ? partners.find(p => p.id.toString() === selectedOverseasPartnerId)?.name : `Selecione um parceiro...`}
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
                                                        setSelectedOverseasPartnerId(partner.id.toString());
                                                        setIsPopoverOpen(false);
                                                    }}
                                                    >
                                                <Check className={cn("mr-2 h-4 w-4", selectedOverseasPartnerId === partner.id.toString() ? "opacity-100" : "opacity-0")}/>
                                                {partner.name}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </TabsContent>
                        <TabsContent value="create" className="mt-4">
                        <Form {...form}>
                            <form className="space-y-4">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField control={form.control} name="name" render={({ field }) => (
                                      <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem>
                                  )} />
                                  <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                          <SelectContent>
                                              <SelectItem value="Cliente">Cliente</SelectItem>
                                              <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                                              <SelectItem value="Agente">Agente</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                  )} />
                                </div>
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
                                            <FormField control={form.control} name={`contacts.${index}.departments`} render={() => (
                                              <FormItem>
                                                  <FormLabel>Departamentos</FormLabel>
                                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                                    {departmentsArray.map((item) => (
                                                      <FormField
                                                        key={item}
                                                        control={form.control}
                                                        name={`contacts.${index}.departments`}
                                                        render={({ field }) => (
                                                          <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                                            <FormControl>
                                                              <Checkbox
                                                                checked={field.value?.includes(item)}
                                                                onCheckedChange={(checked) => {
                                                                  const currentValue = field.value || [];
                                                                  return checked
                                                                    ? field.onChange([...currentValue, item])
                                                                    : field.onChange(currentValue.filter((value) => value !== item));
                                                                }}
                                                              />
                                                            </FormControl>
                                                            <FormLabel className="text-sm font-normal">{item}</FormLabel>
                                                          </FormItem>
                                                        )}
                                                      />
                                                    ))}
                                                  </div>
                                                <FormMessage />
                                              </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                ))}
                            </form>
                           </Form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Agente na Origem/Destino (Opcional)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Label>Selecione um agente ou deixe em branco para um embarque direto.</Label>
                     <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione um agente" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Nenhum (Embarque Direto)</SelectItem>
                            {agentPartners.map(agent => (
                                <SelectItem key={agent.id} value={agent.id.toString()}>
                                    {agent.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>
        </div>

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm}>Confirmar e Criar Embarque</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    