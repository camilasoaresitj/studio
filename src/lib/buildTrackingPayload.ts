// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string; // SCAC code for the carrier
}

/**
 * Builds the payload for the Cargo-flows API based on the tracking type.
 * @param input Object containing tracking number, type, and optional oceanLine (SCAC).
 * @returns The formatted payload for the Cargo-flows API.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine } = input;

  const formDataItem: { [key: string]: any } = {};

  switch (type) {
    case 'bookingNumber':
      formDataItem.uploadType = 'FORM_BY_BOOKING_NUMBER';
      formDataItem.bookingNumber = trackingNumber;
      break;
    case 'containerNumber':
      formDataItem.uploadType = 'FORM_BY_CONTAINER_NUMBER';
      formDataItem.containerNumber = trackingNumber;
      break;
    case 'mblNumber':
      formDataItem.uploadType = 'FORM_BY_MBL_NUMBER';
      formDataItem.mblNumber = trackingNumber;
      break;
    default:
      throw new Error(`Invalid tracking type: ${type}`);
  }

  // A API da Cargo-flows espera o SCAC code no campo oceanLine para a criação.
  if (oceanLine) {
    formDataItem.oceanLine = oceanLine;
  }
  
  return {
    formData: [formDataItem],
  };
}
