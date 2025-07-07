'use server';

import { createCrmEntryFromEmail, CreateCrmEntryFromEmailOutput } from '@/ai/flows/create-crm-entry-from-email';
import { monitorEmailForTasks, MonitorEmailForTasksOutput } from '@/ai/flows/monitor-email-for-tasks';
import { getFreightRates, GetFreightRatesInput, GetFreightRatesOutput } from '@/ai/flows/get-freight-rates';
import { extractRatesFromText, ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';
import { sendQuote, SendQuoteInput, SendQuoteOutput } from '@/ai/flows/send-quote';


export async function runCreateCrmEntry(emailContent: string): Promise<{ success: true; data: CreateCrmEntryFromEmailOutput } | { success: false; error: string }> {
  try {
    const result = await createCrmEntryFromEmail({ emailContent });
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error };
  }
}

export async function runMonitorTasks(
  emailSubject: string,
  emailContent: string,
  sender: string
): Promise<{ success: true; data: MonitorEmailForTasksOutput } | { success: false; error: string }> {
  try {
    const result = await monitorEmailForTasks({ emailSubject, emailContent, sender });
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error };
  }
}

export async function runGetFreightRates(
  data: GetFreightRatesInput
): Promise<{ success: true; data: GetFreightRatesOutput } | { success: false; error: string }> {
  try {
    const result = await getFreightRates(data);
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error };
  }
}

export async function runExtractRatesFromText(
  textInput: string
): Promise<{ success: true; data: ExtractRatesFromTextOutput } | { success: false; error: string }> {
  try {
    const result = await extractRatesFromText({ textInput });
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error };
  }
}

export async function runSendQuote(
  input: SendQuoteInput
): Promise<{ success: true; data: SendQuoteOutput } | { success: false; error: string }> {
  try {
    const result = await sendQuote(input);
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while generating the quote.';
    return { success: false, error };
  }
}
