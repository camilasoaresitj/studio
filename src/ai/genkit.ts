
import { genkit, configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: "v1beta",
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ai = genkit({
    plugins: [googleAI({
      apiVersion: "v1beta",
    })],
});
