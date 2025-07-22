
// src/lib/ports.ts

export interface Port {
  name: string;
  unlocode: string;
  country: string;
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

  // Portos Internacionais
  { name: 'Nova York', unlocode: 'USNYC', country: 'US', type: 'port' },
  { name: 'Los Angeles', unlocode: 'USLAX', country: 'US', type: 'port' },
  { name: 'Rotterdam', unlocode: 'NLRTM', country: 'NL', type: 'port' },
  { name: 'Antuérpia', unlocode: 'BEANR', country: 'BE', type: 'port' },
  { name: 'Hamburgo', unlocode: 'DEHAM', country: 'DE', type: 'port' },
  { name: 'Xangai', unlocode: 'CNSHA', country: 'CN', type: 'port' },
  { name: 'Shenzhen', unlocode: 'CNSZX', country: 'CN', type: 'port' },
  { name: 'Singapura', unlocode: 'SGSIN', country: 'SG', type: 'port' },
  { name: 'Busan', unlocode: 'KRPUS', country: 'KR', type: 'port' },
  { name: 'Valparaíso', unlocode: 'CLVAP', country: 'CL', type: 'port' },

  // Principais Aeroportos Brasileiros
  { name: 'Guarulhos', unlocode: 'GRU', country: 'BR', type: 'airport' },
  { name: 'Viracopos', unlocode: 'VCP', country: 'BR', type: 'airport' },
  { name: 'Galeão', unlocode: 'GIG', country: 'BR', type: 'airport' },

  // Principais Aeroportos Mundiais
  { name: 'Miami', unlocode: 'MIA', country: 'US', type: 'airport' },
  { name: 'Frankfurt', unlocode: 'FRA', country: 'DE', type: 'airport' },
  { name: 'JFK', unlocode: 'JFK', country: 'US', type: 'airport' },
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
