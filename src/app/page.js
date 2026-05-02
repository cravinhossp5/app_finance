"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart,
  ArrowLeft, Edit, Trash2, RotateCcw, FastForward, Info, History, Activity
} from 'lucide-react';

const safeString = (val) => String(val || '').trim();

const parseCurrency = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).toUpperCase().replace(/[R$\s]/g, '').trim();
  if (s === 'NAN' || s.includes('INFINITY') || s === '') return 0;
  s = s.replace(/[^0-9,-.]/g, ''); 
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
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

const calcFixa = (vA, taxInput, dataApp) => {
  if (!vA || !dataApp) return { bruto: vA || 0, liquido: vA || 0, ir: 0, lucro: 0 };
  const hoje = new Date();
  const diffTime = Math.max(0, hoje - dataApp);
  const diasCorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let dailyRate;
  if (taxInput > 20) { 
     const cdiAnual = 0.1115; 
     const taxEfetivaAnual = cdiAnual * (taxInput / 100);
     dailyRate = Math.pow(1 + taxEfetivaAnual, 1/252) - 1;
  } else { 
     dailyRate = Math.pow(1 + (taxInput / 100), 1/30) - 1;
  }
  
  const diasUteis = taxInput > 20 ? (diasCorridos * (252/365)) : diasCorridos;
  const montanteBruto = vA * Math.pow(1 + dailyRate, diasUteis);
  const lucroBruto = montanteBruto - vA;
  
  let irRate = 0;
  if (taxInput > 20) { 
     if (diasCorridos <= 180) irRate = 0.225;
     else if (diasCorridos <= 360) irRate = 0.20;
     else if (diasCorridos <= 720) irRate = 0.175;
     else irRate = 0.15;
  }
  
  const descontoIR = lucroBruto * irRate;
  return { bruto: montanteBruto, liquido: montanteBruto - descontoIR, ir: descontoIR, lucro: lucroBruto };
};

