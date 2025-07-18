
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a professional client invoice PDF in HTML format.
 *
 * generateClientInvoiceHtml - A function that takes invoice data and returns a styled HTML string.
 * GenerateClientInvoiceHtmlInput - The input type for the function.
 * GenerateClientInvoiceHtmlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChargeSchema = z.object({
  description: z.string().describe('The name of the charge (e.g., "Frete Marítimo").'),
  value: z.string().describe('The unit value of the charge (e.g., "2500.00").'),
  currency: z.string().describe('The currency of the charge (e.g., "USD").'),
});

const BankDetailsSchema = z.object({
    bankName: z.string().describe('The name of the bank for payment.'),
    accountNumber: z.string().describe('The account number or PIX key for payment.'),
});

const GenerateClientInvoiceHtmlInputSchema = z.object({
  invoiceNumber: z.string().describe('The invoice identification number (e.g., "INV-01234").'),
  customerName: z.string().describe('The name of the customer receiving the invoice.'),
  customerAddress: z.string().describe("The customer's full address."),
  date: z.string().describe('The date the invoice was created (e.g., "31/10/2023").'),
  dueDate: z.string().describe('The due date for the payment (e.g., "15/11/2023").'),
  charges: z.array(ChargeSchema).describe('An array of all charges to be listed.'),
  total: z.string().describe('The final total amount (e.g., "R$ 13.500,00").'),
  exchangeRate: z.number().optional().describe('The exchange rate used for conversion, if applicable.'),
  companyLogoUrl: z.string().optional().describe('The data URL of the company logo.'),
});
type GenerateClientInvoiceHtmlInput = z.infer<typeof GenerateClientInvoiceHtmlInputSchema>;

const GenerateClientInvoiceHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the invoice PDF.'),
});
type GenerateClientInvoiceHtmlOutput = z.infer<typeof GenerateClientInvoiceHtmlOutputSchema>;

export async function generateClientInvoiceHtml(input: GenerateClientInvoiceHtmlInput): Promise<GenerateClientInvoiceHtmlOutput> {
  return generateClientInvoiceHtmlFlow(input);
}

const generateClientInvoiceHtmlFlow = ai.defineFlow(
  {
    name: 'generateClientInvoiceHtmlFlow',
    inputSchema: GenerateClientInvoiceHtmlInputSchema,
    outputSchema: GenerateClientInvoiceHtmlOutputSchema,
  },
  async (input) => {
    // This function replaces Handlebars to have more control and avoid server-side bundling issues.
    function applyTemplate(data: any): string {
      const chargesHtml = data.charges.map((charge:any) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 15px;">${charge.description}</td>
          <td style="padding: 12px 15px; text-align: right; font-family: 'Inter', sans-serif;">${charge.currency} ${charge.value}</td>
        </tr>
      `).join('');

      const logoHtml = data.companyLogoUrl
        ? `<img src="${data.companyLogoUrl}" alt="Company Logo" style="height: 45px; max-width: 180px; object-fit: contain;" />`
        : `<span>CargaInteligente</span>`;
      
      const exchangeRateHtml = data.exchangeRate
        ? `<p style="margin-top: 10px; color: #6b7280;">*Valores em moeda estrangeira foram convertidos a uma taxa de câmbio de BRL ${data.exchangeRate.toFixed(4)}.</p>`
        : '';


      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Fatura ${data.invoiceNumber}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Inter', sans-serif; color: #333; background-color: #f9fafb; margin: 0; padding: 20px;">
        <div style="max-width: 800px; margin: auto; background-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          
          <div style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 60%; vertical-align: top;">
                  ${logoHtml}
                </td>
                <td style="width: 40%; text-align: right;">
                  <h1 style="font-size: 28px; margin: 0; font-weight: 700;">FATURA</h1>
                  <p style="margin: 0; color: #6b7280;">#${data.invoiceNumber}</p>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 30px 40px; font-size: 14px; line-height: 1.6;">
            <table style="width: 100%;">
                <tr>
                    <td style="width: 50%; vertical-align: top;">
                        <p style="color: #6b7280; margin: 0;">FATURADO PARA</p>
                        <p style="font-weight: 700; margin-top: 5px;">${data.customerName}</p>
                        <p style="color: #4b5563;">${data.customerAddress}</p>
                    </td>
                    <td style="width: 50%; text-align: right; vertical-align: top;">
                        <p style="margin: 0;"><strong style="color: #6b7280;">Data de Emissão:</strong> ${data.date}</p>
                        <p style="margin: 0;"><strong style="color: #6b7280;">Data de Vencimento:</strong> ${data.dueDate}</p>
                    </td>
                </tr>
            </table>
          </div>

          <div style="padding: 0 40px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb;">DESCRIÇÃO DO SERVIÇO</th>
                  <th style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #e5e7eb;">VALOR</th>
                </tr>
              </thead>
              <tbody>
                ${chargesHtml}
              </tbody>
            </table>
          </div>

          <div style="padding: 30px 40px; text-align: right;">
            <table style="width: 100%; font-size: 16px;">
                <tr>
                    <td style="padding: 15px; text-align: right;">Total a Pagar</td>
                    <td style="padding: 15px; text-align: right; font-size: 24px; font-weight: 700; color: #1e3a8a;">
                        ${data.total}
                    </td>
                </tr>
            </table>
          </div>

          <div style="padding: 30px 40px; background-color: #f3f4f6; border-top: 1px solid #e5e7eb; font-size: 12px;">
            <h4 style="font-weight: 700; color: #374151; margin: 0 0 10px 0;">INSTRUÇÕES DE PAGAMENTO</h4>
            <p style="margin: 0 0 5px 0;"><strong>Banco:</strong> ${data.bankDetails.bankName}</p>
            <p style="margin: 0;"><strong>PIX / Conta:</strong> ${data.bankDetails.accountNumber}</p>
            ${exchangeRateHtml}
          </div>
        </div>
      </body>
      </html>
      `;
    }

    const finalHtml = applyTemplate(input);
    return { html: finalHtml };
  }
);
