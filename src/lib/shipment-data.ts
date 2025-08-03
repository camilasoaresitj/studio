
import { Partner } from '@/lib/partners-data';
import { isValid } from 'date-fns';
import type { PartialPayment } from './financials-data';
import initialShipmentsData from './shipments.json';
import { InvoiceItem } from './schemas/invoice';

export const SHIPMENTS_STORAGE_KEY = 'cargaInteligente_shipments_v12';

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
    collectionAddress?: string; // Added for EXW
    deliveryAddress?: string; // Added for D-terms
};

export type Quote = {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  status: 'Enviada' | 'Aprovada' | 'Perdida' | 'Rascunho';
  date: string;
  details: QuoteDetails;
  charges: QuoteCharge[];
  shipper?: Partner;
  consignee?: Partner;
  agent?: Partner;
  carrier?: string;
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
  modal?: 'air' | 'ocean' | 'courier' | 'road'; // Add modal
  roadShipment?: any; // Add road shipment details
  airShipment?: any; // Add air shipment details
  carrier?: string;
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
  modal: 'air' | 'ocean' | 'courier' | 'road'; // Make modal required
  oceanShipmentType?: 'FCL' | 'LCL';
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
  courier?: string; // Simplified courier name
  courierNumber?: string;
  courierSentDate?: Date;
  courierLastStatus?: string;
  vesselName?: string;
  voyageNumber?: string;
  masterBillNumber?: string;
  houseBillNumber?: string;
  etd?: Date;
  eta?: Date;
  containers?: ContainerDetail[];
  netWeight?: string;
  grossWeight?: string; // Add gross weight
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
  invoiceItems?: InvoiceItem[];
  lastTrackingUpdate?: Date; // Added for daily updates
  status?: string; // To track if finalized
  cargoValue?: number;
  cargoValueCurrency?: 'BRL' | 'USD' | 'EUR' | 'GBP' | 'CHF' | 'JPY';
  incoterm?: string;
  // Road specific fields
  border?: string;
  crtNumber?: string;
  truckPlate?: string;
  driverDetails?: string;
  pieces?: any[]; // For LTL/Air/Courier
};

// SERVER-SIDE SAFE: Reads from JSON, no localStorage.
export function getShipments(): Shipment[] {
    return initialShipmentsData.map((shipment: any) => {
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
            incoterm: shipment.incoterm || shipment.details?.incoterm,
            modal: shipment.modal || (shipment.details?.cargo.includes('kg') ? 'air' : 'ocean'), // Add modal fallback
            oceanShipmentType: shipment.oceanShipmentType,
            etd: safeDate(shipment.etd),
            eta: safeDate(shipment.eta),
            milestones: (shipment.milestones || []).map((m: any) => ({
                ...m,
                predictedDate: safeMilestoneDate(m.predictedDate || m.dueDate),
                effectiveDate: safeMilestoneDate(m.effectiveDate || m.completedDate),
            })).filter((m: Milestone) => m.predictedDate !== null),
        };
    }) as Shipment[];
}

// SERVER-SIDE SAFE: wrapper to call server action to get a single shipment
export async function getShipmentById(id: string): Promise<Shipment | undefined> {
    const shipments = getShipments();
    return shipments.find(s => s.id === id);
}

// SERVER-SIDE ONLY: Function to save data (simulated)
// In a real app, this would write to a database.
export async function saveShipmentsData(shipments: Shipment[]): Promise<void> {
    // This is a server-side function, so it can't write to localStorage.
    // In a real app, you would implement database logic here.
    // For this prototype, we will log to the console to show the intent.
    console.log("Simulating saving shipments data on the server...");
    // In a real file-based backend for prototyping, you might write back to the JSON file.
    // const fs = require('fs');
    // const path = require('path');
    // fs.writeFileSync(path.resolve('./src/lib/shipments.json'), JSON.stringify(shipments, null, 4));
}
    
