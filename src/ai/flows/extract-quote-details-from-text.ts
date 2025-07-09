'use server';
/**
 * @fileOverview Extracts structured freight quote data from unstructured text.
 *
 * - extractQuoteDetailsFromText - A function that parses text and returns structured quote data.
 * - ExtractQuoteDetailsFromTextInput - The input type for the function.
 * - ExtractQuoteDetailsFromTextOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { baseFreightQuoteFormSchema, oceanContainerSchema } from '@/lib/schemas';

const ExtractQuoteDetailsFromTextInputSchema = z.object({
  textInput: z.string().describe('Unstructured text containing freight quote request information, like an email.'),
});
export type ExtractQuoteDetailsFromTextInput = z.infer<typeof ExtractQuoteDetailsFromTextInputSchema>;

// The output schema should be a partial version of the form schema,
// as not all fields might be present in the text.
const ExtractQuoteDetailsFromTextOutputSchema = baseFreightQuoteFormSchema.partial().extend({
    // Make sure containers are fully structured if present
    oceanShipment: z.object({
        containers: z.array(oceanContainerSchema).optional()
    }).partial().optional(),
    lclDetails: z.object({
        cbm: z.coerce.number().optional(),
        weight: z.coerce.number().optional()
    }).partial().optional()
});

export type ExtractQuoteDetailsFromTextOutput = z.infer<typeof ExtractQuoteDetailsFromTextOutputSchema>;

export async function extractQuoteDetailsFromText(input: ExtractQuoteDetailsFromTextInput): Promise<ExtractQuoteDetailsFromTextOutput> {
  return extractQuoteDetailsFromTextFlow(input);
}

const extractQuoteDetailsFromTextPrompt = ai.definePrompt({
  name: 'extractQuoteDetailsFromTextPrompt',
  input: { schema: ExtractQuoteDetailsFromTextInputSchema },
  output: { schema: ExtractQuoteDetailsFromTextOutputSchema },
  prompt: `You are a logistics operations expert. Your task is to extract freight quoting information from the unstructured text provided below and return a valid JSON object that partially matches the quoting form schema.

**Extraction Rules:**
- **Modal:** Determine if the request is 'air' or 'ocean'.
- **Locations:** Identify the 'origin' and 'destination'. Standardize them to 'City, Country Code' format (e.g., "Santos, BR", "Shanghai, CN").
- **Incoterm:** Find the Incoterm (e.g., FOB, EXW). If not found, default to 'FOB'.
- **Cargo Details:**
  - If **Ocean FCL**, identify the container types and quantities (e.g., 1x40'HC). Populate the 'oceanShipment.containers' array.
  - If **Ocean LCL**, find the CBM and weight in KG. Populate 'lclDetails'.
  - If **Air**, identify the number of pieces, their dimensions (L, W, H in cm), and weight in KG. Populate the 'airShipment.pieces' array.
- **Commodity:** Extract the description of the goods if available.
- **Do not guess or invent information.** If a field is not present in the text, omit it from the JSON output.

**Example Input Text:**
"Hi team, please quote a shipment for our client Nexus Imports.
We need to ship 1x40'HC container from Shanghai, CN to Santos, BR. Incoterm is FOB. Commodity is electronics.
Thanks, John"

**Expected Example JSON Output:**
\`\`\`json
{
  "modal": "ocean",
  "origin": "Shanghai, CN",
  "destination": "Santos, BR",
  "incoterm": "FOB",
  "commodity": "Electronics",
  "oceanShipmentType": "FCL",
  "oceanShipment": {
    "containers": [
      {
        "type": "40'HC",
        "quantity": 1
      }
    ]
  }
}
\`\`\`

Now, analyze the following text and extract the quoting information:
{{{textInput}}}
`,
});

const extractQuoteDetailsFromTextFlow = ai.defineFlow(
  {
    name: 'extractQuoteDetailsFromTextFlow',
    inputSchema: ExtractQuoteDetailsFromTextInputSchema,
    outputSchema: ExtractQuoteDetailsFromTextOutputSchema,
  },
  async (input) => {
    const { output } = await extractQuoteDetailsFromTextPrompt(input);
    return output || {};
  }
);
