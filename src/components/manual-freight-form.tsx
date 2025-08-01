
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';

type FreightRate = {
    carrier: string;
    origin: string;
    destination: string;
    transitTime: string;
    cost: string;
    costValue: number;
};

interface ManualFreightFormProps {
    onManualRateAdd: (rate: Omit<FreightRate, 'id' | 'carrierLogo' | 'dataAiHint' | 'source'>) => void;
}

export function ManualFreightForm({ onManualRateAdd }: ManualFreightFormProps) {
    const [supplier, setSupplier] = useState('');
    const [cost, setCost] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
    const [transitTime, setTransitTime] = useState('');

    const handleSubmit = () => {
        onManualRateAdd({
            carrier: supplier,
            origin: '', // These are taken from the main form
            destination: '',
            transitTime: transitTime,
            cost: `${currency} ${cost}`,
            costValue: parseFloat(cost) || 0,
        });
    };

    return (
        <Card className="mt-4 bg-secondary/50">
            <CardHeader>
                <CardTitle className="text-lg">Adicionar Frete Manualmente</CardTitle>
                <CardDescription>Insira os detalhes da tarifa que você negociou.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Input placeholder="Fornecedor" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                <Input placeholder="Valor do Frete" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
                <Select value={currency} onValueChange={(v: 'USD'|'BRL') => setCurrency(v)}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="BRL">BRL</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Tempo de Trânsito" value={transitTime} onChange={(e) => setTransitTime(e.target.value)} />
                <Button onClick={handleSubmit} className="sm:col-span-4">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar e Criar Cotação
                </Button>
            </CardContent>
        </Card>
    );
};
