// src/ai/genkit.ts
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { dotprompt } from '@genkit-ai/dotprompt';

// Initialize Genkit with plugins
export const ai = genkit({
  plugins: [
    googleAI(),
    dotprompt(),
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
