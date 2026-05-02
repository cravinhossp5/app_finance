"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart,
  History, ArrowLeft
} from 'lucide-react';

// ==========================================
// CONFIGURAÇÃO DOS CARTÕES (AJUSTE COM SEUS DIAS)
// ==========================================
const CONFIG_CARTOES = {
  'Inter': { fechamento: 10, vencimento: 15 },
  'Nubank': { fechamento: 25, vencimento: 2 },
  'C6Bank': { fechamento: 20, vencimento: 25 },
  'Dinheiro': null // Ignora lógica de fatura
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
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
  const [meusBancos, setMeusBancos] = useState([]);
  const [salarios, setSalarios] = useState([]);

  // Estado para abrir o Histórico do Cliente
  const [clienteAtivo, setClienteAtivo] = useState(null);

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

      const [varData, fixData, cartData, devData, bancosData, salarioData] = await Promise.all([
        fetchData('DB_Investimentos_Variaveis'),
        fetchData('DB_Investimentos_Fixos'),
        fetchData('bdLancamentos'),
        fetchData('bdDevedores'),
        fetchData('meus_bancos'),
        fetchData('bdRendas') 
      ]);

      if (varData?.success) setAtivosVariaveis(varData.data || []);
      if (fixData?.success) setAtivosFixos(fixData.data || []);
      if (cartData?.success) setGastosCartao(cartData.data || []);
      if (devData?.success) setDevedores(devData.data || []);
      if (salarioData?.success) setSalarios(salarioData.data || []);
      
      if (bancosData?.success) {
        const bancosLimpos = bancosData.data.map(b => b.dados[0]).filter(b => b && b !== "Banco");
        setMeusBancos(bancosLimpos.length > 0 ? bancosLimpos : Object.keys(CONFIG_CARTOES));
      }
      
      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDados(); }, []);

  const handleSalvar = async (payload, aba) => {
    setIsModalOpen(false); 
    setSyncStatus('syncing');
    showToast("Enviando para a planilha...", "info");

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar', aba, payload })
      });
      const result = await response.json();
      
      if (result.success) {
        setSyncStatus('synced');
        showToast("Registrado com sucesso!");
        fetchDados(true); 
      } else throw new Error();
    } catch (error) {
      setSyncStatus('error');
      showToast("Falha ao salvar.", "error");
    }
  };

  const handleAtualizarDevedor = async (item, novoStatus) => {
    setSyncStatus('syncing');
    showToast(`Atualizando status...`, "info");
    try {
      const payload = [
        item.dados[5],  // Data Acordo
        item.dados[6],  // Nome
        item.dados[7],  // Valor Total
        item.dados[8],  // Data Pgto Combinada
        novoStatus,     // Motivo (Pendente/Concluído)
        item.dados[10], // Juros
        item.dados[11]  // Obs
      ];

      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'atualizar', aba: 'bdDevedores', linha: item.linha, payload })
      });
      
      const result = await res.json();
      if (result.success) {
        showToast(`Dívida ${novoStatus}!`);
        fetchDados(true);
      } else throw new Error();
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao atualizar.", "error");
    }
  };

  const handlePagarFatura = async (item) => {
    setSyncStatus('syncing');
    showToast(`Marcando como Paga...`, "info");
    try {
      const payload = [
        item.dados[5], // Categoria
        item.dados[6], // Banco
        item.dados[7], // Valor
        item.dados[8], // Data
        "Paga"         // Coluna J (Adicione "Status Pagamento" na Col J de bdLancamentos)
      ];
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'atualizar', aba: 'bdLancamentos', linha: item.linha, payload })
      });
      if ((await res.json()).success) {
        showToast(`Despesa Paga!`);
        fetchDados(true);
      } else throw new Error();
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao atualizar fatura.", "error");
    }
  };

  // --- MATEMÁTICA TEMPORAL (CAIXA LIVRE REAL) ---
  const calcCaixaLivre = () => {
    let rendaMes = 0; let gastoMes = 0; let investimentoMes = 0; let emprestadoMes = 0; let recebidoMes = 0;

    // Renda do Mês
    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]);
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) rendaMes += (parseFloat(s.dados[9]) || 0);
    });

    // Gastos do Mês
    gastosCartao.forEach(g => {
      const d = parseDataBR(g.dados[8]);
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) gastoMes += (parseFloat(g.dados[7]) || 0);
    });

    // Investimentos do Mês (Dinheiro que saiu da conta pra corretora)
    ativosVariaveis.forEach(a => {
      const d = parseDataBR(a.dados[5]); // Assumindo Data na F
      const tipoOp = a.dados[6]?.toUpperCase(); // Assumindo Tipo_Op na G
      const valor = parseFloat(a.dados[4]) || 0; // Custo na E
      if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        if (tipoOp === 'COMPRA') investimentoMes += valor;
        if (tipoOp === 'VENDA') rendaMes += valor; // Volta pro caixa
      }
    });

    // Empréstimos (Saiu e Voltou)
    devedores.forEach(dev => {
      const dAcordo = parseDataBR(dev.dados[5]);
      const valorOriginal = parseFloat(dev.dados[7]) || 0;
      const status = dev.dados[9];
      const pago = parseFloat(dev.dados[3]) || 0; // Col D lida da planilha
      
      if (dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual) emprestadoMes += valorOriginal;
      if (status === 'Concluído' && dAcordo.getMonth() === mesAtual) recebidoMes += pago; // Simplificação: assume que recebeu no mesmo mês ou ajustar pela data de baixa
    });

    const caixaLivre = rendaMes + recebidoMes - gastoMes - investimentoMes - emprestadoMes;
    return { renda: rendaMes + recebidoMes, saida: gastoMes + investimentoMes + emprestadoMes, livre: caixaLivre };
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
        {activeTab === 'dashboard' && <ResumoView dadosCaixa={calcCaixaLivre()} />}
        {activeTab === 'patrimonio' && <CarteiraView ativosVar={ativosVariaveis} ativosFixos={ativosFixos} />}
        {activeTab === 'devedores' && !clienteAtivo && <DevedoresView items={devedores} onAbrirCliente={setClienteAtivo} />}
        {activeTab === 'devedores' && clienteAtivo && <ClienteDossieView nome={clienteAtivo} items={devedores} onVoltar={() => setClienteAtivo(null)} onStatusChange={handleAtualizarDevedor} />}
        {activeTab === 'cartoes' && <CartoesView items={gastosCartao} onPagar={handlePagarFatura} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/50 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => {setActiveTab('dashboard'); setClienteAtivo(null);}} icon={<PieChart size={22} />} label="Resumo" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => {setActiveTab('patrimonio'); setClienteAtivo(null);}} icon={<Briefcase size={22} />} label="Carteira" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-[1.7rem] shadow-lg shadow-emerald-900/40 -translate-y-6 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={28} /></button>
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={22} />} label="Cobranças" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => {setActiveTab('cartoes'); setClienteAtivo(null);}} icon={<CreditCard size={22} />} label="Cartões" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} onClose={() => setIsModalOpen(false)} onSave={handleSalvar} meusBancos={meusBancos} />}
    </main>
  );
}

