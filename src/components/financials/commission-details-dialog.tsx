
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { FileDown, DollarSign } from 'lucide-react';
import type { CommissionableShipment } from './commission-management';
import type { Partner } from '@/lib/shipment';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CommissionDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  commissionableShipment: CommissionableShipment | null;
  partner: Partner | null;
}

export function CommissionDetailsDialog({ isOpen, onClose, commissionableShipment, partner }: CommissionDetailsDialogProps) {
    const { toast } = useToast();

    if (!commissionableShipment || !partner) return null;

    const handleGeneratePdf = () => {
        toast({
            title: "Gerando PDF (Simulação)",
            description: `Um PDF do cálculo de comissão para ${commissionableShipment.shipment.id} foi gerado.`
        });
        // PDF generation logic would go here
    };

    const { shipment, charges, profitBRL, commissionRate, commissionValue } = commissionableShipment;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalhes da Comissão - Processo {shipment.id}</DialogTitle>
          <DialogDescription>
            Análise de receitas, despesas e cálculo da comissão para o parceiro <span className="font-semibold">{partner.name}</span>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Lucro Total do Processo</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-success">BRL {profitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Taxa de Comissão</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold">{commissionRate.toFixed(2)}%</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Valor da Comissão</CardTitle></CardHeader>
                        <CardContent><p className="text-2xl font-bold text-primary">BRL {commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></CardContent>
                    </Card>
                </div>

                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle className="text-lg">Extrato de Custos e Vendas (em BRL)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descrição da Taxa</TableHead>
                                        <TableHead className="text-right">Venda (BRL)</TableHead>
                                        <TableHead className="text-right">Custo (BRL)</TableHead>
                                        <TableHead className="text-right">Lucro (BRL)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {charges.map(charge => (
                                        <TableRow key={charge.id}>
                                            <TableCell className="font-medium">{charge.name}</TableCell>
                                            <TableCell className="text-right font-mono">{(charge.sale * (charge.saleCurrency === 'BRL' ? 1 : 5.25)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">{(charge.cost * (charge.costCurrency === 'BRL' ? 1 : 5.25)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                            <TableCell className={cn("text-right font-mono font-semibold", charge.profitBRL < 0 ? 'text-destructive' : 'text-success')}>
                                                {charge.profitBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={handleGeneratePdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Gerar PDF do Cálculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    