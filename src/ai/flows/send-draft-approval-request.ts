
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate an email asking the client to approve a BL draft.
 *
 * sendDraftApprovalRequest - Generates the email content.
 * SendDraftApprovalRequestInput - The input type for the function.
 * SendDraftApprovalRequestOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { defineFlow } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';

const SendDraftApprovalRequestInputSchema = z.object({
  customerName: z.string().describe("The client's name."),
  shipmentId: z.string().describe('The internal shipment ID/process number.'),
  deadline: z.string().describe("The deadline for corrections, formatted as 'dd/MM/yyyy HH:mm'."),
  hblPreviewLink: z.string().url().describe("The link for the client to view the HBL draft."),
});
export type SendDraftApprovalRequestInput = z.infer<typeof SendDraftApprovalRequestInputSchema>;

const SendDraftApprovalRequestOutputSchema = z.object({
  emailSubject: z.string().describe('The subject line for the approval request email.'),
  emailBody: z.string().describe('The HTML content for the body of the email.'),
});
export type SendDraftApprovalRequestOutput = z.infer<typeof SendDraftApprovalRequestOutputSchema>;

export async function sendDraftApprovalRequest(input: SendDraftApprovalRequestInput): Promise<SendDraftApprovalRequestOutput> {
  return sendDraftApprovalRequestFlow(input);
}

const sendDraftApprovalRequestPrompt = definePrompt({
  name: 'sendDraftApprovalRequestPrompt',
  inputSchema: SendDraftApprovalRequestInputSchema,
  outputSchema: SendDraftApprovalRequestOutputSchema,
  prompt: `You are a logistics operations expert. Your task is to generate a professional and clear email in Portuguese to a client, asking them to approve a draft Bill of Lading (HBL).

**Instructions:**
1.  **Generate Email Subject**: Create a clear subject line. Example: "Aprovação de Draft HBL - Processo: {{{shipmentId}}}"
2.  **Generate Email Body (HTML)**: Create a well-formatted HTML email.
    - Start with a professional greeting to the customer.
    - Inform the client that the HBL draft for their process is attached for approval.
    - **Crucially**, state the deadline for corrections and warn about the costs of late changes. Use this exact phrasing: "Por favor, verifique todos os dados com atenção. O prazo para solicitar alterações sem custo é até **{{{deadline}}}**. Após esta data, correções estarão sujeitas a taxas do armador."
    - Include a prominent, styled button for the client to view the draft online using the provided link.
    - End with a professional closing.

**Input Data:**
- Customer Name: {{{customerName}}}
- Shipment ID: {{{shipmentId}}}
- Deadline: {{{deadline}}}
- Preview Link: {{{hblPreviewLink}}}
`,
});

const sendDraftApprovalRequestFlow = defineFlow(
  {
    name: 'sendDraftApprovalRequestFlow',
    inputSchema: SendDraftApprovalRequestInputSchema,
    outputSchema: SendDraftApprovalRequestOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: sendDraftApprovalRequestPrompt,
      input,
      model: 'gemini-pro',
    });
    if (!output) {
      throw new Error("AI failed to generate draft approval request.");
    }
    return output;
  }
);
