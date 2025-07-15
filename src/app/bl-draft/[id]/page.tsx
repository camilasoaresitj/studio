
import { Suspense } from 'react';
import { BLDraftPageContent } from '@/components/bl-draft-page-content';
import { Loader2 } from 'lucide-react';

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
