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
  prompt: `You are an AI logistics assistant specialized in parsing and structuring freight rate data from unstructured text like emails and copied tables. Your task is to extract the information and return it as a structured array of JSON objects.

**Extraction Rules:**

1.  **Identify Individual Rates:** Parse the text to find all distinct freight rates. A single line might contain multiple rates (e.g., for different containers or destinations). You must create a separate JSON object for each combination.
2.  **Extract Key Fields:** For each rate, extract the following information:
    *   \`origin\`: The origin location (port or airport).
    *   \`destination\`: The destination location (port or airport).
    *   \`carrier\`: The shipping line or airline.
    *   \`modal\`: Must be either 'Aéreo' or 'Marítimo'. Determine from context.
    *   \`rate\`: The cost, including currency. **Do not include container type here.**
    *   \`transitTime\`: Estimated transit time. If not found, use "N/A".
    *   \`container\`: The specific container type (e.g., "20'GP", "40'HC"). For air freight, use "N/A".
    *   \`validity\`: The rate's expiration date.
    *   \`freeTime\`: The free time at destination. If not found, use "N/A".
3.  **Handle "Base Ports":** If the text mentions a general region like "brazil base ports", you MUST generate a separate rate entry for each of the main Brazilian ports: **Santos**, **Paranaguá**, **Itapoá**, and **Rio Grande**. Apply the same rate and details to all of them.
4.  **Output Format:** The final output must be a valid JSON array. Each element in the array must be an object conforming to the specified schema. If no rates can be extracted, return an empty array \`[]\`.

**Example:**

**Input Text:** \`PIL rate: From SHA to SAN/RIO, 20GP/40HC: 2500/4800 USD. Valid thru 31/Jul. 14 days free time.\`

**Example JSON Output:**
\`\`\`json
[
  {
    "origin": "SHA",
    "destination": "SAN",
    "carrier": "PIL",
    "modal": "Marítimo",
    "rate": "2500 USD",
    "transitTime": "N/A",
    "container": "20'GP",
    "validity": "31/Jul",
    "freeTime": "14 days"
  },
  {
    "origin": "SHA",
    "destination": "SAN",
    "carrier": "PIL",
    "modal": "Marítimo",
    "rate": "4800 USD",
    "transitTime": "N/A",
    "container": "40'HC",
    "validity": "31/Jul",
    "freeTime": "14 days"
  },
  {
    "origin": "SHA",
    "destination": "RIO",
    "carrier": "PIL",
    "modal": "Marítimo",
    "rate": "2500 USD",
    "transitTime": "N/A",
    "container": "20'GP",
    "validity": "31/Jul",
    "freeTime": "14 days"
  },
  {
    "origin": "SHA",
    "destination": "RIO",
    "carrier": "PIL",
    "modal": "Marítimo",
    "rate": "4800 USD",
    "transitTime": "N/A",
    "container": "40'HC",
    "validity": "31/Jul",
    "freeTime": "14 days"
  }
]
\`\`\`

---

Now, carefully analyze the following text and extract the rates. Return ONLY the JSON array.

**Text to analyze:**
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
