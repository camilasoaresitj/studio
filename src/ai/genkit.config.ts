import { defineConfig } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export default defineConfig({
  plugins: [googleAI()],
  models: {
    'gemini-pro': {
      provider: 'googleai',
      model: 'gemini-1.5-flash-latest',
    },
  },
  defaultModel: 'gemini-pro',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
