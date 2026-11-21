"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, LayoutDashboard, Receipt, Users, Landmark, X, CheckCircle, 
  ChevronLeft, ChevronRight, CreditCard, HandCoins, Loader2, AlertCircle, RefreshCw, 
  Building2, Wallet, Coins, Briefcase, CalendarClock, Banknote, PieChart,
  ArrowLeft, Edit, Trash2, RotateCcw, FastForward, Info, History, Activity, EyeOff, Eye,
  MessageCircle, Bookmark, CheckCheck, Bell, Lock, Unlock, Search, Copy, Target,
  ArrowUpRight, ArrowDownRight, Plus, Send, ShieldCheck, Calendar
} from 'lucide-react';

// ==========================================
// UTILITÁRIOS FINANCEIROS E DATAS
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

// Classificadores de Dívidas à Parte (bdDevedores)
const isDividaAparte = (item) => safeString(item?.dados?.[11]).toUpperCase().startsWith('[APARTE');
const isAparteComCaixa = (item) => safeString(item?.dados?.[11]).toUpperCase().startsWith('[APARTE_CAIXA]');
const getDescricaoAparte = (item) => {
  const obs = safeString(item?.dados?.[11]);
  return obs.replace(/^\[APARTE(?:_CAIXA)?\]\s*/i, '').trim() || 'Empréstimo sem juros';
};

// Classificadores de Contas Fixas, Imóvel (Juros de Obra / Parcela) e Pix vs. Cartão de Crédito (bdLancamentos)
const TIPOS_CONTA_DIRETA = [
  'CONTA FIXA', 'JUROS DE OBRA', 'PARCELA IMÓVEL', 'PARCELA IMOVEL',
  'CONDOMÍNIO / TAXA', 'CONDOMINIO / TAXA', 'PIX / DÉBITO', 'PIX / DEBITO', 'BOLETO'
];

const isContaOuImovel = (item) => {
  const tipo = safeString(item?.dados?.[6]).toUpperCase();
  const meio = safeString(item?.dados?.[10]).toUpperCase();
  return TIPOS_CONTA_DIRETA.includes(tipo) ||
    meio.startsWith('BOLETO') ||
    meio.startsWith('PIX') ||
    meio.startsWith('DÉBITO') ||
    meio.startsWith('DEBITO') ||
    meio.startsWith('CONSTRUTORA') ||
    meio.startsWith('FINANCIAMENTO');
};

const isItemImovel = (item) => {
  const tipo = safeString(item?.dados?.[6]).toUpperCase();
  const desc = safeString(item?.dados?.[8]).toUpperCase();
  const cat = safeString(item?.dados?.[9]).toUpperCase();
  return tipo.includes('OBRA') || tipo.includes('IMÓVEL') || tipo.includes('IMOVEL') ||
    cat.includes('IMÓVEL') || cat.includes('IMOVEL') || cat.includes('OBRA') || cat.includes('APARTAMENTO') ||
    desc.includes('JUROS DE OBRA') || desc.includes('APARTAMENTO') || desc.includes('CONSTRUTORA');
};

const isJurosDeObra = (item) => {
  const tipo = safeString(item?.dados?.[6]).toUpperCase();
  const desc = safeString(item?.dados?.[8]).toUpperCase();
  return tipo.includes('JUROS DE OBRA') || desc.includes('JUROS DE OBRA') || desc.includes('EVOLUÇÃO DE OBRA') || desc.includes('EVOLUCAO DE OBRA');
};

// Cálculo de Renda Fixa com suporte a isenção de LCI/LCA e CDI dinâmico
const calcFixa = (vA, taxInput, dataApp, subTipo = 'CDB', baseCDI = 0.0115) => {
  if (!vA || !dataApp) return { bruto: vA || 0, liquido: vA || 0, ir: 0, lucro: 0, irRate: 0 };
  const hoje = new Date();
  const diffTime = Math.max(0, hoje - dataApp);
  const m = diffTime / (1000 * 60 * 60 * 24 * 30.416); 
  const diasCorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  const monthlyRate = taxInput > 20 ? (taxInput / 100) * baseCDI : (taxInput / 100);
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

function calcularDataFaturaSugerida(dataCompraISO, nomeBanco, infoBancos) {
  const info = infoBancos?.[nomeBanco];
  const dCompra = parseDataBR(dataCompraISO) || new Date();
  if (!info) return formatDateToISO(dCompra);

  const diaCompra = dCompra.getDate();
  let mesFatura = dCompra.getMonth();
  let anoFatura = dCompra.getFullYear();

  const diaFechamento = info.fechamento || 31;
  const diaVencimento = info.vencimento || 10;

  if (diaCompra >= diaFechamento) mesFatura += 1;
  if (diaVencimento < diaFechamento) mesFatura += 1;

  const dataVenc = new Date(anoFatura, mesFatura, diaVencimento);
  return formatDateToISO(dataVenc);
}

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
    r[0] = c.ticker; r[2] = c.qtd; r[3] = pm; r[4] = c.custo;
    r[6] = valorMercado; r[7] = valorMercado - c.custo; r[11] = 0; r[12] = "";
    return { dados: r, isHist: true };
  });
}

