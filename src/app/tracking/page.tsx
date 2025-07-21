
'use client'
import { TrackingStatus } from '@/components/tracking-status';

export default function TrackingPage() {
    return (
        <div className="space-y-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Rastreamento de Cargas</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                Consulte o status de qualquer embarque em tempo real.
                </p>
            </header>
            <TrackingStatus />
        </div>
    );
}
