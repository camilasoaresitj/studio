import './globals.css'
import { Toaster } from "@/components/ui/toaster"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  )
}
