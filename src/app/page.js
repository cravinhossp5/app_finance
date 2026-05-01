'use client';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/proxy?action=GET_DASHBOARD')
      .then(res => res.json())
      .then(json => setData(json));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-emerald-400">Finanças Pro</h1>
        <p className="text-slate-400 text-sm">Bem-vindo, Murilo</p>
      </header>

      <div className="grid gap-6">
        {/* Card de Patrimônio */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <p className="text-slate-400 text-sm mb-1">Patrimônio Total</p>
          <h2 className="text-4xl font-black">
            {data?.resumo?.patrimonioTotal 
              ? `R$ ${data.resumo.patrimonioTotal.toLocaleString('pt-BR')}` 
              : 'Carregando...'}
          </h2>
        </div>

        {/* Botão de Ação Rápida */}
        <button className="bg-emerald-600 hover:bg-emerald-500 transition-colors p-4 rounded-xl font-bold">
          + Novo Lançamento
        </button>
      </div>
    </main>
  );
}