// --- FUNÇÕES AUXILIARES ---
function parseDataBR(dataStr) {
  if (!dataStr) return new Date();
  if (dataStr.includes('/')) {
    const [dia, mes, ano] = dataStr.split('/');
    return new Date(ano, mes - 1, dia);
  }
  return new Date(dataStr);
}

// ==========================================
// VIEW: RESUMO (DRE DE CAIXA REAL)
// ==========================================
function ResumoView({ dadosCaixa }) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 p-6 opacity-5 text-emerald-500"><PieChart size={150}/></div>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className={`text-4xl font-black tracking-tighter ${dadosCaixa.livre >= 0 ? 'text-white' : 'text-red-400'}`}>
          R$ {dadosCaixa.livre.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </p>
        
        <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
          <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-slate-500">Entradas Totais</span><span className="text-blue-400">+ R$ {dadosCaixa.renda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
          <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-slate-500">Saídas (Gastos/Ativos/Emp)</span><span className="text-red-400">- R$ {dadosCaixa.saida.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: CARTEIRA 
// ==========================================
function CarteiraView({ ativosVar, ativosFixos }) {
  const acoes = ativosVar.filter(a => a.dados[1]?.toUpperCase().includes('AÇÃO'));
  const fiis = ativosVar.filter(a => a.dados[1]?.toUpperCase().includes('FII'));
  const cripto = ativosVar.filter(a => a.dados[1]?.toUpperCase().includes('CRIPTO'));

  const calcularTotalPago = (lista) => lista.reduce((acc, item) => acc + (parseFloat(item.dados[4]) || 0), 0);
  const calcularLucroPlanilha = (lista) => lista.reduce((acc, item) => acc + (parseFloat(item.dados[7]) || 0), 0);
  const calcularProventosPlanilha = (lista) => lista.reduce((acc, item) => acc + (parseFloat(item.dados[11]) || 0), 0);

  const totalAcoes = calcularTotalPago(acoes);
  const totalFiis = calcularTotalPago(fiis);
  const totalCripto = calcularTotalPago(cripto);
  const totalFixa = ativosFixos.reduce((acc, item) => acc + (parseFloat(item.dados[5]) || 0), 0);
  const totalGeral = totalAcoes + totalFiis + totalCripto + totalFixa;
  const lucroEstimado = calcularLucroPlanilha(ativosVar);
  const proventosEstimados = calcularProventosPlanilha(ativosVar);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-emerald-900/20 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Investido (Custo)</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-500">Lucro Atual (Via B3)</span>
            <span className={lucroEstimado >= 0 ? "text-emerald-400" : "text-red-400"}>{lucroEstimado >= 0 ? '+' : ''} R$ {lucroEstimado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-500">Proventos a Receber</span>
            <span className="text-blue-400">R$ {proventosEstimados.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard icon={<TrendingUp size={16}/>} title="Ações" value={totalAcoes} color="text-indigo-400" />
        <InfoCard icon={<Building2 size={16}/>} title="FIIs" value={totalFiis} color="text-violet-400" />
        <InfoCard icon={<Coins size={16}/>} title="Criptomoedas" value={totalCripto} color="text-amber-400" />
        <InfoCard icon={<Wallet size={16}/>} title="Renda Fixa" value={totalFixa} color="text-emerald-400" />
      </div>
    </div>
  );
}

function InfoCard({ icon, title, value, color }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem]">
      <div className={`mb-3 ${color}`}>{icon}</div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-lg font-black text-slate-200 tracking-tight">R$ {value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
    </div>
  );
}

