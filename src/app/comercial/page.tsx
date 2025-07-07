'use client';

import { useState } from 'react';
import { CrmForm } from '@/components/crm-form';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { RateImporter } from '@/components/rate-importer';
import { RatesTable } from '@/components/rates-table';
import { CustomerQuotesList, Quote } from '@/components/customer-quotes-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';
import { PartnersRegistry, Partner } from '@/components/partners-registry';
import { FeesRegistry, Fee } from '@/components/fees-registry';

const initialRatesData = [
  // Maersk
  { id: 1, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '2500', container: "20'GP", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14 dias' },
  { id: 2, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4100', container: "40'GP", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14 dias' },
  { id: 3, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4500', container: "40'HC", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14 dias' },
  // MSC
  { id: 8, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '2400', container: "20'GP", transitTime: '26-31 dias', validity: '31/05/2024', freeTime: '10 dias' }, // Expired
  { id: 10, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '4000', container: "40'HC", transitTime: '26-31 dias', validity: '31/05/2024', freeTime: '10 dias' }, // Expired
  // Hapag-Lloyd
  { id: 6, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '2650', container: "20'GP", transitTime: '28-32 dias', validity: '30/11/2024', freeTime: '21 dias' },
  { id: 7, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '4300', container: "40'HC", transitTime: '28-32 dias', validity: '30/11/2024', freeTime: '21 dias' },
  // CMA CGM
  { id: 5, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '3800', container: "40'HC", transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '7 dias' },
  { id: 11, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '2100', container: "20'GP", transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '7 dias' },
  // Air
  { id: 4, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto JFK, US', carrier: 'LATAM Cargo', modal: 'Aéreo', rate: '4.50 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '30/11/2024', freeTime: 'N/A' },
  { id: 9, origin: 'Aeroporto de Viracopos, BR', destination: 'Aeroporto de Frankfurt, DE', carrier: 'Lufthansa Cargo', modal: 'Aéreo', rate: '3.80 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '15/12/2024', freeTime: 'N/A' },
  { id: 12, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto de Miami, US', carrier: 'American Airlines Cargo', modal: 'Aéreo', rate: '4.20 / kg', container: 'N/A', transitTime: '1 dia', validity: '31/10/2024', freeTime: 'N/A' },
  // HMM - From user example, simulating the 6013/6226/6226 pattern for 20'GP, 40'GP, 40'HC
  { id: 13, origin: 'Porto de Qingdao, CN', destination: 'Porto de Santos, BR', carrier: 'HMM', modal: 'Marítimo', rate: '6013', container: "20'GP", transitTime: '38-42 dias', validity: '31/12/2024', freeTime: '14 dias' },
  { id: 14, origin: 'Porto de Qingdao, CN', destination: 'Porto de Santos, BR', carrier: 'HMM', modal: 'Marítimo', rate: '6226', container: "40'GP", transitTime: '38-42 dias', validity: '31/12/2024', freeTime: '14 dias' },
  { id: 15, origin: 'Porto de Qingdao, CN', destination: 'Porto de Santos, BR', carrier: 'HMM', modal: 'Marítimo', rate: '6226', container: "40'HC", transitTime: '38-42 dias', validity: '31/12/2024', freeTime: '14 dias' },
  // HMM - NOR container
  { id: 16, origin: 'Porto de Shenzhen, CN', destination: 'Porto de Itajaí, BR', carrier: 'HMM', modal: 'Marítimo', rate: '5226', container: "40'NOR", transitTime: '37-41 dias', validity: '30/11/2024', freeTime: '18 dias' },
  // COSCO
  { id: 17, origin: 'Porto de Xangai, CN', destination: 'Porto de Paranaguá, BR', carrier: 'COSCO', modal: 'Marítimo', rate: '6400', container: "40'HC", transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '21 dias' },
  // ONE (Ocean Network Express)
  { id: 18, origin: 'Porto de Itapoá, BR', destination: 'Porto de Antuérpia, BE', carrier: 'ONE', modal: 'Marítimo', rate: '2750', container: "20'GP", transitTime: '22-26 dias', validity: '31/10/2024', freeTime: '21 dias' },
  { id: 19, origin: 'Porto de Itapoá, BR', destination: 'Porto de Antuérpia, BE', carrier: 'ONE', modal: 'Marítimo', rate: '4600', container: "40'HC", transitTime: '22-26 dias', validity: '31/10/2024', freeTime: '21 dias' },
];

const initialQuotesData: Quote[] = [
  { id: 'COT-00125', customer: 'Nexus Imports', destination: 'Roterdã, NL', status: 'Enviada', date: '15/07/2024', value: 'R$ 15.250,00' },
  { id: 'COT-00124', customer: 'TechFront Solutions', destination: 'Miami, US', status: 'Aprovada', date: '14/07/2024', value: 'R$ 8.900,00' },
  { id: 'COT-00123', customer: 'Global Foods Ltda', destination: 'Xangai, CN', status: 'Perdida', date: '12/07/2024', value: 'R$ 22.100,00' },
  { id: 'COT-00122', customer: 'Nexus Imports', destination: 'Hamburgo, DE', status: 'Rascunho', date: '11/07/2024', value: 'R$ 18.400,00' },
  { id: 'COT-00121', customer: 'AutoParts Express', destination: 'JFK, US', status: 'Enviada', date: '10/07/2024', value: 'R$ 5.600,00' },
];

const initialPartnersData: Partner[] = [
    { 
        id: 1, 
        name: 'Nexus Imports', 
        type: 'Cliente', 
        cnpj: '12345678000199',
        address: { street: 'Av. das Nações', number: '100', complement: 'Torre B, 5º Andar', district: 'Centro', city: 'São Paulo', state: 'SP', zip: '01234-000' },
        contacts: [
            { name: 'Ana Costa', email: 'ana.costa@nexus.com', phone: '5511987654321', department: 'Comercial' },
            { name: 'Roberto Lima', email: 'roberto.lima@nexus.com', phone: '5511987654322', department: 'Operacional' }
        ]
    },
    { 
        id: 2, 
        name: 'Maersk Line Brasil', 
        type: 'Fornecedor',
        cnpj: '98765432000100',
        address: { street: 'Rua do Porto', number: '555', complement: '', district: 'Paquetá', city: 'Santos', state: 'SP', zip: '11010-151' },
        contacts: [
            { name: 'Carlos Pereira', email: 'comercial.br@maersk.com', phone: '551332268500', department: 'Comercial' }
        ]
    },
    { 
        id: 3, 
        name: 'Global Logistics Agents', 
        type: 'Agente', 
        cnpj: '',
        address: { street: 'Ocean Drive', number: '123', complement: 'Suite 200', district: 'South Beach', city: 'Miami', state: 'FL', zip: '33139' },
        contacts: [
            { name: 'John Smith', email: 'ops@gla.com', phone: '13055551234', department: 'Operacional' }
        ]
    },
    { 
        id: 4, 
        name: 'TechFront Solutions', 
        type: 'Cliente', 
        cnpj: '11223344000155',
        address: { street: 'Rua da Inovação', number: '404', complement: '', district: 'Centro', city: 'Florianópolis', state: 'SC', zip: '88010-000' },
        contacts: [
            { name: 'Sofia Mendes', email: 'sofia@techfront.com', phone: '5548999887766', department: 'Comercial' },
            { name: 'Lucas Ferreira', email: 'financeiro@techfront.com', phone: '5548999887755', department: 'Financeiro' }
        ]
    },
];

const initialFeesData: Fee[] = [
    { id: 1, name: 'Taxa de Despacho', value: 'R$ 550,00', type: 'Fixo' },
    { id: 2, name: 'Armazenagem (por dia)', value: 'R$ 150,00', type: 'Fixo' },
    { id: 3, name: 'Seguro Internacional', value: '0.3%', type: 'Percentual' },
];

export default function ComercialPage() {
  const [rates, setRates] = useState(initialRatesData);
  const [quotes, setQuotes] = useState(initialQuotesData);
  const [partners, setPartners] = useState(initialPartnersData);
  const [fees, setFees] = useState(initialFeesData);
  const [activeTab, setActiveTab] = useState('quote');


  const handleRatesImported = (importedRates: ExtractRatesFromTextOutput) => {
    const newRates = importedRates.map((rate, index) => ({
      ...rate,
      id: rates.length + index + 1, // Simple ID generation
    }));
    setRates(prevRates => [...prevRates, ...newRates]);
  };
  
  const handleQuoteCreated = (newQuote: Quote) => {
    setQuotes(prevQuotes => [newQuote, ...prevQuotes]);
  };

  const handlePartnerAdded = (newPartner: Partner) => {
    setPartners(prevPartners => [...prevPartners, newPartner]);
  };

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Comercial</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie suas oportunidades, cotações e clientes.
        </p>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-4xl">
          <TabsTrigger value="quote">Cotação de Frete</TabsTrigger>
          <TabsTrigger value="rates">Tabela de Tarifas</TabsTrigger>
          <TabsTrigger value="customer_quotes">Cotações</TabsTrigger>
          <TabsTrigger value="import">Importar Tarifas</TabsTrigger>
          <TabsTrigger value="crm">CRM Automático</TabsTrigger>
          <TabsTrigger value="cadastros">Cadastros</TabsTrigger>
        </TabsList>
        <TabsContent value="quote" className="mt-6">
          <FreightQuoteForm 
            onQuoteCreated={handleQuoteCreated} 
            partners={partners.filter(p => p.type === 'Cliente')}
            onRegisterCustomer={() => setActiveTab('cadastros')}
          />
        </TabsContent>
         <TabsContent value="rates" className="mt-6">
          <RatesTable rates={rates} />
        </TabsContent>
        <TabsContent value="customer_quotes" className="mt-6">
          <CustomerQuotesList quotes={quotes} />
        </TabsContent>
        <TabsContent value="import" className="mt-6">
          <RateImporter onRatesImported={handleRatesImported} />
        </TabsContent>
        <TabsContent value="crm" className="mt-6">
          <CrmForm />
        </TabsContent>
        <TabsContent value="cadastros" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cadastros Gerais</CardTitle>
                    <CardDescription>Gerencie seus clientes, fornecedores, agentes e taxas padrão.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PartnersRegistry partners={partners} onPartnerAdded={handlePartnerAdded} />
                    <FeesRegistry fees={fees} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
