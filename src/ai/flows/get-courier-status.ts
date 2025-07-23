
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a simulated courier tracking status.
 *
 * getCourierStatus - A function that generates a plausible last tracking status.
 * GetCourierStatusInput - The input type for the function.
 * GetCourierStatusOutput - The return type for the function.
 */
import { ai } from '@/ai/genkit';
import { GetCourierStatusInputSchema, GetCourierStatusOutputSchema } from '@/lib/schemas';
import type { GetCourierStatusInput, GetCourierStatusOutput } from '@/lib/schemas';

export async function getCourierStatus(input: GetCourierStatusInput): Promise<GetCourierStatusOutput> {
  return getCourierStatusFlow(input);
}

const getCourierStatusPrompt = ai.definePrompt({
  name: 'getCourierStatusPrompt',
  inputSchema: GetCourierStatusInputSchema,
  outputSchema: GetCourierStatusOutputSchema,
  prompt: `You are a logistics AI assistant that simulates real-time courier tracking.
Given a courier name and a tracking number, generate a single, plausible, and realistic last known status for the shipment.

**Examples of realistic statuses:**
- "Shipment has been picked up by a DHL courier."
- "In transit to the destination sort facility in MIAMI, FL."
- "Out for delivery."
- "Customs clearance process is underway."
- "Delivery attempted, recipient not available."
- "Shipment has arrived at the local distribution center."

**Instructions:**
- The status must be a single, concise sentence.
- The status should sound like it came directly from the courier's tracking website.
- Do NOT mention that this is a simulation.
- Generate a different, unique status each time.

**Courier:** {{{courier}}}
**Tracking Number:** {{{trackingNumber}}}
`,
});

const getCourierStatusFlow = ai.defineFlow(
  {
    name: 'getCourierStatusFlow',
    inputSchema: GetCourierStatusInputSchema,
    outputSchema: GetCourierStatusOutputSchema,
  },
  async input => {
    const llmResponse = await ai.generate({
      model: 'gemini-pro',
      prompt: {
        ...getCourierStatusPrompt,
        input
      }
    });
    
    const output = llmResponse.output();
    if (!output) {
      throw new Error("AI failed to generate status.");
    }
    return output;
  }
);
