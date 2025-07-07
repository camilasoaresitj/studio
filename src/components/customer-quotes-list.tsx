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

export type Quote = {
  id: string;
  customer: string;
  destination: string;
  status: 'Enviada' | 'Aprovada' | 'Perdida' | 'Rascunho';
  date: string;
  value: string;
};


interface CustomerQuotesListProps {
  quotes: Quote[];
}

export function CustomerQuotesList({ quotes }: CustomerQuotesListProps) {
    const getStatusVariant = (status: Quote['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
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
                    {quotes.map((quote) => (
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
