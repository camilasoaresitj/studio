
'use server';
/**
 * @fileOverview Fetches freight rates from the CargoFive API.
 *
 * - getFreightRates - A function that fetches freight rates based on shipment details.
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
});

const GetFreightRatesOutputSchema = z.array(FreightRateSchema);
export type GetFreightRatesOutput = z.infer<typeof GetFreightRatesOutputSchema>;


export async function getFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  return getFreightRatesFlow(input);
}

// SIMULATION FUNCTION
function getSimulatedCargoFiveRates(input: GetFreightRatesInput): GetFreightRatesOutput {
    console.log("Returning simulated CargoFive rates for:", input.origin, "->", input.destination);
    
    const carriers = [
        { name: 'Maersk', logoHint: 'maersk logo' },
        { name: 'MSC', logoHint: 'msc logo' },
        { name: 'CMA CGM', logoHint: 'cma cgm logo' },
    ];
    
    const results: GetFreightRatesOutput = [];
    
    let baseCost = 2000;
    if (input.origin.toLowerCase().includes('china') || input.destination.toLowerCase().includes('china')) {
        baseCost = 5000;
    }

    const containerType = input.oceanShipment.containers[0]?.type || "20'GP";
    if (containerType.includes('40')) {
        baseCost *= 1.8;
    }
    
    for (const carrier of carriers) {
        const costValue = baseCost + Math.random() * 500;
        const transitTime = 25 + Math.floor(Math.random() * 10);
        results.push({
            id: `simulated-${carrier.name}-${Date.now()}`,
            carrier: carrier.name,
            origin: input.origin,
            destination: input.destination,
            transitTime: `${transitTime} dias`,
            cost: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(costValue),
            costValue: costValue,
            carrierLogo: `https://placehold.co/120x40.png?text=${carrier.name}`,
            dataAiHint: carrier.logoHint,
            source: 'CargoFive (Simulado)',
        });
    }

    return results;
}


const getFreightRatesFlow = ai.defineFlow(
  {
    name: 'getFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
    
    // Using the simulation function directly.
    const searchOrigins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
    const searchDestinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

    if (searchOrigins.length === 0 || searchDestinations.length === 0) {
        return []; 
    }
    
    const allResults: GetFreightRatesOutput = [];

    for (const origin of searchOrigins) {
        for (const destination of searchDestinations) {
            const simulatedInput = { ...input, origin, destination };
            const simulatedRates = getSimulatedCargoFiveRates(simulatedInput);
            allResults.push(...simulatedRates);
        }
    }
    
    return allResults.sort((a,b) => a.costValue - b.costValue);
  }
);
