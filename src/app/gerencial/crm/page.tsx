
import { CrmForm } from '@/components/crm-form';

export default function CrmPage() {
    return (
        <div className="p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">CRM & Marketing</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                    Utilize IA para extrair contatos de e-mails e criar campanhas direcionadas.
                </p>
            </header>
            <CrmForm />
        </div>
    );
}
