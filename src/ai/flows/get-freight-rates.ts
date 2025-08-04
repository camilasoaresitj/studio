
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';
import { findPortByTerm } from '@/lib/ports';
import type { Port } from '@/lib/ports';
import { format, addDays } from 'date-fns';

export type GetFreightRatesInput = FreightQuoteFormData;

const FreightRateSchema = z.object({
    id: z.string(), 
    carrier: z.string(),
    origin: z.string(),
    destination: z.string(),
    transitTime: z.string(),
    cost: z.string(),
    costValue: z.number(),
    carrierLogo: z.string(),
    dataAiHint: z.string(),
    source: z.string(),
    flightDetails: z.string().optional(),
    freeTime: z.string().optional(), // Added for manual rates
});
type FreightRate = z.infer<typeof FreightRateSchema>;

const GetFreightRatesOutputSchema = z.array(FreightRateSchema);
export type GetFreightRatesOutput = z.infer<typeof GetFreightRatesOutputSchema>;

const cargoFiveRateTool = ai.defineTool(
  {
    name: 'searchCargoFiveRates',
    description: 'Searches for ocean freight rates on the CargoFive API.',
    inputSchema: z.object({
        origin_port: z.string().describe("The UN/LOCODE of the origin port."),
        destination_port: z.string().describe("The UN/LOCODE of the destination port."),
        departure_date: z.string().describe("The departure date in YYYY-MM-DD format."),
        container_type: z.string().describe("The container type, e.g., 20'GP, 40'HC."),
    }),
    outputSchema: z.any() 
  },
  async (params) => {
    const apiKey = process.env.CARGOFIVE_API_KEY || 'a256c19a3c3d85da2e35846de3205954';
    // Corrected API endpoint from /rates to /fcl/quotes and using POST
    const API_URL = `https://api.cargofive.com/v1/fcl/quotes`;
    
    if (!apiKey) {
      throw new Error('CargoFive API key is not configured.');
    }
    
    try {
      console.log('Consultando CargoFive com URL:', API_URL);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na API CargoFive:', {
            url: API_URL,
            status: response.status,
            error: errorText,
        });
        throw new Error(`A API da CargoFive retornou um erro: ${errorText}`);
      }
      
      const data = await response.json();
      return data;

    } catch (error: any) {
      console.error('Erro ao chamar a API da CargoFive:', error);
      throw new Error(error.message || 'Erro desconhecido ao consultar tarifas.');
    }
  }
);


const getFreightRatesFlow = ai.defineFlow(
  {
    name: 'getFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
        try {
            const originPort = findPortByTerm(input.origin);
            const destinationPort = findPortByTerm(input.destination);

            if (!originPort || !destinationPort) {
                throw new Error(`Não foi possível encontrar os portos para a rota: ${input.origin} -> ${input.destination}`);
            }
            
            if (input.oceanShipmentType !== 'FCL' || !input.oceanShipment.containers.length) {
                return [];
            }

            const departureDate = input.departureDate ? format(new Date(input.departureDate), 'yyyy-MM-dd') : format(addDays(new Date(), 7), 'yyyy-MM-dd');
            
            const allRates: FreightRate[] = [];

            // Iterate over each container type requested by the user
            for (const container of input.oceanShipment.containers) {
                 const response = await cargoFiveRateTool({
                    origin_port: originPort.unlocode,
                    destination_port: destinationPort.unlocode,
                    departure_date: departureDate,
                    container_type: container.type,
                });

                const rates = response?.quotes;
                if (rates && rates.length > 0) {
                     rates.forEach((rate: any, index: number) => {
                        const costValue = parseFloat(rate.total_amount.replace(/[^0-9.-]+/g, ""));
                        allRates.push({
                            id: rate.id || `rate-${index}-${container.type}`,
                            carrier: rate.carrier.name,
                            origin: rate.origin_port.name,
                            destination: rate.destination_port.name,
                            transitTime: `${rate.transit_time} dias`,
                            costValue: costValue,
                            cost: `${rate.currency} ${costValue.toFixed(2)}`,
                            carrierLogo: rate.carrier.logo_url || `https://logo.clearbit.com/${rate.carrier.name.toLowerCase()}.com`,
                            dataAiHint: `${rate.carrier.name.toLowerCase()} logo`,
                            source: 'CargoFive API',
                            freeTime: rate.free_time ? `${rate.free_time.demurrage_days} / ${rate.free_time.detention_days}` : 'N/A'
                        });
                    });
                }
            }
           
            return allRates.sort((a, b) => a.costValue - b.costValue);

        } catch (error: any) {
            console.error('Erro no fluxo de tarifas:', error);
            throw error;
        }
    }
);


