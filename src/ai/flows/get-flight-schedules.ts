
'use server';
/**
 * @fileOverview A Genkit flow to fetch flight schedules from the Cargo-flows service.
 *
 * getFlightSchedules - A function that fetches schedules.
 * GetFlightSchedulesInput - The input type for the function.
 * GetFlightSchedulesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { cargoFlowsService } from '@/services/schedule-service';

const GetFlightSchedulesInputSchema = z.object({
  origin: z.string().describe('The origin airport code (e.g., GRU).'),
  destination: z.string().describe('The destination airport code (e.g., MIA).'),
});
export type GetFlightSchedulesInput = z.infer<typeof GetFlightSchedulesInputSchema>;

const FlightScheduleSchema = z.object({
  flightNumber: z.string(),
  carrier: z.string(),
  etd: z.string(),
  eta: z.string(),
  transitTime: z.string(),
  aircraft: z.string(),
});

const GetFlightSchedulesOutputSchema = z.array(FlightScheduleSchema);
export type GetFlightSchedulesOutput = z.infer<typeof GetFlightSchedulesOutputSchema>;

export async function getFlightSchedules(input: GetFlightSchedulesInput): Promise<GetFlightSchedulesOutput> {
  return getFlightSchedulesFlow(input);
}

const getFlightSchedulesFlow = ai.defineFlow(
  {
    name: 'getFlightSchedulesFlow',
    inputSchema: GetFlightSchedulesInputSchema,
    outputSchema: GetFlightSchedulesOutputSchema,
  },
  async ({ origin, destination }) => {
    const apiKey = process.env.CARGOFLOWS_API_KEY || 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    const orgToken = process.env.CARGOFLOWS_ORG_TOKEN || '9H31zRWYCGihV5U3th5JJXZI3h7LGen6';
    const baseUrl = 'https://flow.cargoes.com/api/v1';

    try {
        console.log(`Calling Cargo-flows API at: ${baseUrl}/schedules/flight?origin=${origin}&destination=${destination}`);
        
        const response = await fetch(`${baseUrl}/schedules/flight?origin=${origin}&destination=${destination}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
            'X-Org-Token': orgToken,
          },
        });
        
        if (!response.ok) {
           console.warn(`Cargo-flows API call failed with status ${response.status}. Falling back to simulation.`);
          return cargoFlowsService.getSimulatedFlightSchedules();
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error during fetch to Cargo-flows for flight schedules:", error);
        console.log("Falling back to simulated flight schedules due to error.");
        return cargoFlowsService.getSimulatedFlightSchedules();
    }
  }
);
