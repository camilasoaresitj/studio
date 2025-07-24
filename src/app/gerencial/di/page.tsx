
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileCode, Download, Radio, Check, FileUp, PlusCircle, Trash2 } from "lucide-react";

// Mock data for demonstration
const invoiceItems = [
    { id: 1, adicao: 1, ncm: '73239300', descricao: 'Frasco inox com tampa plástica', quantidade: 2880, pesoLiquido: 744.00, valorFob: 950.40 },
    { id: 2, adicao: 2, ncm: '96170010', descricao: 'Copo inox com canudo', quantidade: 1512, pesoLiquido: 579.60, valorFob: 846.72 },
];

export default function DeclaracaoImportacaoPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
            <h1 className="text-3xl font-bold">Declaração de Importação</h1>
            <p className="text-muted-foreground mt-1">
                Fatura: <span className="font-semibold text-primary">ZY2505191</span> | Importada em: 17/07/2025 - por Camila Braga
            </p>
        </div>
      </header>
      
      <Tabs defaultValue="declaracao" className="w-full">
        <TabsList>
            <TabsTrigger value="declaracao">Declaração de Importação</TabsTrigger>
            <TabsTrigger value="itens">Itens / Adições</TabsTrigger>
        </TabsList>
        <TabsContent value="declaracao" className="mt-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da Declaração</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1"><Label htmlFor="di-numero">Nº da DI</Label><Input id="di-numero" placeholder="24/1234567-8" /></div>
                        <div className="space-y-1"><Label htmlFor="di-processo">Nº do Processo</Label><Input id="di-processo" defaultValue="ZY2505191" /></div>
                        <div className="space-y-1"><Label htmlFor="di-cnpj">CNPJ Importador</Label><Input id="di-cnpj" placeholder="00.000.000/0001-00" /></div>
                        <div className="space-y-1"><Label htmlFor="di-modalidade">Modalidade de Despacho</Label>
                            <Select><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>
                                <SelectItem value="1">1 - Ordinário</SelectItem>
                                <SelectItem value="2">2 - Simplificado</SelectItem>
                            </SelectContent></Select>
                        </div>
                        <div className="space-y-1"><Label htmlFor="di-via">Via de Transporte</Label>
                             <Select><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>
                                <SelectItem value="maritima">Marítimo</SelectItem>
                                <SelectItem value="aerea">Aéreo</SelectItem>
                            </SelectContent></Select>
                        </div>
                        <div className="space-y-1"><Label htmlFor="di-urf-entrada">URF de Entrada</Label><Input id="di-urf-entrada" placeholder="0927700" /></div>
                        <div className="space-y-1"><Label htmlFor="di-local-desembaraco">Local de Desembaraço</Label><Input id="di-local-desembaraco" placeholder="Recinto Alfandegado" /></div>
                        <div className="space-y-1"><Label htmlFor="di-data-embarque">Data de Embarque</Label><Input id="di-data-embarque" type="date" /></div>
                        <div className="space-y-1"><Label htmlFor="di-data-chegada">Data de Chegada Prevista</Label><Input id="di-data-chegada" type="date" /></div>
                        <div className="space-y-1"><Label htmlFor="di-pais-origem">País de Origem</Label><Input id="di-pais-origem" placeholder="China" /></div>
                        <div className="space-y-1"><Label htmlFor="di-porto-origem">Porto de Origem</Label><Input id="di-porto-origem" placeholder="Shanghai" /></div>
                        <div className="space-y-1"><Label htmlFor="di-porto-destino">Porto de Destino</Label><Input id="di-porto-destino" placeholder="Santos" /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Dados de Transporte e Conhecimento</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1"><Label htmlFor="transp-transportador">Transportador</Label><Input id="transp-transportador" placeholder="Maersk Line" /></div>
                        <div className="space-y-1"><Label htmlFor="transp-veiculo">Nome da Embarcação / Veículo</Label><Input id="transp-veiculo" placeholder="MAERSK PICO" /></div>
                        <div className="space-y-1"><Label htmlFor="transp-master">Master (Conhecimento)</Label><Input id="transp-master" placeholder="MAEU123456789" /></div>
                        <div className="space-y-1"><Label htmlFor="transp-house">House</Label><Input id="transp-house" placeholder="HOUSE987654" /></div>
                        <div className="space-y-1"><Label htmlFor="transp-manifesto">Nº do Manifesto</Label><Input id="transp-manifesto" placeholder="MANIFEST123" /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Valores Totais</CardTitle></CardHeader>
                     <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1"><Label htmlFor="val-fob">Total FOB</Label><Input id="val-fob" type="number" placeholder="1800.00" /></div>
                        <div className="space-y-1"><Label htmlFor="val-frete">Total Frete</Label><Input id="val-frete" type="number" placeholder="2500.00" /></div>
                        <div className="space-y-1"><Label htmlFor="val-seguro">Total Seguro</Label><Input id="val-seguro" type="number" placeholder="50.00" /></div>
                        <div className="space-y-1"><Label htmlFor="val-cif">Total CIF (auto)</Label><Input id="val-cif" type="number" placeholder="4350.00" readOnly /></div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Documentos Vinculados</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Anexar NF / LI</Button>
                            <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Anexar BL</Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <Button variant="secondary"><Check className="mr-2 h-4 w-4" /> Validar DI</Button>
                    <Button><FileCode className="mr-2 h-4 w-4" /> Gerar XML para SISCOMEX</Button>
                    <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Baixar XML</Button>
                </div>
            </div>
        </TabsContent>
        <TabsContent value="itens" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Itens / Adições da DI</CardTitle>
                    <CardDescription>Gerencie os itens da fatura que compõem as adições da declaração.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Re-importar Itens da Fatura</Button>
                    </div>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Adição</TableHead>
                                    <TableHead>NCM</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead className="text-right">Peso Líquido (kg)</TableHead>
                                    <TableHead className="text-right">Valor FOB Total</TableHead>
                                    <TableHead className="text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoiceItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.adicao}</TableCell>
                                        <TableCell>{item.ncm}</TableCell>
                                        <TableCell>{item.descricao}</TableCell>
                                        <TableCell className="text-right">{item.quantidade}</TableCell>
                                        <TableCell className="text-right">{item.pesoLiquido.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">USD {item.valorFob.toFixed(2)}</TableCell>
                                        <TableCell className="text-center"><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4">
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Item (Adição)</Button>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
