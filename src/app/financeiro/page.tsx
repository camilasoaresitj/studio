
import FinancialPage from '@/components/financials/financial-page';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function FinanceiroPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
        <FinancialPage />
    </Suspense>
  );
}
