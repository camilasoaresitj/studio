
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
      try {
        const singleSearchInput = { ...input, origin: pair.origin, destination: pair.destination };
        const cargoFivePayload = buildCargoFivePayload(singleSearchInput);
        
        console.log("Sending payload to CargoFive:", JSON.stringify(cargoFivePayload, null, 2));

        const response = await fetch('https://api.cargofive.com/v2/forwarding_rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': process.env.CARGOFIVE_API_KEY || "a256c19a3c3d85da2e35846de3205954",
            'User-Agent': 'CargaInteligenteApp/1.0',
          },
          body: JSON.stringify(cargoFivePayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            console.error(`CargoFive API Error for ${pair.origin}->${pair.destination} (JSON):`, errorJson);
            throw new Error(errorJson.message || errorJson.error || `CargoFive API Error (${response.status})`);
          } catch (e) {
            console.error(`CargoFive API Error for ${pair.origin}->${pair.destination} (Text):`, errorText);
            throw new Error(`CargoFive API Error (${response.status}): ${errorText}`);
          }
        }
        
        const data = await response.json();
        console.log(`Received data from CargoFive for ${pair.origin}->${pair.destination}:`, JSON.stringify(data, null, 2));
        if (!data.forwarding_rates || data.forwarding_rates.length === 0) {
            return [];
        }
        
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
        console.error(`Failed to fetch or process rates for ${pair.origin} -> ${pair.destination}:`, error);
        // Throw the error to be caught by Promise.allSettled
        throw new Error(`Falha na busca para a rota ${pair.origin} -> ${pair.destination}: ${error.message}`);
      }
    });

    // Using Promise.allSettled to ensure all requests complete, even if some fail.
    const results = await Promise.allSettled(allApiPromises);
    const successfulResults: GetFreightRatesOutput = [];
    
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            if (Array.isArray(result.value)) {
                successfulResults.push(...result.value);
            }
        } else {
            console.error(`API call for search pair ${index} failed:`, result.reason);
            // Optionally, you can throw a single, consolidated error message if you want to notify the user of partial failures.
            // For now, we will just log it and return successful results.
        }
    });

    if (successfulResults.length === 0 && results.some(r => r.status === 'rejected')) {
        const firstError = (results.find(r => r.status === 'rejected') as PromiseRejectedResult)?.reason?.message || "Ocorreu um erro desconhecido durante a busca.";
        throw new Error(firstError);
    }
    
    return successfulResults.sort((a,b) => a.costValue - b.costValue);
  }
);
