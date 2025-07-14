
'use client';

import { useState } from 'react';
import { FreightQuoteForm } from '@/components/freight-quote-form';
import { CustomerQuotesList } from '@/components/customer-quotes-list';
import type { Quote } from '@/components/customer-quotes-list';
import { getPartners, savePartners, type Partner } from '@/lib/partners-data';
import { getFees, saveFees, type Fee } from '@/lib/fees-data';
import type { Rate } from '@/components/rates-table';
import type { FreightQuoteFormData } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import { getInitialRates, getInitialQuotes } from '@/lib/initial-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RatesTable } from '@/components/rates-table';
import { saveRates } from '@/lib/rates-data';
import { RateImporter } from '@/components/rate-importer';
import { PartnersRegistry } from '@/components/partners-registry';
import { FeesRegistry } from '@/components/fees-registry';
import { CrmForm } from '@/components/crm-form';


export default function ComercialPage() {
  const [rates, setRates] = useState<Rate[]>(getInitialRates);
  const [quotes, setQuotes] = useState<Quote[]>(getInitialQuotes);
  const [partners, setPartners] = useState<Partner[]>(getPartners);
  const [fees, setFees] = useState<Fee[]>(getFees);
  const [quoteFormData, setQuoteFormData] = useState<Partial<FreightQuoteFormData> | null>(null);
  const [activeTab, setActiveTab] = useState('cotacao');
  const [quoteToDetail, setQuoteToDetail] = useState<Quote | null>(null); // State for the detail/costing sheet
  const { toast } = useToast();

  const handleRatesChange = (newRates: Rate[]) => {
      setRates(newRates);
      saveRates(newRates);
  };
  
  const handleRatesImported = (importedRates: any[]) => {
    setRates(prev => {
        const existingRateIds = new Set(prev.map(r => r.id));
        let nextId = prev.length > 0 ? Math.max(...prev.map(r => r.id)) + 1 : 1;
        const newRates = importedRates.map(ir => ({...ir, id: nextId++}));
        const updatedRates = [...prev, ...newRates];
        saveRates(updatedRates);
        return updatedRates;
    });
  };

  const handlePartnerSaved = (partnerToSave: Partner) => {
    setPartners(prevPartners => {
        let updatedPartners;
        const existingPartner = prevPartners.find(p => p.id && p.id === partnerToSave.id);

        if (existingPartner) {
            updatedPartners = prevPartners.map(p => p.id === partnerToSave.id ? partnerToSave : p);
        } else {
            const newId = Math.max(0, ...prevPartners.map(p => p.id ?? 0)) + 1;
            updatedPartners = [...prevPartners, { ...partnerToSave, id: newId }];
        }
        savePartners(updatedPartners);
        return updatedPartners;
    });
  };
  
  const handleFeeSaved = (feeToSave: Fee) => {
    setFees(prevFees => {
        const index = prevFees.findIndex(f => f.id === feeToSave.id);
        if (index > -1) {
            const newFees = [...prevFees];
            newFees[index] = feeToSave;
            saveFees(newFees);
            return newFees;
        } else {
            const newFee = { ...feeToSave, id: (prevFees.length ?? 0) + 1 };
            const newFees = [...prevFees, newFee];
            saveFees(newFees);
            return newFees;
        }
    });
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
      setQuoteToDetail(quote);
  }

  return (
    <div className="p-4 md:p-8">
      <header className="mb-8">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Módulo Comercial</h1>
            <p className="text-muted-foreground mt-2 text-lg">
            Gerencie suas oportunidades, cotações, tarifas e clientes.
            </p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="cotacao">Cotação de Frete</TabsTrigger>
            <TabsTrigger value="lista_cotacoes">Lista de Cotações</TabsTrigger>
            <TabsTrigger value="gestao_tarifas">Gestão de Tarifas</TabsTrigger>
            <TabsTrigger value="cadastros">Cadastros</TabsTrigger>
            <TabsTrigger value="crm">CRM Automático</TabsTrigger>
        </TabsList>
        <TabsContent value="cotacao" className="mt-6">
            <FreightQuoteForm 
                key={JSON.stringify(quoteFormData)}
                initialData={quoteFormData}
                onQuoteCreated={handleQuoteCreated} 
                partners={partners}
                onRegisterCustomer={() => setActiveTab('cadastros')}
                rates={rates}
                fees={fees}
                onQuoteUpdate={handleQuoteUpdated}
            />
        </TabsContent>
         <TabsContent value="lista_cotacoes" className="mt-6">
            <CustomerQuotesList
                quotes={quotes}
                partners={partners}
                onQuoteUpdate={handleQuoteUpdated}
                onPartnerSaved={handlePartnerSaved}
                onClose={() => setActiveTab('cotacao')}
                onEditQuote={handleSelectQuoteToEdit}
                quoteToDetail={quoteToDetail}
                setQuoteToDetail={setQuoteToDetail}
            />
        </TabsContent>
        <TabsContent value="gestao_tarifas" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importador de Tarifas</CardTitle>
                    <CardDescription>Cole o conteúdo de um e-mail/planilha para que a IA extraia as tarifas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RateImporter onRatesImported={handleRatesImported} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Taxas Padrão</CardTitle>
                     <CardDescription>Configure as taxas padrão que serão usadas nas cotações.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FeesRegistry fees={fees} onSave={handleFeeSaved} />
                </CardContent>
            </Card>
            <RatesTable rates={rates} onRatesChange={handleRatesChange} onSelectRate={() => {}} />
        </TabsContent>
        <TabsContent value="cadastros" className="mt-6 space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>Cadastro de Parceiros</CardTitle>
                    <CardDescription>Gerencie seus clientes, fornecedores e agentes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <PartnersRegistry partners={partners} onPartnerSaved={handlePartnerSaved} />
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="crm" className="mt-6">
            <CrmForm />
        </TabsContent>
      </Tabs>
      
    </div>
  );
}
