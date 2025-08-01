
'use client';

import { Suspense, useEffect, useState } from 'react';
import { ClientPortalPage } from '@/components/client-portal-page';
import Loading from './loading';
import { getShipmentById } from '@/app/actions';
import type { Shipment } from '@/lib/shipment-data';

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [shipment, setShipment] = useState<Shipment | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchShipment = async () => {
      setIsLoading(true);
      const data = await getShipmentById(id);
      setShipment(data);
      setIsLoading(false);
    };

    if (id) {
      fetchShipment();
    }
  }, [id]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Suspense fallback={<Loading />}>
      <ClientPortalPage initialShipment={shipment} id={id} />
    </Suspense>
  );
}
