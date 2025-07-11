
import { getFinancialEntries } from '@/lib/financials-data';
import { getBankAccounts } from '@/lib/financials-data';
import { getShipments } from '@/lib/shipment';
import { FinancialPageClient } from '@/components/financials/financial-page-client';

// Make the page component async to fetch data on the server
export default async function FinanceiroPage() {
    // Fetch data on the server each time the page is requested
    const initialEntries = getFinancialEntries();
    const initialAccounts = getBankAccounts();
    const initialShipments = getShipments();

    // Pass the fetched data as props to the client component
    return (
        <FinancialPageClient
            initialEntries={initialEntries}
            initialAccounts={initialAccounts}
            initialShipments={initialShipments}
        />
    );
}