function cobrarWhatsApp(nome, valor, vencimentoStr, descricao = '') {
  const msg = `Olá *${nome}*, tudo bem? Passando para lembrar do valor de *R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*${descricao ? ` referente a _${descricao}_` : ''}${vencimentoStr && vencimentoStr !== '--/--/----' ? ` (vencimento em *${vencimentoStr}*)` : ''}. Qualquer dúvida estou à disposição!`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

// ==========================================
// COMPONENTE PRINCIPAL (PRIVATE BANKING)
// ==========================================
export default function Dashboard() {
  const [isGlobalLoading, setIsGlobalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [editItem, setEditItem] = useState(null); 
  const [resgateAtivoTipo, setResgateAtivoTipo] = useState('');
  const [devedorPreSelecionado, setDevedorPreSelecionado] = useState('');
  const [subtipoContaPre, setSubtipoContaPre] = useState('Conta Fixa');
  const [syncStatus, setSyncStatus] = useState('synced'); 
  const [notification, setNotification] = useState(null);
  const [customDialog, setCustomDialog] = useState(null);
  const [hideValues, setHideValues] = useState(false);
  const [cdiMensal, setCdiMensal] = useState(0.0115);

  // Estados de Notificações, Meta e Segurança por PIN
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [savedPin, setSavedPin] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [metaPatrimonio, setMetaPatrimonio] = useState(100000);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const mesesCurtos = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
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

  useEffect(() => {
    try {
      const pin = localStorage.getItem('appfinance_pin');
      if (pin) {
        setSavedPin(pin);
        setIsLocked(true);
      }
      const meta = localStorage.getItem('appfinance_meta');
      if (meta && !isNaN(Number(meta))) setMetaPatrimonio(Number(meta));
    } catch (_) {}
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3200);
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

      fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/2?formato=json')
        .then(r => r.json())
        .then(arr => {
          if (Array.isArray(arr) && arr.length > 0) {
            const ultimoFechado = arr.length > 1 ? parseFloat(arr[0].valor) : parseFloat(arr[arr.length - 1].valor);
            if (!isNaN(ultimoFechado) && ultimoFechado > 0.3 && ultimoFechado < 3.0) {
              setCdiMensal(ultimoFechado / 100);
            }
          }
        }).catch(() => {});

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

  // ==========================================
  // MOTOR DE NOTIFICAÇÕES (CONTAS, OBRA, CARTÕES, DEVEDORES, INVESTIMENTOS)
  // ==========================================
  const listaNotificacoes = useMemo(() => {
    const alertas = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 1. Contas Fixas, Juros de Obra, Parcela de Imóvel e Faturas de Cartão
    const faturasAgrupadas = {};

    gastosCartao.forEach(item => {
      const status = safeString(item.dados[11]).toUpperCase();
      if (status === 'PAGO') return;
      const venc = parseDataBR(item.dados[5]);
      const valor = parseCurrency(item.dados[7]);
      if (!venc || valor <= 0) return;

      const v = new Date(venc);
      v.setHours(0, 0, 0, 0);
      const diffDias = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
      const desc = safeString(item.dados[8]) || 'Compromisso';
      const banco = safeString(item.dados[10]) || 'Cartão';

      if (isContaOuImovel(item)) {
        if (diffDias <= 5) {
          alertas.push({
            id: `conta_${item.linha}`,
            categoria: isItemImovel(item) ? 'Imóvel & Obra' : 'Conta Fixa',
            titulo: desc,
            subtitulo: `Vencimento: ${formatDateToBR(venc)}`,
            valor,
            diffDias,
            urgencia: diffDias < 0 ? 'atrasado' : (diffDias === 0 ? 'hoje' : 'proximo'),
            acaoTab: 'contas',
            dataRef: venc
          });
        }
      } else {
        const chave = `${banco}__${formatDateToBR(venc)}`;
        if (!faturasAgrupadas[chave]) {
          faturasAgrupadas[chave] = { banco, venc, diffDias, valor: 0, qtd: 0 };
        }
        faturasAgrupadas[chave].valor += valor;
        faturasAgrupadas[chave].qtd += 1;
      }
    });

    Object.entries(faturasAgrupadas).forEach(([chave, f]) => {
      if (f.diffDias <= 5 && f.diffDias >= -20) {
        alertas.push({
          id: `fatura_${chave}`,
          categoria: 'Fatura de Cartão',
          titulo: `Fatura ${f.banco}`,
          subtitulo: `${f.qtd} lançamentos • Venc. ${formatDateToBR(f.venc)}`,
          valor: f.valor,
          diffDias: f.diffDias,
          urgencia: f.diffDias < 0 ? 'atrasado' : (f.diffDias === 0 ? 'hoje' : 'proximo'),
          acaoTab: 'cartoes',
          dataRef: f.venc
        });
      }
    });

    // 2. Devedores (Acordos c/ Juros e Dívidas à Parte)
    devedores.forEach(item => {
      const status = safeString(item.dados[9]);
      if (status === 'Concluído') return;
      const venc = parseDataBR(item.dados[8]);
      if (!venc) return;

      const v = new Date(venc);
      v.setHours(0, 0, 0, 0);
      const diffDias = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
      if (diffDias <= 3) {
        const nome = safeString(item.dados[6]) || 'Cliente';
        const vO = parseCurrency(item.dados[7]);
        const juros = parseCurrency(item.dados[10]);
        const total = vO + (vO * (juros / 100));
        const aparte = isDividaAparte(item);

        alertas.push({
          id: `dev_${item.linha}`,
          categoria: aparte ? 'Dívida à Parte (0%)' : 'Recebível c/ Juros',
          titulo: `Receber de ${nome}`,
          subtitulo: aparte ? `${getDescricaoAparte(item)} • ${formatDateToBR(venc)}` : `Vencimento: ${formatDateToBR(venc)}`,
          valor: total,
          diffDias,
          urgencia: diffDias < 0 ? 'atrasado' : (diffDias === 0 ? 'hoje' : 'proximo'),
          acaoTab: 'devedores',
          cliente: aparte ? null : nome,
          dataRef: venc
        });
      }
    });

    // 3. Vencimento de Títulos de Renda Fixa
    ativosFixos.forEach(item => {
      const venc = parseDataBR(item.dados[6]);
      if (!venc) return;
      const v = new Date(venc);
      v.setHours(0, 0, 0, 0);
      const diffDias = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
      if (diffDias >= 0 && diffDias <= 5) {
        const nome = safeString(item.dados[7]) || 'Título Renda Fixa';
        const vA = parseCurrency(item.dados[8]);
        const calc = calcFixa(vA, parseCurrency(item.dados[9]), parseDataBR(item.dados[5]), item.dados[10] || 'CDB', cdiMensal);
        alertas.push({
          id: `rf_${item.linha}`,
          categoria: 'Vencimento Investimento',
          titulo: `Resgate ${nome}`,
          subtitulo: `Vence em ${formatDateToBR(venc)}`,
          valor: calc.liquido,
          diffDias,
          urgencia: diffDias === 0 ? 'hoje' : 'proximo',
          acaoTab: 'patrimonio',
          dataRef: venc
        });
      }
    });

    return alertas.sort((a, b) => a.diffDias - b.diffDias);
  }, [gastosCartao, devedores, ativosFixos, cdiMensal]);

  const applyOptimisticUpdate = (aba, linha, payload, action) => {
    const map = {
      'bdRendas': [salarios, setSalarios],
      'bdLancamentos': [gastosCartao, setGastosCartao],
      'bdDevedores': [devedores, setDevedores],
      'DB_Investimentos_Fixos': [ativosFixos, setAtivosFixos],
      'DB_Historico_Ordens': [historicoOrdens, setHistoricoOrdens]
    };
    if (!map[aba]) return;
    const [, setter] = map[aba];

    if (action === 'adicionar') {
      const fullRow = ["", "", "", "", "", ...payload];
      setter(prev => [{ linha: Date.now() + Math.random(), dados: fullRow }, ...prev]);
    } else if (action === 'adicionar_lote') {
      const novasLinhas = payload.map((p, idx) => ({
        linha: Date.now() + idx + Math.random(),
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
          showToast("Operação registrada com sucesso.");
        }
      } else throw new Error(json.message);
    } catch (error) {
      if (!silent) {
        setSyncStatus('error');
        showToast("Falha na sincronização.", "error");
        fetchDados(true);
      }
    }
  };

  const handleGravarLote = async (payloads, aba, msgSucesso = '') => {
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
      if (!json.success) {
        for (const p of payloads) {
          await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'adicionar', aba, payload: p })
          });
        }
      }
      setSyncStatus('synced');
      fetchDados(true);
      showToast(msgSucesso || `${payloads.length} lançamentos registrados.`);
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao processar lote.", "error");
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
      showToast(`Fatura ${nomeBanco} quitada.`);
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao quitar fatura.", "error");
      fetchDados(true);
    }
  };

  // Replicar Contas Fixas ou Assinaturas Fixas do Mês Anterior em 1 Clique
  const handleReplicarFixosMesAnterior = async (apenasContasDiretas = true) => {
    const mesAnt = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnt = mesAtual === 0 ? anoAtual - 1 : anoAtual;

    const candidatosMesAnt = gastosCartao.filter(g => {
      const d = parseDataBR(g.dados[5]);
      if (!d || d.getMonth() !== mesAnt || d.getFullYear() !== anoAnt) return false;
      if (apenasContasDiretas) {
        const tipo = safeString(g.dados[6]).toUpperCase();
        return isContaOuImovel(g) && tipo !== 'PIX / DÉBITO' && tipo !== 'PIX / DEBITO';
      } else {
        return !isContaOuImovel(g) && safeString(g.dados[6]).toUpperCase() === 'FIXO';
      }
    });

    if (candidatosMesAnt.length === 0) {
      showToast("Nenhum compromisso fixo encontrado no mês anterior.", "error");
      return;
    }

    const jaNoMesAtual = new Set(
      gastosCartao
        .filter(g => {
          const d = parseDataBR(g.dados[5]);
          return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        })
        .map(g => `${safeString(g.dados[8]).toUpperCase()}__${safeString(g.dados[6]).toUpperCase()}`)
    );

    const novosLotes = [];
    candidatosMesAnt.forEach(g => {
      const chave = `${safeString(g.dados[8]).toUpperCase()}__${safeString(g.dados[6]).toUpperCase()}`;
      if (jaNoMesAtual.has(chave)) return;
      const dAnt = parseDataBR(g.dados[5]);
      const dia = Math.min(dAnt ? dAnt.getDate() : 10, 28);
      const novaData = formatDateToBR(new Date(anoAtual, mesAtual, dia));
      novosLotes.push([
        novaData,
        g.dados[6],
        parseCurrency(g.dados[7]),
        g.dados[8],
        g.dados[9],
        g.dados[10],
        "Pendente",
        novaData
      ]);
    });

    if (novosLotes.length === 0) {
      showToast("Todos os compromissos fixos já estão lançados neste mês.");
      return;
    }

    await handleGravarLote(novosLotes, 'bdLancamentos', `${novosLotes.length} compromissos fixos importados para ${meses[mesAtual]}.`);
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
        showToast("Registro removido.");
      } else throw new Error();
    } catch (e) {
      setSyncStatus('error');
      showToast("Erro ao remover registro.", "error");
      fetchDados(true);
    }
  };

  const abrirEdicao = (item, tipoStr) => {
    setEditItem(item);
    if (tipoStr === 'devedor' && isDividaAparte(item)) {
      setModalType('divida_aparte');
    } else if (tipoStr === 'cartao' && isContaOuImovel(item)) {
      setModalType('conta_fixa');
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

  const abrirNovaContaFixa = (subtipo = 'Conta Fixa') => {
    setEditItem(null);
    setSubtipoContaPre(subtipo);
    setModalType('conta_fixa');
    setIsModalOpen(true);
  };

  // Separação dos lançamentos do mês entre Contas Fixas/Imóvel/Pix e Cartões de Crédito
  const lancamentosDoMes = gastosCartao.filter(g => {
    const dFatura = parseDataBR(g.dados[5]);
    return dFatura && dFatura.getMonth() === mesAtual && dFatura.getFullYear() === anoAtual;
  });

  const contasFixasDoMes = lancamentosDoMes.filter(g => isContaOuImovel(g));
  const cartoesCreditoDoMes = lancamentosDoMes.filter(g => !isContaOuImovel(g));

  // Cálculos Globais de Patrimônio e Caixa
  const acoes = ativosVariaveis.filter(a => safeString(a.dados[1]).toUpperCase().includes('AÇÃO') || safeString(a.dados[1]).toUpperCase().includes('ACAO'));
  const fiis = ativosVariaveis.filter(a => safeString(a.dados[1]).toUpperCase().includes('FII'));
  const criptoArr = consolidarCriptos(historicoOrdens, cryptoLivePrices);
  const cValorMercado = (lista) => lista.reduce((acc, i) => acc + parseCurrency(i.dados[6]), 0);
  
  let rendimentoFixaAcumulado = 0;
  const totalFixa = ativosFixos.reduce((acc, i) => {
    const vA = parseCurrency(i.dados[8]);
    const rf = calcFixa(vA, parseCurrency(i.dados[9]), parseDataBR(i.dados[5]), i.dados[10] || 'CDB', cdiMensal);
    rendimentoFixaAcumulado += (rf.liquido - vA);
    return acc + rf.liquido;
  }, 0);

  const totalInvestido = cValorMercado(acoes) + cValorMercado(fiis) + cValorMercado(criptoArr) + totalFixa;

  const totalRecebiveisRua = devedores.reduce((acc, d) => {
    if (safeString(d.dados[9]) === 'Concluído') return acc;
    return acc + parseCurrency(d.dados[7]);
  }, 0);

  const calcCaixaLivre = () => {
    let renda = 0;
    let saidaCartoes = 0;
    let saidaContas = 0;
    let saidaOutros = 0;
    let lucroCobranca = 0;
    let proventosMes = 0;
    
    salarios.forEach(s => {
      const d = parseDataBR(s.dados[5]);
      if (d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
        renda += parseCurrency(s.dados[11]);
      }
    });
    
    cartoesCreditoDoMes.forEach(g => { saidaCartoes += parseCurrency(g.dados[7]); });
    contasFixasDoMes.forEach(g => { saidaContas += parseCurrency(g.dados[7]); });
    
    devedores.forEach(dev => {
      if (isDividaAparte(dev) && !isAparteComCaixa(dev)) return;
      const dAcordo = parseDataBR(dev.dados[5]);
      const vOriginal = parseCurrency(dev.dados[7]);
      const juros = parseCurrency(dev.dados[10]);
      const status = safeString(dev.dados[9]);
      const montanteFinal = vOriginal + (vOriginal * (juros / 100));

      if (dAcordo && dAcordo.getMonth() === mesAtual && dAcordo.getFullYear() === anoAtual && status !== 'Concluído') {
        saidaOutros += vOriginal;
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
        saidaOutros += col9;
      } else if (tipoOp.includes('VENDA') || tipoOp.includes('RESGATE') || tipoOp.includes('PROVENTO')) {
        const val = qtd * col9;
        renda += val;
        if (tipoOp.includes('PROVENTO')) proventosMes += val;
      }
    });

    const saidaTotal = saidaCartoes + saidaContas + saidaOutros;

    return { 
      renda: Number(renda.toFixed(2)), 
      saida: Number(saidaTotal.toFixed(2)),
      saidaCartoes: Number(saidaCartoes.toFixed(2)),
      saidaContas: Number(saidaContas.toFixed(2)),
      livre: Number((renda - saidaTotal).toFixed(2)), 
      lucroCobranca: Number(lucroCobranca.toFixed(2)),
      proventosMes: Number(proventosMes.toFixed(2))
    };
  };

  const dadosCaixa = calcCaixaLivre();
  const patrimonioGlobal = totalInvestido + totalRecebiveisRua + Math.max(0, dadosCaixa.livre);
  const nomesClientesExistentes = Array.from(new Set(devedores.map(d => safeString(d.dados[6])).filter(Boolean)));

  // Projeção dos próximos 4 meses (Compromissos já lançados vs. Recebíveis agendados)
  const projecaoFutura = useMemo(() => {
    const lista = [];
    for (let offset = 1; offset <= 4; offset++) {
      const dRef = new Date(anoAtual, mesAtual + offset, 1);
      const m = dRef.getMonth();
      const a = dRef.getFullYear();

      let compromissos = 0;
      gastosCartao.forEach(g => {
        const d = parseDataBR(g.dados[5]);
        if (d && d.getMonth() === m && d.getFullYear() === a && safeString(g.dados[11]).toUpperCase() !== 'PAGO') {
          compromissos += parseCurrency(g.dados[7]);
        }
      });

      let recebiveis = 0;
      devedores.forEach(dev => {
        const d = parseDataBR(dev.dados[8]);
        if (d && d.getMonth() === m && d.getFullYear() === a && safeString(dev.dados[9]) !== 'Concluído') {
          const v = parseCurrency(dev.dados[7]);
          const j = parseCurrency(dev.dados[10]);
          recebiveis += v + (v * (j / 100));
        }
      });

      lista.push({
        label: `${mesesCurtos[m]}/${String(a).slice(2)}`,
        mes: m,
        ano: a,
        compromissos,
        recebiveis
      });
    }
    return lista;
  }, [gastosCartao, devedores, mesAtual, anoAtual]);

  // Tela de Carregamento Institucional
  if (isGlobalLoading) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
          <Loader2 className="animate-spin" size={24} />
        </div>
        <p className="text-xs font-medium text-zinc-400 tracking-wide">Autenticando ambiente bancário...</p>
      </div>
    );
  }

  // Tela de Bloqueio por PIN Bancário (4 dígitos)
  if (isLocked && savedPin) {
    return (
      <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs bg-[#121318] border border-[#1f2128] rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={22} />
          </div>
          <h2 className="text-base font-semibold text-zinc-100">Acesso Protegido</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-6">Digite seu PIN bancário de 4 dígitos</p>
          
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map(idx => (
              <div key={idx} className={`w-3.5 h-3.5 rounded-full border transition-all ${pinInput.length > idx ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-700 bg-zinc-900'}`} />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => {
                  const next = (pinInput + num).slice(0, 4);
                  setPinInput(next);
                  if (next.length === 4) {
                    if (next === savedPin) {
                      setIsLocked(false);
                      setPinInput('');
                    } else {
                      setTimeout(() => setPinInput(''), 300);
                    }
                  }
                }}
                className="py-3.5 rounded-xl bg-[#181a20] hover:bg-zinc-800 text-zinc-100 font-semibold text-base active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
            <div />
            <button
              onClick={() => {
                const next = (pinInput + '0').slice(0, 4);
                setPinInput(next);
                if (next.length === 4) {
                  if (next === savedPin) {
                    setIsLocked(false);
                    setPinInput('');
                  } else {
                    setTimeout(() => setPinInput(''), 300);
                  }
                }
              }}
              className="py-3.5 rounded-xl bg-[#181a20] hover:bg-zinc-800 text-zinc-100 font-semibold text-base active:scale-95 transition-all"
            >
              0
            </button>
            <button
              onClick={() => setPinInput(p => p.slice(0, -1))}
              className="py-3.5 rounded-xl bg-[#181a20] hover:bg-zinc-800 text-zinc-400 font-medium text-xs active:scale-95 transition-all"
            >
              Apagar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const qtdUrgentes = listaNotificacoes.filter(n => n.urgencia === 'atrasado' || n.urgencia === 'hoje').length;

  return (
    <main className="min-h-screen bg-[#090a0f] text-zinc-100 pb-24 font-sans relative">
      {/* Toast Notification Bancário */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[200] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border w-[92%] max-w-sm backdrop-blur-md ${notification.type === 'success' ? 'bg-zinc-900/95 border-emerald-500/40 text-emerald-400' : 'bg-zinc-900/95 border-rose-500/40 text-rose-400'}`}>
          {notification.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
          <span className="font-medium text-xs text-zinc-100">{notification.message}</span>
        </div>
      )}

      {/* Diálogos de Confirmação, Rolagem e Abatimento */}
      {customDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
          <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            {customDialog.type === 'delete' && (
              <>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4"><Trash2 size={24}/></div>
                <h3 className="text-center text-base font-semibold text-white mb-1">Confirmar exclusão</h3>
                <p className="text-center text-xs text-zinc-400 mb-6">{customDialog.message}</p>
                <div className="flex gap-2.5">
                  <button onClick={() => setCustomDialog(null)} className="flex-1 py-3 rounded-xl bg-[#181a20] text-zinc-300 font-medium text-xs active:scale-95">Cancelar</button>
                  <button onClick={() => handleExcluir(customDialog.linha, customDialog.aba)} className="flex-1 py-3 rounded-xl bg-rose-600 text-white font-semibold text-xs active:scale-95">Confirmar</button>
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

      {/* Modal de Central de Notificações */}
      {isNotifOpen && (
        <NotificationsDrawer
          notificacoes={listaNotificacoes}
          hideValues={hideValues}
          onClose={() => setIsNotifOpen(false)}
          onNavigate={(notif) => {
            setIsNotifOpen(false);
            if (notif.dataRef) {
              setMesAtual(notif.dataRef.getMonth());
              setAnoAtual(notif.dataRef.getFullYear());
            }
            setActiveTab(notif.acaoTab);
            if (notif.cliente) setClienteAtivo(notif.cliente);
          }}
          onDispararTelegram={async () => {
            showToast("Enviando resumo para o Telegram...");
            try {
              const res = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'notificar_telegram' })
              });
              const json = await res.json();
              if (json.success) showToast("Resumo enviado para o seu Telegram!");
              else showToast("Atualize o API.gs e notificar.gs na planilha para usar este botão.", "error");
            } catch (_) {
              showToast("Erro ao acionar Telegram.", "error");
            }
          }}
          showToast={showToast}
        />
      )}

      {/* Modal de Configuração de PIN */}
      {isPinModalOpen && (
        <PinConfigModal
          savedPin={savedPin}
          onClose={() => setIsPinModalOpen(false)}
          onSavePin={(novoPin) => {
            if (novoPin) {
              localStorage.setItem('appfinance_pin', novoPin);
              setSavedPin(novoPin);
              showToast("PIN bancário ativado.");
            } else {
              localStorage.removeItem('appfinance_pin');
              setSavedPin('');
              showToast("Bloqueio por PIN removido.");
            }
            setIsPinModalOpen(false);
          }}
          onLockNow={() => {
            setIsPinModalOpen(false);
            setIsLocked(true);
          }}
        />
      )}

      {/* Modal de Meta Patrimonial */}
      {isMetaModalOpen && (
        <MetaPatrimonioModal
          metaAtual={metaPatrimonio}
          onClose={() => setIsMetaModalOpen(false)}
          onSaveMeta={(novaMeta) => {
            setMetaPatrimonio(novaMeta);
            localStorage.setItem('appfinance_meta', String(novaMeta));
            setIsMetaModalOpen(false);
            showToast("Meta patrimonial atualizada.");
          }}
        />
      )}

      {/* TOP BAR BANCÁRIA */}
      <header className="sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-xl border-b border-[#181a22] px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-semibold text-xs">
              AF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-100 tracking-tight">AppFinance</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">Private</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : (syncStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500')}`} />
                <span className="text-[10px] text-zinc-500">{syncStatus === 'syncing' ? 'Sincronizando...' : 'Conta sincronizada'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sino de Notificações */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 rounded-xl bg-[#121318] border border-[#1f2128] text-zinc-300 hover:text-white active:scale-95 transition-all"
              title="Notificações e Vencimentos"
            >
              <Bell size={17} />
              {listaNotificacoes.length > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${qtdUrgentes > 0 ? 'bg-rose-500' : 'bg-amber-500'}`}>
                  {listaNotificacoes.length}
                </span>
              )}
            </button>

            {/* Modo Privacidade */}
            <button
              onClick={() => setHideValues(!hideValues)}
              className="p-2 rounded-xl bg-[#121318] border border-[#1f2128] text-zinc-300 hover:text-white active:scale-95 transition-all"
              title={hideValues ? "Mostrar saldos" : "Ocultar saldos"}
            >
              {hideValues ? <EyeOff size={17}/> : <Eye size={17}/>}
            </button>

            {/* Segurança PIN */}
            <button
              onClick={() => setIsPinModalOpen(true)}
              className={`p-2 rounded-xl bg-[#121318] border border-[#1f2128] active:scale-95 transition-all ${savedPin ? 'text-emerald-400' : 'text-zinc-400'}`}
              title="Segurança e PIN"
            >
              <Lock size={17} />
            </button>

            {/* Sincronizar */}
            <button
              onClick={() => fetchDados(true)}
              className="p-2 rounded-xl bg-[#121318] border border-[#1f2128] text-zinc-300 hover:text-white active:scale-95 transition-all"
              title="Atualizar dados"
            >
              <RefreshCw size={17} className={syncStatus === 'syncing' ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
        </div>

        {/* Seletor de Competência (Mês / Ano) */}
        <div className="max-w-2xl mx-auto mt-2.5 flex items-center justify-between bg-[#121318] border border-[#1f2128] rounded-xl px-2 py-1">
          <button
            onClick={() => { setMesAtual(p => p === 0 ? 11 : p - 1); if (mesAtual === 0) setAnoAtual(a => a - 1); }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <ChevronLeft size={16}/>
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-200">{meses[mesAtual]} de {anoAtual}</span>
          </div>
          <button
            onClick={() => { setMesAtual(p => p === 11 ? 0 : p + 1); if (mesAtual === 11) setAnoAtual(a => a + 1); }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg"
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {activeTab === 'dashboard' && (
          <ResumoView
            dadosCaixa={dadosCaixa}
            patrimonioGlobal={patrimonioGlobal}
            totalInvestido={totalInvestido}
            totalRecebiveisRua={totalRecebiveisRua}
            metaPatrimonio={metaPatrimonio}
            onEditarMeta={() => setIsMetaModalOpen(true)}
            projecaoFutura={projecaoFutura}
            notificacoesUrgentes={listaNotificacoes.slice(0, 3)}
            onAbrirNotificacoes={() => setIsNotifOpen(true)}
            onAtalho={(acao) => {
              if (acao === 'conta_fixa') abrirNovaContaFixa('Conta Fixa');
              else if (acao === 'juros_obra') abrirNovaContaFixa('Juros de Obra');
              else if (acao === 'divida_aparte') abrirNovaDividaAparte('');
              else {
                setEditItem(null);
                setModalType(acao);
                setIsModalOpen(true);
              }
            }}
            salarios={salarios}
            hist={historicoOrdens}
            mes={mesAtual}
            ano={anoAtual}
            hideValues={hideValues}
            onEdit={i => abrirEdicao(i, 'salario')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdRendas', linha: l, message: 'Este lançamento de receita será excluído.' })}
          />
        )}

        {activeTab === 'contas' && (
          <ContasFixasView
            todosLancamentos={gastosCartao}
            contasDoMes={contasFixasDoMes}
            mesNome={meses[mesAtual]}
            hideValues={hideValues}
            onNovaConta={(subtipo) => abrirNovaContaFixa(subtipo)}
            onReplicarMesAnterior={() => handleReplicarFixosMesAnterior(true)}
            onEdit={i => abrirEdicao(i, 'conta_fixa')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdLancamentos', linha: l, message: 'Esta conta será removida permanentemente.' })}
            onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], i.dados[9], i.dados[10], s, i.dados[12]], 'bdLancamentos', i.linha)}
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
            onNovoInvestimento={() => { setEditItem(null); setModalType('ativo'); setIsModalOpen(true); }}
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
            onDelete={(l, a) => setCustomDialog({ type: 'delete', aba: a, linha: l, message: 'A operação será removida da carteira.' })}
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
            onNovoEmprestimo={() => { setEditItem(null); setModalType('devedor'); setIsModalOpen(true); }}
            onNovaDividaAparte={() => abrirNovaDividaAparte('')}
            onEdit={i => abrirEdicao(i, 'devedor')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdDevedores', linha: l, message: 'O registro será removido permanentemente.' })}
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
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdDevedores', linha: l, message: 'O contrato será removido permanentemente.' })}
            onRolar={(item, totalAtual) => setCustomDialog({ type: 'rolar', item, totalAtual })}
            onAbaterAparte={item => setCustomDialog({ type: 'abater_aparte', item })}
            onNovaDividaAparte={() => abrirNovaDividaAparte(clienteAtivo)}
          />
        )}
        
        {activeTab === 'cartoes' && (
          <CartoesView
            items={cartoesCreditoDoMes}
            rendaMes={dadosCaixa.renda}
            hideValues={hideValues}
            onNovoGastoCartao={() => { setEditItem(null); setModalType('cartao'); setIsModalOpen(true); }}
            onReplicarFixosCartao={() => handleReplicarFixosMesAnterior(false)}
            onEdit={i => abrirEdicao(i, 'cartao')}
            onDelete={l => setCustomDialog({ type: 'delete', aba: 'bdLancamentos', linha: l, message: 'A despesa será removida da fatura.' })}
            onStatusChange={(i, s) => handleGravarDados([i.dados[5], i.dados[6], i.dados[7], i.dados[8], i.dados[9], i.dados[10], s, i.dados[12]], 'bdLancamentos', i.linha)}
            onPagarFaturaBanco={handlePagarFaturaBanco}
          />
        )}
      </div>

      {/* BARRA DE NAVEGAÇÃO INFERIOR (ESTILO BANKING) */}
      <nav className="fixed bottom-0 w-full bg-[#0c0d12]/95 backdrop-blur-xl border-t border-[#1c1e26] flex justify-around items-center py-2 px-1 z-50">
        <NavButton active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setCarteiraDetalhe(null); setClienteAtivo(null); }} icon={<LayoutDashboard size={20} />} label="Início" />
        <NavButton active={activeTab === 'contas'} onClick={() => { setActiveTab('contas'); setCarteiraDetalhe(null); setClienteAtivo(null); }} icon={<Building2 size={20} />} label="Contas Fixas" />
        <NavButton active={activeTab === 'cartoes'} onClick={() => { setActiveTab('cartoes'); setCarteiraDetalhe(null); setClienteAtivo(null); }} icon={<CreditCard size={20} />} label="Cartões" />
        <NavButton active={activeTab === 'patrimonio'} onClick={() => { setActiveTab('patrimonio'); setCarteiraDetalhe(null); setClienteAtivo(null); }} icon={<TrendingUp size={20} />} label="Investir" />
        <NavButton active={activeTab === 'devedores'} onClick={() => { setActiveTab('devedores'); setCarteiraDetalhe(null); setClienteAtivo(null); }} icon={<Users size={20} />} label="Cobranças" />
      </nav>

      {/* Botão Flutuante Discreto de Transação Rápida */}
      <button
        onClick={() => { setEditItem(null); setDevedorPreSelecionado(''); setModalType('escolha'); setIsModalOpen(true); }}
        className="fixed bottom-20 right-4 z-40 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 font-semibold text-xs active:scale-95 transition-all border border-emerald-400/20"
      >
        <Plus size={16} /> Transação
      </button>

      {isModalOpen && (
        <LancamentoModal
          tipo={modalType}
          setTipo={setModalType}
          editItem={editItem}
          resgateAtivoTipo={resgateAtivoTipo}
          devedorPreSelecionado={devedorPreSelecionado}
          subtipoContaPre={subtipoContaPre}
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
// 1. ABA INÍCIO (RESUMO & PATRIMÔNIO GLOBAL)
// ==========================================
function ResumoView({
  dadosCaixa, patrimonioGlobal, totalInvestido, totalRecebiveisRua,
  metaPatrimonio, onEditarMeta, projecaoFutura, notificacoesUrgentes,
  onAbrirNotificacoes, onAtalho, salarios, hist, mes, ano, hideValues, onEdit, onDelete
}) {
  const filtrados = salarios.filter(s => {
    const d = parseDataBR(s.dados[5]);
    return d && d.getMonth() === mes && d.getFullYear() === ano;
  });
  const proventosMes = hist.filter(o => {
    const d = parseDataBR(o.dados[5]);
    return safeString(o.dados[7]).toUpperCase() === 'PROVENTO' && d && d.getMonth() === mes && d.getFullYear() === ano;
  });

  const percMeta = metaPatrimonio > 0 ? Math.min(100, Math.round((patrimonioGlobal / metaPatrimonio) * 100)) : 0;
  const percRendaComprometida = dadosCaixa.renda > 0 ? Math.round((dadosCaixa.saida / dadosCaixa.renda) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Banner de Alertas de Vencimento (se houver) */}
      {notificacoesUrgentes.length > 0 && (
        <div
          onClick={onAbrirNotificacoes}
          className="bg-[#121318] border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#161820] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Bell size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-100">
                {notificacoesUrgentes[0].titulo} ({notificacoesUrgentes[0].diffDias < 0 ? 'Em atraso' : (notificacoesUrgentes[0].diffDias === 0 ? 'Vence hoje' : `Em ${notificacoesUrgentes[0].diffDias}d`)})
              </p>
              <p className="text-[11px] text-zinc-400">
                R$ {formatMoney(notificacoesUrgentes[0].valor, hideValues)} • Toque para ver todos os alertas
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-zinc-500" />
        </div>
      )}

      {/* Card Principal: Conta & Fluxo de Caixa do Mês */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-5 shadow-lg">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-zinc-400">Saldo livre do mês</span>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">Conta Principal</span>
        </div>
        <p className={`text-3xl font-bold tracking-tight tabular-nums ${dadosCaixa.livre >= 0 ? 'text-zinc-100' : 'text-rose-400'}`}>
          R$ {formatMoney(dadosCaixa.livre, hideValues)}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#1f2128]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">Entradas no mês</p>
              <p className="text-sm font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(dadosCaixa.renda, hideValues)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowDownRight size={16} />
            </div>
            <div>
              <p className="text-[11px] text-zinc-400">Saídas & Contas</p>
              <p className="text-sm font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(dadosCaixa.saida, hideValues)}</p>
            </div>
          </div>
        </div>

        {/* Termômetro de Comprometimento da Renda */}
        {dadosCaixa.renda > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1f2128]">
            <div className="flex justify-between text-[11px] mb-1.5">
              <span className="text-zinc-400">Comprometimento da renda</span>
              <span className={`font-semibold ${percRendaComprometida > 85 ? 'text-rose-400' : (percRendaComprometida > 65 ? 'text-amber-400' : 'text-emerald-400')}`}>
                {percRendaComprometida}% utilizado
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, percRendaComprometida)}%` }}
                className={`h-full transition-all ${percRendaComprometida > 85 ? 'bg-rose-500' : (percRendaComprometida > 65 ? 'bg-amber-500' : 'bg-emerald-500')}`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1.5">
              <span>Contas Fixas/Imóvel: R$ {formatMoney(dadosCaixa.saidaContas, hideValues)}</span>
              <span>Cartões: R$ {formatMoney(dadosCaixa.saidaCartoes, hideValues)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Carrossel Horizontal de Ações Rápidas (Estilo Banco Digital) */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
        <QuickBankAction icon={<Building2 size={18}/>} label="Conta Fixa" onClick={() => onAtalho('conta_fixa')} />
        <QuickBankAction icon={<Landmark size={18}/>} label="Juros Obra" onClick={() => onAtalho('juros_obra')} />
        <QuickBankAction icon={<CreditCard size={18}/>} label="Cartão" onClick={() => onAtalho('cartao')} />
        <QuickBankAction icon={<Banknote size={18}/>} label="Receita" onClick={() => onAtalho('salario')} />
        <QuickBankAction icon={<TrendingUp size={18}/>} label="Investir" onClick={() => onAtalho('ativo')} />
        <QuickBankAction icon={<Users size={18}/>} label="Emprestar" onClick={() => onAtalho('devedor')} />
        <QuickBankAction icon={<Bookmark size={18}/>} label="Dívida 0%" onClick={() => onAtalho('divida_aparte')} />
      </div>

      {/* Card Patrimônio Global Consolidado + Meta Financeira */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-5">
        <div className="flex justify-between items-start mb-1">
          <div>
            <span className="text-xs font-medium text-zinc-400">Patrimônio Global Consolidado</span>
            <p className="text-2xl font-bold text-zinc-100 tabular-nums mt-0.5">R$ {formatMoney(patrimonioGlobal, hideValues)}</p>
          </div>
          <button
            onClick={onEditarMeta}
            className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1"
          >
            <Target size={13} /> Meta: {percMeta}%
          </button>
        </div>

        <div className="mt-3">
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div style={{ width: `${percMeta}%` }} className="h-full bg-emerald-500 transition-all" />
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
            <span>Objetivo: R$ {formatMoney(metaPatrimonio, hideValues)}</span>
            <span>Renda passiva mês: +R$ {formatMoney(dadosCaixa.lucroCobranca + dadosCaixa.proventosMes, hideValues)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-[#1f2128] text-xs">
          <div className="bg-[#16181f] p-3 rounded-xl">
            <span className="text-[11px] text-zinc-400 block">Em Investimentos</span>
            <span className="font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(totalInvestido, hideValues)}</span>
          </div>
          <div className="bg-[#16181f] p-3 rounded-xl">
            <span className="text-[11px] text-zinc-400 block">Recebíveis Ativos</span>
            <span className="font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(totalRecebiveisRua, hideValues)}</span>
          </div>
        </div>
      </div>

      {/* Projeção dos Próximos 4 Meses */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-5">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-zinc-200">Projeção dos próximos meses</span>
          <span className="text-[11px] text-zinc-500">Contas/Parcelas vs. Recebíveis</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {projecaoFutura.map((p, idx) => (
            <div key={idx} className="bg-[#16181f] border border-[#1f2128] rounded-xl p-2.5 text-center">
              <span className="text-[11px] font-semibold text-zinc-300 block mb-1.5">{p.label}</span>
              <p className="text-[10px] text-rose-400 tabular-nums font-medium" title="Contas e Parcelas a Pagar">
                -R$ {formatMoney(p.compromissos, hideValues)}
              </p>
              <p className="text-[10px] text-emerald-400 tabular-nums font-medium mt-0.5" title="Cobranças a Receber">
                +R$ {formatMoney(p.recebiveis, hideValues)}
              </p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Extrato de Entradas & Salários do Mês */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-semibold text-zinc-400 px-1">Receitas e Salários do Mês</h3>
        {filtrados.length === 0 ? (
          <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-4 text-xs text-zinc-500 text-center">
            Nenhuma receita registrada neste mês.
          </div>
        ) : filtrados.map((item, idx) => {
          const desc = safeString(item.dados[12]) || 'Crédito de Salário / Receita';
          return (
            <div key={idx} className="p-4 bg-[#121318] border border-[#1f2128] rounded-2xl flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Banknote size={17}/></div>
                <div>
                  <p className="text-xs font-semibold text-zinc-100">{desc}</p>
                  <p className="text-[11px] text-zinc-500">{formatDateToBR(parseDataBR(item.dados[5]))}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold text-emerald-400 tabular-nums">+R$ {formatMoney(parseCurrency(item.dados[11]), hideValues)}</p>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(item)} className="p-2 bg-[#181a20] rounded-lg text-zinc-400 hover:text-white"><Edit size={15}/></button>
                  <button onClick={() => onDelete(item.linha)} className="p-2 bg-[#181a20] rounded-lg text-zinc-400 hover:text-rose-400"><Trash2 size={15}/></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Proventos e Dividendos do Mês */}
      {proventosMes.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-zinc-400 px-1">Dividendos e Rendimentos Creditados</h3>
          {proventosMes.map((item, idx) => (
            <div key={idx} className="p-4 bg-[#121318] border border-[#1f2128] rounded-2xl flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Coins size={17}/></div>
                <div>
                  <p className="text-xs font-semibold text-zinc-100">Provento {item.dados[6]}</p>
                  <p className="text-[11px] text-zinc-500">{formatDateToBR(parseDataBR(item.dados[5]))}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-emerald-400 tabular-nums">+R$ {formatMoney(parseCurrency(item.dados[9]), hideValues)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. NOVA ABA: CONTAS FIXAS & IMÓVEL (JUROS DE OBRA, PARCELA APTO, BOLETOS)
// ==========================================
function ContasFixasView({ todosLancamentos, contasDoMes, mesNome, hideValues, onNovaConta, onReplicarMesAnterior, onEdit, onDelete, onStatusChange }) {
  const [filtroTipo, setFiltroTipo] = useState('todos'); // 'todos', 'imovel', 'fixas', 'pix'
  const [busca, setBusca] = useState('');

  // Acumulado Histórico do Imóvel / Apartamento (Parcelas vs. Juros de Obra)
  const resumoImovelHistorico = useMemo(() => {
    let totalPagoParcelas = 0;
    let totalPagoJurosObra = 0;
    let mesAtualImovel = 0;

    todosLancamentos.forEach(item => {
      if (!isItemImovel(item)) return;
      const val = parseCurrency(item.dados[7]);
      const pago = safeString(item.dados[11]).toUpperCase() === 'PAGO';
      if (pago) {
        if (isJurosDeObra(item)) totalPagoJurosObra += val;
        else totalPagoParcelas += val;
      }
    });

    contasDoMes.forEach(item => {
      if (isItemImovel(item)) mesAtualImovel += parseCurrency(item.dados[7]);
    });

    return {
      totalPagoParcelas,
      totalPagoJurosObra,
      totalGeralImovel: totalPagoParcelas + totalPagoJurosObra,
      mesAtualImovel
    };
  }, [todosLancamentos, contasDoMes]);

  let totalMes = 0;
  let totalPagoMes = 0;
  let totalPendenteMes = 0;

  contasDoMes.forEach(i => {
    const v = parseCurrency(i.dados[7]);
    const isPago = safeString(i.dados[11]).toUpperCase() === 'PAGO';
    totalMes += v;
    if (isPago) totalPagoMes += v;
    else totalPendenteMes += v;
  });

  const filtradas = contasDoMes
    .filter(i => {
      if (filtroTipo === 'imovel' && !isItemImovel(i)) return false;
      if (filtroTipo === 'fixas' && (isItemImovel(i) || safeString(i.dados[6]).toUpperCase().includes('PIX'))) return false;
      if (filtroTipo === 'pix' && !safeString(i.dados[6]).toUpperCase().includes('PIX')) return false;
      if (busca.trim()) {
        const termo = busca.toLowerCase();
        return safeString(i.dados[8]).toLowerCase().includes(termo) ||
          safeString(i.dados[9]).toLowerCase().includes(termo) ||
          safeString(i.dados[6]).toLowerCase().includes(termo);
      }
      return true;
    })
    .sort((a, b) => {
      const aPago = safeString(a.dados[11]).toUpperCase() === 'PAGO';
      const bPago = safeString(b.dados[11]).toUpperCase() === 'PAGO';
      if (aPago && !bPago) return 1;
      if (!aPago && bPago) return -1;
      return (parseDataBR(a.dados[5])?.getTime() || 0) - (parseDataBR(b.dados[5])?.getTime() || 0);
    });

  return (
    <div className="space-y-4">
      {/* Card Resumo Contas Fixas do Mês */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-5">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-medium text-zinc-400">Compromissos & Contas Fixas ({mesNome})</span>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums mt-0.5">R$ {formatMoney(totalMes, hideValues)}</p>
          </div>
          <button
            onClick={onReplicarMesAnterior}
            className="bg-[#181a20] hover:bg-zinc-800 border border-[#272a34] text-zinc-200 px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-all"
            title="Copiar contas fixas do mês anterior para este mês"
          >
            <Copy size={13} className="text-emerald-400" /> Importar Mês Ant.
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#1f2128]">
          <div>
            <span className="text-[11px] text-zinc-400 block">Liquidado no mês</span>
            <span className="text-sm font-semibold text-emerald-400 tabular-nums">R$ {formatMoney(totalPagoMes, hideValues)}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-zinc-400 block">Aberto a pagar</span>
            <span className="text-sm font-semibold text-amber-400 tabular-nums">R$ {formatMoney(totalPendenteMes, hideValues)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#1f2128]">
          <button
            onClick={() => onNovaConta('Juros de Obra')}
            className="bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 py-2.5 px-2 rounded-xl text-[11px] font-semibold active:scale-95 transition-all"
          >
            + Juros de Obra
          </button>
          <button
            onClick={() => onNovaConta('Parcela Imóvel')}
            className="bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 py-2.5 px-2 rounded-xl text-[11px] font-semibold active:scale-95 transition-all"
          >
            + Parcela Apto
          </button>
          <button
            onClick={() => onNovaConta('Conta Fixa')}
            className="bg-[#181a20] hover:bg-zinc-800 border border-[#272a34] text-zinc-200 py-2.5 px-2 rounded-xl text-[11px] font-semibold active:scale-95 transition-all"
          >
            + Conta / Pix
          </button>
        </div>
      </div>

      {/* Painel Especial: Acompanhamento Acumulado do Imóvel / Apartamento */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Building2 size={17} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-100">Meu Imóvel / Apartamento</h4>
              <p className="text-[11px] text-zinc-500">Acumulado histórico de parcelas e evolução de obra</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-zinc-200 tabular-nums">
            Total Pago: R$ {formatMoney(resumoImovelHistorico.totalGeralImovel, hideValues)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[#16181f] p-3 rounded-xl">
            <span className="text-[10px] text-zinc-400 block">Parcelas Pagas</span>
            <span className="font-semibold text-emerald-400 tabular-nums">R$ {formatMoney(resumoImovelHistorico.totalPagoParcelas, hideValues)}</span>
          </div>
          <div className="bg-[#16181f] p-3 rounded-xl">
            <span className="text-[10px] text-zinc-400 block">Juros Obra Pagos</span>
            <span className="font-semibold text-amber-400 tabular-nums">R$ {formatMoney(resumoImovelHistorico.totalPagoJurosObra, hideValues)}</span>
          </div>
          <div className="bg-[#16181f] p-3 rounded-xl">
            <span className="text-[10px] text-zinc-400 block">Neste Mês</span>
            <span className="font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(resumoImovelHistorico.mesAtualImovel, hideValues)}</span>
          </div>
        </div>
      </div>

      {/* Busca e Filtros de Contas */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar conta, juros de obra, parcela ou boleto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#121318] border border-[#1f2128] rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-emerald-500/40"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'imovel', label: 'Imóvel & Obra' },
            { id: 'fixas', label: 'Contas Mensais' },
            { id: 'pix', label: 'Pix & Débito' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFiltroTipo(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${filtroTipo === f.id ? 'bg-emerald-600 text-white' : 'bg-[#121318] border border-[#1f2128] text-zinc-400'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Contas Fixas e Compromissos */}
      {filtradas.length === 0 ? (
        <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-8 text-center">
          <Building2 size={28} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-xs font-semibold text-zinc-300">Nenhuma conta fixa registrada em {mesNome}</p>
          <p className="text-[11px] text-zinc-500 mt-1 mb-4">Lance parcelas do apartamento, juros de obra, condomínio, energia ou importe do mês anterior.</p>
          <button
            onClick={() => onNovaConta('Juros de Obra')}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-semibold"
          >
            + Lançar Conta ou Juros de Obra
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtradas.map((i, idx) => {
            const isPago = safeString(i.dados[11]).toUpperCase() === 'PAGO';
            const dVenc = parseDataBR(i.dados[5]);
            const tipo = safeString(i.dados[6]) || 'Conta Fixa';
            const valor = parseCurrency(i.dados[7]);
            const desc = safeString(i.dados[8]);
            const categoria = safeString(i.dados[9]);
            const imovel = isItemImovel(i);

            let statusLabel = isPago ? "Liquidado" : "Em aberto";
            let statusStyle = isPago ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400";

            if (!isPago && dVenc) {
              const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
              const v = new Date(dVenc); v.setHours(0, 0, 0, 0);
              const diff = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
              if (diff < 0) { statusLabel = `Atrasado (${Math.abs(diff)}d)`; statusStyle = "bg-rose-500/15 text-rose-400"; }
              else if (diff === 0) { statusLabel = "Vence Hoje"; statusStyle = "bg-amber-500/15 text-amber-400"; }
              else if (diff === 1) { statusLabel = "Vence Amanhã"; statusStyle = "bg-amber-500/15 text-amber-400"; }
              else { statusLabel = `Vence em ${diff}d`; statusStyle = "bg-zinc-800 text-zinc-300"; }
            }

            return (
              <div key={idx} className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${isPago ? 'bg-[#121318]/60 border-[#1a1c22] opacity-70' : 'bg-[#121318] border-[#1f2128]'}`}>
                <div className="flex gap-3.5 items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${imovel ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-300'}`}>
                    {imovel ? <Building2 size={18}/> : <Receipt size={18}/>}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">{desc}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {tipo} • Venc. {dVenc ? formatDateToBR(dVenc) : '--/--/----'} {categoria ? `• ${categoria}` : ''}
                    </p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md mt-1.5 inline-block font-medium ${statusStyle}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className={`text-sm font-semibold tabular-nums ${isPago ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                    R$ {formatMoney(valor, hideValues)}
                  </p>
                  <div className="flex gap-1.5">
                    <button onClick={() => onEdit(i)} className="p-2 bg-[#181a20] rounded-lg text-zinc-400 hover:text-white"><Edit size={15}/></button>
                    <button onClick={() => onDelete(i.linha)} className="p-2 bg-[#181a20] rounded-lg text-zinc-400 hover:text-rose-400"><Trash2 size={15}/></button>
                    <button
                      onClick={() => onStatusChange(i, isPago ? 'Pendente' : 'Pago')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${isPago ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'}`}
                    >
                      {isPago ? <><RotateCcw size={13}/> Reabrir</> : <><CheckCircle size={13}/> Pagar</>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. ABA INVESTIR (CARTEIRA DE PATRIMÔNIO)
// ==========================================
function CarteiraView({ ativosVar, hist, ativosFixos, liveCrypto, cdiMensal, hideValues, onAbrirDetalhe, onNovoInvestimento }) {
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
    <div className="space-y-4">
      <div className="bg-[#121318] border border-[#1f2128] p-5 rounded-2xl">
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-medium text-zinc-400">Patrimônio Investido</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">CDI: {(cdiMensal * 100).toFixed(2)}% a.m.</span>
            {Object.keys(liveCrypto).length > 0 && <Activity size={14} className="text-emerald-400" title="Cotações em Tempo Real" />}
          </div>
        </div>
        <p className="text-3xl font-bold text-zinc-100 tabular-nums">R$ {formatMoney(patrimonioTotal, hideValues)}</p>

        {patrimonioTotal > 0 && (
          <div className="mt-4">
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-0.5">
              {valAcoes > 0 && <div style={{ width: `${(valAcoes / patrimonioTotal) * 100}%` }} className="bg-blue-500" />}
              {valFIIs > 0 && <div style={{ width: `${(valFIIs / patrimonioTotal) * 100}%` }} className="bg-violet-500" />}
              {valCripto > 0 && <div style={{ width: `${(valCripto / patrimonioTotal) * 100}%` }} className="bg-amber-500" />}
              {totalFixa > 0 && <div style={{ width: `${(totalFixa / patrimonioTotal) * 100}%` }} className="bg-emerald-500" />}
            </div>
            <div className="flex justify-between text-[11px] font-medium text-zinc-400 mt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/>Ações {pct(valAcoes)}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500"/>FIIs {pct(valFIIs)}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"/>Cripto {pct(valCripto)}%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/>Renda Fixa {pct(totalFixa)}%</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#1f2128]">
          <div>
            <p className="text-[11px] text-zinc-400">Proventos previstos (B3)</p>
            <p className="text-sm font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(proventosVariavel, hideValues)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-zinc-400">Rendimento Renda Fixa (Líq.)</p>
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">+R$ {formatMoney(rendimentoFixa, hideValues)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard title="Ações B3" qtd={acoes.length} val={valAcoes} hideValues={hideValues} dotColor="bg-blue-500" onClick={() => onAbrirDetalhe('Ação')} />
        <InfoCard title="Fundos Imobiliários" qtd={fiis.length} val={valFIIs} hideValues={hideValues} dotColor="bg-violet-500" onClick={() => onAbrirDetalhe('FII')} />
        <InfoCard title="Criptoativos" qtd={criptoArr.length} val={valCripto} hideValues={hideValues} dotColor="bg-amber-500" onClick={() => onAbrirDetalhe('Cripto')} />
        <InfoCard title="Renda Fixa" qtd={ativosFixos.length} val={totalFixa} hideValues={hideValues} dotColor="bg-emerald-500" onClick={() => onAbrirDetalhe('Renda Fixa')} />
      </div>

      <button
        onClick={onNovoInvestimento}
        className="w-full py-3.5 rounded-2xl bg-[#121318] hover:bg-[#161820] border border-[#1f2128] text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2"
      >
        <Plus size={16} /> Registrar Nova Aplicação ou Ordem
      </button>
    </div>
  );
}

function CarteiraDetalheView({ tipo, ativosVar, hist, ativosFixos, liveCrypto, cdiMensal, hideValues, onVoltar, onEdit, onDelete }) {
  const isF = tipo === 'Renda Fixa';
  let lista = [];
  
  if (isF) lista = ativosFixos;
  else if (tipo === 'Cripto') lista = consolidarCriptos(hist, liveCrypto);
  else lista = ativosVar.filter(a => safeString(a.dados[1]).toUpperCase().includes(tipo.toUpperCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium text-xs"><ArrowLeft size={16}/> Voltar à Carteira</button>
        <span className="text-xs font-semibold text-zinc-400">{tipo}</span>
      </div>

      {lista.length === 0 ? (
        <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 text-center text-xs text-zinc-500">
          Nenhum ativo encontrado nesta classe.
        </div>
      ) : lista.map((i, idx) => {
        if (isF) {
          const dataApp = parseDataBR(i.dados[5]);
          const dataVenc = parseDataBR(i.dados[6]);
          const nome = i.dados[7]; 
          const vA = parseCurrency(i.dados[8]); 
          const taxa = parseCurrency(i.dados[9]);
          const subTipo = i.dados[10] || 'CDB';
          const calc = calcFixa(vA, taxa, dataApp, subTipo, cdiMensal);
          
          return (
            <div key={idx} className="p-5 bg-[#121318] border border-[#1f2128] rounded-2xl">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-sm text-zinc-100">{nome}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {subTipo} • {taxa}{taxa > 20 ? '% do CDI' : '% a.m.'} • {calc.irRate === 0 ? 'Isento de IR' : `Alíquota IR ${(calc.irRate * 100).toFixed(1)}%`}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onEdit(i, 'resgate', 'Renda Fixa')} className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-emerald-400 text-[11px] font-medium flex items-center gap-1" title="Resgatar"><HandCoins size={14}/> Resgatar</button>
                  <button onClick={() => onEdit(i, 'edit')} className="bg-[#181a20] p-2 rounded-lg text-zinc-400 hover:text-white"><Edit size={15}/></button>
                  <button onClick={() => onDelete(i.linha, 'DB_Investimentos_Fixos')} className="bg-[#181a20] p-2 rounded-lg text-zinc-400 hover:text-rose-400"><Trash2 size={15}/></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-[#1f2128] pt-3 text-xs">
                <div><p className="text-[11px] text-zinc-500">Valor Aplicado ({formatDateToBR(dataApp)})</p><p className="font-semibold text-zinc-200 tabular-nums">R$ {formatMoney(vA, hideValues)}</p></div>
                <div className="text-right"><p className="text-[11px] text-zinc-500">Rendimento Bruto</p><p className="font-semibold text-emerald-400 tabular-nums">+R$ {formatMoney(calc.lucro, hideValues)}</p></div>
                <div><p className="text-[11px] text-zinc-500">Provisão IR</p><p className="font-semibold text-rose-400 tabular-nums">-R$ {formatMoney(calc.ir, hideValues)}</p></div>
                <div className="text-right"><p className="text-[11px] text-zinc-500">Saldo Líquido Atual</p><p className="font-bold text-zinc-100 tabular-nums">R$ {formatMoney(calc.liquido, hideValues)}</p></div>
                {dataVenc && (
                  <div className="col-span-2 pt-2 border-t border-[#1f2128] flex justify-between text-[11px]">
                    <span className="text-zinc-500">Vencimento do título</span>
                    <span className="font-medium text-zinc-300">{formatDateToBR(dataVenc)}</span>
                  </div>
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
          <div key={idx} className="p-5 bg-[#121318] border border-[#1f2128] rounded-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-sm text-zinc-100">{ticker}</p>
                <p className="text-[11px] text-zinc-400">Quantidade: {qtd} • Preço Médio: R$ {formatMoney(precoMedio, hideValues)}</p>
              </div>
              <button onClick={() => onEdit(i, 'resgate', tipo)} className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
                <HandCoins size={14}/> Vender
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[#1f2128] pt-3 text-xs">
              <div><p className="text-[11px] text-zinc-500">Custo de Aquisição</p><p className="font-semibold text-zinc-300 tabular-nums">R$ {formatMoney(custoTotal, hideValues)}</p></div>
              <div className="text-right"><p className="text-[11px] text-zinc-500">Posição Atual</p><p className="font-bold text-zinc-100 tabular-nums">R$ {formatMoney(valorMercado, hideValues)}</p></div>
              <div><p className="text-[11px] text-zinc-500">Resultado</p><p className={`font-semibold tabular-nums ${lucroAbs >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{lucroAbs >= 0 ? '+' : ''}R$ {formatMoney(lucroAbs, hideValues)}</p></div>
              {tipo !== 'Cripto' && (
                <div className="text-right"><p className="text-[11px] text-zinc-500">Proventos</p><p className="font-semibold text-zinc-200 tabular-nums">R$ {formatMoney(provento, hideValues)} ({dataProv || '--/--'})</p></div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 4. ABA COBRANÇAS (CONTRATOS C/ JUROS & DÍVIDAS À PARTE 0%)
// ==========================================
function DevedoresView({ items, hideValues, onAbrirCliente, onNovoEmprestimo, onNovaDividaAparte, onEdit, onDelete, onStatusChange, onAbaterAparte }) {
  const [abaDevedores, setAbaDevedores] = useState('juros');
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);

  const itensJuros = items.filter(i => !isDividaAparte(i));
  const itensAparte = items.filter(i => isDividaAparte(i));

  const c = {};
  let tE = 0; let tR = 0; let luc = 0;

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
      const aP = safeString(i.dados[9]) !== 'Concluído';
      const bP = safeString(b.dados[9]) !== 'Concluído';
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return (parseDataBR(a.dados[8])?.getTime() || 9999999999999) - (parseDataBR(b.dados[8])?.getTime() || 9999999999999);
    });

  return (
    <div className="space-y-4">
      <div className="flex bg-[#121318] p-1 rounded-xl border border-[#1f2128] gap-1">
        <button
          onClick={() => setAbaDevedores('juros')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${abaDevedores === 'juros' ? 'bg-[#1f222b] text-zinc-100' : 'text-zinc-400'}`}
        >
          <Users size={15}/> Contratos c/ Juros
        </button>
        <button
          onClick={() => setAbaDevedores('aparte')}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${abaDevedores === 'aparte' ? 'bg-[#1f222b] text-zinc-100' : 'text-zinc-400'}`}
        >
          <Bookmark size={15}/> Dívidas à Parte (0%)
          {qtdApartePendente > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/15 text-emerald-400">
              {qtdApartePendente}
            </span>
          )}
        </button>
      </div>

      {abaDevedores === 'juros' ? (
        <>
          <div className="bg-[#121318] border border-[#1f2128] p-5 rounded-2xl">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-medium text-zinc-400">Capital Alocado (Contratos Ativos)</span>
              <button onClick={() => setMostrarConcluidos(!mostrarConcluidos)} className="text-[11px] font-medium text-zinc-400 hover:text-white flex items-center gap-1">
                {mostrarConcluidos ? 'Ocultar quitados' : 'Ver quitados'}
              </button>
            </div>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums">R$ {formatMoney(tE, hideValues)}</p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#1f2128]">
              <div><p className="text-[11px] text-zinc-400">Total Liquidado</p><p className="text-sm font-semibold text-zinc-200 tabular-nums">R$ {formatMoney(tR, hideValues)}</p></div>
              <div className="text-right"><p className="text-[11px] text-zinc-400">Lucro Realizado</p><p className="text-sm font-semibold text-emerald-400 tabular-nums">+R$ {formatMoney(luc, hideValues)}</p></div>
            </div>
          </div>

          {clientesVisiveis.map((cli, idx) => (
            <div key={idx} onClick={() => onAbrirCliente(cli.n)} className={`p-4 border rounded-2xl flex justify-between items-center cursor-pointer transition-all ${cli.a === 0 ? 'bg-[#121318]/50 border-[#1a1c22] opacity-70' : 'bg-[#121318] border-[#1f2128] hover:border-zinc-700'}`}>
              <div className="flex gap-3.5 items-center">
                <div className="w-10 h-10 rounded-xl bg-[#181a20] border border-[#252830] flex items-center justify-center text-zinc-300 font-semibold text-xs">
                  {cli.n.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-100">{cli.n}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-zinc-500">{cli.a === 0 ? 'Contratos quitados' : `${cli.a} contrato(s) ativo(s)`}</p>
                    {cli.apartePendente > 0 && (
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md">
                        + R$ {formatMoney(cli.apartePendente, hideValues)} à parte
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(cli.e, hideValues)}</p>
                <ChevronRight size={16} className="text-zinc-600" />
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
          <div className="bg-[#121318] border border-[#1f2128] p-5 rounded-2xl">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-medium text-zinc-400">Dívidas à Parte (Empréstimos Sem Juros)</span>
              <button onClick={() => setMostrarConcluidos(!mostrarConcluidos)} className="text-[11px] font-medium text-zinc-400 hover:text-white">
                {mostrarConcluidos ? 'Ocultar pagos' : 'Ver pagos'}
              </button>
            </div>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums">R$ {formatMoney(totalApartePendente, hideValues)}</p>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#1f2128]">
              <div>
                <p className="text-[11px] text-zinc-400">Total já devolvido</p>
                <p className="text-sm font-semibold text-emerald-400 tabular-nums">R$ {formatMoney(totalApartePago, hideValues)}</p>
              </div>
              <button
                onClick={onNovaDividaAparte}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Plus size={15}/> Nova Dívida 0%
              </button>
            </div>
          </div>

          {listaAparteVisivel.length === 0 ? (
            <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 text-center">
              <p className="text-xs font-semibold text-zinc-300">Nenhuma dívida à parte em aberto</p>
              <p className="text-[11px] text-zinc-500 mt-1">Registre valores emprestados sem juros para controle pessoal.</p>
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

  return (
    <div className={`p-4 border rounded-2xl transition-all ${isConcluido ? 'bg-[#121318]/50 border-[#1a1c22] opacity-65' : 'bg-[#121318] border-[#1f2128]'}`}>
      <div className="flex justify-between items-start gap-2 mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
              {isConcluido ? 'Quitado' : 'Sem Juros (0%)'}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {afetaCaixa ? 'No Caixa' : 'Apenas Lembrete'}
            </span>
          </div>
          {showClientName && (
            <button onClick={onAbrirCliente} className="text-sm font-semibold text-zinc-100 hover:text-emerald-400 mt-1.5 block text-left">
              {nome}
            </button>
          )}
          <p className="text-xs text-zinc-400 mt-0.5">{motivo}</p>
        </div>

        <div className="flex gap-1 shrink-0">
          {!isConcluido && (
            <button
              onClick={() => cobrarWhatsApp(nome, valor, dVenc ? formatDateToBR(dVenc) : '', motivo)}
              className="bg-[#181a20] p-2 rounded-lg text-emerald-400"
              title="Enviar lembrete via WhatsApp"
            >
              <MessageCircle size={16}/>
            </button>
          )}
          <button onClick={onEdit} className="bg-[#181a20] p-2 rounded-lg text-zinc-400 hover:text-white"><Edit size={16}/></button>
          <button onClick={onDelete} className="bg-[#181a20] p-2 rounded-lg text-zinc-400 hover:text-rose-400"><Trash2 size={16}/></button>
          <button
            onClick={() => onStatusChange(item, isConcluido ? 'Pendente' : 'Concluído')}
            className={`p-2 rounded-lg ${isConcluido ? 'bg-[#181a20] text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}
          >
            {isConcluido ? <RotateCcw size={16}/> : <CheckCircle size={16}/>}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-end border-t border-[#1f2128] pt-3 text-xs">
        <div className="text-[11px] text-zinc-500">
          <span>Data: {dEmprestimo ? formatDateToBR(dEmprestimo) : '--/--/----'}</span>
          {dVenc && <span> • Venc.: {formatDateToBR(dVenc)}</span>}
        </div>
        <p className={`text-sm font-bold tabular-nums ${isConcluido ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
          R$ {formatMoney(valor, hideValues)}
        </p>
      </div>

      {!isConcluido && (
        <button
          onClick={onAbater}
          className="w-full mt-3 bg-[#181a20] hover:bg-zinc-800 border border-[#252830] text-zinc-200 py-2.5 rounded-xl text-xs font-medium flex justify-center items-center gap-1.5"
        >
          <HandCoins size={14} className="text-emerald-400"/> Registrar Abatimento Parcial
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

  const visiveisJuros = mostrarConcluidos ? filtradosJuros : filtradosJuros.filter(i => safeString(i.dados[9]) !== 'Concluído');
  const visiveisAparte = mostrarConcluidos ? filtradosAparte : filtradosAparte.filter(i => safeString(i.dados[9]) !== 'Concluído');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-medium text-xs"><ArrowLeft size={16}/> Voltar</button>
        <button onClick={() => setMostrarConcluidos(!mostrarConcluidos)} className="text-xs font-medium text-zinc-400 hover:text-white">
          {mostrarConcluidos ? 'Ocultar quitados' : 'Mostrar histórico completo'}
        </button>
      </div>
      
      <div className="bg-[#121318] border border-[#1f2128] p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-zinc-100">{nome}</h3>
          <button
            onClick={onNovaDividaAparte}
            className="bg-[#181a20] border border-[#272a34] text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
          >
            <Plus size={14}/> Dívida à Parte (0%)
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-[#1f2128] pt-3 text-xs">
          <div><p className="text-[11px] text-zinc-500">Principal Ativo</p><p className="font-semibold text-zinc-100 tabular-nums">R$ {formatMoney(tE, hideValues)}</p></div>
          <div><p className="text-[11px] text-zinc-500">Total Recebido</p><p className="font-semibold text-zinc-200 tabular-nums">R$ {formatMoney(tR, hideValues)}</p></div>
          <div><p className="text-[11px] text-zinc-500">Lucro Juros</p><p className="font-semibold text-emerald-400 tabular-nums">+R$ {formatMoney(luc, hideValues)}</p></div>
        </div>
      </div>

      {visiveisAparte.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-zinc-400 px-1">Dívidas à Parte (Sem Juros)</h4>
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
      
      <h4 className="text-xs font-semibold text-zinc-400 px-1">Contratos com Juros</h4>
      {visiveisJuros.length === 0 ? (
        <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-5 text-center text-xs text-zinc-500">
          Nenhum contrato ativo com juros para este cliente.
        </div>
      ) : visiveisJuros.map((i, idx) => {
        const vO = parseCurrency(i.dados[7]);
        const j = parseCurrency(i.dados[10]); 
        const dO = parseDataBR(i.dados[5]);
        const dVenc = parseDataBR(i.dados[8]);
        const total = vO + (vO * (j / 100)); 
        const isConcluido = safeString(i.dados[9]) === 'Concluído';

        let diasTexto = "";
        let diasCor = "text-zinc-400";
        if (!isConcluido && dVenc) {
          const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
          const v = new Date(dVenc); v.setHours(0, 0, 0, 0);
          const diffDias = Math.round((v.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
          if (diffDias > 1) { diasTexto = `Vence em ${diffDias} dias`; diasCor = "text-zinc-400"; }
          else if (diffDias === 1) { diasTexto = `Vence amanhã`; diasCor = "text-amber-400"; }
          else if (diffDias === 0) { diasTexto = `Vence Hoje`; diasCor = "text-amber-400 font-semibold"; }
          else { diasTexto = `Em atraso há ${Math.abs(diffDias)} dias`; diasCor = "text-rose-400 font-semibold"; }
        }

        return (
          <div key={idx} className={`p-4 border rounded-2xl transition-all ${isConcluido ? 'bg-[#121318]/50 border-[#1a1c22] opacity-65' : 'bg-[#121318] border-[#1f2128]'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${isConcluido ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500/10 text-amber-400'}`}>{i.dados[9]}</span>
                {!isConcluido && dVenc && <p className={`text-xs mt-1.5 ${diasCor}`}>{diasTexto}</p>}
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Vencimento: <span className="text-zinc-200">{dVenc ? formatDateToBR(dVenc) : '--/--/----'}</span>
                  {dO ? ` • Contrato: ${formatDateToBR(dO)}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                {!isConcluido && (
                  <button onClick={() => cobrarWhatsApp(nome, total, dVenc ? formatDateToBR(dVenc) : '')} className="bg-[#181a20] p-2 rounded-lg text-emerald-400" title="Cobrar via WhatsApp"><MessageCircle size={16}/></button>
                )}
                <button onClick={() => onEdit(i)} className="bg-[#181a20] p-2 rounded-lg text-zinc-400 hover:text-white"><Edit size={16}/></button>
                <button onClick={() => onDelete(i.linha)} className="bg-[#181a20] p-2 rounded-lg text-zinc-400 hover:text-rose-400"><Trash2 size={16}/></button>
                <button onClick={() => onStatusChange(i, isConcluido ? 'Pendente' : 'Concluído')} className={`p-2 rounded-lg ${isConcluido ? 'bg-[#181a20] text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {isConcluido ? <RotateCcw size={16}/> : <CheckCircle size={16}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-end border-t border-[#1f2128] pt-3 text-xs">
              <div className="text-zinc-400">
                Principal: R$ {formatMoney(vO, hideValues)} • Taxa: {j}%
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Total Atualizado</span>
                <p className="text-base font-bold text-zinc-100 tabular-nums">R$ {formatMoney(total, hideValues)}</p>
              </div>
            </div>
            {!isConcluido && (
              <button onClick={() => onRolar(i, total)} className="w-full mt-3 bg-[#181a20] hover:bg-zinc-800 border border-[#252830] text-zinc-200 py-2.5 rounded-xl text-xs font-medium flex justify-center items-center gap-1.5">
                <FastForward size={14} className="text-amber-400"/> Renegociar / Rolagem / Abater
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// 5. ABA CARTÕES DE CRÉDITO (BUSCA, ORÇAMENTO POR CATEGORIA E FATURAS)
// ==========================================
function CartoesView({ items, rendaMes, hideValues, onNovoGastoCartao, onReplicarFixosCartao, onEdit, onDelete, onStatusChange, onPagarFaturaBanco }) {
  const [busca, setBusca] = useState('');

  const itensFiltrados = items.filter(i => {
    if (!busca.trim()) return true;
    const t = busca.toLowerCase();
    return safeString(i.dados[8]).toLowerCase().includes(t) ||
      safeString(i.dados[9]).toLowerCase().includes(t) ||
      safeString(i.dados[10]).toLowerCase().includes(t);
  });

  let totalGeral = 0;
  const ordenados = [...itensFiltrados].sort((a, b) => {
    const aPago = safeString(a.dados[11]).toUpperCase() === 'PAGO';
    const bPago = safeString(b.dados[11]).toUpperCase() === 'PAGO';
    if (aPago && !bPago) return 1;
    if (!aPago && bPago) return -1;
    return (parseDataBR(a.dados[5])?.getTime() || 0) - (parseDataBR(b.dados[5])?.getTime() || 0);
  });

  const cartoesPorBanco = {};
  const categorias = {};

  ordenados.forEach(i => {
    const banco = safeString(i.dados[10]) || 'Cartão';
    const cat = safeString(i.dados[9]) || 'Geral';
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
    <div className="space-y-4">
      <div className="bg-[#121318] border border-[#1f2128] p-5 rounded-2xl">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-medium text-zinc-400">Total em Faturas de Cartão</span>
            <p className="text-3xl font-bold text-zinc-100 tabular-nums mt-0.5">R$ {formatMoney(totalGeral, hideValues)}</p>
          </div>
          <button
            onClick={onReplicarFixosCartao}
            className="bg-[#181a20] hover:bg-zinc-800 border border-[#272a34] text-zinc-300 px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5"
          >
            <Copy size={13} className="text-emerald-400"/> Importar Fixos
          </button>
        </div>

        {/* Distribuição por Categoria com Barras */}
        {Object.keys(categorias).length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1f2128] space-y-2">
            <span className="text-[11px] font-medium text-zinc-400 block">Consumo por categoria</span>
            {Object.entries(categorias)
              .sort((a, b) => b[1] - a[1])
              .map(([c, v], idx) => {
                const perc = totalGeral > 0 ? Math.round((v / totalGeral) * 100) : 0;
                return (
                  <div key={idx} className="text-xs">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-300">{c}</span>
                      <span className="text-zinc-400 tabular-nums">R$ {formatMoney(v, hideValues)} ({perc}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div style={{ width: `${perc}%` }} className="h-full bg-emerald-500" />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Barra de Pesquisa de Compras no Cartão */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Pesquisar compra, estabelecimento ou categoria..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full bg-[#121318] border border-[#1f2128] rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 outline-none focus:border-emerald-500/40"
        />
      </div>
      
      {Object.keys(cartoesPorBanco).length === 0 ? (
        <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 text-center">
          <p className="text-xs text-zinc-500">Nenhuma despesa de cartão localizada neste período.</p>
          <button onClick={onNovoGastoCartao} className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">
            + Lançar Compra no Cartão
          </button>
        </div>
      ) : (
        Object.keys(cartoesPorBanco).map(banco => {
          const primeiraFatura = cartoesPorBanco[banco].items[0] ? parseDataBR(cartoesPorBanco[banco].items[0].dados[5]) : null;
          const vencimentoStr = primeiraFatura ? formatDateToBR(primeiraFatura) : '--/--/----';
          const temPendente = cartoesPorBanco[banco].pendente > 0;
          
          return (
            <div key={banco} className="bg-[#121318] border border-[#1f2128] rounded-2xl overflow-hidden">
              <div className="bg-[#16181f] px-4 py-3.5 border-b border-[#1f2128] flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-zinc-100 text-sm">{banco}</h4>
                  <p className="text-[11px] text-zinc-500">Vencimento: {vencimentoStr}</p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-[10px] text-zinc-500">Total Fatura</p>
                    <p className="font-bold text-zinc-100 text-sm tabular-nums">R$ {formatMoney(cartoesPorBanco[banco].total, hideValues)}</p>
                  </div>
                  {temPendente && (
                    <button
                      onClick={() => onPagarFaturaBanco(cartoesPorBanco[banco].items, banco)}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1"
                    >
                      <CheckCheck size={14}/> Pagar
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[#1a1c24]">
                {cartoesPorBanco[banco].items.map((i, idx) => {
                  const isPago = safeString(i.dados[11]).toUpperCase() === 'PAGO';
                  const isFixo = safeString(i.dados[6]).toUpperCase() === 'FIXO';
                  const dCompraStr = safeString(i.dados[12]);

                  return (
                    <div key={idx} className={`p-4 flex justify-between items-center ${isPago ? 'opacity-60' : ''}`}>
                      <div className="flex gap-3 items-center">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPago ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#181a20] text-zinc-300'}`}>
                          <CreditCard size={16}/>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-100">{i.dados[8]}</p>
                          <p className="text-[11px] text-zinc-500">
                            {i.dados[9]} {dCompraStr ? `• ${dCompraStr}` : ''} {isFixo ? '• Recorrente' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className={`text-xs font-semibold tabular-nums ${isPago ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
                          R$ {formatMoney(parseCurrency(i.dados[7]), hideValues)}
                        </p>
                        <div className="flex gap-1">
                          <button onClick={() => onEdit(i)} className="p-1.5 bg-[#181a20] rounded-lg text-zinc-400 hover:text-white"><Edit size={14}/></button>
                          <button onClick={() => onDelete(i.linha)} className="p-1.5 bg-[#181a20] rounded-lg text-zinc-400 hover:text-rose-400"><Trash2 size={14}/></button>
                          <button onClick={() => onStatusChange(i, isPago ? 'Pendente' : 'Pago')} className={`p-1.5 rounded-lg ${isPago ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#181a20] text-zinc-400'}`}>
                            {isPago ? <CheckCircle size={14}/> : <RotateCcw size={14}/>}
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

// ==========================================
// CENTRAL DE NOTIFICAÇÕES (IN-APP + PUSH + TELEGRAM)
// ==========================================
function NotificationsDrawer({ notificacoes, hideValues, onClose, onNavigate, onDispararTelegram, showToast }) {
  const ativarPushNavegador = async () => {
    if (!("Notification" in window)) {
      showToast("Este navegador não suporta notificações nativas.", "error");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      showToast("Notificações do aparelho ativadas!");
      const urgentes = notificacoes.filter(n => n.urgencia === 'atrasado' || n.urgencia === 'hoje');
      if (urgentes.length > 0) {
        new Notification("AppFinance Banking • Alertas do Dia", {
          body: `Você possui ${urgentes.length} compromisso(s) vencendo hoje ou em atraso.`,
          icon: "/icon.png"
        });
      }
    } else {
      showToast("Permissão de notificação negada no aparelho.", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex justify-end">
      <div className="bg-[#121318] border-l border-[#1f2128] w-full max-w-md h-full flex flex-col p-5">
        <div className="flex justify-between items-center pb-4 border-b border-[#1f2128]">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-zinc-100">Central de Notificações e Vencimentos</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-[#181a20] text-zinc-400"><X size={18}/></button>
        </div>

        <div className="grid grid-cols-2 gap-2 my-3">
          <button
            onClick={ativarPushNavegador}
            className="bg-[#181a20] hover:bg-zinc-800 border border-[#252830] text-zinc-200 py-2.5 px-3 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5"
          >
            <Bell size={13} className="text-emerald-400"/> Ativar no Celular
          </button>
          <button
            onClick={onDispararTelegram}
            className="bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-400 py-2.5 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5"
          >
            <Send size={13}/> Enviar p/ Telegram
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {notificacoes.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-500">
              Nenhum vencimento próximo ou pendência em atraso.
            </div>
          ) : notificacoes.map(n => {
            const badge = n.diffDias < 0
              ? { txt: `Atrasado (${Math.abs(n.diffDias)}d)`, cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
              : (n.diffDias === 0
                ? { txt: 'Vence Hoje', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }
                : { txt: `Em ${n.diffDias} dia(s)`, cls: 'bg-zinc-800 text-zinc-300 border-zinc-700' });

            return (
              <div
                key={n.id}
                onClick={() => onNavigate(n)}
                className="p-3.5 rounded-xl bg-[#16181f] border border-[#222530] hover:border-zinc-600 cursor-pointer transition-all flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-zinc-400">{n.categoria}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${badge.cls}`}>{badge.txt}</span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-100 mt-1">{n.titulo}</p>
                  <p className="text-[11px] text-zinc-500">{n.subtitulo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-zinc-100 tabular-nums">R$ {formatMoney(n.valor, hideValues)}</p>
                  <span className="text-[10px] text-emerald-400">Abrir →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAIS DE APOIO (PIN, META, ABATIMENTO, ROLAGEM E LANÇAMENTOS)
// ==========================================
function PinConfigModal({ savedPin, onClose, onSavePin, onLockNow }) {
  const [novoPin, setNovoPin] = useState(savedPin || '');
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[260] flex items-center justify-center p-4">
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 w-full max-w-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-400"/> Segurança por PIN</h3>
          <button onClick={onClose} className="text-zinc-500"><X size={18}/></button>
        </div>
        <p className="text-xs text-zinc-400 mb-4">Configure uma senha numérica de 4 dígitos para solicitar ao abrir o aplicativo.</p>
        <input
          type="password"
          maxLength={4}
          placeholder="PIN de 4 dígitos"
          value={novoPin}
          onChange={e => setNovoPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3 text-center text-lg tracking-widest font-bold text-white mb-4 outline-none"
        />
        <div className="space-y-2">
          <button
            onClick={() => { if (novoPin.length === 4) onSavePin(novoPin); }}
            disabled={novoPin.length !== 4}
            className="w-full py-3 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold"
          >
            Salvar PIN de 4 dígitos
          </button>
          {savedPin && (
            <div className="flex gap-2">
              <button onClick={onLockNow} className="flex-1 py-2.5 rounded-xl bg-[#181a20] text-zinc-200 text-xs font-medium">Bloquear Agora</button>
              <button onClick={() => onSavePin('')} className="flex-1 py-2.5 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-medium">Remover PIN</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaPatrimonioModal({ metaAtual, onClose, onSaveMeta }) {
  const [val, setVal] = useState(metaAtual);
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[260] flex items-center justify-center p-4">
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 w-full max-w-xs">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Meta de Patrimônio Global</h3>
          <button onClick={onClose} className="text-zinc-500"><X size={18}/></button>
        </div>
        <input
          type="number"
          step="any"
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3 text-sm font-semibold text-white mb-4 outline-none"
        />
        <button onClick={() => onSaveMeta(parseCurrency(val) || 100000)} className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
          Atualizar Meta
        </button>
      </div>
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

    const payload = [item.dados[5], item.dados[6], novoValor, item.dados[8], novoStatus, 0, item.dados[11]];
    onSave(payload, 'bdDevedores', item.linha);
  };

  return (
    <form onSubmit={confirmar}>
      <h3 className="text-center text-base font-semibold text-white mb-1">Abatimento Parcial (Dívida 0%)</h3>
      <p className="text-center text-xs text-zinc-400 mb-4">{item.dados[6]} • {motivo}</p>
      <div className="bg-[#181a20] p-3 rounded-xl border border-[#252830] mb-4 text-center">
        <span className="text-[10px] text-zinc-400 block">Saldo Devedor Atual</span>
        <span className="text-base font-bold text-zinc-100 tabular-nums">R$ {valorAtual.toFixed(2)}</span>
      </div>
      <input
        type="number"
        step="any"
        placeholder="Valor recebido agora (R$)"
        value={valorPago}
        onChange={e => setValorPago(e.target.value)}
        className="w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3.5 text-white mb-4 font-semibold text-xs outline-none"
        required
      />
      <div className="flex gap-2.5">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#181a20] text-zinc-300 font-medium text-xs">Cancelar</button>
        <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-xs">Confirmar</button>
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
      const payload = [dHojeBR, item.dados[6], Number(totalAtual.toFixed(2)), vencNovoBR, "Pendente", jurosM, "Capitalizado"];
      await onSave(payload, 'bdDevedores', item.linha);
    } else if (tipo === 'juros') {
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

      const lucroRealizado = Math.min(pago, jurosAcumulados);
      if (lucroRealizado > 0) {
        const pRenda = [dHojeBR, 0, 0, 0, 0, 0, Number(lucroRealizado.toFixed(2)), `Juros parcial rec. de ${item.dados[6]}`];
        await onSave(pRenda, 'bdRendas', null, true);
      }
    }
  };

  return (
    <>
      <h3 className="text-center text-base font-semibold text-white mb-1">Renegociação de Contrato</h3>
      <p className="text-center text-xs text-zinc-400 mb-3">Defina o novo vencimento e a modalidade:</p>
      <input type="date" value={dataNovaVenc} onChange={e => setDataNovaVenc(e.target.value)} className="w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3 text-white mb-4 font-medium text-xs" />
      <div className="flex flex-col gap-2">
        <button onClick={() => executar('juros')} className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold text-xs flex flex-col items-center">
          <span>Receber R$ {jurosAcumulados.toFixed(2)} (Apenas Juros)</span>
          <span className="text-[10px] text-zinc-400 font-normal mt-0.5">Lança lucro no caixa e mantém principal de R$ {vO.toFixed(2)}</span>
        </button>
        <button onClick={() => executar('capitalizar')} className="w-full p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs flex flex-col items-center">
          <span>Capitalizar Tudo para R$ {totalAtual.toFixed(2)}</span>
          <span className="text-[10px] text-zinc-400 font-normal mt-0.5">Incorpora os juros ao valor principal</span>
        </button>

        <div className="border-t border-[#1f2128] pt-3 mt-1">
          <p className="text-[11px] text-zinc-400 mb-2">Abater valor parcial específico:</p>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              placeholder="Valor pago R$"
              value={valorParcial}
              onChange={e => setValorParcial(e.target.value)}
              className="flex-1 bg-[#181a20] border border-[#272a34] rounded-xl px-3 py-2 text-white text-xs"
            />
            <button type="button" onClick={() => executar('parcial')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">
              Abater
            </button>
          </div>
        </div>

        <button onClick={onClose} className="w-full py-2 text-zinc-500 font-medium text-xs mt-1">Cancelar</button>
      </div>
    </>
  );
}

// ==========================================
// MODAL DE LANÇAMENTOS (TRANSAÇÕES BANCÁRIAS)
// ==========================================
function LancamentoModal({
  tipo, setTipo, onClose, onSave, onSaveLote, meusBancos, infoBancos, cdiMensal,
  editItem, resgateAtivoTipo, devedorPreSelecionado, subtipoContaPre, nomesClientes, setCustomDialog
}) {
  const hojeISO = new Date().toISOString().split('T')[0];
  const bancoInicial = meusBancos[0] || 'Dinheiro';

  const [formData, setFormData] = useState({
    data: hojeISO,
    dataVenc: calcularDataFaturaSugerida(hojeISO, bancoInicial, infoBancos),
    banco: bancoInicial,
    ativoTipo: resgateAtivoTipo || 'Ação',
    subTipo: 'CDB',
    subTipoConta: subtipoContaPre || 'Conta Fixa',
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
    mesesRepetirConta: 1,
    categoria: ''
  });
  
  useEffect(() => {
    if (devedorPreSelecionado && !editItem) {
      setFormData(p => ({ ...p, nome: devedorPreSelecionado }));
    }
  }, [devedorPreSelecionado, editItem]);

  useEffect(() => {
    if (subtipoContaPre && !editItem && tipo === 'conta_fixa') {
      const catSugerida = (subtipoContaPre === 'Juros de Obra' || subtipoContaPre === 'Parcela Imóvel') ? 'Imóvel / Obra' : 'Contas Fixas';
      const descSugerida = subtipoContaPre === 'Juros de Obra' ? 'Juros de Obra Apartamento' : (subtipoContaPre === 'Parcela Imóvel' ? 'Parcela Apartamento' : '');
      setFormData(p => ({ ...p, subTipoConta: subtipoContaPre, categoria: catSugerida, nome: p.nome || descSugerida }));
    }
  }, [subtipoContaPre, editItem, tipo]);

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
      } else if (tipo === 'conta_fixa') {
        setFormData(p => ({
          ...p,
          dataVenc: toInp(d[5]) || hojeISO,
          subTipoConta: d[6] || 'Conta Fixa',
          valor: parseCurrency(d[7]),
          nome: d[8],
          categoria: d[9] || 'Contas Fixas',
          banco: d[10] || 'Boleto / Débito',
          data: toInp(d[12] || d[5]) || hojeISO
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
          juros: isFixa ? '' : parseCurrency(editItem.dados[2]),
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

  const inputClass = "w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3.5 text-zinc-100 focus:border-emerald-500/50 outline-none text-xs font-medium";

  const tituloModal = () => {
    if (tipo === 'conta_fixa') return editItem ? 'Editar Compromisso Fixo' : 'Nova Conta Fixa / Imóvel';
    if (tipo === 'divida_aparte') return editItem ? 'Editar Dívida à Parte' : 'Nova Dívida à Parte (0%)';
    if (editItem) return tipo === 'resgate' ? 'Resgatar / Vender Posição' : 'Editar Registro';
    return 'Nova Transação';
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-3">
      <div className="bg-[#121318] w-full max-w-md rounded-2xl border border-[#1f2128] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#1f2128]">
          <h3 className="font-semibold text-sm text-zinc-100">{tituloModal()}</h3>
          <button onClick={onClose} className="p-2 bg-[#181a20] rounded-lg text-zinc-400 hover:text-white"><X size={18}/></button>
        </div>

        {tipo === 'escolha' ? (
          <div className="grid grid-cols-2 gap-2.5">
            <ChoiceBtn onClick={() => setTipo('conta_fixa')} icon={<Building2 size={22} className="text-emerald-400"/>} label="Conta Fixa / Imóvel" sub="Juros obra, parcela, boleto" />
            <ChoiceBtn onClick={() => setTipo('cartao')} icon={<CreditCard size={22} className="text-blue-400"/>} label="Compra no Cartão" sub="À vista ou parcelado" />
            <ChoiceBtn onClick={() => setTipo('salario')} icon={<Banknote size={22} className="text-emerald-400"/>} label="Salário / Receita" sub="Entradas na conta" />
            <ChoiceBtn onClick={() => setTipo('ativo')} icon={<TrendingUp size={22} className="text-violet-400"/>} label="Investimento" sub="Ações, FIIs, Cripto, CDB" />
            <ChoiceBtn onClick={() => setTipo('devedor')} icon={<Users size={22} className="text-amber-400"/>} label="Contrato c/ Juros" sub="Empréstimo remunerado" />
            <ChoiceBtn onClick={() => setTipo('divida_aparte')} icon={<Bookmark size={22} className="text-teal-400"/>} label="Dívida à Parte (0%)" sub="Empréstimo sem juros" />
            <ChoiceBtn onClick={() => setTipo('provento')} icon={<Coins size={22} className="text-amber-300"/>} label="Provento / Div." sub="Dividendos recebidos" />
          </div>
        ) : (
          <form className="space-y-3.5" onSubmit={(e) => {
            e.preventDefault();
            const dBR = formData.data ? formData.data.split('-').reverse().join('/') : "";
            const vBR = formData.dataVenc ? formData.dataVenc.split('-').reverse().join('/') : "";
            let p = [];
            let aba = "";

            if (tipo === 'conta_fixa') {
              aba = 'bdLancamentos';
              const valorConta = parseCurrency(formData.valor);
              const cat = safeString(formData.categoria) || (formData.subTipoConta.includes('Obra') || formData.subTipoConta.includes('Imóvel') ? 'Imóvel / Obra' : 'Contas Fixas');
              const meio = formData.subTipoConta === 'Pix / Débito' ? 'Pix / Conta' : 'Boleto / Débito';
              const statusInicial = formData.subTipoConta === 'Pix / Débito' ? 'Pago' : (editItem?.dados[11] || 'Pendente');
              const qtdMeses = !editItem ? Math.max(1, parseInt(formData.mesesRepetirConta) || 1) : 1;

              if (qtdMeses > 1) {
                const dBase = parseDataBR(formData.dataVenc) || new Date();
                const lotes = [];
                for (let idx = 0; idx < qtdMeses; idx++) {
                  const dMes = new Date(dBase.getFullYear(), dBase.getMonth() + idx, dBase.getDate());
                  const vMesBR = formatDateToBR(dMes);
                  lotes.push([
                    vMesBR,
                    formData.subTipoConta,
                    valorConta,
                    `${formData.nome} (${idx + 1}/${qtdMeses})`,
                    cat,
                    meio,
                    "Pendente",
                    vMesBR
                  ]);
                }
                onSaveLote(lotes, aba, `${qtdMeses} meses de ${formData.nome} agendados.`);
                return;
              }

              p = [vBR, formData.subTipoConta, valorConta, formData.nome, cat, meio, statusInicial, dBR || vBR];
            } else if (tipo === 'devedor') {
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
                
                onSave([dBR, formData.nome, "RESGATE", 1, resgateVal, "Renda Fixa", ""], 'DB_Historico_Ordens', null, true);
                
                const proporcaoRestante = calcAtual.liquido > 0 ? Math.max(0, 1 - (resgateVal / calcAtual.liquido)) : 0;
                const novoPrincipal = Number((principalOriginal * proporcaoRestante).toFixed(2));

                if (novoPrincipal > 1) {
                  p = [editItem.dados[5], editItem.dados[6], editItem.dados[7], novoPrincipal, editItem.dados[9], editItem.dados[10], "", ""];
                  aba = 'DB_Investimentos_Fixos';
                } else {
                  onClose();
                  setCustomDialog({ type: 'delete', aba: 'DB_Investimentos_Fixos', linha: editItem.linha, message: 'O valor resgatado encerra o saldo do título. Deseja removê-lo da carteira?' });
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
            {tipo === 'conta_fixa' ? (
              /* FORMULÁRIO DE CONTAS FIXAS, JUROS DE OBRA, PARCELA DO APARTAMENTO E PIX */
              <>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0d0e13] p-1.5 rounded-xl border border-[#1f2128]">
                  {[
                    { id: 'Juros de Obra', label: 'Juros de Obra' },
                    { id: 'Parcela Imóvel', label: 'Parcela Apto' },
                    { id: 'Conta Fixa', label: 'Conta Fixa / Boleto' },
                    { id: 'Pix / Débito', label: 'Pix / Débito à Vista' }
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        const catAuto = (t.id === 'Juros de Obra' || t.id === 'Parcela Imóvel') ? 'Imóvel / Obra' : 'Contas Fixas';
                        const descAuto = t.id === 'Juros de Obra' ? 'Juros de Obra Apartamento' : (t.id === 'Parcela Imóvel' ? 'Parcela Apartamento' : '');
                        setFormData(p => ({ ...p, subTipoConta: t.id, categoria: catAuto, nome: descAuto || p.nome }));
                      }}
                      className={`py-2 px-2 rounded-lg text-[11px] font-semibold transition-all ${formData.subTipoConta === t.id ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:bg-zinc-800/60'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Descrição (ex: Juros de Obra Caixa, Parcela Construtora, Condomínio)"
                  value={formData.nome}
                  className={inputClass}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder="Valor R$ *" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="text" placeholder="Categoria (ex: Imóvel / Obra)" value={formData.categoria} className={inputClass} onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                    <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data de Vencimento *</span>
                    <input type="date" value={formData.dataVenc} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, dataVenc: e.target.value})} required />
                  </div>
                  {!editItem && (
                    <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                      <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Repetir nos próximos</span>
                      <select
                        value={formData.mesesRepetirConta}
                        onChange={e => setFormData({...formData, mesesRepetirConta: Number(e.target.value)})}
                        className="w-full bg-transparent text-xs font-semibold text-emerald-400 outline-none"
                      >
                        {[1,2,3,6,12,18,24,36].map(m => (
                          <option key={m} value={m} className="bg-zinc-900 text-white">{m === 1 ? 'Apenas este mês' : `${m} meses seguidos`}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            ) : tipo === 'salario' ? (
              <>
                <input type="text" placeholder="Descrição (ex: Salário Mensal, Adiantamento, PLR)" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} />
                <input type="number" step="any" placeholder="Salário Base R$ *" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder="Horas Extras 50%" value={formData.he50} className={inputClass} onChange={e => setFormData({...formData, he50: e.target.value})} />
                  <input type="number" step="any" placeholder="Horas Extras 100%" value={formData.he100} className={inputClass} onChange={e => setFormData({...formData, he100: e.target.value})} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" step="any" placeholder="DSR" value={formData.dsr} className={inputClass} onChange={e => setFormData({...formData, dsr: e.target.value})} />
                  <input type="number" step="any" placeholder="Ad. Noturno" value={formData.adNoturno} className={inputClass} onChange={e => setFormData({...formData, adNoturno: e.target.value})} />
                  <input type="number" step="any" placeholder="Outros" value={formData.outros} className={inputClass} onChange={e => setFormData({...formData, outros: e.target.value})} />
                </div>
                <input type="number" step="any" placeholder="Descontos R$" value={formData.descontos} className={`${inputClass} text-rose-400`} onChange={e => setFormData({...formData, descontos: e.target.value})} />
                <div className="bg-[#0d0e13] p-3.5 rounded-xl border border-[#1f2128]">
                  <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data do Crédito</span>
                  <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, data: e.target.value})} required />
                </div>
              </>
            ) : tipo === 'cartao' ? (
              <>
                <input type="text" placeholder="Estabelecimento ou Descrição" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder="Valor Total R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="text" placeholder="Categoria (ex: Alimentação)" value={formData.categoria} className={inputClass} onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select className={inputClass} value={formData.banco} onChange={e => handleBancoOuDataCompraChange(e.target.value, formData.data)}>
                    {meusBancos.map((b, i) => <option key={i} value={b} className="bg-zinc-900">{b}</option>)}
                  </select>
                  {!editItem ? (
                    <select className={inputClass} value={formData.parcelas} onChange={e => setFormData({...formData, parcelas: Number(e.target.value)})}>
                      {[1,2,3,4,5,6,7,8,9,10,12,15,18,24].map(n => (
                        <option key={n} value={n} className="bg-zinc-900">{n === 1 ? 'À vista (1x)' : `Parcelado em ${n}x`}</option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, isFixo: !p.isFixo }))}
                      className={`rounded-xl font-semibold text-xs border ${formData.isFixo ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-[#181a20] border-[#272a34] text-zinc-400'}`}
                    >
                      {formData.isFixo ? 'Assinatura Fixa' : 'Compra Avulsa'}
                    </button>
                  )}
                </div>

                {!editItem && formData.parcelas === 1 && (
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, isFixo: !p.isFixo }))}
                    className={`w-full py-2.5 rounded-xl font-medium text-xs border transition-all ${formData.isFixo ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-[#0d0e13] border-[#1f2128] text-zinc-400'}`}
                  >
                    {formData.isFixo ? '✓ Assinatura recorrente no cartão' : 'Marcar como assinatura recorrente no cartão?'}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                    <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data da Compra</span>
                    <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => handleBancoOuDataCompraChange(formData.banco, e.target.value)} />
                  </div>
                  <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                    <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Vencimento Fatura *</span>
                    <input type="date" value={formData.dataVenc} className="w-full bg-transparent text-xs font-semibold text-amber-400 outline-none" onChange={e => setFormData({...formData, dataVenc: e.target.value})} required />
                  </div>
                </div>
              </>
            ) : tipo === 'devedor' ? (
              <>
                <input type="text" list="lista-clientes" placeholder="Nome do Tomador / Cliente" value={formData.nome} className={inputClass} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <datalist id="lista-clientes">
                  {nomesClientes.map((n, idx) => <option key={idx} value={n} />)}
                </datalist>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder="Valor Principal R$" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="number" step="any" placeholder="Taxa de Juros (%)" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                    <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data do Contrato</span>
                    <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, data: e.target.value})} />
                  </div>
                  <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                    <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data de Vencimento</span>
                    <input type="date" value={formData.dataVenc} className="w-full bg-transparent text-xs font-semibold text-amber-400 outline-none" onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                  </div>
                </div>
              </>
            ) : tipo === 'divida_aparte' ? (
              <>
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
                  placeholder="Descrição / Motivo (ex: Empréstimo sem juros, Cartão, Peça) *"
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

                <div className="bg-[#0d0e13] p-3.5 rounded-xl border border-[#1f2128]">
                  <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data do Empréstimo</span>
                  <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>

                <div className="bg-[#0d0e13] p-3.5 rounded-xl border border-[#1f2128] space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-zinc-300">Definir data de pagamento?</span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, temVencimentoAparte: !p.temVencimentoAparte }))}
                      className={`px-3 py-1 rounded-lg text-[11px] font-semibold ${formData.temVencimentoAparte ? 'bg-emerald-600 text-white' : 'bg-[#181a20] text-zinc-400'}`}
                    >
                      {formData.temVencimentoAparte ? 'Sim' : 'Não'}
                    </button>
                  </div>
                  {formData.temVencimentoAparte && (
                    <input type="date" value={formData.dataVenc} className="w-full bg-[#181a20] p-2.5 rounded-lg text-xs font-semibold text-amber-400 outline-none" onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, afetaCaixaAparte: !p.afetaCaixaAparte }))}
                  className={`w-full p-3 rounded-xl text-xs font-medium border transition-all ${formData.afetaCaixaAparte ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#0d0e13] border-[#1f2128] text-zinc-400'}`}
                >
                  {formData.afetaCaixaAparte ? '✓ Descontar / Somar no Caixa Livre do Mês' : 'Apenas Lembrete (Não altera o Caixa Livre)'}
                </button>
              </>
            ) : tipo === 'provento' ? (
              <>
                <div className="flex bg-[#0d0e13] p-1 rounded-xl border border-[#1f2128] gap-1">
                  {['Ação', 'FII'].map(t => (
                    <button type="button" key={t} onClick={() => setFormData({...formData, ativoTipo: t})} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${formData.ativoTipo === t ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}>{t}</button>
                  ))}
                </div>
                <input type="text" placeholder="Código do Ativo (ex: ITSA4, MXRF11)" value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <input type="number" step="any" placeholder="Valor Creditado (R$)" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                <div className="bg-[#0d0e13] p-3.5 rounded-xl border border-[#1f2128]">
                  <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data do Crédito</span>
                  <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>
              </>
            ) : tipo === 'resgate' ? (
              <>
                {formData.ativoTipo === 'Renda Fixa' ? (
                  <>
                    <p className="text-xs text-zinc-400">Resgate de <strong className="text-zinc-100">{formData.nome}</strong></p>
                    <input type="number" step="any" placeholder="Valor Líquido a Resgatar (R$)" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-zinc-400">Ordem de Venda: <strong className="text-zinc-100">{formData.nome}</strong></p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" step="any" placeholder="Quantidade Vendida" value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                      <input type="number" step="any" placeholder="Valor Total Recebido (R$)" value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                    </div>
                  </>
                )}
                <div className="bg-[#0d0e13] p-3.5 rounded-xl border border-[#1f2128]">
                  <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data de Liquidação</span>
                  <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, data: e.target.value})} />
                </div>
              </>
            ) : (
              <>
                <div className="flex bg-[#0d0e13] p-1 rounded-xl border border-[#1f2128] gap-1">
                  {['Ação', 'FII', 'Cripto', 'Renda Fixa'].map(t => (
                    <button type="button" key={t} onClick={() => setFormData({...formData, ativoTipo: t})} className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${formData.ativoTipo === t ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}>{t}</button>
                  ))}
                </div>
                {formData.ativoTipo === 'Renda Fixa' && (
                  <div className="flex bg-[#0d0e13] p-1 rounded-xl border border-[#1f2128] gap-1">
                    {['CDB', 'CDI', 'Tesouro Direto', 'LCI/LCA'].map(t => (
                      <button type="button" key={t} onClick={() => setFormData({...formData, subTipo: t})} className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-all ${formData.subTipo === t ? 'bg-[#1f222b] text-white' : 'text-zinc-400'}`}>{t}</button>
                    ))}
                  </div>
                )}
                <input type="text" placeholder={formData.ativoTipo === 'Renda Fixa' ? "Emissor / Título (ex: CDB Banco Itaú)" : "Ticker do Ativo (ex: PETR4, BTC)"} value={formData.nome} className={`${inputClass} uppercase`} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="any" placeholder={formData.ativoTipo === 'Renda Fixa' ? "Valor Aplicado R$" : "Quantidade"} value={formData.valor} className={inputClass} onChange={e => setFormData({...formData, valor: e.target.value})} required />
                  <input type="number" step="any" placeholder={formData.ativoTipo === 'Renda Fixa' ? "Taxa (% CDI ou % a.m.)" : "Custo Total da Ordem R$"} value={formData.juros} className={inputClass} onChange={e => setFormData({...formData, juros: e.target.value})} required />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                    <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Data da Operação</span>
                    <input type="date" value={formData.data} className="w-full bg-transparent text-xs font-semibold text-zinc-100 outline-none" onChange={e => setFormData({...formData, data: e.target.value})} />
                  </div>
                  {formData.ativoTipo === 'Renda Fixa' && (
                    <div className="bg-[#0d0e13] p-3 rounded-xl border border-[#1f2128]">
                      <span className="text-[10px] font-medium text-zinc-400 mb-1 block">Vencimento Título</span>
                      <input type="date" value={formData.dataVenc} className="w-full bg-transparent text-xs font-semibold text-amber-400 outline-none" onChange={e => setFormData({...formData, dataVenc: e.target.value})} />
                    </div>
                  )}
                </div>
              </>
            )}

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-semibold text-xs mt-2 active:scale-95 transition-all">
              {editItem && tipo !== 'resgate' ? "Salvar Alterações" : "Confirmar Transação"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTES VISUAIS BANCÁRIOS
// ==========================================
function QuickBankAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 min-w-[68px] p-2.5 rounded-xl bg-[#121318] border border-[#1f2128] hover:border-zinc-700 active:scale-95 transition-all shrink-0"
    >
      <div className="w-9 h-9 rounded-xl bg-[#181a20] text-emerald-400 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[11px] font-medium text-zinc-300 whitespace-nowrap">{label}</span>
    </button>
  );
}

function ChoiceBtn({ onClick, icon, label, sub }) {
  return (
    <button onClick={onClick} className="bg-[#181a20] hover:bg-zinc-800/80 border border-[#252830] p-4 rounded-xl flex flex-col items-start gap-2 active:scale-95 transition-all text-left">
      <div className="p-2 rounded-lg bg-[#121318]">{icon}</div>
      <div>
        <span className="font-semibold text-xs text-zinc-100 block">{label}</span>
        {sub && <span className="text-[10px] text-zinc-500 block mt-0.5">{sub}</span>}
      </div>
    </button>
  );
}

function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 py-1.5 px-2 transition-all ${active ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
      {icon}
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </button>
  );
}

function InfoCard({ title, qtd, val, hideValues, dotColor, onClick }) {
  return (
    <div onClick={onClick} className="bg-[#121318] border border-[#1f2128] hover:border-zinc-700 p-4 rounded-2xl cursor-pointer active:scale-95 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-[10px] text-zinc-500 font-medium">{qtd} ativo(s)</span>
      </div>
      <p className="text-xs font-medium text-zinc-400 mb-0.5">{title}</p>
      <p className="text-base font-bold text-zinc-100 tabular-nums">R$ {formatMoney(val, hideValues)}</p>
    </div>
  );
}
