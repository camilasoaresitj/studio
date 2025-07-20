
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

    try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'X-DPW-ApiKey': cargoFlowsApiKey,
            'X-DPW-Org-Token': cargoFlowsOrgToken,
          },
        });

        if (!response.ok) {
            throw new Error(`Cargo-flows API Error (${response.status})`);
        }
        
        const data = await response.json();
        
        // Validate the response from the API. If it's invalid, fall back to simulation.
        const validation = GetRouteMapOutputSchema.safeParse(data);
        if (validation.success) {
            return validation.data;
        } else {
            console.warn("Cargo-flows response failed validation, falling back to simulation.", validation.error.flatten());
        }

    } catch (error: any) {
        console.error("Error fetching from Cargo-flows, falling back to simulation:", error.message);
    }
    
    // --- Fallback to Simulated Data ---
    console.log(`Simulating map data for shipment: ${shipmentNumber}`);
    return {
        shipmentLocation: {
            lat: 25.7617,
            lon: -80.1918,
            locationTimestamp: new Date().toISOString(),
            locationType: "SEA",
            locationLabel: "Near Miami",
            vesselName: "SIMULATED VESSEL",
        },
        journeyStops: [
            { lat: 31.2304, lon: 121.4737, name: "Shanghai", type: "ORIGIN_PORT", isFuture: false, displayNamePermanently: true },
            { lat: -23.9608, lon: -46.3261, name: "Santos", type: "DESTINATION_HUB", isFuture: true, displayNamePermanently: true },
        ],
        routes: {
            shipToPort: [],
            portToPort: [
                { lat: 31.2304, lon: 121.4737, trackDistance: 0 },
                { lat: 22.3193, lon: 114.1694, trackDistance: 860 },
                { lat: 1.3521, lon: 103.8198, trackDistance: 2450 },
                { lat: -23.9608, lon: -46.3261, trackDistance: 15000 },
            ],
            shipToDestination: [],
        },
        shipmentType: "SIMULATED_INTERMODAL",
    };
  }
);
