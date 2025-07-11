
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { runGenerateNfseXml } from '@/app/actions';
import { Loader2, Clipboard, FileText } from 'lucide-react';

const nfseSchema = z.object({
  prestador: z.object({
    cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos').default('10298168000189'),
    inscricaoMunicipal: z.string().min(1, 'Obrigatório').default('348'),
  }),
  rps: z.object({
    numero: z.coerce.number().int().positive('Número do RPS deve ser positivo').default(1001),
    loteId: z.coerce.number().int().positive('ID do Lote deve ser positivo').default(1),
  }),
  tomador: z.object({
    cpfCnpj: z.string().min(11, 'CPF/CNPJ inválido').max(14, 'CPF/CNPJ inválido'),
    razaoSocial: z.string().min(1, 'Obrigatório'),
    endereco: z.string().min(1, 'Obrigatório'),
    numero: z.string().min(1, 'Obrigatório'),
    bairro: z.string().min(1, 'Obrigatório'),
    codigoMunicipio: z.string().length(7, 'Código IBGE deve ter 7 dígitos'),
    uf: z.string().length(2, 'UF deve ter 2 letras'),
    cep: z.string().length(8, 'CEP deve ter 8 dígitos'),
  }),
  servico: z.object({
    valorServicos: z.coerce.number().positive('Valor deve ser positivo'),
    aliquota: z.coerce.number().min(0, 'Alíquota não pode ser negativa'),
    issRetido: z.enum(['1', '2']),
    itemListaServico: z.string().min(1, 'Obrigatório').default('04.02'),
    discriminacao: z.string().min(10, 'Descrição deve ter no mínimo 10 caracteres'),
    codigoMunicipioPrestacao: z.string().length(7, 'Código IBGE deve ter 7 dígitos').default('4208203'),
  }),
});

type NfseFormData = z.infer<typeof nfseSchema>;

export default function NfsePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedXml, setGeneratedXml] = useState('');
  const { toast } = useToast();

  const form = useForm<NfseFormData>({
    resolver: zodResolver(nfseSchema),
    defaultValues: {
      prestador: { cnpj: '10298168000189', inscricaoMunicipal: '348' },
      rps: { numero: 1001, loteId: 1 },
      servico: { issRetido: '2', itemListaServico: '04.02', codigoMunicipioPrestacao: '4208203' }
    },
  });

  const watchedAliquota = form.watch('servico.aliquota');
  const watchedValorServicos = form.watch('servico.valorServicos');

  // Calculate ISS value automatically
  React.useEffect(() => {
    const valorIss = (watchedValorServicos || 0) * (watchedAliquota || 0);
    form.setValue('servico.valorIss', valorIss);
  }, [watchedAliquota, watchedValorServicos, form]);

  async function onSubmit(values: NfseFormData) {
    setIsLoading(true);
    setGeneratedXml('');
    
    const inputForFlow = {
        ...values,
        servico: {
            ...values.servico,
            valorIss: (values.servico.valorServicos || 0) * (values.servico.aliquota || 0),
        }
    }

    const response = await runGenerateNfseXml(inputForFlow);

    if (response.success) {
      setGeneratedXml(response.data.xml);
      toast({ title: 'XML gerado com sucesso!', description: 'Copie o XML abaixo para assinar e transmitir.' });
    } else {
      toast({ variant: 'destructive', title: 'Erro ao gerar XML', description: response.error });
    }
    setIsLoading(false);
  }
  
  const handleCopyXml = () => {
    navigator.clipboard.writeText(generatedXml);
    toast({ title: 'XML Copiado!', description: 'O XML foi copiado para a área de transferência.', className: 'bg-success text-success-foreground' });
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
       <header className="mb-0">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Emissão de NFS-e (Itajaí/SC)</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gere o XML para emissão de Nota Fiscal de Serviço eletrônica.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Nota Fiscal</CardTitle>
            <CardDescription>Preencha os campos abaixo para gerar o XML do RPS.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <Separator />
                <h3 className="text-lg font-semibold">Tomador do Serviço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="tomador.cpfCnpj" render={({ field }) => (<FormItem><FormLabel>CPF/CNPJ</FormLabel><FormControl><Input placeholder="00000000000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="tomador.razaoSocial" render={({ field }) => (<FormItem><FormLabel>Nome/Razão Social</FormLabel><FormControl><Input placeholder="Empresa Tomadora LTDA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <FormField control={form.control} name="tomador.endereco" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input placeholder="Rua das Flores" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="tomador.numero" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tomador.bairro" render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Centro" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tomador.cep" render={({ field }) => (<FormItem><FormLabel>CEP (s/ traço)</FormLabel><FormControl><Input placeholder="88301000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="tomador.codigoMunicipio" render={({ field }) => (<FormItem><FormLabel>Cód. Município</FormLabel><FormControl><Input placeholder="4208203" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="tomador.uf" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input placeholder="SC" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <Separator />
                <h3 className="text-lg font-semibold">Detalhes do Serviço</h3>
                <FormField control={form.control} name="servico.discriminacao" render={({ field }) => (<FormItem><FormLabel>Discriminação do Serviço</FormLabel><FormControl><Textarea placeholder="Descreva o serviço prestado..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="servico.valorServicos" render={({ field }) => (<FormItem><FormLabel>Valor do Serviço (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="servico.aliquota" render={({ field }) => (<FormItem><FormLabel>Alíquota ISS (ex: 0.05)</FormLabel><FormControl><Input type="number" step="0.0001" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="servico.itemListaServico" render={({ field }) => (<FormItem><FormLabel>Item da Lista (LC 116)</FormLabel><FormControl><Input placeholder="04.02" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="servico.issRetido" render={({ field }) => (
                        <FormItem><FormLabel>ISS Retido?</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="1">Sim</SelectItem><SelectItem value="2">Não</SelectItem></SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Gerar XML
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>XML Gerado</CardTitle>
            <CardDescription>Copie o conteúdo abaixo, assine com seu certificado A1 e transmita para a API da prefeitura.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Textarea
                readOnly
                value={generatedXml || 'Aguardando geração do XML...'}
                className="min-h-[500px] font-mono text-xs bg-muted/50"
              />
              {generatedXml && (
                <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={handleCopyXml}>
                  <Clipboard className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
