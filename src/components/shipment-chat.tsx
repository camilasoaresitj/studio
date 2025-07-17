

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Shipment, ChatMessage } from '@/lib/shipment';
import { sendChatMessage } from '@/app/actions';
import { Loader2, Send, Building, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface ShipmentChatProps {
    shipment: Shipment;
    onUpdate: (updatedShipment: Shipment) => void;
}

export function ShipmentChat({ shipment, onUpdate }: ShipmentChatProps) {
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [department, setDepartment] = useState<'Operacional' | 'Financeiro'>('Operacional');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [shipment.chatMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setIsLoading(true);

        const messageToSend: ChatMessage = {
            sender: 'Cliente',
            message: newMessage,
            department: department,
            timestamp: new Date().toISOString(),
            readBy: []
        };

        const response = await sendChatMessage(shipment.id, messageToSend);

        if (response.success && response.data) {
            onUpdate(response.data);
            setNewMessage('');
        } else {
             toast({
                variant: 'destructive',
                title: 'Erro ao Enviar Mensagem',
                description: response.error || 'Não foi possível enviar sua mensagem. Tente novamente.',
            });
        }
        
        setIsLoading(false);
    };
    
    const DepartmentIcon = ({ dept }: { dept: ChatMessage['department'] }) => {
        if (dept === 'Operacional') return <Building className="h-4 w-4 text-background/80" />;
        if (dept === 'Financeiro') return <DollarSign className="h-4 w-4 text-background/80" />;
        return null;
    }

    return (
        <Card className="flex flex-col h-[70vh]">
            <CardHeader>
                <CardTitle>Chat do Processo</CardTitle>
                <CardDescription>Converse com nossa equipe sobre este embarque.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col overflow-hidden">
                <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef as any}>
                    <div className="space-y-4">
                        {(shipment.chatMessages || []).map((msg, index) => {
                            const isUser = msg.sender === 'Cliente';
                            const showAvatar = (shipment.chatMessages?.[index-1]?.sender !== msg.sender);
                            return (
                                <div key={index} className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
                                    {!isUser && (
                                        <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
                                            <AvatarFallback>CI</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn('max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2', isUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                        {msg.department !== 'Sistema' && (
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <DepartmentIcon dept={msg.department} />
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
                                            <AvatarFallback>
                                                {shipment.customer?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            );
                        })}
                         {(!shipment.chatMessages || shipment.chatMessages.length === 0) && (
                            <div className="text-center text-muted-foreground p-8">
                                <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="pt-4 border-t space-y-3">
                    <RadioGroup value={department} onValueChange={(v) => setDepartment(v as any)} className="flex gap-4">
                        <Label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="Operacional" id="op-dept" />
                            Para Operacional
                        </Label>
                         <Label className="flex items-center gap-2 cursor-pointer">
                            <RadioGroupItem value="Financeiro" id="fin-dept" />
                            Para Financeiro
                        </Label>
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
            </CardContent>
        </Card>
    );
}
