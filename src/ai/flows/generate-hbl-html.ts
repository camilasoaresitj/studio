
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a professional HBL PDF in HTML format.
 *
 * generateHblHtml - A function that takes shipment data and returns a styled HTML string.
 * GenerateHblHtmlInput - The input type for the function.
 * GenerateHblHtmlOutput - The return type for the function.
 */

import { defineFlow, definePrompt } from '@genkit-ai/ai';
import { generate } from '@genkit-ai/core';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const GenerateHblHtmlInputSchema = z.object({
  isOriginal: z.boolean().describe("If true, generate the original BL with signature. If false, generate a draft with a watermark."),
  blNumber: z.string().describe("The Bill of Lading number."),
  shipper: z.string().describe("The shipper's full name and address, formatted with line breaks."),
  consignee: z.string().describe("The consignee's full name and address, formatted with line breaks."),
  notifyParty: z.string().describe("The notify party's full name and address, formatted with line breaks."),
  vesselAndVoyage: z.string().describe("The vessel name and voyage number (e.g., 'MAERSK PICO / 428N')."),
  portOfLoading: z.string().describe("The port of loading."),
  portOfDischarge: z.string().describe("The port of discharge."),
  finalDestination: z.string().describe("The final destination city/country."),
  marksAndNumbers: z.string().describe("Marks and numbers on the packages."),
  packageDescription: z.string().describe("Description of goods and number of packages."),
  grossWeight: z.string().describe("The total gross weight (e.g., '1200.00 KGS')."),
  measurement: z.string().describe("The total measurement in CBM (e.g., '2.500 CBM')."),
  containerAndSeal: z.string().describe("Container and seal numbers, formatted with line breaks."),
  freightPayableAt: z.string().describe("Location where freight is payable."),
  numberOfOriginals: z.string().describe("Number of original BLs issued (e.g., '0 (ZERO)' for express)."),
  issueDate: z.string().describe("Date the BL was issued (e.g., '12-Jul-2024')."),
  shippedOnBoardDate: z.string().describe("Date the cargo was shipped on board."),
  signatureUrl: z.string().url().optional().describe("URL of the responsible user's signature image. Only used if isOriginal is true."),
  companyLogoUrl: z.string().optional().describe('The data URL of the company logo.'),
  companyName: z.string().describe('The name of the company issuing the HBL.'),
});
export type GenerateHblHtmlInput = z.infer<typeof GenerateHblHtmlInputSchema>;

const GenerateHblHtmlOutputSchema = z.object({
  html: z.string().describe('The full, styled HTML content for the HBL PDF.'),
});
export type GenerateHblHtmlOutput = z.infer<typeof GenerateHblHtmlOutputSchema>;

export async function generateHblHtml(input: GenerateHblHtmlInput): Promise<GenerateHblHtmlOutput> {
  return generateHblHtmlFlow(input);
}

