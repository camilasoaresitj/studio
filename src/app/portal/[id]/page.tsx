
import { Suspense } from 'react';
import { ClientPortalPage } from '@/components/client-portal-page';
import Loading from './loading';

export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
  // This is now a Server Component by default.
  // We extract the id here and pass it as a simple prop to the client component.
  const { id } = params;

  return (
    <Suspense fallback={<Loading />}>
      <ClientPortalPage id={id} />
    </Suspense>
  );
}
