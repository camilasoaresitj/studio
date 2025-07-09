
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

const AgentContactSchema = z.object({
  name: z.string().describe("The agent's contact person's full name."),
  email: z.string().describe("The agent's contact person's email."),
  phone: z.string().describe("The agent's contact person's phone number."),
});

// Final, strict schema for a single rate object after processing.
const ParsedRateSchema = z.object({
  origin: z.string().describe('The standardized origin location (e.g., "Santos, BR").'),
  destination: z.string().describe('The standardized destination location (e.g., "Roterdã, NL").'),
  carrier: z.string().describe('The carrier name (e.g., "Maersk").'),
  modal: z.string().describe("The transport modal. Must be exactly 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500").'),
  transitTime: z.string().describe('The transit time (e.g., "25-30").'),
  container: z.string().describe('The container type (e.g., "20\'GP").'),
  validity: z.string().describe('The validity date (e.g., "31/12/2024").'),
  freeTime: z.string().describe('The free time in days, only the number (e.g., "14").'),
  agent: z.string().describe('The agent who provided the rate (e.g., "Global Logistics Agents").'),
  agentContact: AgentContactSchema.optional(),
});
const ExtractRatesFromTextOutputSchema = z.array(ParsedRateSchema);
export type ExtractRatesFromTextOutput = z.infer<typeof ExtractRatesFromTextOutputSchema>;


// A more lenient schema for the AI prompt's output. The AI will extract what it can,
// and we will clean up the data in the code.
const PartialRateSchemaForPrompt = z.object({
    origin: z.string().describe('The origin location as written in the text.').optional(),
    destination: z.string().describe('The destination location as written in the text.').optional(),
    rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500").').optional(),
    modal: z.string().describe("The transport modal. 'Aéreo' or 'Marítimo'.").optional(),
    carrier: z.string().describe('The carrier name (e.g., "Maersk").').optional(),
    transitTime: z.string().describe('The transit time (e.g., "25-30").').optional(),
    container: z.string().describe('The container type (e.g., "20\'GP").').optional(),
    validity: z.string().describe('The validity date (e.g., "31/12/2024").').optional(),
    freeTime: z.string().describe('The free time in days (e.g., "14" or "14 dias").').optional(),
    agent: z.string().describe('The agent who provided the rate (e.g., "Global Logistics Agents").').optional(),
    agentContact: AgentContactSchema.optional(),
});


export async function extractRatesFromText(input: ExtractRatesFromTextInput): Promise<ExtractRatesFromTextOutput> {
  return extractRatesFromTextFlow(input);
}

const extractRatesFromTextPrompt = ai.definePrompt({
  name: 'extractRatesFromTextPrompt',
  input: { schema: ExtractRatesFromTextInputSchema },
  // Use the more lenient, partial schema for the prompt's output.
  output: { schema: z.array(PartialRateSchemaForPrompt) },
  prompt: `You are a logistics AI assistant. Your task is to extract freight rates from the text below and return a valid JSON array of rate objects.

**Extraction Process & Rules:**

1.  **General Info First:** Scan the entire text for general information that applies to multiple rates, like "free time" rules per carrier (e.g., "CMA free time 28 days", "HMM free time 21 days for dry, 18 for nor") or agent contact details. Keep this information in mind.
2.  **Extract Each Rate:** Create one JSON object for each individual rate/container combination.
3.  **Multi-Port/Multi-Container Rule:** If a single rate line applies to multiple ports or containers (e.g., "USD 5000/6000" for 20'/40' or a rate for "BR base ports"), you MUST create separate, identical rate objects for EACH combination. "BR base ports" refers to: Santos, Itapoá, Navegantes, Paranaguá, Rio Grande.
4.  **Apply General Info:** When you create a rate object for a carrier, apply the general "free time" rules you found in step 1.
5.  **Data Extraction:**
    -   **Free Time:** Extract the value as you see it (e.g., "21", "14 dias").
    -   **Validity:** If a date range is given (e.g., "valid from 15/07 to 21/07/2025"), extract ONLY the end date ("21/07/2025").
    -   **Agent Contact:** Find a full name, email, AND phone number together. If any part is missing, don't include the \`agentContact\` object.
    -   **Location Standardization:** Normalize location names (e.g., "Rotterdam" -> "Roterdã, NL"; "Shanghai" -> "Xangai, CN").
6.  **Final Quality Check:** Before finishing, review your generated JSON. If any object is fundamentally incomplete (missing an origin, destination, or rate), delete that entire object from the array. It is better to return fewer, complete rates than an incomplete list.

Analyze the following text and extract the rates:
{{{textInput}}}
`,
});

const normalizeContainerType = (containerStr: string | undefined): string => {
    if (!containerStr || containerStr.trim().toLowerCase() === 'n/a' || containerStr.trim() === '') {
        return 'N/A';
    }
    // Normalize by removing spaces, special chars except ' and converting to lowercase
    const c = containerStr.toLowerCase().replace(/[^a-z0-9']/g, '');

    if (c.includes('20')) {
        if (c.includes('ot')) return "20'OT";
        if (c.includes('fr')) return "20'FR";
        if (c.includes('rf') || c.includes('reefer')) return "20'RF";
        return "20'GP";
    }
    if (c.includes('40')) {
        if (c.includes('hc') || c.includes('hq') || c.includes('highcube')) return "40'HC";
        if (c.includes('ot')) return "40'OT";
        if (c.includes('fr')) return "40'FR";
        if (c.includes('rf') || c.includes('reefer')) return "40'RF";
        if (c.includes('nor')) return "40'NOR";
        return "40'GP";
    }
    // Fallback for unrecognized types
    return containerStr.toUpperCase().trim();
};

const extractRatesFromTextFlow = ai.defineFlow(
  {
    name: 'extractRatesFromTextFlow',
    inputSchema: ExtractRatesFromTextInputSchema,
    // The flow's final output must match the strict, complete schema.
    outputSchema: ExtractRatesFromTextOutputSchema,
  },
  async (input) => {
    // The prompt returns a list of potentially incomplete rate objects.
    const { output } = await extractRatesFromTextPrompt(input);
    
    // It's possible the AI returns nothing if the text is very unclear.
    if (!output || output.length === 0) {
      return [];
    }
    
    // Clean up and normalize the data, providing fallbacks for any optional fields the AI might have missed.
    const completeRates = output
      // First, filter out any rate that is fundamentally useless (e.g., missing a price or a route).
      .filter(partialRate => partialRate.rate && partialRate.origin && partialRate.destination)
      // Then, map the remaining partial rates to the full, strict schema.
      .map(partialRate => {
        const completeRate: z.infer<typeof ParsedRateSchema> = {
          origin: partialRate.origin!,
          destination: partialRate.destination!,
          rate: partialRate.rate!,
          modal: partialRate.modal || 'Marítimo', // Default to a sensible value
          carrier: partialRate.carrier || 'N/A',
          transitTime: partialRate.transitTime || 'N/A',
          container: normalizeContainerType(partialRate.container),
          validity: partialRate.validity || 'N/A',
          freeTime: (partialRate.freeTime || 'N/A').replace(/\D/g, '') || 'N/A',
          agent: partialRate.agent || 'Direct',
          agentContact: partialRate.agentContact,
        };
        return completeRate;
      });

    return completeRates;
  }
);
