'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DFAgentSchema = z.object({
  name: z.string().describe('The full company name of the agent.'),
  country: z.string().describe('The country where the agent is located.'),
  website: z.string().url().describe('The full URL of the agent\'s website.'),
});

const SyncDFAgentsOutputSchema = z.object({ agents: z.array(DFAgentSchema) });

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

// Define a prompt that uses the tool to get the page content and then parses it.
export const syncPrompt = ai.definePrompt({
    name: 'syncDFAgentsPrompt',
    output: { schema: SyncDFAgentsOutputSchema },
    tools: [fetchDirectoryPageContent],
    prompt: `You are an expert data extraction AI. Your task is to extract all freight forwarder agent details from the provided HTML content of the DF Alliance directory.

First, call the \`fetchDirectoryPageContent\` tool to get the HTML.

Then, carefully analyze the HTML structure to find the repeating blocks of HTML that represent each agent listing. For each agent, extract the following information:
-   **Company Name:** This is the most prominent heading for each agent.
-   **Country:** This is typically a link associated with the agent's location.
-   **Website:** Find the URL from the button or link for the agent's website.

Return a JSON object with a single key "agents" which contains an array where each object represents one agent and contains the extracted 'name', 'country', and 'website'. Be thorough and extract all agents from the page. Do not invent information.

**Example of expected JSON output:**
\`\`\`json
{
  "agents": [
    {
      "name": "Example Agent Inc.",
      "country": "Exampleland",
      "website": "https://www.example.com"
    },
    {
      "name": "Another Agent Co.",
      "country": "Testland",
      "website": "https://www.another.com"
    }
  ]
}
\`\`\`

Return an empty array [] in the "agents" key if no agents can be extracted.
`,
});
