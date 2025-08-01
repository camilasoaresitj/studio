
'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
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
    Package
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
import { Separator } from '../ui/separator';

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

    useImperativeHandle(ref, () => ({
        submit: async () => {
            const values = form.getValues();
            // We need to merge the uploaded files into the shipment data before returning
            const updatedDocuments = (values.documents || []).map(doc => {
                const uploadedFile = uploadedFiles[doc.name];
                if (uploadedFile) {
                    return {
                        ...doc,
                        status: 'uploaded' as const,
                        fileName: uploadedFile.name,
                        uploadedAt: new Date(),
                    };
                }
                return doc;
            });
            return { 
                documents: updatedDocuments,
                mblPrintingAtDestination: values.mblPrintingAtDestination,
                mblPrintingAuthDate: values.mblPrintingAuthDate,
                courier: values.courierName,
                courierNumber: values.courierTrackingNumber,
                courierSentDate: values.courierSentDate,
            };
        }
    }));
    
    const handleDocumentUpload = (docName: string, file: File | null) => {
        if (!file) return;

        setUploadedFiles(prev => ({ ...prev, [docName]: file }));

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
        } else {
            toast({ variant: "destructive", title: "Arquivo não encontrado", description: "O arquivo não foi anexado nesta sessão." });
        }
    };
    
    const mblPrintingAtDestination = form.watch('mblPrintingAtDestination');

    return (
        <Form {...form}>
            <Card>
                <CardHeader>
                    <CardTitle>Gestão de Documentos</CardTitle>
                    <CardDescription>Anexe, aprove e gerencie os documentos do processo.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                {(shipment.documents || []).map((doc, index) => {
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
                                            <Button variant="ghost" size="sm" disabled={doc.status !== 'uploaded'}><FileCheck className="mr-2 h-4 w-4"/> Aprovar</Button>
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
                                            <p className="text-xs text-muted-foreground">Ative para Express Release ou envio por Courrier.</p>
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
                                        <FormItem><FormLabel>Nº de Rastreio</FormLabel><FormControl><Input placeholder="Ex: 1234567890" {...field} /></FormControl><FormMessage /></FormItem>
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
                                 </div>
                             </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </Form>
    );
});

ShipmentDocumentsTab.displayName = 'ShipmentDocumentsTab';
