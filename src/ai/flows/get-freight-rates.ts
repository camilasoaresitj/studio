
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { findPortByTerm } from '@/lib/ports';
import type { Port } from '@/lib/ports';
import axios from 'axios';
import { format, addDays } from 'date-fns';

export type GetFreightRatesInput = FreightQuoteFormData;

const FreightRateSchema = z.object({
    id: z.string(), 
    carrier: z.string(),
    origin: z.string(),
    destination: z.string(),
    transitTime: z.string(),
    cost: z.string(),
    costValue: z.number(),
    carrierLogo: z.string(),
    dataAiHint: z.string(),
    source: z.string(),
    flightDetails: z.string().optional(),
});

const GetFreightRatesOutputSchema = z.array(FreightRateSchema);
export type GetFreightRatesOutput = z.infer<typeof GetFreightRatesOutputSchema>;

// Mapeamento de UNLOCODE para os dados da CargoFive API v2
const PORT_UNLOCODES: Record<string, { unlocode: string; country: string }> = {
  CNSHA: { unlocode: 'CNSHA', country: 'CN' },  // Shanghai
  BRSSZ: { unlocode: 'BRSSZ', country: 'BR' },   // Santos
  USNYC: { unlocode: 'USNYC', country: 'US' },   // New York
  NLRTM: { unlocode: 'NLRTM', country: 'NL' },  // Rotterdam
  DEHAM: { unlocode: 'DEHAM', country: 'DE' },   // Hamburg
  BEANR: { unlocode: 'BEANR', country: 'BE' },  // Antwerp
  BRITJ: { unlocode: 'BRITJ', country: 'BR' },   // Itajai
  BRPNG: { unlocode: 'BRPNG', country: 'BR' },  // Paranagua
  BRIOA: { unlocode: 'BRIOA', country: 'BR' },  // Itapoa
};


// Mapeamento de tipos de container para o formato da CargoFive v2
const CONTAINER_TYPE_MAPPING_V2: Record<string, string> = {
  "20'GP": "20GP",
  "40'GP": "40GP",
  "40'HC": "40HC",
  "20'RF": "20RF",
  "40'RF": "40HRF",
  "40'NOR": "40NOR",
};

