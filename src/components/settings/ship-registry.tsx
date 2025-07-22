
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Ship as ShipIcon } from 'lucide-react';
import { getShips, Ship } from '@/lib/ship-data';

export function ShipRegistry() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setShips(getShips());
  }, []);

  const filteredShips = useMemo(() => {
    if (!searchTerm) {
      return ships;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return ships.filter(ship => 
      ship.name.toLowerCase().includes(lowercasedTerm) ||
      ship.siscomexCode?.includes(lowercasedTerm)
    );
  }, [ships, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShipIcon /> Cadastro de Navios</CardTitle>
        <CardDescription>Consulte os navios e seus respectivos códigos do Siscomex.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary">
              <TableRow>
                <TableHead>Nome do Navio</TableHead>
                <TableHead>Código Siscomex</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShips.length > 0 ? (
                filteredShips.map((ship) => (
                  <TableRow key={ship.id}>
                    <TableCell className="font-medium">{ship.name}</TableCell>
                    <TableCell>{ship.siscomexCode || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    Nenhum navio encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
