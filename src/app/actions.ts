'use server'

import { ai } from "@/ai/genkit";

export async function runSendQuote(input: any) {
  try {
    const output = await ai.run('send-quote', { input });
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGenerateQuotePdfHtml(input: any) {
  try {
    const output = await ai.run('generate-quote-pdf-html', { input });
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runGetTrackingInfo(input: any) {
  try {
    const output = await ai.run('getTrackingInfoFlow', { input });
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runDetectCarrier(trackingNumber: string) {
    try {
        const carrierResponse = await fetch(`https://api.ultratools.com/tools/getCarrierFromTrackingNumber?trackingNumber=${trackingNumber}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-UltraTools-Api-Key': process.env.ULTRA_TOOLS_API_KEY || '',
            }
        });

        if (!carrierResponse.ok) {
            throw new Error(`HTTP error! status: ${carrierResponse.status}`);
        }

        const carrierData = await carrierResponse.json();
        return { success: true, data: carrierData };

    } catch (error: any) {
        console.error("Carrier Detection Failed", error);
        return { success: false, error: error.message || "Failed to detect carrier" };
    }
}

export async function runGetCourierStatus(input: any) {
    const { courier, trackingNumber } = input;
    try {
        const courierResponse = await fetch(`https://api.ultratools.com/tools/courierTracking?trackingNumber=${trackingNumber}&courier=${courier}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-UltraTools-Api-Key': process.env.ULTRA_TOOLS_API_KEY || '',
            }
        });

        if (!courierResponse.ok) {
            throw new Error(`HTTP error! status: ${courierResponse.status}`);
        }

        const courierData = await courierResponse.json();
        if (!courierData || !courierData.events || courierData.events.length === 0) {
            return { success: false, error: "Nenhum status encontrado para este tracking." };
        }
        return { success: true, data: { lastStatus: courierData.events[0].description } };

    } catch (error: any) {
        console.error("Courier Status Fetch Failed", error);
        return { success: false, error: error.message || "Failed to fetch courier status" };
    }
}

export async function runExtractPartnerInfo(input: string) {
  try {
    const output = await ai.run('extract-partner-info', { input });
    return { success: true, data: output };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}

export async function runSendShippingInstructions(input: any) {
  try {
    // Simulate success
    return { success: true, data: { message: `Shipping instructions sent to ${input.agentEmail}` } };
  } catch (error: any) {
    console.error("Server Action Failed", error);
    return { success: false, error: error.message || "Failed to run flow" };
  }
}
