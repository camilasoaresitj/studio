
interface TrackingInput {
  bookingNumber?: string;
  containerNumber?: string;
  mblNumber?: string;
  oceanLine?: string;
  productNumber?: string; // Adicionado conforme documentação
}

export function buildTrackingPayload(input: TrackingInput) {
  const { bookingNumber, containerNumber, mblNumber, oceanLine, productNumber } = input;

  if (containerNumber) {
    const payload: any = {
      uploadType: 'FORM_BY_CONTAINER_NUMBER',
      formData: [{
        uploadType: 'FORM_BY_CONTAINER_NUMBER',
        containerNumber,
      }]
    };

    // Adiciona campos opcionais apenas se fornecidos
    if (productNumber) {
      payload.formData[0].productNumber = productNumber;
    }
    if (oceanLine) {
      payload.formData[0].oceanLine = oceanLine;
    }

    return payload;
  }

  if (mblNumber) {
    const payload: any = {
      uploadType: 'FORM_BY_MBL_NUMBER',
      formData: [{
        uploadType: 'FORM_BY_MBL_NUMBER',
        mblNumber,
      }]
    };

    if (productNumber) {
      payload.formData[0].productNumber = productNumber;
    }

    return payload;
  }

  if (bookingNumber) {
    const payload: any = {
      uploadType: 'FORM_BY_BOOKING_NUMBER',
      formData: [{
        uploadType: 'FORM_BY_BOOKING_NUMBER',
        bookingNumber,
      }]
    };

    if (productNumber) {
      payload.formData[0].productNumber = productNumber;
    }

    return payload;
  }

  throw new Error('É necessário informar pelo menos um identificador: container, booking ou MBL.');
}
