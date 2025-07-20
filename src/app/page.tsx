
'use client';

import Link from 'next/link';

export default function HomePage() {

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50">
       <div className="text-center">
         <h1 className="text-4xl font-bold text-gray-800">CargaInteligente</h1>
         <p className="text-lg text-gray-600 mt-2 mb-8">Sistema inteligente para Freight Forwarders.</p>
         <div className="flex justify-center gap-4">
            <Link href="/tracking" passHref>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition">
                Rastrear uma Carga
              </button>
            </Link>
            <Link href="/gerencial" passHref>
              <button className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-300 transition">
                Acessar Sistema
              </button>
            </Link>
         </div>
       </div>
    </div>
  );
}
