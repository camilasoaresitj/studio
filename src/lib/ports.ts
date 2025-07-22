// src/lib/ports.ts

export interface Port {
  id?: string;
  name: string;
  unlocode: string;
  country: string;
  city?: string;
  type: 'port' | 'airport';
}

export const portsAndAirports: Port[] = [
  // Portos Brasileiros
  { name: 'Santos', unlocode: 'BRSSZ', country: 'BR', type: 'port' },
  { name: 'Rio de Janeiro', unlocode: 'BRRIO', country: 'BR', type: 'port' },
  { name: 'Paranaguá', unlocode: 'BRPNG', country: 'BR', type: 'port' },
  { name: 'Itajaí', unlocode: 'BRITJ', country: 'BR', type: 'port' },
  { name: 'Rio Grande', unlocode: 'BRRIG', country: 'BR', type: 'port' },
  { name: 'Salvador', unlocode: 'BRSSA', country: 'BR', type: 'port' },
  { name: 'Recife', unlocode: 'BRREC', country: 'BR', type: 'port' },
  { name: 'Fortaleza', unlocode: 'BRFOR', country: 'BR', type: 'port' },
  { name: 'Manaus', unlocode: 'BRMAO', country: 'BR', type: 'port' },
  { name: 'Vitória', unlocode: 'BRVIX', country: 'BR', type: 'port' },
  { name: 'Itapoá', unlocode: 'BRIOA', country: 'BR', type: 'port' },
  { name: 'Navegantes', unlocode: 'BRNVT', country: 'BR', type: 'port' },
  { name: 'Suape', unlocode: 'BRSUA', country: 'BR', type: 'port' },

  // Portos Internacionais (Américas)
  { name: 'New York', unlocode: 'USNYC', country: 'US', type: 'port' },
  { name: 'Los Angeles', unlocode: 'USLAX', country: 'US', type: 'port' },
  { name: 'Miami', unlocode: 'USMIA', country: 'US', type: 'port' },
  { name: 'Houston', unlocode: 'USHOU', country: 'US', type: 'port' },
  { name: 'Vancouver', unlocode: 'CAVAN', country: 'CA', type: 'port' },
  { name: 'Buenos Aires', unlocode: 'ARBUE', country: 'AR', type: 'port' },
  { name: 'Valparaíso', unlocode: 'CLVAP', country: 'CL', type: 'port' },
  { name: 'Cartagena', unlocode: 'COCTG', country: 'CO', type: 'port' },

  // Portos Internacionais (Europa)
  { name: 'Rotterdam', unlocode: 'NLRTM', country: 'NL', type: 'port' },
  { name: 'Antwerp', unlocode: 'BEANR', country: 'BE', type: 'port' },
  { name: 'Hamburg', unlocode: 'DEHAM', country: 'DE', type: 'port' },
  { name: 'Valencia', unlocode: 'ESVLC', country: 'ES', type: 'port' },
  { name: 'Genoa', unlocode: 'ITGOA', country: 'IT', type: 'port' },
  { name: 'Le Havre', unlocode: 'FRLEH', country: 'FR', type: 'port' },

  // Portos Internacionais (Ásia)
  { name: 'Shanghai', unlocode: 'CNSHA', country: 'CN', type: 'port' },
  { name: 'Shenzhen', unlocode: 'CNSZX', country: 'CN', type: 'port' },
  { name: 'Ningbo', unlocode: 'CNNGB', country: 'CN', type: 'port' },
  { name: 'Qingdao', unlocode: 'CNTAO', country: 'CN', type: 'port' },
  { name: 'Singapore', unlocode: 'SGSIN', country: 'SG', type: 'port' },
  { name: 'Busan', unlocode: 'KRPUS', country: 'KR', type: 'port' },
  { name: 'Tokyo', unlocode: 'JPTYO', country: 'JP', type: 'port' },
  { name: 'Hong Kong', unlocode: 'HKHKG', country: 'HK', type: 'port' },
  { name: 'Belawan', unlocode: 'IDBLW', country: 'ID', type: 'port' },

  // Principais Aeroportos Brasileiros
  { name: 'Guarulhos', unlocode: 'GRU', country: 'BR', type: 'airport' },
  { name: 'Viracopos', unlocode: 'VCP', country: 'BR', type: 'airport' },
  { name: 'Galeão', unlocode: 'GIG', country: 'BR', type: 'airport' },
  { name: 'Brasília', unlocode: 'BSB', country: 'BR', type: 'airport' },
  { name: 'Recife', unlocode: 'REC', country: 'BR', type: 'airport' },

  // Principais Aeroportos Mundiais
  { name: 'Miami Intl', unlocode: 'MIA', country: 'US', type: 'airport' },
  { name: 'Frankfurt', unlocode: 'FRA', country: 'DE', type: 'airport' },
  { name: 'JFK', unlocode: 'JFK', country: 'US', type: 'airport' },
  { name: 'Amsterdam Schiphol', unlocode: 'AMS', country: 'NL', type: 'airport' },
  { name: 'Shanghai Pudong', unlocode: 'PVG', country: 'CN', type: 'airport' },
];

export function findPortByTerm(term: string): Port | undefined {
    const searchTerm = term.toLowerCase().split(',')[0].trim();
    if (!searchTerm) return undefined;
    
    // Prioritize UNLOCODE match
    const unlocodeMatch = portsAndAirports.find(p => p.unlocode.toLowerCase() === searchTerm);
    if (unlocodeMatch) return unlocodeMatch;

    // Fallback to name match
    const nameMatch = portsAndAirports.find(p => p.name.toLowerCase() === searchTerm);
    return nameMatch;
}
