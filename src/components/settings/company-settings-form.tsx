
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '../ui/card';

const companySchema = z.object({
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  nomeFantasia: z.string().min(1, 'Nome Fantasia é obrigatório'),
  cnpj: z.string().length(18, 'CNPJ inválido. Formato: 00.000.000/0001-00'),
  inscricaoMunicipal: z.string().min(1, 'Inscrição Municipal é obrigatória'),
  endereco: z.string().min(1, 'Endereço é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().length(2, 'UF deve ter 2 caracteres'),
  cep: z.string().length(9, 'CEP inválido. Formato: 00000-000'),
  telefone: z.string().min(10, 'Telefone inválido'),
  logoDataUrl: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export function CompanySettingsForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      razaoSocial: 'LTI DO BRASIL LTDA',
      nomeFantasia: 'CargaInteligente',
      cnpj: '10.298.168/0001-89',
      inscricaoMunicipal: '348',
      endereco: 'Rua Domingos Fascin Neto, 584',
      cidade: 'Itajaí',
      estado: 'SC',
      cep: '88306-720',
      telefone: '(47) 3045-3944',
      logoDataUrl: '',
    },
  });

  useEffect(() => {
      setIsClient(true);
      const savedData = localStorage.getItem('company_settings');
      if (savedData) {
          form.reset(JSON.parse(savedData));
      }
  }, [form]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if(file.size > 1024 * 500) { // 500KB limit
        toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Por favor, selecione um logo com menos de 500KB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logoDataUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if(isClient) {
      localStorage.setItem('company_settings', JSON.stringify(data));
    }

    toast({
      title: 'Dados da Empresa Salvos!',
      description: 'As informações da sua empresa foram atualizadas com sucesso.',
      className: 'bg-success text-success-foreground'
    });
    setIsSaving(false);
  };
  
  const logoUrl = form.watch('logoDataUrl');

  if (!isClient) {
      return (
          <div className="flex h-40 w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="razaoSocial" render={({ field }) => (
                <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="nomeFantasia" render={({ field }) => (
                <FormItem><FormLabel>Nome Fantasia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="cnpj" render={({ field }) => (
                <FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0001-00" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="inscricaoMunicipal" render={({ field }) => (
                <FormItem><FormLabel>Inscrição Municipal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
        <FormField control={form.control} name="endereco" render={({ field }) => (
            <FormItem><FormLabel>Endereço Completo</FormLabel><FormControl><Input placeholder="Rua, número, bairro" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="estado" render={({ field }) => (
                <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input maxLength={2} placeholder="SC" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="cep" render={({ field }) => (
                <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </div>
         <FormField control={form.control} name="telefone" render={({ field }) => (
            <FormItem className="max-w-xs"><FormLabel>Telefone</FormLabel><FormControl><Input placeholder="(00) 0000-0000" {...field} /></FormControl><FormMessage /></FormItem>
        )}/>

        <Card>
            <CardContent className="pt-6">
                <FormLabel>Logo da Empresa</FormLabel>
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-2">
                    <div className="w-48 h-24 flex items-center justify-center border-2 border-dashed rounded-lg bg-muted/50">
                        {logoUrl ? (
                            <Image src={logoUrl} alt="Logo da Empresa" width={180} height={90} className="object-contain" />
                        ) : (
                            <div className="text-center text-muted-foreground text-sm p-2">
                                <ImageIcon className="mx-auto h-8 w-8 mb-1" />
                                Sem logo
                            </div>
                        )}
                    </div>
                    <div className="flex-1 space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Faça o upload de uma imagem (.png, .jpg) com no máximo 500KB. A imagem será redimensionada para os documentos.
                        </p>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2 h-4 w-4" /> Selecionar Logo
                        </Button>
                        <Input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                Salvar Alterações
            </Button>
        </div>
      </form>
    </Form>
  );
}
