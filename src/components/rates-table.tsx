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
  freeTime: string;
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
        freeTime: rate.freeTime,
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
      if (typeof dateStr !== 'string' || dateStr.length !== 10) return false;
      const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
      return !isNaN(parsedDate.getTime());
    } catch (e) {
      return false;
    }
  }

  const commonFilteredRates = useMemo(() => {
     return ratesData.filter(rate => {
      if (!showExpired) {
        if (!rate.validity || !isValidDate(rate.validity)) return true; // Keep if no/invalid validity
        const isExpired = isBefore(parse(rate.validity, 'dd/MM/yyyy', new Date()), today);
        if (isExpired) return false;
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
                <div className="border rounded-lg">
                    <Table className="table-fixed w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Transportadora</TableHead>
                                <TableHead className="w-[15%]">Origem</TableHead>
                                <TableHead className="w-[15%]">Destino</TableHead>
                                {maritimeContainerTypes.map(type => <TableHead key={type} className="w-[8%] text-center">{type}</TableHead>)}
                                <TableHead className="w-[10%]">Free Time</TableHead>
                                <TableHead className="w-[10%]">Validade</TableHead>
                                <TableHead className="w-[11%]">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maritimeRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={maritimeContainerTypes.length + 6} className="h-24 text-center">Nenhuma tarifa marítima encontrada.</TableCell>
                                </TableRow>
                            ) : maritimeRates.map((item: any, index: number) => {
                                const isExpired = isValidDate(item.validity) && isBefore(parse(item.validity, 'dd/MM/yyyy', new Date()), today);
                                return (
                                <TableRow key={index} className={isExpired ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium truncate" title={item.carrier}>{item.carrier}</TableCell>
                                    <TableCell className="truncate" title={item.origin}>{item.origin}</TableCell>
                                    <TableCell className="truncate" title={item.destination}>{item.destination}</TableCell>
                                    {maritimeContainerTypes.map(type => (
                                    <TableCell key={type} className="font-semibold text-primary text-center">
                                        {item.rates[type] ? `$${new Intl.NumberFormat('en-US').format(Number(item.rates[type]))}` : '-'}
                                    </TableCell>
                                    ))}
                                    <TableCell>{item.freeTime}</TableCell>
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
                 <div className="border rounded-lg">
                    <Table className="table-fixed w-full">
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[16%]">Transportadora</TableHead>
                            <TableHead className="w-[16%]">Origem</TableHead>
                            <TableHead className="w-[16%]">Destino</TableHead>
                            <TableHead className="w-[10%]">Tarifa</TableHead>
                            <TableHead className="w-[10%]">Trânsito</TableHead>
                            <TableHead className="w-[10%]">Free Time</TableHead>
                            <TableHead className="w-[10%]">Validade</TableHead>
                            <TableHead className="w-[12%]">Ação</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                             {airRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">Nenhuma tarifa aérea encontrada.</TableCell>
                                </TableRow>
                             ) : airRates.map((rate, index) => {
                                const isExpired = isValidDate(rate.validity) && isBefore(parse(rate.validity, 'dd/MM/yyyy', new Date()), today);
                                return (
                                <TableRow key={index} className={isExpired ? 'opacity-50' : ''}>
                                    <TableCell className="font-medium truncate" title={rate.carrier}>{rate.carrier}</TableCell>
                                    <TableCell className="truncate" title={rate.origin}>{rate.origin}</TableCell>
                                    <TableCell className="truncate" title={rate.destination}>{rate.destination}</TableCell>
                                    <TableCell className="font-semibold text-primary">{rate.rate}</TableCell>
                                    <TableCell className="truncate">{rate.transitTime}</TableCell>
                                    <TableCell className="truncate">{rate.freeTime}</TableCell>
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
