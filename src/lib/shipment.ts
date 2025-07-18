
'use client';

import { 
    getShipments as getShipmentsData, 
    getShipmentById as getShipmentByIdData, 
    saveShipments as saveShipmentsData,
    createShipment as createShipmentData,
    rebuildMilestones as rebuildMilestonesData,
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
export const getShipmentById = getShipmentByIdData;
export const saveShipments = saveShipmentsData;
export const createShipment = createShipmentData;
export const rebuildMilestones = rebuildMilestonesData;

/**
 * Updates an existing shipment. This function is designed to be used
 * on the client-side, as it interacts with localStorage.
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
