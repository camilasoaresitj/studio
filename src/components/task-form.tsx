'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runMonitorTasks } from '@/app/actions';
import { MonitorEmailForTasksOutput } from '@/ai/flows/monitor-email-for-tasks';
import { Loader2, ChevronsRight, Search, Check, X, Bell, BellOff, Settings, DollarSign } from 'lucide-react';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  sender: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  emailSubject: z.string().min(5, { message: 'O assunto deve ter pelo menos 5 caracteres.' }),
  emailContent: z.string().min(20, { message: 'O conteúdo do e-mail deve ter pelo menos 20 caracteres.' }),
});

export function TaskForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MonitorEmailForTasksOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sender: '',
      emailSubject: '',
      emailContent: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    const response = await runMonitorTasks(values.emailSubject, values.emailContent, values.sender);
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

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Monitor de Tarefas por E-mail</CardTitle>
          <CardDescription>Preencha os dados do e-mail para identificar tarefas.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="sender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Remetente</FormLabel>
                  <FormControl><Input placeholder="cliente@empresa.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="emailSubject" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assunto do E-mail</FormLabel>
                  <FormControl><Input placeholder="Dúvida sobre fatura" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="emailContent" render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo do E-mail</FormLabel>
                  <FormControl><Textarea placeholder="Gostaria de saber mais sobre..." className="min-h-[150px]" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isLoading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</> : <><Search className="mr-2 h-4 w-4" />Identificar Tarefas</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Resultado da Análise</CardTitle>
          <CardDescription>As tarefas identificadas aparecerão aqui.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          {result ? (
            <div className="w-full space-y-4 animate-in fade-in-50 duration-500">
              {result.taskDetected ? (
                <>
                  <Alert variant="default" className="border-primary">
                    <Check className="h-4 w-4" />
                    <AlertTitle>Tarefa Detectada!</AlertTitle>
                    <AlertDescription>{result.taskDescription}</AlertDescription>
                  </Alert>
                  
                  <div className="flex flex-wrap gap-2">
                    {result.isOperational && <Badge><Settings className="mr-1 h-3 w-3" />Operacional</Badge>}
                    {result.isFinancial && <Badge><DollarSign className="mr-1 h-3 w-3" />Financeira</Badge>}
                  </div>

                  {result.reminderNeeded ? (
                     <Alert className="bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600">
                       <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                       <AlertTitle className="text-amber-800 dark:text-amber-200">Lembrete Sugerido</AlertTitle>
                       <AlertDescription className="text-amber-700 dark:text-amber-300">A IA sugere configurar um lembrete para esta tarefa.</AlertDescription>
                     </Alert>
                  ) : (
                     <Alert>
                       <BellOff className="h-4 w-4" />
                       <AlertTitle>Lembrete Não Necessário</AlertTitle>
                       <AlertDescription>Nenhuma ação de lembrete imediata é sugerida.</AlertDescription>
                     </Alert>
                  )}
                </>
              ) : (
                <Alert variant="destructive" className="bg-secondary">
                  <X className="h-4 w-4" />
                  <AlertTitle>Nenhuma Tarefa Detectada</AlertTitle>
                  <AlertDescription>A análise não identificou nenhuma tarefa acionável neste e-mail.</AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">Aguardando análise...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
