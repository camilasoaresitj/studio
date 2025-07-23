
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

import { configureGenkit } from '@genkit-ai/core';

configureGenkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ai = genkit({
    plugins: [googleAI()],
});
