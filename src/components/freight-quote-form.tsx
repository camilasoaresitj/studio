'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useToast } from '@/hooks/use-toast';
import { Plane, Ship, Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Search, UserPlus, X, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Label } from './ui/label';
import { runGetFreightRates } from '@/app/actions';

const airPieceSchema = z.object({
  quantity: z.coerce.number().min(1, "Obrigatório"),
  length: z.coerce.number().min(1, "Obrigatório"),
  width: z.coerce.number().min(1, "Obrigatório"),
  height: z.coerce.number().min(1, "Obrigatório"),
  weight: z.coerce.number().min(0.1, "Obrigatório"),
});

const oceanContainerSchema = z.object({
  type: z.string().min(1, "Selecione o tipo"),
  quantity: z.coerce.number().min(1, "Obrigatório"),
});

const lclDetailsSchema = z.object({
    cbm: z.coerce.number().min(0.01, "CBM deve ser maior que 0."),
    weight: z.coerce.number().min(1, "Peso deve ser maior que 0."),
});

const formSchema = z.object({
  customerName: z.string().min(3, { message: "O nome do cliente é obrigatório (mínimo 3 caracteres)." }),
  modal: z.enum(['air', 'ocean']),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']),
  origin: z.string().min(3, { message: "Origem obrigatória (mínimo 3 caracteres)." }),
  destination: z.string().min(3, { message: "Destino obrigatório (mínimo 3 caracteres)." }),
  departureDate: z.date().optional(),
  
  airShipment: z.object({
    pieces: z.array(airPieceSchema),
    isStackable: z.boolean().default(false),
  }),

  oceanShipmentType: z.enum(['FCL', 'LCL']),
  oceanShipment: z.object({
    containers: z.array(oceanContainerSchema),
  }),
  lclDetails: lclDetailsSchema,

}).superRefine((data, ctx) => {
    if (data.modal === 'air' && data.airShipment.pieces.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Adicione pelo menos uma peça para cotação aérea.",
            path: ['airShipment.pieces'],
        });
    }
    if (data.modal === 'ocean' && data.oceanShipmentType === 'FCL' && data.oceanShipment.containers.length === 0) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Adicione pelo menos um contêiner para cotação FCL.",
            path: ['oceanShipment.containers'],
        });
    }
});

type FormData = z.infer<typeof formSchema>;

type FreightRate = {
    id: string;
    carrier: string;
    transitTime: string;
    cost: string;
    costValue: number;
    carrierLogo: string;
    dataAiHint: string;
};


