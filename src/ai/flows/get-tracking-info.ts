
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

async function getSimulatedTracking(trackingNumber: string): Promise<GetTrackingInfoOutput> {
     console.log(`Simulating Cargo-flows API call for: ${trackingNumber}`);
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (trackingNumber.toUpperCase().includes("FAIL")) {
        throw new Error("O número de rastreamento fornecido não foi encontrado na base de dados do Cargo-flows.");
    }
    
    const events: TrackingEvent[] = [
      { status: 'Booking Confirmed', date: '2024-07-10T10:00:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'Container Gated In', date: '2024-07-12T15:30:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'Loaded on Vessel', date: '2024-07-14T08:00:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'Vessel Departure', date: '2024-07-14T20:00:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'In Transit', date: '2024-07-25T00:00:00Z', location: 'Pacific Ocean', completed: false, carrier: 'Maersk' },
      { status: 'Vessel Arrival', date: '2024-08-15T12:00:00Z', location: 'Santos, BR', completed: false, carrier: 'Maersk' },
    ];

    const latestCompletedEvent = [...events].reverse().find(e => e.completed);

    return {
      id: trackingNumber,
      status: latestCompletedEvent?.status || 'Pending',
      origin: 'Shanghai, CN',
      destination: 'Santos, BR',
      vesselName: 'MAERSK PICO',
      voyageNumber: '428N',
      carrier: 'Maersk',
      events,
    };
}

export async function getTrackingInfo(input: GetTrackingInfoInput): Promise<GetTrackingInfoOutput> {
  return getTrackingInfoFlow(input);
}

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
        // Always try to call the real API first.
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
            // If the API call fails, throw an error which will be caught below.
            const errorText = await response.text();
            console.warn(`Cargo-flows API call failed with status ${response.status}: ${errorText}`);
            throw new Error(`API returned status ${response.status}`);
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
            id: apiData.trackingNumber || trackingNumber,
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
        // If the fetch fails for any reason (network error, API error thrown above), fall back to simulation.
        console.error("Error during fetch to Cargo-flows:", error);
        console.log("Falling back to simulated tracking due to error.");
        return getSimulatedTracking(trackingNumber);
    }
  }
);
