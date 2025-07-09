
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

const AgentContactSchema = z.object({
  name: z.string().describe("The agent's contact person's full name."),
  email: z.string().describe("The agent's contact person's email."),
  phone: z.string().describe("The agent's contact person's phone number."),
});

// Final, strict schema for a single rate object after processing.
const ParsedRateSchema = z.object({
  origin: z.string().describe('The standardized origin location (e.g., "Santos, BR").'),
  destination: z.string().describe('The standardized destination location (e.g., "Roterdã, NL").'),
  carrier: z.string().describe('The carrier name (e.g., "Maersk").'),
  modal: z.string().describe("The transport modal. Must be exactly 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500").'),
  transitTime: z.string().describe('The transit time (e.g., "25-30").'),
  container: z.string().describe('The container type (e.g., "20\'GP").'),
  validity: z.string().describe('The validity date (e.g., "31/12/2024").'),
  freeTime: z.string().describe('The free time in days, only the number (e.g., "14").'),
  agent: z.string().describe('The agent who provided the rate (e.g., "Global Logistics Agents").'),
  agentContact: AgentContactSchema.describe("The contact person for the agent, if mentioned in the text.").optional(),
});
const ExtractRatesFromTextOutputSchema = z.array(ParsedRateSchema);
export type ExtractRatesFromTextOutput = z.infer<typeof ExtractRatesFromTextOutputSchema>;


// A more lenient schema for the AI prompt's output. The AI will extract what it can,
// and we will clean up the data in the code.
const PartialRateSchemaForPrompt = z.object({
    origin: z.string().describe('The standardized origin location (e.g., "Santos, BR").').optional(),
    destination: z.string().describe('The standardized destination location (e.g., "Roterdã, NL").').optional(),
    rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500").').optional(),
    modal: z.string().describe("The transport modal. Must be exactly 'Aéreo' or 'Marítimo'.").optional(),
    carrier: z.string().describe('The carrier name (e.g., "Maersk").').optional(),
    transitTime: z.string().describe('The transit time (e.g., "25-30").').optional(),
    container: z.string().describe('The container type (e.g., "20\'GP").').optional(),
    validity: z.string().describe('The validity date (e.g., "31/12/2024").').optional(),
    freeTime: z.string().describe('The free time in days, only the number (e.g., "14").').optional(),
    agent: z.string().describe('The agent who provided the rate (e.g., "Global Logistics Agents").').optional(),
    agentContact: AgentContactSchema.optional(),
});


export async function extractRatesFromText(input: ExtractRatesFromTextInput): Promise<ExtractRatesFromTextOutput> {
  return extractRatesFromTextFlow(input);
}

const extractRatesFromTextPrompt = ai.definePrompt({
  name: 'extractRatesFromTextPrompt',
  input: { schema: ExtractRatesFromTextInputSchema },
  // Use the more lenient, partial schema for the prompt's output.
  output: { schema: z.array(PartialRateSchemaForPrompt) },
  prompt: `You are a logistics AI assistant. Your task is to extract freight rates from the text below and return a valid JSON array of rate objects.

**Core Extraction Rules:**
- Each object in the array represents ONE rate for ONE container type.
- Extract as much information as you can for each rate. If a field is not present, you can omit it.
- **Agent Contact:** You MUST only generate the \`agentContact\` object if the text explicitly contains all three of the following pieces of information for a specific contact person: a full name, an email address, AND a phone number. If even one of these three is missing for a contact, you **MUST OMIT the \`agentContact\` object and key entirely** for that rate's JSON object. Do not generate a partial or empty \`agentContact\` object under any circumstances.
- If a rate is specified for multiple containers (e.g., "USD 5000/6000/6000"), create separate objects for 20'GP, 40'GP, and 40'HC.

**Data Formatting Rules:**
- **Location Standardization:** You MUST normalize all location names to their standardized name (e.g., "Santos" -> "Santos, BR"; "Rotterdam" -> "Roterdã, NL"; "Shanghai" -> "Xangai, CN"; "Guarulhos" -> "Aeroporto de Guarulhos, BR").
- **Multi-Port Rule:** If a rate is valid for multiple origins or destinations (e.g., "BR base ports", "Santos/Itapoa"), you MUST create separate, identical rate objects for EACH individual location. "BR base ports" refers to: Santos, Itapoá, Navegantes, Paranaguá, Rio Grande.

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
    
    if (!output || output.length === 0) {
      return [];
    }

    // This is the new, robust post-processing logic.
    // It trusts the AI's partial extraction and uses code to enforce data integrity.
    const completeRates = output
      .map(partialRate => {
        // A rate is only truly useless if it has no price. 
        // All other fields can have sensible defaults.
        if (!partialRate.rate) {
          return null;
        }

        // Create a new, complete rate object, providing "N/A" as a fallback.
        const completeRate: z.infer<typeof ParsedRateSchema> = {
          origin: partialRate.origin || 'N/A',
          destination: partialRate.destination || 'N/A',
          rate: partialRate.rate,
          modal: partialRate.modal || 'Marítimo', // Default to a sensible value
          carrier: partialRate.carrier || 'N/A',
          transitTime: partialRate.transitTime || 'N/A',
          container: partialRate.container || 'N/A',
          validity: partialRate.validity || 'N/A',
          freeTime: partialRate.freeTime || 'N/A',
          agent: partialRate.agent || 'Direct',
          agentContact: partialRate.agentContact,
        };
        return completeRate;
      })
      .filter((rate): rate is z.infer<typeof ParsedRateSchema> => rate !== null); // Remove the truly useless nulls

    return completeRates;
  }
);
