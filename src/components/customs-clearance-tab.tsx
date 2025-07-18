
'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { runGenerateDiXml, runRegisterDue, runGenerateDiXmlFromSpreadsheet } from '@/app/actions';
import { Loader2, FileCode, Upload, Send } from 'lucide-react';
import type { Shipment } from '@/lib/shipment';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Trash2, PlusCircle } from 'lucide-react';

// --- DI Schemas & Form ---
const diAdditionItemSchema = z.object({
  ncm: z.string().length(8, 'NCM deve ter 8 dígitos'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.coerce.number().min(0.01, 'Qtde > 0'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  value: z.coerce.number().min(0.01, 'Valor > 0'),
});

const diFormSchema = z.object({
  diNumber: z.string().min(1, 'Número da DI é obrigatório'),
  importerCnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos'),
  representativeCnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos'),
  hblNumber: z.string().min(1, 'HBL é obrigatório'),
  mblNumber: z.string().min(1, 'MBL é obrigatório'),
  totalValueBRL: z.coerce.number().min(0.01, 'Valor total é obrigatório'),
  totalFreightUSD: z.coerce.number().min(0, 'Frete é obrigatório'),
  totalInsuranceUSD: z.coerce.number().min(0, 'Seguro é obrigatório'),
  additions: z.array(diAdditionItemSchema).min(1, 'Adicione pelo menos um item.'),
});
type DiFormData = z.infer<typeof diFormSchema>;

const DiForm = ({ shipment, onXmlGenerated }: { shipment: Shipment, onXmlGenerated: (xml: string) => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<DiFormData>({
        resolver: zodResolver(diFormSchema),
        defaultValues: {
            diNumber: `24/${shipment.id.slice(-7)}`,
            importerCnpj: shipment.consignee.cnpj?.replace(/\D/g, ''),
            representativeCnpj: '10298168000189', // Assuming self
            hblNumber: shipment.houseBillNumber,
            mblNumber: shipment.masterBillNumber,
            totalValueBRL: 0,
            totalFreightUSD: 0,
            totalInsuranceUSD: 0,
            additions: [],
        }
    });
    
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'additions'
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

                const response = await runGenerateDiXmlFromSpreadsheet({
                    spreadsheetData: jsonData,
                    shipmentData: shipment,
                });

                if (response.success && response.data?.xml) {
                    onXmlGenerated(response.data.xml);
                    toast({ title: 'XML da DI Gerado a partir da Planilha!', className: 'bg-success text-success-foreground' });
                } else {
                    throw new Error(response.error || "A IA não conseguiu processar a planilha.");
                }

            } catch (error: any) {
                toast({ variant: 'destructive', title: 'Erro ao Processar Planilha', description: error.message });
            } finally {
                setIsLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };


    const onSubmit = async (data: DiFormData) => {
        setIsLoading(true);
        const response = await runGenerateDiXml(data);
        if(response.success && response.data?.xml) {
            onXmlGenerated(response.data.xml);
            toast({ title: 'XML da DI Gerado!', description: 'O XML foi gerado com sucesso.', className: 'bg-success text-success-foreground' });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao Gerar XML', description: response.error });
        }
        setIsLoading(false);
    };

    return (
        <>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="mb-4">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importar Itens de Planilha (CargoWise)
        </Button>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <FormField control={form.control} name="diNumber" render={({ field }) => (<FormItem><FormLabel>Nº DI</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                     <FormField control={form.control} name="importerCnpj" render={({ field }) => (<FormItem><FormLabel>CNPJ Importador</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                     <FormField control={form.control} name="hblNumber" render={({ field }) => (<FormItem><FormLabel>Nº HBL</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                     <FormField control={form.control} name="mblNumber" render={({ field }) => (<FormItem><FormLabel>Nº MBL</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                </div>
                <div>
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">Adições (Itens)</h4>
                        <Button type="button" size="sm" variant="outline" onClick={() => append({ ncm: '', description: '', quantity: 1, unit: 'UN', value: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar</Button>
                    </div>
                     {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-10 gap-2 p-2 border rounded-md mb-2">
                            <FormField control={form.control} name={`additions.${index}.ncm`} render={({ field }) => (<FormItem className="col-span-2"><FormLabel>NCM</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name={`additions.${index}.description`} render={({ field }) => (<FormItem className="col-span-3"><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name={`additions.${index}.quantity`} render={({ field }) => (<FormItem className="col-span-1"><FormLabel>Qtde</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name={`additions.${index}.unit`} render={({ field }) => (<FormItem className="col-span-1"><FormLabel>Unid.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                            <FormField control={form.control} name={`additions.${index}.value`} render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)}/>
                            <Button type="button" variant="ghost" size="icon" className="self-end text-destructive" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                     ))}
                </div>
                 <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />}
                    Gerar XML de DI
                </Button>
            </form>
        </Form>
        </>
    );
};

// --- DUE Schemas & Form ---
const dueFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Nº da Fatura é obrigatório'),
});
type DueFormData = z.infer<typeof dueFormSchema>;


const DueForm = ({ shipment, onDueRegistered }: { shipment: Shipment, onDueRegistered: (result: any) => void }) => {
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const form = useForm<DueFormData>({
        resolver: zodResolver(dueFormSchema),
        defaultValues: { invoiceNumber: shipment.invoiceNumber }
    });
    
    const onSubmit = async (data: DueFormData) => {
        setIsLoading(true);
        const response = await runRegisterDue({
            exporterCnpj: shipment.shipper.cnpj?.replace(/\D/g, ''),
            declarantCnpj: '10298168000189', // Assuming self
            invoiceNumber: data.invoiceNumber,
            hblNumber: shipment.houseBillNumber,
            totalValueUSD: shipment.charges.reduce((acc, c) => acc + (c.saleCurrency === 'USD' ? c.sale : 0), 0),
            items: shipment.charges.map(c => ({
                ncm: shipment.ncms?.[0] || '00000000',
                description: c.name,
                quantity: 1,
                unit: 'UN',
                valueUSD: c.sale,
            })),
        });

        if (response.success && response.data?.success) {
            onDueRegistered(response.data);
            toast({ title: 'DUE Registrada!', description: `Número da DUE: ${response.data.dueNumber}`, className: 'bg-success text-success-foreground' });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao Registrar DUE', description: response.error });
        }
        setIsLoading(false);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField control={form.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Nº Fatura Comercial</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)}/>
                 <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Registrar DUE
                </Button>
            </form>
        </Form>
    );
};


interface CustomsClearanceTabProps {
  shipment: Shipment | null;
}

export function CustomsClearanceTab({ shipment }: CustomsClearanceTabProps) {
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [dueResult, setDueResult] = useState<any | null>(null);
  const isImport = shipment?.destination.toUpperCase().includes('BR');
  
  if (!shipment) {
      return (
        <Card>
            <CardHeader><CardTitle>Desembaraço Aduaneiro</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Selecione um processo para ver as opções de desembaraço.</p></CardContent>
        </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desembaraço Aduaneiro</CardTitle>
        <CardDescription>Gere a DI para processos de importação ou registre a DUE para exportação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isImport ? (
            <div className="space-y-4 p-4 border rounded-lg">
                <Alert><FileCode className="h-4 w-4" /><AlertTitle>Importação (DUIMP)</AlertTitle>
                <AlertDescription>Preencha os dados abaixo ou importe de uma planilha para gerar o XML da Declaração de Importação.</AlertDescription></Alert>
                <DiForm shipment={shipment} onXmlGenerated={setGeneratedXml} />
                {generatedXml && (
                    <div className="mt-4 space-y-2 animate-in fade-in-50 duration-500">
                        <h3 className="font-semibold">XML Gerado:</h3>
                        <Textarea value={generatedXml} readOnly className="min-h-[300px] font-mono text-xs"/>
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-4 p-4 border rounded-lg">
                <Alert><FileCode className="h-4 w-4" /><AlertTitle>Exportação (DU-E)</AlertTitle>
                <AlertDescription>Clique abaixo para registrar a Declaração Única de Exportação no Portal Único.</AlertDescription></Alert>
                <DueForm shipment={shipment} onDueRegistered={setDueResult} />
                {dueResult && (
                     <div className="mt-4 space-y-2 animate-in fade-in-50 duration-500">
                        <h3 className="font-semibold">Resultado do Registro:</h3>
                        <pre className="p-4 bg-secondary rounded-md text-sm">{JSON.stringify(dueResult, null, 2)}</pre>
                    </div>
                )}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
