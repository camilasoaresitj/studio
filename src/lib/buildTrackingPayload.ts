// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string; // This should be the carrier's full name, optional for MBL
}

/**
 * Builds the payload for the Cargo-flows API based on the tracking type,
 * following the corrected structure from user feedback and documentation.
 * @param input Object containing tracking number, carrier name, and type.
 * @returns The formatted payload for the Cargo-flows API.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine } = input;

  let uploadType: string;
  const formDataObject: { [key: string]: any } = {};

  switch (type) {
    case 'bookingNumber':
      uploadType = 'FORM_BY_BOOKING_NUMBER';
      formDataObject.bookingNumber = trackingNumber;
      if (oceanLine) {
        formDataObject.oceanLine = oceanLine;
      }
      break;
    case 'containerNumber':
      uploadType = 'FORM_BY_CONTAINER_NUMBER';
      formDataObject.containerNumber = trackingNumber;
      if (oceanLine) {
        formDataObject.oceanLine = oceanLine;
      }
      break;
    case 'mblNumber':
      uploadType = 'FORM_BY_MBL_NUMBER';
      formDataObject.mblNumber = trackingNumber;
      // oceanLine is typically not needed for MBL tracking
      break;
    default:
      // This is a safeguard, but the type system should prevent this.
      throw new Error(`Tipo de rastreamento inválido: ${type}`);
  }
  
  // The root object contains uploadType and the formData array.
  return {
    uploadType: uploadType,
    formData: [formDataObject],
  };
}
