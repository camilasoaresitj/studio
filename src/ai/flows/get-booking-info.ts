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

    // For this simulation, if the booking number is a specific value, return a complete mocked shipment.
    if (bookingNumber.toUpperCase() !== 'BKG123456') {
      throw new Error(`Booking number "${bookingNumber}" not found.`);
    }

    const etd = subDays(new Date(), 2);
    const eta = addDays(new Date(), 15);

    const milestones: Milestone[] = [
        { name: 'Confirmação de Booking', status: 'completed', predictedDate: subDays(new Date(), 9), effectiveDate: subDays(new Date(), 9), isTransshipment: false },
        { name: 'Coleta da Carga', status: 'completed', predictedDate: subDays(new Date(), 6), effectiveDate: subDays(new Date(), 7), isTransshipment: false },
        { name: 'Chegada no Porto/Aeroporto de Origem', status: 'completed', predictedDate: subDays(new Date(), 4), effectiveDate: subDays(new Date(), 5), isTransshipment: false },
        { name: 'Embarque', status: 'completed', details: 'MAERSK PICO / 428N', predictedDate: subDays(new Date(), 2), effectiveDate: subDays(new Date(), 2), isTransshipment: false },
        { name: 'Chegada no Porto/Aeroporto de Destino', status: 'in_progress', details: 'ROTTERDAM', predictedDate: addDays(new Date(), 15), effectiveDate: null, isTransshipment: false },
        { name: 'Desembaraço Aduaneiro', status: 'pending', predictedDate: addDays(new Date(), 17), effectiveDate: null, isTransshipment: false },
        { name: 'Carga Liberada', status: 'pending', predictedDate: addDays(new Date(), 19), effectiveDate: null, isTransshipment: false },
        { name: 'Entrega Final', status: 'pending', predictedDate: addDays(new Date(), 21), effectiveDate: null, isTransshipment: false },
    ];


    const mockedShipment: Shipment = {
      id: `PROC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      origin: 'Santos, BR',
      destination: 'Roterdã, NL',
      customer: 'Nexus Imports',
      overseasPartner: {
        id: 1, name: 'EuroExports BV', nomeFantasia: 'EuroExports', roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
        address: { street: 'Main Street', number: '1', complement: '', district: 'Downtown', city: 'Rotterdam', state: 'ZH', zip: '3011', country: 'Netherlands' },
        contacts: [{ name: 'Hans Zimmer', email: 'hans@euro.com', phone: '31101234567', departments: ['Comercial'] }]
      },
      agent: undefined,
      charges: [
        { id: 'ch1', name: 'Frete Marítimo', type: 'Por Contêiner', cost: 2500, costCurrency: 'USD', sale: 2800, saleCurrency: 'USD', supplier: 'Maersk Line' },
        { id: 'ch2', name: 'THC', type: 'Por Contêiner', cost: 1350, costCurrency: 'BRL', sale: 1350, saleCurrency: 'BRL', supplier: 'Porto de Roterdã' },
      ],
      details: { cargo: "1x40'HC", transitTime: '25-30 dias', validity: '31/12/2024', freeTime: '14 dias', incoterm: 'FOB' },
      milestones,
      bookingNumber: 'BKG123456',
      vesselName: 'MAERSK PICO',
      voyageNumber: '428N',
      masterBillNumber: 'MAEU123456789',
      houseBillNumber: 'MYHBL987654321',
      etd,
      eta,
      containers: [{
          id: 'cont-MAEU1234567',
          number: 'MAEU1234567',
          seal: 'ML-BR123456',
          tare: '2200 KG',
          grossWeight: '18500 KG',
          freeTime: '14 dias'
      }],
      commodityDescription: 'Peças Automotivas',
      ncm: '8708.99.90',
      netWeight: '16300 KG',
      packageQuantity: '1x40HC',
      freeTimeDemurrage: '14 dias',
      transshipments: [],
    };

    return mockedShipment;
  }
);
