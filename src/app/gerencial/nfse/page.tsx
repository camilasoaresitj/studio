
'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, ShieldCheck } from 'lucide-react';

function NfseContent() {
    const searchParams = useSearchParams();
    const data = searchParams.get('data');
    
    let parsedData = null;
    if (data) {
        try {
            parsedData = JSON.parse(decodeURIComponent(data));
        } catch (e) {
            console.error("Failed to parse NFS-e data", e);
        }
    }
    
    if (!parsedData) {
        return <p>Dados da NFS-e não encontrados. Por favor, gere a nota a partir do módulo financeiro.</p>
    }

    const handleSignAndSend = () => {
        // Here you would integrate with a digital signature service and then send the signed XML to the city hall's web service.
        alert("Simulação: O XML seria assinado com o certificado digital e enviado para a prefeitura via SOAP.");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Revisão e Envio de NFS-e</CardTitle>
                <CardDescription>
                    Revise o XML gerado para o RPS. Se tudo estiver correto, assine e envie para a prefeitura.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="font-semibold">RPS: {parsedData.formData.rps.numero} | Lote: {parsedData.formData.rps.loteId}</h3>
                    <p className="text-sm text-muted-foreground">Tomador: {parsedData.formData.tomador.razaoSocial}</p>
                </div>
                <Textarea value={parsedData.xml} readOnly className="h-96 font-mono text-xs" />
                <div className="flex justify-end gap-4">
                    <Button variant="outline">Salvar XML</Button>
                    <Button onClick={handleSignAndSend}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Assinar e Enviar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}


export default function NfsePage() {
    return (
        <div className="p-4 md:p-8">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <NfseContent />
            </Suspense>
        </div>
    );
}
