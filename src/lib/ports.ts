// src/lib/ports.ts

export interface Port {
  id?: string;
  name: string;
  unlocode: string;
  country: string;
  city?: string;
  type: 'port' | 'airport';
  timeZone: string;
}

export const portsAndAirports: Port[] = [
  // Portos Brasileiros
  { name: 'Santos', unlocode: 'BRSSZ', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Rio de Janeiro', unlocode: 'BRRIO', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Paranaguá', unlocode: 'BRPNG', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Itajaí', unlocode: 'BRITJ', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Rio Grande', unlocode: 'BRRIG', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Salvador', unlocode: 'BRSSA', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Recife', unlocode: 'BRREC', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Fortaleza', unlocode: 'BRFOR', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Manaus', unlocode: 'BRMAO', country: 'BR', type: 'port', timeZone: 'America/Manaus' },
  { name: 'Vitória', unlocode: 'BRVIX', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Itapoá', unlocode: 'BRIOA', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Navegantes', unlocode: 'BRNVT', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo' },
  { name: 'Suape', unlocode: 'BRSUA', country: 'BR', type: 'port', timeZone: 'America/Recife' },

  // Portos Internacionais (Américas)
  { name: 'New York', unlocode: 'USNYC', country: 'US', type: 'port', timeZone: 'America/New_York' },
  { name: 'Los Angeles', unlocode: 'USLAX', country: 'US', type: 'port', timeZone: 'America/Los_Angeles' },
  { name: 'Miami', unlocode: 'USMIA', country: 'US', type: 'port', timeZone: 'America/New_York' },
  { name: 'Houston', unlocode: 'USHOU', country: 'US', type: 'port', timeZone: 'America/Chicago' },
  { name: 'Vancouver', unlocode: 'CAVAN', country: 'CA', type: 'port', timeZone: 'America/Vancouver' },
  { name: 'Buenos Aires', unlocode: 'ARBUE', country: 'AR', type: 'port', timeZone: 'America/Argentina/Buenos_Aires' },
  { name: 'Valparaíso', unlocode: 'CLVAP', country: 'CL', type: 'port', timeZone: 'America/Santiago' },
  { name: 'Cartagena', unlocode: 'COCTG', country: 'CO', type: 'port', timeZone: 'America/Bogota' },

  // Portos Internacionais (Europa)
  { name: 'Rotterdam', unlocode: 'NLRTM', country: 'NL', type: 'port', timeZone: 'Europe/Amsterdam' },
  { name: 'Antwerp', unlocode: 'BEANR', country: 'BE', type: 'port', timeZone: 'Europe/Brussels' },
  { name: 'Hamburg', unlocode: 'DEHAM', country: 'DE', type: 'port', timeZone: 'Europe/Berlin' },
  { name: 'Valencia', unlocode: 'ESVLC', country: 'ES', type: 'port', timeZone: 'Europe/Madrid' },
  { name: 'Genoa', unlocode: 'ITGOA', country: 'IT', type: 'port', timeZone: 'Europe/Rome' },
  { name: 'Le Havre', unlocode: 'FRLEH', country: 'FR', type: 'port', timeZone: 'Europe/Paris' },

  // Portos Internacionais (Ásia)
  { name: 'Shanghai', unlocode: 'CNSHA', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai' },
  { name: 'Shenzhen', unlocode: 'CNSZX', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai' },
  { name: 'Ningbo', unlocode: 'CNNGB', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai' },
  { name: 'Qingdao', unlocode: 'CNTAO', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai' },
  { name: 'Singapore', unlocode: 'SGSIN', country: 'SG', type: 'port', timeZone: 'Asia/Singapore' },
  { name: 'Busan', unlocode: 'KRPUS', country: 'KR', type: 'port', timeZone: 'Asia/Seoul' },
  { name: 'Tokyo', unlocode: 'JPTYO', country: 'JP', type: 'port', timeZone: 'Asia/Tokyo' },
  { name: 'Hong Kong', unlocode: 'HKHKG', country: 'HK', type: 'port', timeZone: 'Asia/Hong_Kong' },
  { name: 'Belawan', unlocode: 'IDBLW', country: 'ID', type: 'port', timeZone: 'Asia/Jakarta' },

  // Principais Aeroportos Brasileiros
  { name: 'Guarulhos', unlocode: 'GRU', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo' },
  { name: 'Viracopos', unlocode: 'VCP', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo' },
  { name: 'Galeão', unlocode: 'GIG', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo' },
  { name: 'Brasília', unlocode: 'BSB', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo' },
  { name: 'Recife', unlocode: 'REC', country: 'BR', type: 'airport', timeZone: 'America/Recife' },

  // Principais Aeroportos Mundiais
  { name: 'Miami Intl', unlocode: 'MIA', country: 'US', type: 'airport', timeZone: 'America/New_York' },
  { name: 'Frankfurt', unlocode: 'FRA', country: 'DE', type: 'airport', timeZone: 'Europe/Berlin' },
  { name: 'JFK', unlocode: 'JFK', country: 'US', type: 'airport', timeZone: 'America/New_York' },
  { name: 'Amsterdam Schiphol', unlocode: 'AMS', country: 'NL', type: 'airport', timeZone: 'Europe/Amsterdam' },
  { name: 'Shanghai Pudong', unlocode: 'PVG', country: 'CN', type: 'airport', timeZone: 'Asia/Shanghai' },
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