// SIMULATION FUNCTION for AIR
function getSimulatedCargoAiRates(input: GetFreightRatesInput): GetFreightRatesOutput {
    console.log("Returning simulated CargoAI AIR rates for:", input.origin, "->", input.destination);
    
     const carriers = [
        { name: 'LATAM Cargo', logoHint: 'latam logo' },
        { name: 'Lufthansa Cargo', logoHint: 'lufthansa logo' },
        { name: 'American Airlines', logoHint: 'american airlines logo' },
    ];
    
    const results: GetFreightRatesOutput = [];
    
    let baseRatePerKg = 4.5;
    if (input.origin.toLowerCase().includes('china') || input.destination.toLowerCase().includes('china')) {
        baseRatePerKg = 7.0;
    }
    
    for (const carrier of carriers) {
        const costValue = baseRatePerKg + Math.random() * 1.5;
        const transitTime = 1 + Math.floor(Math.random() * 3);
        results.push({
            id: `simulated-air-${carrier.name}-${Date.now()}`,
            carrier: carrier.name,
            origin: input.origin,
            destination: input.destination,
            transitTime: `${transitTime} dias`,
            cost: `USD ${costValue.toFixed(2)}/kg`,
            costValue: costValue,
            carrierLogo: `https://placehold.co/120x40.png?text=${carrier.name.replace(' ','')}`,
            dataAiHint: carrier.logoHint,
            source: 'CargoAI (Simulado)',
            flightDetails: `Voo Direto, ${Math.floor(Math.random() * 3) + 1}x por semana`
        });
    }

    return results;
}


export async function getFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  // For Ocean, call the real API. For Air, call the simulation.
  if (input.modal === 'ocean') {
    return getFreightRatesFlow(input);
  } else if (input.modal === 'air') {
    return getAirFreightRates(input);
  } else if (input.modal === 'road') {
    return getRoadFreightRates(input);
  }
  return [];
}

const getAirFreightRatesFlow = ai.defineFlow(
  {
    name: 'getAirFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
    
        // Using the simulation function for AIR.
        const searchOrigins = input.origin.split(',').map(s => s.trim()).filter(Boolean);
        const searchDestinations = input.destination.split(',').map(s => s.trim()).filter(Boolean);

        if (searchOrigins.length === 0 || searchDestinations.length === 0) {
            return []; 
        }
        
        const allResults: GetFreightRatesOutput = [];

        for (const origin of searchOrigins) {
            for (const destination of searchDestinations) {
                const simulatedInput = { ...input, origin, destination };
                const simulatedRates = getSimulatedCargoAiRates(simulatedInput);
                allResults.push(...simulatedRates);
            }
        }
        
        return allResults.sort((a: FreightRate, b: FreightRate) => a.costValue - b.costValue);
    }
);

export async function getAirFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
  return getAirFreightRatesFlow(input);
}


// SIMULATION for ROAD
const getRoadFreightRatesFlow = ai.defineFlow(
  {
    name: 'getRoadFreightRatesFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: GetFreightRatesOutputSchema,
  },
  async (input) => {
    const carriers = [
        { name: 'Trans-Mercosul', logoHint: 'truck logo' },
        { name: 'Andes Logistics', logoHint: 'truck logo' },
        { name: 'Sudamericana', logoHint: 'truck logo' },
    ];
    
    const results: GetFreightRatesOutput = [];
    
    // Simplified cost simulation
    let baseCost = 3000; 
    if (input.roadShipmentType === 'LTL' && input.roadShipment.pieces) {
        const totalWeight = input.roadShipment.pieces.reduce((sum, p) => sum + (p.quantity * p.weight), 0);
        baseCost = 500 + (totalWeight * 0.8); // LTL cost logic
    }
    
    for (const carrier of carriers) {
        const costValue = baseCost + Math.random() * 500;
        const transitTime = 5 + Math.floor(Math.random() * 5);
        results.push({
            id: `simulated-road-${carrier.name}-${Date.now()}`,
            carrier: carrier.name,
            origin: input.origin,
            destination: input.destination,
            transitTime: `${transitTime} dias`,
            cost: `USD ${costValue.toFixed(2)}`,
            costValue: costValue,
            carrierLogo: `https://placehold.co/120x40.png?text=${carrier.name.replace('-','')}`,
            dataAiHint: carrier.logoHint,
            source: 'Rodoviário (Simulado)',
        });
    }

    return results.sort((a: FreightRate, b: FreightRate) => a.costValue - b.costValue);
  }
);


export async function getRoadFreightRates(input: GetFreightRatesInput): Promise<GetFreightRatesOutput> {
    return getRoadFreightRatesFlow(input);
}

// Dummy export to satisfy older references, can be removed later
export const updateCargoFlowsShipment = async (payload: any) => { 
    console.log("updateCargoFlowsShipment is a dummy function now.");
    return { success: true, message: "Dummy function called."};
};
