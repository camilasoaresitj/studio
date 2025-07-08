
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, CircleDot, Truck, Circle } from 'lucide-react';
import type { Shipment } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';
import { cn } from '@/lib/utils';

const ShipmentCard = ({ shipment, onUpdate }: { shipment: Shipment, onUpdate: (shipment: Shipment) => void }) => {
  const handleUpdateStatus = () => {
    // Create a deep copy to avoid state mutation
    const newMilestones = shipment.milestones.map(m => ({ ...m }));
    const currentMilestoneIndex = newMilestones.findIndex(m => m.status === 'in_progress');

    if (currentMilestoneIndex !== -1) {
        newMilestones[currentMilestoneIndex].status = 'completed';
        
        const nextMilestone = newMilestones[currentMilestoneIndex + 1];
        if (nextMilestone) {
            nextMilestone.status = 'in_progress';
            nextMilestone.date = new Date().toLocaleDateString('pt-BR');
        }
    }
    
    onUpdate({ ...shipment, milestones: newMilestones });
  };
  
  const allCompleted = shipment.milestones.every(m => m.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
                <CardTitle className="text-lg">Embarque: {shipment.id}</CardTitle>
                <CardDescription>{shipment.origin} → {shipment.destination}</CardDescription>
            </div>
            <div className="text-left sm:text-right text-sm">
                <p className="font-semibold">{shipment.customer}</p>
                <p className="text-xs text-muted-foreground">{isImport(shipment) ? 'Shipper' : 'Consignee'}: {shipment.overseasPartner.name} ({shipment.overseasPartner.address?.country})</p>
                {shipment.agent && <p className="text-xs text-muted-foreground">Agente: {shipment.agent.name}</p>}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <h4 className="font-semibold">Progresso do Embarque</h4>
                <Button onClick={handleUpdateStatus} size="sm" disabled={allCompleted}>
                    {allCompleted ? 'Finalizado' : 'Avançar Etapa'}
                </Button>
            </div>
            <ul className="space-y-1">
              {shipment.milestones.map((milestone, index) => {
                const isInProgress = milestone.status === 'in_progress';
                return (
                    <li key={index} className={cn(
                        "flex items-start gap-4 p-3 rounded-md transition-colors",
                        isInProgress && "bg-primary/10"
                    )}>
                    <div>
                        {milestone.status === 'completed' && <CheckCircle className="h-5 w-5 mt-0.5 text-green-500" />}
                        {milestone.status === 'in_progress' && <CircleDot className="h-5 w-5 mt-0.5 text-blue-500 animate-pulse" />}
                        {milestone.status === 'pending' && <Circle className="h-5 w-5 mt-0.5 text-muted-foreground/30" />}
                    </div>
                    <div className="flex-grow">
                        <p className="font-medium text-sm">{milestone.name}</p>
                        {milestone.date && <p className="text-xs text-muted-foreground">{milestone.date}</p>}
                    </div>
                    </li>
                )
              })}
            </ul>
        </div>
      </CardContent>
    </Card>
  );
};

const isImport = (shipment: Shipment) => shipment.destination.toUpperCase().includes('BR');

export default function OperacionalPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setShipments(getShipments());
  }, []);
  
  const handleUpdateShipment = (updatedShipment: Shipment) => {
      const newShipments = updateShipment(updatedShipment);
      setShipments(newShipments);
  }

  if (!isClient) {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Operacional</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                Acompanhe seus embarques ativos e gerencie as etapas operacionais.
                </p>
            </header>
            <div className="space-y-6">
                <Card><CardContent className="p-10 text-center text-muted-foreground">Carregando embarques...</CardContent></Card>
            </div>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Operacional</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Acompanhe seus embarques ativos e gerencie as etapas operacionais.
        </p>
      </header>
      <div className="space-y-6">
        {shipments.length > 0 ? (
            shipments.map(shipment => (
                <ShipmentCard key={shipment.id} shipment={shipment} onUpdate={handleUpdateShipment} />
            ))
        ) : (
            <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">Nenhum embarque ativo</h3>
                    <p>Aprove uma cotação no módulo Comercial para criar um novo embarque aqui.</p>
                </CardContent>
            </Card>
        )}
      </div>
    </div>
  );
}
