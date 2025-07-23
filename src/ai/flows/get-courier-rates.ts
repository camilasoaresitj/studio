
'use server';
/**
 * @fileOverview Fetches courier rates from the ShipEngine API.
 *
 * - getCourierRates - A function that fetches rates for a package shipment.
 * - GetCourierRatesInput - The input type for the function.
 * - GetCourierRatesOutput - The return type for the function.
 */

import { defineFlow, defineTool, generate } from '@genkit-ai/core';
import { z } from 'zod';
import type { Partner } from '@/lib/partners-data';
import { getPartners } from '@/lib/partners-data';
import { airPieceSchema } from '@/lib/schemas';

const GetCourierRatesInputSchema = z.object({
  customerId: z.string(),
  origin: z.string(),
  destination: z.string(),
  pieces: z.array(airPieceSchema),
});
type GetCourierRatesInput = z.infer<typeof GetCourierRatesInputSchema>;

const CourierRateSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  service: z.string(),
  deliveryDays: z.number().nullable(),
  cost: z.string(),
  costValue: z.number(),
  carrierLogo: z.string(),
  dataAiHint: z.string(),
  source: z.string(),
});
const GetCourierRatesOutputSchema = z.array(CourierRateSchema);
type GetCourierRatesOutput = z.infer<typeof GetCourierRatesOutputSchema>;

export async function getCourierRates(input: GetCourierRatesInput): Promise<GetCourierRatesOutput> {
  return getCourierRatesFlow(input);
}

// Tool to call the ShipEngine API
const shipEngineRateTool = defineTool(
  {
    name: 'getShipEngineRates',
    description: 'Fetches real-time courier rates from the ShipEngine API.',
    inputSchema: z.any(),
    outputSchema: z.any(),
  },
  async (params) => {
    const apiKey = process.env.SHIPENGINE_API_KEY;
    if (!apiKey) {
      throw new Error('ShipEngine API key is not configured.');
    }
    
    const response = await fetch('https://api.shipengine.com/v1/rates', {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("ShipEngine API Error:", errorBody);
        throw new Error(`ShipEngine API Error (${response.status}): ${errorBody.errors[0]?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.rate_response;
  }
);


const getCourierRatesFlow = defineFlow(
  {
    name: 'getCourierRatesFlow',
    inputSchema: GetCourierRatesInputSchema,
    outputSchema: GetCourierRatesOutputSchema,
  },
  async ({ customerId, origin, destination, pieces }) => {
    
        const allPartners = getPartners();
        const customer = allPartners.find(p => p.id?.toString() === customerId);

        if (!customer) {
        throw new Error("Customer not found to get address details.");
        }
        
        // For simplicity, we assume origin address is our company address and destination is the customer's.
        // A real app might have more complex address management.
        const shipFrom = {
            name: "CargaInteligente",
            phone: "4730453944",
            company_name: "CargaInteligente",
            address_line1: "Rua Domingos Fascin Neto, 584",
            city_locality: "Itajaí",
            state_province: "SC",
            postal_code: "88306720",
            country_code: "BR",
            address_residential_indicator: "no"
        };

        const shipTo = {
            name: customer.contacts[0].name,
            phone: customer.contacts[0].phone.replace(/\D/g, ''),
            company_name: customer.name,
            address_line1: `${customer.address.street}, ${customer.address.number}`,
            city_locality: customer.address.city,
            state_province: customer.address.state,
            postal_code: customer.address.zip?.replace(/\D/g, ''),
            country_code: customer.address.country === 'Brasil' ? 'BR' : 'US', // Simple mapping
            address_residential_indicator: "no"
        };

        const packages = pieces.map(p => ({
            weight: {
                value: p.weight,
                unit: 'kilogram' as const
            },
            dimensions: {
                unit: 'centimeter' as const,
                length: p.length,
                width: p.width,
                height: p.height
            }
        }));
        
        const shipEngineParams = {
        rate_options: {
            carrier_ids: [
                // Add carrier IDs from your ShipEngine account
                // e.g., 'se-123456' for FedEx, 'se-654321' for UPS
            ]
        },
        shipment: {
            validate_address: 'no_validation' as const,
            ship_to: shipTo,
            ship_from: shipFrom,
            packages: packages
        }
        };
        
        const rateResponse = await shipEngineRateTool(shipEngineParams);

        if (rateResponse.status === 'completed' && rateResponse.rates) {
            return rateResponse.rates.map((rate: any) => {
                const costValue = rate.shipping_amount.amount + rate.insurance_amount.amount + rate.other_amount.amount;
                return {
                    id: rate.rate_id,
                    carrier: rate.carrier_friendly_name,
                    service: rate.service_type,
                    deliveryDays: rate.delivery_days,
                    cost: `${rate.shipping_amount.currency} ${costValue.toFixed(2)}`,
                    costValue: costValue,
                    carrierLogo: `https://placehold.co/120x40.png?text=${rate.carrier_code}`,
                    dataAiHint: `${rate.carrier_friendly_name.toLowerCase()} logo`,
                    source: 'ShipEngine',
                };
            });
        } else if (rateResponse.errors && rateResponse.errors.length > 0) {
            throw new Error(rateResponse.errors[0].message);
        }

        return [];
    }
);
