
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
    // This integration is currently unavailable.
    console.log("Vessel schedules are not available at this time.");
    return [];
  }
);
