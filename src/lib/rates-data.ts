
'use client';

import type { Rate } from '@/components/rates-table';
import { getInitialRates } from './initial-data';

const RATES_STORAGE_KEY = 'cargaInteligente_rates_v1';

export function getRates(): Rate[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(RATES_STORAGE_KEY);
    if (!stored) {
      const initialData = getInitialRates();
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse rates from localStorage", error);
    return [];
  }
}

export function saveRates(rates: Rate[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
    // Notify other components of the update if needed
    window.dispatchEvent(new Event('ratesUpdated'));
  } catch (error) {
    console.error("Failed to save rates to localStorage", error);
  }
}
