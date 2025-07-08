
'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isPast, isValid } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import type { Shipment, Milestone } from '@/lib/shipment';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Save, Trash2, Circle, CheckCircle, Hourglass, AlertTriangle, ArrowRight, Wallet, Receipt, Anchor, CaseSensitive, Weight, Package, Clock, Ship } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';


const containerDetailSchema = z.object({
  id: z.string(),
  number: z.string().min(1, "Obrigatório"),
  seal: z.string().min(1, "Obrigatório"),
  tare: z.string().min(1, "Obrigatório"),
  grossWeight: z.string().min(1, "Obrigatório"),
});

const shipmentDetailsSchema = z.object({
  id: z.string(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  masterBillNumber: z.string().optional(),
  houseBillNumber: z.string().optional(),
  etd: z.date().optional(),
  eta: z.date().optional(),
  containers: z.array(containerDetailSchema).optional(),
  commodityDescription: z.string().optional(),
  ncm: z.string().optional(),
  netWeight: z.string().optional(),
  packageQuantity: z.string().optional(),
  freeTimeDemurrage: z.string().optional(),
  transshipmentPort: z.string().optional(),
  transshipmentVessel: z.string().optional(),
  etdTransshipment: z.date().optional(),
  etaTransshipment: z.date().optional(),
});

type ShipmentDetailsFormData = z.infer<typeof shipmentDetailsSchema>;

interface ShipmentDetailsSheetProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedShipment: Shipment) => void;
}

