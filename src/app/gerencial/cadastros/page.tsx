
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanySettingsForm } from '@/components/settings/company-settings-form';
import { FeesRegistry } from '@/components/fees-registry';
import { DemurrageTariffRegistry } from '@/components/demurrage-tariff-registry';
import { LtiTariffRegistry } from '@/components/lti-tariff-registry';
import { IntegrationsSettings } from '@/components/settings/integrations-settings';
import { CertificateSettings } from '@/components/settings/certificate-settings';
import { PartnersRegistry } from '@/components/partners-registry';
import { ProfitSettings } from '@/components/profit-settings';
import { ShipRegistry } from '@/components/settings/ship-registry';
import { getStoredFees, saveFees, type Fee } from '@/lib/fees-data';
import { getStoredPartners, type Partner, savePartners } from '@/lib/partners-data-client';
import { UserManagementTable } from '@/components/settings/user-management-table';
import { TaskAutomationRegistry } from '@/components/task-automation-registry';
import { savePartnerAction } from '@/app/actions';

export default function CadastrosPage() {
    const [fees, setFees] = useState<Fee[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    
    useEffect(() => {
        setFees(getStoredFees());
        setPartners(getStoredPartners());
    }, []);

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
    
    const handlePartnerSaved = async (partnerToSave: Partner) => {
        const response = await savePartnerAction(partnerToSave);
        if (response.success && response.data) {
            setPartners(response.data);
            savePartners(response.data); // Update localStorage
            window.dispatchEvent(new Event('partnersUpdated'));
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Cadastros e Configurações</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Gerencie os dados mestres e os parâmetros do sistema.
                </p>
            </header>

            <Tabs defaultValue="parceiros" className="w-full">
                <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
                    <TabsTrigger value="parceiros">Parceiros</TabsTrigger>
                    <TabsTrigger value="taxas">Taxas Padrão</TabsTrigger>
                    <TabsTrigger value="demurrage">Demurrage</TabsTrigger>
                    <TabsTrigger value="navios">Navios</TabsTrigger>
                    <TabsTrigger value="automacao">Automação</TabsTrigger>
                    <TabsTrigger value="empresa">Empresa</TabsTrigger>
                    <TabsTrigger value="integracoes">Integrações</TabsTrigger>
                    <TabsTrigger value="certificados">Certificados</TabsTrigger>
                </TabsList>
                
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
                
                 <TabsContent value="navios" className="mt-6">
                    <ShipRegistry />
                </TabsContent>

                <TabsContent value="automacao" className="mt-6">
                    <TaskAutomationRegistry />
                </TabsContent>

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
