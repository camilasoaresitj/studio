
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Upload, FileUp, Calculator, Wand2, FileText, BarChart2, PieChart, FileDown, Search } from 'lucide-react';
import { runExtractInvoiceItems } from '@/app/actions';
import type { InvoiceItem } from '@/ai/flows/extract-invoice-items';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { runGetNcmRates } from '@/app/actions';
import type { GetNcmRatesOutput } from '@/ai/flows/get-ncm-rates';


const itemSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória.'),
  quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero.'),
  valorUnitarioUSD: z.coerce.number().min(0.01, 'Valor unitário deve ser maior que zero.'),
  ncm: z.string().min(8, 'NCM deve ter 8 dígitos.'),
  pesoKg: z.coerce.number().min(0.01, 'Peso deve ser maior que zero.'),
});

const simulationSchema = z.object({
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos um item.'),
  taxasCambio: z.object({
    di: z.coerce.number().min(0.01, 'Taxa de câmbio da DI é obrigatória.'),
    frete: z.coerce.number().min(0.01, 'Taxa de câmbio do frete é obrigatória.'),
  }),
  despesas: z.object({
    freteInternacionalUSD: z.coerce.number().min(0, 'Frete internacional é obrigatório.'),
    seguroUSD: z.coerce.number().min(0, 'Seguro é obrigatório.'),
    despesasLocaisBRL: z.coerce.number().min(0, 'Despesas locais são obrigatórias.'),
  }),
  aliquotas: z.object({
    ii: z.coerce.number().min(0, 'Alíquota de II é obrigatória.'),
    ipi: z.coerce.number().min(0, 'Alíquota de IPI é obrigatória.'),
    pis: z.coerce.number().min(0, 'Alíquota de PIS é obrigatória.'),
    cofins: z.coerce.number().min(0, 'Alíquota de COFINS é obrigatória.'),
    icms: z.coerce.number().min(0, 'Alíquota de ICMS é obrigatória.'),
  }),
});

type SimulationFormData = z.infer<typeof simulationSchema>;
type SimulationResult = {
  valorAduaneiro: number;
  ii: number;
  ipi: number;
  pis: number;
  cofins: number;
  icms: number;
  custoTotal: number;
  pesoTotal: number;
  quantidadeTotal: number;
  itens: (InvoiceItem & {
    valorAduaneiroRateado: number;
    impostosRateados: number;
    despesasLocaisRateadas: number;
    custoUnitarioFinal: number;
  })[];
};

const NcmRateFinder = ({ onRatesFound }: { onRatesFound: (rates: GetNcmRatesOutput) => void }) => {
    const [ncm, setNcm] = useState('');
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
            onRatesFound(response.data);
            toast({ title: 'Alíquotas encontradas!', description: `Alíquotas para o NCM ${ncm} foram carregadas.` });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar NCM', description: response.error });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center gap-2">
            <Input value={ncm} onChange={(e) => setNcm(e.target.value)} placeholder="Digite o NCM..."/>
            <Button type="button" onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
            </Button>
        </div>
    );
};

