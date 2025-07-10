
'use server'

import { detectCarrierFromBooking } from "@/ai/flows/detect-carrier-from-booking";
import { createCrmEntryFromEmail } from "@/ai/flows/create-crm-entry-from-email";
import { extractPartnerInfo } from "@/ai/flows/extract-partner-info";
import { extractQuoteDetailsFromText } from "@/ai/flows/extract-quote-details-from-text";
import { extractRatesFromText } from "@/ai/flows/extract-rates-from-text";
import { generateQuotePdfHtml } from "@/ai/flows/generate-quote-pdf-html";
import { getFreightRates } from "@/ai/flows/get-freight-rates";
import { monitorEmailForTasks } from "@/ai/flows/monitor-email-for-tasks";
import { requestAgentQuote } from "@/ai/flows/request-agent-quote";
import { sendQuote } from "@/ai/flows/send-quote";
import { getVesselSchedules } from "@/ai/flows/get-ship-schedules";
import { getFlightSchedules } from "@/ai/flows/get-flight-schedules";
import { sendShippingInstructions } from "@/ai/flows/send-shipping-instructions";
import { getCourierStatus } from "@/ai/flows/get-courier-status";
import { getTrackingInfo } from "@/ai/flows/get-tracking-info";


export async function runGetFreightRates(input: any) {
    try {
        const data = await getFreightRates(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Freight Rates Action Failed", error);
        return { success: false, error: error.message || "Failed to run flow" };
    }
}

export async function runRequestAgentQuote(input: any, partners: any[]) {
    try {
        const agents = partners.filter(p => p.roles.agente);
        if (agents.length === 0) {
            return { success: false, error: "Nenhum agente cadastrado." };
        }

        for (const agent of agents) {
            const agentInput = {
                ...input,
                agentName: agent.name,
                agentEmail: agent.contacts[0].email, // Assuming first contact is primary
            };
            await requestAgentQuote(agentInput);
        }

        return { success: true, agentsContacted: agents };
    } catch (error: any) {
        console.error("Request Agent Quote Action Failed", error);
        return { success: false, error: error.message || "Failed to run flow" };
    }
}


export async function runSendQuote(input: any) {
  try {
    const output = await sendQuote(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGenerateQuotePdfHtml(input: any) {
  try {
    const output = await generateQuotePdfHtml(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGetTrackingInfo(input: any) {
  try {
    const output = await getTrackingInfo(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed for getTrackingInfo", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runDetectCarrier(trackingNumber: string) {
    try {
        const data = await detectCarrierFromBooking({ bookingNumber: trackingNumber });
        return { success: true, data };

    } catch (error: any) {
        console.error("Carrier Detection Failed", error);
        return { success: false, error: error.message || "Failed to detect carrier" };
    }
}

export async function runGetCourierStatus(input: any) {
    try {
        const data = await getCourierStatus(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Courier Status Fetch Failed", error);
        return { success: false, error: error.message || "Failed to fetch courier status" };
    }
}

export async function runExtractPartnerInfo(textInput: string) {
  try {
    const data = await extractPartnerInfo({ textInput });
    return { success: true, data };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runSendShippingInstructions(input: any) {
  try {
    const data = await sendShippingInstructions(input);
    return { success: true, data };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runExtractRatesFromText(textInput: string) {
    try {
        const data = await extractRatesFromText({ textInput });
        return { success: true, data };
    } catch (error: any) {
        console.error("Extract Rates Action Failed", error);
        return { success: false, error: error.message || "Failed to extract rates" };
    }
}

export async function runExtractQuoteDetailsFromText(textInput: string) {
    try {
        const data = await extractQuoteDetailsFromText({ textInput });
        return { success: true, data };
    } catch (error: any) {
        console.error("Extract Quote Details Action Failed", error);
        return { success: false, error: error.message || "Failed to extract details" };
    }
}


export async function runGetVesselSchedules(input: { origin: string, destination: string }) {
    try {
        const data = await getVesselSchedules(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Get Vessel Schedules Action Failed", error);
        return { success: false, error: error.message || "Failed to get schedules" };
    }
}

export async function runGetFlightSchedules(input: { origin: string, destination: string }) {
    try {
        const data = await getFlightSchedules(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Get Flight Schedules Action Failed", error);
        return { success: false, error: error.message || "Failed to get schedules" };
    }
}

export async function runCreateCrmEntry(emailContent: string) {
    try {
        const data = await createCrmEntryFromEmail({ emailContent });
        return { success: true, data };
    } catch (error: any) {
        console.error("Create CRM Entry Action Failed", error);
        return { success: false, error: error.message || "Failed to create CRM entry" };
    }
}

export async function runMonitorTasks(emailSubject: string, emailContent: string, sender: string) {
    try {
        const data = await monitorEmailForTasks({ emailSubject, emailContent, sender });
        return { success: true, data };
    } catch (error: any) {
        console.error("Monitor Tasks Action Failed", error);
        return { success: false, error: error.message || "Failed to monitor tasks" };
    }
}
