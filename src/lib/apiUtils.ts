

export function getAuthHeaders() {
    const API_KEY = process.env.CARGOFLOWS_API_KEY;
    const ORG_TOKEN = process.env.CARGOFLOWS_ORG_TOKEN;

    if (!API_KEY || !ORG_TOKEN) {
        throw new Error('As credenciais da API Cargo-flows (CARGOFLOWS_API_KEY, CARGOFLOWS_ORG_TOKEN) não estão configuradas no ambiente.');
    }
    return {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};
