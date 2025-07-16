
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Shipment } from '@/lib/shipment';
import { submitBLDraft } from '@/app/actions';
import { Loader2, Send, FileText, AlertTriangle, CheckCircle, Ship } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { isPast, isValid } from 'date-fns';


const blDraftSchema = z.object({
  shipper: z.string().min(1, 'Shipper é obrigatório'),
  consignee: z.string().min(1, 'Consignee é obrigatório'),
  notify: z.string().min(1, 'Notify Party é obrigatório'),
  marksAndNumbers: z.string().min(1, 'Marcas e números são obrigatórios'),
  descriptionOfGoods: z.string().min(1, 'Descrição da mercadoria é obrigatória'),
  grossWeight: z.string().min(1, 'Peso bruto é obrigatório'),
  measurement: z.string().min(1, 'Cubagem é obrigatória'),
  ncm: z.string().min(1, 'NCM é obrigatório'),
  blType: z.enum(['original', 'express'], { required_error: 'Selecione o tipo de BL.' }),
});

type BLDraftFormData = z.infer<typeof blDraftSchema>;

interface BLDraftFormProps {
  shipment: Shipment;
  isSheet?: boolean; // To differentiate between sheet and page context
  onUpdate?: (updatedShipment: Shipment) => void;
}

export function BLDraftForm({ shipment, isSheet = false, onUpdate }: BLDraftFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<BLDraftFormData>({
    resolver: zodResolver(blDraftSchema),
    defaultValues: shipment.blDraftData || {
      shipper: shipment.shipper.name,
      consignee: shipment.consignee.name,
      notify: shipment.notifyName || shipment.consignee.name,
      marksAndNumbers: `LOTE ${shipment.id}`,
      descriptionOfGoods: shipment.commodityDescription || '',
      grossWeight: shipment.netWeight || '',
      measurement: '',
      ncm: shipment.ncms?.[0] || '',
      blType: 'original',
    },
  });
  
  const docsCutoffMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('documental'));
  const docsCutoffDate = docsCutoffMilestone?.predictedDate ? new Date(docsCutoffMilestone.predictedDate) : null;
  const isLateSubmission = docsCutoffDate ? isPast(docsCutoffDate) : false;

  async function onSubmit(values: BLDraftFormData) {
    setIsLoading(true);
    
    if (isSheet && onUpdate) {
        // Just update the data in the sheet context
        const updatedShipment = { ...shipment, blDraftData: values, blType: values.blType };
        onUpdate(updatedShipment);
        toast({ title: 'Draft Salvo!', description: 'As informações do draft foram salvas no processo.' });
    } else {
        // Submit from the customer portal
        const response = await submitBLDraft(shipment.id, values, isLateSubmission);
        if (response.success) {
          toast({
            title: 'Draft de BL Enviado!',
            description: 'Seu draft foi enviado para nossa equipe. Obrigado!',
            className: 'bg-success text-success-foreground'
          });
          setIsSubmitted(true);
        } else {
          toast({
            variant: 'destructive',
            title: 'Erro ao Enviar',
            description: response.error,
          });
        }
    }
    setIsLoading(false);
  }
  
  if (isSubmitted) {
    return (
        <Card className="w-full max-w-2xl text-center mx-auto">
            <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-2xl mt-4">Draft Enviado com Sucesso!</CardTitle>
                <CardDescription>Obrigado por enviar as instruções do Bill of Lading. Nossa equipe operacional foi notificada e dará continuidade ao processo. Você já pode fechar esta janela.</CardDescription>
            </CardHeader>
        </Card>
    )
  }

  // If in sheet context and data is not present, show alert
  if (isSheet && !shipment.blDraftData) {
     return (
        <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Aguardando Instruções</AlertTitle>
            <AlertDescription>
                O cliente ainda não enviou o draft do BL através do portal. Assim que enviado, as informações aparecerão aqui para conferência.
            </AlertDescription>
        </Alert>
     )
  }

  const cardContent = (
    <>
      {docsCutoffDate && (
           <Alert variant={isLateSubmission ? 'destructive' : 'default'} className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção ao Prazo!</AlertTitle>
              <AlertDescription>
                  O cut-off documental para este processo é <strong>{docsCutoffDate.toLocaleDateString('pt-BR')}</strong>.
                  {isLateSubmission && " O envio fora do prazo está sujeito a taxas de alteração."}
              </AlertDescription>
          </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  name="shipper"
                  control={form.control}
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Shipper (Exportador)</FormLabel>
                          <FormControl><Textarea {...field} className="min-h-[120px]" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
               <FormField
                  name="consignee"
                  control={form.control}
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Consignee (Importador)</FormLabel>
                          <FormControl><Textarea {...field} className="min-h-[120px]" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
          </div>
          <FormField
              name="notify"
              control={form.control}
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Notify Party</FormLabel>
                      <FormControl><Textarea {...field} className="min-h-[120px]" /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  name="marksAndNumbers"
                  control={form.control}
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Marcas e Números</FormLabel>
                          <FormControl><Textarea {...field} className="min-h-[120px]" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
               <FormField
                  name="descriptionOfGoods"
                  control={form.control}
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Descrição da Mercadoria</FormLabel>
                          <FormControl><Textarea {...field} className="min-h-[120px]" /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
          </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField name="grossWeight" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Peso Bruto</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="measurement" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Cubagem (CBM)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField name="ncm" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>NCM</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
          </div>

          <FormField
            control={form.control}
            name="blType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Tipo de Emissão do BL</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="original" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        BL Impresso na Origem
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="express" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Express Release (Sea Waybill / Telex)
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full text-lg py-6">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isSheet ? 'Salvando...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                {isSheet ? 'Salvar Draft' : 'Enviar Draft para Análise'}
              </>
            )}
          </Button>
        </form>
      </Form>
    </>
  )

  return isSheet ? (
    cardContent
  ) : (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
                <FileText className="h-8 w-8 text-primary"/>
            </div>
            <div>
                <CardTitle>Instruções de Embarque - Draft do BL</CardTitle>
                <CardDescription>Processo: <span className="font-semibold text-primary">{shipment.id}</span></CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {cardContent}
      </CardContent>
    </Card>
  );
}

