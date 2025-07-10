
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
import { SendShippingInstructionsInputSchema, SendShippingInstructionsOutputSchema, SendShippingInstructionsInput, SendShippingInstructionsOutput } from '@/lib/schemas';


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
