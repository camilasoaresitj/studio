
'use server';
/**
 * @fileOverview Monitors emails for operational or financial tasks and sends reminders until completion.
 *
 * - monitorEmailForTasks - A function that monitors emails for tasks and sends reminders.
 * - MonitorEmailForTasksInput - The input type for the monitorEmailForTasks function.
 * - MonitorEmailForTasksOutput - The return type for the monitorEmailForTasks function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MonitorEmailForTasksInputSchema = z.object({
  emailContent: z.string().describe('The content of the email to monitor.'),
  emailSubject: z.string().describe('The subject of the email.'),
  sender: z.string().email().describe('The email address of the sender.'),
});
export type MonitorEmailForTasksInput = z.infer<typeof MonitorEmailForTasksInputSchema>;

const MonitorEmailForTasksOutputSchema = z.object({
  taskDetected: z.boolean().describe('Whether a task was detected in the email.'),
  taskDescription: z.string().describe('A description of the task detected, if any.'),
  isOperational: z.boolean().describe('Whether the task is operational.'),
  isFinancial: z.boolean().describe('Whether the task is financial.'),
  reminderNeeded: z.boolean().describe('Whether a reminder should be sent.'),
});
export type MonitorEmailForTasksOutput = z.infer<typeof MonitorEmailForTasksOutputSchema>;

export async function monitorEmailForTasks(input: MonitorEmailForTasksInput): Promise<MonitorEmailForTasksOutput> {
  return monitorEmailForTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'monitorEmailForTasksPrompt',
  input: { schema: MonitorEmailForTasksInputSchema },
  output: { schema: MonitorEmailForTasksOutputSchema },
  prompt: `You are an AI assistant that monitors emails for operational or financial tasks.

  Analyze the email content and subject to identify potential tasks. Determine if a task is present, and if so, classify it as operational, financial, or both.

  Based on your analysis, determine if a reminder is needed. Consider factors such as urgency, deadlines, and the presence of explicit requests for action.

  Email Subject: {{{emailSubject}}}
  Email Content: {{{emailContent}}}
  Sender: {{{sender}}}

  Output your findings in JSON format.
  `,
});

const monitorEmailForTasksFlow = ai.defineFlow(
  {
    name: 'monitorEmailForTasksFlow',
    inputSchema: MonitorEmailForTasksInputSchema,
    outputSchema: MonitorEmailForTasksOutputSchema,
  },
  async input => {
    const llmResponse = await ai.generate({
      prompt: prompt,
      input,
      model: 'gemini-pro',
    });

    const output = llmResponse.output();
    if (!output) {
      throw new Error("AI failed to generate task analysis.");
    }
    return output;
  }
);
