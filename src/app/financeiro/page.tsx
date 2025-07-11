
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
    
    useEffect(() => {
        const handleDataChange = () => {
            setInitialEntries(getFinancialEntries());
            setInitialAccounts(getBankAccounts());
            setInitialShipments(getShipments());
        };

        window.addEventListener('storage', handleDataChange);
        window.addEventListener('focus', handleDataChange);
        window.addEventListener('financialsUpdated', handleDataChange);
        
        return () => {
            window.removeEventListener('storage', handleDataChange);
            window.removeEventListener('focus', handleDataChange);
            window.removeEventListener('financialsUpdated', handleDataChange);
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
