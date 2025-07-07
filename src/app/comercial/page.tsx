
'use client';

import { useState } from 'react';
import { CrmForm } from '@/components/crm-form';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { RateImporter } from '@/components/rate-importer';
import { RatesTable } from '@/components/rates-table';
import { CustomerQuotesList, Quote, QuoteCharge } from '@/components/customer-quotes-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';
import { PartnersRegistry, Partner } from '@/components/partners-registry';
import { FeesRegistry, Fee } from '@/components/fees-registry';
import type { Rate } from '@/components/rates-table';
import type { FreightQuoteFormData } from '@/lib/schemas';

const initialRatesData: Rate[] = [
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
  { 
    id: 'COT-00125', customer: 'Nexus Imports', destination: 'Roterdã, NL', status: 'Enviada', date: '15/07/2024', 
    charges: [
        { id: 'charge-1', name: 'Frete Marítimo', type: 'Por Contêiner', cost: 2500, costCurrency: 'USD', sale: 2800, saleCurrency: 'USD', supplier: 'Maersk Line' },
        { id: 'charge-2', name: 'THC', type: 'Por Contêiner', cost: 1350, costCurrency: 'BRL', sale: 1350, saleCurrency: 'BRL', supplier: 'Porto de Roterdã' },
        { id: 'charge-3', name: 'BL Fee', type: 'Por BL', cost: 500, costCurrency: 'BRL', sale: 600, saleCurrency: 'BRL', supplier: 'CargaInteligente' },
        { id: 'charge-4', name: 'Despacho Aduaneiro', type: 'Por Processo', cost: 800, costCurrency: 'BRL', sale: 1000, saleCurrency: 'BRL', supplier: 'CargaInteligente' },
    ]
  },
  { 
    id: 'COT-00124', customer: 'TechFront Solutions', destination: 'Miami, US', status: 'Aprovada', date: '14/07/2024',
    charges: [
        { id: 'charge-5', name: 'Frete Aéreo', type: 'Por KG', cost: 4.20 * 500, costCurrency: 'USD', sale: 4.50 * 500, saleCurrency: 'USD', supplier: 'American Airlines Cargo' },
        { id: 'charge-6', name: 'Handling Fee', type: 'Por AWB', cost: 50, costCurrency: 'USD', sale: 60, saleCurrency: 'USD', supplier: 'Aeroporto MIA' },
    ]
  },
  { id: 'COT-00123', customer: 'Global Foods Ltda', destination: 'Xangai, CN', status: 'Perdida', date: '12/07/2024', charges: [] },
  { id: 'COT-00122', customer: 'Nexus Imports', destination: 'Hamburgo, DE', status: 'Rascunho', date: '11/07/2024', charges: [] },
  { id: 'COT-00121', customer: 'AutoParts Express', destination: 'JFK, US', status: 'Enviada', date: '10/07/2024', charges: [] },
];

const initialPartnersData: Partner[] = [
    { 
        id: 1, 
        name: 'Nexus Imports', 
        type: 'Cliente', 
        cnpj: '12345678000199',
        paymentTerm: 30,
        exchangeRateAgio: 2.0,
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
        paymentTerm: 15,
        exchangeRateAgio: 0,
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
        paymentTerm: 45,
        exchangeRateAgio: 0,
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
        paymentTerm: 21,
        exchangeRateAgio: 2.5,
        address: { street: 'Rua da Inovação', number: '404', complement: '', district: 'Centro', city: 'Florianópolis', state: 'SC', zip: '88010-000' },
        contacts: [
            { name: 'Sofia Mendes', email: 'sofia@techfront.com', phone: '5548999887766', department: 'Comercial' },
            { name: 'Lucas Ferreira', email: 'financeiro@techfront.com', phone: '5548999887755', department: 'Financeiro' },
            { name: 'Carla Dias', email: 'impo@techfront.com', phone: '5548999887744', department: 'Importação' },
        ]
    },
];

