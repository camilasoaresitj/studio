
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getShipments, updateShipment, Shipment, ContainerDetail } from '@/lib/shipment';
import { addDays, differenceInDays, format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, DollarSign, FileCheck } from 'lucide-react';
import { DemurrageDetailsDialog } from '@/components/demurrage-details-dialog';
import { getFinancialEntries } from '@/lib/financials-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemurrageTariffRegistry } from '@/components/demurrage-tariff-registry';
import { getDemurrageTariffs, DemurrageTariff } from '@/lib/demurrage-tariffs-data';

export type DemurrageItem = {
    container: ContainerDetail;
    shipment: Shipment;
    arrivalDate: Date | null;
    returnDate: Date | null;
    effectiveReturnDate?: Date | null;
    freeDays: number;
    overdueDays: number;
    status: 'ok' | 'risk' | 'overdue' | 'invoiced';
};

export default function DemurragePage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [demurrageTariffs, setDemurrageTariffs] = useState<DemurrageTariff[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [selectedDemurrageItem, setSelectedDemurrageItem] = useState<DemurrageItem | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'risk' | 'overdue'>('all');

    useEffect(() => {
        setIsClient(true);
        const handleDataChange = () => {
            setShipments(getShipments());
            setDemurrageTariffs(getDemurrageTariffs());
        }
        
        handleDataChange();
        window.addEventListener('storage', handleDataChange);
        window.addEventListener('financialsUpdated', handleDataChange);
        window.addEventListener('demurrageTariffsUpdated', handleDataChange);

        return () => {
            window.removeEventListener('storage', handleDataChange);
            window.removeEventListener('financialsUpdated', handleDataChange);
            window.removeEventListener('demurrageTariffsUpdated', handleDataChange);
        }

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
        
        const financialEntries = getFinancialEntries();

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

                    let status: DemurrageItem['status'] = 'ok';
                    const demurrageInvoiceId = `DEM-${container.number}`;
                    const isInvoiced = financialEntries.some(e => e.invoiceId === demurrageInvoiceId);

                    if (isInvoiced) {
                        status = 'invoiced';
                    } else if (overdueDays > 0) {
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
        const overdueItems = allDemurrageItems.filter(item => item.overdueDays > 0 && item.status !== 'invoiced');
        
        overdueItems.forEach(item => {
            const tariff = demurrageTariffs.find(t => t.carrier.toLowerCase() === item.shipment.carrier?.toLowerCase());
            if (!tariff) return;
            let itemRevenue = 0;
            let daysToCalculate = item.overdueDays;
            for (const period of tariff.salePeriods) {
                if (daysToCalculate <= 0) break;
                const daysInPeriod = Math.min(daysToCalculate, (period.to || Infinity) - period.from + 1);
                itemRevenue += daysInPeriod * period.rate;
                daysToCalculate -= daysInPeriod;
            }
            totalRevenue += itemRevenue;
        });
        
        return {
            totalRevenue,
            overdueCount: allDemurrageItems.filter(item => item.status === 'overdue').length,
            atRiskCount: allDemurrageItems.filter(item => item.status === 'risk').length
        }
    }, [allDemurrageItems, demurrageTariffs]);

    const statusConfig: Record<DemurrageItem['status'], { variant: 'default' | 'success' | 'destructive' | 'outline', icon: React.ReactNode, text: string }> = {
        ok: { variant: 'success', icon: <CheckCircle className="h-4 w-4" />, text: 'OK' },
        risk: { variant: 'default', icon: <Clock className="h-4 w-4" />, text: 'Em Risco' },
        overdue: { variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" />, text: 'Vencido' },
        invoiced: { variant: 'outline', icon: <FileCheck className="h-4 w-4" />, text: 'Faturado' },
    };
    
    const handleDialogClose = () => {
        setSelectedDemurrageItem(null);
        // Force a re-render to reflect new financial data
        setShipments(getShipments());
    }

    if (!isClient) return null;

    return (
        <>
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Controle de Demurrage & Detention</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Monitore os prazos, fature sobreestadias e gerencie suas tabelas de tarifas.
                </p>
            </header>

            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-2 max-w-lg mb-6">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="tariffs">Cadastro de Tarifas</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                     <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
                        <Card 
                            className="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
                            onClick={() => setStatusFilter('all')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lucratividade Potencial (Mês)</CardTitle>
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-success">USD {dashboardData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                                <p className="text-xs text-muted-foreground">Receita a ser faturada de demurrage.</p>
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
                                                        className={cn("cursor-pointer", item.status === 'overdue' && 'bg-destructive/10', item.status === 'invoiced' && 'bg-green-500/10')}
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
                                                        <TableCell className={cn("font-bold", item.overdueDays > 0 && item.status !== 'invoiced' && 'text-destructive')}>
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
                </TabsContent>
                <TabsContent value="tariffs">
                    <DemurrageTariffRegistry />
                </TabsContent>
            </Tabs>
        </div>
        <DemurrageDetailsDialog
            isOpen={!!selectedDemurrageItem}
            onClose={handleDialogClose}
            item={selectedDemurrageItem}
            tariffs={demurrageTariffs}
        />
        </>
    );
}
