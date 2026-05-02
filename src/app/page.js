"use client";

import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, X, CheckCircle, Trash2, Bitcoin, LineChart, 
  CalendarClock, Pencil, AlertTriangle, ChevronLeft, ChevronRight, Calendar, CreditCard, PieChart,
  HandCoins, Loader2
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataAtual = new Date();
  const [mesAtual, setMesAtual] = useState(dataAtual.getMonth()); 
  const [anoAtual, setAnoAtual] = useState(dataAtual.getFullYear());

  const [investimentos, setInvestimentos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [devedores, setDevedores] = useState([]);

  const fetchDados = async () => {
    setIsLoading(true);
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

    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  const handleSalvar = async (payload, aba) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar', aba, payload })
      });
      const result = await response.json();
      
      // Correção do erro 'undefined': verifica múltiplos formatos de resposta da API
      if (result.success || result.status === "success") {
        setIsModalOpen(false);
        fetchDados();
      } else {
        alert("Erro na Planilha: " + (result.message || result.error || "Erro desconhecido"));
      }
    } catch (error) {
      alert("Erro de conexão: Verifique seu sinal ou o link da API.");
    } finally {
      setIsSaving(false);
    }
  };

  const prevMonth = () => { if (mesAtual === 0) { setMesAtual(11); setAnoAtual(anoAtual - 1); } else { setMesAtual(mesAtual - 1); } };
  const nextMonth = () => { if (mesAtual === 11) { setMesAtual(0); setAnoAtual(anoAtual + 1); } else { setMesAtual(mesAtual + 1); } };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative selection:bg-emerald-500/30">
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-black text-emerald-500 tracking-tighter italic">APPFINANCE.PRO</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></span>
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{isLoading ? 'Sincronizando' : 'Sistema Ativo'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold shadow-inner">
            <button onClick={prevMonth} className="hover:text-emerald-500 transition-colors"><ChevronLeft size={16}/></button>
            <span className="min-w-[90px] text-center text-slate-200">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={nextMonth} className="hover:text-emerald-500 transition-colors"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'patrimonio' && <PatrimonioView dados={investimentos} />}
        {activeTab === 'devedores' && <DevedoresView dados={devedores} />}
        {activeTab === 'cartoes' && <CartoesView dados={gastosCartao} mes={meses[mesAtual]} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={20} />} label="Devedores" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-900/40 -translate-y-5 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={24} /></button>
        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} onClose={() => setIsModalOpen(false)} onSave={handleSalvar} isSaving={isSaving} />}
    </main>
  );
}

function LancamentoModal({ tipo, setTipo, onClose, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    nome: '', valor: '', juros: '', data: new Date().toISOString().split('T')[0], ticker: '', tipoAtivo: 'Ação', qtd: '', preco: '', categoria: '', banco: 'Inter'
  });

  const handleConfirm = (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (tipo === 'devedor') {
      onSave({ "Nome": formData.nome, "Valor Inicial": parseFloat(formData.valor) || 0, "Juros %": parseFloat(formData.juros) || 0, "Data": formData.data }, 'bdDevedores');
    } else if (tipo === 'cartao') {
      onSave({ "Categoria": formData.categoria, "Conta/Cartão": formData.banco, "Valor": parseFloat(formData.valor) || 0, "Data": formData.data }, 'bdLancamentos');
    } else if (tipo === 'ativo') {
      onSave({ "Ticker": formData.ticker?.toUpperCase(), "Tipo (Ação/FII/Cripto)": formData.tipoAtivo, "Quantidade_Total": parseFloat(formData.qtd) || 0, "Preco_Medio": parseFloat(formData.preco) || 0 }, 'DB_Investimentos_Variaveis');
    }
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-base";

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-xl text-emerald-500 tracking-tight">
            {tipo === 'escolha' ? 'Novo Registro' : 'Detalhes do Lançamento'}
          </h3>
          <button onClick={onClose} className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white"><X size={20}/></button>
        </div>

        {tipo === 'escolha' && (
          <div className="grid grid-cols-3 gap-3">
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Cartão" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<TrendingUp className="text-emerald-400"/>} label="Ativo" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" />
          </div>
        )}

        {tipo !== 'escolha' && (
          <form className="space-y-4" onSubmit={handleConfirm}>
            {tipo === 'devedor' && <input type="text" placeholder="Nome do Devedor" className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />}
            {tipo === 'ativo' && <input type="text" placeholder="Ticker (ex: VALE3)" className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, ticker: e.target.value})} required />}
            {tipo === 'cartao' && (
              <select className={inputClass} onChange={e => setFormData({...formData, banco: e.target.value})}>
                <option value="Inter">Banco Inter</option>
                <option value="Nubank">Nubank</option>
                <option value="Bradesco">Bradesco</option>
              </select>
            )}

            <div className="grid grid-cols-2 gap-4">
              <input type="number" step="any" placeholder={tipo === 'ativo' ? "Qtd" : "Valor R$"} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value, qtd: e.target.value})} required />
              <input type="text" placeholder={tipo === 'devedor' ? "Juros %" : tipo === 'ativo' ? "Preço Médio" : "Categoria"} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value, preco: e.target.value, categoria: e.target.value})} required />
            </div>

            <input type="date" value={formData.data} className={inputClass} onChange={e => setFormData({...formData, data: e.target.value})} />

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all mt-4"
            >
              {isSaving ? <><Loader2 className="animate-spin" size={20}/> PROCESSANDO...</> : 'CONFIRMAR REGISTRO'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-3xl flex flex-col items-center gap-2 hover:bg-slate-800 hover:border-emerald-500 transition-all active:scale-90">
      {icon} <span className="font-bold text-[10px] uppercase text-slate-400">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-500 opacity-60'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); 
}

function PatrimonioView({ dados }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><div className="w-4 h-[1px] bg-slate-800"></div> Portfólio de Ativos</h2>
      {dados.length === 0 ? <EmptyState msg="Nenhum ativo sincronizado" /> : dados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-xs font-black text-emerald-500 border border-slate-700">{item.dados[0]?.substring(0,2)}</div>
            <div><p className="font-black text-sm text-slate-100">{item.dados[0]}</p><p className="text-[10px] font-bold text-slate-500 uppercase">Qtd: {item.dados[2]}</p></div>
          </div>
          <p className="font-black text-sm text-emerald-400 tracking-tight">R$ {parseFloat(item.dados[5] || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      ))}
    </div>
  );
}

function DevedoresView({ dados }) {
  const total = dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[1]) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2.5rem] shadow-lg">
        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Capital Externo</p>
        <p className="text-3xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>
      {dados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500"><HandCoins size={18}/></div>
            <div><p className="font-black text-sm text-slate-100">{item.dados[0]}</p><p className="text-[10px] font-bold text-slate-500">{item.dados[2]}% juros/mês</p></div>
          </div>
          <p className="font-black text-sm text-slate-100">R$ {parseFloat(item.dados[1] || 0).toLocaleString('pt-BR')}</p>
        </div>
      ))}
    </div>
  );
}

function CartoesView({ dados, mes }) {
  const total = dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[2]) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2.5rem] shadow-lg">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fatura Prevista | {mes}</p>
        <p className="text-3xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>
    </div>
  );
}

function EmptyState({ msg }) {
  return <div className="p-10 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem] text-slate-600 font-bold text-sm italic">{msg}</div>;
}
