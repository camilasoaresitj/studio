'use client';

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { MoreHorizontal, FileText } from 'lucide-react';

const quotesData = [
  { id: 'COT-00125', customer: 'Nexus Imports', destination: 'Roterdã, NL', status: 'Enviada', date: '15/07/2024', value: 'R$ 15.250,00' },
  { id: 'COT-00124', customer: 'TechFront Solutions', destination: 'Miami, US', status: 'Aprovada', date: '14/07/2024', value: 'R$ 8.900,00' },
  { id: 'COT-00123', customer: 'Global Foods Ltda', destination: 'Xangai, CN', status: 'Perdida', date: '12/07/2024', value: 'R$ 22.100,00' },
  { id: 'COT-00122', customer: 'Nexus Imports', destination: 'Hamburgo, DE', status: 'Rascunho', date: '11/07/2024', value: 'R$ 18.400,00' },
  { id: 'COT-00121', customer: 'AutoParts Express', destination: 'JFK, US', status: 'Enviada', date: '10/07/2024', value: 'R$ 5.600,00' },
];

export function CustomerQuotesList() {
    const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'Aprovada': return 'default';
            case 'Enviada': return 'secondary';
            case 'Perdida': return 'destructive';
            case 'Rascunho': return 'outline';
            default: return 'outline';
        }
    }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Cotações de Clientes</CardTitle>
            <CardDescription>Gerencie e acompanhe o status de todas as suas propostas comerciais.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cotação ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {quotesData.map((quote) => (
                        <TableRow key={quote.id}>
                        <TableCell className="font-medium text-primary">{quote.id}</TableCell>
                        <TableCell>{quote.customer}</TableCell>
                        <TableCell>{quote.destination}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                        </TableCell>
                        <TableCell>{quote.date}</TableCell>
                        <TableCell className="text-right font-semibold">{quote.value}</TableCell>
                        <TableCell className="text-center">
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex justify-end mt-6">
                <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Criar Nova Cotação
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}
