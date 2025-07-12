
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
import { PartnersRegistry } from '@/components/partners-registry';
import { type Partner, getPartners, savePartners } from '@/lib/partners-data';
import { FeesRegistry, Fee } from '@/components/fees-registry';
import type { Rate } from '@/components/rates-table';
import type { FreightQuoteFormData } from '@/lib/schemas';
import { SendQuoteOutput } from '@/ai/flows/send-quote';
import { useToast } from '@/hooks/use-toast';
import { runSyncDFAgents } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Globe, Loader2 } from 'lucide-react';
import type { DFAgent } from '@/ai/flows/sync-df-alliance-agents';


const initialRatesData: Rate[] = [
  // Maersk
  { id: 1, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '2500', container: "20'GP", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14', agent: 'Direct' },
  { id: 2, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4100', container: "40'GP", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14', agent: 'Direct' },
  { id: 3, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'Maersk Line', modal: 'Marítimo', rate: '4500', container: "40'HC", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14', agent: 'Direct' },
  // MSC
  { id: 8, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '2400', container: "20'GP", transitTime: '26-31 dias', validity: '31/05/2024', freeTime: '10', agent: 'Direct' }, // Expired
  { id: 10, origin: 'Porto de Santos, BR', destination: 'Porto de Roterdã, NL', carrier: 'MSC', modal: 'Marítimo', rate: '4000', container: "40'HC", transitTime: '26-31 dias', validity: '31/05/2024', freeTime: '10', agent: 'Direct' }, // Expired
  // Hapag-Lloyd
  { id: 6, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '2650', container: "20'GP", transitTime: '28-32 dias', validity: '30/11/2024', freeTime: '21', agent: 'Global Logistics Agents' },
  { id: 7, origin: 'Porto de Itajaí, BR', destination: 'Porto de Hamburgo, DE', carrier: 'Hapag-Lloyd', modal: 'Marítimo', rate: '4300', container: "40'HC", transitTime: '28-32 dias', validity: '30/11/2024', freeTime: '21', agent: 'Global Logistics Agents' },
  // CMA CGM
  { id: 5, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '3800', container: "40'HC", transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '7', agent: 'Direct' },
  { id: 11, origin: 'Porto de Paranaguá, BR', destination: 'Porto de Xangai, CN', carrier: 'CMA CGM', modal: 'Marítimo', rate: '2100', container: "20'GP", transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '7', agent: 'Direct' },
  // Air
  { id: 4, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto JFK, US', carrier: 'LATAM Cargo', modal: 'Aéreo', rate: '4.50 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '30/11/2024', freeTime: 'N/A', agent: 'Direct' },
  { id: 9, origin: 'Aeroporto de Viracopos, BR', destination: 'Aeroporto de Frankfurt, DE', carrier: 'Lufthansa Cargo', modal: 'Aéreo', rate: '3.80 / kg', container: 'N/A', transitTime: '1-2 dias', validity: '15/12/2024', freeTime: 'N/A', agent: 'Global Logistics Agents' },
  { id: 12, origin: 'Aeroporto de Guarulhos, BR', destination: 'Aeroporto de Miami, US', carrier: 'American Airlines Cargo', modal: 'Aéreo', rate: '4.20 / kg', container: 'N/A', transitTime: '1 dia', validity: '31/10/2024', freeTime: 'N/A', agent: 'Direct' },
  // HMM - From user example, simulating the 6013/6226/6226 pattern for 20'GP, 40'GP, 40'HC
  { id: 13, origin: 'Porto de Qingdao, CN', destination: 'Porto de Santos, BR', carrier: 'HMM', modal: 'Marítimo', rate: '6013', container: "20'GP", transitTime: '38-42 dias', validity: '31/12/2024', freeTime: '14', agent: 'Global Logistics Agents' },
  { id: 14, origin: 'Porto de Qingdao, CN', destination: 'Porto de Santos, BR', carrier: 'HMM', modal: 'Marítimo', rate: '6226', container: "40'GP", transitTime: '38-42 dias', validity: '31/12/2024', freeTime: '14', agent: 'Global Logistics Agents' },
  { id: 15, origin: 'Porto de Qingdao, CN', destination: 'Porto de Santos, BR', carrier: 'HMM', modal: 'Marítimo', rate: '6226', container: "40'HC", transitTime: '38-42 dias', validity: '31/12/2024', freeTime: '14', agent: 'Global Logistics Agents' },
  // HMM - NOR container
  { id: 16, origin: 'Porto de Shenzhen, CN', destination: 'Porto de Itajaí, BR', carrier: 'HMM', modal: 'Marítimo', rate: '5226', container: "40'NOR", transitTime: '37-41 dias', validity: '30/11/2024', freeTime: '18', agent: 'Global Logistics Agents' },
  // COSCO
  { id: 17, origin: 'Porto de Xangai, CN', destination: 'Porto de Paranaguá, BR', carrier: 'COSCO', modal: 'Marítimo', rate: '6400', container: "40'HC", transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '21', agent: 'Direct' },
  // ONE (Ocean Network Express)
  { id: 18, origin: 'Porto de Itapoá, BR', destination: 'Porto de Antuérpia, BE', carrier: 'ONE', modal: 'Marítimo', rate: '2750', container: "20'GP", transitTime: '22-26 dias', validity: '31/10/2024', freeTime: '21', agent: 'Direct' },
  { id: 19, origin: 'Porto de Itapoá, BR', destination: 'Porto de Antuérpia, BE', carrier: 'ONE', modal: 'Marítimo', rate: '4600', container: "40'HC", transitTime: '22-26 dias', validity: '31/10/2024', freeTime: '21', agent: 'Direct' },
];

const initialQuotesData: Quote[] = [
  { 
    id: 'COT-00125', 
    customer: 'Nexus Imports', 
    origin: 'Santos, BR',
    destination: 'Roterdã, NL', 
    status: 'Enviada', 
    date: '15/07/2024',
    details: { cargo: '1x20GP', transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14 dias', incoterm: 'FOB' },
    charges: [
        { id: 'charge-1', name: 'FRETE MARÍTIMO', type: 'Por Contêiner', cost: 2500, costCurrency: 'USD', sale: 2800, saleCurrency: 'USD', supplier: 'Maersk Line', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
        { id: 'charge-2', name: 'THC', type: 'Por Contêiner', cost: 1350, costCurrency: 'BRL', sale: 1350, saleCurrency: 'BRL', supplier: 'Porto de Roterdã', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
        { id: 'charge-3', name: 'BL FEE', type: 'Por BL', cost: 500, costCurrency: 'BRL', sale: 600, saleCurrency: 'BRL', supplier: 'CargaInteligente', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
        { id: 'charge-4', name: 'DESPACHO ADUANEIRO', type: 'Por Processo', cost: 800, costCurrency: 'BRL', sale: 1000, saleCurrency: 'BRL', supplier: 'CargaInteligente', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
    ]
  },
  { 
    id: 'COT-00124', 
    customer: 'TechFront Solutions', 
    origin: 'Guarulhos, BR',
    destination: 'Miami, US', 
    status: 'Aprovada', 
    date: '14/07/2024', 
    details: { cargo: '500kg', transitTime: '1 dia', validity: '31/10/2024', freeTime: 'N/A', incoterm: 'FCA' },
    charges: [
        { id: 'charge-5', name: 'FRETE AÉREO', type: 'Por KG', cost: 4.20 * 500, costCurrency: 'USD', sale: 4.50 * 500, saleCurrency: 'USD', supplier: 'American Airlines Cargo', sacado: 'TechFront Solutions', approvalStatus: 'aprovada' },
        { id: 'charge-6', name: 'HANDLING FEE', type: 'Por AWB', cost: 50, costCurrency: 'USD', sale: 60, saleCurrency: 'USD', supplier: 'Aeroporto MIA', sacado: 'TechFront Solutions', approvalStatus: 'aprovada' },
    ]
  },
  { id: 'COT-00123', customer: 'Global Foods Ltda', origin: 'Paranaguá, BR', destination: 'Xangai, CN', status: 'Perdida', date: '12/07/2024', details: { cargo: '1x40HC', transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '7 dias', incoterm: 'CFR' }, charges: [] },
  { id: 'COT-00122', customer: 'Nexus Imports', origin: 'Itajaí, BR', destination: 'Hamburgo, DE', status: 'Rascunho', date: '11/07/2024', details: { cargo: '1x20GP', transitTime: '28-32 dias', validity: '30/11/2024', freeTime: '21 dias', incoterm: 'FOB' }, charges: [] },
  { id: 'COT-00121', customer: 'AutoParts Express', origin: 'Guarulhos, BR', destination: 'JFK, US', status: 'Enviada', date: '10/07/2024', details: { cargo: '100kg', transitTime: '1-2 dias', validity: '30/11/2024', freeTime: 'N/A', incoterm: 'CPT' }, charges: [] },
];

const initialFeesData: Fee[] = [
    // Importação Marítima FCL
    { id: 1, name: 'THC', value: '1350', currency: 'BRL', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 2, name: 'BL FEE', value: '600', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 3, name: 'ISPS', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 4, name: 'DESCONSOLIDAÇÃO', value: '150', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 20, name: 'IMPORT FEE (DEV CTNR)', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    { id: 21, name: 'LOGISTIC FEE', value: '55', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    { id: 22, name: 'TRS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    
    // Importação Marítima LCL
    { id: 5, name: 'THC', value: '50', currency: 'BRL', type: 'Por CBM/Ton', unit: 'W/M', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL', minValue: 50 },
    { id: 6, name: 'DESOVA', value: '50', currency: 'BRL', type: 'Por CBM/Ton', unit: 'W/M', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL', minValue: 50 },
    { id: 7, name: 'BL FEE', value: '200', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL' },
    { id: 23, name: 'DESCONSOLIDAÇÃO', value: '100', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},
    { id: 24, name: 'TRS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},
    { id: 25, name: 'ISPS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},

    // Exportação Marítima FCL
    { id: 8, name: 'THC', value: '1350', currency: 'BRL', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 9, name: 'BL FEE', value: '600', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 10, name: 'LACRE', value: '20', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 11, name: 'VGM', value: '20', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 26, name: 'ISPS', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    
    // Importação Aérea
    { id: 12, name: 'DESCONSOLIDAÇÃO', value: '80', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Importação' },
    { id: 13, name: 'COLLECT FEE', value: '3', currency: 'USD', type: 'Percentual', unit: 'Sobre o Frete', modal: 'Aéreo', direction: 'Importação', minValue: 15 },
    { id: 27, name: 'DELIVERY', value: '45', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Importação' },

    // Exportação Aérea
    { id: 28, name: 'AWB FEE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },
    { id: 29, name: 'HANDLING FEE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },
    { id: 30, name: 'ARMAZENAGEM', value: '0.07', currency: 'USD', type: 'Por KG', unit: '/KG', modal: 'Aéreo', direction: 'Exportação', minValue: 10},
    { id: 31, name: 'CUSTOMS CLEARANCE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },

    // Serviços Opcionais
    { id: 14, name: 'DESPACHO ADUANEIRO', value: '1000', currency: 'BRL', type: 'Opcional', unit: 'Por Processo', modal: 'Ambos', direction: 'Ambos' },
    { id: 15, name: 'SEGURO INTERNACIONAL', value: '0.3', currency: 'BRL', type: 'Opcional', unit: 'Sobre Valor Carga', modal: 'Ambos', direction: 'Ambos' },
    { id: 32, name: 'REDESTINAÇÃO DE CARGA', value: '1200', currency: 'BRL', type: 'Opcional', unit: 'Por Processo', modal: 'Marítimo', direction: 'Importação' },
];


export default function ComercialPage() {
  const [rates, setRates] = useState<Rate[]>(initialRatesData);
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotesData);
  const [partners, setPartners] = useState<Partner[]>(getPartners);
  const [fees, setFees] = useState(initialFeesData);
  const [activeTab, setActiveTab] = useState('quote');
  const [quoteFormData, setQuoteFormData] = useState<Partial<FreightQuoteFormData> | null>(null);
  const { toast } = useToast();

  const handlePartnerSaved = (partnerToSave: Partner) => {
    let updatedPartners;
    if (partnerToSave.id && partnerToSave.id !== 0) {
      // It's an update
      updatedPartners = partners.map(p => p.id === partnerToSave.id ? partnerToSave : p);
    } else {
      // It's a new partner
      const newId = Math.max(0, ...partners.map(p => p.id ?? 0)) + 1;
      updatedPartners = [...partners, { ...partnerToSave, id: newId }];
    }
    setPartners(updatedPartners);
    savePartners(updatedPartners);
  };

  const handleRatesImported = (importedRates: ExtractRatesFromTextOutput) => {
    const existingPartnerNames = new Set(partners.map(p => p.name.toLowerCase()));
    const newAgents: Partner[] = [];

    importedRates.forEach(rate => {
      if (rate.agent && rate.agent !== 'Direct' && rate.agent !== 'N/A' && rate.agent.trim() !== '') {
        const agentName = rate.agent.trim();
        if (!existingPartnerNames.has(agentName.toLowerCase())) {
          const newAgent: Partner = {
            id: 0,
            name: agentName,
            nomeFantasia: agentName,
            roles: { agente: true, cliente: false, fornecedor: false, comissionado: false },
            profitAgreement: { amount: 50, unit: 'por_container' },
            paymentTerm: 30,
            exchangeRateAgio: 0,
            address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
            contacts: [{ name: 'Contato Principal', email: 'tbc@tbc.com', phone: '000000000', departments: ['Comercial', 'Operacional'] }],
          };
          newAgents.push(newAgent);
          existingPartnerNames.add(agentName.toLowerCase());
        }
      }
    });

    if (newAgents.length > 0) {
      const currentPartners = getPartners();
      let currentMaxId = Math.max(0, ...currentPartners.map(p => p.id ?? 0));
      const agentsWithIds = newAgents.map(agent => ({
        ...agent,
        id: ++currentMaxId,
      }));
      const updatedPartners = [...currentPartners, ...agentsWithIds];
      setPartners(updatedPartners);
      savePartners(updatedPartners);
      toast({
        title: "Novos Agentes Cadastrados",
        description: `${newAgents.length} agente(s) foram adicionados automaticamente ao seu cadastro.`,
        className: 'bg-success text-success-foreground'
      });
    }

    setRates(prevRates => {
        let currentMaxId = Math.max(0, ...prevRates.map(r => r.id));
        const newRates = importedRates.map((rate) => ({
          ...rate,
          id: ++currentMaxId,
          transitTime: (rate.transitTime && rate.transitTime !== 'N/A') ? `${rate.transitTime} dias` : 'N/A',
        }));
        return [...prevRates, ...newRates];
    });
  };


  const handleRatesChange = (updatedRates: Rate[]) => {
    setRates(updatedRates);
  };
  
  const handleQuoteCreated = (newQuoteData: Quote) => {
    setQuotes(prevQuotes => {
        const existingIndex = prevQuotes.findIndex(q => q.id === newQuoteData.id);
        if (existingIndex > -1) {
            const updatedQuotes = [...prevQuotes];
            updatedQuotes[existingIndex] = newQuoteData;
            return updatedQuotes;
        }
        return [newQuoteData, ...prevQuotes];
    });
    toast({
        title: "Rascunho da Cotação Criado",
        description: "Ajuste os valores na aba 'Cotação de Frete' e envie para o cliente.",
    });
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
            containers: [{ type: containerType, quantity: 1, weight: undefined, length: undefined, width: undefined, height: undefined }],
        };
    } else if (!isGroup) {
        if(rate.modal === 'Marítimo') {
            formData.oceanShipment = {
                containers: rate.container ? [{ type: rate.container, quantity: 1, weight: undefined, length: undefined, width: undefined, height: undefined }] : [],
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
            partners={partners}
            onRegisterCustomer={() => setActiveTab('partners')}
            rates={rates}
            fees={fees}
            onQuoteUpdate={handleQuoteUpdated}
          />
        </TabsContent>
        <TabsContent value="customer_quotes" className="mt-6">
          <CustomerQuotesList
            quotes={quotes}
            partners={partners}
            onQuoteUpdate={handleQuoteUpdated}
            onPartnerSaved={handlePartnerSaved}
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
      </Tabs>
    </div>
  );
}
