
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
import { Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runApproveQuote } from '@/app/actions';
import type { Quote } from './customer-quotes-list';
import { Label } from './ui/label';
import type { UploadedDocument } from '@/lib/shipment-data';
import type { Partner } from '@/lib/partners-data';

const FileUploadField = ({ label, file, onFileChange }: { label: string, file: File | null, onFileChange: (file: File | null) => void }) => {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex items-center gap-2 mt-1">
                <Input type="file" onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)} className="flex-grow" />
                {file && <span className="text-sm text-muted-foreground truncate flex items-center gap-1"><Paperclip className="h-4 w-4" /> {file.name}</span>}
            </div>
        </div>
    );
};

interface ApproveQuoteDialogProps {
  quote: Quote | null;
  partners: Partner[];
  onApprovalConfirmed: () => void;
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
  const [notifyName, setNotifyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [netFile, setNetFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [packingFile, setPackingFile] = useState<File | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (quote) {
      const consignee = partners.find(p => p.id?.toString() === quote.consigneeId);
      setNotifyName(consignee?.name || '');
      setSelectedTerminalId(undefined);
      setResponsibleUserId(undefined);
      setInvoiceNumber('');
      setPoNumber('');
      setNetFile(null);
      setInvoiceFile(null);
      setPackingFile(null);
    }
  }, [quote, partners]);

  if (!quote) return null;
  
  const terminalPartners = partners.filter(p => p.roles.fornecedor && p.tipoFornecedor?.terminal);
  const needsRedestinacao = quote.charges.some(c => c.name.toUpperCase().includes('REDESTINA'));

  const handleConfirm = async () => {
    if (!notifyName.trim()) {
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
    
    const uploadedDocs: UploadedDocument[] = [];
    if(netFile) uploadedDocs.push({ name: 'Negociação NET', file: netFile });
    if(invoiceFile) uploadedDocs.push({ name: 'Invoice', file: invoiceFile });
    if(packingFile) uploadedDocs.push({ name: 'Packing List', file: packingFile });

    const responsibleUser = systemUsers.find(u => u.id === responsibleUserId)?.name || 'N/A';
    
    const response = await runApproveQuote(quote, notifyName, selectedTerminalId, responsibleUser, invoiceNumber, poNumber, uploadedDocs);

    if (response.success) {
        onApprovalConfirmed();
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
                <p className="text-sm"><strong className="text-muted-foreground">Shipper:</strong> {partners.find(p=>p.id?.toString() === quote.shipperId)?.name || 'Não definido'}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Consignee:</strong> {partners.find(p=>p.id?.toString() === quote.consigneeId)?.name || 'Não definido'}</p>
                <p className="text-sm"><strong className="text-muted-foreground">Agente:</strong> {partners.find(p=>p.id?.toString() === quote.agentId)?.name || 'Nenhum (Embarque Direto)'}</p>
            </div>

            <div className="space-y-2">
                <Label>Notify Party (Obrigatório)</Label>
                <Input value={notifyName} onChange={(e) => setNotifyName(e.target.value)} placeholder="Digite o nome do Notify" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUploadField label="Negociação NET" file={netFile} onFileChange={setNetFile} />
                <FileUploadField label="Invoice" file={invoiceFile} onFileChange={setInvoiceFile} />
                <FileUploadField label="Packing List" file={packingFile} onFileChange={setPackingFile} />
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
