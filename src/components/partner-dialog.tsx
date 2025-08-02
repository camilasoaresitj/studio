
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from './ui/checkbox';
import { PlusCircle, Edit, Trash2, Search, Loader2, Upload, X, CalendarIcon, ChevronsUpDown, Check, Send, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { getStoredFees, Fee } from '@/lib/fees-data';
import { runExtractPartnerInfo, savePartnerAction } from '@/app/actions';
import { partnerSchema, type Partner } from '@/lib/partners-data';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type PartnerFormData = import('zod').z.infer<typeof partnerSchema>;

interface PartnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPartnerSaved: (partner: Partner) => void;
  partner: Partner | null;
  allPartners: Partner[];
}

const departmentEnum = ['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Despachante', 'Outro'];
const mainModalsEnum = ['Marítimo', 'Aéreo'];
const incotermOptions = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];

const supplierTypes = [
    { id: 'ciaMaritima', label: 'Cia Marítima' },
    { id: 'ciaAerea', label: 'Cia Aérea' },
    { id: 'transportadora', label: 'Transportadora' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'coLoader', label: 'Co-loader' },
    { id: 'fumigacao', label: 'Fumigação' },
    { id: 'despachante', label: 'Despachante' },
    { id: 'representante', label: 'Representante' },
    { id: 'dta', label: 'DTA' },
    { id: 'comissionados', label: 'Comissionados' },
    { id: 'administrativo', label: 'Administrativo' },
    { id: 'aluguelContainer', label: 'Aluguel Contêiner' },
    { id: 'lashing', label: 'Lashing' },
    { id: 'seguradora', label: 'Seguradora' },
    { id: 'advogado', label: 'Advogado' },
];

