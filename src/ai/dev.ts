
import { config } from 'dotenv';
config({ path: `.env.local`, override: true });
config();

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// IMPORTANT: Do NOT import any flows here. Genkit finds them automatically.
// Importing them directly creates a dependency chain that Next.js's "use server"
// directive does not allow, causing the "invalid-use-server-value" error.

export default genkit({
  plugins: [
    googleAI({
      project: 'cargainteligente-lxhac',
      location: 'us-central1',
    }),
  ],
  model: 'gemini-2.0-flash-001',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
