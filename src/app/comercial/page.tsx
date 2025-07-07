import { CrmForm } from '@/components/crm-form';
import { RatesTable } from '@/components/rates-table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ComercialPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Comercial</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas oportunidades, cotações e clientes.
        </p>
      </header>
      <Tabs defaultValue="crm" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="crm">CRM Automático</TabsTrigger>
          <TabsTrigger value="rates">Tarifas de Frete</TabsTrigger>
        </TabsList>
        <TabsContent value="crm" className="mt-6">
          <CrmForm />
        </TabsContent>
        <TabsContent value="rates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tabela de Tarifas</CardTitle>
              <CardDescription>
                Visualize abaixo as tarifas disponíveis para frete aéreo e marítimo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RatesTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
