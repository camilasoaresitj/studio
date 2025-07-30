
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Upload, User, Image as ImageIcon, CalendarIcon, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '../ui/input';
import Image from 'next/image';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';

const permissionsSchema = z.object({
    gerencial: z.boolean().default(false),
    comercial: z.boolean().default(false),
    operacional: z.boolean().default(false),
    financeiro: z.boolean().default(false),
    demurrage: z.boolean().default(false),
    schedules: z.boolean().default(false),
    configuracoes: z.boolean().default(false),
});

const userSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  role: z.enum(['Administrador', 'Comercial', 'Operacional', 'Financeiro', 'Comum']),
  status: z.string(),
  signatureUrl: z.string().url().optional(),
  admissionDate: z.date().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  rg: z.string().optional(),
  cpf: z.string().optional(),
  permissions: permissionsSchema,
  gmailEmail: z.string().email({ message: "E-mail do Gmail inválido." }).optional().or(z.literal('')),
  gmailAppPassword: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const initialUsers: UserFormData[] = [
    { id: 1, name: 'Admin Geral', email: 'admin@cargainteligente.com', role: 'Administrador', status: 'Ativo', signatureUrl: 'https://placehold.co/200x60.png?text=Assinatura', permissions: { gerencial: true, comercial: true, operacional: true, financeiro: true, demurrage: true, schedules: true, configuracoes: true } },
    { id: 2, name: 'Usuário Comercial', email: 'comercial@cargainteligente.com', role: 'Comercial', status: 'Ativo', permissions: { gerencial: false, comercial: true, operacional: false, financeiro: false, demurrage: false, schedules: true, configuracoes: false } },
    { id: 3, name: 'Usuário Operacional', email: 'operacional@cargainteligente.com', role: 'Operacional', status: 'Ativo', permissions: { gerencial: false, comercial: false, operacional: true, financeiro: false, demurrage: true, schedules: true, configuracoes: false } },
    { id: 4, name: 'Usuário Financeiro', email: 'financeiro@cargainteligente.com', role: 'Financeiro', status: 'Ativo', permissions: { gerencial: false, comercial: false, operacional: false, financeiro: true, demurrage: true, schedules: false, configuracoes: false } },
    { id: 5, name: 'Usuário Inativo', email: 'inativo@cargainteligente.com', role: 'Comercial', status: 'Inativo', permissions: { gerencial: false, comercial: false, operacional: false, financeiro: false, demurrage: false, schedules: false, configuracoes: false } },
];

const permissionLabels: { key: keyof z.infer<typeof permissionsSchema>; label: string }[] = [
    { key: 'gerencial', label: 'Gerencial' },
    { key: 'comercial', label: 'Comercial' },
    { key: 'operacional', label: 'Operacional' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'demurrage', label: 'Demurrage' },
    { key: 'schedules', label: 'Schedules' },
    { key: 'configuracoes', label: 'Configurações' },
];


