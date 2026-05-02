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

  // Notificações internas do App
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

      if (inv?.success || inv?.status === "success") setInvestimentos(inv.data || []);
      if (cart?.success || cart?.status === "success") setGastosCartao(cart.data || []);
      if (dev?.success || dev?.status === "success") setDevedores(dev.data || []);
      
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  // Lógica Otimista: Salva em segundo plano e libera a tela
  const handleSalvar = async (payload, aba) => {
    setIsModalOpen(false); 
    setSyncStatus('syncing');
    showToast("Enviando para a planilha...");

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar', aba, payload })
      });
      const result = await response.json();
      
      if (result.success || result.status === "success") {
        setSyncStatus('synced');
        showToast("Dados registrados com sucesso!");
        fetchDados(true); 
      } else {
        throw new Error();
      }
    } catch (error) {
      setSyncStatus('error');
      showToast("Falha ao salvar. Verifique o Proxy.", "error");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative overflow-x-hidden">
      
      {/* POPUP DE NOTIFICAÇÃO (TOAST) ESTILIZADO */}
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 border w-[90%] max-w-sm ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-red-950/90 border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-emerald-500 italic tracking-tighter">APPFINANCE</h1>
            {syncStatus === 'syncing' && <Loader2 className="text-blue-500 animate-spin" size={14}/>}
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => setMesAtual(prev => prev === 0 ? 11 : prev - 1)} className="p-1 hover:text-emerald-500"><ChevronLeft size={16}/></button>
            <span className="min-w-[80px] text-center text-slate-300">{meses[mesAtual]}</span>
            <button onClick={() => setMesAtual(prev => prev === 11 ? 0 : prev + 1)} className="p-1 hover:text-emerald-500"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'patrimonio' && <ListView items={investimentos} title="Meus Ativos" type="ativo" />}
        {activeTab === 'devedores' && <ListView items={devedores} title="Contas a Receber" type="devedor" />}
        {activeTab === 'cartoes' && <CartaoSummary items={gastosCartao} mes={meses[mesAtual]} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={22} />} label="Carteira" />
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={22} />} label="Dívidas" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-[1.5rem] shadow-lg shadow-emerald-900/40 -translate-y-5 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={28} /></button>
        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={22} />} label="Cartões" />
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={22} />} label="Resumo" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} onClose={() => setIsModalOpen(false)} onSave={handleSalvar} />}
    </main>
  );
}

function LancamentoModal({ tipo, setTipo, onClose, onSave }) {
  const [formData, setFormData] = useState({ data: new Date().toISOString().split('T')[0], banco: 'Inter', ticker: '', valor: '', juros: '', nome: '', categoria: '' });
  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all text-base";

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-xl text-emerald-500">
            {tipo === 'escolha' ? 'O que lançar?' : 'Dados do Registro'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500"><X size={20}/></button>
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
            
            let payload = {};
            let abaDestino = "";

            if (tipo === 'devedor') {
              abaDestino = 'bdDevedores';
              payload = {
                // ATENÇÃO: As chaves em vermelho ("Nome", "Valor Inicial"...) 
                // DEVEM ser 100% idênticas ao cabeçalho da sua planilha (F a L)
                "Nome": formData.nome,
                "Valor Inicial": parseFloat(formData.valor) || 0,
                "Juros %": parseFloat(formData.juros) || 0,
                "Data": formData.data
              };
            } else if (tipo === 'cartao') {
              abaDestino = 'bdLancamentos';
              payload = {
                "Categoria": formData.categoria,
                "Conta/Cartão": formData.banco,
                "Valor": parseFloat(formData.valor) || 0,
                "Data": formData.data
              };
            } else if (tipo === 'ativo') {
              abaDestino = 'DB_Historico_Ordens'; // Corrigido o destino!
              payload = {
                "Ticker": formData.ticker?.toUpperCase(),
                "Tipo": "Ação", // Ajuste o nome dessa coluna se for diferente no histórico
                "Quantidade": parseFloat(formData.valor) || 0,
                "Preco": parseFloat(formData.juros) || 0,
                "Data": formData.data
              };
            }

            onSave(payload, abaDestino);
          }}>
            <input type="text" placeholder={tipo === 'devedor' ? "Quem deve?" : "Ticker ou Item"} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value, ticker: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <input type="number" step="any" placeholder={tipo === 'ativo' ? "Quantidade" : "Valor R$"} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
              <input type="text" placeholder={tipo === 'devedor' ? "Juros %" : tipo === 'ativo' ? "Preço Médio" : "Categoria"} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value, categoria: e.target.value})} required />
            </div>
            <input type="date" value={formData.data} className={inputClass} onChange={e => setFormData({...formData, data: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-emerald-900/30 active:scale-95 transition-all mt-4">
              REGISTRAR AGORA
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-[2rem] flex flex-col items-center gap-2 hover:border-white transition-all active:scale-90">
      {icon} <span className="font-bold text-[9px] uppercase text-slate-500">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-500 opacity-40'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); 
}

function ListView({ items, title, type }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1 italic">{title}</h2>
      {items.length === 0 ? <div className="p-8 text-center text-slate-700 font-bold border-2 border-dashed border-slate-900 rounded-3xl text-xs italic">Nada cadastrado ainda</div> : items.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900/50 border border-slate-800 rounded-3xl flex justify-between items-center animate-in fade-in duration-700">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border ${type === 'devedor' ? 'bg-amber-500/10 text-amber-500 border-amber-900/20' : 'bg-slate-800 text-emerald-500 border-slate-700'}`}>
              {type === 'devedor' ? <HandCoins size={18}/> : item?.dados?.[0]?.substring(0,2) || '??'}
            </div>
            <div>
              <p className="font-black text-sm text-slate-100">{item?.dados?.[0] || 'Sem Nome'}</p>
              <p className="text-[9px] font-black text-slate-600 uppercase">{type === 'devedor' ? `Taxa: ${item?.dados?.[2]}%` : `Qtd: ${item?.dados?.[2]}`}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-sm text-slate-100">R$ {parseFloat(type === 'devedor' ? item?.dados?.[1] : item?.dados?.[5] || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CartaoSummary({ items, mes }) {
  const total = items.reduce((acc, curr) => acc + (parseFloat(curr?.dados?.[2]) || 0), 0);
  return (
    <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl animate-in zoom-in duration-500">
      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Fatura Prevista | {mes}</p>
      <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
    </div>
  );
}
