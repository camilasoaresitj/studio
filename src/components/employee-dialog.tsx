
'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { employeeSchema, Employee } from '@/lib/employee-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  employee: Employee | null;
}

const permissionLabels: { key: keyof Employee['permissions']; label: string }[] = [
    { key: 'gerencial', label: 'Dashboard' },
    { key: 'comercial', label: 'Comercial' },
    { key: 'operacional', label: 'Operacional' },
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'rh', label: 'RH' },
    { key: 'demurrage', label: 'Demurrage' },
    { key: 'simulador', label: 'Simulador DI' },
    { key: 'cadastros', label: 'Cadastros' },
];


export function EmployeeDialog({ isOpen, onClose, onSave, employee }: EmployeeDialogProps) {
  const form = useForm<Employee>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      status: 'Ativo',
      benefits: { hasHealthPlan: false, hasMealVoucher: false },
      permissions: { gerencial: false, comercial: true, operacional: false, financeiro: false, rh: false, demurrage: false, simulador: false, cadastros: false },
    }
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        ...employee,
        admissionDate: employee.admissionDate ? new Date(employee.admissionDate) : undefined,
        dismissalDate: employee.dismissalDate ? new Date(employee.dismissalDate) : undefined,
        birthDate: employee.birthDate ? new Date(employee.birthDate) : undefined,
      });
    } else {
      form.reset({
        id: 0,
        name: '',
        role: '',
        workRegime: 'CLT',
        salary: 0,
        status: 'Ativo',
        vacationDays: 30,
        benefits: { hasHealthPlan: false, mealVoucherValue: 0, hasMealVoucher: false },
        birthDate: undefined,
        phone: '',
        address: '',
        admissionDate: new Date(),
        dismissalDate: undefined,
        systemAccess: { email: '', password: '' },
        awards: { balance: 0, cajuCardNumber: '' },
        permissions: { gerencial: false, comercial: true, operacional: false, financeiro: false, rh: false, demurrage: false, simulador: false, cadastros: false },
      });
    }
  }, [employee, form]);

  const onSubmit = (data: Employee) => {
    onSave({ ...data, id: employee?.id ?? 0 });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{employee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          <DialogDescription>Preencha os dados cadastrais do funcionário.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <ScrollArea className="h-[65vh] pr-4">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Cargo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />
                <h3 className="text-md font-semibold">Informações Pessoais</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="birthDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data de Nascimento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />
                <h3 className="text-md font-semibold">Detalhes do Contrato</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="workRegime" render={({ field }) => (<FormItem><FormLabel>Regime</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="CLT">CLT</SelectItem><SelectItem value="PJ">PJ</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salário (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="admissionDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data de Admissão</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="dismissalDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Data de Desligamento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn(!field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione</span>}</Button></FormControl></PopoverTrigger><PopoverContent><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="vacationDays" render={({ field }) => (<FormItem><FormLabel>Dias de Férias</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <Separator />
                <h3 className="text-md font-semibold">Benefícios</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <FormField control={form.control} name="benefits.hasHealthPlan" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label>Plano de Saúde</Label></FormItem>)} />
                    <FormField control={form.control} name="benefits.hasMealVoucher" render={({ field }) => (<FormItem className="flex items-center gap-2 space-y-0 pt-6"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><Label>Vale Alimentação/Refeição</Label></FormItem>)} />
                    <FormField control={form.control} name="benefits.mealVoucherValue" render={({ field }) => (<FormItem><FormLabel>Valor do VA/VR (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                
                <Separator />
                <h3 className="text-md font-semibold">Acessos e Premiações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="systemAccess.email" render={({ field }) => (<FormItem><FormLabel>E-mail de Acesso</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="systemAccess.password" render={({ field }) => (<FormItem><FormLabel>Senha de Acesso</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="awards.cajuCardNumber" render={({ field }) => (<FormItem><FormLabel>Cartão CAJU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="awards.balance" render={({ field }) => (<FormItem><FormLabel>Saldo de Prêmios (BRL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>

                <Separator />
                <div>
                    <FormLabel className="text-base font-semibold flex items-center gap-2"><KeyRound /> Permissões de Acesso ao Sistema</FormLabel>
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
            </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
