
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
import { sendShippingInstructions } from "@/ai/flows/send-shipping-instructions";
import { getCourierStatus } from "@/ai/flows/get-courier-status";
import { consultNfseItajai } from "@/ai/flows/consult-nfse-itajai";
import { sendDemurrageInvoice } from "@/ai/flows/send-demurrage-invoice";
import { generateNfseXml } from "@/ai/flows/generate-nfse-xml";
import { sendToLegal } from "@/ai/flows/send-to-legal";
import { sendWhatsappMessage } from "@/ai/flows/send-whatsapp-message";
import { createEmailCampaign } from "@/ai/flows/create-email-campaign";
import type { Partner } from "@/lib/partners-data";
import { getPartners } from "@/lib/partners-data";
import type { Quote } from "@/components/customer-quotes-list";
import { getShipments, saveShipments } from "@/lib/shipment-data";
import { isPast, format, addDays } from "date-fns";
import { generateDiXmlFlow } from '@/ai/flows/generate-di-xml';
import type { GenerateDiXmlInput, GenerateDiXmlOutput } from '@/ai/flows/generate-di-xml';
import { registerDueFlow } from '@/ai/flows/register-due';
import type { RegisterDueInput, RegisterDueOutput } from '@/ai/flows/register-due';
import { generateDiXmlFromSpreadsheet } from "@/ai/flows/generate-di-xml-from-spreadsheet";
import { extractInvoiceItems } from "@/ai/flows/extract-invoice-items";
import { getNcmRates } from "@/ai/flows/get-ncm-rates";
import type { ExtractInvoiceItemsOutput, ExtractInvoiceItemsInput } from '@/lib/schemas/invoice';
import type { Shipment, BLDraftData, Milestone, QuoteCharge, ChatMessage, BLDraftHistory, BLDraftRevision, UploadedDocument, DocumentStatus, ShipmentCreationData } from "@/lib/shipment-data";
import { shareSimulation } from '@/ai/flows/share-simulation';
import { generateSimulationPdfHtml } from '@/ai/flows/generate-simulation-pdf-html';
import { getRouteMap } from '@/ai/flows/get-route-map';


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

