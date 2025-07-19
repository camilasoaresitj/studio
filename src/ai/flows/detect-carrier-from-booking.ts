
'use server';
/**
 * @fileOverview A Genkit flow to detect the carrier from a booking or BL number.
 *
 * detectCarrierFromBooking - A function that returns the probable carrier.
 * DetectCarrierFromBookingInput - The input type for the function.
 * DetectCarrierFromBookingOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DetectCarrierFromBookingInputSchema = z.object({
  bookingNumber: z.string().describe('The booking or Bill of Lading number.'),
});
type DetectCarrierFromBookingInput = z.infer<typeof DetectCarrierFromBookingInputSchema>;

const DetectCarrierFromBookingOutputSchema = z.object({
  carrier: z.string().describe('The most likely carrier name (e.g., Maersk, MSC, Hapag-Lloyd). Return "Unknown" if not identifiable.'),
});
type DetectCarrierFromBookingOutput = z.infer<typeof DetectCarrierFromBookingOutputSchema>;

export async function detectCarrierFromBooking(input: DetectCarrierFromBookingInput): Promise<DetectCarrierFromBookingOutput> {
  return detectCarrierFromBookingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectCarrierFromBookingPrompt',
  input: { schema: DetectCarrierFromBookingInputSchema },
  output: { schema: DetectCarrierFromBookingOutputSchema },
  prompt: `You are an expert in logistics and freight forwarding. Your task is to identify the shipping carrier based on the format of the provided Booking Number or Bill of Lading (BL) number.

Analyze the following number and determine the carrier.

**Common Carrier Prefixes and Formats:**
- **Maersk:** Starts with numbers (e.g., 254285462) or "MAEU".
- **MSC:** Starts with "MSCU".
- **Hapag-Lloyd:** Often a long numeric string, or starts with "HLCU".
- **CMA CGM:** Starts with "CMDU" or "CGM".
- **Evergreen:** Starts with "EGLV".
- **COSCO:** Starts with "COSU".
- **ONE (Ocean Network Express):** Starts with "ONEY".
- **ZIM:** Starts with "ZIMU".
- **Yang Ming:** Starts with "YMLU".
- **HMM (Hyundai Merchant Marine):** Starts with "HDMU".
- **OOCL:** Starts with "OOLU".

**Additional Rules and Examples:**
- A purely numeric booking number with 9 digits, like "255372222", is from **Maersk**.
- A purely numeric booking number with 10 digits is from **Hapag-Lloyd**.
- Pay close attention to the length of numeric booking numbers to differentiate between carriers.

Based on these patterns and your knowledge, identify the single most likely carrier. If the carrier is not identifiable from this list or your knowledge, return "Unknown".

Booking/BL Number: {{{bookingNumber}}}
`,
});

const detectCarrierFromBookingFlow = ai.defineFlow(
  {
    name: 'detectCarrierFromBookingFlow',
    inputSchema: DetectCarrierFromBookingInputSchema,
    outputSchema: DetectCarrierFromBookingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
