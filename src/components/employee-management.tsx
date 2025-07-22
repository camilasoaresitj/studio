
'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmployeeDialog } from './employee-dialog';
import { getEmployees, saveEmployees, Employee } from '@/lib/employee-data';

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setEmployees(getEmployees());
  }, []);

  const handleSave = (employee: Employee) => {
    let updatedEmployees;
    if (editingEmployee) {
      updatedEmployees = employees.map(e => e.id === employee.id ? employee : e);
    } else {
      const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
      updatedEmployees = [...employees, { ...employee, id: newId }];
    }
    setEmployees(updatedEmployees);
    saveEmployees(updatedEmployees);
    setIsDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleOpenDialog = (employee: Employee | null) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Funcionários</CardTitle>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Funcionário
            </Button>
          </div>
          <CardDescription>Gerencie os dados e benefícios dos seus funcionários.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>
                      <Badge variant={employee.workRegime === 'CLT' ? 'default' : 'secondary'}>
                        {employee.workRegime}
                      </Badge>
                    </TableCell>
                    <TableCell>R$ {employee.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                       <Badge variant={employee.status === 'Ativo' ? 'success' : 'destructive'}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(employee)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog
        isOpen={isDialogOpen}
        onClose={() => {
            setIsDialogOpen(false);
            setEditingEmployee(null);
        }}
        onSave={handleSave}
        employee={editingEmployee}
      />
    </>
  );
}

