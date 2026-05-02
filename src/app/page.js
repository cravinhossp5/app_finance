"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart,
  ArrowLeft, Edit, Trash2
} from 'lucide-react';

const safeString = (val) => String(val || '').trim();

function parseDataBR(dataStr) {
  const str = safeString(dataStr);
  if (!str || str === "") return null; 
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
  const [bancosConfig, setBancosConfig] = useState({});
  
  const [clienteAtivo, setClienteAtivo] = useState(null);
  const [carteiraDetalhe, setCarteiraDetalhe] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDados = async (silent = false) => {
    if (!silent) setSyncStatus('syncing');
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
    }
  };

  useEffect(() => { fetchDados(); }, []);

  const handleGravarDados = async (payload, aba, linha = null) => {
    setIsModalOpen(false); 
    setEditItem(null);
    setSyncStatus('syncing');
    try {
      const body = linha ? { action: 'atualizar', aba, linha, payload } : { action: 'adicionar', aba, payload };
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if ((await res.json()).success) { showToast(linha ? "Atualizado!" : "Salvo!"); fetchDados(true); } 
      else throw new Error();
    } catch (error) { setSyncStatus('error'); showToast("Erro ao gravar.", "error"); }
  };

  const handleExcluir = async (linha, aba) => {
    if(!window.confirm('Excluir permanentemente?')) return;
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'excluir', aba, linha }) });
      if ((await res.json()).success) { showToast("Apagado!"); fetchDados(true); } 
      else throw new Error();
    } catch (e) { setSyncStatus('error'); showToast("Erro ao excluir.", "error"); }
  };

  const abrirEdicao = (item, tipoStr) => { setEditItem(item); setModalType(tipoStr); setIsModalOpen(true); };

  // --- CÁLCULO DE CAIXA LIVRE ---
  const calcCaixaLivre = () => {
    let rendaMes = 0; let gastoMes = 0; let investimentoMes = 0; let emprestadoMes = 0; let recebidoMes = 0;

    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) rendaMes += (parseFloat(s.dados[11]) || 0);
    });

    gastosCartao.forEach(g => {
      const d = parseDataBR(g.dados[5]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) gastoMes += (parseFloat(g.dados[7]) || 0);
    });

    historicoOrdens.forEach(ordem => {
      const d = parseDataBR(ordem.dados[5]); 
      const tipoOp = safeString(ordem.dados[7]).toUpperCase(); 
      const valor = (parseFloat(ordem.dados[8]) || 0) * (parseFloat(ordem.dados[9]) || 0);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        if (tipoOp.includes('COMPRA')) investimentoMes += valor;
        if (tipoOp.includes('VENDA')) rendaMes += valor; 
      }
    });

    devedores.forEach(dev => {
      const dAcordo = parseDataBR(dev.dados[5]);
      const status = safeString(dev.dados[9]);
      const vOriginal = parseFloat(dev.dados[7]) || 0;
      const juros = parseFloat(dev.dados[10]) || 0;
      
      const hoje = new Date();
      let meses = dAcordo ? (hoje.getFullYear() - dAcordo.getFullYear()) * 12 + (hoje.getMonth() - dAcordo.getMonth()) : 1;
      if (dAcordo && hoje.getDate() < dAcordo.getDate()) meses--;
      meses = Math.max(1, meses);
      const montante = vOriginal + (vOriginal * (juros/100) * meses);

      if (dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual) emprestadoMes += vOriginal;
      if (status === 'Concluído') recebidoMes += montante; // Assumimos recebimento integral ao concluir
    });

    return { renda: rendaMes + recebidoMes, saida: gastoMes + investimentoMes + emprestadoMes, livre: (rendaMes + recebidoMes) - (gastoMes + investimentoMes + emprestadoMes) };
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-28 font-sans relative overflow-x-hidden">
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border w-[90%] max-w-sm ${notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 'bg-red-950/90 border-red-500/50 text-red-400'}`}>
          {notification.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2"><h1 className="text-xl font-black text-emerald-500 italic tracking-tighter">APPFINANCE</h1>{syncStatus === 'syncing' && <Loader2 className="animate-spin text-emerald-500" size={14}/>}</div>
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => { setMesAtual(p => p === 0 ? 11 : p - 1); if(mesAtual===0) setAnoAtual(a=>a-1); }} className="hover:text-emerald-500"><ChevronLeft size={16}/></button>
            <span className="min-w-[100px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={() => { setMesAtual(p => p === 11 ? 0 : p + 1); if(mesAtual===11) setAnoAtual(a=>a+1); }} className="hover:text-emerald-500"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'dashboard' && <ResumoView dadosCaixa={calcCaixaLivre()} salarios={salarios} mes={mesAtual} ano={anoAtual} onEdit={i => abrirEdicao(i, 'salario')} onDelete={l => handleExcluir(l, 'bdRendas')} />}
        {activeTab === 'patrimonio' && !carteiraDetalhe && <CarteiraView ativosVar={ativosVariaveis} ativosFixos={ativosFixos} onAbrirDetalhe={setCarteiraDetalhe} />}
        {activeTab === 'patrimonio' && carteiraDetalhe && <CarteiraDetalheView tipo={carteiraDetalhe} ativosVar={ativosVariaveis} ativosFixos={ativosFixos} onVoltar={() => setCarteiraDetalhe(null)} onEdit={i => abrirEdicao(i, 'ativo')} onDelete={(l, a) => handleExcluir(l, a)} />}
        {activeTab === 'devedores' && !clienteAtivo && <DevedoresView items={devedores} onAbrirCliente={setClienteAtivo} />}
        {activeTab === 'devedores' && clienteAtivo && <ClienteDossieView nome={clienteAtivo} items={devedores} onVoltar={() => setClienteAtivo(null)} onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], s, i.dados[10], i.dados[11]], 'bdDevedores', i.linha)} onEdit={i => abrirEdicao(i, 'devedor')} onDelete={l => handleExcluir(l, 'bdDevedores')} />}
        {activeTab === 'cartoes' && <CartoesView items={gastosCartao} config={bancosConfig} onPagar={i => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], i.dados[9], i.dados[10], "Paga"], 'bdLancamentos', i.linha)} onEdit={i => abrirEdicao(i, 'cartao')} onDelete={l => handleExcluir(l, 'bdLancamentos')} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/50 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setCarteiraDetalhe(null); setClienteAtivo(null);}} icon={<PieChart size={22} />} label="Resumo" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => {setActiveTab('patrimonio'); setCarteiraDetalhe(null);}} icon={<Briefcase size={22} />} label="Carteira" />
        <button onClick={() => { setEditItem(null); setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-3xl shadow-lg -translate-y-6 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={28} /></button>
        <NavButton active={activeTab === 'devedores'} onClick={() => {setActiveTab('devedores'); setClienteAtivo(null);}} icon={<Users size={22} />} label="Cobranças" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => {setActiveTab('cartoes');}} icon={<CreditCard size={22} />} label="Cartões" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} editItem={editItem} onClose={() => {setIsModalOpen(false); setEditItem(null);}} onSave={handleGravarDados} meusBancos={meusBancos} />}
    </main>
  );
}

// ==========================================
// COMPONENTES DE INTERFACE (VIEWS)
// ==========================================
function ResumoView({ dadosCaixa, salarios, mes, ano, onEdit, onDelete }) {
  const filtrados = salarios.filter(s => { const d = parseDataBR(s.dados[5]); return d && d.getMonth() === mes && d.getFullYear() === ano; });
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className={`text-4xl font-black ${dadosCaixa.livre >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {dadosCaixa.livre.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <div className="mt-6 flex gap-6 text-[10px] font-bold uppercase text-slate-500">
          <div><span className="block text-blue-400 text-xs">R$ {dadosCaixa.renda.toLocaleString('pt-BR')}</span>Entradas</div>
          <div><span className="block text-red-400 text-xs">R$ {dadosCaixa.saida.toLocaleString('pt-BR')}</span>Saídas</div>
        </div>
      </div>
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1">Rendimentos do Mês</h3>
      {filtrados.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros de renda neste mês.</p> : filtrados.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Banknote size={18}/></div><div><p className="text-sm font-black">Salário Base</p><p className="text-[9px] text-slate-500 uppercase">{formatDateToBR(parseDataBR(item.dados[5]))}</p></div></div>
          <div className="flex items-center gap-4"><p className="text-sm font-black text-blue-400">R$ {parseFloat(item.dados[11]||0).toLocaleString('pt-BR')}</p><button onClick={() => onEdit(item)} className="text-slate-600"><Edit size={16}/></button></div>
        </div>
      ))}
    </div>
  );
}

