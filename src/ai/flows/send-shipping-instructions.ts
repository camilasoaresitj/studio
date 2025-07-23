
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate shipping instructions for a freight agent.
 *
 * sendShippingInstructions - Generates the content for the shipping instruction email.
 * SendShippingInstructionsInput - The input type for the function.
 * SendShippingInstructionsOutput - The return type for the function.
 */

import { defineFlow, definePrompt, generate } from '@genkit-ai/core';
import { z } from 'zod';
import { SendShippingInstructionsInputSchema, SendShippingInstructionsOutputSchema } from '@/lib/schemas';
import type { SendShippingInstructionsInput, SendShippingInstructionsOutput } from '@/lib/schemas';


export async function sendShippingInstructions(input: SendShippingInstructionsInput): Promise<SendShippingInstructionsOutput> {
  return sendShippingInstructionsFlow(input);
}

const prompt = definePrompt({
  name: 'sendShippingInstructionsPrompt',
  inputSchema: SendShippingInstructionsInputSchema,
  outputSchema: SendShippingInstructionsOutputSchema,
  prompt: `You are a logistics operations expert. Your task is to generate a professional and detailed "Shipping Instructions" email in English to a freight agent. The email must be in HTML format and resemble a draft Bill of Lading.

**Crucial Formatting Rules:**
- **HTML ONLY:** The entire body must be a single, well-structured HTML string with inline CSS.
- **Styling:** Use 'Arial, sans-serif'. The primary color for headers and buttons is '#F97316'. Main text is '#333333'. Use tables for layout.
- **Clarity:** The email must be extremely clear, leaving no room for doubt about how the BL should be issued.

**Email Structure:**

1.  **Subject:** "SHIPPING INSTRUCTIONS - Process: {{shipmentId}} // Shipper: {{shipper.name}} // Cnee: {{consigneeName}} // Invoice: {{invoiceNumber}}"
2.  **Body (HTML Layout):**

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Shipping Instructions - {{shipper.name}}</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #333; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #ffffff;">
        <h1 style="color: #F97316; font-size: 24px;">Shipping Instructions</h1>
        <p>Dear {{agentName}},</p>
        <p>Please find below our shipping instructions. Kindly proceed with the booking and send us the confirmation and draft BL for approval.</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #ddd;">
            <thead style="background-color: #f9f9f9;">
                <tr>
                    <th colspan="2" style="padding: 12px; text-align: left; border-bottom: 1px solid #ddd; background-color: #F97316; color: white;">
                        DRAFT BILL OF LADING INSTRUCTIONS
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top; width: 50%;">
                        <strong style="color: #F97316;">Shipper</strong><br>
                        {{shipper.name}}<br>
                        {{shipper.address.street}}, {{shipper.address.number}}<br>
                        {{shipper.address.city}}, {{shipper.address.country}}<br>
                        <br>
                        <strong>Contact:</strong><br>
                        {{shipper.contacts.0.name}} / {{shipper.contacts.0.email}} / {{shipper.contacts.0.phone}}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; vertical-align: top; width: 50%;">
                        <strong style="color: #F97316;">Consignee</strong><br>
                        {{consigneeName}}<br>
                        <br>
                        <strong style="color: #F97316;">Notify Party</strong><br>
                        {{notifyName}}
                    </td>
                </tr>
                 <tr>
                    <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">
                        <strong style="color: #F97316;">Cargo & Equipment Details</strong><br>
                        <strong>Description:</strong> {{commodity}}<br>
                        <strong>Equipment:</strong> {{equipmentDescription}}<br>
                        <strong>NCM/HS Code:</strong> {{ncm}}<br>
                        <strong>Invoice No.:</strong> {{invoiceNumber}}<br>
                        <strong>Purchase Order No.:</strong> {{purchaseOrderNumber}}
                    </td>
                </tr>
                 <tr>
                    <td colspan="2" style="padding: 10px; border: 1px solid #ddd;">
                        <strong style="color: #F97316;">Freight & Charges to be declared on BL</strong><br>
                        <strong>Freight:</strong> {{freightSale}}<br>
                        <strong>THC:</strong> {{thcValue}}
                    </td>
                </tr>
            </tbody>
        </table>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{updateLink}}" style="background-color: #F97316; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;" target="_blank">
                Update Booking Details
            </a>
        </div>
        
        <div style="background-color: #f2f2f2; border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px;">FINANCIAL AGREEMENT (For Agent Use Only)</h3>
            <p style="margin: 5px 0;"><strong>Freight Cost:</strong> {{freightCost}}</p>
            <p style="margin: 5px 0;"><strong>Freight Sale:</strong> {{freightSale}}</p>
            <p style="margin: 5px 0;"><strong>Agent Profit:</strong> {{agentProfit}}</p>
        </div>

        <p style="margin-top: 30px;">Best regards,<br><strong>CargaInteligente Team</strong></p>
    </div>
</body>
</html>
`,
});

const sendShippingInstructionsFlow = defineFlow(
  {
    name: 'sendShippingInstructionsFlow',
    inputSchema: SendShippingInstructionsInputSchema,
    outputSchema: SendShippingInstructionsOutputSchema,
  },
  async (input) => {
    // In a real application, you would integrate with an email service here.
    // We will just log the action to the console to simulate it.
    console.log(`SIMULATING sending Shipping Instructions to ${input.agentEmail}`);

    const { output } = await generate({
      prompt: { ...prompt, input },
      model: 'gemini-pro',
    });

    if (!output) {
      throw new Error("AI failed to generate shipping instructions.");
    }

    console.log('--- GENERATED SHIPPING INSTRUCTIONS (SIMULATED) ---');
    console.log('SUBJECT:', output.emailSubject);
    console.log('BODY (HTML):', output.emailBody);
    console.log('--- END SIMULATION ---');

    // The flow returns the content to be used by the frontend or a backend email service.
    return output;
  }
);
