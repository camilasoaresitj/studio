
'use server';
/**
 * @fileOverview This file defines a Genkit flow to automatically create CRM entries from email content.
 *
 * createCrmEntryFromEmail - A function that processes email content and creates a CRM entry.
 * CreateCrmEntryFromEmailInput - The input type for the createCrmEntryFromEmail function.
 * CreateCrmEntryFromEmailOutput - The return type for the createCrmEntryFromEmail function.
 */

import { defineFlow, generate } from '@genkit-ai/core';
import { definePrompt } from '@genkit-ai/ai';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const CreateCrmEntryFromEmailInputSchema = z.object({
  emailContent: z.string().describe('The complete content of the email.'),
});
export type CreateCrmEntryFromEmailInput = z.infer<typeof CreateCrmEntryFromEmailInputSchema>;

const CreateCrmEntryFromEmailOutputSchema = z.object({
  contactName: z.string().describe('The name of the contact extracted from the email.'),
  companyName: z.string().describe('The company name extracted from the email.'),
  emailAddress: z.string().describe('The email address of the contact.'),
  summary: z.string().describe('A brief summary of the email content.'),
  priority: z.enum(['high', 'medium', 'low']).describe('The priority of the CRM entry based on the email content.'),
});
export type CreateCrmEntryFromEmailOutput = z.infer<typeof CreateCrmEntryFromEmailOutputSchema>;

export async function createCrmEntryFromEmail(input: CreateCrmEntryFromEmailInput): Promise<CreateCrmEntryFromEmailOutput> {
  return createCrmEntryFromEmailFlow(input);
}

const createCrmEntryFromEmailPrompt = definePrompt({
  name: 'createCrmEntryFromEmailPrompt',
  inputSchema: CreateCrmEntryFromEmailInputSchema,
  outputSchema: CreateCrmEntryFromEmailOutputSchema,
  prompt: `You are an AI assistant tasked with analyzing email content and creating CRM entries.
  Your goal is to extract key information from the email and structure it into a CRM entry.

  Analyze the following email content:
  {{{emailContent}}}

  Extract the following information:
  - Contact Name: The name of the person who sent the email.
  - Company Name: The company the contact works for.
  - Email Address: The email address of the contact.
  - Summary: A brief summary of the email content.
  - Priority: Determine the priority of this CRM entry based on the email content. Options are: high, medium, low.

  Return the information in JSON format.
  Ensure that the emailAddress field is a valid email.
  If some information is not available return "unknown".`,
});

const createCrmEntryFromEmailFlow = defineFlow(
  {
    name: 'createCrmEntryFromEmailFlow',
    inputSchema: CreateCrmEntryFromEmailInputSchema,
    outputSchema: CreateCrmEntryFromEmailOutputSchema,
  },
  async (input) => {
    const llmResponse = await generate({
      prompt: createCrmEntryFromEmailPrompt.prompt,
      input: input,
      model: googleAI('gemini-pro'),
      output: {
        schema: CreateCrmEntryFromEmailOutputSchema,
      },
    });
    
    const output = llmResponse.output();
    if (!output) {
      throw new Error("AI failed to generate CRM entry.");
    }
    return output;
  }
);
