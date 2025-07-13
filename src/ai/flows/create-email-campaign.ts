
'use server';
/**
 * @fileOverview A Genkit flow to create a targeted email campaign from a natural language instruction.
 *
 * createEmailCampaign - A function that parses an instruction, finds relevant clients, and drafts an email.
 * CreateEmailCampaignInput - The input type for the function.
 * CreateEmailCampaignOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ShipmentSchema = z.object({
  id: z.string(),
  origin: z.string(),
  destination: z.string(),
  customer: z.string(),
});

const QuoteSchema = z.object({
  id: z.string(),
  origin: z.string(),
  destination: z.string(),
  customer: z.string(),
});

const CreateEmailCampaignInputSchema = z.object({
  instruction: z.string().describe('The natural language instruction for the email campaign.'),
  shipments: z.array(ShipmentSchema).describe('A list of all past shipments.'),
  quotes: z.array(QuoteSchema).describe('A list of all past quotes.'),
});
export type CreateEmailCampaignInput = z.infer<typeof CreateEmailCampaignInputSchema>;

const CreateEmailCampaignOutputSchema = z.object({
  clients: z.array(z.string()).describe('A list of client names that match the campaign criteria.'),
  emailSubject: z.string().describe('The generated subject line for the promotional email.'),
  emailBody: z.string().describe('The generated HTML body for the promotional email.'),
});
export type CreateEmailCampaignOutput = z.infer<typeof CreateEmailCampaignOutputSchema>;

export async function createEmailCampaign(input: CreateEmailCampaignInput): Promise<CreateEmailCampaignOutput> {
  return createEmailCampaignFlow(input);
}

const findRelevantClients = (instruction: string, shipments: z.infer<typeof ShipmentSchema>[], quotes: z.infer<typeof QuoteSchema>[]): string[] => {
    const instructionLower = instruction.toLowerCase();
    
    // Naive extraction of origin and destination.
    const fromMatch = instructionLower.match(/de ([\w\s,]+) para|from ([\w\s,]+) to/);
    const toMatch = instructionLower.match(/para ([\w\s,]+)|to ([\w\s,]+) oferecendo/);

    if (!fromMatch || !toMatch) {
        return []; // Cannot determine route
    }

    const origin = (fromMatch[1] || fromMatch[2]).trim();
    const destination = (toMatch[1] || toMatch[2]).trim();

    if (!origin || !destination) {
        return [];
    }

    const clientSet = new Set<string>();

    // Search in shipments
    shipments.forEach(shipment => {
        const shipmentOrigin = shipment.origin.toLowerCase();
        const shipmentDestination = shipment.destination.toLowerCase();
        
        if (shipmentOrigin.includes(origin) && shipmentDestination.includes(destination)) {
            clientSet.add(shipment.customer);
        }
    });

    // Search in quotes
    quotes.forEach(quote => {
        const quoteOrigin = quote.origin.toLowerCase();
        const quoteDestination = quote.destination.toLowerCase();
        
        if (quoteOrigin.includes(origin) && quoteDestination.includes(destination)) {
            clientSet.add(quote.customer);
        }
    });


    return Array.from(clientSet);
}


const createEmailCampaignFlow = ai.defineFlow(
  {
    name: 'createEmailCampaignFlow',
    inputSchema: CreateEmailCampaignInputSchema,
    outputSchema: CreateEmailCampaignOutputSchema,
  },
  async ({ instruction, shipments, quotes }) => {
    
    const targetClients = findRelevantClients(instruction, shipments, quotes);

    if (targetClients.length === 0) {
        // Even if no clients are found, we can still generate a template email.
        console.log("No specific clients found, generating a generic email template.");
    }
    
    const emailPrompt = ai.definePrompt({
        name: 'generateCampaignEmailPrompt',
        input: { schema: z.object({ instruction: z.string() }) },
        output: { schema: z.object({ emailSubject: z.string(), emailBody: z.string() }) },
        prompt: `You are a marketing expert for a freight forwarding company called "CargaInteligente".
        
        Based on the following instruction, generate a professional and persuasive promotional email in Brazilian Portuguese.
        The email should be friendly, clear, and highlight the special offer.
        Start with a generic greeting like "Olá," as this will be sent in bulk.
        Make sure the body is valid HTML.

        **Instruction:**
        {{{instruction}}}

        **Example Output:**
        {
            "emailSubject": "Oferta Especial: Frete de Shanghai para Santos!",
            "emailBody": "<p>Olá,</p><p>Temos uma excelente notícia para suas importações da China! Recebemos uma tarifa especial e por tempo limitado para a rota <strong>Shanghai x Santos</strong>.</p><p><strong>Apenas USD 5200.00 por contêiner de 40'HC!</strong></p><p>Esta é uma oportunidade única para garantir um frete competitivo para suas próximas cargas. Entre em contato conosco para mais detalhes e para garantir sua reserva.</p><p>Atenciosamente,<br>Equipe CargaInteligente</p>"
        }
        `
    });

    const { output } = await emailPrompt({ instruction });

    if (!output) {
      throw new Error('AI failed to generate email content.');
    }

    return {
      clients: targetClients,
      emailSubject: output.emailSubject,
      emailBody: output.emailBody,
    };
  }
);
