
'use server';
/**
 * @fileOverview Fetches freight rates from the CargoFive API.
 *
 * - getFreightRates - A function that fetches ocean freight rates based on shipment details.
 * - getAirFreightRates - A function that fetches air freight rates based on shipment details.
 * - GetFreightRatesInput - The input type for the getFreightRates function.
 * - GetFreightRatesOutput - The return type for the getFreightRates function.
 */

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


export async function getFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  return getFreightRatesFlow(input);
}

export async function getAirFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  return getAirFreightRatesFlow(input);
}

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

const cargoFiveRateTool = ai.defineTool(
  {
    name: 'getCargoFiveRates',
    description: 'Fetches real-time ocean freight rates from the CargoFive API.',
    inputSchema: z.object({
      origin: z.object({
        unlocode: z.string(),
        country: z.string(),
        type: z.literal('port')
      }),
      destination: z.object({
        unlocode: z.string(),
        country: z.string(),
        type: z.literal('port')
      }),
      packages: z.array(z.object({
        quantity: z.number(),
        weight: z.number(),
        length: z.number(),
        width: z.number(),
        height: z.number()
      })).optional(),
      containers: z.array(z.object({
        type: z.string(),
        quantity: z.number()
      })).optional(),
      options: z.object({
        container_type: z.string().optional(),
        incoterm: z.string().optional()
      }).optional()
    }),
    outputSchema: z.array(z.any())
  },
  async (params) => {
    const apiKey = process.env.CARGOFIVE_API_KEY;
    const apiUrl = process.env.CARGOFIVE_API_URL || 'https://api.cargofive.com';
    
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }

    try {
      const response = await axios.post(`${apiUrl}/v1/rates`, params, {
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.data || response.data.data.length === 0) {
        throw new Error('No rates found for the given parameters');
      }

      return response.data.data;
    } catch (error: any) {
      console.error("CargoFive API Error Details:", {
        payload: params,
        response: error.response?.data,
        status: error.response?.status
      });
      
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.errors?.[0]?.detail || 
                         error.message;
      
      throw new Error(`CargoFive API Error: ${errorMessage}`);
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


const getFreightRatesFlow = ai.defineFlow(
  {
    name: 'getFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
    tools: [cargoFiveRateTool]
  },
  async (input) => {
    const originPort = findPortByTerm(input.origin);
    const destinationPort = findPortByTerm(input.destination);

    if (!originPort?.unlocode || !destinationPort?.unlocode) {
        throw new Error('Não foi possível encontrar códigos de porto (UNLOCODE) válidos para a origem ou destino especificados. Por favor, use nomes de cidade reconhecidos.');
    }

    const containerTypeMapping: { [key: string]: string } = {
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

    const apiParams = {
        origin: {
            unlocode: originPort.unlocode.toUpperCase(),
            country: (originPort.country || originPort.unlocode.substring(0, 2)).toUpperCase(),
            type: 'port' as const
        },
        destination: {
            unlocode: destinationPort.unlocode.toUpperCase(),
            country: (destinationPort.country || destinationPort.unlocode.substring(0, 2)).toUpperCase(),
            type: 'port' as const
        },
        options: {
            incoterm: input.incoterm || 'FOB'
        },
        ...(input.oceanShipmentType === 'FCL' && {
            containers: input.oceanShipment.containers.map(c => ({
                type: containerTypeMapping[c.type] || c.type,
                quantity: c.quantity
            })),
            options: {
                ...(input.oceanShipment.containers[0]?.type && {
                    container_type: containerTypeMapping[input.oceanShipment.containers[0].type] || input.oceanShipment.containers[0].type
                }),
                incoterm: input.incoterm || 'FOB'
            }
        }),
        ...(input.oceanShipmentType === 'LCL' && {
            packages: [{
                quantity: 1,
                weight: input.lclDetails.weight,
                length: 120,
                width: 80,
                height: 100
            }]
        })
    };
    
    console.log("Payload sendo enviado para CargoFive:", JSON.stringify(apiParams, null, 2));

    try {
        const rateResponse = await cargoFiveRateTool(apiParams);

        if (!rateResponse || rateResponse.length === 0) {
            return [];
        }

        return rateResponse.map((rate: CargoFiveRateResponse) => ({
            id: rate.id,
            carrier: rate.carrier.name,
            origin: rate.details.origin_port.name,
            destination: rate.details.destination_port.name,
            transitTime: rate.transit_time
                ? `${rate.transit_time} dias`
                : `${rate.delivery_range.min}-${rate.delivery_range.max} dias`,
            cost: `${rate.currency} ${rate.price.toFixed(2)}`,
            costValue: rate.price,
            carrierLogo: `https://placehold.co/120x40.png?text=${rate.carrier.code}`,
            dataAiHint: `${rate.carrier.name.toLowerCase()} logo`,
            source: 'CargoFive'
        })).sort((a, b) => a.costValue - b.costValue);

    } catch (error: any) {
        console.error("Error in freight rates flow:", error);
        throw new Error(`Failed to get rates: ${error.message}`);
    }
  }
);


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
