
import { TrackingStatus } from '@/components/tracking-status';

export default function TrackingPage() {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Rastreamento de Carga</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Insira o código de rastreamento (BL, Container, etc.) para ver o status.
                </p>
            </header>
            <TrackingStatus />
        </div>
    );
}
