
'use server';
/**
 * @fileOverview A Genkit flow to generate tracking information using an AI model.
 *
 * getTrackingInfo - A function that generates tracking events.
 * GetTrackingInfoInput - The input type for the function.
 * GetTrackingInfoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment } from '@/lib/shipment';

const GetTrackingInfoInputSchema = z.object({
  trackingNumber: z.string().describe('The tracking number (e.g., Bill of Lading, Container No, AWB).'),
});
export type GetTrackingInfoInput = z.infer<typeof GetTrackingInfoInputSchema>;

export type TrackingEvent = {
  status: string;
  date: string;
  location: string;
  completed: boolean;
  carrier: string;
};

const TrackingEventSchema = z.object({
    status: z.string(),
    date: z.string(),
    location: z.string(),
    completed: z.boolean(),
    carrier: z.string(),
});

const GetTrackingInfoOutputSchema = z.object({
    status: z.string(),
    events: z.array(TrackingEventSchema),
    shipmentDetails: z.any().optional(), // Using any() for the partial shipment object
});
export type GetTrackingInfoOutput = z.infer<typeof GetTrackingInfoOutputSchema>;


export async function getTrackingInfo(input: GetTrackingInfoInput): Promise<GetTrackingInfoOutput> {
  return getTrackingInfoFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateTrackingInfoPrompt',
    input: { schema: GetTrackingInfoInputSchema },
    output: { schema: GetTrackingInfoOutputSchema },
    prompt: `You are an expert logistics AI that generates realistic shipment tracking data.
Given a tracking number, you will create a plausible history of tracking events and shipment details.

**Instructions:**
1.  **Carrier Identification:** Based on the tracking number format, identify the most likely carrier (e.g., Maersk, MSC, Hapag-Lloyd, etc.).
    - Maersk: Starts with numbers (e.g., 254285462) or "MAEU".
    - MSC: Starts with "MSCU".
    - Hapag-Lloyd: Often a long numeric string, or starts with "HLCU".
2.  **Generate Shipment Details:** Create realistic shipment details based on the carrier.
    - **vesselName/voyageNumber:** Invent a plausible vessel name and voyage number.
    - **origin/destination:** Create a realistic long-haul route (e.g., a port in Asia to a port in South America).
    - **etd/eta:** Generate realistic ETD and ETA dates that are about 30-40 days apart.
    - **masterBillNumber:** Should be the same as the input tracking number.
3.  **Generate Tracking Events:** Create a sequence of 8-12 logical tracking events, from "Booking Confirmed" to "Delivered".
    - Events must be in chronological order.
    - A portion of the events should be marked as \`completed: true\`, and the rest \`completed: false\`.
    - The dates should be logical and span the time between ETD and ETA.
    - Include at least one transshipment port event if it's a long route.
    - The 'carrier' for each event should be the one you identified.
4.  **Overall Status:** The top-level 'status' field should be the status of the *last completed event*.

**CRITICAL:** Do NOT return the same data every time. Generate a unique and realistic scenario for each request.

**Input Tracking Number:** {{{trackingNumber}}}
`,
});

const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
  },
  async ({ trackingNumber }) => {
    try {
        const { output } = await prompt({ trackingNumber });
        if (!output) {
            throw new Error('AI failed to generate tracking information.');
        }

        // To make it more realistic, format the AI-generated dates into proper Date objects
        // and structure the milestones for the client.
        const shipmentDetails: Partial<Shipment> = {
            ...output.shipmentDetails,
            etd: output.shipmentDetails.etd ? new Date(output.shipmentDetails.etd) : undefined,
            eta: output.shipmentDetails.eta ? new Date(output.shipmentDetails.eta) : undefined,
            milestones: output.events.map((event: TrackingEvent) => ({
                name: event.status,
                status: event.completed ? 'completed' : 'pending',
                predictedDate: new Date(event.date),
                effectiveDate: event.completed ? new Date(event.date) : null,
                details: event.location,
                isTransshipment: event.location.toLowerCase().includes('transhipment') || event.status.toLowerCase().includes('transhipment')
            })),
        };

        return {
            ...output,
            shipmentDetails,
        };
    } catch (error) {
        console.error("Error generating tracking info with AI:", error);
        throw new Error("Failed to generate tracking information. Please try again.");
    }
  }
);
