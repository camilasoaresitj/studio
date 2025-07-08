import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Now representing overdue tasks for the management dashboard
const tasks = [
    { title: "Verificar documento de importação BL-998172", area: "Operacional", overdue: "2 dias" },
    { title: "Fatura #INV-780 - Cliente Nexus Imports", area: "Financeiro", overdue: "5 dias" },
    { title: "Follow-up Cotação #COT-00121", area: "Comercial", overdue: "1 dia" },
    { title: "Renovar tabela de fretes Maersk", area: "Comercial", overdue: "3 dias" },
];

export function ImportantTasks() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className='text-base font-medium'>Tarefas Atrasadas</CardTitle>
                    <CardDescription>Visão geral de todas as pendências críticas.</CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className='-mr-2 text-primary hover:text-primary'>
                    <Link href="/operacional">
                        Ver todas
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.title} className="flex items-start space-x-3">
                            <div>
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium leading-none">{task.title}</p>
                                <p className="text-sm text-muted-foreground">{task.area} &middot; <span className="text-destructive font-semibold">Atrasada há {task.overdue}</span></p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
