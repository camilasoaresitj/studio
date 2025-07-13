
'use client';

import type { Partner } from '@/lib/partners-data';
import { addDays, isValid } from 'date-fns';
import { runSendShippingInstructions } from '@/app/actions';
import type { PartialPayment } from './financials-data';


const SHIPMENTS_STORAGE_KEY = 'cargaInteligente_shipments_v6';

// --- Type Definitions ---

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  localPagamento?: 'Origem' | 'Frete' | 'Destino';
  cost: number;
  costCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  sale: number;
  saleCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  supplier: string;
  sacado?: string;
  // Expanded approval status
  approvalStatus: 'aprovada' | 'pendente' | 'rejeitada';
  financialEntryId?: string | null; // ID of the invoice/bill it belongs to
};

export type QuoteDetails = {
    cargo: string;
    transitTime: string;
    validity: string;
    freeTime: string;
    incoterm: string;
};

// The shape of the quote object needed to create a shipment
export type ShipmentCreationData = {
  id: string;
  origin: string;
  destination:string;
  customer: string;
  charges: QuoteCharge[];
  details: QuoteDetails;
  // Add partners to the creation data
  shipper: Partner;
  consignee: Partner;
  agent?: Partner;
  notifyName: string;
  responsibleUser: string;
  terminalRedestinacaoId?: string;
};

export type Milestone = {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  predictedDate: Date;
  effectiveDate: Date | null;
  details?: string; // For vessel/port/voyage info
  isTransshipment?: boolean; // To identify milestones generated from transshipment data
};

export type ContainerDetail = {
  id: string;
  number: string;
  seal: string;
  tare: string;
  grossWeight: string;
  volumes?: string;
  freeTime?: string;
  type: string; // Add type for demurrage calculation
  effectiveReturnDate?: Date;
  effectiveGateInDate?: Date; // For detention
};

export type TransshipmentDetail = {
  id: string;
  port: string;
  vessel: string;
  etd?: Date;
  eta?: Date;
};

export type DocumentStatus = {
    name: 'Draft MBL' | 'Draft HBL' | 'Original MBL' | 'Original HBL' | 'Invoice' | 'Packing List' | 'Extrato DUE';
    status: 'pending' | 'uploaded' | 'approved';
    fileName?: string;
    uploadedAt?: Date;
};

export type BLDraftData = {
    shipper: string;
    consignee: string;
    notify: string;
    marksAndNumbers: string;
    descriptionOfGoods: string;
    grossWeight: string;
    measurement: string;
    ncm: string;
    blType: 'original' | 'express';
};

export type Shipment = {
  id: string; // The process number, derived from quote ID
  quoteId: string; // The original quote ID
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
  // Existing operational fields
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
  commodityDescription?: string;
  ncms?: string[];
  netWeight?: string;
  transshipments?: TransshipmentDetail[];
  notifyName?: string;
  invoiceNumber?: string;
  purchaseOrderNumber?: string;
  ceMaster?: string;
  ceHouse?: string;
  manifesto?: string;
  payments?: PartialPayment[];
  blDraftData?: BLDraftData;
  // Redestinação fields
  terminalRedestinacaoId?: string;
  custoArmazenagem?: number;
  // Deprecated field, shipper/cnee are top-level
  customer: string;
  overseasPartner?: Partner;
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
  'Transbordo': 0, // Placeholder
  'CE Mercante Lançado': 0, // Placeholder, calculated based on ETA
  'Chegada ao Destino': 0, // Placeholder, calculated based on ETD + transit time
};

const EXPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Confirmação de Booking': 2,
  'Retirada do Vazio': 3,
  'Coleta da Carga (se aplicável)': 4,
  'Cut Off Documental': 6,
  'Desembaraço de Exportação': 7,
  'Embarque': 8,
  'Chegada no Destino': 0, // Placeholder
  'Confirmação de Entrega': 2, // Days after arrival
};

function generateInitialMilestones(isImport: boolean, transitTimeStr: string, freeTimeStr: string, creationDate: Date): Milestone[] {
    const transitTime = parseInt(transitTimeStr.split('-').pop() || '30', 10);
    const freeDays = parseInt(freeTimeStr.replace(/\D/g,'') || '7');

    let milestones: Milestone[] = [];

    if (isImport) {
        const milestoneNames = Object.keys(IMPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque']);
        const eta = addDays(etd, transitTime);
        const freeTimeDueDate = addDays(eta, freeDays);

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
            predictedDate: addDays(freeTimeDueDate, -2), // Reminder 2 days before
            effectiveDate: null,
            details: `Free time termina em ${freeTimeDueDate.toLocaleDateString('pt-BR')}`
        };
        
        milestones = [...baseMilestones, demurrageMilestone];

    } else { // Export
        const milestoneNames = Object.keys(EXPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Embarque']);
        const eta = addDays(etd, transitTime);
        
        const emptyPickupDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Retirada do Vazio']);
        const gateInDueDate = addDays(emptyPickupDate, freeDays);

         milestones = milestoneNames.map(name => {
            let predictedDate: Date;
            if (name.includes('Chegada no Destino')) {
                predictedDate = eta;
            } else if (name === 'Confirmação de Entrega') {
                 predictedDate = addDays(eta, EXPORT_MILESTONE_DUE_DAYS[name]);
            } else {
                predictedDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS[name]);
            }
            return { name, status: 'pending', predictedDate, effectiveDate: null, isTransshipment: false };
        });
        
        // Add specific gate-in milestone for detention tracking
        milestones.push({
            name: 'Prazo de Entrega (Gate In)',
            status: 'pending',
            predictedDate: gateInDueDate,
            effectiveDate: null,
            details: `Prazo final para evitar detention.`
        });
    }

    // Sort all milestones by date
    milestones.sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime());
    return milestones;
}


