
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

const integrationsSchema = z.object({
  gmailEmail: z.string().email('Por favor, insira um endereço de e-mail válido.'),
  gmailAppPassword: z.string().min(1, 'A senha de aplicativo é obrigatória.'),
});

type IntegrationsFormData = z.infer<typeof integrationsSchema>;

export function IntegrationsSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<IntegrationsFormData>({
    resolver: zodResolver(integrationsSchema),
    // TODO: Fetch initial data from a secure service
    defaultValues: {
      gmailEmail: '',
      gmailAppPassword: '',
    },
  });

  const onSubmit = async (data: IntegrationsFormData) => {
    setIsSaving(true);
    // Simulate API call to save credentials securely
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Saving integration credentials:', { email: data.gmailEmail, password: '***' });
    toast({
      title: 'Credenciais Salvas!',
      description: 'A integração com o Gmail foi configurada com sucesso.',
      className: 'bg-success text-success-foreground'
    });
    setIsSaving(false);
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5"/>
            Configuração do Gmail
        </CardTitle>
        <CardDescription>
            Insira as credenciais para que o sistema possa enviar e-mails (cotações, faturas, etc.) em seu nome.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="mb-6">
            <AlertTitle>Importante: Use uma Senha de Aplicativo!</AlertTitle>
            <AlertDescription>
                Para sua segurança, não use a senha da sua conta do Google. Crie e use uma "Senha de Aplicativo". 
                <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline ml-1">
                    Saiba como aqui.
                </a>
            </AlertDescription>
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField control={form.control} name="gmailEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail do Gmail</FormLabel>
                <FormControl><Input placeholder="seu-email@gmail.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <FormField control={form.control} name="gmailAppPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Senha de Aplicativo do Gmail</FormLabel>
                <FormControl><Input type="password" placeholder="•••• •••• •••• ••••" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}/>
            <div className="flex justify-end">
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Salvar Configuração
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
