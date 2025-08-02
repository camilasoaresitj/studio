// /src/lib/buildTrackingPayload.ts

interface TrackingInput {
  type: 'bookingNumber' | 'containerNumber' | 'mblNumber';
  trackingNumber: string;
  oceanLine?: string | null;
  carrierSpecific?: Record<string, any>;
}

/**
 * Builds the payload for the Cargo-flows API with improved structure and error handling.
 * Now places uploadType inside formData as per API documentation.
 * 
 * @param input Object containing:
 *   - type: The tracking type (bookingNumber, containerNumber, mblNumber)
 *   - trackingNumber: The actual tracking number
 *   - oceanLine: Optional carrier code
 *   - carrierSpecific: Optional carrier-specific data
 * @returns The properly formatted payload
 * @throws Error with detailed message if validation fails
 */
export function buildTrackingPayload(input: TrackingInput) {
  const { type, trackingNumber, oceanLine, carrierSpecific } = input;

  // Validate tracking number based on type
  if (!trackingNumber || typeof trackingNumber !== 'string') {
    throw new Error(`Invalid tracking number: must be a non-empty string. Received: ${trackingNumber}`);
  }

  const formDataItem: Record<string, any> = {
    uploadType: getUploadType(type), // uploadType now inside formData
    [getTrackingFieldName(type)]: trackingNumber
  };

  // Add carrier information if provided
  if (oceanLine) {
    if (typeof oceanLine !== 'string') {
      throw new Error(`oceanLine must be a string. Received: ${typeof oceanLine}`);
    }
    formDataItem.oceanLine = oceanLine;
  }

  // Add carrier-specific data if provided
  if (carrierSpecific) {
    if (typeof carrierSpecific !== 'object' || carrierSpecific === null) {
      throw new Error('carrierSpecific must be a non-null object');
    }
    formDataItem.carrierSpecific = carrierSpecific;
  }

  return {
    formData: [formDataItem]
  };
}

// Helper function to get the correct uploadType value
function getUploadType(type: string): string {
  const uploadTypes: Record<string, string> = {
    bookingNumber: 'FORM_BY_BOOKING_NUMBER',
    containerNumber: 'FORM_BY_CONTAINER_NUMBER',
    mblNumber: 'FORM_BY_MBL_NUMBER'
  };

  if (!uploadTypes[type]) {
    throw new Error(`Invalid tracking type: ${type}. Valid types are: ${Object.keys(uploadTypes).join(', ')}`);
  }

  return uploadTypes[type];
}

// Helper function to get the correct field name for each type
function getTrackingFieldName(type: string): string {
  const fieldNames: Record<string, string> = {
    bookingNumber: 'bookingNumber',
    containerNumber: 'containerNumber',
    mblNumber: 'mblNumber'
  };

  return fieldNames[type] || type;
}
