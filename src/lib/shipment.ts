
'use client';

import { 
    getShipments as getShipmentsData, 
    saveShipments as saveShipmentsData,
} from './shipment-data';
import type { 
    Shipment, 
    Milestone,
    TransshipmentDetail,
    DocumentStatus,
    QuoteCharge,
    QuoteDetails,
    UploadedDocument,
    ShipmentCreationData,
    ContainerDetail,
    BLDraftData,
    ChatMessage,
    BLDraftRevision,
    BLDraftHistory
} from './shipment-data';

// This file re-exports the functions and types for client-side usage.
// Crucially, it only exports functions, not types, to comply with 'use server' constraints in consuming files.

export const getShipments = getShipmentsData;
export const saveShipments = saveShipmentsData;

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


// Export types for client-side components that need them
export type {
    Shipment, 
    Milestone,
    TransshipmentDetail,
    DocumentStatus,
    QuoteCharge,
    QuoteDetails,
    UploadedDocument,
    ShipmentCreationData,
    ContainerDetail,
    BLDraftData,
    ChatMessage,
    BLDraftRevision,
    BLDraftHistory
};
