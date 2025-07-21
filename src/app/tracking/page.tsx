import Link from 'next/link'
import { TrackingStatus } from '@/components/tracking-status';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import TrackingMap from '@/components/TrackingMap';

export default function TrackingPage() {
  // Exemplo de localização. Em uma aplicação real, isso viria do estado do rastreamento.
  const location = { latitude: -23.9608, longitude: -46.3261 }

  return (
    <div className="space-y-8">
        <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Rastreamento de Cargas</h1>
            <p className="text-muted-foreground mt-2 text-lg">
            Consulte o status de qualquer embarque em tempo real.
            </p>
        </header>
        <TrackingStatus />
        <Card>
            <CardHeader>
                <CardTitle>Mapa de Rastreamento</CardTitle>
                <CardDescription>Visualização da localização atual da carga.</CardDescription>
            </CardHeader>
            <CardContent>
                <TrackingMap location={location} />
            </CardContent>
        </Card>
    </div>
  );
}
