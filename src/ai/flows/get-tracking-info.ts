
'use server';
/**
 * @fileOverview A Genkit flow to generate tracking information using the Maersk or Cargo-flows API, with an AI model as fallback.
 *
 * getTrackingInfo - A function that generates tracking events.
 * GetTrackingInfoInput - The input type for the function.
 * GetTrackingInfoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment, TrackingEvent } from '@/lib/shipment';
import { cargoFlowsService } from '@/services/schedule-service';


const GetTrackingInfoInputSchema = z.object({
  trackingNumber: z.string().describe('The tracking number (e.g., Bill of Lading, Container No, AWB).'),
  carrier: z.string().describe('The identified shipping carrier (e.g., Maersk, MSC).'),
});
export type GetTrackingInfoInput = z.infer<typeof GetTrackingInfoInputSchema>;

const TrackingEventSchema = z.object({
    status: z.string(),
    date: z.string(),
    location: z.string(),
    completed: z.boolean(),
    carrier: z.string(),
});

const ContainerDetailSchema = z.object({
  id: z.string(),
  number: z.string().describe("The full container number (e.g., MSUC1234567)."),
  seal: z.string().describe("The container's seal number."),
  tare: z.string().describe("The container's tare weight in kg (e.g., '2200 KG')."),
  grossWeight: z.string().describe("The container's gross weight in kg (e.g., '24000 KG')."),
  freeTime: z.string().optional().describe("The free time in days (e.g., '14 dias')."),
});

const GetTrackingInfoOutputSchema = z.object({
    status: z.string(),
    events: z.array(TrackingEventSchema),
    containers: z.array(ContainerDetailSchema).optional().describe("A list of containers associated with this shipment."),
    shipmentDetails: z.any().optional(), // Using any() for the partial shipment object
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
  async (input) => {
    const maerskApiKey = process.env.MAERSK_API_KEY;
    
    // --- Primary Method: Maersk Direct API ---
    if (input.carrier.toLowerCase().includes('maersk') && maerskApiKey && maerskApiKey !== '<SUA_CHAVE_AQUI>') {
        try {
            console.log(`Attempting to fetch tracking from Maersk API for: ${input.trackingNumber}`);
            const maerskResponse = await fetch(`https://api.maersk.com/v2/track/shipments-summary?trackingNumber=${input.trackingNumber}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${maerskApiKey}` }
            });
            
            if (!maerskResponse.ok) {
                const errorText = await maerskResponse.text();
                throw new Error(`Maersk API Error (${maerskResponse.status}): ${errorText}`);
            }

            const data = await maerskResponse.json();
            const shipment = data.shipments[0]; // Assuming we get at least one shipment

            if (shipment) {
                console.log("Maersk API call successful. Processing real data.");
                
                const events: TrackingEvent[] = (shipment.events || []).map((event: any) => ({
                    status: event.eventDescription || 'N/A',
                    date: event.eventDateTime,
                    location: `${event.eventLocation.cityName}, ${event.eventLocation.countryCode}`,
                    completed: new Date(event.eventDateTime) <= new Date(),
                    carrier: 'Maersk',
                }));

                const lastCompletedEvent = events.slice().reverse().find(e => e.completed) || events[events.length - 1];

                const shipmentDetails: Partial<Shipment> = {
                    carrier: 'Maersk',
                    origin: shipment.origin.locationName,
                    destination: shipment.destination.locationName,
                    vesselName: shipment.transportPlan.vessels[0]?.vesselName,
                    voyageNumber: shipment.transportPlan.vessels[0]?.voyageReference,
                    etd: shipment.transportPlan.events.find((e: any) => e.transportPlanEventTypeCode === 'ETD')?.eventDateTime ? new Date(shipment.transportPlan.events.find((e: any) => e.transportPlanEventTypeCode === 'ETD').eventDateTime) : undefined,
                    eta: shipment.transportPlan.events.find((e: any) => e.transportPlanEventTypeCode === 'ETA')?.eventDateTime ? new Date(shipment.transportPlan.events.find((e: any) => e.transportPlanEventTypeCode === 'ETA').eventDateTime) : undefined,
                    masterBillNumber: input.trackingNumber,
                    containers: shipment.containers?.map((c: any) => ({
                        id: c.containerNumber,
                        number: c.containerNumber,
                        seal: c.seals ? c.seals.join(', ') : 'N/A',
                        tare: `${c.tareWeight || 0} KG`,
                        grossWeight: `${c.grossWeight || 0} KG`,
                    })) || [],
                    milestones: events.map((event: TrackingEvent) => ({
                        name: event.status,
                        status: event.completed ? 'completed' : 'pending',
                        predictedDate: new Date(event.date),
                        effectiveDate: event.completed ? new Date(event.date) : null,
                        details: event.location,
                        isTransshipment: event.status.toLowerCase().includes('transhipment')
                    })),
                };

                return {
                    status: lastCompletedEvent?.status || 'Pending',
                    events,
                    containers: shipmentDetails.containers,
                    shipmentDetails: shipmentDetails,
                };
            }
             console.warn("Maersk API call successful, but no shipment data found. Falling back.");
        } catch (error) {
             console.warn("Maersk API call failed, falling back. Error:", error);
        }
    }


    // --- Fallback Method: Cargo-flows API ---
    const cargoFlowsApiKey = process.env.CARGOFLOWS_API_KEY;
    const cargoFlowsOrgToken = process.env.CARGOFLOWS_ORG_TOKEN;
    const baseUrl = 'https://flow.cargoes.com/api/v1';

    if (cargoFlowsApiKey && cargoFlowsOrgToken) {
        try {
            console.log(`Attempting to fetch tracking from Cargo-flows API for: ${input.trackingNumber}`);
            
            const carrierSlug = input.carrier.toLowerCase().replace(/[^a-z0-9]/g, '');

            const response = await fetch(`${baseUrl}/tracking/track`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Api-Key': cargoFlowsApiKey,
                    'X-Org-Token': cargoFlowsOrgToken,
                },
                body: JSON.stringify({
                    bookingNumber: input.trackingNumber,
                    carrier: carrierSlug
                }),
            });

            if (!response.ok) {
                // Now we explicitly throw the error message from the API
                const errorData = await response.json().catch(() => ({ message: `API returned status ${response.status}`}));
                throw new Error(`Cargo-flows API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
            }
            
            // Add a try-catch block specifically for the JSON parsing
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // This will catch the "Unexpected token <" error if the response is HTML
                throw new Error("A API retornou uma resposta inválida (não-JSON). Verifique o console do servidor para detalhes.");
            }
            
            if (data.tracking && data.tracking.events && data.tracking.events.length > 0) {
                console.log("Cargo-flows API call successful. Processing real data.");
                const trackingData = data.tracking;
                const events: TrackingEvent[] = trackingData.events.map((event: any) => ({
                    status: event.description || 'N/A',
                    date: event.timestamp,
                    location: event.location?.name || 'N/A',
                    completed: new Date(event.timestamp) <= new Date(),
                    carrier: input.carrier,
                }));

                const lastCompletedEvent = events.slice().reverse().find(e => e.completed) || events[events.length - 1];

                const shipmentDetails: Partial<Shipment> = {
                    carrier: input.carrier,
                    origin: trackingData.origin_port?.name || 'N/A',
                    destination: trackingData.destination_port?.name || 'N/A',
                    vesselName: trackingData.vessel_name,
                    voyageNumber: trackingData.voyage_number,
                    etd: trackingData.departure_date_estimated ? new Date(trackingData.departure_date_estimated) : undefined,
                    eta: trackingData.arrival_date_estimated ? new Date(trackingData.arrival_date_estimated) : undefined,
                    masterBillNumber: input.trackingNumber,
                    containers: trackingData.containers?.map((c: any) => ({
                        id: c.container_number,
                        number: c.container_number,
                        seal: c.seal_number || 'N/A',
                        tare: `${c.tare_weight || 0} KG`,
                        grossWeight: `${c.gross_weight || 0} KG`,
                    })) || [],
                    milestones: events.map((event: TrackingEvent) => ({
                        name: event.status,
                        status: event.completed ? 'completed' : 'pending',
                        predictedDate: new Date(event.date),
                        effectiveDate: event.completed ? new Date(event.date) : null,
                        details: event.location,
                        isTransshipment: event.status.toLowerCase().includes('transhipment')
                    })),
                };

                return {
                    status: lastCompletedEvent?.status || 'Pending',
                    events,
                    containers: shipmentDetails.containers,
                    shipmentDetails: shipmentDetails,
                };
            }
        } catch (error: any) {
            console.warn("Cargo-flows API call failed. Error:", error);
            // Re-throw the error to be caught by the final catch block.
            throw new Error(error.message || "Erro desconhecido ao chamar a API da Cargo-flows.");
        }
    }

    // --- Final Fallback: Error ---
    console.error("All APIs failed. No tracking data found.");
    throw new Error("Não foi possível obter os dados de rastreamento de nenhuma API. Verifique o número e o armador e tente novamente.");
  }
);
