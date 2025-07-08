'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import { MoreHorizontal, FileText, Send, FileDown, Loader2, MessageCircle, CheckCircle, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { QuoteCostSheet } from './quote-cost-sheet';
import dynamic from 'next/dynamic';
import { runSendQuote } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { Partner } from './partners-registry';

const DynamicJsPDF = dynamic(() => import('jspdf').then(mod => mod.default), { ssr: false });
const DynamicHtml2Canvas = dynamic(() => import('html2canvas'), { ssr: false });


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
  origin: string;
  destination: string;
  status: 'Enviada' | 'Aprovada' | 'Perdida' | 'Rascunho';
  date: string;
  charges: QuoteCharge[];
};


interface CustomerQuotesListProps {
  quotes: Quote[];
  partners: Partner[];
  onQuoteUpdate: (updatedQuote: Quote) => void;
  quoteToOpen: Quote | null;
  onDialogClose: () => void;
}

export function CustomerQuotesList({ quotes, partners, onQuoteUpdate, quoteToOpen, onDialogClose }: CustomerQuotesListProps) {
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [quoteToSend, setQuoteToSend] = useState<Quote | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (quoteToOpen) {
            setSelectedQuote(quoteToOpen);
        }
    }, [quoteToOpen]);

    const handleOpenSendDialog = (quote: Quote) => {
        setQuoteToSend(quote);
        setSendDialogOpen(true);
    };

    const handleSendQuote = async (channel: 'email' | 'whatsapp') => {
      if (!quoteToSend) return;

      setIsSending(true);
      const customer = partners.find(p => p.name === quoteToSend.customer);
      if (!customer) {
          toast({ variant: 'destructive', title: 'Cliente não encontrado!' });
          setIsSending(false);
          return;
      }

      const totalValueBRL = quoteToSend.charges.filter(c => c.saleCurrency === 'BRL').reduce((sum, c) => sum + c.sale, 0);
      const totalValueUSD = quoteToSend.charges.filter(c => c.saleCurrency === 'USD').reduce((sum, c) => sum + c.sale, 0);
      
      const priceParts = [];
      if (totalValueUSD > 0) priceParts.push(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalValueUSD));
      if (totalValueBRL > 0) priceParts.push(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValueBRL));
      const finalPrice = priceParts.join(' + ');

      const response = await runSendQuote({
        customerName: quoteToSend.customer,
        rateDetails: {
            origin: quoteToSend.origin,
            destination: quoteToSend.destination,
            carrier: quoteToSend.charges.find(c => c.name === 'Frete Internacional')?.supplier || 'N/A',
            transitTime: 'Conforme acordado', // This info is lost from the original rate selection
            finalPrice: finalPrice || 'Sob consulta',
        },
        approvalLink: `https://cargainteligente.com/approve/${quoteToSend.id}`,
        rejectionLink: `https://cargainteligente.com/reject/${quoteToSend.id}`,
      });

      if (response.success) {
        if (channel === 'email') {
            const primaryContact = customer.contacts.find(c => c.department === 'Comercial') || customer.contacts[0];
            const recipient = primaryContact?.email;
            if (recipient) {
                const subject = encodeURIComponent(response.data.emailSubject);
                const body = encodeURIComponent(response.data.emailBody);
                window.open(`mailto:${recipient}?subject=${subject}&body=${body}`);
                toast({ title: 'E-mail de cotação gerado!', description: `Pronto para enviar para ${recipient}.` });
            } else {
                 toast({ variant: 'destructive', title: 'E-mail não encontrado', description: 'O contato principal do cliente não possui um e-mail cadastrado.' });
            }
        } else { // WhatsApp
            const primaryContact = customer.contacts.find(c => c.department === 'Comercial') || customer.contacts[0];
            const phone = primaryContact?.phone?.replace(/\D/g, '');
             if (phone) {
                const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(response.data.whatsappMessage)}`;
                window.open(whatsappUrl, '_blank');
                toast({ title: 'Mensagem de WhatsApp gerada!', description: 'Pronto para enviar.' });
            } else {
                 toast({ variant: 'destructive', title: 'Telefone não encontrado', description: 'O contato principal do cliente não possui um telefone cadastrado.' });
            }
        }
        setSendDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao gerar comunicação', description: response.error });
      }

      setIsSending(false);
    };

     const handleGeneratePdf = async (quote: Quote) => {
        const [jsPDF, html2canvas] = await Promise.all([
            DynamicJsPDF,
            DynamicHtml2Canvas,
        ]);
        
        const element = document.createElement("div");
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        document.body.appendChild(element);

        const { createRoot } = await import('react-dom/client');
        const root = createRoot(element);
        
        const quoteForPdf = <div id={`pdf-gen-${quote.id}`} className="w-[800px] p-4 bg-white"> <QuoteCostSheet quote={quote} onUpdate={()=>{}} /> </div>;
        root.render(quoteForPdf);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const quoteElement = document.getElementById(`pdf-gen-${quote.id}`);
        if (quoteElement) {
            const canvas = await html2canvas(quoteElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`cotacao-${quote.id.replace('-DRAFT', '')}.pdf`);
        }

        root.unmount();
        document.body.removeChild(element);
    };

    const getStatusVariant = (status: Quote['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
            case 'Aprovada': return 'default';
            case 'Enviada': return 'secondary';
            case 'Perdida': return 'destructive';
            case 'Rascunho': return 'outline';
            default: return 'outline';
        }
    }
    
    const handleUpdateQuote = (updatedQuoteData: { charges: QuoteCharge[] }) => {
        if (!selectedQuote) return;
        const updatedQuote = { ...selectedQuote, ...updatedQuoteData, status: 'Enviada' as const };
        onQuoteUpdate(updatedQuote);
        setSelectedQuote(updatedQuote); 
    };
    
    const handleStatusChange = (quote: Quote, newStatus: Quote['status']) => {
        onQuoteUpdate({ ...quote, status: newStatus });
        toast({
            title: `Cotação ${newStatus === 'Aprovada' ? 'Aprovada' : 'Rejeitada'}!`,
            description: `O status da cotação ${quote.id.replace('-DRAFT', '')} foi atualizado.`,
            className: 'bg-success text-success-foreground'
        });
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
            <CardDescription>Gerencie e acompanhe o status de todas as suas propostas comerciais.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Cotação ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {quotes.map((quote) => (
                        <TableRow key={quote.id}>
                            <TableCell className="font-medium text-primary cursor-pointer" onClick={() => setSelectedQuote(quote)}>{quote.id.replace('-DRAFT', '')}</TableCell>
                            <TableCell className="cursor-pointer" onClick={() => setSelectedQuote(quote)}>{quote.customer}</TableCell>
                            <TableCell className="cursor-pointer" onClick={() => setSelectedQuote(quote)}>{quote.origin}</TableCell>
                            <TableCell className="cursor-pointer" onClick={() => setSelectedQuote(quote)}>{quote.destination}</TableCell>
                            <TableCell className="cursor-pointer" onClick={() => setSelectedQuote(quote)}>
                                <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </TableCell>
                            <TableCell className="cursor-pointer" onClick={() => setSelectedQuote(quote)}>{quote.date}</TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSelectedQuote(quote)}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Ver/Editar Detalhes</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenSendDialog(quote)}>
                                            <Send className="mr-2 h-4 w-4" />
                                            <span>Enviar Cotação</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGeneratePdf(quote)}>
                                            <FileDown className="mr-2 h-4 w-4" />
                                            <span>Gerar PDF</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'Aprovada')} disabled={quote.status === 'Aprovada'}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            <span>Aprovar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'Perdida')} disabled={quote.status === 'Perdida'} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <XCircle className="mr-2 h-4 w-4" />
                                            <span>Rejeitar</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
     <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Enviar Cotação</DialogTitle>
                <DialogDescription>
                    Escolha o canal para enviar a cotação para {quoteToSend?.customer}.
                </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-4">
                 <Button onClick={() => handleSendQuote('email')} disabled={isSending}>
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Enviar por E-mail
                </Button>
                <Button onClick={() => handleSendQuote('whatsapp')} disabled={isSending}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                </Button>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
