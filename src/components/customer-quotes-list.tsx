
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
import { MoreHorizontal, FileText, Send, FileDown, Loader2, MessageCircle, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { QuoteCostSheet } from './quote-cost-sheet';
import { runSendQuote, runGenerateClientInvoicePdf, runSendWhatsapp } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { Partner } from '@/lib/partners-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { ApproveQuoteDialog } from './approve-quote-dialog';
import { createShipment, type UploadedDocument } from '@/lib/shipment';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  localPagamento?: 'Origem' | 'Frete' | 'Destino';
  cost: number;
  costCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  sale: number;
  saleCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  supplier: string;
  sacado?: string;
  approvalStatus: 'aprovada' | 'pendente' | 'rejeitada';
  financialEntryId?: string | null;
};

export type QuoteDetails = {
    cargo: string;
    transitTime: string;
    validity: string;
    freeTime: string;
    incoterm: string;
    collectionAddress?: string;
    deliveryAddress?: string;
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
  onClose: () => void;
  onEditQuote: (quote: Quote) => void;
  quoteToDetail: Quote | null;
  setQuoteToDetail: (quote: Quote | null) => void;
}

export function CustomerQuotesList({ quotes, partners, onQuoteUpdate, onPartnerSaved, onClose, onEditQuote, quoteToDetail, setQuoteToDetail }: CustomerQuotesListProps) {
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
      const customerAgio = customer.exchangeRateAgio ?? 0;
      
      const totalSaleBRL = quoteToSend.charges.reduce((acc, charge) => {
        const ptaxRate = exchangeRates[charge.saleCurrency] || 1;
        const finalRate = ptaxRate * (1 + (customerAgio / 100));
        const rateToUse = charge.saleCurrency === 'BRL' ? 1 : finalRate;
        return acc + charge.sale * rateToUse;
      }, 0);

      const finalPrice = `BRL ${totalSaleBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const supplier = quoteToSend.charges.find(c => c.name.toLowerCase().includes('frete'))?.supplier || 'N/A';
      
      const isClientAgent = customer.roles.agente === true;
      const contentVariables = {
        '1': quoteToSend.id.replace('-DRAFT', ''),
        '2': finalPrice
      };

      const commsResponse = await runSendQuote({
        customerName: quoteToSend.customer,
        quoteId: quoteToSend.id.replace('-DRAFT', ''),
        rateDetails: {
            origin: quoteToSend.origin,
            destination: quoteToSend.destination,
            carrier: supplier,
            transitTime: quoteToSend.details.transitTime,
            finalPrice: finalPrice,
        },
        approvalLink: `https://cargainteligente.com/approve/${quoteToSend.id}`,
        rejectionLink: `https://cargainteligente.com/reject/${quoteToSend.id}`,
        isClientAgent,
      });

      if (commsResponse.success) {
        if (channel === 'email') {
            const primaryContact = customer.contacts.find(c => c.departments?.includes('Comercial')) || customer.contacts[0];
            const recipient = primaryContact?.email;
            if (recipient) {
                // In a real app, you would use an email service API here.
                console.log("----- SIMULATING EMAIL SEND -----");
                console.log("TO:", recipient);
                console.log("SUBJECT:", commsResponse.data.emailSubject);
                console.log("BODY (HTML):", commsResponse.data.emailBody);
                console.log("---------------------------------");
                toast({ title: 'Simulando envio de e-mail!', description: `E-mail para ${recipient} gerado no console.` });
            } else {
                 toast({ variant: 'destructive', title: 'E-mail não encontrado', description: 'O contato principal do cliente não possui um e-mail cadastrado.' });
            }
        } else { // WhatsApp
            const primaryContact = customer.contacts.find(c => c.departments?.includes('Comercial')) || customer.contacts[0];
            const phone = primaryContact?.phone?.replace(/\D/g, '');
             if (phone) {
                const whatsappResponse = await runSendWhatsapp(phone, JSON.stringify(contentVariables));
                if (whatsappResponse.success) {
                    toast({ title: 'Mensagem de WhatsApp enviada!', description: `SID: ${whatsappResponse.data.sid}.`, className: 'bg-success text-success-foreground' });
                } else {
                    toast({ variant: 'destructive', title: 'Falha no Envio do WhatsApp', description: whatsappResponse.error });
                }
            } else {
                 toast({ variant: 'destructive', title: 'Telefone não encontrado', description: 'O contato principal do cliente não possui um telefone cadastrado.' });
            }
        }
        setSendDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao gerar comunicação', description: commsResponse.error });
      }

      setIsSending(false);
    };

    const handleGeneratePdf = async (quote: Quote) => {
        setIsSending(true);
        toast({ title: 'Gerando PDF...', description: 'Aguarde um momento.' });

        try {
            const formatValue = (value: number) => {
                 return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }

            const charges = quote.charges.map(c => ({
                description: c.name,
                quantity: 1, // Simplified for now
                value: formatValue(c.sale),
                total: formatValue(c.sale),
                currency: c.saleCurrency
            }));

            const customer = partners.find(p => p.name === quote.customer);
            const exchangeRates = await exchangeRateService.getRates();
            const customerAgio = customer?.exchangeRateAgio ?? 0;
            const finalPtaxUsd = parseFloat((exchangeRates['USD'] * (1 + (customerAgio / 100))).toFixed(4));

            const totalBRL = quote.charges.reduce((sum, charge) => {
                const ptaxRate = exchangeRates[charge.saleCurrency] || 1;
                const finalRate = ptaxRate * (1 + (customerAgio / 100));
                const rateToUse = charge.saleCurrency === 'BRL' ? 1 : finalRate;
                return sum + charge.sale * rateToUse;
            }, 0);
            
            const response = await runGenerateClientInvoicePdf({
                quoteNumber: quote.id.replace('-DRAFT', ''),
                customerName: quote.customer,
                date: new Date().toLocaleDateString('pt-br'),
                validity: quote.details.validity,
                origin: quote.origin,
                destination: quote.destination,
                modal: quote.details.cargo.toLowerCase().includes('kg') ? 'Aéreo' : 'Marítimo',
                equipment: quote.details.cargo,
                incoterm: quote.details.incoterm,
                transitTime: quote.details.transitTime,
                freeTime: quote.details.freeTime,
                charges,
                totalBrl: totalBRL.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
                exchangeRate: finalPtaxUsd,
                approvalLink: `https://cargainteligente.com/approve/${quote.id}`,
            });
            
            if (!response.success || !response.data.html) {
                throw new Error(response.error || "A geração do HTML da fatura falhou.");
            }
            
            const element = document.createElement("div");
            element.style.position = 'absolute';
            element.style.left = '-9999px';
            element.style.top = '0';
            element.style.width = '800px'; 
            element.innerHTML = response.data.html;
            document.body.appendChild(element);
            
            await new Promise(resolve => setTimeout(resolve, 500)); 

            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`proposta-${quote.id.replace('-DRAFT', '')}.pdf`);
            toast({ title: 'PDF gerado com sucesso!', className: 'bg-success text-success-foreground' });

            document.body.removeChild(element);

        } catch (e: any) {
            console.error("PDF generation error", e);
            toast({ variant: "destructive", title: "Erro ao gerar PDF", description: e.message || "Ocorreu um erro ao converter o conteúdo." });
        } finally {
            setIsSending(false);
        }
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
        if (!quoteToDetail) return;
        const updatedQuote = { ...quoteToDetail, ...updatedQuoteData, status: 'Enviada' as const };
        onQuoteUpdate(updatedQuote);
        setQuoteToDetail(updatedQuote); 
    };

    const handleApprovalConfirmed = async (
        quote: Quote, 
        shipper: Partner, 
        consignee: Partner, 
        agent: Partner | undefined, 
        notifyName: string,
        terminalId: string | undefined,
        responsibleUser: string,
        invoiceNumber: string,
        poNumber: string,
        uploadedDocs: UploadedDocument[]
    ) => {
        // If the shipper is new, save it.
        if (!partners.some(p => p.id === shipper.id)) {
            onPartnerSaved(shipper);
        }
        // If the consignee is new, save it.
        if (!partners.some(p => p.id === consignee.id)) {
            onPartnerSaved(consignee);
        }
        
        // Update quote status
        const approvedQuote = { ...quote, status: 'Aprovada' as const };
        onQuoteUpdate(approvedQuote);

        // Create the new shipment, passing the full quote data and partners
        await createShipment({
          ...quote,
          shipper,
          consignee,
          agent,
          notifyName,
          responsibleUser,
          terminalRedestinacaoId: terminalId,
          invoiceNumber: invoiceNumber,
          purchaseOrderNumber: poNumber,
          uploadedDocs: uploadedDocs,
        });

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
             <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Cotações de Clientes</CardTitle>
                    <CardDescription>Gerencie e acompanhe o status de todas as suas propostas comerciais.</CardDescription>
                </div>
                <Button variant="outline" onClick={onClose}>
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Voltar para Cotação
                </Button>
            </div>
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
                            <TableCell className="font-medium text-primary">{quote.id.replace('-DRAFT', '')}</TableCell>
                            <TableCell>{quote.customer}</TableCell>
                            <TableCell>{quote.origin}</TableCell>
                            <TableCell>{quote.destination}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(quote.status)}>{quote.status}</Badge>
                            </TableCell>
                            <TableCell>{quote.date}</TableCell>
                            <TableCell className="text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEditQuote(quote)}>
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>Ver/Editar Detalhes</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenSendDialog(quote)} disabled={isSending || quote.status === 'Rascunho'}>
                                            <Send className="mr-2 h-4 w-4" />
                                            <span>Enviar Cotação</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGeneratePdf(quote)} disabled={isSending || quote.status === 'Rascunho'}>
                                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                            <span>Gerar PDF</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'Aprovada')} disabled={quote.status === 'Aprovada' || quote.status === 'Rascunho'}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            <span>Aprovar</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusChange(quote, 'Perdida')} disabled={quote.status === 'Perdida' || quote.status === 'Rascunho'} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
    <Dialog open={!!quoteToDetail} onOpenChange={(isOpen) => !isOpen && setQuoteToDetail(null)}>
        <DialogContent className="sm:max-w-7xl max-h-[90vh] p-0">
            {quoteToDetail && (
                <>
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Detalhes da Cotação: {quoteToDetail.id.replace('-DRAFT', '')}</DialogTitle>
                        <DialogDescription>
                            Gerencie custos, vendas e lucro. Status: <Badge variant={getStatusVariant(quoteToDetail.status)} className="text-xs">{quoteToDetail.status}</Badge>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="p-6 pt-0 flex-grow overflow-y-auto">
                        <QuoteCostSheet key={quoteToDetail.id} quote={quoteToDetail} partners={partners} onUpdate={handleUpdateQuote} />
                    </div>
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
                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                    Enviar por WhatsApp
                </Button>
            </div>
        </DialogContent>
    </Dialog>
    <ApproveQuoteDialog
        quote={quoteToApprove}
        partners={partners}
        onClose={() => setQuoteToApprove(null)}
        onApprovalConfirmed={handleApprovalConfirmed}
        onPartnerSaved={onPartnerSaved}
    />
    </>
  );
}
