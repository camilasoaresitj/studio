
'use client';

import { useState, useEffect } from 'react';
import { FinancialPageClient } from '@/components/financials/financial-page-client';
import { getFinancialEntries } from '@/lib/financials-data';
import { getBankAccounts } from '@/lib/financials-data';
import { getShipments } from '@/lib/shipment';

export default function FinanceiroPage() {
    // Since our data source is localStorage, this page must be a client component.
    const [entries, setEntries] = useState(() => getFinancialEntries());
    const [accounts, setAccounts] = useState(() => getBankAccounts());
    const [shipments, setShipments] = useState(() => getShipments());
    
    // This effect can be used to re-fetch data if needed, for instance,
    // by listening to custom events or a state management library.
    useEffect(() => {
        // For now, data is loaded on initial state.
        // If we needed to react to external changes, logic would go here.
        const handleStorageChange = () => {
            setEntries(getFinancialEntries());
            setAccounts(getBankAccounts());
            setShipments(getShipments());
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return (
        <FinancialPageClient
            initialEntries={entries}
            initialAccounts={accounts}
            initialShipments={shipments}
        />
    );
}
