"use client";

import { useState } from 'react';
import { 
  Wallet, TrendingUp, PieChart, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, Car, X, CheckCircle, Trash2, Bitcoin, LineChart, History, RefreshCw, CalendarClock
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'acao', 'rendafixa', 'cripto', 'divida', 'conta'

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 p-4 md:p-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Gestão Ativa de Patrimônio</p>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'patrimonio' && <PatrimonioView setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
        {activeTab === 'contas' && <ContasFixasView />}
        {activeTab === 'receber' && <AReceberView setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
      </div>

      {/* Menu Fixo Inferior */}
      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 px-2 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Visão Geral" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Patrimônio" />
        
        <button 
          onClick={() => { setModalType('geral'); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-900/50 hover:bg-emerald-500 active:scale-95 transition-all -translate-y-4 border-4 border-slate-950 flex-shrink-0"
        >
          <PlusCircle size={24} />
        </button>

        <NavButton active={activeTab === 'contas'} onClick={() => setActiveTab('contas')} icon={<Receipt size={20} />} label="Contas" />
        <NavButton active={activeTab === 'receber'} onClick={() => setActiveTab('receber')} icon={<Users size={20} />} label="A Receber" />
      </nav>

      {/* MODAL INTELIGENTE DE LANÇAMENTOS */}
      {isModalOpen && (
        <LancamentoModal 
          tipo={modalType} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </main>
  );
}

/* =========================================================================
   VISÕES AVANÇADAS DAS ABAS
========================================================================= */

function PatrimonioView({ setModalType, setIsModalOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Criptomoedas */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Bitcoin className="text-orange-500"/> Criptoativos</h2>
          <button onClick={() => {setModalType('cripto'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Novo</button>
        </div>
        <div className="space-y-3">
          <AtivoCard ticker="BTC" nome="Bitcoin" qtd="0.05" pm="R$ 310.000" atual="R$ 345.000" variacao="+11.2%" isCripto />
        </div>
      </section>

      {/* Renda Variável (Ações/FIIs) */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="text-blue-500"/> Renda Variável B3</h2>
          <button onClick={() => {setModalType('acao'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Nova Ordem</button>
        </div>
        <div className="space-y-3">
          <AtivoCard ticker="VALE3" nome="Vale S.A." qtd="100" pm="R$ 62,50" atual="R$ 64,10" proventos="R$ 2,10/ação prev." />
          <AtivoCard ticker="BBDC4" nome="Bradesco" qtd="300" pm="R$ 14,20" atual="R$ 13,80" variacao="-2.8%" />
        </div>
      </section>

      {/* Renda Fixa */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><LineChart className="text-purple-500"/> Renda Fixa (CDI/Selic)</h2>
          <button onClick={() => {setModalType('rendafixa'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Novo Aporte</button>
        </div>
        <div className="space-y-3">
          <RendaFixaCard nome="CDB Banco Inter" taxa="110% CDI" aplicado="R$ 5.000,00" atualizado="R$ 5.125,40" vencimento="12/2027" />
        </div>
      </section>
    </div>
  );
}

function AReceberView({ setModalType, setIsModalOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Users className="text-blue-400"/> Gestão de Cobranças</h2>
        <button onClick={() => {setModalType('divida'); setIsModalOpen(true)}} className="text-xs bg-blue-900/30 px-3 py-1 rounded-full text-blue-400 font-bold border border-blue-900">+ Nova Cobrança</button>
      </div>

      {/* Exemplo de Card de Dívida Complexa */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-black text-white text-lg">João (Peças Gol G6)</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarClock size={12}/> Vencimento original: 10/04/2026</p>
          </div>
          <span className="bg-red-900/30 text-red-400 text-xs font-bold px-2 py-1 rounded">ATRASADO</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Dívida Inicial</p>
            <p className="text-sm font-bold">R$ 500,00</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Juros/Multa</p>
            <p className="text-sm font-bold text-orange-400">+ R$ 50,00</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total a Receber</p>
            <p className="text-sm font-black text-blue-400">R$ 550,00</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-emerald-900/30 text-emerald-500 font-bold text-sm py-2 rounded-xl border border-emerald-900/50 hover:bg-emerald-900/50 flex items-center justify-center gap-2">
            <CheckCircle size={16}/> Quitar
          </button>
          <button className="flex-1 bg-slate-800 text-slate-300 font-bold text-sm py-2 rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center justify-center gap-2">
            <RefreshCw size={16}/> Rolar Dívida
          </button>
        </div>
        
        {/* Histórico de Rolagens */}
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <p className="text-xs text-slate-500 font-bold flex items-center gap-1 mb-2"><History size={12}/> Histórico / Obs:</p>
          <p className="text-xs text-slate-400 italic">"15/04 - Pagou R$ 100 de juros e pediu pra jogar o principal de R$ 500 pro dia 15/05."</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MODAL DINÂMICO PARA TODOS OS FORMULÁRIOS
========================================================================= */

function LancamentoModal({ tipo, onClose }) {
  // Este formulário se adapta dependendo do que o usuário quer cadastrar
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">
            {tipo === 'acao' ? 'Comprar Ação / FII' : 
             tipo === 'cripto' ? 'Lançar Criptomoeda' : 
             tipo === 'rendafixa' ? 'Novo Aporte Renda Fixa' : 
             tipo === 'divida' ? 'Cadastrar Dívida' : 'Novo Registro'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-950 rounded-full"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          {/* Form: Renda Variável & Cripto */}
          {(tipo === 'acao' || tipo === 'cripto') && (
            <>
              <input type="text" placeholder={tipo === 'acao' ? "Ticker (Ex: VALE3)" : "Moeda (Ex: BTC)"} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white uppercase" />
              <div className="flex gap-4">
                <input type="number" placeholder="Quantidade" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
                <input type="number" placeholder="Preço Médio (R$)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
              </div>
              <input type="date" placeholder="Data da Compra" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400" />
            </>
          )}

          {/* Form: Dívidas Avançadas */}
          {tipo === 'divida' && (
            <>
              <input type="text" placeholder="Nome do Devedor / Motivo" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
              <div className="flex gap-4">
                <input type="number" placeholder="Valor Principal (R$)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
                <input type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-400" />
              </div>
              <div className="flex gap-4">
                <input type="number" placeholder="Taxa Juros (%)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white">
                  <option>Juros Simples ao Mês</option>
                  <option>Juros Compostos</option>
                  <option>Valor Fixo</option>
                </select>
              </div>
              <textarea placeholder="Observações do acordo (Ex: Prometeu pagar com o 13º)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white h-24 resize-none" />
            </>
          )}

          {/* Botão Salvar Genérico */}
          <button className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-500 transition-colors mt-4">
            REGISTRAR
          </button>
        </div>
      </div>
    </div>
  );
}

/* Componentes de UI Menores omitidos para manter foco, usar os mesmos do código anterior (ContasFixasView, NavButton, DashboardView padrão) */
function DashboardView() { return <div className="text-center text-slate-500 mt-10">Gráficos de evolução consolidados.</div>; }
function ContasFixasView() { return <div className="text-center text-slate-500 mt-10">Painel de Contas.</div>; }
function NavButton({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}> {icon} <span className="text-[9px] font-bold tracking-wide">{label}</span> </button> ); }

function AtivoCard({ ticker, nome, qtd, pm, atual, variacao, proventos, isCripto }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isCripto ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-300'}`}>
          {isCripto ? <Bitcoin size={20}/> : <span className="font-black text-xs">{ticker}</span>}
        </div>
        <div>
          <h3 className="font-bold text-sm">{nome}</h3>
          <p className="text-[10px] text-slate-500">Qtd: {qtd} | PM: {pm}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-black text-sm">{atual}</p>
        {variacao && <p className={`text-[10px] font-bold ${variacao.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>{variacao}</p>}
        {proventos && <p className="text-[9px] text-blue-400 font-bold mt-1 bg-blue-900/20 px-1.5 py-0.5 rounded">{proventos}</p>}
      </div>
    </div>
  );
}

function RendaFixaCard({ nome, taxa, aplicado, atualizado, vencimento }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-sm">{nome}</h3>
          <p className="text-xs text-purple-400 font-bold">{taxa}</p>
        </div>
        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">Venc: {vencimento}</span>
      </div>
      <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-800/50">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold">Aplicado</p>
          <p className="text-xs font-bold">{aplicado}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Bruto Atual</p>
          <p className="text-sm font-black text-emerald-400">{atualizado}</p>
        </div>
      </div>
    </div>
  );
}
