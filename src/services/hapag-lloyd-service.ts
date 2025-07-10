/**
 * @fileOverview A simulated service for interacting with the Hapag-Lloyd API.
 * This file provides a foundation for a real integration by mocking API calls.
 */
import type { FreightQuoteFormData } from '@/lib/schemas';
import type { GetFreightRatesOutput } from '@/ai/flows/get-freight-rates';
import type { TrackingEvent } from '@/ai/flows/get-tracking-info';

const API_BASE_URL = 'https://api.hapag-lloyd.com/v1'; // Example URL

/**
 * Fetches FCL freight rates from the Hapag-Lloyd API (simulated).
 * 
 * In a real implementation, this function would:
 * 1. Use a library like `axios` or `fetch` to make an HTTP POST request.
 * 2. Handle authentication by adding the API key to the request headers.
 * 3. Map the complex request/response from the real API to our internal format.
 * 4. Implement robust error handling for API failures.
 * 
 * @param input The freight quote form data.
 * @returns A promise that resolves to an array of formatted freight rates.
 */
export async function getRates(input: FreightQuoteFormData): Promise<GetFreightRatesOutput> {
  const apiKey = process.env.HAPAG_API_KEY;

  if (!apiKey) {
    console.warn("Hapag-Lloyd API key not found. Skipping Hapag-Lloyd rate search.");
    return [];
  }

  console.log(`Simulating API call to Hapag-Lloyd for ${input.origin} -> ${input.destination}`);

  // Base prices for simulation
  const basePrices: { [key: string]: number } = {
    "20'GP": 2100,
    "40'GP": 2800,
    "40'HC": 3000,
    "40'RF": 4500,
    "40'NOR": 3500,
    "20'OT": 2900,
    "40'OT": 3800,
    "20'FR": 3100,
    "40'FR": 4100,
  };

  // Simulated local charges from the carrier, included in the total cost
  const localCharges = [
    { name: 'Terminal Handling Charge (Origin)', amount: 250, currency: 'USD' },
    { name: 'Booking Fee', amount: 50, currency: 'USD' },
    { name: 'Documentation Fee', amount: 75, currency: 'USD' },
  ];

  // Simulate a network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const requestedOrigins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
  const requestedDestinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

  const allRates: GetFreightRatesOutput = [];

  requestedOrigins.forEach(origin => {
    requestedDestinations.forEach(destination => {
      // Iterate over each container type in the user's request
      input.oceanShipment.containers.forEach(container => {
        if (!container.type || container.quantity === 0) return;

        const baseFreight = basePrices[container.type] || 3200; // Default price for unlisted container types
        
        // Sum up local charges
        const localChargesTotal = localCharges.reduce((sum, charge) => sum + charge.amount, 0);

        // Total cost is freight + local charges
        const totalCost = baseFreight + localChargesTotal;
        const currency = 'USD';

        // Create ONE rate for the container type (the quote editor handles quantity)
        allRates.push({
            id: `HL-QRT-${Math.random().toString(36).substring(2, 9)}-${origin}-${destination}-${container.type}`,
            carrier: 'Hapag-Lloyd',
            origin: origin,
            destination: destination,
            transitTime: `28 dias`,
            cost: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalCost),
            costValue: totalCost,
            carrierLogo: 'https://placehold.co/120x40',
            dataAiHint: 'hapag lloyd logo',
            source: 'Hapag-Lloyd API',
        });
      });
    });
  });

  return allRates;
}


/**
 * Submits Shipping Instructions to the Hapag-Lloyd API (simulated).
 * @param siData The data for the shipping instruction.
 */
export async function submitShippingInstructions(siData: any): Promise<{ success: true; bookingNumber: string }> {
  console.log("Simulating submission of Shipping Instructions to Hapag-Lloyd:", siData);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, bookingNumber: `HL-BK-${Math.floor(Math.random() * 900000) + 100000}` };
}

/**
 * Submits a Verified Gross Mass (VGM) to the Hapag-Lloyd API (simulated).
 * @param vgmData The data for the VGM submission.
 */
export async function submitVgm(vgmData: any): Promise<{ success: true; confirmationId: string }> {
    console.log("Simulating submission of VGM to Hapag-Lloyd:", vgmData);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, confirmationId: `VGM-CONF-${Math.floor(Math.random() * 900000) + 100000}` };
}

/**
 * Fetches tracking information from the Hapag-Lloyd API (simulated).
 * @param trackingNumber The Bill of Lading or container number.
 * @returns A promise that resolves to an object containing the latest status and a list of events.
 */
export async function getTracking(trackingNumber: string): Promise<{ status: string; events: TrackingEvent[], shipmentDetails: any }> {
    console.log(`Simulating tracking request to Hapag-Lloyd for: ${trackingNumber}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate a successful response
    const events: TrackingEvent[] = [
        { status: 'Booking Confirmed', date: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString(), location: 'SANTOS', completed: true, carrier: 'Hapag-Lloyd' },
        { status: 'Container Gated In', date: new Date(new Date().setDate(new Date().getDate() - 16)).toISOString(), location: 'SANTOS', completed: true, carrier: 'Hapag-Lloyd' },
        { status: 'Loaded on board vessel', date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString(), location: 'SANTOS', completed: true, carrier: 'Hapag-Lloyd' },
        { status: 'Vessel Departure', date: new Date(new Date().setDate(new Date().getDate() - 14)).toISOString(), location: 'SANTOS', completed: true, carrier: 'Hapag-Lloyd' },
        { status: 'Vessel Arrival', date: new Date().toISOString(), location: 'ROTTERDAM', completed: false, carrier: 'Hapag-Lloyd' },
        { status: 'Container Discharged', date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), location: 'ROTTERDAM', completed: false, carrier: 'Hapag-Lloyd' },
    ];

    const latestCompletedEvent = [...events].reverse().find(e => e.completed);

    const shipmentDetails = {
        id: trackingNumber,
        origin: 'Santos, BR',
        destination: 'Rotterdam, NL',
        vesselName: 'HLCU Hamburg',
        voyageNumber: '429E',
        etd: new Date(new Date().setDate(new Date().getDate() - 14)),
        eta: new Date(),
        milestones: events.map(event => ({
            name: event.status,
            status: event.completed ? 'completed' : 'pending',
            predictedDate: new Date(event.date),
            effectiveDate: event.completed ? new Date(event.date) : null,
            details: event.location,
        }))
    }

    return {
        status: latestCompletedEvent?.status || 'Pending',
        events: events,
        shipmentDetails,
    };
}
