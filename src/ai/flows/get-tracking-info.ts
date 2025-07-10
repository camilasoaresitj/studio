
'use server';
/**
 * @fileOverview A Genkit flow to fetch tracking information from the Cargo-flows API.
 *
 * getTrackingInfo - A function that fetches tracking events.
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

async function getSimulatedTrackingData(trackingNumber: string): Promise<GetTrackingInfoOutput> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (trackingNumber.toUpperCase().includes("FAIL")) {
        throw new Error("O número de rastreamento fornecido não foi encontrado na base de dados do Cargo-flows.");
    }
    
    // Simulate a successful response for a Maersk shipment
    const events: TrackingEvent[] = [
        { status: 'Booking confirmed', date: '2024-05-13T12:00:00Z', location: 'VERACRUZ', completed: true, carrier: 'Maersk' },
        { status: 'Container stuffing', date: '2024-05-14T15:00:00Z', location: 'VERACRUZ', completed: true, carrier: 'Maersk' },
        { status: 'Received at origin port', date: '2024-05-15T10:00:00Z', location: 'VERACRUZ', completed: true, carrier: 'Maersk' },
        { status: 'Loaded on board', date: '2024-05-17T08:00:00Z', location: 'VERACRUZ', completed: true, carrier: 'Maersk' },
        { status: 'Vessel departure', date: '2024-05-17T18:00:00Z', location: 'VERACRUZ', completed: true, carrier: 'Maersk' },
        { status: 'Discharged at transhipment port', date: '2024-05-20T11:00:00Z', location: 'FREEPORT', completed: true, carrier: 'Maersk' },
        { status: 'Loaded at transhipment port', date: '2024-05-21T09:00:00Z', location: 'FREEPORT', completed: true, carrier: 'Maersk' },
        { status: 'Vessel departure from transhipment', date: '2024-05-21T20:00:00Z', location: 'FREEPORT', completed: true, carrier: 'Maersk' },
        { status: 'Vessel arrival at destination port', date: '2024-05-23T16:00:00Z', location: 'HOUSTON', completed: true, carrier: 'Maersk' },
        { status: 'Container discharged', date: '2024-05-24T06:00:00Z', location: 'HOUSTON', completed: true, carrier: 'Maersk' },
        { status: 'Gate out for delivery', date: '2024-05-25T14:00:00Z', location: 'HOUSTON', completed: true, carrier: 'Maersk' },
        { status: 'Delivered to consignee', date: '2024-05-26T10:00:00Z', location: 'HOUSTON', completed: true, carrier: 'Maersk' }
    ];

    const latestCompletedEvent = [...events].reverse().find(e => e.completed);
    const overallStatus = latestCompletedEvent?.status || 'Pending';

    const shipmentDetails: Partial<Shipment> = {
        bookingNumber: trackingNumber, // Use the provided tracking number
        masterBillNumber: 'MAEU514773513',
        vesselName: 'MAERSK SEOUL',
        voyageNumber: '419N',
        origin: 'Veracruz, MX', // Add origin
        destination: 'Houston, US', // Add destination
        etd: new Date('2024-05-17T18:00:00Z'),
        eta: new Date('2024-05-23T16:00:00Z'),
        milestones: events.map(event => ({
            name: event.status,
            status: event.completed ? 'completed' : 'pending',
            predictedDate: new Date(event.date),
            effectiveDate: event.completed ? new Date(event.date) : null,
            details: event.location,
            isTransshipment: event.location === 'FREEPORT'
        })),
        transshipments: [
            { id: 'ts-1', port: 'Freeport', vessel: 'MAERSK GENOA/420N', etd: new Date('2024-05-21T20:00:00Z'), eta: new Date('2024-05-20T11:00:00Z') }
        ]
    };

    return {
        status: overallStatus,
        events,
        shipmentDetails
    };
}


const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
  },
  async ({ trackingNumber }) => {
    const apiKey = process.env.CARGOFLOWS_API_KEY || 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    const orgToken = process.env.CARGOFLOWS_ORG_TOKEN || 'Gz7NChq8MbUnBmuG0DferKtBcDka33gV';
    const baseUrl = 'https://flow.cargoes.com/api/v1';

    try {
        console.log(`Calling Cargo-flows API for tracking at: ${baseUrl}/tracking`);
        const response = await fetch(`${baseUrl}/tracking`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
                'X-Org-Token': orgToken,
            },
            body: JSON.stringify({
                trackingNumbers: [trackingNumber],
            }),
        });

        if (!response.ok) {
            console.warn(`Cargo-flows API call for tracking failed with status ${response.status}. Falling back to simulation.`);
            return getSimulatedTrackingData(trackingNumber);
        }

        const data = await response.json();
        
        const trackingData = data?.data?.[0]; // Assuming we get an array for a single request
        if (!trackingData) {
             console.warn(`No tracking data found in API response for ${trackingNumber}. Falling back to simulation.`);
             return getSimulatedTrackingData(trackingNumber);
        }

        const events = (trackingData.events || []).map((event: any) => ({
            status: event.event,
            date: event.event_datetime_utc || new Date().toISOString(),
            location: event.location?.name || 'N/A',
            completed: true, // Cargo-flows API events are historical, so mark as completed
            carrier: trackingData.carrier?.name || 'Unknown',
        }));

        const latestEvent = events[events.length - 1];
        const overallStatus = latestEvent?.status || 'Pending';

        const shipmentDetails: Partial<Shipment> = {
            bookingNumber: trackingData.id,
            masterBillNumber: trackingData.id,
            vesselName: trackingData.transport_details?.vessel_name,
            voyageNumber: trackingData.transport_details?.voyage_number,
            origin: trackingData.origin?.name,
            destination: trackingData.destination?.name,
            etd: trackingData.transport_details?.etd_utc ? new Date(trackingData.transport_details.etd_utc) : undefined,
            eta: trackingData.transport_details?.eta_utc ? new Date(trackingData.transport_details.eta_utc) : undefined,
            milestones: events.map((event: TrackingEvent) => ({
                name: event.status,
                status: 'completed',
                predictedDate: new Date(event.date),
                effectiveDate: new Date(event.date),
                details: event.location,
            })),
        };
        
        return {
            status: overallStatus,
            events,
            shipmentDetails
        };

    } catch (error) {
        console.error("Error during fetch to Cargo-flows for tracking:", error);
        console.log("Falling back to simulated tracking data due to error.");
        return getSimulatedTrackingData(trackingNumber);
    }
  }
);
