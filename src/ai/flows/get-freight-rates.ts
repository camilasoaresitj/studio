
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
import { findPortByTerm } from '@/lib/ports';

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

// Type for the actual API response from CargoFive V2
export type CargoFiveRateResponse = {
  id: string;
  carrier: {
    name: string;
    scac: string;
    code: string;
  };
  origin_port: {
    name: string;
    unlocode: string;
  };
  destination_port: {
    name: string;
    unlocode: string;
  };
  transit_time_in_days: number;
  valid_until: string;
  total_amount: number;
  currency: string;
};

// Tool to call the CargoFive API (V2)
const cargoFiveRateTool = ai.defineTool(
  {
    name: 'getCargoFiveRates',
    description: 'Fetches real-time ocean freight rates from the CargoFive V2 API.',
    inputSchema: z.object({
        origin_port: z.string(),
        destination_port: z.string(),
        container_type: z.string()
    }),
    outputSchema: z.any(),
  },
  async (params) => {
    const apiKey = process.env.CARGOFIVE_API_KEY;
    const apiUrl = process.env.CARGOFIVE_API_URL || 'https://api.cargofive.com';
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }
    
    try {
        const searchParams = new URLSearchParams(params);
        const url = `${apiUrl}/v2/rates/search?${searchParams.toString()}`;
        
        console.log("Calling CargoFive API with URL:", url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("CargoFive API Error:", errorBody);
            let errorMessage = `API Error (${response.status})`;
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.message || errorJson.errors?.[0]?.detail || JSON.stringify(errorJson);
            } catch (e) {
                errorMessage = errorBody;
            }
            throw new Error(errorMessage);
        }
        
        return await response.json();

    } catch (error: any) {
        console.error("CargoFive API Request Failed:", error.message);
        throw new Error(`Failed to fetch rates from CargoFive: ${error.message}. Payload sent: ${JSON.stringify(params, null, 2)}`);
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
        origin_port: originPort.unlocode,
        destination_port: destinationPort.unlocode,
        container_type: containerTypeMapping[input.oceanShipment.containers[0]?.type] || input.oceanShipment.containers[0]?.type,
    };

    console.log("Enviando payload para CargoFive V2:", JSON.stringify(apiParams, null, 2));

    const rateResponse = await cargoFiveRateTool(apiParams);

    if (rateResponse && Array.isArray(rateResponse)) {
        return rateResponse.map((rate: CargoFiveRateResponse): GetFreightRatesOutput[0] => {
            const transitTime = rate.transit_time_in_days ? `${rate.transit_time_in_days} dias` : 'N/A';

            return {
                id: rate.id,
                carrier: rate.carrier.name,
                origin: rate.origin_port.name,
                destination: rate.destination_port.name,
                transitTime: transitTime,
                cost: new Intl.NumberFormat('en-US', { style: 'currency', currency: rate.currency || 'USD' }).format(rate.total_amount),
                costValue: rate.total_amount,
                carrierLogo: `https://placehold.co/120x40.png?text=${rate.carrier.scac || rate.carrier.code}`,
                dataAiHint: `${rate.carrier.name.toLowerCase()} logo`,
                source: 'CargoFive',
            };
        }).sort((a: any, b: any) => a.costValue - b.costValue);
    }
    
    return [];
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
