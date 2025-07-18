
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Upload, Wand2, FileDown, BarChart2, PieChart, Search, Ship, Plane, Save, FolderOpen } from 'lucide-react';
import { runExtractInvoiceItems, runGetNcmRates, runGenerateSimulationPdf } from '@/app/actions';
import type { InvoiceItem } from '@/ai/flows/extract-invoice-items';
import type { GetNcmRatesOutput } from '@/ai/flows/get-ncm-rates';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFees, Fee } from '@/lib/fees-data';
import { getPartners, Partner } from '@/lib/partners-data';
import { getSimulations, saveSimulations, Simulation } from '@/lib/simulations-data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { exchangeRateService } from '@/services/exchange-rate-service';

const itemSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória.'),
  quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero.'),
  valorUnitarioUSD: z.coerce.number().min(0.01, 'Valor unitário deve ser maior que zero.'),
  ncm: z.string().length(8, 'NCM deve ter 8 dígitos.'),
  pesoKg: z.coerce.number().min(0.01, 'Peso deve ser maior que zero.'),
  ii: z.coerce.number().min(0, 'Alíquota de II é obrigatória.').default(14),
  ipi: z.coerce.number().min(0, 'Alíquota de IPI é obrigatória.').default(10),
  pis: z.coerce.number().min(0, 'Alíquota de PIS é obrigatória.').default(2.1),
  cofins: z.coerce.number().min(0, 'Alíquota de COFINS é obrigatória.').default(9.65),
});

const localExpenseSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória.'),
  value: z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero.'),
});

const containerSchema = z.object({
  type: z.string().min(1, 'Tipo é obrigatório'),
  quantity: z.coerce.number().min(1, 'Qtde. é obrigatória'),
});

const simulationSchema = z.object({
  simulationName: z.string().min(1, 'Nome da simulação é obrigatório.'),
  customerName: z.string().min(1, 'Nome do cliente é obrigatório.'),
  modal: z.enum(['maritimo', 'aereo']),
  chargeType: z.enum(['fcl', 'lcl', 'aereo']),
  containers: z.array(containerSchema).optional(),
  lclCbm: z.coerce.number().optional(),
  lclWeight: z.coerce.number().optional(),
  airWeight: z.coerce.number().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos um item.'),
  taxasCambio: z.object({
    di: z.coerce.number().min(0.01, 'Taxa de câmbio da DI é obrigatória.'),
    frete: z.coerce.number().min(0.01, 'Taxa de câmbio do frete é obrigatória.'),
  }),
  despesasGerais: z.object({
    freteInternacionalUSD: z.coerce.number().min(0, 'Frete internacional é obrigatório.'),
    seguroUSD: z.coerce.number().min(0, 'Seguro é obrigatório.'),
  }),
  despesasLocais: z.array(localExpenseSchema),
  icmsGeral: z.coerce.number().min(0, 'Alíquota de ICMS é obrigatória.'),
});

export type SimulationFormData = z.infer<typeof simulationSchema>;
type SimulationResult = {
  valorAduaneiro: number;
  totalII: number;
  totalIPI: number;
  totalPIS: number;
  totalCOFINS: number;
  totalICMS: number;
  custoTotal: number;
  pesoTotal: number;
  quantidadeTotal: number;
  itens: (z.infer<typeof itemSchema> & {
    valorAduaneiroRateado: number;
    impostosRateados: number;
    despesasLocaisRateadas: number;
    custoUnitarioFinal: number;
  })[];
};

