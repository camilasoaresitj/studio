import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';

// This file is imported by all flows.
// It is safe to import in 'use server' files.

export const ai = genkit({
    plugins: [googleAI()],
    models: {
        'gemini-pro': {
            path: 'gemini-1.5-flash-latest',
        },
    },
    defaultModel: 'gemini-pro',
});
