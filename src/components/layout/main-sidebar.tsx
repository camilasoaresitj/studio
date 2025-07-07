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
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  ReceiptText,
  MapPin,
  Users,
  ClipboardCheck,
  Ship,
} from 'lucide-react';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/rates', label: 'Tarifas', icon: ReceiptText },
  { href: '/tracking', label: 'Rastreamento', icon: MapPin },
  { href: '/crm', label: 'CRM Automático', icon: Users },
  { href: '/tasks', label: 'Automação de Tarefas', icon: ClipboardCheck },
];

export function MainSidebar() {
  const pathname = usePathname();

  return (
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
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="text-xs text-center text-sidebar-foreground/50 p-4">
          © {new Date().getFullYear()} CargaInteligente
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