export default function Dashboard() {
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [editItem, setEditItem] = useState(null); 
  const [syncStatus, setSyncStatus] = useState('synced'); 
  const [notification, setNotification] = useState(null);
  const [customDialog, setCustomDialog] = useState(null);

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
  const [cryptoLivePrices, setCryptoLivePrices] = useState({});
  
  const [clienteAtivo, setClienteAtivo] = useState(null);
  const [carteiraDetalhe, setCarteiraDetalhe] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchDados = async (silent = false) => {
    if (!silent) setSyncStatus('syncing');
    try {
      // 1. Busca Cotação Ao Vivo da Binance
      fetch('https://api.binance.com/api/v3/ticker/price')
        .then(r => r.json())
        .then(data => {
            const prices = {};
            data.forEach(i => { if(i.symbol.endsWith('BRL')) prices[i.symbol.replace('BRL', '')] = parseFloat(i.price); });
            setCryptoLivePrices(prices);
        }).catch(() => console.log("Binance offline, usando preços salvos."));

      // 2. Busca Dados da Planilha
      const call = async (aba) => {
        const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'listar', aba, token: "Mu#22042002" }) });
        return await res.json();
      };

      const [varData, fixData, cartData, devData, bancosData, salarioData, ordensData] = await Promise.all([
        call('DB_Investimentos_Variaveis'), call('DB_Investimentos_Fixos'), call('bdLancamentos'),
        call('bdDevedores'), call('meus_bancos'), call('bdRendas'), call('DB_Historico_Ordens')
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

  const applyOptimisticUpdate = (aba, linha, payload, action) => {
    const map = {
      'bdRendas': [salarios, setSalarios], 'bdLancamentos': [gastosCartao, setGastosCartao], 'bdDevedores': [devedores, setDevedores],
      'DB_Investimentos_Fixos': [ativosFixos, setAtivosFixos], 'DB_Historico_Ordens': [historicoOrdens, setHistoricoOrdens]
    };
    if(!map[aba]) return;
    const [getter, setter] = map[aba];

    if (action === 'adicionar') {
      const fullRow = ["", "", "", "", "", ...payload];
      setter([{ linha: Date.now(), dados: fullRow }, ...getter]);
    } else if (action === 'atualizar') {
      setter(getter.map(i => {
        if(i.linha === linha) { const n = [...i.dados]; payload.forEach((v, idx) => { n[5+idx] = String(v); }); return { ...i, dados: n }; }
        return i;
      }));
    } else if (action === 'excluir') {
      setter(getter.filter(i => i.linha !== linha));
    }
  };

  const handleGravarDados = async (payload, aba, linha = null, silent = false) => {
    setIsModalOpen(false); setEditItem(null); setCustomDialog(null);
    const action = linha ? 'atualizar' : 'adicionar';
    applyOptimisticUpdate(aba, linha, payload, action);
    
    if(!silent) setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, aba, linha, payload, token: "Mu#22042002" }) });
      if ((await res.json()).success) { if(!silent) { setSyncStatus('synced'); fetchDados(true); showToast("Sucesso!"); } } else throw new Error();
    } catch (error) { if(!silent) { setSyncStatus('error'); showToast("Erro.", "error"); fetchDados(true); } }
  };

  const handleExcluir = async (linha, aba) => {
    applyOptimisticUpdate(aba, linha, null, 'excluir');
    setCustomDialog(null); setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'excluir', aba, linha, token: "Mu#22042002" }) });
      if ((await res.json()).success) { setSyncStatus('synced'); fetchDados(true); showToast("Apagado!"); } else throw new Error();
    } catch (e) { setSyncStatus('error'); showToast("Erro ao excluir.", "error"); fetchDados(true); }
  };

  const abrirEdicao = (item, tipoStr) => { setEditItem(item); setModalType(tipoStr); setIsModalOpen(true); };

  const calcCaixaLivre = () => {
    let renda = 0; let saida = 0; let lucroCobrança = 0;
    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]); if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) renda += parseCurrency(s.dados[11]);
    });
    gastosCartao.forEach(g => {
      const d = parseDataBR(g.dados[5]); if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) saida += parseCurrency(g.dados[7]);
    });
    devedores.forEach(dev => {
      const dAcordo = parseDataBR(dev.dados[5]); const vOriginal = parseCurrency(dev.dados[7]); const juros = parseCurrency(dev.dados[10]); const status = safeString(dev.dados[9]);
      const hoje = new Date(); let m = 0;
      if (dAcordo) { m = (hoje.getFullYear() - dAcordo.getFullYear()) * 12 + (hoje.getMonth() - dAcordo.getMonth()); if (hoje.getDate() < dAcordo.getDate()) m--; m = Math.max(0, m); }
      const montanteFinal = vOriginal + (vOriginal * (juros/100) * m);
      if (dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual && status !== 'Concluído') saida += vOriginal; 
      if (status === 'Concluído' && dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual) { renda += montanteFinal; lucroCobrança += (montanteFinal - vOriginal); }
    });
    historicoOrdens.forEach(o => {
      const d = parseDataBR(o.dados[5]); const valor = parseCurrency(o.dados[8]) * parseCurrency(o.dados[9]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        if (safeString(o.dados[7]).toUpperCase().includes('COMPRA')) saida += valor;
        if (safeString(o.dados[7]).toUpperCase().includes('VENDA')) renda += valor;
      }
    });
    return { renda, saida, livre: renda - saida, lucroCobrança };
  };

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-500 flex flex-col items-center justify-center font-black">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="tracking-widest uppercase animate-pulse">Carregando Torre de Controle...</p>
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

      {customDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            {customDialog.type === 'delete' && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-900/20 text-red-500 flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
                <h3 className="text-center text-xl font-black text-white mb-2">Excluir Registro?</h3>
                <p className="text-center text-sm text-slate-400 mb-6">{customDialog.message}</p>
                <div className="flex gap-3">
                  <button onClick={() => setCustomDialog(null)} className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-300 font-bold uppercase text-xs active:scale-95">Cancelar</button>
                  <button onClick={() => handleExcluir(customDialog.linha, customDialog.aba)} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-bold uppercase text-xs active:scale-95">Excluir</button>
                </div>
              </>
            )}
            {customDialog.type === 'rolar' && (
              <RolagemModal item={customDialog.item} totalAtual={customDialog.totalAtual} onClose={() => setCustomDialog(null)} onSave={handleGravarDados} />
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-emerald-500 italic tracking-tighter">APPFINANCE</h1>
            <button onClick={() => fetchDados(true)} className={`${syncStatus === 'syncing' ? 'animate-spin text-emerald-500' : 'text-slate-500 hover:text-emerald-400'} transition-all`}><RefreshCw size={18}/></button>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => { setMesAtual(p => p === 0 ? 11 : p - 1); if(mesAtual===0) setAnoAtual(a=>a-1); }} className="p-1"><ChevronLeft size={16}/></button>
            <span className="min-w-[90px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={() => { setMesAtual(p => p === 11 ? 0 : p + 1); if(mesAtual===11) setAnoAtual(a=>a+1); }} className="p-1"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'dashboard' && <ResumoView dadosCaixa={calcCaixaLivre()} salarios={salarios} mes={mesAtual} ano={anoAtual} onEdit={i => abrirEdicao(i, 'salario')} onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdRendas', linha: l, message: 'Isso apagará o lançamento do histórico.' })} />}
        {activeTab === 'patrimonio' && !carteiraDetalhe && <CarteiraView ativosVar={ativosVariaveis} hist={historicoOrdens} ativosFixos={ativosFixos} liveCrypto={cryptoLivePrices} onAbrirDetalhe={setCarteiraDetalhe} />}
        {activeTab === 'patrimonio' && carteiraDetalhe && <CarteiraDetalheView tipo={carteiraDetalhe} ativosVar={ativosVariaveis} hist={historicoOrdens} ativosFixos={ativosFixos} liveCrypto={cryptoLivePrices} onVoltar={() => setCarteiraDetalhe(null)} onEdit={i => abrirEdicao(i, 'ativo')} onDelete={(l, a) => setCustomDialog({ type: 'delete', aba: a, linha: l, message: 'A aplicação será apagada do histórico.' })} />}
        {activeTab === 'devedores' && !clienteAtivo && <DevedoresView items={devedores} onAbrirCliente={setClienteAtivo} />}
        {activeTab === 'devedores' && clienteAtivo && <ClienteDossieView nome={clienteAtivo} items={devedores} onVoltar={() => setClienteAtivo(null)} onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], s, i.dados[10], i.dados[11]], 'bdDevedores', i.linha)} onEdit={i => abrirEdicao(i, 'devedor')} onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdDevedores', linha: l, message: 'A dívida será apagada permanentemente.' })} onRolar={(item, totalAtual) => setCustomDialog({ type: 'rolar', item, totalAtual })} />}
        {activeTab === 'cartoes' && <CartoesView items={gastosCartao} onEdit={i => abrirEdicao(i, 'cartao')} onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdLancamentos', linha: l, message: 'A despesa sumirá da fatura.' })} />}
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
// VIEWS DE INTERFACE
// ==========================================

function ResumoView({ dadosCaixa, salarios, mes, ano, onEdit, onDelete }) {
  const filtrados = salarios.filter(s => { const d = parseDataBR(s.dados[5]); return d && d.getMonth() === mes && d.getFullYear() === ano; });
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className={`text-4xl font-black ${dadosCaixa.livre >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {dadosCaixa.livre.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <div className="mt-6 flex gap-6 text-[10px] font-bold uppercase text-slate-500">
          <div><span className="block text-blue-400 text-xs">R$ {dadosCaixa.renda.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>Entradas</div>
          <div><span className="block text-red-400 text-xs">R$ {dadosCaixa.saida.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>Saídas</div>
        </div>
      </div>
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1">Renda Detalhada</h3>
      {filtrados.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros neste mês.</p> : filtrados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Banknote size={18}/></div><div><p className="text-sm font-black">Salário / Recebimento</p><p className="text-[9px] text-slate-500 uppercase">{formatDateToBR(parseDataBR(item.dados[5]))}</p></div></div>
          <div className="flex items-center gap-4"><p className="text-sm font-black text-blue-400">R$ {parseCurrency(item.dados[11]).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
            <div className="flex gap-2">
              <button onClick={() => onEdit(item)} className="p-3 bg-slate-800 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button>
              <button onClick={() => onDelete(item.linha)} className="p-3 bg-slate-800 rounded-xl text-red-400 active:scale-90"><Trash2 size={20}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CarteiraView({ ativosVar, hist, ativosFixos, liveCrypto, onAbrirDetalhe }) {
  const acoes = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('AÇÃO'));
  const fiis = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('FII'));
  
  // Resgate Misto de Cripto + Integração Binance
  let cripto = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('CRIPTO'));
  const existingCripto = cripto.map(a => safeString(a.dados[0]).toUpperCase());
  const criptoHist = hist.filter(h => safeString(h.dados[10]).toUpperCase().includes('CRIPTO') && !existingCripto.includes(safeString(h.dados[6]).toUpperCase())).map(h => {
      const ticker = safeString(h.dados[6]).toUpperCase();
      const qtd = parseCurrency(h.dados[8]); const pm = parseCurrency(h.dados[9]); const custo = qtd * pm;
      const precoAtual = liveCrypto[ticker] || pm; // MÁGICA AO VIVO DA BINANCE AQUI!
      const valorMercado = qtd * precoAtual;
      const r = []; r[0]=ticker; r[1]=h.dados[10]; r[2]=qtd; r[3]=pm; r[4]=custo; r[5]=precoAtual; r[6]=valorMercado; r[7]=valorMercado - custo; r[11]=0; r[12]="";
      return { linha: h.linha, dados: r, isHist: true };
  });
  cripto = [...cripto, ...criptoHist];

  const cValorMercado = (lista) => lista.reduce((acc, i) => acc + parseCurrency(i.dados[6]), 0); 
  const provAcoes = acoes.reduce((acc, i) => acc + parseCurrency(i.dados[11]), 0); 
  const provFIIs = fiis.reduce((acc, i) => acc + parseCurrency(i.dados[11]), 0);
  
  const totalFixa = ativosFixos.reduce((acc, i) => {
    const rf = calcFixa(parseCurrency(i.dados[7]), parseCurrency(i.dados[8]), parseDataBR(i.dados[5]));
    return acc + rf.liquido;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-[2.5rem]">
        <div className="flex justify-between items-start mb-1">
           <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total em Carteira</p>
           {Object.keys(liveCrypto).length > 0 && <Activity size={14} className="text-emerald-500 animate-pulse" title="Cotações Binance Ao Vivo" />}
        </div>
        <p className="text-4xl font-black text-white">R$ {(cValorMercado(acoes) + cValorMercado(fiis) + cValorMercado(cripto) + totalFixa).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-indigo-500/20">
          <div><p className="text-[9px] text-slate-500 uppercase font-black">Proventos Ações</p><p className="text-sm font-black text-violet-400">R$ {provAcoes.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
          <div><p className="text-[9px] text-slate-500 uppercase font-black">Proventos FIIs</p><p className="text-sm font-black text-violet-400">R$ {provFIIs.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
          <div className="col-span-2"><p className="text-[9px] text-slate-500 uppercase font-black">Total de Proventos Previstos</p><p className="text-lg font-black text-emerald-400">R$ {(provAcoes + provFIIs).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard title="Ações" val={cValorMercado(acoes)} color="text-indigo-400" onClick={() => onAbrirDetalhe('Ação')} />
        <InfoCard title="FIIs" val={cValorMercado(fiis)} color="text-violet-400" onClick={() => onAbrirDetalhe('FII')} />
        <InfoCard title="Criptos" val={cValorMercado(cripto)} color="text-amber-400" onClick={() => onAbrirDetalhe('Cripto')} />
        <InfoCard title="Renda Fixa" val={totalFixa} color="text-emerald-400" onClick={() => onAbrirDetalhe('Renda Fixa')} />
      </div>
    </div>
  );
}

function CarteiraDetalheView({ tipo, ativosVar, hist, ativosFixos, liveCrypto, onVoltar, onEdit, onDelete }) {
  const isF = tipo === 'Renda Fixa';
  let lista = [];
  
  if (isF) {
    lista = ativosFixos;
  } else {
    const list = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes(tipo.toUpperCase()));
    const existingTickers = list.map(a => safeString(a.dados[0]).toUpperCase());
    const histList = hist.filter(h => safeString(h.dados[10]).toUpperCase().includes(tipo.toUpperCase()) && !existingTickers.includes(safeString(h.dados[6]).toUpperCase()));
    
    const mappedHist = histList.map(h => {
        const ticker = safeString(h.dados[6]).toUpperCase();
        const qtd = parseCurrency(h.dados[8]); const pm = parseCurrency(h.dados[9]); const custo = qtd * pm;
        
        let precoAtual = pm;
        if(tipo === 'Cripto' && liveCrypto[ticker]) precoAtual = liveCrypto[ticker];
        
        const valorMercado = qtd * precoAtual;
        const lucroAbs = valorMercado - custo;

        const r = []; r[0]=ticker; r[1]=h.dados[10]; r[2]=qtd; r[3]=pm; r[4]=custo; r[5]=precoAtual; r[6]=valorMercado; r[7]=lucroAbs; r[11]=0; r[12]="";
        return { linha: h.linha, dados: r, isHist: true };
    });
    lista = [...list, ...mappedHist];
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <h3 className="text-lg font-black text-white uppercase tracking-widest">{tipo} Detalhado</h3>
      
      {!isF && (
        <div className="mb-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
          <Info size={20} className="text-blue-500 shrink-0 mt-0.5"/> 
          <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
            Para proteger suas fórmulas automáticas de cotação da B3, altere Ações e FIIs diretamente na sua planilha (Aba DB_Investimentos_Variaveis).
          </p>
        </div>
      )}

      {lista.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhum ativo listado.</p> : lista.map((i, idx) => {
          if(isF) {
            const dataApp = parseDataBR(i.dados[5]); const dataVenc = parseDataBR(i.dados[6]);
            const vA = parseCurrency(i.dados[7]); const taxa = parseCurrency(i.dados[8]);
            const calc = calcFixa(vA, taxa, dataApp);
            
            return (
              <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
                <div className="flex justify-between items-start mb-4">
                  <div><p className="font-black text-lg uppercase text-slate-100">{i.dados[2]}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{i.dados[4]} • Taxa: {i.dados[8]} {taxa > 20 ? '% CDI' : '% a.m'}</p></div>
                  <div className="flex gap-2"><button onClick={() => onEdit(i)} className="bg-slate-800 p-3 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button><button onClick={() => onDelete(i.linha, 'DB_Investimentos_Fixos')} className="bg-slate-800 p-3 rounded-xl text-red-400 active:scale-90"><Trash2 size={20}/></button></div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
                  <div><p className="text-[8px] font-black text-slate-500 uppercase">Aplicado em {formatDateToBR(dataApp)}</p><p className="text-sm font-black text-slate-300">R$ {vA.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Juros Bruto / Rendimento</p><p className="text-sm font-black text-blue-400">+R$ {calc.lucro.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  <div><p className="text-[8px] font-black text-slate-500 uppercase">Imposto de Renda Retido</p><p className="text-sm font-black text-red-400">-R$ {calc.ir.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Líquido Disponível</p><p className="text-sm font-black text-emerald-400">R$ {calc.liquido.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                  {dataVenc && (
                    <div className="col-span-2 pt-2 border-t border-slate-800/50 mt-2"><p className="text-[8px] font-black text-slate-500 uppercase">Data de Vencimento</p><p className="text-xs font-black text-amber-500">{formatDateToBR(dataVenc)}</p></div>
                  )}
                </div>
              </div>
            )
          }

          const ticker = i.dados[0]; const qtd = parseCurrency(i.dados[2]); const precoMedio = parseCurrency(i.dados[3]); 
          const custoTotal = parseCurrency(i.dados[4]); const valorMercado = parseCurrency(i.dados[6]); 
          const lucroAbs = parseCurrency(i.dados[7]); const provento = parseCurrency(i.dados[11]); const dataProv = safeString(i.dados[12]); 

          return (
            <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
              <div className="flex justify-between items-start mb-4">
                <div><p className="font-black text-lg uppercase text-slate-100">{ticker}</p><p className="text-[10px] font-bold text-slate-500 uppercase">Qtd: {qtd} • PM: R$ {precoMedio.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                {i.isHist && ( <div className="text-[9px] bg-amber-900/30 text-amber-500 px-2 py-1 rounded-lg flex items-center gap-1 h-min"><History size={12}/> Via Histórico</div> )}
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
                <div><p className="text-[8px] font-black text-slate-500 uppercase">Investido (Custo)</p><p className="text-sm font-black text-slate-300">R$ {custoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Valor Atual</p><p className="text-sm font-black text-emerald-400">R$ {valorMercado.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                <div><p className="text-[8px] font-black text-slate-500 uppercase">{tipo === 'Cripto' ? 'Valorização' : 'Lucro Absoluto'}</p><p className={`text-sm font-black ${lucroAbs >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {lucroAbs.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
                {tipo !== 'Cripto' && (
                  <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Proventos Previstos</p><p className="text-sm font-black text-violet-400">R$ {provento.toLocaleString('pt-BR', {minimumFractionDigits:2})} • {dataProv || '--/--'}</p></div>
                )}
              </div>
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
    const hoje = new Date(); let m = 0;
    if(dO) { m = (hoje.getFullYear() - dO.getFullYear()) * 12 + (hoje.getMonth() - dO.getMonth()); if (hoje.getDate() < dO.getDate()) m--; m = Math.max(0, m); }
    const montante = emp + (emp * (j/100) * m);
    
    if(status !== 'Concluído') { c[n].e += emp; c[n].a += 1; tE += emp; } 
    if(status === 'Concluído') { c[n].p += montante; tR += montante; luc += (montante - emp); } 
  });
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Dinheiro na Rua (Pendentes)</p>
        <p className="text-4xl font-black">R$ {tE.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-500/20">
          <div><p className="text-[9px] text-slate-500 uppercase font-black">Recebido c/ Juros</p><p className="text-lg font-black text-emerald-400">R$ {tR.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
          <div><p className="text-[9px] text-slate-500 uppercase font-black">Lucro Realizado</p><p className={`text-lg font-black ${luc >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {luc.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
        </div>
      </div>
      {Object.values(c).filter(cli => cli.a > 0).map((cli, idx) => (
        <div key={idx} onClick={() => onAbrirCliente(cli.n)} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center cursor-pointer active:scale-95 transition-all">
          <div className="flex gap-4 items-center"><div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-900/20"><Users size={20}/></div><div><p className="text-sm font-black">{cli.n}</p><p className="text-[9px] text-slate-500 uppercase">{cli.a} cobranças ativas</p></div></div>
          <p className="text-sm font-black text-amber-400">R$ {cli.e.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
        </div>
      ))}
    </div>
  );
}

function ClienteDossieView({ nome, items, onVoltar, onStatusChange, onEdit, onDelete, onRolar }) {
  const filtrados = items.filter(i => safeString(i.dados[6]) === nome);
  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem]"><p className="text-[10px] font-black text-amber-500 uppercase mb-1">Histórico</p><p className="text-3xl font-black">{nome}</p></div>
      {filtrados.map((i, idx) => {
        const vO = parseCurrency(i.dados[7]); const j = parseCurrency(i.dados[10]); const dO = parseDataBR(i.dados[5]);
        const hoje = new Date(); let m = 0;
        if(dO) { m = (hoje.getFullYear() - dO.getFullYear()) * 12 + (hoje.getMonth() - dO.getMonth()); if (hoje.getDate() < dO.getDate()) m--; m = Math.max(0, m); }
        const total = vO + (vO*(j/100)*m);
        const isConcluido = safeString(i.dados[9]) === 'Concluído';
        return (
          <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
            <div className="flex justify-between items-start mb-4">
              <div><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${isConcluido ? 'bg-slate-800 text-slate-500' : 'bg-amber-900/50 text-amber-400'}`}>{i.dados[9]}</span><p className="text-[10px] font-bold text-slate-400 mt-2">Acordo: <span className="text-white">{formatDateToBR(dO)}</span></p></div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(i)} className="bg-slate-800 p-3 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button>
                <button onClick={() => onDelete(i.linha)} className="bg-slate-800 p-3 rounded-xl text-red-400 active:scale-90"><Trash2 size={20}/></button>
                <button onClick={() => onStatusChange(i, isConcluido ? 'Pendente' : 'Concluído')} className={`p-3 rounded-xl active:scale-90 transition-all ${isConcluido ? 'bg-amber-900/20 text-amber-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
                  {isConcluido ? <RotateCcw size={20}/> : <CheckCircle size={20}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-slate-800 pt-3"><div className="text-[10px] text-slate-400 font-bold uppercase">Principal: R$ {vO}<br/>Juros: {j}% a.m <span className="text-emerald-500">({m} meses)</span></div><p className={`text-lg font-black ${isConcluido ? 'text-slate-500' : 'text-amber-400'}`}>R$ {total.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
            {!isConcluido && (
              <button onClick={() => onRolar(i, total)} className="w-full mt-4 bg-amber-900/20 text-amber-500 border border-amber-500/20 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all"><FastForward size={16}/> Opções de Rolagem</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RolagemModal({ item, totalAtual, onClose, onSave }) {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataNova, setDataNova] = useState(hoje);
  const vO = parseCurrency(item.dados[7]);
  const jurosAcumulados = totalAtual - vO;
  
  const executar = (tipo) => {
     const dBR = dataNova.split('-').reverse().join('/'); const jurosM = parseCurrency(item.dados[10]);
     if(tipo === 'capitalizar') {
        const payload = [dBR, item.dados[6], totalAtual, item.dados[8], "Pendente", jurosM, "Capitalizado"];
        onSave(payload, 'bdDevedores', item.linha);
     } else {
        const pDivida = [dBR, item.dados[6], vO, item.dados[8], "Pendente", jurosM, "Juros Pagos"];
        onSave(pDivida, 'bdDevedores', item.linha);
        const pRenda = [dBR, 0, 0, 0, 0, 0, jurosAcumulados, `Lucro (Juros) rec. de ${item.dados[6]}`];
        onSave(pRenda, 'bdRendas', null, true); 
     }
  }

  return (
    <>
      <div className="w-16 h-16 rounded-full bg-amber-900/20 text-amber-500 flex items-center justify-center mx-auto mb-4"><FastForward size={32}/></div>
      <h3 className="text-center text-xl font-black text-white mb-2">Rolagem de Dívida</h3>
      <p className="text-center text-[10px] text-slate-400 mb-4 uppercase">Escolha a data do Novo Acordo:</p>
      <input type="date" value={dataNova} onChange={e => setDataNova(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white mb-6 font-bold" />
      <div className="flex flex-col gap-3">
        <button onClick={() => executar('juros')} className="w-full p-4 rounded-2xl bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 font-bold uppercase text-[10px] tracking-widest active:scale-95 flex flex-col items-center">
          <span className="text-xs">Receber R$ {jurosAcumulados.toFixed(2)} de Juros</span><span className="text-[8px] opacity-70 mt-1">(Gera lucro no Caixa e mantém principal R$ {vO})</span>
        </button>
        <button onClick={() => executar('capitalizar')} className="w-full p-4 rounded-2xl bg-amber-900/30 border border-amber-500/50 text-amber-500 font-bold uppercase text-[10px] tracking-widest active:scale-95 flex flex-col items-center">
          <span className="text-xs">Capitalizar Tudo para R$ {totalAtual.toFixed(2)}</span><span className="text-[8px] opacity-70 mt-1">(O Juros vira Dívida Principal)</span>
        </button>
        <button onClick={onClose} className="w-full py-3 text-slate-500 font-bold uppercase text-xs mt-2">Cancelar</button>
      </div>
    </>
  );
}

function CartoesView({ items, onEdit, onDelete }) {
  const categorias = {}; let total = 0;
  items.forEach(i => {
     const val = parseCurrency(i.dados[7]); const cat = safeString(i.dados[9]) || 'Outros';
     categorias[cat] = (categorias[cat] || 0) + val; total += val;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Gasto Total com Cartões</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <div className="mt-6 border-t border-indigo-500/20 pt-4 grid grid-cols-2 gap-y-3">
           {Object.entries(categorias).map(([c, v], idx) => (
              <div key={idx}><p className="text-[9px] font-black text-slate-500 uppercase">{c}</p><p className="text-sm font-black text-indigo-400">R$ {v.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p></div>
           ))}
        </div>
      </div>
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1">Lançamentos Individuais</h3>
      {items.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros.</p> : items.map((i, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400"><CreditCard size={18}/></div><div><p className="text-sm font-black">{i.dados[8]}</p><p className="text-[9px] text-slate-500 uppercase">{i.dados[10]} • {i.dados[9]}</p></div></div>
          <div className="flex items-center gap-4">
            <p className="text-sm font-black">R$ {parseCurrency(i.dados[7]).toLocaleString('pt-BR')}</p>
            <div className="flex gap-2 ml-2">
              <button onClick={() => onEdit(i)} className="p-3 bg-slate-800 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button>
              <button onClick={() => onDelete(i.linha)} className="p-3 bg-slate-800 rounded-xl text-red-400 active:scale-90"><Trash2 size={20}/></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function LancamentoModal({ tipo, setTipo, onClose, onSave, meusBancos, editItem }) {
  const [formData, setFormData] = useState({ data: new Date().toISOString().split('T')[0], dataVenc: new Date().toISOString().split('T')[0], banco: meusBancos[0] || 'Dinheiro', ativoTipo: 'Renda Fixa', subTipo: 'CDB', nome: '', valor: '', juros: '', he50: '', he100: '', dsr: '', adNoturno: '', outros: '', descontos: '', isFixo: false, categoria: '' });
  
  useEffect(() => {
    if (editItem) {
      const d = editItem.dados; const toInp = (s) => parseDataBR(s) ? parseDataBR(s).toISOString().split('T')[0] : '';
      if (tipo === 'devedor') setFormData(p => ({...p, data: toInp(d[5]), nome: d[6], valor: parseCurrency(d[7]), dataVenc: toInp(d[8]), juros: parseCurrency(d[10])}));
      else if (tipo === 'cartao') setFormData(p => ({...p, data: toInp(d[5]), isFixo: safeString(d[6]).toUpperCase()==='FIXO', valor: parseCurrency(d[7]), nome: d[8], categoria: d[9], banco: d[10]}));
      else if (tipo === 'salario') setFormData(p => ({...p, data: toInp(d[5]), valor: parseCurrency(d[6]), he50: parseCurrency(d[7]), he100: parseCurrency(d[8]), descontos: parseCurrency(d[10])})); 
      else if (tipo === 'ativo') {
         const isFixa = d[9] ? safeString(d[9]).includes('CDB') || safeString(d[9]).includes('CDI') || safeString(d[9]).includes('Tesouro') : false;
         setFormData(p => ({...p, data: toInp(d[5]), dataVenc: toInp(d[6]), nome: d[7] || d[0], valor: parseCurrency(d[8] || d[2]), juros: parseCurrency(d[9] || d[3]), ativoTipo: isFixa ? 'Renda Fixa' : (d[9] || 'Ação'), subTipo: d[10] || 'CDB'}));
      }
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
              if (formData.ativoTipo === 'Renda Fixa') { aba = 'DB_Investimentos_Fixos'; p = [dBR, vBR, formData.nome, parseCurrency(formData.valor), parseCurrency(formData.juros), formData.subTipo, "", ""]; }
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
              <><input type="text" placeholder="Cliente" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Valor Emprestado" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="number" step="any" placeholder="Juros a.m (%)" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required /></div><div className="bg-slate-950 p-4 rounded-2xl border border-slate-800"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data Acordada para Pgto.</span><input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900 border-none !p-2 text-amber-500`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} /></div></>
            ) : (
              <>
                <div className="flex bg-slate-950 p-1 rounded-2xl mb-4 gap-1">
                  {['Ação', 'FII', 'Cripto', 'Renda Fixa'].map(t => (
                    <button type="button" key={t} onClick={() => setFormData({...formData, ativoTipo: t})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${formData.ativoTipo === t ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>{t}</button>
                  ))}
                </div>
                {formData.ativoTipo === 'Renda Fixa' && (
                  <div className="flex bg-slate-950 p-1 rounded-2xl mb-4 gap-1">
                    {['CDB', 'CDI', 'Tesouro Direto', 'LCI/LCA'].map(t => (
                      <button type="button" key={t} onClick={() => setFormData({...formData, subTipo: t})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${formData.subTipo === t ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>{t}</button>
                    ))}
                  </div>
                )}
                <input type="text" placeholder={formData.ativoTipo==='Renda Fixa' ? "Instituição (ex: CDB C6)" : "Ticker da B3 ou Crypto"} value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder={formData.ativoTipo==='Renda Fixa'?"Valor Aplicado R$":"Quantidade"} value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="number" step="any" placeholder={formData.ativoTipo==='Renda Fixa'?"Taxa (% CDI ou % a.m)":"Preço de Custo R$"} value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required /></div>
                
                {formData.ativoTipo === 'Renda Fixa' && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data de Vencimento</span><input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900 border-none !p-2 text-amber-500`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} /></div>
                )}
              </>
            )}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800"><span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">{tipo === 'ativo' && formData.ativoTipo === 'Renda Fixa' ? 'Data da Aplicação' : (tipo === 'devedor' ? 'Data que Emprestou' : 'Data da Transação')}</span><input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} /></div>
            <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs mt-4 active:scale-95 transition-all">{editItem ? "Atualizar Registro" : "Salvar Lançamento"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) { return ( <button onClick={onClick} className="bg-slate-800/40 border border-slate-700/40 py-6 rounded-3xl flex flex-col items-center gap-3 active:scale-90 transition-all">{icon} <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">{label}</span></button> ); }
function NavButton({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-600 opacity-60'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); }
function InfoCard({ title, val, color, onClick }) { return ( <div onClick={onClick} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] cursor-pointer active:scale-95 transition-all"><div className={`mb-3 ${color}`}><TrendingUp size={16}/></div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">{title}</p><p className="text-lg font-black tracking-tight">R$ {val.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p></div> ); }