export default function SimuladorDIPage() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<SimulationFormData>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      itens: [{ descricao: '', quantidade: 1, valorUnitarioUSD: 0, ncm: '', pesoKg: 0 }],
      taxasCambio: { di: 5.67, frete: 5.87 },
      despesas: { freteInternacionalUSD: 1400, seguroUSD: 100, despesasLocaisBRL: 5000 },
      aliquotas: { ii: 0.14, ipi: 0.10, pis: 0.0186, cofins: 0.0854, icms: 0.17 },
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "itens",
  });
  
  const watchedForm = useWatch({ control: form.control });

  const calculateCosts = (data: SimulationFormData): SimulationResult => {
      const { itens, taxasCambio, despesas, aliquotas } = data;

      const valorFOBTotalUSD = itens.reduce((sum, item) => sum + item.valorUnitarioUSD * item.quantidade, 0);
      const pesoTotal = itens.reduce((sum, item) => sum + item.pesoKg * item.quantidade, 0);

      const valorAduaneiro = (valorFOBTotalUSD * taxasCambio.di) + (despesas.freteInternacionalUSD * taxasCambio.frete) + (despesas.seguroUSD * taxasCambio.frete);
      
      const ii = valorAduaneiro * aliquotas.ii;
      const ipi = (valorAduaneiro + ii) * aliquotas.ipi;
      const pis = valorAduaneiro * aliquotas.pis;
      const cofins = valorAduaneiro * aliquotas.cofins;

      // Correção na fórmula do ICMS por dentro (base de cálculo)
      const baseICMS = (valorAduaneiro + ii + ipi + pis + cofins) / (1 - aliquotas.icms);
      const icms = baseICMS * aliquotas.icms;

      const totalImpostos = ii + ipi + pis + cofins + icms;
      const custoTotal = valorAduaneiro + totalImpostos + despesas.despesasLocaisBRL;

      const itensResultado = itens.map(item => {
        const proporcaoPeso = (item.pesoKg * item.quantidade) / pesoTotal;
        const valorAduaneiroRateado = valorAduaneiro * proporcaoPeso;
        const impostosRateados = totalImpostos * proporcaoPeso;
        const despesasLocaisRateadas = despesas.despesasLocaisBRL * proporcaoPeso;
        const custoTotalItem = valorAduaneiroRateado + impostosRateados + despesasLocaisRateadas;
        const custoUnitarioFinal = custoTotalItem / item.quantidade;

        return {
          ...item,
          valorAduaneiroRateado,
          impostosRateados,
          despesasLocaisRateadas,
          custoUnitarioFinal
        };
      });

      return {
        valorAduaneiro,
        ii,
        ipi,
        pis,
        cofins,
        icms,
        custoTotal,
        pesoTotal,
        quantidadeTotal: itens.reduce((sum, i) => sum + i.quantidade, 0),
        itens: itensResultado
      };
  };

  useEffect(() => {
    const subscription = form.watch(() => {
        const data = form.getValues();
        if(form.formState.isValid) {
            setResult(calculateCosts(data));
        } else {
            setResult(null);
        }
    });
    // Trigger initial calculation
     if(form.formState.isValid) {
        setResult(calculateCosts(form.getValues()));
     }
    return () => subscription.unsubscribe();
  }, [form, form.formState.isValid]);

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
                replace(response.data);
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
  
  const handleRatesFound = (rates: GetNcmRatesOutput) => {
      form.setValue('aliquotas.ii', rates.ii / 100);
      form.setValue('aliquotas.ipi', rates.ipi / 100);
      form.setValue('aliquotas.pis', rates.pis / 100);
      form.setValue('aliquotas.cofins', rates.cofins / 100);
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
            {/* Coluna de Entradas */}
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5"/> Importar Dados da Fatura</CardTitle>
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
                            <CardDescription>Liste os produtos da sua importação.</CardDescription>
                        </div>
                        <Button type="button" size="sm" variant="outline" onClick={() => append({ descricao: '', quantidade: 1, valorUnitarioUSD: 0, ncm: '', pesoKg: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                        </Button>
                    </CardHeader>
                    <CardContent>
                         <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 p-2 border rounded-md relative">
                                    <div className="md:col-span-5"><FormField control={form.control} name={`itens.${index}.descricao`} render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                    <div className="md:col-span-2"><FormField control={form.control} name={`itens.${index}.quantidade`} render={({ field }) => (<FormItem><FormLabel>Qtde</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                    <div className="md:col-span-2"><FormField control={form.control} name={`itens.${index}.valorUnitarioUSD`} render={({ field }) => (<FormItem><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                    <div className="md:col-span-2"><FormField control={form.control} name={`itens.${index}.pesoKg`} render={({ field }) => (<FormItem><FormLabel>Peso (Kg)</FormLabel><FormControl><Input type="number" {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                    <div className="md:col-span-11"><FormField control={form.control} name={`itens.${index}.ncm`} render={({ field }) => (<FormItem><FormLabel>NCM</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/></div>
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive self-end" onClick={() => remove(index)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            ))}
                         </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle>Parâmetros e Despesas</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold">Taxas de Câmbio</h3>
                            <FormField control={form.control} name="taxasCambio.di" render={({ field }) => (<FormItem><FormLabel>Câmbio DI (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                            <FormField control={form.control} name="taxasCambio.frete" render={({ field }) => (<FormItem><FormLabel>Câmbio Frete (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold">Despesas</h3>
                            <FormField control={form.control} name="despesas.freteInternacionalUSD" render={({ field }) => (<FormItem><FormLabel>Frete Internacional (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                            <FormField control={form.control} name="despesas.seguroUSD" render={({ field }) => (<FormItem><FormLabel>Seguro (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                            <FormField control={form.control} name="despesas.despesasLocaisBRL" render={({ field }) => (<FormItem><FormLabel>Despesas Locais (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Alíquotas de Impostos</CardTitle>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="outline" size="sm">
                                        <Search className="mr-2 h-4 w-4"/>
                                        Buscar Alíquotas por NCM
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Buscar Alíquotas (Simulação)</DialogTitle>
                                        <DialogDescription>
                                            Informe o NCM para consultar as alíquotas de impostos federais (II, IPI, PIS, COFINS).
                                        </DialogDescription>
                                    </DialogHeader>
                                    <NcmRateFinder onRatesFound={handleRatesFound} />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                         <FormField control={form.control} name="aliquotas.ii" render={({ field }) => (<FormItem><FormLabel>II (%)</FormLabel><FormControl><Input type="number" placeholder="0.14" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                         <FormField control={form.control} name="aliquotas.ipi" render={({ field }) => (<FormItem><FormLabel>IPI (%)</FormLabel><FormControl><Input type="number" placeholder="0.10" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                         <FormField control={form.control} name="aliquotas.pis" render={({ field }) => (<FormItem><FormLabel>PIS (%)</FormLabel><FormControl><Input type="number" placeholder="0.0186" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                         <FormField control={form.control} name="aliquotas.cofins" render={({ field }) => (<FormItem><FormLabel>COFINS (%)</FormLabel><FormControl><Input type="number" placeholder="0.0854" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                         <FormField control={form.control} name="aliquotas.icms" render={({ field }) => (<FormItem><FormLabel>ICMS (%)</FormLabel><FormControl><Input type="number" placeholder="0.17" {...field} /></FormControl><FormMessage/></FormItem>)}/>
                    </CardContent>
                </Card>
            </div>

            {/* Coluna de Resultados */}
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
                                    <p className="text-3xl font-bold">BRL {result.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Valor Aduaneiro:</span><span className="font-mono">BRL {result.valorAduaneiro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- II:</span><span className="font-mono">BRL {result.ii.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- IPI:</span><span className="font-mono">BRL {result.ipi.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- PIS:</span><span className="font-mono">BRL {result.pis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- COFINS:</span><span className="font-mono">BRL {result.cofins.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-muted-foreground"><span>- ICMS:</span><span className="font-mono">BRL {result.icms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                </div>
                                 <div className="flex justify-end pt-2">
                                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/> Exportar PDF</Button>
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
                                            <TableCell className="text-right font-mono font-semibold">BRL {item.custoUnitarioFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
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
    </div>
  );
}
