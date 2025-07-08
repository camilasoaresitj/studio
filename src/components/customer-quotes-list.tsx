
'use client';

import { useState } from 'react';
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
import { exchangeRateService } from '@/services/exchange-rate-service';
import { ApproveQuoteDialog } from './approve-quote-dialog';
import { createShipment } from '@/lib/shipment';

const DynamicJsPDF = dynamic(() => import('jspdf').then(mod => mod.default), { ssr: false });
const DynamicHtml2Canvas = dynamic(() => import('html2canvas'), { ssr: false });

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  cost: number;
  costCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  sale: number;
  saleCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  supplier: string;
};

export type QuoteDetails = {
    cargo: string;
    transitTime: string;
    validity: string;
    freeTime: string;
};

export type Quote = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: 'Enviada' | 'Aprovada' | 'Perdida' | 'Rascunho';
  date: string;
  details: QuoteDetails;
  charges: QuoteCharge[];
};


interface CustomerQuotesListProps {
  quotes: Quote[];
  partners: Partner[];
  onQuoteUpdate: (updatedQuote: Quote) => void;
  onPartnerSaved: (partner: Partner) => void;
}

export function CustomerQuotesList({ quotes, partners, onQuoteUpdate, onPartnerSaved }: CustomerQuotesListProps) {
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [quoteToSend, setQuoteToSend] = useState<Quote | null>(null);
    const [quoteToApprove, setQuoteToApprove] = useState<Quote | null>(null);
    const { toast } = useToast();

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
      
      const exchangeRates = await exchangeRateService.getRates();
      const customerAgio = customer.exchangeRateAgio || 0;
      
      const response = await runSendQuote({
        quote: quoteToSend,
        customer,
        exchangeRates,
        customerAgio,
        approvalLink: `https://cargainteligente.com/approve/${quoteToSend.id}`,
        rejectionLink: `https://cargainteligente.com/reject/${quoteToSend.id}`,
      });

      if (response.success) {
        if (channel === 'email') {
            const primaryContact = customer.contacts.find(c => c.department === 'Comercial') || customer.contacts[0];
            const recipient = primaryContact?.email;
            if (recipient) {
                // Using window.location to trigger mail client for better HTML compatibility
                const mailto_link = 'mailto:' + recipient + '?subject=' + encodeURIComponent(response.data.emailSubject) + '&body=' + encodeURIComponent(response.data.htmlBody);
                window.location.href = mailto_link;
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
        setIsSending(true);
        toast({ title: 'Gerando PDF...', description: 'Aguarde um momento.' });

        const customer = partners.find(p => p.name === quote.customer);
        if (!customer) {
            toast({ variant: 'destructive', title: 'Cliente não encontrado!' });
            setIsSending(false);
            return;
        }
        
        const exchangeRates = await exchangeRateService.getRates();

        const response = await runSendQuote({
            quote,
            customer,
            exchangeRates,
            customerAgio: customer.exchangeRateAgio || 0,
            approvalLink: 'N/A',
            rejectionLink: 'N/A',
        });

        if (!response.success) {
            toast({ variant: 'destructive', title: 'Erro ao gerar PDF', description: response.error });
            setIsSending(false);
            return;
        }

        const [jsPDF, html2canvas] = await Promise.all([
            DynamicJsPDF,
            DynamicHtml2Canvas,
        ]);
        
        const element = document.createElement("div");
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.width = '800px';
        element.innerHTML = response.data.htmlBody;
        document.body.appendChild(element);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const quoteElement = element.querySelector('#proposal');
        if (quoteElement) {
            const canvas = await html2canvas(quoteElement as HTMLElement, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`proposta-${quote.id.replace('-DRAFT', '')}.pdf`);
        }

        document.body.removeChild(element);
        setIsSending(false);
        toast({ title: 'PDF gerado com sucesso!', className: 'bg-success text-success-foreground' });
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

    const handleApprovalConfirmed = (quote: Quote, overseasPartner: Partner, agent?: Partner) => {
        // If the partner is new (doesn't have an existing ID in the main list), save it.
        if (!partners.some(p => p.id === overseasPartner.id)) {
            onPartnerSaved(overseasPartner);
        }
        
        // Update quote status
        const approvedQuote = { ...quote, status: 'Aprovada' as const };
        onQuoteUpdate(approvedQuote);

        // Create the new shipment, passing the full quote data
        createShipment(approvedQuote, overseasPartner, agent);

        toast({
            title: `Cotação ${quote.id.replace('-DRAFT', '')} Aprovada!`,
            description: `Embarque criado no Módulo Operacional.`,
            className: 'bg-success text-success-foreground'
        });
        setQuoteToApprove(null); // Close the dialog
    };
    
    const handleStatusChange = (quote: Quote, newStatus: Quote['status']) => {
        if (newStatus === 'Aprovada') {
            setQuoteToApprove(quote);
        } else {
            onQuoteUpdate({ ...quote, status: newStatus });
            toast({
                title: `Cotação ${newStatus === 'Perdida' ? 'Rejeitada' : 'Atualizada'}!`,
                description: `O status da cotação ${quote.id.replace('-DRAFT', '')} foi atualizado.`,
            });
        }
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
                        <TableRow key={quote.id} onClick={() => setSelectedQuote(quote)} className="cursor-pointer">
                            <TableCell className="font-medium text-primary">{quote.id.replace('-DRAFT', '')}</TableCell>
                            <TableCell>{quote.customer}</TableCell>
                            <TableCell>{quote.origin}</TableCell>
                            <TableCell>{quote.destination}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </TableCell>
                            <TableCell>{quote.date}</TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
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
                                        <DropdownMenuItem onClick={() => handleOpenSendDialog(quote)} disabled={isSending}>
                                            <Send className="mr-2 h-4 w-4" />
                                            <span>Enviar Cotação</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGeneratePdf(quote)} disabled={isSending}>
                                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                            <span>Gerar PDF</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'Aprovada')} disabled={quote.status === 'Aprovada'}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            <span>Aprovar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'Perdida')} disabled={quote.status === 'Perdida'} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <XCircle className="mr-2 h-4 w-4" />
                                            <span>Rejeitar (Perdida)</span>
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
    <Dialog open={!!selectedQuote} onOpenChange={(isOpen) => !isOpen && setSelectedQuote(null)}>
        <DialogContent className="max-w-6xl h-[90vh]">
            {selectedQuote && (
                <>
                    <DialogHeader>
                        <DialogTitle>Detalhes da Cotação: {selectedQuote.id.replace('-DRAFT', '')}</DialogTitle>
                        <DialogDescription>
                            Gerencie os custos, receitas e lucro desta cotação. Status: <Badge variant={getStatusVariant(selectedQuote.status)} className="text-xs">{selectedQuote.status}</Badge>
                        </DialogDescription>
                    </DialogHeader>
                    <QuoteCostSheet quote={selectedQuote} onUpdate={handleUpdateQuote} />
                </>
            )}
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
    <ApproveQuoteDialog
        quote={quoteToApprove}
        partners={partners}
        onClose={() => setQuoteToApprove(null)}
        onApprovalConfirmed={handleApprovalConfirmed}
    />
    </>
  );
}

    