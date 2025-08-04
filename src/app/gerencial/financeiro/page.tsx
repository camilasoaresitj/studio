
import { FinancialPageClient } from '@/components/financials/financial-page-client';
import { getPartners } from '@/lib/partners-data';

export default async function Financeiro() {
    const partners = await getPartners();
    return (
        <FinancialPageClient initialPartners={partners} />
    );
}
