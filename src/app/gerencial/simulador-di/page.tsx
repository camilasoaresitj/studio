
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Loader2, Calculator, FileUp, Share2, FileDown, Eye, Save } from 'lucide-react';
import { runExtractInvoiceItems, runGetNcmRates, runShareSimulation, runGenerateSimulationPdfHtml } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceItem } from '@/lib/schemas/invoice';
import { getSimulations, saveSimulations, Simulation } from '@/lib/simulations-data';
import { getPartners, Partner } from '@/lib/partners-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ShareSimulationDialog } from '@/components/share-simulation-dialog';


const ncmRateSchema = z.object({
  ncm: z.string(),
  ii: z.number(),
  ipi: z.number(),
  pis: z.number(),
  cofins: z.number(),
  description: z.string(),
});
type NcmRateData = z.infer<typeof ncmRateSchema>;

const simulationItemSchema = z.object({
  descricao: z.string().min(1, 'Obrigatório'),
  quantidade: z.coerce.number().min(0.01, 'Obrigatório'),
  valorUnitarioUSD: z.coerce.number().min(0.01, 'Obrigatório'),
  ncm: z.string().length(8, 'NCM deve ter 8 dígitos'),
  pesoKg: z.coerce.number().min(0.01, 'Obrigatório'),
  taxRates: ncmRateSchema.optional(),
});

const simulationFormSchema = z.object({
  simulationName: z.string().min(3, 'Nome é obrigatório'),
  customerName: z.string().min(1, 'Selecione um cliente'),
  freightCostUSD: z.coerce.number().min(0, 'Obrigatório'),
  insuranceCostUSD: z.coerce.number().min(0, 'Obrigatório'),
  exchangeRate: z.coerce.number().min(0.01, 'Obrigatório'),
  thcValueBRL: z.coerce.number().min(0, 'Obrigatório'),
  icmsRate: z.coerce.number().min(0, 'Obrigatório').max(100, 'Máximo 100%'),
  otherExpensesBRL: z.coerce.number().min(0, 'Obrigatório'),
  itens: z.array(simulationItemSchema).min(1, 'Adicione pelo menos um item.'),
});

export type SimulationFormData = z.infer<typeof simulationFormSchema>;

export type SimulationResultItem = InvoiceItem & {
    valorAduaneiroRateado: number;
    impostosRateados: number;
    despesasLocaisRateadas: number;
    custoUnitarioFinal: number;
};
export interface SimulationResult {
    valorAduaneiro: number;
    totalII: number;
    totalIPI: number;
    totalPIS: number;
    totalCOFINS: number;
    totalICMS: number;
    custoTotal: number;
    itens: SimulationResultItem[];
}

