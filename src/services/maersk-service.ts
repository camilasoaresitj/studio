/**
 * @fileOverview A service for interacting with the real Maersk API.
 */
import type { FreightQuoteFormData } from '@/lib/schemas';
import type { GetFreightRatesOutput } from '@/ai/flows/get-freight-rates';
import type { TrackingEvent } from '@/ai/flows/get-tracking-info';
import { format, parse } from 'date-fns';

const API_BASE_URL = 'https://api.maersk.com';

// Helper to attempt converting "City, CC" to a UN/LOCODE format.
// This is a simplification; a real app might use a library or a proper lookup service.
function toUNLOCODE(location: string): string {
    const parts = location.split(',').map(p => p.trim());
    if (parts.length < 2) return location.toUpperCase(); // Fallback
    const city = parts[0];
    const country = parts[1];
    // A common pattern is CountryCode + first 3 letters of city.
    return `${country.substring(0, 2).toUpperCase()}${city.substring(0, 3).toUpperCase()}`;
}


/**
 * Fetches FCL freight rates from the Maersk API.
 * @param input The freight quote form data.
 * @returns A promise that resolves to an array of formatted freight rates.
 */
export async function getRates(input: FreightQuoteFormData): Promise<GetFreightRatesOutput> {
  const apiKey = process.env.MAERSK_API_KEY;

  if (!apiKey) {
    console.warn("Maersk API key not found. Skipping Maersk rate search.");
    return [];
  }

  console.log(`Calling Maersk API for ${input.origin} -> ${input.destination}`);

  const payload = {
      "productCategory": "oceanFcl",
      "freightPaymentTerm": "PREPAID", // Or COLLECT based on incoterm logic
      "transportPlan": [
          {
              "placeOfReceipt": { "unlocode": toUNLOCODE(input.origin) },
              "placeOfDelivery": { "unlocode": toUNLOCODE(input.destination) },
              "inlandService": "CY"
          }
      ],
      "shipmentDetails": [
          {
              "commodity": { "cargoGrossWeight": 15000 }, // Example weight
              "containers": input.oceanShipment.containers.map(c => ({
                  "isoContainerCode": c.type.startsWith("20") ? "22G1" : (c.type.includes("HC") ? "45G1" : "42G1"), // Mapping to ISO codes
                  "numberOfContainers": c.quantity
              }))
          }
      ]
  };

  try {
    const response = await fetch(`${API_BASE_URL}/ocean-products/offers/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Consumer-Key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Maersk API Error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();

    if (!data.offers || data.offers.length === 0) {
      return [];
    }

    const formattedRates: GetFreightRatesOutput = data.offers.map((offer: any) => {
      const totalPrice = offer.price.totalPrice;
      return {
        id: `MAEU-${offer.offerId}`,
        carrier: 'Maersk',
        origin: input.origin,
        destination: input.destination,
        transitTime: `${offer.transitTimeInDays || '?'} dias`,
        cost: new Intl.NumberFormat('en-US', { style: 'currency', currency: totalPrice.currency }).format(totalPrice.value),
        costValue: totalPrice.value,
        carrierLogo: 'https://placehold.co/120x40',
        dataAiHint: 'maersk logo',
        source: 'Maersk API',
      };
    });

    return formattedRates;

  } catch (error) {
    console.error("Error fetching rates from Maersk:", error);
    // In a real app, you might want to rethrow or handle this more gracefully
    return [];
  }
}

/**
 * Creates a booking with Maersk (simulated).
 * @param bookingData The data for the booking.
 */
export async function createBooking(bookingData: any): Promise<{ success: true; bookingNumber: string }> {
  console.log("Simulating booking creation with Maersk:", bookingData);
  await new Promise(resolve => setTimeout(resolve, 1200));
  return { success: true, bookingNumber: `MAEU${Math.floor(Math.random() * 9000000) + 1000000}` };
}


/**
 * Submits Shipping Instructions to the Maersk API (simulated).
 * @param siData The data for the shipping instruction.
 */
export async function submitShippingInstructions(siData: any): Promise<{ success: true; siConfirmationId: string }> {
  console.log("Simulating submission of Shipping Instructions to Maersk:", siData);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, siConfirmationId: `SI-MAEU-${Math.floor(Math.random() * 900000) + 100000}` };
}

/**
 * Submits a Verified Gross Mass (VGM) to the Maersk API (simulated).
 * @param vgmData The data for the VGM submission.
 */
export async function submitVgm(vgmData: any): Promise<{ success: true; vgmConfirmationId: string }> {
    console.log("Simulating submission of VGM to Maersk:", vgmData);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, vgmConfirmationId: `VGM-MAEU-${Math.floor(Math.random() * 900000) + 100000}` };
}

/**
 * Fetches tracking information from the Maersk API.
 * @param trackingNumber The Bill of Lading or container number.
 * @returns A promise that resolves to an object containing the latest status and a list of events.
 */
export async function getTracking(trackingNumber: string): Promise<{ status: string; events: TrackingEvent[] }> {
    const apiKey = process.env.MAERSK_API_KEY;
    if (!apiKey) {
      throw new Error("Maersk API key is not configured.");
    }
    
    console.log(`Calling Maersk tracking API for: ${trackingNumber}`);
    
    try {
        const response = await fetch(`${API_BASE_URL}/track/${trackingNumber}`, {
            headers: { 'Consumer-Key': apiKey }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                return { status: 'Not Found', events: [] };
            }
            const errorBody = await response.text();
            throw new Error(`Maersk Tracking API Error: ${response.status} ${errorBody}`);
        }

        const data = await response.json();
        const shipment = data.shipments?.[0];

        if (!shipment || !shipment.events || shipment.events.length === 0) {
            return { status: 'No events found', events: [] };
        }

        const events: TrackingEvent[] = shipment.events.map((event: any) => ({
            status: event.eventDescription,
            date: event.eventDateTime,
            location: event.eventLocation?.locationName || 'Unknown Location',
            completed: event.eventClassifierCode !== 'PLN', // Assumes PLN is "Planned"
            carrier: 'Maersk'
        }));
        
        const latestEvent = events[events.length - 1];
        
        return {
            status: latestEvent?.status || 'Pending',
            events: events
        };
    } catch(error) {
        console.error("Error fetching tracking from Maersk:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("An unknown error occurred during Maersk tracking.");
    }
}
