"use client";

import { useState } from 'react';
import { 
  Wallet, TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, Car, X, CheckCircle, Trash2, Bitcoin, LineChart, 
  CalendarClock, Pencil, AlertTriangle, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Filtro de Competência (Mês atual)
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesAtual, setMesAtual] = useState(4); // 4 = Maio
  const [anoAtual, setAnoAtual] = useState(2026);

  const prevMonth = () => {
    if (mesAtual === 0) { setMesAtual(11); setAnoAtual(anoAtual - 1); } 
    else { setMesAtual(mesAtual - 1); }
  };

  const nextMonth = () => {
    if (mesAtual === 11) { setMesAtual(0); setAnoAtual(anoAtual + 1); } 
    else { setMesAtual(mesAtual + 1); }
  };

  const handleEdit = (tipo, item) => { setModalType(tipo); setItemToEdit(item); setIsModalOpen(true); };
  const confirmDelete = () => { console.log("Excluindo:", itemToDelete); setItemToDelete(null); };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      {/* HEADER + FILTRO DE MÊS */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 flex flex-col">
        <div className="p-4 md:p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> Modo Demonstração
            </p>
          </div>
          {/* Seletor de Mês */}
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

      {/* CONTEÚDO DAS ABAS */}
      <div className="p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView mes={`${meses[mesAtual]} ${anoAtual}`} />}
        {activeTab === 'patrimonio' && <PatrimonioView handleEdit={handleEdit} setItemToDelete={setItemToDelete} setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
        {activeTab === 'contas' && <ContasFixasView handleEdit={handleEdit} setItemToDelete={setItemToDelete} mes={meses[mesAtual]} />}
        {activeTab === 'receber' && <AReceberView handleEdit={handleEdit} setItemToDelete={setItemToDelete} setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
      </div>

      {/* MENU INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 px-2 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Geral" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Ativos" />
        
        <button 
          onClick={() => { setModalType('geral'); setItemToEdit(null); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-900/50 hover:bg-emerald-500 active:scale-95 transition-all -translate-y-4 border-4 border-slate-950"
        >
          <PlusCircle size={24} />
        </button>

        <NavButton active={activeTab === 'contas'} onClick={() => setActiveTab('contas')} icon={<Receipt size={20} />} label="Contas" />
        <NavButton active={activeTab === 'receber'} onClick={() => setActiveTab('receber')} icon={<Users size={20} />} label="Cobrar" />
      </nav>

      {/* MODAL DE FORMULÁRIO */}
      {isModalOpen && <LancamentoModal tipo={modalType} itemData={itemToEdit} onClose={() => { setIsModalOpen(false); setItemToEdit(null); }} />}

      {/* MODAL DE EXCLUSÃO SEGURA */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2rem] border border-red-900/50 p-6 shadow-2xl shadow-red-900/20 text-center">
            <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32} /></div>
            <h3 className="font-black text-xl text-white mb-2">Excluir Registro?</h3>
            <p className="text-slate-400 text-sm mb-6">Esta ação apagará o item da planilha e não poderá ser desfeita.</p>
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
   1. VISÃO GERAL (DASHBOARD SOMADO)
========================================================================= */
function DashboardView({ mes }) {
  // Valores calculados fake para a demonstração (Depois virão da API)
  const totalAtivos = 358625.40;
  const totalReceber = 550.00;
  const totalContas = 750.00;
  const patrimonioLiquido = (totalAtivos + totalReceber) - totalContas;

  const formatarMoeda = (valor) => `R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Card Principal: Patrimônio Líquido */}
      <div className="bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-800/50 rounded-[2rem] p-6 shadow-xl shadow-emerald-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={100} /></div>
        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">Patrimônio Líquido Real</p>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-4">{formatarMoeda(patrimonioLiquido)}</h2>
        
        <div className="grid grid-cols-2 gap-4 mt-6 border-t border-emerald-800/50 pt-4">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total em Ativos</p>
            <p className="text-sm font-bold text-slate-200">{formatarMoeda(totalAtivos)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Entradas (A Receber)</p>
            <p className="text-sm font-bold text-blue-400">+{formatarMoeda(totalReceber)}</p>
          </div>
        </div>
      </div>

      {/* Alerta de Obrigações do Mês */}
      <div className="bg-slate-900/50 border border-red-900/30 rounded-2xl p-5 flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <div className="bg-red-900/20 p-3 rounded-xl text-red-500"><Receipt size={24} /></div>
          <div>
            <p className="text-white font-bold text-sm">Contas de {mes}</p>
            <p className="text-xs text-slate-400">Restam 2 contas a pagar</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-red-400">{formatarMoeda(totalContas)}</p>
        </div>
      </div>
      
      {/* Gráfico de Barras Simples (CSS) para Distribuição do Patrimônio */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Distribuição do Patrimônio</h3>
        <div className="w-full h-4 bg-slate-800 rounded-full flex overflow-hidden mb-3">
          <div className="bg-orange-500 h-full" style={{width: '90%'}}></div> {/* BTC */}
          <div className="bg-blue-500 h-full" style={{width: '5%'}}></div>  {/* Ações */}
          <div className="bg-purple-500 h-full" style={{width: '5%'}}></div> {/* RF */}
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full"></span> Cripto (90%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Ações (5%)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 rounded-full"></span> RF (5%)</span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. ATIVOS / CONTAS / RECEBER (Resumidos para o espaço do código)
========================================================================= */
function PatrimonioView({ handleEdit, setItemToDelete, setModalType, setIsModalOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      {/* CRIPTO */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Bitcoin className="text-orange-500"/> Criptoativos</h2>
          <button onClick={() => {setModalType('cripto'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Novo</button>
        </div>
        <AtivoCard ticker="BTC" nome="Bitcoin" qtd="1.0" pm="R$ 310.000" atual="R$ 345.000" variacao="+11.2%" isCripto onEdit={() => handleEdit('cripto', {ticker: 'BTC'})} onDelete={() => setItemToDelete('id_btc')} />
      </section>
      {/* AÇÕES E RF... (Mantido igual à versão anterior) */}
    </div>
  );
}

function ContasFixasView({ handleEdit, setItemToDelete, mes }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
       <h2 className="text-lg font-bold flex items-center gap-2 text-white"><Receipt className="text-red-400"/> Fixas de {mes}</h2>
       <EditableItemCard icon={<Receipt className="text-red-400" />} title="Faculdade Estácio" subtitle="Venc: 10" value="R$ 450,00" initialStatus="Pendente" onEdit={() => handleEdit('conta', {title: 'Estacio'})} onDelete={() => setItemToDelete('id_estacio')} />
    </div>
  );
}

function AReceberView({ handleEdit, setItemToDelete, setModalType, setIsModalOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Users className="text-blue-400"/> Cobranças</h2>
        <button onClick={() => {setModalType('divida'); setIsModalOpen(true)}} className="text-xs bg-blue-900/30 px-3 py-1 rounded-full text-blue-400 font-bold border border-blue-900">+ Nova</button>
      </div>
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 relative group">
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => handleEdit('divida', {nome: 'João'})} className="text-slate-500 hover:text-emerald-400 p-1"><Pencil size={16} /></button>
          <button onClick={() => setItemToDelete('id_joao')} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={16} /></button>
        </div>
        <div className="mb-4 pr-16">
          <h3 className="font-black text-white text-lg">João (Peças Gol G6)</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarClock size={12}/> Vencimento: 10/04/2026</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 bg-emerald-900/30 text-emerald-500 font-bold text-xs py-2 rounded-xl border border-emerald-900/50"><CheckCircle className="inline" size={14}/> Quitar</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. COMPONENTES AUXILIARES (UI e Modais)
========================================================================= */
function LancamentoModal({ tipo, itemData, onClose }) {
  const isEditing = !!itemData;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">{isEditing ? `Editar Registro` : `Novo Registro`}</h3>
          <button onClick={onClose} className="text-slate-400"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <input type="text" placeholder="Nome / Descrição" defaultValue={isEditing ? itemData.ticker || itemData.nome || itemData.title : ''} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
          <input type="number" placeholder="Valor (R$)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
          <button className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl">{isEditing ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR'}</button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}> {icon} <span className="text-[9px] font-bold tracking-wide">{label}</span> </button> ); 
}

function AtivoCard({ ticker, nome, qtd, pm, atual, variacao, isCripto, onEdit, onDelete }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center group relative">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isCripto ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-300'}`}>{isCripto ? <Bitcoin size={20}/> : <span className="font-black text-xs">{ticker}</span>}</div>
        <div><h3 className="font-bold text-sm">{nome}</h3><p className="text-[10px] text-slate-500">Qtd: {qtd} | PM: {pm}</p></div>
      </div>
      <div className="text-right flex items-center gap-3">
        <div><p className="font-black text-sm">{atual}</p>{variacao && <p className={`text-[10px] font-bold ${variacao.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>{variacao}</p>}</div>
        <div className="flex flex-col gap-1 ml-2 border-l border-slate-800 pl-2">
           <button onClick={onEdit} className="text-slate-600 hover:text-blue-400"><Pencil size={14}/></button>
           <button onClick={onDelete} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}

function EditableItemCard({ icon, title, subtitle, value, initialStatus, onEdit, onDelete }) {
  const [status, setStatus] = useState(initialStatus);
  return (
    <div className={`p-4 bg-slate-900/40 border ${status === 'Pago' ? 'border-emerald-900/50 opacity-60' : 'border-slate-800'} rounded-2xl flex justify-between items-center transition-all`}>
      <div className="flex gap-4 items-center">
        <button onClick={() => setStatus(status === 'Pago' ? 'Pendente' : 'Pago')} className={`p-3 rounded-xl border ${status === 'Pago' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-slate-700 text-slate-500'}`}><CheckCircle size={20} /></button>
        <div><h3 className={`font-bold text-sm ${status === 'Pago' ? 'line-through text-slate-500' : 'text-white'}`}>{title}</h3><p className="text-xs text-slate-500">{subtitle}</p></div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end mr-2"><span className={`font-black ${status === 'Pago' ? 'text-emerald-500' : 'text-red-400'}`}>{value}</span></div>
        <div className="flex flex-col gap-1 border-l border-slate-800 pl-3">
           <button onClick={onEdit} className="text-slate-600 hover:text-blue-400"><Pencil size={14}/></button>
           <button onClick={onDelete} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}
