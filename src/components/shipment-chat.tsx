
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Shipment, type ChatMessage } from '@/lib/shipment-data-client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Send, Loader2, MessageSquare, Building, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';


interface ShipmentChatProps {
    shipment: Shipment;
    onUpdate: (shipment: Shipment) => void;
}


const DepartmentIcon = ({ department }: { department: ChatMessage['department'] }) => {
    if (department === 'Operacional') return <Building className="h-4 w-4 text-background/80" />;
    if (department === 'Financeiro') return <DollarSign className="h-4 w-4 text-background/80" />;
    return null;
}

export function ShipmentChat({ shipment, onUpdate }: ShipmentChatProps) {
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [department, setDepartment] = useState<'Operacional' | 'Financeiro'>('Operacional');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (shipment && scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [shipment, shipment?.chatMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !shipment) return;
        setIsLoading(true);

        const messageToSend: ChatMessage = {
            sender: 'CargaInteligente',
            message: newMessage,
            department: department,
            timestamp: new Date().toISOString(),
            readBy: ['user-1']
        };
        
        const updatedShipmentData = {
            ...shipment,
            chatMessages: [...(shipment.chatMessages || []), messageToSend],
        };

        updatedShipmentData.chatMessages = updatedShipmentData.chatMessages.map(msg => {
            if (msg.sender === 'Cliente' && !msg.readBy?.includes('user-1')) {
                return { ...msg, readBy: [...(msg.readBy || []), 'user-1'] };
            }
            return msg;
        });
        
        onUpdate(updatedShipmentData);
        
        setNewMessage('');
        setIsLoading(false);
    };
    
    return (
        <Card className="flex flex-col h-[600px]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5"/> Chat do Processo</CardTitle>
                <CardDescription>Comunique-se com o cliente e equipes internas sobre este embarque.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-hidden flex flex-col p-0">
                 <div className="flex flex-col h-full">
                    <ScrollArea className="flex-grow p-4" ref={scrollAreaRef as any}>
                        <div className="space-y-4">
                            {shipment?.chatMessages?.map((msg, index) => {
                                const isUser = msg.sender !== 'Cliente';
                                const showAvatar = (shipment?.chatMessages?.[index - 1]?.sender !== msg.sender);
                                return (
                                    <div key={index} className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
                                        {!isUser && (
                                            <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
                                                <AvatarFallback>{shipment?.customer?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        <div className={cn('max-w-xs md:max-w-md rounded-lg px-3 py-2', isUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                            {msg.department !== 'Sistema' && (
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <DepartmentIcon department={msg.department} />
                                                    <span className="text-xs font-semibold opacity-80">{msg.department}</span>
                                                </div>
                                            )}
                                            <p className="text-sm">{msg.message}</p>
                                            <p className={cn('text-xs mt-1 text-right', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                                {format(new Date(msg.timestamp), 'dd/MM HH:mm')}
                                            </p>
                                        </div>
                                        {isUser && (
                                            <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
                                                <AvatarFallback>CI</AvatarFallback>
                                            </Avatar>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t space-y-3 shrink-0">
                        <RadioGroup value={department} onValueChange={(v) => setDepartment(v as any)} className="flex gap-4">
                            <Label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="Operacional" id="op-dept-shipment" />Para Operacional</Label>
                            <Label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="Financeiro" id="fin-dept-shipment" />Para Financeiro</Label>
                        </RadioGroup>
                        <div className="flex gap-2">
                            <Input
                                placeholder={`Mensagem para ${department}...`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                                disabled={isLoading}
                            />
                            <Button onClick={handleSendMessage} disabled={isLoading || !newMessage.trim()}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
