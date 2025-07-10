
'use server';
/**
 * @fileOverview A Genkit flow to fetch and merge shipment details.
 *
 * getBookingInfo - A function that fetches shipment info and merges it with an existing shipment object.
 * GetBookingInfoInput - The input type.
 * GetBookingInfoOutput - The return type (a full Shipment object).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment } from '@/lib/shipment';
import { getTrackingInfo } from './get-tracking-info';

const GetBookingInfoInputSchema = z.object({
  bookingNumber: z.string().describe('The carrier booking number or Master BL.'),
  existingShipment: z.any().describe('The existing shipment object to merge the fetched data into.'),
});
export type GetBookingInfoInput = z.infer<typeof GetBookingInfoInputSchema>;
export type GetBookingInfoOutput = Shipment;

export async function getBookingInfo(input: GetBookingInfoInput): Promise<GetBookingInfoOutput> {
  return getBookingInfoFlow(input);
}

const getBookingInfoFlow = ai.defineFlow(
  {
    name: 'getBookingInfoFlow',
    inputSchema: GetBookingInfoInputSchema,
    outputSchema: z.any(),
  },
  async ({ bookingNumber, existingShipment }) => {
    console.log(`Fetching tracking data for booking: ${bookingNumber}`);
    
    // Call the unified tracking flow
    const trackingResult = await getTrackingInfo({ trackingNumber: bookingNumber });

    const shipmentDetails = trackingResult.shipmentDetails || {};

    // Merge the fetched details into the existing shipment object.
    // This preserves manually entered data like customer, partners, charges, etc.,
    // and only overwrites the fields that come from the tracking API.
    const updatedShipment: Shipment = {
      ...existingShipment,
      ...shipmentDetails, // This will overwrite fields like vesselName, voyageNumber, etd, eta, milestones, etc.
      id: existingShipment.id, // Ensure the original ID is preserved
      customer: existingShipment.customer, // Explicitly preserve customer
      overseasPartner: existingShipment.overseasPartner, // Explicitly preserve partner
      agent: existingShipment.agent, // Explicitly preserve agent
      charges: existingShipment.charges, // Explicitly preserve charges
    };

    return updatedShipment;
  }
);
