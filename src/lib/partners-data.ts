
'use client';
import { z } from 'zod';

export const partnerSchema = z.object({
  id: z.number().optional(), // Optional for new partners
  name: z.string().min(2, 'O nome do parceiro é obrigatório'),
  nomeFantasia: z.string().optional(),
  roles: z.object({
    cliente: z.boolean().default(false),
    fornecedor: z.boolean().default(false),
    agente: z.boolean().default(false),
    comissionado: z.boolean().default(false),
  }),
  // Sub-types
  tipoCliente: z.object({
    importacao: z.boolean().default(false),
    exportacao: z.boolean().default(false),
  }).optional(),
  tipoFornecedor: z.object({
      ciaMaritima: z.boolean().default(false),
      ciaAerea: z.boolean().default(false),
      transportadora: z.boolean().default(false),
  }).optional(),
  tipoAgente: z.object({
      fcl: z.boolean().default(false),
      lcl: z.boolean().default(false),
      air: z.boolean().default(false),
      projects: z.boolean().default(false),
  }).optional(),
  cnpj: z.string().optional(),
  paymentTerm: z.coerce.number().optional(),
  exchangeRateAgio: z.coerce.number().optional().default(0),
  profitAgreement: z.object({
      amount: z.coerce.number().optional(),
      unit: z.enum(['por_container', 'por_bl', 'porcentagem_lucro']).optional(),
      currency: z.enum(['USD', 'BRL']).default('USD').optional(),
  }).optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  }),
  contacts: z.array(z.object({
    name: z.string().min(1, 'Nome do contato é obrigatório'),
    email: z.string().email('E-mail inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    departments: z.array(z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Outro'])).min(1, 'Selecione pelo menos um departamento'),
  })).min(1, 'Adicione pelo menos um contato'),
});

export type Partner = z.infer<typeof partnerSchema>;

const PARTNERS_STORAGE_KEY = 'cargaInteligente_partners_v4';

function getInitialPartners(): Partner[] {
    return [
        {
            id: 1,
            name: "Nexus Imports",
            nomeFantasia: "Nexus",
            roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
            tipoCliente: { importacao: true, exportacao: true },
            cnpj: "12.345.678/0001-90",
            paymentTerm: 30,
            exchangeRateAgio: 2.5,
            address: {
                street: "Rua da Carga",
                number: "123",
                complement: "Sala 45",
                district: "Centro",
                city: "São Paulo",
                state: "SP",
                zip: "01001-000",
                country: "Brasil"
            },
            contacts: [{
                name: "João da Silva",
                email: "joao@nexus.com",
                phone: "+55 11 91234-5678",
                departments: ["Comercial", "Operacional"]
            }]
        },
        {
            id: 2,
            name: "Ocean Express Logistics",
            nomeFantasia: "OEL",
            roles: { cliente: false, fornecedor: false, agente: true, comissionado: false },
            tipoAgente: { fcl: true, air: true, projects: true, lcl: false },
            cnpj: "98.765.432/0001-09",
            paymentTerm: 45,
            exchangeRateAgio: 0,
            profitAgreement: {
                amount: 50,
                unit: 'por_container',
                currency: "USD"
            },
            address: {
                street: "Av. Atlântica",
                number: "987",
                complement: "Andar 10",
                district: "Copacabana",
                city: "Rio de Janeiro",
                state: "RJ",
                zip: "22010-000",
                country: "Brasil"
            },
            contacts: [{
                name: "Maria Oliveira",
                email: "maria@oceanexpress.com",
                phone: "+55 21 98765-4321",
                departments: ["Comercial", "Exportação"]
            }]
        },
        {
            id: 3,
            name: "Global Import Solutions",
            nomeFantasia: "GIS",
            roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
            tipoFornecedor: { ciaMaritima: true, ciaAerea: false, transportadora: false },
            cnpj: "54.321.876/0001-21",
            paymentTerm: 60,
            exchangeRateAgio: 0,
            address: {
                street: "Wall Street",
                number: "100",
                complement: "Suite 200",
                district: "Manhattan",
                city: "New York",
                state: "NY",
                zip: "10005",
                country: "USA"
            },
            contacts: [{
                name: "John Doe",
                email: "john.doe@globalimport.com",
                phone: "+1 212-555-1234",
                departments: ["Importação", "Financeiro"]
            }]
        },
        {
            id: 4,
            name: "Advocacia Marítima XYZ",
            nomeFantasia: "Advocacia XYZ",
            roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
            tipoFornecedor: { ciaAerea: false, ciaMaritima: false, transportadora: false},
            cnpj: "11.223.344/0001-55",
            paymentTerm: 30,
            address: {
                street: "Avenida Paulista",
                number: "1500",
                city: "São Paulo",
                state: "SP",
                country: "Brasil",
            },
            contacts: [{
                name: "Dr. Roberto Carlos",
                email: "roberto.carlos@advogados.com",
                phone: "+55 11 98888-7777",
                departments: ["Outro"],
            }]
        },
    ];
}

export function getPartners(): Partner[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedPartners = localStorage.getItem(PARTNERS_STORAGE_KEY);
    if (!storedPartners) {
        const initialData = getInitialPartners();
        savePartners(initialData);
        return initialData;
    };
    return JSON.parse(storedPartners);
  } catch (error) {
    console.error("Failed to parse partners from localStorage", error);
    return [];
  }
}

export function savePartners(partners: Partner[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(partners));
  } catch (error) {
    console.error("Failed to save partners to localStorage", error);
  }
}
