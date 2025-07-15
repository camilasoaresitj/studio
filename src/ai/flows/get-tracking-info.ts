
'use server';
/**
 * @fileOverview A Genkit flow to generate tracking information using the Cargo-flows API, with an AI model as fallback.
 *
 * getTrackingInfo - A function that generates tracking events.
 * GetTrackingInfoInput - The input type for the function.
 * GetTrackingInfoOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Shipment, TrackingEvent } from '@/lib/shipment';

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
  effectiveReturnDate: z.date().optional().describe("The date the empty container was actually returned."),
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

const generateTrackingInfoWithAI = ai.definePrompt({
    name: 'generateTrackingInfoPrompt',
    input: { schema: GetTrackingInfoInputSchema },
    output: { schema: GetTrackingInfoOutputSchema },
    prompt: `You are an expert logistics AI that generates realistic shipment tracking data.
Given a tracking number and a specific carrier, you will create a plausible history of tracking events and shipment details.

**Instructions:**
1.  **Use the Provided Carrier:** All generated data (vessel names, voyage numbers, events) must be consistent with the provided carrier: {{{carrier}}}.
2.  **Generate Shipment Details:** Create realistic shipment details for this carrier.
    - **vesselName/voyageNumber:** Invent a plausible vessel name and voyage number suitable for the carrier (e.g., "MAERSK PICO / 428N" for Maersk).
    - **origin/destination:** Create a realistic long-haul route (e.g., a port in Asia to a port in South America).
    - **etd/eta:** Generate realistic ETD and ETA dates that are about 30-40 days apart.
    - **masterBillNumber:** Should be the same as the input tracking number.
3.  **Generate Container Details:**
    - Create details for one or more containers.
    - **number**: Must be a valid format for the specified carrier (e.g., MSCU1234567 for MSC).
    - **seal**: Invent a seal number.
    - **tare/grossWeight**: Provide realistic weights in KG.
    - **freeTime**: Provide a standard free time (e.g., '14 dias').
4.  **Generate Tracking Events:** Create a sequence of 8-12 logical tracking events, from "Booking Confirmed" to "Delivered".
    - Events must be in chronological order.
    - A portion of the events should be marked as \`completed: true\`, and the rest \`completed: false\`.
    - The dates should be logical and span the time between ETD and ETA.
    - The 'carrier' for each event should be the one you were given.
    - Use standard logistics terminology for the events (e.g., "Container Gated In", "Loaded on Vessel", "Vessel Departure", "Discharged at Destination", "Customs Clearance").
5.  **Overall Status:** The top-level 'status' field should be the status of the *last completed event*.

**CRITICAL:** Do NOT return the same data every time. Generate a unique and realistic scenario for each request.

**Input Tracking Number:** {{{trackingNumber}}}
**Input Carrier:** {{{carrier}}}
`,
});

// Tool to create a shipment for tracking on Cargo-flows
const createShipmentInCargoFlows = ai.defineTool(
    {
        name: 'createShipmentInCargoFlows',
        description: 'Registers a shipment with the Cargo-flows API to begin tracking.',
        inputSchema: z.object({
            bookingNumber: z.string(),
            carrierCode: z.string().describe("The carrier's master code, e.g., 'maeu' for Maersk.")
        }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() }),
    },
    async (input) => {
        const apiKey = process.env.CARGOFLOWS_API_KEY;
        const orgToken = process.env.CARGOFLOWS_ORG_TOKEN;
        const baseUrl = 'https://connect.cargoes.com/flow/api/public_tracking/v1';

        const payload = {
            formData: [{
                bookingNumber: input.bookingNumber,
                uploadType: "FORM_BY_BOOKING_NUMBER",
                carrierCode: input.carrierCode,
            }]
        };

        const response = await fetch(`${baseUrl}/createShipment`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-DPW-ApiKey': apiKey!,
                'X-DPW-Org-Token': orgToken!,
            },
            body: JSON.stringify(payload)
        });
        
        const responseData = await response.json();

        if (!response.ok) {
            console.error('Cargo-flows createShipment Error:', responseData);
            throw new Error(responseData.error?.message || `Failed to create shipment: ${response.statusText}`);
        }
        
        return { success: true, message: `Shipment ${input.bookingNumber} successfully registered for tracking.` };
    }
);


const getCarrierCode = (carrierName: string): string | null => {
    const name = carrierName.toLowerCase();
    const mapping: { [key: string]: string } = {
        'maersk': 'maeu',
        'msc': 'msc',
        'cma cgm': 'cma',
        'hapag-lloyd': 'hls',
        'evergreen': 'egl',
        'one': 'one',
        'cosco': 'cos',
        'zim': 'zim',
        'oocl': 'ool',
        'hmm': 'hmm',
        'yang ming': 'yml',
    };

    for (const key in mapping) {
        if (name.includes(key)) {
            return mapping[key];
        }
    }
    return null;
};


const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
    tools: [createShipmentInCargoFlows]
  },
  async (input) => {
    const cargoFlowsApiKey = process.env.CARGOFLOWS_API_KEY;
    const cargoFlowsOrgToken = process.env.CARGOFLOWS_ORG_TOKEN;
    const baseUrl = 'https://connect.cargoes.com/flow/api/public_tracking/v1';

    if (cargoFlowsApiKey && cargoFlowsOrgToken) {
        try {
            // Step 1: Get Carrier Code
            const carrierCode = getCarrierCode(input.carrier);
            if (!carrierCode) {
                 throw new Error(`Carrier code not found for '${input.carrier}'. Unable to register shipment.`);
            }

            // Step 2: Register the shipment for tracking
            const registrationResult = await createShipmentInCargoFlows({
                bookingNumber: input.trackingNumber,
                carrierCode: carrierCode,
            });
            if (!registrationResult.success) {
                throw new Error(registrationResult.message);
            }
            console.log(registrationResult.message);
            
            // Add a small delay to allow the system to process the creation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 3: Fetch the tracking data
            console.log(`Attempting to fetch tracking from Cargo-flows API for: ${input.trackingNumber}`);
            
            const response = await fetch(`${baseUrl}/shipments?shipmentId=${input.trackingNumber}&shipmentType=INTERMODAL_SHIPMENT`, {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'X-DPW-ApiKey': cargoFlowsApiKey,
                    'X-DPW-Org-Token': cargoFlowsOrgToken,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Check if the response is JSON or a plain text/HTML error
                let errorMessage = `Cargo-flows API Error (${response.status})`;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage = errorJson.error?.message || errorJson.message || JSON.stringify(errorJson);
                } catch (jsonError) {
                    errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            const trackingData = data?.data?.[0]; // Correctly access nested data
            const hasEvents = trackingData && trackingData.events && trackingData.events.length > 0;
            
            if (hasEvents) {
              console.log("Cargo-flows API call successful. Processing real data.");
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
            console.log("Cargo-flows API call successful, but no tracking events were returned in the response. Falling back to AI.");
        } catch (error) {
            console.warn("Cargo-flows API call failed, falling back to AI simulation. Error:", error);
        }
    }


    // --- Final Fallback: AI Simulation ---
    console.log("Fallback: Generating tracking info with AI for carrier:", input.carrier);
    try {
        const { output } = await generateTrackingInfoWithAI(input);
        if (!output) {
            throw new Error('AI failed to generate tracking information.');
        }

        const shipmentDetails: Partial<Shipment> = {
            ...output.shipmentDetails,
            carrier: input.carrier,
            etd: output.shipmentDetails.etd ? new Date(output.shipmentDetails.etd) : undefined,
            eta: output.shipmentDetails.eta ? new Date(output.shipmentDetails.eta) : undefined,
            containers: output.containers,
            milestones: output.events.map((event: TrackingEvent) => ({
                name: event.status,
                status: event.completed ? 'completed' : 'pending',
                predictedDate: new Date(event.date),
                effectiveDate: event.completed ? new Date(event.date) : null,
                details: event.location,
                isTransshipment: event.location.toLowerCase().includes('transhipment') || event.status.toLowerCase().includes('transhipment')
            })),
        };

        return {
            ...output,
            shipmentDetails,
        };
    } catch (error) {
        console.error("Error generating tracking info with AI:", error);
        throw new Error("Failed to generate tracking information. Please try again.");
    }
  }
);
