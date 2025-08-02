// /src/lib/buildTrackingPayload.ts
import type { Shipment } from './shipment-data';

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string | null;
  shipment?: Shipment; // Optional full shipment data
}

export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine, shipment } = input;

  if (!trackingNumber || typeof trackingNumber !== 'string') {
    throw new Error(`Invalid tracking number: must be a non-empty string. Received: ${trackingNumber}`);
  }

  const formDataItem: Record<string, any> = {};

  // Prioritize MBL for tracking
  if (shipment?.masterBillNumber) {
    formDataItem[getTrackingFieldName('mblNumber')] = shipment.masterBillNumber;
  } else {
    formDataItem[getTrackingFieldName(type)] = trackingNumber;
  }

  if (oceanLine) {
    if (typeof oceanLine !== 'string') {
      throw new Error(`oceanLine must be a string. Received: ${typeof oceanLine}`);
    }
    formDataItem.oceanLine = oceanLine;
  }
  
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

      if (type !== 'containerNumber' && shipment.containers && shipment.containers.length > 0) {
        formDataItem.containerNumber = shipment.containers[0].number;
      }
  }

  return {
    formData: [formDataItem],
    uploadType: getUploadType(shipment?.masterBillNumber ? 'mblNumber' : type)
  };
}

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

function getTrackingFieldName(type: string): string {
  const fieldNames: Record<string, string> = {
    bookingNumber: 'bookingNumber',
    containerNumber: 'containerNumber',
    mblNumber: 'mblNumber'
  };

  return fieldNames[type] || type;
}
