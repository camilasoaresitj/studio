
'use client';

import { 
    getShipments as getShipmentsData, 
    saveShipments as saveShipmentsData,
} from './shipment-data';
import type { 
    Shipment, 
    Milestone,
    TransshipmentDetail,
    DocumentStatus,
    QuoteCharge,
    QuoteDetails,
    UploadedDocument,
    ShipmentCreationData,
    ContainerDetail,
    BLDraftData,
    ChatMessage,
    BLDraftRevision,
    BLDraftHistory
} from './shipment-data';
import { runSendShippingInstructions } from '@/app/actions';
import { addDays } from 'date-fns';

// This file re-exports the functions and types for client-side usage.
// Crucially, it only exports functions, not types, to comply with 'use server' constraints in consuming files.

export const getShipments = getShipmentsData;
export const saveShipments = saveShipmentsData;

const IMPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Instruções de Embarque Enviadas ao Agente': 0,
  'Carga Pronta': 7,
  'Booking Confirmado': 10,
  'Cut Off Documental': 12,
  'Container Gate In (Entregue no Porto)': 13,
  'Confirmação de Embarque': 14,
  'Documentos Originais Emitidos': 16,
  'Transbordo': 0, 
  'CE Mercante Lançado': 0, 
  'Chegada ao Destino': 0, 
};

const EXPORT_MILESTONE_DUE_DAYS: { [key: string]: number } = {
  'Confirmação de Booking': 2,
  'Retirada do Vazio': 3,
  'Coleta da Carga (se aplicável)': 4,
  'Cut Off Documental': 6,
  'Desembaraço de Exportação': 7,
  'Embarque': 8,
  'Chegada no Destino': 0, 
  'Confirmação de Entrega': 2, 
};

function generateInitialMilestones(isImport: boolean, transitTimeStr: string, freeTimeStr: string, creationDate: Date): Milestone[] {
    const transitTime = parseInt(transitTimeStr.split('-').pop() || '30', 10);
    const freeDays = parseInt(freeTimeStr.replace(/\D/g,'') || '7');

    let milestones: Milestone[] = [];

    if (isImport) {
        const milestoneNames = Object.keys(IMPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque']);
        const eta = addDays(etd, transitTime);
        const freeTimeDueDate = addDays(eta, freeDays - 1);

        const baseMilestones = milestoneNames.map(name => {
            let predictedDate: Date;
            if (name === 'Chegada ao Destino') {
                predictedDate = eta;
            } else if (name === 'CE Mercante Lançado') {
                predictedDate = addDays(eta, -10);
            } else {
                predictedDate = addDays(creationDate, IMPORT_MILESTONE_DUE_DAYS[name]);
            }
            return { name, status: 'pending' as const, predictedDate, effectiveDate: null, isTransshipment: false };
        });

        const demurrageMilestone: Milestone = {
            name: 'Verificar Devolução do Contêiner',
            status: 'pending',
            predictedDate: addDays(freeTimeDueDate, -2),
            effectiveDate: null,
            details: `Free time termina em ${freeTimeDueDate.toLocaleDateString('pt-BR')}`
        };
        
        milestones = [...baseMilestones, demurrageMilestone];

    } else { // Export
        const milestoneNames = Object.keys(EXPORT_MILESTONE_DUE_DAYS);
        const etd = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Embarque']);
        const eta = addDays(etd, transitTime);
        
        const emptyPickupDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS['Retirada do Vazio']);
        const gateInDueDate = addDays(emptyPickupDate, freeDays - 1);

         milestones = milestoneNames.map(name => {
            let predictedDate: Date;
            if (name.includes('Chegada no Destino')) {
                predictedDate = eta;
            } else if (name === 'Confirmação de Entrega') {
                 predictedDate = addDays(eta, EXPORT_MILESTONE_DUE_DAYS[name]);
            } else {
                predictedDate = addDays(creationDate, EXPORT_MILESTONE_DUE_DAYS[name]);
            }
            return { name, status: 'pending', predictedDate, effectiveDate: null, isTransshipment: false };
        });
        
        const deadLineCargaDate = milestones.find(m => m.name === 'Cut Off Documental')?.predictedDate;

        milestones.push({
            name: 'Prazo de Entrega (Gate In)',
            status: 'pending',
            predictedDate: deadLineCargaDate ? addDays(deadLineCargaDate, -2) : gateInDueDate,
            effectiveDate: null,
            details: `Prazo final para evitar detention.`
        });
    }

    milestones.sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime());
    return milestones;
}

