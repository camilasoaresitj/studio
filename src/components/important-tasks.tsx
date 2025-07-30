
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CalendarCheck2 } from 'lucide-react';
import { getShipments, Shipment } from '@/lib/shipment-data';
import { useState, useEffect, useMemo } from 'react';
import { isToday, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface ImportantTasksProps {
    onTaskClick: (shipment: Shipment) => void;
}

interface Task {
    id: string;
    shipment: Shipment;
    title: string;
    dueDate: Date;
    type: 'overdue' | 'due_today';
}

export function ImportantTasks({ onTaskClick }: ImportantTasksProps) {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        const calculateTasks = () => {
            const shipments = getShipments();
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const criticalTasks: Task[] = [];

            shipments.forEach(s => {
                s.milestones.forEach(m => {
                    if (m.status !== 'completed' && m.predictedDate) {
                        const dueDate = new Date(m.predictedDate);
                        dueDate.setHours(0,0,0,0);
                        const isOverdueTask = isPast(dueDate) && !isToday(dueDate);
                        const isDueTodayTask = isToday(dueDate);

                        if (isOverdueTask || isDueTodayTask) {
                             criticalTasks.push({
                                id: `${s.id}-${m.name}`,
                                shipment: s,
                                title: m.name,
                                dueDate: dueDate,
                                type: isOverdueTask ? 'overdue' : 'due_today',
                            });
                        }
                    }
                })
            });
            
            // Sort to show most overdue first
            criticalTasks.sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime());
            setTasks(criticalTasks);
        }
        
        calculateTasks();
        window.addEventListener('shipmentsUpdated', calculateTasks);
        return () => window.removeEventListener('shipmentsUpdated', calculateTasks);
    }, []);

    const getDaysDifference = (dueDate: Date) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return differenceInDays(today, dueDate);
    }
    
    return (
        <Card>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {tasks.length > 0 ? tasks.map(task => (
                        <div key={task.id} 
                             className={cn(
                                "p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all hover:ring-2 hover:ring-primary",
                                task.type === 'overdue' ? 'bg-destructive/10 border-destructive/50' : 'bg-secondary'
                             )}
                             onClick={() => onTaskClick(task.shipment)}>
                           
                            <div className={cn("mt-1", task.type === 'overdue' ? 'text-destructive' : 'text-primary')}>
                                {task.type === 'overdue' ? <AlertTriangle className="h-5 w-5" /> : <CalendarCheck2 className="h-5 w-5" />}
                            </div>
                            <div>
                                <p className="font-semibold text-sm leading-tight">{task.title}</p>
                                <p className="text-xs text-muted-foreground font-medium">Processo: {task.shipment.id}</p>
                                {task.type === 'overdue' ? (
                                    <p className="text-xs font-bold text-destructive">Atrasada há {getDaysDifference(task.dueDate)} dias</p>
                                ) : (
                                    <p className="text-xs font-semibold text-primary">Vence Hoje</p>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full text-center text-muted-foreground py-4">
                            Nenhuma tarefa crítica para hoje.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
