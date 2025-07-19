
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
import type { Shipment, TrackingEvent, Milestone, ContainerDetail, TransshipmentDetail } from '@/lib/shipment';
import { findCarrierByName } from '@/lib/carrier-data';

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

// Helper function to process successful tracking data from Cargo-flows
const processTrackingData = (shipments: any[], carrierName: string): GetTrackingInfoOutput => {
  if (!shipments || shipments.length === 0) {
    return { status: 'No Data', events: [], containers: [] };
  }

  // Use the first shipment as the base for overall details
  const primaryShipment = shipments[0];
  const allEvents: TrackingEvent[] = [];
  const allContainers: ContainerDetail[] = [];
  const allTransshipments = new Map<string, TransshipmentDetail>();

  shipments.forEach(shipment => {
    // Collect all containers
    if (shipment.containerNumber) {
      allContainers.push({
        id: shipment.containerNumber,
        number: shipment.containerNumber,
        seal: shipment.containerSealNumber || 'N/A',
        tare: `${shipment.tare_weight || 0} KG`,
        grossWeight: `${shipment.totalWeight || 0} KG`,
        type: shipment.containerType || 'DRY',
      });
    }

    // Collect all events, avoiding duplicates
    (shipment.shipmentEvents || []).forEach((event: any) => {
      const eventKey = `${event.name}-${event.location}-${event.actualTime || event.estimateTime}`;
      if (!allEvents.some(e => `${e.status}-${e.location}-${e.date}` === eventKey)) {
        allEvents.push({
          status: event.name || 'N/A',
          date: event.actualTime || event.estimateTime,
          location: event.location || 'N/A',
          completed: !!event.actualTime,
          carrier: carrierName,
        });
      }
    });
    
    // Detect the primary shipment leg dynamically (portToPort, road, etc.)
    const mainLeg = primaryShipment.shipmentLegs?.portToPort || primaryShipment.shipmentLegs?.road || null;

    // Collect all transshipment ports, if applicable
    if (mainLeg?.segments) {
      mainLeg.segments
        .filter((seg: any) => seg.originPortCode !== mainLeg?.loadingPortCode && seg.destinationPortCode !== mainLeg?.dischargePortCode)
        .forEach((segment: any) => {
          const port = segment.origin || segment.originPortCode;
          if (port && !allTransshipments.has(port)) {
            allTransshipments.set(port, {
              id: port,
              port: port,
              vessel: segment.transportName || 'N/A',
              etd: segment.atd ? new Date(segment.atd) : undefined,
              eta: segment.ata ? new Date(segment.ata) : undefined,
            });
          }
      });
    }
  });

  // Sort events chronologically
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const lastCompletedEvent = allEvents.slice().reverse().find(e => e.completed) || allEvents[allEvents.length - 1];
  
  // Dynamically determine origin, destination, etc. based on the available leg
  const mainLeg = primaryShipment.shipmentLegs?.portToPort || primaryShipment.shipmentLegs?.road || {};

  const shipmentDetails: Partial<Shipment> = {
      carrier: carrierName,
      origin: mainLeg.loadingPort || mainLeg.origin || primaryShipment.originOceanPort || 'N/A',
      destination: mainLeg.dischargePort || mainLeg.destination || primaryShipment.destinationOceanPort || 'N/A',
      vesselName: mainLeg.currentTransportName || mainLeg.carrier || 'N/A',
      voyageNumber: mainLeg.currentTripNumber,
      etd: mainLeg.loadingPortAtd || mainLeg.atd ? new Date(mainLeg.loadingPortAtd || mainLeg.atd) : undefined,
      eta: mainLeg.dischargePortEta || mainLeg.ata ? new Date(mainLeg.dischargePortEta || mainLeg.ata) : undefined,
      masterBillNumber: primaryShipment.mblNumber,
      bookingNumber: primaryShipment.bookingNumber,
      containers: allContainers,
      transshipments: Array.from(allTransshipments.values()),
      milestones: allEvents.map((event: TrackingEvent): Milestone => ({
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
    events: allEvents,
    containers: allContainers,
    shipmentDetails: shipmentDetails,
  };
};

const getTrackingInfoFlow = ai.defineFlow(
  {
    name: 'getTrackingInfoFlow',
    inputSchema: GetTrackingInfoInputSchema,
    outputSchema: GetTrackingInfoOutputSchema,
  },
  async (input) => {
    const cargoFlowsApiKey = process.env.CARGOFLOWS_API_KEY;
    const cargoFlowsOrgToken = process.env.CARGOFLOWS_ORG_TOKEN;
    const baseUrl = 'https://connect.cargoes.com/flow/api/public_tracking/v1';

    if (cargoFlowsApiKey && cargoFlowsOrgToken) {
      try {
        const getShipmentUrl = `${baseUrl}/shipments?shipmentType=INTERMODAL_SHIPMENT&bookingNumber=${input.trackingNumber}&_limit=50`;
        
        const trackingResponse = await fetch(getShipmentUrl, {
          method: 'GET',
          headers: { 'accept': 'application/json', 'X-DPW-ApiKey': cargoFlowsApiKey, 'X-DPW-Org-Token': cargoFlowsOrgToken },
        });

        if (trackingResponse.ok) {
            const responseJson = await trackingResponse.json();
            const trackingDataArray = Array.isArray(responseJson) ? responseJson : responseJson?.data;

            if (trackingDataArray && trackingDataArray.length > 0) {
              return processTrackingData(trackingDataArray, input.carrier);
            }
        }

        const carrierInfo = findCarrierByName(input.carrier);
        if (!carrierInfo || !carrierInfo.scac) {
          throw new Error(`Carrier code not found for '${input.carrier}'. Unable to register shipment.`);
        }
        
        // CRITICAL VALIDATION: Check if carrier supports tracking by booking number
        const carrierDetailsResponse = await fetch(`${baseUrl}/carrierList`, { headers: { 'X-DPW-ApiKey': cargoFlowsApiKey, 'X-DPW-Org-Token': cargoFlowsOrgToken }});
        if(!carrierDetailsResponse.ok) throw new Error("Could not fetch carrier list from Cargo-flows.");
        
        const carriersList = await carrierDetailsResponse.json();
        const carrierDetails = carriersList.find((c: any) => c.carrierScac === carrierInfo.scac);
        
        if (carrierDetails && !carrierDetails.supportsTrackByBookingNumber) {
            throw new Error(`O armador ${input.carrier} não suporta rastreamento por Booking Number via esta API. Por favor, tente usar o número do Master BL.`);
        }
        
        const registrationPayload = {
          formData: [{
            uploadType: "FORM_BY_BOOKING_NUMBER",
            shipmentType: "INTERMODAL_SHIPMENT",
            bookingNumber: input.trackingNumber,
          }]
        };

        console.log('🧾 Enviando payload para Cargo-flows:', JSON.stringify(registrationPayload, null, 2));

        const regResponse = await fetch(`${baseUrl}/createShipments`, {
          method: 'POST',
          headers: { 'accept': 'application/json', 'Content-Type': 'application/json', 'X-DPW-ApiKey': cargoFlowsApiKey, 'X-DPW-Org-Token': cargoFlowsOrgToken },
          body: JSON.stringify(registrationPayload)
        });
        
        console.log('📥 Resposta Cargo-flows status:', regResponse.status);
        console.log('📥 Headers:', JSON.stringify(Object.fromEntries(regResponse.headers.entries())));
        const raw = await regResponse.text();
        console.log('📥 Body (raw):', raw);


        if (!regResponse.ok) {
          throw new Error(`Cargo-flows createShipment Error (${regResponse.status}): ${raw}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const finalTrackingResponse = await fetch(getShipmentUrl, {
            method: 'GET',
            headers: { 'accept': 'application/json', 'X-DPW-ApiKey': cargoFlowsApiKey, 'X-DPW-Org-Token': cargoFlowsOrgToken },
        });

        if (finalTrackingResponse.ok) {
          const finalDataJson = await finalTrackingResponse.json();
          const finalTrackingDataArray = Array.isArray(finalDataJson) ? finalDataJson : finalDataJson?.data;
          if (finalTrackingDataArray && finalTrackingDataArray.length > 0) {
              return processTrackingData(finalTrackingDataArray, input.carrier);
          }
        }
      } catch (error: any) {
        console.warn("Cargo-flows API workflow failed, falling back to AI simulation. Error:", error.message);
      }
    }

    // Fallback to AI if API fails or isn't configured
    console.log("Fallback: Generating tracking info with AI for carrier:", input.carrier);
    try {
        const { output } = await generateTrackingInfoWithAI(input);
        
        if (!output || !output.shipmentDetails) {
            // If AI fails, return a minimal, safe response to prevent crashes.
            return {
                status: 'Dados Simulados pela IA (API indisponível)',
                events: [{
                    status: 'Booking Confirmado (Simulado)',
                    date: new Date().toISOString(),
                    location: 'N/A',
                    completed: true,
                    carrier: input.carrier,
                }],
                containers: [],
                shipmentDetails: {
                    carrier: input.carrier,
                    origin: 'N/A',
                    destination: 'N/A',
                    masterBillNumber: input.trackingNumber,
                }
            };
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
