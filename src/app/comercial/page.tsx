
'use client';

import { useState } from 'react';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { CustomerQuotesList } from '@/components/customer-quotes-list';
import type { Quote } from '@/components/customer-quotes-list';
import { getPartners, savePartners, type Partner } from '@/lib/partners-data';
import { getFees, type Fee } from '@/lib/fees-data';
import type { Rate } from '@/components/rates-table';
import type { FreightQuoteFormData } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { getInitialRates, getInitialQuotes } from '@/lib/initial-data';
import { CommercialMenu } from '@/components/commercial-menu';


export default function ComercialPage() {
  const [rates, setRates] = useState<Rate[]>(getInitialRates);
  const [quotes, setQuotes] = useState<Quote[]>(getInitialQuotes);
  const [partners, setPartners] = useState<Partner[]>(getPartners);
  const [fees, setFees] = useState<Fee[]>(getFees);
  const [quoteFormData, setQuoteFormData] = useState<Partial<FreightQuoteFormData> | null>(null);
  const [isQuoteListVisible, setIsQuoteListVisible] = useState(false);
  const { toast } = useToast();

  const handlePartnerSaved = (partnerToSave: Partner) => {
    let updatedPartners;
    const existingPartner = partners.find(p => p.id && p.id === partnerToSave.id);

    if (existingPartner) {
      updatedPartners = partners.map(p => p.id === partnerToSave.id ? partnerToSave : p);
    } else {
      const newId = Math.max(0, ...partners.map(p => p.id ?? 0)) + 1;
      updatedPartners = [...partners, { ...partnerToSave, id: newId }];
    }
    setPartners(updatedPartners);
    savePartners(updatedPartners);
  };

  const handleQuoteCreated = (newQuoteData: Quote) => {
    setQuotes(prevQuotes => {
        const existingIndex = prevQuotes.findIndex(q => q.id === newQuoteData.id);
        if (existingIndex > -1) {
            const updatedQuotes = [...prevQuotes];
            updatedQuotes[existingIndex] = newQuoteData;
            return updatedQuotes;
        }
        return [newQuoteData, ...prevQuotes];
    });
    toast({
        title: "Rascunho da Cotação Criado",
        description: "Ajuste os valores e envie para o cliente.",
    });
  };

  const handleQuoteUpdated = (updatedQuote: Quote) => {
    setQuotes(prevQuotes => prevQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };
  
  const handleSelectQuoteToEdit = (quote: Quote) => {
      const formData: Partial<FreightQuoteFormData> = {
          customerId: partners.find(p => p.name === quote.customer)?.id?.toString(),
          modal: quote.details.cargo.toLowerCase().includes('kg') ? 'air' : 'ocean',
          incoterm: quote.details.incoterm as any,
          origin: quote.origin,
          destination: quote.destination,
          commodity: quote.details.cargo,
      };
      setQuoteFormData(formData);
      setIsQuoteListVisible(false);
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Comercial</h1>
                <p className="text-muted-foreground mt-2 text-lg">
                Gerencie suas oportunidades, cotações e clientes.
                </p>
            </div>
            <CommercialMenu 
                onViewQuotes={() => setIsQuoteListVisible(true)}
            />
        </div>
      </header>
      
      {isQuoteListVisible ? (
        <CustomerQuotesList
            quotes={quotes}
            partners={partners}
            onQuoteUpdate={handleQuoteUpdated}
            onPartnerSaved={handlePartnerSaved}
            onClose={() => setIsQuoteListVisible(false)}
            onEditQuote={handleSelectQuoteToEdit}
        />
      ) : (
         <FreightQuoteForm 
            key={JSON.stringify(quoteFormData)}
            initialData={quoteFormData}
            onQuoteCreated={handleQuoteCreated} 
            partners={partners}
            onRegisterCustomer={() => {}}
            rates={rates}
            fees={fees}
            onQuoteUpdate={handleQuoteUpdated}
          />
      )}
    </div>
  );
}
