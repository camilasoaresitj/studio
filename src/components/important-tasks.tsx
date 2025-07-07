import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

const tasks = [
    { title: "Aprovar fatura #INV-789", priority: "Alta", due: "2 dias" },
    { title: "Confirmar embarque BL-998172", priority: "Alta", due: "Hoje" },
    { title: "Contatar cliente sobre atraso", priority: "Média", due: "Amanhã" },
    { title: "Verificar documento de importação", priority: "Baixa", due: "3 dias" },
]

export function ImportantTasks() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className='text-base font-medium'>Tarefas Importantes</CardTitle>
                <Button asChild variant="ghost" size="sm" className='-mr-2 text-primary hover:text-primary'>
                    <Link href="/tasks">
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
                            {task.priority === "Alta" && <AlertCircle className="h-5 w-5 text-destructive" />}
                            {task.priority === "Média" && <Clock className="h-5 w-5 text-primary" />}
                            {task.priority === "Baixa" && <CheckCircle className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium leading-none">{task.title}</p>
                                <p className="text-sm text-muted-foreground">Prioridade {task.priority} &middot; Vence em {task.due}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
