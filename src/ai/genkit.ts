import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { genkit, Genkit } from '@genkit-ai/core';

// This file is imported by all flows.
// It is safe to import in 'use server' files.

let aiInstance: Genkit;

function initializeAI() {
    if (aiInstance) {
        return aiInstance;
    }
    
    aiInstance = genkit({
        plugins: [googleAI()],
        models: {
            'gemini-pro': {
                path: 'gemini-1.5-flash-latest',
            },
        },
        defaultModel: 'gemini-pro',
    });
    return aiInstance;
}

export const ai = initializeAI();
