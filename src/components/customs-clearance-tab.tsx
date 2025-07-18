
'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from './ui/button';
import { Form } from './ui/form';
import { useToast } from '@/hooks/use-toast';
import { runRegisterDue, runGenerateDiXmlFromSpreadsheet } from '@/app/actions';
import { RegisterDueInputSchema } from '@/ai/flows/register-due';
import { Loader2, FileCode, Upload } from 'lucide-react';
import type { Shipment } from '@/lib/shipment';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type DueFormData = z.infer<typeof RegisterDueInputSchema>;

interface CustomsClearanceTabProps {
  shipment: Shipment;
}

export function CustomsClearanceTab({ shipment }: CustomsClearanceTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const dueForm = useForm<DueFormData>({
    resolver: zodResolver(RegisterDueInputSchema),
    defaultValues: {
      exporterCnpj: shipment.shipper?.cnpj?.replace(/\D/g, '') || '',
      invoiceNumber: shipment.invoiceNumber || '',
      hblNumber: shipment.houseBillNumber || '',
      totalValueUSD: shipment.charges.reduce((acc, c) => acc + (c.saleCurrency === 'USD' ? c.sale : 0), 0),
      items: shipment.ncms?.map(ncm => ({ ncm, description: shipment.commodityDescription || '', quantity: 1, unit: 'KG', valueUSD: 0 })) || [{ ncm: '', description: '', quantity: 1, unit: 'KG', valueUSD: 0 }],
    },
  });

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
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setGeneratedXml(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          throw new Error('A planilha está vazia ou em um formato inválido.');
        }

        const response = await runGenerateDiXmlFromSpreadsheet({
            spreadsheetData: jsonData,
            shipmentData: shipment,
        });

        if (response.success && response.data?.xml) {
            setGeneratedXml(response.data.xml);
            toast({
                title: 'XML da DI Gerado!',
                description: 'O XML foi gerado com sucesso a partir da planilha.',
                className: 'bg-success text-success-foreground',
            });
        } else {
            throw new Error(response.error || 'A IA não conseguiu gerar o XML. Verifique o formato da planilha.');
        }

      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao Processar Planilha',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
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
          
          <TabsContent value="importacao" className="mt-4 space-y-4">
             <Alert>
                <FileCode className="h-4 w-4" />
                <AlertTitle>Geração de XML da DI</AlertTitle>
                <AlertDescription>
                    Importe a planilha do CargoWise para que a IA gere automaticamente o XML da Declaração de Importação.
                </AlertDescription>
            </Alert>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls, .csv"
            />

            <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Importar Planilha e Gerar XML
            </Button>
            
            {generatedXml && (
                <div className="mt-4 space-y-2 animate-in fade-in-50 duration-500">
                    <h3 className="font-semibold">XML Gerado:</h3>
                    <Textarea value={generatedXml} readOnly className="min-h-[300px] font-mono text-xs"/>
                </div>
            )}
          </TabsContent>

          <TabsContent value="exportacao" className="mt-4">
            <Form {...dueForm}>
              <form onSubmit={dueForm.handleSubmit(onDueSubmit)} className="space-y-4">
                {/* Due form fields can be added here if needed, for now we use data from shipment */}
                <Alert>
                  <FileCode className="h-4 w-4" />
                  <AlertTitle>Registro da DUE</AlertTitle>
                  <AlertDescription>
                      Os dados abaixo foram preenchidos a partir do processo. Clique para registrar a DUE no Portal Único (Simulação).
                  </AlertDescription>
                </Alert>
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