function CarteiraView({ ativosVar, ativosFixos, onAbrirDetalhe }) {
  // Como o app lê da Col F em diante:
  // Historico: F(Data), G(Ticker), H(Op), I(Qtd), J(Preço) -> Qtd * Preço
  // Atual: Como não enxergamos a E, teremos que recalcular ou exibir vazio na view macro se não for do historico
  
  // Assumindo que você quer ver o Valor de Mercado (Coluna H da aba de Variáveis, que para o App é índice 7, ou a G (6))
  const cValorMercado = (lista) => lista.reduce((acc, i) => acc + (parseFloat(i.dados[7]) || 0), 0); 
  const totalFixa = ativosFixos.reduce((acc, i) => acc + (parseFloat(i.dados[5]) || 0), 0);
  
  const acoes = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('AÇÃO') || safeString(a.dados[0]).length <= 6); // Filtro ajustado
  const fiis = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('FII') || safeString(a.dados[0]).includes('11'));

  const totalGeral = cValorMercado(acoes) + cValorMercado(fiis) + totalFixa;

  return (
    <div className="space-y-6">
      <div className="bg-emerald-900/20 border border-emerald-500/20 p-8 rounded-[2.5rem]"><p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Atual (Mercado)</p><p className="text-4xl font-black">R$ {totalGeral.toLocaleString('pt-BR')}</p></div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard title="Ações" val={cValorMercado(acoes)} color="text-indigo-400" onClick={() => onAbrirDetalhe('Ação')} />
        <InfoCard title="FIIs" val={cValorMercado(fiis)} color="text-violet-400" onClick={() => onAbrirDetalhe('FII')} />
        <InfoCard title="Renda Fixa" val={totalFixa} color="text-emerald-400" onClick={() => onAbrirDetalhe('Renda Fixa')} />
      </div>
    </div>
  );
}

