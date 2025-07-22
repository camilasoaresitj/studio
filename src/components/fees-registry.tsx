

'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
  DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export type Fee = {
    id: number;
    name: string;
    value: string;
    currency: 'BRL' | 'USD' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
    type: 'Fixo' | 'Percentual' | 'W/M' | 'Opcional' | 'KG';
    unit: string;
    modal: 'Marítimo' | 'Aéreo' | 'Ambos';
    direction: 'Importação' | 'Exportação' | 'Ambos';
    chargeType?: 'FCL' | 'LCL' | 'Aéreo';
    minValue?: number;
};

const feeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  value: z.string().min(1, 'Valor é obrigatório'),
  currency: z.enum(['BRL', 'USD', 'EUR', 'JPY', 'CHF', 'GBP']),
  type: z.enum(['Fixo', 'Percentual', 'W/M', 'Opcional', 'KG']),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  modal: z.enum(['Marítimo', 'Aéreo', 'Ambos']),
  direction: z.enum(['Importação', 'Exportação', 'Ambos']),
  chargeType: z.enum(['FCL', 'LCL', 'Aéreo', 'NONE']).optional(),
  minValue: z.coerce.number().optional(),
});

type FeeFormData = z.infer<typeof feeSchema>;

interface FeesRegistryProps {
    fees: Fee[];
    onSave: (fee: Fee) => void;
}

export function FeesRegistry({ fees, onSave }: FeesRegistryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [modalFilter, setModalFilter] = useState('Todos');
  const [directionFilter, setDirectionFilter] = useState('Todos');
  const { toast } = useToast();

  const form = useForm<FeeFormData>({
    resolver: zodResolver(feeSchema),
  });

  const handleOpenDialog = (fee: Fee | null) => {
    setEditingFee(fee);
    form.reset(fee ? {
        ...fee,
        chargeType: fee.chargeType || 'NONE',
        value: String(fee.value),
        minValue: fee.minValue || undefined
    } : {
        name: '',
        value: '',
        currency: 'BRL',
        type: 'Fixo',
        unit: 'Contêiner',
        modal: 'Marítimo',
        direction: 'Importação',
        chargeType: 'FCL',
        minValue: undefined,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: FeeFormData) => {
    const feeNameToSave = data.name.toUpperCase();
    onSave({
      ...data,
      name: feeNameToSave,
      id: editingFee?.id ?? 0,
      chargeType: data.chargeType === 'NONE' ? undefined : data.chargeType as Fee['chargeType'],
    });
    setIsDialogOpen(false);
    setEditingFee(null);
    toast({
      title: `Taxa ${editingFee ? 'atualizada' : 'adicionada'}!`,
      description: `A taxa "${feeNameToSave}" foi salva com sucesso.`,
      className: 'bg-success text-success-foreground'
    });
  };

  const filteredFees = useMemo(() => {
    return fees.filter(fee => {
        const modalMatch = modalFilter === 'Todos' || fee.modal === modalFilter || fee.modal === 'Ambos';
        const directionMatch = directionFilter === 'Todos' || fee.direction === directionFilter || fee.direction === 'Ambos';
        return modalMatch && directionMatch;
    });
  }, [fees, modalFilter, directionFilter]);

  return (
    <div className="mt-8">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Taxas Padrão</h3>
            <Button variant="outline" onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Taxa
            </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <Select value={modalFilter} onValueChange={setModalFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por modal" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todos">Todos os Modais</SelectItem>
                    <SelectItem value="Marítimo">Marítimo</SelectItem>
                    <SelectItem value="Aéreo">Aéreo</SelectItem>
                </SelectContent>
            </Select>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por direção" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todos">Todas as Direções</SelectItem>
                    <SelectItem value="Importação">Importação</SelectItem>
                    <SelectItem value="Exportação">Exportação</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome da Taxa</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Modal</TableHead>
                        <TableHead>Direção</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredFees.length > 0 ? (
                        filteredFees.map((fee) => (
                            <TableRow key={fee.id}>
                                <TableCell className="font-medium">{fee.name}</TableCell>
                                <TableCell>{fee.currency} {fee.value}</TableCell>
                                <TableCell>{fee.type}</TableCell>
                                <TableCell>{fee.modal}</TableCell>
                                <TableCell>{fee.direction}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(fee)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Nenhuma taxa encontrada com os filtros selecionados.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingFee ? 'Editar Taxa' : 'Adicionar Nova Taxa'}</DialogTitle>
              <DialogDescription>
                Preencha os dados da taxa padrão para cotações.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nome da Taxa</FormLabel><FormControl><Input placeholder="Ex: THC" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="value" render={({ field }) => (
                        <FormItem><FormLabel>Valor</FormLabel><FormControl><Input type="text" placeholder="Ex: 1350 ou 0.3" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem><FormLabel>Moeda</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="BRL">BRL</SelectItem>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="JPY">JPY</SelectItem>
                                  <SelectItem value="CHF">CHF</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Cálculo</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="Fixo">Fixo</SelectItem>
                                  <SelectItem value="Percentual">Percentual</SelectItem>
                                  <SelectItem value="W/M">W/M</SelectItem>
                                  <SelectItem value="KG">KG</SelectItem>
                                  <SelectItem value="Opcional">Opcional</SelectItem>
                              </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Unidade</FormLabel><FormControl><Input placeholder="Ex: Contêiner" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="minValue" render={({ field }) => (
                    <FormItem><FormLabel>Valor Mínimo (Opcional)</FormLabel><FormControl><Input type="number" placeholder="Ex: 50" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="modal" render={({ field }) => (
                        <FormItem><FormLabel>Modal</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="Marítimo">Marítimo</SelectItem>
                                  <SelectItem value="Aéreo">Aéreo</SelectItem>
                                  <SelectItem value="Ambos">Ambos</SelectItem>
                              </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="direction" render={({ field }) => (
                        <FormItem><FormLabel>Direção</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="Importação">Importação</SelectItem>
                                  <SelectItem value="Exportação">Exportação</SelectItem>
                                  <SelectItem value="Ambos">Ambos</SelectItem>
                              </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                </div>

                <FormField control={form.control} name="chargeType" render={({ field }) => (
                    <FormItem><FormLabel>Tipo de Carga (Opcional)</FormLabel>
                         <Select onValueChange={field.onChange} value={field.value || 'NONE'}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                          <SelectContent>
                              <SelectItem value="NONE">Nenhum</SelectItem>
                              <SelectItem value="FCL">FCL</SelectItem>
                              <SelectItem value="LCL">LCL</SelectItem>
                              <SelectItem value="Aéreo">Aéreo</SelectItem>
                          </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                
                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Salvar Taxa</Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
