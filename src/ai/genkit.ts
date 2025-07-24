
'use server';

import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { genkit as ai } from '@genkit-ai/core';

configureGenkit({
  plugins: [
    googleAI(),
  ],
  models: {
    'gemini-pro': {
      model: 'gemini-2.5-flash-lite',
    },
    'gemini-pro-vision': {
      model: 'gemini-2.5-pro',
    },
  },
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { ai };
