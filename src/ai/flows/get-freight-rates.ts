
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

function buildCargoFivePayload(input: GetFreightRatesInput) {
    const shipment: any = {
        mode_of_transport: input.modal === 'ocean' ? 'sea' : 'air',
        incoterm: input.incoterm,
    };
    
    const originPort = findPortByTerm(input.origin);
    const destinationPort = findPortByTerm(input.destination);

    if (!originPort) throw new Error(`Porto de origem inválido ou não encontrado: ${input.origin}`);
    if (!destinationPort) throw new Error(`Porto de destino inválido ou não encontrado: ${input.destination}`);

    if (input.modal === 'ocean') {
        shipment.origin_port_code = originPort.unlocode; 
        shipment.destination_port_code = destinationPort.unlocode;
        shipment.package_type = 'container';
        shipment.containers = input.oceanShipment.containers.map(c => ({
            container_type: c.type,
            quantity: c.quantity,
        }));
    } else { // air
        shipment.origin_airport_code = originPort.unlocode;
        shipment.destination_airport_code = destinationPort.unlocode;
        shipment.packages = input.airShipment.pieces.map(p => ({
            quantity: p.quantity,
            weight_in_kg: p.weight,
            dimensions_in_cm: {
                length: p.length,
                width: p.width,
                height: p.height
            }
        }));
        shipment.is_stackable = input.airShipment.isStackable;
    }
    
    return { shipment };
}

const getFreightRatesFlow = ai.defineFlow(
  {
    name: 'getFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
    
    const cargoFiveApiKey = process.env.CARGOFIVE_API_KEY;

    // Split potentially comma-separated origins/destinations
    const searchOrigins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
    const searchDestinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

    if (searchOrigins.length === 0 || searchDestinations.length === 0) {
        return []; 
    }
    
    // Create all pairs of origin-destination to search
    const searchPairs = searchOrigins.flatMap(origin => 
        searchDestinations.map(destination => ({ origin, destination }))
    );

    const allApiPromises = searchPairs.map(async (pair) => {
        const singleSearchInput = { ...input, origin: pair.origin, destination: pair.destination };
        
        // --- CargoFive API Call ---
        if (cargoFiveApiKey) {
          try {
            const cargoFivePayload = buildCargoFivePayload(singleSearchInput);
            console.log("Sending payload to CargoFive:", JSON.stringify(cargoFivePayload, null, 2));
            
            const response = await fetch('https://api.cargofive.com/v2/forwarding_rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': cargoFiveApiKey },
                body: JSON.stringify(cargoFivePayload),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.message || errorJson.error || `CargoFive API Error (${response.status})`);
                } catch (e) {
                      throw new Error(`CargoFive API Error (${response.status}): ${errorText}`);
                }
            }
            
            const data = await response.json();
            console.log("Received data from CargoFive:", JSON.stringify(data, null, 2));
            if (!data.forwarding_rates || data.forwarding_rates.length === 0) return [];
            
            return data.forwarding_rates.map((rate: any): z.infer<typeof FreightRateSchema> => {
                const totalCost = rate.forwarding_charges.reduce((sum: number, charge: any) => sum + parseFloat(charge.amount), 0);
                const currency = rate.forwarding_charges[0]?.currency || 'USD';
                return {
                    id: `cargofive-${rate.id}-${pair.origin}-${pair.destination}`,
                    carrier: rate.carrier_name,
                    origin: pair.origin,
                    destination: pair.destination,
                    transitTime: `${rate.transit_time_in_days || '?'} dias`,
                    cost: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalCost),
                    costValue: totalCost,
                    carrierLogo: rate.carrier_logo || 'https://placehold.co/120x40.png',
                    dataAiHint: input.modal === 'ocean' ? 'shipping company logo' : 'airline logo',
                    source: 'CargoFive API',
                };
            });

          } catch (error: any) {
             console.error(`CargoFive API Error for ${pair.origin} -> ${pair.destination}:`, error);
             throw error;
          }
        }
        return [];
    });

    try {
        const resultsFromAllPairs = await Promise.all(allApiPromises);
        return resultsFromAllPairs.flat();
    } catch (error: any) {
        console.error("Error during API calls:", error);
        throw new Error(error.message || "An unknown error occurred while fetching rates.");
    }
  }
);
