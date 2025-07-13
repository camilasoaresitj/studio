
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
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Upload, User, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '../ui/input';
import Image from 'next/image';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    signatureUrl?: string;
};

const initialUsers: User[] = [
    { id: 1, name: 'Admin Geral', email: 'admin@cargainteligente.com', role: 'Administrador', status: 'Ativo', signatureUrl: 'https://placehold.co/200x60.png?text=Assinatura' },
    { id: 2, name: 'Usuário Comercial', email: 'comercial@cargainteligente.com', role: 'Comercial', status: 'Ativo' },
    { id: 3, name: 'Usuário Operacional', email: 'operacional@cargainteligente.com', role: 'Operacional', status: 'Ativo' },
    { id: 4, name: 'Usuário Financeiro', email: 'financeiro@cargainteligente.com', role: 'Financeiro', status: 'Ativo' },
    { id: 5, name: 'Usuário Inativo', email: 'inativo@cargainteligente.com', role: 'Comercial', status: 'Inativo' },
];

export function UserManagementTable() {
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { toast } = useToast();

    const handleAction = (action: string, userName: string) => {
        toast({
            title: `Ação: ${action}`,
            description: `Funcionalidade para ${action.toLowerCase()} o usuário ${userName} será implementada em breve.`,
        });
    };

    const handleOpenEditDialog = (user: User) => {
        setEditingUser(user);
    };

    const handleSaveSignature = () => {
        if (!editingUser) return;
        
        // In a real app, you would handle the file upload here.
        // For simulation, we'll just update the user with a placeholder URL.
        const updatedUsers = users.map(u => 
            u.id === editingUser.id ? { ...u, signatureUrl: `https://placehold.co/200x60.png?text=${editingUser.name.split(' ')[0]}` } : u
        );
        setUsers(updatedUsers);
        setEditingUser(null);
        toast({
            title: 'Assinatura Salva!',
            description: `A assinatura para ${editingUser.name} foi atualizada (simulação).`,
            className: 'bg-success text-success-foreground'
        });
    };

  return (
    <>
    <div className="space-y-4">
        <div className="flex justify-end">
            <Button onClick={() => handleAction('Adicionar Usuário', '')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Convidar Novo Usuário
            </Button>
        </div>
        <div className="border rounded-lg">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {users.map((user) => (
                <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                    <Badge variant="secondary">{user.role}</Badge>
                </TableCell>
                <TableCell>
                    <Badge variant={user.status === 'Ativo' ? 'success' : 'destructive'}>
                        {user.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </div>
    </div>
    <Dialog open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Editar Usuário: {editingUser?.name}</DialogTitle>
                <DialogDescription>
                    Gerencie os dados e a assinatura do usuário.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="flex flex-col items-center text-center p-6 border-2 border-dashed rounded-lg">
                    {editingUser?.signatureUrl ? (
                        <Image src={editingUser.signatureUrl} alt="Assinatura" width={200} height={60} className="mb-4" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-20 mb-4 text-muted-foreground">
                            <ImageIcon className="h-8 w-8" />
                            <span className="text-sm mt-2">Nenhuma assinatura cadastrada</span>
                        </div>
                    )}
                    <h3 className="text-lg font-semibold">Assinatura Digitalizada</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Faça o upload de uma imagem .png com fundo transparente.
                    </p>
                    <Button asChild variant="outline">
                        <label htmlFor="signature-upload">
                            <Upload className="mr-2 h-4 w-4" />
                            {editingUser?.signatureUrl ? 'Alterar Assinatura' : 'Carregar Assinatura'}
                            <Input id="signature-upload" type="file" className="hidden" accept="image/png" />
                        </label>
                    </Button>
                </div>
            </div>
            <DialogFooter>
                 <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                 <Button type="button" onClick={handleSaveSignature}>Salvar Alterações</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
