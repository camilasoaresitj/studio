
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Mail, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Separator } from '../ui/separator';

const integrationsSchema = z.object({
  gmailEmail: z.string().email('Por favor, insira um endereço de e-mail válido.').optional().or(z.literal('')),
  gmailAppPassword: z.string().optional(),
});

const smtpSchema = z.object({
    smtpServer: z.string().optional(),
    smtpPort: z.coerce.number().optional(),
    imapServer: z.string().optional(),
    imapPort: z.coerce.number().optional(),
    encryption: z.enum(['none', 'ssl', 'tls']).optional(),
});

type IntegrationsFormData = z.infer<typeof integrationsSchema>;
type SmtpFormData = z.infer<typeof smtpSchema>;

export function IntegrationsSettings() {
  const [isGmailSaving, setIsGmailSaving] = useState(false);
  const [isSmtpSaving, setIsSmtpSaving] = useState(false);
  const { toast } = useToast();

  const gmailForm = useForm<IntegrationsFormData>({
    resolver: zodResolver(integrationsSchema),
    defaultValues: {
      gmailEmail: '',
      gmailAppPassword: '',
    },
  });
  
  const smtpForm = useForm<SmtpFormData>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      encryption: 'ssl',
    },
  });

  const onGmailSubmit = async (data: IntegrationsFormData) => {
    setIsGmailSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Saving integration credentials:', { email: data.gmailEmail, password: '***' });
    toast({
      title: 'Credenciais Salvas!',
      description: 'A integração com o Gmail foi configurada com sucesso.',
      className: 'bg-success text-success-foreground'
    });
    setIsGmailSaving(false);
  };
  
  const onSmtpSubmit = async (data: SmtpFormData) => {
    setIsSmtpSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Saving SMTP/IMAP credentials:', data);
    toast({
      title: 'Credenciais Salvas!',
      description: 'A integração com seu servidor de e-mail foi configurada com sucesso.',
      className: 'bg-success text-success-foreground'
    });
    setIsSmtpSaving(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
        <Card>
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
            <Form {...gmailForm}>
            <form onSubmit={gmailForm.handleSubmit(onGmailSubmit)} className="space-y-6">
                <FormField control={gmailForm.control} name="gmailEmail" render={({ field }) => (
                <FormItem>
                    <FormLabel>E-mail do Gmail</FormLabel>
                    <FormControl><Input placeholder="seu-email@gmail.com" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}/>
                <FormField control={gmailForm.control} name="gmailAppPassword" render={({ field }) => (
                <FormItem>
                    <FormLabel>Senha de Aplicativo do Gmail</FormLabel>
                    <FormControl><Input type="password" placeholder="•••• •••• •••• ••••" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}/>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isGmailSaving}>
                        {isGmailSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Salvar Configuração do Gmail
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Separator />

        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5"/>
                Configuração Avançada de E-mail (SMTP/IMAP)
            </CardTitle>
            <CardDescription>
                Configure seu próprio servidor de e-mail para envio e leitura.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...smtpForm}>
                <form onSubmit={smtpForm.handleSubmit(onSmtpSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={smtpForm.control} name="smtpServer" render={({ field }) => (
                            <FormItem><FormLabel>Servidor de Saída (SMTP)</FormLabel><FormControl><Input placeholder="smtp.seudominio.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={smtpForm.control} name="smtpPort" render={({ field }) => (
                            <FormItem><FormLabel>Porta SMTP</FormLabel><FormControl><Input type="number" placeholder="465" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={smtpForm.control} name="imapServer" render={({ field }) => (
                            <FormItem><FormLabel>Servidor de Entrada (IMAP)</FormLabel><FormControl><Input placeholder="imap.seudominio.com" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={smtpForm.control} name="imapPort" render={({ field }) => (
                            <FormItem><FormLabel>Porta IMAP</FormLabel><FormControl><Input type="number" placeholder="993" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={smtpForm.control} name="encryption" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Criptografia</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="ssl">SSL/TLS</SelectItem>
                                    <SelectItem value="tls">STARTTLS</SelectItem>
                                    <SelectItem value="none">Nenhuma</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSmtpSaving}>
                            {isSmtpSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Salvar Configuração SMTP
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
        </Card>
    </div>
  );
}
