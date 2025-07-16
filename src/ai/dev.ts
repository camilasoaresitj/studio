
'use server';
import { config } from 'dotenv';
config();

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY || '' })],
  model: 'googleai/gemini-2.0-flash',
});

import '@/ai/flows/create-crm-entry-from-email.ts';
import '@/ai/flows/monitor-email-for-tasks.ts';
import '@/ai/flows/get-freight-rates.ts';
import '@/ai/flows/extract-rates-from-text.ts';
import '@/ai/flows/send-quote.ts';
import '@/ai/flows/request-agent-quote.ts';
import '@/ai/flows/extract-partner-info.ts';
import '@/ai/flows/get-ship-schedules.ts';
import '@/ai/flows/get-flight-schedules.ts';
import '@/ai/flows/generate-quote-pdf-html.ts';
import '@/ai/flows/extract-quote-details-from-text.ts';
import '@/ai/flows/get-tracking-info.ts';
import '@/ai/flows/get-booking-info.ts';
import '@/ai/flows/detect-carrier-from-booking.ts';
import '@/ai/flows/send-shipping-instructions.ts';
import '@/ai/flows/get-courier-status.ts';
import '@/ai/flows/consult-nfse-itajai.ts';
import '@/ai/flows/send-demurrage-invoice.ts';
import '@/ai/flows/generate-nfse-xml.ts';
import '@/ai/flows/generate-agent-invoice-html.ts';
import '@/ai/flows/send-to-legal.ts';
import '@/ai/flows/send-whatsapp-message.ts';
import '@/ai/flows/generate-hbl-html.ts';
import '@/ai/flows/create-email-campaign.ts';
import '@/ai/flows/get-courier-rates.ts';
import '@/ai/flows/send-draft-approval-request.ts';

