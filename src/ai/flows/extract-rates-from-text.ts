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
  origin: z.string().describe('The standardized origin location (e.g., "Porto de Santos, BR"). Mandatory.'),
  destination: z.string().describe('The standardized destination location (e.g., "Porto de Roterdã, NL"). Mandatory.'),
  carrier: z.string().describe('The carrier name (e.g., "Maersk"). Use "N/A" if not found.'),
  modal: z.string().describe("The transport modal. Must be exactly 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500"). Mandatory.'),
  transitTime: z.string().describe('The transit time (e.g., "25-30 dias"). Use "N/A" if not found.'),
  container: z.string().describe('The container type (e.g., "20\'GP"). Use "N/A" for air freight.'),
  validity: z.string().describe('The validity date (e.g., "31/12/2024"). Use "N/A" if not found.'),
  freeTime: z.string().describe('The free time (e.g., "14 dias"). Use "N/A" if not found.'),
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
- If a rate is specified for multiple containers (e.g., "USD 5000/6000/6000"), you MUST create separate objects for 20'GP, 40'GP, and 40'HC respectively.
- The \`modal\` field must be either "Aéreo" or "Marítimo". Infer from context.
- For all other non-mandatory fields (\`carrier\`, \`transitTime\`, \`container\`, \`validity\`, \`freeTime\`), use the exact string "N/A" if the information is not present.

**Location Standardization Rules:**
- You MUST normalize all location names to their full, official name, including the city and country.
- Use the format "Nome do Local, XX" where XX is the 2-letter country code.
- Examples of standardization:
  - Input: "Santos", "SSZ" => Output: "Porto de Santos, BR"
  - Input: "Rotterdam", "RTM" => Output: "Porto de Roterdã, NL"
  - Input: "Guarulhos", "GRU Airport" => Output: "Aeroporto de Guarulhos, BR"
  - Input: "Shanghai" => Output: "Porto de Xangai, CN"
- **Special Brazil Rule:** If the text mentions "Brazil base ports", "BR base ports", or similar, interpret this as the single string: "Santos / Itapoa / Navegantes / Paranagua / Rio Grande, BR".

**Example of a valid final rate object:**
\`\`\`json
{
  "origin": "Porto de Santos, BR",
  "destination": "Porto de Roterdã, NL",
  "carrier": "Maersk",
  "modal": "Marítimo",
  "rate": "USD 2500",
  "transitTime": "25-30 dias",
  "container": "20'GP",
  "validity": "31/12/2024",
  "freeTime": "14 dias"
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
