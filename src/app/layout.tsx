
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
