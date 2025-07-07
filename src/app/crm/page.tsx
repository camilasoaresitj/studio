import { CrmForm } from '@/components/crm-form';

export default function CrmPage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">CRM Automático</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Cole o conteúdo de um e-mail para extrair informações e criar uma entrada no CRM automaticamente.
        </p>
      </header>
      <CrmForm />
    </div>
  );
}
