
'use client';

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
import { PlusCircle, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const users = [
    { id: 1, name: 'Admin Geral', email: 'admin@cargainteligente.com', role: 'Administrador', status: 'Ativo' },
    { id: 2, name: 'Usuário Comercial', email: 'comercial@cargainteligente.com', role: 'Comercial', status: 'Ativo' },
    { id: 3, name: 'Usuário Operacional', email: 'operacional@cargainteligente.com', role: 'Operacional', status: 'Ativo' },
    { id: 4, name: 'Usuário Financeiro', email: 'financeiro@cargainteligente.com', role: 'Financeiro', status: 'Ativo' },
    { id: 5, name: 'Usuário Inativo', email: 'inativo@cargainteligente.com', role: 'Comercial', status: 'Inativo' },
];

export function UserManagementTable() {
    const { toast } = useToast();

    const handleAction = (action: string, userName: string) => {
        toast({
            title: `Ação: ${action}`,
            description: `Funcionalidade para ${action.toLowerCase()} o usuário ${userName} será implementada em breve.`,
        });
    };

  return (
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
                    <Button variant="ghost" size="icon" onClick={() => handleAction('Editar Permissões', user.name)}>
                        <Edit className="h-4 w-4" />
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
