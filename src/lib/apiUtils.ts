
export function getAuthHeaders() {
    const API_KEY = process.env.CARGOFLOWS_API_KEY;

    if (!API_KEY) {
        throw new Error('A chave da API Cargoes (CARGOFLOWS_API_KEY) não está configurada no ambiente.');
    }
    return {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};
