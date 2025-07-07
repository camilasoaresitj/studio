import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plane, Ship } from 'lucide-react';

const ratesData = [
  {
    origin: 'Porto de Santos, BR',
    destination: 'Porto de Roterdã, NL',
    carrier: 'Maersk Line',
    modal: 'Marítimo',
    rate: 'USD 2,500 / 20\'GP',
    transitTime: '25-30 dias',
    validity: '31/12/2024',
  },
  {
    origin: 'Aeroporto de Guarulhos, BR',
    destination: 'Aeroporto JFK, US',
    carrier: 'LATAM Cargo',
    modal: 'Aéreo',
    rate: 'USD 4.50 / kg',
    transitTime: '1-2 dias',
    validity: '30/11/2024',
  },
  {
    origin: 'Porto de Paranaguá, BR',
    destination: 'Porto de Xangai, CN',
    carrier: 'CMA CGM',
    modal: 'Marítimo',
    rate: 'USD 3,800 / 40\'HC',
    transitTime: '35-40 dias',
    validity: '31/12/2024',
  },
  {
    origin: 'Aeroporto de Viracopos, BR',
    destination: 'Aeroporto de Frankfurt, DE',
    carrier: 'Lufthansa Cargo',
    modal: 'Aéreo',
    rate: 'USD 3.80 / kg',
    transitTime: '1-2 dias',
    validity: '15/12/2024',
  },
  {
    origin: 'Porto de Itajaí, BR',
    destination: 'Porto de Hamburgo, DE',
    carrier: 'Hapag-Lloyd',
    modal: 'Marítimo',
    rate: 'USD 2,650 / 20\'GP',
    transitTime: '28-32 dias',
    validity: '30/11/2024',
  },
  {
    origin: 'Aeroporto do Galeão, BR',
    destination: 'Aeroporto de Heathrow, UK',
    carrier: 'British Airways World Cargo',
    modal: 'Aéreo',
    rate: 'USD 4.20 / kg',
    transitTime: '2-3 dias',
    validity: '31/12/2024',
  },
];

export function RatesTable() {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modal</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Destino</TableHead>
            <TableHead>Transportadora</TableHead>
            <TableHead>Tarifa</TableHead>
            <TableHead>Tempo de Trânsito</TableHead>
            <TableHead>Validade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ratesData.map((rate, index) => (
            <TableRow key={index}>
              <TableCell>
                <Badge variant={rate.modal === 'Aéreo' ? 'secondary' : 'default'} className="flex items-center gap-2 w-fit">
                  {rate.modal === 'Aéreo' ? <Plane className="h-4 w-4" /> : <Ship className="h-4 w-4" />}
                  {rate.modal}
                </Badge>
              </TableCell>
              <TableCell>{rate.origin}</TableCell>
              <TableCell>{rate.destination}</TableCell>
              <TableCell className="font-medium">{rate.carrier}</TableCell>
              <TableCell className="font-semibold text-primary">{rate.rate}</TableCell>
              <TableCell>{rate.transitTime}</TableCell>
              <TableCell>{rate.validity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
