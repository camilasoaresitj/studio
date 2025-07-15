
'use client';
import { useState, useEffect, Suspense } from 'react';
import { BLDraftForm } from '@/components/bl-draft-form';
import { fetchShipmentForDraft } from '@/app/actions';
import type { Shipment } from '@/lib/shipment';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function BLDraftPageContent({ id }: { id: string }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadShipment = async () => {
      setIsLoading(true);
      const response = await fetchShipmentForDraft(id);
      if (response.success && response.data) {
        setShipment(response.data);
      } else {
        setError(response.error || 'Não foi possível carregar os dados do embarque.');
      }
      setIsLoading(false);
    };

    if (id) {
        loadShipment();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Carregando dados do embarque...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
             <Card className="w-full max-w-lg text-center p-8 border-destructive">
                <CardHeader>
                    <CardTitle className="text-2xl text-destructive">Erro ao Carregar</CardTitle>
                    <CardDescription className="mt-2">{error}</CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {shipment && <BLDraftForm shipment={shipment} />}
      </div>
    </div>
  );
}


export default function BLDraftPage({ params }: { params: { id: string } }) {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-gray-100">
                <div className="text-center">
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                    <p className="mt-4 text-lg text-muted-foreground">Carregando...</p>
                </div>
            </div>
        }>
            <BLDraftPageContent id={params.id} />
        </Suspense>
    );
}
