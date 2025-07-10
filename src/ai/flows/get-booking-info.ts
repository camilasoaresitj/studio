
'use server';
/**
 * @fileOverview A Genkit flow to fetch and merge shipment details using a tracking number from the Cargo-flows service.
 *
 * getBookingInfo - A function that fetches shipment info and merges it with an existing shipment object.
 * GetBookingInfoInput - The input type.
 * GetBookingInfoOutput - The return type (a full Shipment object).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment, Milestone } from '@/lib/shipment';
import { getTrackingInfo } from '@/ai/flows/get-tracking-info';

// The input now includes the existing shipment object to merge data into.
const GetBookingInfoInputSchema = z.object({
  bookingNumber: z.string().describe('The carrier booking number or Master BL.'),
  carrier: z.string().describe('The carrier associated with the booking number (e.g., Maersk, MSC).'),
  existingShipment: z.any().describe('The existing shipment object to merge the fetched data into.'),
});
export type GetBookingInfoInput = z.infer<typeof GetBookingInfoInputSchema>;
export type GetBookingInfoOutput = Shipment; // Export the actual TypeScript type for the action.

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
    console.log(`Fetching real carrier data for booking: ${bookingNumber} with carrier: ${carrier}`);
    
    const trackingResult = await getTrackingInfo({ trackingNumber });
    
    const { 
        id, 
        origin, 
        destination, 
        vesselName, 
        voyageNumber, 
        events 
    } = trackingResult;

    const milestones: Milestone[] = events.map(event => ({
        name: event.status,
        status: event.completed ? 'completed' as const : 'pending' as const,
        predictedDate: new Date(event.date),
        effectiveDate: event.completed ? new Date(event.date) : null,
        details: event.location,
    }));

    const etdEvent = events.find(e => e.status.toLowerCase().includes('departure') || e.status.toLowerCase().includes('embarque'));
    const etaEvent = [...events].reverse().find(e => e.status.toLowerCase().includes('arrival') || e.status.toLowerCase().includes('chegada'));

    // **CRITICAL CHANGE**: Merge fetched data into the existing shipment object
    // This preserves manually entered data like customer, partners, charges, etc.
    const updatedShipment: Shipment = {
      ...existingShipment, // Start with the existing data
      origin: origin, // Overwrite with fresh data from API
      destination: destination, // Overwrite with fresh data from API
      bookingNumber: id, // Overwrite with fresh data from API
      masterBillNumber: id, // Assume BL is same as booking for this simulation
      vesselName: vesselName, // Overwrite with fresh data from API
      voyageNumber: voyageNumber, // Overwrite with fresh data from API
      etd: etdEvent ? new Date(etdEvent.date) : existingShipment.etd, // Update if available
      eta: etaEvent ? new Date(etaEvent.date) : existingShipment.eta, // Update if available
      milestones, // Overwrite with the latest milestones
      details: { // Update details section
          ...existingShipment.details,
          cargo: trackingResult.carrier === 'Aéreo' ? 'Carga Aérea' : 'FCL Container',
      }
    };

    return updatedShipment;
  }
);
