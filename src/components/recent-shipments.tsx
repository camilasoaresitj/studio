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
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const shipmentsData = [
  { id: 'AWB-724598', origin: 'Xangai (CN)', destination: 'Santos (BR)', status: 'Em trânsito', modal: 'Marítimo' },
  { id: 'MAWB-314256', origin: 'Miami (US)', destination: 'Guarulhos (BR)', status: 'Entregue', modal: 'Aéreo' },
  { id: 'BL-998172', origin: 'Roterdã (NL)', destination: 'Paranaguá (BR)', status: 'Aguardando embarque', modal: 'Marítimo' },
  { id: 'CNEE-451023', origin: 'Frankfurt (DE)', destination: 'Viracopos (BR)', status: 'Na alfândega', modal: 'Aéreo' },
  { id: 'INV-2024-068', origin: 'Hamburgo (DE)', destination: 'Itajaí (BR)', status: 'Em trânsito', modal: 'Marítimo' },
];

export function RecentShipments() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Embarques Recentes</CardTitle>
          <CardDescription>Acompanhe os embarques mais recentes.</CardDescription>
        </div>
        <Link href="/tracking" legacyBehavior>
            <Button size="sm">
                Ver todos <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID do Embarque</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipmentsData.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="font-medium">{shipment.id}</TableCell>
                <TableCell>{shipment.origin}</TableCell>
                <TableCell>{shipment.destination}</TableCell>
                <TableCell>
                   <Badge variant={
                     shipment.status === 'Entregue' ? 'secondary' :
                     shipment.status === 'Na alfândega' ? 'destructive' :
                     'default'
                   } className="capitalize">{shipment.status}</Badge>
                </TableCell>
                <TableCell>{shipment.modal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
