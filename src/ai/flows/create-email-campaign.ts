
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
    
    // Improved regex to capture origin and destination more reliably
    // It looks for "de/from [ORIGIN] para/to [DESTINATION]" or "[ORIGIN] x [DESTINATION]"
    const routeRegex = /(?:de|from)\s+([\w\s,]+?)\s+(?:para|to)|([\w\s,]+?)\s*x\s*([\w\s,]+)/;
    const match = instructionLower.match(routeRegex);

    let origin: string | null = null;
    let destination: string | null = null;
    
    if (match) {
        // Handle "from ORIGIN to DESTINATION" pattern
        if (match[1]) {
            const toMatch = instructionLower.match(/(?:para|to)\s+([\w\s,]+)/);
            if (toMatch) {
                origin = match[1].trim();
                destination = toMatch[1].trim();
            }
        }
        // Handle "ORIGIN x DESTINATION" pattern
        else if (match[2] && match[3]) {
            origin = match[2].trim();
            destination = match[3].trim();
        }
    }

    if (!origin || !destination) {
        console.log("Could not determine route from instruction.");
        return []; // Cannot determine route
    }

    // Normalize by taking the first significant part of the location name
    const originNorm = origin.split(',')[0].trim();
    const destinationNorm = destination.split(',')[0].trim();

    console.log(`Searching for clients on route: ${originNorm} -> ${destinationNorm}`);
    const clientSet = new Set<string>();

    // Search in shipments
    shipments.forEach(shipment => {
        const shipmentOrigin = shipment.origin.toLowerCase();
        const shipmentDestination = shipment.destination.toLowerCase();
        
        if (shipmentOrigin.includes(originNorm) && shipmentDestination.includes(destinationNorm)) {
            clientSet.add(shipment.customer);
        }
    });

    // Search in quotes
    quotes.forEach(quote => {
        const quoteOrigin = quote.origin.toLowerCase();
        const quoteDestination = quote.destination.toLowerCase();
        
        if (quoteOrigin.includes(originNorm) && quoteDestination.includes(destinationNorm)) {
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
