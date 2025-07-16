
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Briefcase,
  Truck,
  Landmark,
  Clock,
  Ship,
  CalendarClock,
  Settings,
  User,
  MessageSquare,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { Shipment } from '@/lib/shipment';
import { getShipments } from '@/lib/shipment';
import { GlobalChat } from '../global-chat';

const menuItems = [
  { href: '/', label: 'Gerencial', icon: LayoutDashboard },
  { href: '/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/operacional', label: 'Operacional', icon: Truck },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/demurrage', label: 'Demurrage', icon: Clock },
  { href: '/schedules', label: 'Schedules', icon: CalendarClock },
  { href: '/portal', label: 'Portal Cliente', icon: User },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function MainSidebar() {
  const pathname = usePathname();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { isMobile, setOpenMobile } = useSidebar();


  useEffect(() => {
    const calculateUnread = () => {
        if(typeof window === 'undefined') return;
        const shipments = getShipments();
        const count = shipments.reduce((acc, s) => {
            const hasUnread = s.chatMessages?.some(m => m.sender === 'Cliente' && !m.readBy?.includes('user-1')); // Assuming user-1 is the current user
            return acc + (hasUnread ? 1 : 0);
        }, 0);
        setUnreadMessagesCount(count);
    };

    calculateUnread();
    
    // Listen for custom events that might indicate a change in chat messages
    window.addEventListener('shipmentsUpdated', calculateUnread);
    window.addEventListener('storage', calculateUnread);

    return () => {
        window.removeEventListener('shipmentsUpdated', calculateUnread);
        window.removeEventListener('storage', calculateUnread);
    };
  }, []);

  const handleChatToggle = () => {
    setIsChatOpen(prev => !prev);
    if(isMobile) {
        setOpenMobile(false);
    }
  }


  return (
    <>
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
            <Ship className="w-8 h-8 text-sidebar-primary" />
            <span className="text-xl font-semibold text-sidebar-foreground">CargaInteligente</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
           <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleChatToggle}
                tooltip="Chat"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Chat</span>
                {unreadMessagesCount > 0 && (
                     <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs">
                        {unreadMessagesCount}
                    </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-xs text-center text-sidebar-foreground/50 p-4">
          © {new Date().getFullYear()} CargaInteligente
        </div>
      </SidebarFooter>
    </Sidebar>
    <GlobalChat isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}
