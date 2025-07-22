
import { ScheduleFinder } from '@/components/schedule-finder';

export default function SchedulesPage() {
    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Schedules & Tracking</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                   Consulte a programação de navios, voos e rastreie suas cargas em tempo real.
                </p>
            </header>
            <ScheduleFinder />
        </div>
    );
}
