'use client';

import { useState } from 'react';
import { CrmForm } from '@/components/crm-form';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { RateImporter } from '@/components/rate-importer';
import { RatesTable } from '@/components/rates-table';
import { CustomerQuotesList } from '@/components/customer-quotes-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';

const initialRatesData = [
  // Maersk
  { id: 1, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '2500', container: "20'GP", transitTime: '25-30 dias', validity: '31/12/2024' },
  { id: 2, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4100', container: "40'GP", transitTime: '25-30 dias', validity: '31/12/2024' },
  { id: 3, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4500', container: "40'HC", transitTime: '25-30 dias', validity: '31/12/2024' },
  // MSC
  { id: 8, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '2400', container: "20'GP", transitTime: '26-31 dias', validity: '31/05/2024' }, // Expired
  { id: 10, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '4000', container: "40'HC", transitTime: '26-31 dias', validity: '31/05/2024' }, // Expired
  // Hapag-Lloyd
  { id: 6, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '2650', container: "20'GP", transitTime: '28-32 dias', validity: '30/11/2024' },
  { id: 7, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '4300', container: "40'HC", transitTime: '28-32 dias', validity: '30/11/2024' },
  // CMA CGM
  { id: 5, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '3800', container: "40'HC", transitTime: '35-40 dias', validity: '31/12/2024' },
  { id: 11, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '2100', container: "20'GP", transitTime: '35-40 dias', validity: '31/12/2024' },
  // Air
  { id: 4, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto JFK, US', carrier: 'LATAM Cargo', modal: 'Aéreo', rate: '4.50 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '30/11/2024' },
  { id: 9, origin: 'Aeroporto de Viracopos, BR', destination: 'Aeroporto de Frankfurt, DE', carrier: 'Lufthansa Cargo', modal: 'Aéreo', rate: '3.80 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '15/12/2024' },
  { id: 12, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto de Miami, US', carrier: 'American Airlines Cargo', modal: 'Aéreo', rate: '4.20 / kg', container: 'N/A', transitTime: '1 dia', validity: '31/10/2024' },
];

export default function ComercialPage() {
  const [rates, setRates] = useState(initialRatesData);

  const handleRatesImported = (importedRates: ExtractRatesFromTextOutput) => {
    const newRates = importedRates.map((rate, index) => ({
      ...rate,
      id: rates.length + index + 1, // Simple ID generation
    }));
    setRates(prevRates => [...prevRates, ...newRates]);
  };
  
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Comercial</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas oportunidades, cotações e clientes.
        </p>
      </header>
      <Tabs defaultValue="quote" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="quote">Cotação de Frete</TabsTrigger>
          <TabsTrigger value="rates">Tabela de Tarifas</TabsTrigger>
          <TabsTrigger value="customer_quotes">Cotações</TabsTrigger>
          <TabsTrigger value="import">Importar Tarifas</TabsTrigger>
          <TabsTrigger value="crm">CRM Automático</TabsTrigger>
        </TabsList>
        <TabsContent value="quote" className="mt-6">
          <FreightQuoteForm />
        </TabsContent>
         <TabsContent value="rates" className="mt-6">
          <RatesTable rates={rates} />
        </TabsContent>
        <TabsContent value="customer_quotes" className="mt-6">
          <CustomerQuotesList />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <RateImporter onRatesImported={handleRatesImported} />
        </TabsContent>
        <TabsContent value="crm" className="mt-6">
          <CrmForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
