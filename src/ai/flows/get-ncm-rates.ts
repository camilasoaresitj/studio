
'use server';
/**
 * @fileOverview A Genkit flow to get simulated tax rates for a given NCM code.
 *
 * getNcmRates - A function that returns standard tax rates for a NCM.
 * GetNcmRatesInput - The input type for the function.
 * GetNcmRatesOutput - The return type for the function.
 */

import { initializeAI } from '@/ai/genkit';
import { z } from 'zod';

const ai = initializeAI();

const GetNcmRatesInputSchema = z.object({
  ncm: z.string().describe('The NCM code (8 digits).'),
});
export type GetNcmRatesInput = z.infer<typeof GetNcmRatesInputSchema>;

const GetNcmRatesOutputSchema = z.object({
  ncm: z.string().describe('The NCM code provided.'),
  ii: z.number().describe('The Import Tax (II) rate in percent (e.g., 14 for 14%).'),
  ipi: z.number().describe('The Industrialized Products Tax (IPI) rate in percent.'),
  pis: z.number().describe('The PIS rate in percent.'),
  cofins: z.number().describe('The COFINS rate in percent.'),
  description: z.string().describe('A brief description of the NCM category.'),
});
export type GetNcmRatesOutput = z.infer<typeof GetNcmRatesOutputSchema>;

export async function getNcmRates(input: GetNcmRatesInput): Promise<GetNcmRatesOutput> {
  return getNcmRatesFlow(input);
}

const getNcmRatesPrompt = ai.definePrompt({
  name: 'getNcmRatesPrompt',
  input: { schema: GetNcmRatesInputSchema },
  output: { schema: GetNcmRatesOutputSchema },
  prompt: `You are a Brazilian customs expert AI. Your task is to provide the standard tax rates for a given NCM code.
You must return the standard, most common ad valorem rates for II, IPI, PIS, and COFINS.

**NCM Code:** {{{ncm}}}

**Important Rules:**
-   Provide the rates as percentages (e.g., for 14%, return the number 14).
-   Do not consider any special regimes, ex-tarifários, or state-level ICMS variations. Return only the standard federal rates.
-   The standard PIS rate for imports is 2.10%.
-   The standard COFINS rate for imports is 9.65%.
-   Provide a short, one-sentence description for the NCM category.

**Example for NCM 8517.12.31 (Smartphones):**
{
  "ncm": "85171231",
  "ii": 16,
  "ipi": 15,
  "pis": 2.10,
  "cofins": 9.65,
  "description": "Telefones celulares inteligentes (smartphones)."
}

Now, provide the rates for the requested NCM.
`,
});

const getNcmRatesFlow = ai.defineFlow(
  {
    name: 'getNcmRatesFlow',
    inputSchema: GetNcmRatesInputSchema,
    outputSchema: GetNcmRatesOutputSchema,
  },
  async (input) => {
    // This is a simulation. A real implementation would require a dedicated, paid API for NCM rates.
    // The AI will generate a plausible response based on its training data.
    console.log(`Simulating NCM rate lookup for ${input.ncm}`);
    const { output } = await getNcmRatesPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate NCM rate information.");
    }
    return output;
  }
);
