
'use client';

import { 
    getShipments as getShipmentsData, 
    saveShipments as saveShipmentsData,
    getShipmentById as getShipmentByIdData,
    updateShipment as updateShipmentData,
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
    BLDraftHistory,
    Partner,
    ActivityLog,
    ApprovalLog
} from './shipment-data';

export const getShipments = getShipmentsData;
export const saveShipments = saveShipmentsData;
export const getShipmentById = getShipmentByIdData;
export const updateShipment = updateShipmentData;


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
    BLDraftHistory,
    Partner,
    ActivityLog,
    ApprovalLog
};
