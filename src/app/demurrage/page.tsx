
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getShipments, updateShipment, Shipment, ContainerDetail } from '@/lib/shipment';
import { addDays, differenceInDays, format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

type DemurrageItem = {
    container: ContainerDetail;
    shipment: Shipment;
    arrivalDate: Date | null;
    returnDate: Date | null;
    effectiveReturnDate?: Date | null;
    freeDays: number;
    overdueDays: number;
    status: 'ok' | 'risk' | 'overdue';
};

export default function DemurragePage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        setShipments(getShipments());
    }, []);

    const handleEffectiveReturnDateChange = (containerNumber: string, dateValue: string) => {
        const newDate = dateValue ? new Date(dateValue) : undefined;
        
        setShipments(currentShipments => {
            const updatedShipments = currentShipments.map(shipment => {
                const containerIndex = shipment.containers?.findIndex(c => c.number === containerNumber);
                if (containerIndex !== -1 && shipment.containers) {
                    const newContainers = [...shipment.containers];
                    newContainers[containerIndex] = {
                        ...newContainers[containerIndex],
                        effectiveReturnDate: newDate,
                    } as any; // Cast to avoid TS error on new property

                    const updatedShipmentData = { ...shipment, containers: newContainers };
                    updateShipment(updatedShipmentData); // Save to local storage
                    return updatedShipmentData;
                }
                return shipment;
            });
            return updatedShipments;
        });
    };

    const demurrageItems = useMemo((): DemurrageItem[] => {
        if (!isClient) return [];
        
        return shipments
            .filter(shipment => shipment.destination.toUpperCase().includes('BR') && shipment.containers && shipment.containers.length > 0)
            .flatMap(shipment => {
                const arrivalMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('chegada'));
                const arrivalDate = arrivalMilestone?.effectiveDate ? new Date(arrivalMilestone.effectiveDate) : (shipment.eta ? new Date(shipment.eta) : null);

                if (!arrivalDate || !isValid(arrivalDate)) return [];

                return shipment.containers!.map(container => {
                    const freeDays = parseInt(container.freeTime || shipment.details.freeTime || '7', 10);
                    const returnDate = addDays(arrivalDate, freeDays);
                    const effectiveReturnDate = (container as any).effectiveReturnDate ? new Date((container as any).effectiveReturnDate) : null;
                    
                    const referenceDate = effectiveReturnDate && isValid(effectiveReturnDate) ? effectiveReturnDate : new Date();
                    const overdueDays = differenceInDays(referenceDate, returnDate);

                    let status: 'ok' | 'risk' | 'overdue' = 'ok';
                    if (overdueDays > 0) {
                        status = 'overdue';
                    } else if (overdueDays >= -3) { // 3 days or less until deadline
                        status = 'risk';
                    }

                    return {
                        container,
                        shipment,
                        arrivalDate,
                        returnDate,
                        effectiveReturnDate,
                        freeDays,
                        overdueDays: overdueDays > 0 ? overdueDays : 0,
                        status,
                    };
                });
            })
            .sort((a, b) => a.returnDate!.getTime() - b.returnDate!.getTime());
    }, [shipments, isClient]);

    const statusConfig = {
        ok: { variant: 'success', icon: <CheckCircle className="h-4 w-4" />, text: 'OK' },
        risk: { variant: 'default', icon: <Clock className="h-4 w-4" />, text: 'Em Risco' },
        overdue: { variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" />, text: 'Vencido' },
    };

    if (!isClient) return null;

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Controle de Demurrage & Detention</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Monitore os prazos de devolução de contêineres e evite custos extras.
                </p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>Visão Geral dos Contêineres</CardTitle>
                    <CardDescription>
                        Lista de contêineres de importação monitorados. Insira a data efetiva de devolução para parar o contador.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Contêiner</TableHead>
                                    <TableHead>Processo</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Armador</TableHead>
                                    <TableHead>Chegada</TableHead>
                                    <TableHead>Dias Livres</TableHead>
                                    <TableHead>Devolução</TableHead>
                                    <TableHead>Data Efetiva</TableHead>
                                    <TableHead>Dias Excedidos</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {demurrageItems.length > 0 ? (
                                    demurrageItems.map(item => {
                                        const config = statusConfig[item.status];
                                        return (
                                            <TableRow key={item.container.id} className={cn(item.status === 'overdue' && 'bg-destructive/10')}>
                                                <TableCell className="font-medium">{item.container.number}</TableCell>
                                                <TableCell>{item.shipment.id}</TableCell>
                                                <TableCell>{item.shipment.customer}</TableCell>
                                                <TableCell>{item.shipment.carrier}</TableCell>
                                                <TableCell>{item.arrivalDate ? format(item.arrivalDate, 'dd/MM/yy') : 'N/A'}</TableCell>
                                                <TableCell>{item.freeDays}</TableCell>
                                                <TableCell className="font-semibold">{item.returnDate ? format(item.returnDate, 'dd/MM/yy') : 'N/A'}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="date"
                                                        className="h-8 w-32"
                                                        value={item.effectiveReturnDate ? format(item.effectiveReturnDate, 'yyyy-MM-dd') : ''}
                                                        onChange={(e) => handleEffectiveReturnDateChange(item.container.number, e.target.value)}
                                                    />
                                                </TableCell>
                                                <TableCell className={cn("font-bold", item.overdueDays > 0 && 'text-destructive')}>
                                                    {item.overdueDays}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                                                        {config.icon} {config.text}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-24 text-center">
                                            Nenhum contêiner de importação ativo para monitorar.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
