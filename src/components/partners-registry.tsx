
'use client';

import { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partnerSchema, type Partner } from '@/lib/partners-data';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from './ui/checkbox';
import { PlusCircle, Edit, Trash2, Search, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type PartnerFormData = import('zod').z.infer<typeof partnerSchema>;

interface PartnersRegistryProps {
  partners: Partner[];
  onPartnerSaved: (partner: Partner) => void;
}

const departmentEnum = ['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'];

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


export function PartnersRegistry({ partners, onPartnerSaved }: PartnersRegistryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [filters, setFilters] = useState({ name: '', country: '', state: '', type: '' });
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      nomeFantasia: '',
      cnpj: '',
      vat: '',
      roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
      contacts: [{ name: '', email: '', phone: '', departments: [] }],
      address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
      tipoCliente: { importacao: false, exportacao: false, empresaNoExterior: false },
      tipoFornecedor: { ciaMaritima: false, ciaAerea: false, transportadora: false, terminal: false, coLoader: false, fumigacao: false, despachante: false, representante: false, dta: false, comissionados: false, administrativo: false, aluguelContainer: false, lashing: false, seguradora: false, advogado: false },
      tipoAgente: { fcl: false, lcl: false, air: false, projects: false },
      paymentTerm: 30,
      exchangeRateAgio: 0,
      profitAgreement: { amount: 50, unit: 'por_container', currency: 'USD' },
      commissionAgreement: { amount: 0, unit: 'porcentagem_lucro', currency: 'BRL' }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contacts',
  });
  
  const watchedCnpj = form.watch('cnpj');
  const watchedRoles = form.watch('roles');
  const isEmpresaNoExterior = form.watch('tipoCliente.empresaNoExterior');
  const documentType = isEmpresaNoExterior ? 'vat' : 'cnpj';
  const documentLabel = isEmpresaNoExterior ? 'VAT / Tax ID' : 'CNPJ / CPF';

  const handleOpenDialog = (partner: Partner | null) => {
    setEditingPartner(partner);
    form.reset(
      partner || {
        name: '',
        nomeFantasia: '',
        cnpj: '',
        vat: '',
        roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
        contacts: [{ name: '', email: '', phone: '', departments: [] }],
        address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
        tipoCliente: { importacao: false, exportacao: false, empresaNoExterior: false },
        tipoFornecedor: { ciaMaritima: false, ciaAerea: false, transportadora: false, terminal: false, coLoader: false, fumigacao: false, despachante: false, representante: false, dta: false, comissionados: false, administrativo: false, aluguelContainer: false, lashing: false, seguradora: false, advogado: false },
        tipoAgente: { fcl: false, lcl: false, air: false, projects: false },
        paymentTerm: 30,
        exchangeRateAgio: 0,
        profitAgreement: { amount: 50, unit: 'por_container', currency: 'USD' },
        commissionAgreement: { amount: 0, unit: 'porcentagem_lucro', currency: 'BRL' }
      }
    );
    setIsDialogOpen(true);
  };
  
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

  const onSubmit = (data: PartnerFormData) => {
    onPartnerSaved({
      ...data,
      id: editingPartner?.id ?? 0, 
    });
    setIsDialogOpen(false);
    setEditingPartner(null);
    toast({
      title: `Parceiro ${editingPartner ? 'atualizado' : 'adicionado'}!`,
      description: `O parceiro "${data.name}" foi salvo com sucesso.`,
      className: 'bg-success text-success-foreground',
    });
  };
  
  const getPartnerTypeString = (partner: Partner): string => {
    const types: string[] = [];
    if (partner.roles.cliente) types.push('Cliente');
    if (partner.roles.fornecedor) {
        const supplierSubtypes = Object.entries(partner.tipoFornecedor || {})
            .filter(([, value]) => value)
            .map(([key]) => supplierTypes.find(t => t.id === key)?.label)
            .filter(Boolean);
        if (supplierSubtypes.length > 0) {
            types.push(supplierSubtypes.join(', '));
        } else {
            types.push('Fornecedor');
        }
    }
    if (partner.roles.agente) {
        const agentSubtypes = Object.entries(partner.tipoAgente || {})
            .filter(([, value]) => value)
            .map(([key]) => key.toUpperCase())
            .join('/');
        types.push(`Agente (${agentSubtypes || 'N/A'})`);
    }
    if (partner.roles.comissionado) types.push('Comissionado');

    return types.join(' | ');
  }

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
        const nameMatch = partner.name.toLowerCase().includes(filters.name.toLowerCase());
        const countryMatch = !filters.country || (partner.address.country || '').toLowerCase().includes(filters.country.toLowerCase());
        const stateMatch = !filters.state || (partner.address.state || '').toLowerCase().includes(filters.state.toLowerCase());
        const typeMatch = !filters.type || getPartnerTypeString(partner).toLowerCase().includes(filters.type.toLowerCase());
        return nameMatch && countryMatch && stateMatch && typeMatch;
    });
  }, [partners, filters]);
  
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        const newPartners: Partner[] = jsonData.map((row, index) => {
          const roleLower = String(row.role || '').toLowerCase();
          const newPartner: Partner = {
            id: 0,
            name: String(row.name || `Novo Parceiro ${index}`),
            nomeFantasia: String(row.nome_fantasia || ''),
            cnpj: String(row.cnpj || ''),
            vat: String(row.vat || ''),
            roles: {
                cliente: roleLower.includes('cliente'),
                fornecedor: roleLower.includes('fornecedor'),
                agente: roleLower.includes('agente'),
                comissionado: roleLower.includes('comissionado'),
            },
            address: {
                street: String(row.address_street || ''),
                number: String(row.address_number || ''),
                complement: String(row.address_complement || ''),
                district: String(row.address_district || ''),
                city: String(row.address_city || ''),
                state: String(row.address_state || ''),
                zip: String(row.address_zip || ''),
                country: String(row.address_country || ''),
            },
            contacts: [{
                name: String(row.contact_name || 'Contato Principal'),
                email: String(row.contact_email || 'email@a-definir.com'),
                phone: String(row.contact_phone || '000000000'),
                departments: ['Comercial']
            }]
          };
          onPartnerSaved(newPartner);
          return newPartner;
        });
        
        toast({
          title: "Importação Concluída!",
          description: `${newPartners.length} parceiros foram adicionados/atualizados.`,
          className: 'bg-success text-success-foreground'
        });

      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erro ao Importar', description: err.message });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
            <Input placeholder="Buscar por Nome..." value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)} />
            <Input placeholder="Buscar por País..." value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)} />
            <Input placeholder="Buscar por Estado..." value={filters.state} onChange={(e) => handleFilterChange('state', e.target.value)} />
            <Input placeholder="Buscar por Tipo..." value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} />
        </div>
        <div className="flex gap-2 self-end md:self-auto">
            <Button variant="outline" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
            </Button>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Parceiro
            </Button>
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Contato Principal</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell className="text-xs">
                  {getPartnerTypeString(partner)}
                </TableCell>
                <TableCell>{partner.address?.country}</TableCell>
                <TableCell>{partner.address?.state}</TableCell>
                <TableCell>
                  <div className="text-sm">{partner.contacts[0]?.name}</div>
                  <div className="text-xs text-muted-foreground">{partner.contacts[0]?.email}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(partner)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Nenhum parceiro encontrado.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
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

                    <FormItem>
                        <FormLabel>Funções do Parceiro</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                            <FormField control={form.control} name="roles.cliente" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Cliente</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="roles.fornecedor" render={({ field }) => ( <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Fornecedor</FormLabel></FormItem>)} />
                            <FormField control={form.control} name="roles.agente" render={({ field }) => ( <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Agente</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="roles.comissionado" render={({ field }) => ( <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Comissionado</FormLabel></FormItem> )} />
                        </div>
                    </FormItem>

                    {watchedRoles.cliente && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Tipo de Cliente</h4>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField control={form.control} name="tipoCliente.importacao" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Importação</FormLabel></FormItem> )} />
                             <FormField control={form.control} name="tipoCliente.exportacao" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Exportação</FormLabel></FormItem> )} />
                             <FormField control={form.control} name="tipoCliente.empresaNoExterior" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Empresa no Exterior</FormLabel></FormItem> )} />
                        </div>
                    </div>}

                    {watchedRoles.fornecedor && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Tipo de Fornecedor</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                            {supplierTypes.map(type => (
                                 <FormField key={type.id} control={form.control} name={`tipoFornecedor.${type.id as keyof PartnerFormData['tipoFornecedor']}`} render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">{type.label}</FormLabel></FormItem> )} />
                            ))}
                        </div>
                    </div>}
                    
                    {watchedRoles.agente && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Tipo de Agente</h4>
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <FormField control={form.control} name="tipoAgente.fcl" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">FCL</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="tipoAgente.lcl" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">LCL</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="tipoAgente.air" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Aéreo</FormLabel></FormItem> )} />
                            <FormField control={form.control} name="tipoAgente.projects" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Projetos</FormLabel></FormItem> )} />
                        </div>
                    </div>}
                    
                    <Separator className="my-4"/>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="paymentTerm" render={({ field }) => ( <FormItem><FormLabel>Prazo de Pagamento (dias)</FormLabel><FormControl><Input type="number" placeholder="30" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        {!watchedRoles.agente && <FormField control={form.control} name="exchangeRateAgio" render={({ field }) => ( <FormItem><FormLabel>Ágio sobre Câmbio (%)</FormLabel><FormControl><Input type="number" placeholder="2.5" {...field} /></FormControl><FormMessage /></FormItem> )} />}
                    </div>
                    
                    {watchedRoles.agente && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
                        <h4 className="font-semibold text-sm">Acordo de Lucro (Profit Share)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField control={form.control} name="profitAgreement.unit" render={({ field }) => (
                                <FormItem><FormLabel>Unidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="por_container">Por Contêiner</SelectItem>
                                    <SelectItem value="por_bl">Por BL/AWB</SelectItem>
                                    <SelectItem value="porcentagem_lucro">Porcentagem do Lucro</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                             )}/>
                             <FormField control={form.control} name="profitAgreement.amount" render={({ field }) => ( <FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="number" placeholder="50" {...field} /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="profitAgreement.currency" render={({ field }) => (
                                <FormItem><FormLabel>Moeda</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="BRL">BRL</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                             )}/>
                        </div>
                    </div>}

                    {watchedRoles.comissionado && <div className="space-y-2 p-3 border rounded-lg animate-in fade-in-50">
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
                                <FormItem><FormLabel>Moeda</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="BRL">BRL</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                             )}/>
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
                        <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', departments: [] })}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Contato
                        </Button>
                    </div>

                    {fields.map((field, index) => (
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
                 </div>
                </ScrollArea>
                <DialogFooter className="pt-4 mt-auto border-t">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar Parceiro</Button>
                </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
