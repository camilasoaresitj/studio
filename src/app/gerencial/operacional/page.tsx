
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { Shipment } from '@/lib/shipment-data';
import { getStoredShipments, saveShipments } from '@/lib/shipment-data-client';
import { getStoredPartners, type Partner } from '@/lib/partners-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportantTasks } from '@/components/important-tasks';
import { RecentShipments } from '@/components/recent-shipments';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';

function OperacionalPageContent() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const searchParams = useSearchParams();
    const { toast } = useToast();
  
    const loadData = useCallback(() => {
        const allShipments = getStoredShipments();
        setShipments(allShipments);
        setPartners(getStoredPartners());

        const shipmentIdFromUrl = searchParams.get('shipmentId');
        if (shipmentIdFromUrl && !selectedShipment) {
            const shipmentToOpen = allShipments.find(s => s.id === shipmentIdFromUrl);
            if (shipmentToOpen) {
                handleSelectShipment(shipmentToOpen);
            }
        }
    }, [searchParams, selectedShipment]);
  
    useEffect(() => {
      loadData();
      window.addEventListener('shipmentsUpdated', loadData);
      window.addEventListener('partnersUpdated', loadData);
      return () => {
        window.removeEventListener('shipmentsUpdated', loadData);
        window.removeEventListener('partnersUpdated', loadData);
      };
    }, [loadData]);
  
    const handleSelectShipment = (shipment: Shipment) => {
      setSelectedShipment(shipment);
      setIsSheetOpen(true);
    };
  
    const handleUpdateShipment = (updatedShipment: Shipment) => {
        const newShipments = shipments.map(s => s.id === updatedShipment.id ? updatedShipment : s);
        saveShipments(newShipments);
        setShipments(newShipments);
        setSelectedShipment(updatedShipment); 
    };
  
    const handleSheetOpenChange = (open: boolean) => {
      setIsSheetOpen(open);
      if (!open) {
        setSelectedShipment(null);
        // Clear URL parameter when sheet closes
        const newUrl = window.location.pathname;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      }
    };
  
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Operacional</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitore e gerencie todos os seus embarques ativos.
          </p>
        </header>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <RecentShipments />
            </div>
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Tarefas Importantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ImportantTasks onTaskClick={handleSelectShipment} />
                    </CardContent>
                </Card>
            </div>
        </div>
  
        <ShipmentDetailsSheet
          shipment={selectedShipment}
          partners={partners}
          open={isSheetOpen}
          onOpenChange={handleSheetOpenChange}
          onUpdate={handleUpdateShipment}
        />
      </div>
    );
}

export default function OperacionalPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <OperacionalPageContent />
        </Suspense>
    );
}
