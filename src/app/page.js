"use client";

import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, X, CheckCircle, Trash2, Bitcoin, LineChart, 
  CalendarClock, Pencil, AlertTriangle, ChevronLeft, ChevronRight, Calendar, CreditCard, PieChart
} from 'lucide-react';

export default function Dashboard() {
  // --- ESTADOS DE NAVEGAÇÃO E UI ---
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- FILTRO DE TEMPO ---
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataAtual = new Date();
  const [mesAtual, setMesAtual] = useState(dataAtual.getMonth()); 
  const [anoAtual, setAnoAtual] = useState(dataAtual.getFullYear());

  // --- ESTADOS DE DADOS REAIS ---
  const [investimentos, setInvestimentos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FUNÇÃO: BUSCAR DADOS (GET) ---
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

    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, [mesAtual, anoAtual]);

  // --- FUNÇÃO: SALVAR DADOS (POST) ---
  const handleSalvar = async (payload, aba) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'adicionar', 
          aba: aba,
          payload: payload 
        })
      });
      const result = await response.json();
      if (result.success) {
        setIsModalOpen(false);
        fetchDados(); // Atualiza a tela na hora
      }
    } catch (error) {
      alert("Erro ao salvar na planilha.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- NAVEGAÇÃO ---
  const prevMonth = () => { if (mesAtual === 0) { setMesAtual(11); setAnoAtual(anoAtual - 1); } else { setMesAtual(mesAtual - 1); } };
  const nextMonth = () => { if (mesAtual === 11) { setMesAtual(0); setAnoAtual(anoAtual + 1); } else { setMesAtual(mesAtual + 1); } };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 flex flex-col">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></span> 
              {isLoading ? 'Sincronizando...' : 'Online'}
            </p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl">
            <button onClick={prevMonth} className="text-slate-400 hover:text-emerald-400"><ChevronLeft size={18}/></button>
            <div className="flex items-center gap-2 text-sm font-bold min-w-[100px] justify-center text-white">
              {meses[mesAtual]} {anoAtual}
            </div>
            <button onClick={nextMonth} className="text-slate-400 hover:text-emerald-400"><ChevronRight size={18}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {activeTab === 'patrimonio' && <PatrimonioView dados={investimentos} setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
        {activeTab === 'cartoes' && <CartoesView dados={gastosCartao} mes={meses[mesAtual]} setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-full shadow-lg -translate-y-4 border-4 border-slate-950"><PlusCircle size={24} /></button>
        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'contas'} onClick={() => setActiveTab('contas')} icon={<Receipt size={20} />} label="Contas" />
      </nav>

      {isModalOpen && (
        <LancamentoModal 
          tipo={modalType} 
          setTipo={setModalType}
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSalvar}
        />
      )}
    </main>
  );
}

// --- SUB-VIEWS ---

function PatrimonioView({ dados }) {
  const acoes = dados.filter(i => i.dados[1] !== 'Cripto');
  const criptos = dados.filter(i => i.dados[1] === 'Cripto');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="text-blue-500"/> Carteira B3</h2>
        <div className="space-y-3">
          {acoes.map(item => (
            <AtivoCard key={item.linha} ticker={item.dados[0]} tipo={item.dados[1]} qtd={item.dados[2]} pm={item.dados[3]} atual={item.dados[5]} />
          ))}
        </div>
      </section>
    </div>
  );
}

function CartoesView({ dados, mes }) {
  // Lógica de soma e categorias (Mock por enquanto, mas já preparado)
  const totalFatura = dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[2]) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800/50 rounded-[2rem] p-6 shadow-xl">
        <p className="text-indigo-400 text-xs font-black uppercase mb-1">Fatura Total ({mes})</p>
        <h2 className="text-3xl font-black text-white">R$ {totalFatura.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Resumo por Categoria</h3>
        <p className="text-xs text-slate-500 italic">O gráfico de gastos será gerado assim que você realizar os primeiros lançamentos.</p>
      </div>
    </div>
  );
}

