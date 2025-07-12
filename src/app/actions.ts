
'use server'

import { detectCarrierFromBooking } from "@/ai/flows/detect-carrier-from-booking";
import { createCrmEntryFromEmail } from "@/ai/flows/create-crm-entry-from-email";
import { extractPartnerInfo } from "@/ai/flows/extract-partner-info";
import { extractQuoteDetailsFromText } from "@/ai/flows/extract-quote-details-from-text";
import { extractRatesFromText } from "@/ai/flows/extract-rates-from-text";
import { generateQuotePdfHtml } from "@/ai/flows/generate-quote-pdf-html";
import { generateAgentInvoiceHtml } from "@/ai/flows/generate-agent-invoice-html";
import { getFreightRates } from "@/ai/flows/get-freight-rates";
import { monitorEmailForTasks } from "@/ai/flows/monitor-email-for-tasks";
import { requestAgentQuote } from "@/ai/flows/request-agent-quote";
import { sendQuote } from "@/ai/flows/send-quote";
import { getVesselSchedules } from "@/ai/flows/get-ship-schedules";
import { getFlightSchedules } from "@/ai/flows/get-flight-schedules";
import { sendShippingInstructions } from "@/ai/flows/send-shipping-instructions";
import { getCourierStatus } from "@/ai/flows/get-courier-status";
import { getTrackingInfo } from "@/ai/flows/get-tracking-info";
import { getShipments, updateShipment } from "@/lib/shipment";
import { consultNfseItajai } from "@/ai/flows/consult-nfse-itajai";
import { sendDemurrageInvoice } from "@/ai/flows/send-demurrage-invoice";
import { generateNfseXml } from "@/ai/flows/generate-nfse-xml";
import { sendToLegal } from "@/ai/flows/send-to-legal";
import { getFinancialEntries, addFinancialEntry } from "@/lib/financials-data";
import type { Shipment } from "@/lib/shipment";
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message";


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

export async function runSendWhatsapp(to: string, message: string) {
    try {
        const output = await sendWhatsappMessage({ to, message });
        return { success: true, data: output };
    } catch (error: any) {
        console.error("WhatsApp Send Action Failed", error);
        return { success: false, error: error.message || "Failed to send WhatsApp message" };
    }
}

export async function runGenerateClientInvoicePdf(input: any) {
  try {
    const output = await generateQuotePdfHtml(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGenerateAgentInvoicePdf(input: any) {
  try {
    const output = await generateAgentInvoiceHtml(input);
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

export async function runConsultNfse(input: any) {
    try {
        const data = await consultNfseItajai(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Consult NFS-e Action Failed", error);
        return { success: false, error: error.message || "Failed to consult NFS-e" };
    }
}

export async function runSendDemurrageInvoice(input: any) {
    try {
        const data = await sendDemurrageInvoice(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Send Demurrage Invoice Action Failed", error);
        return { success: false, error: error.message || "Failed to send demurrage invoice" };
    }
}

export async function runGenerateNfseXml(input: any) {
    try {
        const data = await generateNfseXml(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Generate NFS-e XML Action Failed", error);
        return { success: false, error: error.message || "Failed to generate XML" };
    }
}

export async function runSendToLegal(input: any) {
    try {
        const data = await sendToLegal(input);
        // Here you would also generate the attachments and send the email
        // For now, we just return the generated content
        return { success: true, data };
    } catch (error: any) {
        console.error("Send to Legal Action Failed", error);
        return { success: false, error: error.message || "Failed to send to legal" };
    }
}
