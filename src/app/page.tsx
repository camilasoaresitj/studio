
// src/app/page.tsx
export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Sistema Restaurado</h1>
      <p className="mt-2">Página principal funcionando</p>
      <a href="/tracking" className="text-blue-600 mt-4 inline-block">
        Testar Rastreamento
      </a>
    </div>
  )
}