const MilestoneIcon = ({ status, dueDate }: { status: Milestone['status'], dueDate?: Date }) => {
    if (!dueDate || !isValid(dueDate)) {
         return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
    const isOverdue = isPast(dueDate) && status !== 'completed';

    if (isOverdue) {
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
    }
    if (status === 'completed') {
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
    if (status === 'in_progress') {
        return <Hourglass className="h-5 w-5 text-blue-600 animate-spin" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />;
};


export function ShipmentDetailsSheet({ shipment, open, onOpenChange, onUpdate }: ShipmentDetailsSheetProps) {
  const { toast } = useToast();
  
  const form = useForm<ShipmentDetailsFormData>({
    resolver: zodResolver(shipmentDetailsSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "containers"
  });

  useEffect(() => {
    if (shipment) {
      form.reset({
        id: shipment.id,
        vesselName: shipment.vesselName || '',
        voyageNumber: shipment.voyageNumber || '',
        masterBillNumber: shipment.masterBillNumber || '',
        houseBillNumber: shipment.houseBillNumber || '',
        etd: shipment.etd && isValid(new Date(shipment.etd)) ? new Date(shipment.etd) : undefined,
        eta: shipment.eta && isValid(new Date(shipment.eta)) ? new Date(shipment.eta) : undefined,
        containers: shipment.containers || [],
        commodityDescription: shipment.commodityDescription || '',
        ncm: shipment.ncm || '',
        netWeight: shipment.netWeight || '',
        packageQuantity: shipment.packageQuantity || shipment.details.cargo,
        freeTimeDemurrage: shipment.freeTimeDemurrage || shipment.details.freeTime,
        transshipmentPort: shipment.transshipmentPort || '',
        transshipmentVessel: shipment.transshipmentVessel || '',
        etdTransshipment: shipment.etdTransshipment && isValid(new Date(shipment.etdTransshipment)) ? new Date(shipment.etdTransshipment) : undefined,
        etaTransshipment: shipment.etaTransshipment && isValid(new Date(shipment.etaTransshipment)) ? new Date(shipment.etaTransshipment) : undefined,
      });
    }
  }, [shipment, form]);

  const onSubmit = (data: ShipmentDetailsFormData) => {
    if (!shipment) return;
    const updatedShipment: Shipment = {
        ...shipment,
        ...data,
    };
    onUpdate(updatedShipment);
  };
  
  const handleCompleteMilestone = (milestoneIndex: number) => {
    if (!shipment) return;

    const updatedMilestones = shipment.milestones.map((m, index) => {
        if (index === milestoneIndex) {
            return { ...m, status: 'completed' as const, completedDate: new Date() };
        }
        if (index === milestoneIndex + 1 && m.status === 'pending') {
            return { ...m, status: 'in_progress' as const };
        }
        return m;
    });

    onUpdate({
        ...shipment,
        milestones: updatedMilestones,
    });
  };

  const { progressPercentage, completedCount, totalCount } = useMemo(() => {
    if (!shipment?.milestones || shipment.milestones.length === 0) {
      return { progressPercentage: 0, completedCount: 0, totalCount: 0 };
    }
    const completed = shipment.milestones.filter(m => m.status === 'completed').length;
    const total = shipment.milestones.length;
    return {
      progressPercentage: total > 0 ? (completed / total) * 100 : 0,
      completedCount: completed,
      totalCount: total,
    };
  }, [shipment]);


  if (!shipment) {
      return null;
  }
  
  const { overseasPartner, agent } = shipment;

  const handleBillingClick = (type: 'receber' | 'pagar') => {
    toast({
        title: `Função em Desenvolvimento`,
        description: `A ação de "Faturar Contas a ${type === 'receber' ? 'Receber' : 'Pagar'}" será integrada ao módulo Financeiro.`,
    });
  }

  return (
      <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="sm:max-w-4xl w-full flex flex-col">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                  <SheetHeader>
                      <SheetTitle>Detalhes do Embarque: {shipment.id}</SheetTitle>
                      <SheetDescription>
                          {shipment.origin} &rarr; {shipment.destination} para <strong>{shipment.customer}</strong>
                      </SheetDescription>
                  </SheetHeader>
                  <Separator className="my-4" />
                  <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                      {/* Partners Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                              <CardHeader className="pb-2"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
                              <CardContent className="text-sm space-y-1">
                                  <p className="font-semibold">{shipment.customer}</p>
                              </CardContent>
                          </Card>
                          <Card>
                              <CardHeader className="pb-2"><CardTitle className="text-base">{shipment.destination.toUpperCase().includes('BR') ? 'Exportador (Shipper)' : 'Importador (Cnee)'}</CardTitle></CardHeader>
                              <CardContent className="text-sm space-y-1">
                                  <p className="font-semibold">{overseasPartner?.name}</p>
                                  <p className="text-muted-foreground">{overseasPartner?.address?.street}, {overseasPartner?.address?.number}</p>
                                  <p className="text-muted-foreground">{overseasPartner?.address?.city}, {overseasPartner?.address?.state} - {overseasPartner?.address?.zip}</p>
                                  {overseasPartner?.cnpj && <p className="text-muted-foreground">CNPJ: {overseasPartner.cnpj}</p>}
                              </CardContent>
                          </Card>
                          <Card>
                              <CardHeader className="pb-2"><CardTitle className="text-base">Agente</CardTitle></CardHeader>
                              <CardContent className="text-sm space-y-1">
                                  {agent ? (
                                      <>
                                          <p className="font-semibold">{agent.name}</p>
                                          <p className="text-muted-foreground">{agent.address.street}, {agent.address.number}</p>
                                          <p className="text-muted-foreground">{agent.address.city}, {agent.address.country}</p>
                                          {agent.cnpj && <p className="text-muted-foreground">CNPJ: {agent.cnpj}</p>}
                                      </>
                                  ) : (
                                      <p className="text-muted-foreground">Embarque Direto</p>
                                  )}
                              </CardContent>
                          </Card>
                      </div>

                      {/* Voyage Details */}
                      <Card>
                        <CardHeader><CardTitle className="text-lg">Dados da Viagem/Voo</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <FormField control={form.control} name="vesselName" render={({ field }) => (
                                <FormItem><FormLabel>Navio / Voo</FormLabel><FormControl><Input placeholder="MSC LEO" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="voyageNumber" render={({ field }) => (
                                <FormItem><FormLabel>Viagem / Nº Voo</FormLabel><FormControl><Input placeholder="AB123C" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="etd" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>ETD</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : (<span>Selecione a data</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="eta" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>ETA</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : (<span>Selecione a data</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="transshipmentPort" render={({ field }) => (
                                <FormItem><FormLabel>Porto/Aeroporto de Transbordo</FormLabel><FormControl><Input placeholder="Ex: Antuérpia" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="transshipmentVessel" render={({ field }) => (
                                <FormItem><FormLabel>Navio/Voo de Conexão</FormLabel><FormControl><Input placeholder="Ex: MAERSK HONAM / AA905" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="etdTransshipment" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>ETD Transbordo</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : (<span>Selecione a data</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                              <FormField control={form.control} name="etaTransshipment" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>ETA Transbordo</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value && isValid(field.value) ? format(field.value, "dd/MM/yyyy") : (<span>Selecione a data</span>)}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                                    </Popover>
                                <FormMessage /></FormItem>
                            )}/>
                        </CardContent>
                      </Card>

                      {/* Bill Numbers */}
                      <Card>
                        <CardHeader><CardTitle className="text-lg">Documentos</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="masterBillNumber" render={({ field }) => (
                                <FormItem><FormLabel>Master Bill of Lading / MAWB</FormLabel><FormControl><Input placeholder="MSCU12345678" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="houseBillNumber" render={({ field }) => (
                                <FormItem><FormLabel>House Bill of Lading / HAWB</FormLabel><FormControl><Input placeholder="MYHBL12345" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </CardContent>
                      </Card>

                      {/* Milestones */}
                      <Card>
                          <CardHeader>
                              <div className="flex justify-between items-center">
                                  <CardTitle className="text-lg">Milestones Operacionais</CardTitle>
                                  <span className="text-sm text-muted-foreground font-medium">{completedCount} de {totalCount} concluídos</span>
                              </div>
                              <Progress value={progressPercentage} className="w-full mt-2" />
                          </CardHeader>
                          <CardContent className="space-y-2">
                              {shipment.milestones?.map((milestone, index) => (
                                  <div key={milestone.name + index} className={cn(
                                      "flex items-center gap-4 p-3 rounded-lg border",
                                      milestone.status === 'in_progress' ? 'bg-accent border-primary' : 'bg-background'
                                  )}>
                                      <MilestoneIcon status={milestone.status} dueDate={isValid(new Date(milestone.dueDate)) ? new Date(milestone.dueDate) : undefined} />
                                      <div className="flex-grow">
                                          <p className="font-semibold">{milestone.name}</p>
                                          {isValid(new Date(milestone.dueDate)) &&
                                            <p className={cn("text-xs", isPast(new Date(milestone.dueDate)) && milestone.status !== 'completed' ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                                                Vencimento: {format(new Date(milestone.dueDate), 'dd/MM/yyyy')}
                                            </p>
                                          }
                                      </div>
                                      <Badge variant={
                                          milestone.status === 'completed' ? 'outline' :
                                          milestone.status === 'in_progress' ? 'default' : 'secondary'
                                      } className="capitalize w-24 justify-center">{milestone.status.replace('_', ' ')}</Badge>
                                      {milestone.status === 'in_progress' && (
                                          <Button type="button" size="sm" onClick={() => handleCompleteMilestone(index)} className="w-36">
                                              Concluir Etapa <ArrowRight className="ml-2 h-4 w-4"/>
                                          </Button>
                                      )}
                                      {milestone.status !== 'in_progress' && <div className="w-36"/>}
                                  </div>
                              ))}
                               {shipment.etdTransshipment && isValid(new Date(shipment.etdTransshipment)) && (
                                  <div className="flex items-center gap-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                                      <Ship className="h-5 w-5 text-blue-600" />
                                      <div className="flex-grow"><p className="font-semibold">Previsão de Saída do Transbordo</p></div>
                                      <p className="text-sm text-muted-foreground font-medium">{format(new Date(shipment.etdTransshipment), 'dd/MM/yyyy')}</p>
                                  </div>
                              )}
                               {shipment.etaTransshipment && isValid(new Date(shipment.etaTransshipment)) && (
                                  <div className="flex items-center gap-4 p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20">
                                      <Anchor className="h-5 w-5 text-blue-600" />
                                      <div className="flex-grow"><p className="font-semibold">Previsão de Chegada no Transbordo</p></div>
                                      <p className="text-sm text-muted-foreground font-medium">{format(new Date(shipment.etaTransshipment), 'dd/MM/yyyy')}</p>
                                  </div>
                              )}
                          </CardContent>
                      </Card>

                      {/* Cargo Details */}
                      <Card>
                        <CardHeader><CardTitle className="text-lg">Detalhes da Mercadoria</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="commodityDescription" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center gap-2"><CaseSensitive />Descrição da Mercadoria</FormLabel><FormControl><Input placeholder="Peças automotivas" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="ncm" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center gap-2">NCM</FormLabel><FormControl><Input placeholder="8708.99.90" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="packageQuantity" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center gap-2"><Package /> Quantidade de Volumes</FormLabel><FormControl><Input placeholder="10 caixas" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="netWeight" render={({ field }) => (
                                    <FormItem><FormLabel className="flex items-center gap-2"><Weight/> Peso Líquido</FormLabel><FormControl><Input placeholder="1200 KG" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="freeTimeDemurrage" render={({ field }) => (
                                <FormItem><FormLabel className="flex items-center gap-2"><Clock /> Free Time Demurrage / Detention</FormLabel><FormControl><Input placeholder="14 dias" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Contêineres</CardTitle>
                             <Button type="button" size="sm" variant="outline" onClick={() => append({ id: `new-${fields.length}`, number: '', seal: '', tare: '', grossWeight: '' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                           <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nº Contêiner</TableHead>
                                            <TableHead>Lacre</TableHead>
                                            <TableHead>Tara</TableHead>
                                            <TableHead>Peso Bruto</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields && fields.length > 0 ? fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.number`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.seal`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.tare`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell><FormField control={form.control} name={`containers.${index}.grossWeight`} render={({ field }) => (<Input {...field}/>)}/></TableCell>
                                                <TableCell>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhum contêiner adicionado.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                      </Card>

                      {/* Financial Details */}
                      <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Detalhes Financeiros</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Taxa</TableHead>
                                            <TableHead>Fornecedor</TableHead>
                                            <TableHead className="text-right">Custo</TableHead>
                                            <TableHead className="text-right">Venda</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {shipment.charges && shipment.charges.map(charge => (
                                            <TableRow key={charge.id}>
                                                <TableCell>{charge.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{charge.supplier}</TableCell>
                                                <TableCell className="text-right font-mono">{charge.costCurrency} {charge.cost.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono">{charge.saleCurrency} {charge.sale.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" type="button" onClick={() => handleBillingClick('pagar')}>
                                    <Receipt className="mr-2 h-4 w-4" />
                                    Faturar Contas a Pagar
                                </Button>
                                <Button variant="outline" type="button" onClick={() => handleBillingClick('receber')}>
                                    <Wallet className="mr-2 h-4 w-4" />
                                    Faturar Contas a Receber
                                </Button>
                            </div>
                        </CardContent>
                      </Card>

                  </div>
                  <SheetFooter className="pt-4 mt-4 border-t">
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </Button>
                  </SheetFooter>
                </form>
              </Form>
          </SheetContent>
      </Sheet>
  );
}
