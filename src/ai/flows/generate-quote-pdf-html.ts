
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
  approvalLink: z.string().url().optional().describe('Optional URL for the customer to approve the quote.'),
});
export type GenerateQuotePdfHtmlInput = z.infer<typeof GenerateQuotePdfHtmlInputSchema>;

const GenerateQuotePdfHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the invoice PDF.'),
});
export type GenerateQuotePdfHtmlOutput = z.infer<typeof GenerateQuotePdfHtmlOutputSchema>;

export async function generateQuotePdfHtml(input: GenerateQuotePdfHtmlInput): Promise<GenerateQuotePdfHtmlOutput> {
  return generateQuotePdfHtmlFlow(input);
}

const generateQuotePdfHtmlFlow = ai.defineFlow(
  {
    name: 'generateQuotePdfHtmlFlow',
    inputSchema: GenerateQuotePdfHtmlInputSchema,
    outputSchema: GenerateQuotePdfHtmlOutputSchema,
  },
  async (input) => {
    // This function replaces Handlebars to avoid webpack issues.
    function applyTemplate(data: GenerateQuotePdfHtmlInput): string {
        const chargesHtml = data.charges.map((charge, index) => {
            const totalInBRL = (parseFloat(charge.total.replace(',', '.')) * data.exchangeRate).toFixed(2);
            const rowStyle = index % 2 !== 0 ? 'style="background-color: #F5F7F8;"' : '';
            return `
                <tr ${rowStyle}>
                    <td style="padding: 10px 15px;">${charge.description}</td>
                    <td style="padding: 10px 15px; text-align: center;">${charge.quantity}</td>
                    <td style="padding: 10px 15px; text-align: center;">${charge.currency} ${charge.value}</td>
                    <td style="padding: 10px 15px; text-align: center;">${charge.currency} ${charge.total}</td>
                    <td style="padding: 10px 15px; text-align: center;">${data.exchangeRate}</td>
                    <td style="padding: 10px 15px; text-align: center;">R$ ${totalInBRL}</td>
                </tr>
            `;
        }).join('');

        const approvalLinkHtml = data.approvalLink ? `
            <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #555;">
                <p>Para aprovar esta cotação, acesse: <a href="${data.approvalLink}" style="color: #092C48; font-weight: bold;">${data.approvalLink}</a></p>
            </div>
        ` : '';

        return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Fatura ${data.invoiceNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; color: #333; background-color: #F5F7F8; margin: 0; padding: 20px;">
          <div style="max-width: 800px; margin: auto; padding: 40px; background-color: white; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; vertical-align: top;">
              <tr>
                <td style="width: 50%;">
                  <h1 style="color: #092C48; font-size: 28px; margin: 0; font-weight: bold;">LTI GLOBAL</h1>
                  <p style="color: #666; margin: 0;">We Listen and Act</p>
                  <p style="font-weight: bold; margin-top: 30px; margin-bottom: 5px;">PAYABLE TO</p>
                  <p style="margin: 0;">${data.customerName}</p>
                  <p style="margin: 0;">${data.customerAddress}</p>
                </td>
                <td style="width: 50%; text-align: right; position: relative;">
                  <div style="position: absolute; top: -80px; right: -80px; width: 400px; height: 200px; border-bottom-left-radius: 200px; background-image: radial-gradient(circle at top right, #FFD1C2, #FFE5E0); z-index: 1;"></div>
                  <div style="position: relative; z-index: 2; padding-right: 20px;">
                    <h2 style="color: #092C48; font-size: 48px; margin: 0; font-weight: bold;">FATURA</h2>
                    <p style="margin: 5px 0;">Number: ${data.invoiceNumber}</p>
                    <p style="margin: 0;">Date: ${data.date}</p>
                  </div>
                </td>
              </tr>
            </table>
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
                        ${chargesHtml}
                    </tbody>
                </table>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-top: 40px; vertical-align: bottom;">
                <tr>
                    <td style="width: 50%;">
                        <h3 style="color: #092C48; margin-bottom: 10px;">DADOS BANCARIOS</h3>
                        <p style="margin: 0; font-weight: bold;">${data.bankDetails.bankName}</p>
                        <p style="margin: 0;">${data.bankDetails.accountNumber}</p>
                    </td>
                    <td style="width: 50%; text-align: right;">
                        <div style="display: inline-block; background-color: #092C48; color: white; padding: 20px 30px; border-radius: 10px; min-width: 250px;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="text-align: left; font-size: 18px;">TOTAL</td>
                                    <td style="text-align: right; font-size: 18px; font-weight: bold;">R$ ${data.total}</td>
                                </tr>
                            </table>
                        </div>
                    </td>
                </tr>
            </table>
            ${approvalLinkHtml}
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
        `;
    }

    const finalHtml = applyTemplate(input);

    return { html: finalHtml };
  }
);
