
'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Zap, Workflow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import {
  TaskAutomationRule,
  taskAutomationRuleSchema,
  serviceConditionEnum,
  getTaskAutomationRules,
  saveTaskAutomationRules
} from '@/lib/task-automation-data';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';

type RuleFormData = TaskAutomationRule;

const serviceConditionLabels: Record<z.infer<typeof serviceConditionEnum>, string> = {
    'DESPACHO_ADUANEIRO': 'Despacho Aduaneiro',
    'SEGURO_INTERNACIONAL': 'Seguro Internacional',
    'ENTREGA': 'Entrega',
    'TRADING': 'Trading',
    'REDESTINACAO': 'Redestinação',
};


export function TaskAutomationRegistry() {
  const [rules, setRules] = useState<TaskAutomationRule[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<TaskAutomationRule | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setRules(getTaskAutomationRules());
  }, []);

  const form = useForm<RuleFormData>({
    resolver: zodResolver(taskAutomationRuleSchema),
  });

  const handleOpenDialog = (rule: RuleFormData | null) => {
    setEditingRule(rule);
    form.reset(rule || {
      modal: 'IMPORTACAO_MARITIMA',
      days: 3,
      timing: 'ANTES',
      milestone: 'ETD',
      action: 'ALERTA',
      recipient: 'OPERACIONAL',
      content: '',
      serviceConditions: [],
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: RuleFormData) => {
    const newRule: TaskAutomationRule = {
      ...data,
      id: editingRule?.id ?? `rule-${Date.now()}`,
    };
    
    let updatedRules;
    if (editingRule) {
      updatedRules = rules.map(r => r.id === newRule.id ? newRule : r);
    } else {
      updatedRules = [...rules, newRule];
    }

    saveTaskAutomationRules(updatedRules);
    setRules(updatedRules);
    
    setIsDialogOpen(false);
    setEditingRule(null);
    toast({
      title: `Regra de Automação ${editingRule ? 'Atualizada' : 'Criada'}!`,
      description: `A automação foi salva com sucesso.`,
      className: 'bg-success text-success-foreground'
    });
  };

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="flex items-center gap-2"><Zap className="text-primary"/>Automação de Tarefas</CardTitle>
                    <CardDescription>
                        Crie regras para automatizar alertas, e-mails e outras ações baseadas nos marcos dos processos.
                    </CardDescription>
                </div>
                 <Button variant="outline" onClick={() => handleOpenDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Regra de Automação
                </Button>
            </div>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Gatilho</TableHead>
                            <TableHead>Condição</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Destinatário</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rules.length > 0 ? (
                            rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-medium text-sm">
                                        <p className="font-semibold">{rule.days} dia(s) {rule.timing.toLowerCase()} do {rule.milestone}</p>
                                        <p className="text-xs text-muted-foreground">{rule.modal.replace(/_/g, ' ')}</p>
                                    </TableCell>
                                    <TableCell>
                                        {rule.serviceConditions && rule.serviceConditions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {rule.serviceConditions.map(c => <Badge key={c} variant="secondary">{serviceConditionLabels[c]}</Badge>)}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Todos os Processos</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{rule.action}</TableCell>
                                    <TableCell>{rule.recipient}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhuma regra de automação criada ainda.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                <DialogTitle>{editingRule ? 'Editar Regra de Automação' : 'Nova Regra de Automação'}</DialogTitle>
                <DialogDescription>
                    Defina as condições, gatilhos e ações para automatizar uma tarefa.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><Workflow/> Condição do Gatilho</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="modal" render={({ field }) => (
                                <FormItem><FormLabel>Modal</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="IMPORTACAO_MARITIMA">Importação Marítima</SelectItem>
                                    <SelectItem value="EXPORTACAO_MARITIMA">Exportação Marítima</SelectItem>
                                    <SelectItem value="IMPORTACAO_AEREA">Importação Aérea</SelectItem>
                                    <SelectItem value="EXPORTACAO_AEREA">Exportação Aérea</SelectItem>
                                    <SelectItem value="TODOS">Todos</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField
                                control={form.control}
                                name="serviceConditions"
                                render={() => (
                                <FormItem>
                                    <FormLabel>Serviços Opcionais (Condição)</FormLabel>
                                    <p className="text-xs text-muted-foreground">Se nenhum for selecionado, a regra se aplicará a todos os processos.</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                                    {Object.entries(serviceConditionLabels).map(([key, label]) => (
                                        <FormField
                                            key={key}
                                            control={form.control}
                                            name="serviceConditions"
                                            render={({ field }) => (
                                                <FormItem key={key} className="flex flex-row items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(key as z.infer<typeof serviceConditionEnum>)}
                                                            onCheckedChange={(checked) => {
                                                                const currentValue = field.value || [];
                                                                const serviceKey = key as z.infer<typeof serviceConditionEnum>;
                                                                return checked
                                                                ? field.onChange([...currentValue, serviceKey])
                                                                : field.onChange(currentValue.filter((value) => value !== serviceKey));
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal">{label}</FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                    ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                             <FormField control={form.control} name="days" render={({ field }) => (
                                <FormItem><FormLabel>Dias</FormLabel><FormControl><Input type="number" placeholder="Ex: 3" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="timing" render={({ field }) => (
                                <FormItem><FormLabel>Quando</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="ANTES">Antes</SelectItem>
                                    <SelectItem value="DEPOIS">Depois</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="milestone" render={({ field }) => (
                                <FormItem><FormLabel>Do Marco</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="ETD">Data de Embarque (ETD)</SelectItem>
                                    <SelectItem value="ETA">Data de Chegada (ETA)</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>

                     <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><Zap/> Ação a Ser Executada</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="action" render={({ field }) => (
                                <FormItem><FormLabel>Ação</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="ALERTA">Disparar Alerta no Sistema</SelectItem>
                                    <SelectItem value="EMAIL">Enviar E-mail</SelectItem>
                                    <SelectItem value="DOCUMENTO">Gerar Documento</SelectItem>
                                    <SelectItem value="RELATORIO_STATUS">Gerar Relatório de Status</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="recipient" render={({ field }) => (
                                <FormItem><FormLabel>Destinatário</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    <SelectItem value="CLIENTE">Cliente</SelectItem>
                                    <SelectItem value="AGENTE">Agente</SelectItem>
                                    <SelectItem value="OPERACIONAL">Operacional (Responsável)</SelectItem>
                                    <SelectItem value="TRANSPORTADORA">Transportadora</SelectItem>
                                    <SelectItem value="TERMINAL">Terminal</SelectItem>
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                        </div>
                         <FormField control={form.control} name="content" render={({ field }) => (
                            <FormItem className="mt-4"><FormLabel>Conteúdo do Alerta / Corpo do E-mail</FormLabel><FormControl><Textarea placeholder="Ex: Prezado, favor notar que o free time do contêiner XXXX vencerá em 3 dias." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    
                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit">Salvar Regra</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
