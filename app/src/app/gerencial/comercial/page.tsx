'use client';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { CustomerQuotesList, type Quote } from '@/components/customer-quotes-list';
import { RatesTable, type Rate } from '@/components/rates-table';
import { RateImporter } from '@/components/rate-importer';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRates, saveRates } from '@/lib/rates-data';
import { getInitialQuotes } from '@/lib/initial-data';
import { getPartners, savePartners, type Partner } from '@/lib/partners-data';
import { getFees, saveFees, type Fee } from '@/lib/fees-data';
import { Button } from '@/components/ui/button';
import { List } from 'lucide-react';
import React, { useState, useEffect } from 'react';

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

    useEffect(() => {
        setIsClient(true);
        const storedQuotes = localStorage.getItem('freight_quotes');
        if (storedQuotes) {
            setQuotes(JSON.parse(storedQuotes));
        } else {
            setQuotes(getInitialQuotes());
        }
        setPartners(getPartners());
        setRates(getRates());
        setFees(getFees());
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
        setQuotes(prev => [...prev, newQuote]);
        setQuoteToDetail(newQuote);
        setView('list');
    };
    
    const handleQuoteUpdate = (updatedQuote: Quote) => {
         setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
    };

    const handlePartnerSaved = (partner: Partner) => {
        const existing = partners.find(p => p.id === partner.id);
        let updatedPartners;
        if(existing) {
            updatedPartners = partners.map(p => p.id === partner.id ? partner : p);
        } else {
            const newId = Math.max(0, ...partners.map(p => p.id ?? 0)) + 1;
            updatedPartners = [...partners, { ...partner, id: newId }];
        }
        setPartners(updatedPartners);
        savePartners(updatedPartners);
    };

    const handleRatesChange = (newRates: Rate[]) => {
        setRates(newRates);
        saveRates(newRates);
    };

    if (!isClient) {
        return null;
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Comercial</h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                       {view === 'form' ? 'Crie, busque e gerencie cotações de frete.' : 'Gerencie e acompanhe o status de todas as suas propostas.'}
                    </p>
                </div>
                <Button variant="outline" onClick={() => setView(view === 'form' ? 'list' : 'form')}>
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
                    </TabsList>
                    <TabsContent value="quote" className="mt-6">
                        <FreightQuoteForm 
                            onQuoteCreated={handleQuoteCreated} 
                            partners={partners}
                            onRegisterCustomer={() => {}}
                            rates={rates}
                            fees={fees}
                            initialData={quoteToEdit || quoteToClone}
                            onQuoteUpdate={handleQuoteUpdate}
                        />
                    </TabsContent>
                    <TabsContent value="rates" className="mt-6">
                        <RatesTable rates={rates} onRatesChange={handleRatesChange} onSelectRate={() => {}} />
                    </TabsContent>
                    <TabsContent value="import" className="mt-6">
                        <RateImporter onRatesImported={(newRates) => setRates(prev => [...prev, ...newRates])} />
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
    );
}
