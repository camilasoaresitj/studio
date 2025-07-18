
'use server';
/**
 * @fileOverview A Genkit flow to extract structured invoice items from a file (XLSX, CSV, XML).
 *
 * extractInvoiceItems - Parses a file and returns a list of items.
 * ExtractInvoiceItemsInput - The input type for the function.
 * InvoiceItem - The schema for a single extracted item.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as XLSX from 'xlsx';

const ExtractInvoiceItemsInputSchema = z.object({
  fileName: z.string().describe("The name of the uploaded file, including its extension."),
  fileDataUri: z.string().describe(
    "The content of the file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type ExtractInvoiceItemsInput = z.infer<typeof ExtractInvoiceItemsInputSchema>;

export const InvoiceItemSchema = z.object({
  descricao: z.string().describe('The full description of the product/item.'),
  quantidade: z.coerce.number().describe('The quantity of the item.'),
  valorUnitarioUSD: z.coerce.number().describe('The unit price of the item in USD.'),
  ncm: z.string().describe('The NCM (Mercosur Common Nomenclature) code for the item.'),
  pesoKg: z.coerce.number().describe('The gross weight of a single unit of the item in kilograms (Kg).'),
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

const ExtractInvoiceItemsOutputSchema = z.array(InvoiceItemSchema);
export type ExtractInvoiceItemsOutput = z.infer<typeof ExtractInvoiceItemsOutputSchema>;

// Helper function to convert data URI to buffer
const dataUriToBuffer = (dataUri: string) => {
  const base64 = dataUri.split(',')[1];
  if (!base64) {
    throw new Error('Invalid Data URI format.');
  }
  return Buffer.from(base64, 'base64');
};

const extractFromSpreadsheet = (buffer: Buffer): string => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to CSV for a simple text representation for the AI
    return XLSX.utils.sheet_to_csv(worksheet);
};

const extractFromXml = (buffer: Buffer): string => {
    // Simply return the XML content as a string for the AI to parse.
    return buffer.toString('utf-8');
};

const extractInvoiceItemsPrompt = ai.definePrompt({
  name: 'extractInvoiceItemsPrompt',
  input: { schema: z.object({ textContent: z.string() }) },
  output: { schema: ExtractInvoiceItemsOutputSchema },
  prompt: `You are an expert data extraction AI for logistics. Your task is to extract structured line items from the provided text, which could be from a CSV, XML, or plain text invoice.

Analyze the text below and extract all product line items. For each item, you must find:
- **descricao**: The full description of the product.
- **quantidade**: The quantity of units for that item.
- **valorUnitarioUSD**: The price PER UNIT in USD.
- **ncm**: The NCM code.
- **pesoKg**: The weight PER UNIT in kilograms.

**CRITICAL RULES:**
1.  If the text provides a TOTAL price and a quantity, you MUST calculate the \`valorUnitarioUSD\` by dividing the total price by the quantity.
2.  If the text provides a TOTAL weight and a quantity, you MUST calculate the \`pesoKg\` (weight per unit) by dividing the total weight by the quantity.
3.  Do not invent information. If a field is missing for an item, omit the entire item from the result.

**Example Input (from a CSV):**
"Description,Quantity,Total Price USD,NCM,Total Weight KG
Product A,10,100.00,12345678,50.0
Product B,5,250.00,87654321,100.0"

**Expected Example JSON Output:**
\`\`\`json
[
  {
    "descricao": "Product A",
    "quantidade": 10,
    "valorUnitarioUSD": 10.00,
    "ncm": "12345678",
    "pesoKg": 5.0
  },
  {
    "descricao": "Product B",
    "quantidade": 5,
    "valorUnitarioUSD": 50.00,
    "ncm": "87654321",
    "pesoKg": 20.0
  }
]
\`\`\`

Now, analyze the following text content:
{{{textContent}}}
`,
});

export async function extractInvoiceItems(input: ExtractInvoiceItemsInput): Promise<{ success: boolean; data: ExtractInvoiceItemsOutput; error?: string }> {
  try {
    const buffer = dataUriToBuffer(input.fileDataUri);
    let textContent = '';

    if (input.fileName.endsWith('.xml')) {
        textContent = extractFromXml(buffer);
    } else if (input.fileName.endsWith('.xlsx') || input.fileName.endsWith('.xls') || input.fileName.endsWith('.csv')) {
        textContent = extractFromSpreadsheet(buffer);
    } else {
        throw new Error('Unsupported file type. Please use .xlsx, .xls, .csv, or .xml');
    }

    if (!textContent.trim()) {
        throw new Error('The file appears to be empty or could not be read.');
    }

    const { output } = await extractInvoiceItemsPrompt({ textContent });
    
    if (!output || output.length === 0) {
      throw new Error("A IA não conseguiu extrair nenhum item válido do arquivo. Verifique o conteúdo e o formato.");
    }
    
    return { success: true, data: output };

  } catch (error: any) {
    console.error('Error in extractInvoiceItems flow:', error);
    return { success: false, data: [], error: error.message };
  }
}
