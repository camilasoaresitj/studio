interface TrackingInput {
  bookingNumber?: string;
  containerNumber?: string;
  mblNumber?: string;
  oceanLine?: string;
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
}

/**
 * Constrói o payload para a API da Cargo-flows com base no tipo de rastreamento,
 * seguindo a estrutura especificada na documentação.
 * @param input Objeto contendo o número de rastreamento, o nome da transportadora e o tipo de número.
 * @returns O payload formatado para a API da Cargo-flows.
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, oceanLine, ...numbers } = input;

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

  const trackingNumber = numbers[type];
  if (!trackingNumber) {
    throw new Error(`Número de ${type} não fornecido.`);
  }
  if (!oceanLine) {
    throw new Error('Nome da transportadora (oceanLine) é obrigatório.');
  }

  const formData = {
    uploadType: getUploadType(),
    [type]: trackingNumber, // The field name is dynamic based on the type
    oceanLine: oceanLine,
  };

  return {
    formData: [formData],
  };
}
