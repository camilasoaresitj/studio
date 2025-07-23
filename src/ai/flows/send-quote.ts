
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a quote email and WhatsApp message.
 *
 * sendQuote - A function that generates quote content for different channels.
 * SendQuoteInput - The input type for the function.
 * SendQuoteOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const RateDetailsSchema = z.object({
    origin: z.string().describe("The origin of the shipment."),
    destination: z.string().describe("The destination of the shipment."),
    carrier: z.string().describe("The carrier for the shipment."),
    transitTime: z.string().describe("The estimated transit time."),
    finalPrice: z.string().describe("The final price of the quote, including currency."),
});

const SendQuoteInputSchema = z.object({
  customerName: z.string().describe('The name of the customer receiving the quote.'),
  quoteId: z.string().describe('The quote or invoice identification number, like COT-00125 or INV-2024-123.'),
  rateDetails: RateDetailsSchema.describe('The details of the selected freight rate or invoice.'),
  approvalLink: z.string().url().describe('The URL the customer will use to approve the quote or pay the invoice.'),
  rejectionLink: z.string().url().describe('The URL the customer will use to reject the quote or dispute the invoice.'),
  isClientAgent: z.boolean().optional().describe('Set to true if the customer is also a freight agent.'),
  isInvoice: z.boolean().optional().describe('Set to true if this is an invoice notification instead of a quote.'),
});
export type SendQuoteInput = z.infer<typeof SendQuoteInputSchema>;

const SendQuoteOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the email."),
  emailBody: z.string().describe("The HTML content for the body of the email. It MUST include the primary action link as a styled button."),
  whatsappMessage: z.string().describe("A concise and friendly WhatsApp message with the summary and the primary action link. The message should NOT be URL-encoded yet."),
});
export type SendQuoteOutput = z.infer<typeof SendQuoteOutputSchema>;

export async function sendQuote(input: SendQuoteInput): Promise<SendQuoteOutput> {
  return sendQuoteFlow(input);
}

const sendQuotePrompt = ai.definePrompt({
  name: 'sendQuotePrompt',
  input: { schema: SendQuoteInputSchema },
  output: { schema: SendQuoteOutputSchema },
  prompt: `You are an expert logistics assistant. Your task is to create a professional and friendly communication for a customer, which could be either a freight quote or an invoice notification. The language of the communication must be based on whether the client is an agent or not.

**Language Rules:**
- If \`isClientAgent\` is true, the entire communication (subject, body, etc.) **MUST be in English**.
- Otherwise, the entire communication **MUST be in Portuguese**.

Generate the following based on the input data, language rule, and whether it's an invoice or a quote:

1.  **Email Subject**:
    - If Invoice: "Fatura de Serviços ({{{quoteId}}}) | CargaInteligente" (PT) or "Service Invoice ({{{quoteId}}}) | CargaInteligente" (EN).
    - If Quote: "Sua Cotação de Frete ({{{quoteId}}}) | CargaInteligente" (PT) or "Freight Quotation ({{{quoteId}}}) | CargaInteligente" (EN).

2.  **Email Body (HTML)**: A well-formatted HTML email.
    - Start with a friendly greeting.
    - **If Invoice**: State that you are sending the invoice for services provided. Display the total amount.
    - **If Quote**: Present the quote details in a structured way (Origin, Destination, Carrier, Transit Time, Final Price).
    - **Crucially**, include a prominent, nicely styled HTML button (<a href="..." style="...">...</a>) for the user to view and approve the quote online.
    - The button text should be: "{{#if isClientAgent}}View and Approve Quote{{else}}Ver e Aprovar Cotação{{/if}}" using \`approvalLink\`.
    - End with a professional closing.

3.  **WhatsApp Message**: A concise and friendly message, ready to be sent via Twilio.
    - **If Invoice**: "Olá {{{customerName}}}! Sua fatura ({{{quoteId}}}) no valor de {{{rateDetails.finalPrice}}} está disponível. Para visualizar e pagar, acesse: {{{approvalLink}}}" (PT) or "Hello {{{customerName}}}! Your invoice ({{{quoteId}}}) for {{{rateDetails.finalPrice}}} is available. To view and pay, visit: {{{approvalLink}}}" (EN).
    - **If Quote**: "Olá {{{customerName}}}! Sua cotação de frete ({{{quoteId}}}) está pronta. De {{{rateDetails.origin}}} para {{{rateDetails.destination}}}. Para ver os detalhes e aprovar, acesse o link: {{{approvalLink}}}" (PT) or "Hello {{{customerName}}}! Your freight quote ({{{quoteId}}}) is ready. From {{{rateDetails.origin}}} to {{{rateDetails.destination}}}. To see the details and approve, please visit the link: {{{approvalLink}}}" (EN).

**Input Data:**
- Customer Name: {{{customerName}}}
- ID: {{{quoteId}}}
- Details: {{{rateDetails}}}
- Approval/Payment Link: {{{approvalLink}}}
- Rejection/Dispute Link: {{{rejectionLink}}}
- Is Client an Agent: {{{isClientAgent}}}
- Is Invoice: {{{isInvoice}}}
`,
});

const sendQuoteFlow = ai.defineFlow(
  {
    name: 'sendQuoteFlow',
    inputSchema: SendQuoteInputSchema,
    outputSchema: SendQuoteOutputSchema,
  },
  async input => {
    console.log(`Simulating generating communication for ${input.customerName}`);
    
    const response = await ai.generate({
      prompt: sendQuotePrompt,
      input,
    });
    
    const output = response.output;

    if (!output) {
      throw new Error("AI failed to generate communication content.");
    }
    
    console.log('Generated Email Subject:', output.emailSubject);
    console.log('Generated WhatsApp Message:', output.whatsappMessage);

    return output;
  }
);
