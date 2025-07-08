
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Shipment } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';
import { format } from 'date-fns';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { useToast } from '@/hooks/use-toast';

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
                            <TableHead>Processo</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Rota</TableHead>
                            <TableHead>ETD</TableHead>
                            <TableHead>ETA</TableHead>
                            <TableHead>Master</TableHead>
                            <TableHead>Modal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shipments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">Nenhum embarque ativo encontrado.</TableCell>
                            </TableRow>
                        ) : (
                            shipments.map(shipment => (
                                <TableRow key={shipment.id} onClick={() => setSelectedShipment(shipment)} className="cursor-pointer">
                                    <TableCell className="font-semibold text-primary">{shipment.id}</TableCell>
                                    <TableCell>{shipment.customer}</TableCell>
                                    <TableCell>{shipment.origin} &rarr; {shipment.destination}</TableCell>
                                    <TableCell>{shipment.etd ? format(new Date(shipment.etd), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{shipment.eta ? format(new Date(shipment.eta), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                    <TableCell>{shipment.masterBillNumber || 'N/A'}</TableCell>
                                    <TableCell>{shipment.details.cargo.includes('kg') ? 'Aéreo' : 'Marítimo'}</TableCell>
                                </TableRow>
                            ))
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
