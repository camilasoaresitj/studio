
export function getAuthHeaders() {
    // Hardcoded keys for debugging the persistent 'Unauthorized' error.
    // In a production environment, these should be loaded from secure environment variables.
    const API_KEY = 'dL6SngaHRXZfvzGA716lioRD7ZsRC9hs';
    const ORG_TOKEN = 'k6mWheLX7hsmc4QXDm4w3T7GKu35XOGo';

    if (!API_KEY || !ORG_TOKEN) {
        throw new Error('Cargo-flows API credentials are not configured.');
    }
    return {
        'X-DPW-ApiKey': API_KEY,
        'X-DPW-Org-Token': ORG_TOKEN,
        'Content-Type': 'application/json',
        'accept': 'application/json'
    };
};
