import { z } from 'zod';

export const ExtractInvoiceItemsInputSchema = z.object({
  fileName: z.string().describe("The name of the uploaded file, including its extension."),
  fileDataUri: z.string().describe(
    "The content of the file as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
  ),
});
export type ExtractInvoiceItemsInput = z.infer<typeof ExtractInvoiceItemsInputSchema>;

export const InvoiceItemSchema = z.object({
  descricao: z.string().describe('The full description of the product/item.'),
  quantidade: z.coerce.number().describe('The quantity of the item.'),
  valorUnitarioUSD: z.coerce.number().describe('The unit price of the item in USD.'),
  ncm: z.string().describe('The NCM (Mercosur Common Nomenclature) code for the item.'),
  pesoKg: z.coerce.number().describe('The gross weight of a single unit of the item in kilograms (Kg).'),
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const ExtractInvoiceItemsOutputSchema = z.object({
    success: z.boolean(),
    data: z.array(InvoiceItemSchema),
    error: z.string().optional(),
});
export type ExtractInvoiceItemsOutput = z.infer<typeof ExtractInvoiceItemsOutputSchema>;
