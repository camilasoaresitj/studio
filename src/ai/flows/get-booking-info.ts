
'use server';
/**
 * @fileOverview A Genkit flow to fetch and merge shipment details.
 * THIS FLOW IS DEPRECATED AND SHOULD NOT BE USED.
 * Use getTrackingInfo directly and merge in the client.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment } from '@/lib/shipment';

const GetBookingInfoInputSchema = z.object({
  bookingNumber: z.string().describe('The carrier booking number or Master BL.'),
  existingShipment: z.any().describe('The existing shipment object to merge the fetched data into.'),
});
export type GetBookingInfoInput = z.infer<typeof GetBookingInfoInputSchema>;
export type GetBookingInfoOutput = Shipment;

export async function getBookingInfo(input: GetBookingInfoInput): Promise<GetBookingInfoOutput> {
  throw new Error("This flow is deprecated and should not be used. Use get-tracking-info and merge on the client-side.");
}

const getBookingInfoFlow = ai.defineFlow(
  {
    name: 'getBookingInfoFlow',
    inputSchema: GetBookingInfoInputSchema,
    outputSchema: z.any(),
  },
  async ({ bookingNumber, existingShipment }) => {
     throw new Error("This flow is deprecated and should not be used. Use get-tracking-info and merge on the client-side.");
  }
);
