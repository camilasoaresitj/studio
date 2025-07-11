
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a professional agent invoice PDF in HTML format.
 *
 * generateAgentInvoiceHtml - A function that takes invoice data and returns a styled HTML string for agents.
 * GenerateAgentInvoiceHtmlInput - The input type for the function.
 * GenerateAgentInvoiceHtmlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AgentChargeSchema = z.object({
  description: z.string().describe('The name of the charge (e.g., "OCEAN FREIGHT").'),
  cost: z.string().describe('The cost value of the charge (e.g., "2500.00").'),
  sale: z.string().describe('The sale value of the charge (e.g., "2800.00").'),
  profit: z.string().describe('The profit value of the charge (e.g., "300.00").'),
  currency: z.string().describe('The currency of the charge (e.g., "USD").'),
});

const GenerateAgentInvoiceHtmlInputSchema = z.object({
  invoiceNumber: z.string().describe('The invoice identification number (e.g., "01234").'),
  processId: z.string().describe('The internal process/shipment ID.'),
  agentName: z.string().describe('The name of the agent receiving the invoice.'),
  date: z.string().describe('The date the invoice was created (e.g., "31/10/2023").'),
  charges: z.array(AgentChargeSchema).describe('An array of all charges to be listed.'),
  totalCost: z.string().describe('The final total cost amount (e.g., "2500.00").'),
  totalSale: z.string().describe('The final total sale amount (e.g., "2800.00").'),
  totalProfit: z.string().describe('The final total profit amount (e.g., "300.00").'),
  currency: z.string().describe('The primary currency of the invoice totals (e.g., "USD").'),
});
export type GenerateAgentInvoiceHtmlInput = z.infer<typeof GenerateAgentInvoiceHtmlInputSchema>;

const GenerateAgentInvoiceHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the agent invoice PDF.'),
});
export type GenerateAgentInvoiceHtmlOutput = z.infer<typeof GenerateAgentInvoiceHtmlOutputSchema>;

export async function generateAgentInvoiceHtml(input: GenerateAgentInvoiceHtmlInput): Promise<GenerateAgentInvoiceHtmlOutput> {
  return generateAgentInvoiceHtmlFlow(input);
}

