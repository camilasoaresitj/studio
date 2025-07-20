import { GerencialPage } from '@/components/gerencial-page';
import AppLayout from './gerencial/layout';

export default function Dashboard() {
    return (
        <AppLayout>
            <GerencialPage />
        </AppLayout>
    );
}
