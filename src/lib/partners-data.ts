
'use client';
import { z } from 'zod';

// NOTE: This is a mocked file-based data store for demonstration purposes.
// In a real-world application, you would replace this with a proper database like Firestore.
import initialPartnersData from './partners.json';


const profitAgreementSchema = z.object({
    modal: z.enum(['FCL', 'LCL', 'AIR', 'ROAD_FTL']),
    direction: z.enum(['IMPORTACAO', 'EXPORTACAO']),
    amount: z.coerce.number().optional(),
    unit: z.enum(['por_container', 'por_bl', 'porcentagem_lucro']).optional(),
    currency: z.enum(['USD', 'BRL']).default('USD').optional(),
});

const standardFeeSchema = z.object({
  name: z.string().min(1, 'Nome da taxa é obrigatório'),
  value: z.coerce.number().min(0, 'Valor deve ser positivo'),
  currency: z.enum(['USD', 'BRL', 'EUR']),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  containerType: z.enum(['Todos', 'Dry', 'Reefer', 'Especiais']).optional(),
  incoterm: z.string().optional(),
  modal: z.enum(['Marítimo', 'Aéreo', 'Ambos']).optional(),
  direction: z.enum(['Importação', 'Exportação', 'Ambos']).optional(),
});

const contactSchema = z.object({
    name: z.string().min(1, 'Nome do contato é obrigatório'),
    email: z.string().email('E-mail inválido'),
    phone: z.string().min(10, 'Telefone inválido'),
    departments: z.array(z.enum(['Comercial', 'Operacional', 'Financeiro', 'Importação', 'Exportação', 'Despachante', 'Outro'])).min(1, 'Selecione pelo menos um departamento'),
    loginEmail: z.string().email('E-mail de login inválido').optional().or(z.literal('')),
    password: z.string().optional(),
    despachanteId: z.number().optional().nullable(),
});


export const partnerSchema = z.object({
  id: z.number().optional(), // Optional for new partners
  name: z.string().min(2, 'O nome do parceiro é obrigatório'),
  nomeFantasia: z.string().optional(),
  createdAt: z.date().optional(),
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
    empresaNoExterior: z.boolean().default(false),
  }).optional(),
  tipoFornecedor: z.object({
      ciaMaritima: z.boolean().default(false),
      ciaAerea: z.boolean().default(false),
      transportadora: z.boolean().default(false),
      terminal: z.boolean().default(false),
      coLoader: z.boolean().default(false),
      fumigacao: z.boolean().default(false),
      despachante: z.boolean().default(false),
      representante: z.boolean().default(false),
      dta: z.boolean().default(false),
      comissionados: z.boolean().default(false),
      administrativo: z.boolean().default(false),
      aluguelContainer: z.boolean().default(false),
      lashing: z.boolean().default(false),
      seguradora: z.boolean().default(false),
      advogado: z.boolean().default(false),
  }).optional(),
  tipoAgente: z.object({
      fcl: z.boolean().default(false),
      lcl: z.boolean().default(false),
      air: z.boolean().default(false),
      projects: z.boolean().default(false),
  }).optional(),
  cnpj: z.string().optional(),
  vat: z.string().optional(),
  scac: z.string().optional(), // SCAC Code field
  paymentTerm: z.coerce.number().optional(),
  exchangeRateAgio: z.coerce.number().optional().default(0),
  demurrageAgreementDueDate: z.date().optional(),
  profitAgreements: z.array(profitAgreementSchema).optional(),
  commissionAgreement: z.object({
      amount: z.coerce.number().optional(),
      unit: z.enum(['porcentagem_lucro', 'por_container', 'por_bl']).optional(),
      currency: z.enum(['USD', 'BRL']).default('BRL').optional(),
      commissionClients: z.array(z.string()).optional(), // List of client names
  }).optional(),
  terminalCommission: z.object({
    amount: z.coerce.number().optional(),
    unit: z.enum(['porcentagem_armazenagem', 'por_container']).optional(),
  }).optional(),
  standardFees: z.array(standardFeeSchema).optional(),
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
  contacts: z.array(contactSchema).min(1, 'Adicione pelo menos um contato'),
  observations: z.string().optional(),
  kpi: z.object({
    manual: z.object({
        mainRoutes: z.array(z.string()).optional().describe("Principais rotas informadas manualmente."),
        mainModals: z.array(z.enum(['Marítimo', 'Aéreo'])).optional().describe("Principais modais informados manualmente."),
    }).optional(),
    automatic: z.object({
        topRoutes: z.array(z.object({
            route: z.string(),
            count: z.number(),
        })).optional().describe("Principais rotas calculadas automaticamente a partir de embarques."),
        monthlyVolumes: z.array(z.object({
            month: z.string(),
            ocean: z.number(),
            air: z.number(),
        })).optional(),
    }).optional(),
  }).optional(),
  clientsLinked: z.array(z.string()).optional(),
});