export function UserManagementTable() {
    const [users, setUsers] = useState<UserFormData[]>(initialUsers);
    const [editingUser, setEditingUser] = useState<UserFormData | null>(null);
    const { toast } = useToast();

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
    });
    
    const handleOpenDialog = (user: UserFormData | null) => {
        setEditingUser(user);
        if (user) {
            form.reset(user);
        } else {
            form.reset({
                id: Math.max(...users.map(u => u.id)) + 1,
                name: '',
                email: '',
                role: 'Comum',
                status: 'Ativo',
                signatureUrl: undefined,
                admissionDate: undefined,
                phone: undefined,
                address: undefined,
                rg: undefined,
                cpf: undefined,
                permissions: { gerencial: false, comercial: true, operacional: false, financeiro: false, demurrage: false, schedules: false, configuracoes: false },
                gmailEmail: '',
                gmailAppPassword: ''
            });
        }
    };

    const onSubmit = (data: UserFormData) => {
        let updatedUsers;
        const isNewUser = !users.some(u => u.id === data.id);
        
        if (isNewUser) {
            updatedUsers = [...users, data];
        } else {
            updatedUsers = users.map(u => u.id === data.id ? data : u);
        }
        
        setUsers(updatedUsers);
        setEditingUser(null);
        toast({
            title: `Usuário ${isNewUser ? 'adicionado' : 'atualizado'}!`,
            description: `Os dados de ${data.name} foram salvos com sucesso.`,
            className: 'bg-success text-success-foreground'
        });
    };
    
    const handleSignatureUpload = (file: File | null) => {
        if (!file || !editingUser) return;
        const signatureUrl = URL.createObjectURL(file);
        form.setValue('signatureUrl', signatureUrl);
        toast({ title: 'Assinatura carregada!', description: 'Clique em "Salvar Alterações" para confirmar.', className: 'bg-primary text-primary-foreground' });
    }

  return (
    <>
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Convidar Novo Usuário
            </Button>
        </div>
        <div className="border rounded-lg">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {users.map((user) => (
                <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                </TableCell>
                <TableCell>
                    <Badge variant={user.status === 'Ativo' ? 'success' : 'destructive'}>
                        {user.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
    </div>
    <Dialog open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>{editingUser?.id ? 'Editar Funcionário' : 'Novo Funcionário'}: {editingUser?.name || ''}</DialogTitle>
                <DialogDescription>
                    Gerencie os dados e a assinatura do usuário.
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[65vh] pr-4">
                <div className="py-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem><FormLabel>E-mail de Acesso</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="cpf" render={({ field }) => (
                            <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                         <FormField control={form.control} name="rg" render={({ field }) => (
                            <FormItem><FormLabel>RG</FormLabel><FormControl><Input placeholder="00.000.000-0" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input placeholder="Rua, número, cidade, estado, CEP" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField
                            control={form.control}
                            name="admissionDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                <FormLabel>Data de Admissão</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                        variant={"outline"}
                                        className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}
                                        >
                                        <span>
                                            {field.value ? (format(field.value, "PPP")) : (<span>Selecione a data</span>)}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </span>
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    <div className="flex flex-col items-center text-center p-6 border-2 border-dashed rounded-lg">
                        {form.watch('signatureUrl') ? (
                            <Image src={form.watch('signatureUrl')!} alt="Assinatura" width={200} height={60} className="mb-4" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-20 mb-4 text-muted-foreground">
                                <ImageIcon className="h-8 w-8" />
                                <span className="text-sm mt-2">Nenhuma assinatura cadastrada</span>
                            </div>
                        )}
                        <h3 className="text-lg font-semibold">Assinatura Digitalizada</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                            Faça o upload de uma imagem .png com fundo transparente.
                        </p>
                        <Button asChild variant="outline" type="button">
                            <label htmlFor="signature-upload">
                                <Upload className="mr-2 h-4 w-4" />
                                {form.watch('signatureUrl') ? 'Alterar Assinatura' : 'Carregar Assinatura'}
                                <Input id="signature-upload" type="file" className="hidden" accept="image/png" onChange={(e) => handleSignatureUpload(e.target.files?.[0] || null)} />
                            </label>
                        </Button>
                    </div>

                     <Separator />
                     
                     <div>
                        <FormLabel className="text-base font-semibold flex items-center gap-2"><KeyRound/> Permissões de Acesso</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 mt-2 border rounded-lg">
                            {permissionLabels.map(({ key, label }) => (
                                <FormField
                                    key={key}
                                    control={form.control}
                                    name={`permissions.${key}`}
                                    render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">{label}</FormLabel>
                                    </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                     </div>
                     
                     <Separator />

                     <div>
                        <FormLabel className="text-base font-semibold flex items-center gap-2"><KeyRound/> Credenciais do Gmail</FormLabel>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                             <FormField control={form.control} name="gmailEmail" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-mail do Gmail</FormLabel>
                                    <FormControl><Input placeholder="seu-email@gmail.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="gmailAppPassword" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha de Aplicativo do Gmail</FormLabel>
                                    <FormControl><Input type="password" placeholder="•••• •••• •••• ••••" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                     </div>


                </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
                 <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                 <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
            </form>
            </Form>
        </DialogContent>
    </Dialog>
    </>
  );
}
