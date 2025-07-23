
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
import { Plane, Ship, Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Search, UserPlus, FileText, AlertTriangle, Send, ChevronsUpDown, Check, Info, Mail, Edit, FileDown, MessageCircle, ArrowLeft, CalendarDays, Wand2, Hand, Package as PackageIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { runGetFreightRates, runRequestAgentQuote, runSendQuote, runExtractQuoteDetailsFromText, runSendWhatsapp } from '@/app/actions';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import type { Quote, QuoteCharge, QuoteDetails } from './customer-quotes-list';
import type { Partner } from './partners-registry';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import type { Rate as LocalRate } from './rates-table';
import type { Fee } from './fees-registry';
import { QuoteCostSheet } from './quote-cost-sheet';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { findPortByTerm, portsAndAirports } from '@/lib/ports';


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
    service?: string;
    deliveryDays?: number | null;
};

type Schedule = {
    vesselName: string;
    voyage: string;
    carrier: string;
    etd: string;
    eta: string;
};

interface FreightQuoteFormProps {
  onQuoteCreated: (quote: Quote) => void;
  partners: Partner[];
  onRegisterCustomer: () => void;
  rates: LocalRate[];
  fees: Fee[];
  initialData?: Partial<FreightQuoteFormData> | null;
  onQuoteUpdate: (quote: Quote) => void;
}