// --- LocalStorage Interaction ---
function getInitialShipments(): Shipment[] {
    // This function provides initial data if localStorage is empty.
    return []; // Start with an empty list by default.
}

/**
 * Retrieves all shipments from localStorage, parsing dates correctly.
 */
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
    return parsed.map(shipment => ({
        ...shipment,
        etd: shipment.etd ? new Date(shipment.etd) : undefined,
        eta: shipment.eta ? new Date(shipment.eta) : undefined,
        mblPrintingAuthDate: shipment.mblPrintingAuthDate ? new Date(shipment.mblPrintingAuthDate) : undefined,
        containers: shipment.containers?.map((c: any) => ({
            ...c,
            effectiveReturnDate: c.effectiveReturnDate ? new Date(c.effectiveReturnDate) : undefined,
            effectiveGateInDate: c.effectiveGateInDate ? new Date(c.effectiveGateInDate) : undefined,
        })) || [],
        documents: shipment.documents?.map((d: any) => ({
            ...d,
            uploadedAt: d.uploadedAt ? new Date(d.uploadedAt) : undefined,
        })) || [],
        transshipments: shipment.transshipments?.map((t: any) => ({
            ...t,
            etd: t.etd ? new Date(t.etd) : undefined,
            eta: t.eta ? new Date(t.eta) : undefined,
        })) || [],
        milestones: shipment.milestones?.map((m: any) => ({
            ...m,
            // Migrate old data structures
            predictedDate: m.predictedDate ? new Date(m.predictedDate) : (m.dueDate ? new Date(m.dueDate) : new Date()),
            effectiveDate: m.effectiveDate ? new Date(m.effectiveDate) : (m.completedDate ? new Date(m.completedDate) : null),
        })) || [],
    }));
  } catch (error) {
    console.error("Failed to parse shipments from localStorage", error);
    return [];
  }
}

/**
 * Retrieves a single shipment by its ID.
 */
export function getShipmentById(id: string): Shipment | null {
  const shipments = getShipments();
  return shipments.find(s => s.id === id) || null;
}


/**
 * Saves all shipments to localStorage.
 */
export function saveShipments(shipments: Shipment[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SHIPMENTS_STORAGE_KEY, JSON.stringify(shipments));
  } catch (error) {
    console.error("Failed to save shipments to localStorage", error);
  }
}

// --- Public Shipment Management Functions ---

/**
 * Creates a new shipment from an approved quote and saves it.
 */
