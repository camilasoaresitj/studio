
'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Shipment, Milestone, DocumentStatus } from '@/lib/shipment-data';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ship, CheckCircle2, Circle, Hourglass, AlertTriangle, FileText, Download, CalendarCheck2, FileWarning, MessageSquare, Wallet, Info, Anchor, Clock, Map as MapIcon } from 'lucide-react';
import { format, isValid, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BLDraftForm } from '@/components/bl-draft-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShipmentChat } from '@/components/shipment-chat';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { findPortByTerm } from '@/lib/ports';
import React from 'react';
import { ShipmentMap } from './shipment-map';
import { getStoredShipments, saveShipments } from '@/lib/shipment-data-client';

const MilestoneIcon = ({ status, predictedDate, isTransshipment }: { status: Milestone['status'], predictedDate?: Date | null, isTransshipment?: boolean }) => {
    if (!predictedDate || !isValid(predictedDate)) {
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
    if (isTransshipment) {
        return <Anchor className="h-6 w-6 text-blue-500" />;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = isPast(new Date(predictedDate)) && status !== 'completed';

    if (isOverdue) {
        return <AlertTriangle className="h-6 w-6 text-destructive" />;
    }
    if (status === 'completed') {
        return <CheckCircle2 className="h-6 w-6 text-success" />;
    }
    if (status === 'in_progress') {
        return <Hourglass className="h-6 w-6 text-primary animate-pulse" />;
    }
    return <Circle className="h-6 w-6 text-muted-foreground" />;
};

const TimeZoneClock = ({ timeZone, label }: { timeZone: string, label: string }) => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            try {
                const newTime = new Date().toLocaleTimeString('pt-BR', {
                    timeZone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                });
                setTime(newTime);
            } catch (error) {
                console.error(`Invalid time zone: ${timeZone}`);
                setTime('Inválido');
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [timeZone]);

    return (
        <div className="flex items-center gap-2 text-sm p-2 rounded-md bg-secondary">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
                <span className="font-semibold">{label}:</span>
                <span className="font-mono ml-1 font-bold text-primary">{time}</span>
            </div>
        </div>
    );
};

export function ClientPortalPage({ initialShipment, id }: { initialShipment: Shipment | undefined, id: string }) {
    const [shipment, setShipment] = useState<Shipment | null>(initialShipment || null);
    const [isLoading, setIsLoading] = useState(!initialShipment);
    const router = useRouter();

    useEffect(() => {
      if (!initialShipment) {
        setIsLoading(true);
        const allShipments = getStoredShipments();
        const data = allShipments.find(s => s.id === id);
        if (data) {
          setShipment(data);
        }
        setIsLoading(false);
      }
    }, [id, initialShipment]);
    
    const sortedMilestones = useMemo(() => {
        if (!shipment?.milestones) return [];
        
        // First, filter out any milestones that have an invalid or missing predictedDate.
        const validMilestones = shipment.milestones.filter(m => m.predictedDate && isValid(new Date(m.predictedDate)));
    
        // Use a Map to ensure uniqueness based on name and the date part of predictedDate.
        const uniqueMilestonesMap = new Map<string, Milestone>();
    
        validMilestones.forEach(current => {
            // TypeScript now knows predictedDate is a valid Date here.
            const dateKey = new Date(current.predictedDate!).toISOString().slice(0, 10);
            const uniqueKey = `${current.name}|${dateKey}`;
            
            // Only add the milestone if a similar one (same name on the same day) isn't already present.
            if (!uniqueMilestonesMap.has(uniqueKey)) {
                uniqueMilestonesMap.set(uniqueKey, current);
            }
        });
    
        const uniqueMilestones = Array.from(uniqueMilestonesMap.values());
    
        // Sort the final unique list by date.
        return uniqueMilestones.sort((a, b) => {
            // The sort is now safe because we've filtered out null/invalid dates.
            const dateA = a.predictedDate!.getTime();
            const dateB = b.predictedDate!.getTime();
            return dateA - dateB;
        });
    }, [shipment]);
    
    const foreignLocationClock = useMemo(() => {
        if (!shipment) return null;
        const originPort = findPortByTerm(shipment.origin);
        const destPort = findPortByTerm(shipment.destination);

        // Prioritize showing the foreign location's time.
        if (originPort && originPort.country !== 'BR') {
            return { label: originPort.name, timeZone: originPort.timeZone };
        }
        if (destPort && destPort.country !== 'BR') {
            return { label: destPort.name, timeZone: destPort.timeZone };
        }
        return null; // Return null if both are in BR or not found
    }, [shipment]);

    const handleUpdate = (updatedShipment: Shipment) => {
        setShipment(updatedShipment);
        const allShipments = getStoredShipments();
        const updatedShipments = allShipments.map(s => s.id === updatedShipment.id ? updatedShipment : s);
        if (typeof window !== 'undefined') {
            localStorage.setItem('cargaInteligente_shipments_v12', JSON.stringify(updatedShipments));
            window.dispatchEvent(new Event('shipmentsUpdated'));
        }
    }
    
    if (isLoading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Carregando dados do embarque...</p>
            </div>
        </div>
      );
    }

    if (!shipment) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center p-8">
                    <CardTitle className="text-2xl text-destructive">Embarque Não Encontrado</CardTitle>
                    <CardDescription className="mt-2">Não foi possível encontrar os detalhes para o processo solicitado.</CardDescription>
                    <Button onClick={() => router.push('/portal')} className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Portal
                    </Button>
                </Card>
            </div>
        );
    }
    
    // Filter out operational-only milestones for the client view
    const clientVisibleMilestones = sortedMilestones.filter(m => 
        !m.name.toLowerCase().includes('enviar draft mbl ao armador')
    );

    const documentsToShow = shipment.documents?.filter(doc => 
        ['Draft HBL', 'Original HBL', 'Invoice', 'Packing List', 'Extrato DUE'].includes(doc.name) && (doc.status === 'uploaded' || doc.status === 'approved')
    ) || [];

    const docCutoff = sortedMilestones.find(m => m.name.toLowerCase().includes('documental'));
    const cargoCutoff = sortedMilestones.find(m => m.name.toLowerCase().includes('gate in') || m.name.toLowerCase().includes('entrega'));
    
    const needsDraft = !shipment.blDraftData;

    const handleDownloadDocument = (doc: DocumentStatus) => {
        if (!doc.content) {
            alert('Conteúdo do documento não encontrado para download.');
            return;
        }

        const newWindow = window.open();
        if (newWindow) {
            newWindow.document.write(doc.content);
            newWindow.document.close();
        } else {
            alert('Por favor, desative o bloqueador de pop-ups para visualizar o documento.');
        }
    };


    return (
        <div className="p-4 md:p-8 space-y-6">
            <header>
                <Button variant="outline" onClick={() => router.push('/portal')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Meus Embarques
                </Button>
                <div className="flex flex-col sm:flex-row justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                            <Ship className="h-8 w-8 text-primary"/>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Processo #{shipment.id}</h1>
                            <p className="text-muted-foreground">De {shipment.origin} para {shipment.destination}</p>
                        </div>
                    </div>
                     <div className="flex gap-4 mt-2 sm:mt-0">
                        {foreignLocationClock && (
                            <TimeZoneClock label={foreignLocationClock.label} timeZone={foreignLocationClock.timeZone} />
                        )}
                    </div>
                </div>
            </header>
            
             {needsDraft && (
                <Alert variant="destructive" className="animate-in fade-in-50 duration-500">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Ação Necessária</AlertTitle>
                    <AlertDescription>
                        Por favor, preencha as instruções de embarque na aba "Instruções de Embarque (Draft)" para darmos continuidade ao processo.
                    </AlertDescription>
                </Alert>
            )}

            {shipment.operationalNotes && (
                <Alert className="animate-in fade-in-50 duration-500">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Avisos Importantes</AlertTitle>
                    <AlertDescription className="whitespace-pre-wrap">
                        {shipment.operationalNotes}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                     <Tabs defaultValue={needsDraft ? "draft" : "timeline"} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="timeline">Timeline e Mapa</TabsTrigger>
                            <TabsTrigger value="draft" className="relative">
                                Instruções de Embarque (Draft)
                                {needsDraft && <span className="absolute top-1 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
                            </TabsTrigger>
                             <TabsTrigger value="financials">Financeiro</TabsTrigger>
                            <TabsTrigger value="chat">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Chat
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="timeline" className="mt-4 space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <Card className="lg:col-span-2">
                                    <CardHeader><CardTitle>Timeline do Processo</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="relative pl-8">
                                            <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                            {clientVisibleMilestones.map((milestone, index) => (
                                                <div key={index} className="relative mb-8 flex items-start gap-6">
                                                    <div className={cn(
                                                        `absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full -translate-x-1/2`,
                                                        milestone.isTransshipment ? 'bg-blue-500 text-white' : (milestone.status === 'completed' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground')
                                                    )}>
                                                        <MilestoneIcon status={milestone.status} predictedDate={milestone.predictedDate ? new Date(milestone.predictedDate) : null} isTransshipment={milestone.isTransshipment} />
                                                    </div>
                                                    <div className="pt-1.5 ml-8">
                                                        <p className={`font-semibold ${milestone.isTransshipment ? 'text-blue-600' : (milestone.status !== 'completed' ? 'text-foreground' : 'text-success')}`}>{milestone.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {milestone.status === 'completed' && milestone.effectiveDate ? `Concluído em: ${format(new Date(milestone.effectiveDate), 'dd/MM/yyyy')}` : `Previsto para: ${milestone.predictedDate ? format(new Date(milestone.predictedDate), 'dd/MM/yyyy') : 'N/A'}`}
                                                        </p>
                                                         {milestone.details && (
                                                            <p className="text-xs text-muted-foreground italic mt-1">
                                                                {milestone.details}
                                                            </p>
                                                        )}
                                                         {(milestone.name.toLowerCase().includes('embarque') || milestone.name.toLowerCase().includes('chegada')) && shipment.vesselName && (
                                                            <p className="text-xs text-muted-foreground italic mt-1">
                                                                Navio: {shipment.vesselName}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                                 <div className="lg:col-span-1">
                                     {shipment.id ? (
                                        <ShipmentMap shipmentNumber={shipment.id} />
                                    ) : (
                                        <Card>
                                            <CardContent className="flex flex-col items-center justify-center h-96 text-center text-muted-foreground">
                                                <MapIcon className="h-12 w-12 mb-4" />
                                                <p>É necessário um ID de Processo para visualizar o mapa da rota.</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="draft">
                            <BLDraftForm shipment={shipment} onUpdate={handleUpdate} />
                        </TabsContent>
                         <TabsContent value="financials">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5"/> Financeiro</CardTitle>
                                    <CardDescription>Resumo dos valores de venda acordados para este processo.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Descrição da Taxa</TableHead>
                                                    <TableHead className="text-right">Valor de Venda</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {shipment.charges && shipment.charges.length > 0 ? (
                                                    shipment.charges.map(charge => (
                                                        <TableRow key={charge.id}>
                                                            <TableCell>{charge.name}</TableCell>
                                                            <TableCell className="text-right font-mono">{charge.saleCurrency} {charge.sale.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={2} className="text-center h-24">Nenhuma cobrança registrada.</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="chat">
                           <ShipmentChat shipment={shipment} onUpdate={handleUpdate} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Sidebar Area */}
                <div className="space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Informações da Viagem</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>ETD:</span><span className="font-medium">{shipment.etd && isValid(new Date(shipment.etd)) ? format(new Date(shipment.etd), 'dd/MM/yyyy') : 'N/A'}</span></div>
                            <div className="flex justify-between"><span>ETA:</span><span className="font-medium">{shipment.eta && isValid(new Date(shipment.eta)) ? format(new Date(shipment.eta), 'dd/MM/yyyy') : 'N/A'}</span></div>
                            <Separator/>
                            <div className="flex justify-between"><span>Transportadora:</span><span className="font-medium">{shipment.carrier || 'N/A'}</span></div>
                            <div className="flex justify-between"><span>Navio/Voo:</span><span className="font-medium">{shipment.vesselName || 'N/A'}</span></div>
                            <div className="flex justify-between"><span>Viagem:</span><span className="font-medium">{shipment.voyageNumber || 'N/A'}</span></div>
                             <Separator/>
                            <div className="flex justify-between"><span>Master BL/AWB:</span><span className="font-medium">{shipment.masterBillNumber || 'N/A'}</span></div>
                            <div className="flex justify-between"><span>House BL/AWB:</span><span className="font-medium">{shipment.houseBillNumber || 'N/A'}</span></div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Datas Limite (Cut-offs)</CardTitle></CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {docCutoff && (
                                <div className="flex items-start gap-3">
                                    <FileWarning className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Cut-off Documental</p>
                                        <p className="text-muted-foreground">{docCutoff.predictedDate ? format(new Date(docCutoff.predictedDate), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}</p>
                                    </div>
                                </div>
                            )}
                            {cargoCutoff && (
                                <div className="flex items-start gap-3">
                                    <CalendarCheck2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Cut-off de Carga</p>
                                        <p className="text-muted-foreground">{cargoCutoff.predictedDate ? format(new Date(cargoCutoff.predictedDate), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}</p>
                                    </div>
                                </div>
                            )}
                             {!docCutoff && !cargoCutoff && <p className="text-muted-foreground text-center">Nenhum cut-off informado.</p>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Documentos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {documentsToShow.length > 0 ? documentsToShow.map(doc => (
                                <Button key={doc.name} variant="outline" className="w-full justify-start" onClick={() => handleDownloadDocument(doc)}>
                                    <Download className="mr-2 h-4 w-4" /> {doc.name} ({doc.fileName})
                                </Button>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento disponível para este embarque.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