export async function createShipment(quoteData: ShipmentCreationData): Promise<Shipment> {
  const isImport = quoteData.destination.toUpperCase().includes('BR');
  const creationDate = new Date();
  const milestones = generateInitialMilestones(isImport, quoteData.details.transitTime, quoteData.details.freeTime, creationDate);
  
  if (milestones.length > 0 && quoteData.agent) {
      milestones[0].status = 'completed';
      milestones[0].effectiveDate = new Date();
  }

  const transitTime = parseInt(quoteData.details.transitTime.split('-').pop() || '30', 10);
  const etdDays = isImport ? IMPORT_MILESTONE_DUE_DAYS['Confirmação de Embarque'] : EXPORT_MILESTONE_DUE_DAYS['Embarque'];
  const etd = addDays(creationDate, etdDays);
  const eta = addDays(etd, transitTime);
  
  const baseDocuments: DocumentStatus[] = [
    { name: 'Negociação NET', status: 'pending' },
    { name: 'Draft MBL', status: 'pending' },
    { name: 'Draft HBL', status: 'pending' },
    { name: 'Original MBL', status: 'pending' },
    { name: 'Original HBL', status: 'pending' },
    { name: 'Invoice', status: 'pending' },
    { name: 'Packing List', status: 'pending' },
  ];

  if (!isImport) {
    baseDocuments.push({ name: 'Extrato DUE', status: 'pending' });
  }

  const uploadedDocuments: DocumentStatus[] = quoteData.uploadedDocs.map(doc => ({
      name: doc.name,
      status: 'uploaded',
      fileName: doc.file.name,
      uploadedAt: new Date(),
  }));
  
  const documents: DocumentStatus[] = baseDocuments.map(doc => {
      const uploaded = uploadedDocuments.find(ud => ud.name === doc.name);
      return uploaded || doc;
  });

  const freightCharge = quoteData.charges.find(c => c.name.toLowerCase().includes('frete'));

  const shipmentId = `PROC-${quoteData.id.replace('COT-', '')}-${Date.now().toString().slice(-5)}`;

  const newShipment: Shipment = {
    id: shipmentId,
    quoteId: quoteData.id,
    origin: quoteData.origin,
    destination: quoteData.destination,
    collectionAddress: quoteData.collectionAddress,
    deliveryAddress: quoteData.deliveryAddress,
    dischargeTerminal: '',
    shipper: quoteData.shipper,
    consignee: quoteData.consignee,
    agent: quoteData.agent,
    responsibleUser: quoteData.responsibleUser,
    terminalRedestinacaoId: quoteData.terminalRedestinacaoId,
    charges: quoteData.charges.map(c => ({ ...c, approvalStatus: 'aprovada' })),
    details: quoteData.details,
    carrier: freightCharge?.supplier,
    milestones,
    documents,
    etd,
    eta,
    bookingNumber: `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    masterBillNumber: `MSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    houseBillNumber: `HSBL-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
    invoiceNumber: quoteData.invoiceNumber,
    purchaseOrderNumber: quoteData.purchaseOrderNumber,
    commodityDescription: '',
    ncms: [],
    mblPrintingAtDestination: false,
    notifyName: quoteData.notifyName,
    customer: quoteData.customer, 
    chatMessages: [{
        sender: 'CargaInteligente',
        message: `Olá! O processo ${shipmentId} foi criado. Use este chat para falar com nossa equipe.`,
        timestamp: new Date().toISOString(),
        department: 'Sistema',
    }],
    blDraftHistory: {
        sentAt: null,
        revisions: [],
    },
  };

  if (isImport && quoteData.agent) {
    const thcCharge = quoteData.charges.find(c => c.name.toLowerCase().includes('thc'));
    const agentPortalUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/agent-portal/${shipmentId}`
        : `/agent-portal/${shipmentId}`;

    await runSendShippingInstructions({
      shipmentId: newShipment.id,
      agentName: quoteData.agent.name,
      agentEmail: quoteData.agent.contacts[0]?.email || 'agent@example.com',
      shipper: quoteData.shipper,
      consigneeName: quoteData.consignee.name,
      notifyName: quoteData.notifyName,
      freightCost: freightCharge?.cost ? `${freightCharge.costCurrency} ${freightCharge.cost.toFixed(2)}` : 'N/A',
      freightSale: freightCharge?.sale ? `${freightCharge.saleCurrency} ${freightCharge.sale.toFixed(2)}` : 'AS AGREED',
      agentProfit: quoteData.agent.profitAgreement?.amount ? `USD ${quoteData.agent.profitAgreement.amount.toFixed(2)}` : 'N/A',
      thcValue: thcCharge?.sale ? `${thcCharge.saleCurrency} ${thcCharge.sale.toFixed(2)}` : 'N/A',
      commodity: newShipment.commodityDescription || 'General Cargo',
      equipmentDescription: newShipment.details.cargo || 'N/A',
      ncm: newShipment.ncms?.[0] || 'N/A',
      invoiceNumber: newShipment.invoiceNumber || 'N/A',
      purchaseOrderNumber: newShipment.purchaseOrderNumber || 'N/A',
      updateLink: agentPortalUrl,
    });
    console.log(`Shipping instructions sent for shipment ${newShipment.id}`);
  }

  const shipments = getShipments();
  shipments.unshift(newShipment);
  saveShipments(shipments);
  return newShipment;
}


export function getShipmentById(id: string): Shipment | null {
  const shipments = getShipments();
  return shipments.find(s => s.id === id) || null;
}

/**
 * Updates an existing shipment. This function is designed to be used
 * on the client-side, as it interacts with localStorage.
 */
export function updateShipment(updatedShipment: Shipment): Shipment[] {
  const shipments = getShipments();
  const shipmentIndex = shipments.findIndex(s => s.id === updatedShipment.id);

  if (shipmentIndex === -1) {
    const newShipments = [updatedShipment, ...shipments];
    saveShipments(newShipments);
    return newShipments;
  }

  shipments[shipmentIndex] = updatedShipment;
  saveShipments(shipments);
  return shipments;
}
