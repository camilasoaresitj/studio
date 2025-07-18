
'use server';
/**
 * @fileOverview A Genkit flow to update a shipment in the Cargo-flows tracking system.
 *
 * updateShipmentInTracking - A function that sends updates for an existing shipment.
 * UpdateShipmentInTrackingInput - The input type for the function.
 * UpdateShipmentInTrackingOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const UpdateShipmentInTrackingInputSchema = z.object({
  shipmentNumber: z.string().describe("The shipment number to update (usually the booking number)."),
  // Add other updatable fields as needed based on what your app supports.
  // For now, we'll keep it simple as the primary logic is just to trigger the update.
});
type UpdateShipmentInTrackingInput = z.infer<typeof UpdateShipmentInTrackingInputSchema>;

const UpdateShipmentInTrackingOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
type UpdateShipmentInTrackingOutput = z.infer<typeof UpdateShipmentInTrackingOutputSchema>;


export async function updateShipmentInTracking(input: UpdateShipmentInTrackingInput): Promise<UpdateShipmentInTrackingOutput> {
  return updateShipmentInTrackingFlow(input);
}


const updateShipmentInTrackingFlow = ai.defineFlow(
  {
    name: 'updateShipmentInTrackingFlow',
    inputSchema: UpdateShipmentInTrackingInputSchema,
    outputSchema: UpdateShipmentInTrackingOutputSchema,
  },
  async ({ shipmentNumber }) => {
    const cargoFlowsApiKey = process.env.CARGOFLOWS_API_KEY;
    const cargoFlowsOrgToken = process.env.CARGOFLOWS_ORG_TOKEN;
    const url = 'https://connect.cargoes.com/flow/api/public_tracking/v1/updateShipments';

    if (!cargoFlowsApiKey || !cargoFlowsOrgToken) {
      throw new Error('Cargo-flows API credentials are not configured.');
    }

    // The API expects an array in formData, even for a single update.
    const payload = {
      formData: [
        {
          shipmentNumber: shipmentNumber,
          // You can add other fields to update here, e.g.,
          // shipmentTags: "updated_tag",
        }
      ]
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'X-DPW-ApiKey': cargoFlowsApiKey,
        'X-DPW-Org-Token': cargoFlowsOrgToken,
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Cargo-flows updateShipments Error Body:", errorBody);
        let errorMessage = `Cargo-flows API Error (${response.status})`;
        try {
            errorMessage = JSON.parse(errorBody).error?.message || errorBody;
        } catch (e) { /* ignore json parse error */ }
        throw new Error(errorMessage);
    }
    
    const responseData = await response.json();
    
    // Assuming the API returns a success message or status.
    // We'll construct our own success response for now.
    return {
      success: true,
      message: `Shipment ${shipmentNumber} update request sent successfully.`,
    };
  }
);