// Custom Autocomplete Input Component
const AutocompleteInput = ({ field, placeholder, modal }: { field: any, placeholder: string, modal: 'ocean' | 'air' | 'courier' }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const suggestions = useMemo(() => {
        const relevantPortType = modal === 'ocean' ? 'port' : 'airport';
        return portsAndAirports
            .filter(p => p.type === relevantPortType)
            .map(p => `${p.name}, ${p.country}`);
    }, [modal]);

    const filterSuggestions = (value: string) => {
        const currentPart = value.split(',').pop()?.trim().toLowerCase() ?? '';
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
        if (!showSuggestions) setShowSuggestions(true);
        filterSuggestions(value);
    };

    const handleSelectSuggestion = (suggestion: string) => {
        field.onChange(suggestion);
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
                    if (e.key === 'Escape') setShowSuggestions(false);
                }}
                autoComplete="off"
            />
            {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto p-1">
                    {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((suggestion, index) => (
                            <div
                                key={`${suggestion}-${index}`}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(suggestion); }}
                                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-accent"
                            >
                                {suggestion}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            {currentInputPart.length >= 2 ? 'Nenhum local encontrado.' : 'Digite 2+ letras para buscar...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ManualFreightForm = ({ onManualRateAdd }: { onManualRateAdd: (rate: Omit<FreightRate, 'id' | 'carrierLogo' | 'dataAiHint' | 'source'>) => void }) => {
    const [supplier, setSupplier] = useState('');
    const [cost, setCost] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
    const [transitTime, setTransitTime] = useState('');

    const handleSubmit = () => {
        onManualRateAdd({
            carrier: supplier,
            origin: '', // These are taken from the main form
            destination: '',
            transitTime: transitTime,
            cost: `${currency} ${cost}`,
            costValue: parseFloat(cost) || 0,
        });
    };

    return (
        <Card className="mt-4 bg-secondary/50">
            <CardHeader>
                <CardTitle className="text-lg">Adicionar Frete Manualmente</CardTitle>
                <CardDescription>Insira os detalhes da tarifa que você negociou.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input placeholder="Fornecedor" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                <Input placeholder="Valor do Frete" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
                <Select value={currency} onValueChange={(v: 'USD'|'BRL') => setCurrency(v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Tempo de Trânsito" value={transitTime} onChange={(e) => setTransitTime(e.target.value)} />
                <Button onClick={handleSubmit} className="sm:col-span-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar e Criar Cotação
                </Button>
            </CardContent>
        </Card>
    );
};

export function FreightQuoteForm({ onQuoteCreated, partners, onRegisterCustomer, rates, fees: initialFees, initialData, onQuoteUpdate }: FreightQuoteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestingAgentQuote, setIsRequestingAgentQuote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<FreightRate[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isFetchingSchedules, setIsFetchingSchedules] = useState(false);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [isShipperPopoverOpen, setIsShipperPopoverOpen] = useState(false);
  const [isConsigneePopoverOpen, setIsConsigneePopoverOpen] = useState(false);
  const [isAgentPopoverOpen, setIsAgentPopoverOpen] = useState(false);
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillText, setAutofillText] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [fees, setFees] = useState<Fee[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    setFees(initialFees);
  }, [initialFees]);

  const form = useForm<FreightQuoteFormData>({
    resolver: zodResolver(freightQuoteFormSchema),
    defaultValues: {
      customerId: '',
      modal: 'ocean',
      incoterm: 'FOB',
      origin: '',
      destination: '',
      departureDate: format(new Date(), 'yyyy-MM-dd'),
      commodity: '',
      collectionAddress: '',
      deliveryAddress: '',
      airShipment: {
        pieces: [{ quantity: 1, length: 100, width: 100, height: 100, weight: 500 }],
        isStackable: true,
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
        redestinacao: false,
        dta: false,
        cargoValue: 0,
        cargoValueCurrency: 'BRL',
        storageCost: 0,
        terminalId: ''
      }
    },
  });
  
  useEffect(() => {
      if (initialData) {
          form.reset({
              ...initialData,
              departureDate: initialData.departureDate ? format(new Date(initialData.departureDate), 'yyyy-MM-dd') : undefined,
          });
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

  const insuranceFee = useMemo(() => fees.find(f => f.name.toUpperCase().includes('SEGURO')), [fees]);

  async function onSubmit(values: FreightQuoteFormData) {
    setIsLoading(true);
    setActiveQuote(null);
    setResults([]);
    setApiError(null);
    
    let apiResults: FreightRate[] = [];

    const formattedValues = {
        ...values,
        departureDate: values.departureDate ? format(new Date(values.departureDate), 'yyyy-MM-dd') : undefined,
    };

    if (values.modal === 'courier') {
        const response = await runGetCourierRates(values);
        if (response.success) {
            apiResults = response.data as FreightRate[];
        } else {
             toast({ variant: "destructive", title: "Erro ao buscar tarifas de courier", description: response.error });
             setApiError(response.error);
        }
    } else {
        const response = await runGetFreightRates(formattedValues);
        if (response.success) {
            apiResults = response.data as FreightRate[];
        } else {
            toast({ variant: "destructive", title: "Erro ao buscar tarifas", description: response.error });
            setApiError(response.error);
        }
    }
    
    setResults(apiResults);

    if (apiResults.length > 0) {
        toast({
            variant: "default",
            title: "Cotações encontradas!",
            description: `Encontramos ${apiResults.length} opções para você.`,
        });
    } else if (!apiError) {
        toast({
            variant: "default",
            title: "Nenhuma cotação encontrada",
            description: "Nenhuma tarifa encontrada na API. Considere adicionar o frete manualmente.",
        });
    }

    setIsLoading(false);
  }

  const handleFetchSchedules = async () => {
    // This function is removed as per the latest request.
  };

  const handleSelectSchedule = (schedule: Schedule) => {
    // This function is removed as per the latest request.
  };
  
  const getCargoDetails = (values: FreightQuoteFormData): string => {
    if (values.modal === 'ocean') {
        if (values.oceanShipmentType === 'FCL') {
            return values.oceanShipment.containers.map(c => `${c.quantity}x${c.type}`).join(', ');
        }
        return `LCL ${values.lclDetails.cbm} CBM / ${values.lclDetails.weight} KG`;
    }
    const totalWeight = values.airShipment.pieces.reduce((acc, p) => acc + (p.quantity * p.weight), 0);
    const pieceCount = values.airShipment.pieces.reduce((acc, p) => acc + p.quantity, 0);
    return `${pieceCount} piece(s) / ${totalWeight.toFixed(2)} KG`;
}

 const calculateCharges = (baseFreightCharges: QuoteCharge[], carrierName: string): QuoteCharge[] => {
    const values = form.getValues();
    const customer = partners.find(p => p.id?.toString() === values.customerId);
    
    const originIsBR = (baseFreightCharges[0]?.origin || values.origin).toUpperCase().includes('BR');
    const destinationIsBR = (baseFreightCharges[0]?.destination || values.destination).toUpperCase().includes('BR');
    let direction: 'Importação' | 'Exportação' | 'Ambos' = 'Ambos';
    if (destinationIsBR && !originIsBR) direction = 'Importação';
    else if (originIsBR && !destinationIsBR) direction = 'Exportação';
    
    const chargeType = values.modal === 'ocean' ? values.oceanShipmentType : 'Aéreo';
    const finalCharges: QuoteCharge[] = [...baseFreightCharges];
    const existingChargeNames = new Set(finalCharges.map(c => c.name.toUpperCase()));

    const relevantFees = fees.filter(fee => {
        if (existingChargeNames.has(fee.name.toUpperCase())) return false;
        
        const isExwFee = fee.name.toUpperCase().includes('EXW') || fee.name.toUpperCase().includes('COLETA');
        if (isExwFee && (values.incoterm !== 'EXW' || direction !== 'Importação')) {
            return false;
        }

        const modalMatch = fee.modal === 'Ambos' || fee.modal === (values.modal === 'ocean' ? 'Marítimo' : 'Aéreo');
        const directionMatch = fee.direction === 'Ambos' || fee.direction === direction;
        const chargeTypeMatch = !fee.chargeType || fee.chargeType === chargeType || fee.chargeType === 'NONE';
        const isOptionalSelected = 
            (fee.name.toUpperCase().includes('DESPACHO') && values.optionalServices.customsClearance) ||
            (fee.name.toUpperCase().includes('SEGURO') && values.optionalServices.insurance) ||
            (fee.name.toUpperCase().includes('TRADING') && values.optionalServices.trading) ||
            (fee.name.toUpperCase().includes('REDESTINA') && values.optionalServices.redestinacao) ||
            (fee.name.toUpperCase().includes('DTA') && values.optionalServices.dta);


        return modalMatch && directionMatch && chargeTypeMatch && (fee.type !== 'Opcional' || isOptionalSelected);
    });
    
    const carrierRelatedFeeNames = ['THC', 'ISPS', 'IMPORT FEE', 'LOGISTIC FEE', 'TRS', 'LACRE', 'VGM', 'BL FEE'];

    relevantFees.forEach(fee => {
        let feeValue = parseFloat(fee.value) || 0;
        let costValue = feeValue;
        let saleValue = feeValue;
        let supplier = 'CargaInteligente';

        const totalContainers = values.modal === 'ocean' && values.oceanShipmentType === 'FCL' 
            ? values.oceanShipment.containers.reduce((acc, c) => acc + c.quantity, 0)
            : 0;

        if (fee.unit.toLowerCase().includes('contêiner') && totalContainers > 0) {
            costValue *= totalContainers;
            saleValue *= totalContainers;
        } else if (fee.type === 'Por CBM/Ton' && values.modal === 'ocean' && values.oceanShipmentType === 'LCL') {
            const { cbm, weight } = values.lclDetails;
            const chargeableWeight = Math.max(cbm, weight / 1000);
            const calculatedValue = (parseFloat(fee.value) || 0) * chargeableWeight;
            costValue = fee.minValue && calculatedValue < fee.minValue ? fee.minValue : calculatedValue;
            saleValue = costValue; // Assume sale is same as cost initially for this type
        } else if (values.optionalServices.insurance && fee.name.toUpperCase().includes('SEGURO')) {
            const cargoValue = values.optionalServices.cargoValue;
            if (cargoValue > 0) {
                costValue = parseFloat((cargoValue * 0.0012).toFixed(2));
                saleValue = parseFloat((cargoValue * 0.0030).toFixed(2));
                
                const minInsuranceCost = insuranceFee?.minValue || 0;
                if (costValue < minInsuranceCost) costValue = minInsuranceCost;
                if (saleValue < minInsuranceCost) saleValue = minInsuranceCost;
            } else {
                costValue = 0;
                saleValue = 0;
            }
        }
        
        if (carrierRelatedFeeNames.some(name => fee.name.toUpperCase().includes(name))) {
            supplier = carrierName;
        }
        
        finalCharges.push({
            id: `fee-${fee.id}`,
            name: fee.name.toUpperCase(),
            type: fee.unit,
            cost: costValue,
            costCurrency: fee.currency,
            sale: saleValue,
            saleCurrency: fee.currency,
            supplier: supplier,
            sacado: customer?.name,
            approvalStatus: 'aprovada',
        });
    });

    return finalCharges;
};

  const handleSelectRate = (rate: Partial<FreightRate>) => {
    const customerId = form.getValues('customerId');
    if (!customerId) {
        toast({
            variant: 'destructive',
            title: "Dados do cliente incompletos",
            description: "Por favor, selecione um cliente antes de selecionar uma tarifa.",
        });
        return;
    }
    const values = form.getValues();
    const customer = partners.find(p => p.id?.toString() === customerId);
    let calculatedFreightCost: number;
    let freightChargeType: string;
    let freightCurrency: 'BRL' | 'USD' = rate.cost?.includes('R$') ? 'BRL' : 'USD';
    
    if (values.modal === 'ocean' && values.oceanShipmentType === 'LCL') {
        const ratePerTon = rate.costValue || 0;
        const { cbm, weight } = values.lclDetails;
        const chargeableWeight = Math.max(cbm, weight / 1000);
        
        calculatedFreightCost = chargeableWeight * ratePerTon;
        freightChargeType = `Por ${chargeableWeight.toFixed(2)} W/M`;
    } else if (values.modal === 'air' || values.modal === 'courier') {
        const ratePerKg = rate.costValue || 0;
        const volumetricFactor = 6000;
        let totalGrossWeight = 0;
        let totalVolumetricWeight = 0;

        values.airShipment.pieces.forEach(piece => {
            totalGrossWeight += piece.quantity * piece.weight;
            const volumePerPiece = (piece.length * piece.width * piece.height) / volumetricFactor;
            totalVolumetricWeight += piece.quantity * volumePerPiece;
        });

        const chargeableWeight = Math.max(totalGrossWeight, totalVolumetricWeight);
        const airFreightFee = fees.find(f => f.name.toUpperCase().includes('FRETE AÉREO') && (f.modal === 'Aéreo' || f.modal === 'Ambos'));
        const minCharge = airFreightFee?.minValue ?? 150;

        calculatedFreightCost = chargeableWeight * ratePerKg;
        freightChargeType = `Por ${chargeableWeight.toFixed(2)} kg taxado`;

        if (calculatedFreightCost < minCharge) {
            calculatedFreightCost = minCharge;
            freightChargeType = `Mínimo (${chargeableWeight.toFixed(2)} kg)`;
        }
    } else { // Ocean FCL
        calculatedFreightCost = rate.costValue || 0;
        freightChargeType = 'Por Lote';
    }

    const freightCharge: QuoteCharge = {
        id: `freight-${rate.id || 'manual'}`,
        name: 'FRETE INTERNACIONAL',
        type: freightChargeType,
        cost: parseFloat(calculatedFreightCost.toFixed(2)),
        costCurrency: freightCurrency,
        sale: parseFloat(calculatedFreightCost.toFixed(2)),
        saleCurrency: freightCurrency,
        supplier: rate.carrier || 'A ser definido',
        sacado: customer?.name,
        localPagamento: 'Frete',
        approvalStatus: 'aprovada',
    };

    const initialCharges = calculateCharges([freightCharge], rate.carrier || 'A ser definido');
    const validityDate = form.getValues('validityDate');

    const newQuote: Quote = {
        id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        customer: customer?.name || 'N/A',
        origin: rate.origin || values.origin,
        destination: rate.destination || values.destination,
        status: 'Rascunho',
        date: new Date().toLocaleDateString('pt-BR'),
        charges: initialCharges,
        details: {
            cargo: getCargoDetails(form.getValues()),
            transitTime: rate.transitTime || 'N/A',
            validity: validityDate ? format(validityDate, 'dd/MM/yyyy') : 'N/A',
            freeTime: (rate as any).freeTime || 'N/A',
            incoterm: form.getValues('incoterm'),
            collectionAddress: form.getValues('collectionAddress'),
            deliveryAddress: form.getValues('deliveryAddress'),
        },
        shipper: partners.find(p => p.id?.toString() === values.shipperId),
        consignee: partners.find(p => p.id?.toString() === values.consigneeId),
        agent: partners.find(p => p.id?.toString() === values.agentId),
    };
    setActiveQuote(newQuote);
    onQuoteCreated(newQuote);
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

  const handleUpdateQuote = (data: { charges: QuoteCharge[], details: Quote['details'] }) => {
    if (!activeQuote) return;

    // Create a new object to force re-render in the child component
    const updatedQuote: Quote = {
        ...activeQuote,
        charges: data.charges,
        details: data.details,
        status: 'Enviada'
    };
    
    setActiveQuote(updatedQuote);
    onQuoteUpdate(updatedQuote);

    toast({
        title: "Cotação Atualizada!",
        description: "As alterações foram salvas com sucesso.",
        className: 'bg-success text-success-foreground'
    });
};


  const handleSendQuote = async (channel: 'email' | 'whatsapp') => {
      if (!activeQuote) return;

      setIsSending(true);
      const customer = partners.find(p => p.name === activeQuote.customer);
      if (!customer) {
          toast({ variant: 'destructive', title: 'Cliente não encontrado!' });
          setIsSending(false);
          return;
      }
      
      const exchangeRates = await exchangeRateService.getRates();
      const customerAgio = customer.exchangeRateAgio ?? 0;
      
      const totalSaleBRL = activeQuote.charges.reduce((acc, charge) => {
        const ptaxRate = exchangeRates[charge.saleCurrency] || 1;
        const finalRate = ptaxRate * (1 + (customerAgio / 100));
        const rateToUse = charge.saleCurrency === 'BRL' ? 1 : finalRate;
        return acc + charge.sale * rateToUse;
      }, 0);

      const finalPrice = `BRL ${totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const supplier = activeQuote.charges.find(c => c.name.toLowerCase().includes('frete'))?.supplier || 'N/A';
      
      const isClientAgent = customer.roles.agente === true;

      const commsResponse = await runSendQuote({
        customerName: activeQuote.customer,
        quoteId: activeQuote.id.replace('-DRAFT', ''),
        rateDetails: {
            origin: activeQuote.origin,
            destination: activeQuote.destination,
            carrier: supplier,
            transitTime: activeQuote.details.transitTime,
            finalPrice: finalPrice,
        },
        approvalLink: `https://cargainteligente.com/approve/${activeQuote.id}`,
        rejectionLink: `https://cargainteligente.com/reject/${activeQuote.id}`,
        isClientAgent: isClientAgent,
      });

      if (commsResponse.success) {
        if (channel === 'email') {
            const primaryContact = customer.contacts.find(c => c.departments?.includes('Comercial')) || customer.contacts[0];
            const recipient = primaryContact.email;
            if (recipient) {
                // In a real app, you would use an email service API here.
                console.log("----- SIMULATING EMAIL SEND -----");
                console.log("TO:", recipient);
                console.log("SUBJECT:", commsResponse.data.emailSubject);
                console.log("BODY (HTML):", commsResponse.data.emailBody);
                console.log("---------------------------------");
                toast({ title: 'Simulando envio de e-mail!', description: `E-mail para ${recipient} gerado no console.` });
            } else {
                 toast({ variant: 'destructive', title: 'E-mail não encontrado', description: 'O contato principal do cliente não possui um e-mail cadastrado.' });
            }
        } else { // WhatsApp
            const primaryContact = customer.contacts.find(c => c.departments?.includes('Comercial')) || customer.contacts[0];
            const phone = primaryContact?.phone?.replace(/\D/g, '');
             if (phone) {
                const whatsappResponse = await runSendWhatsapp(phone, commsResponse.data.whatsappMessage);
                if (whatsappResponse.success) {
                    toast({ title: 'Mensagem de WhatsApp enviada!', description: `Mensagem enviada para ${phone}.`, className: 'bg-success text-success-foreground' });
                } else {
                    toast({ variant: 'destructive', title: 'Falha no Envio do WhatsApp', description: whatsappResponse.error });
                }
            } else {
                 toast({ variant: 'destructive', title: 'Telefone não encontrado', description: 'O contato principal do cliente não possui um telefone cadastrado.' });
            }
        }
      } else {
        toast({ variant: 'destructive', title: 'Erro ao gerar comunicação', description: commsResponse.error });
      }

      setIsSending(false);
  }

  const handleGeneratePdf = async () => {
    // This function seems to be removed in favor of a simpler HTML generation.
    // Keeping it here for reference in case it's needed again.
  };

  const handleAutofill = async () => {
    if (!autofillText.trim()) {
      toast({ variant: 'destructive', title: 'Nenhum texto para analisar' });
      return;
    }
    setIsAutofilling(true);
    const response = await runExtractQuoteDetailsFromText(autofillText);
    if (response.success) {
      const currentValues = form.getValues();
      form.reset({
        ...currentValues,
        ...response.data
      });
      toast({ title: 'Dados preenchidos com sucesso!', className: 'bg-success text-success-foreground' });
    } else {
      toast({ variant: 'destructive', title: 'Erro na análise', description: response.error });
    }
    setIsAutofilling(false);
  };

  const modal = form.watch('modal');
  const incoterm = form.watch('incoterm');
  const optionalServices = form.watch('optionalServices');
  const watchedContainers = form.watch('oceanShipment.containers');
  const oceanShipmentType = form.watch('oceanShipmentType');

  const paymentType = useMemo(() => {
    const prepaidTerms = ['CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'DDU'];
    if (prepaidTerms.includes(incoterm)) {
      return { text: 'Prepaid', variant: 'default' as const };
    }
    return { text: 'Collect', variant: 'secondary' as const };
  }, [incoterm]);

  
  if (activeQuote) {
    return (
        <Card className="animate-in fade-in-50 duration-500">
             <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Editor de Cotação - {activeQuote.id.replace('-DRAFT','')}</CardTitle>
                        <CardDescription>
                            Ajuste os custos e valores de venda. Quando estiver pronto, envie para o cliente ou salve em PDF.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setActiveQuote(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Formulário
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <QuoteCostSheet key={activeQuote.id} quote={activeQuote} partners={partners} onUpdate={handleUpdateQuote} />
                <Separator className="my-6"/>
                <div className="flex flex-col sm:flex-row gap-2 mt-6 justify-end">
                     <Button variant="secondary" onClick={() => {}} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Gerar PDF
                    </Button>
                    <Button onClick={() => handleSendQuote('whatsapp')} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                        Enviar por WhatsApp
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

  const deliveryTerms = ['DAP', 'DPU', 'DDP', 'DDU'];
  const showDeliveryAddress = optionalServices?.delivery || deliveryTerms.includes(incoterm);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Cotação de Frete Internacional</CardTitle>
          <CardDescription>Preencha os detalhes abaixo ou cole os dados de um e-mail para que a IA preencha para você.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-6">
              <Label htmlFor="autofill-textarea">Preenchimento com IA</Label>
              <Textarea
                  id="autofill-textarea"
                  placeholder="Cole aqui o corpo de um e-mail ou uma mensagem de cotação..."
                  value={autofillText}
                  onChange={(e) => setAutofillText(e.target.value)}
                  className="min-h-[100px]"
              />
              <Button type="button" variant="secondary" onClick={handleAutofill} disabled={isAutofilling}>
                  {isAutofilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                  Preencher Formulário com IA
              </Button>
          </div>
          <Separator className="mb-6"/>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 items-start">
                   <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
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
                                            (partner) => partner.id?.toString() === field.value
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
                                                    form.setValue("customerId", partner.id!.toString());
                                                    setIsCustomerPopoverOpen(false);
                                                }}
                                                >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                partner.id?.toString() === field.value
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
                    <FormField control={form.control} name="shipperId" render={({ field }) => (
                        <FormItem><FormLabel>Shipper (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{partners.map(p => (<SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="consigneeId" render={({ field }) => (
                        <FormItem><FormLabel>Consignee (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{partners.map(p => (<SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="agentId" render={({ field }) => (
                        <FormItem><FormLabel>Agente (Opcional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{partners.filter(p => p.roles.agente).map(p => (<SelectItem key={p.id} value={p.id!.toString()}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="commodity" render={({ field }) => (
                        <FormItem className="lg:col-span-2">
                            <FormLabel>Tipo de Mercadoria (Opcional)</FormLabel>
                            <FormControl><Input placeholder="Ex: Eletrônicos" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                <div className="flex items-center gap-4">
                    <Tabs
                      defaultValue="ocean"
                      className="w-auto"
                      onValueChange={(value) => {
                          form.setValue('modal', value as 'air' | 'ocean' | 'courier');
                          setResults([]);
                      }}
                      value={modal}
                    >
                      <TabsList>
                        <TabsTrigger value="air"><Plane className="mr-2 h-4 w-4" />Aéreo</TabsTrigger>
                        <TabsTrigger value="ocean"><Ship className="mr-2 h-4 w-4" />Marítimo</TabsTrigger>
                        <TabsTrigger value="courier"><PackageIcon className="mr-2 h-4 w-4" />Courier</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    
                    {modal === 'ocean' && (
                        <Tabs
                          defaultValue="FCL"
                          className="w-auto animate-in fade-in-50 duration-300"
                          onValueChange={(value) => {
                             const newType = value as 'FCL' | 'LCL';
                             form.setValue('oceanShipmentType', newType);
                          }}
                          value={oceanShipmentType}
                        >
                          <TabsList>
                              <TabsTrigger value="FCL">FCL (Contêiner)</TabsTrigger>
                              <TabsTrigger value="LCL">LCL (Carga Solta)</TabsTrigger>
                          </TabsList>
                        </Tabs>
                    )}
                </div>
                
                 <div className="grid md:grid-cols-2 gap-4 mt-6">
                    {modal === 'courier' ? (
                        <>
                            <FormField control={form.control} name="collectionAddress" render={({ field }) => (
                                <FormItem><FormLabel>Endereço de Coleta Completo</FormLabel>
                                <FormControl><Textarea placeholder="Rua, número, cidade, estado, CEP..." {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                                <FormItem><FormLabel>Endereço de Entrega Completo</FormLabel>
                                <FormControl><Textarea placeholder="Rua, número, cidade, estado, CEP..." {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )} />
                        </>
                    ) : (
                        <>
                            <FormField control={form.control} name="origin" render={({ field }) => (
                                <FormItem><FormLabel>Origem (Porto/Aeroporto)</FormLabel>
                                <FormControl>
                                    <AutocompleteInput field={field} placeholder="Ex: Santos, BR" modal={modal}/>
                                </FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="destination" render={({ field }) => (
                                <FormItem><FormLabel>Destino (Porto/Aeroporto)</FormLabel>
                                <FormControl>
                                    <AutocompleteInput field={field} placeholder="Ex: Rotterdam, NL" modal={modal}/>
                                </FormControl><FormMessage /></FormItem>
                            )} />
                        </>
                    )}
                </div>

                <div className="grid md:grid-cols-4 gap-4 mt-6">
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
                              <SelectItem value="DDU">DDU</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div>
                        <Label>Pagamento Frete</Label>
                        <div className="flex h-10 items-center">
                            <Badge variant={paymentType.variant}>{paymentType.text}</Badge>
                        </div>
                    </div>
                </div>

                {incoterm === 'EXW' && modal !== 'courier' && (
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
                
                {showDeliveryAddress && modal !== 'courier' && (
                    <div className="mt-4 animate-in fade-in-50 duration-300">
                        <FormField
                            control={form.control}
                            name="deliveryAddress"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Local de Entrega</FormLabel>
                                    <FormControl><Input placeholder="Informe o endereço completo para entrega" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <FormField control={form.control} name="departureDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Data de Embarque (Opcional)</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? (format(new Date(field.value), "PPP")) : (<span>Selecione a data</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : undefined)} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="validityDate" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Data de Validade da Cotação</FormLabel>
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
                </div>

                <Separator className="my-6" />

                {(modal === 'air' || modal === 'courier') && (
                  <div className="m-0 space-y-4 animate-in fade-in-50 duration-300">
                      <h3 className="text-lg font-medium">Detalhes da Carga Aérea / Courier</h3>
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
                  </div>
                )}
                
                {modal === 'ocean' && (
                  <div className="m-0 space-y-4 animate-in fade-in-50 duration-300">
                      <h3 className="text-lg font-medium">Detalhes da Carga Marítima</h3>
                      
                      {oceanShipmentType === 'FCL' && (
                        <div className="mt-4 space-y-4">
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
                        </div>
                      )}
                      
                      {oceanShipmentType === 'LCL' && (
                          <div className="mt-4">
                              <div className="grid md:grid-cols-2 gap-4 p-3 border rounded-md">
                                  <FormField control={form.control} name="lclDetails.cbm" render={({ field }) => (
                                      <FormItem><FormLabel>Cubagem Total (CBM)</FormLabel><FormControl><Input type="number" placeholder="Ex: 2.5" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                  )} />
                                  <FormField control={form.control} name="lclDetails.weight" render={({ field }) => (
                                      <FormItem><FormLabel>Peso Bruto Total (kg)</FormLabel><FormControl><Input type="number" placeholder="Ex: 1200" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                  )} />
                              </div>
                          </div>
                      )}
                  </div>
                )}
              
              <Separator className="my-6" />
                <div>
                    <h3 className="text-lg font-medium mb-4">Serviços Opcionais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <FormField control={form.control} name="optionalServices.customsClearance" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Despacho Aduaneiro</FormLabel></div></FormItem>
                        )} />
                         <FormField control={form.control} name="optionalServices.trading" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Trading</FormLabel></div></FormItem>
                        )} />
                        <FormField control={form.control} name="optionalServices.redestinacao" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Redestinação</FormLabel></div></FormItem>
                        )} />
                        <FormField control={form.control} name="optionalServices.dta" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>DTA</FormLabel></div></FormItem>
                        )} />
                        <FormField control={form.control} name="optionalServices.insurance" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 col-span-1 lg:col-span-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none w-full">
                                <FormLabel>Seguro Internacional</FormLabel>
                                {optionalServices.insurance && (
                                    <div className="animate-in fade-in-50 duration-300">
                                    <Alert variant="default" className="mt-2 border-primary/50">
                                        <Info className="h-4 w-4" />
                                        <AlertDescription>
                                            Por favor, informe o valor da mercadoria (CIF) e a moeda abaixo para o cálculo do seguro.
                                        </AlertDescription>
                                    </Alert>
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <FormField control={form.control} name="optionalServices.cargoValue" render={({ field }) => (
                                            <FormItem>
                                                <FormControl><Input type="number" placeholder="Valor CIF Mercadoria" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="optionalServices.cargoValueCurrency" render={({ field }) => (
                                            <FormItem>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="BRL">BRL</SelectItem>
                                                        <SelectItem value="USD">USD</SelectItem>
                                                        <SelectItem value="EUR">EUR</SelectItem>
                                                        <SelectItem value="GBP">GBP</SelectItem>
                                                        <SelectItem value="JPY">JPY</SelectItem>
                                                        <SelectItem value="CHF">CHF</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    </div>
                                )}
                                </div>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="optionalServices.delivery" render={({ field }) => (
                             <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Entrega</FormLabel></div></FormItem>
                        )} />
                    </div>
                </div>
              
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button type="submit" disabled={isLoading} className="flex-1 text-base py-6">
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> : <><Search className="mr-2 h-4 w-4" /> Buscar Tarifas</>}
                    </Button>
                    <div className="flex gap-2">
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
      
      {isFetchingSchedules && (
        <div className="text-center p-8 text-muted-foreground animate-pulse">
            <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" />
            Buscando programação de navios...
        </div>
      )}

      {!isFetchingSchedules && schedules.length > 0 && (
          <Card className="animate-in fade-in-50 duration-500">
              <CardHeader>
                  <CardTitle>Programação de Navios</CardTitle>
                  <CardDescription>Próximas saídas para a rota selecionada. Clique em "Selecionar" para usar o ETD.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="border rounded-lg">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Navio / Viagem</TableHead>
                                  <TableHead>Armador</TableHead>
                                  <TableHead>ETD</TableHead>
                                  <TableHead>ETA</TableHead>
                                  <TableHead className="text-right">Ação</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {schedules.map((schedule, index) => (
                                  <TableRow key={index}>
                                      <TableCell className="font-medium">{schedule.vesselName} / {schedule.voyage}</TableCell>
                                      <TableCell>{schedule.carrier}</TableCell>
                                      <TableCell>{format(new Date(schedule.etd), 'dd/MM/yyyy')}</TableCell>
                                      <TableCell>{format(new Date(schedule.eta), 'dd/MM/yyyy')}</TableCell>
                                      <TableCell className="text-right">
                                          <Button variant="outline" size="sm" onClick={() => handleSelectSchedule(schedule)}>
                                              Selecionar
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
      )}

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
                            <p className="text-sm font-semibold">{result.service ? result.service : `${result.origin} → ${result.destination}`}</p>
                            <p className="text-sm text-muted-foreground">
                                Tempo de trânsito: {result.deliveryDays !== undefined ? `${result.deliveryDays || '?'} dias` : result.transitTime}
                            </p>
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

       {!isLoading && (form.formState.isSubmitted || apiError) && results.length === 0 && (
          <div className="mt-8 space-y-4">
              <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Nenhuma tarifa encontrada</AlertTitle>
                  <AlertDescription>
                  {apiError || "Não encontramos nenhuma tarifa para os critérios informados. Você pode solicitar a cotação a um agente ou adicionar o frete manualmente."}
                  </AlertDescription>
              </Alert>
              <ManualFreightForm onManualRateAdd={handleSelectRate} />
          </div>
       )}
       
       {!isLoading && !form.formState.isSubmitted && !activeQuote && (
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
