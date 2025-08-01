import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  telemetry: {
    instrumentation: {
      enabled: process.env.NODE_ENV !== 'development',
    },
    enabled: process.env.NODE_ENV !== 'development',
  }
});
