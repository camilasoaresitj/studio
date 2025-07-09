
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a quote email and WhatsApp message.
 *
 * sendQuote - A function that generates quote content for different channels.
 * SendQuoteInput - The input type for the function.
 * SendQuoteOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RateDetailsSchema = z.object({
    origin: z.string().describe("The origin of the shipment."),
    destination: z.string().describe("The destination of the shipment."),
    carrier: z.string().describe("The carrier for the shipment."),
    transitTime: z.string().describe("The estimated transit time."),
    finalPrice: z.string().describe("The final price of the quote, including currency."),
});

const SendQuoteInputSchema = z.object({
  customerName: z.string().describe('The name of the customer receiving the quote.'),
  quoteId: z.string().describe('The quote identification number, like COT-00125.'),
  rateDetails: RateDetailsSchema.describe('The details of the selected freight rate.'),
  approvalLink: z.string().url().describe('The URL the customer will use to approve the quote.'),
  rejectionLink: z.string().url().describe('The URL the customer will use to reject the quote.'),
  isClientAgent: z.boolean().optional().describe('Set to true if the customer is also a freight agent.'),
});
export type SendQuoteInput = z.infer<typeof SendQuoteInputSchema>;

const SendQuoteOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the quote email."),
  emailBody: z.string().describe("The HTML content for the body of the quote email. It MUST include the approval and rejection links as styled buttons."),
  whatsappMessage: z.string().describe("A concise and friendly WhatsApp message with the quote summary and the approval link. The message should NOT be URL-encoded yet."),
});
export type SendQuoteOutput = z.infer<typeof SendQuoteOutputSchema>;

export async function sendQuote(input: SendQuoteInput): Promise<SendQuoteOutput> {
  return sendQuoteFlow(input);
}

const sendQuotePrompt = ai.definePrompt({
  name: 'sendQuotePrompt',
  input: {schema: SendQuoteInputSchema},
  output: {schema: SendQuoteOutputSchema},
  prompt: `You are an expert logistics assistant. Your task is to create a professional and friendly quote communication for a customer. The language of the communication must be based on whether the client is an agent or not.

**Language Rules:**
- If \`isClientAgent\` is true, the entire communication (subject, body, etc.) **MUST be in English**.
- Otherwise, the entire communication **MUST be in Portuguese**.

Generate the following based on the input data and language rule:
1.  **Email Subject**: A clear and professional subject line.
    - Portuguese Example: "Sua Cotação de Frete ({{{quoteId}}}) | CargaInteligente"
    - English Example: "Freight Quotation ({{{quoteId}}}) | CargaInteligente"
2.  **Email Body (HTML)**: A well-formatted HTML email.
    - Start with a friendly greeting to the customer.
    - Clearly present the quote details in a structured way (e.g., using a list or a simple table).
    - **Quote Details to include:**
        - {{#if isClientAgent}}Origin{{else}}Origem{{/if}}: {{{rateDetails.origin}}}
        - {{#if isClientAgent}}Destination{{else}}Destino{{/if}}: {{{rateDetails.destination}}}
        - {{#if isClientAgent}}Carrier{{else}}Cia{{/if}}: {{{rateDetails.carrier}}}
        - Transit Time: {{{rateDetails.transitTime}}}
        - {{#if isClientAgent}}Final Price{{else}}Preço Final{{/if}}: {{{rateDetails.finalPrice}}}
    - Include two prominent, nicely styled HTML buttons (<a href="..." style="...">...</a>): one to "{{#if isClientAgent}}Approve Quote{{else}}Aprovar Cotação{{/if}}" (green background) using the approvalLink, and one to "{{#if isClientAgent}}Reject Quote{{else}}Rejeitar Cotação{{/if}}" (red background) using the rejectionLink.
    - End with a professional closing (e.g., "Atenciosamente, Equipe CargaInteligente" or "Best regards, CargaInteligente Team").
3.  **WhatsApp Message**: A concise and friendly message summarizing the quote in the correct language.
    - Portuguese Example: "Olá {{{customerName}}}! Segue sua cotação de frete ({{{quoteId}}}): De {{{rateDetails.origin}}} para {{{rateDetails.destination}}} por {{{rateDetails.finalPrice}}}. Para aprovar, acesse: {{{approvalLink}}}"
    - English Example: "Hello {{{customerName}}}! Here is your freight quote ({{{quoteId}}}): From {{{rateDetails.origin}}} to {{{rateDetails.destination}}} for {{{rateDetails.finalPrice}}}. To approve, please visit: {{{approvalLink}}}"
    - The message should be plain text, not URL-encoded.

**Customer and Rate Information:**
- Customer Name: {{{customerName}}}
- Quote ID: {{{quoteId}}}
- Origin: {{{rateDetails.origin}}}
- Destination: {{{rateDetails.destination}}}
- Carrier: {{{rateDetails.carrier}}}
- Transit Time: {{{rateDetails.transitTime}}}
- Final Price: {{{rateDetails.finalPrice}}}
- Approval Link: {{{approvalLink}}}
- Rejection Link: {{{rejectionLink}}}
- Is Client an Agent: {{{isClientAgent}}}
`,
});

const sendQuoteFlow = ai.defineFlow(
  {
    name: 'sendQuoteFlow',
    inputSchema: SendQuoteInputSchema,
    outputSchema: SendQuoteOutputSchema,
  },
  async input => {
    // In a real application, you would integrate with an email service here.
    // We will just log the action to the console to simulate it.
    console.log(`Simulating generating quote for ${input.customerName}`);
    
    const {output} = await sendQuotePrompt(input);

    console.log('Generated Email Subject:', output?.emailSubject);
    console.log('Generated WhatsApp Message:', output?.whatsappMessage);

    // The flow returns the content to be used by the frontend.
    return output!;
  }
);
