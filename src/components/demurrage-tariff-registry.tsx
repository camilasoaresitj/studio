
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DemurrageTariff, getDemurrageTariffs, saveDemurrageTariffs } from '@/lib/demurrage-tariffs-data';

const periodSchema = z.object({
  from: z.coerce.number().min(1, "Obrigatório"),
  to: z.coerce.number().optional(),
  rate: z.coerce.number().min(0, "Obrigatório"),
});

const tariffSchema = z.object({
  id: z.string().optional(),
  carrier: z.string().min(1, 'Nome do armador é obrigatório'),
  containerType: z.enum(['dry', 'reefer', 'special']),
  costPeriods: z.array(periodSchema).min(1, 'Adicione pelo menos um período de custo.'),
});

type TariffFormData = z.infer<typeof tariffSchema>;

export function DemurrageTariffRegistry() {
  const [tariffs, setTariffs] = useState<DemurrageTariff[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<DemurrageTariff | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTariffs(getDemurrageTariffs());
  }, []);

  const form = useForm<TariffFormData>({
    resolver: zodResolver(tariffSchema),
  });

  const { fields: costFields, append: appendCost, remove: removeCost } = useFieldArray({
    control: form.control,
    name: "costPeriods",
  });

  const handleOpenDialog = (tariff: DemurrageTariff | null) => {
    setEditingTariff(tariff);
    form.reset(tariff || {
      carrier: '',
      containerType: 'dry',
      costPeriods: [{ from: 1, to: 5, rate: 0 }],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TariffFormData) => {
    const newTariff: DemurrageTariff = {
      ...data,
      id: editingTariff?.id ?? `tariff-${data.carrier}-${data.containerType}-${Date.now()}`,
    };
    
    const currentTariffs = getDemurrageTariffs();
    let updatedTariffs;

    if (editingTariff) {
      updatedTariffs = currentTariffs.map(t => t.id === newTariff.id ? newTariff : t);
    } else {
      updatedTariffs = [...currentTariffs, newTariff];
    }

    saveDemurrageTariffs(updatedTariffs);
    setTariffs(updatedTariffs);
    
    setIsDialogOpen(false);
    setEditingTariff(null);
    toast({
      title: `Tarifa de Custo ${editingTariff ? 'atualizada' : 'adicionada'}!`,
      description: `A tarifa para "${data.carrier}" (${data.containerType}) foi salva com sucesso.`,
      className: 'bg-success text-success-foreground'
    });
  };

  const renderPeriodsTable = (periods: z.infer<typeof periodSchema>[]) => (
    <div className="flex flex-col gap-1">
        {periods.map((p, index) => (
            <div key={`${p.from}-${p.to}-${index}`} className="text-xs">
                <span className="font-semibold">{p.from} - {p.to || '...'} dias:</span> USD {p.rate.toFixed(2)}
            </div>
        ))}
    </div>
  );

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Tabela de Custos de Demurrage & Detention (Por Armador)</CardTitle>
                 <Button variant="outline" onClick={() => handleOpenDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Custo de Armador
                </Button>
            </div>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Armador</TableHead>
                            <TableHead>Tipo de Contêiner</TableHead>
                            <TableHead>Períodos de Custo (USD)</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tariffs.length > 0 ? (
                            tariffs.map((tariff) => (
                                <TableRow key={tariff.id}>
                                    <TableCell className="font-medium">{tariff.carrier}</TableCell>
                                    <TableCell className="font-medium capitalize">{tariff.containerType}</TableCell>
                                    <TableCell>{renderPeriodsTable(tariff.costPeriods)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tariff)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Nenhuma tarifa de custo cadastrada.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                <DialogTitle>{editingTariff ? 'Editar Custo de Armador' : 'Novo Custo de Armador'}</DialogTitle>
                <DialogDescription>
                    Defina os períodos e valores de custo para o armador e tipo de contêiner.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="carrier" render={({ field }) => (
                            <FormItem><FormLabel>Armador</FormLabel><FormControl><Input placeholder="Ex: Maersk" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="containerType" render={({ field }) => (
                            <FormItem><FormLabel>Tipo de Contêiner</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="dry">Dry</SelectItem>
                                        <SelectItem value="reefer">Reefer</SelectItem>
                                        <SelectItem value="special">Special (OT/FR)</SelectItem>
                                    </SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">Tabela de Custo</h4>
                         {costFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 mb-2">
                                <FormField control={form.control} name={`costPeriods.${index}.from`} render={({ field }) => (<FormItem><FormLabel>De</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`costPeriods.${index}.to`} render={({ field }) => (<FormItem><FormLabel>Até</FormLabel><FormControl><Input type="number" placeholder='(vazio)' {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`costPeriods.${index}.rate`} render={({ field }) => (<FormItem><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeCost(index)} className="self-end"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendCost({ from: 1, rate: 0 })}>Adicionar Período de Custo</Button>
                    </div>
                    
                    <DialogFooter className="pt-4">
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar Custo</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}

    
