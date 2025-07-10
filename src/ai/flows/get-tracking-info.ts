'use server';
/**
 * @fileOverview A Genkit flow to fetch tracking information using the Cargo-flows service.
 *
 * getTrackingInfo - A function that fetches tracking events.
 * GetTrackingInfoInput - The input type for the function.
 * GetTrackingInfoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { cargoFlowsService } from '@/services/schedule-service';

const GetTrackingInfoInputSchema = z.object({
  trackingNumber: z.string().describe('The tracking number (e.g., Bill of Lading, Container No, AWB).'),
});
export type GetTrackingInfoInput = z.infer<typeof GetTrackingInfoInputSchema>;

const TrackingEventSchema = z.object({
    status: z.string(),
    date: z.string(),
    location: z.string(),
    completed: z.boolean(),
    carrier: z.string(),
});
export type TrackingEvent = z.infer<typeof TrackingEventSchema>;

const GetTrackingInfoOutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    origin: z.string(),
    destination: z.string(),
    vesselName: z.string().optional(),
    voyageNumber: z.string().optional(),
    carrier: z.string(),
    events: z.array(TrackingEventSchema)
});
export type GetTrackingInfoOutput = z.infer<typeof GetTrackingInfoOutputSchema>;

export async function getTrackingInfo(input: GetTrackingInfoInput): Promise<GetTrackingInfoOutput> {
  return getTrackingInfoFlow(input);
}

// This flow now uses the centralized Cargo-flows service.
const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
  },
  async ({ trackingNumber }) => {
    
    const apiKey = process.env.CARGOFLOWS_API_KEY || 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    const orgToken = process.env.CARGOFLOWS_ORG_TOKEN || 'Gz7NChq8MbUnBmuG0DferKtBcDka33gV';
    const baseUrl = 'https://flow.cargoes.com/api/v1';

    try {
        console.log(`Calling Cargo-flows API from backend: ${baseUrl}/tracking/${trackingNumber}`);
        
        const response = await fetch(`${baseUrl}/tracking/${trackingNumber}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Org-Token': orgToken,
          },
        });

        if (!response.ok) {
            console.warn(`Cargo-flows API call failed with status ${response.status}. Falling back to simulation.`);
            return cargoFlowsService.getSimulatedTracking(trackingNumber);
        }
        
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Cargo-flows response as JSON.", responseText);
            throw new Error("A API retornou uma resposta inesperada. Tente novamente mais tarde.");
        }

        const apiData = data.tracking;

        return {
            id: apiData.trackingNumber || 'N/A',
            status: apiData.latestStatus || 'Unknown',
            origin: apiData.origin || 'Unknown',
            destination: apiData.destination || 'Unknown',
            carrier: apiData.carrier || 'Unknown',
            events: (apiData.events || []).map((event: any) => ({
                status: event.description,
                date: event.timestamp,
                location: event.location,
                completed: event.isCompleted,
                carrier: apiData.carrier || 'Unknown'
            })),
            vesselName: apiData.vesselName,
            voyageNumber: apiData.voyageNumber,
        };
    } catch (error) {
        console.error("Error during fetch to Cargo-flows:", error);
        throw new Error("Falha na comunicação com a API de rastreamento. Verifique sua conexão ou tente mais tarde.");
    }
  }
);
