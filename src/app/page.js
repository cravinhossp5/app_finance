"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart,
  ArrowLeft, Edit, Trash2, RotateCcw, FastForward
} from 'lucide-react';

// ==========================================
// UTILITÁRIOS ROBUSTOS (BLINDAGEM CONTRA ERROS)
// ==========================================
const safeString = (val) => String(val || '').trim();

// NOVO TRADUTOR FINANCEIRO: Remove "R$", espaços e converte vírgula para ponto.
const parseCurrency = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).replace(/[R$\s]/g, '').trim();
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  return parseFloat(s) || 0;
};

function parseDataBR(dataStr) {
  const str = safeString(dataStr);
  if (!str) return null;
  if (str.includes('-')) {
     const parts = str.split('T')[0].split('-');
     return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return null;
}

function formatDateToBR(dateObj) {
  if (!dateObj) return '--/--/----';
  return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
}

export default function Dashboard() {
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [editItem, setEditItem] = useState(null); 
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
  
  const [clienteAtivo, setClienteAtivo] = useState(null);
  const [carteiraDetalhe, setCarteiraDetalhe] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchDados = async (silent = false) => {
    if (!silent) setSyncStatus('syncing');
    try {
      const fetchData = async (aba) => {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'listar', aba, token: "Mu#22042002" })
        });
        return await res.json();
      };

      const [varData, fixData, cartData, devData, bancosData, salarioData, ordensData] = await Promise.all([
        fetchData('DB_Investimentos_Variaveis'), fetchData('DB_Investimentos_Fixos'), fetchData('bdLancamentos'),
        fetchData('bdDevedores'), fetchData('meus_bancos'), fetchData('bdRendas'), fetchData('DB_Historico_Ordens')
      ]);

      if (varData?.success) setAtivosVariaveis(varData.data || []);
      if (fixData?.success) setAtivosFixos(fixData.data || []);
      if (cartData?.success) setGastosCartao(cartData.data || []);
      if (devData?.success) setDevedores(devData.data || []);
      if (salarioData?.success) setSalarios(salarioData.data || []);
      if (ordensData?.success) setHistoricoOrdens(ordensData.data || []);
      if (bancosData?.success && bancosData.data) {
        const bl = bancosData.data.map(b => b.dados[0]).filter(b => b && safeString(b).toLowerCase() !== "banco");
        setMeusBancos(bl.length > 0 ? bl : ['Dinheiro']);
      }
      setSyncStatus('synced');
    } catch (error) { setSyncStatus('error'); }
    finally { setIsGlobalLoading(false); }
  };

  useEffect(() => { fetchDados(); }, []);

  const handleGravarDados = async (payload, aba, linha = null) => {
    setIsModalOpen(false); setEditItem(null); setSyncStatus('syncing');
    try {
      const body = { action: linha ? 'atualizar' : 'adicionar', aba, linha, payload, token: "Mu#22042002" };
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if ((await res.json()).success) { showToast("Sucesso!"); fetchDados(true); } else throw new Error();
    } catch (error) { setSyncStatus('error'); showToast("Erro ao gravar.", "error"); }
  };

  const handleExcluir = async (linha, aba) => {
    if(!window.confirm('Excluir permanentemente?')) return;
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'excluir', aba, linha, token: "Mu#22042002" }) });
      if ((await res.json()).success) { showToast("Apagado!"); fetchDados(true); } else throw new Error();
    } catch (e) { setSyncStatus('error'); showToast("Erro ao excluir.", "error"); }
  };

  const abrirEdicao = (item, tipoStr) => { setEditItem(item); setModalType(tipoStr); setIsModalOpen(true); };

  // --- MATEMÁTICA DE CAIXA LIVRE ---
  const calcCaixaLivre = () => {
    let renda = 0; let saida = 0; let lucroCobrança = 0;
    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]); if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) renda += parseCurrency(s.dados[11]);
    });
    gastosCartao.forEach(g => {
      const d = parseDataBR(g.dados[5]); if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) saida += parseCurrency(g.dados[7]);
    });
    historicoOrdens.forEach(o => {
      const d = parseDataBR(o.dados[5]); const valor = parseCurrency(o.dados[8]) * parseCurrency(o.dados[9]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        if (safeString(o.dados[7]).toUpperCase().includes('COMPRA')) saida += valor;
        if (safeString(o.dados[7]).toUpperCase().includes('VENDA')) renda += valor;
      }
    });
    devedores.forEach(dev => {
      const dAcordo = parseDataBR(dev.dados[5]); const vOriginal = parseCurrency(dev.dados[7]); const juros = parseCurrency(dev.dados[10]); const status = safeString(dev.dados[9]);
      const hoje = new Date(); let m = dAcordo ? Math.max(1, (hoje.getFullYear() - dAcordo.getFullYear()) * 12 + (hoje.getMonth() - dAcordo.getMonth())) : 1;
      const montanteFinal = vOriginal + (vOriginal * (juros/100) * m);
      if (dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual) saida += vOriginal;
      if (status === 'Concluído' && dAcordo && dAcordo.getMonth() === mesAtual) { renda += montanteFinal; lucroCobrança += (montanteFinal - vOriginal); }
    });
    return { renda, saida, livre: renda - saida, lucroCobrança };
  };

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-500 flex flex-col items-center justify-center font-black">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="tracking-widest uppercase animate-pulse">Conectando Torre de Controle...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-28 font-sans relative">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border w-[90%] max-w-sm ${notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-red-950/90 border-red-500/50 text-red-400'}`}>
          {notification.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <h1 className="text-xl font-black text-emerald-500 italic tracking-tighter">APPFINANCE</h1>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => { setMesAtual(p => p === 0 ? 11 : p - 1); if(mesAtual===0) setAnoAtual(a=>a-1); }}><ChevronLeft size={16}/></button>
            <span className="min-w-[100px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={() => { setMesAtual(p => p === 11 ? 0 : p + 1); if(mesAtual===11) setAnoAtual(a=>a+1); }}><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'dashboard' && <ResumoView dadosCaixa={calcCaixaLivre()} salarios={salarios} mes={mesAtual} ano={anoAtual} onEdit={i => abrirEdicao(i, 'salario')} onDelete={l => handleExcluir(l, 'bdRendas')} />}
        {activeTab === 'patrimonio' && !carteiraDetalhe && <CarteiraView ativosVar={ativosVariaveis} ativosFixos={ativosFixos} onAbrirDetalhe={setCarteiraDetalhe} />}
        {activeTab === 'patrimonio' && carteiraDetalhe && <CarteiraDetalheView tipo={carteiraDetalhe} ativosVar={ativosVariaveis} ativosFixos={ativosFixos} onVoltar={() => setCarteiraDetalhe(null)} onEdit={i => abrirEdicao(i, 'ativo')} onDelete={(l, a) => handleExcluir(l, a)} />}
        {activeTab === 'devedores' && !clienteAtivo && <DevedoresView items={devedores} onAbrirCliente={setClienteAtivo} />}
        {activeTab === 'devedores' && clienteAtivo && <ClienteDossieView nome={clienteAtivo} items={devedores} onVoltar={() => setClienteAtivo(null)} onSave={handleGravarDados} onEdit={i => abrirEdicao(i, 'devedor')} onDelete={l => handleExcluir(l, 'bdDevedores')} />}
        {activeTab === 'cartoes' && <CartoesView items={gastosCartao} onEdit={i => abrirEdicao(i, 'cartao')} onDelete={l => handleExcluir(l, 'bdLancamentos')} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/50 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setCarteiraDetalhe(null); setClienteAtivo(null);}} icon={<PieChart size={24} />} label="Resumo" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => {setActiveTab('patrimonio'); setCarteiraDetalhe(null);}} icon={<Briefcase size={24} />} label="Carteira" />
        <button onClick={() => { setEditItem(null); setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-5 rounded-[2rem] shadow-lg -translate-y-6 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={32} /></button>
        <NavButton active={activeTab === 'devedores'} onClick={() => {setActiveTab('devedores'); setClienteAtivo(null);}} icon={<Users size={24} />} label="Cobranças" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => {setActiveTab('cartoes');}} icon={<CreditCard size={24} />} label="Cartões" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} editItem={editItem} onClose={() => {setIsModalOpen(false); setEditItem(null);}} onSave={handleGravarDados} meusBancos={meusBancos} />}
    </main>
  );
}

