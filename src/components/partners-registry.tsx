
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { PlusCircle, Edit, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PartnerDialog } from './partner-dialog';
import type { Partner } from '@/lib/partners-data';

interface PartnersRegistryProps {
  partners: Partner[];
  onPartnerSaved: (partner: Partner) => void;
}

const supplierTypes = [
    { id: 'ciaMaritima', label: 'Cia Marítima' },
    { id: 'ciaAerea', label: 'Cia Aérea' },
    { id: 'transportadora', label: 'Transportadora' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'coLoader', label: 'Co-loader' },
    { id: 'fumigacao', label: 'Fumigação' },
    { id: 'despachante', label: 'Despachante' },
    { id: 'representante', label: 'Representante' },
    { id: 'dta', label: 'DTA' },
    { id: 'comissionados', label: 'Comissionados' },
    { id: 'administrativo', label: 'Administrativo' },
    { id: 'aluguelContainer', label: 'Aluguel Contêiner' },
    { id: 'lashing', label: 'Lashing' },
    { id: 'seguradora', label: 'Seguradora' },
    { id: 'advogado', label: 'Advogado' },
];

export function PartnersRegistry({ partners, onPartnerSaved }: PartnersRegistryProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [filters, setFilters] = useState({ name: '', country: '', state: '', type: '' });
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDialog = (partner: Partner | null) => {
    setEditingPartner(partner);
    setIsDialogOpen(true);
  };
  
  const getPartnerTypeString = (partner: Partner): string => {
    const types: string[] = [];
    if (partner.roles.cliente) types.push('Cliente');
    if (partner.roles.fornecedor) {
        const supplierSubtypes = Object.entries(partner.tipoFornecedor || {})
            .filter(([, value]) => value)
            .map(([key]) => supplierTypes.find(t => t.id === key)?.label)
            .filter(Boolean);
        if (supplierSubtypes.length > 0) {
            types.push(supplierSubtypes.join(', '));
        } else {
            types.push('Fornecedor');
        }
    }
    if (partner.roles.agente) {
        const agentSubtypes = Object.entries(partner.tipoAgente || {})
            .filter(([, value]) => value)
            .map(([key]) => key.toUpperCase())
            .join('/');
        types.push(`Agente (${agentSubtypes || 'N/A'})`);
    }
    if (partner.roles.comissionado) types.push('Comissionado');

    return types.join(' | ');
  }

  const filteredPartners = useMemo(() => {
    return partners.filter((partner) => {
        const nameMatch = partner.name.toLowerCase().includes(filters.name.toLowerCase());
        const countryMatch = !filters.country || (partner.address.country || '').toLowerCase().includes(filters.country.toLowerCase());
        const stateMatch = !filters.state || (partner.address.state || '').toLowerCase().includes(filters.state.toLowerCase());
        const typeMatch = !filters.type || getPartnerTypeString(partner).toLowerCase().includes(filters.type.toLowerCase());
        return nameMatch && countryMatch && stateMatch && typeMatch;
    });
  }, [partners, filters]);
  
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        if (jsonData.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        const newPartners: Partner[] = jsonData.map((row, index) => {
          const roleLower = String(row.role || '').toLowerCase();
          const newPartner: Partner = {
            id: 0,
            name: String(row.name || `Novo Parceiro ${index}`),
            nomeFantasia: String(row.nome_fantasia || ''),
            cnpj: String(row.cnpj || ''),
            vat: String(row.vat || ''),
            roles: {
                cliente: roleLower.includes('cliente'),
                fornecedor: roleLower.includes('fornecedor'),
                agente: roleLower.includes('agente'),
                comissionado: roleLower.includes('comissionado'),
            },
            address: {
                street: String(row.address_street || ''),
                number: String(row.address_number || ''),
                complement: String(row.address_complement || ''),
                district: String(row.address_district || ''),
                city: String(row.address_city || ''),
                state: String(row.address_state || ''),
                zip: String(row.address_zip || ''),
                country: String(row.address_country || ''),
            },
            contacts: [{
                name: String(row.contact_name || 'Contato Principal'),
                email: String(row.contact_email || 'email@a-definir.com'),
                phone: String(row.contact_phone || '000000000'),
                departments: ['Comercial'],
                despachanteId: null,
                loginEmail: '',
                password: '',
            }]
          };
          onPartnerSaved(newPartner);
          return newPartner;
        });
        
        toast({
          title: "Importação Concluída!",
          description: `${newPartners.length} parceiros foram adicionados/atualizados.`,
          className: 'bg-success text-success-foreground'
        });

      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Erro ao Importar', description: err.message });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls"
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full">
            <Input placeholder="Buscar por Nome..." value={filters.name} onChange={(e) => handleFilterChange('name', e.target.value)} />
            <Input placeholder="Buscar por País..." value={filters.country} onChange={(e) => handleFilterChange('country', e.target.value)} />
            <Input placeholder="Buscar por Estado..." value={filters.state} onChange={(e) => handleFilterChange('state', e.target.value)} />
            <Input placeholder="Buscar por Tipo..." value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} />
        </div>
        <div className="flex gap-2 self-end md:self-auto">
            <Button variant="outline" onClick={handleImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
            </Button>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Parceiro
            </Button>
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Contato Principal</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPartners.length > 0 ? filteredPartners.map((partner) => (
              <TableRow key={partner.id}>
                <TableCell className="font-medium">{partner.name}</TableCell>
                <TableCell className="text-xs">
                  {getPartnerTypeString(partner)}
                </TableCell>
                <TableCell>{partner.address?.country}</TableCell>
                <TableCell>{partner.address?.state}</TableCell>
                <TableCell>
                  <div className="text-sm">{partner.contacts[0]?.name}</div>
                  <div className="text-xs text-muted-foreground">{partner.contacts[0]?.email}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(partner)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">Nenhum parceiro encontrado.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <PartnerDialog 
        isOpen={isDialogOpen}
        onClose={() => {
            setIsDialogOpen(false);
            setEditingPartner(null);
        }}
        onPartnerSaved={onPartnerSaved}
        partner={editingPartner}
        allPartners={partners}
      />
    </div>
  );
}