// --- MODAL DE LANÇAMENTO (O CORAÇÃO DO POST) ---

function LancamentoModal({ tipo, setTipo, onClose, onSave }) {
  const [formData, setFormData] = useState({});

  const handleConfirm = () => {
    if (tipo === 'cartao') {
      // Mapeia para as colunas da aba bdLancamentos (F a L)
      // Ex: F=Categoria, G=Conta/Cartão, H=Valor, I=Data
      const payload = {
        "Categoria": formData.categoria,
        "Conta/Cartão": formData.banco,
        "Valor": formData.valor,
        "Data": formData.data || new Date().toLocaleDateString('pt-BR')
      };
      onSave(payload, 'bdLancamentos');
    } else if (tipo === 'ativo') {
      const payload = {
        "Ticker": formData.ticker?.toUpperCase(),
        "Tipo (Ação/FII/Cripto)": formData.tipoAtivo,
        "Quantidade_Total": formData.qtd,
        "Preco_Medio": formData.preco
      };
      onSave(payload, 'DB_Investimentos_Variaveis');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">
            {tipo === 'escolha' ? 'O que deseja lançar?' : 'Preencha os dados'}
          </h3>
          <button onClick={onClose} className="text-slate-500"><X size={24}/></button>
        </div>

        {tipo === 'escolha' && (
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setTipo('cartao')} className="bg-slate-800 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-700 hover:border-indigo-500 transition-all">
              <CreditCard className="text-indigo-400" size={32} />
              <span className="font-bold text-sm">Gasto Cartão</span>
            </button>
            <button onClick={() => setTipo('ativo')} className="bg-slate-800 p-6 rounded-2xl flex flex-col items-center gap-3 border border-slate-700 hover:border-emerald-500 transition-all">
              <TrendingUp className="text-emerald-400" size={32} />
              <span className="font-bold text-sm">Novo Ativo</span>
            </button>
          </div>
        )}

        {tipo === 'cartao' && (
          <div className="space-y-4">
            <select onChange={e => setFormData({...formData, banco: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white">
              <option value="">Selecione o Banco/Cartão</option>
              <option value="Inter">Banco Inter</option>
              <option value="Nubank">Nubank</option>
              <option value="Bradesco">Bradesco</option>
            </select>
            <input type="text" placeholder="Categoria (ex: Alimentação)" onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
            <input type="number" placeholder="Valor (R$)" onChange={e => setFormData({...formData, valor: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
            <input type="date" onChange={e => setFormData({...formData, data: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white text-slate-400" />
            <button onClick={handleConfirm} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-900/40">REGISTRAR GASTO</button>
          </div>
        )}

        {tipo === 'ativo' && (
          <div className="space-y-4">
            <input type="text" placeholder="Ticker (Ex: ITSA4)" onChange={e => setFormData({...formData, ticker: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
            <select onChange={e => setFormData({...formData, tipoAtivo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white">
              <option value="Ação">Ação</option>
              <option value="FII">FII</option>
              <option value="Cripto">Cripto</option>
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder="Qtd" onChange={e => setFormData({...formData, qtd: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
              <input type="number" placeholder="Preço Médio" onChange={e => setFormData({...formData, preco: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
            </div>
            <button onClick={handleConfirm} className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-900/40">SALVAR ATIVO</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTES ATÔMICOS ---

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}> {icon} <span className="text-[9px] font-bold tracking-wide">{label}</span> </button> ); 
}

function AtivoCard({ ticker, tipo, qtd, pm, atual }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-slate-800 text-slate-300 font-black text-xs">{ticker}</div>
        <div><h3 className="font-bold text-sm">{ticker}</h3><p className="text-[10px] text-slate-500">{tipo} | Qtd: {qtd}</p></div>
      </div>
      <div className="text-right">
        <p className="font-black text-sm text-white">R$ {parseFloat(atual || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <p className="text-[10px] text-slate-500 font-bold uppercase">PM: R$ {pm}</p>
      </div>
    </div>
  );
}
