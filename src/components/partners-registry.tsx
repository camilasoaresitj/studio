
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Search, Loader2, Wand2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { runExtractPartnerInfo, runSyncDFAgents } from '@/app/actions';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { DFAgent } from '@/ai/flows/sync-df-alliance-agents';

const departmentEnum = z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro']);
const departmentsArray = ['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'];
const supplierTypes = ['Transportadora', 'Cia Maritima', 'Cia Aerea', 'Terminal', 'Fumigacao', 'Despachante', 'Representante', 'Agente de Carga'];


const contactSchema = z.object({
  name: z.string().min(1, 'Nome do contato é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  departments: z.array(departmentEnum).min(1, 'Selecione pelo menos um departamento'),
});

const partnerSchema = z.object({
  name: z.string().min(2, 'O nome do parceiro é obrigatório'),
  nomeFantasia: z.string().optional(),
  entityType: z.enum(['Pessoa Juridica', 'Pessoa Fisica']).default('Pessoa Juridica'),
  roles: z.object({
    cliente: z.boolean().default(false),
    fornecedor: z.boolean().default(false),
    agente: z.boolean().default(false),
    comissionado: z.boolean().default(false),
  }),
  cnpj: z.string().optional(),
  cpf: z.string().optional(),
  vat: z.string().optional(),
  paymentTerm: z.coerce.number().optional(),
  exchangeRateAgio: z.coerce.number().optional(),
  
  // Cliente specific
  customerCategory: z.enum(['Nacional', 'Exterior']).optional(),
  limiteCredito: z.coerce.number().optional(),
  tipoCliente: z.object({
    importacao: z.boolean().default(false),
    exportacao: z.boolean().default(false),
  }).optional(),

  // Agente specific
  profitAgreement: z.object({
    amount: z.coerce.number().optional(),
    unit: z.enum(['por_container', 'por_bl', 'por_kilo']).optional(),
  }).optional(),
  tipoAgente: z.object({
    fcl: z.boolean().default(false),
    lcl: z.boolean().default(false),
    air: z.boolean().default(false),
    projects: z.boolean().default(false),
  }).optional(),
  
  // Fornecedor specific
  tipoFornecedor: z.array(z.string()).optional(),

  // Comissionado specific
  comissao: z.object({
    amount: z.coerce.number().optional(),
    unit: z.enum(['percent_profit', 'por_container', 'por_bl', 'por_kg']).optional(),
  }).optional(),


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
}).superRefine((data, ctx) => {
    if (!data.roles.cliente && !data.roles.fornecedor && !data.roles.agente && !data.roles.comissionado) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selecione pelo menos um perfil para o parceiro.",
            path: ['roles'],
        });
    }
});

export type Partner = z.infer<typeof partnerSchema> & { id: number };
type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnersRegistryProps {
  partners: Partner[];
  onPartnerSaved: (partner: Partner) => void;
}

