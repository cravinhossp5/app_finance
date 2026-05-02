"use client";

import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, X, CheckCircle, Trash2, Bitcoin, LineChart, 
  CalendarClock, Pencil, AlertTriangle, ChevronLeft, ChevronRight, Calendar, CreditCard, PieChart,
  HandCoins
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Novo: Estado para travar o botão ao salvar

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dataAtual = new Date();
  const [mesAtual, setMesAtual] = useState(dataAtual.getMonth()); 
  const [anoAtual, setAnoAtual] = useState(dataAtual.getFullYear());

  const [investimentos, setInvestimentos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [devedores, setDevedores] = useState([]);

  // --- BUSCA DE DADOS ---
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

      if (inv.success) setInvestimentos(inv.data);
      if (cart.success) setGastosCartao(cart.data);
      if (dev.success) setDevedores(dev.data);

    } catch (error) {
      console.error("Erro ao sincronizar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  // --- SALVAMENTO COM FEEDBACK ---
  const handleSalvar = async (payload, aba) => {
    setIsSaving(true); // Trava o botão para evitar cliques duplos
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar', aba, payload })
      });
      const result = await response.json();
      
      if (result.success) {
        setIsModalOpen(false);
        await fetchDados(); // Atualiza a lista após salvar
      } else {
        alert("Erro na Planilha: " + result.message);
      }
    } catch (error) {
      alert("Erro de conexão. Verifique o sinal da internet.");
    } finally {
      setIsSaving(false);
    }
  };

  const prevMonth = () => { if (mesAtual === 0) { setMesAtual(11); setAnoAtual(anoAtual - 1); } else { setMesAtual(mesAtual - 1); } };
  const nextMonth = () => { if (mesAtual === 11) { setMesAtual(0); setAnoAtual(anoAtual + 1); } else { setMesAtual(mesAtual + 1); } };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-emerald-500 tracking-tighter">APPFINANCE.PRO</h1>
            <p className="text-[10px] uppercase font-bold text-slate-500">Torre de Controle</p>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-2 rounded-2xl text-sm font-bold">
            <button onClick={prevMonth} className="p-1"><ChevronLeft size={18}/></button>
            <span className="min-w-[100px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={nextMonth} className="p-1"><ChevronRight size={18}/></button>
          </div>
        </div>
      </header>

      <div className="p-4">
        {activeTab === 'patrimonio' && <PatrimonioView dados={investimentos} />}
        {activeTab === 'cartoes' && <CartoesView dados={gastosCartao} mes={meses[mesAtual]} />}
        {activeTab === 'devedores' && <DevedoresView dados={devedores} />}
        {activeTab === 'dashboard' && <div className="text-center text-slate-500 mt-10">Resumo consolidado em construção...</div>}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 pb-safe">
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={20} />} label="Devedores" />
        
        <button 
          onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} 
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-900/40 -translate-y-4 border-4 border-slate-950 active:scale-90 transition-transform"
        >
          <PlusCircle size={24} />
        </button>

        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
      </nav>

      {isModalOpen && (
        <LancamentoModal 
          tipo={modalType} 
          setTipo={setModalType}
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSalvar}
          isSaving={isSaving}
        />
      )}
    </main>
  );
}

