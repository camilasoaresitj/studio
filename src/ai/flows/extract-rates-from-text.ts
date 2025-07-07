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
  origin: z.string().describe('The origin location (city, port, or airport). This is a mandatory field.'),
  destination: z.string().describe('The destination location (city, port, or airport). This is a mandatory field.'),
  carrier: z.string().describe('The name of the shipping carrier or airline.'),
  modal: z.enum(['Aéreo', 'Marítimo']).describe("The transport modal. Must be 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate or cost for a SINGLE container type, including currency (e.g., "USD 2500"). This is a mandatory field.'),
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
  prompt: `You are an expert logistics AI. Your task is to meticulously extract freight rates from the provided text and structure them into a JSON array based on the defined schema.

**CRITICAL RULES:**
1.  **YOU MUST NOT** generate a rate object unless you can find a specific **origin**, **destination**, and **rate value** in the text for that rate. If any of these three are missing, you must ignore that line/rate completely.
2.  If a rate applies to multiple destinations (e.g., "SHA to SAN/RIO"), create a separate object for each destination.
3.  **IMPORTANT**: If you encounter a rate with three values separated by slashes (e.g., \`USD 6013/6226/6226\`), you MUST interpret this as rates for three different container types in the following order: **20'GP**, **40'GP**, and **40'HC**. Create a separate JSON object for each of these rates.
4.  If a rate has multiple prices for different containers explicitly named (e.g., "20GP/40HC: 2500/4800"), create a separate object for each container.
5.  If the text mentions "brazil base ports" or "brazilian ports", you MUST generate separate rate entries for each of the main Brazilian ports: Santos, Paranaguá, Itapoá, and Rio Grande.

**FIELD-SPECIFIC INSTRUCTIONS:**
- For fields \`transitTime\`, \`validity\`, \`freeTime\`, and \`container\`: If you cannot find a value for a valid rate, use the string "N/A".

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
    try {
      const { output } = await extractRatesFromTextPrompt(input);
      if (output === null) {
        throw new Error("A IA não conseguiu gerar uma resposta estruturada válida. O texto pode ser muito complexo ou ambíguo.");
      }
      return output;
    } catch (error) {
       console.error("Error in extractRatesFromTextFlow:", error);
       // Re-throw a more user-friendly error message for schema validation failures.
       if (error instanceof Error && (error.message.includes('Schema validation failed') || error.message.includes('INVALID_ARGUMENT'))) {
           throw new Error("A IA retornou dados inconsistentes ou incompletos. Verifique se todas as tarifas no texto possuem origem, destino e valor claramente definidos.");
       }
       // Re-throw original error or a generic one if it's not a schema validation error
       throw error instanceof Error ? error : new Error("Ocorreu um erro desconhecido durante a extração.");
    }
  }
);