const generateAgentInvoiceHtmlPrompt = ai.definePrompt({
  name: 'generateAgentInvoiceHtmlPrompt',
  input: { schema: GenerateAgentInvoiceHtmlInputSchema },
  output: { schema: GenerateAgentInvoiceHtmlOutputSchema },
  prompt: `You are an expert in creating professional, clean, and well-structured HTML for generating PDF invoices for logistics agents.
Your task is to generate the HTML for an invoice based on the provided JSON data, closely matching the provided visual template (orange and dark theme).

**Crucial Styling and Formatting Rules:**
- **Inline CSS ONLY:** You MUST use inline CSS for all styling (e.g., \`<div style="font-family: Arial, sans-serif; color: #fff;">\`). Do not use \`<style>\` blocks or external stylesheets.
- **Layout:** The entire invoice must be wrapped in a single container with a white background.
- **Header:**
    - The header has a prominent orange bar (\`#F97316\`) at the top.
    - The title "INVOICE" should be large, bold, and white text inside this orange bar.
    - Below the orange bar, include the invoice number, date, and process ID on the right, and company details on the left.
- **Recipient Section:**
    - A clear "BILL TO" section with the agent's name.
- **Table:**
    - The table header must have a dark grey/blue background (\`#374151\`), white text, and be bold. The columns are "DESCRIPTION", "COST", "SALE", "PROFIT".
    - Table rows should alternate between a dark background (\`#1F2937\`) and a slightly lighter dark background (\`#374151\`).
    - ALL text within the table (header and body) must be WHITE (\`#FFFFFF\`).
    - The profit column should have a light green text color (\`#A3E635\`) to stand out.
- **Footer/Totals:**
    - Below the table, a clear summary of Total Cost, Total Sale, and Total Profit must be displayed in a three-column layout.
    - The "Total Profit" value must be in a bold, larger font, and use the same light green color (\`#A3E635\`).
- **Final Footer:**
    - A final footer bar, matching the orange header (\`#F97316\`), should contain payment instructions or a thank you note.

**Final HTML Structure Template:**
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice {{invoiceNumber}}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 800px; margin: auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background-color: #F97316; padding: 20px 40px; border-top-left-radius: 8px; border-top-right-radius: 8px;">
        <h1 style="color: white; font-size: 48px; margin: 0; font-weight: bold; text-align: right;">INVOICE</h1>
    </div>

    <div style="padding: 30px 40px;">
        <!-- Company & Invoice Details -->
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="vertical-align: top; width: 50%;">
                    <h2 style="color: #1F2937; font-size: 24px; margin: 0; font-weight: bold;">LTI GLOBAL</h2>
                    <p style="color: #6B7280; margin: 5px 0;">We Listen and Act</p>
                </td>
                <td style="vertical-align: top; text-align: right; width: 50%;">
                    <p style="margin: 0;"><strong>Invoice #:</strong> {{invoiceNumber}}</p>
                    <p style="margin: 0;"><strong>Date:</strong> {{date}}</p>
                    <p style="margin: 0;"><strong>Process ID:</strong> {{processId}}</p>
                </td>
            </tr>
        </table>
        
        <!-- Bill To Section -->
        <div style="margin-top: 30px;">
            <p style="color: #6B7280; margin: 0;">BILL TO</p>
            <p style="font-weight: bold; font-size: 18px; color: #1F2937; margin-top: 5px;">{{agentName}}</p>
        </div>

        <!-- Charges Table -->
        <div style="margin-top: 30px;">
            <table style="width: 100%; border-collapse: collapse; background-color: #1F2937; color: white; border-radius: 8px; overflow: hidden;">
                <thead>
                    <tr style="background-color: #374151;">
                        <th style="padding: 12px 15px; text-align: left; font-weight: bold;">DESCRIPTION</th>
                        <th style="padding: 12px 15px; text-align: right; font-weight: bold;">COST</th>
                        <th style="padding: 12px 15px; text-align: right; font-weight: bold;">SALE</th>
                        <th style="padding: 12px 15px; text-align: right; font-weight: bold;">PROFIT</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each charges}}
                    <tr style="background-color: {{#if @even}}#1F2937{{else}}#374151{{/if}}; border-top: 1px solid #4B5563;">
                        <td style="padding: 12px 15px;">{{description}}</td>
                        <td style="padding: 12px 15px; text-align: right; font-family: monospace;">{{currency}} {{cost}}</td>
                        <td style="padding: 12px 15px; text-align: right; font-family: monospace;">{{currency}} {{sale}}</td>
                        <td style="padding: 12px 15px; text-align: right; font-family: monospace; color: #A3E635;">{{currency}} {{profit}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>

        <!-- Totals Section -->
        <div style="margin-top: 30px; padding: 20px; background-color: #F3F4F6; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 33.33%; text-align: center;">
                        <p style="color: #6B7280; margin: 0;">Total Cost</p>
                        <p style="font-weight: bold; font-size: 20px; margin: 5px 0; font-family: monospace;">{{currency}} {{totalCost}}</p>
                    </td>
                    <td style="width: 33.33%; text-align: center;">
                        <p style="color: #6B7280; margin: 0;">Total Sale</p>
                        <p style="font-weight: bold; font-size: 20px; margin: 5px 0; font-family: monospace;">{{currency}} {{totalSale}}</p>
                    </td>
                    <td style="width: 33.33%; text-align: center;">
                        <p style="color: #6B7280; margin: 0;">Total Profit</p>
                        <p style="font-weight: bold; font-size: 28px; margin: 5px 0; color: #A3E635; font-family: monospace;">{{currency}} {{totalProfit}}</p>
                    </td>
                </tr>
            </table>
        </div>
    </div>
    
    <!-- Footer Bar -->
     <div style="background-color: #F97316; padding: 15px 40px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; text-align: center; color: white;">
        <p style="margin: 0;">Thank you for your business!</p>
    </div>
  </div>
</body>
</html>
`,
});

const generateAgentInvoiceHtmlFlow = ai.defineFlow(
  {
    name: 'generateAgentInvoiceHtmlFlow',
    inputSchema: GenerateAgentInvoiceHtmlInputSchema,
    outputSchema: GenerateAgentInvoiceHtmlOutputSchema,
  },
  async (input) => {
    const { output } = await generateAgentInvoiceHtmlPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate agent invoice HTML.");
    }
    return output;
  }
);
