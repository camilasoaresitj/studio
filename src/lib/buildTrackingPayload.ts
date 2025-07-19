// src/lib/buildTrackingPayload.ts

type TrackingPayloadInput = {
  bookingNumber: string;
  containerNumber?: string;
  mblNumber?: string;
  oceanLine: string;
  carrierCode: string;
  product?: {
    productNumber: string;
    productDescription: string;
    productQuantity: number;
    unitPrice: number;
    priceCurrency: string;
  };
};

export function buildCargoFlowsPayload(input: TrackingPayloadInput) {
  if (!input.bookingNumber || !input.oceanLine || !input.carrierCode) {
    throw new Error("Campos obrigatórios ausentes: bookingNumber, oceanLine, carrierCode.");
  }

  const formEntry: any = {
    bookingNumber: input.bookingNumber,
    oceanLine: input.oceanLine,
    carrierCode: input.carrierCode,
  };

  if (input.containerNumber) {
    formEntry.containerNumber = input.containerNumber;
  }

  if (input.mblNumber) {
    formEntry.mblNumber = input.mblNumber;
  }

  if (input.product) {
    const { productNumber, productDescription, productQuantity, unitPrice, priceCurrency } = input.product;

    if (!productNumber) {
      throw new Error("productNumber é obrigatório ao enviar dados de produto.");
    }

    Object.assign(formEntry, {
      productNumber,
      productDescription,
      productQuantity,
      unitPrice,
      priceCurrency,
    });
  }

  let uploadType: string = "FORM_BY_BOOKING_NUMBER";
  if (input.containerNumber) {
    uploadType = "FORM_BY_CONTAINER_NUMBER";
  } else if (input.mblNumber) {
    uploadType = "FORM_BY_MBL_NUMBER";
  }

  return {
    formData: [formEntry],
    uploadType,
  };
}
