
import FinancialPage from '@/components/financials/financial-page';
import { MainHeader } from '@/components/layout/main-header';
import { MainSidebar, SidebarProvider } from '@/components/layout/main-sidebar';

export default function Financeiro() {
    return (
        <SidebarProvider>
            <MainSidebar />
            <div className="flex flex-col flex-1">
                <MainHeader />
                <main className="flex-1">
                    <FinancialPage />
                </main>
            </div>
        </SidebarProvider>
    );
}
