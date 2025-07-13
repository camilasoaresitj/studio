
// src/lib/ports.ts

export interface Port {
  name: string;
  unlocode: string;
  country: string;
  type: 'port' | 'airport';
}

export const portsAndAirports: Port[] = [
  // Principais Portos Brasileiros
  { name: 'Santos', unlocode: 'BRSSZ', country: 'BR', type: 'port' },
  { name: 'Paranaguá', unlocode: 'BRPNG', country: 'BR', type: 'port' },
  { name: 'Itajaí', unlocode: 'BRITJ', country: 'BR', type: 'port' },
  { name: 'Navegantes', unlocode: 'BRNVT', country: 'BR', type: 'port' },
  { name: 'Rio Grande', unlocode: 'BRRIG', country: 'BR', type: 'port' },
  { name: 'Itapoá', unlocode: 'BRITP', country: 'BR', type: 'port' },
  { name: 'Suape', unlocode: 'BRSUA', country: 'BR', type: 'port' },
  { name: 'Manaus', unlocode: 'BRMAO', country: 'BR', type: 'port' },
  { name: 'Rio de Janeiro', unlocode: 'BRRIO', country: 'BR', type: 'port' },
  { name: 'Pecém', unlocode: 'BRPEC', country: 'BR', type: 'port' },
  
  // Principais Aeroportos Brasileiros
  { name: 'Guarulhos (São Paulo)', unlocode: 'GRU', country: 'BR', type: 'airport' },
  { name: 'Viracopos (Campinas)', unlocode: 'VCP', country: 'BR', type: 'airport' },
  { name: 'Galeão (Rio de Janeiro)', unlocode: 'GIG', country: 'BR', type: 'airport' },
  { name: 'Manaus', unlocode: 'MAO', country: 'BR', type: 'airport' },
  { name: 'Curitiba', unlocode: 'CWB', country: 'BR', type: 'airport' },
  
  // Principais Portos Mundiais
  { name: 'Shanghai', unlocode: 'CNSHA', country: 'CN', type: 'port' },
  { name: 'Singapore', unlocode: 'SGSIN', country: 'SG', type: 'port' },
  { name: 'Ningbo-Zhoushan', unlocode: 'CNNGB', country: 'CN', type: 'port' },
  { name: 'Shenzhen', unlocode: 'CNSZX', country: 'CN', type: 'port' },
  { name: 'Guangzhou', unlocode: 'CNCAN', country: 'CN', type: 'port' },
  { name: 'Qingdao', unlocode: 'CNTAO', country: 'CN', type: 'port' },
  { name: 'Busan', unlocode: 'KRPUS', country: 'KR', type: 'port' },
  { name: 'Tianjin', unlocode: 'CNTXG', country: 'CN', type: 'port' },
  { name: 'Hong Kong', unlocode: 'HKHKG', country: 'HK', type: 'port' },
  { name: 'Rotterdam', unlocode: 'NLRTM', country: 'NL', type: 'port' },
  { name: 'Antwerp', unlocode: 'BEANR', country: 'BE', type: 'port' },
  { name: 'Hamburg', unlocode: 'DEHAM', country: 'DE', type: 'port' },
  { name: 'Los Angeles', unlocode: 'USLAX', country: 'US', type: 'port' },
  { name: 'Long Beach', unlocode: 'USLGB', country: 'US', type: 'port' },
  { name: 'New York/New Jersey', unlocode: 'USNYC', country: 'US', type: 'port' },
  { name: 'Jebel Ali (Dubai)', unlocode: 'AEJEA', country: 'AE', type: 'port' },
  { name: 'Valencia', unlocode: 'ESVLC', country: 'ES', type: 'port' },
  { name: 'Algeciras', unlocode: 'ESALG', country: 'ES', type: 'port' },
  { name: 'Piraeus', unlocode: 'GRPIR', country: 'GR', type: 'port' },
  { name: 'Genoa', unlocode: 'ITGOA', country: 'IT', type: 'port' },
  { name: 'Le Havre', unlocode: 'FRLEH', country: 'FR', type: 'port' },
  { name: 'Felixstowe', unlocode: 'GBFXT', country: 'GB', type: 'port' },
  { name: 'Bremerhaven', unlocode: 'DEBRV', country: 'DE', type: 'port' },
  { name: 'Colon', unlocode: 'PAONX', country: 'PA', type: 'port' },
  { name: 'Manzanillo', unlocode: 'PAMIT', country: 'PA', type: 'port' },
  { name: 'Cartagena', unlocode: 'COCTG', country: 'CO', type: 'port' },
  { name: 'Veracruz', unlocode: 'MXVER', country: 'MX', type: 'port' },
  { name: 'Callao', unlocode: 'PECLL', country: 'PE', type: 'port' },
  { name: 'San Antonio', unlocode: 'CLSAI', country: 'CL', type: 'port' },
  { name: 'Buenos Aires', unlocode: 'ARBUE', country: 'AR', type: 'port' },
  { name: 'Montevideo', unlocode: 'UYMVD', country: 'UY', type: 'port' },

  // Principais Aeroportos Mundiais
  { name: 'Hong Kong Intl', unlocode: 'HKG', country: 'HK', type: 'airport' },
  { name: 'Memphis', unlocode: 'MEM', country: 'US', type: 'airport' },
  { name: 'Shanghai Pudong', unlocode: 'PVG', country: 'CN', type: 'airport' },
  { name: 'Anchorage', unlocode: 'ANC', country: 'US', type: 'airport' },
  { name: 'Incheon (Seoul)', unlocode: 'ICN', country: 'KR', type: 'airport' },
  { name: 'Dubai Intl', unlocode: 'DXB', country: 'AE', type: 'airport' },
  { name: 'Doha', unlocode: 'DOH', country: 'QA', type: 'airport' },
  { name: 'Narita (Tokyo)', unlocode: 'NRT', country: 'JP', type: 'airport' },
  { name: 'Frankfurt', unlocode: 'FRA', country: 'DE', type: 'airport' },
  { name: 'Miami', unlocode: 'MIA', country: 'US', type: 'airport' },
  { name: 'Los Angeles Intl', unlocode: 'LAX', country: 'US', type: 'airport' },
  { name: 'JFK (New York)', unlocode: 'JFK', country: 'US', type: 'airport' },
  { name: 'Schiphol (Amsterdam)', unlocode: 'AMS', country: 'NL', type: 'airport' },
  { name: 'Charles de Gaulle (Paris)', unlocode: 'CDG', country: 'FR', type: 'airport' },
  { name: 'Heathrow (London)', unlocode: 'LHR', country: 'GB', type: 'airport' },
];

export function findPortByTerm(term: string): Port | undefined {
    const searchTerm = term.toLowerCase().split(',')[0].trim();
    if (!searchTerm) return undefined;
    return portsAndAirports.find(p => p.name.toLowerCase() === searchTerm || p.unlocode.toLowerCase() === searchTerm);
}
