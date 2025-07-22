
import { dotprompt } from '@genkit-ai/dotprompt';
import { googleAI } from '@genkit-ai/googleai';

// This file is imported by all flows.
// It is safe to import in 'use server' files because it does not initialize any plugins.
// The actual plugin initialization is done in `src/ai/dev.ts`, which is only used by the genkit CLI.
export const ai = dotprompt({
    plugins: [googleAI()],
    model: 'gemini-1.5-flash-latest',
});
