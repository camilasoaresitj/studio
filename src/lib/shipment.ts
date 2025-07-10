
'use client';

import type { Partner } from '@/lib/partners-data';
import { addDays, isValid } from 'date-fns';
import { runSendShippingInstructions } from '@/app/actions';

const SHIPMENTS_STORAGE_KEY = 'cargaInteligente_shipments';

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
  overseasPartner: Partner;
  agent?: Partner;
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
  freeTime?: string;
};

export type TransshipmentDetail = {
  id: string;
  port: string;
  vessel: string;
  etd?: Date;
  eta?: Date;
};

export type DocumentStatus = {
    name: 'Draft MBL' | 'Draft HBL' | 'Original MBL' | 'Original HBL' | 'Invoice' | 'Packing List' | 'Extrato DI';
    status: 'pending' | 'uploaded' | 'approved';
    fileUrl?: string;
    uploadedAt?: Date;
};

export type Shipment = {
  id: string;
  origin: string;
  destination: string;
  customer: string;
  overseasPartner: Partner;
  agent?: Partner;
  charges: QuoteCharge[];
  details: QuoteDetails;
  milestones: Milestone[];
  documents?: DocumentStatus[];
  // Existing operational fields
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
  ncm?: string;
  netWeight?: string;
  packageQuantity?: string;
  freeTimeDemurrage?: string;
  transshipments?: TransshipmentDetail[];
};

// --- Milestone Templates & Due Date Calculation ---

const IMPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Instruções de Embarque Enviadas ao Agente': 0,
  'Carga Pronta': 7,
  'Booking Confirmado': 10,
  'Documentos Aprovados': 12,
  'Container Gate In (Entregue no Porto)': 13,
  'Confirmação de Embarque': 14,
  'Documentos Originais Emitidos': 16,
  'Transbordo': 0, // Placeholder
  'CE Mercante Lançado': 0, // Placeholder, calculated based on ETA
  'Chegada ao Destino': 0, // Placeholder, calculated based on ETD + transit time
};

const EXPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Confirmação de Booking': 2,
  'Coleta da Carga (se aplicável)': 4,
  'Chegada no Porto/Aeroporto': 6,
  'Desembaraço de Exportação': 7,
  'Embarque': 8,
  'Chegada no Destino': 0, // Placeholder
  'Confirmação de Entrega': 2, // Days after arrival
};

function generateInitialMilestones(isImport: boolean, transitTimeStr: string, creationDate: Date): Milestone[] {
    const transitTime = parseInt(transitTimeStr.split('-').pop() || '30', 10);

    if (isImport) {
        const milestoneNames = Object.keys(IMPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque']);
        const eta = addDays(etd, transitTime);

        return milestoneNames.map(name => {
            let predictedDate: Date;
            if (name === 'Chegada ao Destino') {
                predictedDate = eta;
            } else if (name === 'CE Mercante Lançado') {
                predictedDate = addDays(eta, -10);
            } else {
                predictedDate = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS[name]);
            }
            return { name, status: 'pending', predictedDate, effectiveDate: null, isTransshipment: false };
        });
    } else { // Export
        const milestoneNames = Object.keys(EXPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Embarque']);
        const eta = addDays(etd, transitTime);

         return milestoneNames.map(name => {
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
    }
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
 * Saves all shipments to localStorage.
 */
function saveShipments(shipments: Shipment[]): void {
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
export async function createShipment(quote: ShipmentCreationData, overseasPartner: Partner, agent?: Partner): Promise<Shipment> {
  const isImport = quote.destination.toUpperCase().includes('BR');
  const creationDate = new Date();
  const milestones = generateInitialMilestones(isImport, quote.details.transitTime, creationDate);
  
  if (milestones.length > 0) {
      milestones[0].status = 'in_progress';
  }

  const transitTime = parseInt(quote.details.transitTime.split('-').pop() || '30', 10);
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
    { name: 'Extrato DI', status: 'pending' },
  ];

  const newShipment: Shipment = {
    id: quote.id.replace('-DRAFT', ''),
    origin: quote.origin,
    destination: quote.destination,
    customer: quote.customer,
    overseasPartner,
    agent,
    charges: quote.charges,
    details: quote.details,
    milestones,
    documents,
    etd,
    eta,
    bookingNumber: `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    masterBillNumber: `MSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    houseBillNumber: `HSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    packageQuantity: quote.details.cargo,
    freeTimeDemurrage: quote.details.freeTime,
    mblPrintingAtDestination: false,
  };

  if (isImport && agent) {
    const freightCharge = quote.charges.find(c => c.name.toLowerCase().includes('frete'));
    const thcCharge = quote.charges.find(c => c.name.toLowerCase().includes('thc'));
    
    // Simulate sending email to agent
    await runSendShippingInstructions({
      agentName: agent.name,
      agentEmail: agent.contacts[0]?.email || 'agent@example.com',
      shipper: overseasPartner,
      consigneeName: quote.customer,
      notifyName: quote.customer,
      freightCost: freightCharge?.cost ? `${freightCharge.costCurrency} ${freightCharge.cost.toFixed(2)}` : 'N/A',
      freightSale: freightCharge?.sale ? `${freightCharge.saleCurrency} ${freightCharge.sale.toFixed(2)}` : 'N/A',
      agentProfit: agent.profitAgreement?.amount ? `USD ${agent.profitAgreement.amount.toFixed(2)}` : 'N/A',
      thcValue: thcCharge?.sale ? `${thcCharge.saleCurrency} ${thcCharge.sale.toFixed(2)}` : 'N/A',
      commodity: newShipment.commodityDescription || 'General Cargo',
      ncm: newShipment.ncm || 'N/A',
      updateLink: `https://cargainteligente.com/agent-portal/${newShipment.id}`,
    });
    console.log(`Shipping instructions sent for import shipment ${newShipment.id}`);
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
