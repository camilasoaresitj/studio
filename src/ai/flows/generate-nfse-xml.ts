
'use server';
/**
 * @fileOverview A Genkit flow to generate the XML for an NFS-e RPS batch, ready for signing and sending.
 *
 * generateNfseXml - A function that creates the XML string for an RPS.
 * GenerateNfseXmlInput - The input type for the function.
 * GenerateNfseXmlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

const TomadorSchema = z.object({
  cpfCnpj: z.string().describe('O CPF ou CNPJ do tomador do serviço.'),
  razaoSocial: z.string().describe('A razão social do tomador.'),
  endereco: z.string().describe('O endereço do tomador (rua, avenida, etc.).'),
  numero: z.string().describe('O número do endereço.'),
  bairro: z.string().describe('O bairro.'),
  codigoMunicipio: z.string().describe('O código IBGE do município do tomador.'),
  uf: z.string().length(2).describe('A sigla da UF.'),
  cep: z.string().describe('O CEP.'),
});

const ServicoSchema = z.object({
  valorServicos: z.number().describe('O valor total dos serviços.'),
  issRetido: z.enum(['1', '2']).describe('1 para Sim, 2 para Não.'),
  valorIss: z.number().describe('O valor do ISS.'),
  aliquota: z.number().describe('A alíquota do serviço (ex: 0.05 para 5%).'),
  itemListaServico: z.string().describe('O código do item da lista de serviço (ex: 4.02).'),
  discriminacao: z.string().describe('A descrição detalhada do serviço prestado.'),
  codigoMunicipioPrestacao: z.string().describe('O código IBGE do município onde o serviço foi prestado.'),
});

const GenerateNfseXmlInputSchema = z.object({
  prestador: z.object({
    cnpj: z.string().describe('O CNPJ do prestador.'),
    inscricaoMunicipal: z.string().describe('A Inscrição Municipal do prestador.'),
  }),
  rps: z.object({
    numero: z.number().int().positive().describe('O número do RPS.'),
    serie: z.string().default('1').describe('A série do RPS.'),
    tipo: z.enum(['1', '2', '3']).default('1').describe('O tipo do RPS (1-RPS, 2-RPS-M, 3-RPS-C).'),
    loteId: z.number().int().positive().describe('O ID do lote.'),
  }),
  tomador: TomadorSchema,
  servico: ServicoSchema,
  naturezaOperacao: z.string().default('1').describe('O código da natureza da operação. 1 = Tributação no município'),
  optanteSimplesNacional: z.enum(['1', '2']).default('2').describe('Se o prestador é optante pelo Simples Nacional (1-Sim, 2-Não).'),
});
export type GenerateNfseXmlInput = z.infer<typeof GenerateNfseXmlInputSchema>;

const GenerateNfseXmlOutputSchema = z.object({
  xml: z.string().describe('The generated XML string for the EnviarLoteRpsEnvio operation.'),
});
export type GenerateNfseXmlOutput = z.infer<typeof GenerateNfseXmlOutputSchema>;

export async function generateNfseXml(input: GenerateNfseXmlInput): Promise<GenerateNfseXmlOutput> {
  return generateNfseXmlFlow(input);
}

const generateNfseXmlFlow = ai.defineFlow(
  {
    name: 'generateNfseXmlFlow',
    inputSchema: GenerateNfseXmlInputSchema,
    outputSchema: GenerateNfseXmlOutputSchema,
  },
  async (input) => {
    const isCpf = input.tomador.cpfCnpj.length === 11;
    const tomadorCpfCnpjXml = isCpf
      ? `<Cpf>${input.tomador.cpfCnpj}</Cpf>`
      : `<Cnpj>${input.tomador.cpfCnpj}</Cnpj>`;

    const xmlContent = `
<EnviarLoteRpsEnvio xmlns="http://www.publica.inf.br">
  <LoteRps>
    <NumeroLote>${input.rps.loteId}</NumeroLote>
    <Cnpj>${input.prestador.cnpj}</Cnpj>
    <InscricaoMunicipal>${input.prestador.inscricaoMunicipal}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfRps Id="RPS${input.rps.numero}">
          <IdentificacaoRps>
            <Numero>${input.rps.numero}</Numero>
            <Serie>${input.rps.serie}</Serie>
            <Tipo>${input.rps.tipo}</Tipo>
          </IdentificacaoRps>
          <DataEmissao>${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</DataEmissao>
          <NaturezaOperacao>${input.naturezaOperacao}</NaturezaOperacao>
          <OptanteSimplesNacional>${input.optanteSimplesNacional}</OptanteSimplesNacional>
          <IncentivadorCultural>2</IncentivadorCultural>
          <Status>1</Status>
          <Servico>
            <Valores>
              <ValorServicos>${input.servico.valorServicos.toFixed(2)}</ValorServicos>
              <ValorDeducoes>0.00</ValorDeducoes>
              <ValorPis>0.00</ValorPis>
              <ValorCofins>0.00</ValorCofins>
              <ValorInss>0.00</ValorInss>
              <ValorIr>0.00</ValorIr>
              <ValorCsll>0.00</ValorCsll>
              <IssRetido>${input.servico.issRetido}</IssRetido>
              <ValorIss>${input.servico.valorIss.toFixed(2)}</ValorIss>
              <OutrasRetencoes>0.00</OutrasRetencoes>
              <Aliquota>${input.servico.aliquota.toFixed(4)}</Aliquota>
              <DescontoIncondicionado>0.00</DescontoIncondicionado>
              <DescontoCondicionado>0.00</DescontoCondicionado>
            </Valores>
            <ItemListaServico>${input.servico.itemListaServico}</ItemListaServico>
            <CodigoCnae>5250804</CodigoCnae>
            <Discriminacao>${input.servico.discriminacao}</Discriminacao>
            <CodigoMunicipio>${input.servico.codigoMunicipioPrestacao}</CodigoMunicipio>
          </Servico>
          <Prestador>
            <Cnpj>${input.prestador.cnpj}</Cnpj>
            <InscricaoMunicipal>${input.prestador.inscricaoMunicipal}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              <CpfCnpj>
                ${tomadorCpfCnpjXml}
              </CpfCnpj>
            </IdentificacaoTomador>
            <RazaoSocial>${input.tomador.razaoSocial}</RazaoSocial>
            <Endereco>
              <Endereco>${input.tomador.endereco}</Endereco>
              <Numero>${input.tomador.numero}</Numero>
              <Bairro>${input.tomador.bairro}</Bairro>
              <CodigoMunicipio>${input.tomador.codigoMunicipio}</CodigoMunicipio>
              <Uf>${input.tomador.uf}</Uf>
              <Cep>${input.tomador.cep}</Cep>
            </Endereco>
          </Tomador>
        </InfRps>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>
    `.trim();

    return {
      xml: xmlContent,
    };
  }
);
