
'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { Shipment, DocumentStatus } from '@/lib/shipment-data';
import { 
    Upload, 
    FileCheck,
    Download
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

const documentsFormSchema = z.object({
    documents: z.array(z.any()).optional(),
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
            return { documents: updatedDocuments };
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
    
    return (
        <Form {...form}>
            <Card>
                <CardHeader>
                    <CardTitle>Gestão de Documentos</CardTitle>
                    <CardDescription>Anexe, aprove e gerencie os documentos do processo.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </Form>
    );
});

ShipmentDocumentsTab.displayName = 'ShipmentDocumentsTab';
