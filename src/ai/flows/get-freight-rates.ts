
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { findPortByTerm } from '@/lib/ports';
import type { Port } from '@/lib/ports';
import axios from 'axios';
import { format } from 'date-fns';

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

export type CargoFiveRateResponse = {
  id: string;
  carrier: {
    name: string;
    scac: string;
  };
  service: string;
  price: number;
  currency: string;
  transit_time: number;
  validity_start_date: string;
  validity_end_date: string;
  origin_port: Port;
  destination_port: Port;
};

// Mapeamento de UNLOCODE para CargoFive Location ID
const PORT_LOCATIONS: Record<string, string> = {
  CNSHA: '120',  // Shanghai
  BRSSZ: '55',   // Santos
  USNYC: '84',   // New York
  NLRTM: '135',  // Rotterdam
  DEHAM: '97',   // Hamburg
  BEANR: '103',  // Antwerp
  BRITJ: '56',   // Itajai
  BRPNG: '57',   // Paranagua
  BRIOA: '407',  // Itapoa
};

// Mapeamento de tipos de container para o formato da CargoFive
const CONTAINER_TYPE_MAPPING: Record<string, string> = {
  "20'GP": "20DV",
  "40'GP": "40DV",
  "40'HC": "40HC",
  "20'RF": "20RF",
  "40'RF": "40HRF",
  "40'NOR": "40NOR",
  "20'OT": "20OT",
  "40'OT": "40OT",
  "20'FR": "20FL",
  "40'FR": "40FL",
};

const cargoFiveRateTool = ai.defineTool(
  {
    name: 'getCargoFiveRates',
    description: 'Fetches real-time ocean freight rates from the CargoFive API using a POST request.',
    inputSchema: z.any(),
    outputSchema: z.array(z.any())
  },
  async (payload) => {
    const apiKey = process.env.CARGOFIVE_API_KEY || 'a256c19a3c3d85da2e35846de3205954';
    const apiUrl = 'https://coreapp-qa.cargofive.com/api/v1/public/rates';
    
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }

    try {
      console.log('Enviando para CargoFive (POST):', JSON.stringify(payload, null, 2));
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('Resposta da CargoFive:', JSON.stringify(response.data, null, 2));

      if (!response.data || response.data.length === 0) {
        return [];
      }

      return response.data;
    } catch (error: any) {
      const errorDetails = {
        payload,
        status: error.response?.status,
        errorData: error.response?.data,
        message: error.message
      };
      
      console.error('Erro na API CargoFive:', errorDetails);
      
      let errorMessage = 'Erro ao consultar tarifas';
      if (error.response?.data) {
          errorMessage = error.response.data.message || JSON.stringify(error.response.data);
      } else {
          errorMessage = error.message;
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

      const originLocationId = PORT_LOCATIONS[originPort?.unlocode.toUpperCase() || ''];
      const destinationLocationId = PORT_LOCATIONS[destinationPort?.unlocode.toUpperCase() || ''];

      if (!originLocationId || !destinationLocationId) {
        throw new Error(`Mapeamento de ID de localização não encontrado para a rota: ${input.origin} -> ${input.destination}. Verifique o cadastro de portos.`);
      }
      
      let containersDetails: any[] = [];
      if (input.oceanShipmentType === 'FCL') {
          containersDetails = input.oceanShipment.containers.map(c => {
              const type = CONTAINER_TYPE_MAPPING[c.type] || '20DV';
              const weight = c.weight || 15000; // Default weight if not provided
              return {
                  quantity: c.quantity,
                  type: type,
                  weight: weight,
                  weight_unit: "Kg"
              };
          });
      } else { // LCL
          containersDetails = [{
              type: "LCL",
              quantity: 1,
              cbm: input.lclDetails.cbm,
              weight: input.lclDetails.weight,
              weight_unit: "Kg"
          }]
      }

      const offerObject = {
        origin_id: parseInt(originLocationId),
        destination_id: parseInt(destinationLocationId),
        type: input.oceanShipmentType,
        departure_date: input.departureDate ? format(input.departureDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        containers: containersDetails,
      };

      // The payload must be an array of offer objects
      const payload = [offerObject];

      console.log('Payload final para API POST:', JSON.stringify(payload, null, 2));

      const rates = await cargoFiveRateTool(payload);
      
      if (rates.length === 0) {
        return [];
      }

      return rates.map((rate: CargoFiveRateResponse) => ({
        id: rate.id,
        carrier: rate.carrier.name,
        origin: rate.origin_port.name,
        destination: rate.destination_port.name,
        transitTime: `${rate.transit_time} dias`,
        cost: `${rate.currency} ${rate.price.toFixed(2)}`,
        costValue: rate.price,
        carrierLogo: `https://logo.clearbit.com/${rate.carrier.scac.toLowerCase()}.com`,
        dataAiHint: `${rate.carrier.name.toLowerCase()} logo`,
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
