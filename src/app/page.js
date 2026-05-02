"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard'); // Começa no Resumo
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
        fetchData('bdRendas') // Lendo a nova aba de Salários
      ]);

      if (varData?.success) setAtivosVariaveis(varData.data || []);
      if (fixData?.success) setAtivosFixos(fixData.data || []);
      if (cartData?.success) setGastosCartao(cartData.data || []);
      if (devData?.success) setDevedores(devData.data || []);
      if (salarioData?.success) setSalarios(salarioData.data || []);
      
      // Filtra os bancos ignorando a linha de cabeçalho
      if (bancosData?.success) {
        const bancosLimpos = bancosData.data.map(b => b.dados[0]).filter(b => b && b !== "Banco");
        setMeusBancos(bancosLimpos.length > 0 ? bancosLimpos : ['Inter', 'Nubank']);
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

  // Funções Auxiliares de Cálculo para o Resumo
  const calcTotalInvestido = () => {
    // Agora lê direto da Coluna E (dados[4]) da sua planilha para o custo exato
    const varTotal = ativosVariaveis.reduce((acc, item) => acc + (parseFloat(item.dados[4]) || 0), 0);
    const fixoTotal = ativosFixos.reduce((acc, item) => acc + (parseFloat(item.dados[5]) || 0), 0);
    return varTotal + fixoTotal;
  };
  const calcTotalFatura = () => gastosCartao.reduce((acc, curr) => acc + (parseFloat(curr?.dados?.[2]) || 0), 0);
  const calcTotalReceber = () => devedores.filter(i => i.dados[9] !== 'Concluído').reduce((acc, item) => acc + (parseFloat(item.dados[7]) || 0), 0);
  const calcSalarioMes = () => salarios.reduce((acc, item) => acc + (parseFloat(item.dados[9]) || 0), 0); // Líquido na Coluna J (Dados[9])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 pb-28 font-sans relative overflow-x-hidden selection:bg-emerald-500/30">
      
      {notification && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500 border w-[90%] max-w-sm ${
          notification.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-400' : 
          notification.type === 'info' ? 'bg-blue-950/90 border-blue-500/50 text-blue-400' :
          'bg-red-950/90 border-red-500/50 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle size={20}/> : 
           notification.type === 'info' ? <Loader2 size={20} className="animate-spin"/> : <AlertCircle size={20}/>}
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
            <button onClick={() => setMesAtual(prev => prev === 0 ? 11 : prev - 1)} className="p-1 hover:text-emerald-500"><ChevronLeft size={16}/></button>
            <span className="min-w-[80px] text-center text-slate-300 tracking-widest">{meses[mesAtual]}</span>
            <button onClick={() => setMesAtual(prev => prev === 11 ? 0 : prev + 1)} className="p-1 hover:text-emerald-500"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <ResumoView 
            patrimonio={calcTotalInvestido()} 
            fatura={calcTotalFatura()} 
            receber={calcTotalReceber()} 
            renda={calcSalarioMes()} 
          />
        )}
        {activeTab === 'patrimonio' && <CarteiraView ativosVar={ativosVariaveis} ativosFixos={ativosFixos} />}
        {activeTab === 'devedores' && <DevedoresView items={devedores} />}
        {activeTab === 'cartoes' && <CartoesView items={gastosCartao} mes={meses[mesAtual]} />}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/50 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<PieChart size={22} />} label="Resumo" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => setActiveTab('patrimonio')} icon={<Briefcase size={22} />} label="Carteira" />
        <button onClick={() => { setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-4 rounded-[1.7rem] shadow-lg shadow-emerald-900/40 -translate-y-6 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={28} /></button>
        <NavButton active={activeTab === 'devedores'} onClick={() => setActiveTab('devedores')} icon={<Users size={22} />} label="Cobranças" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => setActiveTab('cartoes')} icon={<CreditCard size={22} />} label="Cartões" />
      </nav>

      {isModalOpen && <LancamentoModal tipo={modalType} setTipo={setModalType} onClose={() => setIsModalOpen(false)} onSave={handleSalvar} meusBancos={meusBancos} />}
    </main>
  );
}

