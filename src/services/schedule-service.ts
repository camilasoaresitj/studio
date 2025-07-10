

/**
 * @fileOverview A centralized service for interacting with the Cargo-flows API.
 * This service handles tracking and schedule lookups.
 */

export type TrackingEvent = {
  status: string;
  date: string;
  location: string;
  completed: boolean;
  carrier: string;
};

export type TrackingResult = {
  id: string;
  status: string;
  origin: string;
  destination: string;
  vesselName?: string;
  voyageNumber?: string;
  carrier: string;
  events: TrackingEvent[];
};

export type VesselSchedule = {
  vesselName: string;
  voyage: string;
  carrier: string;
  etd: string;
  eta: string;
  transitTime: string;
};

export type FlightSchedule = {
  flightNumber: string;
  carrier: string;
  etd: string;
  eta: string;
  transitTime: string;
  aircraft: string;
};


class CargoFlowsService {
  private apiKey: string;
  private orgToken: string;
  private baseUrl: string = 'https://flow.cargoes.com/api/v1';

  constructor() {
    this.apiKey = process.env.CARGOFLOWS_API_KEY || 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    this.orgToken = process.env.CARGOFLOWS_ORG_TOKEN || 'Gz7NChq8MbUnBmuG0DferKtBcDka33gV';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      'X-Org-Token': this.orgToken,
    };
  }

  async getTracking(trackingNumber: string): Promise<TrackingResult> {
    console.log(`Calling Cargo-flows API at: ${this.baseUrl}/tracking/${trackingNumber}`);
    
    const response = await fetch(`${this.baseUrl}/tracking/${trackingNumber}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
        console.warn(`Cargo-flows API call failed with status ${response.status}. Falling back to simulation.`);
        return this.getSimulatedTracking(trackingNumber);
    }
    
    // Defensive JSON parsing
    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse Cargo-flows response as JSON.", responseText);
        throw new Error("A API retornou uma resposta inesperada. Tente novamente mais tarde.");
    }

    return data.tracking ? this.mapApiDataToTrackingResult(data.tracking) : this.getSimulatedTracking(trackingNumber);
  }

  private mapApiDataToTrackingResult(apiData: any): TrackingResult {
    return {
        id: apiData.trackingNumber || 'N/A',
        status: apiData.latestStatus || 'Unknown',
        origin: apiData.origin || 'Unknown',
        destination: apiData.destination || 'Unknown',
        carrier: apiData.carrier || 'Unknown',
        events: (apiData.events || []).map((event: any) => ({
            status: event.description,
            date: event.timestamp,
            location: event.location,
            completed: event.isCompleted,
            carrier: apiData.carrier || 'Unknown'
        })),
        vesselName: apiData.vesselName,
        voyageNumber: apiData.voyageNumber,
    };
  }

  private async getSimulatedTracking(trackingNumber: string): Promise<TrackingResult> {
     console.log(`Simulating Cargo-flows API call to: ${this.baseUrl}/tracking/${trackingNumber}`);
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (trackingNumber.toUpperCase().includes("FAIL")) {
        throw new Error("O número de rastreamento fornecido não foi encontrado na base de dados do Cargo-flows.");
    }
    
    const events: TrackingEvent[] = [
      { status: 'Booking Confirmed', date: '2024-07-10T10:00:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'Container Gated In', date: '2024-07-12T15:30:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'Loaded on Vessel', date: '2024-07-14T08:00:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'Vessel Departure', date: '2024-07-14T20:00:00Z', location: 'Shanghai, CN', completed: true, carrier: 'Maersk' },
      { status: 'In Transit', date: '2024-07-25T00:00:00Z', location: 'Pacific Ocean', completed: false, carrier: 'Maersk' },
      { status: 'Vessel Arrival', date: '2024-08-15T12:00:00Z', location: 'Santos, BR', completed: false, carrier: 'Maersk' },
    ];

    const latestCompletedEvent = [...events].reverse().find(e => e.completed);

    return {
      id: trackingNumber,
      status: latestCompletedEvent?.status || 'Pending',
      origin: 'Shanghai, CN',
      destination: 'Santos, BR',
      vesselName: 'MAERSK PICO',
      voyageNumber: '428N',
      carrier: 'Maersk',
      events,
    };
  }

  async getVesselSchedules(origin: string, destination: string): Promise<VesselSchedule[]> {
    console.log(`Calling Cargo-flows API at: ${this.baseUrl}/schedules/vessel?origin=${origin}&destination=${destination}`);
    
    const response = await fetch(`${this.baseUrl}/schedules/vessel?origin=${origin}&destination=${destination}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      console.warn(`Cargo-flows API call failed with status ${response.status}. Falling back to simulation.`);
      return this.getSimulatedVesselSchedules();
    }

    const data = await response.json();
    return data;
  }
  
  private async getSimulatedVesselSchedules(): Promise<VesselSchedule[]> {
     await new Promise(resolve => setTimeout(resolve, 900));
    return [
      { vesselName: 'MAERSK PICO', voyage: '428N', carrier: 'Maersk', etd: '2024-07-25T12:00:00Z', eta: '2024-08-20T12:00:00Z', transitTime: '26 dias' },
      { vesselName: 'MSC LEO', voyage: 'FB429A', carrier: 'MSC', etd: '2024-07-28T18:00:00Z', eta: '2024-08-23T18:00:00Z', transitTime: '26 dias' },
      { vesselName: 'CMA CGM SYMI', voyage: '0PE5HN1MA', carrier: 'CMA CGM', etd: '2024-08-01T09:00:00Z', eta: '2024-08-27T09:00:00Z', transitTime: '26 dias' },
      { vesselName: 'EVER ACE', voyage: '1192-001W', carrier: 'Evergreen', etd: '2024-08-02T11:00:00Z', eta: '2024-08-29T11:00:00Z', transitTime: '27 dias'},
      { vesselName: 'HMM STOCKHOLM', voyage: '001W', carrier: 'HMM', etd: '2024-08-03T15:00:00Z', eta: '2024-08-30T15:00:00Z', transitTime: '27 dias' },
    ];
  }
  
  async getFlightSchedules(origin: string, destination: string): Promise<FlightSchedule[]> {
    console.log(`Calling Cargo-flows API at: ${this.baseUrl}/schedules/flight?origin=${origin}&destination=${destination}`);
    
    const response = await fetch(`${this.baseUrl}/schedules/flight?origin=${origin}&destination=${destination}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
       console.warn(`Cargo-flows API call failed with status ${response.status}. Falling back to simulation.`);
      return this.getSimulatedFlightSchedules();
    }
    
    const data = await response.json();
    return data;
  }

  private async getSimulatedFlightSchedules(): Promise<FlightSchedule[]> {
    await new Promise(resolve => setTimeout(resolve, 800));
    return [
      { flightNumber: 'LA8145', carrier: 'LATAM Cargo', etd: '2024-07-25T22:30:00Z', eta: '2024-07-26T07:00:00Z', transitTime: '8h 30m', aircraft: 'Boeing 777F' },
      { flightNumber: 'LH8223', carrier: 'Lufthansa Cargo', etd: '2024-07-26T18:55:00Z', eta: '2024-07-27T11:20:00Z', transitTime: '11h 25m', aircraft: 'Boeing 777F' },
      { flightNumber: 'AA930', carrier: 'American Airlines Cargo', etd: '2024-07-26T21:05:00Z', eta: '2024-07-27T05:35:00Z', transitTime: '9h 30m', aircraft: 'Boeing 787-8' },
      { flightNumber: 'AF693', carrier: 'Air France Cargo', etd: '2024-07-27T16:10:00Z', eta: '2024-07-28T08:20:00Z', transitTime: '11h 10m', aircraft: 'Boeing 777F' },
    ];
  }
}

export const cargoFlowsService = new CargoFlowsService();
