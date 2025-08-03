
'use client';

import { z } from 'zod';
import type { SimulationFormData } from '@/lib/schemas/simulation';

export const simulationSchema = z.object({
  id: z.string(),
  name: z.string(),
  customer: z.string(),
  createdAt: z.date(),
  data: z.any(), // Store the full form data
});

export type Simulation = z.infer<typeof simulationSchema>;

const SIMULATIONS_STORAGE_KEY = 'cargaInteligente_simulations_v1';

const initialSimulations: Simulation[] = [];

export function getSimulations(): Simulation[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(SIMULATIONS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(SIMULATIONS_STORAGE_KEY, JSON.stringify(initialSimulations));
      return initialSimulations;
    }
    // Dates need to be re-hydrated
    return JSON.parse(stored).map((sim: any) => ({
      ...sim,
      createdAt: new Date(sim.createdAt),
    }));
  } catch (error) {
    console.error("Failed to parse simulations from localStorage", error);
    return [];
  }
}

export function saveSimulations(simulations: Simulation[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SIMULATIONS_STORAGE_KEY, JSON.stringify(simulations));
    window.dispatchEvent(new Event('simulationsUpdated'));
  } catch (error) {
    console.error("Failed to save simulations to localStorage", error);
  }
}
