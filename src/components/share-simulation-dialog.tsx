
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, Mail, MessageCircle } from 'lucide-react';
import type { ShareSimulationInput, ShareSimulationOutput } from '@/ai/flows/share-simulation';

interface ShareSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulationData: { name: string; customer: string; total: number } | null;
  onShare: (input: ShareSimulationInput) => Promise<{ success: boolean; data?: ShareSimulationOutput; error?: string; }>;
}

export function ShareSimulationDialog({ open, onOpenChange, simulationData, onShare }: ShareSimulationDialogProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleShareAction = async (channel: 'email' | 'whatsapp') => {
    if (!simulationData) return;
    setIsSharing(true);

    const input: ShareSimulationInput = {
      customerName: simulationData.customer,
      simulationName: simulationData.name,
      totalCostBRL: simulationData.total,
      // In a real app, this link would be a unique, shareable URL for the saved simulation.
      simulationLink: `https://cargainteligente.com/simulation/${simulationData.name.replace(/\s+/g, '-')}`,
    };

    const response = await onShare(input);

    if (response.success && response.data) {
      if (channel === 'email') {
        // Simulate sending email
        console.log("Email Subject:", response.data.emailSubject);
        console.log("Email Body:", response.data.emailBody);
        toast({ title: 'E-mail enviado! (Simulação)', description: 'O e-mail foi gerado no console.' });
      } else {
        // Simulate sending WhatsApp
        console.log("WhatsApp Message:", response.data.whatsappMessage);
        toast({ title: 'WhatsApp enviado! (Simulação)', description: 'A mensagem foi gerada no console.' });
      }
      onOpenChange(false);
    } else {
      toast({ variant: 'destructive', title: 'Erro ao compartilhar', description: response.error });
    }

    setIsSharing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar Simulação</DialogTitle>
          <DialogDescription>
            Envie um resumo da simulação para seu cliente via E-mail ou WhatsApp.
          </DialogDescription>
        </DialogHeader>
        {simulationData && (
          <div className="py-4 space-y-2">
            <p><strong>Simulação:</strong> {simulationData.name}</p>
            <p><strong>Cliente:</strong> {simulationData.customer}</p>
            <p><strong>Custo Total:</strong> BRL {simulationData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => handleShareAction('email')} disabled={isSharing}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Enviar por E-mail
          </Button>
          <Button onClick={() => handleShareAction('whatsapp')} disabled={isSharing}>
             {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            Enviar por WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
