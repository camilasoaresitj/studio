
import { TrackingStatus } from '@/components/tracking-status';
import { MainHeader } from '@/components/layout/main-header';
import { MainSidebar, SidebarProvider } from '@/components/layout/main-sidebar';

export default function SchedulesPage() {
    return (
        <SidebarProvider>
            <MainSidebar />
            <div className="flex flex-col flex-1">
                <MainHeader />
                <main className="flex-1 p-4 md:p-8">
                    <header className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Schedules & Tracking</h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                           Consulte a programação de navios, voos e rastreie suas cargas em tempo real.
                        </p>
                    </header>
                    <TrackingStatus />
                </main>
            </div>
        </SidebarProvider>
    );
}
