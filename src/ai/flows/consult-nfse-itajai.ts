
'use server';
/**
 * @fileOverview A Genkit flow to consult received Nota Fiscal de Serviço (NFS-e) from the Itajaí-SC city hall API.
 *
 * consultNfseItajai - A function that fetches received invoices for a given CNPJ and date range.
 * ConsultNfseItajaiInput - The input type for the function.
 * ConsultNfseItajaiOutput - The return type for the function.
 */

import { defineFlow } from '@genkit-ai/core';
import { z } from 'zod';
import { createClientAsync, Client } from 'soap';

const ConsultNfseItajaiInputSchema = z.object({
  cnpj: z.string().length(14).describe('The CNPJ of the service taker (Tomador) to consult for. Only numbers.'),
  startDate: z.string().describe('The start date for the query in YYYY-MM-DD format.'),
  endDate: z.string().describe('The end date for the query in YYYY-MM-DD format.'),
  page: z.number().int().positive().default(1).describe('The page number for pagination.'),
});
export type ConsultNfseItajaiInput = z.infer<typeof ConsultNfseItajaiInputSchema>;

// The output is dynamic based on the SOAP response, so we use z.any() for now.
const ConsultNfseItajaiOutputSchema = z.any();
export type ConsultNfseItajaiOutput = z.infer<typeof ConsultNfseItajaiOutputSchema>;

const WSDL_URL = 'http://nfse-teste.publica.inf.br/homologa_nfse_integracao/Consultas?wsdl';


const consultNfseItajaiFlow = defineFlow(
  {
    name: 'consultNfseItajaiFlow',
    inputSchema: ConsultNfseItajaiInputSchema,
    outputSchema: ConsultNfseItajaiOutputSchema,
  },
  async (input) => {
    const { cnpj, startDate, endDate, page } = input;
    console.log(`Starting NFS-e consultation for CNPJ: ${cnpj}`);

    const xmlPayload = `
      <ConsultaNfseRecebidaEnvio xmlns="http://www.publica.inf.br">
        <ConsultaNfseRecebida>
          <IdentificacaoTomador>
            <CpfCnpj>
              <Cnpj>${cnpj}</Cnpj>
            </CpfCnpj>
          </IdentificacaoTomador>
          <PeriodoEmissao>
            <DataInicial>${startDate}</DataInicial>
            <DataFinal>${endDate}</DataFinal>
          </PeriodoEmissao>
          <Pagina>${page}</Pagina>
        </ConsultaNfseRecebida>
      </ConsultaNfseRecebidaEnvio>
    `;

    try {
      const soapClient: Client = await createClientAsync(WSDL_URL);
      
      const args = {
        xml: xmlPayload
      };

      // The method name from WSDL is `ConsultarNfseRecebidas`
      const [result] = await soapClient.ConsultarNfseRecebidasAsync(args);
      
      console.log('Successfully received response from NFS-e API.');
      return result;

    } catch (error: any) {
      console.error('SOAP Client Error:', error);
      if (error.response) {
        console.error('SOAP Response Body:', error.response.body);
      }
      throw new Error(`Failed to consult NFS-e: ${error.message}`);
    }
  }
);

export async function consultNfseItajai(input: ConsultNfseItajaiInput): Promise<ConsultNfseItajaiOutput> {
  // Use .run() to execute the flow
  return await consultNfseItajaiFlow.run(input);
}
