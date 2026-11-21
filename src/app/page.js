"use client";

import { useState, useEffect } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, PlusCircle, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, ChevronDown, Banknote, PieChart,
  ArrowLeft, Edit, Trash2, RotateCcw, FastForward, Info, History, Activity, EyeOff, Eye,
  MessageCircle, Bookmark, Layers, CheckCheck
} from 'lucide-react';

// ==========================================
// TRADUTOR FINANCEIRO E DATAS
// ==========================================
const safeString = (val) => String(val || '').trim();

const parseCurrency = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).toUpperCase().replace(/[R$\s]/g, '').trim();
  if (s === 'NAN' || s.includes('INFINITY') || s === '') return 0;
  s = s.replace(/[^0-9,-.]/g, ''); 
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
};

const formatMoney = (val, hide = false) => {
  if (hide) return '•••••';
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function parseDataBR(dataStr) {
  const str = safeString(dataStr);
  if (!str) return null;
  if (str.includes('-')) {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  return null;
}

function formatDateToBR(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '--/--/----';
  return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
}

function formatDateToISO(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}

// Helpers para identificar Dívidas à Parte (Sem Juros / Lembretes) em bdDevedores
const isDividaAparte = (item) => safeString(item?.dados?.[11]).toUpperCase().startsWith('[APARTE');
const isAparteComCaixa = (item) => safeString(item?.dados?.[11]).toUpperCase().startsWith('[APARTE_CAIXA]');
const getDescricaoAparte = (item) => {
  const obs = safeString(item?.dados?.[11]);
  return obs.replace(/^\[APARTE(?:_CAIXA)?\]\s*/i, '').trim() || 'Empréstimo sem juros';
};

// Cálculo de Renda Fixa com suporte a isenção de LCI/LCA e CDI dinâmico
const calcFixa = (vA, taxInput, dataApp, subTipo = 'CDB', baseCDI = 0.0115) => {
  if (!vA || !dataApp) return { bruto: vA || 0, liquido: vA || 0, ir: 0, lucro: 0, irRate: 0 };
  const hoje = new Date();
  const diffTime = Math.max(0, hoje - dataApp);
  const m = diffTime / (1000 * 60 * 60 * 24 * 30.416); 
  const diasCorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  let monthlyRate;
  if (taxInput > 20) { 
    monthlyRate = (taxInput / 100) * baseCDI;
  } else { 
    monthlyRate = taxInput / 100;
  }
  
  const montanteBruto = vA * Math.pow(1 + monthlyRate, m);
  const lucroBruto = Math.max(0, montanteBruto - vA);
  
  const subUpper = safeString(subTipo).toUpperCase();
  const isIsento = subUpper.includes('LCI') || subUpper.includes('LCA') || subUpper.includes('ISENTO') || subUpper.includes('POUPAN');

  let irRate = 0;
  if (!isIsento && taxInput > 0) { 
    if (diasCorridos <= 180) irRate = 0.225;
    else if (diasCorridos <= 360) irRate = 0.20;
    else if (diasCorridos <= 720) irRate = 0.175;
    else irRate = 0.15;
  }
  
  const descontoIR = lucroBruto * irRate;
  return { bruto: montanteBruto, liquido: montanteBruto - descontoIR, ir: descontoIR, lucro: lucroBruto, irRate };
};

// Calcula automaticamente a data de vencimento da fatura com base no dia de fechamento e vencimento do banco
function calcularDataFaturaSugerida(dataCompraISO, nomeBanco, infoBancos) {
  const info = infoBancos?.[nomeBanco];
  const dCompra = parseDataBR(dataCompraISO) || new Date();
  if (!info) return formatDateToISO(dCompra);

  const diaCompra = dCompra.getDate();
  let mesFatura = dCompra.getMonth();
  let anoFatura = dCompra.getFullYear();

  const diaFechamento = info.fechamento || 31;
  const diaVencimento = info.vencimento || 10;

  // Se comprou no dia do fechamento ou depois, joga para o mês seguinte
  if (diaCompra >= diaFechamento) {
    mesFatura += 1;
  }
  // Se o dia de vencimento é menor que o de fechamento (ex: fecha dia 25 e vence dia 05 do mês seguinte)
  if (diaVencimento < diaFechamento) {
    mesFatura += 1;
  }

  const dataVenc = new Date(anoFatura, mesFatura, diaVencimento);
  return formatDateToISO(dataVenc);
}

// Consolidador de Criptomoedas a partir do histórico de ordens (com custo médio proporcional nas vendas)
function consolidarCriptos(hist, liveCrypto) {
  const criptoMap = {};
  hist.forEach(h => {
    if (safeString(h.dados[10]).toUpperCase() === 'CRIPTO') {
      const t = safeString(h.dados[6]).toUpperCase();
      const op = safeString(h.dados[7]).toUpperCase();
      const qtd = parseCurrency(h.dados[8]);
      const valCol9 = parseCurrency(h.dados[9]);
      if (!t || qtd <= 0) return;

      if (!criptoMap[t]) criptoMap[t] = { ticker: t, qtd: 0, custo: 0 };

      if (op === 'COMPRA') {
        criptoMap[t].qtd += qtd;
        criptoMap[t].custo += valCol9;
      } else if (op === 'VENDA' || op === 'RESGATE') {
        const pmAtual = criptoMap[t].qtd > 0 ? (criptoMap[t].custo / criptoMap[t].qtd) : 0;
        criptoMap[t].qtd = Math.max(0, criptoMap[t].qtd - qtd);
        criptoMap[t].custo = criptoMap[t].qtd > 0 ? Math.max(0, criptoMap[t].custo - (qtd * pmAtual)) : 0;
      }
    }
  });

  return Object.values(criptoMap).filter(c => c.qtd > 0.00000001).map(c => {
    const pm = c.custo / c.qtd;
    const precoAtual = liveCrypto[c.ticker] || pm;
    const valorMercado = c.qtd * precoAtual;
    const r = [];
    r[0] = c.ticker;
    r[2] = c.qtd;
    r[3] = pm;
    r[4] = c.custo;
    r[6] = valorMercado;
    r[7] = valorMercado - c.custo;
    r[11] = 0;
    r[12] = "";
    return { dados: r, isHist: true };
  });
}

// Helper para abrir cobrança no WhatsApp
function cobrarWhatsApp(nome, valor, vencimentoStr, descricao = '') {
  const msg = `Olá *${nome}*, tudo bem? Passando para lembrar do valor de *R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*${descricao ? ` referente a _${descricao}_` : ''}${vencimentoStr && vencimentoStr !== '--/--/----' ? ` (vencimento em *${vencimentoStr}*)` : ''}. Qualquer dúvida estou à disposição!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

export default function Dashboard() {
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [editItem, setEditItem] = useState(null); 
  const [resgateAtivoTipo, setResgateAtivoTipo] = useState('');
  const [devedorPreSelecionado, setDevedorPreSelecionado] = useState('');
  const [syncStatus, setSyncStatus] = useState('synced'); 
  const [notification, setNotification] = useState(null);
  const [customDialog, setCustomDialog] = useState(null);
  const [hideValues, setHideValues] = useState(false);
  const [cdiMensal, setCdiMensal] = useState(0.0115);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const [mesAtual, setMesAtual] = useState(new Date().getMonth()); 
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const [ativosVariaveis, setAtivosVariaveis] = useState([]);
  const [ativosFixos, setAtivosFixos] = useState([]);
  const [gastosCartao, setGastosCartao] = useState([]);
  const [devedores, setDevedores] = useState([]);
  const [salarios, setSalarios] = useState([]);
  const [historicoOrdens, setHistoricoOrdens] = useState([]);
  const [meusBancos, setMeusBancos] = useState(['Dinheiro']);
  const [infoBancos, setInfoBancos] = useState({});
  const [cryptoLivePrices, setCryptoLivePrices] = useState({});
  
  const [clienteAtivo, setClienteAtivo] = useState(null);
  const [carteiraDetalhe, setCarteiraDetalhe] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const processarBancos = (listaBancos) => {
    if (!Array.isArray(listaBancos)) return;
    const bl = [];
    const dadosBancos = {};
    listaBancos.forEach(b => {
      const nome = safeString(b.dados?.[0]);
      if (nome && nome.toLowerCase() !== "banco") {
        bl.push(nome);
        dadosBancos[nome] = {
          fechamento: parseInt(b.dados[1]) || 31,
          vencimento: parseInt(b.dados[2]) || 10
        };
      }
    });
    setMeusBancos(bl.length > 0 ? bl : ['Dinheiro']);
    setInfoBancos(dadosBancos);
  };

  const fetchDados = async (silent = false) => {
    if (!silent) setSyncStatus('syncing');
    try {
      // 1. Cotações Cripto (Binance)
      fetch('https://api.binance.com/api/v3/ticker/price')
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const prices = {};
          data.forEach(i => {
            if (i.symbol && i.symbol.endsWith('BRL')) {
              prices[i.symbol.replace('BRL', '')] = parseFloat(i.price);
            }
          });
          setCryptoLivePrices(prices);
        }).catch(() => {});

      // 2. Taxa CDI Mensal Oficial (Banco Central do Brasil - Série 4391)
      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/2?formato=json')
        .then(r => r.json())
        .then(arr => {
          if (Array.isArray(arr) && arr.length > 0) {
            // Pega o mês fechado anterior (ou o último disponível se razoável)
            const ultimoFechado = arr.length > 1 ? parseFloat(arr[0].valor) : parseFloat(arr[arr.length - 1].valor);
            if (!isNaN(ultimoFechado) && ultimoFechado > 0.3 && ultimoFechado < 3.0) {
              setCdiMensal(ultimoFechado / 100);
            }
          }
        }).catch(() => {});

      // 3. Tenta leitura unificada (1 requisição para todas as 7 abas)
      const resUnificada = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listar_tudo' })
      }).then(r => r.json()).catch(() => null);

      if (resUnificada?.success && resUnificada.data) {
        const d = resUnificada.data;
        setAtivosVariaveis(d.DB_Investimentos_Variaveis || []);
        setAtivosFixos(d.DB_Investimentos_Fixos || []);
        setGastosCartao(d.bdLancamentos || []);
        setDevedores(d.bdDevedores || []);
        setSalarios(d.bdRendas || []);
        setHistoricoOrdens(d.DB_Historico_Ordens || []);
        processarBancos(d.meus_bancos || []);
      } else {
        // Fallback automático caso o usuário ainda esteja com o API.gs antigo na planilha
        const call = async (aba) => {
          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'listar', aba })
          });
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
        if (bancosData?.success) processarBancos(bancosData.data || []);
      }

      setSyncStatus('synced');
    } catch (error) {
      setSyncStatus('error');
    } finally {
      setIsGlobalLoading(false);
    }
  };

  useEffect(() => { 
    fetchDados(); 
    const autoSync = setInterval(() => { fetchDados(true); }, 60000);
    return () => clearInterval(autoSync);
  }, []);

  const applyOptimisticUpdate = (aba, linha, payload, action) => {
    const map = {
      'bdRendas': [salarios, setSalarios],
      'bdLancamentos': [gastosCartao, setGastosCartao],
      'bdDevedores': [devedores, setDevedores],
      'DB_Investimentos_Fixos': [ativosFixos, setAtivosFixos],
      'DB_Historico_Ordens': [historicoOrdens, setHistoricoOrdens]
    };
    if (!map[aba]) return;
    const [getter, setter] = map[aba];

    if (action === 'adicionar') {
      const fullRow = ["", "", "", "", "", ...payload];
      setter(prev => [{ linha: Date.now() + Math.random(), dados: fullRow }, ...prev]);
    } else if (action === 'adicionar_lote') {
      const novasLinhas = payload.map((p, idx) => ({
        linha: Date.now() + idx,
        dados: ["", "", "", "", "", ...p]
      }));
      setter(prev => [...novasLinhas, ...prev]);
    } else if (action === 'atualizar') {
      setter(prev => prev.map(i => {
        if (i.linha === linha) {
          const n = [...i.dados];
          payload.forEach((v, idx) => { n[5 + idx] = String(v); });
          return { ...i, dados: n };
        }
        return i;
      }));
    } else if (action === 'excluir') {
      setter(prev => prev.filter(i => i.linha !== linha));
    }
  };

  const handleGravarDados = async (payload, aba, linha = null, silent = false) => {
    setIsModalOpen(false);
    setEditItem(null);
    setDevedorPreSelecionado('');
    setCustomDialog(null);
    const action = linha ? 'atualizar' : 'adicionar';
    applyOptimisticUpdate(aba, linha, payload, action);
    
    if (!silent) setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, aba, linha, payload })
      });
      const json = await res.json();
      if (json.success) {
        if (!silent) {
          setSyncStatus('synced');
          fetchDados(true);
          showToast("Salvo com sucesso!");
        }
      } else throw new Error(json.message);
    } catch (error) {
      if (!silent) {
        setSyncStatus('error');
        showToast("Erro ao sincronizar.", "error");
        fetchDados(true);
      }
    }
  };

  const handleGravarLote = async (payloads, aba) => {
    setIsModalOpen(false);
    setEditItem(null);
    setCustomDialog(null);
    applyOptimisticUpdate(aba, null, payloads, 'adicionar_lote');
    setSyncStatus('syncing');

    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adicionar_lote', aba, payloads })
      });
      const json = await res.json();
      if (json.success) {
        setSyncStatus('synced');
        fetchDados(true);
        showToast(`${payloads.length} parcelas lançadas!`);
      } else {
        // Fallback sequencial caso o API.gs ainda não tenha adicionar_lote
        for (const p of payloads) {
          await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'adicionar', aba, payload: p })
          });
        }
        setSyncStatus('synced');
        fetchDados(true);
        showToast(`${payloads.length} parcelas lançadas!`);
      }
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao lançar parcelas.", "error");
      fetchDados(true);
    }
  };

  const handlePagarFaturaBanco = async (itensBanco, nomeBanco) => {
    const pendentes = itensBanco.filter(i => safeString(i.dados[11]).toUpperCase() !== 'PAGO');
    if (pendentes.length === 0) return;

    const itensParaAtualizar = pendentes.map(i => {
      const payload = [i.dados[5], i.dados[6], i.dados[7], i.dados[8], i.dados[9], i.dados[10], 'Pago', i.dados[12]];
      applyOptimisticUpdate('bdLancamentos', i.linha, payload, 'atualizar');
      return { linha: i.linha, payload };
    });

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'atualizar_lote', aba: 'bdLancamentos', itens: itensParaAtualizar })
      });
      const json = await res.json();
      if (!json.success) {
        for (const item of itensParaAtualizar) {
          await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'atualizar', aba: 'bdLancamentos', linha: item.linha, payload: item.payload })
          });
        }
      }
      setSyncStatus('synced');
      fetchDados(true);
      showToast(`Fatura ${nomeBanco} marcada como Paga!`);
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao quitar fatura.", "error");
      fetchDados(true);
    }
  };

  const handleExcluir = async (linha, aba) => {
    applyOptimisticUpdate(aba, linha, null, 'excluir');
    setCustomDialog(null);
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'excluir', aba, linha })
      });
      if ((await res.json()).success) {
        setSyncStatus('synced');
        fetchDados(true);
        showToast("Registo apagado!");
      } else throw new Error();
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao excluir.", "error");
      fetchDados(true);
    }
  };

  const abrirEdicao = (item, tipoStr) => {
    setEditItem(item);
    if (tipoStr === 'devedor' && isDividaAparte(item)) {
      setModalType('divida_aparte');
    } else {
      setModalType(tipoStr);
    }
    setIsModalOpen(true);
  };

  const abrirNovaDividaAparte = (nomeCliente = '') => {
    setEditItem(null);
    setDevedorPreSelecionado(nomeCliente);
    setModalType('divida_aparte');
    setIsModalOpen(true);
  };

  const cartoesDoMes = gastosCartao.filter(g => {
    const dFatura = parseDataBR(g.dados[5]);
    return dFatura && dFatura.getMonth() === mesAtual && dFatura.getFullYear() === anoAtual;
  });

  const calcCaixaLivre = () => {
    let renda = 0;
    let saida = 0;
    let lucroCobranca = 0;
    
    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        renda += parseCurrency(s.dados[11]);
      }
    });
    
    cartoesDoMes.forEach(g => {
      saida += parseCurrency(g.dados[7]);
    });
    
    devedores.forEach(dev => {
      // Se for uma Dívida à Parte marcada apenas como lembrete, não interfere no Caixa Livre do mês
      if (isDividaAparte(dev) && !isAparteComCaixa(dev)) return;

      const dAcordo = parseDataBR(dev.dados[5]);
      const vOriginal = parseCurrency(dev.dados[7]);
      const juros = parseCurrency(dev.dados[10]);
      const status = safeString(dev.dados[9]);
      const montanteFinal = vOriginal + (vOriginal * (juros / 100));

      if (dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual && status !== 'Concluído') {
        saida += vOriginal;
      }
      if (status === 'Concluído' && dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual) {
        renda += montanteFinal;
        lucroCobranca += (montanteFinal - vOriginal);
      }
    });
    
    historicoOrdens.forEach(o => {
      const d = parseDataBR(o.dados[5]); 
      if (!d || d.getMonth() !== mesAtual || d.getFullYear() !== anoAtual) return;

      const tipoOp = safeString(o.dados[7]).toUpperCase();
      const qtd = parseCurrency(o.dados[8]);
      const col9 = parseCurrency(o.dados[9]);

      if (tipoOp.includes('COMPRA')) {
        // Na compra lançada pelo App, col9 já armazena o Valor Pago Total R$
        saida += col9;
      } else if (tipoOp.includes('VENDA') || tipoOp.includes('RESGATE') || tipoOp.includes('PROVENTO')) {
        // Na venda/resgate/provento, qtd * precoUnitario = Valor Total Recebido
        renda += (qtd * col9);
      }
    });

    return { 
      renda: Number(renda.toFixed(2)), 
      saida: Number(saida.toFixed(2)), 
      livre: Number((renda - saida).toFixed(2)), 
      lucroCobranca: Number(lucroCobranca.toFixed(2)) 
    };
  };

  const dadosCaixa = calcCaixaLivre();
  const nomesClientesExistentes = Array.from(new Set(devedores.map(d => safeString(d.dados[6])).filter(Boolean)));

  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-500 flex flex-col items-center justify-center font-black">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="tracking-widest uppercase animate-pulse">Carregando a Central Financeira...</p>
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
                <h3 className="text-center text-xl font-black text-white mb-2">Excluir Registo?</h3>
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
            {customDialog.type === 'abater_aparte' && (
              <AbaterAparteModal item={customDialog.item} onClose={() => setCustomDialog(null)} onSave={handleGravarDados} />
            )}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 p-4">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-emerald-500 italic tracking-tighter">APPFINANCE</h1>
            <button onClick={() => fetchDados(true)} className={`${syncStatus === 'syncing' ? 'animate-spin text-emerald-500' : 'text-slate-500 hover:text-emerald-400'} transition-all`} title="Sincronizar"><RefreshCw size={18}/></button>
            <button onClick={() => setHideValues(!hideValues)} className="text-slate-500 hover:text-emerald-400 transition-all" title={hideValues ? "Mostrar Valores" : "Ocultar Valores"}>
              {hideValues ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">
            <button onClick={() => { setMesAtual(p => p === 0 ? 11 : p - 1); if (mesAtual === 0) setAnoAtual(a => a - 1); }} className="p-1"><ChevronLeft size={16}/></button>
            <span className="min-w-[85px] text-center">{meses[mesAtual]} {anoAtual}</span>
            <button onClick={() => { setMesAtual(p => p === 11 ? 0 : p + 1); if (mesAtual === 11) setAnoAtual(a => a + 1); }} className="p-1"><ChevronRight size={16}/></button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <ResumoView
            dadosCaixa={dadosCaixa}
            salarios={salarios}
            hist={historicoOrdens}
            mes={mesAtual}
            ano={anoAtual}
            hideValues={hideValues}
            onEdit={i => abrirEdicao(i, 'salario')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdRendas', linha: l, message: 'Isso apagará o lançamento do histórico.' })}
          />
        )}
        
        {activeTab === 'patrimonio' && !carteiraDetalhe && (
          <CarteiraView
            ativosVar={ativosVariaveis}
            hist={historicoOrdens}
            ativosFixos={ativosFixos}
            liveCrypto={cryptoLivePrices}
            cdiMensal={cdiMensal}
            hideValues={hideValues}
            onAbrirDetalhe={setCarteiraDetalhe}
          />
        )}
        {activeTab === 'patrimonio' && carteiraDetalhe && (
          <CarteiraDetalheView
            tipo={carteiraDetalhe}
            ativosVar={ativosVariaveis}
            hist={historicoOrdens}
            ativosFixos={ativosFixos}
            liveCrypto={cryptoLivePrices}
            cdiMensal={cdiMensal}
            hideValues={hideValues}
            onVoltar={() => setCarteiraDetalhe(null)}
            onDelete={(l, a) => setCustomDialog({ type: 'delete', aba: a, linha: l, message: 'A operação será apagada do histórico.' })}
            onEdit={(i, action, extra) => {
              if (action === 'resgate') {
                setEditItem(i);
                setResgateAtivoTipo(extra || '');
                setModalType('resgate');
                setIsModalOpen(true);
              } else {
                abrirEdicao(i, 'ativo');
              }
            }}
          />
        )}
        
        {activeTab === 'devedores' && !clienteAtivo && (
          <DevedoresView
            items={devedores}
            hideValues={hideValues}
            onAbrirCliente={setClienteAtivo}
            onNovaDividaAparte={() => abrirNovaDividaAparte('')}
            onEdit={i => abrirEdicao(i, 'devedor')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdDevedores', linha: l, message: 'O registo será apagado permanentemente.' })}
            onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], s, i.dados[10], i.dados[11]], 'bdDevedores', i.linha)}
            onAbaterAparte={item => setCustomDialog({ type: 'abater_aparte', item })}
          />
        )}
        {activeTab === 'devedores' && clienteAtivo && (
          <ClienteDossieView
            nome={clienteAtivo}
            items={devedores}
            hideValues={hideValues}
            onVoltar={() => setClienteAtivo(null)}
            onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], s, i.dados[10], i.dados[11]], 'bdDevedores', i.linha)}
            onEdit={i => abrirEdicao(i, 'devedor')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdDevedores', linha: l, message: 'A dívida será apagada permanentemente.' })}
            onRolar={(item, totalAtual) => setCustomDialog({ type: 'rolar', item, totalAtual })}
            onAbaterAparte={item => setCustomDialog({ type: 'abater_aparte', item })}
            onNovaDividaAparte={() => abrirNovaDividaAparte(clienteAtivo)}
          />
        )}
        
        {activeTab === 'cartoes' && (
          <CartoesView
            items={cartoesDoMes}
            hideValues={hideValues}
            onEdit={i => abrirEdicao(i, 'cartao')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdLancamentos', linha: l, message: 'A despesa sumirá da fatura.' })}
            onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], i.dados[9], i.dados[10], s, i.dados[12]], 'bdLancamentos', i.linha)}
            onPagarFaturaBanco={handlePagarFaturaBanco}
          />
        )}
      </div>

      <nav className="fixed bottom-0 w-full bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/50 flex justify-around items-center p-3 z-50 pb-safe">
        <NavButton active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setCarteiraDetalhe(null); setClienteAtivo(null); }} icon={<PieChart size={24} />} label="Resumo" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => { setActiveTab('patrimonio'); setCarteiraDetalhe(null); }} icon={<Briefcase size={24} />} label="Carteira" />
        <button onClick={() => { setEditItem(null); setDevedorPreSelecionado(''); setModalType('escolha'); setIsModalOpen(true); }} className="bg-emerald-600 text-white p-5 rounded-[2rem] shadow-lg -translate-y-6 border-4 border-slate-950 active:scale-90 transition-all"><PlusCircle size={32} /></button>
        <NavButton active={activeTab === 'devedores'} onClick={() => { setActiveTab('devedores'); setClienteAtivo(null); }} icon={<Users size={24} />} label="Cobranças" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => { setActiveTab('cartoes'); }} icon={<CreditCard size={24} />} label="Cartões" />
      </nav>

      {isModalOpen && (
        <LancamentoModal
          tipo={modalType}
          setTipo={setModalType}
          editItem={editItem}
          resgateAtivoTipo={resgateAtivoTipo}
          devedorPreSelecionado={devedorPreSelecionado}
          nomesClientes={nomesClientesExistentes}
          onClose={() => { setIsModalOpen(false); setEditItem(null); setDevedorPreSelecionado(''); }}
          onSave={handleGravarDados}
          onSaveLote={handleGravarLote}
          meusBancos={meusBancos}
          infoBancos={infoBancos}
          cdiMensal={cdiMensal}
          setCustomDialog={setCustomDialog}
        />
      )}
    </main>
  );
}

// ==========================================
// VIEWS DE INTERFACE
// ==========================================

function ResumoView({ dadosCaixa, salarios, hist, mes, ano, hideValues, onEdit, onDelete }) {
  const filtrados = salarios.filter(s => {
    const d = parseDataBR(s.dados[5]);
    return d && d.getMonth() === mes && d.getFullYear() === ano;
  });
  const proventosMes = hist.filter(o => {
    const d = parseDataBR(o.dados[5]);
    return safeString(o.dados[7]).toUpperCase() === 'PROVENTO' && d && d.getMonth() === mes && d.getFullYear() === ano;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Caixa Livre (Mês)</p>
        <p className={`text-4xl font-black ${dadosCaixa.livre >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {formatMoney(dadosCaixa.livre, hideValues)}</p>
        <div className="mt-6 flex flex-wrap gap-6 text-[10px] font-bold uppercase text-slate-500">
          <div><span className="block text-blue-400 text-xs">R$ {formatMoney(dadosCaixa.renda, hideValues)}</span>Entradas</div>
          <div><span className="block text-red-400 text-xs">R$ {formatMoney(dadosCaixa.saida, hideValues)}</span>Saídas</div>
          {dadosCaixa.lucroCobranca > 0 && (
            <div><span className="block text-amber-400 text-xs">+R$ {formatMoney(dadosCaixa.lucroCobranca, hideValues)}</span>Lucro Juros</div>
          )}
        </div>
      </div>
      
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1">Rendas & Salários</h3>
      {filtrados.length === 0 ? <p className="text-xs text-slate-600 italic">Sem registos neste mês.</p> : filtrados.map((item, idx) => {
        const desc = safeString(item.dados[12]) || 'Salário / Recebimento';
        return (
          <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center"><Banknote size={18}/></div>
              <div>
                <p className="text-sm font-black">{desc}</p>
                <p className="text-[9px] text-slate-500 uppercase">{formatDateToBR(parseDataBR(item.dados[5]))}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm font-black text-blue-400">R$ {formatMoney(parseCurrency(item.dados[11]), hideValues)}</p>
              <div className="flex gap-2">
                <button onClick={() => onEdit(item)} className="p-3 bg-slate-800 rounded-xl text-blue-400 active:scale-90"><Edit size={18}/></button>
                <button onClick={() => onDelete(item.linha)} className="p-3 bg-slate-800 rounded-xl text-red-400 active:scale-90"><Trash2 size={18}/></button>
              </div>
            </div>
          </div>
        );
      })}

      <h3 className="text-xs font-black text-slate-500 uppercase ml-1 pt-4">Proventos Recebidos 🤑</h3>
      {proventosMes.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhum dividendo caiu na conta ainda.</p> : proventosMes.map((item, idx) => (
        <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center">
          <div className="flex gap-4 items-center">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center"><Coins size={18}/></div>
            <div>
              <p className="text-sm font-black uppercase">{item.dados[6]}</p>
              <p className="text-[9px] text-slate-500 uppercase">Recebido em {formatDateToBR(parseDataBR(item.dados[5]))}</p>
            </div>
          </div>
          <p className="text-sm font-black text-emerald-400">R$ {formatMoney(parseCurrency(item.dados[9]), hideValues)}</p>
        </div>
      ))}
    </div>
  );
}

function CarteiraView({ ativosVar, hist, ativosFixos, liveCrypto, cdiMensal, hideValues, onAbrirDetalhe }) {
  const acoes = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('AÇÃO') || safeString(a.dados[1]).toUpperCase().includes('ACAO'));
  const fiis = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes('FII'));
  const criptoArr = consolidarCriptos(hist, liveCrypto);

  const cValorMercado = (lista) => lista.reduce((acc, i) => acc + parseCurrency(i.dados[6]), 0); 
  const valAcoes = cValorMercado(acoes);
  const valFIIs = cValorMercado(fiis);
  const valCripto = cValorMercado(criptoArr);

  const provAcoes = acoes.reduce((acc, i) => acc + parseCurrency(i.dados[11]), 0); 
  const provFIIs = fiis.reduce((acc, i) => acc + parseCurrency(i.dados[11]), 0);
  const proventosVariavel = provAcoes + provFIIs;
  
  let rendimentoFixa = 0;
  const totalFixa = ativosFixos.reduce((acc, i) => {
    const vA = parseCurrency(i.dados[8]);
    const rf = calcFixa(vA, parseCurrency(i.dados[9]), parseDataBR(i.dados[5]), i.dados[10] || 'CDB', cdiMensal);
    rendimentoFixa += (rf.liquido - vA);
    return acc + rf.liquido;
  }, 0);

  const patrimonioTotal = valAcoes + valFIIs + valCripto + totalFixa;
  const pct = (v) => patrimonioTotal > 0 ? Math.round((v / patrimonioTotal) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-[2.5rem]">
        <div className="flex justify-between items-start mb-1">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total em Carteira</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase">CDI: {(cdiMensal * 100).toFixed(2)}% a.m.</span>
            {Object.keys(liveCrypto).length > 0 && <Activity size={14} className="text-emerald-500 animate-pulse" title="Cotações Binance Ao Vivo" />}
          </div>
        </div>
        <p className="text-4xl font-black text-white">R$ {formatMoney(patrimonioTotal, hideValues)}</p>

        {/* Barra Visual de Distribuição da Carteira */}
        {patrimonioTotal > 0 && (
          <div className="mt-5">
            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex gap-0.5">
              {valAcoes > 0 && <div style={{ width: `${(valAcoes / patrimonioTotal) * 100}%` }} className="bg-indigo-500" title={`Ações: ${pct(valAcoes)}%`} />}
              {valFIIs > 0 && <div style={{ width: `${(valFIIs / patrimonioTotal) * 100}%` }} className="bg-violet-500" title={`FIIs: ${pct(valFIIs)}%`} />}
              {valCripto > 0 && <div style={{ width: `${(valCripto / patrimonioTotal) * 100}%` }} className="bg-amber-500" title={`Cripto: ${pct(valCripto)}%`} />}
              {totalFixa > 0 && <div style={{ width: `${(totalFixa / patrimonioTotal) * 100}%` }} className="bg-emerald-500" title={`Renda Fixa: ${pct(totalFixa)}%`} />}
            </div>
            <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mt-2">
              <span className="text-indigo-400">Ações {pct(valAcoes)}%</span>
              <span className="text-violet-400">FIIs {pct(valFIIs)}%</span>
              <span className="text-amber-400">Cripto {pct(valCripto)}%</span>
              <span className="text-emerald-400">Fixa {pct(totalFixa)}%</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-indigo-500/20">
          <div>
            <p className="text-[9px] text-slate-500 uppercase font-black">Rendimentos (Variável)</p>
            <p className="text-sm font-black text-violet-400">R$ {formatMoney(proventosVariavel, hideValues)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase font-black">Rendimentos (Fixa Líq.)</p>
            <p className="text-sm font-black text-blue-400">+R$ {formatMoney(rendimentoFixa, hideValues)}</p>
          </div>
          <div className="col-span-2 text-center pt-2">
            <p className="text-[9px] text-slate-500 uppercase font-black">Total de Ganhos (Previstos + Juros Líq.)</p>
            <p className="text-lg font-black text-emerald-400">R$ {formatMoney(proventosVariavel + rendimentoFixa, hideValues)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard title="Ações" val={valAcoes} hideValues={hideValues} color="text-indigo-400" onClick={() => onAbrirDetalhe('Ação')} />
        <InfoCard title="FIIs" val={valFIIs} hideValues={hideValues} color="text-violet-400" onClick={() => onAbrirDetalhe('FII')} />
        <InfoCard title="Criptos" val={valCripto} hideValues={hideValues} color="text-amber-400" onClick={() => onAbrirDetalhe('Cripto')} />
        <InfoCard title="Renda Fixa" val={totalFixa} hideValues={hideValues} color="text-emerald-400" onClick={() => onAbrirDetalhe('Renda Fixa')} />
      </div>
    </div>
  );
}

function CarteiraDetalheView({ tipo, ativosVar, hist, ativosFixos, liveCrypto, cdiMensal, hideValues, onVoltar, onEdit, onDelete }) {
  const isF = tipo === 'Renda Fixa';
  let lista = [];
  
  if (isF) {
    lista = ativosFixos;
  } else if (tipo === 'Cripto') {
    lista = consolidarCriptos(hist, liveCrypto);
  } else {
    lista = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes(tipo.toUpperCase()));
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase mb-4"><ArrowLeft size={16}/> Voltar</button>
      <h3 className="text-lg font-black text-white uppercase tracking-widest">{tipo} Detalhado</h3>
      
      {!isF && tipo !== 'Cripto' && (
        <div className="mb-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
          <Info size={20} className="text-blue-500 shrink-0 mt-0.5"/> 
          <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
            Suas cotações da B3 são atualizadas via GOOGLEFINANCE na planilha (Aba DB_Investimentos_Variaveis). Ao registrar compras ou vendas pelo App, o motor recalcula seu preço médio automaticamente.
          </p>
        </div>
      )}

      {lista.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhum ativo listado.</p> : lista.map((i, idx) => {
        if (isF) {
          const dataApp = parseDataBR(i.dados[5]);
          const dataVenc = parseDataBR(i.dados[6]);
          const nome = i.dados[7]; 
          const vA = parseCurrency(i.dados[8]); 
          const taxa = parseCurrency(i.dados[9]);
          const subTipo = i.dados[10] || 'CDB';
          const calc = calcFixa(vA, taxa, dataApp, subTipo, cdiMensal);
          
          return (
            <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-black text-lg uppercase text-slate-100">{nome}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    {subTipo} • Taxa: {taxa}{taxa > 20 ? '% CDI' : '% a.m'} {calc.irRate === 0 ? '• Isento IR' : `• IR ${(calc.irRate * 100).toFixed(1)}%`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(i, 'resgate', 'Renda Fixa')} className="bg-slate-800 p-3 rounded-xl text-emerald-400 active:scale-90" title="Resgatar"><HandCoins size={20}/></button>
                  <button onClick={() => onEdit(i, 'edit')} className="bg-slate-800 p-3 rounded-xl text-blue-400 active:scale-90"><Edit size={20}/></button>
                  <button onClick={() => onDelete(i.linha, 'DB_Investimentos_Fixos')} className="bg-slate-800 p-3 rounded-xl text-red-400 active:scale-90"><Trash2 size={20}/></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
                <div><p className="text-[8px] font-black text-slate-500 uppercase">Aplicado em {formatDateToBR(dataApp)}</p><p className="text-sm font-black text-slate-300">R$ {formatMoney(vA, hideValues)}</p></div>
                <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Juros (Bruto)</p><p className="text-sm font-black text-blue-400">+R$ {formatMoney(calc.lucro, hideValues)}</p></div>
                <div><p className="text-[8px] font-black text-slate-500 uppercase">Imposto de Renda Retido</p><p className="text-sm font-black text-red-400">-R$ {formatMoney(calc.ir, hideValues)}</p></div>
                <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Líquido Disponível</p><p className="text-sm font-black text-emerald-400">R$ {formatMoney(calc.liquido, hideValues)}</p></div>
                {dataVenc && (
                  <div className="col-span-2 pt-2 border-t border-slate-800/50 mt-2"><p className="text-[8px] font-black text-slate-500 uppercase">Data de Vencimento</p><p className="text-xs font-black text-amber-500">{formatDateToBR(dataVenc)}</p></div>
                )}
              </div>
            </div>
          );
        }

        const ticker = i.dados[0];
        const qtd = parseCurrency(i.dados[2]);
        const precoMedio = parseCurrency(i.dados[3]); 
        const custoTotal = parseCurrency(i.dados[4]);
        const valorMercado = parseCurrency(i.dados[6]); 
        const lucroAbs = parseCurrency(i.dados[7]);
        const provento = parseCurrency(i.dados[11]);
        const dataProv = safeString(i.dados[12]); 

        return (
          <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-[2rem]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-black text-lg uppercase text-slate-100">{ticker}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Qtd: {qtd} • PM: R$ {formatMoney(precoMedio, hideValues)}</p>
              </div>
              <div className="flex gap-2 items-center">
                {i.isHist && (
                  <div className="text-[9px] bg-amber-900/30 text-amber-500 px-2 py-1 rounded-lg flex items-center gap-1 h-min mr-1">
                    <History size={12}/> Binance Live
                  </div>
                )}
                <button onClick={() => onEdit(i, 'resgate', tipo)} className="bg-slate-800 p-3 rounded-xl text-emerald-400 active:scale-90" title="Vender/Resgatar"><HandCoins size={20}/></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
              <div><p className="text-[8px] font-black text-slate-500 uppercase">Investido (Custo)</p><p className="text-sm font-black text-slate-300">R$ {formatMoney(custoTotal, hideValues)}</p></div>
              <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Valor Atual (Mercado)</p><p className="text-sm font-black text-emerald-400">R$ {formatMoney(valorMercado, hideValues)}</p></div>
              <div><p className="text-[8px] font-black text-slate-500 uppercase">{tipo === 'Cripto' ? 'Valorização' : 'Lucro Absoluto'}</p><p className={`text-sm font-black ${lucroAbs >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {formatMoney(lucroAbs, hideValues)}</p></div>
              {tipo !== 'Cripto' && (
                <div className="text-right"><p className="text-[8px] font-black text-slate-500 uppercase">Proventos Previstos</p><p className="text-sm font-black text-violet-400">R$ {formatMoney(provento, hideValues)} • {dataProv || '--/--'}</p></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DevedoresView({ items, hideValues, onAbrirCliente, onNovaDividaAparte, onEdit, onDelete, onStatusChange, onAbaterAparte }) {
  const [abaDevedores, setAbaDevedores] = useState('juros'); // 'juros' ou 'aparte'
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const itensJuros = items.filter(i => !isDividaAparte(i));
  const itensAparte = items.filter(i => isDividaAparte(i));

  // Agrupamento de clientes (Acordos c/ Juros + indicador de dívida à parte)
  const c = {};
  let tE = 0;
  let tR = 0;
  let luc = 0;

  itensJuros.forEach(i => {
    const n = safeString(i.dados[6]) || 'Sem Nome';
    if (!c[n]) c[n] = { n, e: 0, p: 0, a: 0, apartePendente: 0 };
    const emp = parseCurrency(i.dados[7]);
    const status = safeString(i.dados[9]);
    const j = parseCurrency(i.dados[10]); 
    const montante = emp + (emp * (j / 100)); 
    
    if (status !== 'Concluído') { c[n].e += emp; c[n].a += 1; tE += emp; } 
    if (status === 'Concluído') { c[n].p += montante; tR += montante; luc += (montante - emp); } 
  });

  // Totais das Dívidas à Parte (Sem Juros)
  let totalApartePendente = 0;
  let totalApartePago = 0;
  let qtdApartePendente = 0;

  itensAparte.forEach(i => {
    const n = safeString(i.dados[6]) || 'Sem Nome';
    const val = parseCurrency(i.dados[7]);
    const status = safeString(i.dados[9]);
    if (status !== 'Concluído') {
      totalApartePendente += val;
      qtdApartePendente += 1;
      if (c[n]) c[n].apartePendente += val;
    } else {
      totalApartePago += val;
    }
  });

  const clientesVisiveis = Object.values(c).filter(cli => mostrarConcluidos || cli.a > 0 || cli.apartePendente > 0);
  clientesVisiveis.sort((a, b) => (b.a - a.a) || (b.e - a.e));

  const listaAparteVisivel = itensAparte
    .filter(i => mostrarConcluidos || safeString(i.dados[9]) !== 'Concluído')
    .sort((a, b) => {
      const aP = safeString(a.dados[9]) !== 'Concluído';
      const bP = safeString(b.dados[9]) !== 'Concluído';
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return (parseDataBR(a.dados[8])?.getTime() || 9999999999999) - (parseDataBR(b.dados[8])?.getTime() || 9999999999999);
    });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Seletor entre Acordos com Juros e Dívidas à Parte (Sem Juros) */}
      <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1">
        <button
          onClick={() => setAbaDevedores('juros')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${abaDevedores === 'juros' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Users size={15}/> Acordos c/ Juros
        </button>
        <button
          onClick={() => setAbaDevedores('aparte')}
          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${abaDevedores === 'aparte' ? 'bg-teal-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <Bookmark size={15}/> Dívidas à Parte
          {qtdApartePendente > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${abaDevedores === 'aparte' ? 'bg-black/30 text-white' : 'bg-teal-900/50 text-teal-400'}`}>
              {qtdApartePendente}
            </span>
          )}
        </button>
      </div>

      {abaDevedores === 'juros' ? (
        <>
          <div className="bg-amber-600/10 border border-amber-500/20 p-8 rounded-[2.5rem] shadow-xl relative">
            <button onClick={() => setMostrarConcluidos(!mostrarConcluidos)} className="absolute top-6 right-6 text-[9px] font-black uppercase text-amber-500/70 bg-amber-900/20 px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1">
              {mostrarConcluidos ? <><EyeOff size={12}/> Ocultar Concluídos</> : <><Eye size={12}/> Mostrar Todos</>}
            </button>
            <p className="text-[10px] font-black text-amber-500 uppercase mb-1">Dinheiro na Rua (c/ Juros)</p>
            <p className="text-4xl font-black">R$ {formatMoney(tE, hideValues)}</p>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-amber-500/20">
              <div><p className="text-[9px] text-slate-500 uppercase font-black">Recebido c/ Juros</p><p className="text-lg font-black text-emerald-400">R$ {formatMoney(tR, hideValues)}</p></div>
              <div><p className="text-[9px] text-slate-500 uppercase font-black">Lucro Realizado</p><p className={`text-lg font-black ${luc >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {formatMoney(luc, hideValues)}</p></div>
            </div>
          </div>

          {clientesVisiveis.length === 0 ? (
            <p className="text-xs text-slate-600 italic text-center py-4">Nenhum cliente com acordo ativo.</p>
          ) : (
            clientesVisiveis.map((cli, idx) => (
              <div key={idx} onClick={() => onAbrirCliente(cli.n)} className={`p-4 border rounded-3xl flex justify-between items-center cursor-pointer active:scale-95 transition-all ${cli.a === 0 ? 'bg-slate-900/50 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800'}`}>
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${cli.a === 0 ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-amber-500/10 text-amber-500 border-amber-900/20'}`}><Users size={20}/></div>
                  <div>
                    <p className="text-sm font-black">{cli.n}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <p className="text-[9px] text-slate-500 uppercase">{cli.a === 0 ? <span className="text-emerald-500">Acordos Concluídos</span> : `${cli.a} cobranças ativas`}</p>
                      {cli.apartePendente > 0 && (
                        <span className="text-[8px] font-black uppercase bg-teal-950 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-lg">
                          + R$ {formatMoney(cli.apartePendente, hideValues)} à parte
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className={`text-sm font-black ${cli.a === 0 ? 'text-slate-500' : 'text-amber-400'}`}>R$ {formatMoney(cli.e, hideValues)}</p>
              </div>
            ))
          )}
        </>
      ) : (
        /* ABA DE DÍVIDAS À PARTE (SEM JUROS / LEMBRETES MANUAIS) */
        <>
          <div className="bg-teal-900/15 border border-teal-500/25 p-8 rounded-[2.5rem] shadow-xl relative">
            <button onClick={() => setMostrarConcluidos(!mostrarConcluidos)} className="absolute top-6 right-6 text-[9px] font-black uppercase text-teal-400/80 bg-teal-950/60 px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1">
              {mostrarConcluidos ? <><EyeOff size={12}/> Ocultar Pagos</> : <><Eye size={12}/> Mostrar Pagos</>}
            </button>
            <p className="text-[10px] font-black text-teal-400 uppercase mb-1">Dívidas à Parte (Sem Juros / Lembretes)</p>
            <p className="text-4xl font-black text-white">R$ {formatMoney(totalApartePendente, hideValues)}</p>
            <p className="text-[10px] text-slate-400 mt-2">Controle de coisas que você emprestou sem juros para não esquecer.</p>

            <div className="flex justify-between items-center mt-6 pt-5 border-t border-teal-500/20">
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-black">Já Devolvido / Pago</p>
                <p className="text-base font-black text-emerald-400">R$ {formatMoney(totalApartePago, hideValues)}</p>
              </div>
              <button
                onClick={onNovaDividaAparte}
                className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                <PlusCircle size={16}/> Anotar Dívida à Parte
              </button>
            </div>
          </div>

          {listaAparteVisivel.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 text-center">
              <Bookmark className="mx-auto text-teal-500/40 mb-3" size={32}/>
              <p className="text-sm font-black text-slate-300 mb-1">Nenhuma dívida à parte pendente</p>
              <p className="text-xs text-slate-500 mb-4">Emprestou dinheiro ou algo sem juros para alguém? Anote aqui para lembrar.</p>
              <button onClick={onNovaDividaAparte} className="bg-teal-600/20 text-teal-400 border border-teal-500/30 px-5 py-3 rounded-2xl text-xs font-black uppercase active:scale-95">
                + Adicionar Lembrete Sem Juros
              </button>
            </div>
          ) : (
            listaAparteVisivel.map((item, idx) => (
              <CardDividaAparte
                key={idx}
                item={item}
                hideValues={hideValues}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item.linha)}
                onStatusChange={onStatusChange}
                onAbater={() => onAbaterAparte(item)}
                onAbrirCliente={() => onAbrirCliente(safeString(item.dados[6]))}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}

function CardDividaAparte({ item, hideValues, onEdit, onDelete, onStatusChange, onAbater, onAbrirCliente, showClientName = true }) {
  const nome = safeString(item.dados[6]) || 'Sem Nome';
  const valor = parseCurrency(item.dados[7]);
  const dEmprestimo = parseDataBR(item.dados[5]);
  const dVenc = parseDataBR(item.dados[8]);
  const isConcluido = safeString(item.dados[9]) === 'Concluído';
  const motivo = getDescricaoAparte(item);
  const afetaCaixa = isAparteComCaixa(item);

  let diasTexto = "";
  let diasCor = "text-slate-500";
  if (!isConcluido && dVenc) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const v = new Date(dVenc); v.setHours(0, 0, 0, 0);
    const diffDias = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));

    if (diffDias > 1) { diasTexto = `Previsão: ${diffDias} dias`; diasCor = "text-teal-400"; }
    else if (diffDias === 1) { diasTexto = `Previsão: Amanhã`; diasCor = "text-amber-400"; }
    else if (diffDias === 0) { diasTexto = `Combinado p/ HOJE`; diasCor = "text-red-400 font-black animate-pulse"; }
    else { diasTexto = `Passou ${Math.abs(diffDias)} dias da data`; diasCor = "text-red-500 font-black"; }
  }

  return (
    <div className={`p-5 border rounded-[2rem] transition-all ${isConcluido ? 'bg-slate-900/40 border-slate-800/40 opacity-65' : 'bg-slate-900 border-teal-500/25'}`}>
      <div className="flex justify-between items-start gap-2 mb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${isConcluido ? 'bg-slate-800 text-slate-500' : 'bg-teal-950 text-teal-400 border border-teal-500/30'}`}>
              {isConcluido ? 'Pago / Devolvido' : 'Sem Juros • À Parte'}
            </span>
            <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
              {afetaCaixa ? 'No Caixa' : 'Só Lembrete'}
            </span>
          </div>
          {showClientName && (
            <button onClick={onAbrirCliente} className="text-base font-black text-white hover:text-teal-400 transition-colors mt-2 block text-left">
              {nome}
            </button>
          )}
          <p className="text-xs font-bold text-teal-300/90 mt-1">{motivo}</p>
          {!isConcluido && dVenc && <p className={`text-[10px] mt-1 uppercase font-black ${diasCor}`}>{diasTexto}</p>}
        </div>

        <div className="flex gap-1.5 shrink-0">
          {!isConcluido && (
            <button
              onClick={() => cobrarWhatsApp(nome, valor, dVenc ? formatDateToBR(dVenc) : '', motivo)}
              className="bg-emerald-950/80 border border-emerald-500/30 p-2.5 rounded-xl text-emerald-400 active:scale-90"
              title="Lembrar no WhatsApp"
            >
              <MessageCircle size={18}/>
            </button>
          )}
          <button onClick={onEdit} className="bg-slate-800 p-2.5 rounded-xl text-blue-400 active:scale-90" title="Editar"><Edit size={18}/></button>
          <button onClick={onDelete} className="bg-slate-800 p-2.5 rounded-xl text-red-400 active:scale-90" title="Excluir"><Trash2 size={18}/></button>
          <button
            onClick={() => onStatusChange(item, isConcluido ? 'Pendente' : 'Concluído')}
            className={`p-2.5 rounded-xl active:scale-90 transition-all ${isConcluido ? 'bg-amber-900/20 text-amber-500' : 'bg-emerald-900/20 text-emerald-500'}`}
            title={isConcluido ? "Reabrir" : "Marcar como Pago"}
          >
            {isConcluido ? <RotateCcw size={18}/> : <CheckCircle size={18}/>}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-end border-t border-slate-800 pt-3 mt-2">
        <div className="text-[10px] text-slate-500 font-bold uppercase space-y-0.5">
          <p>Emprestado em: <span className="text-slate-300">{dEmprestimo ? formatDateToBR(dEmprestimo) : '--/--/----'}</span></p>
          {dVenc && <p>Combinado p/: <span className="text-slate-300">{formatDateToBR(dVenc)}</span></p>}
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-500 uppercase">Valor a Receber</p>
          <p className={`text-lg font-black ${isConcluido ? 'text-slate-500 line-through' : 'text-teal-400'}`}>R$ {formatMoney(valor, hideValues)}</p>
        </div>
      </div>

      {!isConcluido && (
        <button
          onClick={onAbater}
          className="w-full mt-3 bg-teal-950/60 text-teal-400 border border-teal-500/25 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all"
        >
          <HandCoins size={15}/> Abater Pagamento Parcial
        </button>
      )}
    </div>
  );
}

function ClienteDossieView({ nome, items, hideValues, onVoltar, onStatusChange, onEdit, onDelete, onRolar, onAbaterAparte, onNovaDividaAparte }) {
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const todosDoCliente = items.filter(i => safeString(i.dados[6]) === nome);
  const filtradosJuros = todosDoCliente.filter(i => !isDividaAparte(i));
  const filtradosAparte = todosDoCliente.filter(i => isDividaAparte(i));

  let tE = 0; let tR = 0; let luc = 0;
  filtradosJuros.forEach(i => {
    const vO = parseCurrency(i.dados[7]);
    const j = parseCurrency(i.dados[10]);
    const isConcluido = safeString(i.dados[9]) === 'Concluído';
    const montante = vO + (vO * (j / 100));
    
    if (!isConcluido) tE += vO; 
    if (isConcluido) { tR += montante; luc += (montante - vO); }
  });

  let totalAparteCliente = 0;
  filtradosAparte.forEach(i => {
    if (safeString(i.dados[9]) !== 'Concluído') totalAparteCliente += parseCurrency(i.dados[7]);
  });

  filtradosJuros.sort((a, b) => {
    const aPendente = safeString(a.dados[9]) !== 'Concluído';
    const bPendente = safeString(b.dados[9]) !== 'Concluído';
    if (aPendente && !bPendente) return -1;
    if (!aPendente && bPendente) return 1;
    const dateA = parseDataBR(a.dados[8])?.getTime() || 0;
    const dateB = parseDataBR(b.dados[8])?.getTime() || 0;
    return dateA - dateB;
  });

  const visiveisJuros = mostrarConcluidos ? filtradosJuros : filtradosJuros.filter(i => safeString(i.dados[9]) !== 'Concluído');
  const visiveisAparte = mostrarConcluidos ? filtradosAparte : filtradosAparte.filter(i => safeString(i.dados[9]) !== 'Concluído');

  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onVoltar} className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase"><ArrowLeft size={16}/> Voltar</button>
        <button onClick={() => setMostrarConcluidos(!mostrarConcluidos)} className="text-[9px] font-black uppercase text-amber-500/70 bg-amber-900/20 px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1">
          {mostrarConcluidos ? <><EyeOff size={12}/> Ocultar Concluídos</> : <><Eye size={12}/> Mostrar Todos</>}
        </button>
      </div>
      
      <div className="bg-amber-600/10 border border-amber-500/20 p-6 rounded-[2.5rem]">
        <div className="flex justify-between items-start mb-4">
          <p className="text-3xl font-black">{nome}</p>
          <button
            onClick={onNovaDividaAparte}
            className="bg-teal-600/20 border border-teal-500/40 text-teal-400 px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 active:scale-95"
          >
            <Bookmark size={12}/> + Dívida à Parte
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-amber-500/20 pt-4">
          <div><p className="text-[8px] text-slate-500 uppercase font-black">Emprestado Ativo</p><p className="text-sm font-black text-amber-400">R$ {formatMoney(tE, hideValues)}</p></div>
          <div><p className="text-[8px] text-slate-500 uppercase font-black">Recebido</p><p className="text-sm font-black text-emerald-400">R$ {formatMoney(tR, hideValues)}</p></div>
          <div><p className="text-[8px] text-slate-500 uppercase font-black">Lucro Juros</p><p className="text-sm font-black text-blue-400">R$ {formatMoney(luc, hideValues)}</p></div>
        </div>
        {totalAparteCliente > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-500/10 flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-teal-400">📌 Dívidas à Parte (Sem Juros):</span>
            <span className="text-xs font-black text-teal-400">R$ {formatMoney(totalAparteCliente, hideValues)}</span>
          </div>
        )}
      </div>

      {/* Seção de Dívidas à Parte deste cliente */}
      {visiveisAparte.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-400 ml-1 flex items-center gap-1.5">
            <Bookmark size={13}/> Dívidas à Parte / Sem Juros de {nome}
          </h4>
          {visiveisAparte.map((item, idx) => (
            <CardDividaAparte
              key={idx}
              item={item}
              hideValues={hideValues}
              showClientName={false}
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.linha)}
              onStatusChange={onStatusChange}
              onAbater={() => onAbaterAparte(item)}
            />
          ))}
        </div>
      )}
      
      {/* Seção de Acordos com Juros */}
      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 ml-1 pt-2">Acordos com Juros</h4>
      {visiveisJuros.length === 0 ? <p className="text-xs text-slate-600 italic">Nenhum acordo com juros para mostrar.</p> : visiveisJuros.map((i, idx) => {
        const vO = parseCurrency(i.dados[7]);
        const j = parseCurrency(i.dados[10]); 
        const dO = parseDataBR(i.dados[5]);
        const dVenc = parseDataBR(i.dados[8]);
        const total = vO + (vO * (j / 100)); 
        const isConcluido = safeString(i.dados[9]) === 'Concluído';

        let diasTexto = "";
        let diasCor = "text-slate-500";
        if (!isConcluido && dVenc) {
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
          const v = new Date(dVenc); v.setHours(0, 0, 0, 0);
          const diffDias = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));

          if (diffDias > 1) { diasTexto = `Vence em ${diffDias} dias`; diasCor = "text-blue-400"; }
          else if (diffDias === 1) { diasTexto = `Vence amanhã`; diasCor = "text-amber-400"; }
          else if (diffDias === 0) { diasTexto = `Vence HOJE`; diasCor = "text-red-400 font-black animate-pulse"; }
          else { diasTexto = `Atrasado há ${Math.abs(diffDias)} dias`; diasCor = "text-red-500 font-black"; }
        }

        return (
          <div key={idx} className={`p-5 border rounded-[2rem] transition-all ${isConcluido ? 'bg-slate-900/50 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${isConcluido ? 'bg-slate-800 text-slate-500' : 'bg-amber-900/50 text-amber-400'}`}>{i.dados[9]}</span>
                {!isConcluido && dVenc && <p className={`text-[10px] mt-2 uppercase font-black ${diasCor}`}>{diasTexto}</p>}
                <p className="text-[10px] font-bold text-slate-400 mt-1">Pagamento: <span className="text-white">{dVenc ? formatDateToBR(dVenc) : '--/--/----'}</span></p>
                {dO && <p className="text-[9px] text-slate-500">Acordo em: {formatDateToBR(dO)}</p>}
              </div>
              <div className="flex gap-1.5">
                {!isConcluido && (
                  <button
                    onClick={() => cobrarWhatsApp(nome, total, dVenc ? formatDateToBR(dVenc) : '')}
                    className="bg-emerald-950/80 border border-emerald-500/30 p-3 rounded-xl text-emerald-400 active:scale-90"
                    title="Cobrar via WhatsApp"
                  >
                    <MessageCircle size={18}/>
                  </button>
                )}
                <button onClick={() => onEdit(i)} className="bg-slate-800 p-3 rounded-xl text-blue-400 active:scale-90"><Edit size={18}/></button>
                <button onClick={() => onDelete(i.linha)} className="bg-slate-800 p-3 rounded-xl text-red-400 active:scale-90"><Trash2 size={18}/></button>
                <button onClick={() => onStatusChange(i, isConcluido ? 'Pendente' : 'Concluído')} className={`p-3 rounded-xl active:scale-90 transition-all ${isConcluido ? 'bg-amber-900/20 text-amber-500' : 'bg-emerald-900/20 text-emerald-500'}`}>
                  {isConcluido ? <RotateCcw size={18}/> : <CheckCircle size={18}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-slate-800 pt-3">
              <div className="text-[10px] text-slate-400 font-bold uppercase">
                Emprestado: R$ {formatMoney(vO, hideValues)}<br/>Juros: {j}%
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase">Total c/ Juros</p>
                <p className={`text-lg font-black ${isConcluido ? 'text-slate-500' : 'text-amber-400'}`}>R$ {formatMoney(total, hideValues)}</p>
              </div>
            </div>
            {!isConcluido && (
              <button onClick={() => onRolar(i, total)} className="w-full mt-4 bg-amber-900/20 text-amber-500 border border-amber-500/20 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-all"><FastForward size={16}/> Opções de Rolagem / Abater</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AbaterAparteModal({ item, onClose, onSave }) {
  const valorAtual = parseCurrency(item.dados[7]);
  const [valorPago, setValorPago] = useState('');
  const motivo = getDescricaoAparte(item);

  const confirmar = (e) => {
    e.preventDefault();
    const pago = parseCurrency(valorPago);
    if (pago <= 0) return;

    const restante = Math.max(0, Number((valorAtual - pago).toFixed(2)));
    const novoStatus = restante <= 0 ? 'Concluído' : 'Pendente';
    const novoValor = restante <= 0 ? valorAtual : restante;

    const payload = [
      item.dados[5],
      item.dados[6],
      novoValor,
      item.dados[8],
      novoStatus,
      0,
      item.dados[11]
    ];
    onSave(payload, 'bdDevedores', item.linha);
  };

  return (
    <form onSubmit={confirmar}>
      <div className="w-16 h-16 rounded-full bg-teal-900/20 text-teal-400 flex items-center justify-center mx-auto mb-4"><HandCoins size={32}/></div>
      <h3 className="text-center text-xl font-black text-white mb-1">Abater Dívida à Parte</h3>
      <p className="text-center text-xs text-slate-400 mb-4">{item.dados[6]} • {motivo}</p>
      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 mb-4 text-center">
        <span className="text-[9px] uppercase font-black text-slate-500 block">Saldo Devedor Atual</span>
        <span className="text-lg font-black text-teal-400">R$ {valorAtual.toFixed(2)}</span>
      </div>
      <input
        type="number"
        step="any"
        placeholder="Quanto a pessoa pagou agora? (R$)"
        value={valorPago}
        onChange={e => setValorPago(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white mb-4 font-bold text-sm"
        required
      />
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-300 font-bold uppercase text-xs">Cancelar</button>
        <button type="submit" className="flex-1 py-4 rounded-2xl bg-teal-600 text-white font-bold uppercase text-xs">Confirmar</button>
      </div>
    </form>
  );
}

function RolagemModal({ item, totalAtual, onClose, onSave }) {
  const hoje = new Date().toISOString().split('T')[0];
  const [dataNovaVenc, setDataNovaVenc] = useState(hoje);
  const [valorParcial, setValorParcial] = useState('');
  const vO = parseCurrency(item.dados[7]);
  const jurosAcumulados = Math.max(0, totalAtual - vO);
  const jurosM = parseCurrency(item.dados[10]);
  
  const executar = async (tipo) => {
    const dHojeBR = hoje.split('-').reverse().join('/');
    const vencNovoBR = dataNovaVenc.split('-').reverse().join('/');

    if (tipo === 'capitalizar') {
      // O montante total vira o novo principal e a data de vencimento avança para a escolhida
      const payload = [dHojeBR, item.dados[6], Number(totalAtual.toFixed(2)), vencNovoBR, "Pendente", jurosM, "Capitalizado"];
      await onSave(payload, 'bdDevedores', item.linha);
    } else if (tipo === 'juros') {
      // Recebe os juros no Caixa e mantém o principal para o novo vencimento
      const pDivida = [dHojeBR, item.dados[6], vO, vencNovoBR, "Pendente", jurosM, "Juros Pagos"];
      await onSave(pDivida, 'bdDevedores', item.linha);
      const pRenda = [dHojeBR, 0, 0, 0, 0, 0, Number(jurosAcumulados.toFixed(2)), `Lucro (Juros) rec. de ${item.dados[6]}`];
      await onSave(pRenda, 'bdRendas', null, true); 
    } else if (tipo === 'parcial') {
      const pago = parseCurrency(valorParcial);
      if (pago <= 0) return;
      const novoPrincipal = Math.max(0, Number((totalAtual - pago).toFixed(2)));
      const statusNovo = novoPrincipal <= 0 ? "Concluído" : "Pendente";
      const pDivida = [dHojeBR, item.dados[6], novoPrincipal, vencNovoBR, statusNovo, jurosM, "Abatimento Parcial"];
      await onSave(pDivida, 'bdDevedores', item.linha);

      // Se o valor pago cobriu parte ou todo o lucro de juros, lança o lucro realizado
      const lucroRealizado = Math.min(pago, jurosAcumulados);
      if (lucroRealizado > 0) {
        const pRenda = [dHojeBR, 0, 0, 0, 0, 0, Number(lucroRealizado.toFixed(2)), `Juros parcial rec. de ${item.dados[6]}`];
        await onSave(pRenda, 'bdRendas', null, true);
      }
    }
  };

  return (
    <>
      <div className="w-16 h-16 rounded-full bg-amber-900/20 text-amber-500 flex items-center justify-center mx-auto mb-3"><FastForward size={32}/></div>
      <h3 className="text-center text-xl font-black text-white mb-1">Rolagem / Abatimento</h3>
      <p className="text-center text-[10px] text-slate-400 mb-2 uppercase">Nova Data de Vencimento:</p>
      <input type="date" value={dataNovaVenc} onChange={e => setDataNovaVenc(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3.5 text-white mb-4 font-bold text-sm" />
      <div className="flex flex-col gap-2.5">
        <button onClick={() => executar('juros')} className="w-full p-3.5 rounded-2xl bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 font-bold uppercase text-[10px] tracking-widest active:scale-95 flex flex-col items-center">
          <span className="text-xs">Receber R$ {jurosAcumulados.toFixed(2)} de Juros</span>
          <span className="text-[8px] opacity-70 mt-0.5">(Gera lucro no Caixa e mantém principal R$ {vO.toFixed(2)})</span>
        </button>
        <button onClick={() => executar('capitalizar')} className="w-full p-3.5 rounded-2xl bg-amber-900/30 border border-amber-500/50 text-amber-500 font-bold uppercase text-[10px] tracking-widest active:scale-95 flex flex-col items-center">
          <span className="text-xs">Capitalizar Tudo para R$ {totalAtual.toFixed(2)}</span>
          <span className="text-[8px] opacity-70 mt-0.5">(O Juros vira Dívida Principal)</span>
        </button>

        <div className="border-t border-slate-800 pt-3 mt-1">
          <p className="text-[9px] font-black uppercase text-slate-400 mb-2 text-center">Ou Abater um Valor Específico:</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Valor pago R$"
              value={valorParcial}
              onChange={e => setValorParcial(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs font-bold"
            />
            <button
              type="button"
              onClick={() => executar('parcial')}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase active:scale-95"
            >
              Abater
            </button>
          </div>
        </div>

        <button onClick={onClose} className="w-full py-2.5 text-slate-500 font-bold uppercase text-xs mt-1">Cancelar</button>
      </div>
    </>
  );
}

function CartoesView({ items, hideValues, onEdit, onDelete, onStatusChange, onPagarFaturaBanco }) {
  let totalGeral = 0;
  
  const ordenados = [...items].sort((a, b) => {
    const aPago = safeString(a.dados[11]).toUpperCase() === 'PAGO';
    const bPago = safeString(b.dados[11]).toUpperCase() === 'PAGO';
    if (aPago && !bPago) return 1;
    if (!aPago && bPago) return -1;
    const dataA = parseDataBR(a.dados[5])?.getTime() || 0;
    const dataB = parseDataBR(b.dados[5])?.getTime() || 0;
    return dataA - dataB;
  });

  const cartoesPorBanco = {};
  const categorias = {};

  ordenados.forEach(i => {
    const banco = safeString(i.dados[10]) || 'Outros Bancos';
    const cat = safeString(i.dados[9]) || 'Outros';
    const val = parseCurrency(i.dados[7]);
    
    totalGeral += val;
    categorias[cat] = (categorias[cat] || 0) + val;

    if (!cartoesPorBanco[banco]) cartoesPorBanco[banco] = { total: 0, pendente: 0, items: [] };
    cartoesPorBanco[banco].total += val;
    if (safeString(i.dados[11]).toUpperCase() !== 'PAGO') {
      cartoesPorBanco[banco].pendente += val;
    }
    cartoesPorBanco[banco].items.push(i);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-indigo-900/20 border border-indigo-500/20 p-8 rounded-[2.5rem] shadow-xl">
        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Gasto Total com Cartões</p>
        <p className="text-4xl font-black text-white tracking-tighter">R$ {formatMoney(totalGeral, hideValues)}</p>
        <div className="mt-6 border-t border-indigo-500/20 pt-4 grid grid-cols-2 gap-y-3">
          {Object.entries(categorias).map(([c, v], idx) => (
            <div key={idx}>
              <p className="text-[9px] font-black text-slate-500 uppercase">{c}</p>
              <p className="text-sm font-black text-indigo-400">R$ {formatMoney(v, hideValues)}</p>
            </div>
          ))}
        </div>
      </div>
      
      <h3 className="text-xs font-black text-slate-500 uppercase ml-1 mt-6 mb-2">Faturas por Banco</h3>
      
      {Object.keys(cartoesPorBanco).length === 0 ? (
        <p className="text-xs text-slate-600 italic">Sem registos neste mês.</p> 
      ) : (
        Object.keys(cartoesPorBanco).map(banco => {
          const primeiraFatura = cartoesPorBanco[banco].items[0] ? parseDataBR(cartoesPorBanco[banco].items[0].dados[5]) : null;
          const vencimentoStr = primeiraFatura ? formatDateToBR(primeiraFatura) : '--/--/----';
          const temPendente = cartoesPorBanco[banco].pendente > 0;
          
          return (
            <div key={banco} className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden mb-6">
              <div className="bg-slate-800/40 p-5 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-indigo-400 uppercase text-lg">{banco}</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Fatura: {vencimentoStr}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Total da Fatura</p>
                    <p className="font-black text-white text-lg">R$ {formatMoney(cartoesPorBanco[banco].total, hideValues)}</p>
                  </div>
                  {temPendente && (
                    <button
                      onClick={() => onPagarFaturaBanco(cartoesPorBanco[banco].items, banco)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 px-3 py-1 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <CheckCheck size={12}/> Pagar Fatura
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-2">
                {cartoesPorBanco[banco].items.map((i, idx) => {
                  const isPago = safeString(i.dados[11]).toUpperCase() === 'PAGO';
                  const isFixo = safeString(i.dados[6]).toUpperCase() === 'FIXO';
                  const dFatura = parseDataBR(i.dados[5]);
                  const dCompraStr = safeString(i.dados[12]);
                  
                  let badgeText = "Pendente";
                  let badgeColor = "bg-slate-800 text-slate-500";

                  if (isPago) {
                    badgeText = "Pago";
                    badgeColor = "bg-emerald-900/30 text-emerald-500";
                  } else if (dFatura) {
                    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                    const d = new Date(dFatura); d.setHours(0, 0, 0, 0);
                    const diffDias = Math.round((d.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
                    
                    if (diffDias > 0) { badgeText = "Agendado"; badgeColor = "bg-blue-900/30 text-blue-400"; }
                    else if (diffDias < 0) { badgeText = "Atrasado"; badgeColor = "bg-red-900/30 text-red-500 animate-pulse font-black"; }
                    else { badgeText = "Vence Hoje"; badgeColor = "bg-amber-900/30 text-amber-500 font-black"; }
                  }

                  return (
                    <div key={idx} className={`p-4 border rounded-3xl flex justify-between items-center transition-all ${isPago ? 'bg-slate-900/30 border-slate-800/30 opacity-60' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="flex gap-4 items-center">
                        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${isPago ? 'border-emerald-500/20 text-emerald-500' : 'border-indigo-500/20 text-indigo-400'}`}><CreditCard size={18}/></div>
                        <div>
                          <p className="text-sm font-black">{i.dados[8]}</p>
                          <p className="text-[9px] text-slate-500 uppercase">{i.dados[9]} {dCompraStr ? `• Compra: ${dCompraStr}` : ''}</p>
                          <div className="flex gap-1.5 mt-1">
                            <span className={`text-[8px] px-2 py-0.5 rounded-md inline-block uppercase font-black ${badgeColor}`}>{badgeText}</span>
                            {isFixo && <span className="text-[8px] px-2 py-0.5 rounded-md inline-block uppercase font-black bg-violet-900/30 text-violet-400">Fixo</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className={`text-sm font-black ${isPago ? 'text-slate-500' : 'text-white'}`}>R$ {formatMoney(parseCurrency(i.dados[7]), hideValues)}</p>
                        <div className="flex gap-2">
                          <button onClick={() => onEdit(i)} className="p-2 bg-slate-800 rounded-lg text-blue-400 active:scale-90"><Edit size={16}/></button>
                          <button onClick={() => onDelete(i.linha)} className="p-2 bg-slate-800 rounded-lg text-red-400 active:scale-90"><Trash2 size={16}/></button>
                          <button onClick={() => onStatusChange(i, isPago ? 'Pendente' : 'Pago')} className={`p-2 rounded-lg active:scale-90 transition-all ${isPago ? 'bg-emerald-900/20 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                            {isPago ? <CheckCircle size={16}/> : <RotateCcw size={16}/>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function LancamentoModal({ tipo, setTipo, onClose, onSave, onSaveLote, meusBancos, infoBancos, cdiMensal, editItem, resgateAtivoTipo, devedorPreSelecionado, nomesClientes, setCustomDialog }) {
  const hojeISO = new Date().toISOString().split('T')[0];
  const bancoInicial = meusBancos[0] || 'Dinheiro';

  const [formData, setFormData] = useState({
    data: hojeISO,
    dataVenc: calcularDataFaturaSugerida(hojeISO, bancoInicial, infoBancos),
    banco: bancoInicial,
    ativoTipo: resgateAtivoTipo || 'Ação',
    subTipo: 'CDB',
    nome: devedorPreSelecionado || '',
    motivoAparte: '',
    afetaCaixaAparte: false,
    temVencimentoAparte: false,
    valor: '',
    juros: '',
    he50: '',
    he100: '',
    dsr: '',
    adNoturno: '',
    outros: '',
    descontos: '',
    isFixo: false,
    parcelas: 1,
    categoria: ''
  });
  
  useEffect(() => {
    if (devedorPreSelecionado && !editItem) {
      setFormData(p => ({ ...p, nome: devedorPreSelecionado }));
    }
  }, [devedorPreSelecionado, editItem]);

  useEffect(() => {
    if (editItem) {
      const d = editItem.dados;
      const toInp = (s) => parseDataBR(s) ? formatDateToISO(parseDataBR(s)) : '';
      if (tipo === 'devedor') {
        setFormData(p => ({ ...p, data: toInp(d[5]), nome: d[6], valor: parseCurrency(d[7]), dataVenc: toInp(d[8]), juros: parseCurrency(d[10]) }));
      } else if (tipo === 'divida_aparte') {
        const vencISO = toInp(d[8]);
        setFormData(p => ({
          ...p,
          data: toInp(d[5]) || hojeISO,
          nome: d[6],
          valor: parseCurrency(d[7]),
          dataVenc: vencISO || hojeISO,
          temVencimentoAparte: Boolean(vencISO),
          motivoAparte: getDescricaoAparte(editItem),
          afetaCaixaAparte: isAparteComCaixa(editItem)
        }));
      } else if (tipo === 'cartao') {
        setFormData(p => ({
          ...p,
          dataVenc: toInp(d[5]),
          isFixo: safeString(d[6]).toUpperCase() === 'FIXO',
          valor: parseCurrency(d[7]),
          nome: d[8],
          categoria: d[9],
          banco: d[10],
          data: toInp(d[12] || "")
        }));
      } else if (tipo === 'salario') {
        // Preserva o campo d[9] (soma de DSR + Ad. Noturno + Outros) em 'outros' para não zerar na edição!
        setFormData(p => ({
          ...p,
          data: toInp(d[5]),
          valor: parseCurrency(d[6]),
          he50: parseCurrency(d[7]),
          he100: parseCurrency(d[8]),
          dsr: '',
          adNoturno: '',
          outros: parseCurrency(d[9]),
          descontos: parseCurrency(d[10]),
          nome: safeString(d[12])
        }));
      } else if (tipo === 'ativo') {
        const isFixa = d[10] ? ['CDB', 'CDI', 'TESOURO', 'LCI', 'LCA'].some(k => safeString(d[10]).toUpperCase().includes(k)) : true;
        setFormData(p => ({
          ...p,
          data: toInp(d[5]),
          dataVenc: toInp(d[6]),
          nome: d[7] || d[0],
          valor: parseCurrency(d[8] || d[2]),
          juros: parseCurrency(d[9] || d[3]),
          ativoTipo: isFixa ? 'Renda Fixa' : (d[9] || 'Ação'),
          subTipo: d[10] || 'CDB'
        }));
      } else if (tipo === 'resgate') {
        const tipoAlvo = resgateAtivoTipo || formData.ativoTipo;
        const isFixa = tipoAlvo === 'Renda Fixa';
        let valorDisponivel = parseCurrency(editItem.dados[6]);
        if (isFixa) {
          const calc = calcFixa(parseCurrency(editItem.dados[8]), parseCurrency(editItem.dados[9]), parseDataBR(editItem.dados[5]), editItem.dados[10] || 'CDB', cdiMensal);
          valorDisponivel = Number(calc.liquido.toFixed(2));
        }
        setFormData(p => ({
          ...p,
          ativoTipo: tipoAlvo,
          nome: isFixa ? editItem.dados[7] : editItem.dados[0],
          valor: valorDisponivel,
          juros: isFixa ? '' : parseCurrency(editItem.dados[2]), // Qtd disponível na variável
          data: hojeISO
        }));
      }
    }
  }, [editItem, tipo, resgateAtivoTipo]);

  const handleBancoOuDataCompraChange = (novoBanco, novaDataCompra) => {
    const atualiza = { banco: novoBanco, data: novaDataCompra };
    if (!editItem) {
      atualiza.dataVenc = calcularDataFaturaSugerida(novaDataCompra, novoBanco, infoBancos);
    }
    setFormData(p => ({ ...p, ...atualiza }));
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700/50 rounded-2xl p-4 text-white focus:border-emerald-500/50 outline-none text-sm font-bold";

  const tituloModal = () => {
    if (tipo === 'divida_aparte') return editItem ? 'Editar Dívida à Parte' : 'Nova Dívida à Parte (Sem Juros)';
    if (editItem) return tipo === 'resgate' ? 'Resgatar / Vender Ativo' : `Editar ${tipo}`;
    return 'Novo Lançamento';
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-[3rem] border border-slate-800 p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-black text-xl ${tipo === 'divida_aparte' ? 'text-teal-400' : 'text-emerald-500'}`}>{tituloModal()}</h3>
          <button onClick={onClose} className="p-3 bg-slate-800 rounded-full text-slate-500"><X size={24}/></button>
        </div>

        {tipo === 'escolha' ? (
          <div className="grid grid-cols-2 gap-3">
            <ChoiceBtn onClick={() => setTipo('salario')} icon={<Banknote size={30} className="text-blue-400"/>} label="Salário / Renda" />
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard size={30} className="text-indigo-400"/>} label="Gastos Cartão" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<Wallet size={30} className="text-emerald-400"/>} label="Investir Ativo" />
            <ChoiceBtn onClick={() => setTipo('provento')} icon={<Coins size={30} className="text-yellow-400"/>} label="Provento / Div." />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users size={30} className="text-amber-400"/>} label="Empréstimo c/ Juros" />
            <ChoiceBtn onClick={() => setTipo('divida_aparte')} icon={<Bookmark size={30} className="text-teal-400"/>} label="Dívida à Parte (0%)" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const dBR = formData.data ? formData.data.split('-').reverse().join('/') : "";
            const vBR = formData.dataVenc ? formData.dataVenc.split('-').reverse().join('/') : "";
            let p = [];
            let aba = "";

            if (tipo === 'devedor') {
              aba = 'bdDevedores';
              p = [dBR, formData.nome.trim(), parseCurrency(formData.valor), vBR, editItem?.dados[9] || "Pendente", parseCurrency(formData.juros), "App"];
            } else if (tipo === 'divida_aparte') {
              aba = 'bdDevedores';
              const tagPrefix = formData.afetaCaixaAparte ? '[APARTE_CAIXA]' : '[APARTE]';
              const descLimpa = safeString(formData.motivoAparte) || 'Empréstimo sem juros';
              const vencFinal = formData.temVencimentoAparte ? vBR : '';
              p = [dBR, formData.nome.trim(), parseCurrency(formData.valor), vencFinal, editItem?.dados[9] || "Pendente", 0, `${tagPrefix} ${descLimpa}`];
            } else if (tipo === 'cartao') {
              aba = 'bdLancamentos';
              const qtdParcelas = !editItem ? Math.max(1, parseInt(formData.parcelas) || 1) : 1;
              const valorTotal = parseCurrency(formData.valor);

              if (qtdParcelas > 1) {
                const valorParcela = Number((valorTotal / qtdParcelas).toFixed(2));
                const dBaseFatura = parseDataBR(formData.dataVenc) || new Date();
                const lotes = [];

                for (let idx = 0; idx < qtdParcelas; idx++) {
                  const dParcela = new Date(dBaseFatura.getFullYear(), dBaseFatura.getMonth() + idx, dBaseFatura.getDate());
                  const vParcelaBR = formatDateToBR(dParcela);
                  lotes.push([
                    vParcelaBR,
                    "Parcelado",
                    valorParcela,
                    `${formData.nome} (${idx + 1}/${qtdParcelas})`,
                    formData.categoria,
                    formData.banco,
                    "Pendente",
                    dBR
                  ]);
                }
                onSaveLote(lotes, aba);
                return;
              }

              p = [vBR, formData.isFixo ? "Fixo" : "Avulso", valorTotal, formData.nome, formData.categoria, formData.banco, editItem?.dados[11] || "Pendente", dBR];
            } else if (tipo === 'ativo') { 
              if (formData.ativoTipo === 'Renda Fixa') {
                aba = 'DB_Investimentos_Fixos';
                p = [dBR, vBR, formData.nome, parseCurrency(formData.valor), parseCurrency(formData.juros), formData.subTipo, "", ""];
              } else {
                aba = 'DB_Historico_Ordens';
                p = [dBR, formData.nome.toUpperCase().trim(), "COMPRA", parseCurrency(formData.valor), parseCurrency(formData.juros), formData.ativoTipo, ""];
              }
            } else if (tipo === 'provento') {
              aba = 'DB_Historico_Ordens';
              p = [dBR, formData.nome.toUpperCase().trim(), "PROVENTO", 1, parseCurrency(formData.valor), formData.ativoTipo, ""];
            } else if (tipo === 'salario') {
              aba = 'bdRendas';
              const b = parseCurrency(formData.valor);
              const h5 = parseCurrency(formData.he50);
              const h1 = parseCurrency(formData.he100);
              const dsr = parseCurrency(formData.dsr);
              const adN = parseCurrency(formData.adNoturno);
              const out = parseCurrency(formData.outros);
              const d = parseCurrency(formData.descontos);
              const desc = safeString(formData.nome);
              p = [dBR, b, h5, h1, dsr + adN + out, d, b + h5 + h1 + (dsr + adN + out) - d, desc];
            } else if (tipo === 'resgate') {
              if (formData.ativoTipo === 'Renda Fixa') {
                const resgateVal = parseCurrency(formData.valor);
                const principalOriginal = parseCurrency(editItem.dados[8]);
                const calcAtual = calcFixa(principalOriginal, parseCurrency(editItem.dados[9]), parseDataBR(editItem.dados[5]), editItem.dados[10] || 'CDB', cdiMensal);
                
                // 1. Lança no histórico para virar Caixa Livre
                onSave([dBR, formData.nome, "RESGATE", 1, resgateVal, "Renda Fixa", ""], 'DB_Historico_Ordens', null, true);
                
                // 2. Reduz o principal proporcionalmente ao percentual resgatado do saldo líquido atual
                const proporcaoRestante = calcAtual.liquido > 0 ? Math.max(0, 1 - (resgateVal / calcAtual.liquido)) : 0;
                const novoPrincipal = Number((principalOriginal * proporcaoRestante).toFixed(2));

                if (novoPrincipal > 1) {
                  p = [editItem.dados[5], editItem.dados[6], editItem.dados[7], novoPrincipal, editItem.dados[9], editItem.dados[10], "", ""];
                  aba = 'DB_Investimentos_Fixos';
                } else {
                  onClose();
                  setCustomDialog({ type: 'delete', aba: 'DB_Investimentos_Fixos', linha: editItem.linha, message: 'O valor resgatado quita o título. Deseja remover a aplicação da carteira?' });
                  return;
                }
              } else {
                const qtdVendida = parseCurrency(formData.juros);
                const valRecebido = parseCurrency(formData.valor);
                const precoVenda = valRecebido / (qtdVendida || 1);
                aba = 'DB_Historico_Ordens';
                p = [dBR, formData.nome.toUpperCase().trim(), "VENDA", qtdVendida, precoVenda, formData.ativoTipo, ""];
              }
            }
            onSave(p, aba, editItem?.linha);
          }}>
            {tipo === 'salario' ? (
              <>
                <input type="text" placeholder="Descrição (ex: Salário, Adiantamento, Extra)" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} />
                <input type="number" step="any" placeholder="Valor Base R$ *" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder="HE 50%" value={formData.he50} className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} />
                  <input type="number" step="any" placeholder="HE 100%" value={formData.he100} className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="any" placeholder="DSR" value={formData.dsr} className={inputClass} onChange={e => setFormData({...formData, dsr: e.target.value})} />
                  <input type="number" step="any" placeholder="Noturno" value={formData.adNoturno} className={inputClass} onChange={e => setFormData({...formData, adNoturno: e.target.value})} />
                  <input type="number" step="any" placeholder="Outros" value={formData.outros} className={inputClass} onChange={e => setFormData({...formData, outros: e.target.value})} />
                </div>
                <input type="number" step="any" placeholder="Descontos R$" value={formData.descontos} className={`${inputClass} text-red-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} />
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data do Recebimento</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} required />
                </div>
              </>
            ) : tipo === 'cartao' ? (
              <>
                <input type="text" placeholder="Descrição da Compra" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder="Valor Total R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="text" placeholder="Categoria" value={formData.categoria} className={inputClass} onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select className={`${inputClass} appearance-none`} value={formData.banco} onChange={e => handleBancoOuDataCompraChange(e.target.value, formData.data)}>
                    {meusBancos.map((b, i) => <option key={i} value={b}>{b}</option>)}
                  </select>
                  {!editItem ? (
                    <select className={`${inputClass} appearance-none`} value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: Number(e.target.value)})}>
                      {[1,2,3,4,5,6,7,8,9,10,12,15,18,24].map(n => (
                        <option key={n} value={n}>{n === 1 ? 'À vista (1x)' : `Parcelado em ${n}x`}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, isFixo: !p.isFixo }))}
                      className={`rounded-2xl font-black text-xs uppercase border transition-all ${formData.isFixo ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                      {formData.isFixo ? '★ Gasto Fixo' : 'Gasto Avulso'}
                    </button>
                  )}
                </div>

                {!editItem && formData.parcelas === 1 && (
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, isFixo: !p.isFixo }))}
                    className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${formData.isFixo ? 'bg-violet-600/30 border-violet-500 text-violet-300' : 'bg-slate-950 border-slate-800 text-slate-500'}`}
                  >
                    {formData.isFixo ? '★ Marcado como Despesa Fixa Mensal' : 'Marcar como Despesa Fixa Mensal?'}
                  </button>
                )}

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data da Compra</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => handleBancoOuDataCompraChange(formData.banco, e.target.value)} />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data de Vencimento da 1ª Fatura *</span>
                  <input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900 border-none !p-2 text-amber-500`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} required />
                </div>
              </>
            ) : tipo === 'devedor' ? (
              <>
                <input type="text" list="lista-clientes" placeholder="Cliente" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <datalist id="lista-clientes">
                  {nomesClientes.map((n, idx) => <option key={idx} value={n} />)}
                </datalist>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder="Valor Emprestado" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="number" step="any" placeholder="Juros Fixo (%)" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data que Emprestou</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data de Pagamento</span>
                  <input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900 border-none !p-2 text-amber-500`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                </div>
              </>
            ) : tipo === 'divida_aparte' ? (
              /* FORMULÁRIO DE DÍVIDA À PARTE (SEM JUROS / LEMBRETE) */
              <>
                <div className="bg-teal-950/30 border border-teal-500/20 p-3.5 rounded-2xl text-[10px] text-teal-300/90 font-bold">
                  📌 Anote valores ou itens emprestados <strong>sem juros</strong> para seus devedores ou conhecidos.
                </div>
                <input
                  type="text"
                  list="lista-clientes-aparte"
                  placeholder="Nome da Pessoa / Devedor *"
                  value={formData.nome}
                  className={inputClass}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  required
                />
                <datalist id="lista-clientes-aparte">
                  {nomesClientes.map((n, idx) => <option key={idx} value={n} />)}
                </datalist>

                <input
                  type="text"
                  placeholder="Do que é essa dívida? (ex: Pix gasolina, Peça, Cartão) *"
                  value={formData.motivoAparte}
                  className={inputClass}
                  onChange={e => setFormData({...formData, motivoAparte: e.target.value})}
                  required
                />

                <input
                  type="number"
                  step="any"
                  placeholder="Valor R$ (Sem Juros) *"
                  value={formData.valor}
                  className={inputClass}
                  onChange={e => setFormData({...formData, valor: e.target.value})}
                  required
                />

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data em que Emprestou</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-teal-400`} onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Definir Data de Pagamento?</span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, temVencimentoAparte: !p.temVencimentoAparte }))}
                      className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase ${formData.temVencimentoAparte ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      {formData.temVencimentoAparte ? 'Sim' : 'Não (Sem Data)'}
                    </button>
                  </div>
                  {formData.temVencimentoAparte && (
                    <input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900 border-none !p-2 text-amber-500`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, afetaCaixaAparte: !p.afetaCaixaAparte }))}
                  className={`w-full p-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${formData.afetaCaixaAparte ? 'bg-blue-950/60 border-blue-500/50 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                >
                  {formData.afetaCaixaAparte ? '✓ Contabilizar no Caixa Livre do Mês' : '📌 Apenas Lembrete (Não alterar Caixa Livre)'}
                </button>
              </>
            ) : tipo === 'provento' ? (
              <>
                <div className="flex bg-slate-950 p-1 rounded-2xl mb-4 gap-1">
                  {['Ação', 'FII'].map(t => (
                    <button type="button" key={t} onClick={() => setFormData({...formData, ativoTipo: t})} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${formData.ativoTipo === t ? 'bg-yellow-600 text-white' : 'text-slate-500 hover:bg-slate-800'}`}>{t}</button>
                  ))}
                </div>
                <input type="text" placeholder="Ticker (ex: ITSA4)" value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <input type="number" step="any" placeholder="Valor Total Recebido (R$)" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data do Recebimento</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>
              </>
            ) : tipo === 'resgate' ? (
              <>
                {formData.ativoTipo === 'Renda Fixa' ? (
                  <>
                    <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">Resgate de {formData.nome}</p>
                    <input type="number" step="any" placeholder="Valor Líquido a Resgatar (R$)" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">Venda de {formData.nome}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" step="any" placeholder="Qtd Vendida" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                      <input type="number" step="any" placeholder="Valor Total Recebido (R$)" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                    </div>
                  </>
                )}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mt-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data da Operação</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>
              </>
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
                <input type="text" placeholder={formData.ativoTipo === 'Renda Fixa' ? "Instituição (ex: CDB C6)" : "Ticker da B3 ou Crypto (ex: BTC)"} value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="any" placeholder={formData.ativoTipo === 'Renda Fixa' ? "Valor Aplicado R$" : "Quantidade"} value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="number" step="any" placeholder={formData.ativoTipo === 'Renda Fixa' ? "Taxa (% CDI ou % a.m)" : "Valor Pago Total R$"} value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                </div>
                
                {formData.ativoTipo === 'Renda Fixa' && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Data de Vencimento</span>
                    <input type="date" value={formData.dataVenc} className={`${inputClass} !bg-slate-900 border-none !p-2 text-amber-500`} onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                  </div>
                )}
                
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">{formData.ativoTipo === 'Renda Fixa' ? 'Data da Aplicação' : 'Data da Transação'}</span>
                  <input type="date" value={formData.data} className={`${inputClass} !bg-slate-900 border-none !p-2 text-emerald-500`} onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>
              </>
            )}

            <button type="submit" className={`w-full text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs mt-4 active:scale-95 transition-all ${tipo === 'divida_aparte' ? 'bg-teal-600' : 'bg-emerald-600'}`}>
              {editItem && tipo !== 'resgate' ? "Atualizar Registo" : "Salvar Lançamento"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ChoiceBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 py-5 px-3 rounded-3xl flex flex-col items-center gap-2.5 active:scale-90 transition-all">
      {icon}
      <span className="font-black text-[9px] uppercase text-slate-300 tracking-wider text-center">{label}</span>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-slate-600 opacity-60'}`}>
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function InfoCard({ title, val, hideValues, color, onClick }) {
  return (
    <div onClick={onClick} className="bg-slate-900 border border-slate-800 p-5 rounded-[2rem] cursor-pointer active:scale-95 transition-all">
      <div className={`mb-3 ${color}`}><TrendingUp size={16}/></div>
      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{title}</p>
      <p className="text-lg font-black tracking-tight">R$ {formatMoney(val, hideValues)}</p>
    </div>
  );
}
