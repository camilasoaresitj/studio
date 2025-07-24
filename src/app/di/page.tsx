'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Truck,
  Landmark,
  Clock,
  Settings,
  User,
  Calculator,
  Ship,
  Users,
  BookUser,
  FileCode,
} from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarProvider as ActualSidebarProvider,
} from '@/components/ui/sidebar';
import { GlobalChat } from '../global-chat';

const menuItems = [
  { href: '/gerencial', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/gerencial/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/gerencial/operacional', label: 'Operacional', icon: Truck },
  { href: '/gerencial/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/gerencial/rh', label: 'RH', icon: Users },
  { href: '/gerencial/demurrage', label: 'Demurrage', icon: Clock },
  { href: '/gerencial/simulador-di', label: 'Simulador DI', icon: Calculator },
];

const bottomMenuItems = [
  { href: '/portal', label: 'Portal Cliente', icon: User },
  { href: '/gerencial/cadastros', label: 'Cadastros', icon: BookUser },
];

export function MainSidebar() {
  const pathname = usePathname();
  const [isChatOpen, setIsChatOpen] = React.useState(false);

  return (
    <>
      <Sidebar>
        <SidebarHeader>
           <Link href="/gerencial" className="flex items-center gap-2">
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