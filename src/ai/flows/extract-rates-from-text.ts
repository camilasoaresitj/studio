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
  prompt: `You are an expert logistics AI. Your primary task is to extract freight rates from the provided text and structure them into a JSON array, strictly following the defined schema.

**Core Instructions:**
1.  **Mandatory Fields**: Generate a rate object **only if** you can find a specific **origin**, **destination**, and **rate value**. If any of these three are missing for a potential rate, ignore it completely.
2.  **String Values**: Ensure **all** values in the output JSON are **strings**. For example, a rate of 2500 must be represented as \`"rate": "2500"\`, not \`"rate": 2500\`.
3.  **One Rate Per Object**: Each JSON object must represent a single rate for a single container type.
4.  **Slash-Separated Rates**: If a rate appears like \`USD 6013/6226/6226\`, you MUST create three separate JSON objects for **20'GP**, **40'GP**, and **40'HC** containers respectively.
5.  **Modal Type**: The \`modal\` field must be either 'Aéreo' or 'Marítimo'. Infer this from the context (e.g., port names mean 'Marítimo'). If ambiguous, default to 'Marítimo'.
6.  **"N/A" for Missing Info**: For any non-mandatory field where information is not present (like \`carrier\`, \`transitTime\`, \`validity\`, \`freeTime\`, or \`container\` for air freight), use the string "N/A".

Produce an empty array \`[]\` if no valid rates can be extracted from the text.

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
