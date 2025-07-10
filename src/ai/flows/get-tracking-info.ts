
'use server';
/**
 * @fileOverview A Genkit flow to fetch tracking information using a simulated Cargo-flows service.
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
    // Due to lack of a public tracking endpoint on Cargo-flows, we will use a high-fidelity simulation.
    // In a real-world scenario with a valid API, the fetch logic would be here.
    console.log(`Using simulated tracking for tracking number: ${trackingNumber}`);
    return getSimulatedTracking(trackingNumber);
  }
);
