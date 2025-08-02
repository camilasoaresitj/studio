// /src/lib/shipmentPoller.ts - Polling confiável
import { getAuthHeaders } from './apiUtils';
import { EnhancedPollingError } from './errors';

const SHIPMENT_URL = 'https://connect.cargoes.com/flow/api/public_tracking/v1/shipments';

async function safelyParseJSON(response: Response) {
    const text = await response.text();
    
    // Check if the response is likely HTML
    if (text.trim().startsWith('<')) {
        console.error("Failed to parse API response: Received HTML instead of JSON.", text.substring(0, 500));
        throw new Error(`Unexpected API response. Server returned HTML.`);
    }

    try {
        if (text === '') return null;
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse API response as JSON:", text.substring(0, 500));
        throw new Error(`Failed to parse API response. Content received: ${text.substring(0, 200)}`);
    }
}


export async function pollShipmentStatus(trackingNumber: string, type: string, carrierName: string | null, maxAttempts = 5) {
  const baseDelay = 3000; // 3 segundos
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const delay = attempts > 0 ? Math.min(baseDelay * Math.pow(2, attempts), 30000) : 0; // No delay for first attempt
      if(delay > 0) {
        console.log(`Polling attempt ${attempts + 1}: Waiting ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      let url = `${SHIPMENT_URL}?${type}=${encodeURIComponent(trackingNumber)}`;
      if (carrierName) {
        url += `&carrierName=${encodeURIComponent(carrierName)}`;
      }

      const response = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(15000) // Timeout de 15s
      });

      if (response.status === 204) {
          // No content, shipment not found, continue to next attempt
          console.log(`Polling attempt ${attempts + 1}: Received 204 No Content.`);
          attempts++;
          continue;
      }

      if (response.ok) {
        const data = await safelyParseJSON(response);
        if (data && (Array.isArray(data) ? data.length > 0 : true)) {
          return {
            status: 'found' as const,
            shipment: Array.isArray(data) ? data[0] : data,
            attempts: attempts + 1
          };
        }
      }

      // If response is not ok, but not 204, it's a server error
      if (!response.ok) {
          const errorBody = await safelyParseJSON(response).catch(e => ({ message: e.message }));
          throw new Error(`API Error ${response.status}: ${errorBody?.message || 'Unknown API Error'}`);
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
