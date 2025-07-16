

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Shipment, Milestone } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';
import { format, isPast, isToday, isWithinInterval, addDays, isValid, differenceInHours } from 'date-fns';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { runGetTrackingInfo, runDetectCarrier } from '@/app/actions';
import { AlertTriangle, ListTodo, Calendar as CalendarIcon, PackagePlus, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type Task = {
    milestone: Milestone;
    shipment: Shipment;
};

export default function OperacionalPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'today' | '3days' | 'week' | 'all'>('today');
  const [newBookingNumber, setNewBookingNumber] = useState('');
  const [isFetchingBooking, setIsFetchingBooking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const initialShipments = getShipments();
    setShipments(initialShipments);

    const handleStorageChange = () => {
        setShipments(getShipments());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('shipmentsUpdated', handleStorageChange);

    // Simulate checking for time-based automations when the page loads
    checkRedestinacaoAutomation(initialShipments);

     return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('shipmentsUpdated', handleStorageChange);
    };
  }, []);
  
  // This function simulates a cron job that would run on the server.
  // It checks for shipments that need redestinacao tasks created.
  const checkRedestinacaoAutomation = (currentShipments: Shipment[]) => {
      let updated = false;
      const now = new Date();
      const updatedShipments = [...currentShipments];

      updatedShipments.forEach((shipment, index) => {
          const eta = shipment.eta ? new Date(shipment.eta) : null;
          const needsRedestinacao = !!shipment.terminalRedestinacaoId;
          
          if (eta && needsRedestinacao) {
              const hoursToArrival = differenceInHours(eta, now);
              const taskAlreadyExists = shipment.milestones.some(m => m.name === 'Solicitar Redestinação');

              if (hoursToArrival > 0 && hoursToArrival <= 72 && !taskAlreadyExists) {
                  const newTask: Milestone = {
                      name: 'Solicitar Redestinação',
                      status: 'pending',
                      predictedDate: now,
                      effectiveDate: null,
                      details: `Solicitar para o terminal ID ${shipment.terminalRedestinacaoId}. ETA em ${format(eta, 'dd/MM/yyyy')}.`
                  };
                  
                  const updatedMilestones = [...shipment.milestones, newTask];
                  updatedMilestones.sort((a, b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());

                  updatedShipments[index] = { ...shipment, milestones: updatedMilestones };
                  
                  // Simulate sending the email
                  console.log(`--- SIMULATING REDESTINACAO EMAIL ---`);
                  console.log(`To: Terminal Contact`);
                  console.log(`Cc: ${shipment.responsibleUser}`);
                  console.log(`Subject: Solicitação de Redestinação - Processo ${shipment.id} / Invoice ${shipment.invoiceNumber}`);
                  console.log(`Body: Prezados, favor proceder com a redestinação da carga do processo em referência. Documentos em anexo.`);
                  
                  updated = true;
              }
          }
      });

      if (updated) {
          updateShipment(updatedShipments[0]); // This will save all shipments
          setShipments(updatedShipments);
          toast({
              title: "Automação de Redestinação Executada",
              description: "Novas tarefas de solicitação de redestinação foram criadas para embarques chegando em breve."
          });
      }
  };


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
  
 const handleFetchNewBooking = async (bookingNumberToFetch: string) => {
      if (!bookingNumberToFetch.trim()) {
          toast({
              variant: 'destructive',
              title: "Campo obrigatório",
              description: "Por favor, insira um número de booking.",
          });
          return;
      }
      setIsFetchingBooking(true);
      
      try {
        // Step 1: Detect Carrier
        const carrierResponse = await runDetectCarrier(bookingNumberToFetch);
        if (!carrierResponse.success || !carrierResponse.data?.carrier || carrierResponse.data.carrier === 'Unknown') {
             throw new Error(carrierResponse.error || `Não foi possível identificar o armador para o tracking "${bookingNumberToFetch}".`);
        }
        const carrier = carrierResponse.data.carrier;
        toast({ title: "Armador Detectado!", description: `Identificamos o armador: ${carrier}. Buscando dados...` });
        
        // Step 2: Get Tracking Info with the detected carrier
        const trackingResponse = await runGetTrackingInfo({ trackingNumber: bookingNumberToFetch, carrier });

        if (trackingResponse.success) {
            const fetchedData = trackingResponse.data;
            const shipmentDetails = fetchedData.shipmentDetails || {};
            
            const existingShipmentIndex = shipments.findIndex(s => 
                (s.bookingNumber && s.bookingNumber.toUpperCase() === bookingNumberToFetch.toUpperCase()) || 
                (s.masterBillNumber && s.masterBillNumber.toUpperCase() === bookingNumberToFetch.toUpperCase()) ||
                (s.id.toUpperCase() === `PROC-${bookingNumberToFetch.toUpperCase()}`)
            );
            
            let updatedShipment: Shipment;

            if (existingShipmentIndex > -1) {
                const existingShipment = shipments[existingShipmentIndex];
                // Merge fetched data into existing shipment
                updatedShipment = {
                    ...existingShipment,
                    ...shipmentDetails,
                    id: existingShipment.id,
                    customer: existingShipment.customer, 
                    overseasPartner: existingShipment.overseasPartner,
                    agent: existingShipment.agent,
                    charges: existingShipment.charges,
                    details: existingShipment.details,
                    // Preserve existing container data but update with new data if available
                    containers: (existingShipment.containers || []).map(existingC => {
                        const newC = shipmentDetails.containers?.find((c: any) => c.number === existingC.number);
                        return newC ? { ...existingC, ...newC } : existingC;
                    })
                };
                
                toast({
                    title: "Processo Atualizado!",
                    description: `Os dados do processo ${updatedShipment.id} foram sincronizados.`,
                    className: 'bg-success text-success-foreground'
                });
            } else {
                // Create a new shipment if it doesn't exist
                updatedShipment = {
                    id: `PROC-${bookingNumberToFetch}`,
                    customer: 'Novo Processo',
                    charges: [],
                    details: { cargo: '', transitTime: '', validity: '', freeTime: '', incoterm: 'FOB' },
                    overseasPartner: { id: 0, name: 'Parceiro a definir', roles: { fornecedor: true } } as any,
                    ...shipmentDetails,
                } as Shipment;

                toast({
                    title: "Processo Importado!",
                    description: `O processo ${updatedShipment.id} foi adicionado com sucesso.`,
                    className: 'bg-success text-success-foreground'
                });
            }
            
            updateShipment(updatedShipment);
            setShipments(getShipments()); // Refresh the list from the source of truth
            setSelectedShipment(updatedShipment);
            setNewBookingNumber('');
        } else {
            throw new Error(trackingResponse.error);
        }
    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: "Erro ao buscar processo",
            description: e.message || "Não foi possível obter os dados do embarque.",
        });
    } finally {
        setIsFetchingBooking(false);
    }
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
            case '3days':
                return isWithinInterval(predictedDate, { start: now, end: addDays(now, 3) }) || isPast(predictedDate);
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
  
    const firstPending = shipment.milestones.find(m => m.status === 'pending' || m.status === 'in_progress');
  
    if (!firstPending) {
      return { text: 'Finalizado', variant: 'outline' };
    }
  
    const firstPendingName = firstPending.name.toLowerCase();
    
    const departureCompleted = shipment.milestones.some(m => 
      (m.name.toLowerCase().includes('departure') || m.name.toLowerCase().includes('vessel departure') || m.name.toLowerCase().includes('embarque')) 
      && m.status === 'completed'
    );
  
    if (departureCompleted) {
        if (firstPendingName.includes('chegada') || firstPendingName.includes('arrival') || firstPendingName.includes('discharged')) {
            return { text: 'Chegada no Destino', variant: 'default' };
        }
        return { text: 'Em Trânsito', variant: 'default' };
    }
  
    return { text: `Aguardando Embarque`, variant: 'secondary' };
  };

  const lastUnreadMessage = useMemo(() => {
    if (!isClient) return null;
    let lastMsg: (Omit<Task, 'milestone'> & { message: string, timestamp: string }) | null = null;
    shipments.forEach(shipment => {
        const clientMessages = (shipment.chatMessages || []).filter(m => m.sender === 'Cliente' && !m.readBy?.includes('user-1'));
        if (clientMessages.length > 0) {
            const lastClientMsg = clientMessages[clientMessages.length - 1];
            if (!lastMsg || new Date(lastClientMsg.timestamp) > new Date(lastMsg.timestamp)) {
                lastMsg = {
                    shipment,
                    message: lastClientMsg.message,
                    timestamp: lastClientMsg.timestamp,
                };
            }
        }
    });
    return lastMsg;
  }, [shipments, isClient]);

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
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
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
                        <Button variant={taskFilter === '3days' ? 'default' : 'outline'} size="sm" onClick={() => setTaskFilter('3days')}>3 Dias</Button>
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
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex-grow">
                        <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-primary" />Embarques Ativos</CardTitle>
                        <CardDescription>Clique em um processo para ver e editar todos os detalhes.</CardDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button>
                                <PackagePlus className="mr-2 h-4 w-4" /> Novo Processo por Booking
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Importar/Sincronizar Processo</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Insira o número do Booking ou Master BL para buscar os dados mais recentes.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="booking-number" className="text-right">
                                        Booking / BL
                                    </Label>
                                    <Input
                                        id="booking-number"
                                        placeholder="Nº Booking ou Master BL"
                                        value={newBookingNumber}
                                        onChange={(e) => setNewBookingNumber(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleFetchNewBooking(newBookingNumber)} disabled={isFetchingBooking}>
                                    {isFetchingBooking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                                    Importar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                                shipments.filter(s => getShipmentStatus(s).text !== 'Finalizado').map((shipment, index) => {
                                    const status = getShipmentStatus(shipment);
                                    return (
                                    <TableRow key={`${shipment.id}-${shipment.bookingNumber || index}`} onClick={() => setSelectedShipment(shipment)} className="cursor-pointer text-xs">
                                        <TableCell className="font-semibold text-primary p-2">
                                            <a className="hover:underline">{shipment.id}</a>
                                        </TableCell>
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
       <div className="lg:col-span-1 space-y-8">
            <Alert variant="default" className="border-primary/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Avisos Recentes</AlertTitle>
                <AlertDescription>
                   {lastUnreadMessage ? (
                        <div className="space-y-2 mt-2">
                            <p><strong>Nova Mensagem de Cliente!</strong></p>
                            <p><strong>Processo:</strong> {lastUnreadMessage.shipment.id}</p>
                            <p><strong>Cliente:</strong> {lastUnreadMessage.shipment.customer}</p>
                            <p className="p-2 bg-background/50 rounded-md">"{lastUnreadMessage.message}"</p>
                            <Button size="sm" className="w-full mt-2" onClick={() => setSelectedShipment(lastUnreadMessage.shipment)}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Abrir Chat e Responder
                            </Button>
                        </div>
                   ) : "Nenhuma mensagem nova."}
                </AlertDescription>
            </Alert>
        </div>
    </div>
    <ShipmentDetailsSheet 
        shipment={selectedShipment}
        open={!!selectedShipment}
        onOpenChange={(isOpen) => !isOpen && setSelectedShipment(null)}
        onUpdate={handleShipmentUpdate}
    />
    </>
  );
}
