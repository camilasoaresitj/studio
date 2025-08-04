
'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runExtractRatesFromText } from '@/app/actions';
import { ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';
import { Loader2, Wand2, AlertTriangle, TableIcon, Plane, Ship, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

const formSchema = z.object({
  textInput: z.string().optional(),
  fileDataUri: z.string().optional(),
  fileName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RateImporterProps {
  onRatesImported: (newRates: ExtractRatesFromTextOutput) => void;
}

export function RateImporter({ onRatesImported }: RateImporterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ExtractRatesFromTextOutput>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      textInput: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!values.textInput && !values.fileDataUri) {
        toast({ variant: 'destructive', title: 'Nenhum dado fornecido', description: 'Por favor, cole um texto ou importe um arquivo.' });
        return;
    }
    setIsLoading(true);
    setResults([]);
    setError(null);
    const response = await runExtractRatesFromText(values as any);
    if (response?.success && response.data && response.data.length > 0) {
      setResults(response.data);
      onRatesImported(response.data);
      toast({
        variant: 'default',
        className: 'bg-success text-success-foreground',
        title: 'Tarifas importadas!',
        description: `${response.data.length} novas tarifas foram adicionadas à sua tabela.`,
      });
    } else {
      setResults([]);
      const errorMessage = response?.error || 'A IA não conseguiu extrair nenhuma tarifa válida do texto. Tente ajustar o texto ou cole um trecho mais claro.';
      setError(errorMessage);
    }
    setIsLoading(false);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const result = e.target?.result;
        if (!result) {
            toast({ variant: 'destructive', title: 'Erro ao ler arquivo' });
            return;
        }

        form.setValue('textInput', '');
        form.setValue('fileDataUri', result as string);
        form.setValue('fileName', file.name);
        toast({ title: `Arquivo ${file.name} carregado!`, description: 'Clique em "Extrair" para analisar.' });
    };
    
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Importador de Tarifas com IA</CardTitle>
          <CardDescription>Cole o conteúdo de um e-mail, uma tabela ou importe um arquivo. A IA irá extrair e salvar os dados na sua tabela automaticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="textInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo da Tabela de Tarifas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="For big volume per lot, xxxMT per lot, G.M. with COSCO for USD6400/40'/42'HC case by case. Valid from July.06 to July.14. Always free time at destination. ..."
                        className="min-h-[250px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls, .csv, .pdf, .eml, .msg"
              />
              <div className="flex flex-col sm:flex-row-reverse gap-2">
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Extrair e Salvar Tarifas
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleImportClick} className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Importar de Arquivo
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {isLoading && 
        <div className="text-center p-8 text-muted-foreground animate-pulse">
            <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" />
            A IA está lendo e estruturando os dados...
        </div>
      }

      {!isLoading && results.length > 0 && (
          <Card className="animate-in fade-in-50 duration-500">
            <CardHeader>
                <CardTitle>Última Importação Realizada</CardTitle>
                <CardDescription>As {results.length} tarifas abaixo foram adicionadas com sucesso à sua Tabela de Tarifas.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Modal</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Transportadora</TableHead>
                            <TableHead>Tarifa</TableHead>
                            <TableHead>Contêiner</TableHead>
                            <TableHead>Transit Time</TableHead>
                            <TableHead>Validade</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {results.map((rate, index) => (
                            <TableRow key={index}>
                            <TableCell>
                                <Badge variant={rate.modal === 'Aéreo' ? 'secondary' : 'default'} className="flex items-center gap-2 w-fit">
                                {rate.modal === 'Aéreo' ? <Plane className="h-4 w-4" /> : <Ship className="h-4 w-4" />}
                                {rate.modal}
                                </Badge>
                            </TableCell>
                            <TableCell>{rate.origin}</TableCell>
                            <TableCell>{rate.destination}</TableCell>
                            <TableCell className="font-medium">{rate.carrier}</TableCell>
                            <TableCell className="font-semibold text-primary">{rate.rate}</TableCell>
                            <TableCell>{rate.container}</TableCell>
                            <TableCell>{rate.transitTime}</TableCell>
                            <TableCell>{rate.validity}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
          </Card>
      )}

      {!isLoading && error && (
         <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Ocorreu um erro na extração</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && results.length === 0 && form.formState.isSubmitted && (
         <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhuma tarifa encontrada</AlertTitle>
            <AlertDescription>
            A IA não conseguiu extrair nenhuma tarifa válida do texto fornecido.
            </AlertDescription>
        </Alert>
      )}

      {!isLoading && !form.formState.isSubmitted && !error && (
         <Alert>
            <TableIcon className="h-4 w-4" />
            <AlertTitle>Aguardando dados</AlertTitle>
            <AlertDescription>
            Cole sua tabela de tarifas na área de texto acima para começar a extração.
            </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

    