
'use client';

import { useEffect, useState } from 'react';
import { getShipmentById, Shipment, Milestone, DocumentStatus } from '@/lib/shipment';
import { notFound, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Ship, CheckCircle2, Circle, Hourglass, AlertTriangle, FileText, Download, CalendarCheck2, FileWarning } from 'lucide-react';
import { format, isValid, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { BLDraftForm } from '@/components/bl-draft-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MilestoneIcon = ({ status, predictedDate }: { status: Milestone['status'], predictedDate?: Date | null }) => {
    if (!predictedDate || !isValid(predictedDate)) {
        return <Circle className="h-6 w-6 text-muted-foreground" />;
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


export default function ShipmentDetailPage({ params }: { params: { id: string } }) {
    const [shipment, setShipment] = useState<Shipment | null>(null);
    const router = useRouter();
    
    useEffect(() => {
        const data = getShipmentById(params.id);
        if (!data) {
            console.log('Shipment not found');
        }
        setShipment(data);
    }, [params.id]);
    
    const handleUpdate = (updatedShipment: Shipment) => {
        setShipment(updatedShipment);
        // You might want to save the updated shipment data back to your storage here.
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
    
    const sortedMilestones = [...(shipment.milestones || [])].sort((a, b) => {
        const dateA = a.predictedDate ? new Date(a.predictedDate).getTime() : 0;
        const dateB = b.predictedDate ? new Date(b.predictedDate).getTime() : 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
    });

    const documentsToShow = shipment.documents?.filter(doc => 
        ['Original HBL', 'Invoice', 'Packing List', 'Extrato DUE'].includes(doc.name) && doc.status === 'approved'
    ) || [];

    const docCutoff = sortedMilestones.find(m => m.name.toLowerCase().includes('documental'));
    const cargoCutoff = sortedMilestones.find(m => m.name.toLowerCase().includes('gate in') || m.name.toLowerCase().includes('entrega'));

    return (
        <div className="p-4 md:p-8 space-y-6">
            <header>
                <Button variant="outline" onClick={() => router.push('/portal')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Meus Embarques
                </Button>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <Ship className="h-8 w-8 text-primary"/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Processo #{shipment.id}</h1>
                        <p className="text-muted-foreground">De {shipment.origin} para {shipment.destination}</p>
                    </div>
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                     <Tabs defaultValue="timeline" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="timeline">Timeline</TabsTrigger>
                            <TabsTrigger value="draft">Instruções de Embarque (Draft)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="timeline">
                            <Card>
                                <CardHeader><CardTitle>Timeline do Processo</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="relative pl-8">
                                        <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
                                        {sortedMilestones.map((milestone, index) => (
                                            <div key={index} className="relative mb-8 flex items-start gap-4">
                                                <div className={cn(
                                                    `absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full -translate-x-1/2`,
                                                    milestone.status === 'completed' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                                                )}>
                                                    <MilestoneIcon status={milestone.status} predictedDate={milestone.predictedDate ? new Date(milestone.predictedDate) : null} />
                                                </div>
                                                <div className="pt-1.5">
                                                    <p className={`font-semibold ${milestone.status !== 'completed' ? 'text-foreground' : 'text-success'}`}>{milestone.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {milestone.status === 'completed' && milestone.effectiveDate ? `Concluído em: ${format(new Date(milestone.effectiveDate), 'dd/MM/yyyy')}` : `Previsto para: ${milestone.predictedDate ? format(new Date(milestone.predictedDate), 'dd/MM/yyyy') : 'N/A'}`}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="draft">
                            <BLDraftForm shipment={shipment} onUpdate={handleUpdate} />
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
                                <Button key={doc.name} variant="outline" className="w-full justify-start">
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
