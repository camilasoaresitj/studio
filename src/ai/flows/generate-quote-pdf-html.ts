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
  name: z.string().describe('The name of the charge (e.g., "Frete Marítimo").'),
  type: z.string().describe('The unit of the charge (e.g., "Por Contêiner").'),
  currency: z.string().describe('The currency of the charge (e.g., "USD").'),
  total: z.string().describe('The total value of the charge (e.g., "2500.00").'),
});

const GenerateQuotePdfHtmlInputSchema = z.object({
  quoteNumber: z.string().describe('The quote identification number (e.g., "COT-00125").'),
  customerName: z.string().describe('The name of the customer receiving the quote.'),
  date: z.string().describe('The date the quote was created (e.g., "23/06/2025").'),
  validity: z.string().describe('The expiration date of the quote (e.g., "30/06/2025").'),
  origin: z.string().describe('The origin of the shipment.'),
  destination: z.string().describe('The destination of the shipment.'),
  incoterm: z.string().describe('The Incoterm for the shipment.'),
  transitTime: z.string().describe('The estimated transit time.'),
  modal: z.string().describe('The transport modal ("Marítimo" or "Aéreo").'),
  equipment: z.string().describe('The equipment used (e.g., "1x40HC", "LCL").'),
  freightCharges: z.array(ChargeSchema).describe('An array of freight charges.'),
  localCharges: z.array(ChargeSchema).describe('An array of local charges at origin or destination.'),
  totalAllIn: z.string().describe('The final total amount, combining all currencies (e.g., "BRL 2.325,00 + USD 2.905,00").'),
  observations: z.string().optional().describe('Any additional notes or observations for the quote.'),
});
export type GenerateQuotePdfHtmlInput = z.infer<typeof GenerateQuotePdfHtmlInputSchema>;

const GenerateQuotePdfHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the quote PDF.'),
});
export type GenerateQuotePdfHtmlOutput = z.infer<typeof GenerateQuotePdfHtmlOutputSchema>;

export async function generateQuotePdfHtml(input: GenerateQuotePdfHtmlInput): Promise<GenerateQuotePdfHtmlOutput> {
  return generateQuotePdfHtmlFlow(input);
}

const generateQuotePdfHtmlPrompt = ai.definePrompt({
  name: 'generateQuotePdfHtmlPrompt',
  input: { schema: GenerateQuotePdfHtmlInputSchema },
  output: { schema: GenerateQuotePdfHtmlOutputSchema },
  prompt: `You are an expert in creating professional, clean, and well-structured HTML for generating PDF quotes for a logistics company.
Your task is to generate the HTML for a quote based on the provided JSON data.

**Crucial Styling and Formatting Rules:**
- **Inline CSS ONLY:** You MUST use inline CSS for all styling (e.g., \`<div style="font-family: Arial, sans-serif; color: #333;">\`). Do not use \`<style>\` blocks or external stylesheets.
- **Colors:** The primary color for headers and important elements is a specific orange: \`#F97316\`. Table header text should be white. Main text should be a dark gray like \`#333333\`.
- **Layout:** Use HTML tables for structured data. Use \`<div>\`s for layout. The main container should have a max-width of 800px.
- **Fonts:** Use "Arial, sans-serif".
- **Spacing:** Use \`padding\` and \`margin\` within style attributes.
- **Borders:** Use solid borders for tables, with a light gray color like \`#DDDDDD\`. Table cells should have padding.
- **Structure:** Follow the visual structure of a professional quote. The final HTML should be a single, complete document from \`<!DOCTYPE html>\` to \`</html>\`.
- **No external resources:** Do not link to external images or fonts. The logo will be a placeholder text "CargaInteligente".
- **Data Formatting:** All monetary values are provided as pre-formatted strings. Use them directly.

**HTML Structure Template:**

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cotação {{quoteNumber}}</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 12px; color: #333;">
  <div style="max-width: 800px; margin: auto; padding: 20px;">
    
    <!-- Header -->
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="vertical-align: middle;">
          <h1 style="color: #F97316; font-size: 24px; margin: 0;">CargaInteligente</h1>
          <p>Soluções em Logística</p>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <p><strong>Data:</strong> {{date}}</p>
          <p><strong>Cotação:</strong> {{quoteNumber}}</p>
        </td>
      </tr>
    </table>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    
    <!-- Intro -->
    <p>Prezado(a) <strong>{{customerName}}</strong>,</p>
    <p>Agradecemos a oportunidade de apresentar nossa oferta com base nos dados informados.</p>

    <!-- Main Title -->
    <div style="background-color: #F97316; color: white; padding: 10px; text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0;">
      Importação {{modal}}
    </div>

    <!-- Details Table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
            <td style="background-color: #f2f2f2; padding: 8px; border: 1px solid #ddd;" colspan="2"><strong>Oferta válida até:</strong> {{validity}}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd; width: 50%;"><strong>Porto de Origem:</strong> {{origin}}</td>
            <td style="padding: 8px; border: 1px solid #ddd; width: 50%;"><strong>Incoterm:</strong> {{incoterm}}</td>
        </tr>
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Porto de Destino:</strong> {{destination}}</td>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>TT médio:</strong> {{transitTime}}</td>
        </tr>
         <tr>
            <td style="padding: 8px; border: 1px solid #ddd;" colspan="2"><strong>Equipamento:</strong> {{equipment}}</td>
        </tr>
    </table>
    
    <!-- Freight Costs -->
    <h3 style="background-color: #F97316; color: white; padding: 8px; font-size: 14px; margin-top: 20px; margin-bottom: 0;">CUSTOS DE FRETE</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Taxa</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Tipo de Cobrança</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Moeda</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each freightCharges}}
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">{{name}}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{type}}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{currency}}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{{total}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>

    <!-- Local Costs -->
    {{#if localCharges}}
    <h3 style="background-color: #F97316; color: white; padding: 8px; font-size: 14px; margin-top: 20px; margin-bottom: 0;">CUSTOS NO DESTINO / ORIGEM</h3>
    <table style="width: 100%; border-collapse: collapse;">
       <thead>
        <tr style="background-color: #f2f2f2;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Taxa</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Tipo de Cobrança</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Moeda</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each localCharges}}
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">{{name}}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{type}}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{currency}}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">{{total}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    {{/if}}
    
    <!-- Totals -->
    <div style="margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold;">
        <p style="background-color: #f2f2f2; padding: 10px;">Total All-in: {{totalAllIn}}</p>
    </div>

    <!-- Observations -->
    {{#if observations}}
    <div style="margin-top: 30px;">
        <h3 style="border-bottom: 1px solid #ddd; padding-bottom: 5px;">Observações:</h3>
        <p style="font-size: 11px;">{{observations}}</p>
    </div>
    {{/if}}

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
    const { output } = await generateQuotePdfHtmlPrompt(input);
    return output!;
  }
);