// --- MODAL DE LANÇAMENTO (CORREÇÃO DE CLIQUES) ---
function LancamentoModal({ tipo, setTipo, onClose, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    nome: '', valor: '', juros: '', data: new Date().toISOString().split('T')[0], ticker: '', tipoAtivo: 'Ação', qtd: '', preco: '', categoria: '', banco: 'Inter'
  });

  const handleConfirm = (e) => {
    e.preventDefault(); // Evita comportamento padrão do navegador
    if (isSaving) return;

    if (tipo === 'devedor') {
      onSave({
        "Nome": formData.nome,
        "Valor Inicial": parseFloat(formData.valor) || 0,
        "Juros %": parseFloat(formData.juros) || 0,
        "Data": formData.data
      }, 'bdDevedores');
    } else if (tipo === 'cartao') {
      onSave({
        "Categoria": formData.categoria,
        "Conta/Cartão": formData.banco,
        "Valor": parseFloat(formData.valor) || 0,
        "Data": formData.data
      }, 'bdLancamentos');
    } else if (tipo === 'ativo') {
      onSave({
        "Ticker": formData.ticker?.toUpperCase(),
        "Tipo (Ação/FII/Cripto)": formData.tipoAtivo,
        "Quantidade_Total": parseFloat(formData.qtd) || 0,
        "Preco_Medio": parseFloat(formData.preco) || 0
      }, 'DB_Investimentos_Variaveis');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-6 shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">
            {tipo === 'escolha' ? 'Novo Registro' : tipo === 'devedor' ? 'Dados do Devedor' : 'Preencha os Campos'}
          </h3>
          <button onClick={onClose} className="text-slate-500 p-2"><X size={24}/></button>
        </div>

        {tipo === 'escolha' && (
          <div className="grid grid-cols-3 gap-3">
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Cartão" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<TrendingUp className="text-emerald-400"/>} label="Ativo" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" />
          </div>
        )}

        {tipo !== 'escolha' && (
          <div className="space-y-4">
            {tipo === 'devedor' && (
              <input type="text" placeholder="Nome" className="form-input" onChange={e => setFormData({...formData, nome: e.target.value})} />
            )}
            
            {tipo === 'ativo' && (
              <input type="text" placeholder="Ticker (Ex: VALE3)" className="form-input uppercase" onChange={e => setFormData({...formData, ticker: e.target.value})} />
            )}

            <div className="grid grid-cols-2 gap-4">
              <input type="number" placeholder={tipo === 'ativo' ? "Qtd" : "Valor R$"} className="form-input" onChange={e => setFormData({...formData, valor: e.target.value, qtd: e.target.value})} />
              <input type="number" placeholder={tipo === 'devedor' ? "Juros %" : tipo === 'ativo' ? "Preço Médio" : "Categoria"} className="form-input" onChange={e => setFormData({...formData, juros: e.target.value, preco: e.target.value, categoria: e.target.value})} />
            </div>

            <input type="date" value={formData.data} className="form-input text-slate-400" onChange={e => setFormData({...formData, data: e.target.value})} />

            <button 
              onClick={handleConfirm}
              disabled={isSaving}
              className={`w-full py-4 rounded-2xl font-black transition-all ${isSaving ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 text-white active:scale-95 shadow-lg shadow-emerald-900/20'}`}
            >
              {isSaving ? 'PROCESSANDO...' : 'REGISTRAR AGORA'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---
function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800 p-5 rounded-3xl flex flex-col items-center gap-2 border border-slate-700 active:bg-slate-700 transition-all">
      {icon} <span className="font-bold text-[10px] uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500'}`}> {icon} <span className="text-[9px] font-bold">{label}</span> </button> ); 
}

function PatrimonioView({ dados }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">Minha Carteira</h2>
      {dados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
          <div><p className="font-bold text-sm text-white">{item.dados[0]}</p><p className="text-[10px] text-slate-500">Qtd: {item.dados[2]}</p></div>
          <p className="font-black text-sm text-emerald-400">R$ {parseFloat(item.dados[5] || 0).toLocaleString('pt-BR')}</p>
        </div>
      ))}
    </div>
  );
}

function DevedoresView({ dados }) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-600/10 border border-amber-500/20 p-6 rounded-[2.5rem]">
        <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Empréstimos Ativos</p>
        <p className="text-3xl font-black text-white">R$ {dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[1]) || 0), 0).toLocaleString('pt-BR')}</p>
      </div>
      {dados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><HandCoins size={20}/></div>
            <div><p className="font-bold text-sm text-white">{item.dados[0]}</p><p className="text-[10px] text-slate-500">{item.dados[2]}% juros</p></div>
          </div>
          <p className="font-black text-sm text-white">R$ {parseFloat(item.dados[1] || 0).toLocaleString('pt-BR')}</p>
        </div>
      ))}
    </div>
  );
}

function CartoesView({ dados, mes }) {
  const total = dados.reduce((acc, curr) => acc + (parseFloat(curr.dados[2]) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-[2.5rem]">
        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Fatura de {mes}</p>
        <p className="text-3xl font-black text-white">R$ {total.toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
