
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { CompanySettingsForm } from "@/components/settings/company-settings-form";
import { UserManagementTable } from "@/components/settings/user-management-table";
import { CertificateSettings } from "@/components/settings/certificate-settings";

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie os dados da sua empresa, usuários e integrações.
        </p>
      </header>
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="company">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="users">Usuários e Permissões</TabsTrigger>
          <TabsTrigger value="certificate">Certificado Digital</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações utilizadas na emissão de documentos e notas fiscais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanySettingsForm />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
                <CardTitle>Gerenciar Usuários e Permissões</CardTitle>
                <CardDescription>
                    Adicione novos usuários e defina seus níveis de acesso no sistema.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <UserManagementTable />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="certificate" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Configuração do Certificado Digital</CardTitle>
                    <CardDescription>
                        Faça o upload do seu certificado A1 para emissão de notas fiscais eletrônicas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CertificateSettings />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
