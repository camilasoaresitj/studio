
'use client';

import { z } from 'zod';

const tariffPeriodSchema = z.object({
  from: z.number(),
  to: z.number().optional(),
  rate: z.number(),
});

const demurrageTariffSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  costPeriods: z.array(tariffPeriodSchema),
  salePeriods: z.array(tariffPeriodSchema),
});

export type TariffPeriod = z.infer<typeof tariffPeriodSchema>;
export type DemurrageTariff = z.infer<typeof demurrageTariffSchema>;

const DEMURRAGE_TARIFFS_STORAGE_KEY = 'cargaInteligente_demurrage_tariffs_v1';

const initialDemurrageTariffs: DemurrageTariff[] = [
  {
    id: 'tariff-maersk-1',
    carrier: 'Maersk',
    costPeriods: [
      { from: 1, to: 5, rate: 75 },
      { from: 6, to: 10, rate: 150 },
      { from: 11, rate: 300 },
    ],
    salePeriods: [
      { from: 1, to: 5, rate: 100 },
      { from: 6, to: 10, rate: 200 },
      { from: 11, rate: 400 },
    ],
  },
   {
    id: 'tariff-msc-1',
    carrier: 'MSC',
    costPeriods: [
      { from: 1, to: 4, rate: 80 },
      { from: 5, to: 9, rate: 160 },
      { from: 10, rate: 320 },
    ],
    salePeriods: [
      { from: 1, to: 4, rate: 110 },
      { from: 5, to: 9, rate: 220 },
      { from: 10, rate: 440 },
    ],
  },
];

export function getDemurrageTariffs(): DemurrageTariff[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(DEMURRAGE_TARIFFS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(DEMURRAGE_TARIFFS_STORAGE_KEY, JSON.stringify(initialDemurrageTariffs));
      return initialDemurrageTariffs;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse demurrage tariffs from localStorage", error);
    return [];
  }
}

export function saveDemurrageTariffs(tariffs: DemurrageTariff[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(DEMURRAGE_TARIFFS_STORAGE_KEY, JSON.stringify(tariffs));
    // Notify other components of the update
    window.dispatchEvent(new Event('demurrageTariffsUpdated'));
  } catch (error) {
    console.error("Failed to save demurrage tariffs to localStorage", error);
  }
}
