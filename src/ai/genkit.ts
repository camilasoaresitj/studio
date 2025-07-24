
'use server';

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  models: {
    'gemini-pro': {
      model: 'gemini-1.5-flash-latest',
    },
    'gemini-pro-vision': {
      model: 'gemini-1.5-pro-latest',
    },
  },
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
