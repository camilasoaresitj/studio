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
    const result = await cargoFlowsService.getTracking(trackingNumber);
    return result;
  }
);
