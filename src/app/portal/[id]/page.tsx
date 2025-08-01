
'use client';

import { Suspense } from 'react';
import { ClientPortalPage } from '@/components/client-portal-page';
import Loading from './loading';
import { getShipmentById } from '@/lib/shipment-data';

// This is now an async Server Component.
export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  // We extract the id here and pass it as a simple prop to the client component.
  const { id } = params;
  
  // We can fetch data on the server now.
  const shipment = await getShipmentById(id);

  return (
    <Suspense fallback={<Loading />}>
      {/* We pass the fetched data directly to the client component */}
      <ClientPortalPage initialShipment={shipment} id={id} />
    </Suspense>
  );
}
