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
});

export const lclDetailsSchema = z.object({
    cbm: z.coerce.number().min(0.01, "CBM deve ser maior que 0."),
    weight: z.coerce.number().min(1, "Peso deve ser maior que 0."),
});

export const freightQuoteFormSchema = z.object({
  customerName: z.string().min(3, { message: "O nome do cliente é obrigatório (mínimo 3 caracteres)." }),
  modal: z.enum(['air', 'ocean']),
  incoterm: z.enum(['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']),
  origin: z.string().min(3, { message: "Origem obrigatória (mínimo 3 caracteres)." }),
  destination: z.string().min(3, { message: "Destino obrigatório (mínimo 3 caracteres)." }),
  departureDate: z.date().optional(),
  
  airShipment: z.object({
    pieces: z.array(airPieceSchema),
    isStackable: z.boolean().default(false),
  }),

  oceanShipmentType: z.enum(['FCL', 'LCL']),
  oceanShipment: z.object({
    containers: z.array(oceanContainerSchema),
  }),
  lclDetails: lclDetailsSchema,

}).superRefine((data, ctx) => {
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

export type FreightQuoteFormData = z.infer<typeof freightQuoteFormSchema>;
