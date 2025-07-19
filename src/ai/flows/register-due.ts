/**
 * @fileOverview A Genkit flow to simulate the registration of a DUE with Portal Único.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DueItemSchema = z.object({
  ncm: z.string().describe('NCM code for the item.'),
  description: z.string().describe('Description of the item.'),
  quantity: z.number().describe('Quantity of the item in the specified unit.'),
  unit: z.string().describe('Statistical unit of the item (e.g., "UN", "KG").'),
  valueUSD: z.number().describe('Total value of the items in this addition (FOB USD).'),
});

export const RegisterDueInputSchema = z.object({
  exporterCnpj: z.string().describe('CNPJ of the exporter.'),
  declarantCnpj: z.string().describe('CNPJ of the declarant (customs broker).'),
  invoiceNumber: z.string().describe('The Commercial Invoice number.'),
  hblNumber: z.string().describe('The House Bill of Lading number.'),
  totalValueUSD: z.number().describe('Total value of the goods in USD.'),
  items: z.array(DueItemSchema).describe('List of items in the DUE.'),
});
export type RegisterDueInput = z.infer<typeof RegisterDueInputSchema>;

export const RegisterDueOutputSchema = z.object({
  success: z.boolean().describe('Whether the registration was successful.'),
  dueNumber: z.string().describe('The generated DUE number.'),
  message: z.string().describe('A message from the simulated API.'),
});
export type RegisterDueOutput = z.infer<typeof RegisterDueOutputSchema>;

export const registerDueFlow = ai.defineFlow(
  {
    name: 'registerDueFlow',
    inputSchema: RegisterDueInputSchema,
    outputSchema: RegisterDueOutputSchema,
  },
  async (input) => {
    // Simulate API call to Portal Único Siscomex
    console.log("Simulating DUE registration with Portal Único for exporter:", input.exporterCnpj);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency

    const generatedDueNumber = `24BR${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // In a real scenario, you would handle potential errors from the API.
    // Here, we just return a success message.
    return {
      success: true,
      dueNumber: generatedDueNumber,
      message: 'DUE registrada com sucesso no Portal Único Siscomex.',
    };
  }
);
