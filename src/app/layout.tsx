import type { Metadata } from 'next';
import './globals.css';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/layout/main-sidebar';
import { Toaster } from "@/components/ui/toaster"
import { MainHeader } from '@/components/layout/main-header';

export const metadata: Metadata = {
  title: 'CargaInteligente',
  description: 'Sistema inteligente para Freight Forwarders.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
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
        <Toaster />
      </body>
    </html>
  );
}
