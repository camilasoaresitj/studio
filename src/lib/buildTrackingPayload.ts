// /src/lib/buildTrackingPayload.ts
import type { Shipment } from './shipment-data';

// This interface now accepts a full Shipment object for richer payloads.
interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string | null;
  shipment?: Shipment; // Optional full shipment data
}

/**
 * Builds a comprehensive payload for the Cargo-flows API.
 * It uses the full shipment object to include as much detail as possible.
 * 
 * @param input Object containing tracking info and the full shipment object.
 * @returns The properly formatted payload for shipment creation.
 * @throws Error with a detailed message if validation fails.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine, shipment } = input;

  if (!trackingNumber || typeof trackingNumber !== 'string') {
    throw new Error(`Invalid tracking number: must be a non-empty string. Received: ${trackingNumber}`);
  }

  // Base formData with required tracking info
  const formDataItem: Record<string, any> = {
    uploadType: getUploadType(type),
    [getTrackingFieldName(type)]: trackingNumber
  };

  // Add ocean line if available
  if (oceanLine) {
    if (typeof oceanLine !== 'string') {
      throw new Error(`oceanLine must be a string. Received: ${typeof oceanLine}`);
    }
    formDataItem.oceanLine = oceanLine;
  }
  
  // Enrich with detailed shipment data if provided
  if (shipment) {
      formDataItem.shipmentReference = shipment.id;
      formDataItem.mblNumber = shipment.masterBillNumber;
      formDataItem.hblNumber = shipment.houseBillNumber;
      formDataItem.bookingNumber = shipment.bookingNumber;
      formDataItem.poNumber = shipment.purchaseOrderNumber;
      formDataItem.invoice_number = shipment.invoiceNumber;
      formDataItem.consignee = shipment.consignee?.name;
      formDataItem.shipper = shipment.shipper?.name;
      formDataItem.promisedEta = shipment.eta ? new Date(shipment.eta).toISOString().split('T')[0] : undefined;
      formDataItem.promisedEtd = shipment.etd ? new Date(shipment.etd).toISOString().split('T')[0] : undefined;
      formDataItem.incoterm = shipment.incoterm || shipment.details?.incoterm;
      formDataItem.mode = shipment.modal === 'ocean' ? (shipment.oceanShipmentType || 'FCL') : 'Air';
      formDataItem.totalWeight = shipment.grossWeight;
      formDataItem.weightUom = 'KG';

      // Add container number if not the primary tracking ID
      if (type !== 'containerNumber' && shipment.containers && shipment.containers.length > 0) {
        formDataItem.containerNumber = shipment.containers[0].number;
      }
  }

  return {
    formData: [formDataItem]
  };
}

// Helper to get the correct uploadType value
function getUploadType(type: string): string {
  const uploadTypes: Record<string, string> = {
    bookingNumber: 'FORM_BY_BOOKING_NUMBER',
    containerNumber: 'FORM_BY_CONTAINER_NUMBER',
    mblNumber: 'FORM_BY_MBL_NUMBER'
  };

  if (!uploadTypes[type]) {
    throw new Error(`Invalid tracking type: ${type}. Valid types are: ${Object.keys(uploadTypes).join(', ')}`);
  }

  return uploadTypes[type];
}

// Helper to get the correct field name for each type
function getTrackingFieldName(type: string): string {
  const fieldNames: Record<string, string> = {
    bookingNumber: 'bookingNumber',
    containerNumber: 'containerNumber',
    mblNumber: 'mblNumber'
  };

  return fieldNames[type] || type;
}
