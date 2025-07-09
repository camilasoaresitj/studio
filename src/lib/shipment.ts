
'use client';

import type { Partner } from '@/components/partners-registry';
import { addDays, isValid, parse } from 'date-fns';

const SHIPMENTS_STORAGE_KEY = 'cargaInteligente_shipments';

// --- Type Definitions ---

export type QuoteCharge = {
  id: string;
  name: string;
  type: string;
  cost: number;
  costCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  sale: number;
  saleCurrency: 'USD' | 'BRL' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
  supplier: string;
};

export type QuoteDetails = {
    cargo: string;
    transitTime: string;
    validity: string;
    freeTime: string;
};

// The shape of the quote object needed to create a shipment
export type ShipmentCreationData = {
  id: string;
  origin: string;
  destination: string;
  customer: string;
  charges: QuoteCharge[];
  details: QuoteDetails;
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
  // Existing operational fields
  bookingNumber?: string;
  courier?: 'DHL' | 'UPS' | 'FedEx' | 'Outro';
  courierNumber?: string;
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

const BASE_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Confirmação de Booking': 2,
  'Coleta da Carga': 4,
  'Coleta da Carga (se aplicável)': 4,
  'Chegada no Porto/Aeroporto de Origem': 6,
  'Chegada no Porto/Aeroporto': 6,
  'Embarque': 8,
  'Desembaraço de Exportação': 7,
  'Chegada no Porto/Aeroporto de Destino': 0, // Placeholder
  'Chegada no Destino': 0, // Placeholder
  'Desembaraço Aduaneiro': 2, // Days after arrival
  'Carga Liberada': 4, // Days after arrival
  'Entrega Final': 6, // Days after arrival
  'Confirmação de Entrega': 2, // Days after arrival
};

function generateInitialMilestones(isImport: boolean, transitTimeStr: string, creationDate: Date): Milestone[] {
    const baseMilestoneNames = isImport 
        ? ['Confirmação de Booking', 'Coleta da Carga', 'Chegada no Porto/Aeroporto de Origem', 'Embarque', 'Chegada no Porto/Aeroporto de Destino', 'Desembaraço Aduaneiro', 'Carga Liberada', 'Entrega Final']
        : ['Confirmação de Booking', 'Coleta da Carga (se aplicável)', 'Chegada no Porto/Aeroporto', 'Desembaraço de Exportação', 'Embarque', 'Chegada no Destino', 'Confirmação de Entrega'];

    const transitTime = parseInt(transitTimeStr.split('-').pop() || '30', 10);
    const departureDate = addDays(creationDate, BASE_MILESTONE_DUE_DAYS['Embarque']);
    const arrivalDate = addDays(departureDate, transitTime);

    return baseMilestoneNames.map(name => {
        let predictedDate: Date;
        if (name.includes('Chegada no') && (name.includes('Destino') || name.includes('Aeroporto de Destino'))) {
            predictedDate = arrivalDate;
        } else if (name === 'Desembaraço Aduaneiro' || name === 'Carga Liberada' || name === 'Entrega Final' || name === 'Confirmação de Entrega') {
            predictedDate = addDays(arrivalDate, BASE_MILESTONE_DUE_DAYS[name]);
        } else {
            predictedDate = addDays(creationDate, BASE_MILESTONE_DUE_DAYS[name]);
        }
        
        return {
            name,
            status: 'pending',
            predictedDate,
            effectiveDate: null,
            isTransshipment: false,
        };
    });
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
export function createShipment(quote: ShipmentCreationData, overseasPartner: Partner, agent?: Partner): Shipment {
  const isImport = quote.destination.toUpperCase().includes('BR');
  const creationDate = new Date();
  const milestones = generateInitialMilestones(isImport, quote.details.transitTime, creationDate);
  
  if (milestones.length > 0) {
      milestones[0].status = 'in_progress';
  }

  const transitTime = parseInt(quote.details.transitTime.split('-').pop() || '30', 10);
  const etd = addDays(creationDate, BASE_MILESTONE_DUE_DAYS['Embarque']);
  const eta = addDays(etd, transitTime);
  
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
    // Initialize operational fields
    bookingNumber: `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    etd,
    eta,
    vesselName: '',
    voyageNumber: '',
    masterBillNumber: `MSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    houseBillNumber: `HSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    containers: quote.details.cargo.toLowerCase().includes('fcl') ? [{
      id: `cont-1`,
      number: 'TBC',
      seal: 'TBC',
      tare: 'TBC',
      grossWeight: 'TBC',
      freeTime: '14 dias',
    }] : [],
    commodityDescription: '',
    ncm: '',
    netWeight: '',
    packageQuantity: quote.details.cargo,
    freeTimeDemurrage: quote.details.freeTime,
    transshipments: [],
  };

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
