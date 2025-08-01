
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CalendarCheck2 } from 'lucide-react';
import { getStoredShipments, Shipment, ContainerDetail } from '@/lib/shipment-data-client';
import { DemurrageDetailsDialog } from '@/components/demurrage-details-dialog';
import { DemurrageTariff, getStoredDemurrageTariffs } from '@/lib/demurrage-tariffs-data';
import { LtiTariff, getStoredLtiTariffs } from '@/lib/lti-tariffs-data';
import { differenceInDays, addDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface DemurrageItem {
    id: string;
    shipment: Shipment;
    container: ContainerDetail;
    type: 'demurrage' | 'detention';
    startDate: Date | null;
    endDate: Date | null;
    effectiveEndDate: Date | null;
    freeDays: number;
    overdueDays: number;
    status: 'ok' | 'at_risk' | 'overdue' | 'invoiced';
}

export default function DemurragePage() {
    const [items, setItems] = useState<DemurrageItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<DemurrageItem | null>(null);
    const [costTariffs, setCostTariffs] = useState<DemurrageTariff[]>([]);
    const [saleTariffs, setLtiTariffs] = useState<LtiTariff[]>([]);

    useEffect(() => {
        const calculateDemurrage = () => {
            const shipments = getStoredShipments();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const allItems: DemurrageItem[] = [];

            shipments.forEach(s => {
                if (s.containers) {
                    s.containers.forEach(c => {
                        const freeDays = parseInt(s.details.freeTime.replace(/\D/g, '') || '7');
                        const isImport = s.destination.toUpperCase().includes('BR');
                        
                        if (isImport && s.eta) {
                            const startDate = new Date(s.eta);
                            const endDate = addDays(startDate, freeDays - 1);
                            const effectiveReturnDate = c.effectiveReturnDate ? new Date(c.effectiveReturnDate) : null;
                            const overdueDays = effectiveReturnDate ? Math.max(0, differenceInDays(effectiveReturnDate, endDate)) : Math.max(0, differenceInDays(today, endDate));
                            
                            let status: DemurrageItem['status'] = 'ok';
                            if (overdueDays > 0) status = 'overdue';
                            else if (differenceInDays(endDate, today) <= 3) status = 'at_risk';
                            
                             allItems.push({
                                id: `${s.id}-${c.number}-demurrage`,
                                shipment: s,
                                container: c,
                                type: 'demurrage',
                                startDate,
                                endDate,
                                effectiveEndDate: effectiveReturnDate,
                                freeDays,
                                overdueDays,
                                status,
                            });
                        }

                        if (!isImport && s.etd) {
                           const gateInMilestone = s.milestones.find(m => m.name.toLowerCase().includes('gate in'));
                           const pickupMilestone = s.milestones.find(m => m.name.toLowerCase().includes('retirada do vazio'));

                           if (pickupMilestone?.effectiveDate) {
                               const startDate = new Date(pickupMilestone.effectiveDate);
                               const endDate = addDays(startDate, freeDays - 1);
                               const effectiveGateInDate = gateInMilestone?.effectiveDate ? new Date(gateInMilestone.effectiveDate) : null;
                               const overdueDays = effectiveGateInDate ? Math.max(0, differenceInDays(effectiveGateInDate, endDate)) : Math.max(0, differenceInDays(today, endDate));

                               let status: DemurrageItem['status'] = 'ok';
                               if (overdueDays > 0) status = 'overdue';
                               else if (differenceInDays(endDate, today) <= 3) status = 'at_risk';

                               allItems.push({
                                    id: `${s.id}-${c.number}-detention`,
                                    shipment: s,
                                    container: c,
                                    type: 'detention',
                                    startDate,
                                    endDate,
                                    effectiveEndDate: effectiveGateInDate,
                                    freeDays,
                                    overdueDays,
                                    status,
                                });
                           }
                        }
                    });
                }
            });
            setItems(allItems);
        };
        
        calculateDemurrage();
        setCostTariffs(getStoredDemurrageTariffs());
        setLtiTariffs(getStoredLtiTariffs());
        
        window.addEventListener('shipmentsUpdated', calculateDemurrage);
        return () => window.removeEventListener('shipmentsUpdated', calculateDemurrage);

    }, []);
    
    const atRiskItems = useMemo(() => items.filter(item => item.status === 'at_risk' && item.overdueDays === 0), [items]);
    const overdueItems = useMemo(() => items.filter(item => item.status === 'overdue' || item.overdueDays > 0), [items]);
    
    const getStatusVariant = (status: DemurrageItem['status']) => {
        switch (status) {
            case 'overdue': return 'destructive';
            case 'at_risk': return 'default';
            default: return 'success';
        }
    };

    const renderItemsTable = (data: DemurrageItem[]) => (
        <div className="border rounded-lg">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Processo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contêiner</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prazo Final</TableHead>
                    <TableHead>Dias Excedidos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length > 0 ? data.map((item) => (
                <TableRow key={item.id}>
                    <TableCell className="font-medium text-primary">{item.shipment.id}</TableCell>
                    <TableCell>{item.shipment.customer}</TableCell>
                    <TableCell>{item.container.number}</TableCell>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell>{item.endDate ? item.endDate.toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={item.overdueDays > 0 ? "destructive" : "secondary"}>
                           {item.overdueDays}
                        </Badge>
                    </TableCell>
                    <TableCell>
                         <Badge variant={getStatusVariant(item.status)} className="capitalize">
                           {item.status === 'at_risk' ? 'Em Risco' : item.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                            Ver Detalhes
                        </Button>
                    </TableCell>
                </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={8} className="h-24 text-center">Nenhum item encontrado.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
        </div>
    );


    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Controle de Demurrage & Detention</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Monitore os prazos de devolução de contêineres e gerencie cobranças.
                </p>
            </header>

            <Tabs defaultValue="overdue" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overdue">
                        <AlertTriangle className="mr-2 h-4 w-4"/>
                        Vencidos ({overdueItems.length})
                    </TabsTrigger>
                    <TabsTrigger value="at_risk">
                        <CalendarCheck2 className="mr-2 h-4 w-4"/>
                        Em Risco ({atRiskItems.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overdue" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contêineres Vencidos</CardTitle>
                            <CardDescription>Estes contêineres já excederam o prazo de free time e estão gerando custos.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderItemsTable(overdueItems)}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="at_risk" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contêineres em Risco</CardTitle>
                            <CardDescription>Estes contêineres estão próximos do vencimento do free time. Acompanhe de perto.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderItemsTable(atRiskItems)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            
            <DemurrageDetailsDialog 
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                item={selectedItem}
                costTariffs={costTariffs}
                saleTariffs={saleTariffs}
            />
        </div>
    );
}

    