// ==========================================
// VIEW: COBRANÇAS (AGRUPADO POR CLIENTE)
// ==========================================
function DevedoresView({ items, onAbrirCliente }) {
  // Agrupa por nome
  const clientesObj = {};
  items.forEach(item => {
    const nome = item.dados[6] || 'Sem Nome';
    if (!clientesObj[nome]) clientesObj[nome] = { nome, totalEmprestado: 0, totalPago: 0, dividasAtivas: 0 };
    
    clientesObj[nome].totalEmprestado += (parseFloat(item.dados[7]) || 0);
    clientesObj[nome].totalPago += (parseFloat(item.dados[3]) || 0);
    if (item.dados[9] !== 'Concluído') clientesObj[nome].dividasAtivas += 1;
  });

  const clientesList = Object.values(clientesObj).sort((a,b) => b.dividasAtivas - a.dividasAtivas);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-4">Resumo por Cliente</h3>
      {clientesList.map((cli, idx) => {
        const pendente = cli.totalEmprestado - cli.totalPago; // Simplificado sem juros dinâmico na visão macro
        return (
          <div key={idx} onClick={() => onAbrirCliente(cli.nome)} className="p-4 bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-3xl flex justify-between items-center cursor-pointer transition-all active:scale-95">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-900/20"><Users size={18}/></div>
              <div>
                <p className="font-black text-sm text-slate-100">{cli.nome}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase">{cli.dividasAtivas} operações ativas</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-black text-sm ${pendente > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>R$ {Math.max(0, pendente).toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
            </div>
          </div>
        )
      })}
    </div>
  );
}

