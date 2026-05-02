"use client";

import { useState } from 'react';
import { 
  Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, 
  PieChart, LayoutDashboard, Receipt, Users, PlusCircle,
  CreditCard, Landmark, Car
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans">
      
      {/* Header Fixo */}
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 p-4 md:p-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
          <p className="text-slate-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">Gestão Pessoal & Ativos</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[9px] md:text-[10px] font-bold text-slate-300">ONLINE</span>
        </div>
      </header>

      {/* Área de Conteúdo Dinâmico */}
      <div className="p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'patrimonio' && <PatrimonioView />}
        {activeTab === 'contas' && <ContasFixasView />}
        {activeTab === 'receber' && <AReceberView />}
      </div>

      {/* Menu de Navegação Inferior (Mobile First) */}
      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-50 px-2 md:px-8 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Início" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Patrimônio" />
        
        {/* Botão Central de Novo Lançamento */}
        <button className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-900/50 hover:scale-105 active:scale-95 transition-all -translate-y-4 border-4 border-slate-950">
          <PlusCircle size={24} />
        </button>

        <NavButton active={activeTab === 'contas'} onClick={() => setActiveTab('contas')} icon={<Receipt size={20} />} label="Contas" />
        <NavButton active={activeTab === 'receber'} onClick={() => setActiveTab('receber')} icon={<Users size={20} />} label="A Receber" />
      </nav>

    </main>
  );
}

/* =========================================
   VISÕES (TABS)
========================================= */

function DashboardView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8">
        <StatCard title="Saldo Total" value="R$ 15.430,00" icon={<Wallet size={18} className="text-emerald-500" />} />
        <StatCard title="A Receber" value="R$ 1.240,00" icon={<Users size={18} className="text-blue-400" />} color="text-blue-400" />
        <StatCard title="Entradas" value="R$ 4.500,00" icon={<ArrowUpCircle size={18} className="text-emerald-400" />} />
        <StatCard title="Saídas Mês" value="R$ 2.200,00" icon={<ArrowDownCircle size={18} className="text-red-400" />} color="text-red-400" />
      </section>

      <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 min-h-[300px] flex flex-col">
        <h2 className="text-md md:text-lg font-bold flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-emerald-500" /> Resumo do Patrimônio
        </h2>
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl">
          <span className="text-slate-600 text-sm italic text-center px-4">Gráfico de alocação (Ações, Veículos, Caixa)</span>
        </div>
      </div>
    </div>
  );
}

function PatrimonioView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Landmark className="text-emerald-500"/> Meus Ativos</h2>
      <div className="space-y-4">
        <ItemCard icon={<TrendingUp />} title="Ações B3 (Vale, Bradesco, Itaúsa)" subtitle="Renda Variável" value="R$ 8.500,00" />
        <ItemCard icon={<Landmark />} title="FIIs (Banco Inter)" subtitle="Fundos Imobiliários" value="R$ 3.200,00" />
        <ItemCard icon={<Car />} title="Veículos" subtitle="Honda Civic / VW Gol" value="R$ 85.000,00" />
        <ItemCard icon={<Wallet />} title="Reserva de Emergência" subtitle="CDB / Poupança" value="R$ 5.000,00" />
      </div>
    </div>
  );
}

function ContasFixasView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Receipt className="text-red-400"/> Contas Fixas</h2>
      <div className="space-y-4">
        <ItemCard icon={<Receipt className="text-red-400" />} title="Faculdade Estácio" subtitle="Venc. dia 10" value="R$ 450,00" alert />
        <ItemCard icon={<CreditCard className="text-red-400" />} title="Cartão de Crédito" subtitle="Fatura atual" value="R$ 1.200,00" alert />
        <ItemCard icon={<Car className="text-red-400" />} title="Manutenção / IPVA" subtitle="Provisão mensal" value="R$ 300,00" alert />
      </div>
    </div>
  );
}

function AReceberView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Users className="text-blue-400"/> Quem me Deve</h2>
      <div className="space-y-4">
        <ItemCard icon={<Users className="text-blue-400"/>} title="Empréstimo João" subtitle="Restam 2 parcelas" value="R$ 500,00" />
        <ItemCard icon={<Users className="text-blue-400"/>} title="Venda Peças Gol G6" subtitle="Pagamento prometido dia 15" value="R$ 350,00" />
      </div>
    </div>
  );
}

/* =========================================
   COMPONENTES AUXILIARES
========================================= */

function NavButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}
    >
      {icon}
      <span className="text-[9px] font-bold tracking-wide">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, color = "text-white" }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 p-4 md:p-6 rounded-2xl md:rounded-[2rem] hover:border-slate-700 transition-all">
      <div className="flex justify-between items-start mb-2 md:mb-4">
        <span className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-widest break-words w-2/3">{title}</span>
        <div className="bg-slate-950 p-1.5 md:p-2 rounded-lg">{icon}</div>
      </div>
      <span className={`text-base md:text-2xl font-black ${color} tracking-tight block truncate`}>{value}</span>
    </div>
  );
}

function ItemCard({ icon, title, subtitle, value, alert }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-900/40 border border-slate-800/60 rounded-2xl hover:bg-slate-800/40 transition-colors">
      <div className="flex items-center gap-4">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-sm md:text-base">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <span className={`font-black ${alert ? 'text-red-400' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}
