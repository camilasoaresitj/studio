
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a simulation summary email and WhatsApp message.
 *
 * shareSimulation - A function that generates simulation content for different channels.
 * ShareSimulationInput - The input type for the function.
 * ShareSimulationOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ShareSimulationInputSchema = z.object({
  customerName: z.string().describe('The name of the customer receiving the simulation.'),
  simulationName: z.string().describe('The name of the simulation.'),
  totalCostBRL: z.number().describe('The total final cost of the import in BRL.'),
  simulationLink: z.string().url().describe('The URL the customer will use to view the full simulation.'),
});
export type ShareSimulationInput = z.infer<typeof ShareSimulationInputSchema>;

const ShareSimulationOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the email."),
  emailBody: z.string().describe("The HTML content for the body of the email. It MUST include the primary action link as a styled button."),
  whatsappMessage: z.string().describe("A concise and friendly WhatsApp message with the summary and the primary action link."),
});
export type ShareSimulationOutput = z.infer<typeof ShareSimulationOutputSchema>;

export async function shareSimulation(input: ShareSimulationInput): Promise<ShareSimulationOutput> {
  return shareSimulationFlow(input);
}

const shareSimulationPrompt = ai.definePrompt({
  name: 'shareSimulationPrompt',
  input: { schema: ShareSimulationInputSchema },
  output: { schema: ShareSimulationOutputSchema },
  prompt: `You are an expert logistics assistant. Your task is to create a professional communication to a client sharing a cost simulation. The language must be in Portuguese.

Generate the following based on the input data:

1.  **Email Subject**: "Simulação de Custos de Importação: {{{simulationName}}}"

2.  **Email Body (HTML)**: A well-formatted HTML email.
    - Start with a professional greeting to the client.
    - State that you are sharing the cost simulation as requested.
    - Clearly display the estimated total cost: "Custo Total Estimado: **BRL {{{totalCostBRL}}}**".
    - Include a prominent, nicely styled HTML button (<a href="..." style="...">...</a>) for the user to view the full simulation details online using the \`simulationLink\`. The button text should be "Ver Detalhes da Simulação".
    - End with a professional closing.

3.  **WhatsApp Message**: A concise and friendly message.
    - "Olá {{{customerName}}}! Sua simulação de custos '{{{simulationName}}}' está pronta. O custo total estimado é de R$ {{{totalCostBRL}}}. Veja todos os detalhes no link: {{{simulationLink}}}"

**Input Data:**
- Customer Name: {{{customerName}}}
- Simulation Name: {{{simulationName}}}
- Total Cost (BRL): {{{totalCostBRL}}}
- Simulation Link: {{{simulationLink}}}
`,
});

const shareSimulationFlow = ai.defineFlow(
  {
    name: 'shareSimulationFlow',
    inputSchema: ShareSimulationInputSchema,
    outputSchema: ShareSimulationOutputSchema,
  },
  async (input) => {
    // Format the number to have two decimal places for the prompt
    const formattedInput = {
        ...input,
        totalCostBRL: input.totalCostBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };

    const response = await ai.generate({
      prompt: shareSimulationPrompt,
      input: formattedInput,
    });
    
    const output = response.output;
    if (!output) {
      throw new Error("A IA não conseguiu gerar o conteúdo para compartilhamento.");
    }

    return output;
  }
);
