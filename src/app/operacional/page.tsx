
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Shipment, Milestone } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';
import { format, isPast, isToday, isWithinInterval, addDays, isValid } from 'date-fns';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runGetBookingInfo } from '@/app/actions';
import { AlertTriangle, ListTodo, Calendar as CalendarIcon, Ship, PackagePlus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Task = {
    milestone: Milestone;
    shipment: Shipment;
};

export default function OperacionalPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'today' | 'week' | 'all'>('today');
  const [newBookingNumber, setNewBookingNumber] = useState('');
  const [isFetchingBooking, setIsFetchingBooking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    setShipments(getShipments());
  }, []);

  const handleShipmentUpdate = (updatedShipmentData: Shipment) => {
    const updatedShipments = updateShipment(updatedShipmentData);
    setShipments(updatedShipments);
    
    // If the updated shipment is the one currently selected, update the selection as well
    if (selectedShipment && selectedShipment.id === updatedShipmentData.id) {
        setSelectedShipment(updatedShipmentData);
    }

    toast({
      title: "Embarque Atualizado",
      description: `Os dados do embarque ${updatedShipmentData.id} foram salvos com sucesso.`,
      className: 'bg-success text-success-foreground'
    });
  };
  
  const handleFetchBooking = async (bookingNumberToFetch: string) => {
      if (!bookingNumberToFetch.trim()) {
          toast({
              variant: 'destructive',
              title: "Campo obrigatório",
              description: "Por favor, insira um número de booking.",
          });
          return;
      }
      setIsFetchingBooking(true);
      const response = await runGetBookingInfo(bookingNumberToFetch);

      if (response.success) {
          const fetchedShipment = response.data;
          
          let updatedShipments: Shipment[];
          const existingIndex = shipments.findIndex(s => s.id === fetchedShipment.id || (s.bookingNumber && s.bookingNumber === fetchedShipment.bookingNumber));
          
          if (existingIndex > -1) {
              updatedShipments = [...shipments];
              updatedShipments[existingIndex] = fetchedShipment;
              toast({
                  title: "Processo Atualizado!",
                  description: `Os dados do processo ${fetchedShipment.id} foram sincronizados.`,
                  className: 'bg-success text-success-foreground'
              });
          } else {
              updatedShipments = [fetchedShipment, ...shipments];
              toast({
                  title: "Processo Importado!",
                  description: `O processo ${fetchedShipment.id} foi adicionado com sucesso.`,
                  className: 'bg-success text-success-foreground'
              });
          }
          
          updateShipment(fetchedShipment); // Crucial: Save all changes to local storage
          setShipments(updatedShipments); // Update the list in the state
          setSelectedShipment(fetchedShipment); // Select the new/updated shipment to show details

          setNewBookingNumber('');
      } else {
          toast({
              variant: 'destructive',
              title: "Erro ao buscar processo",
              description: response.error,
          });
      }
      setIsFetchingBooking(false);
  };


  const allTasks = useMemo((): Task[] => {
    return shipments
      .flatMap(shipment => 
        shipment.milestones
          .filter(m => m.status === 'pending' || m.status === 'in_progress')
          .map(milestone => ({ milestone, shipment }))
      )
      .sort((a, b) => new Date(a.milestone.predictedDate).getTime() - new Date(b.milestone.predictedDate).getTime());
  }, [shipments]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    return allTasks.filter(task => {
        if (!task.milestone.predictedDate || !isValid(new Date(task.milestone.predictedDate))) return false;

        const predictedDate = new Date(task.milestone.predictedDate);
        switch (taskFilter) {
            case 'today':
                return isToday(predictedDate) || isPast(predictedDate);
            case 'week':
                return isWithinInterval(predictedDate, { start: now, end: addDays(now, 7) }) || isPast(predictedDate);
            case 'all':
                return true;
            default:
                return true;
        }
    });
  }, [allTasks, taskFilter]);
  
  const getShipmentStatus = (shipment: Shipment): { text: string; variant: 'default' | 'secondary' | 'outline' } => {
    if (!shipment.milestones || shipment.milestones.length === 0) {
        return { text: 'Não iniciado', variant: 'secondary' };
    }
    const inProgress = shipment.milestones.find(m => m.status === 'in_progress');
    if (inProgress) return { text: inProgress.name, variant: 'default' };

    const allCompleted = shipment.milestones.every(m => m.status === 'completed');
    if (allCompleted) return { text: 'Finalizado', variant: 'outline' };
    
    const firstPending = shipment.milestones.find(m => m.status === 'pending');
    if (firstPending) return { text: `Pendente: ${firstPending.name}`, variant: 'secondary' };

    return { text: 'Finalizado', variant: 'outline' };
  };

  if (!isClient) {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Operacional</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Carregando dados operacionais...
                </p>
            </header>
        </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-8 space-y-8">
      <header className="mb-0">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Dashboard Operacional</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas tarefas diárias e acompanhe os embarques ativos.
        </p>
      </header>
      
      <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-primary" />Tarefas Operacionais</CardTitle>
                  <CardDescription>Marcos pendentes ou em andamento. Tarefas atrasadas são destacadas.</CardDescription>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                    <Button variant={taskFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => setTaskFilter('today')}>Hoje</Button>
                    <Button variant={taskFilter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setTaskFilter('week')}>7 Dias</Button>
                    <Button variant={taskFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTaskFilter('all')}>Todas</Button>
                </div>
              </div>
          </CardHeader>
          <CardContent>
              <div className="space-y-3">
                  {filteredTasks.length > 0 ? filteredTasks.map(({ milestone, shipment }) => {
                      const predictedDate = new Date(milestone.predictedDate);
                      const overdue = isValid(predictedDate) && isPast(predictedDate) && milestone.status !== 'completed';
                      return (
                          <div
                              key={`${shipment.id}-${milestone.name}-${milestone.predictedDate}`}
                              className={cn(
                                "flex items-center gap-4 p-3 rounded-lg border cursor-pointer hover:bg-accent",
                                overdue ? 'bg-destructive/10 border-destructive' : 'bg-background'
                              )}
                              onClick={() => setSelectedShipment(shipment)}
                          >
                            {overdue && <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />}
                            <div className="flex-grow">
                                <p className="font-semibold">{milestone.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Embarque <span className="font-medium text-primary">{shipment.id}</span>
                                    {` para ${shipment.customer}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className={cn("text-sm font-medium", overdue ? "text-destructive" : "text-foreground")}>
                                    {isValid(predictedDate) ? format(predictedDate, 'dd/MM/yyyy') : 'Sem data'}
                                </p>
                                <p className="text-xs text-muted-foreground">Data Prevista</p>
                            </div>
                          </div>
                      )
                  }) : (
                      <div className="text-center text-muted-foreground p-8">
                          <CalendarIcon className="mx-auto h-12 w-12 mb-2" />
                          <p>Nenhuma tarefa encontrada para este período.</p>
                      </div>
                  )}
              </div>
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2"><Ship className="h-5 w-5 text-primary" />Embarques Ativos</CardTitle>
                    <CardDescription>Clique em um processo para ver e editar todos os detalhes.</CardDescription>
                </div>
                <div className="flex w-full sm:w-auto sm:max-w-xs items-center gap-2">
                    <Input
                        placeholder="Novo Processo por Booking"
                        value={newBookingNumber}
                        onChange={(e) => setNewBookingNumber(e.target.value)}
                        onKeyUp={(e) => { if (e.key === 'Enter') handleFetchBooking(newBookingNumber); }}
                        className="flex-grow"
                    />
                    <Button onClick={() => handleFetchBooking(newBookingNumber)} disabled={isFetchingBooking}>
                         {isFetchingBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="p-2">Processo</TableHead>
                            <TableHead className="p-2">Cliente</TableHead>
                            <TableHead className="p-2">Rota</TableHead>
                            <TableHead className="p-2">ETD</TableHead>
                            <TableHead className="p-2">ETA</TableHead>
                            <TableHead className="p-2">Master</TableHead>
                            <TableHead className="p-2">Modal</TableHead>
                            <TableHead className="p-2">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shipments.filter(s => getShipmentStatus(s).text !== 'Finalizado').length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Nenhum embarque ativo encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            shipments.filter(s => getShipmentStatus(s).text !== 'Finalizado').map(shipment => {
                                const status = getShipmentStatus(shipment);
                                return (
                                <TableRow key={shipment.id} onClick={() => setSelectedShipment(shipment)} className="cursor-pointer text-xs">
                                    <TableCell className="font-semibold text-primary p-2">{shipment.id}</TableCell>
                                    <TableCell className="p-2">{shipment.customer}</TableCell>
                                    <TableCell className="p-2">{shipment.origin} &rarr; {shipment.destination}</TableCell>
                                    <TableCell className="p-2">{shipment.etd && isValid(new Date(shipment.etd)) ? format(new Date(shipment.etd), 'dd/MM/yy') : 'N/A'}</TableCell>
                                    <TableCell className="p-2">{shipment.eta && isValid(new Date(shipment.eta)) ? format(new Date(shipment.eta), 'dd/MM/yy') : 'N/A'}</TableCell>
                                    <TableCell className="p-2">{shipment.masterBillNumber || 'N/A'}</TableCell>
                                    <TableCell className="p-2">{shipment.details?.cargo?.toLowerCase().includes('kg') ? 'Aéreo' : 'Marítimo'}</TableCell>
                                    <TableCell className="p-2"><Badge variant={status.variant} className="whitespace-nowrap">{status.text}</Badge></TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
    <ShipmentDetailsSheet 
        shipment={selectedShipment}
        open={!!selectedShipment}
        onOpenChange={(isOpen) => !isOpen && setSelectedShipment(null)}
        onUpdate={handleShipmentUpdate}
        onSync={handleFetchBooking}
    />
    </>
  );
}

      