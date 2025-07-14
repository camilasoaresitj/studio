
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
  quoteNumber: z.string().describe('The quote identification number (e.g., "COT-01234").'),
  customerName: z.string().describe('The name of the customer receiving the invoice.'),
  date: z.string().describe('The date the invoice was created (e.g., "31/10/2023").'),
  validity: z.string().describe('The validity of the quote (e.g., "15 dias").'),
  origin: z.string().describe('The origin of the shipment.'),
  destination: z.string().describe('The destination of the shipment.'),
  modal: z.string().describe('The shipment modal (e.g., "IMPORTAÇÃO MARÍTIMA").'),
  equipment: z.string().describe('The equipment used (e.g., "1X40HC").'),
  route: z.string().optional().describe('The route details.'),
  incoterm: z.string().describe('The incoterm (e.g., "FOB").'),
  transitTime: z.string().describe('The estimated transit time.'),
  freeTime: z.string().describe('The free time for the container.'),
  charges: z.array(ChargeSchema).describe('An array of all charges to be listed.'),
  totalBrl: z.string().describe('The final total amount in BRL (e.g., "132.00").'),
  exchangeRate: z.number().describe('The exchange rate used for conversion.'),
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
    // This function replaces Handlebars to avoid webpack issues and have more control.
    function applyTemplate(data: GenerateQuotePdfHtmlInput): string {
      const chargesHtml = data.charges.map((charge) => {
        const totalInBRL = (parseFloat(charge.total.replace(',', '.')) * (charge.currency === 'BRL' ? 1 : data.exchangeRate)).toFixed(2);
        const exchangeRateDisplay = charge.currency === 'BRL' ? '---' : (data.exchangeRate ? data.exchangeRate.toFixed(4) : 'N/A');
        return `
          <tr>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eee;">${charge.description}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eee; text-align: center;">${charge.quantity}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eee; text-align: right;">${charge.currency} ${charge.value}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eee; text-align: right;">${charge.currency} ${charge.total}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eee; text-align: right;">${exchangeRateDisplay}</td>
            <td style="padding: 10px 15px; border-bottom: 1px solid #eee; text-align: right;">R$ ${totalInBRL}</td>
          </tr>
        `;
      }).join('');

      const approvalLinkHtml = data.approvalLink ? `
        <div style="text-align: center; margin-top: 30px;">
          <a href="${data.approvalLink}" target="_blank" style="display: inline-block; background-color: #E67E22; color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-size: 18px; font-weight: bold;">
            APROVAR COTAÇÃO
          </a>
        </div>
      ` : '';

      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Proposta Comercial ${data.quoteNumber}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
      </head>
      <body style="font-family: 'Inter', sans-serif; color: #333; background-color: #F8F9FA; margin: 0; padding: 20px;">
        <div style="max-width: 800px; margin: auto; background-color: white; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background-color: #092C48; padding: 50px 40px; color: white;">
            <table style="width: 100%;">
              <tr>
                <td style="width: 60%;">
                  <h1 style="font-size: 48px; margin: 0; font-weight: 900; letter-spacing: -2px;">PROPOSTA<br>COMERCIAL</h1>
                </td>
                <td style="width: 40%; text-align: right; vertical-align: bottom;">
                  <img src="https://placehold.co/150x50.png?text=LTI+GLOBAL" alt="LTI Global Logo" style="height: 50px;" data-ai-hint="logo lti global">
                  <p style="margin: 5px 0 0 0; font-size: 12px;">We Listen and Act</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Shipment Details -->
          <div style="padding: 30px 40px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 100px;">ORIGEM</strong> ${data.origin}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 100px;">DESTINO</strong> ${data.destination}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 100px;">MODAL</strong> ${data.modal}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 100px;">EQUIP</strong> ${data.equipment}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 100px;">ROTA</strong> ${data.route || 'N/A'}</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 120px;">COTAÇÃO NR</strong> ${data.quoteNumber}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 120px;">INCOTERM</strong> ${data.incoterm}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 120px;">TRANSIT TIME</strong> ${data.transitTime}</p>
                  <p style="margin: 5px 0;"><strong style="color: #555; display: inline-block; width: 120px;">FREE TIME</strong> ${data.freeTime}</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Charges Table -->
          <div style="padding: 0 40px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background-color: #E67E22; color: white;">
                  <th style="padding: 12px 15px; text-align: left; border-top-left-radius: 10px;">DESCRIÇÃO</th>
                  <th style="padding: 12px 15px; text-align: center;">QTY</th>
                  <th style="padding: 12px 15px; text-align: right;">VALOR</th>
                  <th style="padding: 12px 15px; text-align: right;">TOTAL</th>
                  <th style="padding: 12px 15px; text-align: right;">CÂMBIO</th>
                  <th style="padding: 12px 15px; text-align: right; border-top-right-radius: 10px;">TOTAL R$</th>
                </tr>
              </thead>
              <tbody>
                ${chargesHtml}
              </tbody>
            </table>
          </div>

          <!-- Total and Approval -->
          <div style="padding: 30px 40px;">
            <div style="text-align: right; margin-bottom: 20px;">
              <div style="display: inline-block; background-color: #092C48; color: white; padding: 10px 20px; border-radius: 50px; font-size: 16px;">
                <span style="font-weight: bold; margin-right: 20px;">TOTAL</span>
                <span>R$ ${data.totalBrl}</span>
              </div>
            </div>
            ${approvalLinkHtml}
          </div>

          <!-- Conditions and Footer -->
          <div style="padding: 30px 40px; background-color: #F8F9FA; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
            <h4 style="font-weight: bold; color: #555; margin: 0 0 10px 0;">CONDIÇÕES COMERCIAIS</h4>
            <p style="font-size: 12px; color: #666; line-height: 1.6; margin: 0;">
              Todos os valores estão expressos em [USD/BRL ou outra moeda] e poderão sofrer reajustes conforme variações cambiais, flutuações no valor do frete internacional ou mudanças regulatórias. Os prazos informados são estimativas sujeitas a variações operacionais, liberação alfandegária, disponibilidade de navios/aeronaves e fatores externos (ex: clima, greve, inspeções). Não estão incluídos na proposta: Custos com armazenagem além do prazo regular, taxas de fiscalização ou multas decorrentes de informações incorretas. Solicitações de correção de documentos fora do prazo, estarão sujeitas a taxa de correção.
            </p>
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #555;">
              <p style="margin:0;">&#127760; www.ltiglobal.com.br</p>
            </div>
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
