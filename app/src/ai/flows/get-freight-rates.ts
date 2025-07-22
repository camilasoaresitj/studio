
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { findPortByTerm, Port } from '@/lib/ports';
import axios from 'axios';

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
    code: string;
    scac?: string;
  };
  service: string;
  price: number;
  currency: string;
  transit_time: number;
  delivery_range: {
    min: number;
    max: number;
  };
  validity: string;
  details: {
    origin_port: Port;
    destination_port: Port;
  };
};

// Mapeamento de tipos de container
const CONTAINER_TYPE_MAPPING: Record<string, string> = {
  "20'GP": "20DRY",
  "40'GP": "40DRY",
  "40'HC": "40HDRY",
  "20'RF": "20RF",
  "40'RF": "40HRF",
  "40'NOR": "40NOR",
  "20'OT": "20OT",
  "40'OT": "40OT",
  "20'FR": "20FLAT",
  "40'FR": "40FLAT",
};

const cargoFiveRateTool = ai.defineTool(
  {
    name: 'getCargoFiveRates',
    description: 'Fetches real-time ocean freight rates from the CargoFive API.',
    inputSchema: z.any(),
    outputSchema: z.array(z.any())
  },
  async (params) => {
    const apiKey = process.env.CARGOFIVE_API_KEY || 'a256c19a3c3d85da2e35846de3205954';
    const apiUrl = process.env.CARGOFIVE_API_URL || 'https://api.cargofive.com';
    
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }

    try {
      console.log('Enviando para CargoFive:', JSON.stringify(params, null, 2));
      const response = await axios.post(`${apiUrl}/v1/rates`, params, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      console.log('Resposta da CargoFive:', JSON.stringify(response.data, null, 2));

      if (!response.data?.data || response.data.data.length === 0) {
        throw new Error('Nenhuma tarifa encontrada para os parâmetros fornecidos');
      }

      return response.data.data;
    } catch (error: any) {
      const errorDetails = {
        payload: params,
        status: error.response?.status,
        errorData: error.response?.data,
        message: error.message
      };
      
      console.error('Erro na API CargoFive:', errorDetails);
      
      let errorMessage = 'Erro ao consultar tarifas';
      if (error.response?.data) {
          if (typeof error.response.data === 'string') {
              errorMessage = error.response.data;
          } else if (typeof error.response.data === 'object') {
              errorMessage = error.response.data.message || error.response.data.errors?.[0]?.detail || JSON.stringify(error.response.data);
          }
      } else {
          errorMessage = error.message;
      }

      throw new Error(`${errorMessage}. Payload: ${JSON.stringify(params, null, 2)}`);
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

      if (!originPort?.unlocode || !destinationPort?.unlocode) {
        throw new Error('Portos de origem/destino não encontrados. Use UN/LOCODEs válidos.');
      }

      if (!originPort.country || !destinationPort.country) {
        throw new Error('País do porto não especificado');
      }
      
      const isRefrigerated = input.oceanShipment.containers.some(c => c.type.includes('RF') || c.type.includes('NOR'));

      let payload: any = {
        origin: {
          unlocode: originPort.unlocode.toUpperCase(),
          country: originPort.country.toUpperCase(),
          type: 'port' as const
        },
        destination: {
          unlocode: destinationPort.unlocode.toUpperCase(),
          country: destinationPort.country.toUpperCase(),
          type: 'port' as const
        },
        options: {
          // incoterm field removed as requested for debugging.
        }
      };
      
      if (input.optionalServices?.insurance) {
        // CargoFive expects hazardous, not insurance. This is a placeholder.
        // payload.options.hazardous = true; 
      }

      if (input.oceanShipmentType === 'FCL') {
          payload.containers = input.oceanShipment.containers.map(c => ({
            type: CONTAINER_TYPE_MAPPING[c.type] || c.type,
            quantity: c.quantity
          }));
          // Merge options correctly
          payload.options = {
              ...payload.options,
              container_type: CONTAINER_TYPE_MAPPING[input.oceanShipment.containers[0]?.type] || input.oceanShipment.containers[0]?.type,
              ...(isRefrigerated && { refrigerated: true })
          };
      }

      if (input.oceanShipmentType === 'LCL') {
          // Send cbm and weight inside options for LCL
          payload.options = {
              ...payload.options,
              cbm: input.lclDetails.cbm,
              weight: input.lclDetails.weight,
              ...(isRefrigerated && { refrigerated: true })
          };
      }

      console.log('Payload final:', JSON.stringify(payload, null, 2));

      const rates = await cargoFiveRateTool(payload);

      return rates.map((rate: CargoFiveRateResponse) => ({
        id: rate.id,
        carrier: rate.carrier.name,
        origin: rate.details.origin_port.name,
        destination: rate.details.destination_port.name,
        transitTime: rate.transit_time 
          ? `${rate.transit_time} dias` 
          : `${rate.delivery_range.min}-${rate.delivery_range.max} dias`,
        cost: `${rate.currency} ${rate.price.toFixed(2)}`,
        costValue: rate.price,
        carrierLogo: rate.carrier.scac 
          ? `https://logo.clearbit.com/${rate.carrier.scac.toLowerCase()}.com`
          : `https://placehold.co/120x40?text=${rate.carrier.code}`,
        dataAiHint: `${rate.carrier.name.toLowerCase()} logo`,
        source: 'CargoFive'
      })).sort((a, b) => a.costValue - b.costValue);

    } catch (error: any) {
      console.error('Erro no fluxo de tarifas:', error);
      throw error; // Re-throw the clear error from the tool
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
