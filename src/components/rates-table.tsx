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
import { Plane, Ship, Save } from 'lucide-react';
import { parse, isBefore, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useToast } from '@/hooks/use-toast';

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

const maritimeContainerTypes = ["20'GP", "40'GP", "40'HC", "40'NOR"];

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
        const currentDateStr = group.validity;
        const newDateStr = rate.validity;

        const isCurrentDateValid = typeof currentDateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(currentDateStr);
        const isNewDateValid = typeof newDateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(newDateStr);

        if (isCurrentDateValid && isNewDateValid) {
            const currentValidity = parse(currentDateStr, 'dd/MM/yyyy', new Date());
            const rateValidity = parse(newDateStr, 'dd/MM/yyyy', new Date());

            if (isValid(currentValidity) && isValid(rateValidity) && isBefore(currentValidity, rateValidity)) {
                group.validity = newDateStr;
            }
        } else if (isNewDateValid) {
            group.validity = newDateStr;
        }
    } catch (e) {
      console.error("Error parsing date in groupMaritimeRates:", e);
    }
  });
  return Array.from(groups.values());
};

export function RatesTable({ rates: ratesData }: RatesTableProps) {
  const [filters, setFilters] = useState({ origin: '', destination: '' });
  const [modalFilter, setModalFilter] = useState('Marítimo');
  const [showExpired, setShowExpired] = useState(false);
  const { toast } = useToast();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    toast({
      title: 'Tarifas Salvas!',
      description: 'As suas alterações na tabela de tarifas foram salvas com sucesso.',
      variant: 'default',
      className: 'bg-success text-success-foreground',
    });
  };

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isValidDateString = (dateStr: string) => {
    return typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
  }

  const handleSelectRate = (rate: any) => {
    console.log('Selected Rate:', rate);
    toast({
        title: "Tarifa Selecionada!",
        description: `Você selecionou a tarifa de ${rate.carrier} de ${rate.origin} para ${rate.destination}.`
    });
  };

  const commonFilteredRates = useMemo(() => {
     return ratesData.filter(rate => {
      if (!showExpired) {
        if (!rate.validity || !isValidDateString(rate.validity)) return true;
        try {
          const rateDate = parse(rate.validity, 'dd/MM/yyyy', new Date());
          if (isBefore(rateDate, today)) {
            return false;
          }
        } catch (e) {
            return true;
        }
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
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto">
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
          <div className="flex items-center space-x-4 self-end md:self-center">
             <div className="flex items-center space-x-2">
                <Switch id="show-expired" checked={showExpired} onCheckedChange={setShowExpired} />
                <Label htmlFor="show-expired">Mostrar vencidas</Label>
            </div>
            <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Tarifas
            </Button>
          </div>
        </CardContent>
      </Card>

      {(modalFilter === 'Marítimo' || modalFilter === 'Todos') && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ship className="h-5 w-5 text-primary" /> Tarifas Marítimas (FCL)</CardTitle>
                <CardDescription>Tarifas agrupadas por rota e transportadora. Clique na linha para selecionar.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Transportadora</TableHead>
                                <TableHead className="w-[13%]">Origem</TableHead>
                                <TableHead className="w-[13%]">Destino</TableHead>
                                {maritimeContainerTypes.map(type => <TableHead key={type} className="w-[8%] text-center">{type}</TableHead>)}
                                <TableHead className="w-[12%]">Free Time</TableHead>
                                <TableHead className="w-[15%]">Validade</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maritimeRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={maritimeContainerTypes.length + 5} className="h-24 text-center">Nenhuma tarifa marítima encontrada.</TableCell>
                                </TableRow>
                            ) : maritimeRates.map((item: any, index: number) => {
                                const isExpired = isValidDateString(item.validity) && isBefore(parse(item.validity, 'dd/MM/yyyy', new Date()), today);
                                return (
                                <TableRow 
                                    key={index} 
                                    className={isExpired ? 'opacity-50' : 'cursor-pointer hover:bg-muted/80'}
                                    onClick={() => { if (!isExpired) handleSelectRate(item); }}
                                >
                                    <TableCell className="font-medium truncate" title={item.carrier}>{item.carrier}</TableCell>
                                    <TableCell className="truncate" title={item.origin}>{item.origin}</TableCell>
                                    <TableCell className="truncate" title={item.destination}>{item.destination}</TableCell>
                                    {maritimeContainerTypes.map(type => (
                                    <TableCell key={type} className="font-semibold text-primary text-center">
                                        {item.rates[type] || '-'}
                                    </TableCell>
                                    ))}
                                    <TableCell>{item.freeTime}</TableCell>
                                    <TableCell>{item.validity}</TableCell>
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
                <CardDescription>Tarifas de frete aéreo disponíveis. Clique na linha para selecionar.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[20%]">Transportadora</TableHead>
                            <TableHead className="w-[18%]">Origem</TableHead>
                            <TableHead className="w-[18%]">Destino</TableHead>
                            <TableHead className="w-[12%]">Tarifa</TableHead>
                            <TableHead className="w-[12%]">Trânsito</TableHead>
                            <TableHead className="w-[10%]">Free Time</TableHead>
                            <TableHead className="w-[10%]">Validade</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                             {airRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">Nenhuma tarifa aérea encontrada.</TableCell>
                                </TableRow>
                             ) : airRates.map((rate, index) => {
                                const isExpired = isValidDateString(rate.validity) && isBefore(parse(rate.validity, 'dd/MM/yyyy', new Date()), today);
                                return (
                                <TableRow 
                                    key={index} 
                                    className={isExpired ? 'opacity-50' : 'cursor-pointer hover:bg-muted/80'}
                                    onClick={() => { if (!isExpired) handleSelectRate(rate); }}
                                >
                                    <TableCell className="font-medium truncate" title={rate.carrier}>{rate.carrier}</TableCell>
                                    <TableCell className="truncate" title={rate.origin}>{rate.origin}</TableCell>
                                    <TableCell className="truncate" title={rate.destination}>{rate.destination}</TableCell>
                                    <TableCell className="font-semibold text-primary">{rate.rate}</TableCell>
                                    <TableCell className="truncate">{rate.transitTime}</TableCell>
                                    <TableCell className="truncate">{rate.freeTime}</TableCell>
                                    <TableCell>{rate.validity}</TableCell>
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
