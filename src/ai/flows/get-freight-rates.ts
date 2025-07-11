
'use server';
/**
 * @fileOverview Fetches freight rates from the CargoFive and SeaRates APIs.
 *
 * - getFreightRates - A function that fetches freight rates based on shipment details.
 * - GetFreightRatesInput - The input type for the getFreightRates function.
 * - GetFreightRatesOutput - The return type for the getFreightRates function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';

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
        const originParts = input.origin.split(',').map(s => s.trim());
        const destParts = input.destination.split(',').map(s => s.trim());
        shipment.origin_port_code = originParts[0]; 
        shipment.destination_port_code = destParts[0];

        if (input.oceanShipmentType === 'FCL') {
            shipment.package_type = 'container';
            shipment.containers = input.oceanShipment.containers.map(c => ({
                container_type: c.type,
                quantity: c.quantity,
            }));
        } else { // LCL
            shipment.package_type = 'packages';
            shipment.packages = [{
                total_volume_in_cbm: input.lclDetails.cbm,
                total_weight_in_kg: input.lclDetails.weight,
            }];
        }

    } else { // air
        const originParts = input.origin.split(',').map(s => s.trim());
        const destParts = input.destination.split(',').map(s => s.trim());
        shipment.origin_airport_code = originParts[0]; 
        shipment.destination_airport_code = destParts[0];
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

function buildSeaRatesPayload(input: GetFreightRatesInput) {
    const originCode = input.origin.split(',')[0].trim().toUpperCase();
    const destinationCode = input.destination.split(',')[0].trim().toUpperCase();

    const payload: any = {
        type: input.modal === 'ocean' ? 'sea' : 'air',
        transportation_type: input.oceanShipmentType === 'FCL' ? 'port_to_port' : 'door_to_door', // Simplified assumption
        incoterm: input.incoterm,
        from_location_code: originCode,
        to_location_code: destinationCode,
    };

    if (input.modal === 'ocean' && input.oceanShipmentType === 'FCL') {
        payload.containers = input.oceanShipment.containers.map(c => ({
            size: c.type.replace(/[^0-9]/g, ''), // "20", "40"
            type: c.type.includes('HC') ? 'HC' : 'DV', // Simplified: DV or HC
            quantity: c.quantity,
        }));
    } else if (input.modal === 'ocean' && input.oceanShipmentType === 'LCL') {
        payload.packages = [{
            weight: input.lclDetails.weight,
            length: Math.cbrt(input.lclDetails.cbm) * 100, // Approximate dimensions
            width: Math.cbrt(input.lclDetails.cbm) * 100,
            height: Math.cbrt(input.lclDetails.cbm) * 100,
            quantity: 1
        }];
    } else { // air
        payload.packages = input.airShipment.pieces.map(p => ({
            weight: p.weight,
            length: p.length,
            width: p.width,
            height: p.height,
            quantity: p.quantity
        }));
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
    
    const cargoFiveApiKey = process.env.CARGOFIVE_API_KEY;
    const seaRatesApiKey = process.env.SEARATES_API_KEY;

    const origins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
    const destinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

    if (origins.length === 0 || destinations.length === 0) {
        return []; 
    }
    
    const searchPairs = origins.flatMap(origin => 
        destinations.map(destination => ({ origin, destination }))
    );

    const allApiPromises = searchPairs.map(async (pair) => {
        const singleSearchInput = { ...input, origin: pair.origin, destination: pair.destination };
        
        const promises = [];

        // --- CargoFive API Call ---
        if (cargoFiveApiKey) {
            const cargoFivePayload = buildCargoFivePayload(singleSearchInput);
            const cargoFivePromise = fetch('https://api.cargofive.com/v2/forwarding_rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': cargoFiveApiKey },
                body: JSON.stringify(cargoFivePayload),
            })
            .then(res => res.ok ? res.json() : res.text().then(text => Promise.reject(text)))
            .then(data => {
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
                        carrierLogo: 'https://placehold.co/120x40',
                        dataAiHint: input.modal === 'ocean' ? 'shipping company logo' : 'airline logo',
                        source: 'CargoFive API',
                    };
                });
            })
            .catch(error => {
                console.error(`CargoFive API Error for ${pair.origin} -> ${pair.destination}:`, error);
                return []; // Return empty array on error to not fail the whole process
            });
            promises.push(cargoFivePromise);
        }

        // --- SeaRates API Call ---
        if (seaRatesApiKey) {
            const seaRatesPayload = buildSeaRatesPayload(singleSearchInput);
            const seaRatesPromise = fetch('https://developers.searates.com/api/v2/partners/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api-key': seaRatesApiKey },
                body: JSON.stringify(seaRatesPayload),
            })
            .then(res => res.ok ? res.json() : res.text().then(text => Promise.reject(text)))
            .then(data => {
                if (!data.data || data.data.length === 0) return [];
                return data.data.map((rate: any): z.infer<typeof FreightRateSchema> => {
                    const totalCost = parseFloat(rate.total_cost) || 0;
                    const currency = rate.currency_code || 'USD';
                    return {
                        id: `searates-${rate.id}-${pair.origin}-${pair.destination}`,
                        carrier: rate.carrier,
                        origin: pair.origin,
                        destination: pair.destination,
                        transitTime: `${rate.transit_time || '?'} dias`,
                        cost: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalCost),
                        costValue: totalCost,
                        carrierLogo: rate.carrier_logo || 'https://placehold.co/120x40',
                        dataAiHint: input.modal === 'ocean' ? 'shipping company logo' : 'airline logo',
                        source: 'SeaRates API',
                    };
                });
            })
            .catch(error => {
                console.error(`SeaRates API Error for ${pair.origin} -> ${pair.destination}:`, error);
                return [];
            });
            promises.push(seaRatesPromise);
        }

        return Promise.all(promises);
    });

    const resultsFromAllPairs = await Promise.all(allApiPromises);
    
    // Flatten the nested arrays: [ [ [rates1], [rates2] ], [ [rates3] ] ] -> [rates1, rates2, rates3]
    const combinedRates = resultsFromAllPairs.flat(2);
    
    return combinedRates;
  }
);
