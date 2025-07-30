
'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Gavel } from 'lucide-react';
import type { FinancialEntry } from '@/lib/financials-data';

interface FinancialEntryImporterProps {
  onEntriesImported: (entries: Omit<FinancialEntry, 'id'>[]) => void;
  importType?: 'financial' | 'legal';
}

export function FinancialEntryImporter({ onEntriesImported, importType = 'financial' }: FinancialEntryImporterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (importType === 'legal') {
            const jsonData = XLSX.utils.sheet_to_json<{ invoiceId: string }>(worksheet);
            if(jsonData.length > 0) {
                onEntriesImported(jsonData as any);
                toast({
                    title: 'Arquivo Processado!',
                    description: `${jsonData.length} processos encontrados para mover para o jurídico.`,
                    className: 'bg-success text-success-foreground'
                });
            }
            return;
        }

        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });
        
        if (jsonData.length < 2) {
          throw new Error('A planilha deve conter um cabeçalho e pelo menos uma linha de dados.');
        }

        const headers = jsonData[0].map(h => String(h || '').trim().toLowerCase());
        const dataRows = jsonData.slice(1);

        const requiredHeaders = ['tipo', 'parceiro', 'fatura', 'vencimento', 'valor', 'moeda', 'processo'];
        for (const rh of requiredHeaders) {
            if (!headers.includes(rh)) {
                throw new Error(`Coluna obrigatória não encontrada no arquivo: '${rh}'.`);
            }
        }
        
        const importedEntries = dataRows.map((row: any[], rowIndex) => {
            const entry: any = {};
            headers.forEach((header, index) => {
                entry[header] = row[index];
            });

            if (!entry.tipo || !entry.fatura) return null; // Skip empty rows

            const dueDate = new Date(entry.vencimento);
            if (isNaN(dueDate.getTime())) {
                throw new Error(`Data de vencimento inválida na linha ${rowIndex + 2}: ${entry.vencimento}`);
            }

            return {
                type: String(entry.tipo).toLowerCase() as 'credit' | 'debit',
                partner: String(entry.parceiro),
                invoiceId: String(entry.fatura),
                status: 'Aberto' as const,
                dueDate: dueDate.toISOString(),
                amount: parseFloat(entry.valor),
                currency: String(entry.moeda).toUpperCase() as FinancialEntry['currency'],
                processId: String(entry.processo),
                accountId: parseInt(entry.conta_id || '1', 10),
            };
        }).filter((entry): entry is Omit<FinancialEntry, 'id'> => entry !== null);
        
        if (importedEntries.length > 0) {
            onEntriesImported(importedEntries);
            toast({
                title: 'Importação Concluída!',
                description: `${importedEntries.length} lançamentos financeiros foram importados com sucesso.`,
                className: 'bg-success text-success-foreground'
            });
        } else {
             toast({
                variant: 'destructive',
                title: 'Nenhum dado importado',
                description: 'Não foram encontrados dados válidos para importar no arquivo.',
             });
        }
      } catch (err: any) {
        console.error("Error reading file:", err);
        toast({
          variant: 'destructive',
          title: 'Erro ao processar arquivo',
          description: err.message || 'Verifique se o formato do arquivo e os cabeçalhos estão corretos.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
        setIsLoading(false);
        toast({
            variant: 'destructive',
            title: 'Erro de leitura',
            description: 'Não foi possível ler o arquivo selecionado.',
        });
    }

    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="mb-4">
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className="hidden"
            accept=".xlsx, .xls, .csv"
        />
        <Button variant="outline" onClick={handleImportClick} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (importType === 'legal' ? <Gavel className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />)}
            {importType === 'legal' ? 'Importar para Jurídico' : 'Importar Lançamentos'}
        </Button>
    </div>
  );
}
