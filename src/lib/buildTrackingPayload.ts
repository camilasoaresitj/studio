
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
  
  const payload: Record<string, any> = {
    trackingNumber: primaryTrackingNumber,
    trackingType: primaryType,
  };

  if (oceanLine) {
    payload.oceanCarrier = oceanLine;
  }

  if (shipment?.id) {
    payload.referenceId = shipment.id;
  }

  return payload;
}