export async function createShipment(quoteData: ShipmentCreationData): Promise<Shipment> {
  const isImport = quoteData.destination.toUpperCase().includes('BR');
  const creationDate = new Date();
  const milestones = generateInitialMilestones(isImport, quoteData.details.transitTime, quoteData.details.freeTime, creationDate);
  
  if (milestones.length > 0 && quoteData.agent) {
      milestones[0].status = 'completed'; // Mark as "Sent"
      milestones[0].effectiveDate = new Date();
  }

  const transitTime = parseInt(quoteData.details.transitTime.split('-').pop() || '30', 10);
  const etdDays = isImport ? IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque'] : EXPORT_MILESTONE_DUE_DAYS['Embarque'];
  const etd = addDays(creationDate, etdDays);
  const eta = addDays(etd, transitTime);
  
  const documents: DocumentStatus[] = [
    { name: 'Draft MBL', status: 'pending' },
    { name: 'Draft HBL', status: 'pending' },
    { name: 'Original MBL', status: 'pending' },
    { name: 'Original HBL', status: 'pending' },
    { name: 'Invoice', status: 'pending' },
    { name: 'Packing List', status: 'pending' },
    { name: 'Extrato DUE', status: 'pending' },
  ];

  const freightCharge = quoteData.charges.find(c => c.name.toLowerCase().includes('frete'));

  const shipmentId = `PROC-${quoteData.id.replace('COT-', '')}-${Date.now().toString().slice(-5)}`;
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const purchaseOrderNumber = `PO-${Date.now().toString().slice(-6)}`;

  const newShipment: Shipment = {
    id: shipmentId,
    quoteId: quoteData.id,
    origin: quoteData.origin,
    destination: quoteData.destination,
    shipper: quoteData.shipper,
    consignee: quoteData.consignee,
    agent: quoteData.agent,
    responsibleUser: quoteData.responsibleUser,
    terminalRedestinacaoId: quoteData.terminalRedestinacaoId,
    charges: quoteData.charges.map(c => ({ ...c, approvalStatus: 'aprovada' })),
    details: quoteData.details,
    carrier: freightCharge?.supplier,
    milestones,
    documents,
    etd,
    eta,
    bookingNumber: `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    masterBillNumber: `MSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    houseBillNumber: `HSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    invoiceNumber: invoiceNumber,
    purchaseOrderNumber: purchaseOrderNumber,
    ncms: ['0000.00.00'],
    mblPrintingAtDestination: false,
    notifyName: quoteData.notifyName,
    // Keep 'customer' for backward compatibility on display, but shipper/cnee are primary
    customer: quoteData.customer, 
  };

  // If it's an import with an agent, send the shipping instructions automatically.
  if (isImport && quoteData.agent) {
    const thcCharge = quoteData.charges.find(c => c.name.toLowerCase().includes('thc'));
    const agentPortalUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/agent-portal/${shipmentId}`
        : `/agent-portal/${shipmentId}`;

    // Simulate sending email to agent
    await runSendShippingInstructions({
      shipmentId: newShipment.id,
      agentName: quoteData.agent.name,
      agentEmail: quoteData.agent.contacts[0]?.email || 'agent@example.com',
      shipper: quoteData.shipper,
      consigneeName: quoteData.consignee.name,
      notifyName: quoteData.notifyName,
      freightCost: freightCharge?.cost ? `${freightCharge.costCurrency} ${freightCharge.cost.toFixed(2)}` : 'N/A',
      freightSale: freightCharge?.sale ? `${freightCharge.saleCurrency} ${freightCharge.sale.toFixed(2)}` : 'AS AGREED',
      agentProfit: quoteData.agent.profitAgreement?.amount ? `USD ${quoteData.agent.profitAgreement.amount.toFixed(2)}` : 'N/A',
      thcValue: thcCharge?.sale ? `${thcCharge.saleCurrency} ${thcCharge.sale.toFixed(2)}` : 'N/A',
      commodity: newShipment.commodityDescription || 'General Cargo',
      equipmentDescription: newShipment.details.cargo || 'N/A',
      ncm: newShipment.ncms?.[0] || 'N/A',
      invoiceNumber: newShipment.invoiceNumber || 'N/A',
      purchaseOrderNumber: newShipment.purchaseOrderNumber || 'N/A',
      updateLink: agentPortalUrl,
    });
    console.log(`Shipping instructions sent for shipment ${newShipment.id}`);
  }

  const shipments = getShipments();
  shipments.unshift(newShipment);
  saveShipments(shipments);
  return newShipment;
}

/**
 * Updates an existing shipment.
 */
export function updateShipment(updatedShipment: Shipment): Shipment[] {
  const shipments = getShipments();
  const shipmentIndex = shipments.findIndex(s => s.id === updatedShipment.id);

  if (shipmentIndex === -1) {
    const newShipments = [updatedShipment, ...shipments];
    saveShipments(newShipments);
    return newShipments;
  }

  shipments[shipmentIndex] = updatedShipment;
  saveShipments(shipments);
  return shipments;
}

/**
 * Rebuilds the milestone list based on the shipment's transshipment data.
 * This ensures the milestone list is always in sync with the transshipment details.
 */
export function rebuildMilestones(shipment: Shipment): Milestone[] {
    const baseMilestones = shipment.milestones.filter(m => !m.isTransshipment);
    
    const transshipmentMilestones: Milestone[] = (shipment.transshipments || [])
        .filter(t => t.port && t.vessel && t.etd && t.eta) // Ensure transshipment has necessary data
        .flatMap(t => [
            {
                name: 'Saída do Transbordo',
                status: 'pending',
                predictedDate: t.etd!,
                effectiveDate: null,
                details: `${t.port} via ${t.vessel}`,
                isTransshipment: true,
            },
            {
                name: 'Chegada no Transbordo',
                status: 'pending',
                predictedDate: t.eta!,
                effectiveDate: null,
                details: `${t.port} via ${t.vessel}`,
                isTransshipment: true,
            },
        ]);

    const allMilestones = [...baseMilestones, ...transshipmentMilestones];
    
    // Sort everything by predicted date
    allMilestones.sort((a, b) => {
        const dateA = a.predictedDate ? new Date(a.predictedDate).getTime() : 0;
        const dateB = b.predictedDate ? new Date(b.predictedDate).getTime() : 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    return allMilestones;
}
