'use server';

import { createCrmEntryFromEmail, CreateCrmEntryFromEmailOutput } from '@/ai/flows/create-crm-entry-from-email';
import { monitorEmailForTasks, MonitorEmailForTasksOutput } from '@/ai/flows/monitor-email-for-tasks';

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
