'use server';

import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt } from '@genkit-ai/dotprompt';

configureGenkit({
  plugins: [
    googleAI(),
    dotprompt,
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
