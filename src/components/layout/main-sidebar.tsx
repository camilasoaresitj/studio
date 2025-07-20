'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Truck,
  Landmark,
  Clock,
  CalendarClock,
  Settings,
  User,
  Calculator,
  Ship,
  Bot,
  Mail
} from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarProvider as ActualSidebarProvider,
} from '@/components/ui/sidebar';
import { GlobalChat } from '../global-chat';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/operacional', label: 'Operacional', icon: Truck },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/demurrage', label: 'Demurrage', icon: Clock },
  { href: '/schedules', label: 'Schedules', icon: CalendarClock },
  { href: '/simulador-di', label: 'Simulador DI', icon: Calculator },
  { href: '/tracking', label: 'Rastreamento', icon: Ship },
  { href: '/crm', label: 'CRM / IA', icon: Bot },
  { href: '/tasks', label: 'Monitor de Tarefas', icon: Mail },
];

const bottomMenuItems = [
  { href: '/portal', label: 'Portal Cliente', icon: User },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function MainSidebar() {
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  return (
    <>
      <Sidebar>
        <SidebarHeader>
           <Link href="/" className="flex items-center gap-2">
              <Ship className="w-8 h-8 text-primary" />
              <span className="text-xl font-semibold text-sidebar-foreground">CargaInteligente</span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             {bottomMenuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
           <div className="p-2">
            <Button variant="outline" className="w-full" onClick={() => setIsChatOpen(true)}>
                Chat
            </Button>
           </div>
        </SidebarFooter>
      </Sidebar>
       <GlobalChat isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
    </>
  );
}

export const SidebarProvider = ActualSidebarProvider;
