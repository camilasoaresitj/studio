
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getShipments, Shipment } from '@/lib/shipment-data';
import { isValid } from 'date-fns';

export function RecentShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const allShipments = getShipments();
    const sortedShipments = allShipments.sort((a, b) => {
        const dateA = a.etd && isValid(new Date(a.etd)) ? new Date(a.etd).getTime() : 0;
        const dateB = b.etd && isValid(new Date(b.etd)) ? new Date(b.etd).getTime() : 0;
        return dateB - dateA;
    });
    setShipments(sortedShipments.slice(0, 5));
    setIsLoading(false);
  }, []);

  const getShipmentStatus = (shipment: Shipment): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Embarques Recentes</CardTitle>
          <CardDescription>Acompanhe os embarques mais recentes.</CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href="/gerencial/operacional">
              Ver todos <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID do Embarque</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : shipments.length > 0 ? (
              shipments.map((shipment) => {
                const status = getShipmentStatus(shipment);
                return (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">
                      <Link href={`/gerencial/operacional?shipmentId=${shipment.id}`} className="text-primary hover:underline">
                        {shipment.id}
                      </Link>
                    </TableCell>
                    <TableCell>{shipment.origin}</TableCell>
                    <TableCell>{shipment.destination}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="capitalize">{status.text}</Badge>
                    </TableCell>
                    <TableCell>{shipment.details.cargo.includes('kg') ? 'Aéreo' : 'Marítimo'}</TableCell>
                  </TableRow>
                )
              })
            ) : (
                 <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">Nenhum embarque recente encontrado.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
