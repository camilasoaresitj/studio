
'use server'

import { detectCarrierFromBooking } from "@/ai/flows/detect-carrier-from-booking";
import { createCrmEntryFromEmail } from "@/ai/flows/create-crm-entry-from-email";
import { extractPartnerInfo } from "@/ai/flows/extract-partner-info";
import { extractQuoteDetailsFromText } from "@/ai/flows/extract-quote-details-from-text";
import { extractRatesFromText } from "@/ai/flows/extract-rates-from-text";
import { generateQuotePdfHtml } from "@/ai/flows/generate-quote-pdf-html";
import { generateClientInvoiceHtml } from "@/ai/flows/generate-client-invoice-html";
import { generateAgentInvoiceHtml } from "@/ai/flows/generate-agent-invoice-html";
import { generateHblHtml } from "@/ai/flows/generate-hbl-html";
import { getFreightRates, getAirFreightRates } from "@/ai/flows/get-freight-rates";
import { getCourierRates } from "@/ai/flows/get-courier-rates";
import { monitorEmailForTasks } from "@/ai/flows/monitor-email-for-tasks";
import { requestAgentQuote } from "@/ai/flows/request-agent-quote";
import { sendQuote } from "@/ai/flows/send-quote";
import { getVesselSchedules } from "@/ai/flows/get-ship-schedules";
import { getFlightSchedules } from "@/ai/flows/get-flight-schedules";
import { sendShippingInstructions } from "@/ai/flows/send-shipping-instructions";
import { getCourierStatus } from "@/ai/flows/get-courier-status";
import { consultNfseItajai } from "@/ai/flows/consult-nfse-itajai";
import { sendDemurrageInvoice } from "@/ai/flows/send-demurrage-invoice";
import { generateNfseXml } from "@/ai/flows/generate-nfse-xml";
import { sendToLegal } from "@/ai/flows/send-to-legal";
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message";
import { createEmailCampaign } from "@/ai/flows/create-email-campaign";
import type { Partner } from "@/lib/partners-data";
import type { Quote } from "@/components/customer-quotes-list";
import { getTrackingInfo } from "@/ai/flows/get-tracking-info";
import { updateShipmentInTracking } from "@/ai/flows/update-shipment-in-tracking";
import { getRouteMap } from "@/ai/flows/get-route-map";
import { getShipments, saveShipments, updateShipment as updateShipmentClient } from "@/lib/shipment";
import type { Shipment, BLDraftData, Milestone, QuoteCharge, ChatMessage, BLDraftHistory, BLDraftRevision } from "@/lib/shipment-data";
import { isPast } from "date-fns";
import { generateDiXml } from '@/ai/flows/generate-di-xml';
import { registerDue } from '@/ai/flows/register-due';
import { generateDiXmlFromSpreadsheet } from '@/ai/flows/generate-di-xml-from-spreadsheet';
import { extractInvoiceItems } from '@/ai/flows/extract-invoice-items';
import { getNcmRates } from '@/ai/flows/get-ncm-rates';
import type { ExtractInvoiceItemsOutput } from '@/lib/schemas/invoice';


export async function runGetFreightRates(input: any) {
    try {
        let data;
        if (input.modal === 'air') {
            data = await getAirFreightRates(input);
        } else {
            data = await getFreightRates(input);
        }
        return { success: true, data };
    } catch (error: any) {
        console.error("Freight Rates Action Failed", error);
        return { success: false, error: error.message || "Failed to run flow" };
    }
}

