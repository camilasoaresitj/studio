import { config } from 'dotenv';
config();

import '@/ai/flows/create-crm-entry-from-email.ts';
import '@/ai/flows/monitor-email-for-tasks.ts';
import '@/ai/flows/get-freight-rates.ts';
