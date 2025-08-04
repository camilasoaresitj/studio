
'use client';

import { getPartners } from './partners-data';
import type { Partner } from './partners-data';

export type { Partner };

const PARTNERS_STORAGE_KEY = 'cargaInteligente_partners_v13';

// CLIENT-SIDE ONLY: Function to get data from localStorage
export function getStoredPartners(): Partner[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedPartners = localStorage.getItem(PARTNERS_STORAGE_KEY);
    if (!storedPartners) {
        const initialData = getPartners();
        localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(initialData));
        return initialData;
    };
    const parsed = JSON.parse(storedPartners);
    // Rehydrate dates
    return parsed.map((p: any) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
        demurrageAgreementDueDate: p.demurrageAgreementDueDate ? new Date(p.demurrageAgreementDueDate) : undefined,
    }));
  } catch (error) {
    console.error("Failed to parse partners from localStorage", error);
    return [];
  }
}

// CLIENT-SIDE ONLY: Function to save data to localStorage
export function savePartners(partners: Partner[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const existingPartners = getStoredPartners();
    const updatedPartners = [...existingPartners];
    
    partners.forEach(partner => {
        const index = updatedPartners.findIndex(p => p.id === partner.id);
        if (index > -1) {
            updatedPartners[index] = partner;
        } else {
            updatedPartners.push(partner);
        }
    });

    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(updatedPartners));
    window.dispatchEvent(new Event('partnersUpdated'));
  } catch (error) {
    console.error("Failed to save partners to localStorage", error);
  }
}
