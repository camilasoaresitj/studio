

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from './ui/button';
import { MoreHorizontal, FileText, Send, FileDown, Loader2, MessageCircle, CheckCircle, XCircle, ArrowLeft, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { QuoteCostSheet } from './quote-cost-sheet';
import { runSendQuote, runGenerateQuotePdfHtml, runSendWhatsapp } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { Partner } from '@/lib/partners-data';
import { exchangeRateService } from '@/services/exchange-rate-service';
import { ApproveQuoteDialog } from './approve-quote-dialog';
import type { UploadedDocument, Shipment, QuoteCharge, Quote } from '@/lib/shipment-data';

interface CustomerQuotesListProps {
  quotes: Quote[];
  partners: Partner[];
  onQuoteUpdate: (updatedQuote: Quote) => void;
  onPartnerSaved: (partner: Partner) => void;
  onClose: () => void;
  onEditQuote: (quote: Quote) => void;
  quoteToDetail: Quote | null;
  setQuoteToDetail: (quote: Quote | null) => void;
  onCloneQuote: (quote: Quote) => void;
}

export function CustomerQuotesList({ quotes, partners, onQuoteUpdate, onPartnerSaved, onClose, onEditQuote, quoteToDetail, setQuoteToDetail, onCloneQuote }: CustomerQuotesListProps) {
    const [isSending, setIsSending] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);
    const [quoteToSend, setQuoteToSend] = useState<Quote | null>(null);
    const [quoteToApprove, setQuoteToApprove] = useState<(Quote & { carrier?: string }) | null>(null);
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

      if (commsResponse.success && commsResponse.data) {
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
                const whatsappResponse = await runSendWhatsapp(phone, commsResponse.data.whatsappMessage);
                if (whatsappResponse.success && whatsappResponse.data) {
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
        toast({ title: 'Gerando proposta...', description: 'Aguarde um momento.' });

        try {
            const companySettings = JSON.parse(localStorage.getItem('company_settings') || '{}');
            const logoDataUrl = companySettings.logoDataUrl;

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
            
            const response = await runGenerateQuotePdfHtml({
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
                companyLogoUrl: logoDataUrl,
            });
            
            if (!response.success || !response.data?.html) {
                throw new Error(response.error || "A geração do HTML da fatura falhou.");
            }
            
            // Open the HTML in a new tab instead of generating a PDF
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(response.data.html);
                newWindow.document.close();
            } else {
                toast({ variant: "destructive", title: "Bloqueador de Pop-up", description: "Não foi possível abrir a proposta em uma nova aba. Por favor, desative seu bloqueador de pop-ups." });
            }

        } catch (e: any) {
            console.error("Proposal generation error", e);
            toast({ variant: "destructive", title: "Erro ao gerar proposta", description: e.message || "Ocorreu um erro ao gerar o conteúdo." });
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

    const handleApprovalConfirmed = (newShipment: Shipment) => {
        if (!quoteToApprove) return;
        
        onQuoteUpdate({ ...quoteToApprove, status: 'Aprovada' });

        toast({
            title: `Cotação ${quoteToApprove.id.replace('-DRAFT', '')} Aprovada!`,
            description: `Embarque ${newShipment.id} criado no Módulo Operacional.`,
            className: 'bg-success text-success-foreground'
        });
        setQuoteToApprove(null);
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

    const handleClone = (quote: Quote) => {
        onCloneQuote(quote);
        toast({
            title: 'Cotação Clonada!',
            description: 'Os dados foram carregados no formulário de cotação. Ajuste e salve como uma nova cotação.',
        });
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
                        <TableHead>ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Rota</TableHead>
                        <TableHead>Shipper</TableHead>
                        <TableHead>Consignee</TableHead>
                        <TableHead>Agente</TableHead>
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
                            <TableCell>{quote.origin} &rarr; {quote.destination}</TableCell>
                            <TableCell>{quote.shipper?.name || 'N/A'}</TableCell>
                            <TableCell>{quote.consignee?.name || 'N/A'}</TableCell>
                            <TableCell>{quote.agent?.name || 'N/A'}</TableCell>
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
                                        <DropdownMenuItem onClick={() => handleClone(quote)}>
                                            <Copy className="mr-2 h-4 w-4" />
                                            <span>Clonar Cotação</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleOpenSendDialog(quote)} disabled={isSending || quote.status === 'Rascunho'}>
                                            <Send className="mr-2 h-4 w-4" />
                                            <span>Enviar Cotação</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleGeneratePdf(quote)} disabled={isSending || quote.status === 'Rascunho'}>
                                            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                                            <span>Gerar Proposta</span>
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
