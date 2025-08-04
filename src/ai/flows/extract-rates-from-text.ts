
'use server';
/**
 * @fileOverview Extracts structured freight rate data from unstructured text or a media file (PDF, EML).
 *
 * - extractRatesFromText - A function that parses content and returns a structured list of rates.
 * - ExtractRatesFromTextInput - The input type for the function.
 * - ExtractRatesFromTextOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import EmlParser from 'eml-parser';
import { Stream } from 'stream';
import { googleAI } from '@genkit-ai/googleai';
import { extractTextFromXlsx } from '@/lib/extract-xlsx';

const ExtractRatesFromTextInputSchema = z.object({
  textInput: z.string().optional().describe('Unstructured text containing freight rate information, like an email or a pasted table.'),
  fileDataUri: z.string().optional().describe("A media file (like a PDF or .eml) as a data URI containing the rates."),
  fileName: z.string().optional().describe("The name of the uploaded file."),
});
export type ExtractRatesFromTextInput = z.infer<typeof ExtractRatesFromTextInputSchema>;

const RateSchema = z.object({
  origin: z.string().describe('The origin location (e.g., "Santos, BR").'),
  destination: z.string().describe('The destination location (e.g., "Roterdã, NL").'),
  carrier: z.string().describe('The carrier name (e.g., "Maersk").'),
  modal: z.string().describe("The transport modal, 'Aéreo' or 'Marítimo'."),
  rate: z.string().describe('The rate for a single container, including currency (e.g., "USD 2500").'),
  container: z.string().describe('The container type (e.g., "20\'GP").'),
  transitTime: z.string().describe('The transit time (e.g., "25-30").'),
  validity: z.string().describe('The validity date (e.g., "31/12/2024").'),
  freeTime: z.string().describe('The free time in days (e.g., "14").'),
});
const ExtractRatesFromTextOutputSchema = z.array(RateSchema);
export type ExtractRatesFromTextOutput = z.infer<typeof ExtractRatesFromTextOutputSchema>;

export async function extractRatesFromText(input: ExtractRatesFromTextInput): Promise<ExtractRatesFromTextOutput> {
  return extractRatesFromTextFlow(input);
}

const extractRatesFromTextPrompt = ai.definePrompt({
  name: 'extractRatesFromTextPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: z.object({ textInput: z.string().optional(), media: z.any().optional() }) },
  output: { schema: z.object({ rates: ExtractRatesFromTextOutputSchema }) },
  prompt: `You are a logistics AI assistant. Your task is to extract freight rates from the content below (which can be text or a media file like a PDF) and return a valid JSON object containing an array of rate objects. The final JSON must have a single key "rates".

**CRITICAL RULE FOR MULTI-RATES AND MULTI-PORTS:** You must handle complex rate notations.
- If a rate applies to multiple ports (e.g., "BR base ports"), create separate, identical rate objects for EACH port. "BR base ports" means: Santos, Itapoá, Navegantes, Paranaguá, Rio Grande.
- When you see rates separated by a slash \`/\` (e.g., "USD 5623/5826"), you MUST create separate JSON objects for each rate and container type. The implied order is **20'GP, 40'GP, 40'HC**.
    - **Example:** Text says \`Rate: USD 5623/5826 for 20/40HC\`. This means two rates. You MUST generate two objects: one for a **20'GP** container with rate "USD 5623" and a second for a **40'HC** container with rate "USD 5826".

**Data Formatting:**
- **Free Time:** Extract **ONLY THE NUMBER** (e.g., for "21 days", extract "21").
- **Validity:** If a date range is given (e.g., "valid until 21/07/2025"), extract **ONLY THE END DATE** ("21/07/2025").
- **Location Standardization:** Normalize location names (e.g., "Rotterdam" -> "Roterdã, NL"; "Shanghai" -> "Xangai, CN").
- **Container Standardization:**
    - If you see "NOR", it means "40'NOR".
    - If you see "40'Non Operating Reefer", it also means "40'NOR".

{{#if textInput}}
Analyze the following text and extract the rates:
{{{textInput}}}
{{/if}}
{{#if media}}
Analyze the following media file and extract the rates:
{{media url=media.url}}
{{/if}}
`,
});

const getMimeType = (fileName: string): string => {
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.pdf')) return 'application/pdf';
    if (lowerFileName.endsWith('.eml') || lowerFileName.endsWith('.msg')) return 'message/rfc822';
    if (lowerFileName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lowerFileName.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (lowerFileName.endsWith('.csv')) return 'text/csv';
    if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) return 'image/jpeg';
    if (lowerFileName.endsWith('.png')) return 'image/png';
    return 'application/octet-stream'; // Fallback
};

const ensureMimeTypeInDataUri = (dataUri: string, mimeType: string): string => {
    if (dataUri.startsWith(`data:${mimeType};base64,`)) {
        return dataUri;
    }
    const base64Part = dataUri.split(',')[1];
    if (!base64Part) {
        throw new Error('Invalid Data URI format.');
    }
    return `data:${mimeType};base64,${base64Part}`;
};

const extractRatesFromTextFlow = ai.defineFlow(
  {
    name: 'extractRatesFromTextFlow',
    inputSchema: ExtractRatesFromTextInputSchema,
    outputSchema: ExtractRatesFromTextOutputSchema,
  },
  async (input) => {
    let promptInput: { textInput?: string; media?: { url: string } } = {};

    if (input.fileDataUri && input.fileName) {
        const lowerFileName = input.fileName.toLowerCase();
        
        if (lowerFileName.endsWith('.eml') || lowerFileName.endsWith('.msg')) {
            const base64 = input.fileDataUri.split(',')[1];
            if (!base64) throw new Error("Invalid Data URI for .eml file.");
            
            const buffer = Buffer.from(base64, 'base64');
            const readableStream = new Stream.Readable();
            readableStream.push(buffer);
            readableStream.push(null);
            
            const eml = await new EmlParser(readableStream).parse();
            promptInput = { textInput: eml.text || eml.html || 'Could not extract text from EML.' };
        } else if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls') || lowerFileName.endsWith('.csv')) {
             const base64 = input.fileDataUri.split(',')[1];
             if (!base64) throw new Error('Invalid Data URI format for spreadsheet.');
             const buffer = Buffer.from(base64, 'base64');
             const textContent = await extractTextFromXlsx(buffer);
             promptInput = { textInput: textContent };
        } else {
             const mimeType = getMimeType(lowerFileName);
             if (mimeType === 'application/octet-stream') {
                throw new Error(`Unsupported file type: ${input.fileName}. Please use a supported format.`);
             }
             const correctedDataUri = ensureMimeTypeInDataUri(input.fileDataUri, mimeType);
             promptInput = { media: { url: correctedDataUri } };
        }
    } else if (input.textInput) {
        promptInput = { textInput: input.textInput };
    } else {
        throw new Error("Nenhum texto ou arquivo foi fornecido para extração.");
    }
    
    const { output } = await extractRatesFromTextPrompt(promptInput);
    
    if (!output?.rates || output.rates.length === 0) {
      throw new Error("A IA não conseguiu extrair nenhuma tarifa válida do texto. Tente ajustar o texto ou cole um trecho mais claro.");
    }

    return output.rates;
  }
);
