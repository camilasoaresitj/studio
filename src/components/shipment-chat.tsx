

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getShipments, updateShipment, getShipmentById } from '@/lib/shipment-data';
import type { Shipment, ChatMessage } from '@/lib/shipment-data';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, Loader2, MessageSquare, ArrowLeft, Building, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';

interface GlobalChatProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShipmentChat({ shipment, onUpdate }: { shipment: Shipment, onUpdate: (shipment: Shipment) => void }) {
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [department, setDepartment] = useState<'Operacional' | 'Financeiro'>('Operacional');
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (shipment && scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [shipment, shipment?.chatMessages]);
    
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !shipment) return;
        setIsLoading(true);

        const messageToSend: ChatMessage = {
            sender: 'CargaInteligente', // This would be the current user in a real app
            message: newMessage,
            department: department,
            timestamp: new Date().toISOString(),
            readBy: ['user-1'] // Assuming current user is 'user-1'
        };

        const updatedShipment = {
            ...shipment,
            chatMessages: [...(shipment.chatMessages || []), messageToSend],
        };
        
        onUpdate(updatedShipment);
        
        // Simulate saving to backend
        await new Promise(resolve => setTimeout(resolve, 300));

        setNewMessage('');
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
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare />
                    Chat do Processo
                </CardTitle>
                <CardDescription>
                    Converse com o cliente sobre este embarque. As mensagens são visíveis no Portal do Cliente.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-4">
                 <ScrollArea className="h-full" ref={scrollAreaRef as any}>
                    <div className="space-y-4">
                        {shipment.chatMessages?.map((msg, index) => {
                            const isUser = msg.sender !== 'Cliente';
                            const showAvatar = (shipment.chatMessages?.[index - 1]?.sender !== msg.sender);
                            return (
                                <div key={index} className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
                                    {!isUser && (
                                        <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
                                            <AvatarFallback>{shipment.customer?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn('max-w-xs md:max-w-md rounded-lg px-3 py-2', isUser ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
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
                                            <AvatarFallback>CI</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
            <div className="p-4 border-t space-y-3 shrink-0">
                <RadioGroup value={department} onValueChange={(v) => setDepartment(v as any)} className="flex gap-4">
                    <Label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="Operacional" id="op-dept" />Para Operacional</Label>
                    <Label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="Financeiro" id="fin-dept" />Para Financeiro</Label>
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
        </Card>
    );
}
