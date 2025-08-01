// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string; // This should be the carrier's full name
}

/**
 * Constrói o payload para a API da Cargo-flows com base no tipo de rastreamento.
 * @param input Objeto contendo o número de rastreamento, o nome da transportadora e o tipo de número.
 * @returns O payload formatado para a API da Cargo-flows.
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
      break;
    default:
      throw new Error(`Tipo de rastreamento inválido: ${type}`);
  }
  
  return {
    uploadType: uploadType,
    formData: [formDataObject],
  };
}
