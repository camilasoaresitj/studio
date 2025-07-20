
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MapaRastreamento() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleSearch = () => {
    // A funcionalidade de busca pode ser mantida, mas não exibirá no mapa
    setStatus('idle');
    alert(`Funcionalidade de rastreamento para "${bookingNumber}" temporariamente desativada.`);
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <header className="p-4 bg-white shadow flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <input
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Digite o Booking Number"
            className="border p-2 rounded w-64"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Carregando...' : 'Atualizar Rastreamento'}
          </button>
        </div>
        <Link href="/gerencial" passHref>
          <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
            Acessar Sistema
          </button>
        </Link>
      </header>
      
      <div className="w-full flex-1 bg-gray-200 flex items-center justify-center">
        <p className="text-gray-600 text-center p-4">
          Mapa desativado temporariamente. <br/>Em breve uma nova visualização será disponibilizada.
        </p>
      </div>
    </div>
  );
}
