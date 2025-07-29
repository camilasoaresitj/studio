

// This file is DEPRECATED and should not be used.
// All shipment data logic has been consolidated into shipment-data.ts.
// It is kept for historical purposes to avoid breaking older imports, but will be removed.

import { 
    getShipments as getShipmentsData, 
    saveShipments as saveShipmentsData,
    getShipmentById as getShipmentByIdData,
    updateShipment as updateShipmentData,
} from '@/lib/shipment-data';
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
} from '@/lib/shipment-data';

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

// All other functions like createShipment have been moved to server actions in app/actions.ts
