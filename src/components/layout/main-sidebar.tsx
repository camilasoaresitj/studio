
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
  Briefcase,
  Truck,
  Landmark,
  Clock,
  Ship,
  CalendarClock,
} from 'lucide-react';

const menuItems = [
  { href: '/', label: 'Gerencial', icon: LayoutDashboard },
  { href: '/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/operacional', label: 'Operacional', icon: Truck },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/demurrage', label: 'Demurrage', icon: Clock },
  { href: '/schedules', label: 'Schedules', icon: CalendarClock },
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
