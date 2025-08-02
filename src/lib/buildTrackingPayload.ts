// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  // O campo oceanLine foi removido da entrada, pois a API pode inferi-lo.
}

/**
 * Builds the payload for the Cargo-flows API based on the tracking type.
 * A API infere a transportadora a partir do número de rastreamento.
 * @param input Object containing tracking number and type.
 * @returns The formatted payload for the Cargo-flows API.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber } = input;

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
  
  // O payload final deve ser um objeto com uma chave 'formData', que é um array.
  return {
    formData: [formDataItem],
  };
}
