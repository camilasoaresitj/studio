
'use server';
/**
 * @fileOverview A Genkit flow to extract structured invoice items from a file (XLSX, CSV, XML, PDF, JPG, PNG).
 */

import { defineFlow, definePrompt, generate } from '@genkit-ai/core';
import { z } from 'zod';
import { extractTextFromXlsx } from '@/lib/extract-xlsx';
import { InvoiceItemSchema, ExtractInvoiceItemsInputSchema, ExtractInvoiceItemsOutputSchema } from '@/lib/schemas/invoice';
import type { ExtractInvoiceItemsInput, ExtractInvoiceItemsOutput } from '@/lib/schemas/invoice';

const extractFromXml = (dataUri: string): { textContent: string; media?: never } => {
    const base64 = dataUri.split(',')[1];
    if (!base64) throw new Error('Invalid Data URI format.');
    const buffer = Buffer.from(base64, 'base64');
    const textContent = buffer.toString('utf-8');

    if (!textContent || textContent.trim().length < 5) {
        throw new Error('XML file seems to be empty or could not be read.');
    }

    return { textContent };
};

const extractFromMedia = (dataUri: string): { media: { url: string }; textContent?: never } => {
    return { media: { url: dataUri } };
};


const extractInvoiceItemsPrompt = definePrompt({
  name: 'extractInvoiceItemsPrompt',
  inputSchema: z.object({ textContent: z.string().optional(), media: z.any().optional() }),
  outputSchema: z.object({ data: z.array(InvoiceItemSchema) }),
  prompt: `You are an expert data extraction AI for logistics. Your task is to extract structured line items from the provided content, which could be from a CSV, XML, plain text, an image, or a PDF file.

Analyze the content below and extract all product line items. For each item, you must find:
- **descricao**: The full description of the product.
- **quantidade**: The quantity of units for that item.
- **valorUnitarioUSD**: The price PER UNIT in USD. If only a total price is available, you must calculate the unit price.
- **ncm**: The NCM code.
- **pesoKg**: The weight PER UNIT in kilograms. If only a total weight is available, you must calculate the unit weight.

**CRITICAL RULES:**
1.  If the content provides a TOTAL price and a quantity, you MUST calculate the \`valorUnitarioUSD\` by dividing the total price by the quantity.
2.  If the content provides a TOTAL weight and a quantity, you MUST calculate the \`pesoKg\` (weight per unit) by dividing the total weight by the quantity.
3.  Do not invent information. If a required field is missing for an item (like description, quantity, value, or NCM), omit the entire item from the result.
4.  You MUST return the final result inside a JSON object with a single key "data" which contains the array of items.
5.  NCM codes must be extracted as a string of numbers only, without dots or slashes.

**Example Input (from an image of an invoice):**
[Image content showing a table with "Product A", "10 units", "$100 total", "NCM 1234.56.78", "50kg total"]

**Expected Example JSON Output:**
\`\`\`json
{
  "data": [
    {
      "descricao": "Product A",
      "quantidade": 10,
      "valorUnitarioUSD": 10.00,
      "ncm": "12345678",
      "pesoKg": 5.0
    }
  ]
}
\`\`\`
{{#if textContent}}
Now, analyze the following text content and return the JSON object:
{{{textContent}}}
{{/if}}
{{#if media}}
Now, analyze the following media content and return the JSON object:
{{media url=media.url}}
{{/if}}
`,
});

const extractInvoiceItemsFlow = defineFlow(
  {
    name: 'extractInvoiceItemsFlow',
    inputSchema: ExtractInvoiceItemsInputSchema,
    outputSchema: ExtractInvoiceItemsOutputSchema,
  },
  async (input) => {
    try {
        let promptInput: { textContent?: string; media?: { url: string } };

        const lowerFileName = input.fileName.toLowerCase();

        if (lowerFileName.endsWith('.xml')) {
            promptInput = extractFromXml(input.fileDataUri);
        } else if (lowerFileName.endsWith('.xlsx') || lowerFileName.endsWith('.xls') || lowerFileName.endsWith('.csv')) {
            const base64 = input.fileDataUri.split(',')[1];
            if (!base64) throw new Error('Invalid Data URI format for spreadsheet.');
            const buffer = Buffer.from(base64, 'base64');
            const textContent = await extractTextFromXlsx(buffer);
            promptInput = { textContent };
        } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg') || lowerFileName.endsWith('.png') || lowerFileName.endsWith('.pdf')) {
            promptInput = extractFromMedia(input.fileDataUri);
        } else {
            throw new Error('Unsupported file type. Please use .xlsx, .xls, .csv, .xml, .jpg, .png, or .pdf');
        }

        if (!promptInput.textContent?.trim() && !promptInput.media) {
            throw new Error('The file appears to be empty or could not be read.');
        }

        const llmResponse = await generate({
          model: 'gemini-pro-vision',
          prompt: {
            ...extractInvoiceItemsPrompt,
            input: promptInput,
          },
        });
        
        const output = llmResponse.output();

        if (!output || !output.data || output.data.length === 0) {
            throw new Error("A IA não conseguiu extrair nenhum item válido do arquivo. Verifique o conteúdo, o formato e se as colunas necessárias (descrição, quantidade, valor, ncm) estão presentes.");
        }
        
        return { success: true, data: output.data };

    } catch (error: any) {
        console.error('Error in extractInvoiceItems flow:', error);
        return { success: false, data: [], error: error.message };
    }
  }
);

export async function extractInvoiceItems(input: ExtractInvoiceItemsInput): Promise<ExtractInvoiceItemsOutput> {
  return extractInvoiceItemsFlow(input);
}
