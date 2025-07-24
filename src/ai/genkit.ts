import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI(),
  ],
  models: {
    'gemini-pro': 'googleai/gemini-1.5-flash-latest',
    'gemini-pro-vision': 'googleai/gemini-1.5-pro-latest',
  },
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
