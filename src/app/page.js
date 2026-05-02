"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, X, CheckCircle, Trash2, Bitcoin, ChevronLeft, ChevronRight, 
  CreditCard, HandCoins, Loader2, CloudSync, AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced', 'syncing', 'error'
  const [notification, setNotification] = useState(null);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesAtual, setMesAtual] = useState(new Date().getMonth()); 
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const [investimentos, setInvestimentos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [devedores, setDevedores] = useState([]);

  // --- NOTIFICAÇÃO CUSTOMIZADA (LAYOUT DO APP) ---
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDados = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setSyncStatus('syncing');
    try {
      const fetchData = async (aba) => {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listar', aba })
        });
        return await res.json();
      };

      const [inv, cart, dev] = await Promise.all([
        fetchData('DB_Investimentos_Variaveis'),
        fetchData('bdLancamentos'),
        fetchData('bdDevedores')
      ]);

      if (inv.success || inv.status === "success") setInvestimentos(inv.data || []);
      if (cart.success || cart.status === "success") setGastosCartao(cart.data || []);
      if (dev.success || dev.status === "success") setDevedores(dev.data || []);
      
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
      showToast("Erro na sincronização", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  // --- SALVAMENTO EM SEGUNDO PLANO (UI OTIMISTA) ---
  const handleSalvar = async (payload, aba) => {
    // 1. Fecha o popup imediatamente e avisa o usuário
    setIsModalOpen(false);
    setSyncStatus('syncing');
    showToast("Salvando em segundo plano...");

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar', aba, payload })
      });
      const result = await response.json();
      
      if (result.success || result.status === "success") {
        setSyncStatus('synced');
        showToast("Dados salvos com sucesso!");
        fetchDados(true); // Atualiza em silêncio
      } else {
        throw new Error(result.message || "Erro na planilha");
      }
    } catch (error) {
      setSyncStatus('error');
      showToast("Falha ao salvar. Tentaremos novamente depois.", "error");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      {/* TOAST CUSTOMIZADO NO TOPO */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-600 border border-emerald-400' : 'bg-red-600 border border-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-emerald-500 italic">APPFINANCE</h1>
            {syncStatus === 'syncing' && <CloudSync className="text-blue-500 animate-pulse" size={18}/>}
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold">
            <button onClick={() => setMesAtual(prev => prev === 0 ? 11 : prev - 1)}><ChevronLeft size={16}/></button>
            <span className="min-w-[90px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={() => setMesAtual(prev => prev === 11 ? 0 : prev + 1)}><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'patrimonio' && <ListView items={investimentos} title="Portfólio" type="ativo" />}
        {activeTab === 'devedores' && <ListView items={devedores} title="Créditos" type="devedor" />}
        {activeTab === 'cartoes' && <CartaoSummary items={gastosCartao} mes={meses[mesAtual]} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={20} />} label="Devedores" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg -translate-y-5 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={24} /></button>
        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
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

// --- COMPONENTES DE INTERFACE ---

function LancamentoModal({ tipo, setTipo, onClose, onSave }) {
  const [formData, setFormData] = useState({ data: new Date().toISOString().split('T')[0], banco: 'Inter' });

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-emerald-500 outline-none transition-all";

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-xl text-emerald-500">Novo Registro</h3>
          <button onClick={onClose} className="p-2 text-slate-500"><X size={24}/></button>
        </div>

        {tipo === 'escolha' ? (
          <div className="grid grid-cols-3 gap-3">
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Cartão" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<TrendingUp className="text-emerald-400"/>} label="Ativo" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const payload = tipo === 'devedor' 
              ? { "Nome": formData.nome, "Valor Inicial": parseFloat(formData.valor), "Juros %": parseFloat(formData.juros), "Data": formData.data }
              : tipo === 'cartao' 
              ? { "Categoria": formData.categoria, "Conta/Cartão": formData.banco, "Valor": parseFloat(formData.valor), "Data": formData.data }
              : { "Ticker": formData.ticker?.toUpperCase(), "Quantidade_Total": parseFloat(formData.valor), "Preco_Medio": parseFloat(formData.juros), "Tipo (Ação/FII/Cripto)": "Ação" };
            onSave(payload, tipo === 'devedor' ? 'bdDevedores' : tipo === 'cartao' ? 'bdLancamentos' : 'DB_Investimentos_Variaveis');
          }}>
            <input type="text" placeholder={tipo === 'devedor' ? "Nome do Devedor" : "Identificação/Ticker"} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value, ticker: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" step="any" placeholder="Valor/Qtd" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
              <input type="text" placeholder="Juros/Categoria" className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value, categoria: e.target.value})} required />
            </div>
            <input type="date" value={formData.data} className={inputClass} onChange={e => setFormData({...formData, data: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black shadow-lg shadow-emerald-900/40 active:scale-95 transition-all">
              FINALIZAR REGISTRO
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// --- UI HELPERS ---

function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-3xl flex flex-col items-center gap-2 active:scale-90 transition-all">
      {icon} <span className="font-bold text-[10px] uppercase text-slate-500">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-500 opacity-50'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); 
}

function ListView({ items, title, type }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <div className="w-4 h-[1px] bg-slate-800"></div> {title}
      </h2>
      {items.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black border ${type === 'devedor' ? 'bg-amber-500/10 text-amber-500 border-amber-900/50' : 'bg-slate-800 text-emerald-500 border-slate-700'}`}>
              {type === 'devedor' ? <HandCoins size={18}/> : item.dados[0]?.substring(0,2)}
            </div>
            <div>
              <p className="font-black text-sm text-slate-100">{item.dados[0]}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">{type === 'devedor' ? `${item.dados[2]}% juros` : `Qtd: ${item.dados[2]}`}</p>
            </div>
          </div>
          <p className="font-black text-sm text-slate-100">R$ {parseFloat(type === 'devedor' ? item.dados[1] : item.dados[5] || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      ))}
    </div>
  );
}

function CartaoSummary({ items, mes }) {
  const total = items.reduce((acc, curr) => acc + (parseFloat(curr.dados[2]) || 0), 0);
  return (
    <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl animate-in zoom-in duration-300">
      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Fatura de {mes}</p>
      <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
    </div>
  );
}
