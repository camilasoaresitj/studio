

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Mail, Server, KeyRound, Building, Phone, Bot, Mailbox, Handshake, Briefcase, Plane } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Separator } from '../ui/separator';
import { saveApiKeysAction } from '@/app/actions';

const integrationsSchema = z.object({
  maerskApiKey: z.string().optional(),
  cargoAiApiKey: z.string().optional(),
  shipEngineApiKey: z.string().optional(),
  hapagApiKey: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  cmaApiKey: z.string().optional(),
  fedexApiKey: z.string().optional(),
  fedexSecretKey: z.string().optional(),
  upsClientId: z.string().optional(),
  upsClientSecret: z.string().optional(),
  mailerliteApiKey: z.string().optional(),
  snovioUserId: z.string().optional(),
  snovioApiSecret: z.string().optional(),
  cargoFiveApiKey: z.string().optional(),
  cargoFlowsApiKey: z.string().optional(),
  cargoFlowsOrgToken: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
});

type IntegrationsFormData = z.infer<typeof integrationsSchema>;

export function IntegrationsSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<IntegrationsFormData>({
    resolver: zodResolver(integrationsSchema),
    defaultValues: {
      maerskApiKey: '',
      cargoAiApiKey: '',
      shipEngineApiKey: '',
      hapagApiKey: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      cmaApiKey: '',
      fedexApiKey: '',
      fedexSecretKey: '',
      upsClientId: '',
      upsClientSecret: '',
      mailerliteApiKey: '',
      snovioUserId: '',
      snovioApiSecret: '',
      cargoFiveApiKey: '',
      cargoFlowsApiKey: process.env.NEXT_PUBLIC_CARGOFLOWS_API_KEY || '',
      cargoFlowsOrgToken: process.env.NEXT_PUBLIC_CARGOFLOWS_ORG_TOKEN || '',
      googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    },
  });

  useEffect(() => {
    // In a real app, these values would be fetched from a secure backend
    // For now, we simulate this by trying to read from process.env if available
    form.reset({
        cargoFlowsApiKey: 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs',
        cargoFlowsOrgToken: '9H31zRWYCGihV5U3th5JJXZI3h7LGen6',
        googleMapsApiKey: 'AIzaSyCEfBPLXPR2I95jCLhBXarhzoyHeAPjjGo'
    })
  }, [form]);

  const onSubmit = async (data: IntegrationsFormData) => {
    setIsSaving(true);
    const response = await saveApiKeysAction(data);
    
    if (response.success) {
        toast({
        title: 'Credenciais Salvas!',
        description: response.message || 'As chaves de API foram atualizadas com sucesso.',
        className: 'bg-success text-success-foreground'
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erro ao Salvar',
            description: "Não foi possível salvar as chaves de API."
        });
    }
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* Shipping Carriers */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium">Transportadoras e Couriers</h4>
                        <FormField control={form.control} name="maerskApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Building className="h-4 w-4 text-blue-500" /> Maersk API Key</FormLabel><FormControl><Input type="password" placeholder="Chave de API da Maersk" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="hapagApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Building className="h-4 w-4 text-orange-500" /> Hapag-Lloyd API Key</FormLabel><FormControl><Input type="password" placeholder="Chave de API da Hapag-Lloyd" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="cmaApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Building className="h-4 w-4 text-sky-600" /> CMA CGM API Key</FormLabel><FormControl><Input type="password" placeholder="Chave de API da CMA CGM" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="fedexApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-purple-600" /> FedEx API Key</FormLabel><FormControl><Input type="password" placeholder="API Key da FedEx" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="fedexSecretKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-purple-600" /> FedEx Secret Key</FormLabel><FormControl><Input type="password" placeholder="Secret Key da FedEx" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="upsClientId" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-yellow-600" /> UPS Client ID</FormLabel><FormControl><Input type="password" placeholder="Client ID da UPS" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="upsClientSecret" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-yellow-600" /> UPS Client Secret</FormLabel><FormControl><Input type="password" placeholder="Client Secret da UPS" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>

                    <Separator />
                    
                    {/* Platforms & Services */}
                    <div className="space-y-4">
                        <h4 className="text-lg font-medium">Plataformas de Cotação e Rastreamento</h4>
                         <FormField control={form.control} name="cargoAiApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Plane className="h-4 w-4 text-green-500" /> Cargo.ai API Key</FormLabel><FormControl><Input type="password" placeholder="Chave de API da Cargo.ai" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="shipEngineApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Server className="h-4 w-4 text-indigo-500" /> ShipEngine API Key</FormLabel><FormControl><Input type="password" placeholder="Chave de API da ShipEngine" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="cargoFiveApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Handshake className="h-4 w-4 text-red-500" /> CargoFive API Key</FormLabel><FormControl><Input type="password" placeholder="x-api-key da CargoFive" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="cargoFlowsApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Handshake className="h-4 w-4 text-cyan-500" /> Cargo-flows API Key</FormLabel><FormControl><Input type="text" placeholder="X-DPW-ApiKey da Cargo-flows" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="cargoFlowsOrgToken" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Handshake className="h-4 w-4 text-cyan-500" /> Cargo-flows Org Token</FormLabel><FormControl><Input type="text" placeholder="X-DPW-Org-Token da Cargo-flows" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="googleMapsApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Handshake className="h-4 w-4 text-green-600" /> Google Maps API Key</FormLabel><FormControl><Input type="text" placeholder="API Key do Google Maps" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>

                    <Separator />

                    {/* Marketing & Communication */}
                    <div className="space-y-4">
                         <h4 className="text-lg font-medium">Comunicação e Marketing</h4>
                        <FormField control={form.control} name="twilioAccountSid" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4 text-red-600" /> Twilio Account SID</FormLabel><FormControl><Input type="password" placeholder="SID da Conta Twilio" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="twilioAuthToken" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4 text-red-600" /> Twilio Auth Token</FormLabel><FormControl><Input type="password" placeholder="Token de Autenticação Twilio" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="mailerliteApiKey" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Mail className="h-4 w-4 text-teal-500" /> MailerLite API Key</FormLabel><FormControl><Input type="password" placeholder="Chave de API do MailerLite" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="snovioUserId" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Bot className="h-4 w-4 text-cyan-500" /> Snov.io API User ID</FormLabel><FormControl><Input type="password" placeholder="API User ID do Snov.io" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="snovioApiSecret" render={({ field }) => (
                            <FormItem><FormLabel className="flex items-center gap-2"><Bot className="h-4 w-4 text-cyan-500" /> Snov.io API Secret</FormLabel><FormControl><Input type="password" placeholder="API Secret do Snov.io" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>

                    <div className="flex justify-end pt-4">
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
