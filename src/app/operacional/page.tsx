
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, CircleDot, Truck, Circle, AlertTriangle, Calendar, Filter } from 'lucide-react';
import type { Shipment, Milestone } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';
import { cn } from '@/lib/utils';
import { addDays, format, isBefore, isToday, parseISO } from 'date-fns';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Task = {
  shipmentId: string;
  shipmentOrigin: string;
  shipmentDestination: string;
  milestone: Milestone;
  isOverdue: boolean;
};

const TaskCard = ({ task, onUpdate }: { task: Task; onUpdate: (shipment: Shipment) => void }) => {
    
  const handleUpdateStatus = () => {
    const allShipments = getShipments();
    const shipmentToUpdate = allShipments.find(s => s.id === task.shipmentId);
    if (!shipmentToUpdate) return;
    
    const milestoneIndex = shipmentToUpdate.milestones.findIndex(m => m.name === task.milestone.name);
    if (milestoneIndex === -1) return;

    const newMilestones = shipmentToUpdate.milestones.map(m => ({ ...m }));

    // Complete the current task
    newMilestones[milestoneIndex].status = 'completed';
    newMilestones[milestoneIndex].completedDate = new Date();

    // Start the next pending task
    const nextMilestoneIndex = newMilestones.findIndex(m => m.status === 'pending');
    if (nextMilestoneIndex !== -1) {
        newMilestones[nextMilestoneIndex].status = 'in_progress';
    }

    const updatedShipment = { ...shipmentToUpdate, milestones: newMilestones };
    const newShipmentList = updateShipment(updatedShipment);
    onUpdate(updatedShipment); // This might be redundant if updateShipment triggers a re-render
  };

  const isCompleted = task.milestone.status === 'completed';
  const isInProgress = task.milestone.status === 'in_progress';

  return (
    <div className={cn(
        "flex items-start gap-4 p-3 rounded-lg border transition-colors",
        isInProgress && "bg-primary/10 border-primary/20",
        task.isOverdue && !isCompleted && "bg-destructive/10 border-destructive/20"
    )}>
      <div>
        {isCompleted && <CheckCircle className="h-5 w-5 mt-0.5 text-green-500" />}
        {isInProgress && <CircleDot className="h-5 w-5 mt-0.5 text-blue-500 animate-pulse" />}
        {task.milestone.status === 'pending' && <Circle className="h-5 w-5 mt-0.5 text-muted-foreground/30" />}
      </div>
      <div className="flex-grow">
        <p className="font-medium">{task.milestone.name}</p>
        <p className="text-sm text-muted-foreground">
          Embarque: {task.shipmentId} ({task.shipmentOrigin} → {task.shipmentDestination})
        </p>
         <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Calendar className="h-3 w-3" />
            <span>Vencimento: {format(task.milestone.dueDate, 'dd/MM/yyyy')}</span>
            {task.isOverdue && !isCompleted && (
                <span className="flex items-center text-destructive font-semibold">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Atrasada
                </span>
            )}
        </div>
      </div>
      {!isCompleted && (
        <Button onClick={handleUpdateStatus} size="sm" variant="outline">
            <CheckCircle className="mr-2 h-4 w-4"/>
            Concluir
        </Button>
      )}
    </div>
  );
};


export default function OperacionalPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [taskFilter, setTaskFilter] = useState<'today' | 'week' | 'all'>('week');

  useEffect(() => {
    setIsClient(true);
    setShipments(getShipments());
  }, []);
  
  const handleShipmentUpdate = (updatedShipment: Shipment) => {
      const newShipments = updateShipment(updatedShipment);
      setShipments(newShipments);
  }

  const tasks = useMemo((): Task[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = addDays(today, 7);

    return shipments
      .flatMap(shipment => 
        shipment.milestones
          .filter(milestone => milestone.status === 'in_progress' || milestone.status === 'pending')
          .map(milestone => ({
            shipmentId: shipment.id,
            shipmentOrigin: shipment.origin,
            shipmentDestination: shipment.destination,
            milestone,
            isOverdue: isBefore(milestone.dueDate, today),
          }))
      )
      .filter(task => {
          if (taskFilter === 'today') return isToday(task.milestone.dueDate);
          if (taskFilter === 'week') return !isBefore(task.milestone.dueDate, today) && isBefore(task.milestone.dueDate, endOfWeek);
          return true; // 'all'
      })
      .sort((a, b) => a.milestone.dueDate.getTime() - b.milestone.dueDate.getTime());
  }, [shipments, taskFilter]);

  if (!isClient) {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Operacional</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Gerencie suas tarefas diárias e acompanhe seus embarques ativos.
                </p>
            </header>
            <div className="space-y-6">
                <Card><CardContent className="p-10 text-center text-muted-foreground">Carregando dashboard...</CardContent></Card>
            </div>
        </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Operacional</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas tarefas diárias e acompanhe seus embarques ativos.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Tarefas do Dia</CardTitle>
                            <CardDescription>Marcos operacionais que requerem sua atenção.</CardDescription>
                        </div>
                         <Select value={taskFilter} onValueChange={(value) => setTaskFilter(value as any)}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="h-4 w-4 mr-2"/>
                                <SelectValue placeholder="Filtrar tarefas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Vencem Hoje</SelectItem>
                                <SelectItem value="week">Próximos 7 Dias</SelectItem>
                                <SelectItem value="all">Todas as Futuras</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {tasks.length > 0 ? (
                        tasks.map(task => (
                            <TaskCard key={`${task.shipmentId}-${task.milestone.name}`} task={task} onUpdate={handleShipmentUpdate} />
                        ))
                    ) : (
                         <div className="text-center text-muted-foreground py-10">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                            <h3 className="text-lg font-semibold">Nenhuma tarefa pendente</h3>
                            <p>Você está em dia com as tarefas para este período!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Embarques Ativos</CardTitle>
                    <CardDescription>Lista de todos os processos em andamento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                     {shipments.length > 0 ? (
                        shipments.map(shipment => {
                            const completedMilestones = shipment.milestones.filter(m => m.status === 'completed').length;
                            const progress = (completedMilestones / shipment.milestones.length) * 100;
                            return (
                                <div key={shipment.id} onClick={() => setSelectedShipment(shipment)} className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-primary">{shipment.id}</p>
                                        <Truck className="h-4 w-4 text-muted-foreground"/>
                                    </div>
                                    <p className="text-sm">{shipment.origin} → {shipment.destination}</p>
                                    <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{width: `${progress}%`}}></div>
                                    </div>
                                </div>
                            )
                        })
                     ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <Truck className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">Nenhum embarque ativo</h3>
                            <p>Aprove uma cotação no módulo Comercial para criar um novo embarque.</p>
                        </div>
                     )}
                </CardContent>
             </Card>
        </div>
      </div>
    </div>
    <ShipmentDetailsSheet 
        shipment={selectedShipment}
        open={!!selectedShipment}
        onOpenChange={(isOpen) => !isOpen && setSelectedShipment(null)}
    />
    </>
  );
}

    