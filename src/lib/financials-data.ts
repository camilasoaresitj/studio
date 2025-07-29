

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
    currency: 'BRL' | 'USD' | 'EUR' | 'JPY' | 'CHF' | 'GBP';
    processId: string;
    payments?: PartialPayment[];
    status: 'Aberto' | 'Pago' | 'Vencido' | 'Parcialmente Pago' | 'Jurídico' | 'Pendente de Aprovação' | 'Renegociado';
    legalStatus?: 'Extrajudicial' | 'Fase Inicial' | 'Fase de Execução' | 'Desconsideração da Personalidade Jurídica';
    legalComments?: string;
    processoJudicial?: string;
    // New fields for administrative expenses
    expenseType?: 'Operacional' | 'Administrativa';
    recurrence?: 'Única' | 'Mensal' | 'Anual';
    description?: string;
    originalEntryId?: string; // For renegoriation tracking
    accountId?: number; // Link to the bank account for reconciliation
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
        invoiceId: 'INV-PROC-00125-95015',
        status: 'Aberto',
        dueDate: addDays(today, 15).toISOString(),
        amount: 12500.50,
        currency: 'BRL',
        processId: 'PROC-00125-95015',
        payments: [],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-002',
        type: 'credit',
        partner: 'TechFront Solutions',
        invoiceId: 'INV-PROC-00124-42898',
        status: 'Pago',
        dueDate: subDays(today, 20).toISOString(),
        amount: 8750.00,
        currency: 'BRL',
        processId: 'PROC-00124-42898',
        payments: [{ id: 'pay-001', amount: 8750.00, date: subDays(today, 20).toISOString(), accountId: 1 }],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-003',
        type: 'credit',
        partner: 'Global Foods Ltda',
        invoiceId: 'INV-PROC-00123-51881',
        status: 'Vencido',
        dueDate: subDays(today, 5).toISOString(),
        amount: 45800.00,
        currency: 'BRL',
        processId: 'PROC-00123-51881',
        payments: [],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-004',
        type: 'credit',
        partner: 'Nexus Imports',
        invoiceId: 'INV-PROC-00122-38416',
        status: 'Parcialmente Pago',
        dueDate: addDays(today, 30).toISOString(),
        amount: 3200.00,
        currency: 'USD',
        processId: 'PROC-00122-38416',
        payments: [{ id: 'pay-002', amount: 1200.00, date: subDays(today, 2).toISOString(), accountId: 2 }],
        expenseType: 'Operacional',
    },
     {
        id: 'fin-008',
        type: 'credit',
        partner: 'AutoParts Express',
        invoiceId: 'INV-PROC-00121-72921',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 7250.75,
        currency: 'BRL',
        processId: 'PROC-00121-72921',
        payments: [],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-010',
        type: 'credit',
        partner: 'Empresa Dívida Ativa',
        invoiceId: 'INV-2023-001',
        status: 'Jurídico',
        legalStatus: 'Fase Inicial',
        legalComments: 'Enviado para o advogado em 15/01. Aguardando notificação.',
        processoJudicial: '123456-78.2024.8.26.0001',
        dueDate: subDays(today, 180).toISOString(),
        amount: 99500.00,
        currency: 'BRL',
        processId: 'PROC-JURIDICO-1',
        payments: [],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-011',
        type: 'debit',
        partner: 'Locadora de Imóveis Central',
        invoiceId: 'ALUGUEL-SEDE',
        status: 'Pendente de Aprovação',
        dueDate: addDays(today, 5).toISOString(),
        amount: 8500.00,
        currency: 'BRL',
        processId: 'ADM-001',
        payments: [],
        expenseType: 'Administrativa',
        recurrence: 'Mensal',
        description: 'Aluguel do escritório de Itajaí.',
    },
    {
        id: 'fin-012',
        type: 'debit',
        partner: 'Software House Inc.',
        invoiceId: 'SOFT-SYS-2024',
        status: 'Pendente de Aprovação',
        dueDate: addDays(today, 10).toISOString(),
        amount: 12000.00,
        currency: 'BRL',
        processId: 'ADM-002',
        payments: [],
        expenseType: 'Administrativa',
        recurrence: 'Anual',
        description: 'Licença anual do sistema de gestão.',
    },


    // --- Contas a Pagar (Débitos) ---
    {
        id: 'fin-005',
        type: 'debit',
        partner: 'Maersk Line',
        invoiceId: 'BILL-PROC-00125-95015-MAE',
        status: 'Aberto',
        dueDate: addDays(today, 10).toISOString(),
        amount: 2800.00,
        currency: 'USD',
        processId: 'PROC-00125-95015',
        payments: [],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-006',
        type: 'debit',
        partner: 'American Airlines Cargo',
        invoiceId: 'BILL-PROC-00124-42898-AME',
        status: 'Pago',
        dueDate: subDays(today, 15).toISOString(),
        amount: 2100.00,
        currency: 'USD',
        processId: 'PROC-00124-42898',
        payments: [{ id: 'pay-003', amount: 2100.00, date: subDays(today, 15).toISOString(), accountId: 2 }],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-007',
        type: 'debit',
        partner: 'CMA CGM',
        invoiceId: 'BILL-PROC-00123-51881-CMA',
        status: 'Aberto',
        dueDate: addDays(today, 5).toISOString(),
        amount: 3800.00,
        currency: 'USD',
        processId: 'PROC-00123-51881',
        payments: [],
        expenseType: 'Operacional',
    },
    {
        id: 'fin-009',
        type: 'debit',
        partner: 'LATAM Cargo',
        invoiceId: 'BILL-PROC-00121-72921-LAT',
        status: 'Aberto',
        dueDate: today.toISOString(),
        amount: 450.00,
        currency: 'USD',
        processId: 'PROC-00121-72921',
        payments: [],
        expenseType: 'Operacional',
    },
];

const FINANCIALS_STORAGE_KEY = 'cargaInteligente_financials_v8';
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
    // Dispatch event to notify other components of the update
    window.dispatchEvent(new Event('financialsUpdated'));
  } catch (error) {
    console.error("Failed to save financial entries to localStorage", error);
  }
}

export function addFinancialEntry(newEntry: Omit<FinancialEntry, 'id'>): string {
  const currentEntries = getFinancialEntries();
  // Ensure unique ID by appending a random number to the timestamp
  const newId = `fin-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const entryWithId: FinancialEntry = { ...newEntry, id: newId };
  const updatedEntries = [entryWithId, ...currentEntries];
  saveFinancialEntries(updatedEntries);
  return newId;
}

export function addFinancialEntries(newEntries: Omit<FinancialEntry, 'id'>[]): FinancialEntry[] {
  const currentEntries = getFinancialEntries();
  const entriesWithIds: FinancialEntry[] = newEntries.map(entry => ({
    ...entry,
    id: `fin-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  }));
  const updatedEntries = [...currentEntries, ...entriesWithIds];
  saveFinancialEntries(updatedEntries);
  return entriesWithIds;
}

export function findEntryById(id: string): FinancialEntry | undefined {
    // Always get the latest from storage to ensure we find dynamically added entries.
    const currentEntries = getFinancialEntries();
    return currentEntries.find(entry => entry.id === id);
}

export function updateFinancialEntry(id: string, updates: Partial<FinancialEntry>): void {
    const currentEntries = getFinancialEntries();
    const updatedEntries = currentEntries.map(entry => {
        if (entry.id === id) {
            return { ...entry, ...updates };
        }
        return entry;
    });
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
        window.dispatchEvent(new Event('financialsUpdated'));
    } catch (error) {
        console.error("Failed to save bank accounts to localStorage", error);
    }
}
