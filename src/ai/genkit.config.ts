
import { defineConfig } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export default defineConfig({
  plugins: [googleAI()],
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
