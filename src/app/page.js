import { Wallet, TrendingUp, ArrowUpCircle, ArrowDownCircle, PieChart, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 font-sans">
      {/* Header Profissional */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Monitoramento de Ativos - B3 & Dividendos</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-full flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-bold text-slate-300">SINCRO PLANILHA OK</span>
        </div>
      </header>

      {/* Grid de KPIs Financeiros */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard title="Patrimônio Estimado" value="R$ 125.430,00" icon={<Wallet className="text-emerald-500" />} />
        <StatCard title="Rendimento (Mensal)" value="+ R$ 1.240,00" icon={<TrendingUp className="text-blue-400" />} color="text-emerald-400" />
        <StatCard title="Proventos Acumulados" value="R$ 452,10" icon={<ArrowUpCircle className="text-emerald-400" />} />
        <StatCard title="Saídas (W12/FIFO)" value="R$ 4.200,00" icon={<ArrowDownCircle className="text-red-400" />} />
      </section>

      {/* Painel de Controle e Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Espaço para o Gráfico de Evolução */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-8 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-500" /> Alocação de Ativos
            </h2>
          </div>
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl">
            <span className="text-slate-600 text-sm italic">O gráfico de pizza (Vale, Bradesco, Itaúsa) será renderizado aqui</span>
          </div>
        </div>

        {/* Menu de Ação Rápida */}
        <div className="flex flex-col gap-6">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2.5rem] shadow-lg shadow-emerald-950/20">
            <h3 className="text-white font-black text-xl mb-2">Lançamento Rápido</h3>
            <p className="text-emerald-100 text-sm mb-6 opacity-80">Registrar nova ordem ou gasto operacional.</p>
            <button className="w-full bg-white text-emerald-900 font-black py-4 rounded-2xl hover:scale-[1.02] transition-transform active:scale-95 shadow-xl">
              ABRIR FORMULÁRIO
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/60 p-8 rounded-[2.5rem]">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-slate-400" /> Relatórios
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium hover:border-emerald-500/50 transition-colors">
                Fechamento Semanal (W12)
              </button>
              <button className="w-full text-left px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium hover:border-emerald-500/50 transition-colors">
                Extrato Dividendos B3
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value, icon, color = "text-white" }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800/60 p-7 rounded-[2.5rem] hover:border-slate-700 transition-all group">
      <div className="flex justify-between items-start mb-5">
        <span className="text-slate-500 text-xs font-black uppercase tracking-widest">{title}</span>
        <div className="p-2 bg-slate-950 rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <span className={`text-2xl font-black ${color} tracking-tight`}>{value}</span>
        <span className="text-[10px] text-slate-600 font-bold mt-1 uppercase">Atualizado em tempo real</span>
      </div>
    </div>
  );
}
