
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
import { Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ShipmentChatProps {
    shipment: Shipment;
    onUpdate: (updatedShipment: Shipment) => void;
}

export function ShipmentChat({ shipment, onUpdate }: ShipmentChatProps) {
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        // Scroll to bottom when messages change
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [shipment.chatMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setIsLoading(true);

        const response = await sendChatMessage(shipment.id, {
            sender: 'Cliente',
            message: newMessage,
        });
        
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
                            return (
                                <div key={index} className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
                                    {!isUser && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>CI</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn('max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2', isUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                        <p className="text-sm">{msg.message}</p>
                                        <p className={cn('text-xs mt-1', isUser ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                            {format(new Date(msg.timestamp), 'dd/MM/yy HH:mm')}
                                        </p>
                                    </div>
                                    {isUser && (
                                        <Avatar className="h-8 w-8">
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
                <div className="flex gap-2 pt-4 border-t">
                    <Input
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                        disabled={isLoading}
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading || !newMessage.trim()}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
