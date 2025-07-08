
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, CircleDot, Truck } from 'lucide-react';
import type { Shipment, Milestone } from '@/lib/shipment';
import { getShipments, updateShipment } from '@/lib/shipment';

const ShipmentCard = ({ shipment, onUpdate }: { shipment: Shipment, onUpdate: (shipment: Shipment) => void }) => {
  const handleUpdateStatus = () => {
    const currentMilestoneIndex = shipment.milestones.findIndex(m => m.status === 'in_progress');
    if (currentMilestoneIndex === -1 && shipment.milestones.every(m => m.status === 'pending')) {
        // Start the first one if none are in progress
        const firstMilestone = shipment.milestones[0];
        if (firstMilestone) {
            firstMilestone.status = 'in_progress';
        }
    } else if (currentMilestoneIndex !== -1) {
        // Complete current and start next
        shipment.milestones[currentMilestoneIndex].status = 'completed';
        shipment.milestones[currentMilestoneIndex].date = new Date().toLocaleDateString('pt-BR');
        
        const nextMilestone = shipment.milestones[currentMilestoneIndex + 1];
        if (nextMilestone) {
            nextMilestone.status = 'in_progress';
        }
    }
    onUpdate({ ...shipment });
  };
  
  const allCompleted = shipment.milestones.every(m => m.status === 'completed');

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg">Embarque: {shipment.id}</CardTitle>
                <CardDescription>{shipment.origin} → {shipment.destination}</CardDescription>
            </div>
            <div className="text-right">
                <p className="font-semibold text-sm">{shipment.customer}</p>
                <p className="text-xs text-muted-foreground">{shipment.overseasPartner.name} ({shipment.overseasPartner.address?.country})</p>
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
            <ul className="space-y-3">
              {shipment.milestones.map((milestone, index) => (
                <li key={index} className="flex items-center gap-3">
                  {milestone.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {milestone.status === 'in_progress' && <CircleDot className="h-5 w-5 text-blue-500 animate-pulse" />}
                  {milestone.status === 'pending' && <CheckCircle className="h-5 w-5 text-muted-foreground/50" />}
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{milestone.name}</p>
                    {milestone.date && <p className="text-xs text-muted-foreground">{milestone.date}</p>}
                  </div>
                </li>
              ))}
            </ul>
        </div>
      </CardContent>
    </Card>
  );
};


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
    return null; // or a loading spinner
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