const generateHblHtmlPrompt = definePrompt({
  name: 'generateHblHtmlPrompt',
  inputSchema: GenerateHblHtmlInputSchema,
  outputSchema: GenerateHblHtmlOutputSchema,
  prompt: `You are an expert in creating professional, clean, and well-structured HTML for generating PDF Bill of Lading documents.
Your task is to generate the HTML for a House Bill of Lading (HBL) based on the provided JSON data, closely matching the provided visual template.

**Crucial Styling and Formatting Rules:**
- **Inline CSS ONLY:** You MUST use inline CSS for all styling. Do not use \`<style>\` blocks or external stylesheets. Font should be Arial, sans-serif.
- **Layout:** Use a main container with a white background and subtle border. Use nested tables to create the boxed layout seen in the example.
- **Header:** A simple header with "BILL OF LADING" in large, bold text.
- **Boxes:** Each section (Shipper, Consignee, etc.) must be in a cell with a border. Use \`<td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;">\`.
- **Text Formatting:** Use \`<strong style="font-size: 10px; color: #555;">\` for labels inside the boxes (e.g., "Shipper", "Consignee"). Use \`<pre>\` tags for pre-formatted addresses to preserve line breaks.
- **Watermark (for Drafts):** If \`isOriginal\` is \`false\`, you MUST add a large, semi-transparent, rotated "DRAFT" watermark across the center of the page.
  - Watermark div style: \`position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(0, 0, 0, 0.08); font-weight: bold; z-index: 1; pointer-events: none; text-align: center;\`
- **Signature (for Originals):** If \`isOriginal\` is \`true\`, you MUST include the signature image and an "ORIGINAL" stamp at the bottom right.
  - The signature area should have "AS CARRIER" and the company name.
  - The signature image itself: \`<img src="{{signatureUrl}}" alt="Signature" style="height: 50px;"/>\`
  - The stamp: \`<div style="border: 2px solid #000; color: #000; padding: 5px 10px; font-weight: bold; transform: rotate(-10deg);">ORIGINAL</div>\`

**Final HTML Structure Template:**
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bill of Lading {{blNumber}}</title>
</head>
<body style="font-family: Arial, sans-serif; font-size: 12px; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="width: 210mm; min-height: 297mm; margin: auto; background-color: white; padding: 40px; position: relative; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    
    {{#unless isOriginal}}
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 150px; color: rgba(0, 0, 0, 0.08); font-weight: bold; z-index: 1; pointer-events: none; text-align: center;">DRAFT<br/>NOT NEGOTIABLE</div>
    {{/unless}}

    <div style="position: relative; z-index: 2;">
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="width: 60%; vertical-align: top;">
                     {{#if companyLogoUrl}}
                        <img src="{{companyLogoUrl}}" alt="{{companyName}} Logo" style="max-height: 60px; max-width: 200px; object-fit: contain;">
                    {{else}}
                        <strong style="font-size: 18px;">{{companyName}}</strong><br/>
                    {{/if}}
                    <span style="font-size: 11px;">We Listen and Act</span>
                </td>
                <td style="width: 40%; text-align: right;">
                    <h1 style="font-size: 24px; font-weight: bold; margin: 0;">BILL OF LADING</h1>
                    <p style="margin: 0;">B/L Number: <strong>{{blNumber}}</strong></p>
                </td>
            </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #ccc;">
            <tr>
                <td style="width: 50%; border: 1px solid #ccc; padding: 8px; vertical-align: top;">
                    <strong style="font-size: 10px; color: #555;">Shipper</strong><br/>
                    <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">{{shipper}}</pre>
                </td>
                <td rowspan="2" style="width: 50%; border: 1px solid #ccc; padding: 8px; vertical-align: top;">
                    <strong style="font-size: 10px; color: #555;">Consignee</strong><br/>
                    <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">{{consignee}}</pre>
                </td>
            </tr>
             <tr>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;">
                    <strong style="font-size: 10px; color: #555;">Notify Party</strong><br/>
                    <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">{{notifyParty}}</pre>
                </td>
            </tr>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
            <tr>
                <td style="width: 33.33%; border: 1px solid #ccc; padding: 8px; vertical-align: top;"><strong style="font-size: 10px; color: #555;">Vessel and Voyage</strong><br/>{{vesselAndVoyage}}</td>
                <td style="width: 33.33%; border: 1px solid #ccc; padding: 8px; vertical-align: top;"><strong style="font-size: 10px; color: #555;">Port of Loading</strong><br/>{{portOfLoading}}</td>
                <td style="width: 33.33%; border: 1px solid #ccc; padding: 8px; vertical-align: top;"><strong style="font-size: 10px; color: #555;">Freight Payable at</strong><br/>{{freightPayableAt}}</td>
            </tr>
             <tr>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;"><strong style="font-size: 10px; color: #555;">Port of Discharge</strong><br/>{{portOfDischarge}}</td>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;"><strong style="font-size: 10px; color: #555;">Final Destination</strong><br/>{{finalDestination}}</td>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;"><strong style="font-size: 10px; color: #555;">No. of Originals</strong><br/>{{numberOfOriginals}}</td>
            </tr>
        </table>

         <table style="width: 100%; border-collapse: collapse; margin-top: -1px;">
              <tr style="background-color: #f2f2f2;">
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10px;">Marks and Numbers</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 10px;" colspan="2">Number and Kind of packages / Description of Goods</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 10px;">Gross Weight</th>
                <th style="border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 10px;">Measurement</th>
              </tr>
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; width: 20%;">
                    <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">{{marksAndNumbers}}</pre>
                </td>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;" colspan="2">
                    <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">{{packageDescription}}</pre>
                </td>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; text-align: right; width: 15%;">{{grossWeight}}</td>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top; text-align: right; width: 15%;">{{measurement}}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: top;" colspan="3">
                    <strong style="font-size: 10px; color: #555;">Container and Seal Numbers</strong><br/>
                    <pre style="font-family: Arial, sans-serif; margin: 0; white-space: pre-wrap;">{{containerAndSeal}}</pre>
                </td>
                <td style="border: 1px solid #ccc; padding: 8px; vertical-align: bottom; text-align: right;" colspan="2">
                    SHIPPED ON BOARD<br/>DATE: <strong>{{shippedOnBoardDate}}</strong>
                </td>
              </tr>
         </table>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="width: 70%; vertical-align: top;">
                <p><strong>Place and Date of issue:</strong> {{portOfLoading}}, {{issueDate}}</p>
                <br/><br/>
                <p><strong>AS CARRIER:</strong></p>
                <p>{{companyName}}</p>
                {{#if isOriginal}}
                <img src="{{signatureUrl}}" alt="Signature" style="height: 50px;"/>
                {{/if}}
            </td>
            <td style="width: 30%; vertical-align: top; text-align: center;">
                {{#if isOriginal}}
                 <div style="border: 2px solid #000; color: #000; padding: 5px 10px; font-weight: bold; transform: rotate(-10deg); display: inline-block;">ORIGINAL</div>
                {{/if}}
            </td>
          </tr>
        </table>
    </div>
  </div>
</body>
</html>
`,
});

const generateHblHtmlFlow = defineFlow(
  {
    name: 'generateHblHtmlFlow',
    inputSchema: GenerateHblHtmlInputSchema,
    outputSchema: GenerateHblHtmlOutputSchema,
  },
  async (input) => {
    const response = await generate({
      prompt: generateHblHtmlPrompt,
      input,
      model: googleAI('gemini-pro'),
    });
    
    const output = response.output();
    if (!output) {
      throw new Error("AI failed to generate HBL HTML.");
    }
    return output;
  }
);
