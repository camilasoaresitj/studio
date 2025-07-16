
'use server'

import { detectCarrierFromBooking } from "@/ai/flows/detect-carrier-from-booking";
import { createCrmEntryFromEmail } from "@/ai/flows/create-crm-entry-from-email";
import { extractPartnerInfo } from "@/ai/flows/extract-partner-info";
import { extractQuoteDetailsFromText } from "@/ai/flows/extract-quote-details-from-text";
import { extractRatesFromText } from "@/ai/flows/extract-rates-from-text";
import { generateQuotePdfHtml } from "@/ai/flows/generate-quote-pdf-html";
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
import { updateShipment, ChatMessage, createShipment } from "@/lib/shipment-data";
import type { BLDraftData, Shipment } from '@/lib/shipment-data';
import { consultNfseItajai } from "@/ai/flows/consult-nfse-itajai";
import { sendDemurrageInvoice } from "@/ai/flows/send-demurrage-invoice";
import { generateNfseXml } from "@/ai/flows/generate-nfse-xml";
import { sendToLegal } from "@/ai/flows/send-to-legal";
import { getFinancialEntries, addFinancialEntry } from "@/lib/financials-data";
import type { PartialPayment } from '@/components/financials/financial-page-client';
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message";
import { createEmailCampaign } from "@/ai/flows/create-email-campaign";
import type { Partner } from "@/lib/partners-data";
import type { Quote } from "@/components/customer-quotes-list";
import { getTrackingInfo } from '@/ai/flows/get-tracking-info';
import { sendDraftApprovalRequest } from "@/ai/flows/send-draft-approval-request";
import { format } from 'date-fns';
import { updateShipmentInTracking } from "@/ai/flows/update-shipment-in-tracking";
import { getRouteMap } from "@/ai/flows/get-route-map";
import { getShipments } from "@/lib/shipment-data";


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

export async function fetchShipmentForDraft(id: string): Promise<{ success: boolean; data?: Shipment; error?: string }> {
  try {
    const allShipments = getShipments();
    const data = allShipments.find(s => s.id === id);
    if (data) {
      return { success: true, data };
    } else {
      return { success: false, error: 'Embarque não encontrado. Verifique o link ou contate o suporte.' };
    }
  } catch (error: any) {
    console.error(`Error fetching shipment for draft with ID ${id}:`, error);
    return { success: false, error: 'Ocorreu um erro inesperado ao buscar os dados do embarque.' };
  }
}

export async function submitBLDraft(shipment: Shipment, draftData: BLDraftData, isLate: boolean) {
    if (!shipment) {
        return { success: false, error: 'Objeto de embarque não fornecido.' };
    }

    // Update main shipment fields with draft data
    shipment.blDraftData = draftData;
    shipment.blType = draftData.blType;
    shipment.commodityDescription = draftData.descriptionOfGoods;
    shipment.ncms = draftData.ncms;
    
    // Update container data from draft
    shipment.containers = draftData.containers.map((draftContainer, index) => {
        const existingContainer = shipment.containers?.[index] || {};
        return {
            ...existingContainer,
            ...draftContainer,
            id: existingContainer?.id || `container-${index}`,
            type: existingContainer?.type || 'DRY',
        };
    });
    
    // Manage draft history
    const draftHistory = shipment.blDraftHistory || { sentAt: null, revisions: [] };
    const isFirstSubmission = !draftHistory.sentAt;

    if (isFirstSubmission) {
        draftHistory.sentAt = new Date();
    } else {
        const lateRevision = isLate 
            ? { cost: 150, currency: 'USD' as const }
            : undefined;
        draftHistory.revisions.push({
            date: new Date(),
            lateFee: lateRevision
        });
    }
    shipment.blDraftHistory = draftHistory;
    
    // Create new milestone/task for operational team
    const taskName = isFirstSubmission ? 'Enviar Draft MBL ao armador' : `[REVISÃO] Enviar Draft MBL ao armador`;

     const sendToCarrierMilestone = {
        name: taskName,
        status: 'pending' as const,
        predictedDate: new Date(),
        effectiveDate: null,
        details: `Verificar draft do cliente e enviar ao armador. ${isLate ? 'Revisão tardia com custo.' : ''}`,
    };

    shipment.milestones.push(sendToCarrierMilestone);
    
    // Add late fee as a charge if applicable
    if (isLate) {
        const lateFeeCharge = {
            id: `late-fee-${Date.now()}`,
            name: 'Taxa de Alteração de Draft Fora do Prazo',
            type: 'Fixo',
            cost: 150,
            costCurrency: 'USD' as const,
            sale: 150,
            saleCurrency: 'USD' as const,
            supplier: shipment.carrier || 'Armador a Confirmar',
            sacado: shipment.customer,
            approvalStatus: 'aprovada' as const,
        };
        shipment.charges.push(lateFeeCharge);
    }
    
     // Update the "Draft HBL" document status
    const draftDocIndex = shipment.documents.findIndex(doc => doc.name === 'Draft HBL');
    if (draftDocIndex > -1) {
        shipment.documents[draftDocIndex].status = 'uploaded';
        shipment.documents[draftDocIndex].fileName = `HBL-DRAFT-${shipment.id}.pdf`;
        shipment.documents[draftDocIndex].uploadedAt = new Date();
    }

    // Add a system message to the chat
    const chatMessage = {
        sender: 'Sistema' as const,
        message: `O cliente enviou o Draft do HBL. Operacional, favor verificar e enviar ao armador. ${isLate ? 'Este envio foi feito após o deadline e gerou custo de correção.' : ''}`,
        timestamp: new Date().toISOString(),
        department: 'Operacional' as const,
    };

    shipment.chatMessages = [...(shipment.chatMessages || []), chatMessage];
    
    updateShipment(shipment);
    
    return { success: true, data: shipment };
}

