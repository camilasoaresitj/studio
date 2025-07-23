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
    
    // Correct way to configure genkit for defining flows in a Next.js app
    configureGenkit({
        plugins: [googleAI()],
        logLevel: 'debug',
        enableTracingAndMetrics: true,
    });
    
    // The 'ai' object is used to define flows, prompts, etc.
    aiInstance = {
        defineFlow: genkit.defineFlow,
        definePrompt: genkit.definePrompt,
        defineTool: genkit.defineTool,
        generate: genkit.generate,
        // Add other genkit functions you use here
    } as any; // Cast as any to simplify the object creation

    return aiInstance;
}

// Re-exporting `ai` object for use in flows.
// This pattern ensures genkit is configured once.
export const ai = initializeAI();
