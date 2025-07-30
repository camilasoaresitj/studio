

'use client';

import type { Partner } from '@/lib/partners-data';
import { addDays, isValid, subDays } from 'date-fns';
import { runSendShippingInstructions } from '@/app/actions';
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

// --- Milestone Templates & Due Date Calculation ---

const IMPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Instruções de Embarque Enviadas ao Agente': 0,
  'Carga Pronta': 7,
  'Booking Confirmado': 10,
  'Cut Off Documental': 12,
  'Container Gate In (Entregue no Porto)': 13,
  'Confirmação de Embarque': 14,
  'Documentos Originais Emitidos': 16,
  'Transbordo': 0, 
  'CE Mercante Lançado': 0, 
  'Chegada ao Destino': 0, 
};

const EXPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Confirmação de Booking': 2,
  'Retirada do Vazio': 3,
  'Coleta da Carga (se aplicável)': 4,
  'Cut Off Documental': 6,
  'Desembaraço de Exportação': 7,
  'Embarque': 8,
  'Chegada no Destino': 0, 
  'Confirmação de Entrega': 2, 
};

function generateInitialMilestones(isImport: boolean, transitTimeStr: string, freeTimeStr: string, creationDate: Date): Milestone[] {
    const transitTime = parseInt(transitTimeStr.split('-').pop() || '30', 10);
    const freeDays = parseInt(freeTimeStr.replace(/\D/g,'') || '7');

    let milestones: Milestone[] = [];

    if (isImport) {
        const milestoneNames = Object.keys(IMPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque']);
        const eta = addDays(etd, transitTime);
        const freeTimeDueDate = addDays(eta, freeDays - 1);

        const baseMilestones = milestoneNames.map(name => {
            let predictedDate: Date;
            if (name === 'Chegada ao Destino') {
                predictedDate = eta;
            } else if (name === 'CE Mercante Lançado') {
                predictedDate = addDays(eta, -10);
            } else {
                predictedDate = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS[name]);
            }
            return { name, status: 'pending' as const, predictedDate, effectiveDate: null, isTransshipment: false };
        });

        const demurrageMilestone: Milestone = {
            name: 'Verificar Devolução do Contêiner',
            status: 'pending',
            predictedDate: addDays(freeTimeDueDate, -2),
            effectiveDate: null,
            details: `Free time termina em ${freeTimeDueDate.toLocaleDateString('pt-BR')}`
        };
        
        milestones = [...baseMilestones, demurrageMilestone];

    } else { // Export
        const milestoneNames = Object.keys(EXPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Embarque']);
        const eta = addDays(etd, transitTime);
        
        const emptyPickupDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Retirada do Vazio']);
        const gateInDueDate = addDays(emptyPickupDate, freeDays - 1);

         milestones = milestoneNames.map(name => {
            let predictedDate: Date;
            if (name.includes('Chegada no Destino')) {
                predictedDate = eta;
            } else if (name === 'Confirmação de Entrega') {
                 predictedDate = addDays(eta, EXPORT_MILESTONE_DUE_DAYS[name]);
            } else {
                predictedDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS[name]);
            }
            return { name, status: 'pending' as const, predictedDate, effectiveDate: null, isTransshipment: false };
        });
        
        const deadLineCargaDate = milestones.find(m => m.name === 'Cut Off Documental')?.predictedDate;

        milestones.push({
            name: 'Prazo de Entrega (Gate In)',
            status: 'pending',
            predictedDate: deadLineCargaDate ? addDays(deadLineCargaDate, -2) : gateInDueDate,
            effectiveDate: null,
            details: `Prazo final para evitar detention.`
        });
    }

    milestones.sort((a, b) => (a.predictedDate?.getTime() ?? 0) - (b.predictedDate?.getTime() ?? 0));
    return milestones;
}

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

export function getShipmentById(id: string): Shipment | undefined {
  const shipments = getShipments();
  return shipments.find(s => s.id === id);
}

export function updateShipment(updatedShipment: Shipment): Shipment[] {
  const shipments = getShipments();
  const index = shipments.findIndex(s => s.id === updatedShipment.id);
  if (index !== -1) {
    shipments[index] = updatedShipment;
    saveShipments(shipments);
  }
  return shipments;
}
