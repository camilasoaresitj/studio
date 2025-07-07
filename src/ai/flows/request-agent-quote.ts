'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate an email to request a quote from a freight agent.
 *
 * requestAgentQuote - A function that generates quote request content.
 * RequestAgentQuoteInput - The input type for the function.
 * RequestAgentQuoteOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { freightQuoteFormSchema, FreightQuoteFormData } from '@/lib/schemas';

export type RequestAgentQuoteInput = FreightQuoteFormData;

const RequestAgentQuoteOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the quote request email in English."),
  emailBody: z.string().describe("The HTML content for the body of the email. It must be in English and clearly list all shipment details."),
});
export type RequestAgentQuoteOutput = z.infer<typeof RequestAgentQuoteOutputSchema>;

export async function requestAgentQuote(input: RequestAgentQuoteInput): Promise<RequestAgentQuoteOutput> {
  return requestAgentQuoteFlow(input);
}

const PromptInputSchema = freightQuoteFormSchema.extend({
    shipmentDetails: z.string().describe('A pre-formatted string containing the specific details of the cargo.'),
    departureDate: z.string().optional().describe('The formatted departure date.'),
});

const requestAgentQuotePrompt = ai.definePrompt({
  name: 'requestAgentQuotePrompt',
  input: {schema: PromptInputSchema},
  output: {schema: RequestAgentQuoteOutputSchema},
  prompt: `You are a freight forwarding operations assistant. Your task is to write a clear and professional email in English to a freight agent to request a quote for a shipment.

Generate the following:
1.  **Email Subject**: A clear and concise subject line. Example: "Rate Request: {{{origin}}} to {{{destination}}} ({{modal}})"
2.  **Email Body (HTML)**: A well-formatted HTML email.
    - Start with a professional greeting (e.g., "Dear Agent,").
    - State that you are requesting a quote for the shipment detailed below.
    - List the core shipment information.
    - Include the pre-formatted shipment details in a <pre> tag to preserve formatting.
    - End by asking for their best all-in rates and thanking them for their prompt attention.
    - Close professionally (e.g., "Best regards,").

**Core Information:**
- **Origin:** {{{origin}}}
- **Destination:** {{{destination}}}
- **Incoterm:** {{{incoterm}}}
{{#if departureDate}}
- **Cargo Ready Date:** {{{departureDate}}}
{{/if}}

**Shipment Details:**
<pre>{{{shipmentDetails}}}</pre>
`,
});

const requestAgentQuoteFlow = ai.defineFlow(
  {
    name: 'requestAgentQuoteFlow',
    inputSchema: freightQuoteFormSchema,
    outputSchema: RequestAgentQuoteOutputSchema,
  },
  async (input) => {
    const detailsParts = [];
    if (input.modal === 'ocean') {
        detailsParts.push(`Mode of Transport: Ocean`);
        detailsParts.push(`Shipment Type: ${input.oceanShipmentType}`);
        if (input.oceanShipmentType === 'FCL') {
            detailsParts.push('Containers:');
            input.oceanShipment.containers.forEach(c => {
                detailsParts.push(`- ${c.quantity} x ${c.type}`);
            });
        } else { // LCL
            detailsParts.push('LCL Details:');
            detailsParts.push(`- Volume: ${input.lclDetails.cbm} CBM`);
            detailsParts.push(`- Weight: ${input.lclDetails.weight} KG`);
        }
    } else { // air
        detailsParts.push(`Mode of Transport: Air`);
        detailsParts.push('Pieces:');
        input.airShipment.pieces.forEach(p => {
            detailsParts.push(`- ${p.quantity} piece(s), ${p.length}x${p.width}x${p.height} cm, ${p.weight} kg each.`);
        });
        detailsParts.push(`Is Stackable: ${input.airShipment.isStackable ? 'Yes' : 'No'}`);
    }
    const shipmentDetailsString = detailsParts.join('\n');

    const promptInput = {
        ...input,
        departureDate: input.departureDate ? input.departureDate.toISOString().split('T')[0] : undefined,
        shipmentDetails: shipmentDetailsString
    };

    const {output} = await requestAgentQuotePrompt(promptInput);
    return output!;
  }
);
