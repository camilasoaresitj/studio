
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileKey, ShieldCheck, Loader2 } from 'lucide-react';

interface CertificateUploaderProps {
  title: string;
  description: string;
}

function CertificateUploader({ title, description }: CertificateUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && (selectedFile.name.endsWith('.pfx') || selectedFile.name.endsWith('.p12'))) {
      setFile(selectedFile);
    } else {
      setFile(null);
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
    console.log(`Uploading certificate: ${file.name} for ${title}`);
    toast({
      title: 'Certificado Salvo!',
      description: `O certificado para "${title}" foi configurado com sucesso.`,
      className: 'bg-success text-success-foreground'
    });
    setIsUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center text-center p-4 border-2 border-dashed rounded-lg">
            <FileKey className="h-10 w-10 text-muted-foreground mb-3" />
            <Button asChild variant="outline" size="sm">
                <label htmlFor={`certificate-upload-${title.replace(/\s+/g, '-')}`}>
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Arquivo
                    <Input id={`certificate-upload-${title.replace(/\s+/g, '-')}`} type="file" className="hidden" onChange={handleFileChange} accept=".pfx,.p12" />
                </label>
            </Button>
            {file && (
                <p className="mt-3 text-xs font-medium text-success">
                   Arquivo: <span className="font-bold">{file.name}</span>
                </p>
            )}
        </div>
        <div>
            <label htmlFor={`password-${title.replace(/\s+/g, '-')}`} className="text-sm font-medium">Senha do Certificado</label>
            <Input
                id={`password-${title.replace(/\s+/g, '-')}`}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
            />
        </div>
        <Button onClick={handleUpload} disabled={isUploading || !file || !password} className="w-full">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
            Salvar Certificado
        </Button>
      </CardContent>
    </Card>
  );
}


export function CertificateSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CertificateUploader 
            title="Certificado da Empresa (CNPJ)"
            description="Usado para emissão de NFS-e e outras operações da empresa."
        />
        <CertificateUploader 
            title="Certificado do Despachante (CPF)"
            description="Usado para consultas e registros no Siscomex."
        />
        <CertificateUploader 
            title="Certificado do Agente (CPF)"
            description="Usado para consultas na Marinha Mercante e outros sistemas."
        />
    </div>
  );
}
