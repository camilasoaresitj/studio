

'use client';

import { useState, useEffect } from 'react';
import { BLDraftForm } from '@/components/bl-draft-form';
import { getShipmentById } from '@/lib/shipment';
import type { Shipment } from '@/lib/shipment';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function BLDraftPageContent({ id }: { id: string }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadShipment = async () => {
      setIsLoading(true);
      const data = getShipmentById(id);
      if (data) {
        setShipment(data);
      } else {
        setError('Embarque não encontrado ou ID inválido.');
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
        {shipment && <BLDraftForm shipment={shipment} onUpdate={setShipment} />}
      </div>
    </div>
  );
}