const cargoFiveRateTool = ai.defineTool(
  {
    name: 'createCargoFiveQuote',
    description: 'Creates a quote on the CargoFive v2 API using a POST request.',
    inputSchema: z.object({
        payload: z.any(),
    }),
    outputSchema: z.any() 
  },
  async ({ payload }) => {
    const apiKey = process.env.CARGOFIVE_API_KEY || 'a256c19a3c3d85da2e35846de3205954';
    const API_URL = 'https://api.cargofive.com/v2/rates';
    
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }
    
    try {
      console.log('Enviando para CargoFive v2 (POST) com payload:', JSON.stringify(payload, null, 2));
      
      const response = await axios.post(API_URL, payload, {
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('Resposta da CargoFive v2:', JSON.stringify(response.data, null, 2));
      return response.data;

    } catch (error: any) {
      const errorDetails = {
        url: API_URL,
        payload,
        status: error.response?.status,
        errorData: error.response?.data,
        message: error.message
      };
      
      console.error('Erro na API CargoFive v2:', errorDetails);
      
      let errorMessage = 'Erro ao consultar tarifas';
      if (error.response?.data) {
          errorMessage = error.response.data.message || JSON.stringify(error.response.data);
      } else {
          errorMessage = error.message;
      }
      
      if (axios.isCancel(error) || error.code === 'ECONNABORTED') {
        errorMessage = 'A consulta à API excedeu o tempo limite. Tente novamente.';
      }

      throw new Error(errorMessage);
    }
  }
);

const getFreightRatesFlow = ai.defineFlow(
  {
    name: 'getFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
    tools: [cargoFiveRateTool]
  },
  async (input) => {
    try {
      const originPort = findPortByTerm(input.origin);
      const destinationPort = findPortByTerm(input.destination);

      const originData = PORT_UNLOCODES[originPort?.unlocode.toUpperCase() || ''];
      const destinationData = PORT_UNLOCODES[destinationPort?.unlocode.toUpperCase() || ''];
      
      if (!originData || !destinationData) {
        throw new Error(`Mapeamento de UNLOCODE não encontrado para a rota: ${input.origin} -> ${input.destination}.`);
      }
      
      if (input.oceanShipmentType !== 'FCL' || !input.oceanShipment.containers.length) {
          return [];
      }
      
      // Use the first container type for the 'options' field as per the user's example
      const primaryContainerType = CONTAINER_TYPE_MAPPING_V2[input.oceanShipment.containers[0].type] || '20GP';

      const payload = {
        origin: { unlocode: originData.unlocode, country: originData.country, type: 'port' as const },
        destination: { unlocode: destinationData.unlocode, country: destinationData.country, type: 'port' as const },
        options: {
            incoterm: input.incoterm,
            container_type: primaryContainerType
        },
        containers: input.oceanShipment.containers.map(c => ({
            type: CONTAINER_TYPE_MAPPING_V2[c.type] || '20GP',
            quantity: c.quantity
        })),
      };

      const response = await cargoFiveRateTool({ payload });
      
      const rates = response?.rates;
      if (!rates || rates.length === 0) {
        return [];
      }

      return rates.map((rate: any, index: number) => ({
        id: rate.rate_id || `rate-${index}`,
        carrier: rate.carrier?.name || 'N/A',
        origin: rate.origin?.name || 'N/A',
        destination: rate.destination?.name || 'N/A',
        transitTime: `${rate.transit_time || 'N/A'} dias`,
        costValue: parseFloat(rate.price.replace(/[^0-9.-]+/g, "")),
        cost: rate.price,
        carrierLogo: rate.carrier?.logo_url || `https://logo.clearbit.com/${rate.carrier?.name?.toLowerCase()}.com`,
        dataAiHint: `${rate.carrier?.name?.toLowerCase()} logo`,
        source: 'CargoFive'
      })).sort((a, b) => a.costValue - b.costValue);

    } catch (error: any) {
      console.error('Erro no fluxo de tarifas:', error);
      throw error;
    }
  }
);


// SIMULATION FUNCTION for AIR
function getSimulatedCargoAiRates(input: GetFreightRatesInput): GetFreightRatesOutput {
    console.log("Returning simulated CargoAI AIR rates for:", input.origin, "->", input.destination);
    
     const carriers = [
        { name: 'LATAM Cargo', logoHint: 'latam logo' },
        { name: 'Lufthansa Cargo', logoHint: 'lufthansa logo' },
        { name: 'American Airlines', logoHint: 'american airlines logo' },
    ];
    
    const results: GetFreightRatesOutput = [];
    
    let baseRatePerKg = 4.5;
    if (input.origin.toLowerCase().includes('china') || input.destination.toLowerCase().includes('china')) {
        baseRatePerKg = 7.0;
    }
    
    for (const carrier of carriers) {
        const costValue = baseRatePerKg + Math.random() * 1.5;
        const transitTime = 1 + Math.floor(Math.random() * 3);
        results.push({
            id: `simulated-air-${carrier.name}-${Date.now()}`,
            carrier: carrier.name,
            origin: input.origin,
            destination: input.destination,
            transitTime: `${transitTime} dias`,
            cost: `USD ${costValue.toFixed(2)}/kg`,
            costValue: costValue,
            carrierLogo: `https://placehold.co/120x40.png?text=${carrier.name.replace(' ','')}`,
            dataAiHint: carrier.logoHint,
            source: 'CargoAI (Simulado)',
            flightDetails: `Voo Direto, ${Math.floor(Math.random() * 3) + 1}x por semana`
        });
    }

    return results;
}

export async function getFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  // For Ocean, call the real API. For Air, call the simulation.
  if (input.modal === 'ocean') {
    return getFreightRatesFlow(input);
  } else {
    // This part remains a simulation as per the existing code.
    return getAirFreightRates(input);
  }
}

const getAirFreightRatesFlow = ai.defineFlow(
  {
    name: 'getAirFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
    
    // Using the simulation function for AIR.
    const searchOrigins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
    const searchDestinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

    if (searchOrigins.length === 0 || searchDestinations.length === 0) {
        return []; 
    }
    
    const allResults: GetFreightRatesOutput = [];

    for (const origin of searchOrigins) {
        for (const destination of searchDestinations) {
            const simulatedInput = { ...input, origin, destination };
            const simulatedRates = getSimulatedCargoAiRates(simulatedInput);
            allResults.push(...simulatedRates);
        }
    }
    
    return allResults.sort((a,b) => a.costValue - b.costValue);
  }
);

export async function getAirFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  return getAirFreightRatesFlow(input);
}

    