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

type Rate = {
  id: number;
  origin: string;
  destination: string;
  carrier: string;
  modal: string;
  rate: string;
  container: string;
  transitTime: string;
  validity: string;
}

interface RatesTableProps {
  rates: Rate[];
}

const maritimeContainerTypes = ["20'GP", "40'GP", "40'HC"];

const groupMaritimeRates = (rates: Rate[]) => {
  const groups = new Map();
  rates.forEach(rate => {
    if (rate.modal !== 'Marítimo') return;

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

    try {
      const currentValidity = parse(group.validity, 'dd/MM/yyyy', new Date());
      const rateValidity = parse(rate.validity, 'dd/MM/yyyy', new Date());
      if (isBefore(currentValidity, rateValidity)) {
        group.validity = rate.validity;
      }
    } catch (e) {
      // Ignore invalid date formats for now
    }
  });
  return Array.from(groups.values());
};

export function RatesTable({ rates: ratesData }: RatesTableProps) {
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

  const isValidDate = (dateStr: string) => {
    try {
      parse(dateStr, 'dd/MM/yyyy', new Date()).toISOString();
      return true;
    } catch (e) {
      return false;
    }
  }

  const commonFilteredRates = useMemo(() => {
     return ratesData.filter(rate => {
      if (!showExpired) {
        if (!rate.validity || !isValidDate(rate.validity)) return true; // Keep if no/invalid validity
        const isValid = !isBefore(today, parse(rate.validity, 'dd/MM/yyyy', new Date()));
        if (!isValid) return false;
      }
      if (filters.origin && !rate.origin.toLowerCase().includes(filters.origin.toLowerCase())) {
        return false;
      }
      if (filters.destination && !rate.destination.toLowerCase().includes(filters.destination.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filters, showExpired, today, ratesData]);
  
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
                            ) : maritimeRates.map((item: any, index: number) => {
                                const isExpired = isValidDate(item.validity) && isBefore(today, parse(item.validity, 'dd/MM/yyyy', new Date()));
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
                                const isExpired = isValidDate(rate.validity) && isBefore(today, parse(rate.validity, 'dd/MM/yyyy', new Date()));
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
