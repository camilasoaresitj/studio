'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal } from 'lucide-react';

export type Partner = {
  id: number;
  name: string;
  type: 'Cliente' | 'Fornecedor' | 'Agente';
  email: string;
  phone: string;
};

interface PartnersRegistryProps {
  partners: Partner[];
  onPartnerAdded: (newPartner: Partner) => void;
}

export function PartnersRegistry({ partners, onPartnerAdded }: PartnersRegistryProps) {
  const [open, setOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    type: 'Cliente' as Partner['type'],
    email: '',
    phone: '',
  });

  const handleAddPartner = () => {
    onPartnerAdded({
      id: Math.random(), // simple id generation
      ...newPartner,
    });
    setNewPartner({ name: '', type: 'Cliente', email: '', phone: '' });
    setOpen(false);
  };

  const getPartnerTypeVariant = (type: Partner['type']): 'default' | 'secondary' | 'outline' => {
      switch (type) {
          case 'Cliente': return 'default';
          case 'Fornecedor': return 'secondary';
          case 'Agente': return 'outline';
          default: return 'default';
      }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">Parceiros</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Parceiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Parceiro</DialogTitle>
              <DialogDescription>
                Preencha os dados do cliente, fornecedor ou agente.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nome</Label>
                <Input id="name" value={newPartner.name} onChange={(e) => setNewPartner({...newPartner, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Tipo</Label>
                <Select
                    onValueChange={(value: Partner['type']) => setNewPartner({...newPartner, type: value})}
                    defaultValue={newPartner.type}
                >
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                        <SelectItem value="Agente">Agente</SelectItem>
                    </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={newPartner.email} onChange={(e) => setNewPartner({...newPartner, email: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Telefone</Label>
                <Input id="phone" value={newPartner.phone} onChange={(e) => setNewPartner({...newPartner, phone: e.target.value})} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddPartner}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell>
                  <Badge variant={getPartnerTypeVariant(partner.type)}>{partner.type}</Badge>
                </TableCell>
                <TableCell>{partner.email}</TableCell>
                <TableCell>{partner.phone}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
