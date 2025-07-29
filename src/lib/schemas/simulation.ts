
'use server';

import { z } from 'zod';
import type { InvoiceItem } from '@/lib/schemas/invoice';

const ncmRateSchema = z.object({
  ncm: z.string(),
  ii: z.number(),
  ipi: z.number(),
  pis: z.number(),
  cofins: z.number(),
  description: z.string(),
});

const simulationItemSchema = z.object({
  descricao: z.string().min(1, 'Obrigatório'),
  quantidade: z.coerce.number().min(0.01, 'Obrigatório'),
  valorUnitarioUSD: z.coerce.number().min(0.01, 'Obrigatório'),
  ncm: z.string().length(8, 'NCM deve ter 8 dígitos'),
  pesoKg: z.coerce.number().min(0.01, 'Obrigatório'),
  taxRates: ncmRateSchema.optional(),
});

export const simulationFormSchema = z.object({
  simulationName: z.string().min(3, 'Nome é obrigatório'),
  customerName: z.string().min(1, 'Selecione um cliente'),
  freightCostUSD: z.coerce.number().min(0, 'Obrigatório'),
  insuranceCostUSD: z.coerce.number().min(0, 'Obrigatório'),
  exchangeRate: z.coerce.number().min(0.01, 'Obrigatório'),
  thcValueBRL: z.coerce.number().min(0, 'Obrigatório'),
  icmsRate: z.coerce.number().min(0, 'Obrigatório').max(100, 'Máximo 100%'),
  otherExpensesBRL: z.coerce.number().min(0, 'Obrigatório'),
  itens: z.array(simulationItemSchema).min(1, 'Adicione pelo menos um item.'),
});

export type SimulationFormData = z.infer<typeof simulationFormSchema>;

export type SimulationResultItem = InvoiceItem & {
    valorAduaneiroRateado: number;
    impostosRateados: number;
    despesasLocaisRateadas: number;
    custoUnitarioFinal: number;
    taxRates?: z.infer<typeof ncmRateSchema>;
};

export interface SimulationResult {
    valorAduaneiro: number;
    totalII: number;
    totalIPI: number;
    totalPIS: number;
    totalCOFINS: number;
    totalICMS: number;
    custoTotal: number;
    itens: SimulationResultItem[];
}