export async function runGetCourierRates(input: any) {
    try {
        const data = await getCourierRates(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Courier Rates Action Failed", error);
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

export async function runGenerateQuotePdf(input: any) {
  try {
    const output = await generateQuotePdfHtml(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGenerateClientInvoicePdf(input: any) {
  try {
    const output = await generateClientInvoiceHtml(input);
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

export async function runGenerateHblPdf(input: any) {
  try {
    const output = await generateHblHtml(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGetTrackingInfo(input: { trackingNumber: string, carrier: string }) {
  try {
    const output = await getTrackingInfo(input);
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed for getTrackingInfo", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runUpdateShipmentInTracking(input: any) {
    try {
        const output = await updateShipmentInTracking(input);
        return { success: true, data: output };
    } catch (error: any) {
        console.error("Server Action Failed for updateShipmentInTracking", error);
        return { success: false, error: error.message || "Failed to run flow" };
    }
}

export async function runGetRouteMap(shipmentNumber: string) {
    try {
        const data = await getRouteMap({ shipmentNumber });
        return { success: true, data };
    } catch (error: any) {
        console.error("Get Route Map Action Failed", error);
        return { success: false, error: error.message || "Failed to get route map" };
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

export async function runCreateEmailCampaign(instruction: string, partners: Partner[], quotes: Quote[]) {
    try {
        const data = await createEmailCampaign({ instruction, partners, quotes });
        return { success: true, data };
    } catch (error: any) {
        console.error("Create Email Campaign Action Failed", error);
        return { success: false, error: error.message || "Failed to create email campaign" };
    }
}

export async function submitBLDraft(shipmentId: string, draftData: BLDraftData): Promise<{ success: boolean; data?: Shipment[]; error?: string }> {
  try {
    const allShipments = getShipments();
    const shipmentIndex = allShipments.findIndex(s => s.id === shipmentId);
    if (shipmentIndex === -1) {
        throw new Error("Shipment not found");
    }

    let updatedShipment = { ...allShipments[shipmentIndex] };
    const now = new Date();
    
    updatedShipment.blDraftData = draftData;
    updatedShipment.blType = draftData.blType;
    updatedShipment.milestones = updatedShipment.milestones || [];
    updatedShipment.charges = updatedShipment.charges || [];

    const history: BLDraftHistory = updatedShipment.blDraftHistory || { sentAt: null, revisions: [] };
    const hasSentDraftBefore = !!history.sentAt;
    
    const docsCutoffMilestone = updatedShipment.milestones.find(m => m.name.toLowerCase().includes('documental'));
    const docsCutoffDate = docsCutoffMilestone?.predictedDate ? new Date(docsCutoffMilestone.predictedDate) : null;
    const isLateSubmission = docsCutoffDate ? isPast(docsCutoffDate) : false;

    if (!hasSentDraftBefore) {
        history.sentAt = now;
        const taskName = 'Enviar Draft MBL ao armador';
        const taskAlreadyExists = updatedShipment.milestones.some(m => m.name === taskName);
        if (!taskAlreadyExists) {
            updatedShipment.milestones.push({
                name: taskName,
                status: 'pending',
                predictedDate: now,
                effectiveDate: null,
                details: `Draft inicial recebido do cliente ${updatedShipment.customer}.`
            });
        }
    } else {
        const newRevision: BLDraftRevision = { date: now };
        if (isLateSubmission) {
            const lateFeeCharge: QuoteCharge = {
                id: `late-fee-${Date.now()}`,
                name: "TAXA DE CORREÇÃO DE BL",
                type: 'Fixo',
                cost: 150,
                costCurrency: 'USD',
                sale: 150,
                saleCurrency: 'USD',
                supplier: 'CargaInteligente',
                sacado: updatedShipment.customer,
                approvalStatus: 'aprovada',
            };
            
            if (!updatedShipment.charges.some(c => c.name === "TAXA DE CORREÇÃO DE BL")) {
                 updatedShipment.charges.push(lateFeeCharge);
            }
           
            newRevision.lateFee = { cost: 150, currency: 'USD' };
        }
        history.revisions.push(newRevision);
        
        const revisionTaskName = '[REVISÃO] Enviar Draft MBL ao armador';
        const revisionTaskExists = updatedShipment.milestones.some(m => m.name === revisionTaskName && m.status !== 'completed');
        if (!revisionTaskExists) {
             updatedShipment.milestones.push({
                name: revisionTaskName,
                status: 'pending',
                predictedDate: now,
                effectiveDate: null,
                details: `Revisão do draft recebida do cliente ${updatedShipment.customer}.`
            });
        }
    }
    
    updatedShipment.blDraftHistory = history;
    
    updatedShipment.milestones.sort((a,b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime());

    allShipments[shipmentIndex] = updatedShipment;
    saveShipments(allShipments);
    return { success: true, data: allShipments };
  } catch (error: any) {
    console.error("Submit BL Draft Action Failed", error);
    return { success: false, error: error.message || "Failed to submit BL Draft" };
  }
}

export async function updateShipmentFromAgent(shipmentId: string, agentData: any): Promise<{ success: boolean, error?: string }> {
    try {
        const shipments = getShipments();
        const shipmentIndex = shipments.findIndex(s => s.id === shipmentId);

        if (shipmentIndex === -1) {
            throw new Error("Embarque não encontrado.");
        }
        
        const shipment = shipments[shipmentIndex];

        const updatedShipment = {
            ...shipment,
            bookingNumber: agentData.bookingNumber,
            vesselName: agentData.vesselVoyage.split('/')[0]?.trim(),
            voyageNumber: agentData.vesselVoyage.split('/')[1]?.trim(),
            etd: agentData.etd,
            eta: agentData.eta,
            milestones: shipment.milestones.map(m => {
                const mName = m.name.toLowerCase();
                if (mName.includes('booking confirmado')) return { ...m, status: 'completed' as const, effectiveDate: new Date() };
                if (mName.includes('embarque')) return { ...m, predictedDate: agentData.etd };
                if (mName.includes('chegada')) return { ...m, predictedDate: agentData.eta };
                if (mName.includes('cut off documental')) return { ...m, predictedDate: agentData.docsCutoff || m.predictedDate };
                return m;
            }),
        };

        shipments[shipmentIndex] = updatedShipment;
        saveShipments(shipments);
        
        return { success: true };

    } catch (error: any) {
        console.error("Update from Agent failed", error);
        return { success: false, error: error.message || "Falha ao atualizar embarque." };
    }
}

export async function addManualMilestone(shipmentId: string, milestone: Omit<Milestone, 'status' | 'effectiveDate'>) {
    try {
        const allShipments = getShipments();
        const shipmentIndex = allShipments.findIndex(s => s.id === shipmentId);

        if (shipmentIndex === -1) {
            throw new Error('Embarque não encontrado.');
        }
        
        const shipment = allShipments[shipmentIndex];

        const newMilestone: Milestone = {
            ...milestone,
            status: 'pending',
            effectiveDate: null,
        };

        const updatedShipment = {
            ...shipment,
            milestones: [...(shipment.milestones || []), newMilestone].sort((a,b) => new Date(a.predictedDate).getTime() - new Date(b.predictedDate).getTime()),
        };

        allShipments[shipmentIndex] = updatedShipment;
        saveShipments(allShipments);
        return { success: true, data: updatedShipment };

    } catch (error: any) {
        console.error("Add Manual Milestone Action Failed", error);
        return { success: false, error: error.message || "Failed to add milestone" };
    }
}

export async function runGenerateDiXml(input: any) {
    try {
        const data = await generateDiXml(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Generate DI XML Action Failed", error);
        return { success: false, error: error.message || "Failed to generate DI XML" };
    }
}

export async function runRegisterDue(input: any) {
    try {
        const data = await registerDue(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Register DUE Action Failed", error);
        return { success: false, error: error.message || "Failed to register DUE" };
    }
}

export async function runGenerateDiXmlFromSpreadsheet(input: any) {
    try {
        const data = await generateDiXmlFromSpreadsheet(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Generate DI XML From Spreadsheet Action Failed", error);
        return { success: false, error: error.message || "Failed to generate DI XML" };
    }
}

export async function runExtractInvoiceItems(input: { fileName: string, fileDataUri: string }): Promise<ExtractInvoiceItemsOutput> {
    try {
        const result = await extractInvoiceItems(input);
        if (!result.success) {
            // Rethrow the error from the flow to be caught by the component
            throw new Error(result.error || 'Unknown error occurred during item extraction.');
        }
        return result;
    } catch (error: any) {
        console.error("Extract Invoice Items Action Failed:", error);
        return { success: false, data: [], error: error.message || "Failed to extract items" };
    }
}

export async function runGetNcmRates(ncm: string) {
    try {
        const data = await getNcmRates({ ncm });
        return { success: true, data };
    } catch (error: any) {
        console.error("Get NCM Rates Action Failed", error);
        return { success: false, error: error.message || "Failed to get NCM rates" };
    }
}
