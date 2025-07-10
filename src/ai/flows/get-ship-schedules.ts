
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
import { cargoFlowsService } from '@/services/schedule-service';

const GetVesselSchedulesInputSchema = z.object({
  origin: z.string().describe('The origin port code (e.g., CNSHA).'),
  destination: z.string().describe('The destination port code (e.g., BRSSZ).'),
});
export type GetVesselSchedulesInput = z.infer<typeof GetVesselSchedulesInputSchema>;

const VesselScheduleSchema = z.object({
  vesselName: z.string(),
  voyage: z.string(),
  carrier: z.string(),
  etd: z.string(),
  eta: z.string(),
  transitTime: z.string(),
});

const GetVesselSchedulesOutputSchema = z.array(VesselScheduleSchema);
export type GetVesselSchedulesOutput = z.infer<typeof GetVesselSchedulesOutputSchema>;

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
    const apiKey = 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    const orgToken = '9H31zRWYCGihV5U3th5JJXZI3h7LGen6';
    const baseUrl = 'https://flow.cargoes.com/api/v1';

    try {
        console.log(`Calling Cargo-flows API at: ${baseUrl}/schedules/vessel?origin=${origin}&destination=${destination}`);
        
        const response = await fetch(`${baseUrl}/schedules/vessel?origin=${origin}&destination=${destination}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Org-Token': orgToken,
          },
        });

        if (!response.ok) {
          console.warn(`Cargo-flows API call failed with status ${response.status}. Falling back to simulation.`);
          return cargoFlowsService.getSimulatedVesselSchedules();
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error during fetch to Cargo-flows for vessel schedules:", error);
        console.log("Falling back to simulated vessel schedules due to error.");
        return cargoFlowsService.getSimulatedVesselSchedules();
    }
  }
);

    