const initialFeesData: Fee[] = [
    // Importação Marítima FCL
    { id: 1, name: 'THC', value: '1350', currency: 'BRL', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 2, name: 'BL Fee', value: '600', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 3, name: 'ISPS', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 4, name: 'Desconsolidação', value: '150', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 20, name: 'IMPORT FEE (DEV CTNR)', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    { id: 21, name: 'LOGISTIC FEE', value: '55', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    { id: 22, name: 'TRS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    
    // Importação Marítima LCL
    { id: 5, name: 'THC', value: '50', currency: 'BRL', type: 'Por CBM/Ton', unit: 'W/M', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL', minValue: 50 },
    { id: 6, name: 'Desova', value: '50', currency: 'BRL', type: 'Por CBM/Ton', unit: 'W/M', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL', minValue: 50 },
    { id: 7, name: 'BL Fee', value: '200', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL' },
    { id: 23, name: 'Desconsolidação', value: '100', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},
    { id: 24, name: 'TRS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},
    { id: 25, name: 'ISPS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},

    // Exportação Marítima FCL
    { id: 8, name: 'THC', value: '1350', currency: 'BRL', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 9, name: 'BL Fee', value: '600', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 10, name: 'Lacre', value: '20', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 11, name: 'VGM', value: '20', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 26, name: 'ISPS', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    
    // Importação Aérea
    { id: 12, name: 'Desconsolidação', value: '80', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Importação' },
    { id: 13, name: 'Collect Fee', value: '3', currency: 'USD', type: 'Percentual', unit: 'Sobre o Frete', modal: 'Aéreo', direction: 'Importação', minValue: 15 },
    { id: 27, name: 'DELIVERY', value: '45', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Importação' },

    // Exportação Aérea
    { id: 28, name: 'AWB FEE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },
    { id: 29, name: 'HANDLING FEE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },
    { id: 30, name: 'ARMAZENAGEM', value: '0.07', currency: 'USD', type: 'Por KG', unit: '/KG', modal: 'Aéreo', direction: 'Exportação', minValue: 10},
    { id: 31, name: 'CUSTOMS CLEARANCE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },

    // Serviços Opcionais
    { id: 14, name: 'Despacho Aduaneiro', value: '1000', currency: 'BRL', type: 'Opcional', unit: 'Por Processo', modal: 'Ambos', direction: 'Ambos' },
    { id: 15, name: 'Seguro Internacional', value: '0.3', currency: 'BRL', type: 'Opcional', unit: 'Sobre Valor Carga', modal: 'Ambos', direction: 'Ambos' },
];


export default function ComercialPage() {
  const [rates, setRates] = useState<Rate[]>(initialRatesData);
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotesData);
  const [partners, setPartners] = useState(initialPartnersData);
  const [fees, setFees] = useState(initialFeesData);
  const [activeTab, setActiveTab] = useState('quote');
  const [quoteFormData, setQuoteFormData] = useState<Partial<FreightQuoteFormData> | null>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<Quote | null>(null);

  const handleRatesImported = (importedRates: ExtractRatesFromTextOutput) => {
    const newRates = importedRates.map((rate, index) => ({
      ...rate,
      id: rates.length + index + 1, // Simple ID generation
    }));
    setRates(prevRates => [...prevRates, ...newRates]);
  };

  const handleRatesChange = (updatedRates: Rate[]) => {
    setRates(updatedRates);
  };
  
  const handleQuoteCreated = (newQuoteData: Omit<Quote, 'id' | 'status' | 'date'>) => {
    const newQuote: Quote = {
        ...newQuoteData,
        id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}`,
        status: 'Enviada',
        date: new Date().toLocaleDateString('pt-BR'),
    };
    setQuotes(prevQuotes => [newQuote, ...prevQuotes]);
    setQuoteToEdit(null);
  };

  const handlePartnerAdded = (newPartner: Partner) => {
    const newPartnerWithId = { ...newPartner, id: partners.length + 1 };
    setPartners(prevPartners => [...prevPartners, newPartnerWithId]);
  };
  
  const handleFeeSaved = (feeToSave: Fee) => {
      setFees(prevFees => {
          const index = prevFees.findIndex(f => f.id === feeToSave.id);
          if (index > -1) {
              const newFees = [...prevFees];
              newFees[index] = feeToSave;
              return newFees;
          } else {
              return [...prevFees, { ...feeToSave, id: prevFees.length + 1 }];
          }
      });
  };

  const startQuoteFromRate = (rate: any, containerType?: string) => {
    const isGroup = !!rate.rates;

    const formData: Partial<FreightQuoteFormData> = {
      origin: rate.origin,
      destination: rate.destination,
      modal: rate.modal === 'Marítimo' ? 'ocean' : 'air',
      oceanShipmentType: 'FCL',
    };
    
    if (isGroup && containerType) {
        formData.oceanShipment = {
            containers: [{ type: containerType, quantity: 1, weight: undefined }],
        };
    } else if (!isGroup) {
        if(rate.modal === 'Marítimo') {
            formData.oceanShipment = {
                containers: rate.container ? [{ type: rate.container, quantity: 1, weight: undefined }] : [],
            };
        }
    } else {
        formData.oceanShipment = {
            containers: [],
        }
    }
    setQuoteFormData(formData);
    setActiveTab('quote');
  }
  
  const handleQuoteUpdated = (updatedQuote: Quote) => {
    setQuotes(prevQuotes => prevQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    if (quoteToEdit && quoteToEdit.id === updatedQuote.id) {
        setQuoteToEdit(updatedQuote);
    }
  };

  const handleStartManualQuote = (formData: FreightQuoteFormData, charges: QuoteCharge[] = []) => {
    const customer = partners.find(p => p.id.toString() === formData.customerId);
    if (!customer) return;

    const newQuote: Quote = {
        id: `COT-${String(Math.floor(Math.random() * 90000) + 10000)}-DRAFT`,
        customer: customer.name,
        destination: formData.destination,
        status: 'Rascunho',
        date: new Date().toLocaleDateString('pt-BR'),
        charges: charges,
    };
    setQuotes(prevQuotes => [newQuote, ...prevQuotes]);
    setQuoteToEdit(newQuote);
    setActiveTab('customer_quotes');
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
        <TabsList className="grid w-full grid-cols-5 max-w-4xl">
          <TabsTrigger value="quote">Cotação de Frete</TabsTrigger>
          <TabsTrigger value="customer_quotes">Cotações</TabsTrigger>
          <TabsTrigger value="rates">Gestão de Tarifas</TabsTrigger>
          <TabsTrigger value="crm">CRM Automático</TabsTrigger>
          <TabsTrigger value="partners">Parceiros</TabsTrigger>
        </TabsList>
        <TabsContent value="quote" className="mt-6">
          <FreightQuoteForm 
            key={JSON.stringify(quoteFormData)}
            initialData={quoteFormData}
            onQuoteCreated={handleQuoteCreated} 
            partners={partners.filter(p => p.type === 'Cliente')}
            onRegisterCustomer={() => setActiveTab('partners')}
            rates={rates}
            fees={fees}
            onStartManualQuote={handleStartManualQuote}
            onQuoteUpdate={handleQuoteUpdated}
          />
        </TabsContent>
        <TabsContent value="customer_quotes" className="mt-6">
          <CustomerQuotesList
            quotes={quotes}
            onQuoteUpdate={handleQuoteUpdated}
            quoteToOpen={quoteToEdit}
            onDialogClose={() => setQuoteToEdit(null)}
          />
        </TabsContent>
         <TabsContent value="rates" className="mt-6">
            <div className="space-y-8">
              <RateImporter onRatesImported={handleRatesImported} />
              <RatesTable 
                rates={rates} 
                onSelectRate={startQuoteFromRate} 
                onRatesChange={handleRatesChange}
              />
              <Card>
                  <CardHeader>
                      <CardTitle>Cadastro de Taxas Padrão</CardTitle>
                      <CardDescription>Gerencie as taxas padrão para cotações de importação e exportação.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FeesRegistry fees={fees} onSave={handleFeeSaved} />
                  </CardContent>
              </Card>
            </div>
        </TabsContent>
        <TabsContent value="crm" className="mt-6">
          <CrmForm />
        </TabsContent>
        <TabsContent value="partners" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cadastro de Parceiros</CardTitle>
                    <CardDescription>Gerencie seus clientes, fornecedores e agentes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PartnersRegistry partners={partners} onPartnerAdded={handlePartnerAdded} />
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
