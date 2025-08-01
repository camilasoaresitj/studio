// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string; // This should be the carrier's full name
}

/**
 * Constrói o payload para a API da Cargo-flows com base no tipo de rastreamento,
 * seguindo a estrutura especificada na documentação.
 * @param input Objeto contendo o número de rastreamento, o nome da transportadora e o tipo de número.
 * @returns O payload formatado para a API da Cargo-flows.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine } = input;

  const getUploadType = () => {
    switch (type) {
      case 'bookingNumber':
        return 'FORM_BY_BOOKING_NUMBER';
      case 'containerNumber':
        return 'FORM_BY_CONTAINER_NUMBER';
      case 'mblNumber':
        return 'FORM_BY_MBL_NUMBER';
      default:
        throw new Error(`Tipo de rastreamento inválido: ${type}`);
    }
  };

  const uploadType = getUploadType();
  const formDataObject: { [key: string]: any } = {
    [type]: trackingNumber,
  };

  // The API seems to require oceanLine for container and booking lookups to be reliable
  if (oceanLine && (type === 'containerNumber' || type === 'bookingNumber')) {
    formDataObject.oceanLine = oceanLine;
  }
  
  // Correct payload structure per user's curl example
  return {
    uploadType: uploadType,
    formData: [formDataObject],
  };
}
