
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle } from 'lucide-react';
import type { Partner } from '@/lib/partners-data';

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
    partners: Partner[];
}

export function ManualFreightForm({ onManualRateAdd, partners }: ManualFreightFormProps) {
    const [supplier, setSupplier] = useState('');
    const [cost, setCost] = useState('');
    const [currency, setCurrency] = useState<'USD' | 'BRL'>('USD');
    const [transitTime, setTransitTime] = useState('');

    const supplierPartners = partners.filter(p => 
        p.roles.fornecedor &&
        (p.tipoFornecedor?.ciaMaritima || p.tipoFornecedor?.ciaAerea || p.tipoFornecedor?.transportadora)
    );

    const handleSubmit = () => {
        if (!supplier || !cost || !transitTime) {
            // Basic validation
            alert('Por favor, preencha todos os campos.');
            return;
        }
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
                <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione o Fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                        {supplierPartners.map(p => (
                            <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
