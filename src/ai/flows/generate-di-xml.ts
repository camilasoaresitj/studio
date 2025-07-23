
'use server';
/**
 * @fileOverview A Genkit flow to generate a simplified XML for a DI (Declaração de Importação).
 *
 * generateDiXmlFlow - The Genkit flow that creates the XML string for a DI.
 * GenerateDiXmlInputSchema - The input Zod schema for the flow.
 * GenerateDiXmlOutputSchema - The output Zod schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

const DiAdditionItemSchema = z.object({
  ncm: z.string().describe('NCM code for the item.'),
  description: z.string().describe('Description of the item.'),
  quantity: z.number().describe('Quantity of the item in the specified unit.'),
  unit: z.string().describe('Commercial unit of the item (e.g., "UN", "KG").'),
  value: z.number().describe('Total value of the items in this addition (FOB USD).'),
});

export const GenerateDiXmlInputSchema = z.object({
  diNumber: z.string().describe('The DI number (e.g., "24/1234567-8").'),
  importerCnpj: z.string().describe('CNPJ of the importer.'),
  representativeCnpj: z.string().describe('CNPJ of the customs broker/representative.'),
  hblNumber: z.string().describe('The House Bill of Lading number.'),
  mblNumber: z.string().describe('The Master Bill of Lading number.'),
  totalValueBRL: z.number().describe('Total value of the goods in BRL for tax purposes.'),
  totalFreightUSD: z.number().describe('Total freight cost in USD.'),
  totalInsuranceUSD: z.number().describe('Total insurance cost in USD.'),
  additions: z.array(DiAdditionItemSchema).describe('List of additions (items) in the DI.'),
});
export type GenerateDiXmlInput = z.infer<typeof GenerateDiXmlInputSchema>;

export const GenerateDiXmlOutputSchema = z.object({
  xml: z.string().describe('The generated XML string for the DI.'),
});
export type GenerateDiXmlOutput = z.infer<typeof GenerateDiXmlOutputSchema>;

export const generateDiXmlFlow = ai.defineFlow(
  {
    name: 'generateDiXmlFlow',
    inputSchema: GenerateDiXmlInputSchema,
    outputSchema: GenerateDiXmlOutputSchema,
    run: async (input) => {
        const additionsXml = input.additions.map((item, index) => `
        <adicao numero="${index + 1}">
            <ncm>${item.ncm}</ncm>
            <descricao>${item.description}</descricao>
            <quantidade>${item.quantity}</quantidade>
            <unidade>${item.unit}</unidade>
            <valor>${item.value.toFixed(2)}</valor>
        </adicao>
        `).join('');

        const xmlContent = `
    <?xml version="1.0" encoding="UTF-8"?>
    <di xmlns="http://www.receita.fazenda.gov.br/siscomex/di">
    <cabecalho>
        <numero>${input.diNumber}</numero>
        <dataRegistro>${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</dataRegistro>
    </cabecalho>
    <importador>
        <cnpj>${input.importerCnpj}</cnpj>
    </importador>
    <representante>
        <cnpj>${input.representativeCnpj}</cnpj>
    </representante>
    <carga>
        <mbl>${input.mblNumber}</mbl>
        <hbl>${input.hblNumber}</hbl>
    </carga>
    <valores>
        <totalBRL>${input.totalValueBRL.toFixed(2)}</totalBRL>
        <freteUSD>${input.totalFreightUSD.toFixed(2)}</freteUSD>
        <seguroUSD>${input.totalInsuranceUSD.toFixed(2)}</seguroUSD>
    </valores>
    <adicoes>
        ${additionsXml}
    </adicoes>
    </di>
        `.trim();

        return {
        xml: xmlContent,
        };
    },
  }
);
