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
  modal: z.enum(['Aéreo', 'Marítimo']).describe('The transport modal.'),
  rate: z.string().describe('The rate or cost, including currency and unit (e.g., "USD 2,500", "4.50/kg"). Do not include container type here.'),
  transitTime: z.string().describe('The estimated transit time (e.g., "25-30 dias").'),
  container: z.string().describe('The container type (e.g., "20\'GP", "40\'HC"), if applicable. Should be "N/A" for air freight or LCL rates.'),
  validity: z.string().describe('The expiration date of the rate (e.g., "31/12/2024").'),
  freeTime: z.string().describe('The free time for container usage at destination (e.g., "14 dias", "21 days"). Should be "N/A" if not specified.'),
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
  prompt: `You are an expert logistics data entry assistant. Your task is to analyze the provided text, which could be from an email, a spreadsheet, or a document, and extract freight rate information into a structured JSON format.

The text contains one or more freight rates. Identify the following details for each rate:
- Origin
- Destination
- Carrier
- Modal (determine if it's 'Aéreo' or 'Marítimo' based on context like port/airport codes, carrier names, or units like TEU/kg)
- Rate (the cost, including currency but not the container type. e.g., "2500", "4.50 / kg")
- Transit Time
- Container (The container type if specified, like "20'GP" or "40'HC". If it's air freight or not specified, use "N/A".)
- Validity (The expiration date of the rate, e.g., "31/12/2024".)
- Free Time (The free time for container usage at the destination, e.g., "14 dias", "7 days". If not specified, use "N/A".)

Important rules:
- If the origin or destination is a general region like "brazil base ports", you MUST create a separate rate entry for each of the main Brazilian ports: Santos, Paranaguá, Itapoá, and Rio Grande, applying the same rate to all of them.

Carefully parse the following text and return an array of JSON objects, with each object representing a single freight rate. If a piece of information is not available for a specific rate, return "N/A".

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
    return output!;
  }
);
