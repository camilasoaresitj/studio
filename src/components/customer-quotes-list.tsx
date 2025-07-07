
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { QuoteCostSheet } from './quote-cost-sheet';

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  cost: number;
  costCurrency: 'USD' | 'BRL';
  sale: number;
  saleCurrency: 'USD' | 'BRL';
  supplier: string;
};

export type Quote = {
  id: string;
  customer: string;
  destination: string;
  status: 'Enviada' | 'Aprovada' | 'Perdida' | 'Rascunho';
  date: string;
  charges: QuoteCharge[];
};


interface CustomerQuotesListProps {
  quotes: Quote[];
  onQuoteUpdate: (updatedQuote: Quote) => void;
  quoteToOpen: Quote | null;
  onDialogClose: () => void;
}

export function CustomerQuotesList({ quotes, onQuoteUpdate, quoteToOpen, onDialogClose }: CustomerQuotesListProps) {
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

    useEffect(() => {
        if (quoteToOpen) {
            setSelectedQuote(quoteToOpen);
        }
    }, [quoteToOpen]);


    const getStatusVariant = (status: Quote['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'Aprovada': return 'default';
            case 'Enviada': return 'secondary';
            case 'Perdida': return 'destructive';
            case 'Rascunho': return 'outline';
            default: return 'outline';
        }
    }

    const calculateTotalValue = (charges: QuoteCharge[]) => {
        const totals = { BRL: 0, USD: 0 };
        charges.forEach(charge => {
            totals[charge.saleCurrency] += charge.sale;
        });
        
        const parts = [];
        if (totals.USD > 0) parts.push(`USD ${totals.USD.toFixed(2)}`);
        if (totals.BRL > 0) parts.push(`BRL ${totals.BRL.toFixed(2)}`);

        return parts.join(' + ') || 'R$ 0,00';
    }
    
    const handleUpdateQuote = (updatedQuoteData: { charges: QuoteCharge[] }) => {
        if (!selectedQuote) return;
        const updatedQuote = { ...selectedQuote, ...updatedQuoteData };
        onQuoteUpdate(updatedQuote);
        setSelectedQuote(updatedQuote); 
    };
    
    const handleDialogClose = () => {
        setSelectedQuote(null);
        onDialogClose();
    };


  return (
    <>
    <Card>
        <CardHeader>
            <CardTitle>Cotações de Clientes</CardTitle>
            <CardDescription>Gerencie e acompanhe o status de todas as suas propostas comerciais. Clique em uma cotação para ver os detalhes.</CardDescription>
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
                        <TableHead className="text-right">Valor Venda</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {quotes.map((quote) => (
                        <TableRow key={quote.id} onClick={() => setSelectedQuote(quote)} className="cursor-pointer">
                            <TableCell className="font-medium text-primary">{quote.id.replace('-DRAFT', '')}</TableCell>
                            <TableCell>{quote.customer}</TableCell>
                            <TableCell>{quote.destination}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </TableCell>
                            <TableCell>{quote.date}</TableCell>
                            <TableCell className="text-right font-semibold">{calculateTotalValue(quote.charges)}</TableCell>
                            <TableCell className="text-center">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedQuote(quote); }}>
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
    </Card>
    <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="max-w-6xl h-[90vh]">
            <DialogHeader>
                <DialogTitle>Detalhes da Cotação: {selectedQuote?.id.replace('-DRAFT', '')}</DialogTitle>
                <DialogDescription>
                    Gerencie os custos, receitas e lucro desta cotação. Status: <Badge variant={getStatusVariant(selectedQuote?.status ?? 'Rascunho')} className="text-xs">{selectedQuote?.status}</Badge>
                </DialogDescription>
            </DialogHeader>
            {selectedQuote && <QuoteCostSheet quote={selectedQuote} onUpdate={handleUpdateQuote} />}
        </DialogContent>
    </Dialog>
    </>
  );
}
