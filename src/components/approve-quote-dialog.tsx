
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partnerSchema as newPartnerSchema } from '@/lib/partners-data';
import type { Partner } from '@/lib/partners-data';
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
import { Loader2, Wand2, PlusCircle, Trash2, Check, ChevronsUpDown, FileUp, Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { runExtractPartnerInfo } from '@/app/actions';
import { cn } from '@/lib/utils';
import type { Quote } from './customer-quotes-list';
import { Label } from './ui/label';
import type { UploadedDocument } from '@/lib/shipment';

const departmentEnum = ['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'];

// In a real app, this would be fetched from a user management service/database
const systemUsers = [
    { id: 'user-1', name: 'Admin Geral' },
    { id: 'user-2', name: 'Usuário Comercial' },
    { id: 'user-3', name: 'Usuário Operacional' },
    { id: 'user-4', name: 'Usuário Financeiro' },
];

type PartnerFormData = z.infer<typeof newPartnerSchema>;

interface PartnerFormBlockProps {
    title: string;
    partners: Partner[];
    onPartnerCreated: (partner: Partner) => void;
    selectedPartnerId: string | null;
    setSelectedPartnerId: (id: string | null) => void;
    children?: React.ReactNode;
}

function PartnerFormBlock({ title, partners, onPartnerCreated, selectedPartnerId, setSelectedPartnerId, children }: PartnerFormBlockProps) {
    const [activeTab, setActiveTab] = useState('select');
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiAutofillText, setAiAutofillText] = useState('');
    const { toast } = useToast();

    const form = useForm<PartnerFormData>({
        resolver: zodResolver(newPartnerSchema),
        defaultValues: {
            name: '',
            roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
            cnpj: '',
            address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
            contacts: [{ name: '', email: '', phone: '', departments: ['Operacional'] }],
        },
    });

    const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "contacts" });
    
    const handleAiAutofill = async () => {
        if (!aiAutofillText.trim()) return toast({ variant: 'destructive', title: 'Nenhum texto para analisar' });
        setIsAiLoading(true);
        const response = await runExtractPartnerInfo(aiAutofillText);
        if (response.success) {
            const { data } = response;
            form.setValue('name', data.name);
            form.setValue('cnpj', data.cnpj || '');
            form.setValue('address', data.address);
            if (data.contacts && data.contacts.length > 0) {
                replace(data.contacts.map(c => ({ ...c, departments: c.departments || ['Operacional'] })));
            }
            toast({ title: 'Dados preenchidos com sucesso!', className: 'bg-success text-success-foreground' });
        } else {
            toast({ variant: 'destructive', title: 'Erro na análise', description: response.error });
        }
        setIsAiLoading(false);
    };

    const handleCreatePartner = async () => {
        const isValid = await form.trigger();
        if (!isValid) return toast({ variant: 'destructive', title: 'Formulário do parceiro inválido' });

        const newPartnerData = form.getValues();
        onPartnerCreated({ ...newPartnerData, id: Date.now() }); // Use temporary ID
        toast({ title: `${title} cadastrado com sucesso!`, description: 'Você já pode selecioná-lo na lista.', className: 'bg-success text-success-foreground' });
        setActiveTab('select');
    };

    return (
        <Card>
            <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="select">Selecionar Existente</TabsTrigger>
                        <TabsTrigger value="create">Cadastrar Novo</TabsTrigger>
                    </TabsList>
                    <TabsContent value="select" className="mt-4 space-y-4">
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
                                            {partners.map(partner => (
                                                <CommandItem value={partner.name} key={partner.id} onSelect={() => { setSelectedPartnerId(partner.id?.toString() ?? null); setIsPopoverOpen(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedPartnerId === partner.id?.toString() ? "opacity-100" : "opacity-0")} />
                                                    {partner.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {children}
                    </TabsContent>
                    <TabsContent value="create" className="mt-4">
                        <Form {...form}>
                            <form className="space-y-4">
                                <Label>Autofill com IA</Label>
                                <Textarea placeholder="Cole aqui a assinatura de e-mail ou os dados de contato..." value={aiAutofillText} onChange={e => setAiAutofillText(e.target.value)} />
                                <Button type="button" variant="secondary" onClick={handleAiAutofill} disabled={isAiLoading}>
                                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Preencher com IA
                                </Button>
                                <Separator />
                                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome / Razão Social</FormLabel><FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="flex justify-between items-center"><h4 className="text-md font-semibold">Contatos</h4><Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', departments: ['Operacional'] })}><PlusCircle className="mr-2 h-4 w-4" /> Add Contato</Button></div>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-3 border rounded-lg space-y-4 relative">
                                        {fields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`contacts.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Nome do Contato</FormLabel><FormControl><Input placeholder="John Smith" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contact@company.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" onClick={handleCreatePartner} className="w-full">Cadastrar e Usar {title}</Button>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

const FileUploadField = ({ label, file, onFileChange }: { label: string, file: File | null, onFileChange: (file: File | null) => void }) => {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex items-center gap-2 mt-1">
                <Input type="file" onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)} className="flex-grow" />
                {file && <span className="text-sm text-muted-foreground truncate flex items-center gap-1"><Paperclip className="h-4 w-4" /> {file.name}</span>}
            </div>
        </div>
    );
};

interface ApproveQuoteDialogProps {
  quote: Quote | null;
  partners: Partner[];
  onApprovalConfirmed: (quote: Quote, shipper: Partner, consignee: Partner, agent: Partner | undefined, notifyName: string, terminalId: string | undefined, responsibleUser: string, invoiceNumber: string, poNumber: string, uploadedDocs: UploadedDocument[]) => void;
  onPartnerSaved: (partner: Partner) => void;
  onClose: () => void;
}

export function ApproveQuoteDialog({ quote, partners: initialPartners, onApprovalConfirmed, onPartnerSaved, onClose }: ApproveQuoteDialogProps) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [selectedShipperId, setSelectedShipperId] = useState<string | null>(null);
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string | null>(null);
  const [selectedNotifyId, setSelectedNotifyId] = useState<string | null>(null);
  const [isNotifyPopoverOpen, setIsNotifyPopoverOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('none');
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | undefined>();
  const [responsibleUserId, setResponsibleUserId] = useState<string | undefined>();
  const [notifyName, setNotifyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [netFile, setNetFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [packingFile, setPackingFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (quote) {
      setSelectedShipperId(null);
      setSelectedConsigneeId(null);
      setSelectedNotifyId(null);
      setSelectedAgentId('none');
      setNotifyName('');
      setSelectedTerminalId(undefined);
      setResponsibleUserId(undefined);
      setInvoiceNumber('');
      setPoNumber('');
      setNetFile(null);
      setInvoiceFile(null);
      setPackingFile(null);
    }
  }, [quote]);
  
  useEffect(() => {
    if (selectedNotifyId) {
        const partner = partners.find(p => p.id?.toString() === selectedNotifyId);
        if (partner) {
            setNotifyName(partner.name);
        }
    }
  }, [selectedNotifyId, partners]);


  if (!quote) return null;

  const agentPartners = partners.filter(p => p.roles.agente);
  const terminalPartners = partners.filter(p => p.roles.fornecedor && p.tipoFornecedor?.terminal);
  const isImport = quote.destination.toUpperCase().includes('BR');
  const needsRedestinacao = quote.charges.some(c => c.name.toUpperCase().includes('REDESTINA'));


  const handlePartnerCreated = (newPartner: Partner) => {
    onPartnerSaved(newPartner);
    setPartners(prev => [...prev, newPartner]);
  }

  const handleConfirm = async () => {
    if (!selectedShipperId || !selectedConsigneeId) {
        toast({ variant: 'destructive', title: `Shipper e Consignee são obrigatórios.` });
        return;
    }
    const shipper = partners.find(p => p.id?.toString() === selectedShipperId);
    const consignee = partners.find(p => p.id?.toString() === selectedConsigneeId);

    if (!shipper || !consignee) {
        toast({ variant: 'destructive', title: `Erro ao encontrar parceiros selecionados.` });
        return;
    }
    
    if (!notifyName.trim()) {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Por favor, informe o Notify Party.' });
        return;
    }
    
    if (isImport && selectedAgentId === 'none') {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Para importações, um agente é obrigatório.' });
        return;
    }

    if (needsRedestinacao && !selectedTerminalId) {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Por favor, selecione um terminal para a redestinação.' });
        return;
    }
    
    if (!responsibleUserId) {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Por favor, selecione um responsável pelo processo.' });
        return;
    }
    
    const uploadedDocs: UploadedDocument[] = [];
    if(netFile) uploadedDocs.push({ name: 'Negociação NET', file: netFile });
    if(invoiceFile) uploadedDocs.push({ name: 'Invoice', file: invoiceFile });
    if(packingFile) uploadedDocs.push({ name: 'Packing List', file: packingFile });

    const agent = selectedAgentId !== 'none' ? partners.find(p => p.id?.toString() === selectedAgentId) : undefined;
    const responsibleUser = systemUsers.find(u => u.id === responsibleUserId)?.name || 'N/A';
    
    onApprovalConfirmed(quote, shipper, consignee, agent, notifyName, selectedTerminalId, responsibleUser, invoiceNumber, poNumber, uploadedDocs);
  };

  return (
    <Dialog open={!!quote} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirmar Detalhes do Embarque</DialogTitle>
          <DialogDescription>Informe os dados do embarque {quote.id.replace('-DRAFT', '')}.</DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-4 flex-grow overflow-y-auto pr-2">
            <PartnerFormBlock 
                title="Shipper (Exportador)"
                partners={partners}
                onPartnerCreated={handlePartnerCreated}
                selectedPartnerId={selectedShipperId}
                setSelectedPartnerId={setSelectedShipperId}
            />
             <PartnerFormBlock 
                title="Consignee (Importador)"
                partners={partners}
                onPartnerCreated={handlePartnerCreated}
                selectedPartnerId={selectedConsigneeId}
                setSelectedPartnerId={setSelectedConsigneeId}
             >
                <div className="space-y-1 mt-4">
                    <Label htmlFor="notify-party">Notify Party (Obrigatório)</Label>
                    <Popover open={isNotifyPopoverOpen} onOpenChange={setIsNotifyPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={isNotifyPopoverOpen} className="w-full justify-between font-normal">
                                {notifyName || "Selecione um parceiro..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Buscar parceiro..." />
                                <CommandList>
                                    <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
                                    <CommandGroup>
                                        {partners.map(partner => (
                                            <CommandItem value={partner.name} key={partner.id} onSelect={() => { setSelectedNotifyId(partner.id?.toString() ?? null); setIsNotifyPopoverOpen(false); }}>
                                                <Check className={cn("mr-2 h-4 w-4", selectedNotifyId === partner.id?.toString() ? "opacity-100" : "opacity-0")} />
                                                {partner.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
             </PartnerFormBlock>
        </div>

        <div className="space-y-4 pt-4 border-t">
            <Card>
                <CardHeader><CardTitle className="text-lg">Informações Adicionais</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Agente na Origem/Destino (Obrigatório para Importação)</Label>
                        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione um agente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Nenhum (Embarque Direto)</SelectItem>
                                {agentPartners.map(agent => (
                                    <SelectItem key={agent.id} value={agent.id?.toString() ?? ''}>
                                        {agent.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label>Responsável pelo Processo</Label>
                        <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione um usuário" />
                            </SelectTrigger>
                            <SelectContent>
                                {systemUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Nº Invoice Cliente</Label>
                        <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-CLIENT-123" />
                    </div>
                    <div>
                        <Label>Nº Purchase Order (PO) Cliente</Label>
                        <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-XYZ-456" />
                    </div>
                    <FileUploadField label="Negociação NET" file={netFile} onFileChange={setNetFile} />
                    <FileUploadField label="Invoice" file={invoiceFile} onFileChange={setInvoiceFile} />
                    <FileUploadField label="Packing List" file={packingFile} onFileChange={setPackingFile} />

                </CardContent>
            </Card>

            {needsRedestinacao && (
                 <Card className="animate-in fade-in-50 duration-500 border-primary">
                    <CardHeader><CardTitle className="text-lg">Redestinação</CardTitle></CardHeader>
                    <CardContent>
                        <Label>Selecione o Terminal de Redestinação (Obrigatório)</Label>
                        <Select onValueChange={setSelectedTerminalId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione um terminal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {terminalPartners.map(terminal => (
                                    <SelectItem key={terminal.id} value={terminal.id!.toString()}>
                                        {terminal.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}
        </div>

        <DialogFooter className="pt-4 mt-auto">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm}>Confirmar e Criar Embarque</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
