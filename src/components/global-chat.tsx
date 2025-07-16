
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { sendChatMessage } from '@/app/actions';
import { getShipments, updateShipment } from '@/lib/shipment-data';
import type { Shipment, ChatMessage } from '@/lib/shipment';
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

export function GlobalChat({ isOpen, onOpenChange }: GlobalChatProps) {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [department, setDepartment] = useState<'Operacional' | 'Financeiro'>('Operacional');
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const conversations = useMemo(() => {
        return shipments
            .filter(s => s.chatMessages && s.chatMessages.length > 0)
            .map(s => {
                const lastMessage = s.chatMessages![s.chatMessages!.length - 1];
                const hasUnread = lastMessage.sender === 'Cliente' && !lastMessage.readBy?.includes('user-1'); // Assuming current user is 'user-1'
                return {
                    shipment: s,
                    lastMessage,
                    hasUnread,
                };
            })
            .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());
    }, [shipments]);

    useEffect(() => {
        if (isOpen) {
            setShipments(getShipments());
        }
    }, [isOpen]);
    
    useEffect(() => {
        if (selectedShipment && scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [selectedShipment, selectedShipment?.chatMessages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedShipment) return;
        setIsLoading(true);

        const response = await sendChatMessage(selectedShipment, {
            sender: 'CargaInteligente', // Or current user's name
            message: newMessage,
            department: department,
            readBy: ['user-1']
        });
        
        if (response.success && response.data) {
            setShipments(getShipments());
            setSelectedShipment(response.data as Shipment);
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
    
    const handleSelectConversation = (shipment: Shipment) => {
        const latestShipmentState = getShipments().find(s => s.id === shipment.id) || shipment;
        const lastMessage = latestShipmentState.chatMessages?.[latestShipmentState.chatMessages.length - 1];

        if (lastMessage && lastMessage.sender === 'Cliente' && !lastMessage.readBy?.includes('user-1')) {
            lastMessage.readBy = [...(lastMessage.readBy || []), 'user-1'];
            updateShipment(latestShipmentState);
            setShipments(getShipments());
        }
        
        setSelectedShipment(latestShipmentState);
    }
    
    const DepartmentIcon = ({ dept }: { dept: ChatMessage['department'] }) => {
        if (dept === 'Operacional') return <Building className="h-4 w-4 text-background/80" />;
        if (dept === 'Financeiro') return <DollarSign className="h-4 w-4 text-background/80" />;
        return null;
    }

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        {selectedShipment && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedShipment(null)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <MessageSquare className="h-6 w-6" />
                        {selectedShipment ? `Chat: ${selectedShipment.id}` : 'Conversas'}
                    </SheetTitle>
                    {selectedShipment && (
                        <SheetDescription>
                            Cliente: {selectedShipment.customer}
                        </SheetDescription>
                    )}
                </SheetHeader>
                
                <div className="flex-grow overflow-y-auto">
                {!selectedShipment ? (
                    <ScrollArea className="h-full">
                        {conversations.length > 0 ? conversations.map(({ shipment, lastMessage, hasUnread }) => (
                            <div key={shipment.id} className="flex items-center gap-3 p-3 border-b cursor-pointer hover:bg-accent" onClick={() => handleSelectConversation(shipment)}>
                                <Avatar className="relative">
                                    <AvatarFallback>{shipment.customer?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    {hasUnread && <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-destructive ring-2 ring-background" />}
                                </Avatar>
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold truncate">{shipment.id} - {shipment.customer}</p>
                                    <p className={cn("text-sm truncate", hasUnread ? "text-foreground font-medium" : "text-muted-foreground")}>
                                        {lastMessage.sender === 'Cliente' ? '' : 'Você: '}{lastMessage.message}
                                    </p>
                                </div>
                                <div className="text-xs text-muted-foreground text-right shrink-0">
                                    {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true, locale: ptBR })}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-muted-foreground p-8">
                                <p>Nenhuma conversa ativa.</p>
                            </div>
                        )}
                    </ScrollArea>
                ) : (
                    <div className="flex flex-col h-full">
                         <ScrollArea className="flex-grow p-4" ref={scrollAreaRef as any}>
                            <div className="space-y-4">
                                {selectedShipment.chatMessages?.map((msg, index) => {
                                    const isUser = msg.sender !== 'Cliente';
                                    const showAvatar = (selectedShipment.chatMessages?.[index - 1]?.sender !== msg.sender);
                                    return (
                                        <div key={index} className={cn('flex items-end gap-2', isUser ? 'justify-end' : 'justify-start')}>
                                            {!isUser && (
                                                <Avatar className={cn("h-8 w-8", !showAvatar && "invisible")}>
                                                    <AvatarFallback>{selectedShipment.customer?.substring(0, 2).toUpperCase()}</AvatarFallback>
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
                    </div>
                )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
