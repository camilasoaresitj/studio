
'use server';
/**
 * @fileOverview A Genkit flow to fetch shipment route and map data from the Cargo-flows API.
 *
 * getRouteMap - A function that fetches map data for a given shipment number.
 * GetRouteMapInput - The input type for the function.
 * GetRouteMapOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GetRouteMapInputSchema = z.object({
  shipmentNumber: z.string().describe('The shipment number (usually the booking number).'),
});
export type GetRouteMapInput = z.infer<typeof GetRouteMapInputSchema>;

const LocationSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

const ShipmentLocationSchema = LocationSchema.extend({
  locationTimestamp: z.string().datetime(),
  locationType: z.string(),
  locationLabel: z.string(),
  vesselName: z.string(),
});

const JourneyStopSchema = LocationSchema.extend({
  name: z.string(),
  type: z.string(),
  isFuture: z.boolean(),
  displayNamePermanently: z.boolean(),
});

const RoutePointSchema = LocationSchema.extend({
  trackDistance: z.number(),
  name: z.string().optional(),
  locode: z.string().optional(),
  clazz: z.number().optional(),
  routingAreaId: z.number().optional(),
});

const GetRouteMapOutputSchema = z.object({
  shipmentLocation: ShipmentLocationSchema.nullable(),
  journeyStops: z.array(JourneyStopSchema),
  routes: z.object({
    shipToPort: z.array(RoutePointSchema),
    portToPort: z.array(RoutePointSchema),
    shipToDestination: z.array(RoutePointSchema),
  }),
  shipmentType: z.string(),
});
export type GetRouteMapOutput = z.infer<typeof GetRouteMapOutputSchema>;

export async function getRouteMap(input: GetRouteMapInput): Promise<GetRouteMapOutput> {
  return getRouteMapFlow(input);
}

const getRouteMapFlow = ai.defineFlow(
  {
    name: 'getRouteMapFlow',
    inputSchema: GetRouteMapInputSchema,
    outputSchema: GetRouteMapOutputSchema,
  },
  async ({ shipmentNumber }) => {
    const cargoFlowsApiKey = process.env.CARGOFLOWS_API_KEY;
    const cargoFlowsOrgToken = process.env.CARGOFLOWS_ORG_TOKEN;

    if (!cargoFlowsApiKey || !cargoFlowsOrgToken) {
      throw new Error('Cargo-flows API credentials are not configured.');
    }

    const url = `https://connect.cargoes.com/flow/api/public_tracking/v1/mapRoutes?shipmentNumber=${shipmentNumber}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-DPW-ApiKey': cargoFlowsApiKey,
        'X-DPW-Org-Token': cargoFlowsOrgToken,
      },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Cargo-flows getRouteMap Error Body:", errorBody);
        let errorMessage = `Cargo-flows API Error (${response.status})`;
        try {
            errorMessage = JSON.parse(errorBody).error?.message || errorBody;
        } catch (e) { /* ignore json parse error */ }
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return GetRouteMapOutputSchema.parse(data);
  }
);
