"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart,
  ArrowLeft, Edit, Trash2
} from 'lucide-react';

// ==========================================
// FUNÇÕES AUXILIARES DE DATA E PROTEÇÃO
// ==========================================
const safeString = (val) => String(val || '').trim();

function parseDataBR(dataStr) {
  const str = safeString(dataStr);
  if (!str) return null; // Evita puxar "hoje" em campos vazios
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length >= 3) return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateToBR(dateObj) {
  if (!dateObj) return 'Não definida';
  const d = String(dateObj.getDate()).padStart(2, '0');
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const y = dateObj.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [editItem, setEditItem] = useState(null); // Estado para o Modo de Edição
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('synced'); 
  const [notification, setNotification] = useState(null);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesAtual, setMesAtual] = useState(new Date().getMonth()); 
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const [ativosVariaveis, setAtivosVariaveis] = useState([]);
  const [ativosFixos, setAtivosFixos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [devedores, setDevedores] = useState([]);
  const [salarios, setSalarios] = useState([]);
  const [historicoOrdens, setHistoricoOrdens] = useState([]);
  
  const [meusBancos, setMeusBancos] = useState([]);
  const [bancosConfig, setBancosConfig] = useState({});
  
  // Modos de Detalhamento ("Mergulho")
  const [clienteAtivo, setClienteAtivo] = useState(null);
  const [carteiraDetalhe, setCarteiraDetalhe] = useState(null);

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

      const [varData, fixData, cartData, devData, bancosData, salarioData, ordensData] = await Promise.all([
        fetchData('DB_Investimentos_Variaveis'),
        fetchData('DB_Investimentos_Fixos'),
        fetchData('bdLancamentos'),
        fetchData('bdDevedores'),
        fetchData('meus_bancos'),
        fetchData('bdRendas'),
        fetchData('DB_Historico_Ordens')
      ]);

      if (varData?.success) setAtivosVariaveis(varData.data || []);
      if (fixData?.success) setAtivosFixos(fixData.data || []);
      if (cartData?.success) setGastosCartao(cartData.data || []);
      if (devData?.success) setDevedores(devData.data || []);
      if (salarioData?.success) setSalarios(salarioData.data || []);
      if (ordensData?.success) setHistoricoOrdens(ordensData.data || []);
      
      if (bancosData?.success && bancosData.data) {
        const configObj = {};
        bancosData.data.forEach(b => {
          if(b.dados[0] && safeString(b.dados[0]).toLowerCase() !== "banco") {
            configObj[b.dados[0]] = { fechamento: parseInt(b.dados[1], 10) || 31, vencimento: parseInt(b.dados[2], 10) || 1 };
          }
        });
        setBancosConfig(configObj);
        setMeusBancos(Object.keys(configObj).length > 0 ? Object.keys(configObj) : ['Dinheiro']);
      }
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  // MOTOR CENTRAL DE CRUD (Criar, Atualizar, Excluir)
  const handleGravarDados = async (payload, aba, linha = null) => {
    setIsModalOpen(false); 
    setEditItem(null);
    setSyncStatus('syncing');
    showToast(linha ? "Atualizando..." : "Enviando...", "info");

    try {
      const body = linha 
        ? { action: 'atualizar', aba, linha, payload } 
        : { action: 'adicionar', aba, payload };

      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if ((await res.json()).success) {
        showToast(linha ? "Atualizado com sucesso!" : "Registrado com sucesso!");
        fetchDados(true); 
      } else throw new Error();
    } catch (error) {
      setSyncStatus('error');
      showToast("Falha na comunicação.", "error");
    }
  };

  const handleExcluir = async (linha, aba) => {
    if(!window.confirm('Tem certeza que deseja APAGAR este registro?')) return;
    setSyncStatus('syncing');
    showToast("Excluindo...", "info");
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'excluir', aba, linha })
      });
      if ((await res.json()).success) {
        showToast("Registro apagado!");
        fetchDados(true);
      } else throw new Error();
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao excluir.", "error");
    }
  };

  // Abre o modal no modo edição
  const abrirEdicao = (item, tipoStr) => {
    setEditItem(item);
    setModalType(tipoStr);
    setIsModalOpen(true);
  };

  const handlePagarFatura = async (item) => {
    const payload = [ item.dados[5], item.dados[6], item.dados[7], item.dados[8], item.dados[9], item.dados[10], "Paga" ];
    handleGravarDados(payload, 'bdLancamentos', item.linha);
  };

  const calcCaixaLivre = () => {
    let rendaMes = 0; let gastoMes = 0; let investimentoMes = 0; let emprestadoMes = 0; let recebidoMes = 0;

    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) rendaMes += (parseFloat(s.dados[9]) || 0);
    });

    gastosCartao.forEach(g => {
      const d = parseDataBR(g.dados[5]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) gastoMes += (parseFloat(g.dados[7]) || 0);
    });

    historicoOrdens.forEach(ordem => {
      const d = parseDataBR(ordem.dados[5]); // Coluna F de historico_ordens
      const tipoOp = safeString(ordem.dados[7]).toUpperCase(); // Coluna H
      const valor = parseFloat(ordem.dados[9]) || 0; // Coluna J (Preço)
      const qtd = parseFloat(ordem.dados[8]) || 0; // Coluna I (Qtd)
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        if (tipoOp.includes('COMPRA')) investimentoMes += (valor * qtd);
        if (tipoOp.includes('VENDA')) rendaMes += (valor * qtd); 
      }
    });

    devedores.forEach(dev => {
      const dAcordo = parseDataBR(dev.dados[5]);
      const valorOriginal = parseFloat(dev.dados[7]) || 0;
      const status = safeString(dev.dados[9]);
      const pago = parseFloat(dev.dados[3]) || 0; 
      
      if (dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual) emprestadoMes += valorOriginal;
      if (status === 'Concluído' && dAcordo && dAcordo.getMonth() === mesAtual) recebidoMes += pago; 
    });

    return { renda: rendaMes + recebidoMes, saida: gastoMes + investimentoMes + emprestadoMes, livre: (rendaMes + recebidoMes) - (gastoMes + investimentoMes + emprestadoMes) };
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-28 font-sans relative overflow-x-hidden selection:bg-emerald-500/30">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 border w-[90%] max-w-sm ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 
          notification.type === 'info' ? 'bg-blue-950/90 border-blue-500/50 text-blue-400' : 'bg-red-950/90 border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20}/> : notification.type === 'info' ? <Loader2 size={20} className="animate-spin"/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-emerald-500 italic tracking-tighter">APPFINANCE</h1>
            {syncStatus === 'syncing' && <Loader2 className="text-blue-500 animate-spin" size={14}/>}
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-inner">
            <button onClick={() => { setMesAtual(prev => prev === 0 ? 11 : prev - 1); if(mesAtual===0) setAnoAtual(p=>p-1); }} className="p-1 hover:text-emerald-500"><ChevronLeft size={16}/></button>
            <span className="min-w-[80px] text-center text-slate-300 tracking-widest">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={() => { setMesAtual(prev => prev === 11 ? 0 : prev + 1); if(mesAtual===11) setAnoAtual(p=>p+1); }} className="p-1 hover:text-emerald-500"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'dashboard' && <ResumoView dadosCaixa={calcCaixaLivre()} salarios={salarios} mesAtual={mesAtual} anoAtual={anoAtual} onEdit={(item) => abrirEdicao(item, 'salario')} onDelete={(linha) => handleExcluir(linha, 'bdRendas')} />}
        
        {activeTab === 'patrimonio' && !carteiraDetalhe && <CarteiraView ativosVar={ativosVariaveis} ativosFixos={ativosFixos} onAbrirDetalhe={setCarteiraDetalhe} />}
        {activeTab === 'patrimonio' && carteiraDetalhe && <CarteiraDetalheView tipo={carteiraDetalhe} ativosVar={ativosVariaveis} ativosFixos={ativosFixos} onVoltar={() => setCarteiraDetalhe(null)} onEdit={(item) => abrirEdicao(item, 'ativo')} onDelete={(linha, aba) => handleExcluir(linha, aba)} />}
        
        {activeTab === 'devedores' && !clienteAtivo && <DevedoresView items={devedores} onAbrirCliente={setClienteAtivo} />}
        {activeTab === 'devedores' && clienteAtivo && <ClienteDossieView nome={clienteAtivo} items={devedores} onVoltar={() => setClienteAtivo(null)} onStatusChange={(item, s) => handleGravarDados([item.dados[5], item.dados[6], item.dados[7], item.dados[8], s, item.dados[10], item.dados[11]], 'bdDevedores', item.linha)} onEdit={(item) => abrirEdicao(item, 'devedor')} onDelete={(linha) => handleExcluir(linha, 'bdDevedores')} />}
        
        {activeTab === 'cartoes' && <CartoesView items={gastosCartao} config={bancosConfig} onPagar={handlePagarFatura} onEdit={(item) => abrirEdicao(item, 'cartao')} onDelete={(linha) => handleExcluir(linha, 'bdLancamentos')} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/50 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setClienteAtivo(null); setCarteiraDetalhe(null);}} icon={<PieChart size={22} />} label="Resumo" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => {setActiveTab('patrimonio'); setClienteAtivo(null); setCarteiraDetalhe(null);}} icon={<Briefcase size={22} />} label="Carteira" />
        <button onClick={() => { setEditItem(null); setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-[1.7rem] shadow-lg shadow-emerald-900/40 -translate-y-6 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={28} /></button>
        <NavButton active={activeTab === 'devedores'} onClick={() => {setActiveTab('devedores'); setCarteiraDetalhe(null);}} icon={<Users size={22} />} label="Cobranças" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => {setActiveTab('cartoes'); setClienteAtivo(null); setCarteiraDetalhe(null);}} icon={<CreditCard size={22} />} label="Cartões" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} editItem={editItem} onClose={() => {setIsModalOpen(false); setEditItem(null);}} onSave={handleGravarDados} meusBancos={meusBancos} />}
    </main>
  );
}

