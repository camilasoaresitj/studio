'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a professional quote PDF in HTML format.
 *
 * generateQuotePdfHtml - A function that takes quote data and returns a styled HTML string.
 * GenerateQuotePdfHtmlInput - The input type for the function.
 * GenerateQuotePdfHtmlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChargeSchema = z.object({
  description: z.string().describe('The name of the charge (e.g., "Frete Marítimo").'),
  quantity: z.number().describe('The quantity for the charge.'),
  value: z.string().describe('The unit value of the charge (e.g., "2500.00").'),
  total: z.string().describe('The total value of the charge (e.g., "2500.00").'),
  currency: z.string().describe('The currency of the charge (e.g., "USD").'),
});

const GenerateQuotePdfHtmlInputSchema = z.object({
  invoiceNumber: z.string().describe('The invoice identification number (e.g., "01234").'),
  customerName: z.string().describe('The name of the customer receiving the invoice.'),
  customerAddress: z.string().describe('The address of the customer.'),
  date: z.string().describe('The date the invoice was created (e.g., "31/10/2023").'),
  charges: z.array(ChargeSchema).describe('An array of all charges to be listed.'),
  total: z.string().describe('The final total amount in BRL (e.g., "132.00").'),
  exchangeRate: z.number().describe('The exchange rate used for conversion.'),
  bankDetails: z.object({
      bankName: z.string().describe("The bank's name."),
      accountNumber: z.string().describe('The bank account number.'),
  }).describe('The bank details for payment.'),
});
export type GenerateQuotePdfHtmlInput = z.infer<typeof GenerateQuotePdfHtmlInputSchema>;

const GenerateQuotePdfHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the invoice PDF.'),
});
export type GenerateQuotePdfHtmlOutput = z.infer<typeof GenerateQuotePdfHtmlOutputSchema>;

export async function generateQuotePdfHtml(input: GenerateQuotePdfHtmlInput): Promise<GenerateQuotePdfHtmlOutput> {
  return generateQuotePdfHtmlFlow(input);
}

