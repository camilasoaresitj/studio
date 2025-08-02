
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import type { Shipment } from '@/lib/shipment-data';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ShipmentMap } from '@/components/shipment-map';

interface TrackingError {
    title: string;
    detail: string;
    payload?: any;
    diagnostic?: any;
}

interface ShipmentTrackingTabProps {
    shipment: Shipment;
    onUpdate: (updatedShipment: Partial<Shipment>) => void;
}

export function ShipmentTrackingTab({ shipment, onUpdate }: ShipmentTrackingTabProps) {
    const [isTracking, setIsTracking] = useState(false);
    const [trackingError, setTrackingError] = useState<TrackingError | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const startPolling = (trackingId: string, type: string, carrier?: string) => {
        let attempts = 0;
        const maxAttempts = 6;

        pollingIntervalRef.current = setInterval(async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(pollingIntervalRef.current!);
                setIsTracking(false);
                setTrackingError({
                    title: "Embarque Não Encontrado",
                    detail: "Não foi possível localizar o embarque na API após várias tentativas."
                });
                return;
            }
            await handleRefreshTracking(true);
        }, 10000);
    };

    const handleRefreshTracking = async (isPolling = false) => {
        let trackingId: string | undefined;
        let type: 'bookingNumber' | 'containerNumber' | 'mblNumber' = 'bookingNumber';

        if (shipment.bookingNumber) {
            trackingId = shipment.bookingNumber;
            type = 'bookingNumber';
        } else if (shipment.containers && shipment.containers.length > 0 && shipment.containers[0].number) {
            trackingId = shipment.containers[0].number;
            type = 'containerNumber';
        } else if (shipment.masterBillNumber) {
            trackingId = shipment.masterBillNumber;
            type = 'mblNumber';
        }

        if (!trackingId) {
            setTrackingError({
                title: "Dados Incompletos",
                detail: "Número de booking, contêiner ou MBL é necessário para o rastreamento."
            });
            return;
        }

        if (!isPolling) {
             setIsTracking(true);
             setTrackingError(null);
             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        }
       
        try {
            const res = await fetch(`/api/tracking/${trackingId}?type=${type}&carrierName=${encodeURIComponent(shipment.carrier || '')}`, { cache: 'no-store' });
            const data = await res.json();
            
            if (!res.ok) {
                 if (data.status === 'not_found' || data.status === 'creating') {
                    if (!isPolling) startPolling(trackingId, type, shipment.carrier);
                    return;
                 }
                 throw data;
            }
            
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsTracking(false);
            setTrackingError(null);

            const updateData = data.shipment;
            
            const existingMilestones = new Map((shipment.milestones || []).map(m => [m.name, m]));
            const newMilestones = updateData.milestones.map((newM: any) => {
                const existing = existingMilestones.get(newM.name);
                if (existing && existing.effectiveDate) {
                    return { ...newM, effectiveDate: existing.effectiveDate };
                }
                return newM;
            });

            onUpdate({
                lastTrackingUpdate: new Date(),
                vesselName: updateData.vesselName || shipment.vesselName,
                voyageNumber: updateData.voyageNumber || shipment.voyageNumber,
                etd: updateData.etd ? new Date(updateData.etd) : shipment.etd,
                eta: updateData.eta ? new Date(updateData.eta) : shipment.eta,
                origin: updateData.origin || shipment.origin,
                destination: updateData.destination || shipment.destination,
                containers: updateData.containers && updateData.containers.length > 0 ? updateData.containers : shipment.containers,
                transshipments: updateData.transshipments && updateData.transshipments.length > 0 ? updateData.transshipments : shipment.transshipments,
                milestones: newMilestones,
            });
            
             toast({
                title: "Rastreamento Sincronizado!",
                description: `Dados atualizados para ${type}: ${trackingId}.`,
                className: 'bg-success text-success-foreground'
            });

        } catch (error: any) {
            console.error("Tracking failed:", error);
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setTrackingError({
                title: error.error || 'Erro ao Carregar Rastreamento',
                detail: error.message || "Ocorreu um erro inesperado.",
                payload: error.payload,
                diagnostic: error.diagnostic,
            });
            setIsTracking(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Rastreamento Automatizado</CardTitle>
                        <Button size="sm" type="button" variant="outline" onClick={() => handleRefreshTracking(false)} disabled={isTracking}>
                            {isTracking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            {isTracking ? 'Rastreando...' : 'Rastrear Agora'}
                        </Button>
                    </div>
                     <CardDescription>
                        Acompanhe a localização e os principais eventos do seu embarque em tempo real.
                     </CardDescription>
                </CardHeader>
                <CardContent>
                    {trackingError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>{trackingError.title}</AlertTitle>
                            <AlertDescription>
                                <p><b>Detalhes:</b> {trackingError.detail}</p>
                                {trackingError.payload && (
                                    <div className="mt-2">
                                        <b>Payload Enviado:</b>
                                        <pre className="text-xs bg-black/20 p-2 rounded-md mt-1 overflow-auto">
                                            {JSON.stringify(trackingError.payload, null, 2)}
                                        </pre>
                                    </div>
                                )}
                                {trackingError.diagnostic && (
                                    <div className="mt-2">
                                        <b>Diagnóstico da API:</b>
                                        <pre className="text-xs bg-black/20 p-2 rounded-md mt-1 overflow-auto">
                                            {JSON.stringify(trackingError.diagnostic, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
            {shipment.id ? (
                <ShipmentMap shipmentNumber={shipment.id} />
            ) : null}
        </div>
    );
}
