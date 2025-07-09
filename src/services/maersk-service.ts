/**
 * @fileOverview A service for interacting with the real Maersk API.
 */
import type { FreightQuoteFormData } from '@/lib/schemas';
import type { GetFreightRatesOutput } from '@/ai/flows/get-freight-rates';
import type { TrackingEvent } from '@/ai/flows/get-tracking-info';
import type { Shipment, Milestone } from '@/lib/shipment';

const API_BASE_URL = 'https://maersk-prod-v2.p.mashape.com';

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
 * Fetches tracking information from the Maersk API using a robust two-step lookup.
 * @param trackingNumber The Bill of Lading or booking number.
 * @returns A promise that resolves to an object containing the latest status, a list of events, and partial shipment details.
 */
export async function getTracking(trackingNumber: string): Promise<{ status: string; events: TrackingEvent[]; shipmentDetails: Partial<Shipment> }> {
    const apiKey = process.env.MAERSK_API_KEY;
    if (!apiKey) {
      throw new Error("A chave de API da Maersk não está configurada no arquivo .env.");
    }
    
    console.log(`Real API Call: Calling Maersk tracking API for: ${trackingNumber}`);
    
    try {
        // Step 1: Call shipments-summaries to find the canonical transportDocumentId using the booking number.
        const summaryResponse = await fetch(`${API_BASE_URL}/v2/tracking/shipments-summaries?carrierBookingReference=${trackingNumber}`, {
            headers: { 'Consumer-Key': apiKey, 'Accept': 'application/json' }
        });
        
        if (!summaryResponse.ok) {
            const errorBody = await summaryResponse.text();
            let errorMessage = `Maersk API Error (Summary Check): Status ${summaryResponse.status}.`;
            if (summaryResponse.status === 401 || summaryResponse.status === 403) {
                errorMessage = `Erro de Autenticação/Autorização (Status ${summaryResponse.status}). Verifique se a chave de API da Maersk está correta.`;
            } else {
                 errorMessage += ` Resposta: ${errorBody}`;
            }
            throw new Error(errorMessage);
        }

        const summaryData = await summaryResponse.json();
        const shipmentSummary = summaryData.shipments?.[0];

        if (!shipmentSummary) {
            throw new Error(`Nenhum embarque encontrado para o número de rastreamento: ${trackingNumber}. Verifique se o número está correto e se a sua chave de API tem permissão para acessá-lo.`);
        }

        const transportDocumentId = shipmentSummary.transportDocumentId;
        console.log(`Found transportDocumentId: ${transportDocumentId} for booking ${trackingNumber}. Fetching details...`);


        // Step 2: Use the canonical ID to get full shipment details
        const response = await fetch(`${API_BASE_URL}/v2/tracking/shipments/${transportDocumentId}`, {
            headers: { 'Consumer-Key': apiKey, 'Accept': 'application/json' }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Maersk API Error (Detail Fetch): Status ${response.status}. Resposta: ${errorBody}`);
        }

        const data = await response.json();
        const shipmentData = data.shipments?.[0];

        if (!shipmentData) {
            throw new Error(`Nenhuma informação de embarque encontrada na resposta da API para ${transportDocumentId}, embora a chamada tenha sido bem-sucedida.`);
        }
        
        const transportPlan = shipmentData.transportPlan || [];
        const originLeg = transportPlan.find((leg: any) => leg.transportLeg.sequenceNumber === 1)?.transportLeg;
        const destinationLeg = [...transportPlan].reverse().find((leg: any) => leg.transportLeg.destination)?.transportLeg;

        // Map events to our TrackingEvent format
        const events: TrackingEvent[] = shipmentData.events.map((event: any): TrackingEvent => ({
            status: event.eventDescription,
            date: event.eventDateTime,
            location: event.eventLocation?.locationName || 'Unknown Location',
            completed: event.eventClassifierCode === 'ACT',
            carrier: 'Maersk'
        }));
        
        const latestCompletedEvent = [...events].reverse().find(e => e.completed);
        const overallStatus = latestCompletedEvent?.status || 'Pending';
        
        // Map data to our partial Shipment format
        let etd: Date | undefined;
        let eta: Date | undefined;
        
        const etdEvent = shipmentData.events.find((e: any) => e.eventTypeCode === 'ETD');
        if (etdEvent) etd = new Date(etdEvent.eventDateTime);
        else if (originLeg?.departure?.eventDateTime) etd = new Date(originLeg.departure.eventDateTime);

        const etaEvent = shipmentData.events.find((e: any) => e.eventTypeCode === 'ETA');
        if (etaEvent) eta = new Date(etaEvent.eventDateTime);
        else if (destinationLeg?.arrival?.eventDateTime) eta = new Date(destinationLeg.arrival.eventDateTime);

        const milestones: Milestone[] = events.map((event: TrackingEvent): Milestone => ({
            name: event.status,
            status: event.completed ? 'completed' : 'pending',
            predictedDate: new Date(event.date),
            effectiveDate: event.completed ? new Date(event.date) : null,
            details: event.location,
            isTransshipment: false, // Simplification
        }));
        
        const shipmentDetails: Partial<Shipment> = {
            id: shipmentData.carrierBookingReference || trackingNumber, // Use booking ref as ID if available
            origin: originLeg?.origin?.locationName || 'Unknown',
            destination: destinationLeg?.destination?.locationName || 'Unknown',
            bookingNumber: shipmentData.carrierBookingReference,
            masterBillNumber: shipmentData.transportDocumentReference,
            vesselName: originLeg?.vessel?.vesselName || '',
            voyageNumber: originLeg?.voyageReference || '',
            etd,
            eta,
            milestones: milestones.sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime()),
            // Other fields like containers would need parsing from shipmentData if available
        };

        return {
            status: overallStatus,
            events: events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            shipmentDetails
        };

    } catch(error) {
        console.error("Error fetching tracking from Maersk:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("An unknown error occurred during Maersk tracking.");
    }
}
