
import { getFinancialEntries, getBankAccounts } from '@/lib/financials-data';
import { getShipments } from '@/lib/shipment';
import { FinancialPageClient } from './financial-page-client';


export default function FinancialPage() {
    const initialEntries = getFinancialEntries();
    const initialAccounts = getBankAccounts();
    const initialShipments = getShipments();
    
    return (
        <FinancialPageClient 
            initialEntries={initialEntries}
            initialAccounts={initialAccounts}
            initialShipments={initialShipments}
        />
    )
}
