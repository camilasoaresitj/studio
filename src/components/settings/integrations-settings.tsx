

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Mail, Server, KeyRound, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

const integrationsSchema = z.object({
  maerskApiKey: z.string().optional(),
  cargoAiApiKey: z.string().optional(),
  shipEngineApiKey: z.string().optional(),
});

type IntegrationsFormData = z.infer<typeof integrationsSchema>;

export function IntegrationsSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<IntegrationsFormData>({
    resolver: zodResolver(integrationsSchema),
    // TODO: Fetch these values from a secure backend/service
    defaultValues: {
      maerskApiKey: '',
      cargoAiApiKey: '',
      shipEngineApiKey: '',
    },
  });

  const onSubmit = async (data: IntegrationsFormData) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // In a real app, you would send this to your backend to be stored securely
    console.log('Saving integration credentials:', {
        maersk: data.maerskApiKey ? '***' : '',
        cargoAi: data.cargoAiApiKey ? '***' : '',
        shipEngine: data.shipEngineApiKey ? '***' : ''
    });
    toast({
      title: 'Credenciais Salvas!',
      description: 'As chaves de API foram atualizadas com sucesso.',
      className: 'bg-success text-success-foreground'
    });
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
        <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5"/>
                Gerenciamento de Chaves de API
            </CardTitle>
            <CardDescription>
                Configure as credenciais para se conectar aos serviços de parceiros.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField control={form.control} name="maerskApiKey" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Building className="h-4 w-4 text-blue-500" /> Maersk API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="Chave de API da Maersk" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="cargoAiApiKey" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Mail className="h-4 w-4 text-green-500" /> Cargo.ai API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="Chave de API da Cargo.ai" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="shipEngineApiKey" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Server className="h-4 w-4 text-purple-500" /> ShipEngine API Key</FormLabel>
                            <FormControl><Input type="password" placeholder="Chave de API da ShipEngine" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                            Salvar Todas as Chaves
                        </Button>
                    </div>
                </form>
            </Form>
        </CardContent>
        </Card>
    </div>
  );
}
