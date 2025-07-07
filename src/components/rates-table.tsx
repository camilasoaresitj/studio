'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plane, Ship } from 'lucide-react';
import { parse, isBefore } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';

const ratesData = [
  { id: 1, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '2500', container: '20\'GP', transitTime: '25-30 dias', validity: '31/12/2024' },
  { id: 2, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4100', container: '40\'GP', transitTime: '25-30 dias', validity: '31/12/2024' },
  { id: 3, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4500', container: '40\'HC', transitTime: '25-30 dias', validity: '31/12/2024' },
  { id: 4, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto JFK, US', carrier: 'LATAM Cargo', modal: 'Aéreo', rate: '4.50 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '30/11/2024' },
  { id: 5, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '3800', container: '40\'HC', transitTime: '35-40 dias', validity: '31/12/2024' },
  { id: 6, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '2650', container: '20\'GP', transitTime: '28-32 dias', validity: '30/11/2024' },
  { id: 7, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '4300', container: '40\'HC', transitTime: '28-32 dias', validity: '30/11/2024' },
  { id: 8, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '2400', container: '20\'GP', transitTime: '26-31 dias', validity: '31/05/2024' },
  { id: 9, origin: 'Aeroporto de Viracopos, BR', destination: 'Aeroporto de Frankfurt, DE', carrier: 'Lufthansa Cargo', modal: 'Aéreo', rate: '3.80 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '15/12/2024' },
];

const maritimeContainerTypes = ["20'GP", "40'GP", "40'HC"];

const groupMaritimeRates = (rates: typeof ratesData) => {
  const groups = new Map();
  rates.forEach(rate => {
    const groupKey = `${rate.origin}|${rate.destination}|${rate.carrier}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        origin: rate.origin,
        destination: rate.destination,
        carrier: rate.carrier,
        modal: rate.modal,
        transitTime: rate.transitTime,
        validity: rate.validity,
        rates: {},
      });
    }
    const group = groups.get(groupKey);
    group.rates[rate.container] = rate.rate;

    const currentValidity = parse(group.validity, 'dd/MM/yyyy', new Date());
    const rateValidity = parse(rate.validity, 'dd/MM/yyyy', new Date());
    if (isBefore(currentValidity, rateValidity)) {
      group.validity = rate.validity;
    }
  });
  return Array.from(groups.values());
};

export function RatesTable() {
  const [filters, setFilters] = useState({ origin: '', destination: '' });
  const [modalFilter, setModalFilter] = useState('Marítimo');
  const [showExpired, setShowExpired] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const commonFilteredRates = useMemo(() => {
     return ratesData.filter(rate => {
      const isValid = isBefore(today, parse(rate.validity, 'dd/MM/yyyy', new Date()));
      if (!showExpired && !isValid) {
        return false;
      }
      if (filters.origin && !rate.origin.toLowerCase().includes(filters.origin.toLowerCase())) {
        return false;
      }
      if (filters.destination && !rate.destination.toLowerCase().includes(filters.destination.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filters, showExpired, today]);
  
  const maritimeRates = useMemo(() => {
      const filtered = commonFilteredRates.filter(r => r.modal === 'Marítimo');
      return groupMaritimeRates(filtered);
  }, [commonFilteredRates]);

  const airRates = useMemo(() => {
      return commonFilteredRates.filter(r => r.modal === 'Aéreo');
  }, [commonFilteredRates]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-grow w-full">
            <Input placeholder="Filtrar por Origem..." value={filters.origin} onChange={(e) => handleFilterChange('origin', e.target.value)} />
            <Input placeholder="Filtrar por Destino..." value={filters.destination} onChange={(e) => handleFilterChange('destination', e.target.value)} />
            <Select value={modalFilter} onValueChange={setModalFilter}>
              <SelectTrigger><SelectValue placeholder="Selecionar Modal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Modais</SelectItem>
                <SelectItem value="Marítimo">Marítimo</SelectItem>
                <SelectItem value="Aéreo">Aéreo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-2 md:pt-0 self-start md:self-center">
            <Switch id="show-expired" checked={showExpired} onCheckedChange={setShowExpired} />
            <Label htmlFor="show-expired">Mostrar vencidas</Label>
          </div>
        </CardContent>
      </Card>

      {(modalFilter === 'Marítimo' || modalFilter === 'Todos') && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ship className="h-5 w-5 text-primary" /> Tarifas Marítimas (FCL)</CardTitle>
                <CardDescription>Tarifas agrupadas por rota e transportadora para fácil comparação de contêineres.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transportadora</TableHead>
                                <TableHead>Origem</TableHead>
                                <TableHead>Destino</TableHead>
                                {maritimeContainerTypes.map(type => <TableHead key={type} className="text-center">{type}</TableHead>)}
                                <TableHead>Validade</TableHead>
                                <TableHead>Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maritimeRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={maritimeContainerTypes.length + 5} className="h-24 text-center">Nenhuma tarifa marítima encontrada.</TableCell>
                                </TableRow>
                            ) : maritimeRates.map((item, index) => {
                                const isExpired = !isBefore(today, parse(item.validity, 'dd/MM/yyyy', new Date()));
                                return (
                                <TableRow key={index} className={isExpired ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{item.carrier}</TableCell>
                                    <TableCell>{item.origin}</TableCell>
                                    <TableCell>{item.destination}</TableCell>
                                    {maritimeContainerTypes.map(type => (
                                    <TableCell key={type} className="font-semibold text-primary text-center">
                                        {item.rates[type] ? `$${new Intl.NumberFormat('en-US').format(item.rates[type])}` : '-'}
                                    </TableCell>
                                    ))}
                                    <TableCell>{item.validity}</TableCell>
                                    <TableCell><Button variant="outline" size="sm" disabled={isExpired}>Selecionar</Button></TableCell>
                                </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}

      {(modalFilter === 'Aéreo' || modalFilter === 'Todos') && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plane className="h-5 w-5 text-primary" /> Tarifas Aéreas</CardTitle>
                <CardDescription>Tarifas de frete aéreo disponíveis.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Transportadora</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Destino</TableHead>
                            <TableHead>Tarifa</TableHead>
                            <TableHead>Tempo de Trânsito</TableHead>
                            <TableHead>Validade</TableHead>
                             <TableHead>Ação</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                             {airRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Nenhuma tarifa aérea encontrada.</TableCell>
                                </TableRow>
                             ) : airRates.map((rate, index) => {
                                const isExpired = !isBefore(today, parse(rate.validity, 'dd/MM/yyyy', new Date()));
                                return (
                                <TableRow key={index} className={isExpired ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium">{rate.carrier}</TableCell>
                                    <TableCell>{rate.origin}</TableCell>
                                    <TableCell>{rate.destination}</TableCell>
                                    <TableCell className="font-semibold text-primary">{rate.rate}</TableCell>
                                    <TableCell>{rate.transitTime}</TableCell>
                                    <TableCell>{rate.validity}</TableCell>
                                    <TableCell><Button variant="outline" size="sm" disabled={isExpired}>Selecionar</Button></TableCell>
                                </TableRow>
                                );
                             })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
