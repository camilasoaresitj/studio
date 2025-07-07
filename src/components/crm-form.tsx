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
import { runCreateCrmEntry } from '@/app/actions';
import { CreateCrmEntryFromEmailOutput } from '@/ai/flows/create-crm-entry-from-email';
import { Loader2, User, Building, Mail, ChevronsRight, FileText, AlertTriangle } from 'lucide-react';
import { Badge } from './ui/badge';

const formSchema = z.object({
  emailContent: z.string().min(20, {
    message: 'O conteúdo do e-mail deve ter pelo menos 20 caracteres.',
  }),
});

export function CrmForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreateCrmEntryFromEmailOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailContent: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    const response = await runCreateCrmEntry(values.emailContent);
    if (response.success) {
      setResult(response.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar e-mail',
        description: response.error,
      });
    }
    setIsLoading(false);
  }

  const priorityMap: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary'
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Analisador de E-mail para CRM</CardTitle>
          <CardDescription>Cole o e-mail abaixo e clique em analisar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="emailContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conteúdo do E-mail</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Prezado(a), Gostaria de cotar um frete... "
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <ChevronsRight className="mr-2 h-4 w-4" />
                    Analisar e Criar Entrada no CRM
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Resultado da Análise</CardTitle>
          <CardDescription>As informações extraídas do e-mail aparecerão aqui.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          {result ? (
            <div className="w-full space-y-4 animate-in fade-in-50 duration-500">
              <div className="flex items-center gap-3 p-3 rounded-md border bg-card">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Nome:</span>
                <span className="text-foreground">{result.contactName}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border bg-card">
                <Building className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Empresa:</span>
                <span className="text-foreground">{result.companyName}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border bg-card">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">E-mail:</span>
                <span className="text-foreground">{result.emailAddress}</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md border bg-card">
                <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <span className="font-medium">Resumo:</span>
                  <p className="text-foreground text-sm mt-1">{result.summary}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-md border bg-card">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Prioridade:</span>
                <Badge variant={priorityMap[result.priority] || 'default'} className="capitalize">{result.priority}</Badge>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              Aguardando análise...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
