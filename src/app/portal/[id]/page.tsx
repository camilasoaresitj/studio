
'use client';

import { Suspense } from 'react';
import { ClientPortalPage } from '@/components/client-portal-page';
import Loading from './loading';
import { getShipmentById } from '@/lib/shipment-data-client';

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  
  // The initial data fetching will happen inside the client component now.
  // This avoids the async client component error and works better with client-side data.
  return (
    <Suspense fallback={<Loading />}>
      <ClientPortalPage initialShipment={undefined} id={id} />
    </Suspense>
  );
}
