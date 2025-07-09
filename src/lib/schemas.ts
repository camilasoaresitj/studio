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
  exporterId: z.string().optional(),
  importerId: z.string().optional(),
  originAgentId: z.string().optional(),
  destinationAgentId: z.string().optional(),
  modal: z.enum(['air', 'ocean']),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']),
  origin: z.string().min(3, { message: "Origem obrigatória (mínimo 3 caracteres)." }),
  destination: z.string().min(3, { message: "Destino obrigatório (mínimo 3 caracteres)." }),
  departureDate: z.date().optional(),
  collectionAddress: z.string().optional(),
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
    deliveryCost: z.number(),
    redestinacaoCost: z.number(),
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
});

export type FreightQuoteFormData = z.infer<typeof freightQuoteFormSchema> & {
    customerEmail?: string;
    customerPhone?: string;
};
