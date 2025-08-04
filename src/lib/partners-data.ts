
'use server';

import initialPartnersData from './partners.json';
import { Partner, partnerSchema } from '@/lib/schemas/partner';

// SERVER-SAFE: Reads from JSON, no localStorage.
export async function getPartners(): Promise<Partner[]> {
    // Rehydrate dates and add missing fields from the JSON import
    return initialPartnersData.map((p: any) => ({
      ...p,
      commissionAgreement: { 
        currency: 'BRL',
        ...(p.commissionAgreement || {})
      },
      createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      demurrageAgreementDueDate: p.demurrageAgreementDueDate ? new Date(p.demurrageAgreementDueDate) : undefined,
      contacts: (p.contacts || []).map((c: any) => ({
          ...c,
          despachanteId: c.despachanteId === undefined ? null : c.despachanteId,
          loginEmail: c.loginEmail || '',
          password: c.password || '',
      })),
      kpi: {
        manual: {
            mainRoutes: p.kpi?.manual?.mainRoutes?.map((route: string) => ({ value: route })) || [],
            mainModals: p.kpi?.manual?.mainModals || [],
        }
      }
    })) as Partner[];
}
