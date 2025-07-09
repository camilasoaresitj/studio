import { config } from 'dotenv';
config();

import '@/ai/flows/create-crm-entry-from-email.ts';
import '@/ai/flows/monitor-email-for-tasks.ts';
import '@/ai/flows/get-freight-rates.ts';
import '@/ai/flows/extract-rates-from-text.ts';
import '@/ai/flows/send-quote.ts';
import '@/ai/flows/request-agent-quote.ts';
import '@/ai/flows/extract-partner-info.ts';
import '@/ai/flows/get-ship-schedules.ts';
import '@/ai/flows/generate-quote-pdf-html.ts';
import '@/ai/flows/extract-quote-details-from-text.ts';
import '@/ai/flows/get-tracking-info.ts';
import '@/ai/flows/get-booking-info.ts';
