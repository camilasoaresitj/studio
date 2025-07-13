
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button";
import { SlidersHorizontal, List, Briefcase, Users, FileBarChart } from "lucide-react";
import { RateImporter } from "./rate-importer";
import { useState } from "react";
import { ExtractRatesFromTextOutput } from "@/ai/flows/extract-rates-from-text";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { PartnersRegistry } from "./partners-registry";
import { getPartners, Partner, savePartners } from "@/lib/partners-data";
import { useToast } from "@/hooks/use-toast";
import { FeesRegistry, Fee } from "./fees-registry";
import { getFees } from "@/lib/fees-data";
import { CrmForm } from "./crm-form";

interface CommercialMenuProps {
    onViewQuotes: () => void;
}

export function CommercialMenu({ onViewQuotes }: CommercialMenuProps) {
    const [dialogContent, setDialogContent] = useState<React.ReactNode | null>(null);
    const [partners, setPartners] = useState<Partner[]>(getPartners);
    const [fees, setFees] = useState<Fee[]>(getFees);
    const { toast } = useToast();

    const handlePartnerSaved = (partnerToSave: Partner) => {
        let updatedPartners;
        if (partnerToSave.id && partnerToSave.id !== 0) {
            updatedPartners = partners.map(p => p.id === partnerToSave.id ? partnerToSave : p);
        } else {
            const newId = Math.max(0, ...partners.map(p => p.id ?? 0)) + 1;
            updatedPartners = [...partners, { ...partnerToSave, id: newId }];
        }
        setPartners(updatedPartners);
        savePartners(updatedPartners);
    };

    const handleFeeSaved = (feeToSave: Fee) => {
      setFees(prevFees => {
          const index = prevFees.findIndex(f => f.id === feeToSave.id);
          if (index > -1) {
              const newFees = [...prevFees];
              newFees[index] = feeToSave;
              return newFees;
          } else {
              return [...prevFees, { ...feeToSave, id: (prevFees.length ?? 0) + 1 }];
          }
      });
    };

    const handleRatesImported = (importedRates: ExtractRatesFromTextOutput) => {
        // This is a placeholder as the rate state is managed in the parent.
        // In a real app with state management (like Redux/Zustand), this would dispatch an action.
        toast({
            title: "Tarifas Importadas",
            description: `${importedRates.length} tarifas foram extraídas e estão disponíveis na tabela.`,
            className: 'bg-success text-success-foreground'
        });
        setDialogContent(null);
    };

    const openDialog = (type: 'rates' | 'partners' | 'fees' | 'crm') => {
        switch(type) {
            case 'rates':
                setDialogContent(
                    <RateImporter onRatesImported={handleRatesImported} />
                );
                break;
            case 'partners':
                setDialogContent(
                    <PartnersRegistry partners={partners} onPartnerSaved={handlePartnerSaved} />
                );
                break;
            case 'fees':
                setDialogContent(
                    <FeesRegistry fees={fees} onSave={handleFeeSaved} />
                );
                break;
            case 'crm':
                setDialogContent(
                    <CrmForm />
                );
                break;
        }
    }


    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Menu Comercial
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Gerenciamento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onViewQuotes}>
                    <List className="mr-2 h-4 w-4" />
                    <span>Listar Cotações</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog('rates')}>
                    <FileBarChart className="mr-2 h-4 w-4"/>
                    <span>Importador de Tarifas</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => openDialog('fees')}>
                    <Briefcase className="mr-2 h-4 w-4"/>
                    <span>Cadastro de Taxas</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog('partners')}>
                   <Users className="mr-2 h-4 w-4"/>
                   <span>Cadastro de Parceiros</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Ferramentas de IA</DropdownMenuLabel>
                 <DropdownMenuItem onClick={() => openDialog('crm')}>
                   <Briefcase className="mr-2 h-4 w-4"/>
                   <span>CRM Automático</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        
        <Dialog open={!!dialogContent} onOpenChange={(isOpen) => !isOpen && setDialogContent(null)}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh]">
                 {dialogContent}
            </DialogContent>
        </Dialog>
        </>
    );
}
