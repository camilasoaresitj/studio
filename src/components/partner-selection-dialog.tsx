
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Partner } from '@/lib/partners-data';
import { ScrollArea } from './ui/scroll-area';

interface PartnerSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  onPartnerSelect: (partner: Partner) => void;
  title: string;
}

export function PartnerSelectionDialog({ isOpen, onClose, partners, onPartnerSelect, title }: PartnerSelectionDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (partner: Partner) => {
    onPartnerSelect(partner);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Busque e selecione um parceiro da sua lista.
          </DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput 
            placeholder="Buscar parceiro..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <ScrollArea className="h-72">
            <CommandList>
              <CommandEmpty>Nenhum parceiro encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredPartners.map(partner => (
                  <CommandItem
                    key={partner.id}
                    value={partner.name}
                    onSelect={() => handleSelect(partner)}
                  >
                    {partner.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
