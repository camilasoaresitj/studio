
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

// Tool to call the CargoFive API
const cargoFiveRateTool = ai.defineTool(
  {
    name: 'getCargoFiveRates',
    description: 'Fetches real-time ocean freight rates from the CargoFive API.',
    inputSchema: z.any(),
    outputSchema: z.any(),
  },
  async (params) => {
    const apiKey = process.env.CARGOFIVE_API_KEY;
    const apiUrl = process.env.CARGOFIVE_API_URL || 'https://api.cargofive.com/v1'; // Use a default value
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }
    
    // Corrected endpoint as per documentation review
    const response = await axios.post(`${apiUrl}/rates`, params, {
        headers: {
            'X-API-Key': apiKey, // Corrected header key
            'Content-Type': 'application/json'
        }
    });

    if (response.status !== 200) {
        console.error("CargoFive API Error:", response.data);
        const errorMessage = response.data?.errors?.[0]?.detail || response.data.message || 'Unknown API error';
        throw new Error(`CargoFive API Error (${response.status}): ${errorMessage}`);
    }
    
    // Response data is directly in `response.data.data`
    return response.data.data;
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
    
    // Per documentation, CargoFive uses zip codes, not UNLOCODEs.
    // We will use port names for display but send zip codes if available.
    // This is a simplification; a real app would need a robust location mapping service.
    const originPort = findPortByTerm(input.origin);
    const destinationPort = findPortByTerm(input.destination);

    if (!originPort || !destinationPort) {
        throw new Error('Could not find valid ports for the specified origin or destination.');
    }
    
    // Corrected API payload structure
    const apiParams = {
        origin: {
            zip_code: '01001000', // Placeholder, needs mapping
            country: originPort.country,
        },
        destination: {
            zip_code: '20010000', // Placeholder, needs mapping
            country: destinationPort.country,
        },
        ...(input.oceanShipmentType === 'FCL' && {
            packages: input.oceanShipment.containers.map(c => ({
                quantity: c.quantity,
                weight: c.weight || 20000, // Default weight
                length: c.length || 1200, // Default dimensions
                width: c.width || 230,
                height: c.height || 230,
            }))
        }),
         ...(input.oceanShipmentType === 'LCL' && {
            packages: [{
                quantity: 1, // Simplified
                weight: input.lclDetails.weight,
                // Approximate dimensions from CBM
                length: Math.cbrt(input.lclDetails.cbm * 1_000_000), 
                width: Math.cbrt(input.lclDetails.cbm * 1_000_000),
                height: Math.cbrt(input.lclDetails.cbm * 1_000_000),
            }]
        })
    };

    const rateResponse = await cargoFiveRateTool(apiParams);

    if (rateResponse && Array.isArray(rateResponse)) {
        return rateResponse.map((rate: any): GetFreightRatesOutput[0] => {
            const deliveryRange = rate.delivery_range;
            const transitTime = (deliveryRange && deliveryRange.min && deliveryRange.max) 
                ? `${deliveryRange.min}-${deliveryRange.max} dias`
                : `${rate.delivery_time || '?'} dias`;

            return {
                id: rate.id,
                carrier: rate.carrier.name,
                origin: originPort.name,
                destination: destinationPort.name,
                transitTime: transitTime,
                cost: new Intl.NumberFormat('en-US', { style: 'currency', currency: rate.currency || 'USD' }).format(rate.price),
                costValue: rate.price,
                carrierLogo: `https://placehold.co/120x40.png?text=${rate.carrier.code}`,
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
