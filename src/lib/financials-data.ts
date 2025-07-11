
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

export type FinancialEntry = {
    id: string;
    type: 'credit' | 'debit';
    partner: string;
    invoiceId: string;
    status: 'Aberto' | 'Pago' | 'Vencido';
    dueDate: string; // ISO string format
    amount: number;
    currency: 'BRL' | 'USD';
    processId: string;
    accountId: number; // Link to the BankAccount
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
        invoiceId: 'INV-2024-068',
        status: 'Aberto',
        dueDate: addDays(today, 15).toISOString(),
        amount: 12500.50,
        currency: 'BRL',
        processId: 'PROC-BL-998172',
        accountId: 1,
    },
    {
        id: 'fin-002',
        type: 'credit',
        partner: 'TechFront Solutions',
        invoiceId: 'INV-2024-069',
        status: 'Pago',
        dueDate: subDays(today, 20).toISOString(),
        amount: 8750.00,
        currency: 'BRL',
        processId: 'PROC-MAWB-314256',
        accountId: 1,
    },
    {
        id: 'fin-003',
        type: 'credit',
        partner: 'Global Foods Ltda',
        invoiceId: 'INV-2024-070',
        status: 'Vencido',
        dueDate: subDays(today, 5).toISOString(),
        amount: 45800.00,
        currency: 'BRL',
        processId: 'PROC-CNEE-451023',
        accountId: 1,
    },
    {
        id: 'fin-004',
        type: 'credit',
        partner: 'Nexus Imports',
        invoiceId: 'INV-2024-071',
        status: 'Aberto',
        dueDate: addDays(today, 30).toISOString(),
        amount: 3200.00,
        currency: 'USD',
        processId: 'PROC-AWB-724598',
        accountId: 2,
    },
     {
        id: 'fin-008',
        type: 'credit',
        partner: 'AutoParts Express',
        invoiceId: 'INV-2024-075',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 7250.75,
        currency: 'BRL',
        processId: 'PROC-INV-2024-068',
        accountId: 1,
    },

    // --- Contas a Pagar (Débitos) ---
    {
        id: 'fin-005',
        type: 'debit',
        partner: 'Maersk Line',
        invoiceId: 'ML-BR-55432',
        status: 'Aberto',
        dueDate: addDays(today, 10).toISOString(),
        amount: 980.00,
        currency: 'USD',
        processId: 'PROC-BL-998172',
        accountId: 2,
    },
    {
        id: 'fin-006',
        type: 'debit',
        partner: 'LATAM Cargo',
        invoiceId: 'LC-98765',
        status: 'Pago',
        dueDate: subDays(today, 15).toISOString(),
        amount: 4200.00,
        currency: 'BRL',
        processId: 'PROC-MAWB-314256',
        accountId: 1,
    },
    {
        id: 'fin-007',
        type: 'debit',
        partner: 'Terminal de Contêineres de Paranaguá',
        invoiceId: 'TCP-11223',
        status: 'Aberto',
        dueDate: addDays(today, 5).toISOString(),
        amount: 2150.80,
        currency: 'BRL',
        processId: 'PROC-CNEE-451023',
        accountId: 1,
    },
    {
        id: 'fin-009',
        type: 'debit',
        partner: 'Hapag-Lloyd',
        invoiceId: 'HL-DE-99887',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 1500.00,
        currency: 'USD',
        processId: 'PROC-INV-2024-068',
        accountId: 2,
    },
];

// In a real app, this would fetch from a database. Here, we use local storage for persistence.
const FINANCIALS_STORAGE_KEY = 'cargaInteligente_financials_v3';
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
