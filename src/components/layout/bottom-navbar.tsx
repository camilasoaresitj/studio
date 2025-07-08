'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Briefcase,
  Truck,
  Landmark,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/comercial', label: 'Comercial', icon: Briefcase },
  { href: '/operacional', label: 'Operacional', icon: Truck },
  { href: '/financeiro', label: 'Financeiro', icon: Landmark },
  { href: '/demurrage', label: 'Demurrage', icon: Clock },
];

export function BottomNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="grid h-16 grid-cols-5 max-w-full">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group inline-flex flex-col items-center justify-center p-2 text-center transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
