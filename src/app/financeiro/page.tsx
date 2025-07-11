
'use client';

import { useState, useEffect } from 'react';
import { FinancialPageClient } from '@/components/financials/financial-page-client';
import { getFinancialEntries } from '@/lib/financials-data';
import { getBankAccounts } from '@/lib/financials-data';
import { getShipments } from '@/lib/shipment';

export default function FinanceiroPage() {
    const [initialEntries, setInitialEntries] = useState(() => getFinancialEntries());
    const [initialAccounts, setInitialAccounts] = useState(() => getBankAccounts());
    const [initialShipments, setInitialShipments] = useState(() => getShipments());
    
    // This effect can be used to re-fetch data if needed, for instance,
    // by listening to custom events or a state management library.
    useEffect(() => {
        const handleStorageChange = () => {
            setInitialEntries(getFinancialEntries());
            setInitialAccounts(getBankAccounts());
            setInitialShipments(getShipments());
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', handleStorageChange); // To catch changes in other tabs
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', handleStorageChange);
        };
    }, []);

    return (
        <FinancialPageClient
            initialEntries={initialEntries}
            initialAccounts={initialAccounts}
            initialShipments={initialShipments}
        />
    );
}