// ==========================================
// VIEWS DE INTERFACE (COMPONENTES)
// ==========================================

function ResumoView({ dadosCaixa, salarios, mes, ano, onEdit, onDelete }) {
  const filtrados = salarios.filter(s => { const d = parseDataBR(s.dados[5]); return d && d.getMonth() === mes && d.getFullYear() === ano; });
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className={`text-4xl font-black ${dadosCaixa.livre >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {dadosCaixa.livre.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <div className="mt-6 flex gap-6 text-[10px] font-bold uppercase text-slate-500">
          <div><span className="block text-blue-400 text-xs">R$ {dadosCaixa.renda.toLocaleString('pt-BR')}</span>Entradas</div>
          <div><span className="block text-red-400 text-xs">R$ {dadosCaixa.saida.toLocaleString('pt-BR')}</span>Saídas</div>
        </div>
      </div>
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1">Renda Detalhada</h3>
      {filtrados.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros neste mês.</p> : filtrados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Banknote size={18}/></div><div><p className="text-sm font-black">Salário Base</p><p className="text-[9px] text-slate-500 uppercase">{formatDateToBR(parseDataBR(item.dados[5]))}</p></div></div>
          <div className="flex items-center gap-4"><p className="text-sm font-black text-blue-400">R$ {parseCurrency(item.dados[11]).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p><button onClick={() => onEdit(item)} className="p-3 bg-slate-800 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button></div>
        </div>
      ))}
    </div>
  );
}

function CarteiraView({ ativosVar, ativosFixos, onAbrirDetalhe }) {
  const cValorMercado = (lista) => lista.reduce((acc, i) => acc + parseCurrency(i.dados[6]), 0);
  const totalFixa = ativosFixos.reduce((acc, i) => acc + parseCurrency(i.dados[5]), 0);
  
  // FILTRO CORRIGIDO: Usa exatamente a coluna Tipo (Índice 1) da Planilha.
  const acoes = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('AÇÃO'));
  const fiis = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('FII'));
  const cripto = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('CRIPTO'));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-[2.5rem]"><p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Total em Carteira</p><p className="text-4xl font-black text-white">R$ {(cValorMercado(ativosVar) + totalFixa).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard title="Ações" val={cValorMercado(acoes)} color="text-indigo-400" onClick={() => onAbrirDetalhe('Ação')} />
        <InfoCard title="FIIs" val={cValorMercado(fiis)} color="text-violet-400" onClick={() => onAbrirDetalhe('FII')} />
        <InfoCard title="Criptos" val={cValorMercado(cripto)} color="text-amber-400" onClick={() => onAbrirDetalhe('Cripto')} />
        <InfoCard title="Renda Fixa" val={totalFixa} color="text-emerald-400" onClick={() => onAbrirDetalhe('Renda Fixa')} />
      </div>
    </div>
  );
}

function CarteiraDetalheView({ tipo, ativosVar, ativosFixos, onVoltar, onEdit, onDelete }) {
  const isF = tipo === 'Renda Fixa';
  const lista = isF ? ativosFixos : ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes(tipo.toUpperCase()));
  
  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <h3 className="text-lg font-black text-white uppercase tracking-widest">{tipo} Detalhado</h3>
      {lista.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhum ativo listado.</p> : lista.map((i, idx) => {
          const custoTotal = parseCurrency(i.dados[4]); // Col E
          const precoMedio = parseCurrency(i.dados[3]); // Col D
          const valorMercado = parseCurrency(i.dados[6]); // Col G
          const lucroAbs = parseCurrency(i.dados[7]); // Col H
          const provento = parseCurrency(i.dados[11]); // Col L 
          const dataProv = safeString(i.dados[12]); // Col M 

          return (
            <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
              <div className="flex justify-between items-start mb-4">
                <div><p className="font-black text-lg uppercase text-slate-100">{isF ? i.dados[6] : i.dados[0]}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{isF ? `Taxa: ${i.dados[8]}%` : `Qtd: ${i.dados[2]} • PM: R$ ${precoMedio.toLocaleString('pt-BR', {minimumFractionDigits:2})}`}</p></div>
                {isF && (
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(i)} className="bg-slate-800 p-3 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button>
                    <button onClick={() => onDelete(i.linha, 'DB_Investimentos_Fixos')} className="bg-slate-800 p-3 rounded-xl text-red-400 active:scale-90"><Trash2 size={20}/></button>
                  </div>
                )}
              </div>
              {!isF && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
                  <div><p className="text-[8px] font-black text-slate-500 uppercase">Investido (Custo)</p><p className="text-sm font-black text-slate-300">R$ {custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Valor Atual</p><p className="text-sm font-black text-emerald-400">R$ {valorMercado.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  <div><p className="text-[8px] font-black text-slate-500 uppercase">Lucro Absoluto</p><p className={`text-sm font-black ${lucroAbs >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {lucroAbs.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Proventos / Data</p><p className="text-sm font-black text-violet-400">R$ {provento.toLocaleString('pt-BR', {minimumFractionDigits:2})} • {dataProv || '--/--'}</p></div>
                </div>
              )}
            </div>
          )
      })}
    </div>
  );
}

