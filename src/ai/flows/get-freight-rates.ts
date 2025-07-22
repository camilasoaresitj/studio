
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
    const apiUrl = process.env.CARGOFIVE_API_URL;
    if (!apiKey || !apiUrl) {
      throw new Error('CargoFive API key or URL is not configured.');
    }
    
    // CargoFive uses a different endpoint for quotations
    const response = await axios.post(`${apiUrl}/forwarding/quotes/search`, params, {
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        }
    });

    if (response.status !== 200) {
        console.error("CargoFive API Error:", response.data);
        throw new Error(`CargoFive API Error (${response.status}): ${response.data.message || 'Unknown error'}`);
    }
    
    return response.data;
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

    if (!originPort || !destinationPort) {
        throw new Error('Could not find valid UNLOCODEs for the specified origin or destination.');
    }
    
    const apiParams = {
        origin_port: originPort.unlocode,
        destination_port: destinationPort.unlocode,
        incoterm: input.incoterm,
        ...(input.oceanShipmentType === 'FCL' && {
            shipment_type: 'FCL',
            containers: input.oceanShipment.containers.map(c => ({
                iso_code: c.type.replace("'", "").replace("GP", "G1").replace("HC", "P1"),
                quantity: c.quantity,
            }))
        }),
         ...(input.oceanShipmentType === 'LCL' && {
            shipment_type: 'LCL',
            packages: [{
                quantity: 1, // Simplified for now
                weight: input.lclDetails.weight,
                dimensions: {
                    length: Math.cbrt(input.lclDetails.cbm * 1_000_000), // Approximate dimensions from CBM
                    width: Math.cbrt(input.lclDetails.cbm * 1_000_000),
                    height: Math.cbrt(input.lclDetails.cbm * 1_000_000),
                }
            }]
        })
    };

    const rateResponse = await cargoFiveRateTool(apiParams);

    if (rateResponse && rateResponse.results) {
        return rateResponse.results.map((rate: any): GetFreightRatesOutput[0] => {
            const totalAmount = rate.charges.reduce((sum: number, charge: any) => sum + charge.amount, 0);
            return {
                id: rate.id,
                carrier: rate.carrier_name,
                origin: rate.origin_port_name,
                destination: rate.destination_port_name,
                transitTime: `${rate.transit_time} dias`,
                cost: new Intl.NumberFormat('en-US', { style: 'currency', currency: rate.charges[0]?.currency || 'USD' }).format(totalAmount),
                costValue: totalAmount,
                carrierLogo: rate.carrier_logo || `https://placehold.co/120x40.png?text=${rate.carrier_name}`,
                dataAiHint: `${rate.carrier_name.toLowerCase()} logo`,
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
