
'use client';

import { addDays, subDays } from 'date-fns';

export type BankAccount = {
    id: number;
    name: string;
    bankName: string;
    agency: string;
    accountNumber: string;
    currency: 'BRL' | 'USD' | 'EUR';
    balance: number;
};

export type PartialPayment = {
    id: string;
    amount: number;
    date: string; // ISO string
    accountId: number;
    exchangeRate?: number;
};

export type FinancialEntry = {
    id: string;
    type: 'credit' | 'debit';
    partner: string;
    invoiceId: string;
    dueDate: string; // ISO string format
    amount: number;
    currency: 'BRL' | 'USD';
    processId: string;
    accountId: number; // Link to the BankAccount
    payments?: PartialPayment[];
    // Deprecated status, will be calculated on the fly
    status: 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico';
    legalStatus?: 'Fase Inicial' | 'Fase de Execução' | 'Desconsideração da Personalidade Jurídica';
    legalComments?: string;
};

const today = new Date();

const initialBankAccounts: BankAccount[] = [
    { id: 1, name: 'Conta Corrente BRL', bankName: 'Banco do Brasil', agency: '1234-5', accountNumber: '123.456-7', currency: 'BRL', balance: 250320.75 },
    { id: 2, name: 'Conta Internacional USD', bankName: 'Bank of America', agency: '9876', accountNumber: '987654321', currency: 'USD', balance: 75250.00 },
];

const initialFinancialData: FinancialEntry[] = [
    // --- Contas a Receber (Créditos) ---
    {
        id: 'fin-001',
        type: 'credit',
        partner: 'Nexus Imports',
        invoiceId: 'COT-00125-95015',
        status: 'Aberto',
        dueDate: addDays(today, 15).toISOString(),
        amount: 12500.50,
        currency: 'BRL',
        processId: 'PROC-00125-95015',
        accountId: 1,
        payments: [],
    },
    {
        id: 'fin-002',
        type: 'credit',
        partner: 'TechFront Solutions',
        invoiceId: 'COT-00124-42898',
        status: 'Pago',
        dueDate: subDays(today, 20).toISOString(),
        amount: 8750.00,
        currency: 'BRL',
        processId: 'PROC-00124-42898',
        accountId: 1,
        payments: [{ id: 'pay-001', amount: 8750.00, date: subDays(today, 20).toISOString(), accountId: 1 }],
    },
    {
        id: 'fin-003',
        type: 'credit',
        partner: 'Global Foods Ltda',
        invoiceId: 'COT-00123-51881',
        status: 'Vencido',
        dueDate: subDays(today, 5).toISOString(),
        amount: 45800.00,
        currency: 'BRL',
        processId: 'PROC-00123-51881',
        accountId: 1,
        payments: [],
    },
    {
        id: 'fin-004',
        type: 'credit',
        partner: 'Nexus Imports',
        invoiceId: 'COT-00122-38416',
        status: 'Parcialmente Pago',
        dueDate: addDays(today, 30).toISOString(),
        amount: 3200.00,
        currency: 'USD',
        processId: 'PROC-00122-38416',
        accountId: 2,
        payments: [{ id: 'pay-002', amount: 1200.00, date: subDays(today, 2).toISOString(), accountId: 2 }],
    },
     {
        id: 'fin-008',
        type: 'credit',
        partner: 'AutoParts Express',
        invoiceId: 'COT-00121-72921',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 7250.75,
        currency: 'BRL',
        processId: 'PROC-00121-72921',
        accountId: 1,
        payments: [],
    },
    {
        id: 'fin-010',
        type: 'credit',
        partner: 'Empresa Dívida Ativa',
        invoiceId: 'INV-2023-001',
        status: 'Jurídico',
        legalStatus: 'Fase Inicial',
        legalComments: 'Enviado para o advogado em 15/01. Aguardando notificação.',
        dueDate: subDays(today, 180).toISOString(),
        amount: 99500.00,
        currency: 'BRL',
        processId: 'PROC-JURIDICO-1',
        accountId: 1,
        payments: [],
    },


    // --- Contas a Pagar (Débitos) ---
    {
        id: 'fin-005',
        type: 'debit',
        partner: 'Maersk Line',
        invoiceId: 'ML-BR-55432',
        status: 'Aberto',
        dueDate: addDays(today, 10).toISOString(),
        amount: 2800.00,
        currency: 'USD',
        processId: 'PROC-00125-95015',
        accountId: 2,
        payments: [],
    },
    {
        id: 'fin-006',
        type: 'debit',
        partner: 'American Airlines Cargo',
        invoiceId: 'AAC-98765',
        status: 'Pago',
        dueDate: subDays(today, 15).toISOString(),
        amount: 2100.00,
        currency: 'USD',
        processId: 'PROC-00124-42898',
        accountId: 2,
        payments: [{ id: 'pay-003', amount: 2100.00, date: subDays(today, 15).toISOString(), accountId: 2 }],
    },
    {
        id: 'fin-007',
        type: 'debit',
        partner: 'CMA CGM',
        invoiceId: 'CMA-11223',
        status: 'Aberto',
        dueDate: addDays(today, 5).toISOString(),
        amount: 3800.00,
        currency: 'USD',
        processId: 'PROC-00123-51881',
        accountId: 2,
        payments: [],
    },
    {
        id: 'fin-009',
        type: 'debit',
        partner: 'LATAM Cargo',
        invoiceId: 'LATAM-99887',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 450.00,
        currency: 'USD',
        processId: 'PROC-00121-72921',
        accountId: 2,
        payments: [],
    },
];

// In a real app, this would fetch from a database. Here, we use local storage for persistence.
const FINANCIALS_STORAGE_KEY = 'cargaInteligente_financials_v5';
const ACCOUNTS_STORAGE_KEY = 'cargaInteligente_accounts_v1';

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

export function addFinancialEntry(newEntry: Omit<FinancialEntry, 'id'>): void {
  const currentEntries = getFinancialEntries();
  const newId = `fin-${Date.now()}`;
  const entryWithId: FinancialEntry = { ...newEntry, id: newId };
  const updatedEntries = [entryWithId, ...currentEntries];
  saveFinancialEntries(updatedEntries);
}

export function getBankAccounts(): BankAccount[] {
    if (typeof window === 'undefined') {
        return [];
    }
    try {
        const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialBankAccounts));
            return initialBankAccounts;
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error("Failed to parse bank accounts from localStorage", error);
        return [];
    }
}

export function saveBankAccounts(accounts: BankAccount[]): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (error) {
        console.error("Failed to save bank accounts to localStorage", error);
    }
}
