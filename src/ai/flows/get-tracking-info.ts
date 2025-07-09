'use server';
/**
 * @fileOverview A Genkit flow to fetch tracking information from various carriers.
 *
 * getTrackingInfo - A function that fetches tracking events.
 * GetTrackingInfoInput - The input type for the function.
 * GetTrackingInfoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as hapag from '@/services/hapag-lloyd-service';
import * as maersk from '@/services/maersk-service';

const GetTrackingInfoInputSchema = z.object({
  trackingNumber: z.string().describe('The tracking number (e.g., Bill of Lading, Container No).'),
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
    events: z.array(TrackingEventSchema)
});
export type GetTrackingInfoOutput = z.infer<typeof GetTrackingInfoOutputSchema>;


export async function getTrackingInfo(input: GetTrackingInfoInput): Promise<GetTrackingInfoOutput> {
  return getTrackingInfoFlow(input);
}

// This flow acts as a router to different carrier services based on the tracking number format.
const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
  },
  async ({ trackingNumber }) => {
    const upperCaseTrackingNumber = trackingNumber.toUpperCase();
    let result: { status: string; events: TrackingEvent[] };

    // Simple routing based on common prefixes. A real app might have a more complex lookup.
    if (upperCaseTrackingNumber.startsWith('MSCU') || upperCaseTrackingNumber.startsWith('MAEU') || /^\d{9}$/.test(upperCaseTrackingNumber)) {
        const maerskResult = await maersk.getTracking(upperCaseTrackingNumber);
        result = { status: maerskResult.status, events: maerskResult.events };
    } else {
        // Default to Hapag-Lloyd for this example
        result = await hapag.getTracking(upperCaseTrackingNumber);
    }

    return {
        id: trackingNumber,
        status: result.status,
        events: result.events,
    };
  }
);
