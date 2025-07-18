
import { genkit } from 'genkit';

// This file is imported by all flows.
// It is safe to import in 'use server' files because it does not initialize any plugins.
// The actual plugin initialization is done in `src/ai/dev.ts`, which is only used by the genkit CLI.
export const ai = genkit();
