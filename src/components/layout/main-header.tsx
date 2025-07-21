
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Ship } from 'lucide-react';

export function MainHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
      <SidebarTrigger />
      <Link href="/gerencial" className="flex items-center gap-2">
          <Ship className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold text-foreground">CargaInteligente</span>
      </Link>
    </header>
  );
}
