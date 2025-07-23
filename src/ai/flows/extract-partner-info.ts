
'use server';
/**
 * @fileOverview Extracts structured partner data from unstructured text using AI.
 *
 * - extractPartnerInfo - A function that parses text and returns structured partner information.
 * - ExtractPartnerInfoInput - The input type for the function.
 * - ExtractPartnerInfoOutput - The return type for the function.
 */

import { initializeAI } from '@/ai/genkit';
import { z } from 'zod';

const ai = initializeAI();

const departmentEnum = z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro']);

const ContactSchema = z.object({
  name: z.string().describe('The full name of the contact person.'),
  email: z.string().describe('The email address of the contact.'),
  phone: z.string().describe('The phone number of the contact.'),
  departments: z.array(departmentEnum).describe('A list of departments for the contact. Infer if possible, otherwise use "Outro".'),
});

const AddressSchema = z.object({
    street: z.string().describe('The street name and number.'),
    number: z.string().describe('The street number. Extract from street if possible.'),
    complement: z.string().describe('The complement of the address (e.g., Suite, Floor).'),
    district: z.string().describe('The district or neighborhood.'),
    city: z.string().describe('The city name.'),
    state: z.string().describe('The state, province, or region.'),
    zip: z.string().describe('The postal or ZIP code.'),
    country: z.string().describe('The country name.'),
});

const ExtractPartnerInfoOutputSchema = z.object({
  name: z.string().describe('The full company name (Razão Social).'),
  cnpj: z.string().optional().describe('The CNPJ or tax ID, if available.'),
  address: AddressSchema.describe('The full address of the company.'),
  contacts: z.array(ContactSchema).describe('A list of contacts from the company.'),
});
type ExtractPartnerInfoOutput = z.infer<typeof ExtractPartnerInfoOutputSchema>;

const ExtractPartnerInfoInputSchema = z.object({
  textInput: z.string().describe('Unstructured text containing company and contact information, like an email signature or a text block.'),
});
type ExtractPartnerInfoInput = z.infer<typeof ExtractPartnerInfoInputSchema>;


export async function extractPartnerInfo(input: ExtractPartnerInfoInput): Promise<ExtractPartnerInfoOutput> {
  return extractPartnerInfoFlow(input);
}

const extractPartnerInfoPrompt = ai.definePrompt({
  name: 'extractPartnerInfoPrompt',
  input: { schema: ExtractPartnerInfoInputSchema },
  output: { schema: ExtractPartnerInfoOutputSchema },
  prompt: `You are an expert data entry assistant for a logistics company. Your task is to extract company and contact information from the unstructured text provided below and return a valid JSON object.

**Extraction Rules:**
- Carefully parse the text to identify the company name, address details, and one or more contacts.
- For each contact, you must find a name, email, and phone number.
- A contact can be associated with multiple departments. Extract all relevant departments into the 'departments' array. Valid departments are: 'Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'.
- For the address, extract all available components (street, city, country, etc.).
- If a piece of information is not available in the text, return an empty string "" for that field, or an empty array [] for lists. Do not use "N/A" or "unknown".
- Be precise. Extract the information exactly as it is written, but place it in the correct field.

**Example Input Text:**
"Please use our shipper:
Global Exports LLC
Attn: John Smith (Export & Operations Dept)
123 Global Way, Suite 500, Miami, FL, 33132, USA
Phone: +1 (305) 555-1234, Email: john.s@globalexports.com"

**Expected Example JSON Output:**
\`\`\`json
{
  "name": "Global Exports LLC",
  "cnpj": "",
  "address": {
    "street": "123 Global Way",
    "number": "123",
    "complement": "Suite 500",
    "district": "",
    "city": "Miami",
    "state": "FL",
    "zip": "33132",
    "country": "USA"
  },
  "contacts": [
    {
      "name": "John Smith",
      "email": "john.s@globalexports.com",
      "phone": "+1 (305) 555-1234",
      "departments": ["Exportação", "Operacional"]
    }
  ]
}
\`\`\`

Now, analyze the following text and extract the partner information:
{{{textInput}}}
`,
});

const extractPartnerInfoFlow = ai.defineFlow(
  {
    name: 'extractPartnerInfoFlow',
    inputSchema: ExtractPartnerInfoInputSchema,
    outputSchema: ExtractPartnerInfoOutputSchema,
  },
  async (input) => {
    const { output } = await extractPartnerInfoPrompt(input);
    if (!output) {
      throw new Error("A IA não conseguiu extrair nenhuma informação do texto.");
    }
    return output;
  }
);
