
'use client';

import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Shipment, DocumentStatus } from '@/lib/shipment-data';
import { 
    Upload, 
    FileCheck,
    Download,
    CalendarIcon,
    Package,
    Loader2,
    Search
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import Image from 'next/image';
import { Switch } from '../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCourierStatus as runGetCourierStatus } from '@/app/actions';

const documentsFormSchema = z.object({
    documents: z.array(z.any()).optional(),
    mblPrintingAtDestination: z.boolean().optional(),
    mblPrintingAuthDate: z.date().optional().nullable(),
    courierName: z.string().optional(),
    courierTrackingNumber: z.string().optional(),
    courierSentDate: z.date().optional().nullable(),
});

type DocumentsFormData = z.infer<typeof documentsFormSchema>;

interface ShipmentDocumentsTabProps {
    shipment: Shipment;
}

export const ShipmentDocumentsTab = forwardRef<{ submit: () => Promise<any> }, ShipmentDocumentsTabProps>(({ shipment }, ref) => {
    const { toast } = useToast();
    const [documentPreviews, setDocumentPreviews] = useState<Record<string, string>>({});
    const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
    const [isTrackingCourier, setIsTrackingCourier] = useState(false);
    const [courierStatus, setCourierStatus] = useState<string | null>(shipment.courierLastStatus || null);

    const form = useForm<DocumentsFormData>({
        defaultValues: {
            documents: shipment.documents || [],
            mblPrintingAtDestination: shipment.mblPrintingAtDestination,
            mblPrintingAuthDate: shipment.mblPrintingAuthDate ? new Date(shipment.mblPrintingAuthDate) : null,
            courierName: shipment.courier,
            courierTrackingNumber: shipment.courierNumber,
            courierSentDate: shipment.courierSentDate ? new Date(shipment.courierSentDate) : null,
        }
    });
    
     useEffect(() => {
        form.reset({
            documents: shipment.documents || [],
            mblPrintingAtDestination: shipment.mblPrintingAtDestination,
            mblPrintingAuthDate: shipment.mblPrintingAuthDate ? new Date(shipment.mblPrintingAuthDate) : null,
            courierName: shipment.courier,
            courierTrackingNumber: shipment.courierNumber,
            courierSentDate: shipment.courierSentDate ? new Date(shipment.courierSentDate) : null,
        });
        setCourierStatus(shipment.courierLastStatus || null);
    }, [shipment, form]);

    useImperativeHandle(ref, () => ({
        submit: async () => {
            const values = form.getValues();
            const currentShipmentMilestones = shipment.milestones || [];
            
            const updatedDocuments = (values.documents || []).map(doc => {
                const uploadedFile = uploadedFiles[doc.name];
                if (uploadedFile) {
                    return {
                        ...doc,
                        status: doc.status === 'pending' ? 'uploaded' : doc.status,
                        fileName: uploadedFile.name,
                        uploadedAt: new Date(),
                    };
                }
                return doc;
            });
            
            const hblDoc = updatedDocuments.find(d => (d.name === 'Draft HBL' || d.name === 'Original HBL') && d.status === 'approved');
            const originalHblDoc = shipment.documents?.find(d => (d.name === 'Draft HBL' || d.name === 'Original HBL'));

            const hblMilestoneExists = currentShipmentMilestones.some(m => m.name === 'HBL Aprovado');
            let updatedMilestones = [...currentShipmentMilestones];
            
            if (hblDoc && originalHblDoc?.status !== 'approved' && !hblMilestoneExists) {
                updatedMilestones.push({
                    name: 'HBL Aprovado',
                    status: 'completed',
                    predictedDate: new Date(),
                    effectiveDate: new Date(),
                    details: `HBL aprovado pelo usuário.`
                });
            }

            return { 
                documents: updatedDocuments,
                milestones: updatedMilestones,
                mblPrintingAtDestination: values.mblPrintingAtDestination,
                mblPrintingAuthDate: values.mblPrintingAuthDate,
                courier: values.courierName,
                courierNumber: values.courierTrackingNumber,
                courierSentDate: values.courierSentDate,
                courierLastStatus: courierStatus,
            };
        }
    }));
    
    const handleDocumentUpload = (docName: string, file: File | null) => {
        if (!file) return;

        setUploadedFiles(prev => ({ ...prev, [docName]: file }));
        
        const currentDocs = form.getValues('documents') || [];
        const updatedDocs = currentDocs.map(doc => 
            doc.name === docName ? { ...doc, status: 'uploaded', fileName: file.name, uploadedAt: new Date() } : doc
        );
        form.setValue('documents', updatedDocs);

        const reader = new FileReader();
        reader.onloadend = () => {
            setDocumentPreviews(prev => ({ ...prev, [docName]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleDownload = (doc: DocumentStatus) => {
        const file = uploadedFiles[doc.name];
        if (file) {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if(doc.content) {
            const newWindow = window.open();
            if(newWindow) {
                newWindow.document.write(doc.content);
                newWindow.document.close();
            }
        } else {
            toast({ variant: "destructive", title: "Arquivo não encontrado", description: "O arquivo não foi anexado nesta sessão." });
        }
    };
    
     const handleApproveDocument = (docNameToApprove: string) => {
        const currentDocs = form.getValues('documents') || [];
        const updatedDocs = currentDocs.map(doc =>
            doc.name === docNameToApprove ? { ...doc, status: 'approved' } : doc
        );
        form.setValue('documents', updatedDocs);

        toast({
            title: `Documento "${docNameToApprove}" marcado como aprovado.`,
            description: 'Clique em "Salvar Alterações" para confirmar.',
        });
    };
    
    const handleTrackCourier = async () => {
        const courierName = form.getValues('courierName');
        const trackingNumber = form.getValues('courierTrackingNumber');

        if (!courierName || !trackingNumber) {
            toast({ variant: 'destructive', title: 'Dados incompletos', description: 'Preencha o nome do courier e o número de rastreio.'});
            return;
        }

        setIsTrackingCourier(true);
        setCourierStatus('Rastreando...');
        const response = await runGetCourierStatus({ courier: courierName, trackingNumber });
        if (response.success && response.data) {
            setCourierStatus(response.data.lastStatus);
        } else {
            setCourierStatus(`Erro: ${response.error}`);
        }
        setIsTrackingCourier(false);
    }
    
    const mblPrintingAtDestination = form.watch('mblPrintingAtDestination');
    const documents = form.watch('documents') || [];

    return (
        <Form {...form}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Documento</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Arquivo</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {documents.map((doc, index) => {
                                const previewUrl = documentPreviews[doc.name];
                                const hasFile = doc.fileName || uploadedFiles[doc.name];
                                return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={doc.status === 'approved' ? 'success' : (doc.status === 'uploaded' ? 'default' : 'secondary')}>
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {hasFile ? (
                                             <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <a href="#" className="text-primary hover:underline" onClick={(e) => { e.preventDefault(); handleDownload(doc); }}>
                                                            {uploadedFiles[doc.name]?.name || doc.fileName}
                                                        </a>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {previewUrl ? (
                                                            <Image src={previewUrl} alt={`Preview de ${doc.fileName}`} width={200} height={200} className="object-contain" />
                                                        ) : (
                                                            <p>Pré-visualização indisponível.</p>
                                                        )}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm" className="mr-2">
                                            <label htmlFor={`upload-${doc.name}`} className="cursor-pointer"><Upload className="mr-2 h-4 w-4"/> Anexar</label>
                                        </Button>
                                        <Input id={`upload-${doc.name}`} type="file" className="hidden" onChange={(e) => handleDocumentUpload(doc.name, e.target.files ? e.target.files[0] : null)} />
                                        <Button variant="ghost" size="sm" onClick={() => handleApproveDocument(doc.name)} disabled={doc.status !== 'uploaded'}>
                                            <FileCheck className="mr-2 h-4 w-4"/> Aprovar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                </div>

                <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                        <h3 className="text-base font-semibold mb-4">Configurações de Impressão</h3>
                         <FormField
                            control={form.control}
                            name="mblPrintingAtDestination"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between gap-4 space-y-0">
                                    <div className="space-y-0.5">
                                        <FormLabel>Emissão MBL no Destino</FormLabel>
                                        <p className="text-xs text-muted-foreground">Ative para Impressão no destino</p>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="mblPrintingAuthDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col mt-4">
                                    <FormLabel>Data de Autorização de Impressão</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Selecione a data</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    
                    {!mblPrintingAtDestination && (
                         <div className="p-4 border rounded-lg animate-in fade-in-50 duration-500">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2"><Package/> Envio dos Documentos Originais por Courrier</h3>
                             <div className="space-y-4">
                                 <FormField control={form.control} name="courierName" render={({ field }) => (
                                    <FormItem><FormLabel>Courrier</FormLabel><FormControl><Input placeholder="Ex: DHL, FedEx" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="courierTrackingNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Nº de Rastreio</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl><Input placeholder="Ex: 1234567890" {...field} /></FormControl>
                                            <Button type="button" variant="secondary" onClick={handleTrackCourier} disabled={isTrackingCourier}>
                                                {isTrackingCourier ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name="courierSentDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Data de Envio</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild><FormControl>
                                                <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Selecione a data</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl></PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} /></PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}/>
                                {courierStatus && (
                                    <div className="pt-2">
                                        <p className="text-sm font-semibold">Último Status:</p>
                                        <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{courierStatus}</p>
                                    </div>
                                )}
                             </div>
                         </div>
                    )}
                </div>
            </div>
        </Form>
    );
});

ShipmentDocumentsTab.displayName = 'ShipmentDocumentsTab';
