'use server';
/**
 * @fileOverview A Genkit flow to fetch vessel schedules.
 *
 * getShipSchedules - A function that fetches schedules.
 * GetShipSchedulesInput - The input type for the function.
 * GetShipSchedulesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as scheduleService from '@/services/schedule-service';

const GetShipSchedulesInputSchema = z.object({
  origin: z.string().describe('The origin port.'),
  destination: z.string().describe('The destination port.'),
});
export type GetShipSchedulesInput = z.infer<typeof GetShipSchedulesInputSchema>;

const ScheduleSchema = z.object({
  vesselName: z.string(),
  voyage: z.string(),
  carrier: z.string(),
  etd: z.string(),
  eta: z.string(),
});

const GetShipSchedulesOutputSchema = z.array(ScheduleSchema);
export type GetShipSchedulesOutput = z.infer<typeof GetShipSchedulesOutputSchema>;

export async function getShipSchedules(input: GetShipSchedulesInput): Promise<GetShipSchedulesOutput> {
  return getShipSchedulesFlow(input);
}

const getShipSchedulesFlow = ai.defineFlow(
  {
    name: 'getShipSchedulesFlow',
    inputSchema: GetShipSchedulesInputSchema,
    outputSchema: GetShipSchedulesOutputSchema,
  },
  async ({ origin, destination }) => {
    const schedules = await scheduleService.getSchedules(origin, destination);
    return schedules;
  }
);
