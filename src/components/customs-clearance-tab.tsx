
'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { runGenerateDiXmlFromSpreadsheet } from '@/app/actions';
import { Loader2, FileCode, Upload } from 'lucide-react';
import type { Shipment } from '@/lib/shipment';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface CustomsClearanceTabProps {
  shipments: Shipment[];
}

export function CustomsClearanceTab({ shipments }: CustomsClearanceTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // For now, we assume the first active shipment is the context.
    // This should be improved to pass a specific shipment context.
    const shipmentContext = shipments.find(s => s.status !== 'Finalizado');
    if (!shipmentContext) {
        toast({
            variant: 'destructive',
            title: 'Nenhum Processo Ativo',
            description: 'Não foi possível encontrar um processo ativo para associar a esta DI.',
        });
        return;
    }

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
            shipmentData: shipmentContext,
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
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 border rounded-lg">
            <Alert>
                <FileCode className="h-4 w-4" />
                <AlertTitle>Importação (DI)</AlertTitle>
                <AlertDescription>
                    Importe a planilha do CargoWise para que a IA gere automaticamente o XML da Declaração de Importação para o processo ativo.
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
                Importar Planilha e Gerar XML de DI
            </Button>
            {generatedXml && (
                <div className="mt-4 space-y-2 animate-in fade-in-50 duration-500">
                    <h3 className="font-semibold">XML Gerado:</h3>
                    <Textarea value={generatedXml} readOnly className="min-h-[300px] font-mono text-xs"/>
                </div>
            )}
        </div>
        <div className="space-y-4 p-4 border rounded-lg">
            <Alert>
                <FileCode className="h-4 w-4" />
                <AlertTitle>Exportação (DUE)</AlertTitle>
                <AlertDescription>
                    Esta funcionalidade está em desenvolvimento e permitirá o registro direto no Portal Único.
                </AlertDescription>
            </Alert>
            <Button disabled>
                Registrar DUE (Em breve)
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
