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
    type: 'Fixo' | 'Percentual';
};

interface FeesRegistryProps {
    fees: Fee[];
}

export function FeesRegistry({ fees }: FeesRegistryProps) {
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {fees.map((fee) => (
                        <TableRow key={fee.id}>
                            <TableCell className="font-medium">{fee.name}</TableCell>
                            <TableCell>{fee.value}</TableCell>
                            <TableCell>{fee.type}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    </div>
  );
}
