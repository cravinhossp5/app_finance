"use client";

import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, X, CheckCircle, Trash2, Bitcoin, LineChart, 
  CalendarClock, Pencil, AlertTriangle, ChevronLeft, ChevronRight, Calendar, CreditCard, PieChart
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataAtual = new Date();
  const [mesAtual, setMesAtual] = useState(dataAtual.getMonth()); 
  const [anoAtual, setAnoAtual] = useState(dataAtual.getFullYear());

  // ESTADOS DOS DADOS REAIS
  const [investimentos, setInvestimentos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // FUNÇÃO: Busca os dados da aba que você configurou
  const fetchDados = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar', aba: 'DB_Investimentos_Variaveis' })
      });
      const result = await response.json();
      if (result.success) setInvestimentos(result.data);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  const prevMonth = () => { if (mesAtual === 0) { setMesAtual(11); setAnoAtual(anoAtual - 1); } else { setMesAtual(mesAtual - 1); } };
  const nextMonth = () => { if (mesAtual === 11) { setMesAtual(0); setAnoAtual(anoAtual + 1); } else { setMesAtual(mesAtual + 1); } };
  const handleEdit = (tipo, item) => { setModalType(tipo); setItemToEdit(item); setIsModalOpen(true); };
  const confirmDelete = () => { setItemToDelete(null); /* Lógica futura de API de exclusão entra aqui */ };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 flex flex-col">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
            {isLoading ? (
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span> Sincronizando...
              </p>
            ) : (
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Online
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl">
            <button onClick={prevMonth} className="text-slate-400 hover:text-emerald-400"><ChevronLeft size={18}/></button>
            <div className="flex items-center gap-2 text-sm font-bold min-w-[100px] justify-center text-white">
              <Calendar size={14} className="text-emerald-500" />
              {meses[mesAtual]} {anoAtual}
            </div>
            <button onClick={nextMonth} className="text-slate-400 hover:text-emerald-400"><ChevronRight size={18}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'patrimonio' && <PatrimonioView dados={investimentos} handleEdit={handleEdit} setItemToDelete={setItemToDelete} />}
        {activeTab === 'cartoes' && <CartoesView mes={meses[mesAtual]} />}
        {activeTab === 'contas' && <ContasFixasView handleEdit={handleEdit} setItemToDelete={setItemToDelete} />}
      </div>

      {/* MENU INFERIOR (Com a aba de Cartões adicionada) */}
      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 px-1 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        
        <button 
          onClick={() => { setModalType('geral'); setItemToEdit(null); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-900/50 hover:bg-emerald-500 active:scale-95 transition-all -translate-y-4 border-4 border-slate-950"
        >
          <PlusCircle size={24} />
        </button>

        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'contas'} onClick={() => setActiveTab('contas')} icon={<Receipt size={20} />} label="Contas" />
      </nav>

      {/* Modais */}
      {isModalOpen && <LancamentoModal tipo={modalType} itemData={itemToEdit} onClose={() => { setIsModalOpen(false); setItemToEdit(null); }} />}
      
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2rem] border border-red-900/50 p-6 shadow-2xl shadow-red-900/20 text-center">
            <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="font-black text-xl text-white mb-2">Excluir Registro?</h3>
            <p className="text-slate-400 text-sm mb-6">Esta ação apagará o item da planilha. Tem certeza?</p>
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================================
   1. ABA PATRIMÔNIO (RENDERIZANDO DADOS REAIS DA PLANILHA)
========================================================================= */
function PatrimonioView({ dados, handleEdit, setItemToDelete }) {
  // Separando o que é FII/Ação do que é Cripto
  const acoesFIIs = dados.filter(i => i.dados[1] !== 'Cripto');
  const criptos = dados.filter(i => i.dados[1] === 'Cripto');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* Renda Variável B3 */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="text-blue-500"/> Carteira B3</h2>
        </div>
        <div className="space-y-3">
          {acoesFIIs.length === 0 ? <p className="text-xs text-slate-500 italic">Nenhum ativo encontrado.</p> : null}
          {acoesFIIs.map((item) => {
            const d = item.dados;
            // MAPEAMENTO COM BASE NA SUA FOTO:
            // d[0] = Ticker, d[1] = Tipo, d[2] = Qtd, d[3] = PM, d[5] = Cotação Atual
            return (
              <AtivoCard 
                key={item.linha}
                ticker={d[0]} 
                nome={d[1]} // Colocando o Tipo (Ação/FII) como subtitulo
                qtd={d[2]} 
                pm={d[3]} 
                atual={d[5] || d[3]} // Se não tiver cotação, mostra PM
                onEdit={() => handleEdit('acao', {linha: item.linha, ticker: d[0]})} 
                onDelete={() => setItemToDelete({linha: item.linha})} 
              />
            )
          })}
        </div>
      </section>

      {/* Cripto */}
      {criptos.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Bitcoin className="text-orange-500"/> Criptoativos</h2>
          </div>
          <div className="space-y-3">
            {criptos.map((item) => (
              <AtivoCard key={item.linha} ticker={item.dados[0]} nome="Cripto" qtd={item.dados[2]} pm={item.dados[3]} atual={item.dados[5]} isCripto onEdit={() => handleEdit('cripto', item)} onDelete={() => setItemToDelete(item)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================================================================
   2. NOVA ABA: CARTÕES DE CRÉDITO (GASTOS MENSAIS E CATEGORIAS)
========================================================================= */
function CartoesView({ mes }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800/50 rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12"><CreditCard size={120} /></div>
        <p className="text-indigo-400 text-xs font-black uppercase tracking-widest mb-1">Fatura Total ({mes})</p>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-2">R$ 2.450,00</h2>
        <div className="flex gap-2 text-[10px] font-bold text-slate-300 mt-4">
          <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded">Inter: R$ 1.200</span>
          <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded">Nubank: R$ 1.250</span>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PieChart size={16} className="text-emerald-500" /> Maiores Despesas</h3>
        <div className="space-y-3">
          <CategoriaGastos nome="Alimentação" valor="R$ 950,00" perc="40%" cor="bg-emerald-500" />
          <CategoriaGastos nome="Carro (Combustível)" valor="R$ 600,00" perc="25%" cor="bg-blue-500" />
          <CategoriaGastos nome="Assinaturas / Lazer" valor="R$ 450,00" perc="18%" cor="bg-purple-500" />
        </div>
      </div>

      <button className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-500 transition-colors">
        + LANÇAR GASTO NO CARTÃO
      </button>
    </div>
  );
}

function CategoriaGastos({ nome, valor, perc, cor }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 w-1/2">
        <div className={`w-2 h-2 rounded-full ${cor}`}></div>
        <p className="text-xs text-slate-300 truncate">{nome}</p>
      </div>
      <div className="w-1/4 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${cor}`} style={{width: perc}}></div>
      </div>
      <p className="text-xs font-bold text-white text-right w-1/4">{valor}</p>
    </div>
  )
}

/* =========================================================================
   UI AUXILIAR (COMPACTADA)
========================================================================= */
function DashboardView() { return <div className="text-center text-slate-500 mt-10">Conectando Dashboard...</div>; }
function ContasFixasView() { return <div className="text-center text-slate-500 mt-10">Conectando Contas...</div>; }

function LancamentoModal({ tipo, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">Novo Registro</h3>
          <button onClick={onClose} className="text-slate-400"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Descrição ou Ticker" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
          <input type="number" placeholder="Valor (R$)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
          <button className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl">SALVAR</button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}> {icon} <span className="text-[9px] font-bold tracking-wide">{label}</span> </button> ); 
}

function AtivoCard({ ticker, nome, qtd, pm, atual, isCripto, onEdit, onDelete }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isCripto ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-300'}`}>{isCripto ? <Bitcoin size={20}/> : <span className="font-black text-xs">{ticker}</span>}</div>
        <div><h3 className="font-bold text-sm">{ticker}</h3><p className="text-[10px] text-slate-500">{nome} | Qtd: {qtd}</p></div>
      </div>
      <div className="text-right flex items-center gap-3">
        <div><p className="font-black text-sm">{atual}</p><p className="text-[10px] text-slate-500 font-bold">PM: {pm}</p></div>
        <div className="flex flex-col gap-1 ml-2 border-l border-slate-800 pl-2">
           <button onClick={onEdit} className="text-slate-600 hover:text-blue-400"><Pencil size={14}/></button>
           <button onClick={onDelete} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}
