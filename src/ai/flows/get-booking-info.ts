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
import { addDays, subDays } from 'date-fns';
import type { Shipment, Milestone } from '@/lib/shipment';

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
    // Simulate API call to carrier based on booking number
    console.log(`Simulating API call to fetch details for booking: ${bookingNumber}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // For this simulation, we return a complete mocked shipment for any booking number.
    // This allows the user to test the sync functionality.
    if (!bookingNumber) {
      throw new Error(`Booking number not provided.`);
    }

    const etd = subDays(new Date(), 5);
    const eta = addDays(new Date(), 8);

    const milestones: Milestone[] = [
        { name: 'Confirmação de Booking', status: 'completed', predictedDate: subDays(new Date(), 12), effectiveDate: subDays(new Date(), 12), isTransshipment: false },
        { name: 'Coleta da Carga', status: 'completed', predictedDate: subDays(new Date(), 9), effectiveDate: subDays(new Date(), 9), isTransshipment: false },
        { name: 'Chegada no Porto de Origem', status: 'completed', predictedDate: subDays(new Date(), 7), effectiveDate: subDays(new Date(), 7), isTransshipment: false },
        { name: 'Embarque', status: 'completed', details: 'MAERSK HOUSTON / 430S', predictedDate: subDays(new Date(), 5), effectiveDate: subDays(new Date(), 5), isTransshipment: false },
        { name: 'Chegada no Porto de Destino', status: 'in_progress', details: 'HOUSTON, TX, US', predictedDate: addDays(new Date(), 8), effectiveDate: null, isTransshipment: false },
        { name: 'Desembaraço Aduaneiro', status: 'pending', predictedDate: addDays(new Date(), 10), effectiveDate: null, isTransshipment: false },
        { name: 'Carga Liberada', status: 'pending', predictedDate: addDays(new Date(), 11), effectiveDate: null, isTransshipment: false },
        { name: 'Entrega Final', status: 'pending', predictedDate: addDays(new Date(), 13), effectiveDate: null, isTransshipment: false },
    ];


    const mockedShipment: Shipment = {
      id: `PROC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      origin: 'Veracruz, MX',
      destination: 'Houston, TX, US',
      customer: 'Nexus Imports', // This will be overwritten by the existing data in the sheet
      overseasPartner: { // This will be overwritten
        id: 1, name: 'EuroExports BV', nomeFantasia: 'EuroExports', roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
        address: { street: 'Main Street', number: '1', complement: '', district: 'Downtown', city: 'Rotterdam', state: 'ZH', zip: '3011', country: 'Netherlands' },
        contacts: [{ name: 'Hans Zimmer', email: 'hans@euro.com', phone: '31101234567', departments: ['Comercial'] }]
      },
      agent: undefined, // This will be overwritten
      charges: [], // This will be overwritten
      details: { cargo: "1x20'GP", transitTime: '13 dias', validity: '31/12/2024', freeTime: '7 dias', incoterm: 'FOB' },
      milestones,
      bookingNumber: bookingNumber,
      vesselName: 'MAERSK HOUSTON',
      voyageNumber: '430S',
      masterBillNumber: `MAEU${Math.floor(Math.random() * 900000000) + 100000000}`,
      houseBillNumber: `MYHBL${Math.floor(Math.random() * 90000000) + 10000000}`,
      etd,
      eta,
      containers: [{
          id: 'cont-MSCU1234567',
          number: 'MSCU1234567',
          seal: 'ML-MX54321',
          tare: '2150 KG',
          grossWeight: '20800 KG',
          freeTime: '7 dias livres no destino'
      }],
      commodityDescription: 'Equipamento Industrial',
      ncm: '8479.89.99',
      netWeight: '18650 KG',
      packageQuantity: "1x20'GP",
      freeTimeDemurrage: '7 dias',
      transshipments: [],
    };

    return mockedShipment;
  }
);
