
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

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
import { Plane, Ship, Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Search, UserPlus, FileText, AlertTriangle, Send, ChevronsUpDown, Check, Info, Mail, Edit, FileDown, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { runGetFreightRates, runRequestAgentQuote, runSendQuote } from '@/app/actions';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import type { Quote, QuoteCharge } from './customer-quotes-list';
import type { Partner } from './partners-registry';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import type { Rate as LocalRate } from './rates-table';
import type { Fee } from './fees-registry';
import { QuoteCostSheet } from './quote-cost-sheet';

const DynamicJsPDF = dynamic(() => import('jspdf').then(mod => mod.default), { ssr: false });
const DynamicHtml2Canvas = dynamic(() => import('html2canvas'), { ssr: false });


type FreightRate = {
    id: string;
    carrier: string;
    origin: string;
    destination: string;
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
  onQuoteUpdate: (quote: Quote) => void;
  onStartManualQuote: (formData: FreightQuoteFormData, charges: QuoteCharge[]) => void;
}

// Custom Autocomplete Input Component
const AutocompleteInput = ({ field, suggestions, placeholder }: { field: any, suggestions: string[], placeholder: string }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const filterSuggestions = (value: string) => {
        const parts = value.split(',');
        const currentPart = parts[parts.length - 1].trim().toLowerCase();

        if (currentPart.length >= 2) {
            setFilteredSuggestions(suggestions.filter(s =>
                s.toLowerCase().includes(currentPart)
            ));
        } else {
            setFilteredSuggestions([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        field.onChange(value);
        if (!showSuggestions) {
            setShowSuggestions(true);
        }
        filterSuggestions(value);
    };

    const handleSelectSuggestion = (suggestion: string) => {
        const parts = (field.value || '').split(',').map((p: string) => p.trim()).filter(Boolean);
        if (parts.length > 0) {
            parts[parts.length - 1] = suggestion;
        } else {
            parts.push(suggestion);
        }
        
        const newValue = parts.join(', ') + ', ';
        field.onChange(newValue);
        setShowSuggestions(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentInputPart = field.value?.split(',').pop()?.trim() ?? '';

    return (
        <div ref={containerRef} className="relative">
            <Input
                placeholder={placeholder}
                {...field}
                onChange={handleInputChange}
                onFocus={() => {
                    filterSuggestions(field.value || '');
                    setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setShowSuggestions(false);
                    }
                }}
                autoComplete="off"
            />
            {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto p-1">
                    {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((suggestion, index) => (
                            <div
                                key={`${suggestion}-${index}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectSuggestion(suggestion);
                                }}
                                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-accent"
                            >
                                {suggestion}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            {currentInputPart.length >= 2 ? 'Nenhum porto encontrado.' : 'Digite 2+ letras para buscar...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export function FreightQuoteForm({ onQuoteCreated, partners, onRegisterCustomer, rates, fees, initialData, onQuoteUpdate, onStartManualQuote }: FreightQuoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingAgentQuote, setIsRequestingAgentQuote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<FreightRate[]>([]);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const { toast } = useToast();

  const form = useForm<FreightQuoteFormData>({
    resolver: zodResolver(freightQuoteFormSchema),
    defaultValues: {
      customerId: '',
      modal: 'ocean',
      incoterm: 'FOB',
      origin: '',
      destination: '',
      commodity: '',
      collectionAddress: '',
      airShipment: {
        pieces: [{ quantity: 1, length: 100, width: 100, height: 100, weight: 500 }],
        isStackable: false,
      },
      oceanShipmentType: 'FCL',
      oceanShipment: {
        containers: [{ type: "20'GP", quantity: 1, weight: undefined, length: undefined, width: undefined, height: undefined }],
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
    setIsLoading(true);
    setActiveQuote(null);
    setResults([]);
    
    // For local search, we'll check if any of the provided origins/destinations match.
    const searchOrigins = values.origin.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const searchDestinations = values.destination.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

    const localResults: FreightRate[] = rates
      .filter(rate => {
          const modalMatch = values.modal === 'ocean' 
              ? rate.modal.toLowerCase().startsWith('marítimo')
              : rate.modal.toLowerCase().startsWith('aéreo');
          
          if (!modalMatch) return false;

          const originMatch = searchOrigins.some(o => rate.origin.toUpperCase().includes(o));
          const destinationMatch = searchDestinations.some(d => rate.destination.toUpperCase().includes(d));

          return originMatch && destinationMatch;
      })
      .map((rate): FreightRate => {
        const costValue = parseFloat(rate.rate.replace(/[^0-9.]/g, '')) || 0;
        const currency = rate.rate.includes('R$') ? 'BRL' : 'USD';
        return {
          id: `local-${rate.id}`,
          carrier: rate.carrier,
          origin: rate.origin,
          destination: rate.destination,
          transitTime: `${rate.transitTime}`,
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

 const calculateCharges = (rate: FreightRate | null) => {
    const values = form.getValues();
    const originIsBR = (rate?.origin || values.origin).toUpperCase().includes('BR');
    const destinationIsBR = (rate?.destination || values.destination).toUpperCase().includes('BR');
    
    let direction: 'Importação' | 'Exportação' | 'Ambos' = 'Ambos';
    if (destinationIsBR && !originIsBR) {
      direction = 'Importação';
    } else if (originIsBR && !destinationIsBR) {
      direction = 'Exportação';
    }
    
    const chargeType = values.modal === 'ocean' ? values.oceanShipmentType : 'Aéreo';

    const charges: QuoteCharge[] = [];

    if (rate) {
        charges.push({
          id: `freight-${rate.id}`,
          name: 'Frete Internacional',
          type: 'Por Lote',
          cost: rate.costValue,
          costCurrency: rate.cost.includes('R$') ? 'BRL' : 'USD',
          sale: rate.costValue,
          saleCurrency: rate.cost.includes('R$') ? 'BRL' : 'USD',
          supplier: rate.carrier,
        });
    }
    
    const relevantFees = fees.filter(fee => {
      const modalMatch = fee.modal === 'Ambos' || fee.modal === (values.modal === 'ocean' ? 'Marítimo' : 'Aéreo');
      const directionMatch = fee.direction === 'Ambos' || fee.direction === direction;
      const chargeTypeMatch = !fee.chargeType || fee.chargeType === chargeType;
      
      const isOptionalSelected = 
        (fee.name.toLowerCase().includes('despacho') && values.optionalServices.customsClearance) ||
        (fee.name.toLowerCase().includes('seguro') && values.optionalServices.insurance) ||
        (fee.name.toLowerCase().includes('trading') && values.optionalServices.trading);

      return modalMatch && directionMatch && chargeTypeMatch && (fee.type !== 'Opcional' || isOptionalSelected)
    });

    relevantFees.forEach(fee => {
      let feeValue = parseFloat(fee.value) || 0;
      let feeType = fee.unit;

      if (fee.type === 'Por CBM/Ton' && values.modal === 'ocean' && values.oceanShipmentType === 'LCL') {
          const { cbm, weight } = values.lclDetails;
          const chargeableWeight = Math.max(cbm, weight / 1000);
          feeValue = (parseFloat(fee.value) || 0) * chargeableWeight;
          if (fee.minValue && feeValue < fee.minValue) {
            feeValue = fee.minValue;
          }
          feeType = `${chargeableWeight.toFixed(2)} W/M`;
      } else if (values.modal === 'ocean' && values.oceanShipmentType === 'FCL' && fee.unit.toLowerCase().includes('contêiner')) {
          const totalContainers = values.oceanShipment.containers.reduce((acc, c) => acc + c.quantity, 0);
          feeValue = (parseFloat(fee.value) || 0) * totalContainers;
          feeType = `${totalContainers} x ${fee.unit}`;
      } else if (values.optionalServices.insurance && fee.name.toLowerCase().includes('seguro')) {
          feeValue = values.optionalServices.cargoValue * (parseFloat(fee.value) / 100);
          feeType = `${fee.value}% sobre ${values.optionalServices.cargoValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`;
      }


      charges.push({
        id: `fee-${fee.id}`,
        name: fee.name,
        type: feeType,
        cost: feeValue,
        costCurrency: fee.currency,
        sale: feeValue,
        saleCurrency: fee.currency,
        supplier: 'CargaInteligente',
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
    const initialCharges = calculateCharges(rate);
    const customer = partners.find(p => p.id.toString() === customerId);

    const newQuote: Quote = {
        id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        customer: customer?.name || 'N/A',
        destination: rate.destination, // Use specific destination from rate
        status: 'Rascunho',
        date: new Date().toLocaleDateString('pt-BR'),
        charges: initialCharges
    };
    setActiveQuote(newQuote);
    onQuoteCreated(newQuote);
  };
  
  const handleStartManualQuote = () => {
      const isValid = form.trigger(['customerId', 'origin', 'destination']);
      if (!isValid) {
          toast({
            variant: "destructive",
            title: "Formulário incompleto",
            description: "Por favor, selecione um cliente e preencha origem/destino antes de iniciar uma cotação manual.",
        });
        return;
      }
      const initialCharges = calculateCharges(null);
      const customer = partners.find(p => p.id.toString() === form.getValues('customerId'));
      
      const newQuote: Quote = {
        id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        customer: customer?.name || 'N/A',
        destination: form.getValues('destination').split(',')[0].trim(), // Use first destination
        status: 'Rascunho',
        date: new Date().toLocaleDateString('pt-BR'),
        charges: initialCharges
    };
    setActiveQuote(newQuote);
    onQuoteCreated(newQuote);
  }

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

  const handleUpdateQuote = (updatedQuote: Quote) => {
    setActiveQuote(updatedQuote);
    onQuoteUpdate(updatedQuote);
  }

  const handleSendQuote = async (channel: 'email' | 'whatsapp') => {
      if (!activeQuote) return;

      setIsSending(true);
      const customer = partners.find(p => p.name === activeQuote.customer);
      if (!customer) {
          toast({ variant: 'destructive', title: 'Cliente não encontrado!' });
          setIsSending(false);
          return;
      }

      const totalValue = activeQuote.charges.reduce((acc, charge) => {
          // Simplistic sum, assumes currencies are aligned or converted elsewhere.
          // For a real app, you'd handle multi-currency totals properly.
          return acc + charge.sale;
      }, 0);

      const response = await runSendQuote({
        customerName: activeQuote.customer,
        rateDetails: {
            origin: form.getValues('origin'),
            destination: activeQuote.destination,
            carrier: activeQuote.charges.find(c => c.name === 'Frete Internacional')?.supplier || 'N/A',
            transitTime: results.find(r => r.carrier === activeQuote.charges.find(c => c.name === 'Frete Internacional')?.supplier)?.transitTime || 'N/A',
            finalPrice: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue) // Example
        },
        approvalLink: `https://cargainteligente.com/approve/${activeQuote.id}`,
        rejectionLink: `https://cargainteligente.com/reject/${activeQuote.id}`,
      });

      if (response.success) {
        if (channel === 'email') {
            const primaryContact = customer.contacts.find(c => c.department === 'Comercial') || customer.contacts[0];
            const recipient = primaryContact.email;
            console.log("SIMULATING EMAIL TO:", recipient);
            console.log("SUBJECT:", response.data.emailSubject);
            console.log("BODY:", response.data.emailBody);
            window.open(`mailto:${recipient}?subject=${encodeURIComponent(response.data.emailSubject)}&body=${encodeURIComponent(response.data.emailBody)}`);
            toast({ title: 'E-mail de cotação gerado!', description: `Pronto para enviar para ${recipient}.` });
        } else { // WhatsApp
            const primaryContact = customer.contacts.find(c => c.department === 'Comercial') || customer.contacts[0];
            const phone = primaryContact.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(response.data.whatsappMessage)}`;
            window.open(whatsappUrl, '_blank');
            toast({ title: 'Mensagem de WhatsApp gerada!', description: 'Pronto para enviar.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Erro ao gerar comunicação', description: response.error });
      }

      setIsSending(false);
  }

  const handleGeneratePdf = async () => {
    const [jsPDF, html2canvas] = await Promise.all([
      DynamicJsPDF,
      DynamicHtml2Canvas,
    ]);

    const quoteElement = document.getElementById(`quote-sheet-${activeQuote?.id}`);
    if (quoteElement && activeQuote) {

        const canvas = await html2canvas(quoteElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`cotacao-${activeQuote.id}.pdf`);
    }
  };

  const modal = form.watch('modal');
  const incoterm = form.watch('incoterm');
  const optionalServices = form.watch('optionalServices');
  const watchedContainers = form.watch('oceanShipment.containers');

  const allPortsAndAirports = useMemo(() => {
    const locations = new Set<string>();
    rates.forEach(rate => {
        if (rate.origin) locations.add(rate.origin);
        if (rate.destination) locations.add(rate.destination);
    });
    return Array.from(locations).sort();
  }, [rates]);

  
  if (activeQuote) {
    return (
        <Card className="animate-in fade-in-50 duration-500">
             <CardHeader>
                <CardTitle>Editor de Cotação - {activeQuote.id}</CardTitle>
                <CardDescription>
                    Ajuste os custos e valores de venda. Quando estiver pronto, envie para o cliente ou salve em PDF.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div id={`quote-sheet-${activeQuote.id}`}>
                    <QuoteCostSheet quote={activeQuote} onUpdate={handleUpdateQuote} />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-6 justify-end">
                    <Button variant="outline" onClick={() => setActiveQuote(null)}>
                        <Edit className="mr-2 h-4 w-4" /> Voltar ao Formulário
                    </Button>
                     <Button variant="secondary" onClick={handleGeneratePdf}>
                        <FileDown className="mr-2 h-4 w-4" /> Gerar PDF
                    </Button>
                    <Button onClick={() => handleSendQuote('whatsapp')} disabled={isSending}>
                        <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                    </Button>
                    <Button onClick={() => handleSendQuote('email')} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar ao Cliente
                    </Button>
                </div>
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
                <div className="grid md:grid-cols-2 gap-4 items-start">
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
                                                onSelect={(currentValue) => {
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
                    <FormField control={form.control} name="commodity" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Mercadoria (Opcional)</FormLabel>
                            <FormControl><Input placeholder="Ex: Eletrônicos" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

              <Tabs 
                defaultValue="ocean" 
                className="w-full"
                onValueChange={(value) => {
                    form.setValue('modal', value as 'air' | 'ocean');
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
                        <FormItem><FormLabel>Origem (Porto/Aeroporto, País)</FormLabel>
                          <FormControl>
                            <AutocompleteInput
                                field={field}
                                suggestions={allPortsAndAirports}
                                placeholder="Ex: Santos, BR, Itajai, BR"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem><FormLabel>Destino (Porto/Aeroporto, País)</FormLabel>
                           <FormControl>
                             <AutocompleteInput
                                field={field}
                                suggestions={allPortsAndAirports}
                                placeholder="Ex: Rotterdam, NL"
                             />
                           </FormControl>
                           <FormMessage />
                        </FormItem>
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
                             {oceanContainers.map((field, index) => {
                                const containerType = watchedContainers[index]?.type;
                                const isSpecialContainer = containerType?.includes('OT') || containerType?.includes('FR');
                                return (
                                <div key={field.id} className="p-3 border rounded-lg space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
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
                                                        <SelectItem value="20'OT">20' Open Top</SelectItem>
                                                        <SelectItem value="40'OT">40' Open Top</SelectItem>
                                                        <SelectItem value="20'FR">20' Flat Rack</SelectItem>
                                                        <SelectItem value="40'FR">40' Flat Rack</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name={`oceanShipment.containers.${index}.quantity`} render={({ field }) => (
                                            <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name={`oceanShipment.containers.${index}.weight`} render={({ field }) => (
                                            <FormItem><FormLabel>Peso Total (kg)</FormLabel><FormControl><Input type="number" placeholder="22000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeOceanContainer(index)} disabled={oceanContainers.length <= 1}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {isSpecialContainer && (
                                         <div className="grid md:grid-cols-3 gap-4 p-3 bg-muted/50 rounded-md animate-in fade-in-50 duration-300">
                                            <FormField control={form.control} name={`oceanShipment.containers.${index}.length`} render={({ field }) => (
                                                <FormItem><FormLabel>Compr. Carga (cm)</FormLabel><FormControl><Input type="number" placeholder="1200" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name={`oceanShipment.containers.${index}.width`} render={({ field }) => (
                                                <FormItem><FormLabel>Larg. Carga (cm)</FormLabel><FormControl><Input type="number" placeholder="230" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name={`oceanShipment.containers.${index}.height`} render={({ field }) => (
                                                <FormItem><FormLabel>Alt. Carga (cm)</FormLabel><FormControl><Input type="number" placeholder="230" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}/></FormControl><FormMessage /></FormItem>
                                            )} />
                                         </div>
                                    )}
                                </div>
                                )
                            })}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendOceanContainer({ type: "20'GP", quantity: 1, weight: undefined, length: undefined, width: undefined, height: undefined })}>
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
                        <Button type="button" variant="secondary" onClick={handleStartManualQuote} className="flex-1 py-6">
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
                            <p className="text-sm font-semibold">{result.origin} → {result.destination}</p>
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
    </div>
  );
}
