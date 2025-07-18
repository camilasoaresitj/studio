
'use client';

import { z } from 'zod';

export const profitSettingSchema = z.object({
  id: z.enum(['maritimo', 'aereo']),
  modal: z.enum(['Marítimo', 'Aéreo']),
  unit: z.enum(['Por Contêiner', 'Por KG']),
  amount: z.coerce.number().default(0),
  currency: z.enum(['USD', 'BRL']).default('USD'),
});

export type ProfitSetting = z.infer<typeof profitSettingSchema>;

const PROFIT_SETTINGS_STORAGE_KEY = 'cargaInteligente_profit_settings_v1';

const initialProfitSettings: ProfitSetting[] = [
  {
    id: 'maritimo',
    modal: 'Marítimo',
    unit: 'Por Contêiner',
    amount: 50,
    currency: 'USD',
  },
  {
    id: 'aereo',
    modal: 'Aéreo',
    unit: 'Por KG',
    amount: 0.5,
    currency: 'USD',
  },
];

export function getProfitSettings(): ProfitSetting[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(PROFIT_SETTINGS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(PROFIT_SETTINGS_STORAGE_KEY, JSON.stringify(initialProfitSettings));
      return initialProfitSettings;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse profit settings from localStorage", error);
    return [];
  }
}

export function saveProfitSettings(settings: ProfitSetting[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(PROFIT_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event('profitSettingsUpdated'));
  } catch (error) {
    console.error("Failed to save profit settings to localStorage", error);
  }
}
