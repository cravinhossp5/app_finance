"use client";

import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, X, CheckCircle, Trash2, Bitcoin, LineChart, 
  CalendarClock, Pencil, AlertTriangle, ChevronLeft, ChevronRight, Calendar, CreditCard, PieChart,
  HandCoins, ArrowUpRight
} from 'lucide-react';

export default function Dashboard() {
  // --- ESTADOS DE NAVEGAÇÃO ---
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTRO DE TEMPO ---
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataAtual = new Date();
  const [mesAtual, setMesAtual] = useState(dataAtual.getMonth()); 
  const [anoAtual, setAnoAtual] = useState(dataAtual.getFullYear());

  // --- ESTADOS DE DADOS REAIS ---
  const [investimentos, setInvestimentos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [devedores, setDevedores] = useState([]);

  const fetchDados = async () => {
    setIsLoading(true);
    try {
      // Busca Investimentos
      const resInv = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar', aba: 'DB_Investimentos_Variaveis' })
      });
      const dataInv = await resInv.json();
      if (dataInv.success) setInvestimentos(dataInv.data);

      // Busca Lançamentos de Cartão
      const resCart = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar', aba: 'bdLancamentos' })
      });
      const dataCart = await resCart.json();
      if (dataCart.success) setGastosCartao(dataCart.data);

      // Busca Devedores
      const resDev = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar', aba: 'bdDevedores' })
      });
      const dataDev = await resDev.json();
      if (dataDev.success) setDevedores(dataDev.data);

    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, [mesAtual, anoAtual]);

  const handleSalvar = async (payload, aba) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar', aba: aba, payload: payload })
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchDados();
      }
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const prevMonth = () => { if (mesAtual === 0) { setMesAtual(11); setAnoAtual(anoAtual - 1); } else { setMesAtual(mesAtual - 1); } };
  const nextMonth = () => { if (mesAtual === 11) { setMesAtual(0); setAnoAtual(anoAtual + 1); } else { setMesAtual(mesAtual + 1); } };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 flex flex-col p-4 md:p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-emerald-500">APPFINANCE.PRO</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              {isLoading ? 'Sincronizando...' : 'Online'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl text-sm font-bold">
            <button onClick={prevMonth}><ChevronLeft size={18}/></button>
            <span className="min-w-[100px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={nextMonth}><ChevronRight size={18}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {activeTab === 'patrimonio' && <PatrimonioView dados={investimentos} />}
        {activeTab === 'cartoes' && <CartoesView dados={gastosCartao} mes={meses[mesAtual]} />}
        {activeTab === 'devedores' && <DevedoresView dados={devedores} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 pb-safe">
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={20} />} label="Devedores" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-full shadow-lg -translate-y-4 border-4 border-slate-950"><PlusCircle size={24} /></button>
        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} onClose={() => setIsModalOpen(false)} onSave={handleSalvar} />}
    </main>
  );
}

// --- VIEW: DEVEDORES E JUROS ---
function DevedoresView({ dados }) {
  const totalEmprestado = dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[2]) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-br from-amber-900 to-slate-900 border border-amber-800/50 rounded-[2rem] p-6">
        <p className="text-amber-400 text-xs font-black uppercase mb-1">Total a Receber</p>
        <h2 className="text-3xl font-black text-white">R$ {totalEmprestado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
      </div>

      <div className="space-y-3">
        {dados.map((item, idx) => {
          const d = item.dados;
          // Supondo Colunas: F=Nome, G=Valor Inicial, H=Juros Mensais (%), I=Data Empréstimo
          const valorInicial = parseFloat(d[1]) || 0;
          const taxaJuros = parseFloat(d[2]) || 0;
          const dataEmprestimo = new Date(d[3]);
          const hoje = new Date();
          const mesesPassados = Math.max(0, (hoje.getFullYear() - dataEmprestimo.getFullYear()) * 12 + (hoje.getMonth() - dataEmprestimo.getMonth()));
          
          // Cálculo de Juros Simples para exibição
          const valorAtualizado = valorInicial + (valorInicial * (taxaJuros / 100) * mesesPassados);

          return (
            <div key={idx} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><HandCoins size={20}/></div>
                <div>
                  <h3 className="font-bold text-sm">{d[0]}</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{taxaJuros}% juros/mês</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-sm text-emerald-400">R$ {valorAtualizado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                <p className="text-[10px] text-slate-500 line-through">Inic: R$ {valorInicial}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- RESTANTE DAS VIEWS (PATRIMONIO/CARTOES) E MODAL ---
// (Mantenha as funções PatrimonioView, CartoesView e LancamentoModal do código anterior, 
// apenas adicione a opção 'devedor' no Modal conforme abaixo)

function LancamentoModal({ tipo, setTipo, onClose, onSave }) {
  const [formData, setFormData] = useState({});

  const handleConfirm = () => {
    if (tipo === 'cartao') {
      onSave({ "Categoria": formData.categoria, "Conta/Cartão": formData.banco, "Valor": formData.valor, "Data": formData.data }, 'bdLancamentos');
    } else if (tipo === 'ativo') {
      onSave({ "Ticker": formData.ticker?.toUpperCase(), "Tipo (Ação/FII/Cripto)": formData.tipoAtivo, "Quantidade_Total": formData.qtd, "Preco_Medio": formData.preco }, 'DB_Investimentos_Variaveis');
    } else if (tipo === 'devedor') {
      onSave({ "Nome": formData.nome, "Valor Inicial": formData.valor, "Juros %": formData.juros, "Data": formData.data }, 'bdDevedores');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">{tipo === 'escolha' ? 'Novo Registro' : 'Dados do Devedor'}</h3>
          <button onClick={onClose} className="text-slate-500"><X size={24}/></button>
        </div>

        {tipo === 'escolha' && (
          <div className="grid grid-cols-3 gap-2">
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Cartão" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<TrendingUp className="text-emerald-400"/>} label="Ativo" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" />
          </div>
        )}

        {tipo === 'devedor' && (
          <div className="space-y-4 animate-in zoom-in-95">
            <input type="text" placeholder="Nome do Devedor" onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Valor (R$)" onChange={e => setFormData({...formData, valor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
              <input type="number" placeholder="Juros % mês" onChange={e => setFormData({...formData, juros: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
            </div>
            <input type="date" onChange={e => setFormData({...formData, data: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-slate-400" />
            <button onClick={handleConfirm} className="w-full bg-amber-600 text-white font-black py-4 rounded-xl">REGISTRAR EMPRÉSTIMO</button>
          </div>
        )}
        {/* ... Outros formulários (cartao/ativo) ... */}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2 border border-slate-700 hover:border-white transition-all">
      {icon} <span className="font-bold text-[10px] uppercase">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500'}`}> {icon} <span className="text-[9px] font-bold">{label}</span> </button> ); 
}

function PatrimonioView({ dados }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="text-blue-500"/> Ativos Financeiros</h2>
      {dados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
          <div><p className="font-bold text-sm">{item.dados[0]}</p><p className="text-[10px] text-slate-500">Qtd: {item.dados[2]}</p></div>
          <div className="text-right"><p className="font-black text-sm">R$ {parseFloat(item.dados[5] || 0).toLocaleString('pt-BR')}</p></div>
        </div>
      ))}
    </div>
  );
}

function CartoesView({ dados, mes }) {
  const total = dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[2]) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="bg-indigo-900/30 border border-indigo-800 p-6 rounded-[2rem]">
        <p className="text-xs font-bold text-indigo-400">TOTAL CARTÕES ({mes})</p>
        <p className="text-3xl font-black">R$ {total.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
