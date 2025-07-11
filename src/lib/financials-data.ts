
'use client';

import { addDays, subDays } from 'date-fns';

export type FinancialEntry = {
    id: string;
    type: 'credit' | 'debit';
    partner: string;
    invoiceId: string;
    status: 'Aberto' | 'Pago' | 'Vencido';
    dueDate: string; // ISO string format
    amount: number;
    processId: string;
};

const today = new Date();

const initialFinancialData: FinancialEntry[] = [
    // --- Contas a Receber (Créditos) ---
    {
        id: 'fin-001',
        type: 'credit',
        partner: 'Nexus Imports',
        invoiceId: 'INV-2024-068',
        status: 'Aberto',
        dueDate: addDays(today, 15).toISOString(),
        amount: 12500.50,
        processId: 'PROC-BL-998172',
    },
    {
        id: 'fin-002',
        type: 'credit',
        partner: 'TechFront Solutions',
        invoiceId: 'INV-2024-069',
        status: 'Pago',
        dueDate: subDays(today, 20).toISOString(),
        amount: 8750.00,
        processId: 'PROC-MAWB-314256',
    },
    {
        id: 'fin-003',
        type: 'credit',
        partner: 'Global Foods Ltda',
        invoiceId: 'INV-2024-070',
        status: 'Vencido',
        dueDate: subDays(today, 5).toISOString(),
        amount: 45800.00,
        processId: 'PROC-CNEE-451023',
    },
    {
        id: 'fin-004',
        type: 'credit',
        partner: 'Nexus Imports',
        invoiceId: 'INV-2024-071',
        status: 'Aberto',
        dueDate: addDays(today, 30).toISOString(),
        amount: 32000.00,
        processId: 'PROC-AWB-724598',
    },
     {
        id: 'fin-008',
        type: 'credit',
        partner: 'AutoParts Express',
        invoiceId: 'INV-2024-075',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 7250.75,
        processId: 'PROC-INV-2024-068',
    },

    // --- Contas a Pagar (Débitos) ---
    {
        id: 'fin-005',
        type: 'debit',
        partner: 'Maersk Line',
        invoiceId: 'ML-BR-55432',
        status: 'Aberto',
        dueDate: addDays(today, 10).toISOString(),
        amount: 9800.00,
        processId: 'PROC-BL-998172',
    },
    {
        id: 'fin-006',
        type: 'debit',
        partner: 'LATAM Cargo',
        invoiceId: 'LC-98765',
        status: 'Pago',
        dueDate: subDays(today, 15).toISOString(),
        amount: 4200.00,
        processId: 'PROC-MAWB-314256',
    },
    {
        id: 'fin-007',
        type: 'debit',
        partner: 'Terminal de Contêineres de Paranaguá',
        invoiceId: 'TCP-11223',
        status: 'Aberto',
        dueDate: addDays(today, 5).toISOString(),
        amount: 2150.80,
        processId: 'PROC-CNEE-451023',
    },
    {
        id: 'fin-009',
        type: 'debit',
        partner: 'Hapag-Lloyd',
        invoiceId: 'HL-DE-99887',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 8000.00,
        processId: 'PROC-INV-2024-068',
    },
];

// In a real app, this would fetch from a database. Here, we use local storage for persistence.
const FINANCIALS_STORAGE_KEY = 'cargaInteligente_financials_v1';

export function getFinancialEntries(): FinancialEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(FINANCIALS_STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(FINANCIALS_STORAGE_KEY, JSON.stringify(initialFinancialData));
        return initialFinancialData;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse financial entries from localStorage", error);
    return [];
  }
}

export function saveFinancialEntries(entries: FinancialEntry[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(FINANCIALS_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Failed to save financial entries to localStorage", error);
  }
}
