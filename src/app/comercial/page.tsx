import { CrmForm } from '@/components/crm-form';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { RateImporter } from '@/components/rate-importer';
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
      <Tabs defaultValue="quote" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="quote">Cotação de Frete</TabsTrigger>
          <TabsTrigger value="import">Importar Tarifas</TabsTrigger>
          <TabsTrigger value="crm">CRM Automático</TabsTrigger>
        </TabsList>
        <TabsContent value="quote" className="mt-6">
          <FreightQuoteForm />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <RateImporter />
        </TabsContent>
        <TabsContent value="crm" className="mt-6">
          <CrmForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
