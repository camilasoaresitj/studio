// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string | null;
}

/**
 * Builds the payload for the Cargo-flows API based on the tracking type.
 * This version matches the official documentation with a top-level uploadType.
 * @param input Object containing tracking number, type, and optional oceanLine (carrier name).
 * @returns The formatted payload for the Cargo-flows API.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine } = input;

  const formDataItem: { [key: string]: any } = {};
  let uploadType = '';

  switch (type) {
    case 'bookingNumber':
      uploadType = 'FORM_BY_BOOKING_NUMBER';
      formDataItem.bookingNumber = trackingNumber;
      break;
    case 'containerNumber':
      uploadType = 'FORM_BY_CONTAINER_NUMBER';
      formDataItem.containerNumber = trackingNumber;
      break;
    case 'mblNumber':
      uploadType = 'FORM_BY_MBL_NUMBER';
      formDataItem.mblNumber = trackingNumber;
      break;
    default:
      throw new Error(`Invalid tracking type: ${type}`);
  }

  // The oceanLine should be the carrier's name as per the last successful tests.
  if (oceanLine) {
    formDataItem.oceanLine = oceanLine;
  }
  
  return {
    formData: [formDataItem],
    uploadType: uploadType, // uploadType is a top-level key
  };
}
