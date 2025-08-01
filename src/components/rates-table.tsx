
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
import { Plane, Ship, CheckCircle, Save } from 'lucide-react';
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
  agent?: string;
}

interface RatesTableProps {
  rates: Rate[];
  onRatesChange: (rates: Rate[]) => void;
  onSelectRate: (rate: any, containerType?: string) => void;
}

const maritimeContainerTypes = ["20'GP", "40'GP", "40'HC", "40'NOR"];

const groupMaritimeRates = (rates: Rate[]) => {
    const groups: { [key: string]: Rate[] } = {};

    rates.forEach(rate => {
        if (rate.modal !== 'Marítimo') return;
        // The group key uniquely identifies a route by a specific carrier.
        const groupKey = `${rate.origin}|${rate.destination}|${rate.carrier}`;
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(rate);
    });

    return Object.values(groups).map(groupedRates => {
        if (groupedRates.length === 0) {
            return null;
        }

        // Sort to get a stable "representative" rate for shared properties.
        // This prevents the UI from flickering or showing stale data.
        const sortedGroup = [...groupedRates].sort((a, b) => a.container.localeCompare(b.container));
        const representative = sortedGroup[0];
        
        const containerRates: { [key: string]: string } = {};
        groupedRates.forEach(rate => {
            if (rate.container) {
                containerRates[rate.container] = rate.rate;
            }
        });

        // The key for this group is now stable and based on the representative rate.
        const stableGroupKey = `${representative.origin}|${representative.destination}|${representative.carrier}`;

        return {
            groupKey: stableGroupKey,
            origin: representative.origin,
            destination: representative.destination,
            carrier: representative.carrier,
            modal: representative.modal,
            transitTime: representative.transitTime,
            validity: representative.validity,
            freeTime: representative.freeTime,
            agent: representative.agent,
            rates: containerRates,
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
};


export function RatesTable({ rates, onRatesChange, onSelectRate }: RatesTableProps) {
  const [filters, setFilters] = useState({ origin: '', destination: '' });
  const [modalFilter, setModalFilter] = useState('Marítimo');
  const [showExpired, setShowExpired] = useState(false);
  const [editableRates, setEditableRates] = useState<Rate[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    setEditableRates(JSON.parse(JSON.stringify(rates)));
  }, [rates]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isValidDateString = (dateStr: string) => {
    return typeof dateStr === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
  }
  
  const handleFilterChange = (filterName: 'origin' | 'destination', value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const commonFilteredRates = useMemo(() => {
     return editableRates.filter(rate => {
      if (!showExpired) {
        if (!rate.validity || !isValidDateString(rate.validity)) return true;
        try {
          const rateDate = parse(rate.validity, 'dd/MM/yyyy', new Date());
          if (!isValid(rateDate) || isBefore(rateDate, today)) {
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

  const handleMaritimeGroupChange = (groupKey: string, field: 'freeTime' | 'agent', value: string) => {
      const [origin, destination, carrier] = groupKey.split('|');
      setEditableRates(prevRates =>
          prevRates.map(rate => {
              if (rate.origin === origin && rate.destination === destination && rate.carrier === carrier) {
                  return { ...rate, [field]: value };
              }
              return rate;
          })
      );
  };

  const handleAirRateChange = (rateId: number, field: 'freeTime' | 'agent', value: string) => {
      setEditableRates(prevRates =>
          prevRates.map(rate => {
              if (rate.id === rateId) {
                  return { ...rate, [field]: value };
              }
              return rate;
          })
      );
  };

  const handleSaveChanges = () => {
    onRatesChange(editableRates);
    toast({
        title: "Alterações Salvas",
        description: "Suas tarifas foram atualizadas com sucesso.",
        className: 'bg-success text-success-foreground'
    });
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
            <Button onClick={handleSaveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>

      {(modalFilter === 'Marítimo' || modalFilter === 'Todos') && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Ship className="h-5 w-5 text-primary" /> Tarifas Marítimas (FCL)</CardTitle>
                <CardDescription>Clique no ícone (✔) para iniciar uma cotação. Edite os campos e clique em "Salvar Alterações".</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Transportadora</TableHead>
                                <TableHead className="w-[12%]">Agente</TableHead>
                                <TableHead className="w-[12%]">Origem</TableHead>
                                <TableHead className="w-[12%]">Destino</TableHead>
                                {maritimeContainerTypes.map(type => <TableHead key={type} className="w-[8%] text-center">{type}</TableHead>)}
                                <TableHead className="w-[8%]">Trânsito</TableHead>
                                <TableHead className="w-[10%]">Free Time</TableHead>
                                <TableHead className="w-[10%]">Validade</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {maritimeRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={maritimeContainerTypes.length + 6} className="h-24 text-center">Nenhuma tarifa marítima encontrada.</TableCell>
                                </TableRow>
                            ) : maritimeRates.map((item: any) => {
                                const isExpired = isValidDateString(item.validity) && isBefore(parse(item.validity, 'dd/MM/yyyy', new Date()), today);
                                return (
                                <TableRow key={item.groupKey} className={isExpired ? 'bg-muted/30 text-muted-foreground' : ''}>
                                    <TableCell className="font-medium truncate" title={item.carrier}>{item.carrier}</TableCell>
                                    <TableCell className="p-2">
                                        <Input
                                            value={item.agent || ''}
                                            onChange={(e) => handleMaritimeGroupChange(item.groupKey, 'agent', e.target.value)}
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="truncate" title={item.origin}>{item.origin}</TableCell>
                                    <TableCell className="truncate" title={item.destination}>{item.destination}</TableCell>
                                    {maritimeContainerTypes.map(type => (
                                        <TableCell key={type} className="text-center p-2">
                                            <div className="flex items-center justify-center gap-1">
                                                 <span className="font-semibold text-primary h-8 flex items-center justify-center min-w-[50px]">
                                                    {item.rates[type] || '-'}
                                                </span>
                                                {item.rates[type] && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => !isExpired && onSelectRate(item, type)} disabled={isExpired}>
                                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    ))}
                                    <TableCell className="truncate p-2">{item.transitTime}</TableCell>
                                    <TableCell className="p-2">
                                        <Input
                                            value={item.freeTime}
                                            onChange={(e) => handleMaritimeGroupChange(item.groupKey, 'freeTime', e.target.value)}
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="truncate p-2">{item.validity}</TableCell>
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
                <CardDescription>Clique no ícone (✔) para iniciar uma cotação. Edite os campos e clique em "Salvar Alterações".</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[18%]">Transportadora</TableHead>
                            <TableHead className="w-[15%]">Agente</TableHead>
                            <TableHead className="w-[15%]">Origem</TableHead>
                            <TableHead className="w-[15%]">Destino</TableHead>
                            <TableHead className="w-[10%]">Tarifa</TableHead>
                            <TableHead className="w-[10%]">Trânsito</TableHead>
                            <TableHead className="w-[12%]">Free Time</TableHead>
                            <TableHead className="w-[10%]">Validade</TableHead>
                            <TableHead className="w-[5%] text-center">Ações</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                             {airRates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-24 text-center">Nenhuma tarifa aérea encontrada.</TableCell>
                                </TableRow>
                             ) : airRates.map((rate) => {
                                const isExpired = isValidDateString(rate.validity) && isBefore(parse(rate.validity, 'dd/MM/yyyy', new Date()), today);
                                return (
                                <TableRow key={rate.id} className={isExpired ? 'bg-muted/30 text-muted-foreground' : ''}>
                                    <TableCell className="font-medium truncate p-2" title={rate.carrier}>{rate.carrier}</TableCell>
                                    <TableCell className="p-2">
                                        <Input 
                                            value={rate.agent || ''} 
                                            onChange={(e) => handleAirRateChange(rate.id, 'agent', e.target.value)} 
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="truncate p-2" title={rate.origin}>{rate.origin}</TableCell>
                                    <TableCell className="truncate p-2" title={rate.destination}>{rate.destination}</TableCell>
                                    <TableCell className="font-semibold text-primary p-2">{rate.rate}</TableCell>
                                    <TableCell className="truncate p-2">{rate.transitTime}</TableCell>
                                     <TableCell className="p-2">
                                        <Input 
                                            value={rate.freeTime} 
                                            onChange={(e) => handleAirRateChange(rate.id, 'freeTime', e.target.value)} 
                                            className="h-8"
                                            disabled={isExpired}
                                        />
                                    </TableCell>
                                    <TableCell className="truncate p-2">{rate.validity}</TableCell>
                                    <TableCell className="text-center p-2">
                                        <Button variant="ghost" size="icon" onClick={() => !isExpired && onSelectRate(rate)} disabled={isExpired}>
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
