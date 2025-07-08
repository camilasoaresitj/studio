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
import * as hapag from '@/services/hapag-lloyd-service';
import * as maersk from '@/services/maersk-service';

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
        mode_of_transport: input.modal,
        incoterm: input.incoterm,
    };

    if (input.modal === 'ocean') {
        shipment.origin_port_code = input.origin.toUpperCase();
        shipment.destination_port_code = input.destination.toUpperCase();

        if (input.oceanShipmentType === 'FCL') {
            shipment.package_type = 'container';
            shipment.containers = input.oceanShipment.containers.map(c => ({
                container_type: c.type,
                quantity: c.quantity,
            }));
        } else { // LCL
            shipment.package_type = 'packages';
            shipment.total_volume_in_cbm = input.lclDetails.cbm;
            shipment.total_weight_in_kg = input.lclDetails.weight;
        }

    } else { // air
        shipment.origin_airport_code = input.origin.toUpperCase();
        shipment.destination_airport_code = input.destination.toUpperCase();
        shipment.package_type = 'packages';
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
    
    const payload: any = {
      shipment: shipment
    };

    if (input.departureDate) {
        payload.departure_date = input.departureDate.toISOString().split('T')[0];
    }
    
    return payload;
}


const getFreightRatesFlow = ai.defineFlow(
  {
    name: 'getFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
    // --- Hapag-Lloyd API Call (Simulated) ---
    let hapagRates: GetFreightRatesOutput = [];
    if (input.modal === 'ocean' && input.oceanShipmentType === 'FCL') {
        try {
            hapagRates = await hapag.getRates(input);
        } catch (error) {
            console.error("Error fetching rates from Hapag-Lloyd service:", error);
            // Don't block the entire flow if Hapag fails
        }
    }

    // --- Maersk API Call (Simulated) ---
    let maerskRates: GetFreightRatesOutput = [];
    if (input.modal === 'ocean' && input.oceanShipmentType === 'FCL') {
        try {
            maerskRates = await maersk.getRates(input);
        } catch (error) {
            console.error("Error fetching rates from Maersk service:", error);
            // Don't block the entire flow if Maersk fails
        }
    }
    
    // --- CargoFive API Call ---
    const apiKey = process.env.CARGOFIVE_API_KEY;
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured. Please set CARGOFIVE_API_KEY in your .env file.');
    }
    
    const origins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
    const destinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

    if (origins.length === 0 || destinations.length === 0) {
        return [...hapagRates, ...maerskRates]; // Return carrier rates if any
    }
    
    // Create all combinations of origin/destination pairs
    const searchPairs = origins.flatMap(origin => 
        destinations.map(destination => ({ origin, destination }))
    );

    const ratePromises = searchPairs.map(async (pair) => {
      const singleSearchInput = { ...input, origin: pair.origin, destination: pair.destination };
      const payload = buildCargoFivePayload(singleSearchInput);

      try {
        const response = await fetch('https://api.cargofive.com/v2/forwarding_rates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`CargoFive API Error for ${pair.origin} -> ${pair.destination}:`, errorBody);
          return []; // Don't throw, just return empty array for this pair
        }
        
        const data = await response.json();

        if (!data.forwarding_rates || data.forwarding_rates.length === 0) {
          return [];
        }

        const formattedRates = data.forwarding_rates.map((rate: any) => {
          const totalCost = rate.forwarding_charges.reduce((sum: number, charge: any) => sum + parseFloat(charge.amount), 0);
          const currency = rate.forwarding_charges[0]?.currency || 'USD';
          
          return {
            id: `${rate.id}-${pair.origin}-${pair.destination}`, // Ensure unique ID
            carrier: rate.carrier_name,
            origin: pair.origin,
            destination: pair.destination,
            transitTime: `${rate.transit_time_in_days || '?'} dias`,
            cost: `${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalCost)}`,
            costValue: totalCost,
            carrierLogo: 'https://placehold.co/120x40',
            dataAiHint: input.modal === 'ocean' ? 'shipping company logo' : 'airline logo',
            source: 'CargoFive API',
          };
        });
        return formattedRates;

      } catch (error) {
        console.error(`Error fetching rates for ${pair.origin} -> ${pair.destination}:`, error);
        if (error instanceof Error) {
            // Log but don't rethrow to allow other promises to complete
            console.error(error.message);
        }
        return [];
      }
    });

    const allRatesArrays = await Promise.all(ratePromises);
    const combinedRates = allRatesArrays.flat();
    
    return [...hapagRates, ...maerskRates, ...combinedRates];
  }
);
