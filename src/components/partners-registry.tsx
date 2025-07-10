
'use client';

import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { partnerSchema, type Partner } from '@/lib/partners-data';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from './ui/checkbox';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

type PartnerFormData = import('zod').z.infer<typeof partnerSchema>;

interface PartnersRegistryProps {
  partners: Partner[];
  onPartnerSaved: (partner: Partner) => void;
}

const departmentEnum = ['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'];

export function PartnersRegistry({ partners, onPartnerSaved }: PartnersRegistryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'contacts',
  });

  const handleOpenDialog = (partner: Partner | null) => {
    setEditingPartner(partner);
    form.reset(
      partner || {
        name: '',
        roles: { cliente: false, fornecedor: false, agente: false, comissionado: false },
        contacts: [{ name: '', email: '', phone: '', departments: [] }],
      }
    );
    setIsDialogOpen(true);
  };

  const onSubmit = (data: PartnerFormData) => {
    onPartnerSaved({
      ...data,
      id: editingPartner?.id ?? 0, // Let the parent component assign the final ID
    });
    setIsDialogOpen(false);
    setEditingPartner(null);
    toast({
      title: `Parceiro ${editingPartner ? 'atualizado' : 'adicionado'}!`,
      description: `O parceiro "${data.name}" foi salvo com sucesso.`,
      className: 'bg-success text-success-foreground',
    });
  };

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) =>
      partner.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [partners, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar parceiro por nome..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Parceiro
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Funções</TableHead>
              <TableHead>Contato Principal</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(partner.roles)
                      .filter(([, value]) => value)
                      .map(([role]) => (
                        <Badge key={role} variant="secondary" className="capitalize">
                          {role}
                        </Badge>
                      ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{partner.contacts[0]?.name}</div>
                  <div className="text-xs text-muted-foreground">{partner.contacts[0]?.email}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(partner)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do seu cliente, fornecedor ou agente.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex-grow overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome / Razão Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da empresa" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Funções do Parceiro</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <FormField
                    control={form.control}
                    name="roles.cliente"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Cliente</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roles.fornecedor"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Fornecedor</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roles.agente"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">Agente</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </FormItem>
              
              <Separator />

              <div className="flex justify-between items-center">
                <h4 className="text-md font-semibold">Contatos</h4>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', departments: [] })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Contato
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`contacts.${index}.name`} render={({ field }) => (
                      <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contact@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field }) => (
                      <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="+1 555-555-5555" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`contacts.${index}.departments`} render={() => (
                      <FormItem>
                        <FormLabel>Departamentos</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                          {departmentEnum.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name={`contacts.${index}.departments`}
                              render={({ field }) => (
                                <FormItem key={item} className="flex flex-row items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(item)}
                                      onCheckedChange={(checked) => {
                                        const currentValue = field.value || [];
                                        return checked
                                          ? field.onChange([...currentValue, item])
                                          : field.onChange(currentValue.filter((value) => value !== item));
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">{item}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              ))}
               <DialogFooter className="pt-4 !mt-8">
                  <DialogClose asChild>
                      <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit">Salvar Parceiro</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