function CarteiraDetalheView({ tipo, ativosVar, ativosFixos, onVoltar, onEdit, onDelete }) {
  const isF = tipo === 'Renda Fixa';
  // Filtro adaptado para Tickers (Ações geralmente terminam em 3,4. FIIs em 11)
  const lista = isF ? ativosFixos : ativosVar.filter(a => {
    if(tipo==='FII') return safeString(a.dados[0]).includes('11');
    if(tipo==='Ação') return !safeString(a.dados[0]).includes('11');
    return false;
  });

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <h3 className="text-lg font-black text-white uppercase tracking-widest">{tipo}</h3>
      {lista.map((i, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div><p className="font-black text-sm uppercase">{isF ? i.dados[6] : i.dados[0]}</p><p className="text-[9px] text-slate-500">{isF ? `Taxa: ${i.dados[8]}%` : `Cotação: R$ ${parseFloat(i.dados[5]||0).toFixed(2)}`}</p></div>
          <div className="flex gap-4 items-center">
            <div className="text-right">
              <p className="text-sm font-black text-emerald-400">R$ {parseFloat(isF ? i.dados[7] : i.dados[7]||0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              {!isF && <p className={`text-[9px] font-black uppercase ${parseFloat(i.dados[8]||0) >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Lucro: R$ {parseFloat(i.dados[8]||0).toFixed(2)}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DevedoresView({ items, onAbrirCliente }) {
  const c = {}; let tE = 0; let tR = 0; let l = 0;
  items.forEach(i => {
    const n = safeString(i.dados[6]) || 'Sem Nome'; if(!c[n]) c[n] = { n, e: 0, p: 0, a: 0 };
    const emp = parseFloat(i.dados[7])||0; const status = safeString(i.dados[9]);
    const juros = parseFloat(i.dados[10])||0;
    const dO = parseDataBR(i.dados[5]);
    const hoje = new Date(); let m = dO ? Math.max(1, (hoje.getFullYear() - dO.getFullYear()) * 12 + (hoje.getMonth() - dO.getMonth())) : 1;
    const pagIntegral = emp + (emp * (juros/100) * m); // Se concluiu, pagou tudo

    c[n].e += emp; 
    if(status === 'Concluído') { c[n].p += pagIntegral; tR += pagIntegral; l += (pagIntegral - emp); } 
    else { c[n].a += 1; }
    tE += emp; 
  });
  return (
    <div className="space-y-4">
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem]"><p className="text-[10px] font-black text-amber-500 uppercase mb-1">Total na Rua (Principal)</p><p className="text-4xl font-black">R$ {tE.toLocaleString('pt-BR')}</p>
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-500/20">
          <div><p className="text-[9px] font-black text-slate-500 uppercase">Recebido c/ Juros</p><p className="text-lg font-black text-emerald-400">R$ {tR.toLocaleString('pt-BR')}</p></div>
          <div><p className="text-[9px] font-black text-slate-500 uppercase">Lucro</p><p className={`text-lg font-black ${l >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {l.toLocaleString('pt-BR')}</p></div>
        </div>
      </div>
      {Object.values(c).map((cli, idx) => (
        <div key={idx} onClick={() => onAbrirCliente(cli.n)} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center cursor-pointer active:scale-95 transition-all">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-900/20"><Users size={18}/></div><div><p className="text-sm font-black">{cli.n}</p><p className="text-[9px] text-slate-500 uppercase">{cli.a} abertas</p></div></div>
          <p className="text-sm font-black text-amber-400">R$ {(cli.e).toLocaleString('pt-BR')}</p>
        </div>
      ))}
    </div>
  );
}

function ClienteDossieView({ nome, items, onVoltar, onStatusChange, onEdit, onDelete }) {
  const filtrados = items.filter(i => safeString(i.dados[6]) === nome);
  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem]"><p className="text-[10px] font-black text-amber-500 uppercase mb-1">Dossiê</p><p className="text-3xl font-black">{nome}</p></div>
      {filtrados.map((i, idx) => {
        const vO = parseFloat(i.dados[7])||0; const j = parseFloat(i.dados[10])||0; const dO = parseDataBR(i.dados[5]);
        const m = dO ? Math.max(1, (new Date().getFullYear() - dO.getFullYear()) * 12 + (new Date().getMonth() - dO.getMonth())) : 1;
        return (
          <div key={idx} className="p-5 bg-slate-900 border border-amber-900/30 rounded-[2rem]">
            <div className="flex justify-between mb-4"><span className="text-[9px] font-black uppercase bg-amber-900/50 text-amber-400 px-2 py-1 rounded-lg">{i.dados[9]}</span><div className="flex gap-2"><button onClick={() => onEdit(i)} className="text-slate-600"><Edit size={16}/></button><button onClick={() => onStatusChange(i, i.dados[9]==='Concluído'?'Pendente':'Concluído')} className="text-emerald-500"><CheckCircle size={16}/></button></div></div>
            <div className="flex justify-between items-end border-t border-slate-800 pt-3"><div className="text-[10px] text-slate-400 uppercase font-bold">Principal: R$ {vO}<br/>Juros: {j}% a.m</div><p className="text-lg font-black text-amber-400">R$ {(vO + (vO*(j/100)*m)).toLocaleString('pt-BR')}</p></div>
          </div>
        );
      })}
    </div>
  );
}

function CartoesView({ items, config, onPagar, onEdit, onDelete }) {
  // Removi o filtro de mês para listar todas as faturas pendentes ou pagas
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-4">Lançamentos (Todos os Meses)</h3>
      {items.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registros de cartão.</p> : items.map((i, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center"><div className="w-10 h-10 rounded-2xl border border-indigo-500/20 flex items-center justify-center text-indigo-400"><CreditCard size={18}/></div><div><p className="text-sm font-black">{i.dados[8]}</p><p className="text-[9px] text-slate-500 uppercase">{i.dados[10]} • {i.dados[11]}</p></div></div>
          <div className="flex items-center gap-4"><p className="text-sm font-black">R$ {parseFloat(i.dados[7]||0).toLocaleString('pt-BR')}</p><button onClick={() => onEdit(i)} className="text-slate-600"><Edit size={16}/></button></div>
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
      if (tipo === 'devedor') setFormData(p => ({...p, data: toInp(d[5]), nome: d[6], valor: d[7], dataVenc: toInp(d[8]), juros: d[10]}));
      else if (tipo === 'cartao') setFormData(p => ({...p, data: toInp(d[5]), isFixo: safeString(d[6]).toUpperCase()==='FIXO', valor: d[7], nome: d[8], categoria: d[9], banco: d[10]}));
      else if (tipo === 'salario') setFormData(p => ({...p, data: toInp(d[5]), valor: d[6], he50: d[7], he100: d[8], descontos: d[10]})); 
      else if (tipo === 'ativo') setFormData(p => ({...p, data: toInp(d[5]), nome: d[6] || d[0], valor: d[7] || d[2], juros: d[8] || d[3], ativoTipo: d[9] || 'Ação'}));
    }
  }, [editItem, tipo]);

  const inputClass = "w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-white focus:border-emerald-500/50 outline-none transition-all text-sm font-bold";

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8"><h3 className="font-black text-xl text-emerald-500">{editItem ? `Editar ${tipo}` : 'Novo'}</h3><button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500"><X size={20}/></button></div>
        {tipo === 'escolha' ? (
          <div className="grid grid-cols-2 gap-3"><ChoiceBtn onClick={() => setTipo('salario')} icon={<Banknote className="text-blue-400"/>} label="Salário" /><ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Gastos" /><ChoiceBtn onClick={() => setTipo('ativo')} icon={<Wallet className="text-emerald-400"/>} label="Ativos" /><ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" /></div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault(); const dBR = formData.data.split('-').reverse().join('/'); const vBR = formData.dataVenc.split('-').reverse().join('/');
            let pObj = {}; let pArr = []; let aba = "";

            if (tipo === 'devedor') {
              aba = 'bdDevedores'; const st = editItem ? editItem.dados[9] : "Pendente";
              pObj = { "Data Acordo": dBR, "Nome Devedor": formData.nome, "Valor Total": parseFloat(formData.valor)||0, "Data Pagamento Combinada": vBR, "Motivo": st, "Valor Parcela": parseFloat(formData.juros)||0, "Observações": "App" };
              pArr = [dBR, formData.nome, parseFloat(formData.valor)||0, vBR, st, parseFloat(formData.juros)||0, "App"];
            } else if (tipo === 'cartao') {
              aba = 'bdLancamentos'; const st = editItem ? editItem.dados[11] : "Pendente"; const cat = formData.categoria || "Geral"; const isF = formData.isFixo ? "Fixo" : "Avulso";
              pObj = { "Data Lançamento": dBR, "Tipo": isF, "Valor": parseFloat(formData.valor)||0, "Descrição": formData.nome, "Categoria": cat, "Conta/Cartão": formData.banco, "Status": st };
              pArr = [dBR, isF, parseFloat(formData.valor)||0, formData.nome, cat, formData.banco, st];
            } else if (tipo === 'ativo') {
              const val = parseFloat(formData.valor)||0; const jur = parseFloat(formData.juros)||0;
              if (formData.ativoTipo === 'Renda Fixa') {
                aba = 'DB_Investimentos_Fixos'; pObj = { "Data": dBR, "Nome": formData.nome, "Valor": val, "Taxa": jur }; pArr = [dBR, formData.nome, val, jur, "", "", ""];
              } else {
                aba = 'DB_Historico_Ordens'; pObj = { "Data": dBR, "Ticker": formData.nome.toUpperCase(), "Tipo_Operacao": "COMPRA", "Quantidade": val, "Preco_Unitario": jur, "Tipo_Ativo": formData.ativoTipo }; pArr = [dBR, formData.nome.toUpperCase(), "COMPRA", val, jur, formData.ativoTipo, ""];
              }
            } else if (tipo === 'salario') {
              aba = 'bdRendas'; const b = parseFloat(formData.valor)||0; const h5 = parseFloat(formData.he50)||0; const h1 = parseFloat(formData.he100)||0; const dsr = parseFloat(formData.dsr)||0; const adN = parseFloat(formData.adNoturno)||0; const out = parseFloat(formData.outros)||0; const d = parseFloat(formData.descontos)||0;
              const extAg = dsr + adN + out; const liq = b + h5 + h1 + extAg - d;
              pObj = { "Data": dBR, "Salario Base": b, "HE 50%": h5, "HE 100%": h1, "Adicionais (DSR/Noturno/Outros)": extAg, "Descontos": d, "Liquido": liq };
              pArr = [dBR, b, h5, h1, extAg, d, liq];
            }
            onSave(editItem ? pArr : pObj, aba, editItem?.linha);
          }}>
            {tipo === 'salario' ? (
              <>
                <input type="number" step="any" placeholder="Salário Base R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3"><input type="number" step="any" placeholder="HE 50% R$" value={formData.he50} className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} /><input type="number" step="any" placeholder="HE 100% R$" value={formData.he100} className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} /></div>
                <div className="grid grid-cols-3 gap-2"><input type="number" step="any" placeholder="DSR" value={formData.dsr} className={inputClass} onChange={e => setFormData({...formData, dsr: e.target.value})} /><input type="number" step="any" placeholder="Noturno" value={formData.adNoturno} className={inputClass} onChange={e => setFormData({...formData, adNoturno: e.target.value})} /><input type="number" step="any" placeholder="Outros" value={formData.outros} className={inputClass} onChange={e => setFormData({...formData, outros: e.target.value})} /></div>
                <input type="number" step="any" placeholder="Descontos R$" value={formData.descontos} className={`${inputClass} border-red-500/50 text-red-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} />
              </>
            ) : tipo === 'cartao' ? (
              <>
                <input type="text" placeholder="Descrição" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Valor" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="text" placeholder="Categoria" value={formData.categoria} className={inputClass} onChange={e => setFormData({...formData, categoria: e.target.value})} required /></div>
                <div className="relative"><select className={`${inputClass} appearance-none`} value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})}>{meusBancos.map((b, i) => <option key={i} value={b}>{b}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/></div>
                <label className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer"><input type="checkbox" checked={formData.isFixo} className="w-5 h-5 accent-emerald-500 rounded-lg bg-slate-800 border-slate-700" onChange={e => setFormData({...formData, isFixo: e.target.checked})} /><span className="text-sm font-bold text-slate-300">É uma despesa Fixa?</span></label>
              </>
            ) : tipo === 'devedor' ? (
              <><input type="text" placeholder="Cliente" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Valor" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="number" step="any" placeholder="Juros %" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required /></div><input type="date" value={formData.dataVenc} className={inputClass} onChange={e => setFormData({...formData, dataVenc: e.target.value})} /></>
            ) : (
              <><select className={`${inputClass} mb-2`} value={formData.ativoTipo} onChange={e => setFormData({...formData, ativoTipo: e.target.value})}><option value="Ação">Ação</option><option value="FII">FII</option><option value="Cripto">Cripto</option><option value="Renda Fixa">Renda Fixa</option></select><input type="text" placeholder="Nome" value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><input type="number" step="any" placeholder="Qtd/Aporte" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required /><input type="number" step="any" placeholder="Preço/Taxa" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required /></div></>
            )}
            <input type="date" value={formData.data} className={inputClass} onChange={e => setFormData({...formData, data: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs">{editItem ? "Atualizar" : "Salvar"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) { return ( <button onClick={onClick} className="bg-slate-800/40 border border-slate-700/40 py-5 rounded-[2rem] flex flex-col items-center gap-2 hover:bg-slate-800 transition-all active:scale-90">{icon} <span className="font-black text-[9px] uppercase text-slate-400 tracking-widest">{label}</span></button> ); }
function NavButton({ icon, label, active, onClick }) { return ( <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-600 opacity-60'}`}> {icon} <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span> </button> ); }
function InfoCard({ title, val, color, onClick }) { return ( <div onClick={onClick} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] cursor-pointer hover:border-slate-600 active:scale-95 transition-all"><div className={`mb-3 ${color}`}><TrendingUp size={16}/></div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">{title}</p><p className="text-lg font-black tracking-tight">R$ {val.toLocaleString('pt-BR')}</p></div> ); }
