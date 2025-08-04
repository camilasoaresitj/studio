'use client';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { CustomerQuotesList } from '@/components/customer-quotes-list';
import { RatesTable, type Rate } from '@/components/rates-table';
import { RateImporter } from '@/components/rate-importer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRates, saveRates } from '@/lib/rates-data';
import { getStoredQuotes } from '@/lib/initial-data';
import {
  getStoredPartners,
  type Partner,
  savePartners,
} from '@/lib/partners-data-client';
import { savePartnerAction } from '@/app/actions';
import { getStoredFees, type Fee } from '@/lib/fees-data';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { CrmForm } from '@/components/crm-form';
import { ExtractRatesFromTextOutput } from '@/ai/flows/extract-rates-from-text';
import type { Quote } from '@/lib/shipment-data';
import { PartnerDialog } from '@/components/partner-dialog';

export default function ComercialPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [view, setView] = useState<'form' | 'list'>('form');
  const [quoteToDetail, setQuoteToDetail] = useState<Quote | null>(null);
  const [quoteToEdit, setQuoteToEdit] = useState<Partial<Quote> | null>(null);
  const [quoteToClone, setQuoteToClone] = useState<Partial<Quote> | null>(null);
  const [isPartnerDialogOpen, setIsPartnerDialogOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedQuotes = localStorage.getItem('freight_quotes');
    if (storedQuotes) {
      setQuotes(JSON.parse(storedQuotes));
    } else {
      const initialQuotes = getStoredQuotes();
      setQuotes(initialQuotes);
      localStorage.setItem('freight_quotes', JSON.stringify(initialQuotes));
    }
    setPartners(getStoredPartners());
    setRates(getRates());
    setFees(getStoredFees());
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('freight_quotes', JSON.stringify(quotes));
    }
  }, [quotes, isClient]);

  useEffect(() => {
    if (quoteToClone) {
      const { id, status, date, ...rest } = quoteToClone; // remove fields that should not be cloned
      setQuoteToEdit(rest);
      setView('form');
    }
  }, [quoteToClone]);

  const handleQuoteCreated = (newQuote: Quote) => {
    setQuotes((prev) => [...prev, newQuote]);
    setQuoteToDetail(newQuote);
    setView('list');
  };

  const handleQuoteUpdate = (updatedQuote: Quote) => {
    setQuotes((prev) => prev.map((q) => (q.id === updatedQuote.id ? updatedQuote : q)));
  };

  const handlePartnerSaved = async (partner: Partner) => {
    const response = await savePartnerAction(partner);
    if (response.success && response.data) {
      setPartners(response.data);
      savePartners(response.data);
      window.dispatchEvent(new Event('partnersUpdated'));
    }
    setIsPartnerDialogOpen(false);
  };

  const handleRatesChange = (newRates: Rate[]) => {
    setRates(newRates);
    saveRates(newRates);
  };

  const handleRatesImported = (newRates: ExtractRatesFromTextOutput) => {
    setRates((prev) => {
      const maxId = Math.max(0, ...prev.map((r) => r.id));
      const ratesWithIds: Rate[] = newRates.map((rate, index) => ({
        ...rate,
        id: maxId + index + 1,
      }));
      const updatedRates = [...prev, ...ratesWithIds];
      saveRates(updatedRates);
      return updatedRates;
    });
  };

  if (!isClient) {
    return null;
  }

  return (
    <>
      <div className="space-y-8">
        <header className="flex flex-col items-start justify-between md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              Módulo Comercial
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {view === 'form'
                ? 'Crie, busque e gerencie cotações de frete e campanhas de marketing.'
                : 'Gerencie e acompanhe o status de todas as suas propostas.'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setView(view === 'form' ? 'list' : 'form')}
          >
            <List className="mr-2 h-4 w-4" />
            {view === 'form' ? 'Ver Lista de Cotações' : 'Voltar para Cotação'}
          </Button>
        </header>

        {view === 'form' ? (
          <Tabs defaultValue="quote">
            <TabsList>
              <TabsTrigger value="quote">Cotação</TabsTrigger>
              <TabsTrigger value="rates">Tabela de Tarifas</TabsTrigger>
              <TabsTrigger value="import">Importador de Tarifas</TabsTrigger>
              <TabsTrigger value="crm">CRM / IA</TabsTrigger>
            </TabsList>
            <TabsContent value="quote" className="mt-6">
              <FreightQuoteForm
                onQuoteCreated={handleQuoteCreated}
                partners={partners}
                onRegisterCustomer={() => setIsPartnerDialogOpen(true)}
                rates={rates}
                fees={fees}
                initialData={quoteToEdit || quoteToClone}
                onQuoteUpdate={handleQuoteUpdate}
              />
            </TabsContent>
            <TabsContent value="rates" className="mt-6">
              <RatesTable
                rates={rates}
                onRatesChange={handleRatesChange}
                onSelectRate={() => {}}
              />
            </TabsContent>
            <TabsContent value="import" className="mt-6">
              <RateImporter onRatesImported={handleRatesImported} />
            </TabsContent>
            <TabsContent value="crm" className="mt-6">
              <CrmForm />
            </TabsContent>
          </Tabs>
        ) : (
          <CustomerQuotesList
            quotes={quotes}
            partners={partners}
            onPartnerSaved={handlePartnerSaved}
            onQuoteUpdate={handleQuoteUpdate}
            onClose={() => setView('form')}
            onEditQuote={(quote) => {
              setQuoteToDetail(quote);
            }}
            onCloneQuote={setQuoteToClone}
            quoteToDetail={quoteToDetail}
            setQuoteToDetail={setQuoteToDetail}
          />
        )}
      </div>
      <PartnerDialog
        isOpen={isPartnerDialogOpen}
        onClose={() => setIsPartnerDialogOpen(false)}
        onPartnerSaved={handlePartnerSaved}
        partner={null}
        allPartners={partners}
      />
    </>
  );
}
