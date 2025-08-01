// src/lib/ports.ts

export interface Port {
  id?: string;
  name: string;
  unlocode: string;
  country: string;
  city?: string;
  type: 'port' | 'airport';
  timeZone: string;
  lat: number;
  lon: number;
}

export const portsAndAirports: Port[] = [
  // Portos Brasileiros
  { name: 'Santos', unlocode: 'BRSSZ', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -23.98, lon: -46.3 },
  { name: 'Rio de Janeiro', unlocode: 'BRRIO', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -22.90, lon: -43.17 },
  { name: 'Paranaguá', unlocode: 'BRPNG', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -25.50, lon: -48.51 },
  { name: 'Itajaí', unlocode: 'BRITJ', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -26.91, lon: -48.66 },
  { name: 'Rio Grande', unlocode: 'BRRIG', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -32.09, lon: -52.09 },
  { name: 'Salvador', unlocode: 'BRSSA', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -12.96, lon: -38.50 },
  { name: 'Recife', unlocode: 'BRREC', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -8.05, lon: -34.87 },
  { name: 'Fortaleza', unlocode: 'BRFOR', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -3.72, lon: -38.52 },
  { name: 'Manaus', unlocode: 'BRMAO', country: 'BR', type: 'port', timeZone: 'America/Manaus', lat: -3.14, lon: -60.02 },
  { name: 'Vitória', unlocode: 'BRVIX', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -20.32, lon: -40.34 },
  { name: 'Itapoá', unlocode: 'BRIOA', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -26.11, lon: -48.61 },
  { name: 'Navegantes', unlocode: 'BRNVT', country: 'BR', type: 'port', timeZone: 'America/Sao_Paulo', lat: -26.89, lon: -48.65 },
  { name: 'Suape', unlocode: 'BRSUA', country: 'BR', type: 'port', timeZone: 'America/Recife', lat: -8.39, lon: -34.96 },

  // Portos Internacionais (Américas)
  { name: 'New York', unlocode: 'USNYC', country: 'US', type: 'port', timeZone: 'America/New_York', lat: 40.71, lon: -74.00 },
  { name: 'Los Angeles', unlocode: 'USLAX', country: 'US', type: 'port', timeZone: 'America/Los_Angeles', lat: 33.73, lon: -118.26 },
  { name: 'Miami', unlocode: 'USMIA', country: 'US', type: 'port', timeZone: 'America/New_York', lat: 25.76, lon: -80.19 },
  { name: 'Houston', unlocode: 'USHOU', country: 'US', type: 'port', timeZone: 'America/Chicago', lat: 29.76, lon: -95.36 },
  { name: 'Vancouver', unlocode: 'CAVAN', country: 'CA', type: 'port', timeZone: 'America/Vancouver', lat: 49.28, lon: -123.12 },
  { name: 'Buenos Aires', unlocode: 'ARBUE', country: 'AR', type: 'port', timeZone: 'America/Argentina/Buenos_Aires', lat: -34.60, lon: -58.38 },
  { name: 'Valparaíso', unlocode: 'CLVAP', country: 'CL', type: 'port', timeZone: 'America/Santiago', lat: -33.04, lon: -71.62 },
  { name: 'Cartagena', unlocode: 'COCTG', country: 'CO', type: 'port', timeZone: 'America/Bogota', lat: 10.42, lon: -75.55 },

  // Portos Internacionais (Europa)
  { name: 'Rotterdam', unlocode: 'NLRTM', country: 'NL', type: 'port', timeZone: 'Europe/Amsterdam', lat: 51.92, lon: 4.47 },
  { name: 'Antwerp', unlocode: 'BEANR', country: 'BE', type: 'port', timeZone: 'Europe/Brussels', lat: 51.22, lon: 4.40 },
  { name: 'Hamburg', unlocode: 'DEHAM', country: 'DE', type: 'port', timeZone: 'Europe/Berlin', lat: 53.55, lon: 9.99 },
  { name: 'Valencia', unlocode: 'ESVLC', country: 'ES', type: 'port', timeZone: 'Europe/Madrid', lat: 39.46, lon: -0.37 },
  { name: 'Genoa', unlocode: 'ITGOA', country: 'IT', type: 'port', timeZone: 'Europe/Rome', lat: 44.40, lon: 8.94 },
  { name: 'Le Havre', unlocode: 'FRLEH', country: 'FR', type: 'port', timeZone: 'Europe/Paris', lat: 49.49, lon: 0.10 },

  // Portos Internacionais (Ásia)
  { name: 'Shanghai', unlocode: 'CNSHA', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Shenzhen', unlocode: 'CNSZX', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai', lat: 22.54, lon: 114.05 },
  { name: 'Ningbo', unlocode: 'CNNGB', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai', lat: 29.87, lon: 121.54 },
  { name: 'Qingdao', unlocode: 'CNTAO', country: 'CN', type: 'port', timeZone: 'Asia/Shanghai', lat: 36.06, lon: 120.38 },
  { name: 'Singapore', unlocode: 'SGSIN', country: 'SG', type: 'port', timeZone: 'Asia/Singapore', lat: 1.29, lon: 103.85 },
  { name: 'Busan', unlocode: 'KRPUS', country: 'KR', type: 'port', timeZone: 'Asia/Seoul', lat: 35.18, lon: 129.07 },
  { name: 'Tokyo', unlocode: 'JPTYO', country: 'JP', type: 'port', timeZone: 'Asia/Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Hong Kong', unlocode: 'HKHKG', country: 'HK', type: 'port', timeZone: 'Asia/Hong_Kong', lat: 22.31, lon: 114.16 },
  { name: 'Belawan', unlocode: 'IDBLW', country: 'ID', type: 'port', timeZone: 'Asia/Jakarta', lat: 3.78, lon: 98.68 },

  // Principais Aeroportos Brasileiros
  { name: 'Guarulhos', unlocode: 'GRU', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo', lat: -23.43, lon: -46.47 },
  { name: 'Viracopos', unlocode: 'VCP', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo', lat: -23.00, lon: -47.13 },
  { name: 'Galeão', unlocode: 'GIG', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo', lat: -22.81, lon: -43.25 },
  { name: 'Brasília', unlocode: 'BSB', country: 'BR', type: 'airport', timeZone: 'America/Sao_Paulo', lat: -15.86, lon: -47.91 },
  { name: 'Recife', unlocode: 'REC', country: 'BR', type: 'airport', timeZone: 'America/Recife', lat: -8.12, lon: -34.92 },

  // Principais Aeroportos Mundiais
  { name: 'Miami Intl', unlocode: 'MIA', country: 'US', type: 'airport', timeZone: 'America/New_York', lat: 25.79, lon: -80.29 },
  { name: 'Frankfurt', unlocode: 'FRA', country: 'DE', type: 'airport', timeZone: 'Europe/Berlin', lat: 50.03, lon: 8.56 },
  { name: 'JFK', unlocode: 'JFK', country: 'US', type: 'airport', timeZone: 'America/New_York', lat: 40.64, lon: -73.77 },
  { name: 'Amsterdam Schiphol', unlocode: 'AMS', country: 'NL', type: 'airport', timeZone: 'Europe/Amsterdam', lat: 52.31, lon: 4.76 },
  { name: 'Shanghai Pudong', unlocode: 'PVG', country: 'CN', type: 'airport', timeZone: 'Asia/Shanghai', lat: 31.14, lon: 121.80 },
];

export function findPortByTerm(term: string): Port | undefined {
    if (typeof term !== 'string') {
        return undefined;
    }
    const searchTerm = term.toLowerCase().split(',')[0].trim();
    if (!searchTerm) return undefined;
    
    // Prioritize UNLOCODE match
    const unlocodeMatch = portsAndAirports.find(p => p.unlocode.toLowerCase() === searchTerm);
    if (unlocodeMatch) return unlocodeMatch;

    // Fallback to name match
    const nameMatch = portsAndAirports.find(p => p.name.toLowerCase() === searchTerm);
    return nameMatch;
}
