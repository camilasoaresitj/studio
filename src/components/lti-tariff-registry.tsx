
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LtiTariff, getLtiTariffs, saveLtiTariffs } from '@/lib/lti-tariffs-data';

const periodSchema = z.object({
  from: z.coerce.number().min(1, "Obrigatório"),
  to: z.coerce.number().optional(),
  rate: z.coerce.number().min(0, "Obrigatório"),
});

const tariffSchema = z.object({
  id: z.string().optional(),
  containerType: z.enum(['dry', 'reefer', 'special']),
  salePeriods: z.array(periodSchema).min(1, 'Adicione pelo menos um período de venda.'),
});

type TariffFormData = z.infer<typeof tariffSchema>;

export function LtiTariffRegistry() {
  const [tariffs, setTariffs] = useState<LtiTariff[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState<LtiTariff | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTariffs(getLtiTariffs());
  }, []);

  const form = useForm<TariffFormData>({
    resolver: zodResolver(tariffSchema),
  });

  const { fields: saleFields, append: appendSale, remove: removeSale } = useFieldArray({
    control: form.control,
    name: "salePeriods",
  });

  const handleOpenDialog = (tariff: LtiTariff | null) => {
    setEditingTariff(tariff);
    form.reset(tariff || {
      containerType: 'dry',
      salePeriods: [{ from: 1, to: 5, rate: 0 }],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: TariffFormData) => {
    const newTariff: LtiTariff = {
      ...data,
      id: editingTariff?.id ?? `lti-tariff-${data.containerType}-${Date.now()}`,
    };
    
    const currentTariffs = getLtiTariffs();
    let updatedTariffs;

    if (editingTariff) {
      updatedTariffs = currentTariffs.map(t => t.id === newTariff.id ? newTariff : t);
    } else {
      updatedTariffs = [...currentTariffs, newTariff];
    }

    saveLtiTariffs(updatedTariffs);
    setTariffs(updatedTariffs);
    
    setIsDialogOpen(false);
    setEditingTariff(null);
    toast({
      title: `Tarifa de Venda ${editingTariff ? 'atualizada' : 'adicionada'}!`,
      description: `Sua tarifa de venda para contêineres (${data.containerType}) foi salva com sucesso.`,
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
                <CardTitle>Tabela de Venda LTI de Demurrage & Detention</CardTitle>
                 <Button variant="outline" onClick={() => handleOpenDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Tarifa de Venda
                </Button>
            </div>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo de Contêiner</TableHead>
                            <TableHead>Períodos de Venda (USD)</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tariffs.length > 0 ? (
                            tariffs.map((tariff) => (
                                <TableRow key={tariff.id}>
                                    <TableCell className="font-medium capitalize">{tariff.containerType}</TableCell>
                                    <TableCell>{renderPeriodsTable(tariff.salePeriods)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(tariff)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    Nenhuma tarifa de venda cadastrada.
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
                <DialogTitle>{editingTariff ? 'Editar Tarifa de Venda' : 'Nova Tarifa de Venda'}</DialogTitle>
                <DialogDescription>
                    Defina os períodos e valores de venda para o tipo de contêiner.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
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

                    <div>
                        <h4 className="font-semibold mb-2">Tabela de Venda</h4>
                         {saleFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2 mb-2">
                                <FormField control={form.control} name={`salePeriods.${index}.from`} render={({ field }) => (<FormItem><FormLabel>De</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`salePeriods.${index}.to`} render={({ field }) => (<FormItem><FormLabel>Até</FormLabel><FormControl><Input type="number" placeholder='(vazio)' {...field} /></FormControl></FormItem>)} />
                                <FormField control={form.control} name={`salePeriods.${index}.rate`} render={({ field }) => (<FormItem><FormLabel>Valor (USD)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeSale(index)} className="self-end"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => appendSale({ from: 1, rate: 0 })}>Adicionar Período de Venda</Button>
                    </div>
                    
                    <DialogFooter className="pt-4">
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="submit">Salvar Tarifa</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
