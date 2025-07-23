
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a professional cost simulation PDF in HTML format.
 *
 * generateSimulationPdfHtml - A function that takes simulation data and returns a styled HTML string.
 * GenerateSimulationPdfHtmlInput - The input type for the function.
 * GenerateSimulationPdfHtmlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { SimulationResult, SimulationFormData } from '@/app/simulador-di/page';


const GenerateSimulationPdfHtmlInputSchema = z.object({
  simulationName: z.string(),
  customerName: z.string(),
  createdAt: z.string(),
  formData: z.any().describe("The full form data of the simulation."),
  resultData: z.any().describe("The full result data of the calculation."),
});
export type GenerateSimulationPdfHtmlInput = z.infer<typeof GenerateSimulationPdfHtmlInputSchema>;

const GenerateSimulationPdfHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the simulation PDF.'),
});
export type GenerateSimulationPdfHtmlOutput = z.infer<typeof GenerateSimulationPdfHtmlOutputSchema>;

export async function generateSimulationPdfHtml(input: GenerateSimulationPdfHtmlInput): Promise<GenerateSimulationPdfHtmlOutput> {
  return generateSimulationPdfHtmlFlow(input);
}

const generateSimulationPdfHtmlFlow = ai.defineFlow(
  {
    name: 'generateSimulationPdfHtmlFlow',
    inputSchema: GenerateSimulationPdfHtmlInputSchema,
    outputSchema: GenerateSimulationPdfHtmlOutputSchema,
  },
  async (input) => {
    // Helper function to replace Handlebars logic for better control
    function applyTemplate(data: GenerateSimulationPdfHtmlInput): string {
      const { simulationName, customerName, createdAt, formData, resultData } = data;
      
      const formatCurrency = (value: number, currency = 'BRL') => 
        `${currency} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const itensHtml = resultData.itens.map((item: any) => `
        <tr>
          <td>${item.descricao} (${item.ncm})</td>
          <td style="text-align: center;">${item.quantidade}</td>
          <td style="text-align: right;">${formatCurrency(item.valorUnitarioUSD, 'USD')}</td>
          <td style="text-align: right;">${formatCurrency(item.valorAduaneiroRateado)}</td>
          <td style="text-align: right;">${formatCurrency(item.impostosRateados)}</td>
          <td style="text-align: right;">${formatCurrency(item.despesasLocaisRateadas)}</td>
          <td style="text-align: right; font-weight: bold;">${formatCurrency(item.custoUnitarioFinal)}</td>
        </tr>
      `).join('');
      
       const totalImpostos = resultData.totalII + resultData.totalIPI + resultData.totalPIS + resultData.totalCOFINS + resultData.totalICMS;

      return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <title>Simulação de Custos - ${simulationName}</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; color: #333; }
              .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
              h1, h2, h3 { color: #1a202c; }
              h1 { font-size: 28px; text-align: center; margin-bottom: 10px; }
              h2 { font-size: 20px; border-bottom: 2px solid #1a202c; padding-bottom: 5px; margin-top: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f7fafc; font-weight: bold; }
              .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }
              .summary-card { background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
              .summary-card p { margin: 0; }
              .summary-card .label { font-size: 12px; color: #718096; }
              .summary-card .value { font-size: 16px; font-weight: bold; }
              .total-card { background-color: #1a202c; color: white; padding: 20px; text-align: center; border-radius: 8px; }
              .total-card .label { font-size: 16px; opacity: 0.8; }
              .total-card .value { font-size: 32px; font-weight: bold; letter-spacing: -1px; }
          </style>
      </head>
      <body>
        <div class="container">
          <h1>Simulação de Custos de Importação</h1>
          <p style="text-align: center; color: #718096; margin-top: -10px;">Para: ${customerName} | Criado em: ${createdAt}</p>

          <h2>Resultado Final</h2>
          <div class="total-card">
            <p class="label">Custo Total da Importação</p>
            <p class="value">${formatCurrency(resultData.custoTotal)}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <p class="label">Valor Aduaneiro Total</p>
              <p class="value">${formatCurrency(resultData.valorAduaneiro)}</p>
            </div>
            <div class="summary-card">
              <p class="label">Impostos Totais (II, IPI, PIS, COFINS, ICMS)</p>
              <p class="value">${formatCurrency(totalImpostos)}</p>
            </div>
          </div>

          <h2>Rateio de Custos por Item</h2>
          <table>
            <thead>
              <tr>
                <th>Item (NCM)</th>
                <th style="text-align: center;">Qtde</th>
                <th style="text-align: right;">Valor FOB Unit.</th>
                <th style="text-align: right;">V. Aduaneiro</th>
                <th style="text-align: right;">Impostos</th>
                <th style="text-align: right;">Despesas</th>
                <th style="text-align: right; font-weight: bold;">Custo Unit. Final</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>

          <h2>Detalhamento dos Impostos</h2>
          <table>
            <tr><td style="width: 50%;">Imposto de Importação (II)</td><td style="width: 50%; text-align: right;">${formatCurrency(resultData.totalII)}</td></tr>
            <tr><td>Imposto sobre Produtos Industrializados (IPI)</td><td style="text-align: right;">${formatCurrency(resultData.totalIPI)}</td></tr>
            <tr><td>PIS</td><td style="text-align: right;">${formatCurrency(resultData.totalPIS)}</td></tr>
            <tr><td>COFINS</td><td style="text-align: right;">${formatCurrency(resultData.totalCOFINS)}</td></tr>
            <tr><td>ICMS</td><td style="text-align: right;">${formatCurrency(resultData.totalICMS)}</td></tr>
            <tr style="font-weight: bold;"><td>TOTAL DE IMPOSTOS</td><td style="text-align: right;">${formatCurrency(totalImpostos)}</td></tr>
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
