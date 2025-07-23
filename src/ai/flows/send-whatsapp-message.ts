
'use server';
/**
 * @fileOverview This file defines a Genkit flow to send a WhatsApp message using Twilio.
 *
 * sendWhatsappMessage - A function that sends a message.
 * SendWhatsappMessageInput - The input type for the function.
 * SendWhatsappMessageOutput - The return type for the function.
 */

import { defineFlow } from '@genkit-ai/core';
import { z } from 'zod';
import { Twilio } from 'twilio';

const SendWhatsappMessageInputSchema = z.object({
  to: z.string().describe('The recipient phone number in E.164 format (e.g., +5511999999999).'),
  message: z.string().describe('The content of the message to send.'),
});
export type SendWhatsappMessageInput = z.infer<typeof SendWhatsappMessageInputSchema>;

const SendWhatsappMessageOutputSchema = z.object({
  sid: z.string().describe('The unique SID of the message from Twilio.'),
  status: z.string().describe('The status of the message sending process.'),
});
export type SendWhatsappMessageOutput = z.infer<typeof SendWhatsappMessageOutputSchema>;

export async function sendWhatsappMessage(input: SendWhatsappMessageInput): Promise<SendWhatsappMessageOutput> {
  return sendWhatsappMessageFlow(input);
}

const sendWhatsappMessageFlow = defineFlow(
  {
    name: 'sendWhatsappMessageFlow',
    inputSchema: SendWhatsappMessageInputSchema,
    outputSchema: SendWhatsappMessageOutputSchema,
  },
  async ({ to, message }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials are not configured in the environment variables (.env). Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.');
    }
    
    // The Twilio helper library automatically adds 'whatsapp:' prefix for WhatsApp numbers
    const client = new Twilio(accountSid, authToken);

    try {
      const response = await client.messages.create({
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${to}`,
        body: message,
      });

      console.log(`WhatsApp message sent successfully with SID: ${response.sid}`);

      return {
        sid: response.sid,
        status: 'success',
      };
    } catch (error: any) {
      console.error('Twilio API Error:', error);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }
);
