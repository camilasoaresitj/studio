'use client';

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Trash2, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

const contactSchema = z.object({
  name: z.string().min(1, 'Nome do contato é obrigatório'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  department: z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação']),
});

const partnerSchema = z.object({
  name: z.string().min(2, 'O nome do parceiro é obrigatório'),
  type: z.enum(['Cliente', 'Fornecedor', 'Agente']),
  cnpj: z.string().optional(),
  paymentTerm: z.coerce.number().optional(),
  exchangeRateAgio: z.coerce.number().optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }),
  contacts: z.array(contactSchema).min(1, 'Adicione pelo menos um contato'),
});

export type Partner = z.infer<typeof partnerSchema> & { id: number };
type PartnerFormData = z.infer<typeof partnerSchema>;

interface PartnersRegistryProps {
  partners: Partner[];
  onPartnerAdded: (newPartner: Partner) => void;
}

export function PartnersRegistry({ partners, onPartnerAdded }: PartnersRegistryProps) {
  const [open, setOpen] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const { toast } = useToast();

  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      name: '',
      type: 'Cliente',
      cnpj: '',
      paymentTerm: undefined,
      exchangeRateAgio: undefined,
      address: {
        street: '',
        number: '',
        complement: '',
        district: '',
        city: '',
        state: '',
        zip: '',
      },
      contacts: [
        { name: '', email: '', phone: '', department: 'Comercial' }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  const onSubmit = (data: PartnerFormData) => {
    onPartnerAdded({
      id: Math.random(), // simple id generation
      ...data,
    });
    form.reset();
    setOpen(false);
    toast({
      title: 'Parceiro Adicionado!',
      description: `${data.name} foi adicionado à sua lista de parceiros.`,
      className: 'bg-success text-success-foreground'
    })
  };

  const handleFetchCnpj = async () => {
    const cnpj = form.getValues('cnpj')?.replace(/\D/g, '');
    if (!cnpj || cnpj.length !== 14) {
      toast({ variant: 'destructive', title: 'CNPJ inválido', description: 'Por favor, digite um CNPJ válido com 14 dígitos.' });
      return;
    }
    setIsFetchingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) {
        throw new Error('Não foi possível buscar os dados do CNPJ. Verifique o número e tente novamente.');
      }
      const data = await response.json();
      
      form.setValue('name', data.razao_social || '');
      form.setValue('address.street', data.logradouro || '');
      form.setValue('address.number', data.numero || '');
      form.setValue('address.complement', data.complemento || '');
      form.setValue('address.district', data.bairro || '');
      form.setValue('address.city', data.municipio || '');
      form.setValue('address.state', data.uf || '');
      form.setValue('address.zip', data.cep?.replace(/\D/g, '') || '');

      toast({ title: 'Dados do CNPJ preenchidos!', description: `Os dados de ${data.razao_social} foram carregados.` });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CNPJ', description: error.message });
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const getPartnerTypeVariant = (type: Partner['type']): 'default' | 'secondary' | 'outline' => {
      switch (type) {
          case 'Cliente': return 'default';
          case 'Fornecedor': return 'secondary';
          case 'Agente': return 'outline';
          default: return 'default';
      }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Parceiros</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Parceiro
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Parceiro</DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente, fornecedor ou agente.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="cnpj" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>CNPJ (Opcional)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} />
                          </FormControl>
                          <Button type="button" onClick={handleFetchCnpj} disabled={isFetchingCnpj}>
                            {isFetchingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                     )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Cliente">Cliente</SelectItem>
                                <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                                <SelectItem value="Agente">Agente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome / Razão Social</FormLabel>
                      <FormControl><Input placeholder="Nome da empresa" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                <Separator className="my-4" />
                <h4 className="text-md font-semibold">Informações Financeiras</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="paymentTerm" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Prazo de Pagamento (dias)</FormLabel>
                            <FormControl><Input type="number" placeholder="Ex: 30" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="exchangeRateAgio" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ágio sobre o Câmbio (%)</FormLabel>
                            <FormControl><Input type="number" step="0.1" placeholder="Ex: 2.5" {...field} value={field.value ?? ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                  <Separator className="my-4" />
                  <h4 className="text-md font-semibold">Endereço</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="address.zip" render={({ field }) => (
                          <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="address.street" render={({ field }) => (
                          <FormItem className="md:col-span-2"><FormLabel>Rua</FormLabel><FormControl><Input placeholder="Av. Paulista" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="address.number" render={({ field }) => (
                          <FormItem><FormLabel>Número</FormLabel><FormControl><Input placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="address.complement" render={({ field }) => (
                          <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Sala 101" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="address.district" render={({ field }) => (
                          <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input placeholder="Bela Vista" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="address.city" render={({ field }) => (
                          <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input placeholder="São Paulo" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                       <FormField control={form.control} name="address.state" render={({ field }) => (
                          <FormItem><FormLabel>Estado</FormLabel><FormControl><Input placeholder="SP" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-semibold">Contatos</h4>
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', email: '', phone: '', department: 'Comercial' })}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Contato
                    </Button>
                  </div>
                   {fields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-lg space-y-4 relative">
                        {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <FormField control={form.control} name={`contacts.${index}.name`} render={({ field }) => (
                          <FormItem><FormLabel>Nome do Contato</FormLabel><FormControl><Input placeholder="João da Silva" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`contacts.${index}.email`} render={({ field }) => (
                            <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="contato@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field }) => (
                            <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input placeholder="11999998888" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </div>
                        <FormField control={form.control} name={`contacts.${index}.department`} render={({ field }) => (
                          <FormItem><FormLabel>Departamento</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                  <SelectItem value="Comercial">Comercial</SelectItem>
                                  <SelectItem value="Operacional">Operacional</SelectItem>
                                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                                  <SelectItem value="Importação">Importação</SelectItem>
                                  <SelectItem value="Exportação">Exportação</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                  ))}
                <DialogFooter className="pt-4">
                  <Button type="submit">Salvar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contato Principal</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => {
              const primaryContact = partner.contacts.find(c => c.department === 'Comercial') || partner.contacts[0];
              return (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell>
                    <Badge variant={getPartnerTypeVariant(partner.type)}>{partner.type}</Badge>
                  </TableCell>
                  <TableCell>{primaryContact?.email || 'N/A'}</TableCell>
                  <TableCell>{primaryContact?.phone || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
