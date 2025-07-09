'use server';
/**
 * @fileOverview A simulated service for fetching vessel schedules.
 * In a real application, this would connect to a real-time schedule provider API.
 */

export type Schedule = {
    vesselName: string;
    voyage: string;
    carrier: string;
    etd: string; // ISO Date string
    eta: string; // ISO Date string
};

const MOCKED_SCHEDULES: Schedule[] = [
    { vesselName: 'MAERSK PICO', voyage: '428N', carrier: 'Maersk', etd: '2024-07-25T12:00:00Z', eta: '2024-08-20T12:00:00Z' },
    { vesselName: 'MSC LEO', voyage: 'FB429A', carrier: 'MSC', etd: '2024-07-28T18:00:00Z', eta: '2024-08-23T18:00:00Z' },
    { vesselName: 'CMA CGM SYMI', voyage: '0PE5HN1MA', carrier: 'CMA CGM', etd: '2024-08-01T09:00:00Z', eta: '2024-08-27T09:00:00Z' },
    { vesselName: 'HAPAG-LLOYD RIO', voyage: '430S', carrier: 'Hapag-Lloyd', etd: '2024-08-05T14:00:00Z', eta: '2024-09-01T14:00:00Z' },
];

/**
 * Fetches vessel schedules for a given route (simulated).
 * 
 * @param origin The origin port code.
 * @param destination The destination port code.
 * @returns A promise that resolves to an array of schedules.
 */
export async function getSchedules(origin: string, destination: string): Promise<Schedule[]> {
  console.log(`Simulating schedule search for ${origin} -> ${destination}`);

  // In a real app, origin and destination would be used to filter results.
  // Here, we'll just return the mocked data with a delay.
  await new Promise(resolve => setTimeout(resolve, 750));

  return MOCKED_SCHEDULES;
}