function DevedoresView({ items, onAbrirCliente }) {
  const c = {}; let tE = 0; let tR = 0; let luc = 0;
  items.forEach(i => {
    const n = safeString(i.dados[6]) || 'Sem Nome'; if(!c[n]) c[n] = { n, e: 0, p: 0, a: 0 };
    const emp = parseCurrency(i.dados[7]); const status = safeString(i.dados[9]); const j = parseCurrency(i.dados[10]); const dO = parseDataBR(i.dados[5]);
    const m = dO ? Math.max(1, (new Date().getFullYear() - dO.getFullYear()) * 12 + (new Date().getMonth() - dO.getMonth())) : 1;
    const montante = emp + (emp * (j/100) * m);
    c[n].e += emp; 
    if(status === 'Concluído') { c[n].p += montante; tR += montante; luc += (montante - emp); } else { c[n].a += 1; }
    tE += emp;
  });
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Dinheiro na Rua (Principal)</p>
        <p className="text-4xl font-black">R$ {tE.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-500/20">
          <div><p className="text-[9px] text-slate-500 uppercase font-black">Recebido c/ Juros</p><p className="text-lg font-black text-emerald-400">R$ {tR.toLocaleString('pt-BR')}</p></div>
          <div><p className="text-[9px] text-slate-500 uppercase font-black">Lucro Realizado</p><p className={`text-lg font-black ${luc >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {luc.toLocaleString('pt-BR')}</p></div>
        </div>
      </div>
      {Object.values(c).map((cli, idx) => (
        <div key={idx} onClick={() => onAbrirCliente(cli.n)} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center cursor-pointer active:scale-95 transition-all">
          <div className="flex gap-4 items-center"><div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-900/20"><Users size={20}/></div><div><p className="text-sm font-black">{cli.n}</p><p className="text-[9px] text-slate-500 uppercase">{cli.a} abertas</p></div></div>
          <p className="text-sm font-black text-amber-400">R$ {cli.e.toLocaleString('pt-BR')}</p>
        </div>
      ))}
    </div>
  );
}

function ClienteDossieView({ nome, items, onVoltar, onSave, onEdit, onDelete }) {
  const filtrados = items.filter(i => safeString(i.dados[6]) === nome);

  // NOVO BOTÃO: Rolar Juros (Capitaliza e reseta a data para hoje)
  const handleRolar = (item, principalAtual) => {
    if(!window.confirm('Deseja ROLAR a dívida? O Saldo Atual se tornará o Novo Principal e a Data do Acordo será atualizada para hoje.')) return;
    const novoAcordo = formatDateToBR(new Date());
    const payload = [ novoAcordo, item.dados[6], principalAtual, item.dados[8], "Pendente", item.dados[10], "Juros Rolados" ];
    onSave(payload, 'bdDevedores', item.linha);
  };

  const handleStatus = (item, novoStatus) => {
    onSave([item.dados[5], item.dados[6], item.dados[7], item.dados[8], novoStatus, item.dados[10], item.dados[11]], 'bdDevedores', item.linha);
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem]"><p className="text-[10px] font-black text-amber-500 uppercase mb-1">Histórico: {nome}</p><p className="text-3xl font-black">{nome}</p></div>
      {filtrados.map((i, idx) => {
        const vO = parseCurrency(i.dados[7]); const j = parseCurrency(i.dados[10]); const dO = parseDataBR(i.dados[5]);
        const hoje = new Date(); let m = dO ? Math.max(1, (hoje.getFullYear() - dO.getFullYear()) * 12 + (hoje.getMonth() - dO.getMonth())) : 1;
        const total = vO + (vO*(j/100)*m);
        const isConcluido = safeString(i.dados[9]) === 'Concluído';
        return (
          <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
            <div className="flex justify-between items-start mb-4">
              <div><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${isConcluido ? 'bg-slate-800 text-slate-500' : 'bg-amber-900/50 text-amber-400'}`}>{i.dados[9]}</span><p className="text-[10px] font-bold text-slate-400 mt-2">Acordo: {formatDateToBR(dO)}</p></div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(i)} className="bg-slate-800 p-3 rounded-xl text-blue-400 active:scale-90 transition-all"><Edit size={20}/></button>
                <button onClick={() => onDelete(i.linha)} className="bg-slate-800 p-3 rounded-xl text-red-400 active:scale-90 transition-all"><Trash2 size={20}/></button>
                <button onClick={() => handleStatus(i, isConcluido ? 'Pendente' : 'Concluído')} className={`p-3 rounded-xl active:scale-90 transition-all ${isConcluido ? 'bg-amber-900/20 text-amber-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
                  {isConcluido ? <RotateCcw size={20}/> : <CheckCircle size={20}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-slate-800 pt-3"><div className="text-[10px] text-slate-400 font-bold uppercase">Principal: R$ {vO}<br/>Juros: {j}% a.m</div><p className={`text-lg font-black ${isConcluido ? 'text-slate-500' : 'text-amber-400'}`}>R$ {total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
            {!isConcluido && (
              <button onClick={() => handleRolar(i, total)} className="w-full mt-4 bg-amber-900/20 text-amber-500 border border-amber-500/20 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all"><FastForward size={16}/> Capitalizar Juros (Rolar)</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CartoesView({ items, onEdit, onDelete }) {
  const categorias = {};
  let total = 0;
  items.forEach(i => {
     const val = parseCurrency(i.dados[7]);
     const cat = safeString(i.dados[9]) || 'Outros';
     categorias[cat] = (categorias[cat] || 0) + val;
     total += val;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Lançamentos</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <div className="mt-6 border-t border-indigo-500/20 pt-4 grid grid-cols-2 gap-y-3">
           {Object.entries(categorias).map(([c, v], idx) => (
              <div key={idx}><p className="text-[9px] font-black text-slate-500 uppercase">{c}</p><p className="text-sm font-black text-indigo-400">R$ {v.toLocaleString('pt-BR')}</p></div>
           ))}
        </div>
      </div>
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1">Relatório Completo</h3>
      {items.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros.</p> : items.map((i, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400"><CreditCard size={18}/></div><div><p className="text-sm font-black">{i.dados[8]}</p><p className="text-[9px] text-slate-500 uppercase">{i.dados[10]} • {i.dados[9]}</p></div></div>
          <div className="flex items-center gap-4">
            <p className="text-sm font-black">R$ {parseCurrency(i.dados[7]).toLocaleString('pt-BR')}</p>
            <div className="flex gap-2 ml-2">
              <button onClick={() => onEdit(i)} className="p-3 bg-slate-800 rounded-xl text-blue-400 active:scale-90 transition-all"><Edit size={20}/></button>
              <button onClick={() => onDelete(i.linha)} className="p-3 bg-slate-800 rounded-xl text-red-400 active:scale-90 transition-all"><Trash2 size={20}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LancamentoModal({ tipo, setTipo, onClose, onSave, meusBancos, editItem }) {
  const [formData, setFormData] = useState({ data: new Date().toISOString().split('T')[0], dataVenc: new Date().toISOString().split('T')[0], banco: meusBancos[0] || 'Dinheiro', ativoTipo: 'Ação', nome: '', valor: '', juros: '', he50: '', he100: '', dsr: '', adNoturno: '', outros: '', descontos: '', isFixo: false, categoria: '' });
  
  useEffect(() => {
    if (editItem) {
      const d = editItem.dados; const toInp = (s) => parseDataBR(s) ? parseDataBR(s).toISOString().split('T')[0] : '';
      if (tipo === 'devedor') setFormData(p => ({...p, data: toInp(d[5]), nome: d[6], valor: parseCurrency(d[7]), dataVenc: toInp(d[8]), juros: parseCurrency(d[10])}));
      else if (tipo === 'cartao') setFormData(p => ({...p, data: toInp(d[5]), isFixo: safeString(d[6]).toUpperCase()==='FIXO', valor: parseCurrency(d[7]), nome: d[8], categoria: d[9], banco: d[10]}));
      else if (tipo === 'salario') setFormData(p => ({...p, data: toInp(d[5]), valor: parseCurrency(d[6]), he50: parseCurrency(d[7]), he100: parseCurrency(d[8]), descontos: parseCurrency(d[10])})); 
      else if (tipo === 'ativo') setFormData(p => ({...p, data: toInp(d[5]), nome: d[6] || d[0], valor: parseCurrency(d[7] || d[2]), juros: parseCurrency(d[8] || d[3]), ativoTipo: d[9] || 'Ação'}));
    }
  }, [editItem, tipo]);

  const inputClass = "w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-white focus:border-emerald-500/50 outline-none text-sm font-bold";

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8"><h3 className="font-black text-xl text-emerald-500">{editItem ? `Editar ${tipo}` : 'Novo'}</h3><button onClick={onClose} className="p-3 bg-slate-800 rounded-full text-slate-500"><X size={24}/></button></div>
        {tipo === 'escolha' ? (
          <div className="grid grid-cols-2 gap-3"><ChoiceBtn onClick={() => setTipo('salario')} icon={<Banknote size={32} className="text-blue-400"/>} label="Salário" /><ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard size={32} className="text-indigo-400"/>} label="Gastos" /><ChoiceBtn onClick={() => setTipo('ativo')} icon={<Wallet size={32} className="text-emerald-400"/>} label="Ativos" /><ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users size={32} className="text-amber-400"/>} label="Devedor" /></div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault(); const dBR = formData.data.split('-').reverse().join('/'); const vBR = formData.dataVenc.split('-').reverse().join('/');
            let p = []; let aba = "";
            if (tipo === 'devedor') { aba = 'bdDevedores'; p = [dBR, formData.nome, parseCurrency(formData.valor), vBR, editItem?.dados[9]||"Pendente", parseCurrency(formData.juros), "App"]; }
            else if (tipo === 'cartao') { aba = 'bdLancamentos'; p = [dBR, formData.isFixo?"Fixo":"Avulso", parseCurrency(formData.valor), formData.nome, formData.categoria, formData.banco, editItem?.dados[11]||"Pendente"]; }
            else if (tipo === 'ativo') { 
              if (formData.ativoTipo === 'Renda Fixa') { aba = 'DB_Investimentos_Fixos'; p = [dBR, formData.nome, parseCurrency(formData.valor), parseCurrency(formData.juros), "", "", ""]; }
              else { aba = 'DB_Historico_Ordens'; p = [dBR, formData.nome.toUpperCase(), "COMPRA", parseCurrency(formData.valor), parseCurrency(formData.juros), formData.ativoTipo, ""]; }
            } else if (tipo === 'salario') {
              aba = 'bdRendas'; const b = parseCurrency(formData.valor); const h5 = parseCurrency(formData.he50); const h1 = parseCurrency(formData.he100); const dsr = parseCurrency(formData.dsr); const adN = parseCurrency(formData.adNoturno); const out = parseCurrency(formData.outros); const d = parseCurrency(formData.descontos);
              p = [dBR, b, h5, h1, dsr+adN+out, d, b+h5+h1+(dsr+adN+out)-d];
            }
            onSave(p, aba, editItem?.linha);
          }}>
            {tipo === 'salario' ? (
              <><input type="number" step="any" placeholder="Base R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><div className="grid grid-cols-2 gap-3"><input type="number" step="any" placeholder="HE 50%" value={formData.he50} className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} /><input type="number" step="any" placeholder="HE 100%" value={formData.he100} className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} /></div><div className="grid grid-cols-3 gap-2"><input type="number" step="any" placeholder="DSR" value={formData.dsr} className={inputClass} onChange={e => setFormData({...formData, dsr: e.target.value})} /><input type="number" step="any" placeholder="Noturno" value={formData.adNoturno} className={inputClass} onChange={e => setFormData({...formData, adNoturno: e.target.value})} /><input type="number" step="any" placeholder="Outros" value={formData.outros} className={inputClass} onChange={e => setFormData({...formData, outros: e.target.value})} /></div><input type="number" step="any" placeholder="Descontos" value={formData.descontos} className={`${inputClass} text-red-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} /></>
            ) : tipo === 'cartao' ? (
              <><input type="text" placeholder="Descrição" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Valor" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="text" placeholder="Categoria" value={formData.categoria} className={inputClass} onChange={e => setFormData({...formData, categoria: e.target.value})} required /></div><select className={`${inputClass} appearance-none`} value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})}>{meusBancos.map((b, i) => <option key={i} value={b}>{b}</option>)}</select></>
            ) : tipo === 'devedor' ? (
              <><input type="text" placeholder="Cliente" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Valor" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="number" step="any" placeholder="Juros %" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required /></div><input type="date" value={formData.dataVenc} className={inputClass} onChange={e => setFormData({...formData, dataVenc: e.target.value})} /></>
            ) : (
              <><select className={`${inputClass} mb-2`} value={formData.ativoTipo} onChange={e => setFormData({...formData, ativoTipo: e.target.value})}><option value="Ação">Ação</option><option value="FII">FII</option><option value="Cripto">Cripto</option><option value="Renda Fixa">Renda Fixa</option></select><input type="text" placeholder="Ticker" value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Qtd/Aporte" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="number" step="any" placeholder="Preço/Taxa" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required /></div></>
            )}
            <input type="date" value={formData.data} className={inputClass} onChange={e => setFormData({...formData, data: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase text-sm mt-4">{editItem ? "Confirmar Edição" : "Salvar Lançamento"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) { return ( <button onClick={onClick} className="bg-slate-800/40 border border-slate-700/40 py-6 rounded-3xl flex flex-col items-center gap-3 active:scale-90 transition-all">{icon} <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">{label}</span></button> ); }
function NavButton({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-600 opacity-60'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); }
function InfoCard({ title, val, color, onClick }) { return ( <div onClick={onClick} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] cursor-pointer active:scale-95 transition-all"><div className={`mb-3 ${color}`}><TrendingUp size={16}/></div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">{title}</p><p className="text-lg font-black tracking-tight">R$ {val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div> ); }
