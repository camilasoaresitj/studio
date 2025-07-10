'use server';
/**
 * @fileOverview A Genkit flow to fetch full shipment details using a booking number from the Cargo-flows service.
 *
 * getBookingInfo - A function that fetches shipment info.
 * GetBookingInfoInput - The input type.
 * GetBookingInfoOutput - The return type (a full Shipment object).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment } from '@/lib/shipment';
import { getTrackingInfo } from '@/ai/flows/get-tracking-info';

const GetBookingInfoOutputSchema = z.any();

const GetBookingInfoInputSchema = z.object({
  bookingNumber: z.string().describe('The carrier booking number.'),
  carrier: z.string().describe('The carrier associated with the booking number (e.g., Maersk, MSC).'),
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
    outputSchema: GetBookingInfoOutputSchema,
  },
  async ({ bookingNumber, carrier }) => {
    console.log(`Fetching real carrier data from Cargo-flows for booking: ${bookingNumber} with carrier: ${carrier}`);
    
    // Cargo-flows tracking result provides all the necessary details
    const trackingResult = await getTrackingInfo({ trackingNumber: bookingNumber });
    
    const { 
        id, 
        origin, 
        destination, 
        vesselName, 
        voyageNumber, 
        events 
    } = trackingResult;

    // Use the tracking events to create milestones
    const milestones = events.map(event => ({
        name: event.status,
        status: event.completed ? 'completed' as const : 'pending' as const,
        predictedDate: new Date(event.date),
        effectiveDate: event.completed ? new Date(event.date) : null,
        details: event.location,
    }));

    // Find ETD and ETA from events
    const etdEvent = events.find(e => e.status.toLowerCase().includes('departure'));
    const etaEvent = [...events].reverse().find(e => e.status.toLowerCase().includes('arrival'));

    const shipmentDetails: Partial<Shipment> = {
        id,
        origin,
        destination,
        bookingNumber: id,
        masterBillNumber: id, // Assume BL is same as booking for this simulation
        vesselName,
        voyageNumber,
        etd: etdEvent ? new Date(etdEvent.date) : undefined,
        eta: etaEvent ? new Date(etaEvent.date) : undefined,
        milestones
    };
    
    const baseShipment: Shipment = {
      id: `PROC-${bookingNumber.slice(-6)}`,
      customer: 'Cliente a ser definido',
      overseasPartner: { 
        id: 0, name: 'Parceiro a ser definido', nomeFantasia: 'Parceiro', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false },
        address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
        contacts: []
      },
      charges: [],
      details: { cargo: 'Detalhes da Carga', transitTime: 'A definir', validity: '', freeTime: '', incoterm: 'FOB' },
      milestones: [],
      origin: 'Desconhecida',
      destination: 'Desconhecida',
    };

    const finalShipment: Shipment = {
        ...baseShipment,
        ...shipmentDetails, 
        id: shipmentDetails.id || baseShipment.id,
        details: {
            ...baseShipment.details,
            cargo: trackingResult.carrier === 'Aéreo' ? 'Carga Aérea' : 'FCL Container'
        }
    };

    return finalShipment;
  }
);
