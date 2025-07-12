
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getShipments, updateShipment, Shipment, ContainerDetail } from '@/lib/shipment';
import { addDays, differenceInDays, format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, DollarSign, FileCheck, Ship, ArrowUp, ArrowDown } from 'lucide-react';
import { DemurrageDetailsDialog } from '@/components/demurrage-details-dialog';
import { getFinancialEntries } from '@/lib/financials-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DemurrageTariffRegistry } from '@/components/demurrage-tariff-registry';
import { getDemurrageTariffs, DemurrageTariff } from '@/lib/demurrage-tariffs-data';
import { getPartners, Partner } from '@/lib/partners-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { LtiTariffRegistry } from '@/components/lti-tariff-registry';
import { LtiTariff, getLtiTariffs } from '@/lib/lti-tariffs-data';


export type DemurrageItem = {
    type: 'demurrage' | 'detention';
    container: ContainerDetail;
    shipment: Shipment;
    startDate: Date | null;
    endDate: Date | null;
    effectiveEndDate?: Date | null;
    freeDays: number;
    overdueDays: number;
    status: 'ok' | 'risk' | 'overdue' | 'invoiced';
};

export default function DemurragePage() {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [demurrageTariffs, setDemurrageTariffs] = useState<DemurrageTariff[]>([]);
    const [ltiTariffs, setLtiTariffs] = useState<LtiTariff[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isClient, setIsClient] = useState(false);
    const [selectedDemurrageItem, setSelectedDemurrageItem] = useState<DemurrageItem | null>(null);
    const [filters, setFilters] = useState({
        type: 'all',
        status: 'all',
        clientId: 'all',
        returnDate: null as Date | null,
    });


    useEffect(() => {
        setIsClient(true);
        const handleDataChange = () => {
            setShipments(getShipments());
            setDemurrageTariffs(getDemurrageTariffs());
            setLtiTariffs(getLtiTariffs());
            setPartners(getPartners());
        }
        
        handleDataChange();
        window.addEventListener('storage', handleDataChange);
        window.addEventListener('financialsUpdated', handleDataChange);
        window.addEventListener('demurrageTariffsUpdated', handleDataChange);
        window.addEventListener('ltiTariffsUpdated', handleDataChange);


        return () => {
            window.removeEventListener('storage', handleDataChange);
            window.removeEventListener('financialsUpdated', handleDataChange);
            window.removeEventListener('demurrageTariffsUpdated', handleDataChange);
            window.removeEventListener('ltiTariffsUpdated', handleDataChange);
        }

    }, []);

    const handleEffectiveDateChange = (containerNumber: string, dateValue: string, type: 'demurrage' | 'detention') => {
        const newDate = dateValue ? new Date(dateValue) : undefined;
        
        setShipments(currentShipments => {
            const updatedShipments = currentShipments.map(shipment => {
                const containerIndex = shipment.containers?.findIndex(c => c.number === containerNumber);
                if (containerIndex !== -1 && shipment.containers) {
                    const newContainers = [...shipment.containers];
                    const containerToUpdate = newContainers[containerIndex];

                    if (type === 'demurrage') {
                        (containerToUpdate as any).effectiveReturnDate = newDate;
                    } else { // detention
                        (containerToUpdate as any).effectiveGateInDate = newDate;
                    }

                    const updatedShipmentData = { ...shipment, containers: newContainers };
                    updateShipment(updatedShipmentData); 
                    return updatedShipmentData;
                }
                return shipment;
            });
            return updatedShipments;
        });
    };

    const allItems = useMemo((): DemurrageItem[] => {
        if (!isClient) return [];
        
        const financialEntries = getFinancialEntries();
        const items: DemurrageItem[] = [];

        shipments.forEach(shipment => {
            if (!shipment.containers || shipment.containers.length === 0) return;

            // --- Demurrage (Import) ---
            if (shipment.destination.toUpperCase().includes('BR')) {
                const arrivalMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('chegada'));
                const arrivalDate = arrivalMilestone?.effectiveDate ? new Date(arrivalMilestone.effectiveDate) : (shipment.eta ? new Date(shipment.eta) : null);

                if (arrivalDate && isValid(arrivalDate)) {
                    shipment.containers.forEach(container => {
                        const freeDays = parseInt(container.freeTime || shipment.details.freeTime || '7', 10);
                        const endDate = addDays(arrivalDate, freeDays);
                        const effectiveEndDate = (container as any).effectiveReturnDate ? new Date((container as any).effectiveReturnDate) : null;
                        
                        const referenceDate = effectiveEndDate && isValid(effectiveEndDate) ? effectiveEndDate : new Date();
                        const overdueDays = differenceInDays(referenceDate, endDate);

                        const invoiceId = `DEM-${container.number}`;
                        const isInvoiced = financialEntries.some(e => e.invoiceId === invoiceId);
                        let status: DemurrageItem['status'] = isInvoiced ? 'invoiced' : 'ok';

                        if (!isInvoiced) {
                           if (overdueDays > 0) {
                                status = 'overdue';
                            } else if (overdueDays >= -3) { 
                                status = 'risk';
                            }
                        }

                        items.push({
                            type: 'demurrage', container, shipment, startDate: arrivalDate, endDate, effectiveEndDate,
                            freeDays, overdueDays: overdueDays > 0 ? overdueDays : 0, status,
                        });
                    });
                }
            }

            // --- Detention (Export) ---
             if (shipment.origin.toUpperCase().includes('BR')) {
                const pickupMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('retirada do vazio'));
                const gateinMilestone = shipment.milestones.find(m => m.name.toLowerCase().includes('gate in'));
                
                // Use effective date if available, otherwise fall back to predicted date for monitoring
                const startDate = pickupMilestone?.effectiveDate ? new Date(pickupMilestone.effectiveDate) : (pickupMilestone?.predictedDate ? new Date(pickupMilestone.predictedDate) : null);

                if (startDate && isValid(startDate)) {
                     shipment.containers.forEach(container => {
                        const freeDays = parseInt(container.freeTime || shipment.details.freeTime || '7', 10);
                        const endDate = addDays(startDate, freeDays);
                        const effectiveEndDate = (container as any).effectiveGateInDate || (gateinMilestone?.effectiveDate ? new Date(gateinMilestone.effectiveDate) : null);
                        
                        const referenceDate = effectiveEndDate && isValid(effectiveEndDate) ? effectiveEndDate : new Date();
                        const overdueDays = differenceInDays(referenceDate, endDate);
                        
                        const invoiceId = `DET-${container.number}`;
                        const isInvoiced = financialEntries.some(e => e.invoiceId === invoiceId);
                        let status: DemurrageItem['status'] = isInvoiced ? 'invoiced' : 'ok';
                        
                         if (!isInvoiced) {
                           if (overdueDays > 0) {
                                status = 'overdue';
                            } else if (overdueDays >= -3) { 
                                status = 'risk';
                            }
                        }
                        
                        items.push({
                            type: 'detention', container, shipment, startDate, endDate, effectiveEndDate,
                            freeDays, overdueDays: overdueDays > 0 ? overdueDays : 0, status,
                        });
                    });
                }
            }
        });

        return items.sort((a, b) => (a.endDate?.getTime() || 0) - (b.endDate?.getTime() || 0));

    }, [shipments, isClient]);

    const filteredItems = useMemo(() => {
        return allItems.filter(item => {
            if (filters.type !== 'all' && item.type !== filters.type) return false;
            if (filters.status !== 'all' && item.status !== filters.status) return false;
            if (filters.clientId !== 'all' && item.shipment.customer !== filters.clientId) return false;
            if (filters.returnDate && (!item.endDate || format(item.endDate, 'yyyy-MM-dd') !== format(filters.returnDate, 'yyyy-MM-dd'))) return false;
            return true;
        });
    }, [allItems, filters]);

    const dashboardData = useMemo(() => {
        let totalRevenue = 0;
        const overdueItems = allItems.filter(item => item.overdueDays > 0 && item.status !== 'invoiced');
        
        overdueItems.forEach(item => {
            const containerType = item.container.type.toLowerCase();
            let tariffType: 'dry' | 'reefer' | 'special' = 'dry';
            if (containerType.includes('rf') || containerType.includes('reefer')) tariffType = 'reefer';
            if (containerType.includes('ot') || containerType.includes('fr')) tariffType = 'special';

            const tariff = ltiTariffs.find(t => t.containerType === tariffType);
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
            overdueCount: allItems.filter(item => item.status === 'overdue').length,
            atRiskCount: allItems.filter(item => item.status === 'risk').length
        }
    }, [allItems, ltiTariffs]);

    const statusConfig: Record<DemurrageItem['status'], { variant: 'default' | 'success' | 'destructive' | 'outline', icon: React.ReactNode, text: string }> = {
        ok: { variant: 'success', icon: <CheckCircle className="h-4 w-4" />, text: 'OK' },
        risk: { variant: 'default', icon: <Clock className="h-4 w-4" />, text: 'Em Risco' },
        overdue: { variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" />, text: 'Vencido' },
        invoiced: { variant: 'outline', icon: <FileCheck className="h-4 w-4" />, text: 'Faturado' },
    };
    
    const handleDialogClose = () => {
        setSelectedDemurrageItem(null);
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
                <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="cost_tariffs">Tarifas de Armador (Custo)</TabsTrigger>
                    <TabsTrigger value="sale_tariffs">Tarifas de Venda (LTI)</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                     <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Lucratividade Potencial (Mês)</CardTitle>
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-success">USD {dashboardData.totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                                <p className="text-xs text-muted-foreground">Receita a ser faturada de sobrestadia.</p>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer" onClick={() => setFilters(f => ({...f, status: 'risk'}))}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Contêineres em Risco</CardTitle>
                                <Clock className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dashboardData.atRiskCount}</div>
                                <p className="text-xs text-muted-foreground">Vencem nos próximos 3 dias.</p>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer" onClick={() => setFilters(f => ({...f, status: 'overdue'}))}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Contêineres Vencidos</CardTitle>
                                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{dashboardData.overdueCount}</div>
                                <p className="text-xs text-muted-foreground">Já estão acumulando sobrestadia.</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Visão Geral dos Contêineres</CardTitle>
                             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                                <Select value={filters.type} onValueChange={(v) => setFilters(f => ({...f, type: v}))}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos os Tipos</SelectItem><SelectItem value="demurrage">Demurrage</SelectItem><SelectItem value="detention">Detention</SelectItem></SelectContent>
                                </Select>
                                <Select value={filters.status} onValueChange={(v) => setFilters(f => ({...f, status: v}))}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos Status</SelectItem><SelectItem value="ok">OK</SelectItem><SelectItem value="risk">Em Risco</SelectItem><SelectItem value="overdue">Vencido</SelectItem><SelectItem value="invoiced">Faturado</SelectItem></SelectContent>
                                </Select>
                                 <Select value={filters.clientId} onValueChange={(v) => setFilters(f => ({...f, clientId: v}))}>
                                    <SelectTrigger><SelectValue placeholder="Todos Clientes"/></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Todos os Clientes</SelectItem>{partners.filter(p => p.roles.cliente).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("justify-start text-left font-normal", !filters.returnDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {filters.returnDate ? format(filters.returnDate, "dd/MM/yyyy") : <span>Data de Devolução</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={filters.returnDate} onSelect={(d) => setFilters(f => ({...f, returnDate: d || null}))} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Contêiner</TableHead>
                                            <TableHead>Processo</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Armador</TableHead>
                                            <TableHead>Início Free Time</TableHead>
                                            <TableHead>Dias Livres</TableHead>
                                            <TableHead>Devolução</TableHead>
                                            <TableHead>Data Efetiva</TableHead>
                                            <TableHead>Dias Excedidos</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.length > 0 ? (
                                            filteredItems.map(item => {
                                                const config = statusConfig[item.status];
                                                const isDetention = item.type === 'detention';
                                                return (
                                                    <TableRow 
                                                        key={`${item.container.id}-${item.type}`} 
                                                        className={cn("cursor-pointer", item.status === 'overdue' && 'bg-destructive/10', item.status === 'invoiced' && 'bg-green-500/10')}
                                                        onClick={() => setSelectedDemurrageItem(item)}
                                                    >
                                                        <TableCell>
                                                            <Badge variant={isDetention ? 'default' : 'secondary'} className={cn(isDetention && 'bg-orange-500 text-white')}>
                                                                {isDetention ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                                                                {isDetention ? 'Detention' : 'Demurrage'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{item.container.number}</TableCell>
                                                        <TableCell>{item.shipment.id}</TableCell>
                                                        <TableCell>{item.shipment.customer}</TableCell>
                                                        <TableCell>{item.shipment.carrier}</TableCell>
                                                        <TableCell>{item.startDate ? format(item.startDate, 'dd/MM/yy') : 'N/A'}</TableCell>
                                                        <TableCell>{item.freeDays}</TableCell>
                                                        <TableCell className="font-semibold">{item.endDate ? format(item.endDate, 'dd/MM/yy') : 'N/A'}</TableCell>
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            <Input
                                                                type="date"
                                                                className="h-8 w-32"
                                                                value={item.effectiveEndDate ? format(item.effectiveEndDate, 'yyyy-MM-dd') : ''}
                                                                onChange={(e) => handleEffectiveDateChange(item.container.number, e.target.value, item.type)}
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
                                                <TableCell colSpan={11} className="h-24 text-center">
                                                    Nenhum item encontrado com os filtros selecionados.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="cost_tariffs">
                    <DemurrageTariffRegistry />
                </TabsContent>
                <TabsContent value="sale_tariffs">
                    <LtiTariffRegistry />
                </TabsContent>
            </Tabs>
        </div>
        <DemurrageDetailsDialog
            isOpen={!!selectedDemurrageItem}
            onClose={handleDialogClose}
            item={selectedDemurrageItem}
            costTariffs={demurrageTariffs}
            saleTariffs={ltiTariffs}
        />
        </>
    );
}
