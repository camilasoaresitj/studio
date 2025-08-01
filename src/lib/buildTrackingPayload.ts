
interface TrackingInput {
  bookingNumber?: string;
  containerNumber?: string;
  mblNumber?: string;
  oceanLine?: string; 
}

export function buildTrackingPayload(input: TrackingInput) {
  const { bookingNumber, containerNumber, mblNumber, oceanLine } = input;

  // Montagem do payload para consulta por número de contêiner.
  if (containerNumber) {
    return {
      uploadType: 'FORM_BY_CONTAINER_NUMBER',
      formData: [{
        containerNumber,
        // Cargo-flows docs state oceanLine is required for container tracking
        oceanLine: oceanLine || "Hapag Lloyd", // Fallback, but should be provided
      }]
    };
  }

  // Montagem do payload para consulta por número de MBL.
  if (mblNumber) {
    return {
      uploadType: 'FORM_BY_MBL_NUMBER',
      formData: [{
        mblNumber,
        oceanLine: oceanLine || "Hapag Lloyd", // Fallback
      }]
    };
  }

  // Montagem do payload para consulta por número de Booking.
  if (bookingNumber) {
    return {
      uploadType: 'FORM_BY_BOOKING_NUMBER',
      formData: [{
        bookingNumber,
        oceanLine: oceanLine || "Hapag Lloyd", // Fallback
      }]
    };
  }

  // Lança um erro se nenhum identificador for fornecido.
  throw new Error('É necessário informar pelo menos um identificador: container, booking ou MBL.');
}
