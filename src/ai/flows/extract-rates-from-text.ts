
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

const RateSchema = z.object({
  origin: z.string().describe('The origin location (e.g., "Santos, BR").'),
  destination: z.string().describe('The destination location (e.g., "Roterdã, NL").'),
  carrier: z.string().describe('The carrier name (e.g., "Maersk").'),
  modal: z.string().describe("The transport modal, 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500").'),
  container: z.string().describe('The container type (e.g., "20\'GP").'),
  transitTime: z.string().describe('The transit time (e.g., "25-30").'),
  validity: z.string().describe('The validity date (e.g., "31/12/2024").'),
  freeTime: z.string().describe('The free time in days (e.g., "14").'),
});
const ExtractRatesFromTextOutputSchema = z.array(RateSchema);
export type ExtractRatesFromTextOutput = z.infer<typeof ExtractRatesFromTextOutputSchema>;

export async function extractRatesFromText(input: ExtractRatesFromTextInput): Promise<ExtractRatesFromTextOutput> {
  return extractRatesFromTextFlow(input);
}

const extractRatesFromTextPrompt = ai.definePrompt({
  name: 'extractRatesFromTextPrompt',
  input: { schema: ExtractRatesFromTextInputSchema },
  output: { schema: z.object({ rates: ExtractRatesFromTextOutputSchema }) },
  prompt: `You are a logistics AI assistant. Your task is to extract freight rates from the text below and return a valid JSON object containing an array of rate objects. The final JSON must have a single key "rates".

**CRITICAL RULE FOR MULTI-RATES AND MULTI-PORTS:** You must handle complex rate notations.
- If a rate applies to multiple ports (e.g., "BR base ports"), create separate, identical rate objects for EACH port. "BR base ports" means: Santos, Itapoá, Navegantes, Paranaguá, Rio Grande.
- When you see rates separated by a slash \`/\` (e.g., "USD 5623/5826"), you MUST create separate JSON objects for each rate and container type. The implied order is **20'GP, 40'GP, 40'HC**.
    - **Example:** Text says \`Rate: USD 5623/5826 for 20/40HC\`. This means two rates. You MUST generate two objects: one for a **20'GP** container with rate "USD 5623" and a second for a **40'HC** container with rate "USD 5826".

**Data Formatting:**
- **Free Time:** Extract **ONLY THE NUMBER** (e.g., for "21 days", extract "21").
- **Validity:** If a date range is given (e.g., "valid until 21/07/2025"), extract **ONLY THE END DATE** ("21/07/2025").
- **Location Standardization:** Normalize location names (e.g., "Rotterdam" -> "Roterdã, NL"; "Shanghai" -> "Xangai, CN").

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
    
    if (!output?.rates || output.rates.length === 0) {
      throw new Error("A IA não conseguiu extrair nenhuma tarifa válida do texto. Tente ajustar o texto ou cole um trecho mais claro.");
    }

    return output.rates;
  }
);
