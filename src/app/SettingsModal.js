"use client";

import { useState } from 'react';
import {
  X, Sun, Moon, ShieldCheck, CreditCard, Upload, Cpu, Download, Plus, Trash2,
  CheckCircle, Copy, Send, Smartphone, Sparkles, Lock, User, Target, Bookmark, Building2, Edit
} from 'lucide-react';

// =========================================================
// MOTOR DE AUTOCATEGORIZAÇÃO (COM REGRAS PERSONALIZADAS)
// =========================================================
export function detectarCategoriaAuto(texto, regrasPersonalizadas = []) {
  const t = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!t || t.length < 2) return "";

  // 1. Prioriza lugares / razões sociais cadastradas pelo usuário
  if (Array.isArray(regrasPersonalizadas)) {
    for (let i = 0; i < regrasPersonalizadas.length; i++) {
      const r = regrasPersonalizadas[i];
      const termo = String(r.termo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (termo && t.includes(termo)) {
        return r.categoria || "Geral";
      }
    }
  }

  // 2. Regras gerais padrão
  if (/opea seguros|juros de obra|evolucao de obra|construtora|apartamento|condominio|incc|financiamento|iptu/.test(t)) return "Imóvel / Obra";
  if (/bar do nelson|ifood|ifd\*|rappi|ze delivery|burger|mcdonald|bk |lanchonete|fastfood|fast food|pizzaria|acai/.test(t)) return "Fastfood";
  if (/uber|99app|99\*|99 pop|posto|combustivel|gasolina|etanol|shell|ipiranga|petrobras|estacionamento|sem parar|veloe|pedagio|onibus|metro/.test(t)) return "Transporte";
  if (/restaurante|padaria|panificadora|outback|cafe|bar |churrascaria|sushi|doceria/.test(t)) return "Alimentação";
  if (/mercado|supermercado|atacadao|assai|carrefour|pao de acucar|extra|hortifruti|acougue|sacolao/.test(t)) return "Supermercado";
  if (/netflix|spotify|amazon prime|prime video|disney|hbo|max|youtube|google|apple\.com|icloud|chatgpt|openai|claude|internet|vivo|claro|tim|oi /.test(t)) return "Assinaturas";
  if (/drogaria|farmacia|drogasil|raia|pacheco|pague menos|panvel|hospital|clinica|medico|laboratorio|exame|dentista|academia|smartfit|gympass|wellhub/.test(t)) return "Saúde";
  if (/energia|eletrica|enel|cpfl|cemig|light|neoenergia|equatorial|sabesp|saneago|copasa|agua|gas|aluguel/.test(t)) return "Moradia";
  if (/mercadolivre|mercado livre|shopee|amazon|magalu|magazine|shein|aliexpress|casas bahia|americanas|cinema|ingresso|shopping|zara|renner|riachuelo|cea/.test(t)) return "Compras & Lazer";
  return "";
}