export default function SimuladorDIPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [simulations, setSimulations] = useState<Simulation[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [currentSimulationData, setCurrentSimulationData] = useState<{name: string, customer: string, total: number} | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setSimulations(getSimulations());
        setPartners(getPartners().filter(p => p.roles.cliente));
    }, []);

    const form = useForm<SimulationFormData>({
        resolver: zodResolver(simulationFormSchema),
        defaultValues: {
            itens: [{ descricao: '', ncm: '', quantidade: 1, valorUnitarioUSD: 0, pesoKg: 0 }],
            exchangeRate: 5.45,
            icmsRate: 17,
        }
    });

    const { fields, append, remove, update } = useFieldArray({ control: form.control, name: "itens" });
    const watchedItens = useWatch({ control: form.control, name: 'itens' });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileDataUri = e.target?.result as string;
                const response = await runExtractInvoiceItems({ fileName: file.name, fileDataUri });
                if (response.success) {
                    form.setValue('itens', response.data);
                    toast({ title: 'Itens importados com sucesso!', description: `${response.data.length} itens foram adicionados à simulação.` });
                } else {
                    throw new Error(response.error);
                }
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Erro ao importar', description: error.message });
            }
        };
        reader.readAsDataURL(file);
        setIsLoading(false);
    };

    const handleFetchNcmRates = async (index: number) => {
        const ncm = form.getValues(`itens.${index}.ncm`);
        if (ncm.length !== 8) {
            toast({ variant: 'destructive', title: 'NCM Inválido', description: 'O NCM deve ter 8 dígitos.' });
            return;
        }
        setIsLoading(true);
        const response = await runGetNcmRates(ncm);
        if (response.success && response.data) {
            update(index, { ...watchedItens[index], taxRates: response.data });
            toast({ title: `Taxas para NCM ${ncm} carregadas!`, description: response.data.description });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao buscar NCM', description: response.error });
        }
        setIsLoading(false);
    };

    const onSubmit = (data: SimulationFormData) => {
        if (data.itens.some(item => !item.taxRates)) {
            toast({ variant: 'destructive', title: 'Taxas Faltando', description: 'Por favor, carregue as taxas para todos os NCMs antes de calcular.' });
            return;
        }

        const totalFOB = data.itens.reduce((sum, item) => sum + (item.quantidade * item.valorUnitarioUSD), 0);
        const valorAduaneiro = (totalFOB + data.freightCostUSD + data.insuranceCostUSD) * data.exchangeRate;

        const itensComCustos: SimulationResultItem[] = data.itens.map(item => {
            const fobItem = item.quantidade * item.valorUnitarioUSD;
            const rateio = fobItem / totalFOB;
            const valorAduaneiroRateado = valorAduaneiro * rateio;
            
            const II = valorAduaneiroRateado * (item.taxRates!.ii / 100);
            const IPI = (valorAduaneiroRateado + II) * (item.taxRates!.ipi / 100);
            const PIS = (valorAduaneiroRateado + II) * (item.taxRates!.pis / 100);
            const COFINS = (valorAduaneiroRateado + II) * (item.taxRates!.cofins / 100);
            const baseICMS = (valorAduaneiroRateado + II + IPI + PIS + COFINS) / (1 - (data.icmsRate / 100));
            const ICMS = baseICMS * (data.icmsRate / 100);
            
            const impostosRateados = II + IPI + PIS + COFINS + ICMS;
            const despesasLocaisRateadas = (data.thcValueBRL + data.otherExpensesBRL) * rateio;
            const custoTotalItem = valorAduaneiroRateado + impostosRateados + despesasLocaisRateadas;

            return {
                ...item,
                valorAduaneiroRateado,
                impostosRateados,
                despesasLocaisRateadas,
                custoUnitarioFinal: custoTotalItem / item.quantidade,
            };
        });

        const totalII = itensComCustos.reduce((sum, i) => sum + (i.valorAduaneiroRateado * (i.taxRates!.ii / 100)), 0);
        const totalIPI = itensComCustos.reduce((sum, i) => sum + ((i.valorAduaneiroRateado + (i.valorAduaneiroRateado * (i.taxRates!.ii/100))) * (i.taxRates!.ipi / 100)), 0);
        const totalPIS = itensComCustos.reduce((sum, i) => sum + ((i.valorAduaneiroRateado + (i.valorAduaneiroRateado * (i.taxRates!.ii/100))) * (i.taxRates!.pis / 100)), 0);
        const totalCOFINS = itensComCustos.reduce((sum, i) => sum + ((i.valorAduaneiroRateado + (i.valorAduaneiroRateado * (i.taxRates!.ii/100))) * (i.taxRates!.cofins / 100)), 0);
        const baseTotalICMS = (valorAduaneiro + totalII + totalIPI + totalPIS + totalCOFINS) / (1 - (data.icmsRate / 100));
        const totalICMS = baseTotalICMS * (data.icmsRate / 100);
        
        const custoTotal = valorAduaneiro + totalII + totalIPI + totalPIS + totalCOFINS + totalICMS + data.thcValueBRL + data.otherExpensesBRL;

        setResult({ valorAduaneiro, totalII, totalIPI, totalPIS, totalCOFINS, totalICMS, custoTotal, itens: itensComCustos });
    };

    const handleSaveSimulation = () => {
        const data = form.getValues();
        const newSimulation: Simulation = {
            id: `sim-${Date.now()}`,
            name: data.simulationName,
            customer: data.customerName,
            createdAt: new Date(),
            data: data
        };
        const updatedSimulations = [...simulations, newSimulation];
        setSimulations(updatedSimulations);
        saveSimulations(updatedSimulations);
        toast({ title: "Simulação Salva!", description: "A simulação foi salva no seu histórico." });
    };
    
    const handleLoadSimulation = (sim: Simulation) => {
        form.reset(sim.data);
        setResult(null);
        toast({ title: `Simulação "${sim.name}" Carregada!` });
    };

    const handleShare = async () => {
        if (!result) return;
        const simData = form.getValues();
        setCurrentSimulationData({ name: simData.simulationName, customer: simData.customerName, total: result.custoTotal });
        setIsShareOpen(true);
    };
    
    const handleGeneratePdf = async () => {
        if (!result) return;
        setIsLoading(true);
        const simData = form.getValues();
        const response = await runGenerateSimulationPdfHtml({
            simulationName: simData.simulationName,
            customerName: simData.customerName,
            createdAt: new Date().toLocaleDateString('pt-BR'),
            formData: simData,
            resultData: result,
        });

        if (response.success && response.data?.html) {
             const newWindow = window.open();
             if (newWindow) {
                newWindow.document.write(response.data.html);
                newWindow.document.close();
             }
        } else {
            toast({ variant: 'destructive', title: 'Erro ao gerar PDF' });
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Simulador de Custos de Importação (DI)</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Calcule os custos estimados de uma DI, incluindo impostos e despesas.
                </p>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Informações Gerais</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <FormField control={form.control} name="simulationName" render={({ field }) => (<FormItem><FormLabel>Nome da Simulação</FormLabel><FormControl><Input placeholder="Simulação Eletrônicos" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                     <FormField control={form.control} name="customerName" render={({ field }) => (<FormItem><FormLabel>Cliente</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent>{partners.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}/>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row justify-between items-center">
                                    <div>
                                        <CardTitle>Itens da Fatura</CardTitle>
                                        <CardDescription>Adicione os itens da sua fatura comercial.</CardDescription>
                                    </div>
                                    <Button type="button" variant="outline" onClick={() => (document.querySelector('#invoice-upload') as HTMLInputElement).click()}><FileUp className="mr-2 h-4 w-4" /> Importar de Fatura</Button>
                                    <input type="file" id="invoice-upload" className="hidden" accept=".xlsx, .xls, .csv, .xml, .pdf, .jpg, .png" onChange={handleFileUpload} />
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-2 border rounded-md">
                                            <FormField control={form.control} name={`itens.${index}.descricao`} render={({ field }) => (<FormItem className="col-span-12 md:col-span-3"><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`itens.${index}.ncm`} render={({ field }) => (<FormItem className="col-span-6 md:col-span-2"><FormLabel>NCM</FormLabel><div className="flex gap-1"><FormControl><Input maxLength={8} {...field} /></FormControl><Button type="button" size="icon" className="h-10 w-10" onClick={() => handleFetchNcmRates(index)} disabled={isLoading}><Calculator className="h-4 w-4"/></Button></div><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`itens.${index}.quantidade`} render={({ field }) => (<FormItem className="col-span-6 md:col-span-1"><FormLabel>Qtde</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`itens.${index}.valorUnitarioUSD`} render={({ field }) => (<FormItem className="col-span-6 md:col-span-2"><FormLabel>Valor Unit. (USD)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <FormField control={form.control} name={`itens.${index}.pesoKg`} render={({ field }) => (<FormItem className="col-span-6 md:col-span-2"><FormLabel>Peso Unit. (Kg)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                            <div className="col-span-12 md:col-span-1 flex items-end h-full">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                            {watchedItens[index]?.taxRates && (
                                                <div className="col-span-12 mt-2 p-2 bg-secondary rounded-md text-xs space-x-4">
                                                    <span><strong>II:</strong> {watchedItens[index].taxRates?.ii}%</span>
                                                    <span><strong>IPI:</strong> {watchedItens[index].taxRates?.ipi}%</span>
                                                    <span><strong>PIS:</strong> {watchedItens[index].taxRates?.pis}%</span>
                                                    <span><strong>COFINS:</strong> {watchedItens[index].taxRates?.cofins}%</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ descricao: '', ncm: '', quantidade: 1, valorUnitarioUSD: 0, pesoKg: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item</Button>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Custos e Despesas</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     <FormField control={form.control} name="freightCostUSD" render={({ field }) => (<FormItem><FormLabel>Frete Internacional (USD)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                     <FormField control={form.control} name="insuranceCostUSD" render={({ field }) => (<FormItem><FormLabel>Seguro Internacional (USD)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                     <FormField control={form.control} name="exchangeRate" render={({ field }) => (<FormItem><FormLabel>Taxa de Câmbio (BRL)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                     <FormField control={form.control} name="thcValueBRL" render={({ field }) => (<FormItem><FormLabel>THC (BRL)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                     <FormField control={form.control} name="icmsRate" render={({ field }) => (<FormItem><FormLabel>Alíquota de ICMS (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                     <FormField control={form.control} name="otherExpensesBRL" render={({ field }) => (<FormItem><FormLabel>Outras Despesas (BRL)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                </CardContent>
                            </Card>
                            <Button type="submit" className="w-full text-lg py-6">{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Calculator className="mr-2 h-4 w-4"/>} Calcular Custos</Button>
                        </form>
                    </Form>
                </div>
                
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Histórico de Simulações</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => { setSimulations([]); saveSimulations([]); }}>Limpar Histórico</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {simulations.map(sim => (
                                    <div key={sim.id} className="flex items-center justify-between p-2 border rounded-md">
                                        <div>
                                            <p className="font-semibold">{sim.name}</p>
                                            <p className="text-xs text-muted-foreground">{sim.customer} - {sim.createdAt.toLocaleDateString()}</p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleLoadSimulation(sim)}><Eye className="mr-2 h-4 w-4"/> Carregar</Button>
                                    </div>
                                ))}
                                {simulations.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Nenhuma simulação salva.</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {result && (
                        <Card className="animate-in fade-in-50 duration-500">
                             <CardHeader className="flex flex-row justify-between items-center">
                                <div>
                                    <CardTitle>Resultado da Simulação</CardTitle>
                                    <CardDescription>Custo total: <span className="font-bold text-primary">BRL {result.custoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={handleSaveSimulation}><Save className="mr-2 h-4 w-4"/> Salvar</Button>
                                    <Button variant="secondary" size="sm" onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/> Compartilhar</Button>
                                    <Button variant="outline" size="sm" onClick={handleGeneratePdf} disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>} PDF</Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Custo Unit. Final</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.itens.map(item => (
                                            <TableRow key={item.ncm}>
                                                <TableCell>{item.descricao}</TableCell>
                                                <TableCell className="text-right font-semibold">BRL {item.custoUnitarioFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            
             <ShareSimulationDialog
                open={isShareOpen}
                onOpenChange={setIsShareOpen}
                simulationData={currentSimulationData}
                onShare={runShareSimulation}
            />
        </div>
    );
}
