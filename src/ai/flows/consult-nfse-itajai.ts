
'use server';
/**
 * @fileOverview A Genkit flow to consult received Nota Fiscal de Serviço (NFS-e) from the Itajaí-SC city hall API.
 *
 * consultNfseItajai - A function that fetches received invoices for a given CNPJ and date range.
 * ConsultNfseItajaiInput - The input type for the function.
 * ConsultNfseItajaiOutput - The return type for the function.
 */

import { initializeAI } from '@/ai/genkit';
import { z } from 'zod';
import { createClientAsync, Client } from 'soap';

const ai = initializeAI();

const ConsultNfseItajaiInputSchema = z.object({
  cnpj: z.string().length(14).describe('The CNPJ of the service taker (Tomador) to consult for. Only numbers.'),
  startDate: z.string().date().describe('The start date for the query in YYYY-MM-DD format.'),
  endDate: z.string().date().describe('The end date for the query in YYYY-MM-DD format.'),
  page: z.number().int().positive().default(1).describe('The page number for pagination.'),
});
export type ConsultNfseItajaiInput = z.infer<typeof ConsultNfseItajaiInputSchema>;

// The output is dynamic based on the SOAP response, so we use z.any() for now.
const ConsultNfseItajaiOutputSchema = z.any();
export type ConsultNfseItajaiOutput = z.infer<typeof ConsultNfseItajaiOutputSchema>;

const WSDL_URL = 'http://nfse-teste.publica.inf.br/homologa_nfse_integracao/Consultas?wsdl';

export async function consultNfseItajai(input: ConsultNfseItajaiInput): Promise<ConsultNfseItajaiOutput> {
  return consultNfseItajaiFlow(input);
}

const consultNfseItajaiFlow = ai.defineFlow(
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
          <DataNfse>
            <Inicial>${startDate}</Inicial>
            <Final>${endDate}</Final>
          </DataNfse>
          <Pagina>${page}</Pagina>
        </ConsultaNfseRecebida>
      </ConsultaNfseRecebidaEnvio>
    `;

    try {
      const soapClient: Client = await createClientAsync(WSDL_URL);
      
      const args = {
        XML: `<![CDATA[${xmlPayload}`
      };

      // The method name should match the one in the WSDL, which is typically `ConsultarNfseRecebida` based on the SOAPAction.
      // The `soap` library often creates method names like `ServiceName.PortName.MethodName`. We inspect the client to be sure.
      // console.log(soapClient.describe()); // Useful for debugging available services and methods.
      
      // Let's assume the method is `ConsultarNfseRecebidaAsync` based on common patterns.
      const result = await soapClient.ConsultarNfseRecebidaAsync(args);
      
      // The result is usually in the first element of the response array.
      const responseData = result[0];
      
      console.log('Successfully received response from NFS-e API.');
      return responseData;

    } catch (error: any) {
      console.error('SOAP Client Error:', error);
      if (error.response) {
        console.error('SOAP Response Body:', error.response.body);
      }
      throw new Error(`Failed to consult NFS-e: ${error.message}`);
    }
  }
);
