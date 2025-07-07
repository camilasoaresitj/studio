'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from '@/hooks/use-toast';
import { Plane, Ship, Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Search, UserPlus, FileText, AlertTriangle, Send, ChevronsUpDown, Check, Info, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { runGetFreightRates } from '@/app/actions';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { runSendQuote, runRequestAgentQuote } from '@/app/actions';
import type { SendQuoteOutput } from '@/ai/flows/send-quote';
import type { Quote, QuoteCharge } from './customer-quotes-list';
import type { Partner } from './partners-registry';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import type { Rate as LocalRate } from './rates-table';
import type { Fee } from './fees-registry';


type FreightRate = {
    id: string;
    carrier: string;
    transitTime: string;
    cost: string;
    costValue: number;
    carrierLogo: string;
    dataAiHint: string;
    source: string;
};

interface FreightQuoteFormProps {
  onQuoteCreated: (quote: Quote) => void;
  partners: Partner[];
  onRegisterCustomer: () => void;
  rates: LocalRate[];
  fees: Fee[];
  initialData?: Partial<FreightQuoteFormData> | null;
  manualQuote: Quote | null;
  onQuoteUpdate: (quote: Quote) => void;
  onStartManualQuote: (formData: FreightQuoteFormData) => void;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
  </svg>
);


export function FreightQuoteForm({ onQuoteCreated, partners, onRegisterCustomer, rates, fees, initialData, onStartManualQuote, manualQuote }: FreightQuoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingAgentQuote, setIsRequestingAgentQuote] = useState(false);
  const [results, setResults] = useState<FreightRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<FreightRate | null>(null);
  const [quoteCharges, setQuoteCharges] = useState<QuoteCharge[]>([]);
  const [totalBRL, setTotalBRL] = useState(0);
  const [totalUSD, setTotalUSD] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [quoteContent, setQuoteContent] = useState<SendQuoteOutput | null>(null);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FreightQuoteFormData>({
    resolver: zodResolver(freightQuoteFormSchema),
    defaultValues: {
      customerId: '',
      modal: 'ocean',
      incoterm: 'FOB',
      origin: '',
      destination: '',
      collectionAddress: '',
      airShipment: {
        pieces: [{ quantity: 1, length: 100, width: 100, height: 100, weight: 500 }],
        isStackable: false,
      },
      oceanShipmentType: 'FCL',
      oceanShipment: {
        containers: [{ type: "20'GP", quantity: 1 }],
      },
      lclDetails: {
        cbm: 1,
        weight: 1000,
      },
      optionalServices: {
        customsClearance: false,
        insurance: false,
        delivery: false,
        trading: false,
        cargoValue: 0,
        deliveryCost: 0,
      }
    },
  });
  
  useEffect(() => {
      if (initialData) {
          form.reset(initialData);
      }
  }, [initialData, form]);

  const { fields: airPieces, append: appendAirPiece, remove: removeAirPiece } = useFieldArray({
    control: form.control,
    name: "airShipment.pieces",
  });

  const { fields: oceanContainers, append: appendOceanContainer, remove: removeOceanContainer } = useFieldArray({
    control: form.control,
    name: "oceanShipment.containers",
  });


  async function onSubmit(values: FreightQuoteFormData) {
    if (manualQuote) {
        toast({
            variant: "destructive",
            title: "Ação não permitida",
            description: "Finalize ou cancele a cotação manual antes de buscar novas tarifas.",
        });
        return;
    }
    setIsLoading(true);
    setResults([]);
    setSelectedRate(null);
    setQuoteContent(null);
    
    const localResults: FreightRate[] = rates
      .filter(rate => {
          const modalMatch = values.modal === 'ocean' 
              ? rate.modal.toLowerCase().startsWith('marítimo')
              : rate.modal.toLowerCase().startsWith('aéreo');
          
          if (!modalMatch) return false;

          const originMatch = rate.origin.toUpperCase().includes(values.origin.toUpperCase());
          const destinationMatch = rate.destination.toUpperCase().includes(values.destination.toUpperCase());

          return originMatch && destinationMatch;
      })
      .map((rate): FreightRate => {
        const costValue = parseFloat(rate.rate.replace(/[^0-9.]/g, '')) || 0;
        const currency = rate.rate.includes('R$') ? 'BRL' : 'USD';
        return {
          id: `local-${rate.id}`,
          carrier: rate.carrier,
          transitTime: rate.transitTime,
          cost: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(costValue),
          costValue: costValue,
          carrierLogo: 'https://placehold.co/120x40',
          dataAiHint: values.modal === 'ocean' ? 'shipping company logo' : 'airline logo',
          source: 'Tabela'
        };
      });
      
    const customer = partners.find(p => p.id.toString() === values.customerId);
    const primaryContact = customer?.contacts?.find(c => c.department === 'Comercial') || customer?.contacts?.[0];

    const finalValues = {
        ...values,
        customerEmail: primaryContact?.email,
        customerPhone: primaryContact?.phone
    };

    const response = await runGetFreightRates(finalValues);
    let apiResults: FreightRate[] = [];

    if (response.success) {
        apiResults = response.data as FreightRate[];
    } else {
        toast({
            variant: "destructive",
            title: "Erro ao buscar na API CargoFive",
            description: response.error,
        });
    }

    const allResults = [...localResults, ...apiResults].sort((a, b) => a.costValue - b.costValue);
    
    setResults(allResults);

    if (allResults.length > 0) {
        toast({
            variant: "default",
            title: "Cotações encontradas!",
            description: `Encontramos ${allResults.length} opções para você.`,
        });
    } else {
        toast({
            variant: "default",
            title: "Nenhuma cotação encontrada",
            description: "Nenhuma tarifa encontrada na API ou na sua tabela local. Tente alterar os parâmetros da sua busca.",
        });
    }

    setIsLoading(false);
  }

 const calculateCharges = (rate: FreightRate) => {
    const values = form.getValues();
    const direction = values.origin.toUpperCase().includes('BR') ? 'Exportação' : 'Importação';
    const chargeType = values.modal === 'ocean' ? values.oceanShipmentType : 'Aéreo';

    const charges: QuoteCharge[] = [];

    charges.push({
      id: `freight-${rate.id}`,
      name: 'Frete Internacional',
      type: 'Por Lote',
      cost: rate.costValue,
      costCurrency: rate.cost.includes('R$') ? 'BRL' : 'USD',
      sale: rate.costValue, // Start with sale = cost
      saleCurrency: rate.cost.includes('R$') ? 'BRL' : 'USD',
      supplier: rate.carrier,
    });
    
    const relevantFees = fees.filter(fee => {
      if (fee.type === 'Opcional') return false;
      const modalMatch = fee.modal === 'Ambos' || fee.modal === (values.modal === 'ocean' ? 'Marítimo' : 'Aéreo');
      const directionMatch = fee.direction === 'Ambos' || fee.direction === direction;
      const chargeTypeMatch = !fee.chargeType || fee.chargeType === chargeType;
      return modalMatch && directionMatch && chargeTypeMatch;
    });

    relevantFees.forEach(fee => {
      charges.push({
        id: `fee-${fee.id}`,
        name: fee.name,
        type: fee.unit,
        cost: parseFloat(fee.value) || 0,
        costCurrency: fee.currency,
        sale: parseFloat(fee.value) || 0,
        saleCurrency: fee.currency,
        supplier: 'CargaInteligente', // Default supplier
      });
    });

    return charges;
  };

  const handleSelectRate = (rate: FreightRate) => {
    const customerId = form.getValues('customerId');
    if (!customerId) {
        toast({
            variant: 'destructive',
            title: "Dados do cliente incompletos",
            description: "Por favor, selecione um cliente da lista antes de selecionar uma tarifa.",
        });
        return;
    }
    setQuoteContent(null);
    const initialCharges = calculateCharges(rate);
    const customer = partners.find(p => p.id.toString() === customerId);

     const newQuote: Quote = {
        id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}-DRAFT`,
        customer: customer?.name || 'Não selecionado',
        destination: form.getValues('destination'),
        status: 'Rascunho',
        date: new Date().toLocaleDateString('pt-BR'),
        charges: initialCharges,
    };
    onStartManualQuote(form.getValues());
    onQuoteUpdate(newQuote)
  };

  const handleSendQuote = async () => {
    if (!selectedRate) return;
    setIsSending(true);
    setQuoteContent(null);

    const finalPrice = `USD ${totalUSD.toFixed(2)} + BRL ${totalBRL.toFixed(2)}`;
    
    const customerId = form.getValues('customerId');
    const customer = partners.find(p => p.id.toString() === customerId);

    if (!customer) {
        toast({ variant: 'destructive', title: 'Cliente não encontrado', description: 'Ocorreu um erro ao buscar os dados do cliente.' });
        setIsSending(false);
        return;
    }
    
    const commercialContact = customer.contacts.find(c => c.department === 'Comercial') || customer.contacts[0];
    if (!commercialContact) {
        toast({ variant: 'destructive', title: 'Contato não encontrado', description: 'O cliente precisa de pelo menos um contato cadastrado.' });
        setIsSending(false);
        return;
    }


    const approvalLink = `${window.location.origin}/operacional?action=approve&quoteId=COT-${Math.floor(Math.random() * 10000)}`;
    const rejectionLink = `${window.location.origin}/comercial?action=reject&quoteId=COT-${Math.floor(Math.random() * 10000)}`;

    const response = await runSendQuote({
        customerName: commercialContact.name,
        rateDetails: {
            origin: form.getValues('origin'),
            destination: form.getValues('destination'),
            carrier: selectedRate.carrier,
            transitTime: selectedRate.transitTime,
            finalPrice: finalPrice,
        },
        approvalLink,
        rejectionLink
    });

    if (response.success && manualQuote) {
        setQuoteContent(response.data);
        onQuoteCreated({
            ...manualQuote,
            status: 'Enviada',
            id: manualQuote.id.replace('-DRAFT', '')
        });
        toast({
            title: 'Cotação enviada ao cliente!',
            description: `A cotação foi enviada para ${commercialContact.email} e está pronta para ser compartilhada no WhatsApp.`,
            className: 'bg-success text-success-foreground',
        });
    } else {
        toast({
            variant: "destructive",
            title: "Erro ao gerar cotação",
            description: response.error || 'Não foi possível enviar a cotação, verifique se há uma cotação em rascunho.',
        });
    }
    setIsSending(false);
  };

  const handleRequestAgentQuote = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
        toast({
            variant: "destructive",
            title: "Formulário incompleto",
            description: "Por favor, preencha todos os campos obrigatórios antes de cotar com um agente.",
        });
        return;
    }
    setIsRequestingAgentQuote(true);
    const values = form.getValues();
    const response = await runRequestAgentQuote(values, partners);

    if (response.success) {
        toast({
            title: "Solicitação enviada!",
            description: `E-mail de cotação enviado para ${response.agentsContacted.length} agente(s).`,
            className: 'bg-success text-success-foreground'
        });
    } else {
        toast({
            variant: "destructive",
            title: "Erro ao solicitar cotação",
            description: response.error,
        });
    }
    setIsRequestingAgentQuote(false);
  };
  
  const handleSendWhatsApp = () => {
    const customerId = form.getValues('customerId');
    const customer = partners.find(p => p.id.toString() === customerId);
    const contact = customer?.contacts.find(c => c.department === 'Comercial') || customer?.contacts[0];
    const phone = contact?.phone;
    
    if (!phone) {
        toast({
            variant: "destructive",
            title: "Telefone não encontrado",
            description: "O cliente selecionado não possui um telefone para contato.",
        });
        return;
    }
    if (quoteContent?.whatsappMessage) {
        const cleanedPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(quoteContent.whatsappMessage);
        window.open(`https://wa.me/${cleanedPhone}?text=${message}`, '_blank');
    }
  };

  const handleInternalStartManualQuote = () => {
      const isValid = form.trigger();
      if (!isValid) {
          toast({
            variant: "destructive",
            title: "Formulário incompleto",
            description: "Por favor, selecione um cliente e preencha origem/destino antes de iniciar uma cotação manual.",
        });
        return;
      }
      onStartManualQuote(form.getValues());
  }


  const modal = form.watch('modal');
  const incoterm = form.watch('incoterm');
  const optionalServices = form.watch('optionalServices');

  if (manualQuote) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cotação Manual em Andamento</CardTitle>
                <CardDescription>Você está editando a cotação <span className="font-bold text-primary">{manualQuote.id}</span> para o cliente <span className="font-bold">{manualQuote.customer}</span>.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertTitle>Modo de Edição</AlertTitle>
                    <AlertDescription>
                        A planilha de custos está aberta na aba "Cotações". Ajuste os valores e finalize o envio por lá.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Cotação de Frete Internacional</CardTitle>
          <CardDescription>Preencha os detalhes abaixo para buscar as melhores tarifas de frete aéreo e marítimo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-1 gap-4 items-start">
                   <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Nome do Cliente</FormLabel>
                           <div className="flex gap-2">
                                <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn(
                                        "w-full justify-between font-normal",
                                        !field.value && "text-muted-foreground"
                                        )}
                                    >
                                        {field.value
                                        ? partners.find(
                                            (partner) => partner.id.toString() === field.value
                                            )?.name
                                        : "Selecione um cliente"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                        <CommandGroup>
                                        {partners.map((partner) => (
                                            <CommandItem
                                                value={partner.name}
                                                key={partner.id}
                                                onSelect={() => {
                                                    form.setValue("customerId", partner.id.toString());
                                                    setIsCustomerPopoverOpen(false);
                                                }}
                                                >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                partner.id.toString() === field.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                                )}
                                            />
                                            {partner.name}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                    </Command>
                                </PopoverContent>
                                </Popover>
                                <Button type="button" variant="outline" size="icon" onClick={onRegisterCustomer} title="Cadastrar novo cliente">
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                           </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

              <Tabs 
                defaultValue="ocean" 
                className="w-full"
                onValueChange={(value) => {
                    form.setValue('modal', value as 'air' | 'ocean');
                    setSelectedRate(null);
                    setResults([]);
                }}
                value={modal}
              >
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="air"><Plane className="mr-2 h-4 w-4" />Aéreo</TabsTrigger>
                  <TabsTrigger value="ocean"><Ship className="mr-2 h-4 w-4" />Marítimo</TabsTrigger>
                </TabsList>
                
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <FormField control={form.control} name="origin" render={({ field }) => (
                        <FormItem><FormLabel>Origem (Cidade, País)</FormLabel><FormControl><Input placeholder="Ex: Santos, BR" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem><FormLabel>Destino (Cidade, País)</FormLabel><FormControl><Input placeholder="Ex: Rotterdam, NL" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="incoterm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incoterm</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EXW">EXW</SelectItem>
                              <SelectItem value="FCA">FCA</SelectItem>
                              <SelectItem value="FAS">FAS</SelectItem>
                              <SelectItem value="FOB">FOB</SelectItem>
                              <SelectItem value="CFR">CFR</SelectItem>
                              <SelectItem value="CIF">CIF</SelectItem>
                              <SelectItem value="CPT">CPT</SelectItem>
                              <SelectItem value="CIP">CIP</SelectItem>
                              <SelectItem value="DAP">DAP</SelectItem>
                              <SelectItem value="DPU">DPU</SelectItem>
                              <SelectItem value="DDP">DDP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                {incoterm === 'EXW' && (
                  <div className="mt-4 animate-in fade-in-50 duration-300">
                    <FormField
                      control={form.control}
                      name="collectionAddress"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Local de Coleta</FormLabel>
                              <FormControl>
                                  <Input placeholder="Informe o endereço completo para coleta" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <FormField control={form.control} name="departureDate" render={({ field }) => (
                    <FormItem className="flex flex-col mt-4"><FormLabel>Data de Embarque (Opcional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP")) : (<span>Selecione a data</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                <Separator className="my-6" />

                <TabsContent value="air" className="m-0 space-y-4">
                    <h3 className="text-lg font-medium">Detalhes da Carga Aérea</h3>
                    {airPieces.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 border rounded-md items-end">
                            <FormField control={form.control} name={`airShipment.pieces.${index}.quantity`} render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-1"><FormLabel>Qtde</FormLabel><FormControl><Input type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.length`} render={({ field }) => (
                                <FormItem><FormLabel>Compr. (cm)</FormLabel><FormControl><Input type="number" placeholder="120" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.width`} render={({ field }) => (
                                <FormItem><FormLabel>Larg. (cm)</FormLabel><FormControl><Input type="number" placeholder="80" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.height`} render={({ field }) => (
                                <FormItem><FormLabel>Alt. (cm)</FormLabel><FormControl><Input type="number" placeholder="100" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}/></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.weight`} render={({ field }) => (
                                <FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeAirPiece(index)} disabled={airPieces.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex items-center justify-between">
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAirPiece({ quantity: 1, length: 0, width: 0, height: 0, weight: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Peça
                        </Button>
                        <FormField control={form.control} name="airShipment.isStackable" render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                <FormLabel>Empilhável?</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </TabsContent>
                <TabsContent value="ocean" className="m-0 space-y-4">
                    <h3 className="text-lg font-medium">Detalhes da Carga Marítima</h3>
                     <Tabs 
                        defaultValue="FCL" 
                        className="w-full"
                        onValueChange={(value) => {
                           const newType = value as 'FCL' | 'LCL';
                           form.setValue('oceanShipmentType', newType);
                        }}
                        value={form.getValues('oceanShipmentType')}
                    >
                        <TabsList>
                            <TabsTrigger value="FCL">FCL (Contêiner)</TabsTrigger>
                            <TabsTrigger value="LCL">LCL (Carga Solta)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="FCL" className="mt-4 space-y-4">
                             {oceanContainers.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md items-end">
                                    <FormField control={form.control} name={`oceanShipment.containers.${index}.type`} render={({ field }) => (
                                        <FormItem><FormLabel>Tipo de Contêiner</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="20'GP">20' General Purpose</SelectItem>
                                                    <SelectItem value="40'GP">40' General Purpose</SelectItem>
                                                    <SelectItem value="40'HC">40' High Cube</SelectItem>
                                                    <SelectItem value="20'RF">20' Reefer</SelectItem>
                                                    <SelectItem value="40'RF">40' Reefer</SelectItem>
                                                    <SelectItem value="40'NOR">40' Non-Operating Reefer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name={`oceanShipment.containers.${index}.quantity`} render={({ field }) => (
                                        <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeOceanContainer(index)} disabled={oceanContainers.length <= 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendOceanContainer({ type: "20'GP", quantity: 1 })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Contêiner
                            </Button>
                        </TabsContent>
                        <TabsContent value="LCL" className="mt-4">
                            <div className="grid md:grid-cols-2 gap-4 p-3 border rounded-md">
                                <FormField control={form.control} name="lclDetails.cbm" render={({ field }) => (
                                    <FormItem><FormLabel>Cubagem Total (CBM)</FormLabel><FormControl><Input type="number" placeholder="Ex: 2.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="lclDetails.weight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso Bruto Total (kg)</FormLabel><FormControl><Input type="number" placeholder="Ex: 1200" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </TabsContent>
              </Tabs>
              
              <Separator className="my-6" />
                <div>
                    <h3 className="text-lg font-medium mb-4">Serviços Opcionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField control={form.control} name="optionalServices.customsClearance" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Despacho</FormLabel></div></FormItem>
                        )} />
                         <FormField control={form.control} name="optionalServices.trading" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Trading</FormLabel></div></FormItem>
                        )} />
                        <FormField control={form.control} name="optionalServices.insurance" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none w-full"><FormLabel>Seguro</FormLabel>
                                {optionalServices.insurance && (
                                    <FormField control={form.control} name="optionalServices.cargoValue" render={({ field }) => (
                                        <FormItem className="mt-2"><FormControl><Input type="number" placeholder="Valor Carga (BRL)" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>
                                    )} />
                                )}
                                </div>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="optionalServices.delivery" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none w-full"><FormLabel>Entrega</FormLabel>
                                    {optionalServices.delivery && (
                                    <FormField control={form.control} name="optionalServices.deliveryCost" render={({ field }) => (
                                        <FormItem className="mt-2"><FormControl><Input type="number" placeholder="Custo (BRL)" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl><FormMessage /></FormItem>
                                    )} />
                                )}
                                </div>
                            </FormItem>
                        )} />
                    </div>
                </div>
              
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button type="submit" disabled={isLoading} className="flex-1 text-base py-6">
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> : <><Search className="mr-2 h-4 w-4" /> Buscar Tarifas</>}
                    </Button>
                    <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={handleInternalStartManualQuote} className="flex-1 py-6">
                            <FileText className="mr-2 h-4 w-4" /> Cotação Manual
                        </Button>
                        <Button type="button" variant="secondary" onClick={handleRequestAgentQuote} disabled={isRequestingAgentQuote} className="flex-1 py-6">
                            {isRequestingAgentQuote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Cotar com Agente
                        </Button>
                    </div>
                </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && 
          <div className="text-center p-8 text-muted-foreground animate-pulse">
              <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" />
              Buscando as melhores tarifas...
          </div>
      }

      {!isLoading && results.length > 0 && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            <h2 className="text-2xl font-bold">Resultados da Cotação</h2>
            {results.map(result => (
                <Card key={result.id} className="flex flex-col md:flex-row items-center justify-between p-4 gap-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Image src={result.carrierLogo} alt={result.carrier} width={100} height={40} className="object-contain" data-ai-hint={result.dataAiHint} />
                        <div className="flex-grow">
                            <p className="font-bold text-lg">{result.carrier}</p>
                            <p className="text-sm text-muted-foreground">Tempo de trânsito: {result.transitTime}</p>
                        </div>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                        <p className="text-xl font-bold text-primary">{result.cost}</p>
                         <div className="flex items-center justify-start md:justify-end gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">Custo estimado</p>
                            <Badge variant={result.source === 'CargoFive API' ? 'default' : 'secondary'}>{result.source}</Badge>
                        </div>
                    </div>
                    <Button className="w-full md:w-auto" onClick={() => handleSelectRate(result)}>Selecionar Tarifa</Button>
                </Card>
            ))}
          </div>
      )}

       {!isLoading && results.length === 0 && form.formState.isSubmitted && (
          <div className="mt-8">
              <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Nenhuma tarifa encontrada</AlertTitle>
                  <AlertDescription>
                  Não encontramos nenhuma tarifa para os critérios informados. Por favor, verifique os dados ou tente novamente.
                  </AlertDescription>
              </Alert>
          </div>
       )}
       
       {!isLoading && !form.formState.isSubmitted && (
        <div className="mt-8">
            <Alert>
                <Plane className="h-4 w-4" />
                <AlertTitle>Aguardando sua busca</AlertTitle>
                <AlertDescription>
                Preencha os dados da sua carga para encontrar as melhores opções de frete.
                </AlertDescription>
            </Alert>
        </div>
       )}

      {selectedRate && (
        <Dialog open={!!selectedRate} onOpenChange={(open) => !open && setSelectedRate(null)}>
          <DialogContent className="sm:max-w-[725px]">
            <DialogHeader>
              <DialogTitle>Elaborar Cotação para: {partners.find(p=>p.id.toString() === form.getValues('customerId'))?.name}</DialogTitle>
              <DialogDescription>
                Confira o resumo de custos e finalize a cotação para o cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
              <Card>
                <CardHeader>
                    <CardTitle>Resumo de Custos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {quoteCharges.map((charge, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                                <div className='flex items-center gap-2'>
                                    <span>{charge.name}</span>
                                    <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Info className='h-3 w-3 text-muted-foreground' />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{charge.details}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    </TooltipProvider>

                                </div>
                                <span className='font-mono font-medium'>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: charge.currency }).format(charge.value)}</span>
                            </div>
                        ))}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <div className='text-right'>
                            {totalUSD > 0 && <div>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalUSD)}</div>}
                            {totalBRL > 0 && <div>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBRL)}</div>}
                        </div>
                    </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter className="sm:justify-between gap-2">
                <Button variant="outline" onClick={() => setSelectedRate(null)}>Cancelar</Button>
                <div className="flex gap-2">
                    <Button onClick={handleSendQuote} disabled={isSending || !!quoteContent}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar ao Cliente
                    </Button>
                    <Button variant="secondary" onClick={handleSendWhatsApp} disabled={isSending || !quoteContent}>
                        <WhatsAppIcon className="mr-2 h-4 w-4" />
                        Enviar por WhatsApp
                    </Button>
                </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
