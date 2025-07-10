
'use server';
/**
 * @fileOverview A Genkit flow to fetch and merge shipment details from the correct carrier API.
 *
 * getBookingInfo - A function that fetches shipment info and merges it with an existing shipment object.
 * GetBookingInfoInput - The input type.
 * GetBookingInfoOutput - The return type (a full Shipment object).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment } from '@/lib/shipment';
import * as maerskService from '@/services/maersk-service';
import * as hapagLloydService from '@/services/hapag-lloyd-service';

const GetBookingInfoInputSchema = z.object({
  bookingNumber: z.string().describe('The carrier booking number or Master BL.'),
  carrier: z.string().describe('The carrier associated with the booking number (e.g., Maersk, MSC).'),
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
  async ({ bookingNumber, carrier, existingShipment }) => {
    console.log(`Fetching data for booking: ${bookingNumber} with carrier: ${carrier}`);
    
    let trackingResult;

    // Based on the detected carrier, call the appropriate service
    switch (carrier.toUpperCase()) {
      case 'MAERSK':
        trackingResult = await maerskService.getTracking(bookingNumber);
        break;
      case 'HAPAG-LLOYD':
        trackingResult = await hapagLloydService.getTracking(bookingNumber);
        break;
      default:
        // Fallback or throw an error if the carrier is not supported
        throw new Error(`Carrier '${carrier}' is not supported for automatic tracking.`);
    }

    const { shipmentDetails } = trackingResult;

    // Merge the fetched details into the existing shipment object
    // This preserves manually entered data like customer, partners, charges, etc.
    const updatedShipment: Shipment = {
      ...existingShipment, // Start with the existing data
      ...shipmentDetails, // Overwrite with all the new details from the API
    };

    return updatedShipment;
  }
);
