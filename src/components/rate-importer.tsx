'use client';

import { useState } from 'react';
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
import { Loader2, Wand2, AlertTriangle, TableIcon, Plane, Ship, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

const formSchema = z.object({
  textInput: z.string().min(20, {
    message: 'O texto deve ter pelo menos 20 caracteres.',
  }),
});

interface RateImporterProps {
  onRatesImported: (newRates: ExtractRatesFromTextOutput) => void;
}

export function RateImporter({ onRatesImported }: RateImporterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ExtractRatesFromTextOutput>([]);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      textInput: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResults([]);
    const response = await runExtractRatesFromText(values.textInput);
    if (response.success && response.data.length > 0) {
      setResults(response.data);
      toast({
        title: 'Extração concluída!',
        description: `A IA encontrou ${response.data.length} tarifas no texto fornecido.`,
      });
    } else {
      setResults([]);
      toast({
        variant: 'destructive',
        title: 'Nenhuma tarifa encontrada',
        description: response.error || 'A IA não conseguiu extrair nenhuma tarifa válida do texto.',
      });
    }
    setIsLoading(false);
  }

  const handleConfirmImport = () => {
    onRatesImported(results);
    toast({
      variant: 'default',
      className: 'bg-success text-success-foreground',
      title: 'Tarifas importadas!',
      description: `${results.length} novas tarifas foram adicionadas à sua tabela.`,
    })
    setResults([]);
    form.reset();
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Importador de Tarifas com IA</CardTitle>
          <CardDescription>Cole o conteúdo de um e-mail ou uma tabela de tarifas abaixo. A IA irá extrair e organizar os dados para você.</CardDescription>
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
                        placeholder="Ex: Carrier: Maersk | Origin: Santos | Destination: Rotterdam | 20'GP: $2500 | Validity: 31/12/2024"
                        className="min-h-[250px] font-mono text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Extrair Tarifas do Texto
                  </>
                )}
              </Button>
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
                <CardTitle>Tarifas Extraídas para Confirmação</CardTitle>
                <CardDescription>Confira as tarifas que a IA extraiu. Clique em "Confirmar e Adicionar" para salvá-las na sua Tabela de Tarifas.</CardDescription>
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
                            <TableCell>{rate.validity}</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                 <div className="flex justify-end mt-4">
                    <Button onClick={handleConfirmImport}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirmar e Adicionar à Tabela
                    </Button>
                </div>
            </CardContent>
          </Card>
      )}

      {!isLoading && results.length === 0 && form.formState.isSubmitted && (
         <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nenhuma tarifa encontrada</AlertTitle>
            <AlertDescription>
            A IA não conseguiu extrair nenhuma tarifa do texto fornecido. Tente ajustar o texto ou cole um trecho mais claro.
            </AlertDescription>
        </Alert>
      )}

      {!isLoading && !form.formState.isSubmitted && (
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
