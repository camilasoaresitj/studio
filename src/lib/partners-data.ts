

'use client';
import { z } from 'zod';

const profitAgreementSchema = z.object({
    modal: z.enum(['FCL', 'LCL', 'AIR']),
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
    return [
        {
            id: 1,
            name: "Nexus Imports",
            nomeFantasia: "Nexus",
            createdAt: new Date('2023-05-10'),
            roles: { cliente: true, fornecedor: false, agente: false, comissionado: false },
            tipoCliente: { importacao: true, exportacao: true, empresaNoExterior: false },
            cnpj: "12.345.678/0001-90",
            paymentTerm: 30,
            exchangeRateAgio: 2.5,
            demurrageAgreementDueDate: new Date('2025-12-31'),
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
                departments: ["Comercial", "Operacional"],
                loginEmail: "joao@nexus.com",
                password: "senha_cliente_123"
            }],
            kpi: {
                manual: {
                    mainRoutes: ["Shanghai > Santos", "Shenzhen > Itajai"],
                    mainModals: ["Marítimo"]
                }
            },
            observations: "Cliente antigo, prioridade alta no atendimento.",
        },
        {
            id: 2,
            name: "Ocean Express Logistics",
            nomeFantasia: "OEL",
            createdAt: new Date('2022-11-20'),
            roles: { cliente: false, fornecedor: false, agente: true, comissionado: false },
            tipoAgente: { fcl: true, air: true, projects: true, lcl: false },
            cnpj: "98.765.432/0001-09",
            paymentTerm: 45,
            exchangeRateAgio: 0,
            profitAgreements: [
                { modal: 'FCL', direction: 'IMPORTACAO', amount: 50, unit: 'por_container', currency: 'USD' },
                { modal: 'AIR', direction: 'EXPORTACAO', amount: 25, unit: 'por_bl', currency: 'USD' },
            ],
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
            }],
            observations: "Agente parceiro para a rota da Europa. Contato principal para cotações é a Maria.",
        },
        {
            id: 3,
            name: "Maersk Line",
            nomeFantasia: "Maersk",
            createdAt: new Date('2022-01-15'),
            roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
            tipoFornecedor: { ciaMaritima: true, ciaAerea: false, transportadora: false, terminal: false, coLoader: false, fumigacao: false, despachante: false, representante: false, dta: false, comissionados: false, administrativo: false, aluguelContainer: false, lashing: false, seguradora: false, advogado: false },
            cnpj: "54.321.876/0001-21",
            scac: "MAEU",
            paymentTerm: 60,
            exchangeRateAgio: 0,
            demurrageAgreementDueDate: new Date('2024-10-31'),
            standardFees: [
                { name: 'BL FEE', value: 150, currency: 'USD', containerType: 'Todos', unit: 'BL' },
                { name: 'ISPS', value: 35, currency: 'USD', containerType: 'Todos', unit: 'Contêiner' },
            ],
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
                email: "john.doe@maersk.com",
                phone: "+1 212-555-1234",
                departments: ["Importação", "Financeiro"]
            }],
            observations: "Portal: maersk.com\nLogin: lti_user\nSenha: lti_password_123",
        },
        {
            id: 4,
            name: "Advocacia Marítima XYZ",
            nomeFantasia: "Advocacia XYZ",
            createdAt: new Date('2023-02-01'),
            roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
            tipoFornecedor: { ciaAerea: false, ciaMaritima: false, transportadora: false, terminal: false, coLoader: false, fumigacao: false, despachante: false, representante: false, dta: false, comissionados: false, administrativo: false, aluguelContainer: false, lashing: false, seguradora: false, advogado: true },
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
            }],
            observations: "Especializado em cobrança de demurrage. Enviar e-mail com fatura e HBL em anexo.",
        },
        {
            id: 5,
            name: "Despachante Eficaz",
            nomeFantasia: "Despachante Eficaz",
            createdAt: new Date('2023-08-10'),
            roles: { cliente: false, fornecedor: true, agente: false, comissionado: false },
            tipoFornecedor: { despachante: true },
            cnpj: "22.334.455/0001-66",
            paymentTerm: 15,
            address: {
                street: "Rua do Despacho",
                number: "789",
                city: "Santos",
                state: "SP",
                country: "Brasil",
            },
            contacts: [{
                name: "Ana Pereira",
                email: "ana.pereira@despachanteeficaz.com",
                phone: "+55 13 99999-8888",
                departments: ["Despachante"],
            }],
        },
        // Terminals
        { id: 101, name: 'PORTO DE FORTALEZA - CE', createdAt: new Date(), nomeFantasia: 'BRFOR001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Fortaleza', state: 'CE', country: 'Brasil' } },
        { id: 102, name: 'CAIS TECOM - IMBITUBA-SC', createdAt: new Date(), nomeFantasia: 'BRIBB002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Imbituba', state: 'SC', country: 'Brasil' } },
        { id: 103, name: 'TECON SEPETIBA - RJ', createdAt: new Date(), nomeFantasia: 'BRIGI001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itaguaí', state: 'RJ', country: 'Brasil' } },
        { id: 104, name: 'PORTO ITAPOA', createdAt: new Date(), nomeFantasia: 'BRIOA001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itapoá', state: 'SC', country: 'Brasil' } },
        { id: 105, name: 'PORTO DE ITAQUI - SÃO LUIZ - MA', createdAt: new Date(), nomeFantasia: 'BRIQI001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'São Luiz', state: 'MA', country: 'Brasil' } },
        { id: 106, name: 'SANTOS BRASIL IQI 11', createdAt: new Date(), nomeFantasia: 'BRIQI007', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itaqui', state: 'MA', country: 'Brasil' } },
        { id: 107, name: 'SANTOS BRASIL IQI 3', createdAt: new Date(), nomeFantasia: 'BRIQI008', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itaqui', state: 'MA', country: 'Brasil' } },
        { id: 108, name: 'CAIS COMERCIAL - ITAJAÍ - SC', createdAt: new Date(), nomeFantasia: 'BRITJ001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itajaí', state: 'SC', country: 'Brasil' } },
        { id: 109, name: 'TERMINAL DA BRASKARNE - ITAJAÍ - SC', createdAt: new Date(), nomeFantasia: 'BRITJ002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itajaí', state: 'SC', country: 'Brasil' } },
        { id: 110, name: 'TERMINAL DE CONTÊINERES - ITAJAÍ - SC', createdAt: new Date(), nomeFantasia: 'BRITJ003', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itajaí', state: 'SC', country: 'Brasil' } },
        { id: 111, name: 'TEPORTI - TERMINAL PORTUÁRIO DE ITAJAÍ S/A', createdAt: new Date(), nomeFantasia: 'BRITJ005', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itajaí', state: 'SC', country: 'Brasil' } },
        { id: 112, name: 'BARRA DO RIO TERMINAL PORTUÁRIO', createdAt: new Date(), nomeFantasia: 'BRITJ007', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Itajaí', state: 'SC', country: 'Brasil' } },
        { id: 113, name: 'SUPER TERMINAIS - MANAUS - AM', createdAt: new Date(), nomeFantasia: 'BRMAO004', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Manaus', state: 'AM', country: 'Brasil' } },
        { id: 114, name: 'TERMINAL CHIBATÃO - RETROPORTO - MANAUS - AM', createdAt: new Date(), nomeFantasia: 'BRMAO016', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Manaus', state: 'AM', country: 'Brasil' } },
        { id: 115, name: 'TERMINAL PORTONAVE - NAVEGANTES - SC', createdAt: new Date(), nomeFantasia: 'BRNVT001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Navegantes', state: 'SC', country: 'Brasil' } },
        { id: 116, name: 'TERMINAL PORTUÁRIO DO PECÉM - SÃO GONÇALO DO AMARANTE', createdAt: new Date(), nomeFantasia: 'BRPEC001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'São Gonçalo do Amarante', state: 'CE', country: 'Brasil' } },
        { id: 117, name: 'TERMINAL DE CONTÊINERES - TCP - PARANAGUÁ - PR', createdAt: new Date(), nomeFantasia: 'BRPNG002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Paranaguá', state: 'PR', country: 'Brasil' } },
        { id: 118, name: 'PORTO ORGANIZADO DE RECIFE - RECIFE - PE', createdAt: new Date(), nomeFantasia: 'BRREC001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Recife', state: 'PE', country: 'Brasil' } },
        { id: 119, name: 'TERMINAL DE CONTÊINERES - TECON - RIO GRANDE - RS', createdAt: new Date(), nomeFantasia: 'BRRIG005', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Rio Grande', state: 'RS', country: 'Brasil' } },
        { id: 120, name: 'TERMINAL LIBRA - TECON 1 - RJ', createdAt: new Date(), nomeFantasia: 'BBRRIO002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Rio de Janeiro', state: 'RJ', country: 'Brasil' } },
        { id: 121, name: 'MULTIRIO TERMINAL 2 - RJ', createdAt: new Date(), nomeFantasia: 'BRRIO003', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Rio de Janeiro', state: 'RJ', country: 'Brasil' } },
        { id: 122, name: 'MULTITERMINAIS - ARMAZÉM 12 - RJ', createdAt: new Date(), nomeFantasia: 'BRRIO004', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Rio de Janeiro', state: 'RJ', country: 'Brasil' } },
        { id: 123, name: 'CAIS COMERCIAL - SÃO FRANCISCO DO SUL - SC', createdAt: new Date(), nomeFantasia: 'BRSFS001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'São Francisco do Sul', state: 'SC', country: 'Brasil' } },
        { id: 124, name: 'TERMINAL DA BABITONGA - SÃO FRANCISCO DO SUL - SC', createdAt: new Date(), nomeFantasia: 'BRSFS002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'São Francisco do Sul', state: 'SC', country: 'Brasil' } },
        { id: 125, name: 'TERMINAL DE CONTÊINERES - TECOM - SALVADOR - BA', createdAt: new Date(), nomeFantasia: 'BRSSA002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Salvador', state: 'BA', country: 'Brasil' } },
        { id: 126, name: 'EMBRAPORT EMPRESA BRASILEIRA DE TERMINAIS PORTUÁRIOS', createdAt: new Date(), nomeFantasia: 'BRSSZ009', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Santos', state: 'SP', country: 'Brasil' } },
        { id: 127, name: 'SANTOS BRASIL', createdAt: new Date(), nomeFantasia: 'BRSSZ016', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Santos', state: 'SP', country: 'Brasil' } },
        { id: 128, name: 'CODESP', createdAt: new Date(), nomeFantasia: 'BRSSZ031', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Santos', state: 'SP', country: 'Brasil' } },
        { id: 129, name: 'GRUPO LIBRA (PIER 35)', createdAt: new Date(), nomeFantasia: 'BRSSZ035', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Santos', state: 'SP', country: 'Brasil' } },
        { id: 130, name: 'ECOPORTO SANTOS S/A', createdAt: new Date(), nomeFantasia: 'BRSSZ057', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Santos', state: 'SP', country: 'Brasil' } },
        { id: 131, name: 'BRASIL TERMINAL PORTUÁRIO - BTP', createdAt: new Date(), nomeFantasia: 'BRSSZ058', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Santos', state: 'SP', country: 'Brasil' } },
        { id: 132, name: 'TERMINAL MARÍTIMO DO GUARUJA - TERMAG', createdAt: new Date(), nomeFantasia: 'BRSSZ082', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Guarujá', state: 'SP', country: 'Brasil' } },
        { id: 133, name: 'CAIS PÚBLICO DE SUAPE - IPOJUCA - PE', createdAt: new Date(), nomeFantasia: 'BRSUA001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Ipojuca', state: 'PE', country: 'Brasil' } },
        { id: 134, name: 'TERMINAL CONTÊINERES DE SUAPE - IPOJUCA - PE', createdAt: new Date(), nomeFantasia: 'BRSUA002', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Ipojuca', state: 'PE', country: 'Brasil' } },
        { id: 135, name: 'INST.PORT.FLUV.ALF.USO PRIV-CONVICON CONTEINERES V.C.', createdAt: new Date(), nomeFantasia: 'BRVDC007', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Vila do Conde', state: 'PA', country: 'Brasil' } },
        { id: 136, name: 'CAIS COMERCIAL DE VITÓRIA - VITÓRIA - ES', createdAt: new Date(), nomeFantasia: 'BRVIX001', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Vitória', state: 'ES', country: 'Brasil' } },
        { id: 137, name: 'CIA PORTUARIA VILA VELHA - CPVV - ES', createdAt: new Date(), nomeFantasia: 'BRVIX008', roles: { fornecedor: true, cliente: false, agente: false, comissionado: false }, tipoFornecedor: { terminal: true }, contacts: [], address: { city: 'Vila Velha', state: 'ES', country: 'Brasil' } },
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

export function savePartners(partners: Partner[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    
    const allPartners = [...partners];
    
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
  } catch (error) {
    console.error("Failed to save partners to localStorage", error);
  }
}
