
import { z } from 'zod';

export const airPieceSchema = z.object({
  quantity: z.coerce.number().min(1, "Obrigatório"),
  length: z.coerce.number().min(1, "Obrigatório"),
  width: z.coerce.number().min(1, "Obrigatório"),
  height: z.coerce.number().min(1, "Obrigatório"),
  weight: z.coerce.number().min(0.1, "Obrigatório"),
});

export const oceanContainerSchema = z.object({
  type: z.string().min(1, "Selecione o tipo"),
  quantity: z.coerce.number().min(1, "Obrigatório"),
  weight: z.coerce.number().optional(),
  length: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
    const isSpecialContainer = data.type.includes('OT') || data.type.includes('FR');
    if (isSpecialContainer) {
        if (!data.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ['length'] });
        if (!data.width) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ['width'] });
        if (!data.height) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ['height'] });
        if (!data.weight) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ['weight'] });
    }
});


export const lclDetailsSchema = z.object({
    cbm: z.coerce.number().min(0.01, "CBM deve ser maior que 0."),
    weight: z.coerce.number().min(1, "Peso deve ser maior que 0."),
});

// Base schema that can be extended. It's a plain ZodObject.
export const baseFreightQuoteFormSchema = z.object({
  customerId: z.string({ required_error: "Por favor, selecione um cliente."}).min(1, { message: "Por favor, selecione um cliente." }),
  modal: z.enum(['air', 'ocean']),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'DDU']),
  origin: z.string().min(3, { message: "Origem obrigatória (mínimo 3 caracteres)." }),
  destination: z.string().min(3, { message: "Destino obrigatório (mínimo 3 caracteres)." }),
  departureDate: z.date().optional(),
  collectionAddress: z.string().optional(),
  deliveryAddress: z.string().optional(),
  commodity: z.string().optional(),
  
  airShipment: z.object({
    pieces: z.array(airPieceSchema),
    isStackable: z.boolean().default(true),
  }),

  oceanShipmentType: z.enum(['FCL', 'LCL']),
  oceanShipment: z.object({
    containers: z.array(oceanContainerSchema),
  }),
  lclDetails: lclDetailsSchema,

  optionalServices: z.object({
    customsClearance: z.boolean(),
    insurance: z.boolean(),
    delivery: z.boolean(),
    trading: z.boolean(),
    redestinacao: z.boolean(),
    cargoValue: z.number(),
    storageCost: z.number().optional(),
    terminalId: z.string().optional(),
  }),
});


// Refined schema with superRefine for client-side form validation. This returns a ZodEffects object.
export const freightQuoteFormSchema = baseFreightQuoteFormSchema.superRefine((data, ctx) => {
    if (data.incoterm === 'EXW' && (!data.collectionAddress || data.collectionAddress.trim().length < 5)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O local de coleta é obrigatório para o incoterm EXW (mínimo 5 caracteres).",
            path: ['collectionAddress'],
        });
    }

    if (data.modal === 'air' && data.airShipment.pieces.length === 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Adicione pelo menos uma peça para cotação aérea.",
            path: ['airShipment.pieces'],
        });
    }
    if (data.modal === 'ocean' && data.oceanShipmentType === 'FCL' && data.oceanShipment.containers.length === 0) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Adicione pelo menos um contêiner para cotação FCL.",
            path: ['oceanShipment.containers'],
        });
    }

    const deliveryTerms = ['DAP', 'DPU', 'DDP', 'DDU'];
    if ((data.optionalServices.delivery || deliveryTerms.includes(data.incoterm)) && (!data.deliveryAddress || data.deliveryAddress.trim().length < 5)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "O local de entrega é obrigatório para este Incoterm ou serviço selecionado.",
            path: ['deliveryAddress'],
        });
    }
});

export type FreightQuoteFormData = z.infer<typeof freightQuoteFormSchema> & {
    customerEmail?: string;
    customerPhone?: string;
};


// Schemas for sendShippingInstructions flow
const PartnerSchemaForPrompt = z.object({
    name: z.string(),
    address: z.object({
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        district: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
    }),
    contacts: z.array(z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
    })),
});

export const SendShippingInstructionsInputSchema = z.object({
  shipmentId: z.string().describe("The internal process/shipment ID."),
  agentName: z.string().describe("The recipient agent's name."),
  agentEmail: z.string().email().describe("The recipient agent's email address."),
  shipper: PartnerSchemaForPrompt.describe("The shipper's full details."),
  consigneeName: z.string().describe("The consignee's company name."),
  notifyName: z.string().describe("The notify party's name."),
  freightCost: z.string().describe("The agreed freight cost (e.g., 'USD 2500.00')."),
  freightSale: z.string().describe("The freight sale value to be declared on the BL (e.g., 'USD 2800.00')."),
  agentProfit: z.string().describe("The agent's profit share (e.g., 'USD 50.00')."),
  thcValue: z.string().describe("The THC value to be declared on the BL (e.g., 'BRL 1350.00')."),
  commodity: z.string().describe("Description of the goods."),
  equipmentDescription: z.string().describe("Full description of equipment, including container type and quantity."),
  ncm: z.string().describe("The NCM/HS Code for the goods."),
  invoiceNumber: z.string().describe("The commercial invoice number."),
  purchaseOrderNumber: z.string().describe("The purchase order number."),
  updateLink: z.string().url().describe("The unique link for the agent to update shipment details."),
});
export type SendShippingInstructionsInput = z.infer<typeof SendShippingInstructionsInputSchema>;

export const SendShippingInstructionsOutputSchema = z.object({
  emailSubject: z.string().describe("The subject line for the email."),
  emailBody: z.string().describe("The full HTML content for the email body."),
});
export type SendShippingInstructionsOutput = z.infer<typeof SendShippingInstructionsOutputSchema>;

// Schemas for getCourierStatus flow
export const GetCourierStatusInputSchema = z.object({
  courier: z.string().describe('The name of the courier company (e.g., DHL, FedEx, UPS).'),
  trackingNumber: z.string().describe('The tracking number for the courier.'),
});
export type GetCourierStatusInput = z.infer<typeof GetCourierStatusInputSchema>;

export const GetCourierStatusOutputSchema = z.object({
  lastStatus: z.string().describe('A plausible, single-line last known status for the shipment.'),
});
export type GetCourierStatusOutput = z.infer<typeof GetCourierStatusOutputSchema>;
