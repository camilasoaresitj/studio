
'use client';

import { useState, useEffect } from 'react';
import { FinancialPageClient } from '@/components/financials/financial-page-client';
import { getFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { getBankAccounts, BankAccount } from '@/lib/financials-data';
import { getShipments, Shipment } from '@/lib/shipment';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PartnersRegistry } from '@/components/partners-registry';
import { getPartners, savePartners, Partner } from '@/lib/partners-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { NfseConsulta } from '@/components/financials/nfse-consulta';

export default function FinanceiroPage() {
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
        const loadData = () => {
            setEntries(getFinancialEntries());
            setAccounts(getBankAccounts());
            setShipments(getShipments());
            setPartners(getPartners());
            setIsLoaded(true);
        };
        
        loadData();

        window.addEventListener('storage', loadData);
        window.addEventListener('focus', loadData);
        window.addEventListener('financialsUpdated', loadData);
        
        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('focus', loadData);
            window.removeEventListener('financialsUpdated', loadData);
        };
    }, []);

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

    if (!isLoaded) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Carregando dados financeiros...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Financeiro</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                Gerencie suas contas, faturas, notas fiscais e processos jurídicos.
                </p>
            </header>

            <Tabs defaultValue="lancamentos" className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-3xl">
                    <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                    <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
                    <TabsTrigger value="nfse">Consulta NFS-e</TabsTrigger>
                    <TabsTrigger value="juridico">Jurídico</TabsTrigger>
                </TabsList>

                <TabsContent value="lancamentos" className="mt-6">
                    <FinancialPageClient
                        initialEntries={entries}
                        initialAccounts={accounts}
                        initialShipments={shipments}
                    />
                </TabsContent>

                <TabsContent value="parceiros" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Cadastro de Parceiros</CardTitle>
                                <CardDescription>Gerencie seus clientes, fornecedores e agentes.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <PartnersRegistry partners={partners} onPartnerSaved={handlePartnerSaved} />
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="nfse" className="mt-6">
                    <NfseConsulta />
                </TabsContent>

                 <TabsContent value="juridico" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Processos em Jurídico</CardTitle>
                            <CardDescription>Faturas que foram enviadas para cobrança judicial ou protesto.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Juridico Table component will go here */}
                             <p className="text-muted-foreground">A tabela de processos jurídicos será exibida aqui.</p>
                        </CardContent>
                     </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
