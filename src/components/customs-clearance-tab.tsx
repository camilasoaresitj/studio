
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { runGenerateDiXml, runRegisterDue } from '@/app/actions';
import { GenerateDiXmlInputSchema } from '@/ai/flows/generate-di-xml';
import { RegisterDueInputSchema } from '@/ai/flows/register-due';
import { PlusCircle, Trash2, Loader2, FileCode } from 'lucide-react';
import type { Shipment } from '@/lib/shipment';
import { Separator } from './ui/separator';

type DiFormData = z.infer<typeof GenerateDiXmlInputSchema>;
type DueFormData = z.infer<typeof RegisterDueInputSchema>;

interface CustomsClearanceTabProps {
  shipments: Shipment[];
}

export function CustomsClearanceTab({ shipments }: CustomsClearanceTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const { toast } = useToast();

  const importShipments = shipments.filter(s => s.destination.toUpperCase().includes('BR'));
  const exportShipments = shipments.filter(s => s.origin.toUpperCase().includes('BR'));

  const diForm = useForm<DiFormData>({
    resolver: zodResolver(GenerateDiXmlInputSchema),
    defaultValues: {
      additions: [{ ncm: '', description: '', quantity: 1, unit: 'UN', value: 0 }],
    },
  });

  const dueForm = useForm<DueFormData>({
    resolver: zodResolver(RegisterDueInputSchema),
    defaultValues: {
      items: [{ ncm: '', description: '', quantity: 1, unit: 'UN', valueUSD: 0 }],
    },
  });

  const { fields: diFields, append: appendDi, remove: removeDi } = useFieldArray({
    control: diForm.control, name: "additions"
  });
  const { fields: dueFields, append: appendDue, remove: removeDue } = useFieldArray({
    control: dueForm.control, name: "items"
  });

  const handleDiShipmentSelect = (shipmentId: string) => {
    const shipment = importShipments.find(s => s.id === shipmentId);
    if (!shipment) return;
    diForm.reset({
      ...diForm.getValues(),
      importerCnpj: shipment.consignee?.cnpj?.replace(/\D/g, '') || '',
      hblNumber: shipment.houseBillNumber || '',
      mblNumber: shipment.masterBillNumber || '',
      totalFreightUSD: shipment.charges.find(c => c.name.toLowerCase().includes('frete'))?.cost || 0,
      additions: shipment.ncms?.map(ncm => ({ ncm, description: shipment.commodityDescription || '', quantity: 1, unit: 'UN', value: 0 })) || [{ ncm: '', description: '', quantity: 1, unit: 'UN', value: 0 }],
    });
  };

  const handleDueShipmentSelect = (shipmentId: string) => {
    const shipment = exportShipments.find(s => s.id === shipmentId);
    if (!shipment) return;
    dueForm.reset({
      ...dueForm.getValues(),
      exporterCnpj: shipment.shipper?.cnpj?.replace(/\D/g, '') || '',
      invoiceNumber: shipment.invoiceNumber || '',
      hblNumber: shipment.houseBillNumber || '',
      totalValueUSD: shipment.charges.reduce((acc, c) => acc + c.sale, 0),
      items: shipment.ncms?.map(ncm => ({ ncm, description: shipment.commodityDescription || '', quantity: 1, unit: 'KG', valueUSD: 0 })) || [{ ncm: '', description: '', quantity: 1, unit: 'KG', valueUSD: 0 }],
    });
  };

  const onDiSubmit = async (data: DiFormData) => {
    setIsLoading(true);
    setGeneratedXml(null);
    const response = await runGenerateDiXml(data);
    if (response.success) {
      setGeneratedXml(response.data.xml);
      toast({ title: 'XML da DI gerado com sucesso!', description: 'Copie o conteúdo abaixo.' });
    } else {
      toast({ variant: 'destructive', title: 'Erro ao gerar XML', description: response.error });
    }
    setIsLoading(false);
  };

  const onDueSubmit = async (data: DueFormData) => {
    setIsLoading(true);
    const response = await runRegisterDue(data);
    if (response.success) {
      toast({ title: 'DUE Registrada com Sucesso!', description: `Número da DUE: ${response.data.dueNumber}`, className: 'bg-success text-success-foreground' });
    } else {
      toast({ variant: 'destructive', title: 'Erro ao registrar DUE', description: response.error });
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desembaraço Aduaneiro</CardTitle>
        <CardDescription>Gere a DI para processos de importação ou registre a DUE para exportação.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="importacao">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="importacao">Importação (DI)</TabsTrigger>
            <TabsTrigger value="exportacao">Exportação (DUE)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="importacao" className="mt-4">
            <Form {...diForm}>
              <form onSubmit={diForm.handleSubmit(onDiSubmit)} className="space-y-4">
                <Select onValueChange={handleDiShipmentSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione um processo de importação para preencher os dados..." /></SelectTrigger>
                  <SelectContent>
                    {importShipments.map(s => <SelectItem key={s.id} value={s.id}>{s.id} - {s.customer}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Separator />
                {diFields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2 p-2 border rounded">
                    <FormField control={diForm.control} name={`additions.${index}.ncm`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>NCM</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                    <FormField control={diForm.control} name={`additions.${index}.value`} render={({ field }) => (<FormItem className="w-32"><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeDi(index)} disabled={diFields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendDi({ ncm: '', description: '', quantity: 1, unit: 'UN', value: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Item</Button>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />} Gerar XML da DI
                </Button>
              </form>
            </Form>
            {generatedXml && (
                <div className="mt-4 space-y-2">
                    <h3 className="font-semibold">XML Gerado:</h3>
                    <Textarea value={generatedXml} readOnly className="min-h-[200px] font-mono text-xs"/>
                </div>
            )}
          </TabsContent>

          <TabsContent value="exportacao" className="mt-4">
            <Form {...dueForm}>
              <form onSubmit={dueForm.handleSubmit(onDueSubmit)} className="space-y-4">
                 <Select onValueChange={handleDueShipmentSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione um processo de exportação para preencher os dados..." /></SelectTrigger>
                  <SelectContent>
                    {exportShipments.map(s => <SelectItem key={s.id} value={s.id}>{s.id} - {s.customer}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Separator />
                <FormField control={dueForm.control} name="invoiceNumber" render={({ field }) => (<FormItem><FormLabel>Nº da Fatura Comercial</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode className="mr-2 h-4 w-4" />} Registrar DUE (Simulação)
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
