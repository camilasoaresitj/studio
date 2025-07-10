
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
import * as maerskService from '@/services/maersk-service';
import * as hapagLloydService from '@/services/hapag-lloyd-service';
import { detectCarrierFromBooking } from './detect-carrier-from-booking';

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

const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
  },
  async ({ trackingNumber }) => {
    // 1. Detect the carrier from the tracking number format.
    const { carrier } = await detectCarrierFromBooking({ bookingNumber: trackingNumber });
    
    let trackingResult;
    let shipmentData;
    
    // 2. Call the appropriate carrier-specific service.
    switch (carrier.toUpperCase()) {
        case 'MAERSK':
            trackingResult = await maerskService.getTracking(trackingNumber);
            shipmentData = trackingResult.shipmentDetails;
            break;
        case 'HAPAG-LLOYD':
             trackingResult = await hapagLloydService.getTracking(trackingNumber);
             shipmentData = {
                id: trackingNumber,
                origin: trackingResult.events[0]?.location || 'Unknown',
                destination: [...trackingResult.events].reverse().find(e => e.location)?.location || 'Unknown',
                carrier: 'Hapag-Lloyd'
             };
            break;
        default:
            throw new Error(`A detecção automática de transportadora falhou ou a transportadora '${carrier}' não é suportada.`);
    }

    // 3. Format the result into the standardized GetTrackingInfoOutput.
    return {
        id: trackingNumber,
        status: trackingResult.status,
        origin: shipmentData.origin || 'Unknown',
        destination: shipmentData.destination || 'Unknown',
        vesselName: shipmentData.vesselName,
        voyageNumber: shipmentData.voyageNumber,
        carrier: carrier,
        events: trackingResult.events,
    };
  }
);
