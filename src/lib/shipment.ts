

'use client';

import { 
    getShipments as getShipmentsData, 
    getShipmentById as getShipmentByIdData, 
    saveShipments as saveShipmentsData,
    createShipment as createShipmentData,
    updateShipment as updateShipmentData,
    rebuildMilestones as rebuildMilestonesData,
} from './shipment-data';
import type { 
    Shipment as ShipmentType, 
    Milestone as MilestoneType,
    TransshipmentDetail as TransshipmentDetailType,
    DocumentStatus as DocumentStatusType,
    QuoteCharge as QuoteChargeType,
    QuoteDetails as QuoteDetailsType,
    UploadedDocument as UploadedDocumentType,
    ShipmentCreationData as ShipmentCreationDataType,
    ContainerDetail as ContainerDetailType,
    BLDraftData as BLDraftDataType,
    ChatMessage as ChatMessageType,
    BLDraftRevision as BLDraftRevisionType,
    BLDraftHistory as BLDraftHistoryType
} from './shipment-data';

// Re-export all types
export type Shipment = ShipmentType;
export type Milestone = MilestoneType;
export type TransshipmentDetail = TransshipmentDetailType;
export type DocumentStatus = DocumentStatusType;
export type QuoteCharge = QuoteChargeType;
export type QuoteDetails = QuoteDetailsType;
export type UploadedDocument = UploadedDocumentType;
export type ShipmentCreationData = ShipmentCreationDataType;
export type ContainerDetail = ContainerDetailType;
export type BLDraftData = BLDraftDataType;
export type ChatMessage = ChatMessageType;
export type BLDraftRevision = BLDraftRevisionType;
export type BLDraftHistory = BLDraftHistoryType;

// Re-export all functions
export const getShipments = getShipmentsData;
export const getShipmentById = getShipmentByIdData;
export const saveShipments = saveShipmentsData;
export const createShipment = createShipmentData;
export const updateShipment = updateShipmentData;
export const rebuildMilestones = rebuildMilestonesData;
