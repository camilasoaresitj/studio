
'use client';

// This file is DEPRECATED and should not be used.
// All shipment data logic has been consolidated into shipment-data.ts.
// It is kept for historical purposes to avoid breaking older imports, but will be removed.

export { 
    getShipments, 
    saveShipments,
    getShipmentById,
    updateShipment,
} from './shipment-data';

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
} from './shipment-data';

// All other functions like createShipment have been moved to server actions in app/actions.ts
