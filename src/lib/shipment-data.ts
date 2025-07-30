
'use client';

import type { Partner } from '@/lib/partners-data';
import { addDays, isValid, subDays } from 'date-fns';
import type { PartialPayment } from './financials-data';

const SHIPMENTS_STORAGE_KEY = 'cargaInteligente_shipments_v12';

// --- Type Definitions ---

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  containerType?: string;
  localPagamento?: 'Origem' | 'Frete' | 'Destino';
  cost: number;
  costCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  sale: number;
  saleCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  supplier: string;
  sacado?: string;
  approvalStatus: 'aprovada' | 'pendente' | 'rejeitada';
  justification?: string;
  financialEntryId?: string | null;
};

export type QuoteDetails = {
    cargo: string;
    transitTime: string;
    validity: string;
    freeTime: string;
    incoterm: string;
};

export type UploadedDocument = {
    name: 'Invoice' | 'Packing List' | 'Negociação NET' | 'Outros' | 'Draft HBL' | 'Draft MBL' | 'Original MBL' | 'Original HBL' | 'Extrato DUE';
    file: File;
};

export type ShipmentCreationData = {
  id: string;
  origin: string;
  destination:string;
  customer: string;
  charges: QuoteCharge[];
  details: QuoteDetails;
  shipperId?: string;
  consigneeId?: string;
  agentId?: string;
  notifyName: string;
  responsibleUser: string;
  terminalRedestinacaoId?: string;
  invoiceNumber: string;
  purchaseOrderNumber: string;
  uploadedDocs: UploadedDocument[];
  collectionAddress?: string;
  deliveryAddress?: string;
};

export type Milestone = {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  predictedDate: Date | null;
  effectiveDate: Date | null;
  details?: string;
  isTransshipment?: boolean;
};

export type ContainerDetail = {
  id: string;
  number: string;
  seal: string;
  tare: string;
  grossWeight: string;
  volumes?: string;
  measurement?: string; // CBM
  freeTime?: string;
  type: string;
  effectiveReturnDate?: Date;
  effectiveGateInDate?: Date;
};

export type TransshipmentDetail = {
  id: string;
  port: string;
  vessel: string;
  etd?: Date;
  eta?: Date;
};

export type DocumentStatus = {
    name: 'Draft MBL' | 'Draft HBL' | 'Original MBL' | 'Original HBL' | 'Invoice' | 'Packing List' | 'Extrato DUE' | 'Negociação NET' | 'Outros';
    status: 'pending' | 'uploaded' | 'approved';
    fileName?: string;
    uploadedAt?: Date;
    content?: string; // Can store HTML for PDF generation
};

export type BLDraftRevision = {
    date: Date;
    lateFee?: {
        cost: number;
        currency: 'USD';
    }
};

export type BLDraftHistory = {
    sentAt: Date | null;
    revisions: BLDraftRevision[];
};


export type BLDraftData = {
    shipper: string;
    consignee: string;
    notify: string;
    marksAndNumbers: string;
    descriptionOfGoods: string;
    grossWeight: string;
    measurement: string;
    ncms: string[];
    due: string;
    blType: 'original' | 'express';
    containers: { 
        number: string; 
        seal: string;
        tare: string;
        grossWeight: string;
        volumes: string;
        measurement: string;
    }[];
    vgmDetails: {
        responsibleParty: string;
        authorizedPerson: string;
        method: 'method1' | 'method2';
    };
};

export type ChatMessage = {
    sender: 'Cliente' | 'CargaInteligente' | 'Sistema';
    message: string;
    timestamp: string; // ISO String
    department: 'Operacional' | 'Financeiro' | 'Sistema';
    readBy?: string[]; 
};

export type ActivityLog = {
    timestamp: Date;
    user: string;
    action: string;
};

export type ApprovalLog = {
    timestamp: Date;
    user: string;
    chargeName: string;
    originalValue: string;
    newValue: string;
    justification: string;
    status: 'approved' | 'rejected';
};

export type Shipment = {
  id: string; 
  quoteId: string;
  origin: string;
  destination: string;
  shipper: Partner;
  consignee: Partner;
  agent?: Partner;
  responsibleUser?: string;
  charges: QuoteCharge[];
  details: QuoteDetails;
  milestones: Milestone[];
  documents: DocumentStatus[];
  carrier?: string;
  bookingNumber?: string;
  mblPrintingAtDestination?: boolean;
  mblPrintingAuthDate?: Date;
  courier?: 'DHL' | 'UPS' | 'FedEx' | 'Outro';
  courierNumber?: string;
  courierLastStatus?: string;
  vesselName?: string;
  voyageNumber?: string;
  masterBillNumber?: string;
  houseBillNumber?: string;
  etd?: Date;
  eta?: Date;
  containers?: ContainerDetail[];
  netWeight?: string;
  transshipments?: TransshipmentDetail[];
  notifyName?: string;
  ceMaster?: string;
  ceHouse?: string;
  manifesto?: string;
  payments?: PartialPayment[];
  blDraftData?: BLDraftData;
  blType?: 'original' | 'express';
  terminalRedestinacaoId?: string;
  emptyPickupTerminalId?: string;
  fullDeliveryTerminalId?: string;
  custoArmazenagem?: number;
  customer: string;
  overseasPartner?: Partner;
  collectionAddress?: string;
  deliveryAddress?: string;
  dischargeTerminal?: string;
  chatMessages?: ChatMessage[];
  blDraftHistory?: BLDraftHistory;
  purchaseOrderNumber?: string;
  invoiceNumber?: string;
  commodityDescription?: string;
  ncms?: string[];
  operationalNotes?: string;
  approvalLogs?: ApprovalLog[];
  invoiceItems?: any[];
};

function getInitialShipments(): Shipment[] {
    return [];
}

export function getShipments(): Shipment[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedShipments = localStorage.getItem(SHIPMENTS_STORAGE_KEY);
    if (!storedShipments) {
        const initialData = getInitialShipments();
        saveShipments(initialData);
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
            })).filter((m: Milestone) => m.predictedDate !== null),
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

export function saveShipments(shipments: Shipment[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SHIPMENTS_STORAGE_KEY, JSON.stringify(shipments));
    window.dispatchEvent(new Event('shipmentsUpdated'));
  } catch (error) {
    console.error("Failed to save shipments to localStorage", error);
  }
}

  