

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runApproveQuote } from '@/app/actions';
import { Label } from './ui/label';
import type { UploadedDocument, Shipment, Quote } from '@/lib/shipment-data';
import type { Partner } from '@/lib/partners-data';

const documentTypes = ['Invoice', 'Packing List', 'Negociação NET', 'Outros'];

interface ApproveQuoteDialogProps {
  quote: Quote & { carrier?: string } | null;
  partners: Partner[];
  onApprovalConfirmed: (newShipment: any) => void;
  onPartnerSaved: (partner: Partner) => void;
  onClose: () => void;
}

// In a real app, this would be fetched from a user management service/database
const systemUsers = [
    { id: 'user-1', name: 'Admin Geral' },
    { id: 'user-2', name: 'Usuário Comercial' },
    { id: 'user-3', name: 'Usuário Operacional' },
    { id: 'user-4', name: 'Usuário Financeiro' },
];

export function ApproveQuoteDialog({ quote, partners, onApprovalConfirmed, onPartnerSaved, onClose }: ApproveQuoteDialogProps) {
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | undefined>();
  const [responsibleUserId, setResponsibleUserId] = useState<string | undefined>();
  const [notifyId, setNotifyId] = useState<string | undefined>();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (quote) {
      const consigneeId = quote.consignee?.id?.toString();
      setNotifyId(consigneeId);
      setSelectedTerminalId(undefined);
      setResponsibleUserId(undefined);
      setInvoiceNumber('');
      setPoNumber('');
      setUploadedDocs([]);
    }
  }, [quote, partners]);

  if (!quote) return null;
  
  const terminalPartners = partners.filter(p => p.roles.fornecedor && p.tipoFornecedor?.terminal);
  const needsRedestinacao = quote.charges.some(c => c.name.toUpperCase().includes('REDESTINA'));
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const newDocs = [...uploadedDocs];
      newDocs[index].file = file;
      setUploadedDocs(newDocs);
    }
  };

  const handleDocTypeChange = (value: string, index: number) => {
    const newDocs = [...uploadedDocs];
    newDocs[index].name = value as UploadedDocument['name'];
    setUploadedDocs(newDocs);
  };
  
  const addDocumentSlot = () => {
    setUploadedDocs([...uploadedDocs, { name: 'Outros', file: null as any }]);
  };

  const removeDocumentSlot = (index: number) => {
    setUploadedDocs(uploadedDocs.filter((_, i) => i !== index));
  };


  const handleConfirm = async () => {
    const notifyPartner = partners.find(p => p.id?.toString() === notifyId);
    if (!notifyPartner) {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Por favor, informe o Notify Party.' });
        return;
    }
    
    if (needsRedestinacao && !selectedTerminalId) {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Por favor, selecione um terminal para a redestinação.' });
        return;
    }
    
    if (!responsibleUserId) {
        toast({ variant: 'destructive', title: `Campo Obrigatório`, description: 'Por favor, selecione um responsável pelo processo.' });
        return;
    }
    
    const validDocs = uploadedDocs.filter(d => d.file);

    const responsibleUser = systemUsers.find(u => u.id === responsibleUserId)?.name || 'N/A';
    
    const response = await runApproveQuote(quote, notifyPartner.name, selectedTerminalId, responsibleUser, invoiceNumber, poNumber, validDocs);

    if (response.success) {
        onApprovalConfirmed(response.data);
    } else {
        toast({ variant: 'destructive', title: 'Erro ao aprovar cotação', description: response.error });
    }
  };

  return (
    <Dialog open={!!quote} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirmar Aprovação e Criar Embarque</DialogTitle>
          <DialogDescription>
            Confirme os detalhes finais para o embarque da cotação {quote.id.replace('-DRAFT', '')}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            <div className="p-4 border rounded-lg bg-secondary/50">
                <h3 className="font-semibold mb-2">Parceiros Selecionados</h3>
                <p className="text-sm"><strong className="text-muted-foreground">Shipper:</strong> {quote.shipper?.name || 'Não definido'}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Consignee:</strong> {quote.consignee?.name || 'Não definido'}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Agente:</strong> {quote.agent?.name || 'Nenhum (Embarque Direto)'}</p>
            </div>

            <div className="space-y-2">
                <Label>Notify Party (Obrigatório)</Label>
                 <Select value={notifyId} onValueChange={setNotifyId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um parceiro..." />
                    </SelectTrigger>
                    <SelectContent>
                        {partners.map(partner => (
                            <SelectItem key={partner.id} value={partner.id!.toString()}>
                                {partner.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Responsável pelo Processo</Label>
                    <Select value={responsibleUserId} onValueChange={setResponsibleUserId}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                            {systemUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {needsRedestinacao && (
                    <div>
                        <Label>Terminal de Redestinação</Label>
                        <Select onValueChange={setSelectedTerminalId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Selecione um terminal..." />
                            </SelectTrigger>
                            <SelectContent>
                                {terminalPartners.map(terminal => (
                                    <SelectItem key={terminal.id} value={terminal.id!.toString()}>
                                        {terminal.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Nº Invoice Cliente</Label>
                    <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-CLIENT-123" />
                </div>
                <div>
                    <Label>Nº Purchase Order (PO) Cliente</Label>
                    <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="PO-XYZ-456" />
                </div>
            </div>
            
            <h3 className="font-semibold pt-2">Anexar Documentos</h3>
            <div className="space-y-3">
                 {uploadedDocs.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                        <Select value={doc.name} onValueChange={(value) => handleDocTypeChange(value, index)}>
                            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {documentTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Input type="file" onChange={(e) => handleFileChange(e, index)} className="flex-grow"/>
                        {doc.file && <Paperclip className="h-4 w-4 text-muted-foreground" />}
                        <Button variant="ghost" size="icon" onClick={() => removeDocumentSlot(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                 ))}
                <Button variant="outline" size="sm" onClick={addDocumentSlot}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Documento</Button>
            </div>
        </div>

        <DialogFooter className="pt-4 mt-auto border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleConfirm}>Confirmar e Criar Embarque</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
