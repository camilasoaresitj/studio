
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { baseFreightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { Plane, Ship, Loader2, Search, Package as PackageIcon, ArrowRight } from 'lucide-react';
import { runGetFreightRates } from '@/app/actions';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { getProfitSettings } from '@/lib/profit-settings-data';
import { useRouter } from 'next/navigation';
import { portsAndAirports } from '@/lib/ports';

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

// A simplified version of the form for clients
const clientQuoteSchema = baseFreightQuoteFormSchema.omit({ customerId: true });
type ClientQuoteFormData = Omit<FreightQuoteFormData, 'customerId'>;

export function ClientQuoteForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FreightRate[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  // In a real app, this would come from an auth context
  const customerId = "Nexus Imports"; 

  const form = useForm<ClientQuoteFormData>({
    resolver: zodResolver(clientQuoteSchema),
    defaultValues: {
      modal: 'ocean',
      incoterm: 'FOB',
      origin: '',
      destination: '',
      commodity: '',
      airShipment: {
        pieces: [{ quantity: 1, length: 100, width: 100, height: 100, weight: 500 }],
        isStackable: true,
      },
      oceanShipmentType: 'FCL',
      oceanShipment: {
        containers: [{ type: "20'GP", quantity: 1 }],
      },
      lclDetails: {
        cbm: 1,
        weight: 1000,
      },
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
  
  const modal = form.watch('modal');

  const portList = useMemo(() => {
    const portType = modal === 'ocean' ? 'port' : 'airport';
    return portsAndAirports
        .filter(p => p.type === portType)
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [modal]);


  async function onSubmit(values: ClientQuoteFormData) {
    setIsLoading(true);
    setResults([]);
    
    const profitSettings = getProfitSettings();
    
    // The client form needs the customerId for the action
    const fullValues = { ...values, customerId };
    
    const response = await runGetFreightRates(fullValues);

    if (response.success && response.data) {
      // Add profit margin to the cost to get the sale price for the client
      const resultsWithProfit = response.data.map(rate => {
        const profitSetting = profitSettings.find(s => s.modal.toLowerCase() === values.modal);
        let saleValue = rate.costValue;
        if (profitSetting) {
            // This is a simplified profit logic. A real app might have more complex rules.
            const totalContainers = values.modal === 'ocean' && values.oceanShipmentType === 'FCL' 
                ? values.oceanShipment.containers.reduce((acc, c) => acc + c.quantity, 0)
                : 1;

            const profitAmount = profitSetting.unit === 'Por Contêiner' 
                ? profitSetting.amount * totalContainers 
                : profitSetting.amount; // Simplified for KG/CBM
            
            saleValue += profitAmount;
        }
        return {
            ...rate,
            cost: `USD ${saleValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            costValue: saleValue,
        };
      });

      setResults(resultsWithProfit);
      if (resultsWithProfit.length === 0) {
        toast({ title: "Nenhuma tarifa online encontrada", description: "Nossa equipe comercial entrará em contato em breve." });
      }
    } else {
      toast({ variant: "destructive", title: "Erro ao buscar tarifas", description: response.error });
    }
    
    setIsLoading(false);
  }

  const handleSelectRate = (rate: FreightRate) => {
      // In this client version, selecting a rate could mean creating a draft quote
      // and redirecting, or showing a confirmation step.
      // For now, we'll just show a toast and in a real scenario would create a shipment process.
      toast({
          title: "Tarifa Selecionada!",
          description: `Sua solicitação para a tarifa da ${rate.carrier} foi enviada. Nossa equipe entrará em contato para confirmar.`,
          className: 'bg-success text-success-foreground'
      });
      // Redirect back to the portal dashboard after selection
      router.push('/portal');
  }

  return (
    <div className="space-y-8">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalhes do Embarque</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Tabs
                            defaultValue="ocean"
                            className="w-auto"
                            onValueChange={(value) => form.setValue('modal', value as 'air' | 'ocean' | 'courier')}
                            value={modal}
                        >
                            <TabsList>
                                <TabsTrigger value="ocean"><Ship className="mr-2 h-4 w-4" />Marítimo</TabsTrigger>
                                <TabsTrigger value="air"><Plane className="mr-2 h-4 w-4" />Aéreo</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="origin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Origem</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um local..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {portList.map(port => <SelectItem key={port.unlocode} value={port.name}>{port.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="destination"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Destino</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um local..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {portList.map(port => <SelectItem key={port.unlocode} value={port.name}>{port.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        {modal === 'ocean' && (
                             <FormField control={form.control} name="oceanShipment.containers.0.type" render={({ field }) => (
                                <FormItem><FormLabel>Tipo de Contêiner</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="20'GP">20' General Purpose</SelectItem>
                                            <SelectItem value="40'GP">40' General Purpose</SelectItem>
                                            <SelectItem value="40'HC">40' High Cube</SelectItem>
                                        </SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                        )}

                        {modal === 'air' && (
                             <FormField control={form.control} name="airShipment.pieces.0.weight" render={({ field }) => (
                                <FormItem><FormLabel>Peso Total (kg)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        )}
                    </CardContent>
                </Card>

                <Button type="submit" disabled={isLoading} className="w-full text-base py-6">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> : <><Search className="mr-2 h-4 w-4" /> Buscar Tarifas</>}
                </Button>
            </form>
        </Form>
        
        {!isLoading && results.length > 0 && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            <h2 className="text-2xl font-bold">Resultados da Cotação</h2>
            {results.map(result => (
                <Card key={result.id} className="flex flex-col md:flex-row items-center justify-between p-4 gap-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Image src={result.carrierLogo} alt={result.carrier} width={100} height={40} className="object-contain" data-ai-hint={result.dataAiHint} />
                        <div className="flex-grow">
                            <p className="font-bold text-lg">{result.carrier}</p>
                            <p className="text-sm text-muted-foreground">
                                Trânsito: {result.transitTime}
                            </p>
                        </div>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                        <p className="text-xl font-bold text-primary">{result.cost}</p>
                        <Badge variant="secondary" className="mt-1">{result.source.replace('(Simulado)', '')}</Badge>
                    </div>
                    <Button className="w-full md:w-auto" onClick={() => handleSelectRate(result)}>
                        Selecionar <ArrowRight className="ml-2 h-4 w-4"/>
                    </Button>
                </Card>
            ))}
          </div>
      )}
    </div>
  );
}
