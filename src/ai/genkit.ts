
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The AI object is configured in dev.ts to ensure env variables are loaded first.
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY || '' })],
  model: 'googleai/gemini-2.0-flash',
});
