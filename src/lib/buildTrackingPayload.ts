// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string; // Carrier's full name
}

/**
 * Builds the payload for the Cargo-flows API based on the tracking type.
 * @param input Object containing tracking number, carrier name, and type.
 * @returns The formatted payload for the Cargo-flows API.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine } = input;

  const formDataItem: { [key: string]: any } = {};

  switch (type) {
    case 'bookingNumber':
      formDataItem.uploadType = 'FORM_BY_BOOKING_NUMBER';
      formDataItem.bookingNumber = trackingNumber;
      // As per documentation/user feedback, oceanLine is crucial for booking number tracking.
      if (oceanLine) {
        formDataItem.oceanLine = oceanLine;
      } else {
        // This case should ideally be validated before calling the function.
        console.warn("oceanLine is recommended for booking number tracking.");
      }
      break;
    case 'containerNumber':
      formDataItem.uploadType = 'FORM_BY_CONTAINER_NUMBER';
      formDataItem.containerNumber = trackingNumber;
      if (oceanLine) {
        formDataItem.oceanLine = oceanLine;
      }
      break;
    case 'mblNumber':
      formDataItem.uploadType = 'FORM_BY_MBL_NUMBER';
      formDataItem.mblNumber = trackingNumber;
      break;
    default:
      throw new Error(`Invalid tracking type: ${type}`);
  }
  
  // The root object should only contain the formData array.
  return {
    formData: [formDataItem],
  };
}
