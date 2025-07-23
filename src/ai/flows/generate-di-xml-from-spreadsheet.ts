
'use server';
/**
 * @fileOverview A Genkit flow to generate a DI XML from spreadsheet data.
 *
 * generateDiXmlFromSpreadsheet - A function that creates the XML string for a DI from a spreadsheet.
 * GenerateDiXmlFromSpreadsheetInput - The input type for the function.
 * GenerateDiXmlFromSpreadsheetOutput - The return type for the function.
 */

import { defineFlow, definePrompt, generate } from '@genkit-ai/core';
import { z } from 'zod';

const GenerateDiXmlFromSpreadsheetInputSchema = z.object({
  spreadsheetData: z.array(z.any()).describe("Data extracted from the CargoWise spreadsheet."),
  shipmentData: z.any().describe("Data from the current shipment process."),
});
export type GenerateDiXmlFromSpreadsheetInput = z.infer<typeof GenerateDiXmlFromSpreadsheetInputSchema>;

const GenerateDiXmlFromSpreadsheetOutputSchema = z.object({
  xml: z.string().describe('The generated XML string for the DI.'),
});
export type GenerateDiXmlFromSpreadsheetOutput = z.infer<typeof GenerateDiXmlFromSpreadsheetOutputSchema>;

export async function generateDiXmlFromSpreadsheet(input: GenerateDiXmlFromSpreadsheetInput): Promise<GenerateDiXmlFromSpreadsheetOutput> {
  return generateDiXmlFromSpreadsheetFlow(input);
}

const generateDiXmlFromSpreadsheetPrompt = definePrompt({
  name: 'generateDiXmlFromSpreadsheetPrompt',
  inputSchema: GenerateDiXmlFromSpreadsheetInputSchema,
  outputSchema: GenerateDiXmlFromSpreadsheetOutputSchema,
  prompt: `You are an expert system for generating Brazilian Customs Declaration XML (Declaração de Importação - DI).
Your task is to convert the provided JSON data (extracted from a CargoWise spreadsheet) and shipment data into a valid DI XML format.
Carefully map the fields from the JSON to the corresponding XML tags based on the provided example.

**CRITICAL RULES:**
- The XML structure must follow the example EXACTLY.
- All values must be formatted correctly (e.g., numbers with specific padding and precision, dates as YYYYMMDD).
- Group all items from the spreadsheet under a single <adicao> tag.
- Use data from the 'shipmentData' object as the PRIMARY source for general fields not present in the spreadsheet items, like carrier, vessel, dates, HBL/MBL numbers, etc.
- The <informacoesComplementares> tag should be a detailed summary of the shipment.
- The spreadsheet data represents the list of <mercadoria> items within the <adicao>.

**Spreadsheet Data (as JSON - for <mercadoria> items):**
\`\`\`json
{{{json spreadsheetData}}}
\`\`\`

**Shipment Process Data (for general declaration fields):**
\`\`\`json
{{{json shipmentData}}}
\`\`\`

**Example DI XML Output Structure to follow:**
<ListaDeclaracoesTransmissao xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<declaracao>
<adicao>
<codigoMercadoriaNCM>...</codigoMercadoriaNCM>
<mercadoria>
<textoDetalhamentoMercadoria>...</textoDetalhamentoMercadoria>
<quantidadeMercadoriaUnidadeComercializada>...</quantidadeMercadoriaUnidadeComercializada>
<valorUnidadeLocalEmbarque>...</valorUnidadeLocalEmbarque>
</mercadoria>
<!-- Repeat <mercadoria> for each item in the spreadsheet -->
<nomeFornecedorEstrangeiro>...</nomeFornecedorEstrangeiro>
<pesoLiquidoMercadoria>...</pesoLiquidoMercadoria>
<!-- ... other fields for <adicao> ... -->
</adicao>
<cargaPesoBruto>...</cargaPesoBruto>
<cargaPesoLiquido>...</cargaPesoLiquido>
<dataChegadaCarga>...</dataChegadaCarga>
<dataEmbarque>...</dataEmbarque>
<documentoInstrucaoDespacho>...</documentoInstrucaoDespacho>
<nomeVeiculoViaTransporte>...</nomeVeiculoViaTransporte>
<numeroDocumentoCarga>...</numeroDocumentoCarga>
<numeroDocumentoCargaMaster>...</numeroDocumentoCargaMaster>
<numeroImportador>...</numeroImportador>
<!-- ... other fields for <declaracao> ... -->
</declaracao>
</ListaDeclaracoesTransmissao>

Now, generate the complete XML based on the provided data.
`,
});

const generateDiXmlFromSpreadsheetFlow = defineFlow(
  {
    name: 'generateDiXmlFromSpreadsheetFlow',
    inputSchema: GenerateDiXmlFromSpreadsheetInputSchema,
    outputSchema: GenerateDiXmlFromSpreadsheetOutputSchema,
  },
  async (input) => {
    const response = await generate({
      prompt: { ...generateDiXmlFromSpreadsheetPrompt, input },
      model: 'gemini-pro',
    });
    
    const output = response.output();
    if (!output?.xml) {
      throw new Error("A IA não conseguiu gerar o XML. Verifique os dados da planilha e do processo.");
    }
    return output;
  }
);