// ==========================================
// VIEW: RESUMO (DASHBOARD)
// ==========================================
function ResumoView({ patrimonio, fatura, receber, renda }) {
  const saldoLivre = renda + receber - fatura;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 p-6 opacity-5 text-emerald-500"><PieChart size={150}/></div>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {saldoLivre.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        
        <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
          <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-slate-500">Renda Mensal</span><span className="text-blue-400">+ R$ {renda.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
          <div className="flex flex-col"><span className="text-[9px] uppercase tracking-widest text-slate-500">Fatura Cartões</span><span className="text-red-400">- R$ {fatura.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem]">
          <div className="mb-3 text-emerald-400"><Briefcase size={20}/></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Patrimônio</p>
          <p className="text-lg font-black text-slate-200 tracking-tight">R$ {patrimonio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem]">
          <div className="mb-3 text-amber-400"><Users size={20}/></div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">A Receber</p>
          <p className="text-lg font-black text-slate-200 tracking-tight">R$ {receber.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: CARTEIRA (AÇÕES, FIIS, CRIPTO E FIXA)
// ==========================================
function CarteiraView({ ativosVar, ativosFixos }) {
  const acoes = ativosVar.filter(a => a.dados[1]?.toUpperCase().includes('AÇÃO'));
  const fiis = ativosVar.filter(a => a.dados[1]?.toUpperCase().includes('FII'));
  const cripto = ativosVar.filter(a => a.dados[1]?.toUpperCase().includes('CRIPTO'));

  // Custo Total lido da Coluna E (dados[4]) da sua planilha
  const calcularTotalPago = (lista) => lista.reduce((acc, item) => acc + (parseFloat(item.dados[4]) || 0), 0);
  
  // Lucro lido da Coluna H (dados[7]) e Proventos (se houver no futuro) da Coluna L (dados[11])
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
        <div className="absolute top-0 right-0 p-6 opacity-10 text-emerald-500"><Landmark size={100}/></div>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Investido (Custo)</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        
        <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-slate-500">Lucro Atual</span>
            <span className={lucroEstimado >= 0 ? "text-emerald-400" : "text-red-400"}>
              {lucroEstimado >= 0 ? '+' : ''} R$ {lucroEstimado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </span>
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
// VIEW: COBRANÇAS E DEVEDORES 
// ==========================================
function DevedoresView({ items }) {
  const calcularMetricas = () => {
    let emprestado = 0; let recebido = 0;
    items.forEach(item => {
      emprestado += (parseFloat(item.dados[7]) || 0); 
      recebido += (parseFloat(item.dados[3]) || 0);   
    });
    return { emprestado, recebido, lucro: recebido - emprestado };
  };
  const metricas = calcularMetricas();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Total na Rua (Principal)</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {metricas.emprestado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-500/20">
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Já Recebido</p>
            <p className="text-lg font-black text-emerald-400">R$ {metricas.recebido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lucro Total</p>
            <p className={`text-lg font-black ${metricas.lucro >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              R$ {metricas.lucro.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
            </p>
          </div>
        </div>
      </div>
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Carteira de Clientes</h3>
      {items.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhuma cobrança ativa.</p> : items.map((item, idx) => <DevedorCard key={idx} item={item} />)}
    </div>
  );
}

function DevedorCard({ item }) {
  const nome = item.dados[6] || 'Sem Nome'; 
  const valorOriginal = parseFloat(item.dados[7]) || 0; 
  const totalPago = parseFloat(item.dados[3]) || 0; 
  const saldoDevedor = parseFloat(item.dados[4]) || valorOriginal; 
  const status = item.dados[9] || 'Pendente'; 
  const isConcluido = status === 'Concluído';

  return (
    <div className={`p-5 rounded-[2rem] border transition-all ${isConcluido ? 'bg-slate-900/40 border-slate-800 opacity-60' : 'bg-slate-900 border-amber-900/30 shadow-lg shadow-black/20'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3 items-center">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isConcluido ? 'bg-slate-800 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}><Users size={18}/></div>
          <div>
            <h3 className={`font-black text-sm uppercase tracking-tight ${isConcluido ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{nome}</h3>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.dados[5]}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</span>
          <p className={`text-xs font-black uppercase ${isConcluido ? 'text-emerald-500' : 'text-amber-500'}`}>{status}</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW: CARTÕES
// ==========================================
function CartoesView({ items, mes }) {
  const total = items.reduce((acc, curr) => acc + (parseFloat(curr?.dados?.[2]) || 0), 0);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-indigo-600/10 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Fatura Prevista | {mes}</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>
      
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Lançamentos</h3>
      {items.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20"><CreditCard size={18}/></div>
            <div>
              <p className="font-black text-sm text-slate-100">{item.dados[0]}</p>
              <p className="text-[9px] font-black text-slate-500 uppercase">{item.dados[1]}</p>
            </div>
          </div>
          <p className="font-black text-sm text-slate-200">R$ {parseFloat(item.dados[2] || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// MODAL DE LANÇAMENTO (ORGANIZADO)
// ==========================================
function LancamentoModal({ tipo, setTipo, onClose, onSave, meusBancos }) {
  const [formData, setFormData] = useState({ 
    data: new Date().toISOString().split('T')[0], 
    banco: meusBancos[0] || 'Dinheiro', 
    ativoTipo: 'Ação',
    nome: '', valor: '', juros: '', he50: '', he100: '', descontos: ''
  });
  
  const inputClass = "w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:ring-1 outline-none transition-all text-sm font-bold";
  const selectClass = `${inputClass} appearance-none pr-10`;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl animate-in slide-in-from-bottom-10 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-black text-xl text-emerald-500 tracking-tight">
            {tipo === 'escolha' ? 'Novo Registro' : 
             tipo === 'cartao' ? 'Despesa / Cartão' : 
             tipo === 'ativo' ? 'Meus Ativos' : 
             tipo === 'salario' ? 'Lançar Salário' : 'Nova Cobrança'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:text-white"><X size={20}/></button>
        </div>

        {tipo === 'escolha' ? (
          <div className="grid grid-cols-2 gap-3">
            <ChoiceBtn onClick={() => setTipo('salario')} icon={<Banknote className="text-blue-400"/>} label="Salário" />
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard className="text-indigo-400"/>} label="Cartão" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<Wallet className="text-emerald-400"/>} label="Ativo" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users className="text-amber-400"/>} label="Devedor" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const dataFormatadaBR = formData.data.split('-').reverse().join('/');
            let payload = {}; let abaDestino = "";

            if (tipo === 'devedor') {
              abaDestino = 'bdDevedores';
              payload = { "Data Acordo": dataFormatadaBR, "Nome Devedor": formData.nome, "Valor Total": parseFloat(formData.valor) || 0, "Motivo": "Pendente", "Valor Parcela": parseFloat(formData.juros) || 0, "Observações": "App" };
            } else if (tipo === 'cartao') {
              abaDestino = 'bdLancamentos';
              payload = { "Categoria": formData.nome, "Conta/Cartão": formData.banco, "Valor": parseFloat(formData.valor) || 0, "Data": dataFormatadaBR };
            } else if (tipo === 'ativo') {
              if (formData.ativoTipo === 'Renda Fixa') {
                abaDestino = 'DB_Investimentos_Fixos';
                payload = { "Data": dataFormatadaBR, "Nome": formData.nome, "Valor": parseFloat(formData.valor) || 0, "Taxa": parseFloat(formData.juros) || 0 };
              } else {
                abaDestino = 'DB_Historico_Ordens';
                payload = { "Data": dataFormatadaBR, "Ticker": formData.nome.toUpperCase(), "Tipo_Operacao": "COMPRA", "Quantidade": parseFloat(formData.valor) || 0, "Preco_Unitario": parseFloat(formData.juros) || 0, "Tipo_Ativo": formData.ativoTipo };
              }
            } else if (tipo === 'salario') {
              abaDestino = 'bdRendas'; 
              const bruto = parseFloat(formData.valor) || 0;
              const h50 = parseFloat(formData.he50) || 0;
              const h100 = parseFloat(formData.he100) || 0;
              const desc = parseFloat(formData.descontos) || 0;
              const liquido = bruto + h50 + h100 - desc;
              
              payload = { "Data": dataFormatadaBR, "Salario Bruto": bruto, "HE 50%": h50, "HE 100%": h100, "Descontos": desc, "Liquido": liquido, "Observacoes": "App" };
            }
            onSave(payload, abaDestino);
          }}>

            {tipo === 'ativo' && (
              <div className="relative">
                <select className={selectClass} value={formData.ativoTipo} onChange={e => setFormData({...formData, ativoTipo: e.target.value})}>
                  <option value="Ação">Ação (B3)</option>
                  <option value="FII">Fundo Imobiliário</option>
                  <option value="Cripto">Criptomoeda</option>
                  <option value="Renda Fixa">Renda Fixa (CDB/Tesouro)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
              </div>
            )}

            {tipo === 'salario' ? (
              <>
                <input type="number" step="any" placeholder="Salário Bruto R$" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder="Extra 50% R$" className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} />
                  <input type="number" step="any" placeholder="Extra 100% R$" className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} />
                </div>
                <input type="number" step="any" placeholder="Total Descontos R$" className={`${inputClass} border-red-500/50 text-red-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} />
                
                <div className="p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Total Líquido Estimado</span>
                  <span className="text-lg font-black text-emerald-400">
                    R$ {((parseFloat(formData.valor)||0) + (parseFloat(formData.he50)||0) + (parseFloat(formData.he100)||0) - (parseFloat(formData.descontos)||0)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </span>
                </div>
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
              </>
            ) : tipo === 'ativo' && formData.ativoTipo === 'Renda Fixa' ? (
              <>
                <input type="text" placeholder="Nome do Ativo" className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder="Aporte R$" className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="number" step="any" placeholder="Taxa a.a (%)" className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                </div>
              </>
            ) : (
              <>
                <input type="text" placeholder={tipo === 'devedor' ? "Nome do Cliente" : "Ticker (Ex: VALE3)"} className={`${inputClass} ${tipo === 'ativo' ? 'uppercase' : ''}`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder={tipo === 'ativo' ? "Quantidade" : "Emprestado R$"} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="number" step="any" placeholder={tipo === 'devedor' ? "Juros %/mês" : "Preço Médio"} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                </div>
              </>
            )}

            <input type="date" value={formData.data} className={inputClass} onChange={e => setFormData({...formData, data: e.target.value})} />
            
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
