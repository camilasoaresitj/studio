
import { ClientQuoteForm } from '@/components/client-quote-form';

export default function ClientQuotePage() {
  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Solicitar Nova Cotação</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Preencha os detalhes do seu embarque para receber uma cotação instantânea.
        </p>
      </header>
      <ClientQuoteForm />
    </div>
  );
}