const generateQuotePdfHtmlPrompt = ai.definePrompt({
  name: 'generateQuotePdfHtmlPrompt',
  input: { schema: GenerateQuotePdfHtmlInputSchema },
  output: { schema: GenerateQuotePdfHtmlOutputSchema },
  prompt: `You are an expert in creating professional, clean, and well-structured HTML for generating PDF invoices.
Your task is to generate the HTML for an invoice based on the provided JSON data, closely matching the provided visual template.

**Crucial Styling and Formatting Rules:**
- **Inline CSS ONLY:** You MUST use inline CSS for all styling (e.g., \`<div style="font-family: Arial, sans-serif; color: #333;">\`). Do not use \`<style>\` blocks or external stylesheets.
- **Layout:** The entire invoice must be wrapped in a single container with a white background. Use tables for layout where appropriate.
- **Header:**
    - The header has a large, curved background element. You can achieve this with a \`div\` that has a large border-radius on the bottom-left and a CSS radial-gradient. The gradient should go from a light peach/orange (\`#FFD1C2\`) to a very light pink (\`#FFE5E0\`). This div will be a container for the title.
    - Inside this header area, on the right, place "FATURA" in large, bold, dark blue (\`#092C48\`) text. Below it, list the invoice number and date.
    - To the left, outside the curved area, place the company logo text ("LTI GLOBAL" and "We Listen and Act") and the "PAYABLE TO" section.
- **Table:**
    - The table header must have a dark blue background (\`#092C48\`), white text, and rounded corners (\`border-radius: 10px;\`). The columns are "DESCRICAO", "QTY", "VALOR", "TOTAL", "CAMBIO", "TOTAL R$".
    - Table rows should have a light grey background (\`#F5F7F8\`) for even-numbered rows and white for odd.
    - Ensure all text in the table is vertically aligned in the middle.
- **Footer:**
    - The "DADOS BANCARIOS" and "TOTAL" sections should be at the bottom.
    - The "TOTAL" block must be a dark blue (\`#092C48\`), rounded box with white text.
    - The final footer is a dark blue bar (\`#092C48\`) at the very bottom, containing contact icons (use text placeholders like '[Web]', '[Tel]', '[Email]') and details.

**Data Mapping:**
- **Table Columns:**
    - 'VALOR' and 'TOTAL' should display the original currency value (e.g., "$40.00").
    - 'CAMBIO' should display the exchange rate provided.
    - 'TOTAL R$' should be the 'TOTAL' value multiplied by the 'CAMBIO' rate. Format it as "R$ XXX.XX".
- **Final Total:** Use the 'total' field from the input for the final total box.

**Final HTML Structure Template:**

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fatura {{invoiceNumber}}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; background-color: #F5F7F8; margin: 0; padding: 20px;">
  <div style="max-width: 800px; margin: auto; padding: 40px; background-color: white; border-radius: 8px;">
    
    <!-- Header -->
    <table style="width: 100%; border-collapse: collapse; vertical-align: top;">
      <tr>
        <td style="width: 50%;">
          <h1 style="color: #092C48; font-size: 28px; margin: 0; font-weight: bold;">LTI GLOBAL</h1>
          <p style="color: #666; margin: 0;">We Listen and Act</p>
          <p style="font-weight: bold; margin-top: 30px; margin-bottom: 5px;">PAYABLE TO</p>
          <p style="margin: 0;">{{customerName}}</p>
          <p style="margin: 0;">{{customerAddress}}</p>
        </td>
        <td style="width: 50%; text-align: right; position: relative;">
          <div style="position: absolute; top: -80px; right: -80px; width: 400px; height: 200px; border-bottom-left-radius: 200px; background-image: radial-gradient(circle at top right, #FFD1C2, #FFE5E0); z-index: 1;"></div>
          <div style="position: relative; z-index: 2; padding-right: 20px;">
            <h2 style="color: #092C48; font-size: 48px; margin: 0; font-weight: bold;">FATURA</h2>
            <p style="margin: 5px 0;">Number: {{invoiceNumber}}</p>
            <p style="margin: 0;">Date: {{date}}</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Charges Table -->
    <div style="margin-top: 40px;">
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #092C48; color: white;">
                    <th style="padding: 15px; text-align: left; border-top-left-radius: 10px;">DESCRICAO</th>
                    <th style="padding: 15px;">QTY</th>
                    <th style="padding: 15px;">VALOR</th>
                    <th style="padding: 15px;">TOTAL</th>
                    <th style="padding: 15px;">CAMBIO</th>
                    <th style="padding: 15px; border-top-right-radius: 10px;">TOTAL R$</th>
                </tr>
            </thead>
            <tbody>
                {{#each charges}}
                <tr style="{{#if @odd}}background-color: #F5F7F8;{{/if}}">
                    <td style="padding: 10px 15px;">{{description}}</td>
                    <td style="padding: 10px 15px; text-align: center;">{{quantity}}</td>
                    <td style="padding: 10px 15px; text-align: center;">{{currency}} {{value}}</td>
                    <td style="padding: 10px 15px; text-align: center;">{{currency}} {{total}}</td>
                    <td style="padding: 10px 15px; text-align: center;">{{../exchangeRate}}</td>
                    <td style="padding: 10px 15px; text-align: center;">R$ {{multiply total ../exchangeRate}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </div>

    <!-- Footer -->
    <table style="width: 100%; border-collapse: collapse; margin-top: 40px; vertical-align: bottom;">
        <tr>
            <td style="width: 50%;">
                <h3 style="color: #092C48; margin-bottom: 10px;">DADOS BANCARIOS</h3>
                <p style="margin: 0; font-weight: bold;">{{bankDetails.bankName}}</p>
                <p style="margin: 0;">{{bankDetails.accountNumber}}</p>
            </td>
            <td style="width: 50%; text-align: right;">
                <div style="display: inline-block; background-color: #092C48; color: white; padding: 20px 30px; border-radius: 10px; min-width: 250px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="text-align: left; font-size: 18px;">TOTAL</td>
                            <td style="text-align: right; font-size: 18px; font-weight: bold;">R$ {{total}}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

  </div>
  <div style="max-width: 800px; margin: 0 auto; padding: 15px 40px; background-color: #092C48; color: white; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="text-align: left;">[Web] reallygreatsite.com</td>
                <td style="text-align: center;">[Tel] 123-456-7890</td>
                <td style="text-align: right;">[Email] hello@reallygreatsite.com</td>
            </tr>
        </table>
    </div>
</body>
</html>
`,
});

const generateQuotePdfHtmlFlow = ai.defineFlow(
  {
    name: 'generateQuotePdfHtmlFlow',
    inputSchema: GenerateQuotePdfHtmlInputSchema,
    outputSchema: GenerateQuotePdfHtmlOutputSchema,
  },
  async (input) => {
    
    // Helper function for Handlebars
    const Handlebars = require('handlebars');
    Handlebars.registerHelper('multiply', function(a: any, b: any) {
        const val1 = parseFloat(a);
        const val2 = parseFloat(b);
        if (isNaN(val1) || isNaN(val2)) {
            return 'N/A';
        }
        return (val1 * val2).toFixed(2);
    });

    const { output } = await generateQuotePdfHtmlPrompt(input);
    return output!;
  }
);
