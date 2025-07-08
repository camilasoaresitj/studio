/**
 * @fileOverview A simulated service for fetching currency exchange rates.
 * In a real application, this would connect to a reliable financial data provider.
 */

interface ExchangeRates {
  USD: number;
  EUR: number;
  JPY: number;
  CHF: number;
  GBP: number;
  [key: string]: number;
}

// Hardcoded rates for simulation purposes (PTAX on a given day)
const MOCKED_RATES: ExchangeRates = {
  USD: 5.43,
  EUR: 5.82,
  JPY: 0.034,
  CHF: 6.05,
  GBP: 6.85,
};

class ExchangeRateService {
  /**
   * Fetches the latest exchange rates against BRL.
   * This is a simulated method. In a real-world scenario, it would make an API call
   * to a service like the Brazilian Central Bank's API.
   * @returns A promise that resolves to an object containing exchange rates.
   */
  async getRates(): Promise<ExchangeRates> {
    console.log("Simulating fetch of PTAX exchange rates.");
    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return Promise.resolve(MOCKED_RATES);
  }
}

export const exchangeRateService = new ExchangeRateService();
