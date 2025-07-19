
'use server';
/**
 * @fileOverview A utility to detect the carrier from a booking or BL number using rule-based logic.
 *
 * detectCarrierFromBooking - A function that returns the probable carrier.
 */
import { z } from 'zod';

const carrierPatterns: { carrier: string; pattern: RegExp }[] = [
    { carrier: 'Maersk', pattern: /^\d{9}$/ }, // Maersk: 9 digits exactly
    { carrier: 'Maersk', pattern: /^MAEU/i },
    { carrier: 'MSC', pattern: /^MSCU/i },
    { carrier: 'Hapag-Lloyd', pattern: /^\d{10}$/ }, // Hapag-Lloyd: 10 digits exactly
    { carrier: 'Hapag-Lloyd', pattern: /^HLCU/i },
    { carrier: 'CMA CGM', pattern: /^(CMDU|CGM)/i },
    { carrier: 'Evergreen', pattern: /^EGLV/i },
    { carrier: 'COSCO', pattern: /^COSU/i },
    { carrier: 'ONE', pattern: /^ONEY/i },
    { carrier: 'ZIM', pattern: /^ZIMU/i },
    { carrier: 'Yang Ming', pattern: /^YMLU/i },
    { carrier: 'HMM', pattern: /^HDMU/i },
    { carrier: 'OOCL', pattern: /^OOLU/i },
];

export async function detectCarrierFromBooking(input: { bookingNumber: string }): Promise<{ carrier: string }> {
  const bookingNumber = input.bookingNumber.trim().toUpperCase();

  for (const { carrier, pattern } of carrierPatterns) {
    if (pattern.test(bookingNumber)) {
      return { carrier };
    }
  }

  return { carrier: 'Unknown' };
}
