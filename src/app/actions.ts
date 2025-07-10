
'use server';

import { createCrmEntryFromEmail, CreateCrmEntryFromEmailOutput } from '@/ai/flows/create-crm-entry-from-email';
import { monitorEmailForTasks, MonitorEmailForTasksOutput } from '@/ai/flows/monitor-email-for-tasks';
import { getFreightRates, GetFreightRatesInput, GetFreightRatesOutput } from '@/ai/flows/get-freight-rates';
import { extractRatesFromText, ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';
import { sendQuote, SendQuoteInput, SendQuoteOutput } from '@/ai/flows/send-quote';
import { requestAgentQuote, RequestAgentQuoteInput, RequestAgentQuoteOutput } from '@/ai/flows/request-agent-quote';
import { extractPartnerInfo, ExtractPartnerInfoOutput } from '@/ai/flows/extract-partner-info';
import { getVesselSchedules, GetVesselSchedulesInput, GetVesselSchedulesOutput } from '@/ai/flows/get-ship-schedules';
import { getFlightSchedules, GetFlightSchedulesInput, GetFlightSchedulesOutput } from '@/ai/flows/get-flight-schedules';
import { generateQuotePdfHtml, GenerateQuotePdfHtmlInput, GenerateQuotePdfHtmlOutput } from '@/ai/flows/generate-quote-pdf-html';
import { extractQuoteDetailsFromText, ExtractQuoteDetailsFromTextOutput } from '@/ai/flows/extract-quote-details-from-text';
import { getTrackingInfo, GetTrackingInfoOutput } from '@/ai/flows/get-tracking-info';
import { getBookingInfo } from '@/ai/flows/get-booking-info';
import { detectCarrierFromBooking } from '@/ai/flows/detect-carrier-from-booking';
import type { Partner } from '@/components/partners-registry';
import type { Shipment } from '@/lib/shipment';

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

export async function runRequestAgentQuote(
  input: RequestAgentQuoteInput,
  partners: Partner[]
): Promise<{ success: true; data: RequestAgentQuoteOutput; agentsContacted: string[] } | { success: false; error: string }> {
  try {
    const isImportToBrazil = input.destination.toUpperCase().includes('BR') && !input.origin.toUpperCase().includes('BR');

    if (!isImportToBrazil) {
      return { success: false, error: "A cotação com agentes está habilitada apenas para embarques de importação para o Brasil." };
    }

    const agents = partners.filter(p => p.roles.agente);
    if (agents.length === 0) {
        return { success: false, error: "Nenhum parceiro com perfil de 'Agente' cadastrado no sistema." };
    }
    
    const agentContacts = agents.flatMap(a => a.contacts.map(c => c.email)).filter(Boolean);
     if (agentContacts.length === 0) {
        return { success: false, error: "Nenhum e-mail de contato encontrado para os agentes cadastrados." };
    }

    const result = await requestAgentQuote(input);

    console.log(`SIMULATING EMAILING AGENTS. TO: ${agentContacts.join(', ')}`);
    console.log(`SUBJECT: ${result.emailSubject}`);
    console.log('--- BODY ---');
    console.log(result.emailBody);
    console.log('--- END BODY ---');

    return { success: true, data: result, agentsContacted: agentContacts };

  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { success: false, error };
  }
}

export async function runExtractPartnerInfo(
  textInput: string
): Promise<{ success: true; data: ExtractPartnerInfoOutput } | { success: false; error: string }> {
  try {
    const result = await extractPartnerInfo({ textInput });
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while extracting partner info.';
    return { success: false, error };
  }
}

export async function runGetVesselSchedules(
  input: GetVesselSchedulesInput
): Promise<{ success: true; data: GetVesselSchedulesOutput } | { success: false; error: string }> {
  try {
    const result = await getVesselSchedules(input);
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while fetching schedules.';
    return { success: false, error };
  }
}

export async function runGetFlightSchedules(
  input: GetFlightSchedulesInput
): Promise<{ success: true; data: GetFlightSchedulesOutput } | { success: false; error: string }> {
  try {
    const result = await getFlightSchedules(input);
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while fetching schedules.';
    return { success: false, error };
  }
}

export async function runGenerateQuotePdfHtml(
  input: GenerateQuotePdfHtmlInput
): Promise<{ success: true; data: GenerateQuotePdfHtmlOutput } | { success: false; error: string }> {
  try {
    const result = await generateQuotePdfHtml(input);
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while generating the PDF HTML.';
    return { success: false, error };
  }
}

export async function runExtractQuoteDetailsFromText(
  textInput: string
): Promise<{ success: true; data: ExtractQuoteDetailsFromTextOutput } | { success: false; error: string }> {
  try {
    const result = await extractQuoteDetailsFromText({ textInput });
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while extracting quote details.';
    return { success: false, error };
  }
}

export async function runGetTrackingInfo(
  trackingNumber: string
): Promise<{ success: true; data: GetTrackingInfoOutput } | { success: false; error: string }> {
  try {
    const result = await getTrackingInfo({ trackingNumber });
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while fetching tracking info.';
    return { success: false, error };
  }
}

export async function runGetBookingInfo(
  bookingNumber: string,
  existingShipment: Shipment
): Promise<{ success: true; data: Shipment } | { success: false; error: string }> {
  try {
    const { carrier } = await detectCarrierFromBooking({ bookingNumber });
    const result = (await getBookingInfo({ bookingNumber, carrier, existingShipment })) as Shipment;
    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    const error = e instanceof Error ? e.message : 'An unknown error occurred while fetching booking info.';
    return { success: false, error };
  }
}
