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
  origin: z.string().describe('The origin location (city, port, or airport).'),
  destination: z.string().describe('The destination location (city, port, or airport).'),
  carrier: z.string().describe('The name of the shipping carrier or airline.'),
  modal: z.enum(['Aéreo', 'Marítimo']).describe("The transport modal. Must be 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate or cost for a SINGLE container type, including currency (e.g., "USD 2500").'),
  transitTime: z.string().describe('The estimated transit time (e.g., "25-30 dias"). Use "N/A" if not specified.'),
  container: z.string().describe('The container type (e.g., "20\'GP", "40\'HC"). Use "N/A" for air freight.'),
  validity: z.string().describe('The expiration date of the rate (e.g., "31/12/2024"). Use "N/A" if not specified.'),
  freeTime: z.string().describe('The free time for container usage at destination (e.g., "14 dias", "21 days"). Use "N/A" if not specified.'),
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
  prompt: `You are an expert logistics AI. Your task is to extract all freight rates from the provided text and structure them into a JSON array based on the output schema.

**Key Instructions:**
- Create a separate object for each distinct rate.
- If a rate applies to multiple destinations (e.g., "SHA to SAN/RIO"), create a separate object for each destination.
- If a rate has multiple prices for different containers (e.g., "20GP/40HC: 2500/4800"), create a separate object for each container.
- If the text mentions "brazil base ports", you MUST generate separate rate entries for each of the main Brazilian ports: Santos, Paranaguá, Itapoá, and Rio Grande.

Text to analyze:
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

    if (output === null) {
      // This provides a more specific error when the model fails to generate valid JSON.
      throw new Error("A IA não conseguiu gerar uma resposta estruturada válida. O texto pode ser muito complexo ou ambíguo.");
    }

    // If the model correctly determines there are no rates, it will return an empty array.
    // The frontend handles the "no rates found" message.
    return output;
  }
);
