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
  rate: z.string().describe('The rate or cost, including currency and unit (e.g., "USD 2,500 / TEU", "4.50/kg").'),
  transitTime: z.string().describe('The estimated transit time (e.g., "25-30 dias").'),
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
- Rate (the cost, including currency and units)
- Transit Time

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
