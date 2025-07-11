
'use client';

import { useState, useEffect } from 'react';
import { FinancialPageClient } from '@/components/financials/financial-page-client';
import { getFinancialEntries, FinancialEntry } from '@/lib/financials-data';
import { getBankAccounts, BankAccount } from '@/lib/financials-data';
import { getShipments, Shipment } from '@/lib/shipment';
import { Loader2 } from 'lucide-react';

export default function FinanceiroPage() {
    const [entries, setEntries] = useState<FinancialEntry[]>([]);
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // This useEffect hook runs only on the client, after the initial render.
    // This is the correct way to load data from localStorage to avoid hydration errors.
    useEffect(() => {
        const loadData = () => {
            setEntries(getFinancialEntries());
            setAccounts(getBankAccounts());
            setShipments(getShipments());
            setIsLoaded(true);
        };
        
        loadData();

        window.addEventListener('storage', loadData);
        window.addEventListener('focus', loadData);
        window.addEventListener('financialsUpdated', loadData);
        
        return () => {
            window.removeEventListener('storage', loadData);
            window.removeEventListener('focus', loadData);
            window.removeEventListener('financialsUpdated', loadData);
        };
    }, []);

    if (!isLoaded) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4">Carregando dados financeiros...</p>
            </div>
        );
    }

    return (
        <FinancialPageClient
            initialEntries={entries}
            initialAccounts={accounts}
            initialShipments={shipments}
        />
    );
}
