
'use client';

import { getShipments, SHIPMENTS_STORAGE_KEY } from './shipment-data';
import type { Shipment, ContainerDetail, Milestone, ChatMessage } from './shipment-data';
import { isValid } from 'date-fns';

export type { Shipment, ContainerDetail, Milestone, ChatMessage };

// CLIENT-SIDE ONLY: Reads from localStorage.
export function getStoredShipments(): Shipment[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedShipments = localStorage.getItem(SHIPMENTS_STORAGE_KEY);
    if (!storedShipments) {
        const initialData: Shipment[] = getShipments(); // Load from JSON on first client load
        localStorage.setItem(SHIPMENTS_STORAGE_KEY, JSON.stringify(initialData));
        return initialData;
    };
    
    const parsed = JSON.parse(storedShipments) as any[];
    return parsed.map(shipment => {
        const safeDate = (dateString: string | Date | undefined | null): Date | undefined => {
            if (!dateString) return undefined;
            const date = new Date(dateString);
            return isValid(date) ? date : undefined;
        };

        const safeMilestoneDate = (dateString: string | Date | undefined | null): Date | null => {
             if (!dateString) return null;
             const date = new Date(dateString);
             return isValid(date) ? date : null;
        }

        return {
            ...shipment,
            modal: shipment.modal || (shipment.details?.cargo.includes('kg') ? 'air' : 'ocean'), // Add modal fallback
            etd: safeDate(shipment.etd),
            eta: safeDate(shipment.eta),
            mblPrintingAuthDate: safeDate(shipment.mblPrintingAuthDate),
            containers: shipment.containers?.map((c: any) => ({
                ...c,
                effectiveReturnDate: safeDate(c.effectiveReturnDate),
                effectiveGateInDate: safeDate(c.effectiveGateInDate),
            })) || [],
            documents: shipment.documents?.map((d: any) => ({
                ...d,
                uploadedAt: safeDate(d.uploadedAt),
            })) || [],
            transshipments: shipment.transshipments?.map((t: any) => ({
                ...t,
                etd: safeDate(t.etd),
                eta: safeDate(t.eta),
            })) || [],
            milestones: (shipment.milestones || []).map((m: any) => ({
                ...m,
                predictedDate: safeMilestoneDate(m.predictedDate || m.dueDate),
                effectiveDate: safeMilestoneDate(m.effectiveDate || m.completedDate),
            })).filter((m: any) => m.predictedDate !== null),
            blDraftHistory: shipment.blDraftHistory ? {
                ...shipment.blDraftHistory,
                sentAt: safeDate(shipment.blDraftHistory.sentAt),
                revisions: (shipment.blDraftHistory.revisions || []).map((r: any) => ({
                    ...r,
                    date: safeDate(r.date),
                })),
            } : undefined,
            approvalLogs: (shipment.approvalLogs || []).map((log: any) => ({
                ...log,
                timestamp: safeDate(log.timestamp)
            })),
        };
    });
  } catch (error) {
    console.error("Failed to parse shipments from localStorage", error);
    return [];
  }
}

// CLIENT-SIDE ONLY: Saves data and notifies other components
export function saveShipments(shipments: Shipment[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SHIPMENTS_STORAGE_KEY, JSON.stringify(shipments));
    window.dispatchEvent(new Event('shipmentsUpdated'));
  }
}
