
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Loader2, Search, Calendar as CalendarIcon, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runConsultNfse } from '@/app/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const consultaSchema = z.object({
  startDate: z.date({ required_error: 'Data inicial é obrigatória.' }),
  endDate: z.date({ required_error: 'Data final é obrigatória.' }),
  cnpj: z.string().length(14, "O CNPJ deve ter 14 dígitos.").default('10298168000189'),
});

type ConsultaFormData = z.infer<typeof consultaSchema>;

export function NfseConsulta() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const form = useForm<ConsultaFormData>({
    resolver: zodResolver(consultaSchema),
    defaultValues: {
      startDate: subDays(new Date(), 30),
      endDate: new Date(),
      cnpj: '10298168000189',
    },
  });

  const onSubmit = async (data: ConsultaFormData) => {
    setIsLoading(true);
    setResults([]);
    
    const input = {
      ...data,
      startDate: format(data.startDate, 'yyyy-MM-dd'),
      endDate: format(data.endDate, 'yyyy-MM-dd'),
    };
    
    const response = await runConsultNfse(input);
    
    if (response.success && response.data?.ConsultaNfseRecebidaResposta?.ListaNfse?.CompNfse) {
        const nfseList = Array.isArray(response.data.ConsultaNfseRecebidaResposta.ListaNfse.CompNfse)
            ? response.data.ConsultaNfseRecebidaResposta.ListaNfse.CompNfse
            : [response.data.ConsultaNfseRecebidaResposta.ListaNfse.CompNfse];
        setResults(nfseList);
        toast({ title: `${nfseList.length} nota(s) fiscal(is) encontrada(s)!` });
    } else if (response.success && response.data?.ConsultaNfseRecebidaResposta?.ListaMensagemRetorno) {
        const message = response.data.ConsultaNfseRecebidaResposta.ListaMensagemRetorno.MensagemRetorno.Mensagem;
        toast({ variant: 'default', title: 'Informação', description: message });
        setResults([]);
    } else {
        toast({ variant: 'destructive', title: 'Erro na Consulta', description: response.error || 'Não foi possível obter os dados.' });
        setResults([]);
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consultar NFS-e Recebidas</CardTitle>
        <CardDescription>
          Busque por notas fiscais de serviço emitidas contra seu CNPJ em um determinado período.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Inicial</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Final</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecione a data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-2">
                <Button type="submit" disabled={isLoading} className="w-full mt-6">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Consultar Notas
                </Button>
              </div>
            </div>
          </form>
        </Form>
        
        {results.length > 0 && (
            <div className="mt-8 border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nº NFS-e</TableHead>
                            <TableHead>Prestador</TableHead>
                            <TableHead>CNPJ Prestador</TableHead>
                            <TableHead>Data Emissão</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {results.map((nfse, index) => {
                            const data = nfse.Nfse.InfNfse;
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{data.Numero}</TableCell>
                                    <TableCell>{data.PrestadorServico.RazaoSocial}</TableCell>
                                    <TableCell>{data.PrestadorServico.IdentificacaoPrestador.Cnpj}</TableCell>
                                    <TableCell>{format(new Date(data.DataEmissao), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell className="text-right font-mono">R$ {parseFloat(data.Servico.Valores.ValorServicos).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" title="Baixar XML">
                                            <FileDown className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
