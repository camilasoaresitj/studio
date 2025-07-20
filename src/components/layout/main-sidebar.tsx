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
} from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/operacional', label: 'Operacional', icon: Truck },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/demurrage', label: 'Demurrage', icon: Clock },
  { href: '/schedules', label: 'Schedules', icon: CalendarClock },
  { href: '/simulador-di', label: 'Simulador DI', icon: Calculator },
  { href: '/tracking', label: 'Rastreamento', icon: Ship },
  { href: '/portal', label: 'Portal Cliente', icon: User },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function MainSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
       <div className="p-4 border-b border-gray-700">
         <Link href="/" className="flex items-center gap-2">
            <Ship className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-semibold">CargaInteligente</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
       <div className="p-4 border-t border-gray-700 text-xs text-center text-gray-500">
          © {new Date().getFullYear()} CargaInteligente
        </div>
    </aside>
  );
}

// Dummy SidebarProvider for layout compatibility
export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <>{children}</>;
};