const NcmRateFinder = ({ itemIndex, ncm, onRatesFound }: { itemIndex: number, ncm: string, onRatesFound: (itemIndex: number, rates: GetNcmRatesOutput) => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleSearch = async () => {
        if (ncm.length < 8) {
            toast({ variant: 'destructive', title: 'NCM Inválido', description: 'O NCM deve ter pelo menos 8 dígitos.' });
            return;
        }
        setIsLoading(true);
        const response = await runGetNcmRates(ncm);
        if (response.success && response.data) {
            onRatesFound(itemIndex, response.data);
            toast({ title: 'Alíquotas encontradas!', description: `Alíquotas para o NCM ${ncm} foram carregadas.` });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar NCM', description: response.error });
        }
        setIsLoading(false);
    };

    return (
        <Button type="button" onClick={handleSearch} disabled={isLoading} size="sm" variant="outline">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
        </Button>
    );
};

export default function SimuladorDIPage() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [standardFees, setStandardFees] = useState<Fee[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isSimulationsDialogOpen, setIsSimulationsDialogOpen] = useState(false);
  const [isPartnerPopoverOpen, setIsPartnerPopoverOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});

  const form = useForm<SimulationFormData>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      simulationName: '',
      customerName: '',
      modal: 'maritimo',
      chargeType: 'fcl',
      containers: [{ type: '20\'GP', quantity: 1 }],
      itens: [],
      taxasCambio: { di: 5.67, frete: 5.87 },
      despesasGerais: { freteInternacionalUSD: 1400, seguroUSD: 100 },
      despesasLocais: [],
      icmsGeral: 17,
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem, replace: replaceItems } = useFieldArray({
    control: form.control,
    name: "itens",
  });

   const { fields: expenseFields, append: appendExpense, remove: removeExpense, replace: replaceExpenses } = useFieldArray({
    control: form.control,
    name: "despesasLocais",
  });
  
   const { fields: containerFields, append: appendContainer, remove: removeContainer } = useFieldArray({
    control: form.control,
    name: "containers",
  });

  const watchedModal = useWatch({ control: form.control, name: 'modal' });
  const watchedChargeType = useWatch({ control: form.control, name: 'chargeType' });
  const watchedContainers = useWatch({ control: form.control, name: 'containers' });
  const watchedLclCbm = useWatch({ control: form.control, name: 'lclCbm' });
  const watchedLclWeight = useWatch({ control: form.control, name: 'lclWeight' });
  const watchedAirWeight = useWatch({ control: form.control, name: 'airWeight' });
  
  useEffect(() => {
    const fetchInitialData = async () => {
        setStandardFees(getFees());
        setPartners(getPartners().filter(p => p.roles.cliente));
        setSimulations(getSimulations());
        const rates = await exchangeRateService.getRates();
        setExchangeRates(rates);
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const relevantFees = standardFees.filter(fee => {
        const directionMatch = fee.direction === 'Importação' || fee.direction === 'Ambos';
        let modalMatch = false;
        if (watchedModal === 'maritimo' && (fee.modal === 'Marítimo' || fee.modal === 'Ambos')) {
            modalMatch = !fee.chargeType || fee.chargeType === watchedChargeType.toUpperCase() || fee.chargeType === 'NONE';
        }
        if (watchedModal === 'aereo' && (fee.modal === 'Aéreo' || fee.modal === 'Ambos')) {
            modalMatch = !fee.chargeType || fee.chargeType === 'Aéreo' || fee.chargeType === 'NONE';
        }
        return directionMatch && modalMatch && fee.type !== 'Opcional';
    });

    const newExpenses: { description: string, value: number }[] = relevantFees.map(fee => {
        let value = parseFloat(fee.value) || 0;
        
        const ptaxRate = exchangeRates[fee.currency] || 1;
        const valueInBRL = fee.currency === 'BRL' ? value : value * ptaxRate;
        
        if (fee.unit.toLowerCase().includes('contêiner') && watchedChargeType === 'fcl' && watchedContainers) {
            const totalContainers = watchedContainers.reduce((sum, c) => sum + c.quantity, 0);
            value = valueInBRL * totalContainers;
        } else if (fee.type === 'Por CBM/Ton' && watchedChargeType === 'lcl') {
            const chargeableWeight = Math.max(watchedLclCbm || 0, (watchedLclWeight || 0) / 1000);
            const calculatedValue = valueInBRL * chargeableWeight;
            value = fee.minValue && calculatedValue < fee.minValue ? fee.minValue : calculatedValue;
        } else if (fee.type === 'Por KG' && watchedModal === 'aereo') {
            const calculatedValue = valueInBRL * (watchedAirWeight || 0);
            value = fee.minValue && calculatedValue < fee.minValue ? fee.minValue : calculatedValue;
        } else {
            value = valueInBRL; // Fixed fees already converted
        }
        return { description: fee.name, value: parseFloat(value.toFixed(2)) };
    });

    replaceExpenses(newExpenses);
  }, [watchedModal, watchedChargeType, watchedContainers, watchedLclCbm, watchedLclWeight, watchedAirWeight, standardFees, replaceExpenses, form, exchangeRates]);


  const calculateCosts = useCallback((data: SimulationFormData): SimulationResult | null => {
      try {
        const { itens, taxasCambio, despesasGerais, despesasLocais, icmsGeral, modal } = data;
        if (itens.length === 0) return null;

        const valorFOBTotalUSD = itens.reduce((sum, item) => sum + item.valorUnitarioUSD * item.quantidade, 0);
        const pesoTotal = itens.reduce((sum, item) => sum + item.pesoKg * item.quantidade, 0);

        if (pesoTotal === 0) return null;
        
        const valorAduaneiro = (valorFOBTotalUSD + despesasGerais.freteInternacionalUSD + despesasGerais.seguroUSD) * taxasCambio.di;
        
        const freteBRL = despesasGerais.freteInternacionalUSD * taxasCambio.di;
        const calculatedStorage = Math.max(2500, valorAduaneiro * 0.01);
        const calculatedAFRMM = modal === 'maritimo' ? freteBRL * 0.08 : 0;
        
        let totalII = 0, totalIPI = 0, totalPIS = 0, totalCOFINS = 0;

        const itensResultado = itens.map(item => {
          const proporcaoFOB = (item.valorUnitarioUSD * item.quantidade) / valorFOBTotalUSD;
          const valorAduaneiroRateado = valorAduaneiro * proporcaoFOB;

          const ii = valorAduaneiroRateado * (item.ii / 100);
          const ipi = (valorAduaneiroRateado + ii) * (item.ipi / 100);
          const pis = valorAduaneiroRateado * (item.pis / 100);
          const cofins = valorAduaneiroRateado * (item.cofins / 100);
          
          totalII += ii;
          totalIPI += ipi;
          totalPIS += pis;
          totalCOFINS += cofins;
          
          const impostosRateados = ii + ipi + pis + cofins;
          
          return { ...item, valorAduaneiroRateado, impostosRateados, despesasLocaisRateadas: 0, custoUnitarioFinal: 0 };
        });

        const baseICMS = valorAduaneiro + totalII + totalIPI + totalPIS + totalCOFINS;
        const totalICMS = (baseICMS / (1 - (icmsGeral / 100))) * (icmsGeral / 100);
        
        const totalDespesasLocais = despesasLocais.reduce((sum, d) => sum + d.value, 0) + calculatedStorage + calculatedAFRMM;
        const totalImpostos = totalII + totalIPI + totalPIS + totalCOFINS + totalICMS;
        const custoTotal = valorAduaneiro + totalImpostos + totalDespesasLocais;
        
        const itensResultadoFinal = itensResultado.map(item => {
            const proporcaoFOB = (item.valorUnitarioUSD * item.quantidade) / valorFOBTotalUSD;
            const impostosRateadosComIcms = item.impostosRateados + (totalICMS * proporcaoFOB);
            const despesasLocaisRateadas = (totalDespesasLocais * proporcaoFOB);
            const custoTotalItem = item.valorAduaneiroRateado + impostosRateadosComIcms + despesasLocaisRateadas;
            const custoUnitarioFinal = custoTotalItem / item.quantidade;

            return { ...item, impostosRateados: impostosRateadosComIcms, despesasLocaisRateadas, custoUnitarioFinal };
        });

        return {
          valorAduaneiro, totalII, totalIPI, totalPIS, totalCOFINS, totalICMS,
          custoTotal, pesoTotal,
          quantidadeTotal: itens.reduce((sum, i) => sum + i.quantidade, 0),
          itens: itensResultadoFinal
        };
      } catch (e) {
          console.error("Calculation error:", e);
          return null;
      }
  }, []);

  useEffect(() => {
    const subscription = form.watch(() => {
      const data = form.getValues();
      const newResult = calculateCosts(data);
      setResult(newResult);
    });
    return () => subscription.unsubscribe();
  }, [form, calculateCosts]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAiLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const fileContent = e.target?.result as string;
            const response = await runExtractInvoiceItems({
                fileDataUri: fileContent,
                fileName: file.name
            });
            if (response.success && response.data.length > 0) {
                const itemsWithTaxes = response.data.map(item => ({...item, ii: 14, ipi: 10, pis: 2.1, cofins: 9.65 }))
                replaceItems(itemsWithTaxes);
                toast({
                    title: 'Itens Importados!',
                    description: `${response.data.length} itens foram extraídos do arquivo.`,
                    className: 'bg-success text-success-foreground'
                });
            } else {
                throw new Error(response.error || 'A IA não conseguiu extrair itens do arquivo.');
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao Processar Arquivo', description: error.message });
        } finally {
            setIsAiLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsDataURL(file);
  };
  
  const handleRatesFound = (itemIndex: number, rates: GetNcmRatesOutput) => {
      form.setValue(`itens.${itemIndex}.ii`, rates.ii);
      form.setValue(`itens.${itemIndex}.ipi`, rates.ipi);
      form.setValue(`itens.${itemIndex}.pis`, rates.pis);
      form.setValue(`itens.${itemIndex}.cofins`, rates.cofins);
      toast({ title: 'Alíquotas aplicadas!', description: `Alíquotas para o NCM ${rates.ncm} foram carregadas no item.` });
  };
  
  const handleSaveSimulation = form.handleSubmit(async (data) => {
    setIsSaving(true);
    await new Promise(res => setTimeout(res, 500));
    const newSimulation: Simulation = {
        id: `SIM-${Date.now()}`,
        name: data.simulationName,
        customer: data.customerName,
        createdAt: new Date(),
        data: data,
    };
    const currentSimulations = getSimulations();
    saveSimulations([newSimulation, ...currentSimulations]);
    setSimulations([newSimulation, ...currentSimulations]);
    toast({
        title: 'Simulação Salva!',
        description: `A simulação "${data.simulationName}" foi salva com sucesso.`,
        className: 'bg-success text-success-foreground'
    });
    setIsSaving(false);
  });
  
  const handleLoadSimulation = (simulation: Simulation) => {
      form.reset(simulation.data);
      toast({
          title: `Simulação "${simulation.name}" Carregada!`,
          description: 'Os dados foram preenchidos no formulário.'
      });
      setIsSimulationsDialogOpen(false);
  };

  const handleGeneratePdf = async () => {
    if (!result) {
        toast({ variant: 'destructive', title: 'Nenhum resultado para exportar.' });
        return;
    }
    setIsGeneratingPdf(true);
    try {
        const formData = form.getValues();
        const response = await runGenerateSimulationPdf({
            simulationName: formData.simulationName,
            customerName: formData.customerName,
            createdAt: new Date().toLocaleDateString('pt-BR'),
            formData,
            resultData: result,
        });

        if (!response.success || !response.data.html) {
            throw new Error(response.error || 'A geração do HTML da simulação falhou.');
        }

        const element = document.createElement("div");
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '0';
        element.style.width = '800px'; 
        element.innerHTML = response.data.html;
        document.body.appendChild(element);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`simulacao-${formData.simulationName || 'custos'}.pdf`);
        toast({ title: 'PDF gerado com sucesso!', className: 'bg-success text-success-foreground' });

        document.body.removeChild(element);

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: e.message });
    } finally {
        setIsGeneratingPdf(false);
    }
  };


  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Simulador de Custos de Importação</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Calcule todos os impostos e custos da sua importação para encontrar o custo final do produto.
        </p>
      </header>
      
      <Form {...form}>
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileDown className="h-5 w-5"/> Salvar e Carregar Simulação</CardTitle>
                        <CardDescription>Nomeie sua simulação para salvá-la ou carregue uma existente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="simulationName" render={({ field }) => (<FormItem><FormLabel>Nome da Simulação</FormLabel><FormControl><Input placeholder="Ex: Importação Notebooks Jan/25" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                             <FormField control={form.control} name="customerName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cliente</FormLabel>
                                    <Popover open={isPartnerPopoverOpen} onOpenChange={setIsPartnerPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                    {field.value || "Selecione um cliente"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Buscar cliente..." />
                                                <CommandList><CommandEmpty>Nenhum cliente.</CommandEmpty><CommandGroup>
                                                    {partners.map(p => (<CommandItem value={p.name} key={p.id} onSelect={() => {form.setValue("customerName", p.name); setIsPartnerPopoverOpen(false);}}>
                                                        <Check className={cn("mr-2 h-4 w-4", p.name === field.value ? "opacity-100" : "opacity-0")}/>{p.name}
                                                    </CommandItem>))}
                                                </CommandGroup></CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                        <div className="flex gap-2">
                             <Button type="button" onClick={handleSaveSimulation} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                                Salvar Simulação
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setIsSimulationsDialogOpen(true)}>
                                <FolderOpen className="mr-2 h-4 w-4"/>
                                Minhas Simulações
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Ship className="h-5 w-5"/> Detalhes do Embarque</CardTitle>
                        <CardDescription>Informe os detalhes da carga para que o sistema sugira as despesas locais automaticamente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Tabs
                          value={watchedModal}
                          onValueChange={(value) => {
                            form.setValue('modal', value as 'maritimo' | 'aereo');
                            if (value === 'maritimo') form.setValue('chargeType', 'fcl');
                            if (value === 'aereo') form.setValue('chargeType', 'aereo');
                          }}
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="maritimo"><Ship className="mr-2 h-4 w-4"/> Marítimo</TabsTrigger>
                            <TabsTrigger value="aereo"><Plane className="mr-2 h-4 w-4"/> Aéreo</TabsTrigger>
                          </TabsList>
                          <TabsContent value="maritimo" className="mt-4">
                              <Tabs
                                value={watchedChargeType}
                                onValueChange={(value) => form.setValue('chargeType', value as 'fcl' | 'lcl')}
                              >
                                  <TabsList className="grid w-full grid-cols-2">
                                      <TabsTrigger value="fcl">FCL (Full Container Load)</TabsTrigger>
                                      <TabsTrigger value="lcl">LCL (Less than Container Load)</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="fcl" className="mt-4 space-y-2">
                                    {containerFields.map((field, index) => (
                                      <div key={field.id} className="flex items-end gap-2">
                                        <FormField control={form.control} name={`containers.${index}.type`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="20'GP">20'GP</SelectItem><SelectItem value="40'GP">40'GP</SelectItem><SelectItem value="40'HC">40'HC</SelectItem><SelectItem value="20'RF">20'RF</SelectItem></SelectContent></Select></FormItem>)}/>
                                        <FormField control={form.control} name={`containers.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel>Qtde</FormLabel><FormControl><Input type="number" {...field}/></FormControl></FormItem>)}/>
                                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeContainer(index)}><Trash2 className="h-4 w-4"/></Button>
                                      </div>
                                    ))}
                                    <Button type="button" size="sm" variant="outline" onClick={() => appendContainer({ type: '20\'GP', quantity: 1 })}>
                                        <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Contêiner
                                    </Button>
                                  </TabsContent>
                                  <TabsContent value="lcl" className="mt-4 grid grid-cols-2 gap-4">
                                      <FormField control={form.control} name="lclCbm" render={({ field }) => (<FormItem><FormLabel>CBM Total</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)}/>
                                      <FormField control={form.control} name="lclWeight" render={({ field }) => (<FormItem><FormLabel>Peso Total (Kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)}/>
                                  </TabsContent>
                              </Tabs>
                          </TabsContent>
                           <TabsContent value="aereo" className="mt-4">
                                <FormField control={form.control} name="airWeight" render={({ field }) => (<FormItem><FormLabel>Peso Taxado (Kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)}/>
                           </TabsContent>
                       </Tabs>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5"/> Importar Dados da Fatura</CardTitle>
                        <CardDescription>Importe um arquivo (.xlsx, .csv, .xml) para que a IA preencha os itens automaticamente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".xlsx,.xls,.csv,.xml"
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isAiLoading}>
                            {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            Importar e Extrair Itens com IA
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row justify-between items-center">
                        <div>
                            <CardTitle>Itens da Fatura</CardTitle>
                            <CardDescription>Liste os produtos e suas respectivas alíquotas de impostos.</CardDescription>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => appendItem({ descricao: '', quantidade: 1, valorUnitarioUSD: 0, ncm: '', pesoKg: 0, ii: 14, ipi: 10, pis: 2.1, cofins: 9.65 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                        </Button>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4">
                            {itemFields.map((field, index) => (
                                <div key={field.id} className="p-3 border rounded-md relative">
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive absolute top-1 right-1" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4"/></Button>
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
                                        <div className="md:col-span-2"><FormField control={form.control} name={`itens.${index}.descricao`} render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.quantidade`} render={({ field }) => (<FormItem><FormLabel>Qtde</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.valorUnitarioUSD`} render={({ field }) => (<FormItem><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.pesoKg`} render={({ field }) => (<FormItem><FormLabel>Peso (Kg)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                                        <div className="md:col-span-2"><FormField control={form.control} name={`itens.${index}.ncm`} render={({ field: ncmField }) => (
                                            <FormItem><FormLabel>NCM</FormLabel>
                                                <div className="flex items-center gap-1">
                                                    <FormControl><Input {...ncmField}/></FormControl>
                                                    <NcmRateFinder itemIndex={index} ncm={ncmField.value} onRatesFound={handleRatesFound} />
                                                </div>
                                            <FormMessage/></FormItem>
                                        )}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.ii`} render={({ field }) => (<FormItem><FormLabel>II (%)</FormLabel><FormControl><Input type="number" placeholder="14" {...field} /></FormControl></FormItem>)}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.ipi`} render={({ field }) => (<FormItem><FormLabel>IPI (%)</FormLabel><FormControl><Input type="number" placeholder="10" {...field} /></FormControl></FormItem>)}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.pis`} render={({ field }) => (<FormItem><FormLabel>PIS (%)</FormLabel><FormControl><Input type="number" placeholder="2.1" {...field} /></FormControl></FormItem>)}/></div>
                                        <div><FormField control={form.control} name={`itens.${index}.cofins`} render={({ field }) => (<FormItem><FormLabel>COFINS (%)</FormLabel><FormControl><Input type="number" placeholder="9.65" {...field} /></FormControl></FormItem>)}/></div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Parâmetros e Despesas</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold">Câmbio e ICMS</h3>
                            <FormField control={form.control} name="taxasCambio.di" render={({ field }) => (<FormItem><FormLabel>Câmbio DI (BRL)</FormLabel><FormControl><Input type="number" step="0.0001" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                            <FormField control={form.control} name="taxasCambio.frete" render={({ field }) => (<FormItem><FormLabel>Câmbio Frete (BRL)</FormLabel><FormControl><Input type="number" step="0.0001" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                            <FormField control={form.control} name="icmsGeral" render={({ field }) => (<FormItem><FormLabel>Alíquota Geral de ICMS (%)</FormLabel><FormControl><Input type="number" placeholder="17" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold">Despesas Gerais</h3>
                            <FormField control={form.control} name="despesasGerais.freteInternacionalUSD" render={({ field }) => (<FormItem><FormLabel>Frete Internacional (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                            <FormField control={form.control} name="despesasGerais.seguroUSD" render={({ field }) => (<FormItem><FormLabel>Seguro (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                        </div>
                         <div className="md:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Despesas Locais (BRL)</h3>
                                <Button type="button" size="sm" variant="outline" onClick={() => appendExpense({ description: '', value: 0 })}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Despesa
                                </Button>
                            </div>
                             {expenseFields.map((field, index) => (
                                <div key={field.id} className="flex items-end gap-2">
                                    <div className="flex-grow"><FormField control={form.control} name={`despesasLocais.${index}.description`} render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/></div>
                                    <div className="w-40"><FormField control={form.control} name={`despesasLocais.${index}.value`} render={({ field }) => (<FormItem><FormLabel>Valor (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)}/></div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeExpense(index)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6 sticky top-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/> Resultado da Simulação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="space-y-3 animate-in fade-in-50 duration-500">
                                <div className="p-4 border rounded-lg bg-secondary/50">
                                    <p className="text-sm text-muted-foreground">Custo Total da Importação</p>
                                    <p className="text-3xl font-bold">BRL {result.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Valor Aduaneiro:</span><span className="font-mono">BRL {result.valorAduaneiro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- II:</span><span className="font-mono">BRL {result.totalII.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- IPI:</span><span className="font-mono">BRL {result.totalIPI.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- PIS:</span><span className="font-mono">BRL {result.totalPIS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- COFINS:</span><span className="font-mono">BRL {result.totalCOFINS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- ICMS:</span><span className="font-mono">BRL {result.totalICMS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                </div>
                                 <div className="flex justify-end pt-2">
                                    <Button variant="outline" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
                                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4"/>}
                                        Exportar PDF
                                    </Button>
                                 </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>Preencha os dados corretamente para ver o resultado.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {result && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5"/> Rateio de Custos por Item</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow><TableHead>Item</TableHead><TableHead className="text-right">Custo Unit. Final</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {result.itens.map(item => (
                                        <TableRow key={item.descricao}>
                                            <TableCell className="text-sm">{item.descricao}</TableCell>
                                            <TableCell className="text-right font-mono font-semibold">BRL {item.custoUnitarioFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </form>
      </Form>
       <Dialog open={isSimulationsDialogOpen} onOpenChange={setIsSimulationsDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Carregar Simulação</DialogTitle>
                    <DialogDescription>Selecione uma simulação salva para carregar seus dados no formulário.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Cliente</TableHead><TableHead>Data</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {simulations.length > 0 ? simulations.map(sim => (
                                    <TableRow key={sim.id}>
                                        <TableCell>{sim.name}</TableCell>
                                        <TableCell>{sim.customer}</TableCell>
                                        <TableCell>{new Date(sim.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell><Button size="sm" onClick={() => handleLoadSimulation(sim)}>Carregar</Button></TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center h-24">Nenhuma simulação salva.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Fechar</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
