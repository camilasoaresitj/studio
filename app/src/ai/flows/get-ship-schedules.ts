
'use server';
/**
 * @fileOverview A Genkit flow to fetch vessel schedules from the Cargo-flows service.
 *
 * getVesselSchedules - A function that fetches schedules.
 * GetVesselSchedulesInput - The input type for the function.
 * GetVesselSchedulesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';

const GetVesselSchedulesInputSchema = z.object({
  origin: z.string().describe('The origin port code (e.g., CNSHA).'),
  destination: z.string().describe('The destination port code (e.g., BRSSZ).'),
});
type GetVesselSchedulesInput = z.infer<typeof GetVesselSchedulesInputSchema>;

const VesselScheduleSchema = z.object({
  vesselName: z.string(),
  voyage: z.string(),
  carrier: z.string(),
  etd: z.string(),
  eta: z.string(),
  transitTime: z.string(),
});

const GetVesselSchedulesOutputSchema = z.array(VesselScheduleSchema);
type GetVesselSchedulesOutput = z.infer<typeof GetVesselSchedulesOutputSchema>;

export async function getVesselSchedules(input: GetVesselSchedulesInput): Promise<GetVesselSchedulesOutput> {
  return getVesselSchedulesFlow(input);
}

const getVesselSchedulesFlow = ai.defineFlow(
  {
    name: 'getVesselSchedulesFlow',
    inputSchema: GetVesselSchedulesInputSchema,
    outputSchema: GetVesselSchedulesOutputSchema,
  },
  async ({ origin, destination }) => {
    const cargoFlowsApiKey = process.env.CARGOFLOWS_API_KEY;
    const cargoFlowsOrgToken = process.env.CARGOFLOWS_ORG_TOKEN;

    if (!cargoFlowsApiKey || !cargoFlowsOrgToken) {
      throw new Error('Cargo-flows API credentials are not configured.');
    }

    const today = new Date();
    const startDate = format(today, 'yyyy-MM-dd');
    const endDate = format(addDays(today, 30), 'yyyy-MM-dd');

    const url = `https://connect.cargoes.com/flow/api/public_tracking/v1/schedules?scheduleType=port&originPort=${origin}&destinationPort=${destination}&startDate=${startDate}&endDate=${endDate}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-DPW-ApiKey': cargoFlowsApiKey,
                'X-DPW-Org-Token': cargoFlowsOrgToken,
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Cargo-flows API Error (${response.status}): ${errorBody}`);
        }
        
        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
            return [];
        }

        return data.map((schedule: any) => {
            const etd = new Date(schedule.etd);
            const eta = new Date(schedule.eta);
            const transitTime = differenceInDays(eta, etd);

            return {
                vesselName: schedule.vesselName,
                voyage: schedule.voyageNumber,
                carrier: schedule.carrierName,
                etd: format(etd, 'yyyy-MM-dd'),
                eta: format(eta, 'yyyy-MM-dd'),
                transitTime: `${transitTime} dias`,
            };
        });

    } catch (error: any) {
        console.error("Error fetching vessel schedules from Cargo-flows:", error.message);
        // Return empty array on failure so the UI can handle it gracefully.
        return [];
    }
  }
);
