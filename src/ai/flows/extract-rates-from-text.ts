'use server';
/**
 * @fileOverview Extracts structured freight rate data from unstructured text.
 *
 * - extractRatesFromText - A function that parses text and returns a structured list of rates.
 * - ExtractRatesFromTextInput - The input type for the function.
 * - ExtractRatesFromTextOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractRatesFromTextInputSchema = z.object({
  textInput: z.string().describe('Unstructured text containing freight rate information, like an email or a pasted table.'),
});
export type ExtractRatesFromTextInput = z.infer<typeof ExtractRatesFromTextInputSchema>;

const ParsedRateSchema = z.object({
  origin: z.string().describe('The standardized origin location (e.g., "Santos, BR"). Mandatory.'),
  destination: z.string().describe('The standardized destination location (e.g., "Roterdã, NL"). Mandatory.'),
  carrier: z.string().describe('The carrier name (e.g., "Maersk"). Use "N/A" if not found.'),
  modal: z.string().describe("The transport modal. Must be exactly 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500"). Mandatory.'),
  transitTime: z.string().describe('The transit time (e.g., "25-30"). Use "N/A" if not found.'),
  container: z.string().describe('The container type (e.g., "20\'GP"). Use "N/A" for air freight.'),
  validity: z.string().describe('The validity date (e.g., "31/12/2024"). Use "N/A" if not found.'),
  freeTime: z.string().describe('The free time in days, only the number (e.g., "14"). Use "N/A" if not found.'),
  agent: z.string().describe('The agent who provided the rate (e.g., "Global Logistics Agents"). Use "Direct" if the rate is directly from the carrier.'),
});

const ExtractRatesFromTextOutputSchema = z.array(ParsedRateSchema);
export type ExtractRatesFromTextOutput = z.infer<typeof ExtractRatesFromTextOutputSchema>;


export async function extractRatesFromText(input: ExtractRatesFromTextInput): Promise<ExtractRatesFromTextOutput> {
  return extractRatesFromTextFlow(input);
}

const extractRatesFromTextPrompt = ai.definePrompt({
  name: 'extractRatesFromTextPrompt',
  input: { schema: ExtractRatesFromTextInputSchema },
  output: { schema: ExtractRatesFromTextOutputSchema },
  prompt: `You are a logistics AI assistant. Your task is to extract freight rates from the text below and return a valid JSON array of rate objects.

**Extraction Rules:**
- Each object in the array represents ONE rate for ONE container type.
- The fields \`origin\`, \`destination\`, and \`rate\` are **MANDATORY**. If you cannot find all three for a given rate, DO NOT create an object for it.
- **ETD as Validity**: If a rate is explicitly tied to a specific ETD (Estimated Time of Departure) or a specific vessel/voyage, you MUST use that departure date as the 'validity' for that rate. Format it as "DD/MM/YYYY". This rule takes precedence over general validity dates. For example, if the text says "Rate for vessel MSC LEO departing on 15/07/2024", the validity should be "15/07/2024".
- If a rate is specified for multiple containers (e.g., "USD 5000/6000/6000"), you MUST create separate objects for 20'GP, 40'GP, and 40'HC respectively.
- The \`modal\` field must be either "Aéreo" or "Marítimo". Infer from context.
- For all other non-mandatory fields (\`carrier\`, \`transitTime\`, \`container\`, \`validity\`, \`freeTime\`, \`agent\`), use the exact string "N/A" if the information is not present.
- For \`freeTime\`, extract only the number of days (e.g., for "14 dias free time", extract "14").
- For \`transitTime\`, extract the range of days (e.g., for "25-30 dias", extract "25-30").
- Differentiate between the Carrier (e.g., Maersk, LATAM Cargo) and the Agent (the freight forwarder or partner providing the quote). The 'carrier' field is for the shipping line/airline. The 'agent' field is for the partner. If no agent is mentioned or the rate is from the carrier itself, use "Direct" as the value for the 'agent' field.

**Location Standardization Rules (Based on Official Tables):**
- You MUST act as an expert with access to official port and airport code tables (like IATA, UN/LOCODE, and Brazilian Receita Federal).
- Your primary task is to normalize all location names to their standardized name, including the city and country.
- The required output format is **"Cidade, CC"** for ports (e.g., "Santos, BR") and **"Aeroporto de Cidade, CC"** for airports.
- Be very strict. If you see a code, convert it. If you see a city name, assume it's a port unless an airport is specified.
- **Examples of Standardization:**
  - **Brazilian Ports:**
    - "Santos", "SSZ", "Port of Santos" -> "Santos, BR"
    - "Itajaí", "ITJ" -> "Itajaí, BR"
    - "Paranaguá", "PNG" -> "Paranaguá, BR"
    - "Navegantes", "NVT" -> "Navegantes, BR"
    - "Itapoá", "IPO" -> "Itapoá, BR"
    - "Rio Grande", "RIG" -> "Rio Grande, BR"
  - **Brazilian Airports:**
    - "Guarulhos", "GRU", "Sao Paulo Intl" -> "Aeroporto de Guarulhos, BR"
    - "Viracopos", "VCP", "Campinas" -> "Aeroporto de Viracopos, BR"
  - **International Locations:**
    - "Rotterdam", "RTM", "Port of Rotterdam" -> "Roterdã, NL"
    - "Shanghai", "SHA", "Port of Shanghai" -> "Xangai, CN"
    - "Hamburg", "HAM" -> "Hamburgo, DE"
    - "Antwerp", "ANR" -> "Antuérpia, BE"
    - "Qingdao" -> "Qingdao, CN"
    - "Shenzhen", "SZX" -> "Shenzhen, CN"
    - "Miami", "MIA" -> "Aeroporto de Miami, US"
    - "JFK", "New York JFK" -> "Aeroporto JFK, US"
- **Multi-Port Rule:** If a rate is valid for multiple origins or destinations (e.g., "BR base ports", "Santos/Itapoa"), you MUST create separate, identical rate objects for EACH individual location. A rate for "BR base ports" to Shanghai should generate individual entries for "Santos, BR" to "Xangai, CN", "Itapoá, BR" to "Xangai, CN", etc. The term "BR base ports" refers to: Santos, Itapoá, Navegantes, Paranaguá, Rio Grande. Do not group ports in the output fields.

**Example of a valid final rate object:**
\`\`\`json
{
  "origin": "Santos, BR",
  "destination": "Roterdã, NL",
  "carrier": "Maersk",
  "modal": "Marítimo",
  "rate": "USD 2500",
  "transitTime": "25-30",
  "container": "20'GP",
  "validity": "31/12/2024",
  "freeTime": "14",
  "agent": "Global Logistics Agents"
}
\`\`\`

If no valid rates can be extracted, return an empty array: \`[]\`.

Analyze the following text and extract the rates:
{{{textInput}}}
`,
});


const extractRatesFromTextFlow = ai.defineFlow(
  {
    name: 'extractRatesFromTextFlow',
    inputSchema: ExtractRatesFromTextInputSchema,
    outputSchema: ExtractRatesFromTextOutputSchema,
  },
  async (input) => {
    const { output } = await extractRatesFromTextPrompt(input);
    // Genkit's `definePrompt` with an output schema automatically validates the output.
    // If validation fails, it throws an error that will be caught by the calling action.
    // We return an empty array if the model legitimately returns null/undefined without erroring.
    return output || [];
  }
);
