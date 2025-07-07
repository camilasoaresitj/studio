'use client';

import { useState } from 'react';
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
import { Plane, Ship, Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Search, UserPlus, FileText, AlertTriangle, Send, ChevronsUpDown, Check } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { runGetFreightRates } from '@/app/actions';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { runSendQuote } from '@/app/actions';
import type { SendQuoteOutput } from '@/ai/flows/send-quote';
import type { Quote } from './customer-quotes-list';
import type { Partner } from './partners-registry';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';

type FormData = FreightQuoteFormData;

type FreightRate = {
    id: string;
    carrier: string;
    transitTime: string;
    cost: string;
    costValue: number;
    carrierLogo: string;
    dataAiHint: string;
};

interface FreightQuoteFormProps {
  onQuoteCreated: (quote: Quote) => void;
  partners: Partner[];
  onRegisterCustomer: () => void;
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


export function FreightQuoteForm({ onQuoteCreated, partners, onRegisterCustomer }: FreightQuoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FreightRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<FreightRate | null>(null);
  const [markup, setMarkup] = useState(15);
  const [oceanShipmentType, setOceanShipmentType] = useState<'FCL' | 'LCL'>('FCL');
  const [isSending, setIsSending] = useState(false);
  const [quoteContent, setQuoteContent] = useState<SendQuoteOutput | null>(null);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(freightQuoteFormSchema),
    defaultValues: {
      customerId: '',
      modal: 'air',
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
      }
    },
  });

  const { fields: airPieces, append: appendAirPiece, remove: removeAirPiece } = useFieldArray({
    control: form.control,
    name: "airShipment.pieces",
  });

  const { fields: oceanContainers, append: appendOceanContainer, remove: removeOceanContainer } = useFieldArray({
    control: form.control,
    name: "oceanShipment.containers",
  });


  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setResults([]);
    setSelectedRate(null);
    setQuoteContent(null);
    
    // This is a workaround to remove customerPhone and customerEmail from the values passed to the AI flow
    // if they are empty strings, as the schema expects them to be optional but not empty.
    const submissionValues = { ...values };
    const customer = partners.find(p => p.id.toString() === values.customerId);
    const primaryContact = customer?.contacts?.find(c => c.department === 'Comercial') || customer?.contacts?.[0];

    // We pass these values to the action, but they are not part of the form state itself
    const finalValues = {
        ...submissionValues,
        customerEmail: primaryContact?.email,
        customerPhone: primaryContact?.phone
    };

    const response = await runGetFreightRates(finalValues);

    if (response.success) {
        setResults(response.data);
        toast({
            variant: "default",
            title: response.data.length > 0 ? "Cotações encontradas!" : "Nenhuma cotação encontrada",
            description: response.data.length > 0 ? `Encontramos ${response.data.length} opções para você.` : "Tente alterar os parâmetros da sua busca.",
        });
    } else {
        toast({
            variant: "destructive",
            title: "Erro ao buscar cotações",
            description: response.error,
        });
    }

    setIsLoading(false);
  }

  const handleSelectRate = (rate: any) => {
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
    setSelectedRate(rate);
  };

  const handleSendQuote = async () => {
    if (!selectedRate) return;
    setIsSending(true);
    setQuoteContent(null);

    const finalPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(selectedRate.costValue * (1 + markup / 100));
    
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
        customerName: customer.name,
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

    if (response.success) {
        setQuoteContent(response.data);
        const newQuote: Quote = {
            id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}`,
            customer: customer.name,
            destination: form.getValues('destination'),
            status: 'Enviada',
            date: new Date().toLocaleDateString('pt-BR'),
            value: finalPrice,
        };
        onQuoteCreated(newQuote);
        toast({
            title: 'Cotação enviada ao cliente!',
            description: `A cotação foi enviada para ${commercialContact.email} e está pronta para ser compartilhada no WhatsApp.`,
            className: 'bg-success text-success-foreground',
        });
    } else {
        toast({
            variant: "destructive",
            title: "Erro ao gerar cotação",
            description: response.error,
        });
    }
    setIsSending(false);
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


  const modal = form.watch('modal');
  const incoterm = form.watch('incoterm');

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
                defaultValue="air" 
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
                        <FormItem><FormLabel>Origem (Porto/Aeroporto)</FormLabel><FormControl><Input placeholder="Ex: BRSSZ ou GRU" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem><FormLabel>Destino (Porto/Aeroporto)</FormLabel><FormControl><Input placeholder="Ex: NLRTM ou MIA" {...field} /></FormControl><FormMessage /></FormItem>
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
                           setOceanShipmentType(newType);
                           form.setValue('oceanShipmentType', newType);
                        }}
                        value={oceanShipmentType}
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
              
              <Button type="submit" disabled={isLoading} className="w-full text-base py-6">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> : <><Search className="mr-2 h-4 w-4" /> Buscar Cotações</>}
              </Button>
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
                        <p className="text-xs text-muted-foreground">Custo estimado</p>
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
                  Não encontramos nenhuma tarifa para os critérios informados. Por favor, verifique os dados ou tente novamente mais tarde.
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
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>Elaborar Cotação para: {partners.find(p=>p.id.toString() === form.getValues('customerId'))?.name}</DialogTitle>
              <DialogDescription>
                Adicione sua margem e finalize a cotação para o cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              <div className="p-4 border rounded-lg bg-muted/50 flex justify-between items-center">
                  <div>
                      <p className="font-bold">{selectedRate.carrier}</p>
                      <p className="text-sm text-muted-foreground">Custo base: {selectedRate.cost}</p>
                  </div>
                  <p className="text-lg font-bold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRate.costValue)}
                  </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-2">
                      <Label htmlFor="markup">Margem de Lucro (%)</Label>
                      <Input 
                          id="markup"
                          type="number" 
                          value={markup}
                          onChange={(e) => setMarkup(Number(e.target.value))}
                          placeholder="Ex: 15"
                      />
                  </div>
                  <div className="p-4 rounded-md border bg-card">
                      <p className="text-sm text-muted-foreground">Preço Final para o Cliente</p>
                      <p className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedRate.costValue * (1 + markup / 100))}
                      </p>
                  </div>
              </div>
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