export type Partner = z.infer<typeof partnerSchema>;

const PARTNERS_STORAGE_KEY = 'cargaInteligente_partners_v13';

function getInitialPartners(): Partner[] {
    // Rehydrate dates from the JSON import
    return initialPartnersData.map((p: any) => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
      demurrageAgreementDueDate: p.demurrageAgreementDueDate ? new Date(p.demurrageAgreementDueDate) : undefined,
    })) as Partner[];
}

// Client-side function to get data from localStorage
export function getStoredPartners(): Partner[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedPartners = localStorage.getItem(PARTNERS_STORAGE_KEY);
    if (!storedPartners) {
        const initialData = getInitialPartners();
        savePartnersData(initialData); // Use the new server-side compatible save function
        return initialData;
    };
    const parsed = JSON.parse(storedPartners);
    // Rehydrate dates
    return parsed.map((p: any) => ({
        ...p,
        createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
        demurrageAgreementDueDate: p.demurrageAgreementDueDate ? new Date(p.demurrageAgreementDueDate) : undefined,
    }));
  } catch (error) {
    console.error("Failed to parse partners from localStorage", error);
    return [];
  }
}

// Function to be used by server actions
export function getPartners(): Partner[] {
    // In a real app, this would fetch from a database.
    // For this mock, we'll continue to read the JSON file directly.
    return getInitialPartners();
}

export function savePartnersData(partners: Partner[]): void {
  if (typeof window === 'undefined') {
    console.log("Save operation called on the server. Data is not persisted in this mock implementation.");
    return;
  }
  try {
    const currentPartners = getStoredPartners();
    
    // Create a map for efficient lookup of existing partners
    const currentPartnersMap = new Map(currentPartners.map(p => [p.id, p]));

    partners.forEach(partner => {
        if (partner.id && currentPartnersMap.has(partner.id)) {
            // Update existing partner
            const existing = currentPartnersMap.get(partner.id);
            currentPartnersMap.set(partner.id, { ...existing, ...partner });
        } else {
            // Add new partner
            const newId = Math.max(0, ...Array.from(currentPartnersMap.keys()).filter(k => k !== undefined)) + 1;
            currentPartnersMap.set(newId, { ...partner, id: newId });
        }
    });

    const allPartners = Array.from(currentPartnersMap.values());
    
    // Logic to update the `clientsLinked` field for despachantes
    const despachantes = allPartners.filter(p => p.tipoFornecedor?.despachante);
    
    despachantes.forEach(despachante => {
        const linkedClients: string[] = [];
        allPartners.forEach(client => {
            if (client.roles.cliente && client.contacts) {
                const isLinked = client.contacts.some(contact => 
                    contact.departments?.includes('Despachante') && contact.despachanteId === despachante.id
                );
                if (isLinked) {
                    linkedClients.push(client.name);
                }
            }
        });
        despachante.clientsLinked = linkedClients;
    });

    localStorage.setItem(PARTNERS_STORAGE_KEY, JSON.stringify(allPartners));
    window.dispatchEvent(new Event('partnersUpdated'));
  } catch (error) {
    console.error("Failed to save partners to localStorage", error);
  }
}