export function aplicarRegraLugarNoTexto(texto, regrasPersonalizadas = []) {
  const t = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (!t || !Array.isArray(regrasPersonalizadas)) return null;
  for (let i = 0; i < regrasPersonalizadas.length; i++) {
    const r = regrasPersonalizadas[i];
    const termo = String(r.termo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (termo && t.includes(termo)) return r;
  }
  return null;
}

// =========================================================
// PARSER UNIVERSAL DE FATURAS E EXTRATOS (OFX, CSV E TEXTO)
// =========================================================
export function parseExtratoOuFatura(rawText, regrasPersonalizadas = []) {
  const text = String(rawText || "").trim();
  if (!text) return [];
  const resultados = [];

  if (text.toUpperCase().includes("<STMTTRN>")) {
    const blocos = text.split(/<STMTTRN>/i).slice(1);
    blocos.forEach((b, idx) => {
      const amtMatch = b.match(/<TRNAMT>([-0-9.,]+)/i);
      const memoMatch = b.match(/<(?:MEMO|NAME)>([^<\r\n]+)/i);
      const dtMatch = b.match(/<DTPOSTED>(\d{8})/i);

      if (amtMatch && memoMatch) {
        let val = parseFloat(amtMatch[1].replace(',', '.'));
        const descRaw = memoMatch[1].trim();
        if (descRaw.toLowerCase().includes("pagamento recebido") || descRaw.toLowerCase().includes("pagamento de fatura")) return;
        val = Math.abs(val);
        if (val > 0) {
          let dataCompra = "";
          if (dtMatch && dtMatch[1]) {
            const d = dtMatch[1];
            dataCompra = `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
          }
          const regra = aplicarRegraLugarNoTexto(descRaw, regrasPersonalizadas);
          resultados.push({
            id: idx,
            selecionado: true,
            descricao: regra?.nomeExibicao || descRaw,
            valor: Number(val.toFixed(2)),
            categoria: regra?.categoria || detectarCategoriaAuto(descRaw, regrasPersonalizadas) || "Geral",
            dataCompra
          });
        }
      }
    });
    return resultados;
  }

  const linhas = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  linhas.forEach((linha, idx) => {
    const lower = linha.toLowerCase();
    if (lower.startsWith("date,") || lower.startsWith("data;") || lower.startsWith("data,") || lower.includes("pagamento recebido")) return;

    const csvPartes = linha.includes(';') ? linha.split(';') : linha.split(',');
    if (csvPartes.length >= 3) {
      const possivelValorStr = csvPartes[csvPartes.length - 1].replace(/[R$\s"]/g, '').trim();
      let num = parseFloat(possivelValorStr.includes(',') && possivelValorStr.includes('.')
        ? possivelValorStr.replace(/\./g, '').replace(',', '.')
        : possivelValorStr.replace(',', '.'));

      if (!isNaN(num) && num > 0) {
        const rawDate = csvPartes[0].replace(/"/g, '').trim();
        let dataCompra = "";
        if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          const p = rawDate.split('-');
          dataCompra = `${p[2].slice(0, 2)}/${p[1]}/${p[0]}`;
        } else if (/^\d{2}\/\d{2}/.test(rawDate)) {
          dataCompra = rawDate;
        }
        const descRaw = csvPartes.length >= 4 ? csvPartes[2].replace(/"/g, '').trim() : csvPartes[1].replace(/"/g, '').trim();
        const catCSV = csvPartes.length >= 4 ? csvPartes[1].replace(/"/g, '').trim() : "";
        if (descRaw) {
          const regra = aplicarRegraLugarNoTexto(descRaw, regrasPersonalizadas);
          resultados.push({
            id: idx,
            selecionado: true,
            descricao: regra?.nomeExibicao || descRaw,
            valor: Number(Math.abs(num).toFixed(2)),
            categoria: regra?.categoria || detectarCategoriaAuto(descRaw, regrasPersonalizadas) || catCSV || "Geral",
            dataCompra
          });
          return;
        }
      }
    }

    const matchVal = linha.match(/(?:R\$\s*)?([0-9.]+,[0-9]{2}|[0-9]+\.[0-9]{2})\s*$/i);
    if (matchVal) {
      let vStr = matchVal[1];
      if (vStr.includes('.') && vStr.includes(',')) vStr = vStr.replace(/\./g, '').replace(',', '.');
      else if (vStr.includes(',')) vStr = vStr.replace(',', '.');
      const valor = parseFloat(vStr);

      if (!isNaN(valor) && valor > 0) {
        let resto = linha.slice(0, matchVal.index).replace(/R\$\s*$/i, '').trim();
        let dataCompra = "";
        const matchData = resto.match(/^(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+/);
        if (matchData) {
          dataCompra = matchData[1];
          resto = resto.slice(matchData[0].length).trim();
        }
        const descRaw = resto.replace(/^[-•*]\s*/, '').trim() || "Compra Importada";
        const regra = aplicarRegraLugarNoTexto(descRaw, regrasPersonalizadas);
        resultados.push({
          id: idx,
          selecionado: true,
          descricao: regra?.nomeExibicao || descRaw,
          valor: Number(valor.toFixed(2)),
          categoria: regra?.categoria || detectarCategoriaAuto(descRaw, regrasPersonalizadas) || "Geral",
          dataCompra
        });
      }
    }
  });

  return resultados;
}

// =========================================================
// MODAL RÁPIDO PARA PRÉ-DEFINIR UM LUGAR / RAZÃO SOCIAL
// =========================================================
export function RegraLugarRapidaModal({ itemInicial, dividasFuturas = [], onClose, onSaveRegra }) {
  const [termo, setTermo] = useState(itemInicial?.termo || '');
  const [nomeExibicao, setNomeExibicao] = useState(itemInicial?.nomeExibicao || '');
  const [categoria, setCategoria] = useState(itemInicial?.categoria || 'Fastfood');
  const [tipoLancamento, setTipoLancamento] = useState(itemInicial?.tipoLancamento || 'Padrao');
  const [dividaId, setDividaId] = useState(itemInicial?.dividaId || '');

  const inputCls = "w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3 text-xs font-medium text-zinc-100 outline-none focus:border-emerald-500/50";

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[310] flex items-center justify-center p-4">
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-[#1f2128] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Pré-definir Lugar ou Razão Social</h3>
            <p className="text-[11px] text-zinc-400">Sempre que aparecer no Pix, Boleto ou Cartão, o app reconhecerá sozinho</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#181a20] text-zinc-400"><X size={17}/></button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!termo.trim()) return;
            onSaveRegra({
              id: itemInicial?.id || `regra_${Date.now()}`,
              termo: termo.trim(),
              nomeExibicao: nomeExibicao.trim() || termo.trim(),
              categoria: categoria.trim() || 'Geral',
              tipoLancamento,
              dividaId
            });
          }}
        >
          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Como aparece na notificação do banco / Razão Social *</label>
            <input
              type="text"
              placeholder="Ex: opea seguros, bar do nelson, pag*nelson"
              value={termo}
              onChange={e => setTermo(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Nome limpo no App *</label>
              <input
                type="text"
                placeholder="Ex: Parcela Apartamento, Bar do Nelson"
                value={nomeExibicao}
                onChange={e => setNomeExibicao(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Categoria Automática *</label>
              <input
                type="text"
                placeholder="Ex: Fastfood, Imóvel / Obra"
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Comportamento quando você pagar para este lugar</label>
            <select
              value={tipoLancamento}
              onChange={e => {
                const v = e.target.value;
                setTipoLancamento(v);
                if (v === 'Parcela Imóvel' || v === 'Juros de Obra') setCategoria('Imóvel / Obra');
              }}
              className={inputCls}
            >
              <option value="Padrao">Gasto Normal (Funciona p/ Pix, Débito e Cartão de Crédito)</option>
              <option value="Parcela Imóvel">Quitar Parcela do Apartamento (Abate do Saldo Devedor)</option>
              <option value="Juros de Obra">Lançar como Juros de Obra (Não abate do Saldo do Apto)</option>
              <option value="Conta Fixa">Quitar Conta Fixa / Outra Dívida Futura</option>
            </select>
          </div>

          {(tipoLancamento === 'Parcela Imóvel' || tipoLancamento === 'Conta Fixa') && dividasFuturas.length > 0 && (
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Vincular a qual Contrato / Dívida Futura?</label>
              <select value={dividaId} onChange={e => setDividaId(e.target.value)} className={inputCls}>
                <option value="">Abater automaticamente pelo nome/tipo</option>
                {dividasFuturas.map(d => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#181a20] text-zinc-300 text-xs font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
              Salvar Lugar Pré-definido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================
// MODAL PARA CADASTRAR / EDITAR DÍVIDA FUTURA OU CONTRATO DO APTO
// =========================================================
export function DividaFuturaModal({ itemInicial, onClose, onSaveDivida, onGerarParcelasPlanilha }) {
  const [nome, setNome] = useState(itemInicial?.nome || 'Entrada / Construtora Apartamento');
  const [ehImovel, setEhImovel] = useState(itemInicial ? Boolean(itemInicial.ehImovel) : true);
  const [valorTotal, setValorTotal] = useState(itemInicial?.valorTotal || '');
  const [valorJaPagoAntes, setValorJaPagoAntes] = useState(itemInicial?.valorJaPagoAntes || 0);
  const [qtdParcelasTotal, setQtdParcelasTotal] = useState(itemInicial?.qtdParcelasTotal || 36);
  const [valorParcelaPadrao, setValorParcelaPadrao] = useState(itemInicial?.valorParcelaPadrao || '');
  const [diaVencimento, setDiaVencimento] = useState(itemInicial?.diaVencimento || 15);
  const [previsaoTermino, setPrevisaoTermino] = useState(itemInicial?.previsaoTermino || 'Dez/2027');
  const [razaoSocial, setRazaoSocial] = useState(itemInicial?.razaoSocial || 'opea seguros');
  const [agendarParcelasAgora, setAgendarParcelasAgora] = useState(false);
  const [qtdAgendar, setQtdAgendar] = useState(12);

  const inputCls = "w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3 text-xs font-medium text-zinc-100 outline-none focus:border-emerald-500/50";

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[310] flex items-center justify-center p-4">
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#1f2128] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {itemInicial ? 'Editar Contrato / Dívida Futura' : 'Cadastrar Contrato ou Dívida Futura'}
            </h3>
            <p className="text-[11px] text-zinc-400">Acompanhe o saldo devedor total e abata parcelas automaticamente</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#181a20] text-zinc-400"><X size={17}/></button>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const novaDivida = {
              id: itemInicial?.id || (ehImovel ? 'contrato_apto' : `divida_${Date.now()}`),
              nome: nome.trim(),
              ehImovel,
              valorTotal: parseFloat(String(valorTotal).replace(',', '.')) || 0,
              valorJaPagoAntes: parseFloat(String(valorJaPagoAntes).replace(',', '.')) || 0,
              qtdParcelasTotal: parseInt(qtdParcelasTotal, 10) || 1,
              valorParcelaPadrao: parseFloat(String(valorParcelaPadrao).replace(',', '.')) || 0,
              diaVencimento: parseInt(diaVencimento, 10) || 10,
              previsaoTermino: previsaoTermino.trim(),
              razaoSocial: razaoSocial.trim()
            };
            onSaveDivida(novaDivida, agendarParcelasAgora ? (parseInt(qtdAgendar, 10) || 0) : 0);
          }}
        >
          <div className="grid grid-cols-2 gap-1.5 bg-[#0d0e13] p-1.5 rounded-xl border border-[#1f2128]">
            <button
              type="button"
              onClick={() => setEhImovel(true)}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${ehImovel ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
            >
              Imóvel / Apartamento
            </button>
            <button
              type="button"
              onClick={() => {
                setEhImovel(false);
                if (nome === 'Entrada / Construtora Apartamento') setNome('');
                if (razaoSocial === 'opea seguros') setRazaoSocial('');
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${!ehImovel ? 'bg-emerald-600 text-white' : 'text-zinc-400'}`}
            >
              Outra Dívida Futura
            </button>
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Nome do Contrato / Dívida *</label>
            <input
              type="text"
              placeholder="Ex: Construtora Apartamento, Financiamento, Móveis"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Valor Total Contrato (R$) *</label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 45000"
                value={valorTotal}
                onChange={e => setValorTotal(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Já Pago Antes do App (R$)</label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 12000"
                value={valorJaPagoAntes}
                onChange={e => setValorJaPagoAntes(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Total Parcelas</label>
              <input
                type="number"
                value={qtdParcelasTotal}
                onChange={e => setQtdParcelasTotal(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Dia Venc.</label>
              <input
                type="number"
                min={1}
                max={31}
                value={diaVencimento}
                onChange={e => setDiaVencimento(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">{ehImovel ? 'Entrega Chaves' : 'Término'}</label>
              <input
                type="text"
                placeholder="Ex: Dez/2027"
                value={previsaoTermino}
                onChange={e => setPrevisaoTermino(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Valor Médio Parcela (R$)</label>
              <input
                type="number"
                step="any"
                placeholder="Ex: 1250"
                value={valorParcelaPadrao}
                onChange={e => setValorParcelaPadrao(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Razão Social p/ Baixa Auto</label>
              <input
                type="text"
                placeholder="Ex: opea seguros"
                value={razaoSocial}
                onChange={e => setRazaoSocial(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500">
            Sempre que você pagar um Pix ou Boleto para a Razão Social acima (ex: <strong>opea seguros LTDA</strong>), o app dará baixa na parcela e abaterá o valor do saldo devedor automaticamente.
          </p>

          {!itemInicial && (
            <div className="bg-[#0d0e13] border border-[#1f2128] rounded-xl p-3 space-y-2">
              <button
                type="button"
                onClick={() => setAgendarParcelasAgora(!agendarParcelasAgora)}
                className="w-full flex justify-between items-center text-xs font-medium text-zinc-300"
              >
                <span>Gerar parcelas futuras na planilha agora?</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${agendarParcelasAgora ? 'bg-emerald-600 text-white' : 'bg-[#181a20] text-zinc-400'}`}>
                  {agendarParcelasAgora ? 'Sim' : 'Não'}
                </span>
              </button>
              {agendarParcelasAgora && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-400">Quantos meses agendar:</span>
                  <select
                    value={qtdAgendar}
                    onChange={e => setQtdAgendar(e.target.value)}
                    className="bg-[#181a20] border border-[#272a34] rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-semibold"
                  >
                    {[3, 6, 12, 18, 24, 36].map(n => <option key={n} value={n}>{n} meses</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-[#181a20] text-zinc-300 text-xs font-medium">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
              Salvar Contrato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =========================================================
// MODAL COMPLETO DE CONFIGURAÇÕES E AUTOMAÇÃO 100%
// =========================================================
export default function SettingsModal({
  onClose,
  abaInicialModal = 'geral',
  theme,
  onToggleTheme,
  settings,
  onSaveSettings,
  savedPin,
  onSavePin,
  onLockNow,
  bancosRows,
  onAddBanco,
  onDeleteBanco,
  meusBancos,
  regrasLugares = [],
  onSaveRegrasLugares,
  dividasFuturas = [],
  onImportarLoteCartao,
  onProcessarNotificacaoAuto,
  onDispararTelegram,
  onExportBackup,
  showToast
}) {
  const [abaAtiva, setAbaAtiva] = useState(abaInicialModal || 'geral');

  const [formConfig, setFormConfig] = useState({
    titular: settings.titular || 'Private',
    chavePix: settings.chavePix || '',
    incluirPixWhatsApp: settings.incluirPixWhatsApp !== false,
    metaPatrimonio: settings.metaPatrimonio || 100000,
    tetoCartao: settings.tetoCartao || 0,
    iniciarOculto: settings.iniciarOculto || false,
    abaInicial: settings.abaInicial || 'dashboard'
  });

  // Estados de Novo Lugar / Razão Social
  const [novoTermo, setNovoTermo] = useState('');
  const [novoNomeExib, setNovoNomeExib] = useState('');
  const [novaCatLugar, setNovaCatLugar] = useState('');
  const [novoTipoLugar, setNovoTipoLugar] = useState('Padrao');

  // Estados de Gerenciamento de Bancos
  const [novoBancoNome, setNovoBancoNome] = useState('');
  const [novoBancoFech, setNovoBancoFech] = useState(3);
  const [novoBancoVenc, setNovoBancoVenc] = useState(10);

  // Estados do Importador de Faturas
  const [textoFatura, setTextoFatura] = useState('');
  const [bancoImport, setBancoImport] = useState(meusBancos[0] || 'Nubank');
  const [vencImport, setVencImport] = useState(new Date().toISOString().split('T')[0]);
  const [itensPrevia, setItensPrevia] = useState([]);

  const [textoNotifAuto, setTextoNotifAuto] = useState('');
  const [loadingAuto, setLoadingAuto] = useState(false);
  const [pinTemp, setPinTemp] = useState(savedPin || '');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setTextoFatura(content);
      const parsed = parseExtratoOuFatura(content, regrasLugares);
      setItensPrevia(parsed);
      if (parsed.length > 0) showToast(`${parsed.length} transações identificadas no arquivo.`);
      else showToast("Nenhuma transação encontrada no arquivo.", "error");
    };
    reader.readAsText(file);
  };

  const handleAnalisarTextoFatura = () => {
    const parsed = parseExtratoOuFatura(textoFatura, regrasLugares);
    setItensPrevia(parsed);
    if (parsed.length > 0) showToast(`${parsed.length} lançamentos prontos para importar.`);
    else showToast("Use o formato: 'Descrição 45,90' ou cole um CSV/OFX.", "error");
  };

  const handleConfirmarImportacao = () => {
    const selecionados = itensPrevia.filter(i => i.selecionado);
    if (selecionados.length === 0) return;
    const vBR = vencImport.split('-').reverse().join('/');
    const hojeBR = new Date().toISOString().split('T')[0].split('-').reverse().join('/');

    const lotes = selecionados.map(item => [
      vBR,
      "Avulso",
      item.valor,
      item.descricao,
      item.categoria || "Geral",
      bancoImport,
      "Pendente",
      item.dataCompra || hojeBR
    ]);

    onImportarLoteCartao(lotes);
  };

  const inputCls = "w-full bg-[#181a20] border border-[#272a34] rounded-xl p-3 text-xs font-medium text-zinc-100 outline-none focus:border-emerald-500/50";

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[280] flex items-end md:items-center justify-center p-2 md:p-4">
      <div className="bg-[#121318] border border-[#1f2128] rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1f2128] flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Configurações & Central de Automação</h3>
            <p className="text-[11px] text-zinc-500">Tema, lugares pré-definidos, bancos, limites e automações</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-[#181a20] text-zinc-400 hover:text-white"><X size={18}/></button>
        </div>

        <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-[#1f2128] overflow-x-auto no-scrollbar bg-[#0d0e13]">
          {[
            { id: 'geral', label: 'Geral & Tema', icon: <Sun size={13}/> },
            { id: 'lugares', label: 'Lugares & Regras', icon: <Bookmark size={13}/> },
            { id: 'bancos', label: 'Meus Bancos', icon: <CreditCard size={13}/> },
            { id: 'importar', label: 'Importar Fatura', icon: <Upload size={13}/> },
            { id: 'automacao', label: 'Automação 100%', icon: <Cpu size={13}/> },
            { id: 'seguranca', label: 'PIN & Backup', icon: <ShieldCheck size={13}/> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAbaAtiva(tab.id)}
              className={`px-3 py-2 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${abaAtiva === tab.id ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:bg-[#181a20]'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. ABA GERAL & TEMA */}
          {abaAtiva === 'geral' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4">
                <span className="text-xs font-semibold text-zinc-200 block mb-2.5">Aparência do Aplicativo</span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => theme !== 'dark' && onToggleTheme()}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121318] border-[#1f2128] text-zinc-400'}`}
                  >
                    <Moon size={15}/> Tema Escuro (Carbon)
                  </button>
                  <button
                    type="button"
                    onClick={() => theme !== 'light' && onToggleTheme()}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${theme === 'light' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-[#121318] border-[#1f2128] text-zinc-400'}`}
                  >
                    <Sun size={15}/> Tema Claro (Clean)
                  </button>
                </div>
              </div>

              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Titular & Chave Pix de Cobrança</span>
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Nome / Identificação no Topo</label>
                  <input
                    type="text"
                    placeholder="Ex: Murilo • Private"
                    value={formConfig.titular}
                    onChange={e => setFormConfig({ ...formConfig, titular: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Sua Chave Pix (Enviada nas cobranças via WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="CPF, Celular, E-mail ou Chave Aleatória"
                    value={formConfig.chavePix}
                    onChange={e => setFormConfig({ ...formConfig, chavePix: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setFormConfig(p => ({ ...p, incluirPixWhatsApp: !p.incluirPixWhatsApp }))}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-medium border text-left flex justify-between items-center ${formConfig.incluirPixWhatsApp ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#121318] border-[#1f2128] text-zinc-400'}`}
                >
                  <span>Incluir Chave Pix automaticamente no WhatsApp</span>
                  <span>{formConfig.incluirPixWhatsApp ? 'Ativo' : 'Inativo'}</span>
                </button>
              </div>

              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Metas & Teto de Orçamento</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Meta de Patrimônio (R$)</label>
                    <input
                      type="number"
                      step="any"
                      value={formConfig.metaPatrimonio}
                      onChange={e => setFormConfig({ ...formConfig, metaPatrimonio: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Teto Mensal Cartões (R$)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: 3000"
                      value={formConfig.tetoCartao}
                      onChange={e => setFormConfig({ ...formConfig, tetoCartao: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Aba Inicial Padrão</label>
                    <select
                      value={formConfig.abaInicial}
                      onChange={e => setFormConfig({ ...formConfig, abaInicial: e.target.value })}
                      className={inputCls}
                    >
                      <option value="dashboard">Início (Resumo)</option>
                      <option value="contas">Contas Fixas & Imóvel</option>
                      <option value="cartoes">Cartões de Crédito</option>
                      <option value="patrimonio">Investimentos</option>
                      <option value="devedores">Cobranças</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => setFormConfig(p => ({ ...p, iniciarOculto: !p.iniciarOculto }))}
                      className={`w-full py-3 px-3 rounded-xl text-xs font-medium border ${formConfig.iniciarOculto ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#121318] border-[#1f2128] text-zinc-400'}`}
                    >
                      {formConfig.iniciarOculto ? '✓ Abrir com saldos ocultos' : 'Abrir mostrando saldos'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSaveSettings(formConfig)}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Salvar Preferências
              </button>
            </div>
          )}

          {/* 2. ABA LUGARES & RAZÕES SOCIAIS PRÉ-DEFINIDOS */}
          {abaAtiva === 'lugares' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-200 block">Pré-definir Novo Lugar ou Razão Social</span>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Cadastre o nome ou razão social que aparece na notificação do banco (ex: <strong>opea seguros LTDA</strong> para abater parcela do apartamento, ou <strong>Bar do nelson</strong> para cair como <em>Fastfood</em> tanto no Pix quanto no Cartão).
                </p>

                <input
                  type="text"
                  placeholder="Nome na notificação / Razão Social (ex: opea seguros, bar do nelson)"
                  value={novoTermo}
                  onChange={e => setNovoTermo(e.target.value)}
                  className={inputCls}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Nome limpo (ex: Bar do Nelson)"
                    value={novoNomeExib}
                    onChange={e => setNovoNomeExib(e.target.value)}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    placeholder="Categoria (ex: Fastfood)"
                    value={novaCatLugar}
                    onChange={e => setNovaCatLugar(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <select
                  value={novoTipoLugar}
                  onChange={e => {
                    const v = e.target.value;
                    setNovoTipoLugar(v);
                    if (v === 'Parcela Imóvel' || v === 'Juros de Obra') setNovaCatLugar('Imóvel / Obra');
                  }}
                  className={inputCls}
                >
                  <option value="Padrao">Gasto Normal (Pix, Débito e Cartão de Crédito)</option>
                  <option value="Parcela Imóvel">Quitar Parcela do Apartamento (Abate do Contrato)</option>
                  <option value="Juros de Obra">Lançar como Juros de Obra (Não abate do Contrato)</option>
                  <option value="Conta Fixa">Quitar Conta Fixa / Dívida Futura</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (!novoTermo.trim()) return;
                    const novaRegra = {
                      id: `regra_${Date.now()}`,
                      termo: novoTermo.trim(),
                      nomeExibicao: novoNomeExib.trim() || novoTermo.trim(),
                      categoria: novaCatLugar.trim() || 'Geral',
                      tipoLancamento: novoTipoLugar,
                      dividaId: novoTipoLugar === 'Parcela Imóvel' ? 'contrato_apto' : ''
                    };
                    onSaveRegrasLugares([novaRegra, ...regrasLugares]);
                    setNovoTermo('');
                    setNovoNomeExib('');
                    setNovaCatLugar('');
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus size={15}/> Salvar Lugar na Nuvem
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block px-1">
                  Lugares Pré-definidos Ativos ({regrasLugares.length})
                </span>
                {regrasLugares.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">Nenhum lugar pré-definido cadastrado.</p>
                ) : regrasLugares.map((r, idx) => (
                  <div key={r.id || idx} className="p-3.5 rounded-xl bg-[#16181f] border border-[#222530] flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-100">{r.nomeExibicao}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                          {r.categoria}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Detecta: <code className="text-zinc-300">&quot;{r.termo}&quot;</code> • {r.tipoLancamento === 'Padrao' ? 'Pix & Cartão' : r.tipoLancamento}
                      </p>
                    </div>
                    <button
                      onClick={() => onSaveRegrasLugares(regrasLugares.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg bg-[#121318] text-zinc-400 hover:text-rose-400"
                      title="Remover regra"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. ABA GERENCIADOR DE BANCOS & CARTÕES */}
          {abaAtiva === 'bancos' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-200 block">Cadastrar Novo Banco / Cartão</span>
                <p className="text-[11px] text-zinc-400">
                  O aplicativo calcula automaticamente a fatura de cada compra usando o dia de fechamento e vencimento do cartão.
                </p>
                <input
                  type="text"
                  placeholder="Nome do Banco (ex: Nubank, Itaú, Inter, C6)"
                  value={novoBancoNome}
                  onChange={e => setNovoBancoNome(e.target.value)}
                  className={inputCls}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Dia de Fechamento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={novoBancoFech}
                      onChange={e => setNovoBancoFech(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Dia de Vencimento</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={novoBancoVenc}
                      onChange={e => setNovoBancoVenc(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!novoBancoNome.trim()) return;
                    onAddBanco([novoBancoNome.trim(), Number(novoBancoFech) || 1, Number(novoBancoVenc) || 10]);
                    setNovoBancoNome('');
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Plus size={15}/> Adicionar Cartão na Planilha
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block px-1">Cartões Cadastrados ({bancosRows.length})</span>
                {bancosRows.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">Nenhum banco cadastrado na aba meus_bancos.</p>
                ) : bancosRows.map((b, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#16181f] border border-[#222530] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <CreditCard size={16}/>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-zinc-100">{b.dados[0]}</p>
                        <p className="text-[11px] text-zinc-400">Fecha dia {b.dados[1] || '--'} • Vence dia {b.dados[2] || '--'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteBanco(b.linha)}
                      className="p-2 rounded-lg bg-[#121318] text-zinc-400 hover:text-rose-400"
                      title="Remover banco"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ABA IMPORTADOR DE FATURA */}
          {abaAtiva === 'importar' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-200 block">Importação Automática de Fatura (OFX, CSV ou Texto)</span>
                <p className="text-[11px] text-zinc-400">
                  Envie o arquivo `.ofx` ou `.csv` exportado do aplicativo do seu banco, ou cole as linhas da fatura abaixo. Seus lugares pré-definidos serão aplicados automaticamente.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Cartão / Destino</label>
                    <select value={bancoImport} onChange={e => setBancoImport(e.target.value)} className={inputCls}>
                      {meusBancos.map((b, i) => <option key={i} value={b}>{b}</option>)}
                      <option value="Pix / Conta">Pix / Débito em Conta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Vencimento da Fatura</label>
                    <input type="date" value={vencImport} onChange={e => setVencImport(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <label className="w-full py-3 px-4 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
                  <Upload size={15}/> Selecionar Arquivo .OFX ou .CSV do Banco
                  <input type="file" accept=".ofx,.csv,.txt" onChange={handleFileUpload} className="hidden" />
                </label>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Ou cole o texto da fatura (ex: 12/11 BAR DO NELSON 45,90)</label>
                  <textarea
                    rows={4}
                    placeholder={"10/11 BAR DO NELSON 45,90\n11/11 OPEA SEGUROS LTDA 1500,00"}
                    value={textoFatura}
                    onChange={e => setTextoFatura(e.target.value)}
                    className={`${inputCls} font-mono text-[11px]`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAnalisarTextoFatura}
                  className="w-full py-2.5 rounded-xl bg-[#121318] border border-[#272a34] text-zinc-200 text-xs font-semibold"
                >
                  Analisar e Categorizar Lançamentos
                </button>
              </div>

              {itensPrevia.length > 0 && (
                <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-zinc-200">
                      Prévia ({itensPrevia.filter(i => i.selecionado).length} selecionados)
                    </span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                      Total: R$ {itensPrevia.filter(i => i.selecionado).reduce((a, b) => a + b.valor, 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {itensPrevia.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setItensPrevia(prev => prev.map((p, i) => i === idx ? { ...p, selecionado: !p.selecionado } : p))}
                        className={`p-2.5 rounded-lg border text-xs flex justify-between items-center cursor-pointer ${item.selecionado ? 'bg-[#121318] border-emerald-500/30' : 'bg-[#121318]/40 border-[#1f2128] opacity-50'}`}
                      >
                        <div>
                          <p className="font-semibold text-zinc-100">{item.descricao}</p>
                          <p className="text-[10px] text-zinc-400">{item.categoria} {item.dataCompra ? `• ${item.dataCompra}` : ''}</p>
                        </div>
                        <span className="font-bold text-zinc-100 tabular-nums">R$ {item.valor.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmarImportacao}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                  >
                    Importar {itensPrevia.filter(i => i.selecionado).length} Compras para a Planilha
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. ABA AUTOMAÇÃO 100% */}
          {abaAtiva === 'automacao' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Testar / Lançar por Frase ou Notificação</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Teste suas regras de lugares colando uma frase (ex: <em>&quot;Pagamento realizado de R$ 1500,00 para OPEA SEGUROS LTDA&quot;</em> ou <em>&quot;Pix enviado de R$ 45,00 para Bar do Nelson&quot;</em>).
                </p>
                <input
                  type="text"
                  placeholder="Ex: Pagamento realizado de R$ 1500,00 para OPEA SEGUROS LTDA"
                  value={textoNotifAuto}
                  onChange={e => setTextoNotifAuto(e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={loadingAuto || !textoNotifAuto.trim()}
                  onClick={async () => {
                    setLoadingAuto(true);
                    await onProcessarNotificacaoAuto(textoNotifAuto);
                    setTextoNotifAuto('');
                    setLoadingAuto(false);
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold"
                >
                  {loadingAuto ? 'Processando...' : 'Interpretar e Lançar Automaticamente'}
                </button>
              </div>

              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={15} className="text-emerald-400"/>
                    <span className="text-xs font-semibold text-zinc-200">Links para o MacroDroid (Android)</span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400">
                  <strong>Link 1 (Capturar Compras, Pix, Boletos e Lugares):</strong>
                </p>
                <pre className="bg-[#121318] border border-[#1f2128] p-2.5 rounded-xl text-[10px] text-emerald-400 overflow-x-auto">
{`https://appfinance.cravinhos-sp5.workers.dev/api/proxy?action=macro_compra&app={not_app_package}&titulo={not_title}&texto={notification}`}
                </pre>
                <p className="text-[11px] text-zinc-400 pt-1">
                  <strong>Link 2 (Receber Resumo Diário de Vencimentos):</strong>
                </p>
                <pre className="bg-[#121318] border border-[#1f2128] p-2.5 rounded-xl text-[10px] text-emerald-400 overflow-x-auto">
{`https://appfinance.cravinhos-sp5.workers.dev/api/proxy?action=macro_resumo`}
                </pre>
              </div>
            </div>
          )}

          {/* 6. ABA SEGURANÇA & BACKUP */}
          {abaAtiva === 'seguranca' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Bloqueio de Acesso por PIN (4 dígitos)</span>
                </div>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="Digite 4 números"
                  value={pinTemp}
                  onChange={e => setPinTemp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className={`${inputCls} text-center text-base tracking-widest font-bold`}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pinTemp.length !== 4}
                    onClick={() => onSavePin(pinTemp)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold"
                  >
                    Ativar / Salvar PIN
                  </button>
                  {savedPin && (
                    <>
                      <button type="button" onClick={onLockNow} className="px-3 py-2.5 rounded-xl bg-[#121318] border border-[#272a34] text-zinc-200 text-xs font-medium">
                        Bloquear
                      </button>
                      <button type="button" onClick={() => { setPinTemp(''); onSavePin(''); }} className="px-3 py-2.5 rounded-xl bg-rose-500/15 text-rose-400 text-xs font-medium">
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Download size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Exportação e Backup Local</span>
                </div>
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="w-full py-3 rounded-xl bg-[#121318] hover:bg-zinc-800 border border-[#272a34] text-zinc-100 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Download size={15} className="text-emerald-400"/> Baixar Backup Completo (.JSON)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}