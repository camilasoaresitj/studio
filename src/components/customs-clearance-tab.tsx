
'use client';

import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { runGenerateDiXml, runRegisterDue, runGenerateDiXmlFromSpreadsheet, runExtractInvoiceItems, runGetNcmRates } from '@/app/actions';
import { Loader2, FileCode, Upload, Send, Wand2, Trash2, PlusCircle, Edit } from 'lucide-react';
import type { Shipment } from '@/lib/shipment';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvoiceItem, ExtractInvoiceItemsOutput } from '@/lib/schemas/invoice';

const diAdditionItemSchema = z.object({
  ncm: z.string().length(8, 'NCM deve ter 8 dígitos'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.coerce.number().min(0.01, 'Qtde > 0'),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  value: z.coerce.number().min(0.01, 'Valor > 0'),
});

const customsClearanceFormSchema = z.object({
  invoiceItems: z.array(z.object({
    descricao: z.string().min(1, 'Obrigatório'),
    quantidade: z.coerce.number().min(0.01, 'Obrigatório'),
    valorUnitarioUSD: z.coerce.number().min(0.01, 'Obrigatório'),
    ncm: z.string().length(8, 'NCM deve ter 8 dígitos'),
    pesoKg: z.coerce.number().min(0.01, 'Obrigatório'),
  })),
  massNcm: z.string().optional(),
});

type CustomsClearanceFormData = z.infer<typeof customsClearanceFormSchema>;

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
        const totalValueUSD = shipment.charges.reduce((acc, c) => {
            if (c.saleCurrency === 'USD') {
                return acc + c.sale;
            }
            // Simple conversion for non-USD, a real app would use daily rates
            if (c.saleCurrency === 'BRL') {
                return acc + (c.sale / 5.0); 
            }
            return acc;
        }, 0);

        const response = await runRegisterDue({
            exporterCnpj: shipment.shipper.cnpj?.replace(/\D/g, '') || '',
            declarantCnpj: '10298168000189', // Assuming self
            invoiceNumber: data.invoiceNumber || '',
            hblNumber: shipment.houseBillNumber || '',
            totalValueUSD: totalValueUSD,
            items: shipment.invoiceItems?.map(item => ({
                ncm: item.ncm,
                description: item.descricao,
                quantity: item.quantidade,
                unit: 'UN', // Assuming unit, should be in invoice data
                valueUSD: item.valorUnitarioUSD * item.quantidade,
            })) || [],
        });

        if (response.success) {
            onDueRegistered(response);
            toast({ title: 'DUE Registrada!', description: `Número da DUE: ${response.dueNumber}`, className: 'bg-success text-success-foreground' });
        } else {
            toast({ variant: 'destructive', title: 'Erro ao Registrar DUE', description: response.message });
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
  onUpdate: (shipment: Shipment) => void;
}

export function CustomsClearanceTab({ shipment, onUpdate }: CustomsClearanceTabProps) {
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [dueResult, setDueResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const isImport = shipment?.destination.toUpperCase().includes('BR');

  const form = useForm<CustomsClearanceFormData>({
    resolver: zodResolver(customsClearanceFormSchema),
    defaultValues: {
      invoiceItems: [],
      massNcm: '',
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'invoiceItems'
  });

  useEffect(() => {
    if (shipment?.invoiceItems) {
      form.setValue('invoiceItems', shipment.invoiceItems);
    } else {
      form.setValue('invoiceItems', []);
    }
    setGeneratedXml(null);
  }, [shipment, form]);

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
                form.setValue('invoiceItems', response.data);
                toast({ title: 'Itens importados com sucesso!', description: `${response.data.length} itens foram adicionados.` });
            } else {
                throw new Error(response.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erro ao importar', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyMassNcm = () => {
    const massNcm = form.getValues('massNcm');
    if (massNcm && massNcm.length === 8) {
        const currentItems = form.getValues('invoiceItems');
        const updatedItems = currentItems.map(item => ({ ...item, ncm: massNcm }));
        form.setValue('invoiceItems', updatedItems);
        toast({ title: 'NCM aplicado a todos os itens!' });
    } else {
        toast({ variant: 'destructive', title: 'NCM Inválido', description: 'O NCM deve ter 8 dígitos.' });
    }
  };
  
  const handleGenerateDiXml = async () => {
      if (!shipment) return;
      const formData = form.getValues();
      if (formData.invoiceItems.length === 0) {
          toast({ variant: 'destructive', title: 'Sem Itens', description: 'Importe ou adicione itens da fatura primeiro.' });
          return;
      }
      setIsLoading(true);
      
      const response = await runGenerateDiXmlFromSpreadsheet({
          spreadsheetData: formData.invoiceItems.map(item => ({
            'descrição': item.descricao,
            'quantidade': item.quantidade,
            'valor_unitario_usd': item.valorUnitarioUSD,
            'ncm': item.ncm,
            'peso_kg': item.pesoKg
          })),
          shipmentData: shipment,
      });

      if (response.success && response.data?.xml) {
          setGeneratedXml(response.data.xml);
          onUpdate({ ...shipment, invoiceItems: formData.invoiceItems });
          toast({ title: 'XML da DI Gerado com Sucesso!', className: 'bg-success text-success-foreground' });
      } else {
          toast({ variant: 'destructive', title: 'Erro ao Gerar XML', description: response.error || "A IA não conseguiu processar os dados." });
      }
      setIsLoading(false);
  };

  if (!shipment) {
      return (
        <Card><CardHeader><CardTitle>Desembaraço Aduaneiro</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Selecione um processo para ver as opções de desembaraço.</p></CardContent>
        </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desembaraço Aduaneiro</CardTitle>
        <CardDescription>{isImport ? 'Gere a DI para processos de importação.' : 'Registre a DUE para exportação.'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isImport ? (
            <div className="space-y-4">
                <Alert><FileCode className="h-4 w-4" /><AlertTitle>Importação (DUIMP)</AlertTitle>
                <AlertDescription>Importe a fatura comercial, edite os itens e gere o XML da Declaração de Importação.</AlertDescription></Alert>
                
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv, .xml, .pdf, .jpg, .png" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Importar Fatura Comercial
                </Button>
                
                <Form {...form}>
                <form className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Itens da Fatura</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 mb-4">
                               <FormField control={form.control} name="massNcm" render={({ field }) => (<FormItem><FormLabel>Aplicar NCM em Massa</FormLabel><FormControl><Input placeholder="8 dígitos" {...field} /></FormControl></FormItem>)} />
                               <Button type="button" onClick={handleApplyMassNcm}>Aplicar</Button>
                            </div>
                            <div className="border rounded-lg max-h-96 overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-secondary"><TableRow>
                                        <TableHead className="w-2/5">Descrição</TableHead>
                                        <TableHead>NCM</TableHead>
                                        <TableHead>Qtde</TableHead>
                                        <TableHead>Vlr. Unit. USD</TableHead>
                                        <TableHead>Peso Kg</TableHead>
                                        <TableHead>Ação</TableHead>
                                    </TableRow></TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell><FormField control={form.control} name={`invoiceItems.${index}.descricao`} render={({ field }) => <Input {...field} className="h-8"/>} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`invoiceItems.${index}.ncm`} render={({ field }) => <Input {...field} className="h-8"/>} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`invoiceItems.${index}.quantidade`} render={({ field }) => <Input type="number" {...field} className="h-8"/>} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`invoiceItems.${index}.valorUnitarioUSD`} render={({ field }) => <Input type="number" {...field} className="h-8"/>} /></TableCell>
                                                <TableCell><FormField control={form.control} name={`invoiceItems.${index}.pesoKg`} render={({ field }) => <Input type="number" {...field} className="h-8"/>} /></TableCell>
                                                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </form>
                </Form>
                 <Button onClick={handleGenerateDiXml} disabled={isLoading || fields.length === 0} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Gerar XML da DI com IA
                </Button>

                {generatedXml && (
                    <div className="mt-4 space-y-2 animate-in fade-in-50 duration-500">
                        <h3 className="font-semibold">XML Gerado:</h3>
                        <Textarea value={generatedXml} readOnly className="min-h-[300px] font-mono text-xs"/>
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-4">
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
