// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine: string; // Carrier's full name is used for the oceanLine field
}

/**
 * Builds the payload for the Cargo-flows API based on the tracking type.
 * @param input Object containing tracking number, full carrier name, and type.
 * @returns The formatted payload for the Cargo-flows API.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine } = input;

  const formDataItem: { [key: string]: any } = {};

  switch (type) {
    case 'bookingNumber':
      formDataItem.uploadType = 'FORM_BY_BOOKING_NUMBER';
      formDataItem.bookingNumber = trackingNumber;
      formDataItem.oceanLine = oceanLine;
      break;
    case 'containerNumber':
      formDataItem.uploadType = 'FORM_BY_CONTAINER_NUMBER';
      formDataItem.containerNumber = trackingNumber;
      formDataItem.oceanLine = oceanLine;
      break;
    case 'mblNumber':
      formDataItem.uploadType = 'FORM_BY_MBL_NUMBER';
      formDataItem.mblNumber = trackingNumber;
      formDataItem.oceanLine = oceanLine;
      break;
    default:
      throw new Error(`Invalid tracking type: ${type}`);
  }
  
  // The final payload must be an object with a 'formData' key, which is an array of tracking objects.
  return {
    formData: [formDataItem],
  };
}
