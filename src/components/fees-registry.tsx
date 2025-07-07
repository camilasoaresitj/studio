'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';

export type Fee = {
    id: number;
    name: string;
    value: string;
    currency: 'BRL' | 'USD';
    type: 'Fixo' | 'Percentual' | 'Por CBM/Ton' | 'Opcional' | 'Por KG';
    unit: string;
    modal: 'Marítimo' | 'Aéreo' | 'Ambos';
    direction: 'Importação' | 'Exportação' | 'Ambos';
    chargeType?: 'FCL' | 'LCL' | 'Aéreo';
    minValue?: number;
};


interface FeesRegistryProps {
    fees: Fee[];
    onSave: (fee: Fee) => void;
}

export function FeesRegistry({ fees, onSave }: FeesRegistryProps) {
  return (
    <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Taxas Padrão</h3>
            <Button variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Taxa
            </Button>
        </div>
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome da Taxa</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Modal</TableHead>
                        <TableHead>Direção</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fees.map((fee) => (
                        <TableRow key={fee.id}>
                            <TableCell className="font-medium">{fee.name}</TableCell>
                            <TableCell>{fee.currency} {fee.value}</TableCell>
                            <TableCell>{fee.type}</TableCell>
                            <TableCell>{fee.modal}</TableCell>
                            <TableCell>{fee.direction}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
  );
}
