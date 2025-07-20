import { MainHeader } from '@/components/layout/main-header';
import { MainSidebar, SidebarProvider } from '@/components/layout/main-sidebar';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <div className="flex flex-col flex-1">
          <MainHeader />
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
