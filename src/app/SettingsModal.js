"use client";

import { useState } from 'react';
import {
  X, Sun, Moon, ShieldCheck, CreditCard, Upload, Cpu, Download, Plus, Trash2,
  CheckCircle, Copy, Send, Smartphone, FileText, Sparkles, Lock, User, Target
} from 'lucide-react';

// =========================================================
// MOTOR DE AUTOCATEGORIZAÇÃO (CLIENTE & IMPORTADOR)
// =========================================================
export function detectarCategoriaAuto(texto) {
  const t = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!t || t.length < 3) return "";
  if (/uber|99app|99\*|99 pop|posto|combustivel|gasolina|etanol|shell|ipiranga|petrobras|estacionamento|sem parar|veloe|pedagio|onibus|metro/.test(t)) return "Transporte";
  if (/ifood|ifd\*|rappi|ze delivery|restaurante|lanchonete|padaria|panificadora|burger|mcdonald|bk |outback|pizzaria|acai|cafe|bar |churrascaria|sushi|doceria/.test(t)) return "Alimentação";
  if (/mercado|supermercado|atacadao|assai|carrefour|pao de acucar|extra|hortifruti|acougue|sacolao/.test(t)) return "Supermercado";
  if (/netflix|spotify|amazon prime|prime video|disney|hbo|max|youtube|google|apple\.com|icloud|chatgpt|openai|claude|internet|vivo|claro|tim|oi /.test(t)) return "Assinaturas";
  if (/drogaria|farmacia|drogasil|raia|pacheco|pague menos|panvel|hospital|clinica|medico|laboratorio|exame|dentista|academia|smartfit|gympass|wellhub/.test(t)) return "Saúde";
  if (/juros de obra|evolucao de obra|construtora|apartamento|condominio|incc|financiamento|iptu/.test(t)) return "Imóvel / Obra";
  if (/energia|eletrica|enel|cpfl|cemig|light|neoenergia|equatorial|sabesp|saneago|copasa|agua|gas|aluguel/.test(t)) return "Moradia";
  if (/mercadolivre|mercado livre|shopee|amazon|magalu|magazine|shein|aliexpress|casas bahia|americanas|cinema|ingresso|shopping|zara|renner|riachuelo|cea/.test(t)) return "Compras & Lazer";
  return "";
}

