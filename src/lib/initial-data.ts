
import type { Rate } from '@/components/rates-table';
import type { Partner } from '@/lib/partners-data';

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  containerType?: string;
  localPagamento?: 'Origem' | 'Frete' | 'Destino';
  cost: number;
  costCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  sale: number;
  saleCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  supplier: string;
  sacado?: string;
  approvalStatus: 'aprovada' | 'pendente' | 'rejeitada';
  justification?: string;
  financialEntryId?: string | null;
};

export type QuoteDetails = {
    cargo: string;
    transitTime: string;
    validity: string;
    freeTime: string;
    incoterm: string;
    collectionAddress?: string;
    deliveryAddress?: string;
};

export type Quote = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: 'Enviada' | 'Aprovada' | 'Perdida' | 'Rascunho';
  date: string;
  details: QuoteDetails;
  charges: QuoteCharge[];
  shipper?: Partner;
  consignee?: Partner;
  agent?: Partner;
};


export function getInitialRates(): Rate[] {
  return [
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
}


export function getInitialQuotes(): Quote[] {
    const initialQuotes: Quote[] = [
      { 
        id: 'COT-01832', 
        customer: 'Nexus Imports', 
        origin: 'Santos, BR',
        destination: 'Roterdã, NL', 
        status: 'Enviada', 
        date: '15/07/2024',
        details: { cargo: '1x20GP', transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14 dias', incoterm: 'FOB' },
        charges: [
            { id: 'charge-1', name: 'FRETE MARÍTIMO', type: 'Contêiner', cost: 2500, costCurrency: 'USD', sale: 2800, saleCurrency: 'USD', supplier: 'Maersk Line', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
            { id: 'charge-2', name: 'THC', type: 'Contêiner', cost: 1350, costCurrency: 'BRL', sale: 1350, saleCurrency: 'BRL', supplier: 'Porto de Roterdã', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
            { id: 'charge-3', name: 'BL FEE', type: 'BL', cost: 500, costCurrency: 'BRL', sale: 600, saleCurrency: 'BRL', supplier: 'CargaInteligente', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
            { id: 'charge-4', name: 'DESPACHO ADUANEIRO', type: 'Processo', cost: 800, costCurrency: 'BRL', sale: 1000, saleCurrency: 'BRL', supplier: 'CargaInteligente', sacado: 'Nexus Imports', approvalStatus: 'aprovada' },
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
            { id: 'charge-5', name: 'FRETE AÉREO', type: 'KG', cost: 4.20 * 500, costCurrency: 'USD', sale: 4.50 * 500, saleCurrency: 'USD', supplier: 'American Airlines Cargo', sacado: 'TechFront Solutions', approvalStatus: 'aprovada' },
            { id: 'charge-6', name: 'HANDLING FEE', type: 'AWB', cost: 50, costCurrency: 'USD', sale: 60, saleCurrency: 'USD', supplier: 'Aeroporto MIA', sacado: 'TechFront Solutions', approvalStatus: 'aprovada' },
        ]
      },
      { id: 'COT-00123', customer: 'Global Foods Ltda', origin: 'Paranaguá, BR', destination: 'Xangai, CN', status: 'Perdida', date: '12/07/2024', details: { cargo: '1x40HC', transitTime: '35-40 dias', validity: '31/12/2024', freeTime: '7 dias', incoterm: 'CFR' }, charges: [] },
      { id: 'COT-00122', customer: 'Nexus Imports', origin: 'Itajaí, BR', destination: 'Hamburgo, DE', status: 'Rascunho', date: '11/07/2024', details: { cargo: '1x20GP', transitTime: '28-32 dias', validity: '30/11/2024', freeTime: '21 dias', incoterm: 'FOB' }, charges: [] },
      { id: 'COT-00121', customer: 'AutoParts Express', origin: 'Guarulhos, BR', destination: 'JFK, US', status: 'Enviada', date: '10/07/2024', details: { cargo: '100kg', transitTime: '1-2 dias', validity: '30/11/2024', freeTime: 'N/A', incoterm: 'CPT' }, charges: [] },
    ];
    return initialQuotes;
}

export function getStoredQuotes(): Quote[] {
    const QUOTES_STORAGE_KEY = 'freight_quotes';
    if (typeof window === 'undefined') {
        return [];
    }
    const storedQuotes = localStorage.getItem(QUOTES_STORAGE_KEY);
    if (storedQuotes) {
        return JSON.parse(storedQuotes);
    }
    const initialQuotes = getInitialQuotes();
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(initialQuotes));
    return initialQuotes;
}
