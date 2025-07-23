
import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
    plugins: [googleAI({
      apiVersion: "v1beta",
    })],
});
