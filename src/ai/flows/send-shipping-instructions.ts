
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate shipping instructions for a freight agent.
 *
 * sendShippingInstructions - Generates the content for the shipping instruction email.
 * SendShippingInstructionsInput - The input type for the function.
 * SendShippingInstructionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Partner } from '@/components/partners-registry';

const PartnerSchemaForPrompt = z.object({
    name: z.string(),
    address: z.object({
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        district: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
    }),
    contacts: z.array(z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
    })),
});

export const SendShippingInstructionsInputSchema = z.object({
  agentName: z.string().describe("The recipient agent's name."),
  agentEmail: z.string().email().describe("The recipient agent's email address."),
  shipper: PartnerSchemaForPrompt.describe("The shipper's full details."),
  consigneeName: z.string().describe("The consignee's company name."),
  notifyName: z.string().describe("The notify party's name."),
  freightCost: z.string().describe("The agreed freight cost (e.g., 'USD 2500.00')."),
  freightSale: z.string().describe("The freight sale value (e.g., 'USD 2800.00')."),
  agentProfit: z.string().describe("The agent's profit share (e.g., 'USD 50.00')."),
  thcValue: z.string().describe("The THC value to be declared on the BL (e.g., 'BRL 1350.00')."),
  commodity: z.string().describe("Description of the goods."),
  ncm: z.string().describe("The NCM/HS Code for the goods."),
  updateLink: z.string().url().describe("The unique link for the agent to update shipment details."),
});
export type SendShippingInstructionsInput = z.infer<typeof SendShippingInstructionsInputSchema>;

export const SendShippingInstructionsOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the email."),
  emailBody: z.string().describe("The full HTML content for the email body."),
});
export type SendShippingInstructionsOutput = z.infer<typeof SendShippingInstructionsOutputSchema>;


export async function sendShippingInstructions(input: SendShippingInstructionsInput): Promise<SendShippingInstructionsOutput> {
  return sendShippingInstructionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'sendShippingInstructionsPrompt',
  input: { schema: SendShippingInstructionsInputSchema },
  output: { schema: SendShippingInstructionsOutputSchema },
  prompt: `You are a logistics operations expert. Your task is to generate a professional and detailed "Shipping Instructions" email in English to a freight agent. The email must be in HTML format and resemble a draft Bill of Lading.

**Crucial Formatting Rules:**
- **HTML ONLY:** The entire body must be a single, well-structured HTML string. Use tables for layout.
- **Styling:** Use inline CSS. The primary color is '#F97316'. The main font is 'Arial, sans-serif'.
- **Clarity:** The email must be extremely clear, leaving no room for doubt about how the BL should be issued.

**Email Structure:**

1.  **Subject:** "SHIPPING INSTRUCTIONS - CargaInteligente // Shipper: {{shipper.name}} // Cnee: {{consigneeName}}"
2.  **Body:**
    -   Start with a greeting to the agent ("Dear {{agentName}},").
    -   State the purpose: "Please find below our shipping instructions. Kindly proceed with the booking and send us the confirmation and draft BL for approval."
    -   Create a main table with a title "DRAFT BILL OF LADING INSTRUCTIONS".
    -   **Shipper Section:**
        -   List the shipper's full name, address, and contact details.
    -   **Consignee Section:**
        -   State the consignee's name.
    -   **Notify Party Section:**
        -   State "SAME AS CONSIGNEE".
    -   **Cargo Details Section:**
        -   Description: "{{commodity}}"
        -   NCM/HS Code: "{{ncm}}"
    -   **Freight & Charges Section:**
        -   Freight: "AS AGREED"
        -   THC: "{{thcValue}}"
    -   **Agent Portal Link:**
        -   Include a prominent, styled button (background: #F97316; color: white) with the text "Update Booking Details" that links to "{{updateLink}}".
    -   **Financial Summary (for agent's eyes only):**
        -   Create a separate, clearly marked section at the bottom: "FINANCIAL AGREEMENT (For Agent Use Only)".
        -   List: Freight Cost, Freight Sale, and Agent Profit.
    -   End with a professional closing.

**Input Data:**
-   Agent: {{agentName}}
-   Shipper Name: {{shipper.name}}
-   Shipper Address: {{shipper.address.street}}, {{shipper.address.number}}, {{shipper.address.city}}, {{shipper.address.country}}
-   Shipper Contact: {{shipper.contacts.0.name}} / {{shipper.contacts.0.email}} / {{shipper.contacts.0.phone}}
-   Consignee: {{consigneeName}}
-   Notify: {{notifyName}}
-   Freight Cost: {{freightCost}}
-   Freight Sale: {{freightSale}}
-   Agent Profit: {{agentProfit}}
-   THC to declare: {{thcValue}}
-   Commodity: {{commodity}}
-   NCM: {{ncm}}
-   Update Link: {{updateLink}}
`,
});

const sendShippingInstructionsFlow = ai.defineFlow(
  {
    name: 'sendShippingInstructionsFlow',
    inputSchema: SendShippingInstructionsInputSchema,
    outputSchema: SendShippingInstructionsOutputSchema,
  },
  async (input) => {
    // In a real application, you would integrate with an email service here.
    // We will just log the action to the console to simulate it.
    console.log(`SIMULATING sending Shipping Instructions to ${input.agentEmail}`);

    const { output } = await prompt(input);

    console.log('--- GENERATED SHIPPING INSTRUCTIONS (SIMULATED) ---');
    console.log('SUBJECT:', output?.emailSubject);
    console.log('BODY (HTML):', output?.emailBody);
    console.log('--- END SIMULATION ---');

    // The flow returns the content to be used by the frontend or a backend email service.
    return output!;
  }
);
