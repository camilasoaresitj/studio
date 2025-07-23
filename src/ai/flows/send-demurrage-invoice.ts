
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate an email for a demurrage invoice.
 *
 * sendDemurrageInvoice - A function that generates the email content.
 * SendDemurrageInvoiceInput - The input type for the function.
 * SendDemurrageInvoiceOutput - The return type for the function.
 */

import {initializeAI} from '@/ai/genkit';
import {z} from 'zod';

const ai = initializeAI();

const SendDemurrageInvoiceInputSchema = z.object({
  customerName: z.string().describe('The name of the customer receiving the invoice.'),
  invoiceId: z.string().describe('The demurrage invoice identification number (e.g., "DEM-MSCU1234567").'),
  processId: z.string().describe('The internal process/shipment ID.'),
  containerNumber: z.string().describe('The container number related to the charge.'),
  dueDate: z.string().describe('The due date for the payment (e.g., "30/08/2024").'),
  totalAmountUSD: z.string().describe('The total amount due in USD (e.g., "USD 1,500.00").'),
  exchangeRate: z.string().describe('The exchange rate that will be used for conversion to BRL (e.g., "5.8644").'),
});
type SendDemurrageInvoiceInput = z.infer<typeof SendDemurrageInvoiceInputSchema>;

const SendDemurrageInvoiceOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the demurrage invoice email."),
  emailBody: z.string().describe("The HTML content for the body of the email."),
});
type SendDemurrageInvoiceOutput = z.infer<typeof SendDemurrageInvoiceOutputSchema>;

export async function sendDemurrageInvoice(input: SendDemurrageInvoiceInput): Promise<SendDemurrageInvoiceOutput> {
  return sendDemurrageInvoiceFlow(input);
}

const sendDemurrageInvoicePrompt = ai.definePrompt({
  name: 'sendDemurrageInvoicePrompt',
  input: {schema: SendDemurrageInvoiceInputSchema},
  output: {schema: SendDemurrageInvoiceOutputSchema},
  prompt: `You are an expert financial assistant for a logistics company. Your task is to generate a professional and clear email in Portuguese to send a demurrage invoice to a client.

**Instructions:**
1.  **Generate Email Subject**: Create a clear subject line. Example: "Fatura de Demurrage: {{{invoiceId}}} | Processo: {{{processId}}}"
2.  **Generate Email Body (HTML)**: Create a well-formatted HTML email.
    - Start with a professional greeting to the customer.
    - Clearly state that you are sending the invoice for demurrage charges related to the specified container and process.
    - List the invoice details:
        - Nº da Fatura: {{{invoiceId}}}
        - Processo: {{{processId}}}
        - Contêiner: {{{containerNumber}}}
        - Valor Total: **{{{totalAmountUSD}}}**
        - Data de Vencimento: {{{dueDate}}}
    - **Crucially**, add a note explaining the payment conversion: "Por favor, note que o pagamento deve ser feito em Reais (BRL). A taxa de câmbio PTAX do dia do pagamento será utilizada, acrescida de 8% de margem. A taxa de referência hoje é de {{{exchangeRate}}}."
    - End with instructions on how to pay (e.g., "O boleto e a nota fiscal estão em anexo.") and a professional closing.

**Input Data:**
- Customer Name: {{{customerName}}}
- Invoice ID: {{{invoiceId}}}
- Process ID: {{{processId}}}
- Container Number: {{{containerNumber}}}
- Due Date: {{{dueDate}}}
- Total Amount (USD): {{{totalAmountUSD}}}
- Exchange Rate for reference: {{{exchangeRate}}}
`,
});

const sendDemurrageInvoiceFlow = ai.defineFlow(
  {
    name: 'sendDemurrageInvoiceFlow',
    inputSchema: SendDemurrageInvoiceInputSchema,
    outputSchema: SendDemurrageInvoiceOutputSchema,
  },
  async (input) => {
    const {output} = await sendDemurrageInvoicePrompt(input);
    return output!;
  }
);
