// /src/lib/buildTrackingPayload.ts
import type { Shipment } from './shipment-data';
import { findPortByTerm } from './ports';

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string | null;
  shipment?: Shipment; // Optional full shipment data
}

function getCountryCode(locationName: string): string | undefined {
    if (!locationName) return undefined;
    const port = findPortByTerm(locationName);
    if (port) return port.country;
    
    const parts = locationName.split(',').map(p => p.trim());
    const countryCode = parts.pop();
    if (countryCode && countryCode.length === 2) {
        return countryCode.toUpperCase();
    }
    return undefined;
}


export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine, shipment } = input;

  if (!trackingNumber || typeof trackingNumber !== 'string') {
    throw new Error(`Invalid tracking number: must be a non-empty string. Received: ${trackingNumber}`);
  }

  // Determine the primary tracking type and number based on priority: Booking > MBL > Container
  let primaryType: 'bookingNumber' | 'mblNumber' | 'containerNumber';
  let primaryTrackingNumber: string;

  if (shipment?.bookingNumber) {
      primaryType = 'bookingNumber';
      primaryTrackingNumber = shipment.bookingNumber;
  } else if (shipment?.masterBillNumber) {
      primaryType = 'mblNumber';
      primaryTrackingNumber = shipment.masterBillNumber;
  } else {
      primaryType = type;
      primaryTrackingNumber = trackingNumber;
  }


  const formDataItem: Record<string, any> = {
      [getTrackingFieldName(primaryType)]: primaryTrackingNumber,
  };
  
  if (oceanLine) {
    if (typeof oceanLine !== 'string') {
      throw new Error(`oceanLine must be a string. Received: ${typeof oceanLine}`);
    }
    formDataItem.oceanLine = oceanLine;
  }
  
  if (shipment) {
      formDataItem.shipmentNumber = shipment.id;
      // Correctly map all available identifiers
      formDataItem.mblNumber = shipment.masterBillNumber;
      formDataItem.hblNumber = shipment.houseBillNumber;
      formDataItem.bookingNumber = shipment.bookingNumber;
      
      formDataItem.poNumber = shipment.purchaseOrderNumber;
      formDataItem.invoice_number = shipment.invoiceNumber;
      formDataItem.consignee = shipment.consignee?.name;
      formDataItem.shipper = shipment.shipper?.name;
      formDataItem.origin_country = getCountryCode(shipment.origin);
      formDataItem.destination_country = getCountryCode(shipment.destination);
      formDataItem.promisedEta = shipment.eta ? new Date(shipment.eta).toISOString().split('T')[0] : undefined;
      formDataItem.promisedEtd = shipment.etd ? new Date(shipment.etd).toISOString().split('T')[0] : undefined;
      formDataItem.incoterm = shipment.incoterm || shipment.details?.incoterm;
      formDataItem.mode = shipment.modal === 'ocean' ? (shipment.oceanShipmentType || 'FCL') : 'Air';
      
      const totalWeight = shipment.grossWeight || shipment.charges?.reduce((sum, charge) => sum + (charge.cost || 0), 0) || 0;
      formDataItem.totalWeight = totalWeight;
      formDataItem.weightUom = 'KG';

      if (shipment.containers && shipment.containers.length > 0) {
        formDataItem.containerNumber = shipment.containers[0].number;
      }
  }

  return {
    formData: [formDataItem],
    uploadType: getUploadType(primaryType)
  };
}

function getUploadType(type: 'bookingNumber' | 'containerNumber' | 'mblNumber'): string {
  const uploadTypes: Record<string, string> = {
    bookingNumber: 'FORM_BY_BOOKING_NUMBER',
    containerNumber: 'FORM_BY_CONTAINER_NUMBER',
    mblNumber: 'FORM_BY_MBL_NUMBER'
  };

  return uploadTypes[type];
}

function getTrackingFieldName(type: 'bookingNumber' | 'containerNumber' | 'mblNumber'): string {
  const fieldNames: Record<string, string> = {
    bookingNumber: 'bookingNumber',
    containerNumber: 'containerNumber',
    mblNumber: 'mblNumber'
  };

  return fieldNames[type];
}
