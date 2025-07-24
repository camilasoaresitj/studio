import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  models: {
    'gemini-pro': 'gemini-2.5-flash-lite',
    'gemini-pro-vision': 'gemini-2.5-pro',
  },
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
