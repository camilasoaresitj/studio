
'use server';
/**
 * @fileOverview Extracts agent data from the DF Alliance directory website.
 *
 * - syncDFAgents - A function that fetches and parses agent data.
 * - DFAgent - The return type for a single agent.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// This is a simplified schema for what we can reliably extract from the directory page.
// The frontend will be responsible for mapping this to the full Partner schema.
const DFAgentSchema = z.object({
  name: z.string().describe('The full company name of the agent.'),
  country: z.string().describe('The country where the agent is located.'),
  website: z.string().url().describe('The full URL of the agent\'s website.'),
});
export type DFAgent = z.infer<typeof DFAgentSchema>;

const SyncDFAgentsOutputSchema = z.array(DFAgentSchema);
export type SyncDFAgentsOutput = z.infer<typeof SyncDFAgentsOutputSchema>;

// Tool to fetch the raw HTML content from the directory URL.
const fetchDirectoryPageContent = ai.defineTool(
    {
        name: 'fetchDirectoryPageContent',
        description: 'Fetches the HTML content of the DF Alliance directory page. The directory URL is fixed and known.',
        inputSchema: z.void(),
        outputSchema: z.string(),
    },
    async () => {
        try {
            const response = await fetch('https://www.df-alliance.com/directory', {
                 headers: {
                    // Set a realistic User-Agent to avoid being blocked.
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            return html;
        } catch (error) {
            console.error('Failed to fetch directory page:', error);
            throw new Error('Could not retrieve the directory content. The website may be down or blocking requests.');
        }
    }
);


const syncDFAgentsFlow = ai.defineFlow(
  {
    name: 'syncDFAgentsFlow',
    inputSchema: z.void(),
    outputSchema: SyncDFAgentsOutputSchema,
  },
  async () => {
    // Define a prompt that uses the tool to get the page content and then parses it.
    const syncPrompt = ai.definePrompt({
        name: 'syncDFAgentsPrompt',
        tools: [fetchDirectoryPageContent],
        output: { schema: SyncDFAgentsOutputSchema },
        prompt: `You are an expert data extraction AI. Your task is to extract all freight forwarder agent details from the provided HTML content of the DF Alliance directory.

First, call the \`fetchDirectoryPageContent\` tool to get the HTML.

Then, carefully analyze the HTML structure. You will find each agent within elements with the class 'jet-listing-grid__item'. Inside each item, extract the following information:
-   **Company Name:** Found within an 'h5' tag with the class 'elementor-heading-title'.
-   **Country:** Found within an 'a' tag with 'jet-listing-dynamic-terms__link' class. It's the text content of the link.
-   **Website:** Found in the 'href' attribute of an 'a' tag with the class 'elementor-button-link'.

Return an array of JSON objects, where each object represents an agent and contains the extracted 'name', 'country', and 'website'. Be thorough and extract all agents from the page. Do not invent information.
`,
    });

    const { output } = await syncPrompt();
    if (!output) {
      throw new Error('AI failed to extract any agent information from the directory.');
    }
    return output;
  }
);


export async function syncDFAgents(): Promise<SyncDFAgentsOutput> {
  return syncDFAgentsFlow();
}
