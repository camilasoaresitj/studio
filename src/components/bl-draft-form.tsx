
'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Shipment, BLDraftHistory, BLDraftData } from '@/lib/shipment-data';
import type { Partner } from '@/lib/partners-data';
import { saveShipments } from '@/lib/shipment-data';
import { runSubmitBLDraft } from '@/app/actions';
import { Loader2, Send, FileText, AlertTriangle, CheckCircle, Ship, Trash2, PlusCircle, History } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { isPast, isValid, format } from 'date-fns';
import { Separator } from './ui/separator';
import { Label } from './ui/label';
import { Badge } from './ui/badge';


const blDraftContainerSchema = z.object({
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
  volumes: z.string().min(1, "Obrigatório"),
  measurement: z.string().min(1, "Obrigatório"),
});

const vgmDetailsSchema = z.object({
    responsibleParty: z.string().min(1, "Parte responsável é obrigatória."),
    authorizedPerson: z.string().min(1, "Pessoa autorizada é obrigatória."),
    method: z.enum(['method1', 'method2'], { required_error: 'Selecione o método de pesagem.' }),
});

const blDraftSchema = z.object({
  shipper: z.string().min(1, 'Shipper é obrigatório'),
  consignee: z.string().min(1, 'Consignee é obrigatório'),
  notify: z.string().min(1, 'Notify Party é obrigatório'),
  marksAndNumbers: z.string().min(1, 'Marcas e números são obrigatórios'),
  descriptionOfGoods: z.string().min(1, 'Descrição da mercadoria é obrigatória'),
  grossWeight: z.string(), // This will be calculated
  measurement: z.string(), // This will be calculated
  ncms: z.array(z.object({ value: z.string().min(1, "Obrigatório") })).min(1, "Adicione pelo menos um NCM."),
  due: z.string().min(1, "DUE é obrigatório."),
  blType: z.enum(['original', 'express'], { required_error: 'Selecione o tipo de BL.' }),
  containers: z.array(blDraftContainerSchema).min(1, "Adicione pelo menos um contêiner."),
  vgmDetails: vgmDetailsSchema,
});

type BLDraftFormData = z.infer<typeof blDraftSchema>;

interface BLDraftFormProps {
  shipment: Shipment;
  isSheet?: boolean; // To differentiate between sheet and page context
  onUpdate: (shipment: Shipment) => void;
}

const formatPartnerAddress = (partner: Partner | undefined) => {
    if (!partner || !partner.name) return '';
    const addressParts = [
        partner.name,
        partner.address?.street ? `${partner.address.street}, ${partner.address.number || ''}` : '',
        partner.address?.district ? `${partner.address.district}, ${partner.address.city || ''} - ${partner.address.state || ''}` : '',
        partner.address?.country,
        partner.cnpj ? `CNPJ: ${partner.cnpj}` : partner.vat ? `VAT: ${partner.vat}` : ''
    ];
    return addressParts.filter(part => part && part.trim() !== ',').join('\n');
};