// ==========================================
// VIEW: DOSSIÊ DO CLIENTE (HISTÓRICO)
// ==========================================
function ClienteDossieView({ nome, items, onVoltar, onStatusChange }) {
  const dividas = items.filter(i => i.dados[6] === nome);
  
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
        const dataVenc = parseDataBR(item.dados[8]); // Coluna I (Data Pagamento Combinada)
        const isConcluido = item.dados[9] === 'Concluído';
        
        // Juros simples
        const hoje = new Date();
        let meses = (hoje.getFullYear() - dataAcordo.getFullYear()) * 12 + (hoje.getMonth() - dataAcordo.getMonth());
        if (hoje.getDate() < dataAcordo.getDate()) meses--;
        meses = Math.max(1, meses);
        const jurosTotais = vOriginal * (juros/100) * meses;

        const isVencido = !isConcluido && (hoje > dataVenc);

        return (
          <div key={idx} className={`p-5 rounded-[2rem] border ${isConcluido ? 'bg-slate-900/40 border-slate-800' : isVencido ? 'bg-red-950/20 border-red-900/50' : 'bg-slate-900 border-amber-900/30'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isConcluido ? 'bg-slate-800 text-slate-400' : isVencido ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'}`}>
                  {isConcluido ? 'Paga' : isVencido ? 'Vencida' : 'Aberta'}
                </span>
                <p className="text-[10px] font-bold text-slate-500 mt-2">Vence em: {dataVenc.toLocaleDateString('pt-BR')}</p>
              </div>
              <button onClick={() => onStatusChange(item, isConcluido ? 'Pendente' : 'Concluído')} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors">
                <CheckCircle size={18}/>
              </button>
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
// VIEW: CARTÕES (COM STATUS INTELIGENTE)
// ==========================================
function CartoesView({ items, onPagar }) {
  const hoje = new Date();
  
  const calcularStatusFatura = (dataCompraStr, banco, statusPagamento) => {
    if (statusPagamento === 'Paga') return { label: 'Paga', color: 'text-slate-500', bg: 'bg-slate-800' };
    
    const config = CONFIG_CARTOES[banco];
    if (!config) return { label: 'Avulso', color: 'text-blue-400', bg: 'bg-blue-900/20' }; // Despesas em dinheiro/PIX

    const dataCompra = parseDataBR(dataCompraStr);
    
    // Simplificação de Fatura: Se a compra foi antes do fechamento deste mês, ela vence este mês.
    let mesVencimento = dataCompra.getMonth();
    let anoVencimento = dataCompra.getFullYear();
    if (dataCompra.getDate() >= config.fechamento) {
      mesVencimento++;
      if (mesVencimento > 11) { mesVencimento = 0; anoVencimento++; }
    }
    
    const dataVencimentoReal = new Date(anoVencimento, mesVencimento, config.vencimento);
    const dataFechamentoReal = new Date(anoVencimento, mesVencimento - (dataCompra.getDate() >= config.fechamento ? 0 : 1), config.fechamento);

    if (hoje > dataVencimentoReal) return { label: 'Vencido', color: 'text-red-400', bg: 'bg-red-900/30' };
    if (hoje > dataFechamentoReal && hoje <= dataVencimentoReal) return { label: 'Fechada', color: 'text-amber-400', bg: 'bg-amber-900/30' };
    return { label: 'Atual', color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-4">Gestão de Lançamentos</h3>
      {items.map((item, idx) => {
        const status = calcularStatusFatura(item.dados[8], item.dados[6], item.dados[9]); // Col J: Status Paga
        const isFixo = item.dados[10] === 'Fixo'; // Assumindo Col K: Tipo (Fixo/Avulso)

        return (
          <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${status.bg} ${status.color}`}>
                <CreditCard size={18}/>
              </div>
              <div>
                <p className="font-black text-sm text-slate-100 flex items-center gap-2">
                  {item.dados[5]} {isFixo && <span className="text-[8px] bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded-md">FIXO</span>}
                </p>
                <p className="text-[9px] font-black text-slate-500 uppercase mt-1">{item.dados[6]} • <span className={status.color}>{status.label}</span></p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              <p className={`font-black text-sm ${status.label === 'Paga' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>R$ {parseFloat(item.dados[7] || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
              {status.label !== 'Paga' && (
                <button onClick={() => onPagar(item)} className="text-[9px] font-black uppercase tracking-widest bg-emerald-900/30 text-emerald-400 px-3 py-1.5 rounded-lg active:scale-90 transition-all">Pagar</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// MODAL DE LANÇAMENTO (COM CONTA FIXA E VENCIMENTOS)
// ==========================================
function LancamentoModal({ tipo, setTipo, onClose, onSave, meusBancos }) {
  const [formData, setFormData] = useState({ 
    data: new Date().toISOString().split('T')[0], 
    dataVenc: new Date().toISOString().split('T')[0], 
    banco: meusBancos[0] || 'Dinheiro', 
    ativoTipo: 'Ação',
    nome: '', valor: '', juros: '', he50: '', he100: '', descontos: '', isFixo: false
  });
  
  const inputClass = "w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 outline-none transition-all text-sm font-bold";
  const selectClass = `${inputClass} appearance-none pr-10`;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl animate-in slide-in-from-bottom-10 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-xl text-emerald-500 tracking-tight">
            {tipo === 'escolha' ? 'Novo Registro' : tipo === 'cartao' ? 'Despesa / Cartão' : tipo === 'ativo' ? 'Meus Ativos' : tipo === 'salario' ? 'Lançar Salário' : 'Nova Cobrança'}
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
            let payload = {}; let abaDestino = "";

            if (tipo === 'devedor') {
              abaDestino = 'bdDevedores';
              payload = { "Data Acordo": dataBR, "Nome Devedor": formData.nome, "Valor Total": parseFloat(formData.valor)||0, "Data Pagamento Combinada": vencBR, "Motivo": "Pendente", "Valor Parcela": parseFloat(formData.juros)||0, "Observações": "App" };
            } else if (tipo === 'cartao') {
              abaDestino = 'bdLancamentos';
              payload = { "Categoria": formData.nome, "Conta/Cartão": formData.banco, "Valor": parseFloat(formData.valor)||0, "Data": dataBR, "Status Pagamento": "Pendente", "Tipo Conta": formData.isFixo ? "Fixo" : "Avulso" };
            } else if (tipo === 'ativo') {
              if (formData.ativoTipo === 'Renda Fixa') {
                abaDestino = 'DB_Investimentos_Fixos';
                payload = { "Data": dataBR, "Nome": formData.nome, "Valor": parseFloat(formData.valor)||0, "Taxa": parseFloat(formData.juros)||0 };
              } else {
                abaDestino = 'DB_Historico_Ordens';
                payload = { "Data": dataBR, "Ticker": formData.nome.toUpperCase(), "Tipo_Operacao": "COMPRA", "Quantidade": parseFloat(formData.valor)||0, "Preco_Unitario": parseFloat(formData.juros)||0, "Tipo_Ativo": formData.ativoTipo };
              }
            } else if (tipo === 'salario') {
              abaDestino = 'bdRendas'; 
              const b = parseFloat(formData.valor)||0; const h5 = parseFloat(formData.he50)||0; const h1 = parseFloat(formData.he100)||0; const d = parseFloat(formData.descontos)||0;
              payload = { "Data": dataBR, "Salario Bruto": b, "HE 50%": h5, "HE 100%": h1, "Descontos": d, "Liquido": b+h5+h1-d, "Observacoes": "App" };
            }
            onSave(payload, abaDestino);
          }}>

            {tipo === 'salario' ? (
               <>
               <input type="number" step="any" placeholder="Salário Bruto R$" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
               <div className="grid grid-cols-2 gap-4">
                 <input type="number" step="any" placeholder="Extra 50% R$" className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} />
                 <input type="number" step="any" placeholder="Extra 100% R$" className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} />
               </div>
               <input type="number" step="any" placeholder="Descontos R$" className={`${inputClass} border-red-500/50 text-red-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} />
             </>
            ) : tipo === 'cartao' ? (
              <>
                <input type="text" placeholder="Nome da Despesa" className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder="Valor R$" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <div className="relative">
                    <select className={selectClass} value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})}>
                      {meusBancos.map((banco, i) => <option key={i} value={banco}>{banco}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16}/>
                  </div>
                </div>
                <label className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-emerald-500 rounded-lg bg-slate-800 border-slate-700" onChange={e => setFormData({...formData, isFixo: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-300">É uma despesa Fixa?</span>
                </label>
              </>
            ) : tipo === 'devedor' ? (
               <>
                 <input type="text" placeholder="Nome do Cliente" className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                 <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="any" placeholder="Emprestado R$" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                   <input type="number" step="any" placeholder="Juros %/mês" className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
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
                 <input type="text" placeholder="Ticker ou Nome" className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                 <div className="grid grid-cols-2 gap-4">
                   <input type="number" step="any" placeholder="Quantidade" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                   <input type="number" step="any" placeholder="Preço Médio/Taxa" className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
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
              Confirmar Lançamento
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
