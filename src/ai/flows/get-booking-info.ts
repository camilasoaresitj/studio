'use server';
/**
 * @fileOverview A Genkit flow to fetch full shipment details using a booking number.
 *
 * getBookingInfo - A function that fetches shipment info.
 * GetBookingInfoInput - The input type.
 * GetBookingInfoOutput - The return type (a full Shipment object).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment } from '@/lib/shipment';
import * as maersk from '@/services/maersk-service';
import * as hapag from '@/services/hapag-lloyd-service';

// Using z.any() for the schema because the full Shipment type is complex and defined on the client side.
// The wrapper function provides the strong typing.
const GetBookingInfoOutputSchema = z.any();

const GetBookingInfoInputSchema = z.object({
  bookingNumber: z.string().describe('The carrier booking number.'),
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
  async ({ bookingNumber }) => {
    console.log(`Fetching real carrier data for booking: ${bookingNumber}`);
    
    let shipmentDetails: Partial<Shipment> = {};

    const upperCaseBookingNumber = bookingNumber.toUpperCase();
    // Route to the correct carrier service based on number format
    if (upperCaseBookingNumber.startsWith('MSCU') || upperCaseBookingNumber.startsWith('MAEU') || /^\d{9}$/.test(upperCaseBookingNumber)) {
        const maerskResult = await maersk.getTracking(upperCaseBookingNumber);
        shipmentDetails = maerskResult.shipmentDetails;
    } else {
        // Here you could add logic for other carriers, like Hapag-Lloyd
        // For now, we throw an error if the format is unrecognized.
        throw new Error(`Formato de booking/contêiner não reconhecido: ${bookingNumber}. A integração real só funciona para Maersk.`);
    }

    // The API gives us partial data. We need to create a full Shipment object.
    // In a real app, you'd merge this with data from your database (e.g., from the approved quote).
    // Here, we create a base object with placeholders and merge the API data on top.
    const baseShipment: Shipment = {
      id: `PROC-${bookingNumber.slice(-6)}`,
      customer: 'Cliente a ser definido',
      overseasPartner: { 
        id: 0, name: 'Parceiro a ser definido', nomeFantasia: 'Parceiro', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false },
        address: { street: '', number: '', complement: '', district: '', city: '', state: '', zip: '', country: '' },
        contacts: []
      },
      charges: [],
      details: { cargo: 'Detalhes da Carga', transitTime: 'A definir', validity: '', freeTime: '' },
      milestones: [],
      // Default values below will be overwritten by shipmentDetails if available
      origin: 'Desconhecida',
      destination: 'Desconhecida',
    };

    const finalShipment: Shipment = {
        ...baseShipment,
        ...shipmentDetails, // Overwrite defaults with real data
        id: shipmentDetails.id || baseShipment.id, // Prioritize ID from carrier
    };

    return finalShipment;
  }
);
