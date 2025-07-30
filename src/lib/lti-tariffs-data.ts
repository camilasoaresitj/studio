
'use client';

import { z } from 'zod';

const tariffPeriodSchema = z.object({
  from: z.number(),
  to: z.number().optional(),
  rate: z.number(),
});

const ltiTariffSchema = z.object({
  id: z.string(),
  containerType: z.enum(['dry', 'reefer', 'special']),
  salePeriods: z.array(tariffPeriodSchema),
});

export type LtiTariffPeriod = z.infer<typeof tariffPeriodSchema>;
export type LtiTariff = z.infer<typeof ltiTariffSchema>;

const LTI_TARIFFS_STORAGE_KEY = 'cargaInteligente_lti_tariffs_v1_sales';

const initialLtiTariffs: LtiTariff[] = [
  {
    id: 'lti-tariff-dry',
    containerType: 'dry',
    salePeriods: [ { from: 1, to: 5, rate: 100 }, { from: 6, to: 10, rate: 200 }, { from: 11, rate: 400 } ],
  },
  {
    id: 'lti-tariff-reefer',
    containerType: 'reefer',
    salePeriods: [ { from: 1, to: 3, rate: 200 }, { from: 4, to: 7, rate: 400 }, { from: 8, rate: 800 } ],
  },
  {
    id: 'lti-tariff-special',
    containerType: 'special',
    salePeriods: [ { from: 1, to: 3, rate: 250 }, { from: 4, to: 7, rate: 500 }, { from: 8, rate: 1000 } ],
  },
];

// Server-side safe: returns initial data
export function getLtiTariffs(): LtiTariff[] {
  return initialLtiTariffs;
}

// Client-side only: uses localStorage
export function getStoredLtiTariffs(): LtiTariff[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(LTI_TARIFFS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(LTI_TARIFFS_STORAGE_KEY, JSON.stringify(initialLtiTariffs));
      return initialLtiTariffs;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse LTI tariffs from localStorage", error);
    return [];
  }
}

export function saveLtiTariffs(tariffs: LtiTariff[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LTI_TARIFFS_STORAGE_KEY, JSON.stringify(tariffs));
    // Notify other components of the update
    window.dispatchEvent(new Event('ltiTariffsUpdated'));
  } catch (error) {
    console.error("Failed to save LTI tariffs to localStorage", error);
  }
}

    
