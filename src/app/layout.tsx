import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { MainSidebar, SidebarProvider } from '@/components/layout/main-sidebar';
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
        <div className="flex h-screen bg-gray-50 dark:bg-zinc-900">
            <SidebarProvider>
                <MainSidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <MainHeader />
                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                      {children}
                    </main>
                </div>
            </SidebarProvider>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
