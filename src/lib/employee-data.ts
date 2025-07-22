
'use client';

import { z } from 'zod';

export const employeeSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Nome é obrigatório."),
  role: z.string().min(1, "Cargo é obrigatório."),
  workRegime: z.enum(['CLT', 'PJ']),
  salary: z.coerce.number().min(0, "Salário deve ser positivo."),
  status: z.enum(['Ativo', 'Inativo']),
  vacationDays: z.coerce.number().default(30),
  benefits: z.object({
    hasHealthPlan: z.boolean().default(false),
    hasMealVoucher: z.boolean().default(false),
    mealVoucherValue: z.coerce.number().optional(),
  }),
  birthDate: z.date().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  admissionDate: z.date({ required_error: 'Data de admissão é obrigatória.' }),
  dismissalDate: z.date().optional(),
  systemAccess: z.object({
    email: z.string().email('E-mail inválido.'),
    password: z.string(),
  }),
  awards: z.object({
    balance: z.coerce.number().default(0),
    cajuCardNumber: z.string().optional(),
  }),
});

export type Employee = z.infer<typeof employeeSchema>;

const EMPLOYEES_STORAGE_KEY = 'cargaInteligente_employees_v1';

const initialEmployees: Employee[] = [
  {
    id: 1,
    name: 'Admin Geral',
    role: 'Administrador',
    workRegime: 'CLT',
    salary: 15000,
    status: 'Ativo',
    vacationDays: 25,
    benefits: {
      hasHealthPlan: true,
      hasMealVoucher: true,
      mealVoucherValue: 1200
    },
    birthDate: new Date('1985-10-20'),
    phone: '(11) 99999-9999',
    address: 'Rua Principal, 123, São Paulo, SP',
    admissionDate: new Date('2020-01-15'),
    systemAccess: {
      email: 'admin@cargainteligente.com',
      password: 'senha_super_segura'
    },
    awards: {
        balance: 500,
        cajuCardNumber: '1234-5678-9012-3456'
    }
  }
];

export function getEmployees(): Employee[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(initialEmployees));
      return initialEmployees;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to parse employees from localStorage", error);
    return [];
  }
}

export function saveEmployees(employees: Employee[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(employees));
    window.dispatchEvent(new Event('employeesUpdated'));
  } catch (error) {
    console.error("Failed to save employees to localStorage", error);
  }
}
