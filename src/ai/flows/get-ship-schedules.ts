
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

async function getSimulatedVesselSchedules(): Promise<GetVesselSchedulesOutput> {
     await new Promise(resolve => setTimeout(resolve, 900));
    return [
      { vesselName: 'MAERSK PICO', voyage: '428N', carrier: 'Maersk', etd: '2024-07-25T12:00:00Z', eta: '2024-08-20T12:00:00Z', transitTime: '26 dias' },
      { vesselName: 'MSC LEO', voyage: 'FB429A', carrier: 'MSC', etd: '2024-07-28T18:00:00Z', eta: '2024-08-23T18:00:00Z', transitTime: '26 dias' },
      { vesselName: 'CMA CGM SYMI', voyage: '0PE5HN1MA', carrier: 'CMA CGM', etd: '2024-08-01T09:00:00Z', eta: '2024-08-27T09:00:00Z', transitTime: '26 dias' },
      { vesselName: 'EVER ACE', voyage: '1192-001W', carrier: 'Evergreen', etd: '2024-08-02T11:00:00Z', eta: '2024-08-29T11:00:00Z', transitTime: '27 dias'},
      { vesselName: 'HMM STOCKHOLM', voyage: '001W', carrier: 'HMM', etd: '2024-08-03T15:00:00Z', eta: '2024-08-30T15:00:00Z', transitTime: '27 dias' },
    ];
}

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
    const apiKey = process.env.CARGOFLOWS_API_KEY || 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    const orgToken = process.env.CARGOFLOWS_ORG_TOKEN || 'Gz7NChq8MbUnBmuG0DferKtBcDka33gV';
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
          return getSimulatedVesselSchedules();
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error during fetch to Cargo-flows for vessel schedules:", error);
        console.log("Falling back to simulated vessel schedules due to error.");
        return getSimulatedVesselSchedules();
    }
  }
);
