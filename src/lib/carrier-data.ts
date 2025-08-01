
export interface Carrier {
    name: string;
    scac: string | null;
    type: 'INTERMODAL_SHIPMENT' | 'AIR_SHIPMENT' | 'OUTSOURCED_LOGISTICS_SHIPMENT';
    aliases?: string[];
}

// Data sourced from Cargo-flows GET /carrierList API, names adjusted for accuracy
const CARRIER_DATA: Omit<Carrier, 'type'>[] = [
  { name: "ACL", scac: "ACLU" },
  { name: "Admiral", scac: "ADMU" },
  { name: "Alianca", scac: "ANRM" },
  { name: "AllCargo", scac: "ALPJ" },
  { name: "ANL", scac: "ANNU" },
  { name: "APL", scac: "APLU" },
  { name: "Arkas", scac: "ARKU" },
  { name: "Asyad Line", scac: "ASLU" },
  { name: "Avana", scac: "BLJU" },
  { name: "Bayline", scac: "BLLU" },
  { name: "BDP International", scac: null },
  { name: "BLPL Singapore", scac: "BLZU" },
  { name: "Blue Water Lines", scac: "BWLU" },
  { name: "Blue World Lines", scac: "BWLE" },
  { name: "CaroTrans", scac: "CROS" },
  { name: "CMA CGM", scac: "CMDU", aliases: ["CMA-CGM"] },
  { name: "CNC", scac: "11DX" },
  { name: "Containerships", scac: "CSHP" },
  { name: "COSCO", scac: "COSU" },
  { name: "Cosiarma", scac: "CRAU" },
  { name: "Crowley", scac: "CMCU" },
  { name: "CTL", scac: "CHKM" },
  { name: "CU Lines", scac: "CULU" },
  { name: "Danmar Lines", scac: "DMLB" },
  { name: "Diamond Line", scac: null },
  { name: "Diamond Shipping", scac: "DLDS" },
  { name: "DSV", scac: "DSVF" },
  { name: "Econship", scac: "ECNU" },
  { name: "ECU", scac: "ECUI" },
  { name: "Eimskip", scac: "EIMU" },
  { name: "Ellerman Lines", scac: "ECLU" },
  { name: "Emirates Line", scac: "ESPU" },
  { name: "Evergreen", scac: "EGLV" },
  { name: "Fesco", scac: "FESO" },
  { name: "Gold Star", scac: "GSLU" },
  { name: "GoodRich Maritime", scac: "GRXU" },
  { name: "Grimaldi", scac: "GRIU" },
  { name: "Hamburg Sud", scac: "SUDU" },
  { name: "Hapag Lloyd", scac: "HLCU", aliases: ["Hapag-Lloyd"] },
  { name: "Heung-A", scac: "HLHU" },
  { name: "HMM", scac: "HDMU" },
  { name: "Interasia", scac: "12AT" },
  { name: "JAS", scac: "JASO" },
  { name: "KMTC", scac: "KMTU" },
  { name: "Lynden", scac: "LTIA" },
  { name: "MacAndrews", scac: "MCAW" },
  { name: "Maersk", scac: "MAEU", aliases: ["Maersk Line"] },
  { name: "MainFreight", scac: "MFGT" },
  { name: "Marfret", scac: "MFUS" },
  { name: "Mariana Express Lines", scac: "MEXU" },
  { name: "Marmedsa", scac: null },
  { name: "Matson", scac: "MATS" },
  { name: "Maxicon", scac: "MXCU" },
  { name: "Medkon Lines", scac: "MKLU" },
  { name: "Messina", scac: "LMCU" },
  { name: "Milaha", scac: "MLHA" },
  { name: "Modul", scac: "MODU" },
  { name: "MSC", scac: "MSCU" },
  { name: "Namsung", scac: "NSRU" },
  { name: "Nirint", scac: "32GH" },
  { name: "NTES", scac: null },
  { name: "Nvogo", scac: null },
  { name: "NYK", scac: "NYKS" },
  { name: "ONE", scac: "ONEY" },
  { name: "OOCL", scac: "OOLU" },
  { name: "Ovinto", scac: null },
  { name: "Pan Continental", scac: "PCLU" },
  { name: "PanOcean", scac: "POBU" },
  { name: "Penanshin", scac: "PSQJ" },
  { name: "Perma", scac: "PMLU" },
  { name: "PIL", scac: "PCIU" },
  { name: "PSL", scac: "PSL1" },
  { name: "Qatar Navigation Line", scac: "QNLU" },
  { name: "RCL", scac: "REGU" },
  { name: "Reel", scac: null },
  { name: "SACO Shipping Line", scac: "SSLL" },
  { name: "SafeTrans", scac: null },
  { name: "Safmarine", scac: "SAFM" },
  { name: "SailGP", scac: "SAIL" },
  { name: "Samsara", scac: "ESLU" },
  { name: "Samudera", scac: "SIKU" },
  { name: "SCI", scac: "SCIU" },
  { name: "Seaboard Marine", scac: "SMLU" },
  { name: "Sealand", scac: "SEAU" },
  { name: "SeaLead", scac: "SJHH" },
  { name: "Sea Legend", scac: "SEHP" },
  { name: "Seatrade", scac: "SGNV" },
  { name: "Seth Shipping", scac: "SSPH" },
  { name: "ShalAsia", scac: "SHKU" },
  { name: "Shipco", scac: "SHPT" },
  { name: "Sidra Line", scac: null },
  { name: "Sinokor", scac: "SKLU" },
  { name: "Sinotrans", scac: "12IH" },
  { name: "SITC", scac: "SITU" },
  { name: "SM Lines", scac: "SMLM" },
  { name: "SPIL", scac: "SPNU" },
  { name: "Sunmarine", scac: "BAXU" },
  { name: "Swire Shipping", scac: "CHVW" },
  { name: "Tailwind Shipping", scac: "TAWU" },
  { name: "Tarros", scac: "GETU" },
  { name: "TOTE", scac: "TOTE" },
  { name: "Trailer Bridge", scac: "TRBR" },
  { name: "Trans Asia", scac: "TLXU" },
  { name: "Transmar", scac: "TSMA" },
  { name: "Transmarine", scac: null },
  { name: "Total Transport", scac: "TSYH" },
  { name: "TROPICAL", scac: "TSGL" },
  { name: "TS Lines", scac: "13DF" },
  { name: "Turkon", scac: "TRKU" },
  { name: "UGL", scac: null },
  { name: "Unifeeder", scac: "UFEE" },
  { name: "Vanguard", scac: "VLSV" },
  { name: "Vasi Shipping", scac: "VASU" },
  { name: "Volta Shipping", scac: "VCLU" },
  { name: "Wan Hai", scac: "WHLC" },
  { name: "WEC", scac: "WECU" },
  { name: "Westwood", scac: "WWSU" },
  { name: "Yang Ming", scac: "YMLU" },
  { name: "ZIM", scac: "ZIMU" },
];

export function getCarrierByScac(scac: string): Carrier | undefined {
    const carrier = CARRIER_DATA.find(c => c.scac === scac.toUpperCase());
    return carrier ? { ...carrier, type: 'INTERMODAL_SHIPMENT' } : undefined;
}

export function findCarrierByName(name: string): Carrier | undefined {
    if (!name) return undefined;
    const lowerName = name.toLowerCase().trim();
    
    // Search by exact name, alias, or SCAC code.
    const carrier = CARRIER_DATA.find(c => 
        c.name.toLowerCase() === lowerName ||
        (c.aliases && c.aliases.some(alias => alias.toLowerCase() === lowerName)) ||
        (c.scac && c.scac.toLowerCase() === lowerName)
    );
    
    return carrier ? { ...carrier, type: 'INTERMODAL_SHIPMENT' } : undefined;
}
