
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Shipment, Milestone } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';
import { format } from 'date-fns';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function OperacionalPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    setShipments(getShipments());
  }, []);
  
  const handleShipmentUpdate = (updatedShipmentData: Shipment) => {
      const newShipments = updateShipment(updatedShipmentData);
      setShipments(newShipments);
      setSelectedShipment(updatedShipmentData); // Keep the sheet open with updated data
      toast({
        title: "Embarque Atualizado",
        description: `Os dados do embarque ${updatedShipmentData.id} foram salvos com sucesso.`,
        className: 'bg-success text-success-foreground'
      });
  };

  const getShipmentStatus = (shipment: Shipment): { text: string; variant: 'default' | 'secondary' | 'outline' } => {
    if (!shipment.milestones || shipment.milestones.length === 0) {
        return { text: 'Não iniciado', variant: 'secondary' };
    }
    const inProgress = shipment.milestones.find(m => m.status === 'in_progress');
    if (inProgress) return { text: inProgress.name, variant: 'default' };

    const allCompleted = shipment.milestones.every(m => m.status === 'completed');
    if (allCompleted) return { text: 'Finalizado', variant: 'outline' };
    
    const firstPending = shipment.milestones.find(m => m.status === 'pending');
    if (firstPending) return { text: firstPending.name, variant: 'secondary' };

    return { text: 'Finalizado', variant: 'outline' };
  };


  if (!isClient) {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Acompanhamento de Embarques</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Carregando lista de embarques...
                </p>
            </header>
        </div>
    );
  }

  return (
    <>
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Acompanhamento de Embarques</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie todos os seus processos de importação e exportação ativos.
        </p>
      </header>
      <Card>
        <CardHeader>
            <CardTitle>Processos Ativos</CardTitle>
            <CardDescription>Clique em um processo para ver e editar todos os detalhes.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-2 py-1">Processo</TableHead>
                            <TableHead className="px-2 py-1">Cliente</TableHead>
                            <TableHead className="px-2 py-1">Rota</TableHead>
                            <TableHead className="px-2 py-1">ETD</TableHead>
                            <TableHead className="px-2 py-1">ETA</TableHead>
                            <TableHead className="px-2 py-1">Master</TableHead>
                            <TableHead className="px-2 py-1">Modal</TableHead>
                            <TableHead className="px-2 py-1">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shipments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">Nenhum embarque ativo encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            shipments.map(shipment => {
                                const status = getShipmentStatus(shipment);
                                return (
                                <TableRow key={shipment.id} onClick={() => setSelectedShipment(shipment)} className="cursor-pointer text-xs">
                                    <TableCell className="font-semibold text-primary px-2 py-1">{shipment.id}</TableCell>
                                    <TableCell className="px-2 py-1">{shipment.customer}</TableCell>
                                    <TableCell className="px-2 py-1">{shipment.origin} &rarr; {shipment.destination}</TableCell>
                                    <TableCell className="px-2 py-1">{shipment.etd ? format(new Date(shipment.etd), 'dd/MM/yy') : 'N/A'}</TableCell>
                                    <TableCell className="px-2 py-1">{shipment.eta ? format(new Date(shipment.eta), 'dd/MM/yy') : 'N/A'}</TableCell>
                                    <TableCell className="px-2 py-1">{shipment.masterBillNumber || 'N/A'}</TableCell>
                                    <TableCell className="px-2 py-1">{shipment.details?.cargo?.toLowerCase().includes('kg') ? 'Aéreo' : 'Marítimo'}</TableCell>
                                    <TableCell className="px-2 py-1"><Badge variant={status.variant}>{status.text}</Badge></TableCell>
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
    />
    </>
  );
}
