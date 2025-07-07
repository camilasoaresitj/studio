
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Plane, Ship, Save, CheckCircle } from 'lucide-react';
import { parse, isBefore, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { useToast } from '@/hooks/use-toast';

export type Rate = {
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
  onRatesChange: (rates: Rate[]) => void;
  onSelectRate: (rate: any, containerType?: string) => void;
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

export function RatesTable({ rates: initialRates, onRatesChange, onSelectRate }: RatesTableProps) {
  const [filters, setFilters] = useState({ origin: '', destination: '' });
  const [modalFilter, setModalFilter] = useState('Marítimo');
  const [showExpired, setShowExpired] = useState(false);
  const [editableRates, setEditableRates] = useState<Rate[]>(initialRates);
  const { toast } = useToast();

  useEffect(() => {
    setEditableRates(initialRates);
  }, [initialRates]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onRatesChange(editableRates);
    toast({
      title: 'Tarifas Salvas!',
      description: 'As suas alterações na tabela de tarifas foram salvas com sucesso.',
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

  const commonFilteredRates = useMemo(() => {
     return editableRates.filter(rate => {
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
  }, [filters, showExpired, today, editableRates]);
  
  const maritimeRates = useMemo(() => {
      const filtered = commonFilteredRates.filter(r => r.modal === 'Marítimo');
      return groupMaritimeRates(filtered);
  }, [commonFilteredRates]);

  const airRates = useMemo(() => {
      return commonFilteredRates.filter(r => r.modal === 'Aéreo');
  }, [commonFilteredRates]);

  const handleMaritimeGroupChange = (group: any, field: 'freeTime' | 'transitTime' | 'validity', value: string) => {
      setEditableRates(prevRates => 
          prevRates.map(rate => {
              if (rate.modal === 'Marítimo' && rate.origin === group.origin && rate.destination === group.destination && rate.carrier === group.carrier) {
                  return { ...rate, [field]: value };
              }
              return rate;
          })
      );
  };

  const handleMaritimeRateChange = (group: any, containerType: string, value: string) => {
      setEditableRates(prevRates => {
          const newRates = [...prevRates];
          const rateIndex = newRates.findIndex(rate =>
              rate.modal === 'Marítimo' &&
              rate.origin === group.origin &&
              rate.destination === group.destination &&
              rate.carrier === group.carrier &&
              rate.container === containerType
          );

          if (rateIndex > -1) {
              if (value === '') {
                  newRates.splice(rateIndex, 1);
              } else {
                  newRates[rateIndex] = { ...newRates[rateIndex], rate: value };
              }
          } else if (value !== '') {
              const newRate: Rate = {
                  id: Math.random(),
                  origin: group.origin,
                  destination: group.destination,
                  carrier: group.carrier,
                  modal: 'Marítimo',
                  rate: value,
                  container: containerType,
                  transitTime: group.transitTime,
                  validity: group.validity,
                  freeTime: group.freeTime,
              };
              newRates.push(newRate);
          }
          return newRates;
      });
  };

  const handleAirRateChange = (rateId: number, field: keyof Rate, value: string) => {
      setEditableRates(prevRates => 
          prevRates.map(rate => {
              if (rate.id === rateId) {
                  return { ...rate, [field]: value };
              }
              return rate;
          })
      );
  };

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
                <CardDescription>Edite as tarifas nos campos e clique no ícone (✔) para iniciar uma cotação com a tarifa desejada.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Transportadora</TableHead>
                                <TableHead className="w-[13%]">Origem</TableHead>
                                <TableHead className="w-[13%]">Destino</TableHead>
                                {maritimeContainerTypes.map(type => <TableHead key={type} className="w-[10%] text-center">{type}</TableHead>)}
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
                                <TableRow key={index} className={isExpired ? 'bg-muted/30' : ''}>
                                    <TableCell className="font-medium truncate" title={item.carrier}>{item.carrier}</TableCell>
                                    <TableCell className="truncate" title={item.origin}>{item.origin}</TableCell>
                                    <TableCell className="truncate" title={item.destination}>{item.destination}</TableCell>
                                    {maritimeContainerTypes.map(type => (
                                        <TableCell key={type} className="text-center p-2">
                                            <div className="flex items-center justify-center gap-1">
                                                <Input
                                                    value={item.rates[type] || ''}
                                                    onChange={(e) => handleMaritimeRateChange(item, type, e.target.value)}
                                                    className="h-8 text-center font-semibold text-primary"
                                                    placeholder="-"
                                                    disabled={isExpired}
                                                />
                                                {item.rates[type] && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => !isExpired && onSelectRate(item, type)} disabled={isExpired}>
                                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    ))}
                                    <TableCell className="p-2">
                                        <Input
                                            value={item.freeTime}
                                            onChange={(e) => handleMaritimeGroupChange(item, 'freeTime', e.target.value)}
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2">
                                        <Input
                                            value={item.validity}
                                            onChange={(e) => handleMaritimeGroupChange(item, 'validity', e.target.value)}
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
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
                <CardDescription>Edite as tarifas nos campos e clique no ícone (✔) para iniciar uma cotação.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[20%]">Transportadora</TableHead>
                            <TableHead className="w-[15%]">Origem</TableHead>
                            <TableHead className="w-[15%]">Destino</TableHead>
                            <TableHead className="w-[12%]">Tarifa</TableHead>
                            <TableHead className="w-[12%]">Trânsito</TableHead>
                            <TableHead className="w-[10%]">Validade</TableHead>
                            <TableHead className="w-[10%] text-center">Ações</TableHead>
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
                                <TableRow key={rate.id} className={isExpired ? 'bg-muted/30' : ''}>
                                    <TableCell className="font-medium truncate p-2" title={rate.carrier}>{rate.carrier}</TableCell>
                                    <TableCell className="truncate p-2" title={rate.origin}>{rate.origin}</TableCell>
                                    <TableCell className="truncate p-2" title={rate.destination}>{rate.destination}</TableCell>
                                    <TableCell className="p-2">
                                        <Input 
                                            value={rate.rate} 
                                            onChange={(e) => handleAirRateChange(rate.id, 'rate', e.target.value)} 
                                            className="h-8 font-semibold text-primary"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2">
                                        <Input 
                                            value={rate.transitTime} 
                                            onChange={(e) => handleAirRateChange(rate.id, 'transitTime', e.target.value)} 
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2">
                                        <Input 
                                            value={rate.validity} 
                                            onChange={(e) => handleAirRateChange(rate.id, 'validity', e.target.value)} 
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="text-center p-2">
                                        <Button variant="ghost" size="icon" onClick={() => onSelectRate(rate)} disabled={isExpired}>
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        </Button>
                                    </TableCell>
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
