"use client";

import { useState } from 'react';
import { 
  Wallet, TrendingUp, PieChart, LayoutDashboard, Receipt, Users, PlusCircle,
  Landmark, Car, X, CheckCircle, Trash2, Bitcoin, LineChart, History, RefreshCw, CalendarClock, Pencil, AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('patrimonio');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'acao', 'rendafixa', 'cripto', 'divida', 'conta'
  
  // Estados para Edição e Exclusão Segura
  const [itemToEdit, setItemToEdit] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Função para abrir modal de edição
  const handleEdit = (tipo, item) => {
    setModalType(tipo);
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  // Função para confirmar e processar exclusão
  const confirmDelete = () => {
    console.log("Excluindo item da planilha (Linha):", itemToDelete);
    // Aqui vai o fetch para a API com { action: 'excluir', linha: itemToDelete.linha }
    setItemToDelete(null); // Fecha o modal
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-24 font-sans relative">
      <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 p-4 md:p-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">APPFINANCE.PRO</h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            Modo Demonstração (Sem API conectada)
          </p>
        </div>
      </header>

      <div className="p-4 md:p-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'patrimonio' && <PatrimonioView handleEdit={handleEdit} setItemToDelete={setItemToDelete} setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
        {activeTab === 'contas' && <ContasFixasView handleEdit={handleEdit} setItemToDelete={setItemToDelete} />}
        {activeTab === 'receber' && <AReceberView handleEdit={handleEdit} setItemToDelete={setItemToDelete} setModalType={setModalType} setIsModalOpen={setIsModalOpen} />}
      </div>

      {/* Menu Fixo Inferior */}
      <nav className="fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 flex justify-around items-center p-3 z-40 px-2 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Visão Geral" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Landmark size={20} />} label="Patrimônio" />
        
        <button 
          onClick={() => { setModalType('geral'); setItemToEdit(null); setIsModalOpen(true); }}
          className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-900/50 hover:bg-emerald-500 active:scale-95 transition-all -translate-y-4 border-4 border-slate-950 flex-shrink-0"
        >
          <PlusCircle size={24} />
        </button>

        <NavButton active={activeTab === 'contas'} onClick={() => setActiveTab('contas')} icon={<Receipt size={20} />} label="Contas" />
        <NavButton active={activeTab === 'receber'} onClick={() => setActiveTab('receber')} icon={<Users size={20} />} label="A Receber" />
      </nav>

      {/* MODAL DE FORMULÁRIO (Criação e Edição) */}
      {isModalOpen && (
        <LancamentoModal 
          tipo={modalType} 
          itemData={itemToEdit}
          onClose={() => { setIsModalOpen(false); setItemToEdit(null); }} 
        />
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 w-full max-w-sm rounded-[2rem] border border-red-900/50 p-6 shadow-2xl shadow-red-900/20 text-center">
            <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="font-black text-xl text-white mb-2">Excluir Registro?</h3>
            <p className="text-slate-400 text-sm mb-6">Esta ação apagará o item da sua planilha e não poderá ser desfeita. Tem certeza?</p>
            
            <div className="flex gap-3">
              <button onClick={() => setItemToDelete(null)} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-colors">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================================
   VISÕES AVANÇADAS DAS ABAS (Com botões de ação)
========================================================================= */

function PatrimonioView({ handleEdit, setItemToDelete, setModalType, setIsModalOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Bitcoin className="text-orange-500"/> Criptoativos</h2>
          <button onClick={() => {setModalType('cripto'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Novo</button>
        </div>
        <div className="space-y-3">
          <AtivoCard ticker="BTC" nome="Bitcoin" qtd="0.05" pm="R$ 310.000" atual="R$ 345.000" variacao="+11.2%" isCripto onEdit={() => handleEdit('cripto', {ticker: 'BTC'})} onDelete={() => setItemToDelete('id_btc')} />
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="text-blue-500"/> Renda Variável</h2>
          <button onClick={() => {setModalType('acao'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Nova Ordem</button>
        </div>
        <div className="space-y-3">
          <AtivoCard ticker="VALE3" nome="Vale S.A." qtd="100" pm="R$ 62,50" atual="R$ 64,10" proventos="R$ 2,10/ação prev." onEdit={() => handleEdit('acao', {ticker: 'VALE3'})} onDelete={() => setItemToDelete('id_vale3')} />
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><LineChart className="text-purple-500"/> Renda Fixa</h2>
          <button onClick={() => {setModalType('rendafixa'); setIsModalOpen(true)}} className="text-xs bg-slate-900 px-3 py-1 rounded-full text-emerald-500 font-bold border border-emerald-900/30">+ Novo Aporte</button>
        </div>
        <div className="space-y-3">
          <RendaFixaCard nome="CDB Banco Inter" taxa="110% CDI" aplicado="R$ 5.000,00" atualizado="R$ 5.125,40" vencimento="12/2027" onEdit={() => handleEdit('rendafixa', {nome: 'CDB'})} onDelete={() => setItemToDelete('id_cdb')} />
        </div>
      </section>
    </div>
  );
}

function ContasFixasView({ handleEdit, setItemToDelete }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
       <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="text-red-400"/> Contas do Mês</h2>
       <div className="space-y-4">
          <EditableItemCard icon={<Receipt className="text-red-400" />} title="Faculdade Estácio" subtitle="Venc: 10/05" value="R$ 450,00" initialStatus="Pendente" onEdit={() => handleEdit('conta', {title: 'Estacio'})} onDelete={() => setItemToDelete('id_estacio')} />
       </div>
    </div>
  );
}

function AReceberView({ handleEdit, setItemToDelete, setModalType, setIsModalOpen }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold flex items-center gap-2"><Users className="text-blue-400"/> Gestão de Cobranças</h2>
        <button onClick={() => {setModalType('divida'); setIsModalOpen(true)}} className="text-xs bg-blue-900/30 px-3 py-1 rounded-full text-blue-400 font-bold border border-blue-900">+ Nova Cobrança</button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 relative group">
        
        {/* Botões de Ação do Card (Editar / Excluir) */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => handleEdit('divida', {nome: 'João'})} className="text-slate-500 hover:text-emerald-400 transition-colors p-1"><Pencil size={16} /></button>
          <button onClick={() => setItemToDelete('id_joao_divida')} className="text-slate-500 hover:text-red-400 transition-colors p-1"><Trash2 size={16} /></button>
        </div>

        <div className="mb-4 pr-16">
          <h3 className="font-black text-white text-lg">João (Peças Gol G6)</h3>
          <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarClock size={12}/> Vencimento: 10/04/2026</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div><p className="text-[10px] text-slate-500 uppercase font-bold">Dívida Inicial</p><p className="text-sm font-bold">R$ 500,00</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase font-bold">Juros/Multa</p><p className="text-sm font-bold text-orange-400">+ R$ 50,00</p></div>
          <div><p className="text-[10px] text-slate-500 uppercase font-bold">A Receber</p><p className="text-sm font-black text-blue-400">R$ 550,00</p></div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-emerald-900/30 text-emerald-500 font-bold text-xs py-2 rounded-xl border border-emerald-900/50 hover:bg-emerald-900/50 flex items-center justify-center gap-2"><CheckCircle size={14}/> Quitar</button>
          <button className="flex-1 bg-slate-800 text-slate-300 font-bold text-xs py-2 rounded-xl border border-slate-700 hover:bg-slate-700 flex items-center justify-center gap-2"><RefreshCw size={14}/> Rolar Dívida</button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MODAL DINÂMICO (Adaptado para Edição)
========================================================================= */

function LancamentoModal({ tipo, itemData, onClose }) {
  const isEditing = !!itemData; // Se recebeu dados, é modo edição

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 p-6 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-emerald-400">
            {isEditing ? `Editar Registro` : `Novo Registro`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 bg-slate-950 rounded-full"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          <input type="text" placeholder="Nome / Descrição" defaultValue={isEditing ? itemData.ticker || itemData.nome || itemData.title : ''} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
          <input type="number" placeholder="Valor (R$)" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white" />
          <button className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-500 transition-colors mt-4">
            {isEditing ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* COMPONENTES MENORES (Com Lixeira e Lápis inseridos) */
function DashboardView() { return <div className="text-center text-slate-500 mt-10">Conecte a API para ver os gráficos.</div>; }
function NavButton({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-colors ${active ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300'}`}> {icon} <span className="text-[9px] font-bold tracking-wide">{label}</span> </button> ); }

function AtivoCard({ ticker, nome, qtd, pm, atual, variacao, proventos, isCripto, onEdit, onDelete }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex justify-between items-center group relative">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isCripto ? 'bg-orange-500/10 text-orange-500' : 'bg-slate-800 text-slate-300'}`}>
          {isCripto ? <Bitcoin size={20}/> : <span className="font-black text-xs">{ticker}</span>}
        </div>
        <div>
          <h3 className="font-bold text-sm">{nome}</h3>
          <p className="text-[10px] text-slate-500">Qtd: {qtd} | PM: {pm}</p>
        </div>
      </div>
      <div className="text-right flex items-center gap-3">
        <div>
          <p className="font-black text-sm">{atual}</p>
          {variacao && <p className={`text-[10px] font-bold ${variacao.includes('+') ? 'text-emerald-400' : 'text-red-400'}`}>{variacao}</p>}
        </div>
        {/* Botões ocultos no mobile até o toque, ou sempre visíveis */}
        <div className="flex flex-col gap-1 ml-2">
           <button onClick={onEdit} className="text-slate-600 hover:text-blue-400"><Pencil size={14}/></button>
           <button onClick={onDelete} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}

function RendaFixaCard({ nome, taxa, aplicado, atualizado, vencimento, onEdit, onDelete }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl relative">
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={onEdit} className="text-slate-500 hover:text-emerald-400"><Pencil size={14} /></button>
        <button onClick={onDelete} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
      <div className="flex justify-between items-start mb-2 pr-12">
        <div><h3 className="font-bold text-sm">{nome}</h3><p className="text-xs text-purple-400 font-bold">{taxa}</p></div>
      </div>
      <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-800/50">
        <div><p className="text-[10px] text-slate-500 uppercase font-bold">Aplicado</p><p className="text-xs font-bold">{aplicado}</p></div>
        <div className="text-right"><p className="text-[10px] text-slate-500 uppercase font-bold">Bruto Atual</p><p className="text-sm font-black text-emerald-400">{atualizado}</p></div>
      </div>
    </div>
  );
}

function EditableItemCard({ icon, title, subtitle, value, initialStatus, onEdit, onDelete }) {
  const [status, setStatus] = useState(initialStatus);
  return (
    <div className={`p-4 bg-slate-900/40 border ${status === 'Pago' ? 'border-emerald-900/50 opacity-60' : 'border-slate-800'} rounded-2xl flex justify-between items-center transition-all`}>
      <div className="flex gap-4 items-center">
        <button onClick={() => setStatus(status === 'Pago' ? 'Pendente' : 'Pago')} className={`p-3 rounded-xl border ${status === 'Pago' ? 'bg-emerald-900/20 border-emerald-500 text-emerald-500' : 'bg-slate-950 border-slate-700 text-slate-500'}`}>
          <CheckCircle size={20} />
        </button>
        <div>
          <h3 className={`font-bold text-sm ${status === 'Pago' ? 'line-through text-slate-500' : 'text-white'}`}>{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end mr-2">
          <span className={`font-black ${status === 'Pago' ? 'text-emerald-500' : 'text-red-400'}`}>{value}</span>
          <span className="text-[10px] font-bold text-slate-600 uppercase mt-1">{status}</span>
        </div>
        <div className="flex flex-col gap-1 border-l border-slate-800 pl-3">
           <button onClick={onEdit} className="text-slate-600 hover:text-blue-400"><Pencil size={14}/></button>
           <button onClick={onDelete} className="text-slate-600 hover:text-red-400"><Trash2 size={14}/></button>
        </div>
      </div>
    </div>
  );
}
