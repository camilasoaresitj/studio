
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate an email to send a case to a lawyer.
 *
 * sendToLegal - A function that generates the email content.
 * SendToLegalInput - The input type for the function.
 * SendToLegalOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SendToLegalInputSchema = z.object({
  lawyerName: z.string().describe('The name of the lawyer receiving the case.'),
  customerName: z.string().describe('The name of the debtor customer.'),
  invoiceId: z.string().describe('The invoice identification number (e.g., "INV-2024-068").'),
  processId: z.string().describe('The internal process/shipment ID.'),
  invoiceAmount: z.string().describe('The total amount due, including currency (e.g., "BRL 12.345,67").'),
  comments: z.string().describe('The comments and instructions from the finance department.'),
});
export type SendToLegalInput = z.infer<typeof SendToLegalInputSchema>;

const SendToLegalOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the email to the lawyer."),
  emailBody: z.string().describe("The HTML content for the body of the email. It must mention the attachments (Fatura e HBL)."),
});
export type SendToLegalOutput = z.infer<typeof SendToLegalOutputSchema>;

export async function sendToLegal(input: SendToLegalInput): Promise<SendToLegalOutput> {
  return sendToLegalFlow(input);
}

const sendToLegalPrompt = ai.definePrompt({
  name: 'sendToLegalPrompt',
  input: { schema: SendToLegalInputSchema },
  output: { schema: SendToLegalOutputSchema },
  prompt: `You are an expert financial assistant. Your task is to generate a professional and clear email in Portuguese to send a legal collection case to a lawyer. The email should be formal and include all necessary details for the lawyer to start the process.

**Instructions:**
1.  **Generate Email Subject**: Create a clear and standardized subject line. Example: "Ação de Cobrança: Cliente {{{customerName}}} / Fatura {{{invoiceId}}}"
2.  **Generate Email Body (HTML)**: Create a well-formatted HTML email.
    - Start with a formal greeting to the lawyer (e.g., "Prezado(a) Dr(a). {{{lawyerName}}},").
    - State that you are forwarding a case for legal collection.
    - List the case details in a structured way:
        - **Cliente Devedor:** {{{customerName}}}
        - **Nº da Fatura:** {{{invoiceId}}}
        - **Nº do Processo:** {{{processId}}}
        - **Valor Devido:** {{{invoiceAmount}}}
    - Include the comments/instructions from the finance department under a clear heading like "Instruções do Financeiro:".
    - **Crucially**, state that the relevant documents (Fatura e cópia do HBL) are attached to the email.
    - End with a professional closing, asking the lawyer to confirm receipt and provide the next steps. (e.g., "Agradecemos a atenção e solicitamos a confirmação de recebimento, bem como os próximos passos a serem tomados. Atenciosamente,").

**Input Data:**
- Lawyer Name: {{{lawyerName}}}
- Customer Name: {{{customerName}}}
- Invoice ID: {{{invoiceId}}}
- Process ID: {{{processId}}}
- Invoice Amount: {{{invoiceAmount}}}
- Comments: {{{comments}}}
`,
});

const sendToLegalFlow = ai.defineFlow(
  {
    name: 'sendToLegalFlow',
    inputSchema: SendToLegalInputSchema,
    outputSchema: SendToLegalOutputSchema,
  },
  async (input) => {
    const llmResponse = await ai.generate({
      prompt: sendToLegalPrompt,
      input,
      model: 'gemini-pro',
    });
    
    const output = llmResponse.output();
    if (!output) {
      throw new Error("AI failed to generate legal email.");
    }
    return output;
  }
);
