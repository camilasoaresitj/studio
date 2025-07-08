
'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Shipment } from '@/lib/shipment';

interface ShipmentDetailsSheetProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShipmentDetailsSheet({ shipment, open, onOpenChange }: ShipmentDetailsSheetProps) {
    const { toast } = useToast();

    if (!shipment) {
        return null;
    }

    const handleInvoicing = (type: 'payable' | 'receivable') => {
        toast({
            title: `Faturamento Iniciado (${type === 'receivable' ? 'A Receber' : 'A Pagar'})`,
            description: `As faturas para o embarque ${shipment.id} foram geradas e enviadas ao Módulo Financeiro.`,
            className: 'bg-success text-success-foreground'
        })
    }

    const { overseasPartner, agent } = shipment;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-4xl w-full flex flex-col">
                <SheetHeader>
                    <SheetTitle>Detalhes do Embarque: {shipment.id}</SheetTitle>
                    <SheetDescription>
                        {shipment.origin} → {shipment.destination} para <strong>{shipment.customer}</strong>
                    </SheetDescription>
                </SheetHeader>
                <Separator />
                <div className="flex-grow overflow-y-auto pr-6 -mr-6 space-y-6">
                    {/* Partners Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
                            <CardContent className="text-sm">
                                <p className="font-semibold">{shipment.customer}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">{shipment.destination.includes('BR') ? 'Exportador' : 'Importador'}</CardTitle></CardHeader>
                            <CardContent className="text-sm">
                                <p className="font-semibold">{overseasPartner.name}</p>
                                <p className="text-muted-foreground">{overseasPartner.address.city}, {overseasPartner.address.country}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base">Agente</CardTitle></CardHeader>
                            <CardContent className="text-sm">
                                {agent ? (
                                    <>
                                        <p className="font-semibold">{agent.name}</p>
                                        <p className="text-muted-foreground">{agent.address.city}, {agent.address.country}</p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Embarque Direto</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charges Table */}
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Detalhamento Financeiro</CardTitle></CardHeader>
                        <CardContent>
                             <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Fornecedor</TableHead>
                                            <TableHead className="text-right">Custo</TableHead>
                                            <TableHead className="text-right">Venda</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {shipment.charges.map(charge => (
                                            <TableRow key={charge.id}>
                                                <TableCell>{charge.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{charge.supplier}</TableCell>
                                                <TableCell className="text-right font-mono">{charge.costCurrency} {charge.cost.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-mono text-primary font-semibold">{charge.saleCurrency} {charge.sale.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <SheetFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => handleInvoicing('payable')}>
                        Faturar Contas a Pagar
                    </Button>
                    <Button onClick={() => handleInvoicing('receivable')}>
                        Faturar Contas a Receber
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

    