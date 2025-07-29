
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
import type { Partner } from '@/lib/partners-data';
import type { Quote } from '@/components/customer-quotes-list';

const CreateEmailCampaignInputSchema = z.object({
  instruction: z.string().describe('The natural language instruction for the email campaign.'),
  partners: z.array(z.any()).describe("A list of all partners (customers)."),
  quotes: z.array(z.any()).describe("A list of all past quotes."),
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

// New function to find relevant clients based on their registered KPIs and quote history
const findRelevantClients = (instruction: string, partners: Partner[], quotes: Quote[]): string[] => {
    const instructionLower = instruction.toLowerCase();
    
    let origin: string | null = null;
    let destination: string | null = null;

    const routeRegex = /(?:de|from)\s+([a-zA-Z\s,]+?)\s+(?:para|to|x)\s+([a-zA-Z\s,]+)/i;
    const match = instructionLower.match(routeRegex);

    if (match && match[1] && match[2]) {
        origin = match[1].trim();
        destination = match[2].trim();
    } else if (instructionLower.includes(' x ')) {
        const parts = instructionLower.split(' x ');
        if (parts.length > 1) {
            const originPart = parts[0].split(' ').pop();
            const destinationPart = parts[1].split(' ')[0];
            if(originPart && destinationPart) {
                origin = originPart.trim();
                destination = destinationPart.trim();
            }
        }
    }

    if (!origin || !destination) {
        console.log("Could not determine route from instruction.");
        return [];
    }

    const originNorm = origin.toLowerCase();
    const destinationNorm = destination.toLowerCase();

    console.log(`Searching for clients on route: ${originNorm} -> ${destinationNorm}`);
    const clientSet = new Set<string>();

    // 1. Search in manually registered KPIs
    partners.forEach(partner => {
        if (partner.roles.cliente && partner.kpi?.manual?.mainRoutes) {
            const hasMatchingRoute = partner.kpi.manual.mainRoutes.some(route => {
                const routeLower = route.toLowerCase();
                return routeLower.includes(originNorm) && routeLower.includes(destinationNorm);
            });
            if (hasMatchingRoute) {
                clientSet.add(partner.name);
            }
        }
    });
    
    // 2. Search in past quotes
    quotes.forEach(quote => {
        const quoteOriginLower = quote.origin.toLowerCase();
        const quoteDestinationLower = quote.destination.toLowerCase();
        
        if(quoteOriginLower.includes(originNorm) && quoteDestinationLower.includes(destinationNorm)) {
            clientSet.add(quote.customer);
        }
    });

    return Array.from(clientSet);
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


const createEmailCampaignFlow = ai.defineFlow(
  {
    name: 'createEmailCampaignFlow',
    inputSchema: CreateEmailCampaignInputSchema,
    outputSchema: CreateEmailCampaignOutputSchema,
  },
  async ({ instruction, partners, quotes }) => {
    
        const targetClients = findRelevantClients(instruction, partners as Partner[], quotes as Quote[]);

        if (targetClients.length === 0) {
            console.log("No specific clients found based on manual KPIs or quote history.");
        }

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
