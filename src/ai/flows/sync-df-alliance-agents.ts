'use server';
/**
 * @fileOverview Extracts agent data from the DF Alliance directory website.
 *
 * - syncDFAgents - A function that fetches and parses agent data.
 * - DFAgent - The return type for a single agent.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { syncPrompt } from './syncPrompt';

// This is a simplified schema for what we can reliably extract from the directory page.
// The frontend will be responsible for mapping this to the full Partner schema.
const DFAgentSchema = z.object({
  name: z.string().describe('The full company name of the agent.'),
  country: z.string().describe('The country where the agent is located.'),
  website: z.string().url().describe('The full URL of the agent\'s website.'),
});
export type DFAgent = z.infer<typeof DFAgentSchema>;

const SyncDFAgentsOutputSchema = z.object({ agents: z.array(DFAgentSchema) });
export type SyncDFAgentsOutput = z.infer<typeof SyncDFAgentsOutputSchema>;

const syncDFAgentsFlow = ai.defineFlow(
  {
    name: 'syncDFAgentsFlow',
    inputSchema: z.void(),
    outputSchema: z.array(DFAgentSchema),
  },
  async () => {
    const llmResponse = await ai.generate({
      prompt: syncPrompt,
      model: 'gemini-pro',
    });
    
    const output = llmResponse.output();
    if (!output?.agents) {
      throw new Error('AI failed to extract any agent information from the directory.');
    }
    return output.agents;
  }
);


export async function syncDFAgents(): Promise<DFAgent[]> {
  return syncDFAgentsFlow();
}
