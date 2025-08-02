// /src/lib/errors.ts - Classe de erro personalizada
export class EnhancedPollingError extends Error {
  constructor(
    originalError: any,
    public trackingNumber: string,
    public attempts: number,
    public lastPayload?: any
  ) {
    super(`Failed to poll for shipment ${trackingNumber} after ${attempts} attempts`);
    this.name = 'EnhancedPollingError';
    
    if (originalError instanceof Error) {
      this.stack = originalError.stack;
      this.message += `: ${originalError.message}`;
    }
  }

  toResponse() {
    return {
      status: 'error',
      message: this.message,
      trackingNumber: this.trackingNumber,
      attempts: this.attempts,
      code: 'POLLING_FAILURE',
      timestamp: new Date().toISOString(),
      ...(this.lastPayload && { lastPayload: this.lastPayload })
    };
  }
}
