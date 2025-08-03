// /src/lib/shipmentPoller.ts - Polling confiável
import { getAuthHeaders } from './apiUtils';
import { EnhancedPollingError } from './errors';

const SHIPMENT_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1/shipments';

async function safelyParseJSON(response: Response, trackingNumber: string, attempt: number) {
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (!contentType.includes('application/json')) {
        console.error(`Attempt ${attempt}: Failed to parse API response for ${trackingNumber}: Content-Type is not JSON.`, `ContentType: ${contentType}`, `Body: ${text.substring(0, 500)}`);
        const statusText = response.statusText || 'Invalid Response';
        throw new Error(`API Error ${response.status} (${statusText}): Expected JSON but received ${contentType || 'text/plain'}.`);
    }

    try {
        if (text === '') return null;
        return JSON.parse(text);
    } catch (e: any) {
        console.error(`Attempt ${attempt}: Failed to parse API response as JSON for ${trackingNumber}:`, text.substring(0, 500));
        throw new Error(`Invalid JSON response: ${e.message}`);
    }
}


export async function pollShipmentStatus(trackingNumber: string, type: string, carrierName: string | null, maxAttempts = 5) {
  const baseDelay = 3000;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const delay = attempts > 0 ? Math.min(baseDelay * Math.pow(2, attempts), 30000) : 0;
      if(delay > 0) {
        console.log(`Polling attempt ${attempts + 1}: Waiting ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const url = `${SHIPMENT_URL}?${type}=${encodeURIComponent(trackingNumber)}`;
      
      const response = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(15000)
      });

      if (response.status === 204) {
          console.log(`Polling attempt ${attempts + 1}: Received 204 No Content for ${trackingNumber}.`);
          attempts++;
          continue;
      }

      if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Polling attempt ${attempts + 1} for ${trackingNumber} failed with status ${response.status}: ${errorBody.substring(0, 200)}`);
          throw new Error(`API Error ${response.status}: ${errorBody.substring(0, 200)}`);
      }
      
      const data = await safelyParseJSON(response, trackingNumber, attempts + 1);
      if (data && (Array.isArray(data) ? data.length > 0 : true)) {
        return {
          status: 'found' as const,
          shipment: Array.isArray(data) ? data[0] : data,
          attempts: attempts + 1
        };
      }

      attempts++;
    } catch (error) {
      console.error(`Polling attempt ${attempts + 1} for ${trackingNumber} failed:`, error);
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new EnhancedPollingError(error, trackingNumber, attempts);
      }
    }
  }

  return {
    status: 'not_found' as const,
    attempts,
    lastAttempt: new Date().toISOString()
  };
}