const DraftHistory = ({ history }: { history: BLDraftHistory | undefined }) => {
    if (!history?.sentAt) return null;

    return (
        <Card className="bg-secondary/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico do Draft
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div>
                    <strong>Enviado em:</strong> {format(new Date(history.sentAt), 'dd/MM/yyyy HH:mm')}
                </div>
                {history.revisions.length > 0 && (
                    <div className="space-y-1">
                        <strong>Revisões:</strong>
                        <ul className="list-disc pl-5">
                            {history.revisions.map((rev, index) => (
                                <li key={index}>
                                    {format(new Date(rev.date), 'dd/MM/yyyy HH:mm')}
                                    {rev.lateFee && (
                                        <Badge variant="destructive" className="ml-2">Custo de Correção: {rev.lateFee.currency} {rev.lateFee.cost}</Badge>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export const BLDraftForm = forwardRef<{ submit: () => void }, BLDraftFormProps>(({ shipment, isSheet = false, onUpdate }, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<BLDraftFormData>({
    resolver: zodResolver(blDraftSchema),
    defaultValues: shipment.blDraftData ? {
        ...shipment.blDraftData,
        ncms: shipment.blDraftData.ncms?.map(ncm => ({ value: ncm })) || [{value: ''}]
    } : {
      shipper: shipment.shipper ? formatPartnerAddress(shipment.shipper) : '',
      consignee: shipment.consignee ? formatPartnerAddress(shipment.consignee) : '',
      notify: shipment.notifyName ? shipment.notifyName : (shipment.consignee ? formatPartnerAddress(shipment.consignee) : ''),
      marksAndNumbers: `LOTE ${shipment.id}`,
      descriptionOfGoods: shipment.commodityDescription || '',
      grossWeight: shipment.netWeight || '',
      measurement: '',
      ncms: (shipment.ncms?.length || 0) > 0 ? shipment.ncms!.map(ncm => ({ value: ncm })) : [{value: ''}],
      due: '',
      blType: 'original',
      containers: shipment.containers?.map(c => ({ 
          number: c.number || '', 
          seal: c.seal || '',
          tare: c.tare || '',
          grossWeight: c.grossWeight || '',
          volumes: c.volumes || '',
          measurement: c.measurement || '',
       })) || [{ number: '', seal: '', tare: '', grossWeight: '', volumes: '', measurement: '' }],
       vgmDetails: {
           responsibleParty: shipment.shipper?.name || '',
           authorizedPerson: '',
           method: 'method1',
       }
    },
  });

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.handleSubmit(onSubmit)();
    }
  }));

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "containers",
  });
  
  const { fields: ncmFields, append: appendNcm, remove: removeNcm } = useFieldArray({
    control: form.control,
    name: "ncms",
  });


  const watchedContainers = useWatch({
    control: form.control,
    name: "containers"
  });

  useEffect(() => {
      const totalGrossWeight = watchedContainers.reduce((sum, c) => sum + (parseFloat(c.grossWeight) || 0), 0);
      const totalMeasurement = watchedContainers.reduce((sum, c) => sum + (parseFloat(c.measurement) || 0), 0);
      form.setValue('grossWeight', `${totalGrossWeight.toFixed(2)} KGS`);
      form.setValue('measurement', `${totalMeasurement.toFixed(3)} CBM`);
  }, [watchedContainers, form]);
  
  const docsCutoffMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('documental'));
  const docsCutoffDate = docsCutoffMilestone?.predictedDate ? new Date(docsCutoffMilestone.predictedDate) : null;
  const isLateSubmission = docsCutoffDate ? isPast(docsCutoffDate) : false;

  async function onSubmit(values: BLDraftFormData) {
    setIsLoading(true);

    const draftDataToSave: BLDraftData = {
        ...values,
        ncms: values.ncms.map(n => n.value)
    };
    
    if (isSheet) {
        // Just update the data in the sheet context
        const updatedShipment = { ...shipment, blDraftData: draftDataToSave, blType: values.blType };
        onUpdate(updatedShipment);
        toast({ title: 'Draft Salvo!', description: 'As informações do draft foram salvas no processo.' });
    } else {
        // Submit from the customer portal
        const response = await runSubmitBLDraft(shipment.id, draftDataToSave);
        if (response.success && response.data) {
          saveShipments(response.data);
          const updatedShipmentFromServer = response.data.find(s => s.id === shipment.id);
          if (updatedShipmentFromServer) {
              onUpdate(updatedShipmentFromServer);
          }
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
  
  const hasBeenSent = !!shipment.blDraftHistory?.sentAt;

  const cardContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {docsCutoffDate && !isSheet && (
            <Alert variant={isLateSubmission ? 'destructive' : 'default'} className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção ao Prazo!</AlertTitle>
                <AlertDescription>
                    O cut-off documental para este processo é <strong>{docsCutoffDate.toLocaleDateString('pt-BR')}</strong>.
                    {isLateSubmission && " O envio fora do prazo está sujeito a taxas de alteração."}
                </AlertDescription>
            </Alert>
        )}
        <Card className="bg-secondary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Dados do Embarque</CardTitle>
            <CardDescription>Informações para sua conferência.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="font-semibold">Booking:</p><p className="text-muted-foreground">{shipment.bookingNumber}</p></div>
              <div><p className="font-semibold">Navio:</p><p className="text-muted-foreground">{shipment.vesselName}</p></div>
              <div><p className="font-semibold">Origem:</p><p className="text-muted-foreground">{shipment.origin}</p></div>
              <div><p className="font-semibold">Destino:</p><p className="text-muted-foreground">{shipment.destination}</p></div>
          </CardContent>
        </Card>
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
            
            <Separator />
            
            <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Dados dos Contêineres</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ number: '', seal: '', tare: '', grossWeight: '', volumes: '', measurement: '' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Contêiner
                  </Button>
                </div>
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md relative space-y-4">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                                <FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => (
                                    <FormItem><FormLabel>Nº do Contêiner</FormLabel><FormControl><Input placeholder="MSCU1234567" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => (
                                    <FormItem><FormLabel>Nº do Lacre</FormLabel><FormControl><Input placeholder="SEAL12345" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => (
                                    <FormItem><FormLabel>Tara (kg)</FormLabel><FormControl><Input placeholder="2250" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => (
                                    <FormItem><FormLabel>Peso Bruto (kg)</FormLabel><FormControl><Input placeholder="24000" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
                                <FormField control={form.control} name={`containers.${index}.volumes`} render={({ field }) => (
                                    <FormItem><FormLabel>Qtd. Volumes</FormLabel><FormControl><Input placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name={`containers.${index}.measurement`} render={({ field }) => (
                                    <FormItem><FormLabel>Cubagem (m³)</FormLabel><FormControl><Input placeholder="28.5" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                        </div>
                    ))}
                </div>
                <FormField
                    control={form.control}
                    name="containers"
                    render={({ fieldState }) => (
                        <>{fieldState.error?.message ? <FormMessage className="mt-2">{fieldState.error.message}</FormMessage> : <></>}</>
                    )}
                />
            </div>

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="grossWeight" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Peso Bruto Total</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField name="measurement" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Cubagem Total (CBM)</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            
            <Separator />

            <div>
                <h3 className="text-lg font-medium mb-4">Detalhes do VGM (Verified Gross Mass)</h3>
                <div className="p-4 border rounded-md space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="vgmDetails.responsibleParty" render={({ field }) => (
                            <FormItem><FormLabel>Parte Responsável</FormLabel><FormControl><Input placeholder="Nome da empresa ou pessoa" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="vgmDetails.authorizedPerson" render={({ field }) => (
                            <FormItem><FormLabel>Pessoa Autorizada</FormLabel><FormControl><Input placeholder="Nome completo" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="vgmDetails.method" render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Método de Pesagem</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="method1" /></FormControl><FormLabel className="font-normal">Método 1: Pesagem do contêiner cheio e lacrado.</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="method2" /></FormControl><FormLabel className="font-normal">Método 2: Pesagem de toda a carga e conteúdo + tara do contêiner.</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label>NCM</Label>
                      {ncmFields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2 mt-1">
                              <FormField name={`ncms.${index}.value`} control={form.control} render={({ field }) => (
                                  <Input {...field} placeholder="0000.00.00" />
                              )} />
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeNcm(index)} disabled={ncmFields.length <= 1}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => appendNcm({ value: '' })} className="mt-2">
                          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar NCM
                      </Button>
                      <FormField name="ncms" control={form.control} render={({ fieldState }) => (
                          fieldState.error?.message ? <FormMessage className="mt-2">{fieldState.error.message}</FormMessage> : null
                      )} />
                  </div>
                  <FormField name="due" control={form.control} render={({ field }) => (
                      <FormItem><FormLabel>DUE (Declaração Única de Exportação)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                  {hasBeenSent ? 'Enviar Revisão do Draft' : 'Enviar Draft para Análise'}
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
      {!isSheet && (
          <div className="lg:col-span-1">
              <DraftHistory history={shipment.blDraftHistory} />
          </div>
      )}
    </div>
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
});

BLDraftForm.displayName = 'BLDraftForm';
