
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileKey, ShieldCheck, Loader2 } from 'lucide-react';

export function CertificateSettings() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && (selectedFile.name.endsWith('.pfx') || selectedFile.name.endsWith('.p12'))) {
      setFile(selectedFile);
    } else {
      toast({
        variant: 'destructive',
        title: 'Arquivo Inválido',
        description: 'Por favor, selecione um arquivo de certificado válido (.pfx ou .p12).',
      });
    }
  };

  const handleUpload = async () => {
    if (!file || !password) {
      toast({
        variant: 'destructive',
        title: 'Dados Incompletos',
        description: 'Por favor, selecione o arquivo do certificado e insira a senha.',
      });
      return;
    }
    setIsUploading(true);
    // Simulate API call to securely upload and verify the certificate
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`Uploading certificate: ${file.name}`);
    toast({
      title: 'Certificado Salvo!',
      description: 'Seu certificado digital foi configurado com sucesso.',
      className: 'bg-success text-success-foreground'
    });
    setIsUploading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center p-6 border-2 border-dashed rounded-lg">
                    <FileKey className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Upload do Certificado Digital A1</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Selecione o arquivo .pfx ou .p12 do seu computador.
                    </p>
                    <Button asChild variant="outline">
                        <label htmlFor="certificate-upload">
                            <Upload className="mr-2 h-4 w-4" />
                            Selecionar Arquivo
                            <Input id="certificate-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pfx,.p12" />
                        </label>
                    </Button>
                    {file && (
                        <p className="mt-4 text-sm font-medium text-success">
                           Arquivo selecionado: <span className="font-bold">{file.name}</span>
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="pt-6 space-y-4">
                 <div>
                    <label htmlFor="certificate-password" className="text-sm font-medium">Senha do Certificado</label>
                    <Input
                        id="certificate-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1"
                    />
                </div>
                <Button onClick={handleUpload} disabled={isUploading || !file || !password} className="w-full">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
                    Salvar e Validar Certificado
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
