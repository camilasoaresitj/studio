import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { MainHeader } from '@/components/layout/main-header';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <div className="flex flex-1 flex-col">
          <MainHeader />
          <SidebarInset className="flex-1">
            {children}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
