
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getShipments, updateShipment, Shipment, ContainerDetail } from '@/lib/shipment';
import { addDays, differenceInDays, format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { DemurrageDetailsDialog } from '@/components/demurrage-details-dialog';

export type DemurrageItem = {
    container: ContainerDetail;
    shipment: Shipment;
    arrivalDate: Date | null;
    returnDate: Date | null;
    effectiveReturnDate?: Date | null;
    freeDays: number;
    overdueDays: number;
    status: 'ok' | 'risk' | 'overdue';
};

// Simulated tariff data for dashboard calculation.
const SIMULATED_SALE_TARIFF = [
    { from: 1, to: 5, rate: 100 },
    { from: 6, to: 10, rate: 200 },
    { from: 11, to: Infinity, rate: 400 },
];

export default function DemurragePage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [selectedDemurrageItem, setSelectedDemurrageItem] = useState<DemurrageItem | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'risk' | 'overdue'>('all');


    useEffect(() => {
        setIsClient(true);
        // We need to get the latest shipments every time the page loads or data changes.
        // For now, we load it once. A more robust solution might use a state management library.
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
                    } as any; 

                    const updatedShipmentData = { ...shipment, containers: newContainers };
                    updateShipment(updatedShipmentData); 
                    return updatedShipmentData;
                }
                return shipment;
            });
            return updatedShipments;
        });
    };

    const allDemurrageItems = useMemo((): DemurrageItem[] => {
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
                    } else if (overdueDays >= -3) { 
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
            .sort((a, b) => (a.returnDate?.getTime() || 0) - (b.returnDate?.getTime() || 0));
    }, [shipments, isClient]);

    const filteredDemurrageItems = useMemo(() => {
        if (statusFilter === 'all') {
            return allDemurrageItems;
        }
        return allDemurrageItems.filter(item => item.status === statusFilter);
    }, [allDemurrageItems, statusFilter]);

    const dashboardData = useMemo(() => {
        let totalRevenue = 0;
        const overdueItems = allDemurrageItems.filter(item => item.overdueDays > 0);

        overdueItems.forEach(item => {
            let itemRevenue = 0;
            let daysToCalculate = item.overdueDays;
            for (const tariff of SIMULATED_SALE_TARIFF) {
                if (daysToCalculate <= 0) break;
                const daysInPeriod = Math.min(daysToCalculate, tariff.to - tariff.from + 1);
                itemRevenue += daysInPeriod * tariff.rate;
                daysToCalculate -= daysInPeriod;
            }
            totalRevenue += itemRevenue;
        });
        
        return {
            totalRevenue,
            overdueCount: overdueItems.length,
            atRiskCount: allDemurrageItems.filter(item => item.status === 'risk').length
        }
    }, [allDemurrageItems]);

    const statusConfig = {
        ok: { variant: 'success', icon: <CheckCircle className="h-4 w-4" />, text: 'OK' },
        risk: { variant: 'default', icon: <Clock className="h-4 w-4" />, text: 'Em Risco' },
        overdue: { variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" />, text: 'Vencido' },
    };

    if (!isClient) return null;

    return (
        <>
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Controle de Demurrage & Detention</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Monitore os prazos de devolução de contêineres e evite custos extras.
                </p>
            </header>

            <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
                 <Card 
                    className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
                    onClick={() => setStatusFilter('all')}
                 >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lucratividade (Mês)</CardTitle>
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-success">USD {dashboardData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        <p className="text-xs text-muted-foreground">Receita total de demurrage cobrada.</p>
                    </CardContent>
                </Card>
                <Card 
                    className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
                    onClick={() => setStatusFilter('risk')}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contêineres em Risco</CardTitle>
                        <Clock className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardData.atRiskCount}</div>
                        <p className="text-xs text-muted-foreground">Vencem nos próximos 3 dias.</p>
                    </CardContent>
                </Card>
                 <Card 
                    className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
                    onClick={() => setStatusFilter('overdue')}
                 >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Contêineres Vencidos</CardTitle>
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{dashboardData.overdueCount}</div>
                        <p className="text-xs text-muted-foreground">Já estão acumulando demurrage.</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Visão Geral dos Contêineres</CardTitle>
                    <CardDescription>
                       {statusFilter === 'all' && 'Clique em uma linha para ver o extrato financeiro detalhado.'}
                       {statusFilter === 'risk' && <span className="text-primary font-medium">Mostrando contêineres em risco. Clique no card de lucratividade para limpar o filtro.</span>}
                       {statusFilter === 'overdue' && <span className="text-destructive font-medium">Mostrando contêineres vencidos. Clique no card de lucratividade para limpar o filtro.</span>}
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
                                {filteredDemurrageItems.length > 0 ? (
                                    filteredDemurrageItems.map(item => {
                                        const config = statusConfig[item.status];
                                        return (
                                            <TableRow 
                                                key={item.container.id} 
                                                className={cn("cursor-pointer", item.status === 'overdue' && 'bg-destructive/10')}
                                                onClick={() => setSelectedDemurrageItem(item)}
                                            >
                                                <TableCell className="font-medium">{item.container.number}</TableCell>
                                                <TableCell>{item.shipment.id}</TableCell>
                                                <TableCell>{item.shipment.customer}</TableCell>
                                                <TableCell>{item.shipment.carrier}</TableCell>
                                                <TableCell>{item.arrivalDate ? format(item.arrivalDate, 'dd/MM/yy') : 'N/A'}</TableCell>
                                                <TableCell>{item.freeDays}</TableCell>
                                                <TableCell className="font-semibold">{item.returnDate ? format(item.returnDate, 'dd/MM/yy') : 'N/A'}</TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
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
                                            Nenhum contêiner encontrado com os filtros selecionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
        <DemurrageDetailsDialog
            isOpen={!!selectedDemurrageItem}
            onClose={() => setSelectedDemurrageItem(null)}
            item={selectedDemurrageItem}
        />
        </>
    );
}