// =========================================================
// PARSER UNIVERSAL DE FATURAS E EXTRATOS (OFX, CSV E TEXTO)
// =========================================================
export function parseExtratoOuFatura(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];
  const resultados = [];

  // 1. Verifica se é formato OFX (<STMTTRN>)
  if (text.toUpperCase().includes("<STMTTRN>")) {
    const blocos = text.split(/<STMTTRN>/i).slice(1);
    blocos.forEach((b, idx) => {
      const amtMatch = b.match(/<TRNAMT>([-0-9.,]+)/i);
      const memoMatch = b.match(/<(?:MEMO|NAME)>([^<\r\n]+)/i);
      const dtMatch = b.match(/<DTPOSTED>(\d{8})/i);

      if (amtMatch && memoMatch) {
        let val = parseFloat(amtMatch[1].replace(',', '.'));
        const desc = memoMatch[1].trim();
        // Ignora pagamentos de fatura recebidos
        if (desc.toLowerCase().includes("pagamento recebido") || desc.toLowerCase().includes("pagamento de fatura")) return;
        val = Math.abs(val);
        if (val > 0) {
          let dataCompra = "";
          if (dtMatch && dtMatch[1]) {
            const d = dtMatch[1];
            dataCompra = `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
          }
          resultados.push({
            id: idx,
            selecionado: true,
            descricao: desc,
            valor: Number(val.toFixed(2)),
            categoria: detectarCategoriaAuto(desc) || "Geral",
            dataCompra
          });
        }
      }
    });
    return resultados;
  }

  // 2. Linhas de CSV ou Texto Copiado da Fatura
  const linhas = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  linhas.forEach((linha, idx) => {
    const lower = linha.toLowerCase();
    // Ignora cabeçalhos de CSV e linhas de pagamento de fatura
    if (lower.startsWith("date,") || lower.startsWith("data;") || lower.startsWith("data,") || lower.includes("pagamento recebido")) return;

    // Formato CSV Nubank: 2026-11-10,transporte,Uber *Trip,45.90 ou 2026-11-10,Uber,45.90
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
        const desc = csvPartes.length >= 4 ? csvPartes[2].replace(/"/g, '').trim() : csvPartes[1].replace(/"/g, '').trim();
        const catCSV = csvPartes.length >= 4 ? csvPartes[1].replace(/"/g, '').trim() : "";
        if (desc) {
          resultados.push({
            id: idx,
            selecionado: true,
            descricao: desc,
            valor: Number(Math.abs(num).toFixed(2)),
            categoria: detectarCategoriaAuto(desc) || catCSV || "Geral",
            dataCompra
          });
          return;
        }
      }
    }

    // Formato Texto Livre / PDF Copiado: "12/11 UBER *TRIP R$ 45,90" ou "IFOOD 67,90"
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
        const desc = resto.replace(/^[-•*]\s*/, '').trim() || "Compra Importada";
        resultados.push({
          id: idx,
          selecionado: true,
          descricao: desc,
          valor: Number(valor.toFixed(2)),
          categoria: detectarCategoriaAuto(desc) || "Geral",
          dataCompra
        });
      }
    }
  });

  return resultados;
}

// =========================================================
// MODAL COMPLETO DE CONFIGURAÇÕES E AUTOMAÇÃO 100%
// =========================================================
export default function SettingsModal({
  onClose,
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
  onImportarLoteCartao,
  onProcessarNotificacaoAuto,
  onDispararTelegram,
  onExportBackup,
  showToast
}) {
  const [abaAtiva, setAbaAtiva] = useState('geral'); // 'geral', 'bancos', 'importar', 'automacao', 'seguranca'

  // Estados de Perfil, Limites e Preferências
  const [formConfig, setFormConfig] = useState({
    titular: settings.titular || 'Private',
    chavePix: settings.chavePix || '',
    incluirPixWhatsApp: settings.incluirPixWhatsApp !== false,
    metaPatrimonio: settings.metaPatrimonio || 100000,
    tetoCartao: settings.tetoCartao || 0,
    iniciarOculto: settings.iniciarOculto || false,
    abaInicial: settings.abaInicial || 'dashboard'
  });

  // Estados de Gerenciamento de Bancos
  const [novoBancoNome, setNovoBancoNome] = useState('');
  const [novoBancoFech, setNovoBancoFech] = useState(3);
  const [novoBancoVenc, setNovoBancoVenc] = useState(10);

  // Estados do Importador de Faturas (OFX / CSV / Texto)
  const [textoFatura, setTextoFatura] = useState('');
  const [bancoImport, setBancoImport] = useState(meusBancos[0] || 'Nubank');
  const [vencImport, setVencImport] = useState(new Date().toISOString().split('T')[0]);
  const [itensPrevia, setItensPrevia] = useState([]);

  // Estado do Simulador/Lançador por Notificação Inteligente
  const [textoNotifAuto, setTextoNotifAuto] = useState('');
  const [loadingAuto, setLoadingAuto] = useState(false);

  // Estado de PIN
  const [pinTemp, setPinTemp] = useState(savedPin || '');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = String(ev.target?.result || '');
      setTextoFatura(content);
      const parsed = parseExtratoOuFatura(content);
      setItensPrevia(parsed);
      if (parsed.length > 0) showToast(`${parsed.length} transações identificadas no arquivo.`);
      else showToast("Nenhuma transação encontrada no arquivo.", "error");
    };
    reader.readAsText(file);
  };

  const handleAnalisarTextoFatura = () => {
    const parsed = parseExtratoOuFatura(textoFatura);
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
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-[#1f2128] flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Configurações & Central de Automação</h3>
            <p className="text-[11px] text-zinc-500">Personalize tema, bancos, limites, Pix e automações</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-[#181a20] text-zinc-400 hover:text-white"><X size={18}/></button>
        </div>

        {/* Abas de Navegação Interna */}
        <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-[#1f2128] overflow-x-auto no-scrollbar bg-[#0d0e13]">
          {[
            { id: 'geral', label: 'Geral & Tema', icon: <Sun size={13}/> },
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

        {/* Corpo Rolável */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. ABA GERAL, TEMA CLARO/ESCURO, PERFIL E METAS */}
          {abaAtiva === 'geral' && (
            <div className="space-y-4">
              {/* Seletor de Tema Claro / Escuro */}
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

              {/* Perfil & Chave Pix para Cobranças */}
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

              {/* Limites e Metas Financeiras */}
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

          {/* 2. ABA GERENCIADOR DE BANCOS & CARTÕES (meus_bancos) */}
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

          {/* 3. ABA IMPORTADOR DE FATURA (OFX / CSV / TEXTO) */}
          {abaAtiva === 'importar' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <span className="text-xs font-semibold text-zinc-200 block">Importação Automática de Fatura (OFX, CSV ou Texto)</span>
                <p className="text-[11px] text-zinc-400">
                  Envie o arquivo `.ofx` ou `.csv` exportado do aplicativo do seu banco, ou cole as linhas da fatura abaixo. O sistema categoriza cada compra sozinho.
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
                  <label className="text-[11px] text-zinc-400 block mb-1">Ou cole o texto da fatura (ex: 12/11 UBER *TRIP 45,90)</label>
                  <textarea
                    rows={4}
                    placeholder={"10/11 UBER *TRIP 45,90\n11/11 IFOOD *RESTAURANTE 68,50\n12/11 DROGASIL 39,90"}
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

          {/* 4. ABA AUTOMAÇÃO 100% (CELULAR, BOT TELEGRAM E LANÇADOR INTELIGENTE) */}
          {abaAtiva === 'automacao' && (
            <div className="space-y-4">
              {/* Lançador Inteligente por Texto de Notificação */}
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Lançamento Inteligente por Frase ou Notificação</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Cole qualquer notificação de banco ou digite uma frase (ex: <em>&quot;Compra aprovada no Nubank de R$ 54,90 em UBER&quot;</em> ou <em>&quot;Pix enviado de R$ 120,00 em Supermercado&quot;</em>).
                </p>
                <input
                  type="text"
                  placeholder="Ex: Compra aprovada de R$ 68,90 em IFOOD no cartão Nubank"
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

              {/* Captura Automática das Notificações do Celular (MacroDroid / Atalhos iOS) */}
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={15} className="text-emerald-400"/>
                    <span className="text-xs font-semibold text-zinc-200">1. Automação ao Passar o Cartão (Celular)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const modeloJson = JSON.stringify({
                        action: "auto_notificacao",
                        app: "{not_app_package}",
                        titulo: "{not_title}",
                        texto: "{not_text}"
                      }, null, 2);
                      navigator.clipboard?.writeText(modeloJson);
                      showToast("JSON copiado para a área de transferência!");
                    }}
                    className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium"
                  >
                    <Copy size={12}/> Copiar JSON
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  No Android (app gratuito <strong>MacroDroid</strong>) ou iPhone (app <strong>Atalhos</strong> → Automação → Ao usar Carteira/Apple Pay): configure um disparo HTTP POST para <code>{typeof window !== 'undefined' ? `${window.location.origin}/api/proxy` : '/api/proxy'}</code> com o JSON abaixo. Cada compra aprovada cai sozinha na planilha em 2 segundos:
                </p>
                <pre className="bg-[#121318] border border-[#1f2128] p-3 rounded-xl text-[10px] text-emerald-400 overflow-x-auto">
{`{
  "action": "auto_notificacao",
  "app": "{not_app_package}",
  "titulo": "{not_title}",
  "texto": "{not_text}"
}`}
                </pre>
              </div>

              {/* Bot do Telegram Interativo */}
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send size={15} className="text-emerald-400"/>
                    <span className="text-xs font-semibold text-zinc-200">2. Comandos Diretos no seu Bot do Telegram</span>
                  </div>
                  <button
                    type="button"
                    onClick={onDispararTelegram}
                    className="text-[11px] text-emerald-400 font-semibold"
                  >
                    Enviar Resumo →
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Como seu app roda na <strong>Cloudflare</strong>, clique no botão abaixo para conectar seu Bot do Telegram diretamente ao link da sua Cloudflare (<code>/api/proxy</code>):
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const webhookUrl = `${window.location.origin}/api/proxy`;
                      const res = await fetch('/api/proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'ativar_webhook_telegram', webhookUrl })
                      });
                      const json = await res.json();
                      if (json.success) showToast("Bot do Telegram conectado à sua Cloudflare com sucesso!");
                      else showToast(json.message || "Falha ao conectar Webhook.", "error");
                    } catch (_) {
                      showToast("Erro ao conectar Webhook do Telegram.", "error");
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold"
                >
                  🔗 Ativar Bot Interativo no Link da Cloudflare (1 Clique)
                </button>
                <div className="bg-[#121318] border border-[#1f2128] p-3 rounded-xl space-y-1 text-[11px] font-mono text-zinc-300">
                  <p>• <span className="text-emerald-400">cartao 45,90 Uber Nubank</span> (Lança na fatura)</p>
                  <p>• <span className="text-emerald-400">pix 120 Supermercado</span> (Lança Pix pago)</p>
                  <p>• <span className="text-emerald-400">obra 640,50</span> (Lança Juros de Obra)</p>
                  <p>• <span className="text-emerald-400">apto 1500</span> (Lança Parcela do Apartamento)</p>
                  <p>• <span className="text-emerald-400">aparte 100 Joao Gasolina</span> (Dívida 0%)</p>
                  <p>• <span className="text-emerald-400">/resumo</span> (Recebe relatório de vencimentos)</p>
                </div>
              </div>
            </div>
          )}

          {/* 5. ABA SEGURANÇA (PIN) & BACKUP DE DADOS */}
          {abaAtiva === 'seguranca' && (
            <div className="space-y-4">
              <div className="bg-[#16181f] border border-[#222530] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-emerald-400"/>
                  <span className="text-xs font-semibold text-zinc-200">Bloqueio de Acesso por PIN (4 dígitos)</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Exige sua senha numérica de 4 dígitos sempre que o aplicativo for aberto no celular ou computador.
                </p>
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
                <p className="text-[11px] text-zinc-400">
                  Baixe uma cópia completa de todos os seus lançamentos, investimentos, contas fixas e recebíveis para o seu aparelho.
                </p>
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
