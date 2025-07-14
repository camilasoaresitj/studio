
'use client';
import { z } from 'zod';

export const feeSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  value: z.string().min(1, 'Valor é obrigatório'),
  currency: z.enum(['BRL', 'USD', 'EUR', 'JPY', 'CHF', 'GBP']),
  type: z.enum(['Fixo', 'Percentual', 'Por CBM/Ton', 'Opcional', 'Por KG']),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  modal: z.enum(['Marítimo', 'Aéreo', 'Ambos']),
  direction: z.enum(['Importação', 'Exportação', 'Ambos']),
  chargeType: z.enum(['FCL', 'LCL', 'Aéreo', 'NONE']).optional(),
  minValue: z.coerce.number().optional(),
});

export type Fee = z.infer<typeof feeSchema>;

const FEES_STORAGE_KEY = 'cargaInteligente_fees_v2';

const initialFeesData: Fee[] = [
    // Importação Marítima FCL
    { id: 1, name: 'THC', value: '1350', currency: 'BRL', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 2, name: 'BL FEE', value: '600', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 3, name: 'ISPS', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 4, name: 'DESCONSOLIDAÇÃO', value: '150', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL' },
    { id: 20, name: 'IMPORT FEE (DEV CTNR)', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    { id: 21, name: 'LOGISTIC FEE', value: '55', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    { id: 22, name: 'TRS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Importação', chargeType: 'FCL'},
    
    // Importação Marítima LCL
    { id: 5, name: 'THC', value: '50', currency: 'BRL', type: 'Por CBM/Ton', unit: 'W/M', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL', minValue: 50 },
    { id: 6, name: 'DESOVA', value: '50', currency: 'BRL', type: 'Por CBM/Ton', unit: 'W/M', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL', minValue: 50 },
    { id: 7, name: 'BL FEE', value: '200', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL' },
    { id: 23, name: 'DESCONSOLIDAÇÃO', value: '100', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},
    { id: 24, name: 'TRS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},
    { id: 25, name: 'ISPS', value: '10', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Importação', chargeType: 'LCL'},

    // Exportação Marítima FCL
    { id: 8, name: 'THC', value: '1350', currency: 'BRL', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 9, name: 'BL FEE', value: '600', currency: 'BRL', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 10, name: 'LACRE', value: '20', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 11, name: 'VGM', value: '20', currency: 'USD', type: 'Fixo', unit: 'Por BL', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    { id: 26, name: 'ISPS', value: '35', currency: 'USD', type: 'Fixo', unit: 'Por Contêiner', modal: 'Marítimo', direction: 'Exportação', chargeType: 'FCL' },
    
    // Importação Aérea
    { id: 12, name: 'DESCONSOLIDAÇÃO', value: '80', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Importação' },
    { id: 13, name: 'COLLECT FEE', value: '3', currency: 'USD', type: 'Percentual', unit: 'Sobre o Frete', modal: 'Aéreo', direction: 'Importação', minValue: 15 },
    { id: 27, name: 'DELIVERY', value: '45', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Importação' },

    // Exportação Aérea
    { id: 28, name: 'AWB FEE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },
    { id: 29, name: 'HANDLING FEE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },
    { id: 30, name: 'FRETE AÉREO', value: '0.07', currency: 'USD', type: 'Por KG', unit: '/KG', modal: 'Aéreo', direction: 'Exportação', minValue: 150},
    { id: 31, name: 'CUSTOMS CLEARANCE', value: '50', currency: 'USD', type: 'Fixo', unit: 'Por AWB', modal: 'Aéreo', direction: 'Exportação' },

    // Serviços Opcionais
    { id: 14, name: 'DESPACHO ADUANEIRO', value: '1000', currency: 'BRL', type: 'Opcional', unit: 'Por Processo', modal: 'Ambos', direction: 'Ambos' },
    { id: 15, name: 'SEGURO INTERNACIONAL', value: '0.3', currency: 'BRL', type: 'Opcional', unit: 'Sobre Valor Carga', modal: 'Ambos', direction: 'Ambos', minValue: 50 },
    { id: 32, name: 'REDESTINAÇÃO DE CARGA', value: '1200', currency: 'BRL', type: 'Opcional', unit: 'Por Processo', modal: 'Marítimo', direction: 'Importação' },
];

export function getFees(): Fee[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(FEES_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(FEES_STORAGE_KEY, JSON.stringify(initialFeesData));
      return initialFeesData;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse fees from localStorage", error);
    return [];
  }
}

export function saveFees(fees: Fee[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(FEES_STORAGE_KEY, JSON.stringify(fees));
    // Notify other components of the update
    window.dispatchEvent(new Event('feesUpdated'));
  } catch (error) {
    console.error("Failed to save fees to localStorage", error);
  }
}