export async function runGenerateQuotePdfHtml(input: any) {
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

export async function runDetectCarrier(trackingNumber: string) {
    try {
        const data = await detectCarrierFromBooking({ bookingNumber: trackingNumber });
        return { success: true, data };

    } catch (error: any) {
        console.error("Carrier Detection Failed", error);
        return { success: false, error: error.message || "Failed to detect carrier" };
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

export async function runSubmitBLDraft(shipmentId: string, draftData: BLDraftData): Promise<{ success: boolean; data?: Shipment[]; error?: string }> {
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
    updatedShipment.documents = updatedShipment.documents || [];

    const history: BLDraftHistory = updatedShipment.blDraftHistory || { sentAt: null, revisions: [] };
    const hasSentDraftBefore = !!history.sentAt;
    
    const docsCutoffMilestone = updatedShipment.milestones.find(m => m.name.toLowerCase().includes('documental'));
    const docsCutoffDate = docsCutoffMilestone?.predictedDate ? new Date(docsCutoffMilestone.predictedDate) : null;
    const isLateSubmission = docsCutoffDate ? isPast(docsCutoffDate) : false;
    
    // --- START: PDF Generation and Document Update ---
    const hblHtmlResponse = await runGenerateHblPdf({
        isOriginal: false, // Always generate draft with watermark
        blNumber: updatedShipment.houseBillNumber || `DRAFT-${updatedShipment.id}`,
        shipper: draftData.shipper,
        consignee: draftData.consignee,
        notifyParty: draftData.notify,
        vesselAndVoyage: `${updatedShipment.vesselName || ''} / ${updatedShipment.voyageNumber || ''}`,
        portOfLoading: updatedShipment.origin,
        portOfDischarge: updatedShipment.destination,
        finalDestination: updatedShipment.destination,
        marksAndNumbers: draftData.marksAndNumbers,
        packageDescription: `${draftData.containers.reduce((sum, c) => sum + parseInt(c.volumes || '0'), 0)} packages, ${draftData.descriptionOfGoods}`,
        grossWeight: draftData.grossWeight,
        measurement: draftData.measurement,
        containerAndSeal: draftData.containers.map(c => `${c.number} / ${c.seal}`).join('\n'),
        freightPayableAt: 'Destino',
        numberOfOriginals: '0 (ZERO)',
        issueDate: format(new Date(), 'dd-MMM-yyyy'),
        shippedOnBoardDate: updatedShipment.etd ? format(updatedShipment.etd, 'dd-MMM-yyyy') : 'N/A',
    });

    if (!hblHtmlResponse.success || !hblHtmlResponse.data.html) {
        throw new Error('Falha ao gerar o PDF do Draft HBL.');
    }

    const draftDocIndex = updatedShipment.documents.findIndex(doc => doc.name === 'Draft HBL');
    if (draftDocIndex > -1) {
        updatedShipment.documents[draftDocIndex] = {
            ...updatedShipment.documents[draftDocIndex],
            status: 'uploaded',
            fileName: `HBL_Draft_${updatedShipment.houseBillNumber}.pdf`,
            uploadedAt: now,
            content: hblHtmlResponse.data.html,
        };
    } else {
        updatedShipment.documents.push({
            name: 'Draft HBL',
            status: 'uploaded',
            fileName: `HBL_Draft_${updatedShipment.houseBillNumber}.pdf`,
            uploadedAt: now,
            content: hblHtmlResponse.data.html,
        });
    }
    // --- END: PDF Generation and Document Update ---


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

// Moved from `shipment.ts` to `actions.ts` to be a server action
async function createShipment(quoteData: ShipmentCreationData): Promise<Shipment> {
  const allPartners = getPartners();
  const shipper = allPartners.find(p => p.id?.toString() === quoteData.shipperId);
  const consignee = allPartners.find(p => p.id?.toString() === quoteData.consigneeId);
  const agent = allPartners.find(p => p.id?.toString() === quoteData.agentId);

  if(!shipper || !consignee) {
      throw new Error("Shipper or Consignee not found");
  }

  const isImport = quoteData.destination.toUpperCase().includes('BR');
  const creationDate = new Date();
  
  const IMPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
    'Instruções de Embarque Enviadas ao Agente': 0,
    'Carga Pronta': 7, 'Booking Confirmado': 10, 'Cut Off Documental': 12,
    'Container Gate In (Entregue no Porto)': 13, 'Confirmação de Embarque': 14,
    'Documentos Originais Emitidos': 16, 'Transbordo': 0, 'CE Mercante Lançado': 0, 
    'Chegada ao Destino': 0, 
  };
  const EXPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
    'Confirmação de Booking': 2, 'Retirada do Vazio': 3, 'Coleta da Carga (se aplicável)': 4,
    'Cut Off Documental': 6, 'Desembaraço de Exportação': 7, 'Embarque': 8,
    'Chegada no Destino': 0, 'Confirmação de Entrega': 2, 
  };
  
  const generateInitialMilestones = (isImport: boolean, transitTimeStr: string, freeTimeStr: string, creationDate: Date): Milestone[] => {
    const transitTime = parseInt(transitTimeStr.split('-').pop() || '30', 10);
    const freeDays = parseInt(freeTimeStr.replace(/\D/g,'') || '7');
    let milestones: Milestone[] = [];
    if (isImport) {
        const milestoneNames = Object.keys(IMPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque']);
        const eta = addDays(etd, transitTime);
        const freeTimeDueDate = addDays(eta, freeDays - 1);
        const baseMilestones = milestoneNames.map(name => ({
            name, status: 'pending' as const, 
            predictedDate: name === 'Chegada ao Destino' ? eta : (name === 'CE Mercante Lançado' ? addDays(eta, -10) : addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS[name])),
            effectiveDate: null, isTransshipment: false
        }));
        milestones = [...baseMilestones, { name: 'Verificar Devolução do Contêiner', status: 'pending', predictedDate: addDays(freeTimeDueDate, -2), effectiveDate: null, details: `Free time termina em ${freeTimeDueDate.toLocaleDateString('pt-BR')}` }];
    } else {
        const milestoneNames = Object.keys(EXPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Embarque']);
        const eta = addDays(etd, transitTime);
        const emptyPickupDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Retirada do Vazio']);
        const gateInDueDate = addDays(emptyPickupDate, freeDays - 1);
        milestones = milestoneNames.map(name => ({
            name, status: 'pending' as const,
            predictedDate: name.includes('Chegada no Destino') ? eta : (name === 'Confirmação de Entrega' ? addDays(eta, EXPORT_MILESTONE_DUE_DAYS[name]) : addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS[name])),
            effectiveDate: null, isTransshipment: false
        }));
        const deadLineCargaDate = milestones.find(m => m.name === 'Cut Off Documental')?.predictedDate;
        milestones.push({ name: 'Prazo de Entrega (Gate In)', status: 'pending', predictedDate: deadLineCargaDate ? addDays(deadLineCargaDate, -2) : gateInDueDate, effectiveDate: null, details: `Prazo final para evitar detention.` });
    }
    milestones.sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime());
    return milestones;
  };

  const milestones = generateInitialMilestones(isImport, quoteData.details.transitTime, quoteData.details.freeTime, creationDate);
  if (milestones.length > 0 && quoteData.agentId) { milestones[0].status = 'completed'; milestones[0].effectiveDate = new Date(); }

  const transitTime = parseInt(quoteData.details.transitTime.split('-').pop() || '30', 10);
  const etdDays = isImport ? IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque'] : EXPORT_MILESTONE_DUE_DAYS['Embarque'];
  const etd = addDays(creationDate, etdDays);
  const eta = addDays(etd, transitTime);
  
  const baseDocuments: DocumentStatus[] = [ { name: 'Negociação NET', status: 'pending' }, { name: 'Draft MBL', status: 'pending' }, { name: 'Draft HBL', status: 'pending' }, { name: 'Original MBL', status: 'pending' }, { name: 'Original HBL', status: 'pending' }, { name: 'Invoice', status: 'pending' }, { name: 'Packing List', status: 'pending' } ];
  if (!isImport) { baseDocuments.push({ name: 'Extrato DUE', status: 'pending' }); }
  const uploadedDocuments: DocumentStatus[] = quoteData.uploadedDocs.map(doc => ({ name: doc.name, status: 'uploaded', fileName: doc.file.name, uploadedAt: new Date() }));
  const documents: DocumentStatus[] = baseDocuments.map(doc => uploadedDocuments.find(ud => ud.name === doc.name) || doc);
  const freightCharge = quoteData.charges.find(c => c.name.toLowerCase().includes('frete'));
  const shipmentId = `PROC-${quoteData.id.replace('COT-', '')}-${Date.now().toString().slice(-5)}`;

  const newShipment: Shipment = {
    id: shipmentId, quoteId: quoteData.id, origin: quoteData.origin, destination: quoteData.destination,
    collectionAddress: quoteData.collectionAddress, deliveryAddress: quoteData.deliveryAddress,
    shipper, consignee, agent,
    responsibleUser: quoteData.responsibleUser, terminalRedestinacaoId: quoteData.terminalRedestinacaoId,
    charges: quoteData.charges.map(c => ({ ...c, approvalStatus: 'aprovada' })),
    details: quoteData.details, carrier: freightCharge?.supplier, milestones, documents, etd, eta,
    bookingNumber: `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    masterBillNumber: `MSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    houseBillNumber: `HSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    invoiceNumber: quoteData.invoiceNumber, purchaseOrderNumber: quoteData.purchaseOrderNumber,
    notifyName: quoteData.notifyName, customer: quoteData.customer, 
    chatMessages: [{ sender: 'CargaInteligente', message: `Olá! O processo ${shipmentId} foi criado. Use este chat para falar com nossa equipe.`, timestamp: new Date().toISOString(), department: 'Sistema' }],
    blDraftHistory: { sentAt: null, revisions: [] },
  };

  if (isImport && agent) {
    const thcCharge = quoteData.charges.find(c => c.name.toLowerCase().includes('thc'));
    const agentPortalUrl = typeof window !== 'undefined' ? `${window.location.origin}/agent-portal/${shipmentId}` : `/agent-portal/${shipmentId}`;
    await runSendShippingInstructions({
      shipmentId: newShipment.id, agentName: agent.name, agentEmail: agent.contacts[0]?.email || 'agent@example.com',
      shipper: shipper, consigneeName: consignee.name, notifyName: quoteData.notifyName,
      freightCost: freightCharge?.cost ? `${freightCharge.costCurrency} ${freightCharge.cost.toFixed(2)}` : 'N/A',
      freightSale: freightCharge?.sale ? `${freightCharge.saleCurrency} ${freightCharge.sale.toFixed(2)}` : 'AS AGREED',
      agentProfit: agent.profitAgreement?.amount ? `USD ${agent.profitAgreement.amount.toFixed(2)}` : 'N/A',
      thcValue: thcCharge?.sale ? `${thcCharge.saleCurrency} ${thcCharge.sale.toFixed(2)}` : 'N/A',
      commodity: newShipment.commodityDescription || 'General Cargo', equipmentDescription: newShipment.details.cargo || 'N/A',
      ncm: newShipment.ncms?.[0] || 'N/A', invoiceNumber: newShipment.invoiceNumber || 'N/A', purchaseOrderNumber: newShipment.purchaseOrderNumber || 'N/A',
      updateLink: agentPortalUrl,
    });
  }

  const shipments = getShipments();
  shipments.unshift(newShipment);
  saveShipments(shipments);
  return newShipment;
}

export async function runApproveQuote(
    quote: Quote, 
    notifyName: string, 
    terminalId: string | undefined, 
    responsibleUser: string, 
    invoiceNumber: string, 
    poNumber: string, 
    uploadedDocs: UploadedDocument[]
): Promise<{ success: boolean, error?: string}> {
    try {
        const plainQuote = JSON.parse(JSON.stringify(quote));
        await createShipment({
            ...plainQuote,
            notifyName,
            responsibleUser,
            terminalRedestinacaoId: terminalId,
            invoiceNumber: invoiceNumber,
            purchaseOrderNumber: poNumber,
            uploadedDocs: uploadedDocs,
        });
        return { success: true };
    } catch(e: any) {
        return { success: false, error: e.message };
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

export async function runGenerateDiXml(input: GenerateDiXmlInput): Promise<{ success: boolean, data?: GenerateDiXmlOutput, error?: string }> {
    try {
        const data = await generateDiXmlFlow(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Generate DI XML Action Failed", error);
        return { success: false, error: error.message || "Failed to generate DI XML" };
    }
}

export async function runRegisterDue(input: RegisterDueInput): Promise<RegisterDueOutput> {
  return registerDueFlow(input);
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

export async function runExtractInvoiceItems(input: ExtractInvoiceItemsInput): Promise<ExtractInvoiceItemsOutput> {
  // This function is now just a wrapper around the real server action.
  return extractInvoiceItems(input);
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

export async function runShareSimulation(input: any) {
    try {
        const data = await shareSimulation(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Share Simulation Action Failed", error);
        return { success: false, error: error.message || "Failed to share simulation" };
    }
}

export async function runGenerateSimulationPdfHtml(input: any) {
    try {
        const data = await generateSimulationPdfHtml(input);
        return { success: true, data };
    } catch (error: any) {
        console.error("Generate Simulation PDF HTML Action Failed", error);
        return { success: false, error: error.message || "Failed to generate PDF HTML" };
    }
}

export async function runGetRouteMap(shipmentNumber: string) {
    try {
        const data = await getRouteMap(shipmentNumber);
        return { success: true, data };
    } catch (error: any) {
        console.error("Get Route Map Action Failed", error);
        return { success: false, error: error.message || "Failed to get route map" };
    }
}

export async function runUpdateShipmentInTracking(shipment: Shipment) {
    // This is a placeholder for a more complex action.
    // In a real app, this would likely call an external tracking API
    // to register or update the shipment details.
    console.log(`Simulating update in tracking system for shipment ${shipment.id}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, message: `Shipment ${shipment.id} updated in tracking system.` };
}
