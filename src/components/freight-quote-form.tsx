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
import { Plane, Ship, Calendar as CalendarIcon, PlusCircle, Trash2, Loader2, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

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

const formSchema = z.object({
  modal: z.enum(['air', 'ocean']),
  origin: z.string().min(3, { message: "Origem obrigatória (mínimo 3 caracteres)." }),
  destination: z.string().min(3, { message: "Destino obrigatório (mínimo 3 caracteres)." }),
  departureDate: z.date().optional(),
  
  airShipment: z.object({
    pieces: z.array(airPieceSchema).min(1, "Adicione pelo menos uma peça."),
    isStackable: z.boolean().default(false),
  }),

  oceanShipment: z.object({
    containers: z.array(oceanContainerSchema).min(1, "Adicione pelo menos um contêiner."),
  }),
}).refine(data => {
    if (data.modal === 'air') {
        return data.airShipment.pieces.length > 0;
    }
    if (data.modal === 'ocean') {
        return data.oceanShipment.containers.length > 0;
    }
    return true;
}, {
    message: "Detalhes da carga são obrigatórios.",
    path: ['airShipment'] // you can choose a path to display the error
});

type FormData = z.infer<typeof formSchema>;

const mockResults = [
  { id: 1, carrier: 'LATAM Cargo', transitTime: '1-2 dias', cost: 'USD 4.50 / kg', carrierLogo: 'https://placehold.co/120x40', dataAiHint: 'airline logo' },
  { id: 2, carrier: 'Lufthansa Cargo', transitTime: '1-2 dias', cost: 'USD 3.80 / kg', carrierLogo: 'https://placehold.co/120x40', dataAiHint: 'airline logo' },
  { id: 3, carrier: 'Maersk', transitTime: '25-30 dias', cost: 'USD 2,500 / TEU', carrierLogo: 'https://placehold.co/120x40', dataAiHint: 'shipping company logo' },
  { id: 4, carrier: 'CMA CGM', transitTime: '35-40 dias', cost: 'USD 2,200 / TEU', carrierLogo: 'https://placehold.co/120x40', dataAiHint: 'shipping company logo' },
];

export function FreightQuoteForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modal: 'air',
      origin: '',
      destination: '',
      airShipment: {
        pieces: [{ quantity: 1, length: 100, width: 100, height: 100, weight: 500 }],
        isStackable: false,
      },
      oceanShipment: {
        containers: [{ type: "20'GP", quantity: 1 }],
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
    console.log(values);

    // Simulate API call
    setTimeout(() => {
        const filteredResults = values.modal === 'air'
            ? mockResults.filter(r => r.cost.includes('kg'))
            : mockResults.filter(r => r.cost.includes('TEU'));

      setResults(filteredResults);
      setIsLoading(false);
      toast({
        variant: "default",
        title: "Cotações encontradas!",
        description: `Encontramos ${filteredResults.length} opções para você.`,
      });
    }, 1500);
  }

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
              <Tabs 
                defaultValue="air" 
                className="w-full"
                onValueChange={(value) => form.setValue('modal', value as 'air' | 'ocean')}
                value={modal}
              >
                <TabsList className="grid w-full grid-cols-2 max-w-sm">
                  <TabsTrigger value="air"><Plane className="mr-2 h-4 w-4" />Aéreo</TabsTrigger>
                  <TabsTrigger value="ocean"><Ship className="mr-2 h-4 w-4" />Marítimo</TabsTrigger>
                </TabsList>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                    <FormField control={form.control} name="origin" render={({ field }) => (
                        <FormItem><FormLabel>Cidade ou Porto de Origem</FormLabel><FormControl><Input placeholder="Ex: São Paulo, Brasil" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="destination" render={({ field }) => (
                        <FormItem><FormLabel>Cidade ou Porto de Destino</FormLabel><FormControl><Input placeholder="Ex: Miami, EUA" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
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
              <Loader2 className="mx-auto h-12 w-12 mb-4" />
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
                    <Button className="w-full md:w-auto">Selecionar Tarifa</Button>
                </Card>
            ))}
          </div>
      )}
       {!isLoading && results.length === 0 && (
          <Alert>
            <Plane className="h-4 w-4" />
            <AlertTitle>Aguardando sua busca</AlertTitle>
            <AlertDescription>
              Preencha os dados da sua carga para encontrar as melhores opções de frete.
            </AlertDescription>
          </Alert>
       )}
    </div>
  );
}
