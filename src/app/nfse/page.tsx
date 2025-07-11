
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy } from 'lucide-react';

function NfseResult() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [xmlContent, setXmlContent] = useState('');
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(data));
        setXmlContent(decodedData.xml);
        setFormData(decodedData.formData);
      } catch (error) {
        console.error("Failed to parse NFS-e data", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao carregar dados',
            description: 'Não foi possível ler os dados da NFS-e. Por favor, tente gerar novamente.',
        });
      }
    }
  }, [searchParams, toast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlContent);
    toast({
      title: 'XML Copiado!',
      description: 'O conteúdo do XML foi copiado para a área de transferência.',
      className: 'bg-success text-success-foreground'
    });
  };

  if (!formData) {
    return (
        <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Carregando dados da NFS-e...</p>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8">
      <header className="mb-0">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">XML da NFS-e Gerado com Sucesso</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Copie o XML abaixo e utilize sua ferramenta de assinatura digital para transmiti-lo à prefeitura.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>XML para Envio do Lote de RPS</CardTitle>
          <CardDescription>
            Este é o conteúdo XML para o RPS <span className="font-bold text-primary">{formData.rps.numero}</span> do lote <span className="font-bold text-primary">{formData.rps.loteId}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            readOnly
            value={xmlContent}
            className="min-h-[400px] font-mono text-xs"
          />
          <Button onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar XML
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function NfsePage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <NfseResult />
        </Suspense>
    )
}