export async function updateShipmentFromAgent(id: string, data: any) {
    const allShipments = getShipments();
    let shipment = allShipments.find(s => s.id === id);
    if (!shipment) {
        return { success: false, error: 'Embarque não encontrado.' };
    }

    shipment.bookingNumber = data.bookingNumber;
    shipment.vesselName = data.vesselVoyage.split('/')[0]?.trim();
    shipment.voyageNumber = data.vesselVoyage.split('/')[1]?.trim();
    shipment.etd = data.etd;
    shipment.eta = data.eta;
    
    // Update milestones
    const updateMilestone = (name: string, newDate: Date | undefined) => {
        const index = shipment!.milestones.findIndex(m => m.name.toLowerCase().includes(name.toLowerCase()));
        if (index > -1 && newDate) {
            shipment!.milestones[index].predictedDate = newDate;
            shipment!.milestones[index].status = 'pending';
        }
    };

    updateMilestone('embarque', data.etd);
    updateMilestone('chegada', data.eta);
    updateMilestone('cut off documental', data.docsCutoff);
    
    // Add agreed rate as a charge
    const rateValue = parseFloat(data.rateAgreed.replace(/[^0-9.]/g, '')) || 0;
    const currency = data.rateAgreed.toUpperCase().includes('USD') ? 'USD' : 'BRL';
    
    const freightCharge = {
        id: `agent-freight-${Date.now()}`,
        name: 'FRETE INTERNACIONAL (Custo Agente)',
        type: 'Fixo',
        cost: rateValue,
        costCurrency: currency as 'USD' | 'BRL',
        sale: rateValue, // Initially sale = cost
        saleCurrency: currency as 'USD' | 'BRL',
        supplier: shipment.agent?.name || 'Agente a Confirmar',
        sacado: shipment.customer,
        approvalStatus: 'aprovada' as const,
    };
    shipment.charges.push(freightCharge);
    
    updateShipment(shipment);
    return { success: true, data: shipment };
}

export async function sendChatMessage(shipment: Shipment, message: Omit<ChatMessage, 'timestamp'>) {
  if (!shipment || !shipment.id) {
    return { success: false, error: 'Objeto de embarque inválido fornecido.' };
  }

  const newMessage: ChatMessage = {
    ...message,
    timestamp: new Date().toISOString(),
  };
  
  const updatedShipment = {
      ...shipment,
      chatMessages: [...(shipment.chatMessages || []), newMessage],
  };
  
  updateShipment(updatedShipment);
  
  return { success: true, data: updatedShipment };
}

export async function createEmailCampaign(instruction: string, partners: Partner[], quotes: Quote[]) {
    try {
        const data = await createEmailCampaign({ instruction, partners, quotes });
        return { success: true, data };
    } catch (error: any) {
        console.error("Create Email Campaign Action Failed", error);
        return { success: false, error: error.message || "Failed to create email campaign" };
    }
}
