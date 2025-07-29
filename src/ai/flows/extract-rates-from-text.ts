
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
    transitTime: z.string().describe('The transit time (e.g., "25-30").optional()'),
    container: z.string().describe('The container type (e.g., "20\'GP").').optional(),
    validity: z.string().describe('The validity date (e.g., "31/12/2024").optional()'),
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
  output: { schema: z.object({ rates: z.array(PartialRateSchemaForPrompt) }) },
  prompt: `You are a logistics AI assistant. Your task is to extract freight rates from the text below and return a valid JSON object containing an array of rate objects. The final JSON must have a single key "rates".

**Extraction Process & Rules:**

1.  **General Info First (CRITICAL RULE FOR FREE TIME):** Your FIRST step is to scan the entire text for general information that applies to multiple rates. Look for sentences like "CMA free time 28 days", "HMM free time 21 days for dry, 18 for nor", or "ONE Free time: 21 days". Memorize these general rules per carrier.

2.  **Extract Each Rate:** Create one JSON object for each individual rate/container combination. As you extract each rate, remember to apply the general "free time" rules you found in step 1 to the corresponding carrier.

3.  **CRITICAL RULE FOR MULTI-RATES AND MULTI-PORTS:** You must handle complex rate notations.
    -   **Multi-Port:** If a rate applies to multiple ports (e.g., "BR base ports"), you MUST create separate, identical rate objects for EACH port. "BR base ports" refers to: Santos, Itapoá, Navegantes, Paranaguá, Rio Grande.
    -   **Multi-Container (Slash-Separated Rates):** This is the most important rule. When you see rates separated by a slash \`/\` (e.g., "USD 5623/5826" or "USD 6600/6800/6800/NOR5100"), you MUST create separate JSON objects for each rate and container type. The implied order of containers is **20'GP, 40'GP, 40'HC, 40'NOR**.
        -   **Example 1:** Text says \`Rate: USD 5623/5826 for 20/40HC\`. This means two rates. You MUST generate two objects: one for a **20'GP** container with rate "USD 5623" and a second for a **40'HC** container with rate "USD 5826".
        -   **Example 2:** Text says \`Rate: USD 6600/6800/6800/NOR5100\`. This means four rates. You MUST generate four objects: one for **20'GP** at "USD 6600", one for **40'GP** at "USD 6800", one for **40'HC** at "USD 6800", and one for **40'NOR** at "USD 5100".
        -   **If a rate is for 20/40 only, assume 20'GP and 40'GP.**

4.  **Data Formatting & Quality Check:**
    -   **Free Time:** Extract **ONLY THE NUMBER** (e.g., for "21 days", extract "21").
    -   **Validity:** If a date range is given (e.g., "valid from 15/07 to 21/07/2025"), extract **ONLY THE END DATE** ("21/07/2025").
    -   **Agent Contact:** Find a full name, email, AND phone number together. If any part is missing, do not include the \`agentContact\` object.
    -   **Location Standardization:** Normalize location names (e.g., "Rotterdam" -> "Roterdã, NL"; "Shanghai" -> "Xangai, CN").
    -   **Final Review:** Before finishing, review your generated JSON. If any object is fundamentally incomplete (missing an origin, destination, or rate), delete that entire object from the array. It is better to return fewer, complete rates than an incomplete list.
    -   **JSON Output:** You must ensure the final output is a single JSON object with the key "rates" containing an array of the extracted rate objects.

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
    const { output: llmOutput } = await extractRatesFromTextPrompt(input);
    
    const partialRates = llmOutput?.rates;
    
    // It's possible the AI returns nothing if the text is very unclear.
    if (!partialRates || partialRates.length === 0) {
      throw new Error("A IA não conseguiu extrair nenhuma tarifa válida do texto. Tente ajustar o texto ou cole um trecho mais claro.");
    }
    
    // Clean up and normalize the data, providing fallbacks for any optional fields the AI might have missed.
    const completeRates = partialRates
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