// ==========================================
// VIEW: RESUMO E SALÁRIOS
// ==========================================
function ResumoView({ dadosCaixa, salarios, mesAtual, anoAtual, onEdit, onDelete }) {
  const salariosDoMes = salarios.filter(s => {
    const d = parseDataBR(s.dados[5]);
    return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 p-6 opacity-5 text-emerald-500"><PieChart size={150}/></div>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className={`text-4xl font-black tracking-tighter ${dadosCaixa.livre >= 0 ? 'text-white' : 'text-red-400'}`}>
          R$ {dadosCaixa.livre.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
          <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-slate-500">Entradas Totais</span><span className="text-blue-400">+ R$ {dadosCaixa.renda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
          <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-slate-500">Saídas Totais</span><span className="text-red-400">- R$ {dadosCaixa.saida.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
        </div>
      </div>

      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">Entradas do Mês</h3>
      {salariosDoMes.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros de renda.</p> : salariosDoMes.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Banknote size={18}/></div>
            <div>
              <p className="font-black text-sm text-slate-100">Salário / Renda</p>
              <p className="text-[9px] font-black text-slate-500 uppercase">{formatDateToBR(parseDataBR(item.dados[5]))}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-black text-sm text-blue-400">+ R$ {parseFloat(item.dados[9]||0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
            <div className="flex gap-2">
              <button onClick={() => onEdit(item)} className="text-slate-500 hover:text-blue-400 transition-colors"><Edit size={16}/></button>
              <button onClick={() => onDelete(item.linha)} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// VIEW: CARTEIRA (RESUMO E MERGULHO)
// ==========================================
function CarteiraView({ ativosVar, ativosFixos, onAbrirDetalhe }) {
  const acoes = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('AÇÃO'));
  const fiis = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('FII'));
  const cripto = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('CRIPTO'));

  const cCusto = (l) => l.reduce((acc, i) => acc + (parseFloat(i.dados[4]) || 0), 0);
  const totalFixa = ativosFixos.reduce((acc, i) => acc + (parseFloat(i.dados[5]) || 0), 0);
  const totalGeral = cCusto(acoes) + cCusto(fiis) + cCusto(cripto) + totalFixa;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-emerald-900/20 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Investido (Custo)</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={<TrendingUp size={16}/>} title="Ação" value={cCusto(acoes)} color="text-indigo-400" onClick={() => onAbrirDetalhe('Ação')} />
        <InfoCard icon={<Building2 size={16}/>} title="FII" value={cCusto(fiis)} color="text-violet-400" onClick={() => onAbrirDetalhe('FII')} />
        <InfoCard icon={<Coins size={16}/>} title="Cripto" value={cCusto(cripto)} color="text-amber-400" onClick={() => onAbrirDetalhe('Cripto')} />
        <InfoCard icon={<Wallet size={16}/>} title="Renda Fixa" value={totalFixa} color="text-emerald-400" onClick={() => onAbrirDetalhe('Renda Fixa')} />
      </div>
    </div>
  );
}

function CarteiraDetalheView({ tipo, ativosVar, ativosFixos, onVoltar, onEdit, onDelete }) {
  const isFixa = tipo === 'Renda Fixa';
  const lista = isFixa ? ativosFixos : ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes(tipo.toUpperCase()));

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase mb-4 tracking-widest"><ArrowLeft size={16}/> Voltar</button>
      <h3 className="text-lg font-black text-white uppercase tracking-widest ml-1 mb-4">Meus Ativos: {tipo}</h3>
      {lista.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhum ativo desta categoria.</p> : lista.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div>
            <p className="font-black text-sm text-slate-100 uppercase">{isFixa ? item.dados[6] : item.dados[0]}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase">
              {isFixa ? `Taxa: ${item.dados[8]}%` : `Qtd: ${item.dados[2]} • PM: R$ ${parseFloat(item.dados[3]||0).toFixed(2)}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-black text-sm text-emerald-400">R$ {parseFloat(isFixa ? item.dados[5] : item.dados[4]||0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              {!isFixa && <p className={`text-[9px] font-black uppercase ${parseFloat(item.dados[7]||0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Lucro: R$ {parseFloat(item.dados[7]||0).toFixed(2)}</p>}
            </div>
            <div className="flex flex-col gap-2 border-l border-slate-800 pl-3">
              <button onClick={() => onEdit(item)} className="text-slate-500 hover:text-emerald-400 transition-colors"><Edit size={16}/></button>
              <button onClick={() => onDelete(item.linha, isFixa ? 'DB_Investimentos_Fixos' : 'DB_Historico_Ordens')} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ icon, title, value, color, onClick }) {
  return (
    <div onClick={onClick} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] cursor-pointer hover:border-slate-600 transition-all active:scale-95">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-lg font-black text-slate-200 tracking-tight">R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
    </div>
  );
}

// ==========================================
// VIEW: COBRANÇAS
// ==========================================
function DevedoresView({ items, onAbrirCliente }) {
  const clientesObj = {};
  items.forEach(item => {
    const nome = safeString(item.dados[6]) || 'Sem Nome';
    if (!clientesObj[nome]) clientesObj[nome] = { nome, totalEmprestado: 0, totalPago: 0, dividasAtivas: 0 };
    clientesObj[nome].totalEmprestado += (parseFloat(item.dados[7]) || 0);
    clientesObj[nome].totalPago += (parseFloat(item.dados[3]) || 0);
    if (safeString(item.dados[9]) !== 'Concluído') clientesObj[nome].dividasAtivas += 1;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-4">Resumo por Cliente</h3>
      {Object.values(clientesObj).sort((a,b) => b.dividasAtivas - a.dividasAtivas).map((cli, idx) => (
        <div key={idx} onClick={() => onAbrirCliente(cli.nome)} className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl flex justify-between items-center cursor-pointer transition-all active:scale-95">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><Users size={18}/></div>
            <div>
              <p className="font-black text-sm text-slate-100">{cli.nome}</p>
              <p className="text-[9px] font-black text-slate-500 uppercase">{cli.dividasAtivas} operações ativas</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-black text-sm ${cli.totalEmprestado - cli.totalPago > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>R$ {Math.max(0, cli.totalEmprestado - cli.totalPago).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClienteDossieView({ nome, items, onVoltar, onStatusChange, onEdit, onDelete }) {
  const dividas = items.filter(i => safeString(i.dados[6]) === nome);
  
  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase mb-4 tracking-widest"><ArrowLeft size={16}/> Voltar</button>
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Dossiê do Cliente</p>
        <p className="text-3xl font-black text-white tracking-tighter">{nome}</p>
      </div>

      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mt-6">Extrato de Operações</h3>
      {dividas.map((item, idx) => {
        const vOriginal = parseFloat(item.dados[7]) || 0;
        const juros = parseFloat(item.dados[10]) || 0;
        const dataAcordo = parseDataBR(item.dados[5]);
        const isConcluido = safeString(item.dados[9]) === 'Concluído';
        const hoje = new Date();
        let meses = dataAcordo ? (hoje.getFullYear() - dataAcordo.getFullYear()) * 12 + (hoje.getMonth() - dataAcordo.getMonth()) : 1;
        if (dataAcordo && hoje.getDate() < dataAcordo.getDate()) meses--;
        const jurosTotais = vOriginal * (juros/100) * Math.max(1, meses);

        return (
          <div key={idx} className={`p-5 rounded-[2rem] border ${isConcluido ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-900 border-amber-900/30'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isConcluido ? 'bg-slate-800 text-slate-400' : 'bg-amber-900/50 text-amber-400'}`}>{isConcluido ? 'Paga' : 'Aberta'}</span>
                <p className="text-[10px] font-bold text-slate-500 mt-2">Vence em: {formatDateToBR(parseDataBR(item.dados[8]))}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(item)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-400"><Edit size={16}/></button>
                <button onClick={() => onDelete(item.linha)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-red-400"><Trash2 size={16}/></button>
                <button onClick={() => onStatusChange(item, isConcluido ? 'Pendente' : 'Concluído')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-400"><CheckCircle size={16}/></button>
              </div>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800 pt-3">
              <span className="text-xs text-slate-400 font-bold">Principal + Juros</span>
              <span className="text-lg font-black text-slate-200">R$ {(vOriginal + jurosTotais).toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// VIEW: CARTÕES
// ==========================================
function CartoesView({ items, config, onPagar, onEdit, onDelete }) {
  const hoje = new Date();
  
  const calcularStatusFatura = (dataCompraStr, banco, statusPagamento) => {
    if (safeString(statusPagamento).trim().toUpperCase() === 'PAGA') return { label: 'Paga', color: 'text-slate-500', bg: 'bg-slate-800' };
    const configBanco = config[banco];
    if (!configBanco) return { label: 'Avulso', color: 'text-blue-400', bg: 'bg-blue-900/20' }; 

    const dataCompra = parseDataBR(dataCompraStr);
    if(!dataCompra) return { label: 'Avulso', color: 'text-blue-400', bg: 'bg-blue-900/20' };

    let mesVencimento = dataCompra.getMonth();
    let anoVencimento = dataCompra.getFullYear();
    if (dataCompra.getDate() >= configBanco.fechamento) {
      mesVencimento++; if (mesVencimento > 11) { mesVencimento = 0; anoVencimento++; }
    }
    const dataVencimentoReal = new Date(anoVencimento, mesVencimento, configBanco.vencimento);
    const dataFechamentoReal = new Date(anoVencimento, mesVencimento - (dataCompra.getDate() >= configBanco.fechamento ? 0 : 1), configBanco.fechamento);

    if (hoje > dataVencimentoReal) return { label: 'Vencida', color: 'text-red-400', bg: 'bg-red-900/30' };
    if (hoje > dataFechamentoReal && hoje <= dataVencimentoReal) return { label: 'Fechada', color: 'text-amber-400', bg: 'bg-amber-900/30' };
    return { label: 'Atual', color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-4">Gestão de Lançamentos</h3>
      {items.map((item, idx) => {
        const status = calcularStatusFatura(item.dados[5], item.dados[10], item.dados[11]); 
        const isFixo = safeString(item.dados[6]).toUpperCase() === 'FIXO';

        return (
          <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${status.bg} ${status.color}`}><CreditCard size={18}/></div>
              <div>
                <p className="font-black text-sm text-slate-100 flex items-center gap-2">{item.dados[8]} {isFixo && <span className="text-[8px] bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded-md">FIXO</span>}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{item.dados[10]} • {item.dados[9]} • <span className={status.color}>{status.label}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right flex flex-col items-end gap-2">
                <p className={`font-black text-sm ${status.label === 'Paga' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>R$ {parseFloat(item.dados[7] || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                {status.label !== 'Paga' && <button onClick={() => onPagar(item)} className="text-[9px] font-black uppercase tracking-widest bg-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded-lg active:scale-90 transition-all">Pagar</button>}
              </div>
              <div className="flex flex-col gap-2 border-l border-slate-800 pl-3">
                <button onClick={() => onEdit(item)} className="text-slate-500 hover:text-blue-400"><Edit size={14}/></button>
                <button onClick={() => onDelete(item.linha)} className="text-slate-500 hover:text-red-400"><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// MODAL DE LANÇAMENTO E EDIÇÃO
// ==========================================
function LancamentoModal({ tipo, setTipo, onClose, onSave, meusBancos, editItem }) {
  const [formData, setFormData] = useState({ 
    data: new Date().toISOString().split('T')[0], dataVenc: new Date().toISOString().split('T')[0], banco: meusBancos[0] || 'Dinheiro', 
    ativoTipo: 'Ação', nome: '', valor: '', juros: '', he50: '', he100: '', descontos: '', isFixo: false, categoria: ''
  });
  
  // Efeito para popular dados no MODO EDIÇÃO
  useEffect(() => {
    if (editItem) {
      const toInputDate = (str) => {
        const d = parseDataBR(str);
        return d ? d.toISOString().split('T')[0] : '';
      };
      
      const d = editItem.dados;
      if (tipo === 'devedor') {
        setFormData(p => ({...p, data: toInputDate(d[5]), nome: d[6], valor: d[7], dataVenc: toInputDate(d[8]), juros: d[10]}));
      } else if (tipo === 'cartao') {
        setFormData(p => ({...p, data: toInputDate(d[5]), isFixo: safeString(d[6]).toUpperCase()==='FIXO', valor: d[7], nome: d[8], categoria: d[9], banco: d[10]}));
      } else if (tipo === 'salario') {
        setFormData(p => ({...p, data: toInputDate(d[5]), valor: d[6], he50: d[7], he100: d[8], descontos: d[9]}));
      } else if (tipo === 'ativo') {
        // Histórico de ordens ou Fixos. Simplificado assumindo que a tabela Fixos usa dados diferentes
        if(d.length > 0) setFormData(p => ({...p, data: toInputDate(d[5]), nome: d[6] || d[0], valor: d[7] || d[2], juros: d[8] || d[3], ativoTipo: d[9] || 'Renda Fixa'}));
      }
    }
  }, [editItem, tipo]);

  const inputClass = "w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 outline-none transition-all text-sm font-bold";
  const selectClass = `${inputClass} appearance-none pr-10`;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl animate-in slide-in-from-bottom-10 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-xl text-emerald-500 tracking-tight">
            {editItem ? `Editar ${tipo}` : tipo === 'escolha' ? 'Novo Registro' : 'Lançamento'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {tipo === 'escolha' ? (
          <div className="grid grid-cols-2 gap-3">
            <ChoiceBtn onClick={() => setTipo('salario')} icon={<Banknote className="text-blue-400"/>} label="Salário" />
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Gastos" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<Wallet className="text-emerald-400"/>} label="Ativos" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const dataBR = formData.data.split('-').reverse().join('/');
            const vencBR = formData.dataVenc.split('-').reverse().join('/');
            let payload = []; let abaDestino = "";

            if (tipo === 'devedor') {
              abaDestino = 'bdDevedores';
              payload = [dataBR, formData.nome, parseFloat(formData.valor)||0, vencBR, editItem ? editItem.dados[9] : "Pendente", parseFloat(formData.juros)||0, editItem ? editItem.dados[11] : "App"];
            } else if (tipo === 'cartao') {
              abaDestino = 'bdLancamentos';
              payload = [dataBR, formData.isFixo ? "Fixo" : "Avulso", parseFloat(formData.valor)||0, formData.nome, formData.categoria || "Geral", formData.banco, editItem ? editItem.dados[11] : "Pendente"];
            } else if (tipo === 'ativo') {
              if (formData.ativoTipo === 'Renda Fixa') {
                abaDestino = 'DB_Investimentos_Fixos';
                payload = [dataBR, formData.nome, parseFloat(formData.valor)||0, parseFloat(formData.juros)||0, "", "", ""];
              } else {
                abaDestino = 'DB_Historico_Ordens';
                payload = [dataBR, formData.nome.toUpperCase(), "COMPRA", parseFloat(formData.valor)||0, parseFloat(formData.juros)||0, formData.ativoTipo, ""];
              }
            } else if (tipo === 'salario') {
              abaDestino = 'bdRendas'; 
              const b = parseFloat(formData.valor)||0; const h5 = parseFloat(formData.he50)||0; const h1 = parseFloat(formData.he100)||0; const d = parseFloat(formData.descontos)||0;
              payload = [dataBR, b, h5, h1, d, b+h5+h1-d, editItem ? editItem.dados[11] : "App"];
            }
            onSave(payload, abaDestino, editItem?.linha);
          }}>

            {tipo === 'salario' ? (
               <>
               <input type="number" step="any" placeholder="Salário Bruto R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
               <div className="grid grid-cols-2 gap-4">
                 <input type="number" step="any" placeholder="Extra 50% R$" value={formData.he50} className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} />
                 <input type="number" step="any" placeholder="Extra 100% R$" value={formData.he100} className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} />
               </div>
               <input type="number" step="any" placeholder="Descontos R$" value={formData.descontos} className={`${inputClass} border-red-500/50 text-red-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} />
             </>
            ) : tipo === 'cartao' ? (
              <>
                <input type="text" placeholder="Descrição da Despesa" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder="Valor R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="text" placeholder="Categoria" value={formData.categoria} className={inputClass} onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                </div>
                <div className="relative">
                  <select className={selectClass} value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})}>
                    {meusBancos.map((banco, i) => <option key={i} value={banco}>{banco}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                </div>
                <label className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer">
                  <input type="checkbox" checked={formData.isFixo} className="w-5 h-5 accent-emerald-500 rounded-lg bg-slate-800 border-slate-700" onChange={e => setFormData({...formData, isFixo: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-300">É uma despesa Fixa?</span>
                </label>
              </>
            ) : tipo === 'devedor' ? (
               <>
                 <input type="text" placeholder="Nome do Cliente" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                 <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="any" placeholder="Emprestado R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                   <input type="number" step="any" placeholder="Juros %/mês" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                 </div>
                 <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data Combinada p/ Pagamento</span>
                    <input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                 </div>
               </>
            ) : (
               <>
                <div className="relative">
                  <select className={selectClass} value={formData.ativoTipo} onChange={e => setFormData({...formData, ativoTipo: e.target.value})}>
                    <option value="Ação">Ação (B3)</option><option value="FII">Fundo Imobiliário</option><option value="Cripto">Criptomoeda</option><option value="Renda Fixa">Renda Fixa</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
                </div>
                 <input type="text" placeholder="Ticker ou Nome" value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                 <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="any" placeholder="Quantidade/Aporte" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                   <input type="number" step="any" placeholder="Preço/Taxa" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                 </div>
               </>
            )}

            {tipo !== 'devedor' && (
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Data da Transação</span>
                <input type="date" value={formData.data} className={`${inputClass} !bg-transparent !border-none !p-1 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} />
              </div>
            )}
            
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black shadow-lg shadow-emerald-900/30 active:scale-95 transition-all mt-6 uppercase tracking-widest text-xs">
              {editItem ? "Atualizar" : "Confirmar Lançamento"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800/40 border border-slate-700/40 py-5 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-slate-800 transition-all active:scale-90">
      {icon} <span className="font-black text-[9px] uppercase text-slate-400 tracking-widest">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) { 
  return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-600 opacity-60'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); 
}