export function PartnersRegistry({ partners, onPartnerSaved }: PartnersRegistryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [isSyncingAgents, setIsSyncingAgents] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterNomeFantasia, setFilterNomeFantasia] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [filterClienteTipo, setFilterClienteTipo] = useState('Todos');
  const [filterFornecedorTipo, setFilterFornecedorTipo] = useState('Todos');
  const [filterAgenteTipo, setFilterAgenteTipo] = useState('Todos');
  const [filterState, setFilterState] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const { toast } = useToast();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAutofillText, setAiAutofillText] = useState('');

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      nomeFantasia: '',
      entityType: 'Pessoa Juridica',
      roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
      cnpj: '',
      cpf: '',
      vat: '',
      paymentTerm: undefined,
      exchangeRateAgio: undefined,
      customerCategory: 'Nacional',
      limiteCredito: undefined,
      tipoCliente: { importacao: false, exportacao: false },
      profitAgreement: { amount: undefined, unit: 'por_container' },
      tipoAgente: { fcl: false, lcl: false, air: false, projects: false },
      tipoFornecedor: [],
      comissao: { amount: undefined, unit: 'percent_profit' },
      address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
      contacts: [{ name: '', email: '', phone: '', departments: ['Comercial'] }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "contacts",
  });
  
  const watchedEntityType = form.watch('entityType');
  const watchedRoles = form.watch('roles');
  const customerCategory = form.watch('customerCategory');

  const filteredPartners = useMemo(() => {
    return partners.filter(partner => {
        const nameMatch = filterName ? partner.name.toLowerCase().includes(filterName.toLowerCase()) : true;
        const fantasiaMatch = filterNomeFantasia ? partner.nomeFantasia?.toLowerCase().includes(filterNomeFantasia.toLowerCase()) : true;
        const stateMatch = filterState ? partner.address?.state?.toLowerCase().includes(filterState.toLowerCase()) : true;
        const countryMatch = filterCountry ? partner.address?.country?.toLowerCase().includes(filterCountry.toLowerCase()) : true;
        
        let typeMatch = true;
        if (filterType !== 'Todos') {
            const roleKey = filterType.toLowerCase() as keyof Partner['roles'];
            typeMatch = !!partner.roles[roleKey];
        }

        if (!nameMatch || !fantasiaMatch || !typeMatch || !stateMatch || !countryMatch) {
            return false;
        }

        if (filterType === 'Cliente' && filterClienteTipo !== 'Todos') {
            if (!partner.roles.cliente || !partner.tipoCliente) return false;
            return partner.tipoCliente[filterClienteTipo.toLowerCase() as 'importacao' | 'exportacao'];
        }

        if (filterType === 'Fornecedor' && filterFornecedorTipo !== 'Todos') {
             if (!partner.roles.fornecedor) return false;
            return partner.tipoFornecedor?.includes(filterFornecedorTipo);
        }

        if (filterType === 'Agente' && filterAgenteTipo !== 'Todos') {
            if (!partner.roles.agente || !partner.tipoAgente) return false;
            return partner.tipoAgente[filterAgenteTipo as 'fcl' | 'lcl' | 'air' | 'projects'];
        }

        return true;
    });
  }, [partners, filterName, filterNomeFantasia, filterType, filterClienteTipo, filterFornecedorTipo, filterAgenteTipo, filterState, filterCountry]);


  const handleOpenDialog = (partner: Partner | null) => {
    setEditingPartner(partner);
    setAiAutofillText('');
    form.reset(partner ? partner : {
      name: '',
      nomeFantasia: '',
      entityType: 'Pessoa Juridica',
      roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
      cnpj: '',
      cpf: '',
      vat: '',
      paymentTerm: undefined,
      exchangeRateAgio: undefined,
      customerCategory: 'Nacional',
      limiteCredito: undefined,
      tipoCliente: { importacao: false, exportacao: false },
      profitAgreement: { amount: undefined, unit: 'por_container' },
      tipoAgente: { fcl: false, lcl: false, air: false, projects: false },
      tipoFornecedor: [],
      comissao: { amount: undefined, unit: 'percent_profit' },
      address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
      contacts: [{ name: '', email: '', phone: '', departments: ['Comercial'] }],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PartnerFormData) => {
    onPartnerSaved({
      ...data,
      id: editingPartner?.id ?? 0,
    });
    form.reset();
    setIsDialogOpen(false);
    setEditingPartner(null);
    toast({
      title: `Parceiro ${editingPartner ? 'atualizado' : 'adicionado'}!`,
      description: `${data.name} foi salvo com sucesso.`,
      className: 'bg-success text-success-foreground'
    })
  };

  const handleFetchCnpj = async () => {
    const cnpj = form.getValues('cnpj')?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      toast({ variant: 'destructive', title: 'CNPJ inválido', description: 'Por favor, digite um CNPJ válido com 14 dígitos.' });
      return;
    }
    setIsFetchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) {
        throw new Error('Não foi possível buscar os dados do CNPJ. Verifique o número e tente novamente.');
      }
      const data = await response.json();
      
      form.setValue('name', data.razao_social || '');
      form.setValue('nomeFantasia', data.nome_fantasia || '');
      form.setValue('address.street', data.logradouro || '');
      form.setValue('address.number', data.numero || '');
      form.setValue('address.complement', data.complemento || '');
      form.setValue('address.district', data.bairro || '');
      form.setValue('address.city', data.municipio || '');
      form.setValue('address.state', data.uf || '');
      form.setValue('address.zip', data.cep?.replace(/\D/g, '') || '');
      form.setValue('address.country', 'Brasil');

      toast({ title: 'Dados do CNPJ preenchidos!', description: `Os dados de ${data.razao_social} foram carregados.` });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CNPJ', description: error.message });
    } finally {
      setIsFetchingCnpj(false);
    }
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
  
  const handleSyncDFAgents = async () => {
    setIsSyncingAgents(true);
    toast({ title: 'Iniciando sincronização...', description: 'Buscando agentes no diretório DF Alliance. Isso pode levar um momento.' });
    
    const response = await runSyncDFAgents();

    if (response.success) {
        const existingPartnerNames = new Set(partners.map(p => p.name.toLowerCase()));
        let newAgentsCount = 0;
        
        response.data.forEach((agent: DFAgent) => {
            if (!existingPartnerNames.has(agent.name.toLowerCase())) {
                const newPartner: Partner = {
                    id: 0, // temp ID
                    name: agent.name,
                    nomeFantasia: agent.name,
                    entityType: 'Pessoa Juridica',
                    roles: { cliente: false, fornecedor: false, agente: true, comissionado: false },
                    address: { country: agent.country },
                    contacts: [{
                        name: 'Contato Principal',
                        email: `contact@${agent.website.replace(/^(https?:\/\/)?(www\.)?/, '')}`,
                        phone: 'N/A',
                        departments: ['Comercial', 'Operacional'],
                    }],
                    tipoAgente: { fcl: true, lcl: true, air: true, projects: true },
                };
                onPartnerSaved(newPartner);
                newAgentsCount++;
            }
        });

        if (newAgentsCount > 0) {
            toast({
                title: 'Sincronização Concluída!',
                description: `${newAgentsCount} novo(s) agente(s) foram adicionados ao seu cadastro.`,
                className: 'bg-success text-success-foreground'
            });
        } else {
            toast({
                title: 'Sincronização Concluída!',
                description: 'Nenhum novo agente encontrado para adicionar.',
            });
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro na Sincronização',
            description: response.error
        });
    }

    setIsSyncingAgents(false);
  };


  const roleDisplay: { [key: string]: { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } } = {
    cliente: { label: 'Cliente', variant: 'default' },
    fornecedor: { label: 'Fornecedor', variant: 'secondary' },
    agente: { label: 'Agente', variant: 'outline' },
    comissionado: { label: 'Comissionado', variant: 'destructive' },
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div>
        <div className="flex justify-between items-start mb-4 flex-col sm:flex-row gap-4">
            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                 <Input placeholder="Filtrar por Razão Social..." value={filterName} onChange={e => setFilterName(e.target.value)} className="lg:col-span-2" />
                 <Input placeholder="Filtrar por Nome Fantasia..." value={filterNomeFantasia} onChange={e => setFilterNomeFantasia(e.target.value)} className="lg:col-span-2" />
                 <Input placeholder="Filtrar por Estado (UF)..." value={filterState} onChange={e => setFilterState(e.target.value)} />
                 <Input placeholder="Filtrar por País..." value={filterCountry} onChange={e => setFilterCountry(e.target.value)} />
                 <Select value={filterType} onValueChange={(value) => {
                    setFilterType(value);
                    setFilterClienteTipo('Todos');
                    setFilterFornecedorTipo('Todos');
                    setFilterAgenteTipo('Todos');
                 }}>
                     <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent>
                         <SelectItem value="Todos">Todos os Perfis</SelectItem>
                         <SelectItem value="Cliente">Cliente</SelectItem>
                         <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                         <SelectItem value="Agente">Agente</SelectItem>
                         <SelectItem value="Comissionado">Comissionado</SelectItem>
                     </SelectContent>
                 </Select>
                 
                 {filterType === 'Cliente' && (
                    <Select value={filterClienteTipo} onValueChange={setFilterClienteTipo} >
                        <SelectTrigger><SelectValue placeholder="Tipo Cliente..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todos">Qualquer Tipo</SelectItem>
                            <SelectItem value="Importacao">Importação</SelectItem>
                            <SelectItem value="Exportacao">Exportação</SelectItem>
                        </SelectContent>
                    </Select>
                 )}
                 {filterType === 'Fornecedor' && (
                    <Select value={filterFornecedorTipo} onValueChange={setFilterFornecedorTipo} >
                        <SelectTrigger><SelectValue placeholder="Tipo Fornecedor..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todos">Qualquer Tipo</SelectItem>
                            {supplierTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
                 {filterType === 'Agente' && (
                    <Select value={filterAgenteTipo} onValueChange={setFilterAgenteTipo} >
                        <SelectTrigger><SelectValue placeholder="Tipo Agente..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Todos">Qualquer Tipo</SelectItem>
                            <SelectItem value="fcl">FCL</SelectItem>
                            <SelectItem value="lcl">LCL</SelectItem>
                            <SelectItem value="air">Air</SelectItem>
                            <SelectItem value="projects">Projects</SelectItem>
                        </SelectContent>
                    </Select>
                 )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 self-start">
                <Button onClick={handleSyncDFAgents} variant="secondary" className="w-full sm:w-auto" disabled={isSyncingAgents}>
                    {isSyncingAgents ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Sincronizar DF Alliance
                </Button>
                <Button onClick={() => handleOpenDialog(null)} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Parceiro
                </Button>
            </div>
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>Nome Fantasia</TableHead>
                <TableHead>Perfis</TableHead>
                <TableHead>Contato Principal</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => {
                const primaryContact = partner.contacts.find(c => c.departments?.includes('Comercial')) || partner.contacts[0];
                return (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>{partner.nomeFantasia}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(partner.roles).map(([role, isActive]) => {
                           if (isActive) {
                             const display = roleDisplay[role];
                             return <Badge key={role} variant={display.variant as any} className="w-fit">{display.label}</Badge>
                           }
                           return null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>{primaryContact?.email || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(partner)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editingPartner ? 'Editar Parceiro' : 'Adicionar Novo Parceiro'}</DialogTitle>
          <DialogDescription>
            Preencha os dados e perfis do seu parceiro de negócios.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
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
              <Separator/>

              <FormField control={form.control} name="entityType" render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Tipo de Entidade</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Pessoa Juridica" /></FormControl>
                                <FormLabel className="font-normal">Pessoa Jurídica</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value="Pessoa Fisica" /></FormControl>
                                <FormLabel className="font-normal">Pessoa Física</FormLabel>
                            </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )} />
              
              <FormField
                control={form.control}
                name="roles"
                render={() => (
                    <FormItem>
                        <FormLabel>Perfis do Parceiro</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 pt-2">
                            <FormField control={form.control} name="roles.cliente" render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Cliente</FormLabel></FormItem>
                            )}/>
                            <FormField control={form.control} name="roles.fornecedor" render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Fornecedor</FormLabel></FormItem>
                            )}/>
                            <FormField control={form.control} name="roles.agente" render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Agente</FormLabel></FormItem>
                            )}/>
                            <FormField control={form.control} name="roles.comissionado" render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Comissionado</FormLabel></FormItem>
                            )}/>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
                />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{watchedEntityType === 'Pessoa Fisica' ? 'Nome Completo' : 'Nome / Razão Social'}</FormLabel>
                  <FormControl><Input placeholder={watchedEntityType === 'Pessoa Fisica' ? 'Nome da pessoa' : 'Nome da empresa'} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {watchedEntityType === 'Pessoa Juridica' && (
                <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome Fantasia (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Nome comercial da empresa" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              )}
              
              {watchedEntityType === 'Pessoa Fisica' ? (
                 <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} value={field.value ?? ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
              ) : (
                (watchedRoles.cliente && customerCategory === 'Exterior') ? (
                    <FormField control={form.control} name="vat" render={({ field }) => (
                        <FormItem>
                            <FormLabel>VAT Number (Opcional)</FormLabel>
                            <FormControl><Input placeholder="VAT Number" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                ) : (
                     <FormField control={form.control} name="cnpj" render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <div className="flex gap-2">
                            <FormControl><Input placeholder="00.000.000/0000-00" {...field} value={field.value ?? ''} /></FormControl>
                            <Button type="button" onClick={handleFetchCnpj} disabled={isFetchingCnpj}>
                              {isFetchingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                       )} />
                )
              )}

              {watchedRoles.cliente && (
                <Card className="bg-muted/30">
                  <CardHeader><CardTitle className="text-base">Detalhes do Cliente</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="customerCategory" render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Categoria do Cliente</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="Nacional" /></FormControl>
                              <FormLabel className="font-normal">Nacional</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl><RadioGroupItem value="Exterior" /></FormControl>
                              <FormLabel className="font-normal">Empresa no Exterior</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                   
                    <FormField control={form.control} name="limiteCredito" render={({ field }) => (
                        <FormItem><FormLabel>Limite de Crédito (R$)</FormLabel>
                            <FormControl><Input type="number" placeholder="50000" {...field} value={field.value ?? ''}/></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormItem>
                        <FormLabel>Tipo de Cliente</FormLabel>
                        <div className="flex gap-4 items-center pt-2">
                            <FormField control={form.control} name="tipoCliente.importacao" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none"><FormLabel>Importação</FormLabel></div>
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="tipoCliente.exportacao" render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    <div className="space-y-1 leading-none"><FormLabel>Exportação</FormLabel></div>
                                </FormItem>
                            )} />
                        </div>
                    </FormItem>
                  </CardContent>
                </Card>
              )}

              {watchedRoles.agente && (
                  <Card className="bg-muted/30">
                      <CardHeader><CardTitle className="text-base">Detalhes do Agente</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <FormItem>
                              <FormLabel>Tipo de Agente</FormLabel>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                                  <FormField control={form.control} name="tipoAgente.fcl" render={({ field }) => (
                                      <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">FCL</FormLabel></FormItem>
                                  )}/>
                                  <FormField control={form.control} name="tipoAgente.lcl" render={({ field }) => (
                                      <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">LCL</FormLabel></FormItem>
                                  )}/>
                                  <FormField control={form.control} name="tipoAgente.air" render={({ field }) => (
                                      <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Air</FormLabel></FormItem>
                                  )}/>
                                  <FormField control={form.control} name="tipoAgente.projects" render={({ field }) => (
                                      <FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Projects</FormLabel></FormItem>
                                  )}/>
                              </div>
                          </FormItem>
                          <Separator/>
                          <Label>Acordo de Profit</Label>
                          <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="profitAgreement.amount" render={({ field }) => (
                                  <FormItem><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField control={form.control} name="profitAgreement.unit" render={({ field }) => (
                                  <FormItem><FormLabel>Unidade</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="por_container">Por Contêiner</SelectItem>
                                            <SelectItem value="por_bl">Por BL</SelectItem>
                                            <SelectItem value="por_kilo">Por Kilo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                              )}/>
                          </div>
                      </CardContent>
                  </Card>
              )}

              {watchedRoles.fornecedor && (
                  <Card className="bg-muted/30">
                      <CardHeader><CardTitle className="text-base">Detalhes do Fornecedor</CardTitle></CardHeader>
                      <CardContent>
                          <FormField
                            control={form.control}
                            name="tipoFornecedor"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Tipo de Fornecedor</FormLabel>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                        {supplierTypes.map((item) => (
                                            <FormField
                                                key={item}
                                                control={form.control}
                                                name="tipoFornecedor"
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
                            )}
                          />
                      </CardContent>
                  </Card>
              )}

              {watchedRoles.comissionado && (
                  <Card className="bg-muted/30">
                      <CardHeader><CardTitle className="text-base">Detalhes do Comissionado</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <Label>Acordo de Comissão</Label>
                          <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name="comissao.amount" render={({ field }) => (
                                  <FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField control={form.control} name="comissao.unit" render={({ field }) => (
                                  <FormItem><FormLabel>Unidade</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="percent_profit">% Sobre a Lucratividade</SelectItem>
                                            <SelectItem value="por_container">Por Contêiner</SelectItem>
                                            <SelectItem value="por_bl">Por BL</SelectItem>
                                            <SelectItem value="por_kg">Por Kg</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                              )}/>
                          </div>
                      </CardContent>
                  </Card>
              )}

            <Separator className="my-4" />
            <h4 className="text-md font-semibold">Informações Financeiras</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="paymentTerm" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Prazo de Pagamento (dias)</FormLabel>
                        <FormControl><Input type="number" placeholder="Ex: 30" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="exchangeRateAgio" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Ágio sobre o Câmbio (%)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="Ex: 2.5" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

              <Separator className="my-4" />
              <h4 className="text-md font-semibold">Endereço</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="address.zip" render={({ field }) => (
                      <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="address.street" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input placeholder="Av. Paulista" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="address.number" render={({ field }) => (
                      <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="1000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="address.complement" render={({ field }) => (
                      <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Sala 101" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="address.district" render={({ field }) => (
                      <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Bela Vista" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="address.city" render={({ field }) => (
                      <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="São Paulo" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="address.state" render={({ field }) => (
                      <FormItem><FormLabel>Estado</FormLabel><FormControl><Input placeholder="SP" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="address.country" render={({ field }) => (
                      <FormItem><FormLabel>País</FormLabel><FormControl><Input placeholder="Brasil" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                  )} />
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold">Contatos</h4>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', departments: ['Comercial'] })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Contato
                </Button>
              </div>
               {fields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-lg space-y-4 relative">
                    {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <FormField control={form.control} name={`contacts.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Nome do Contato</FormLabel><FormControl><Input placeholder="João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => (
                        <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field }) => (
                        <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input placeholder="11999998888" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
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
              ))}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
