
'use server';
/**
 * @fileOverview A Genkit flow to generate a visual route map for a shipment.
 *
 * getRouteMap - A function that returns data needed to construct a static map image.
 * GetRouteMapInput - The input type for the function.
 * GetRouteMapOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getShipmentById } from '@/lib/shipment-data';
import { findPortByTerm } from '@/lib/ports';

const LatLonSchema = z.object({
  lat: z.number().describe("Latitude"),
  lon: z.number().describe("Longitude"),
});

const JourneyStopSchema = z.object({
  name: z.string().describe("Name of the location (e.g., 'Port of Santos', 'JFK Airport')."),
  type: z.enum(['ORIGIN_PORT', 'DESTINATION_HUB', 'TRANSSHIPMENT_PORT', 'CURRENT_LOCATION']),
  lat: z.number(),
  lon: z.number(),
});

const GetRouteMapOutputSchema = z.object({
  journeyStops: z.array(JourneyStopSchema).describe("An array of all significant locations in the journey."),
  routes: z.object({
    portToPort: z.array(LatLonSchema).describe("A list of coordinates forming the main sea/air route."),
  }),
  shipmentLocation: LatLonSchema.nullable().describe("The last known coordinates of the shipment."),
});
export type GetRouteMapOutput = z.infer<typeof GetRouteMapOutputSchema>;

// This flow is a simulation. A real implementation would use a geolocation service
// to get coordinates for ports and a vessel tracking API for the live route.
const getRouteMapFlow = ai.defineFlow(
  {
    name: 'getRouteMapFlow',
    inputSchema: z.string(), // Shipment ID
    outputSchema: GetRouteMapOutputSchema,
  },
  async (shipmentId) => {
    const shipment = getShipmentById(shipmentId);
    if (!shipment) {
      throw new Error(`Shipment with ID ${shipmentId} not found.`);
    }
    
    const originPort = findPortByTerm(shipment.origin);
    const destPort = findPortByTerm(shipment.destination);

    if (!originPort || !destPort) {
        throw new Error("Could not find coordinates for origin or destination port.");
    }
    
    const originCoords = { lat: originPort.lat, lon: originPort.lon };
    const destCoords = { lat: destPort.lat, lon: destPort.lon };
    
    const journeyStops: z.infer<typeof JourneyStopSchema>[] = [
      { name: originPort.name, type: 'ORIGIN_PORT', ...originCoords },
      { name: destPort.name, type: 'DESTINATION_HUB', ...destCoords },
    ];

    // Simulate a transshipment point for longer routes
    const singaporePort = findPortByTerm('Singapore');
    let portToPort = [originCoords, destCoords];

    if (shipment.origin.includes('CN') && shipment.destination.includes('BR') && singaporePort) {
        const transshipmentPoint = { lat: singaporePort.lat, lon: singaporePort.lon };
        journeyStops.push({ name: 'Port of Singapore', type: 'TRANSSHIPMENT_PORT', ...transshipmentPoint});
        portToPort = [originCoords, transshipmentPoint, destCoords];
    }
    
    // Simulate current location (midpoint of the first leg)
    const shipmentLocation = {
        lat: (portToPort[0].lat + portToPort[1].lat) / 2,
        lon: (portToPort[0].lon + portToPort[1].lon) / 2,
    };
    
     journeyStops.push({ name: 'Current Location', type: 'CURRENT_LOCATION', ...shipmentLocation});
    
    return {
      journeyStops,
      routes: { portToPort },
      shipmentLocation
    };
  }
);


export async function getRouteMap(shipmentId: string): Promise<GetRouteMapOutput> {
  return getRouteMapFlow(shipmentId);
}
