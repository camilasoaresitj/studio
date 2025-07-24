
'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Search } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Shipment, getShipments, saveShipments } from '@/lib/shipment';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';
import { ShipmentDetailsSheet } from '@/components/shipment-details-sheet';
import { ImportantTasks } from '@/components/important-tasks';

export default function OperacionalPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filters, setFilters] = useState({
    id: '',
    customer: '',
    bl: '',
    route: '',
  });

  useEffect(() => {
    const allShipments = getShipments();
    const sortedShipments = allShipments.sort((a, b) => 
      (b.etd ? new Date(b.etd).getTime() : 0) - (a.etd ? new Date(a.etd).getTime() : 0)
    );
    setShipments(sortedShipments);
    setPartners(getPartners());
  }, []);

  const handleUpdateShipment = (updatedShipment: Shipment) => {
    const updatedShipments = shipments.map(s => s.id === updatedShipment.id ? updatedShipment : s);
    setShipments(updatedShipments);
    saveShipments(updatedShipments);
    setSelectedShipment(updatedShipment);
  };
  
  const handleOpenSheet = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsSheetOpen(true);
  };

  const getShipmentStatus = (shipment: Shipment): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (!shipment.milestones || shipment.milestones.length === 0) {
      return { text: 'Não iniciado', variant: 'secondary' };
    }
  
    const firstPending = shipment.milestones.find(m => m.status === 'pending' || m.status === 'in_progress');
  
    if (!firstPending) {
      return { text: 'Finalizado', variant: 'outline' };
    }
  
    const firstPendingName = firstPending.name.toLowerCase();
    
    const departureCompleted = shipment.milestones.some(m => 
      (m.name.toLowerCase().includes('departure') || m.name.toLowerCase().includes('vessel departure') || m.name.toLowerCase().includes('embarque')) 
      && m.status === 'completed'
    );
  
    if (departureCompleted) {
        if (firstPendingName.includes('chegada') || firstPendingName.includes('arrival') || firstPendingName.includes('discharged')) {
            return { text: 'Chegada no Destino', variant: 'default' };
        }
        return { text: 'Em Trânsito', variant: 'default' };
    }
  
    return { text: `Aguardando Embarque`, variant: 'secondary' };
  };
  
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const filteredShipments = shipments.filter(s => {
      const route = `${s.origin} -> ${s.destination}`;
      return (
          s.id.toLowerCase().includes(filters.id.toLowerCase()) &&
          s.customer.toLowerCase().includes(filters.customer.toLowerCase()) &&
          (s.masterBillNumber?.toLowerCase().includes(filters.bl.toLowerCase()) || s.houseBillNumber?.toLowerCase().includes(filters.bl.toLowerCase())) &&
          route.toLowerCase().includes(filters.route.toLowerCase())
      );
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Operacional</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie todos os processos de embarque ativos e acompanhe as tarefas críticas.
        </p>
      </header>
      
      <ImportantTasks onTaskClick={handleOpenSheet} />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Processos de Embarque</CardTitle>
              <CardDescription>Visualize e gerencie todos os processos de importação e exportação.</CardDescription>
            </div>
             <Button disabled>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Processo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <Input placeholder="Buscar por ID..." value={filters.id} onChange={e => handleFilterChange('id', e.target.value)} />
              <Input placeholder="Buscar por Cliente..." value={filters.customer} onChange={e => handleFilterChange('customer', e.target.value)} />
              <Input placeholder="Buscar por MBL/HBL..." value={filters.bl} onChange={e => handleFilterChange('bl', e.target.value)} />
              <Input placeholder="Buscar por Rota..." value={filters.route} onChange={e => handleFilterChange('route', e.target.value)} />
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Modal</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Master / AWB</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id} onClick={() => handleOpenSheet(shipment)} className="cursor-pointer">
                    <TableCell className="font-medium text-primary">{shipment.id}</TableCell>
                    <TableCell>{shipment.customer}</TableCell>
                    <TableCell>{shipment.details.cargo.includes('kg') ? 'Aéreo' : 'Marítimo'}</TableCell>
                    <TableCell>{shipment.origin} &rarr; {shipment.destination}</TableCell>
                    <TableCell>{shipment.masterBillNumber}</TableCell>
                    <TableCell>
                      <Badge variant={getShipmentStatus(shipment).variant}>{getShipmentStatus(shipment).text}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenSheet(shipment)}>
                              Ver/Editar Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

       <ShipmentDetailsSheet 
        shipment={selectedShipment}
        partners={partners}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onUpdate={handleUpdateShipment}
      />
    </div>
  );
}
