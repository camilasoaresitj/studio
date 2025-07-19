// src/lib/buildTrackingPayload.ts

interface TrackingInput {
  bookingNumber?: string;
  containerNumber?: string;
  mblNumber?: string;
  oceanLine?: string; // Optional, but useful if known
}

export function buildTrackingPayload(input: TrackingInput) {
  const { bookingNumber, containerNumber, mblNumber, oceanLine } = input;

  if (containerNumber) {
    return {
      uploadType: 'FORM_BY_CONTAINER_NUMBER',
      formData: [
        {
          uploadType: 'FORM_BY_CONTAINER_NUMBER',
          containerNumber,
          bookingNumber,
          mblNumber,
          oceanLine,
        },
      ],
    };
  }

  if (mblNumber) {
    return {
      uploadType: 'FORM_BY_MBL_NUMBER',
      formData: [
        {
          uploadType: 'FORM_BY_MBL_NUMBER',
          mblNumber,
        },
      ],
    };
  }

  if (bookingNumber) {
    return {
      uploadType: 'FORM_BY_BOOKING_NUMBER',
      formData: [
        {
          uploadType: 'FORM_BY_BOOKING_NUMBER',
          bookingNumber,
        },
      ],
    };
  }

  throw new Error('É necessário informar pelo menos um identificador: container, booking ou MBL.');
}