export function FreightQuoteForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<FreightRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<FreightRate | null>(null);
  const [markup, setMarkup] = useState(15);
  const [oceanShipmentType, setOceanShipmentType] = useState<'FCL' | 'LCL'>('FCL');
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      modal: 'air',
      incoterm: 'FOB',
      origin: '',
      destination: '',
      airShipment: {
        pieces: [{ quantity: 1, length: 100, width: 100, height: 100, weight: 500 }],
        isStackable: false,
      },
      oceanShipmentType: 'FCL',
      oceanShipment: {
        containers: [{ type: "20'GP", quantity: 1 }],
      },
      lclDetails: {
        cbm: 1,
        weight: 1000,
      }
    },
  });

  const { fields: airPieces, append: appendAirPiece, remove: removeAirPiece } = useFieldArray({
    control: form.control,
    name: "airShipment.pieces",
  });

  const { fields: oceanContainers, append: appendOceanContainer, remove: removeOceanContainer } = useFieldArray({
    control: form.control,
    name: "oceanShipment.containers",
  });


  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setResults([]);
    setSelectedRate(null);
    
    const response = await runGetFreightRates(values);

    if (response.success) {
        setResults(response.data);
        toast({
            variant: "default",
            title: response.data.length > 0 ? "Cotações encontradas!" : "Nenhuma cotação encontrada",
            description: response.data.length > 0 ? `Encontramos ${response.data.length} opções para você.` : "Tente alterar os parâmetros da sua busca.",
        });
    } else {
        toast({
            variant: "destructive",
            title: "Erro ao buscar cotações",
            description: response.error,
        });
    }

    setIsLoading(false);
  }

  const handleSelectRate = (rate: any) => {
    if (!form.getValues('customerName')) {
        form.setFocus('customerName');
        toast({
            variant: 'destructive',
            title: "Cliente não informado",
            description: "Por favor, informe o nome do cliente antes de selecionar uma tarifa.",
        });
        return;
    }
    setSelectedRate(rate);
    setTimeout(() => {
        document.getElementById('quote-preparation')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const modal = form.watch('modal');

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Cotação de Frete Internacional</CardTitle>
          <CardDescription>Preencha os detalhes abaixo para buscar as melhores tarifas de frete aéreo e marítimo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder="Digite o nome ou busque um cliente existente" {...field} />
                      </FormControl>
                      <Button type="button" variant="outline" className="shrink-0">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Cadastrar
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Tabs 
                defaultValue="air" 
                className="w-full"
                onValueChange={(value) => {
                    form.setValue('modal', value as 'air' | 'ocean');
                    setSelectedRate(null);
                    setResults([]);
                }}
                value={modal}
              >
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="air"><Plane className="mr-2 h-4 w-4" />Aéreo</TabsTrigger>
                  <TabsTrigger value="ocean"><Ship className="mr-2 h-4 w-4" />Marítimo</TabsTrigger>
                </TabsList>
                
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <FormField control={form.control} name="origin" render={({ field }) => (
                        <FormItem><FormLabel>Origem (Porto/Aeroporto)</FormLabel><FormControl><Input placeholder="Ex: BRSSZ ou GRU" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem><FormLabel>Destino (Porto/Aeroporto)</FormLabel><FormControl><Input placeholder="Ex: NLRTM ou MIA" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField
                      control={form.control}
                      name="incoterm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incoterm</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EXW">EXW</SelectItem>
                              <SelectItem value="FCA">FCA</SelectItem>
                              <SelectItem value="FAS">FAS</SelectItem>
                              <SelectItem value="FOB">FOB</SelectItem>
                              <SelectItem value="CFR">CFR</SelectItem>
                              <SelectItem value="CIF">CIF</SelectItem>
                              <SelectItem value="CPT">CPT</SelectItem>
                              <SelectItem value="CIP">CIP</SelectItem>
                              <SelectItem value="DAP">DAP</SelectItem>
                              <SelectItem value="DPU">DPU</SelectItem>
                              <SelectItem value="DDP">DDP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <FormField control={form.control} name="departureDate" render={({ field }) => (
                    <FormItem className="flex flex-col mt-4"><FormLabel>Data de Embarque (Opcional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                    <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? (format(field.value, "PPP")) : (<span>Selecione a data</span>)}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )} />

                <Separator className="my-6" />

                <TabsContent value="air" className="m-0 space-y-4">
                    <h3 className="text-lg font-medium">Detalhes da Carga Aérea</h3>
                    {airPieces.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 border rounded-md items-end">
                            <FormField control={form.control} name={`airShipment.pieces.${index}.quantity`} render={({ field }) => (
                                <FormItem className="col-span-2 md:col-span-1"><FormLabel>Qtde</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.length`} render={({ field }) => (
                                <FormItem><FormLabel>Compr. (cm)</FormLabel><FormControl><Input type="number" placeholder="120" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.width`} render={({ field }) => (
                                <FormItem><FormLabel>Larg. (cm)</FormLabel><FormControl><Input type="number" placeholder="80" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.height`} render={({ field }) => (
                                <FormItem><FormLabel>Alt. (cm)</FormLabel><FormControl><Input type="number" placeholder="100" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`airShipment.pieces.${index}.weight`} render={({ field }) => (
                                <FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" placeholder="500" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeAirPiece(index)} disabled={airPieces.length <= 1}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex items-center justify-between">
                        <Button type="button" variant="outline" size="sm" onClick={() => appendAirPiece({ quantity: 1, length: 0, width: 0, height: 0, weight: 0 })}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Peça
                        </Button>
                        <FormField control={form.control} name="airShipment.isStackable" render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                <FormLabel>Empilhável?</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </TabsContent>
                <TabsContent value="ocean" className="m-0 space-y-4">
                    <h3 className="text-lg font-medium">Detalhes da Carga Marítima</h3>
                     <Tabs 
                        defaultValue="FCL" 
                        className="w-full"
                        onValueChange={(value) => {
                           const newType = value as 'FCL' | 'LCL';
                           setOceanShipmentType(newType);
                           form.setValue('oceanShipmentType', newType);
                        }}
                        value={oceanShipmentType}
                    >
                        <TabsList>
                            <TabsTrigger value="FCL">FCL (Contêiner)</TabsTrigger>
                            <TabsTrigger value="LCL">LCL (Carga Solta)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="FCL" className="mt-4 space-y-4">
                             {oceanContainers.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md items-end">
                                    <FormField control={form.control} name={`oceanShipment.containers.${index}.type`} render={({ field }) => (
                                        <FormItem><FormLabel>Tipo de Contêiner</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="20'GP">20' General Purpose</SelectItem>
                                                    <SelectItem value="40'GP">40' General Purpose</SelectItem>
                                                    <SelectItem value="40'HC">40' High Cube</SelectItem>
                                                    <SelectItem value="20'RF">20' Reefer</SelectItem>
                                                    <SelectItem value="40'RF">40' Reefer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name={`oceanShipment.containers.${index}.quantity`} render={({ field }) => (
                                        <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeOceanContainer(index)} disabled={oceanContainers.length <= 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                             <Button type="button" variant="outline" size="sm" onClick={() => appendOceanContainer({ type: "20'GP", quantity: 1 })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Contêiner
                            </Button>
                        </TabsContent>
                        <TabsContent value="LCL" className="mt-4">
                            <div className="grid md:grid-cols-2 gap-4 p-3 border rounded-md">
                                <FormField control={form.control} name="lclDetails.cbm" render={({ field }) => (
                                    <FormItem><FormLabel>Cubagem Total (CBM)</FormLabel><FormControl><Input type="number" placeholder="Ex: 2.5" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="lclDetails.weight" render={({ field }) => (
                                    <FormItem><FormLabel>Peso Bruto Total (kg)</FormLabel><FormControl><Input type="number" placeholder="Ex: 1200" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </TabsContent>
                    </Tabs>
                </TabsContent>
              </Tabs>
              
              <Button type="submit" disabled={isLoading} className="w-full text-base py-6">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando...</> : <><Search className="mr-2 h-4 w-4" /> Buscar Cotações</>}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isLoading && 
          <div className="text-center p-8 text-muted-foreground animate-pulse">
              <Loader2 className="mx-auto h-12 w-12 mb-4 animate-spin" />
              Buscando as melhores tarifas...
          </div>
      }

      {!isLoading && results.length > 0 && (
          <div className="space-y-6 animate-in fade-in-50 duration-500">
            <h2 className="text-2xl font-bold">Resultados da Cotação</h2>
            {results.map(result => (
                <Card key={result.id} className="flex flex-col md:flex-row items-center justify-between p-4 gap-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Image src={result.carrierLogo} alt={result.carrier} width={100} height={40} className="object-contain" data-ai-hint={result.dataAiHint} />
                        <div className="flex-grow">
                            <p className="font-bold text-lg">{result.carrier}</p>
                            <p className="text-sm text-muted-foreground">Tempo de trânsito: {result.transitTime}</p>
                        </div>
                    </div>
                    <div className="text-left md:text-right w-full md:w-auto">
                        <p className="text-xl font-bold text-primary">{result.cost}</p>
                        <p className="text-xs text-muted-foreground">Custo estimado</p>
                    </div>
                    <Button className="w-full md:w-auto" onClick={() => handleSelectRate(result)}>Selecionar Tarifa</Button>
                </Card>
            ))}
          </div>
      )}

       {!isLoading && results.length === 0 && (
        <div className="mt-8">
            <Alert>
                <Plane className="h-4 w-4" />
                <AlertTitle>Aguardando sua busca</AlertTitle>
                <AlertDescription>
                Preencha os dados da sua carga para encontrar as melhores opções de frete.
                </AlertDescription>
            </Alert>
        </div>
       )}

      {selectedRate && (
        <Card id="quote-preparation" className="mt-8 animate-in fade-in-50 duration-500">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Elaborar Cotação para: {form.getValues('customerName')}</CardTitle>
                        <CardDescription>Adicione sua margem e finalize a cotação para o cliente.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedRate(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-muted/50 flex justify-between items-center">
                    <div>
                        <p className="font-bold">{selectedRate.carrier}</p>
                        <p className="text-sm text-muted-foreground">Custo base: {selectedRate.cost}</p>
                    </div>
                    <p className="text-lg font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(selectedRate.costValue)}
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                        <Label htmlFor="markup">Margem de Lucro (%)</Label>
                        <Input 
                            id="markup"
                            type="number" 
                            value={markup}
                            onChange={(e) => setMarkup(Number(e.target.value))}
                            placeholder="Ex: 15"
                        />
                    </div>
                    <div className="p-4 rounded-md border bg-card">
                        <p className="text-sm text-muted-foreground">Preço Final para o Cliente</p>
                        <p className="text-2xl font-bold text-primary">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' }).format(selectedRate.costValue * (1 + markup / 100))}
                        </p>
                    </div>
                </div>
                
                <Separator />

                <div className="flex justify-end gap-2">
                    <Button variant="outline">Salvar como Rascunho</Button>
                    <Button>
                        <FileText className="mr-2 h-4 w-4" />
                        Gerar PDF da Cotação
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
