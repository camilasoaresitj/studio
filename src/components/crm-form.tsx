
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { runCreateCrmEntry, runCreateEmailCampaign } from '@/app/actions';
import { CreateCrmEntryFromEmailOutput } from '@/ai/flows/create-crm-entry-from-email';
import { CreateEmailCampaignOutput } from '@/ai/flows/create-email-campaign';
import { Loader2, User, Building, Mail, ChevronsRight, FileText, AlertTriangle, Wand2, Users, Send, CheckCircle, XCircle, UserPlus, UserCheck } from 'lucide-react';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { getPartners, Partner } from '@/lib/partners-data';
import { getInitialQuotes } from '@/lib/initial-data';
import type { Quote } from './customer-quotes-list';
import { ScrollArea } from './ui/scroll-area';
import { getShipments } from '@/lib/shipment';
import { subDays } from 'date-fns';

const crmFormSchema = z.object({
  emailContent: z.string().min(20, {
    message: 'O conteúdo do e-mail deve ter pelo menos 20 caracteres.',
  }),
});

const campaignFormSchema = z.object({
  instruction: z.string().min(20, {
    message: 'A instrução deve ter pelo menos 20 caracteres.',
  }),
});

export function CrmForm() {
  const [isCrmLoading, setIsCrmLoading] = useState(false);
  const [crmResult, setCrmResult] = useState<CreateCrmEntryFromEmailOutput | null>(null);
  const [isCampaignLoading, setIsCampaignLoading] = useState(false);
  const [campaignResult, setCampaignResult] = useState<CreateEmailCampaignOutput | null>(null);
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  useEffect(() => {
    // This runs only on the client, after hydration
    setQuotes(getInitialQuotes());
    setPartners(getPartners());
    setShipments(getShipments());
  }, []);

  const kpiData = useMemo(() => {
    const clientPartners = partners.filter(p => p.roles.cliente);
    const totalClients = clientPartners.length;
    const wonDeals = quotes.filter(q => q.status === 'Aprovada').length;
    const lostDeals = quotes.filter(q => q.status === 'Perdida').length;

    const thirtyDaysAgo = subDays(new Date(), 30);
    const newClients = clientPartners.filter(p => p.createdAt && new Date(p.createdAt) > thirtyDaysAgo).length;
    
    const ninetyDaysAgo = subDays(new Date(), 90);
    const activeClientNames = new Set(
        shipments
            .filter(s => s.etd && new Date(s.etd) > ninetyDaysAgo)
            .map(s => s.customer)
    );
    const activeClients = activeClientNames.size;

    return { totalClients, wonDeals, lostDeals, newClients, activeClients };
  }, [partners, quotes, shipments]);

  const crmForm = useForm<z.infer<typeof crmFormSchema>>({
    resolver: zodResolver(crmFormSchema),
    defaultValues: {
      emailContent: '',
    },
  });

  const campaignForm = useForm<z.infer<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      instruction: '',
    },
  });

  async function onCrmSubmit(values: z.infer<typeof crmFormSchema>) {
    setIsCrmLoading(true);
    setCrmResult(null);
    const response = await runCreateCrmEntry(values.emailContent);
    if (response.success) {
      setCrmResult(response.data || null);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar e-mail',
        description: response.error,
      });
    }
    setIsCrmLoading(false);
  }

  async function onCampaignSubmit(values: z.infer<typeof campaignFormSchema>) {
    setIsCampaignLoading(true);
    setCampaignResult(null);
    const partners = getPartners();
    const response = await runCreateEmailCampaign(values.instruction, partners, quotes);
    if (response.success) {
      setCampaignResult(response.data || null);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar campanha',
        description: response.error,
      });
    }
    setIsCampaignLoading(false);
  }

  const priorityMap: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
    high: 'destructive',
    medium: 'default',
    low: 'secondary'
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalClients}</div>
            <p className="text-xs text-muted-foreground">Clientes ativos na base.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Novos</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.newClients}</div>
            <p className="text-xs text-muted-foreground">nos últimos 30 dias.</p>
          </CardContent>
        </Card>
         <Card className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <UserCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeClients}</div>
            <p className="text-xs text-muted-foreground">com embarques nos últimos 90 dias.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-success/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócios Fechados</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.wonDeals}</div>
            <p className="text-xs text-muted-foreground">Cotações aprovadas no período.</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 hover:ring-destructive/50 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negócios Perdidos</CardTitle>
            <XCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.lostDeals}</div>
            <p className="text-xs text-muted-foreground">Cotações perdidas no período.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Analisador de E-mail para CRM</CardTitle>
            <CardDescription>Cole o e-mail abaixo e clique em analisar para extrair dados de contato.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...crmForm}>
              <form onSubmit={crmForm.handleSubmit(onCrmSubmit)} className="space-y-6">
                <FormField
                  control={crmForm.control}
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
                <Button type="submit" disabled={isCrmLoading} className="w-full">
                  {isCrmLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando...</> : <><ChevronsRight className="mr-2 h-4 w-4" />Analisar e Criar Entrada no CRM</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Resultado da Análise de Contato</CardTitle>
            <CardDescription>As informações extraídas do e-mail aparecerão aqui.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            {crmResult ? (
              <div className="w-full space-y-4 animate-in fade-in-50 duration-500">
                <div className="flex items-center gap-3 p-3 rounded-md border bg-card"><User className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Nome:</span><span className="text-foreground">{crmResult.contactName}</span></div>
                <div className="flex items-center gap-3 p-3 rounded-md border bg-card"><Building className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Empresa:</span><span className="text-foreground">{crmResult.companyName}</span></div>
                <div className="flex items-center gap-3 p-3 rounded-md border bg-card"><Mail className="h-5 w-5 text-muted-foreground" /><span className="font-medium">E-mail:</span><span className="text-foreground">{crmResult.emailAddress}</span></div>
                <div className="flex items-start gap-3 p-3 rounded-md border bg-card"><FileText className="h-5 w-5 text-muted-foreground mt-1" /><div><span className="font-medium">Resumo:</span><p className="text-foreground text-sm mt-1">{crmResult.summary}</p></div></div>
                <div className="flex items-center gap-3 p-3 rounded-md border bg-card"><AlertTriangle className="h-5 w-5 text-muted-foreground" /><span className="font-medium">Prioridade:</span><Badge variant={priorityMap[crmResult.priority] || 'default'} className="capitalize">{crmResult.priority}</Badge></div>
              </div>
            ) : (<div className="text-center text-muted-foreground">Aguardando análise...</div>)}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
            <CardTitle>Campanha de E-mail com IA</CardTitle>
            <CardDescription>Descreva a campanha que você quer criar. A IA irá encontrar os clientes-alvo com base nos KPIs do cadastro e no histórico de cotações, e depois gerar o e-mail.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...campaignForm}>
                <form onSubmit={campaignForm.handleSubmit(onCampaignSubmit)} className="space-y-4">
                    <FormField control={campaignForm.control} name="instruction" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Instrução para a Campanha</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Ex: quero mandar um email para todos os clientes que embarcam de shanghai x santos oferecendo a tarifa especial que recebemos de USD 5200/40HC" className="min-h-[100px]" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="submit" disabled={isCampaignLoading} className="w-full sm:w-auto">
                        {isCampaignLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando...</> : <><Wand2 className="mr-2 h-4 w-4" />Gerar Campanha</>}
                    </Button>
                </form>
            </Form>
            {isCampaignLoading && <div className="text-center p-8 text-muted-foreground animate-pulse"><Loader2 className="mx-auto h-12 w-12 mb-4" /><p>Analisando seus cadastros e criando a campanha...</p></div>}
            
            {campaignResult && (
                <div className="mt-6 grid md:grid-cols-2 gap-8 animate-in fade-in-50 duration-500">
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Clientes-Alvo ({campaignResult.clients.length})</h3>
                        <ScrollArea className="h-72 border rounded-md p-3">
                            <ul className="space-y-2">
                                {campaignResult.clients.map((client, index) => (
                                    <li key={index} className="text-sm">{client}</li>
                                ))}
                                {campaignResult.clients.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cliente encontrado para esta rota nos seus cadastros ou histórico de cotações.</p>}
                            </ul>
                        </ScrollArea>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> E-mail Gerado</h3>
                        <div className="border rounded-md p-4 space-y-2">
                            <p className="text-sm"><strong className="text-muted-foreground">Assunto:</strong> {campaignResult.emailSubject}</p>
                            <Separator />
                            <div className="text-sm prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: campaignResult.emailBody }} />
                        </div>
                        <Button disabled={campaignResult.clients.length === 0}>
                            <Send className="mr-2 h-4 w-4" /> Enviar Campanha (Simulação)
                        </Button>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
