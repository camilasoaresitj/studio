

'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Quote } from '@/lib/initial-data';
import { useToast } from '@/hooks/use-toast';

// In a real app, you would fetch this data from your database using the ID.
// For this simulation, we'll try to get it from localStorage.
const getQuoteById = (id: string): Quote | null => {
    if (typeof window === 'undefined') return null;
    try {
        const allQuotes: Quote[] = JSON.parse(localStorage.getItem('freight_quotes') || '[]');
        return allQuotes.find(q => q.id === id) || null;
    } catch (e) {
        return null;
    }
}

export default function ApproveQuotePage({ params }: { params: { id: string } }) {
    const [quote, setQuote] = useState<Quote | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionTaken, setActionTaken] = useState<'approved' | 'rejected' | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setIsLoading(true);
        // We add a small delay to simulate a fetch and allow localStorage to be available.
        setTimeout(() => {
            const fetchedQuote = getQuoteById(params.id);
            setQuote(fetchedQuote);
            setIsLoading(false);
        }, 500);
    }, [params.id]);

    const handleAction = (action: 'approved' | 'rejected') => {
        setActionTaken(action);
        // In a real app, you'd send this update to your backend.
        toast({
            title: `Cotação ${action === 'approved' ? 'Aprovada' : 'Rejeitada'}!`,
            description: `Sua decisão foi registrada. Obrigado!`,
            className: 'bg-success text-success-foreground'
        });
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Carregando cotação...</p>
            </div>
        );
    }
    
    if (actionTaken) {
         return (
             <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <Card className="w-full max-w-2xl p-8">
                    {actionTaken === 'approved' ? <CheckCircle className="mx-auto h-16 w-16 text-success mb-4" /> : <XCircle className="mx-auto h-16 w-16 text-destructive mb-4" />}
                    <CardTitle className="text-3xl mb-2">Obrigado!</CardTitle>
                    <CardDescription className="text-lg">
                        Sua resposta foi registrada como <span className={`font-bold ${actionTaken === 'approved' ? 'text-success' : 'text-destructive'}`}>{actionTaken === 'approved' ? 'Aprovada' : 'Rejeitada'}</span>.
                        <br/>
                        Nossa equipe entrará em contato em breve.
                    </CardDescription>
                </Card>
            </div>
         )
    }

    if (!quote) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-lg text-center p-8">
                    <CardTitle className="text-2xl text-destructive">Cotação não encontrada</CardTitle>
                    <CardDescription className="mt-2">O link pode estar expirado ou incorreto. Por favor, contate nosso time comercial.</CardDescription>
                </Card>
            </div>
        );
    }

    const totalBRL = quote.charges.reduce((sum, charge) => {
        // Simplified rate for display, a real app would fetch current rates
        const rate = charge.saleCurrency === 'USD' ? 5.25 : 1; 
        return sum + (charge.sale * rate);
    }, 0);

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-4 py-8">
        <Card className="w-full max-w-4xl">
            <CardHeader className="text-center">
                <Badge variant="secondary" className="w-fit mx-auto mb-2">Proposta Comercial</Badge>
                <CardTitle className="text-3xl">Cotação #{quote.id.replace('-DRAFT', '')}</CardTitle>
                <CardDescription className="text-base">
                    Olá {quote.customer}, revise os detalhes da sua cotação abaixo.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div><p className="text-sm text-muted-foreground">Origem</p><p className="font-semibold">{quote.origin}</p></div>
                    <div><p className="text-sm text-muted-foreground">Destino</p><p className="font-semibold">{quote.destination}</p></div>
                    <div><p className="text-sm text-muted-foreground">Carga</p><p className="font-semibold">{quote.details.cargo}</p></div>
                    <div><p className="text-sm text-muted-foreground">Incoterm</p><p className="font-semibold">{quote.details.incoterm}</p></div>
                </div>

                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.charges.map((charge) => (
                                <TableRow key={charge.id}>
                                    <TableCell className="font-medium">{charge.name}</TableCell>
                                    <TableCell className="text-right font-mono">{charge.saleCurrency} {charge.sale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-right">
                    <p className="text-muted-foreground">Valor Total Estimado</p>
                    <p className="text-3xl font-bold text-primary">BRL {totalBRL.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                    <p className="text-xs text-muted-foreground">*Valores em moeda estrangeira convertidos para BRL para fins de visualização.</p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center pt-6 border-t">
                <Button size="lg" className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto" onClick={() => handleAction('rejected')}>
                    <XCircle className="mr-2 h-5 w-5"/> Rejeitar Cotação
                </Button>
                <Button size="lg" className="bg-success hover:bg-success/90 w-full sm:w-auto" onClick={() => handleAction('approved')}>
                    <CheckCircle className="mr-2 h-5 w-5"/> Aprovar Cotação
                </Button>
            </CardFooter>
        </Card>
        <p className="text-xs text-muted-foreground mt-4 text-center">CargaInteligente &copy; {new Date().getFullYear()}</p>
    </div>
  );
}
