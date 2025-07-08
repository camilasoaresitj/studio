
'use client';

import type { Partner } from '@/components/partners-registry';

const SHIPMENTS_STORAGE_KEY = 'cargaInteligente_shipments';

export type Milestone = {
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  date: string | null;
};

export type Shipment = {
  id: string; // Using quote ID
  origin: string;
  destination: string;
  customer: string;
  overseasPartner: Partner;
  agent?: Partner;
  milestones: Milestone[];
};

// Using a minimal quote type here to avoid circular dependencies
// as customer-quotes-list.tsx imports from this file.
type MinimalQuote = {
  id: string;
  origin: string;
  destination: string;
  customer: string;
};


const getDefaultImportMilestones = (): Milestone[] => [
  { name: 'Confirmação de Booking', status: 'pending', date: null },
  { name: 'Coleta da Carga', status: 'pending', date: null },
  { name: 'Chegada no Porto/Aeroporto de Origem', status: 'pending', date: null },
  { name: 'Embarque', status: 'pending', date: null },
  { name: 'Chegada no Porto/Aeroporto de Destino', status: 'pending', date: null },
  { name: 'Desembaraço Aduaneiro', status: 'pending', date: null },
  { name: 'Carga Liberada', status: 'pending', date: null },
  { name: 'Entrega Final', status: 'pending', date: null },
];

const getDefaultExportMilestones = (): Milestone[] => [
  { name: 'Confirmação de Booking', status: 'pending', date: null },
  { name: 'Coleta da Carga (se aplicável)', status: 'pending', date: null },
  { name: 'Chegada no Porto/Aeroporto', status: 'pending', date: null },
  { name: 'Desembaraço de Exportação', status: 'pending', date: null },
  { name: 'Embarque', status: 'pending', date: null },
  { name: 'Chegada no Destino', status: 'pending', date: null },
  { name: 'Confirmação de Entrega', status: 'pending', date: null },
];


/**
 * Retrieves all shipments from localStorage.
 */
export function getShipments(): Shipment[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedShipments = localStorage.getItem(SHIPMENTS_STORAGE_KEY);
    return storedShipments ? JSON.parse(storedShipments) : [];
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

/**
 * Creates a new shipment from an approved quote and saves it.
 */
export function createShipment(quote: MinimalQuote, overseasPartner: Partner, agent?: Partner): Shipment {
  const isImport = quote.destination.toUpperCase().includes('BR');
  
  const newShipment: Shipment = {
    id: quote.id.replace('-DRAFT', ''),
    origin: quote.origin,
    destination: quote.destination,
    customer: quote.customer,
    overseasPartner,
    agent,
    milestones: isImport ? getDefaultImportMilestones() : getDefaultExportMilestones(),
  };

  const shipments = getShipments();
  const existingIndex = shipments.findIndex(s => s.id === newShipment.id);

  if (existingIndex > -1) {
    shipments[existingIndex] = newShipment; // Overwrite if it already exists
  } else {
    shipments.unshift(newShipment); // Add to the beginning of the list
  }
  
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
    console.error("Attempted to update a shipment that does not exist.");
    return shipments;
  }

  shipments[shipmentIndex] = updatedShipment;
  saveShipments(shipments);
  return shipments;
}