export function PartnerDialog({ isOpen, onClose, onPartnerSaved, partner, allPartners }: PartnerDialogProps) {
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [routeInput, setRouteInput] = useState('');
  const [globalFees, setGlobalFees] = useState<Fee[]>([]);
  const { toast } = useToast();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
  });

  useEffect(() => {
    setGlobalFees(getStoredFees());
    const defaultData: PartnerFormData = {
        name: '',
        nomeFantasia: '',
        cnpj: '',
        vat: '',
        scac: '',
        roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
        contacts: [{ name: '', email: '', phone: '', departments: ['Comercial'], loginEmail: '', password: '', despachanteId: null }],
        address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
        tipoCliente: { importacao: false, exportacao: false, empresaNoExterior: false },
        tipoFornecedor: { ciaMaritima: false, ciaAerea: false, transportadora: false, terminal: false, coLoader: false, fumigacao: false, despachante: false, representante: false, dta: false, comissionados: false, administrativo: false, aluguelContainer: false, lashing: false, seguradora: false, advogado: false },
        tipoAgente: { fcl: false, lcl: false, air: false, projects: false },
        paymentTerm: 30,
        exchangeRateAgio: 0,
        demurrageAgreementDueDate: undefined,
        profitAgreements: [],
        commissionAgreement: { amount: 0, unit: 'porcentagem_lucro', currency: 'BRL', commissionClients: [] },
        terminalCommission: { amount: 0, unit: 'porcentagem_armazenagem' },
        standardFees: [],
        observations: '',
        kpi: { manual: { mainRoutes: [], mainModals: [] } }
    };
    form.reset(partner ? { ...defaultData, ...partner } : defaultData);
  }, [partner, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contacts',
  });
  
  const { fields: mainRoutes, append: appendRoute, remove: removeRoute } = useFieldArray({
    control: form.control,
    name: "kpi.manual.mainRoutes",
  });

  const { fields: profitFields, append: appendProfit, remove: removeProfit } = useFieldArray({
      control: form.control,
      name: "profitAgreements",
  });

  const { fields: feeFields, append: appendFee, remove: removeFee } = useFieldArray({
    control: form.control,
    name: "standardFees",
  });

  const watchedCnpj = form.watch('cnpj');
  const watchedRoles = form.watch('roles');
  const watchedFornecedor = form.watch('tipoFornecedor');
  const isEmpresaNoExterior = form.watch('tipoCliente.empresaNoExterior');
  const isTerminal = form.watch('tipoFornecedor.terminal');
  const documentType = isEmpresaNoExterior ? 'vat' : 'cnpj';
  const documentLabel = isEmpresaNoExterior ? 'VAT / Tax ID' : 'CNPJ / CPF';

  const clientPartners = useMemo(() => allPartners.filter(p => p.roles.cliente), [allPartners]);
  const despachantePartners = useMemo(() => allPartners.filter(p => p.tipoFornecedor?.despachante), [allPartners]);

  const handleFetchCnpjData = async () => {
    const cnpj = form.getValues('cnpj')?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      toast({ variant: 'destructive', title: 'CNPJ inválido', description: 'Por favor, insira um CNPJ com 14 dígitos.' });
      return;
    }
    setIsFetchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) throw new Error('Não foi possível consultar o CNPJ. Verifique se o número está correto.');
      const data = await response.json();
      
      form.setValue('name', data.razao_social || '');
      form.setValue('nomeFantasia', data.nome_fantasia || '');
      form.setValue('address.street', data.logradouro || '');
      form.setValue('address.number', data.numero || '');
      form.setValue('address.complement', data.complemento || '');
      form.setValue('address.district', data.bairro || '');
      form.setValue('address.city', data.municipio || '');
      form.setValue('address.state', data.uf || '');
      form.setValue('address.zip', data.cep || '');
      form.setValue('address.country', 'Brasil');
      
      toast({ title: 'Dados do CNPJ preenchidos!', className: 'bg-success text-success-foreground' });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CNPJ', description: error.message });
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const onSubmit = async (data: PartnerFormData) => {
    onPartnerSaved({ ...data, id: partner?.id ?? 0 });
    onClose();
  };
  
  const handleAddRoute = () => {
    if (routeInput.trim()) {
        appendRoute({ value: routeInput.trim() });
        setRouteInput('');
    }
  };
  
  const handleSendAccess = (contactEmail: string | undefined | null) => {
      if (!contactEmail) {
           toast({ variant: "destructive", title: "E-mail de Acesso Inválido", description: "O contato precisa ter um e-mail de acesso válido." });
           return;
      }
      toast({ title: "Acesso Enviado (Simulação)", description: `Um e-mail com as credenciais foi enviado para ${contactEmail}.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{partner ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do seu cliente, fornecedor ou agente.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow overflow-y-auto pr-2">
                <ScrollArea className="h-[calc(80vh-10rem)] pr-4">
                 <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="nomeFantasia" render={({ field }) => ( <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input placeholder="Nome fantasia" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={documentType} render={({ field }) => ( 
                            <FormItem>
                                <FormLabel>{documentLabel}</FormLabel>
                                <div className="flex items-center gap-2">
                                    <FormControl><Input placeholder={isEmpresaNoExterior ? 'Ex: IE1234567T' : '00.000.000/0001-00'} {...field} /></FormControl>
                                    {!isEmpresaNoExterior && (
                                    <Button type="button" onClick={handleFetchCnpjData} disabled={isFetchingCnpj || (watchedCnpj || '').replace(/\D/g, '').length !== 14}>
                                        {isFetchingCnpj ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                                        Buscar
                                    </Button>
                                    )}
                                </div>
                                <FormMessage />
                            </FormItem> 
                        )} />
                        {(watchedFornecedor?.ciaMaritima || watchedFornecedor?.ciaAerea) && (
                             <FormField control={form.control} name="scac" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>SCAC Code</FormLabel>
                                    <FormControl><Input placeholder="Ex: MAEU" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem> 
                            )} />
                        )}
                    </div>

                    <FormItem>
                        <FormLabel>Funções do Parceiro</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                            <FormField control={form.control} name="roles.cliente" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Cliente</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="roles.fornecedor" render={({ field }) => ( <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Fornecedor</FormLabel></FormItem>)} />
                            <FormField control={form.control} name="roles.agente" render={({ field }) => ( <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Agente</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="roles.comissionado" render={({ field }) => ( <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Comissionado</FormLabel></FormItem> )} />
                        </div>
                    </FormItem>

                    {watchedRoles?.cliente && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Tipo de Cliente</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
                             <FormField control={form.control} name="tipoCliente.importacao" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Importação</FormLabel></FormItem> )} />
                             <FormField control={form.control} name="tipoCliente.exportacao" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Exportação</FormLabel></FormItem> )} />
                             <FormField control={form.control} name="tipoCliente.empresaNoExterior" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Empresa no Exterior</FormLabel></FormItem> )} />
                              <FormField control={form.control} name="demurrageAgreementDueDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Venc. Termo Demurrage</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal h-9", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-auto h-4 w-4 opacity-50" />{field.value ? format(new Date(field.value), "dd/MM/yy") : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem> )} />
                        </div>
                    </div>}

                    {watchedRoles?.fornecedor && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Tipo de Fornecedor</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                            {supplierTypes.map(type => (
                                 <FormField key={type.id} control={form.control} name={`tipoFornecedor.${type.id as keyof NonNullable<PartnerFormData['tipoFornecedor']>}`} render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">{type.label}</FormLabel></FormItem> )} />
                            ))}
                        </div>
                         {(watchedFornecedor?.ciaMaritima || watchedFornecedor?.ciaAerea) && <FormField control={form.control} name="demurrageAgreementDueDate" render={({ field }) => ( <FormItem className="flex flex-col mt-4"><FormLabel>Venc. Termo Demurrage</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal h-9 w-48", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-auto h-4 w-4 opacity-50" />{field.value ? format(new Date(field.value), "dd/MM/yy") : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem> )} />}
                    </div>}
                    
                    {watchedRoles?.agente && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Tipo de Agente</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <FormField control={form.control} name="tipoAgente.fcl" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">FCL</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="tipoAgente.lcl" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">LCL</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="tipoAgente.air" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Aéreo</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="tipoAgente.projects" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Projetos</FormLabel></FormItem> )} />
                        </div>
                    </div>}
                    
                    {watchedRoles?.fornecedor && watchedFornecedor?.despachante && partner?.clientsLinked && partner.clientsLinked.length > 0 && (
                        <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                            <h4 className="font-semibold text-sm flex items-center gap-2"><LinkIcon className="h-4 w-4"/> Clientes Vinculados</h4>
                            <div className="flex flex-wrap gap-2">
                                {partner.clientsLinked.map(clientName => (
                                    <Badge key={clientName} variant="secondary">{clientName}</Badge>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <Separator className="my-4"/>

                    <h4 className="text-md font-semibold">Informações de KPI (Manual)</h4>
                    <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <div className="space-y-2">
                            <Label>Principais Rotas</Label>
                            <div className="flex gap-2">
                                <Input value={routeInput} onChange={(e) => setRouteInput(e.target.value)} placeholder="Ex: Santos > Rotterdam"/>
                                <Button type="button" size="sm" onClick={handleAddRoute}>Adicionar</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {mainRoutes.map((route, index) => (
                                    <Badge key={route.id} variant="secondary">
                                        {route.value}
                                        <button type="button" onClick={() => removeRoute(index)} className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                         <FormField
                            control={form.control}
                            name="kpi.manual.mainModals"
                            render={() => (
                            <FormItem>
                                <FormLabel>Principais Modais</FormLabel>
                                <div className="flex gap-4">
                                {mainModalsEnum.map((item) => (
                                    <FormField
                                        key={item}
                                        control={form.control}
                                        name="kpi.manual.mainModals"
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
                    </div>
                    
                    <Separator className="my-4"/>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="paymentTerm" render={({ field }) => ( <FormItem><FormLabel>Prazo de Pagamento (dias)</FormLabel><FormControl><Input type="number" placeholder="30" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        {!watchedRoles?.agente && <FormField control={form.control} name="exchangeRateAgio" render={({ field }) => ( <FormItem><FormLabel>Ágio sobre Câmbio (%)</FormLabel><FormControl><Input type="number" placeholder="2.5" {...field} /></FormControl><FormMessage /></FormItem> )} />}
                    </div>
                    
                    {(watchedRoles?.fornecedor || watchedRoles?.agente) && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-sm">Taxas Padrão do Parceiro</h4>
                            <Button type="button" size="sm" variant="outline" onClick={() => appendFee({ name: '', value: 0, currency: 'USD', unit: 'BL', containerType: 'Todos' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Taxa
                            </Button>
                        </div>
                        {feeFields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end border-b pb-2">
                                <FormField control={form.control} name={`standardFees.${index}.name`} render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Nome da Taxa</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Selecione..."/></SelectTrigger></FormControl><SelectContent>{globalFees.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent></Select>
                                </FormItem>)}/>
                                <FormField control={form.control} name={`standardFees.${index}.value`} render={({ field }) => (<FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" placeholder="150" className="h-9" {...field} /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name={`standardFees.${index}.currency`} render={({ field }) => (<FormItem><FormLabel>Moeda</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="BRL">BRL</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></FormItem>)}/>
                                <FormField control={form.control} name={`standardFees.${index}.containerType`} render={({ field }) => (<FormItem><FormLabel>Tipo Cont.</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Dry">Dry</SelectItem><SelectItem value="Reefer">Reefer</SelectItem><SelectItem value="Especiais">Especiais</SelectItem></SelectContent></Select></FormItem>)}/>
                                {watchedRoles?.agente && <FormField control={form.control} name={`standardFees.${index}.incoterm`} render={({ field }) => (<FormItem><FormLabel>Incoterm</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Todos"/></SelectTrigger></FormControl><SelectContent><SelectItem value="Todos">Todos</SelectItem>{incotermOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></FormItem>)} />}
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeFee(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                    </div>}

                    {watchedRoles?.agente && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold text-sm">Acordo de Lucro (Profit Share)</h4>
                            <Button type="button" size="sm" variant="outline" onClick={() => appendProfit({ modal: 'FCL', direction: 'IMPORTACAO', amount: 50, unit: 'por_container', currency: 'USD' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Acordo
                            </Button>
                        </div>
                        {profitFields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end border-b pb-2">
                                <FormField control={form.control} name={`profitAgreements.${index}.modal`} render={({ field }) => (<FormItem><FormLabel>Modal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="FCL">FCL</SelectItem><SelectItem value="LCL">LCL</SelectItem><SelectItem value="AIR">Aéreo</SelectItem><SelectItem value="ROAD_FTL">Rodoviário FTL</SelectItem></SelectContent></Select></FormItem>)}/>
                                <FormField control={form.control} name={`profitAgreements.${index}.direction`} render={({ field }) => (<FormItem><FormLabel>Direção</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="IMPORTACAO">Importação (Pagamos)</SelectItem><SelectItem value="EXPORTACAO">Exportação (Cobramos)</SelectItem></SelectContent></Select></FormItem>)}/>
                                <FormField control={form.control} name={`profitAgreements.${index}.amount`} render={({ field }) => (<FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" className="h-9" {...field} /></FormControl></FormItem>)}/>
                                <FormField control={form.control} name={`profitAgreements.${index}.unit`} render={({ field }) => (<FormItem><FormLabel>Unidade</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9"><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="por_container">Por Contêiner</SelectItem><SelectItem value="por_bl">Por BL/AWB</SelectItem><SelectItem value="porcentagem_lucro">% Lucro</SelectItem></SelectContent></Select></FormItem>)}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeProfit(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                    </div>}


                    {watchedRoles?.comissionado && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Acordo de Comissão</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField control={form.control} name="commissionAgreement.unit" render={({ field }) => (
                                <FormItem><FormLabel>Base de Cálculo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="porcentagem_lucro">% do Lucro</SelectItem>
                                    <SelectItem value="por_container">Por Contêiner</SelectItem>
                                    <SelectItem value="por_bl">Por BL/AWB</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                             )}/>
                             <FormField control={form.control} name="commissionAgreement.amount" render={({ field }) => ( <FormItem><FormLabel>Valor/Percentual</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="commissionAgreement.currency" render={({ field }) => (
                                <FormItem><FormLabel>Moeda</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="BRL">BRL</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                             )}/>
                        </div>
                        <FormField
                            control={form.control}
                            name="commissionAgreement.commissionClients"
                            render={({ field }) => (
                                <FormItem className="mt-4">
                                    <FormLabel>Clientes Comissionados</FormLabel>
                                    <FormControl>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md max-h-32 overflow-y-auto">
                                            {clientPartners.map((client) => (
                                                <FormItem key={client.id} className="flex flex-row items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(client.name)}
                                                            onCheckedChange={(checked) => {
                                                                const currentValue = field.value || [];
                                                                return checked
                                                                    ? field.onChange([...currentValue, client.name])
                                                                    : field.onChange(currentValue.filter((name) => name !== client.name));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal">{client.name}</FormLabel>
                                                </FormItem>
                                            ))}
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>}

                    {isTerminal && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Comissão do Terminal</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="terminalCommission.unit" render={({ field }) => (
                                <FormItem><FormLabel>Base de Cálculo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="porcentagem_armazenagem">% sobre Armazenagem</SelectItem>
                                    <SelectItem value="por_container">Valor Fixo por Contêiner</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                             )}/>
                             <FormField control={form.control} name="terminalCommission.amount" render={({ field }) => ( <FormItem><FormLabel>Valor/Percentual</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         </div>
                    </div>}

                    <Separator className="my-4"/>
                    <h4 className="text-md font-semibold">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <FormField control={form.control} name="address.street" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormField control={form.control} name="address.number" render={({ field }) => ( <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="address.complement" render={({ field }) => ( <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="address.district" render={({ field }) => ( <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="address.city" render={({ field }) => ( <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="address.state" render={({ field }) => ( <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="address.zip" render={({ field }) => ( <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="address.country" render={({ field }) => ( <FormItem><FormLabel>País</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>


                    <Separator className="my-4"/>

                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold">Contatos</h4>
                        <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', departments: ['Comercial'], despachanteId: null, loginEmail: '', password: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Contato
                        </Button>
                    </div>

                    {fields.map((field, index) => {
                        const contact = form.watch(`contacts.${index}`);
                        const isDespachante = contact.departments?.includes('Despachante');

                        return (
                        <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                        {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`contacts.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contact@company.com" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field }) => ( <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="+1 555-555-5555" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name={`contacts.${index}.departments`} render={() => (
                            <FormItem>
                                <FormLabel>Departamentos</FormLabel>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                                {departmentEnum.map((item) => (
                                    <FormField
                                    key={item}
                                    control={form.control}
                                    name={`contacts.${index}.departments`}
                                    render={({ field }) => (
                                        <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value?.includes(item as any)}
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
                         {isDespachante && (
                                <div className="animate-in fade-in-50">
                                <FormField
                                    control={form.control}
                                    name={`contacts.${index}.despachanteId`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vincular Despachante Cadastrado</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} value={field.value?.toString()}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione o despachante..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {despachantePartners.map(d => <SelectItem key={d.id} value={d.id!.toString()}>{d.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>
                            )}
                        {watchedRoles?.cliente && (
                            <div className="p-3 border rounded-lg bg-secondary/50">
                                <h5 className="text-sm font-semibold mb-2">Acesso ao Portal do Cliente</h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <FormField control={form.control} name={`contacts.${index}.loginEmail`} render={({ field }) => (<FormItem className="col-span-1"><FormLabel>E-mail de Acesso</FormLabel><FormControl><Input type="email" placeholder="login@cliente.com" {...field}/></FormControl><FormMessage/></FormItem>)} />
                                    <FormField control={form.control} name={`contacts.${index}.password`} render={({ field }) => (<FormItem className="col-span-1"><FormLabel>Senha</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="button" size="sm" onClick={() => handleSendAccess(form.getValues(`contacts.${index}.loginEmail`))} className="mb-1"><Send className="mr-2 h-4 w-4"/> Enviar Acesso</Button>
                                </div>
                            </div>
                        )}
                        </div>
                    )})}
                    
                    <Separator className="my-4"/>

                    <FormField
                      control={form.control}
                      name="observations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (Logins, Senhas, Procedimentos)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Site: a-b-c.com&#10;Login: fulano&#10;Senha: 12345"
                              className="min-h-[100px] font-mono text-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                 </div>
                </ScrollArea>
                <DialogFooter className="pt-4 mt-auto border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar Parceiro</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}
