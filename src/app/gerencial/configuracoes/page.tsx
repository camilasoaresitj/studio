
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsForm } from '@/components/settings/company-settings-form';
import { FeesRegistry } from '@/components/fees-registry';
import { DemurrageTariffRegistry } from '@/components/demurrage-tariff-registry';
import { LtiTariffRegistry } from '@/components/lti-tariff-registry';
import { IntegrationsSettings } from '@/components/settings/integrations-settings';
import { UserManagementTable } from '@/components/settings/user-management-table';
import { CertificateSettings } from '@/components/settings/certificate-settings';
import { PartnersRegistry } from '@/components/partners-registry';
import { ProfitSettings } from '@/components/profit-settings';
import { ShipRegistry } from '@/components/settings/ship-registry';
import { getFees, saveFees, type Fee } from '@/lib/fees-data';
import { getPartners, savePartners, type Partner } from '@/lib/partners-data';

export default function ConfiguracoesPage() {
    const [fees, setFees] = useState<Fee[]>(getFees);
    const [partners, setPartners] = useState<Partner[]>(getPartners);
    
    const handleFeeSave = (feeToSave: Fee) => {
        let updatedFees;
        if (feeToSave.id && feeToSave.id !== 0) {
            updatedFees = fees.map(f => f.id === feeToSave.id ? feeToSave : f);
        } else {
            const newId = Math.max(0, ...fees.map(f => f.id ?? 0)) + 1;
            updatedFees = [...fees, { ...feeToSave, id: newId }];
        }
        setFees(updatedFees);
        saveFees(updatedFees);
    };
    
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
        // Dispatch a custom event to notify other components
        window.dispatchEvent(new Event('partnersUpdated'));
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Configurações do Sistema</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Gerencie os dados e parâmetros do sistema.
                </p>
            </header>

            <Tabs defaultValue="empresa" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
                    <TabsTrigger value="empresa">Empresa</TabsTrigger>
                    <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
                    <TabsTrigger value="taxas">Taxas Padrão</TabsTrigger>
                    <TabsTrigger value="demurrage">Demurrage</TabsTrigger>
                    <TabsTrigger value="usuarios">Usuários</TabsTrigger>
                    <TabsTrigger value="integracoes">Integrações</TabsTrigger>
                    <TabsTrigger value="certificados">Certificados</TabsTrigger>
                </TabsList>
                
                <TabsContent value="empresa" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Empresa</CardTitle>
                            <CardDescription>
                                Configure as informações da sua empresa que aparecerão nos documentos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CompanySettingsForm />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="parceiros" className="mt-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Cadastro de Parceiros</CardTitle>
                            <CardDescription>
                                Gerencie seus clientes, fornecedores, agentes e comissionados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PartnersRegistry partners={partners} onPartnerSaved={handlePartnerSaved} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="taxas" className="mt-6 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Taxas e Configurações de Lucro</CardTitle>
                             <CardDescription>
                                Defina taxas padrão para cotações e a margem de lucro para o portal do cliente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FeesRegistry fees={fees} onSave={handleFeeSave} />
                            <div className="mt-8">
                                <ProfitSettings />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="demurrage" className="mt-6 space-y-6">
                    <DemurrageTariffRegistry />
                    <LtiTariffRegistry />
                </TabsContent>
                
                <TabsContent value="usuarios" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Gerenciamento de Usuários</CardTitle>
                            <CardDescription>
                                Adicione, edite e gerencie as permissões dos usuários do sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserManagementTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="integracoes" className="mt-6">
                    <IntegrationsSettings />
                </TabsContent>
                
                <TabsContent value="certificados" className="mt-6">
                    <CertificateSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
