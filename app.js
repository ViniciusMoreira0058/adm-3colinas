"use strict";
/* =====================================================================
   ADM 3COLINAS · app da equipe ADM do Legendários Base 3 Colinas
   Preencha as duas linhas abaixo com os dados do Supabase
   (Project Settings → API). Use só a chave anon / publishable.
   Com SUPABASE_URL vazio (ou ?demo=1 no endereço) o app abre em modo demonstração.
   ===================================================================== */
const SUPABASE_URL = "https://jgoewqyfihdzpurlvaxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_QBxqFv2T9W-4-XTj_OSVEA_d1olCthu"; // chave pública (publishable/anon): segura no navegador, a RLS protege os dados
(() => {
const DEMO = !SUPABASE_URL || !SUPABASE_KEY || new URLSearchParams(location.search).has("demo");
const sb = DEMO ? null : window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ico = (id, cls = "") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const digits = s => String(s || "").replace(/\D/g, "").slice(-11);
const fmtNum = n => Number(n || 0).toLocaleString("pt-BR");
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

/* ---------- Tema ---------- */
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
function currentTheme() {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function paintThemeBtns() {
  const dark = currentTheme() === "dark";
  $("#themeBtn").innerHTML = dark ? `${ico("sun")} Tema claro` : `${ico("moon")} Tema escuro`;
  $("#themeBtnM").innerHTML = dark ? ico("sun") : ico("moon");
}
function toggleTheme() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  store.set("top-theme", next);
  paintThemeBtns();
}
const savedTheme = store.get("top-theme");
document.documentElement.setAttribute("data-theme", savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark");
$("#themeBtn").onclick = toggleTheme; $("#themeBtnM").onclick = toggleTheme;
paintThemeBtns();

/* ---------- Domínio ---------- */
const ATESTADO = [
  { v: "pendente", l: "Pendente", c: "" },
  { v: "enviada", l: "Msg enviada", c: "sent" },
  { v: "aguardando", l: "Aguardando", c: "wait" },
  { v: "confirmado", l: "Confirmado", c: "ok" },
];
const TERMO = [
  { v: "pendente", l: "Pendente", c: "" },
  { v: "enviada", l: "Msg enviada", c: "sent" },
  { v: "aguardando", l: "Aguardando", c: "wait" },
  { v: "assinado", l: "Assinado", c: "ok" },
  { v: "nao", l: "Não assinou", c: "bad" },
];
const TASK = [
  { v: "afazer", l: "A fazer" }, { v: "andamento", l: "Em andamento" }, { v: "pronto", l: "Pronto" },
];
const FASES = [ { v: "pre", l: "Pré TOP" }, { v: "checkin", l: "Check-in" }, { v: "pos", l: "Pós TOP" } ];
const EQUIPES = ["ADM", "Logística", "Mídia", "Segurança", "Voz", "Hakunas", "Intercessão", "Eventos", "Base", "Coordenação"];
const ADMS = ["Thalisson", "Vinicius", "Gustavo Arantes", "Henrique"];
const GRUPOS = [ { v: "armario", l: "Armário LGND" }, { v: "mre", l: "Itens do MRE" }, { v: "equip", l: "Equipamentos" } ];
const opt = (list, v) => list.find(o => o.v === v) || list[0];
const chip = (list, v, attrs = "") => { const o = opt(list, v); return `<${attrs ? "button type=\"button\"" : "span"} class="chip ${o.c}" ${attrs}>${esc(o.l)}</${attrs ? "button" : "span"}>`; };
const is40 = p => Number(p.idade) >= 40 || p.mais40 === true;
function waNumber(tel) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 ? d : "";
}
function waBtn(p) {
  const n = waNumber(p.telefone);
  if (!n) return `<span class="wa off" title="Sem telefone válido">${ico("wa")} WhatsApp</span>`;
  const first = String(p.nome || "").trim().split(/\s+/)[0] || "";
  const msg = encodeURIComponent(`Olá ${first}, tudo bem? Aqui é da equipe ADM do TOP 1922 Legendários 3 Colinas.`);
  return `<a class="wa" href="https://wa.me/${n}?text=${msg}" target="_blank" rel="noopener" title="Abrir conversa com ${esc(p.nome)} no WhatsApp">${ico("wa")} WhatsApp</a>`;
}

/* ---------- Estado ---------- */
const S = {
  view: "painel", online: null, canWrite: true,
  pessoas: [], tarefas: [], estoque: [], pista: [], tops: [], config: { alertaBaixo: 5, metaMRE: 110, kitsMRE: 0, topAtual: "top1922" },
  P: [], T: [], topSel: null, equipe: [], peers: [], isOwner: false,
  loaded: { pessoas: false, tarefas: false, estoque: false, pista: false, tops: false },
  f: { q: "", tipo: "participante", status: "todos", adm: "" },
  sel: { on: false, tipo: "", ids: new Set() },   // seleção para apagar em massa (só o dono)
  pf: { quem: "participante", oque: "qualquer", adm: "" },   // filtros de Pendências
  hf: { q: "", quem: "", aba: "", acao: "" }, hist: [], histOk: false, histErro: "",   // Histórico (só o dono)
};
let db = null;
let localSeq = 0;

/* Cada participante e tarefa pertence a um TOP; registros antigos sem o campo são do TOP 1922. */
const LEGACY_TOP = "top1922";
const topOf = d => d.top || LEGACY_TOP;
const atualId = () => S.config.topAtual || LEGACY_TOP;
const curTopId = () => (S.topSel && S.tops.some(t => t.id === S.topSel)) ? S.topSel : atualId();
const topDoc = (id = curTopId()) => S.tops.find(t => t.id === id) || null;
const topName = (id = curTopId()) => (topDoc(id) || {}).nome || "TOP 1922";
const topKits = () => { const t = topDoc(); return t ? (t.kitsMRE || 0) : (S.config.kitsMRE || 0); };
const fmtDate = s => { if (!s) return ""; const [y, m, d] = String(s).split("-"); return d ? `${d}/${m}/${y}` : s; };
S.topSel = store.get("top-sel");

const api = {
  async add(col, data) {
    if ((col === "pessoas" || col === "tarefas") && !data.top) data = { ...data, top: curTopId() };
    if (!db) { const doc = { id: "local" + (++localSeq), ...data }; S[col].push(doc); render(); return doc; }
    const r = await db.collection(col).add(data); logLocal(col, r.id, null, data); return r;
  },
  async update(col, id, data) {
    if (!db) { const d = S[col].find(x => x.id === id); Object.assign(d, data); render(); return; }
    const antes = DEMO && Array.isArray(S[col]) && S[col].find(x => x.id === id);
    await db.collection(col).doc(id).update(data);
    if (antes) { const { id: _, ...a } = antes; logLocal(col, id, a, { ...a, ...data }); }
  },
  async remove(col, id) {
    if (!db) { S[col] = S[col].filter(x => x.id !== id); render(); return; }
    const antes = DEMO && Array.isArray(S[col]) && S[col].find(x => x.id === id);
    await db.collection(col).doc(id).delete();
    if (antes) { const { id: _, ...a } = antes; logLocal(col, id, a, null); }
  },
  async set(col, id, data) {
    if (!db) { S[col] = S[col].filter(x => x.id !== id); S[col].push({ id, ...data }); render(); return; }
    const antes = DEMO && Array.isArray(S[col]) && S[col].find(x => x.id === id);
    await db.collection(col).doc(id).set(data);
    if (DEMO) { const a = antes ? (({ id: _, ...r }) => r)(antes) : null; logLocal(col, id, a, data); }
  },
  async config(data) {
    if (!db) { Object.assign(S.config, data); render(); return; }
    await db.doc("config/geral").set({ ...S.config, ...data });
  },
};
async function save(fn, okMsg) {
  if (!podeEditar()) { toast("Seu acesso é somente leitura."); render(); return; }
  try { await fn(); if (okMsg) toast(okMsg); }
  catch (e) {
    console.error(e);
    toast("Não foi possível salvar. " + erroAmigavel(e));
  }
}

/* ---------- Navegação ---------- */
const VIEWS = [
  { id: "painel", l: "Dashboard", i: "home" },
  { id: "participantes", l: "Participantes", i: "users" },
  { id: "legendarios", l: "Legendários", i: "shield" },
  { id: "pendencias", l: "Pendências", i: "bell", need: ["participantes", "legendarios"] },
  { id: "familias", l: "Famílias", i: "fam" },
  { id: "checklist", l: "Checklist", i: "list" },
  { id: "estoque", l: "Estoque", i: "box" },
  { id: "pista", l: "Pista", i: "route" },
  { id: "tops", l: "Tops", i: "flag" },
  { id: "usuarios", l: "Usuários", i: "key", owner: true },
  { id: "historico", l: "Histórico", i: "clock", owner: true },
];
/* Acesso: o dono vê tudo; cada usuário vê as abas que o dono liberou no cadastro dele. */
const NIVEIS = [
  { v: "total", l: "Acesso total", d: "Vê e edita todas as abas, inclusive iniciar e finalizar TOPs." },
  { v: "edita", l: "Edita as abas escolhidas", d: "Vê e altera só as abas marcadas abaixo." },
  { v: "leitura", l: "Somente leitura", d: "Vê as abas marcadas abaixo, sem poder alterar nada." },
];
const ABAS = () => VIEWS.filter(v => !v.owner && !v.need && v.id !== "painel");
const precisaLogin = () => !ME.acesso;
const canSee = v => {
  if (!ME.acesso) return v.id === "painel";
  if (S.isOwner) return true;
  if (v.owner) return false;
  if (v.id === "painel" || ME.acesso.nivel === "total") return true;
  if (v.need) return v.need.some(a => (ME.acesso.abas || []).includes(a));   // aba que usa os dados de outras
  return (ME.acesso.abas || []).includes(v.id);
};
const podeEditar = () => S.isOwner || (!!ME.acesso && ME.acesso.nivel !== "leitura");
const podeTops = () => S.isOwner || (!!ME.acesso && ME.acesso.nivel === "total");
function setMenu(open) {
  $(".app").classList.toggle("menu-open", open);
  $("#scrim").hidden = !open;
  $("#menuBtn").setAttribute("aria-expanded", String(open));
  if (open) { const cur = $("#nav [aria-current]"); (cur || $("#menuClose")).focus(); }
}
/* No computador o menu fica fixo do lado e pode ser recolhido (fica lembrado); no celular ele abre por cima. */
const telaGrande = matchMedia("(min-width: 1024px)");
function setRecolhido(off) {
  $(".app").classList.toggle("side-off", off); store.set("adm3-side-off", off ? "1" : "");
  if (telaGrande.matches) $("#menuBtn").setAttribute("aria-expanded", String(!off));
}
setRecolhido(store.get("adm3-side-off") === "1");
$("#menuBtn").onclick = () => { if (telaGrande.matches) setRecolhido(!$(".app").classList.contains("side-off")); else setMenu(true); };
$("#menuClose").onclick = () => { if (telaGrande.matches) { setRecolhido(true); $("#menuBtn").focus(); } else { setMenu(false); $("#menuBtn").focus(); } };
$("#scrim").onclick = () => setMenu(false);
$("#backBtn").onclick = () => {
  if ($("#modalRoot").innerHTML && !$(".login")) { closeModal(); return; }
  let v = hist.pop();
  while (v && (v === S.view || !canSee(VIEWS.find(x => x.id === v) || {}))) v = hist.pop();
  go(v || "painel", true);
};
/* Voltar: volta para a aba anterior; sem histórico, volta para o Dashboard. */
const hist = [];
function go(v, voltando) {
  setMenu(false);
  if (!voltando && v !== S.view) { hist.push(S.view); if (hist.length > 30) hist.shift(); }
  S.view = v; store.set("top-view", v);
  sharePresence();
  if (v === "participantes") S.f.tipo = "participante";
  if (v === "legendarios") S.f.tipo = "legendario";
  S.f.status = "todos"; S.f.q = ""; S.f.adm = "";
  render(); window.scrollTo(0, 0);
}
const initialHash = (location.hash || "").slice(1);
S.view = VIEWS.some(v => v.id === initialHash) ? initialHash : (VIEWS.some(v => v.id === store.get("top-view")) ? store.get("top-view") : "painel");

function renderNav() {
  const parts = S.P.filter(p => p.tipo !== "legendario").length;
  const lg = S.P.filter(p => p.tipo === "legendario").length;
  const counts = { participantes: parts, legendarios: lg };
  if (!canSee(VIEWS.find(v => v.id === S.view) || {})) S.view = "painel";
  const online = onlineAdms().length;
  counts.usuarios = online ? `${online} on` : null;
  $("#nav").innerHTML = VIEWS.filter(canSee).map(v => `<button type="button" data-go="${v.id}" ${S.view === v.id ? 'aria-current="page"' : ""}>${ico(v.i)}<span>${v.l}</span>${counts[v.id] != null ? `<span class="count num">${counts[v.id]}</span>` : ""}</button>`).join("");
  $("#backBtn").hidden = S.view === "painel";
  $("#backBtn").setAttribute("aria-label", "Voltar para " + ((VIEWS.find(x => x.id === hist[hist.length - 1]) || VIEWS[0]).l));
  $("#mtopTitle").textContent = (VIEWS.find(v => v.id === S.view) || VIEWS[0]).l;
  const td = topDoc();
  $("#mtopSub").textContent = `${topName()} · ${td && td.status === "finalizado" ? "finalizado" : "em andamento"}`;
  $("#sideTop").textContent = topName();
  const meB = $("#meBtn");
  meB.dataset.act = "sair"; meB.hidden = !ME.acesso;
  pintarNotifBtn();
  meB.innerHTML = `${ico("key")} Sair${ME.adm ? " (" + esc(ME.adm.split(" ")[0]) + ")" : ""}`;
  const sync = $("#sync");
  sync.className = "sync " + (S.online === true ? "on" : S.online === false ? "off" : "");
  sync.lastElementChild.textContent = S.online === "demo" ? "Demonstração (não salva)" : S.online === true ? "Sincronizado com a equipe" : S.online === false ? "Sem conexão: tentando de novo" : "Conectando…";
}

/* ---------- Métricas ---------- */
function stats() {
  const all = S.P.filter(p => p.tipo !== "legendario");
  const seen = new Map(); let dup = 0;
  all.forEach(p => { const k = digits(p.telefone) || norm(p.nome); if (seen.has(k)) dup++; else seen.set(k, 1); });
  const n = all.length;
  const lg = S.P.filter(p => p.tipo === "legendario");
  const t = S.T; const done = t.filter(x => x.status === "pronto").length;
  const low = S.estoque.filter(e => e.grupo !== "equip" && typeof e.qtd === "number" && e.qtd > 0 && e.qtd <= S.config.alertaBaixo);
  const zero = S.estoque.filter(e => e.grupo !== "equip" && e.qtd === 0);
  const conferir = S.estoque.filter(e => e.grupo === "equip" && e.conferir);
  const pistaM = S.pista.reduce((s, d) => s + (d.trechos || []).reduce((a, x) => a + (Number(x.m) || 0), 0), 0);
  return {
    n, dup, all,
    atestado: all.filter(p => p.atestado === "confirmado").length,
    termo: all.filter(p => p.termo === "assinado").length,
    nfc: all.filter(p => p.nfc).length,
    msg: all.filter(p => p.msgGrupo).length,
    grupo: all.filter(p => p.noGrupo).length,
    mais40: all.filter(is40),
    mais40ok: all.filter(p => is40(p) && p.atestado === "confirmado").length,
    semFamilia: all.filter(p => !p.familia).length,
    lg, lgAssinado: lg.filter(p => p.termo === "assinado").length, lgAtest: lg.filter(p => p.atestado === "confirmado").length,
    tTotal: t.length, tDone: done, tAnd: t.filter(x => x.status === "andamento"),
    low, zero, conferir, pistaM,
  };
}

/* ---------- Telas ---------- */
// resumo dos dados vindos do relatório de inscrições: camisas (fardas) e saúde
function painelInscricao() {
  const ps = S.P.filter(p => !cancelado(p) && p.ficha && p.tipo !== "legendario");
  if (!ps.length) return "";
  const ORD = ["P/S", "M", "G/L", "GG/XL", "2G/2XL", "3G/3XL", "4G/4XL"];
  const cam = {}; ps.forEach(p => { const c = p.ficha.camisa; if (c) cam[c] = (cam[c] || 0) + 1; });
  const tam = Object.entries(cam).sort((a, b) => ((ORD.indexOf(a[0]) + 1) || 99) - ((ORD.indexOf(b[0]) + 1) || 99));
  const sim = k => S.P.filter(p => !cancelado(p) && p.ficha && p.ficha[k] && !/^n[aã]o\b/i.test(p.ficha[k]));
  const canc = S.P.filter(cancelado).length, pend = S.P.filter(p => p.inscricao === "pendente").length;
  return `
    <section class="panel"><h3>Camisas dos participantes <small>${ps.length} com tamanho informado</small></h3>
      <div class="list">${tam.map(([t, n]) => `<div class="li"><span class="grow">${esc(t)}</span><b class="num">${n}</b></div>`).join("") || `<div class="empty">Sem tamanhos.</div>`}</div>
    </section>
    <section class="panel"><h3>Saúde e inscrição <small>do relatório</small></h3>
      <div class="list">
        <div class="li"><span class="grow">Condição médica</span><b class="num">${sim("condicaoMedica").length}</b></div>
        <div class="li"><span class="grow">Usa medicamento</span><b class="num">${sim("medicamento").length}</b></div>
        <div class="li"><span class="grow">Restrição alimentar</span><b class="num">${sim("restricaoAlimentar").length}</b></div>
        <div class="li"><span class="grow">Pagamento pendente</span><b class="num">${pend}</b></div>
        <div class="li"><span class="grow">Compra cancelada</span><b class="num">${canc}</b></div>
      </div>
    </section>`;
}
function vPainel() {
  const s = stats();
  const kits = topKits(), meta = S.config.metaMRE || 110;
  const fun = [
    ["Mensagem no grupo", s.msg], ["Entraram no grupo", s.grupo], ["Atestado confirmado", s.atestado],
    ["Termo assinado", s.termo], ["NFC registrado", s.nfc],
  ];
  const pendAdm = {};
  s.all.filter(p => p.atestado !== "confirmado" || p.termo !== "assinado").forEach(p => { const k = p.adm || "Sem ADM"; pendAdm[k] = (pendAdm[k] || 0) + 1; });
  const alerts = [
    ...s.zero.map(e => ({ t: e.item, d: "Zerado · " + (GRUPOS.find(g => g.v === e.grupo) || {}).l, c: "bad", l: "Zerado" })),
    ...s.low.map(e => ({ t: e.item, d: `${e.qtd} un. · ${(GRUPOS.find(g => g.v === e.grupo) || {}).l}`, c: "wait", l: "Baixo" })),
    ...s.conferir.map(e => ({ t: e.item, d: "Equipamento", c: "sent", l: "Conferir" })),
  ];
  return `
  <section class="hero">
    <img class="hero-logo" src="assets/logo.png" alt="Track 3 Colinas · Franca SP">
    <div class="hero-text">
      <span class="eyebrow">ADM 3Colinas · Legendários</span>
      <h2>${esc(topName())}</h2>
      <p>${esc([(topDoc() || {}).local || "Franca - SP", (topDoc() || {}).inicio ? fmtDate(topDoc().inicio) + ((topDoc() || {}).fim ? " a " + fmtDate(topDoc().fim) : "") : ""].filter(Boolean).join(" · "))} · tudo atualiza na hora em que alguém da equipe mexe.</p>
      <div class="actions"><button class="btn primary" type="button" data-act="novo">${ico("plus")} Novo participante</button><button class="btn glass" type="button" data-go="tops">${ico("flag")} Todos os Tops</button></div>
    </div>
  </section>
  ${S.online === false ? `<div class="banner"><span>Você está no modo local: o que for cadastrado aqui some ao fechar. Abra pelo link do app logado no Claude para salvar com a equipe.</span></div>` : ""}
  <div class="kpis">
    <button class="kpi" type="button" data-go="participantes"><span class="lbl">Participantes</span><span class="val num">${s.n}</span><span class="sub">${s.dup ? `${s.dup} possível(is) repetido(s)` : "sem repetidos"} · ${s.mais40.length} com +40</span></button>
    <div class="kpi"><span class="lbl">Atestados confirmados</span><span class="val num">${s.atestado}<small style="font-size:18px;color:var(--muted)"> / ${s.n}</small></span><div class="bar good"><i style="width:${pct(s.atestado, s.n)}%"></i></div></div>
    <div class="kpi"><span class="lbl">Termos assinados</span><span class="val num">${s.termo}<small style="font-size:18px;color:var(--muted)"> / ${s.n}</small></span><div class="bar good"><i style="width:${pct(s.termo, s.n)}%"></i></div></div>
    <div class="kpi"><span class="lbl">No grupo</span><span class="val num">${s.grupo}</span><span class="sub">${s.n - s.grupo > 0 ? `faltam ${s.n - s.grupo} entrar` : "todos no grupo"}</span></div>
    <button class="kpi" type="button" data-go="checklist"><span class="lbl">Checklist ADM</span><span class="val num">${pct(s.tDone, s.tTotal)}%</span><span class="sub">${s.tDone} de ${s.tTotal} tarefas prontas</span></button>
    <button class="kpi ${kits < meta ? "alert" : ""}" type="button" data-go="estoque"><span class="lbl">Kits MRE lacrados</span><span class="val num">${kits}</span><span class="sub">meta ${meta} · faltam ${Math.max(0, meta - kits)}</span></button>
    <button class="kpi ${s.zero.length ? "alert" : ""}" type="button" data-go="estoque"><span class="lbl">Estoque em alerta</span><span class="val num">${s.zero.length + s.low.length}</span><span class="sub">${s.zero.length} zerados · ${s.low.length} baixos (até ${S.config.alertaBaixo})</span></button>
    <button class="kpi" type="button" data-go="legendarios"><span class="lbl">Legendários</span><span class="val num">${s.lg.length}</span><span class="sub">${s.lgAtest} atestados · ${s.lgAssinado} termos</span></button>
  </div>
  <div class="grid2">
    <section class="panel"><h3>Documentos e grupo <small>de ${s.n} participantes</small></h3>
      <div class="funnel">${fun.map(([l, v]) => `<div class="funnel-row"><span>${l}</span><div class="bar ${v === s.n && s.n ? "good" : ""}"><i style="width:${pct(v, s.n)}%"></i></div><b>${v} · ${pct(v, s.n)}%</b></div>`).join("")}</div>
    </section>
    <section class="panel"><h3>Pendências por ADM <small>atestado ou termo em aberto</small></h3>
      <div class="list">${Object.keys(pendAdm).length ? Object.entries(pendAdm).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="li"><span class="grow">${esc(k)}</span><b class="num">${v}</b></div>`).join("") : `<div class="empty">Nenhuma pendência. Bom trabalho.</div>`}</div>
    </section>
    <section class="panel"><h3>Alertas de estoque <small>${alerts.length} itens</small></h3>
      <div class="list">${alerts.length ? alerts.slice(0, 8).map(a => `<div class="li"><span class="grow"><b>${esc(a.t)}</b> <span style="color:var(--muted)">· ${esc(a.d)}</span></span><span class="chip ${a.c}">${a.l}</span></div>`).join("") : `<div class="empty">Estoque em dia.</div>`}</div>
    </section>
    <section class="panel"><h3>Em andamento <small>checklist</small></h3>
      <div class="list">${s.tAnd.length ? s.tAnd.map(t => `<div class="li"><span class="grow">${esc(t.titulo)}</span><span class="tag">${esc(t.responsavel || "sem resp.")}</span></div>`).join("") : `<div class="empty">Nenhuma tarefa em andamento.</div>`}</div>
    </section>
    ${painelInscricao()}
  </div>`;
}

function filterPeople() {
  const { q, tipo, status, adm } = S.f;
  const nq = norm(q), dq = digits(q);
  return S.P.filter(p => (tipo === "legendario" ? p.tipo === "legendario" : p.tipo !== "legendario"))
    .filter(p => !nq || norm(p.nome).includes(nq) || norm(p.email).includes(nq) || norm(p.cidade).includes(nq) || (dq.length >= 3 && digits(p.telefone).includes(dq)))
    .filter(p => !adm || (p.adm || "") === adm)
    .filter(p => {
      switch (status) {
        case "atestado": return p.atestado !== "confirmado";
        case "termo": return p.termo !== "assinado";
        case "grupo": return !p.noGrupo;
        case "40": return is40(p);
        case "ok": return p.atestado === "confirmado" && p.termo === "assinado";
        case "novos": return !!S.aviso && p.importId === S.aviso.id;
        default: return true;
      }
    })
    .sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
}

function quando(iso) {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d)) return "";
  const hm = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? `hoje ${hm}` : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hm}`;
}
const respHtml = p => p.adm ? `<div class="resp"><b>${esc(p.adm)}</b>${p.admEm ? `<small>${esc(quando(p.admEm))}</small>` : ""}</div>` : `<span class="hint">—</span>`;
function admOptions() {
  return [...new Set([...ADMS, ...S.P.map(p => p.adm).filter(Boolean)])].sort((x, y) => norm(x).localeCompare(norm(y)));
}

/* Observação do ADM em cada pessoa: aparece na lista e edita num toque */
const obsBtn = p => `<button class="linkbtn obsbtn ${p.obs ? "tem" : ""}" type="button" data-obs="${p.id}" title="${p.obs ? "Ver ou editar observação" : "Adicionar observação"}" aria-label="Observação de ${esc(p.nome)}">${ico("chat")}</button>`;
const obsLinha = p => p.obs ? `<button type="button" class="obsline" data-obs="${p.id}" title="Editar observação">${ico("chat")}<span>${esc(p.obs)}</span>${p.obsPor ? `<small>${esc(p.obsPor.split(" ")[0])}${p.obsEm ? " · " + esc(quando(p.obsEm)) : ""}</small>` : ""}</button>` : "";
function obsForm(p) {
  modal(`
    <h3>Observação</h3>
    <p class="hint" style="margin:0"><b>${esc(p.nome)}</b> · ${p.tipo === "legendario" ? "Legendário" : "Participante"}${p.obsPor ? ` · última por ${esc(p.obsPor)}${p.obsEm ? " " + esc(quando(p.obsEm)) : ""}` : ""}</p>
    <div class="field"><label for="f-obsq">Anotação para a equipe ADM</label><textarea id="f-obsq" name="obs" style="min-height:140px" placeholder="Ex.: vai mandar o atestado na sexta · pediu para ficar na família do irmão · chega de carona">${esc(p.obs || "")}</textarea></div>
    <div class="modal-foot"><div>${p.obs ? `<button class="btn danger" type="button" id="obsLimpar">Apagar observação</button>` : ""}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const obs = String(fd.get("obs") || "").trim(); closeModal();
    if (obs === (p.obs || "")) return;
    touch(p.id, { obs, obsPor: obs ? ME.adm || "" : "", obsEm: obs ? new Date().toISOString() : "" }, obs ? "Observação salva" : "Observação apagada"); });
  const l = $("#obsLimpar"); if (l) l.onclick = () => { closeModal(); touch(p.id, { obs: "", obsPor: "", obsEm: "" }, "Observação apagada"); };
  const ta = $("#f-obsq"); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
const tagsInscricao = p => (S.aviso && p.importId === S.aviso.id ? ' <span class="chip ok">Novo</span>' : "") + (cancelado(p) ? ' <span class="chip bad">Compra cancelada</span>' : p.inscricao === "pendente" ? ' <span class="chip wait">Pagamento pendente</span>' : "")
  + (saudeAlerta(p) ? ' <span class="tag saude" title="Tem condição médica, medicamento ou restrição alimentar">Saúde</span>' : "");
function vPessoas(tipo) {
  const lg = tipo === "legendario";
  const rows = filterPeople();
  const total = S.P.filter(p => lg ? p.tipo === "legendario" : p.tipo !== "legendario").length;
  const exemplos = S.P.some(p => p.exemplo);
  const fil = lg
    ? [["todos", "Todos"], ["atestado", "Sem atestado"], ["termo", "Sem termo"], ["ok", "Tudo OK"]]
    : [["todos", "Todos"], ["atestado", "Sem atestado"], ["termo", "Sem termo"], ["grupo", "Fora do grupo"], ["40", "+40"], ["ok", "Tudo OK"]];
  if (S.aviso && S.P.some(p => p.importId === S.aviso.id && (lg ? p.tipo === "legendario" : p.tipo !== "legendario"))) fil.push(["novos", "Novos da última planilha"]);
  const tick = (p, k, i, t) => `<button type="button" class="tick ${p[k] ? "on" : ""}" data-tog="${k}" data-id="${p.id}" title="${t}" aria-label="${t}: ${p[k] ? "sim" : "não"}" aria-pressed="${!!p[k]}">${ico(i)}</button>`;
  const ticks = p => lg ? "" : `<div class="ticks">${tick(p, "msgGrupo", "chat", "Mensagem do grupo enviada")}${tick(p, "noGrupo", "group", "Entrou no grupo")}${tick(p, "nfc", "nfc", "NFC registrado")}</div>`;
  const cyc = (list, k, p) => chip(list, p[k], `data-cyc="${k}" data-id="${p.id}" title="Clique para avançar o status"`);
  const sel = S.isOwner && S.sel.on && S.sel.tipo === tipo;
  if (!sel) S.sel.ids.clear();
  const visiveis = new Set(rows.map(p => p.id));
  S.sel.ids.forEach(id => { if (!visiveis.has(id)) S.sel.ids.delete(id); });
  const nSel = S.sel.ids.size, todos = rows.length > 0 && nSel === rows.length;
  const caixa = p => sel ? `<input type="checkbox" class="selbox" data-sel="${p.id}" ${S.sel.ids.has(p.id) ? "checked" : ""} aria-label="Selecionar ${esc(p.nome)}">` : "";
  const nomeTipo = lg ? "legendários" : "participantes";
  const atest = p => `${cyc(ATESTADO, "atestado", p)}${p.dataAtestado && p.atestado !== "confirmado" ? `<div class="hint" style="font-size:12px;margin-top:3px">${esc(p.dataAtestado)}</div>` : ""}`;
  return `
  <div class="head"><div><h2>${lg ? "Legendários" : "Participantes"}</h2><p>${lg ? "Servos do TOP: equipe, atestado e termo LGND." : "Cadastro, atestado, termo, grupo e NFC de cada participante."} Toque no status para avançar. Quem mexer por último vira o ADM responsável.</p></div>
    <div class="actions">
      ${S.isOwner && total ? `<button class="btn ${sel ? "primary" : ""}" type="button" data-act="selecionar" aria-pressed="${sel}">${ico("check")} ${sel ? "Concluir seleção" : "Selecionar"}</button>` : ""}
      <button class="btn" type="button" data-act="importar">${ico("upload")} Importar relatório</button>
      <button class="btn" type="button" data-act="colar">${ico("paste")} Colar lista</button>
      <button class="btn primary" type="button" data-act="novo">${ico("plus")} ${lg ? "Novo legendário" : "Novo participante"}</button>
    </div></div>
  ${exemplos ? `<div class="banner"><span>Os nomes marcados como <span class="tag acc">exemplo</span> são fictícios, só para a demonstração.</span><button class="btn" type="button" data-act="limpar-ex">Apagar exemplos</button></div>` : ""}
  <div class="toolbar">
    <label class="search">${ico("search")}<input id="q" type="search" placeholder="Buscar por nome, telefone, e-mail ou cidade" value="${esc(S.f.q)}" aria-label="Buscar"></label>
    <select class="sel" id="admSel" aria-label="ADM responsável"><option value="">Todos os ADMs</option>${admOptions().map(a => `<option ${S.f.adm === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
  </div>
  <div class="seg" role="group" aria-label="Filtro">${fil.map(([v, l]) => `<button type="button" data-fil="${v}" aria-pressed="${S.f.status === v}">${l}</button>`).join("")}</div>
  ${sel ? `<div class="selbar">
    <label class="selall"><input type="checkbox" data-selall="1" ${todos ? "checked" : ""} ${rows.length ? "" : "disabled"}> Selecionar todos${rows.length < total ? " desta lista" : ""} <span class="num">(${rows.length})</span></label>
    <span class="hint num">${nSel} selecionado(s)</span>
    <div class="actions">
      <button class="btn danger" type="button" data-act="apagar-sel" ${nSel ? "" : "disabled"}>Apagar selecionados</button>
      <button class="btn danger" type="button" data-act="apagar-todos">Apagar todos os ${nomeTipo}</button>
    </div></div>` : ""}
  <div class="hint num">${rows.length} de ${total} ${lg ? "legendários" : "participantes"}</div>
  ${rows.length ? `
  <div class="table-wrap people"><table>
    <thead><tr>${sel ? `<th style="width:36px"><input type="checkbox" class="selbox" data-selall="1" ${todos ? "checked" : ""} aria-label="Selecionar todos"></th>` : ""}<th>Nome</th><th>WhatsApp</th>${lg ? "<th>Equipe</th>" : ""}<th>Atestado</th><th>Termo</th>${lg ? "" : "<th>Grupo · NFC</th><th>Família</th>"}<th>Responsável</th><th></th></tr></thead>
    <tbody>${rows.map(p => `<tr class="${S.sel.ids.has(p.id) ? "picked" : ""}">
      ${sel ? `<td>${caixa(p)}</td>` : ""}
      <td><div class="pname">${esc(p.nome)} ${p.exemplo ? '<span class="tag acc">exemplo</span>' : ""} ${!lg && is40(p) ? '<span class="tag">+40</span>' : ""}${tagsInscricao(p)}<small>${esc([p.cidade, p.email].filter(Boolean).join(" · ") || "—")}</small></div>${obsLinha(p)}</td>
      <td class="num" style="white-space:nowrap"><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start">${waBtn(p)}<span class="hint" style="font-size:12px">${esc(p.telefone || "sem telefone")}</span></div></td>
      ${lg ? `<td>${esc(p.equipe || "—")}</td>` : ""}
      <td>${atest(p)}</td>
      <td>${cyc(TERMO, "termo", p)}</td>
      ${lg ? "" : `<td>${ticks(p)}</td><td class="num">${p.familia ? "F" + String(p.familia).padStart(2, "0") : "—"}</td>`}
      <td>${respHtml(p)}</td>
      <td style="white-space:nowrap">${obsBtn(p)}<button class="linkbtn" type="button" data-edit="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></td>
    </tr>`).join("")}</tbody></table></div>
  <div class="cards">${rows.map(p => `<article class="pcard ${S.sel.ids.has(p.id) ? "picked" : ""}">
      <div class="top">${caixa(p)}<div class="pname" style="flex:1">${esc(p.nome)} ${p.exemplo ? '<span class="tag acc">exemplo</span>' : ""} ${!lg && is40(p) ? '<span class="tag">+40</span>' : ""}${tagsInscricao(p)}<small class="num">${esc(p.telefone || "")}${lg && p.equipe ? " · " + esc(p.equipe) : ""}</small></div>
        <div style="display:flex;gap:2px">${obsBtn(p)}<button class="linkbtn" type="button" data-edit="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></div></div>
      ${obsLinha(p)}
      <div class="row"><span class="lbl">Atestado</span>${cyc(ATESTADO, "atestado", p)}<span class="lbl">Termo</span>${cyc(TERMO, "termo", p)}</div>
      <div class="row" style="justify-content:space-between"><div class="row">${ticks(p)}${!lg && p.familia ? `<span class="tag">Família ${String(p.familia).padStart(2, "0")}</span>` : ""}</div>${waBtn(p)}</div>
      ${p.adm ? `<div class="hint" style="font-size:12px">Responsável: <b style="color:var(--fg)">${esc(p.adm)}</b>${p.admEm ? " · " + esc(quando(p.admEm)) : ""}</div>` : ""}
    </article>`).join("")}</div>`
  : `<section class="panel"><div class="empty">${total ? "Nenhum resultado para esse filtro." : `Nenhum ${lg ? "legendário" : "participante"} cadastrado ainda. Use <b>${lg ? "Novo legendário" : "Novo participante"}</b> ou <b>Colar lista</b> para trazer os nomes da planilha.`}</div></section>`}`;
}

function vFamilias() {
  const parts = S.P.filter(p => p.tipo !== "legendario");
  const sem = parts.filter(p => !p.familia);
  const fams = Array.from({ length: 12 }, (_, i) => i + 1);
  return `
  <div class="head"><div><h2>Famílias</h2><p>Distribuição dos participantes nas 12 famílias. Defina a família no cadastro de cada um.</p></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Distribuídos</span><span class="val num">${parts.length - sem.length}</span><span class="sub">de ${parts.length} participantes</span></div>
    <div class="kpi ${sem.length ? "alert" : ""}"><span class="lbl">Sem família</span><span class="val num">${sem.length}</span><span class="sub">média ideal ${parts.length ? (parts.length / 12).toFixed(1).replace(".", ",") : 0} por família</span></div>
  </div>
  ${sem.length ? `<section class="panel"><h3>Sem família <small>${sem.length}</small></h3><div class="list">${sem.map(p => `<div class="li"><span class="grow">${esc(p.nome)} ${is40(p) ? '<span class="tag">+40</span>' : ""}</span><select class="sel" data-fam="${p.id}" aria-label="Família de ${esc(p.nome)}"><option value="">Escolher…</option>${fams.map(f => `<option value="${f}">Família ${String(f).padStart(2, "0")}</option>`).join("")}</select></div>`).join("")}</div></section>` : ""}
  <div class="fams">${fams.map(f => { const m = parts.filter(p => Number(p.familia) === f); return `
    <section class="fam"><header><b>Família ${String(f).padStart(2, "0")}</b><span class="hint num">${m.length} · ${m.filter(is40).length} +40</span></header>
    ${m.length ? `<ul>${m.map(p => `<li><span>${esc(p.nome)}</span>${p.atestado === "confirmado" && p.termo === "assinado" ? '<span class="chip ok">OK</span>' : '<span class="chip wait">Pend.</span>'}</li>`).join("")}</ul>` : `<div class="empty">Ninguém ainda.</div>`}</section>`; }).join("")}</div>`;
}

function vChecklist() {
  const s = stats();
  return `
  <div class="head"><div><h2>Checklist ADM</h2><p>${s.tDone} de ${s.tTotal} tarefas prontas. Toque no quadrado para avançar: a fazer → em andamento → pronto.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-act="nova-tarefa">${ico("plus")} Nova tarefa</button></div></div>
  <div class="bar good"><i style="width:${pct(s.tDone, s.tTotal)}%"></i></div>
  <div class="phases">${FASES.map(f => { const ts = S.T.filter(t => t.fase === f.v).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)); const d = ts.filter(t => t.status === "pronto").length; return `
    <section class="panel"><h3>${f.l} <small class="num">${d}/${ts.length}</small></h3>
    <div>${ts.length ? ts.map(t => `<div class="task ${t.status === "pronto" ? "done" : ""}">
      <button type="button" class="check ${t.status === "pronto" ? "on" : t.status === "andamento" ? "mid" : ""}" data-task="${t.id}" aria-label="${esc(t.titulo)}: ${opt(TASK, t.status).l}">${t.status === "andamento" ? "<b>…</b>" : ico("check")}</button>
      <div><div class="t">${esc(t.titulo)}</div><div class="m">${esc([t.responsavel ? "Resp. " + t.responsavel : "Sem responsável", t.fornecedor, t.obs].filter(Boolean).join(" · "))}</div></div>
      <button class="linkbtn" type="button" data-edit-task="${t.id}" aria-label="Editar tarefa">${ico("edit")}</button></div>`).join("") : `<div class="empty">Nenhuma tarefa.</div>`}</div></section>`; }).join("")}</div>`;
}

function vEstoque() {
  const s = stats();
  const kits = topKits(), meta = S.config.metaMRE || 110;
  const sit = e => {
    if (e.grupo === "equip") return e.conferir ? '<span class="chip sent">Conferir</span>' : '<span class="chip ok">OK</span>';
    if (e.qtd === 0) return '<span class="chip bad">Zerado</span>';
    if (e.qtd <= S.config.alertaBaixo) return '<span class="chip wait">Baixo</span>';
    return '<span class="chip ok">OK</span>';
  };
  const section = g => { const items = S.estoque.filter(e => e.grupo === g.v).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)); return `
    <section class="panel"><h3>${g.l} <small>${items.length} itens</small></h3>
    <div>${items.length ? items.map(e => `<div class="stock-row">
      <div style="min-width:0"><b>${esc(e.item)}</b><div class="meta">${esc([e.local, e.resp ? "compra: " + e.resp : "", e.obs].filter(Boolean).join(" · "))}</div></div>
      ${g.v === "equip" ? `<span class="num" style="font-weight:700">${e.qtd != null ? e.qtd : "—"}</span>` : `<div class="stepper"><button type="button" data-step="-1" data-id="${e.id}" aria-label="Menos ${esc(e.item)}">−</button><span>${e.qtd ?? 0}</span><button type="button" data-step="1" data-id="${e.id}" aria-label="Mais ${esc(e.item)}">+</button></div>`}
      <div style="display:flex;gap:4px;align-items:center">${sit(e)}<button class="linkbtn" type="button" data-edit-item="${e.id}" aria-label="Editar ${esc(e.item)}">${ico("edit")}</button></div>
    </div>`).join("") : `<div class="empty">Nenhum item.</div>`}</div></section>`; };
  return `
  <div class="head"><div><h2>Estoque e compras</h2><p>Use + e − para atualizar na hora da conferência. Alerta de estoque baixo em até ${S.config.alertaBaixo} unidades.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-act="novo-item">${ico("plus")} Novo item</button></div></div>
  <section class="panel"><h3>Kits MRE lacrados <small>meta ${meta}</small></h3>
    <div class="goal"><div class="big num">${kits}<small> / ${meta}</small></div>
      <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:8px"><div class="bar ${kits >= meta ? "good" : ""}" style="height:10px"><i style="width:${Math.min(100, pct(kits, meta))}%"></i></div><span class="hint">Faltam ${Math.max(0, meta - kits)} kits · ${s.zero.length} itens zerados e ${s.low.length} baixos no estoque</span></div>
      <div class="stepper"><button type="button" data-kits="-1" aria-label="Menos um kit">−</button><span>${kits}</span><button type="button" data-kits="1" aria-label="Mais um kit">+</button></div>
    </div></section>
  <div class="grid2">${section(GRUPOS[0])}<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${section(GRUPOS[1])}${section(GRUPOS[2])}</div></div>`;
}

function vPista() {
  const totalM = stats().pistaM;
  const dias = [...S.pista].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  return `
  <div class="head"><div><h2>KM da pista</h2><p>Trechos e tempo de deslocamento de cada dia. Toque em Editar para mudar locais, metros ou tempo.</p></div>
    <div class="actions"><button class="btn" type="button" data-act="novo-dia">${ico("plus")} Adicionar dia</button></div></div>
  <div class="kpis">
    ${dias.map(d => { const m = (d.trechos || []).reduce((a, x) => a + (Number(x.m) || 0), 0); return `<div class="kpi"><span class="lbl">${esc(d.dia)}</span><span class="val num">${(m / 1000).toFixed(2).replace(".", ",")} km</span><span class="sub num">${fmtNum(m)} m · ${(d.trechos || []).length} trechos</span></div>`; }).join("")}
    <div class="kpi alert"><span class="lbl">Pista total</span><span class="val num">${(totalM / 1000).toFixed(2).replace(".", ",")} km</span><span class="sub num">${fmtNum(totalM)} m</span></div>
  </div>
  ${dias.length ? `<div class="days">${dias.map(d => { const tr = d.trechos || []; const m = tr.reduce((a, x) => a + (Number(x.m) || 0), 0); return `
    <section class="panel"><h3>${esc(d.dia)} <small class="num">${fmtNum(m)} m <button class="btn" style="padding:4px 10px;font-size:13px;margin-left:6px" type="button" data-edit-dia="${esc(d.id)}" aria-label="Editar ${esc(d.dia)}">${ico("edit")} Editar</button></small></h3>
      <div class="profile" aria-hidden="true">${tr.map(x => `<i style="flex:${Number(x.m) || 1}" title="${esc(x.de)} → ${esc(x.para)}"></i>`).join("")}</div>
      <div class="legs">${tr.map(x => `<div class="leg"><span class="dot"></span><div><b>${esc(x.de)}</b> → ${esc(x.para)}<div class="meta">${esc(x.tempo || "")}</div></div><span class="num" style="font-weight:700">${fmtNum(x.m)} m</span></div>`).join("")}</div>
    </section>`; }).join("")}</div>` : `<section class="panel"><div class="empty">Os trechos da pista ainda não foram cadastrados.</div></section>`}`;
}

/* Editor de um dia da pista: cada linha é um trecho (de → para, metros, tempo). */
function diaForm(d) {
  const novo = !d;
  d = d || { dia: "D" + (S.pista.length + 1), trechos: [{ de: "", para: "", m: "", tempo: "" }] };
  const row = (x = {}) => `<div class="trow">
    <input name="de" value="${esc(x.de)}" placeholder="Saída" aria-label="Local de saída">
    <span class="arrow" aria-hidden="true">→</span>
    <input name="para" value="${esc(x.para)}" placeholder="Chegada" aria-label="Local de chegada">
    <input name="m" value="${esc(x.m)}" inputmode="numeric" placeholder="Metros" aria-label="Distância em metros" class="num">
    <input name="tempo" value="${esc(x.tempo)}" placeholder="Tempo" aria-label="Tempo de deslocamento">
    <button class="linkbtn" type="button" data-rm-trecho aria-label="Remover trecho">✕</button></div>`;
  modal(`
    <h3>${novo ? "Adicionar dia" : "Editar " + esc(d.dia)}</h3>
    <div class="form">
      <div class="field"><label for="f-dia">Nome do dia</label><input id="f-dia" name="dia" value="${esc(d.dia)}" placeholder="D1"></div>
      <div class="field"><span class="lab">Total</span><div id="diaTot" class="num" style="padding:10px 0;font-weight:700"></div></div>
      <div class="field full"><span class="lab">Trechos (distância em metros)</span><div id="trechos" class="trechos">${(d.trechos || []).map(row).join("")}</div>
        <button class="btn" type="button" id="addTrecho" style="margin-top:8px">${ico("plus")} Adicionar trecho</button>
        <p class="hint" style="margin:6px 0 0">Ao renomear a chegada de um trecho, a saída do trecho seguinte muda junto.</p></div>
    </div>
    <div class="modal-foot"><div>${novo ? "" : `<button class="btn danger" type="button" id="delBtn">Excluir dia</button>`}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  () => {
    const trechos = [...$("#trechos").querySelectorAll(".trow")].map(r => ({
      de: r.querySelector("[name=de]").value.trim(), para: r.querySelector("[name=para]").value.trim(),
      m: Math.max(0, Math.round(Number(String(r.querySelector("[name=m]").value).replace(/\./g, "").replace(",", ".")) || 0)),
      tempo: r.querySelector("[name=tempo]").value.trim(),
    })).filter(x => x.de || x.para || x.m);
    const dia = $("#f-dia").value.trim() || "Dia";
    closeModal();
    if (novo) save(() => api.add("pista", { dia, ordem: Math.max(0, ...S.pista.map(x => x.ordem || 0)) + 1, trechos }), `${dia} adicionado`);
    else save(() => api.update("pista", d.id, { dia, trechos }), `${dia} atualizado`);
  });
  const box = $("#trechos");
  const total = () => { const m = [...box.querySelectorAll("[name=m]")].reduce((a, i) => a + (Number(String(i.value).replace(/\./g, "").replace(",", ".")) || 0), 0); $("#diaTot").textContent = `${fmtNum(Math.round(m))} m · ${(m / 1000).toFixed(2).replace(".", ",")} km`; };
  total();
  box.addEventListener("focusin", ev => { if (ev.target.name === "para") ev.target.dataset.old = ev.target.value; });
  box.addEventListener("input", ev => {
    if (ev.target.name === "m") total();
    if (ev.target.name === "para") {
      const next = ev.target.closest(".trow").nextElementSibling, de = next && next.querySelector("[name=de]");
      if (de && de.value === ev.target.dataset.old) de.value = ev.target.value;
      ev.target.dataset.old = ev.target.value;
    }
  });
  box.addEventListener("click", ev => { const b = ev.target.closest("[data-rm-trecho]"); if (b) { b.closest(".trow").remove(); total(); } });
  $("#addTrecho").onclick = () => {
    const last = [...box.querySelectorAll("[name=para]")].pop();
    box.insertAdjacentHTML("beforeend", row({ de: last ? last.value : "" }));
    box.lastElementChild.querySelector(last && last.value ? "[name=para]" : "[name=de]").focus();
  };
  const del = $("#delBtn");
  if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); save(() => api.remove("pista", d.id), `${d.dia} excluído`); };
}

/* ---------- Usuários (só o dono do app vê) ---------- */
const FUNCOES = ["Coordenador ADM", "ADM", "Apoio ADM", "Hakunas", "Outros"];
// quem está com o app aberto agora (presença do Supabase em tempo real)
function onlineAdms() {
  const seen = new Map();
  S.peers.forEach(p => { if (p && p.membro && !seen.has(p.membro)) seen.set(p.membro, { by: p.membro, isMe: p.membro === ME.id, adm: String(p.nome || ""), tela: String(p.tela || "") }); });
  return [...seen.values()];
}
function acessoHtml(e, on) {
  if (on) return `<span class="chip ok">Online agora</span>${on.tela ? `<div class="hint" style="font-size:12px;margin-top:3px">em ${esc((VIEWS.find(v => v.id === on.tela) || {}).l || on.tela)}</div>` : ""}`;
  if (e.visto_em) return `<span class="chip">Offline</span><div class="hint" style="font-size:12px;margin-top:3px">último acesso ${esc(quando(e.visto_em))}</div>`;
  if (!e.user_id) return `<span class="chip wait">Ainda não criou a senha</span>`;
  return `<span class="chip wait">Nunca acessou</span>`;
}
function nivelTxt(e) {
  if (e.dono) return `<span class="chip ok">Dono · acesso total</span>`;
  if (e.ativo === false) return `<span class="chip bad">Bloqueado</span>`;
  if (e.nivel === "total") return `<span class="chip ok">Acesso total</span>`;
  const abas = ABAS().filter(v => (e.abas || []).includes(v.id)).map(v => v.l);
  return `<span class="chip ${e.nivel === "leitura" ? "" : "sent"}">${e.nivel === "leitura" ? "Somente leitura" : "Edita"}</span><div class="hint" style="font-size:12px;margin-top:3px">${esc(abas.length ? "Dashboard, " + abas.join(", ") : "só o Dashboard")}</div>`;
}
function vUsuarios() {
  const online = onlineAdms();
  const hoje = new Date().toDateString();
  const usaramHoje = S.equipe.filter(e => e.visto_em && new Date(e.visto_em).toDateString() === hoje).length;
  const semSenha = S.equipe.filter(e => !e.user_id && e.ativo !== false).length;
  const rows = S.equipe.map(e => ({ e, on: online.find(o => o.by === e.id) }))
    .sort((a, b) => (b.e.dono ? 1 : 0) - (a.e.dono ? 1 : 0) || (b.on ? 1 : 0) - (a.on ? 1 : 0) || String(b.e.visto_em || "").localeCompare(String(a.e.visto_em || "")));
  return `
  <div class="head"><div><h2>Usuários</h2><p>Cadastre quem pode entrar no app com o e-mail da pessoa e escolha as abas que ela pode ver ou alterar. Só você vê esta aba.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-act="novo-adm">${ico("plus")} Cadastrar usuário</button></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Cadastrados</span><span class="val num">${S.equipe.length}</span><span class="sub">${S.equipe.filter(e => e.ativo !== false).length} com acesso liberado</span></div>
    <div class="kpi"><span class="lbl">Online agora</span><span class="val num" style="color:var(--good)">${online.length}</span><span class="sub">com o app aberto</span></div>
    <div class="kpi"><span class="lbl">Usaram hoje</span><span class="val num">${usaramHoje}</span><span class="sub">de ${S.equipe.filter(e => e.visto_em).length} que já entraram</span></div>
    <div class="kpi"><span class="lbl">Sem senha ainda</span><span class="val num">${semSenha}</span><span class="sub">não fizeram o primeiro acesso</span></div>
  </div>
  ${online.length ? `<section class="panel"><h3>Online agora <small>${online.length}</small></h3><div class="online-list">${online.map(o => `<span class="online-pill"><i></i>${esc(o.adm || "Alguém")}${o.isMe ? " (você)" : ""}</span>`).join("")}</div></section>` : ""}
  <section class="panel"><h3>Equipe <small>${S.equipe.length}</small></h3>
  ${rows.length ? `<div class="table-wrap" style="border:0;background:transparent;backdrop-filter:none"><table>
    <thead><tr><th>Nome</th><th>Função</th><th>E-mail (login)</th><th>Acesso liberado</th><th>Último acesso</th><th>WhatsApp</th><th></th></tr></thead>
    <tbody>${rows.map(({ e, on }) => `<tr>
      <td><div class="pname">${esc(e.nome)}${e.id === ME.id ? ' <span class="tag">você</span>' : ""}<small>${esc(e.obs || "")}</small></div></td>
      <td>${esc(e.funcao || "ADM")}</td>
      <td class="num">${esc(e.email)}</td>
      <td>${nivelTxt(e)}</td>
      <td>${acessoHtml(e, on)}</td>
      <td>${waBtn(e)}</td>
      <td><button class="linkbtn" type="button" data-edit-adm="${esc(e.id)}" aria-label="Editar ${esc(e.nome)}">${ico("edit")}</button></td>
    </tr>`).join("")}</tbody></table></div>` : `<div class="empty">Ninguém cadastrado ainda. Use <b>Cadastrar usuário</b>.</div>`}
  </section>
  <p class="hint">Para alguém entrar: cadastre aqui com o e-mail da pessoa e envie o convite pelo WhatsApp. Ela abre o app, toca em <b>Primeiro acesso</b> e cria a própria senha. Desmarcar "Acesso liberado" bloqueia na hora.</p>`;
}
const isEmail = v => /^[^@\s]+@[^@\s]+\.[a-z0-9-]{2,}$/i.test(v);
function admCadForm(e) {
  const novo = !e;
  e = e || { funcao: "ADM", ativo: true, nome: "", email: "", nivel: "edita", abas: ABAS().map(v => v.id) };
  const dono = !!e.dono;
  modal(`
    <h3>${novo ? "Cadastrar usuário" : "Editar " + esc(e.nome)}</h3>
    <div class="form">
      <div class="field full"><label for="f-anome">Nome</label><input id="f-anome" name="nome" value="${esc(e.nome)}" required placeholder="Como a equipe chama"></div>
      <div class="field"><label for="f-aemail">E-mail (login)</label><input id="f-aemail" name="email" type="email" inputmode="email" value="${esc(e.email)}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="nome@email.com"></div>
      <div class="field"><label for="f-atel">Telefone / WhatsApp</label><input id="f-atel" name="telefone" inputmode="tel" value="${esc(e.telefone)}"></div>
      <div class="field"><label for="f-afun">Função</label>${sel("funcao", FUNCOES.map(x => ({ v: x, l: x })), e.funcao || "ADM")}</div>
      ${dono ? `<div class="field full"><p class="hint" style="margin:0">Esta é a conta do dono: sempre tem acesso total e não pode ser bloqueada.</p></div>` : `
      <div class="field full"><span class="lab">O que pode acessar</span><div class="nivel-opts">${NIVEIS.map(n => `<label><input type="radio" name="nivel" value="${n.v}" ${e.nivel === n.v ? "checked" : ""}><span>${n.l}<small>${n.d}</small></span></label>`).join("")}</div></div>
      <div class="field full"><span class="lab">Abas liberadas (o Dashboard sempre aparece)</span><div class="abas ${e.nivel === "total" ? "off" : ""}" id="abasBox">${ABAS().map(v => `<label><input type="checkbox" name="abas" value="${v.id}" ${e.nivel === "total" || (e.abas || []).includes(v.id) ? "checked" : ""}> ${v.l}</label>`).join("")}</div></div>`}
      <div class="field full"><label for="f-aobs">Observações</label><input id="f-aobs" name="obs" value="${esc(e.obs)}"></div>
      ${dono ? "" : `<div class="field full"><div class="checks"><label><input type="checkbox" id="f-aativo" name="ativo" ${e.ativo !== false ? "checked" : ""}> Acesso liberado (desmarque para bloquear a entrada)</label></div></div>`}
      ${!novo && e.email && !e.user_id ? `<p class="hint field full" style="margin:0">${esc(e.nome.split(" ")[0])} ainda não criou a senha. <button class="link" type="button" id="reenviar" style="color:var(--accent);background:none;border:0;padding:0;font-weight:700">Enviar o convite de novo</button></p>` : ""}
      <span class="err field full" id="cadErr" hidden></span>
    </div>
    <div class="modal-foot"><div>${novo || dono ? "" : `<button class="btn danger" type="button" id="delBtn">Excluir</button>`}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  async (fd) => {
    const err = m => { const x = $("#cadErr"); x.textContent = m; x.hidden = false; };
    const nome = String(fd.get("nome") || "").trim(); if (!nome) { $("#f-anome").focus(); return; }
    const email = String(fd.get("email") || "").trim().toLowerCase();
    if (!isEmail(email)) { err("Coloque um e-mail válido. É com ele que a pessoa entra no app."); $("#f-aemail").focus(); return; }
    if (S.equipe.some(x => x.email === email && x.id !== e.id)) { err(`O e-mail ${email} já está cadastrado para outra pessoa.`); $("#f-aemail").focus(); return; }
    const nivel = dono ? "total" : (fd.get("nivel") || "edita");
    const row = { nome, email, telefone: String(fd.get("telefone") || "").trim(), funcao: fd.get("funcao"), obs: String(fd.get("obs") || "").trim(),
      nivel, abas: nivel === "total" ? ABAS().map(v => v.id) : fd.getAll("abas"), ativo: dono ? true : fd.get("ativo") === "on" };
    if (!novo && e.email && e.email !== email && e.user_id && !confirm(`Trocar o e-mail desliga o login atual de ${nome}. A pessoa vai precisar criar a senha de novo com o e-mail novo. Continuar?`)) return;
    closeModal();
    try {
      await membros.salvar(row, novo ? null : e.id);
      toast(novo ? `${nome} cadastrado` : "Usuário atualizado");
      if (novo || e.email !== email) conviteModal(row);
    } catch (x) { toast(erroAmigavel(x)); }
  });
  const box = $("#abasBox");
  if (box) $("#mform").addEventListener("change", ev => { if (ev.target.name === "nivel") box.classList.toggle("off", ev.target.value === "total"); });
  const re = $("#reenviar"); if (re) re.onclick = () => conviteModal(e);
  const del = $("#delBtn");
  if (del) del.onclick = async () => {
    if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; }
    closeModal();
    try { await membros.excluir(e.id); toast("Usuário excluído e acesso removido"); } catch (x) { toast(erroAmigavel(x)); }
  };
}
const APP_URL = location.origin + location.pathname.replace(/index\.html$/, "");
function conviteModal(e) {
  const nivel = e.nivel, abas = e.abas || [];
  const oq = nivel === "total" ? "acesso total" : (nivel === "leitura" ? "somente leitura" : "edição") + " em: Dashboard" + ABAS().filter(v => abas.includes(v.id)).map(v => ", " + v.l).join("");
  const msg = `Olá ${e.nome.split(" ")[0]}! Seu acesso ao app ADM 3Colinas está liberado.\n\n1. Abra: ${APP_URL}\n2. Toque em "Primeiro acesso? Criar minha senha"\n3. Use este e-mail: ${e.email}\n4. Crie sua senha e confirme pelo link que chega no e-mail.\n\nDepois é só entrar com o e-mail e a senha. Dica: no celular, use "Adicionar à tela inicial" para ficar como app.\n\nAcesso: ${oq}.`;
  const n = waNumber(e.telefone);
  modal(`
    <h3>Convite para ${esc(e.nome)}</h3>
    <div class="cred"><span>E-mail de login: <b>${esc(e.email)}</b></span><span class="hint">${esc(oq.charAt(0).toUpperCase() + oq.slice(1))}</span></div>
    <p class="hint">A pessoa cria a própria senha em "Primeiro acesso". Você não precisa saber a senha dela.</p>
    <div class="modal-foot"><div></div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button>${n ? `<a class="btn primary" href="https://wa.me/${n}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ico("wa")} Enviar no WhatsApp</a>` : `<button class="btn primary" type="button" id="copiarConvite">Copiar convite</button>`}</div></div>`, () => closeModal());
  const c = $("#copiarConvite");
  if (c) c.onclick = () => { navigator.clipboard.writeText(msg).then(() => toast("Convite copiado"), () => toast("Não deu para copiar")); };
}


function topStats(id) {
  const ps = S.pessoas.filter(p => topOf(p) === id);
  const parts = ps.filter(p => p.tipo !== "legendario");
  const ts = S.tarefas.filter(t => topOf(t) === id);
  return {
    n: parts.length, lg: ps.length - parts.length,
    at: parts.filter(p => p.atestado === "confirmado").length, te: parts.filter(p => p.termo === "assinado").length,
    fam: new Set(parts.map(p => p.familia).filter(Boolean)).size,
    tDone: ts.filter(t => t.status === "pronto").length, tTot: ts.length,
  };
}
function vTops() {
  const list = S.tops.length ? [...S.tops] : [{ id: LEGACY_TOP, nome: "TOP 1922", status: "ativo", local: "Franca - SP" }];
  list.sort((a, b) => (a.status === "ativo" ? -1 : 0) - (b.status === "ativo" ? -1 : 0) || String(b.inicio || b.criadoEm || "").localeCompare(String(a.inicio || a.criadoEm || "")));
  const ativo = list.find(t => t.status === "ativo");
  const sel = curTopId();
  return `
  <div class="head"><div><h2>Tops</h2><p>Histórico de todos os TOPs da base 3 Colinas. Ao finalizar um TOP, ele fica registrado aqui com participantes, documentos e checklist.</p></div>
    <div class="actions">${podeTops() ? `<button class="btn primary" type="button" data-act="novo-top">${ico("plus")} Iniciar novo TOP</button>` : ""}</div></div>
  ${ativo ? "" : `<div class="banner"><span>Nenhum TOP em andamento. Inicie o próximo para começar a cadastrar participantes.</span></div>`}
  <div class="tops">${list.map(t => { const s = topStats(t.id); const fin = t.status === "finalizado"; const kits = t.kitsMRE || 0; return `
    <article class="topcard ${t.id === sel ? "sel" : ""}">
      <div class="topcard-cover"><div>
        <span class="chip ${fin ? "ok" : "sent"}">${fin ? "Finalizado" : "Em andamento"}</span>
        <h3>${esc(t.nome)}</h3>
        <p>${esc([t.local, t.inicio ? fmtDate(t.inicio) + (t.fim ? " a " + fmtDate(t.fim) : "") : "", fin && t.finalizadoEm ? "finalizado em " + fmtDate(t.finalizadoEm) : ""].filter(Boolean).join(" · ") || "Sem datas definidas")}</p>
      </div>${t.id === sel ? `<span class="tag acc">Aberto agora</span>` : ""}</div>
      <div class="topstats">
        <div><b class="num">${s.n}</b><span>Participantes</span></div>
        <div><b class="num">${s.at}</b><span>Atestados</span></div>
        <div><b class="num">${s.te}</b><span>Termos</span></div>
        <div><b class="num">${s.lg}</b><span>Legendários</span></div>
        <div><b class="num">${s.fam}</b><span>Famílias</span></div>
        <div><b class="num">${pct(s.tDone, s.tTot)}%</b><span>Checklist</span></div>
        <div><b class="num">${kits}</b><span>Kits MRE</span></div>
      </div>
      <div class="topactions">
        ${t.id !== sel ? `<button class="btn" type="button" data-top-open="${esc(t.id)}">Abrir este TOP</button>` : `<button class="btn" type="button" data-go="painel">Ver painel</button>`}
        ${fin || !podeTops() ? "" : `<button class="btn" type="button" data-top-fin="${esc(t.id)}">Finalizar TOP</button>`}
        ${S.tops.length && podeTops() ? `<button class="linkbtn" type="button" data-edit-top="${esc(t.id)}" aria-label="Editar ${esc(t.nome)}">${ico("edit")}</button>` : ""}
      </div>
    </article>`; }).join("")}</div>`;
}

function render() {
  const tid = curTopId();
  S.P = S.pessoas.filter(p => topOf(p) === tid);
  S.T = S.tarefas.filter(t => topOf(t) === tid);
  renderNav();
  const v = S.view;
  const td = topDoc();
  const other = tid !== atualId() && v !== "tops"
    ? `<div class="banner"><span>Você está vendo o <b>${esc(topName())}</b>${td && td.status === "finalizado" ? " (finalizado)" : ""}. O que mudar aqui fica no histórico dele.</span><button class="btn" type="button" data-top-open="${esc(atualId())}">Voltar para o ${esc(topName(atualId()))}</button></div>` : "";
  const faixa = avisoVisivel() ? `<div class="banner aviso"><span>${ico("bell")} <b>Planilha atualizada</b> por ${esc(S.aviso.por || "um ADM")}: ${S.aviso.novosP + S.aviso.novosL} novo(s) (${S.aviso.novosP} part. · ${S.aviso.novosL} LGND).</span><button class="btn" type="button" data-aviso="abrir">Ver resumo</button></div>` : "";
  const html = faixa + other + (v === "painel" ? vPainel()
    : v === "tops" ? vTops()
    : v === "usuarios" ? vUsuarios()
    : v === "historico" ? vHistorico()
    : v === "pendencias" ? vPendencias()
    : v === "participantes" ? vPessoas("participante")
    : v === "legendarios" ? vPessoas("legendario")
    : v === "familias" ? vFamilias()
    : v === "checklist" ? vChecklist()
    : v === "estoque" ? vEstoque()
    : vPista());
  const view = $("#view");
  const focusId = document.activeElement && document.activeElement.id;
  const caret = focusId === "q" || focusId === "hq" ? document.activeElement.selectionStart : null;
  view.innerHTML = html;
  if ((focusId === "q" || focusId === "hq") && $("#" + focusId)) { const q = $("#" + focusId); q.focus(); try { q.setSelectionRange(caret, caret); } catch {} }
}

/* ---------- Formulários ---------- */
function closeModal() { $("#modalRoot").innerHTML = ""; }
function modal(html, onSubmit) {
  $("#modalRoot").innerHTML = `<div class="overlay" data-close><form class="modal" id="mform" novalidate>${html}</form></div>`;
  const f = $("#mform");
  f.addEventListener("submit", e => { e.preventDefault(); onSubmit(new FormData(f), f); });
  const first = f.querySelector("input,select,textarea"); if (first) first.focus();
}
const sel = (name, list, v) => `<select id="f-${name}" name="${name}">${list.map(o => `<option value="${esc(o.v)}" ${o.v === v ? "selected" : ""}>${esc(o.l)}</option>`).join("")}</select>`;

function personForm(p, tipo) {
  const lg = (p ? p.tipo : tipo) === "legendario";
  p = p || { tipo, atestado: "pendente", termo: "pendente" };
  modal(`
    <h3>${p.id ? "Editar" : "Novo"} ${lg ? "legendário" : "participante"}</h3>
    <div class="form">
      <div class="field full"><label for="f-nome">Nome completo</label><input id="f-nome" name="nome" required value="${esc(p.nome)}" autocomplete="off"></div>
      <div class="field"><label for="f-telefone">Telefone / WhatsApp</label><input id="f-telefone" name="telefone" inputmode="tel" value="${esc(p.telefone)}" placeholder="+55 16 99999-0000"></div>
      <div class="field"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" value="${esc(p.email)}"></div>
      ${lg ? `
      <div class="field"><label for="f-equipe">Equipe</label>${sel("equipe", [{ v: "", l: "—" }, ...EQUIPES.map(e => ({ v: e, l: e }))], p.equipe || "")}</div>
      <div class="field"><label for="f-termo">Termo LGND</label>${sel("termo", TERMO, p.termo)}</div>
      <div class="field"><label for="f-atestado">Status do atestado</label>${sel("atestado", ATESTADO, p.atestado)}</div>
      <div class="field"><label for="f-dataAtestado">Previsão do atestado</label><input id="f-dataAtestado" name="dataAtestado" value="${esc(p.dataAtestado)}" placeholder="ex.: semana do dia 30/10"></div>
      ` : `
      <div class="field"><label for="f-cidade">Cidade</label><input id="f-cidade" name="cidade" value="${esc(p.cidade)}"></div>
      <div class="field"><label for="f-idade">Idade</label><input id="f-idade" name="idade" type="number" min="14" max="99" inputmode="numeric" value="${esc(p.idade)}"></div>
      <div class="field"><label for="f-familia">Família</label>${sel("familia", [{ v: "", l: "Sem família" }, ...Array.from({ length: 12 }, (_, i) => ({ v: String(i + 1), l: "Família " + String(i + 1).padStart(2, "0") }))], p.familia ? String(p.familia) : "")}</div>
      <div class="field"><label for="f-atestado">Status do atestado</label>${sel("atestado", ATESTADO, p.atestado)}</div>
      <div class="field"><label for="f-dataAtestado">Previsão do atestado</label><input id="f-dataAtestado" name="dataAtestado" value="${esc(p.dataAtestado)}" placeholder="ex.: semana do dia 30/10"></div>
      <div class="field"><label for="f-termo">Status do termo</label>${sel("termo", TERMO, p.termo)}</div>
      `}
      ${lg ? "" : `<div class="field full"><span class="lab">Confirmações</span><div class="checks">
        <label><input type="checkbox" id="f-msgGrupo" name="msgGrupo" ${p.msgGrupo ? "checked" : ""}> Mensagem do grupo enviada</label>
        <label><input type="checkbox" id="f-noGrupo" name="noGrupo" ${p.noGrupo ? "checked" : ""}> Entrou no grupo</label>
        <label><input type="checkbox" id="f-nfc" name="nfc" ${p.nfc ? "checked" : ""}> NFC registrado</label>
      </div></div>`}
      <div class="field full"><label for="f-obs">Observações</label><textarea id="f-obs" name="obs">${esc(p.obs)}</textarea></div>
      ${fichaHtml(p)}
    </div>
    <p class="hint" style="margin:0">${p.adm ? `Responsável atual: <b>${esc(p.adm)}</b>${p.admEm ? " (" + esc(quando(p.admEm)) + ")" : ""}. ` : ""}Ao salvar, você${ME.adm ? ` (${esc(ME.adm)})` : ""} passa a ser o ADM responsável.</p>
    <div class="warn-text" id="dupWarn" hidden></div>
    <div class="modal-foot">
      <div>${p.id ? `<button class="btn danger" type="button" id="delBtn">Excluir</button>` : ""}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div>
    </div>`, (fd) => {
    const nome = String(fd.get("nome") || "").trim();
    if (!nome) { const w = $("#dupWarn"); w.hidden = false; w.textContent = "Preencha o nome para salvar."; $("#f-nome").focus(); return; }
    const data = { nome, telefone: String(fd.get("telefone") || "").trim(), email: String(fd.get("email") || "").trim(), obs: String(fd.get("obs") || "").trim(),
      termo: String(fd.get("termo") || "pendente"), atestado: String(fd.get("atestado") || "pendente"), dataAtestado: String(fd.get("dataAtestado") || "").trim() };
    if (lg) Object.assign(data, { equipe: String(fd.get("equipe") || "") });
    else Object.assign(data, {
      cidade: String(fd.get("cidade") || "").trim(), idade: fd.get("idade") ? Number(fd.get("idade")) : null,
      familia: fd.get("familia") ? Number(fd.get("familia")) : null, nfc: fd.get("nfc") === "on",
      msgGrupo: fd.get("msgGrupo") === "on", noGrupo: fd.get("noGrupo") === "on",
    });
    const dup = S.P.find(x => x.id !== p.id && x.tipo === (lg ? "legendario" : "participante") && ((digits(data.telefone) && digits(x.telefone) === digits(data.telefone)) || norm(x.nome) === norm(nome)));
    const w = $("#dupWarn");
    if (dup && w.dataset.ok !== "1") { w.hidden = false; w.dataset.ok = "1"; w.textContent = `Já existe "${dup.nome}" com esse nome ou telefone. Clique em Salvar de novo para cadastrar mesmo assim.`; return; }
    closeModal();
    if ((data.obs || "") !== (p.obs || "")) Object.assign(data, { obsPor: data.obs ? ME.adm || "" : "", obsEm: data.obs ? new Date().toISOString() : "" });
    if (p.id) touch(p.id, data, "Cadastro atualizado");
    else withAdm(stamp => save(() => api.add("pessoas", { ...data, ...stamp, tipo: lg ? "legendario" : "participante", exemplo: false, criadoEm: new Date().toISOString() }), `${nome.split(" ")[0]} cadastrado`));
  });
  const del = $("#delBtn");
  if (del) del.onclick = () => {
    if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; }
    closeModal(); save(() => api.remove("pessoas", p.id), "Cadastro excluído");
  };
}

/* Só o dono: apaga os selecionados ou todos do tipo (no TOP aberto), com confirmação digitada. */
function apagarEmMassa(todos) {
  const tipo = S.view === "legendarios" ? "legendario" : "participante";
  const lg = tipo === "legendario";
  const alvo = todos ? S.P.filter(p => lg ? p.tipo === "legendario" : p.tipo !== "legendario") : S.P.filter(p => S.sel.ids.has(p.id));
  if (!alvo.length) { toast("Nada selecionado."); return; }
  const nome = lg ? (alvo.length > 1 ? "legendários" : "legendário") : (alvo.length > 1 ? "participantes" : "participante");
  modal(`
    <h3>Apagar ${alvo.length} ${nome}?</h3>
    <p class="hint" style="margin:0">${todos ? `Isso apaga <b>todos os ${lg ? "legendários" : "participantes"}</b> do ${esc(topName())}` : `Isso apaga os <b>${alvo.length} selecionados</b>`}, para todos da equipe. <b>Não dá para desfazer.</b></p>
    <ul class="hint" style="margin:0;max-height:140px;overflow:auto;padding-left:18px">${alvo.slice(0, 12).map(p => `<li>${esc(p.nome)}</li>`).join("")}${alvo.length > 12 ? `<li>e mais ${alvo.length - 12}…</li>` : ""}</ul>
    <div class="field"><label for="f-conf">Para confirmar, digite <b>APAGAR</b></label><input id="f-conf" name="conf" autocomplete="off" autocapitalize="characters"></div>
    <div class="warn-text" id="confWarn" hidden></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary danger-fill" type="submit">Apagar ${alvo.length}</button></div></div>`,
  async (fd) => {
    if (String(fd.get("conf") || "").trim().toUpperCase() !== "APAGAR") { const w = $("#confWarn"); w.hidden = false; w.textContent = "Digite APAGAR para confirmar."; $("#f-conf").focus(); return; }
    closeModal();
    S.sel = { on: false, tipo: "", ids: new Set() };
    toast(`Apagando ${alvo.length}…`);
    await save(async () => {
      for (let i = 0; i < alvo.length; i += 8) await Promise.all(alvo.slice(i, i + 8).map(p => api.remove("pessoas", p.id)));
    }, `${alvo.length} ${nome} apagado(s)`);
  });
}

function pasteForm(tipo) {
  const lg = tipo === "legendario";
  modal(`
    <h3>Colar lista</h3>
    <p class="hint" style="margin:0">Copie as colunas <b>Nome, E-mail, Telefone</b> da planilha (pode ser direto do Google Sheets) e cole abaixo. Uma pessoa por linha. Nomes repetidos ou telefones já cadastrados são ignorados.</p>
    <div class="field"><label for="f-lista">Lista</label><textarea id="f-lista" name="lista" style="min-height:180px" placeholder="João da Silva&#9;joao@email.com&#9;+55 16 99999-0000"></textarea></div>
    <p class="hint" style="margin:0">Você${ME.adm ? ` (${esc(ME.adm)})` : ""} fica como ADM responsável pelos nomes importados.</p>
    <div class="hint" id="pastePrev">Nenhuma linha ainda.</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Importar</button></div></div>`,
  async (fd) => {
    const { novos } = parsePaste(String(fd.get("lista") || ""), tipo);
    if (!novos.length) { toast("Nada novo para importar."); return; }
    closeModal();
    withAdm(stamp => importar(novos, stamp));
  });
  async function importar(novos, stamp) {
    toast(`Importando ${novos.length}…`);
    await save(async () => {
      for (let i = 0; i < novos.length; i += 8) {
        await Promise.all(novos.slice(i, i + 8).map(n => api.add("pessoas", {
          ...n, ...stamp, tipo, atestado: "pendente", termo: "pendente", ...(lg ? {} : { nfc: false, msgGrupo: false, noGrupo: false, familia: null }), exemplo: false, criadoEm: new Date().toISOString(),
        })));
      }
    }, `${novos.length} ${lg ? "legendários" : "participantes"} importados`);
  }
  const ta = $("#f-lista");
  ta.addEventListener("input", () => {
    const r = parsePaste(ta.value, tipo);
    $("#pastePrev").textContent = r.total ? `${r.novos.length} novos para importar${r.ignorados ? ` · ${r.ignorados} já cadastrados ou repetidos` : ""}` : "Nenhuma linha ainda.";
  });
}
function parsePaste(text, tipo) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const keys = new Set(S.P.filter(p => (tipo === "legendario") === (p.tipo === "legendario")).flatMap(p => [norm(p.nome), digits(p.telefone)].filter(Boolean)));
  const novos = []; let ignorados = 0;
  for (const l of lines) {
    const cols = l.split(/\t|;|,(?=\s*[^\s])/).map(c => c.trim());
    if (/^nomes?$/i.test(cols[0])) continue;
    let nome = "", email = "", telefone = "";
    cols.forEach(c => { if (!email && /@/.test(c)) email = c; else if (!telefone && digits(c).length >= 8 && /^[\d\s()+-]+$/.test(c)) telefone = c; else if (!nome && c) nome = c; });
    if (!nome) continue;
    const kN = norm(nome), kT = digits(telefone);
    if (keys.has(kN) || (kT && keys.has(kT))) { ignorados++; continue; }
    keys.add(kN); if (kT) keys.add(kT);
    novos.push({ nome, email, telefone, cidade: "", idade: null, obs: "", dataAtestado: "" });
  }
  return { novos, ignorados, total: lines.length };
}

function taskForm(t) {
  t = t || { fase: "pre", status: "afazer" };
  modal(`
    <h3>${t.id ? "Editar tarefa" : "Nova tarefa"}</h3>
    <div class="form">
      <div class="field full"><label for="f-titulo">Tarefa</label><input id="f-titulo" name="titulo" value="${esc(t.titulo)}" required></div>
      <div class="field"><label for="f-fase">Etapa</label>${sel("fase", FASES, t.fase)}</div>
      <div class="field"><label for="f-status">Status</label>${sel("status", TASK, t.status)}</div>
      <div class="field"><label for="f-responsavel">ADM responsável</label><input id="f-responsavel" name="responsavel" list="adms3" value="${esc(t.responsavel)}"><datalist id="adms3">${ADMS.map(a => `<option value="${a}">`).join("")}</datalist></div>
      <div class="field"><label for="f-fornecedor">Fornecedor / itens necessários</label><input id="f-fornecedor" name="fornecedor" value="${esc(t.fornecedor)}"></div>
      <div class="field full"><label for="f-tobs">Observações</label><textarea id="f-tobs" name="obs">${esc(t.obs)}</textarea></div>
    </div>
    <div class="modal-foot"><div>${t.id ? `<button class="btn danger" type="button" id="delBtn">Excluir</button>` : ""}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  (fd) => {
    const titulo = String(fd.get("titulo") || "").trim(); if (!titulo) { $("#f-titulo").focus(); return; }
    const data = { titulo, fase: fd.get("fase"), status: fd.get("status"), responsavel: String(fd.get("responsavel") || "").trim(), fornecedor: String(fd.get("fornecedor") || "").trim(), obs: String(fd.get("obs") || "").trim() };
    closeModal();
    if (t.id) save(() => api.update("tarefas", t.id, data), "Tarefa atualizada");
    else save(() => api.add("tarefas", { ...data, ordem: Date.now() }), "Tarefa criada");
  });
  const del = $("#delBtn");
  if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); save(() => api.remove("tarefas", t.id), "Tarefa excluída"); };
}

function itemForm(e) {
  e = e || { grupo: "armario", local: "Armario LGND" };
  modal(`
    <h3>${e.id ? "Editar item" : "Novo item"}</h3>
    <div class="form">
      <div class="field full"><label for="f-item">Item</label><input id="f-item" name="item" value="${esc(e.item)}" required></div>
      <div class="field"><label for="f-grupo">Grupo</label>${sel("grupo", GRUPOS, e.grupo)}</div>
      <div class="field"><label for="f-qtd">Quantidade</label><input id="f-qtd" name="qtd" type="number" min="0" inputmode="numeric" value="${e.qtd ?? ""}"></div>
      <div class="field"><label for="f-local">Local</label><input id="f-local" name="local" value="${esc(e.local)}"></div>
      <div class="field"><label for="f-resp">Responsável pela compra</label><input id="f-resp" name="resp" list="adms4" value="${esc(e.resp)}"><datalist id="adms4">${ADMS.map(a => `<option value="${a}">`).join("")}</datalist></div>
      <div class="field full"><label for="f-iobs">Observações</label><input id="f-iobs" name="obs" value="${esc(e.obs)}"></div>
      <div class="field full"><div class="checks"><label><input type="checkbox" id="f-conferir" name="conferir" ${e.conferir ? "checked" : ""}> Falta conferir</label></div></div>
    </div>
    <div class="modal-foot"><div>${e.id ? `<button class="btn danger" type="button" id="delBtn">Excluir</button>` : ""}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  (fd) => {
    const item = String(fd.get("item") || "").trim(); if (!item) { $("#f-item").focus(); return; }
    const data = { item, grupo: fd.get("grupo"), qtd: fd.get("qtd") === "" ? null : Number(fd.get("qtd")), local: String(fd.get("local") || "").trim(), resp: String(fd.get("resp") || "").trim(), obs: String(fd.get("obs") || "").trim(), conferir: fd.get("conferir") === "on", atualizado: new Date().toISOString() };
    closeModal();
    if (e.id) save(() => api.update("estoque", e.id, data), "Item atualizado");
    else save(() => api.add("estoque", { ...data, ordem: Date.now() }), "Item criado");
  });
  const del = $("#delBtn");
  if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); save(() => api.remove("estoque", e.id), "Item excluído"); };
}

function topForm(t) {
  const novo = !t;
  const ativo = S.tops.find(x => x.status === "ativo");
  t = t || { local: "Franca - SP", status: "ativo" };
  modal(`
    <h3>${novo ? "Iniciar novo TOP" : "Editar TOP"}</h3>
    <div class="form">
      <div class="field full"><label for="f-tnome">Nome do TOP</label><input id="f-tnome" name="nome" value="${esc(t.nome)}" placeholder="ex.: TOP 1950" required></div>
      <div class="field full"><label for="f-tlocal">Local</label><input id="f-tlocal" name="local" value="${esc(t.local)}"></div>
      <div class="field"><label for="f-tinicio">Início</label><input id="f-tinicio" name="inicio" type="date" value="${esc(t.inicio)}"></div>
      <div class="field"><label for="f-tfim">Fim</label><input id="f-tfim" name="fim" type="date" value="${esc(t.fim)}"></div>
      ${novo ? `<div class="field full"><div class="checks"><label><input type="checkbox" id="f-tcopy" name="copiar" checked> Copiar as tarefas do checklist do ${esc(topName(atualId()))}, zeradas</label></div></div>`
        : `<div class="field"><label for="f-tstatus">Situação</label>${sel("status", [{ v: "ativo", l: "Em andamento" }, { v: "finalizado", l: "Finalizado" }], t.status)}</div>`}
    </div>
    ${novo && ativo ? `<p class="hint" style="margin:0">O ${esc(ativo.nome)} será finalizado e guardado na aba Tops. Participantes, legendários e checklist do novo TOP começam do zero; estoque e pista continuam os mesmos.</p>` : ""}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${novo ? "Iniciar TOP" : "Salvar"}</button></div></div>`,
  async (fd) => {
    const nome = String(fd.get("nome") || "").trim(); if (!nome) { $("#f-tnome").focus(); return; }
    const data = { nome, local: String(fd.get("local") || "").trim(), inicio: String(fd.get("inicio") || ""), fim: String(fd.get("fim") || "") };
    closeModal();
    if (!novo) { data.status = fd.get("status"); await save(() => api.update("tops", t.id, data), "TOP atualizado"); return; }
    const id = "top-" + norm(nome).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Date.now().toString(36);
    const hoje = new Date().toISOString().slice(0, 10);
    const modelo = fd.get("copiar") === "on" ? S.tarefas.filter(x => topOf(x) === atualId()) : [];
    await save(async () => {
      if (ativo) await api.update("tops", ativo.id, { status: "finalizado", finalizadoEm: hoje });
      await api.set("tops", id, { ...data, status: "ativo", kitsMRE: 0, criadoEm: new Date().toISOString() });
      await api.config({ topAtual: id });
      for (let i = 0; i < modelo.length; i += 8) {
        await Promise.all(modelo.slice(i, i + 8).map(x => api.add("tarefas", { top: id, fase: x.fase, ordem: x.ordem || 0, titulo: x.titulo, fornecedor: x.fornecedor || "", responsavel: "", obs: "", status: "afazer" })));
      }
    }, `${nome} iniciado`);
    S.topSel = null; store.set("top-sel", ""); go("painel");
  });
}

/* ---------- Login e equipe ---------- */
// ME: o cadastro de quem entrou. ADM responsável = quem mexe por último no cadastro da pessoa.
const ME = { id: null, adm: "", acesso: null, dono: false };
function erroAmigavel(e) {
  const m = String((e && (e.message || e.error_description)) || e || "");
  if (/row-level security|permission|sem permiss/i.test(m)) return "Você não tem permissão para essa alteração.";
  if (/duplicate|unique/i.test(m)) return "Esse e-mail já está cadastrado.";
  if (/fetch|network|Failed/i.test(m)) return "Sem internet agora. Tente de novo em instantes.";
  return m || "Não foi possível concluir. Tente de novo.";
}

/* Equipe (tabela adm_membros). Só o dono lê a lista inteira. */
const membros = {
  async listar() {
    if (DEMO) return;
    const r = await sb.from("adm_membros").select("*").order("nome");
    if (r.error) throw r.error;
    S.equipe = r.data; if (S.view === "usuarios") render();
  },
  async salvar(row, id) {
    if (DEMO) {
      if (id) Object.assign(S.equipe.find(x => x.id === id), row);
      else S.equipe.push({ id: ADM_DADOS.novoId(), user_id: null, visto_em: null, dono: false, ...row });
      render(); return;
    }
    const r = id ? await sb.from("adm_membros").update(row).eq("id", id) : await sb.from("adm_membros").insert(row);
    if (r.error) throw r.error;
    await membros.listar();
  },
  async excluir(id) {
    if (DEMO) { S.equipe = S.equipe.filter(x => x.id !== id); render(); return; }
    const r = await sb.from("adm_membros").delete().eq("id", id);
    if (r.error) throw r.error;
    await membros.listar();
  },
};

/* Tela de login: e-mail e senha (Supabase Auth). Modos: entrar, primeiro acesso, esqueci, senha nova. */
let authMode = "login";
function loginForm(aviso, erro) {
  const m = authMode;
  const titulo = { login: "", signup: "Primeiro acesso: crie sua senha com o e-mail que o coordenador cadastrou.", reset: "Digite seu e-mail. Vamos mandar um link para você criar uma senha nova.", newpass: "Crie sua senha nova." }[m];
  $("#modalRoot").innerHTML = `<div class="login" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
    <div class="login-card">
      <img src="assets/logo.png" alt="Track 3 Colinas · Franca SP">
      <h1 id="loginTitle">ADM 3COLINAS</h1>
      <p>${esc(titulo || (DEMO ? "Demonstração: escolha como entrar e veja o que cada nível de acesso enxerga." : "Entre com o seu e-mail e senha."))}</p>
      <form id="loginForm" novalidate>
        ${DEMO ? `<div class="demo-pick" role="group" aria-label="Entrar como">${S.equipe.map((e, i) => `<button type="button" data-demo="${esc(e.id)}" aria-pressed="${i === 0}">${esc(e.nome.split(" ")[0])}<small>${e.dono ? "Dono" : e.nivel === "leitura" ? "Só leitura" : e.nivel === "total" ? "Acesso total" : "Edita abas"}</small></button>`).join("")}</div>` : `
        ${m !== "newpass" ? `<label class="sr" for="f-luser">E-mail</label>
        <input id="f-luser" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="E-mail" value="${esc(store.get("adm-email") || "")}">` : ""}
        ${m !== "reset" ? `<label class="sr" for="f-lsenha">Senha</label>
        <div class="pw"><input id="f-lsenha" name="senha" type="password" autocomplete="${m === "login" ? "current-password" : "new-password"}" placeholder="${m === "login" ? "Senha" : "Crie uma senha (mínimo 6)"}"><button type="button" id="pwShow">Mostrar</button></div>` : ""}
        ${m === "signup" || m === "newpass" ? `<label class="sr" for="f-lsenha2">Repita a senha</label><input id="f-lsenha2" name="senha2" type="password" autocomplete="new-password" placeholder="Repita a senha">` : ""}`}
        <span class="${erro ? "err" : "note"}" id="loginErr" ${aviso ? "" : "hidden"}>${esc(aviso || "")}</span>
        <button class="btn primary" type="submit">${{ login: "Entrar", signup: "Criar minha senha", reset: "Enviar link", newpass: "Salvar senha nova" }[m]}</button>
      </form>
      ${DEMO ? `<span class="note">Modo demonstração: nada é salvo. Os participantes e a equipe são fictícios.</span>`
        : m === "login" ? `<div class="login-links"><button class="link" type="button" data-auth="signup">Primeiro acesso? Criar minha senha</button><button class="link" type="button" data-auth="reset">Esqueci minha senha</button></div>`
        : m !== "newpass" ? `<button class="link" type="button" data-auth="login">Voltar para o login</button>` : ""}
    </div>
  </div>`;
  const u = $("#f-luser"), pw = $("#f-lsenha"), errEl = $("#loginErr");
  const foco = u && !u.value ? u : pw || u; if (foco) foco.focus();
  $("#modalRoot").querySelectorAll("[data-auth]").forEach(b => b.onclick = () => { authMode = b.dataset.auth; loginForm(); });
  $("#modalRoot").querySelectorAll("[data-demo]").forEach(b => b.onclick = () => $("#modalRoot").querySelectorAll("[data-demo]").forEach(x => x.setAttribute("aria-pressed", String(x === b))));
  const show = $("#pwShow");
  if (show) show.onclick = () => { const s = pw.type === "password"; pw.type = s ? "text" : "password"; show.textContent = s ? "Ocultar" : "Mostrar"; };
  $("#loginForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    const err = (msg, isErr = true) => { errEl.textContent = msg; errEl.className = isErr ? "err" : "note"; errEl.hidden = false; };
    if (DEMO) { const id = $("#modalRoot [data-demo][aria-pressed=true]").dataset.demo; entrarDemo(S.equipe.find(e => e.id === id)); return; }
    const email = u ? u.value.trim().toLowerCase() : "", senha = pw ? pw.value : "", senha2 = ($("#f-lsenha2") || {}).value;
    if (u && !isEmail(email)) { err("Digite um e-mail válido."); u.focus(); return; }
    if (pw && !senha) { err("Digite a senha."); pw.focus(); return; }
    const btn = $("#loginForm [type=submit]"); btn.disabled = true;
    try {
      if (email) store.set("adm-email", email);
      if (m === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error(/invalid/i.test(error.message) ? "E-mail ou senha incorretos." : /confirm/i.test(error.message) ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : error.message);
        await iniciarSessao();
      } else if (m === "signup" || m === "newpass") {
        if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
        if (senha !== senha2) throw new Error("As duas senhas não estão iguais.");
        if (m === "newpass") {
          const { error } = await sb.auth.updateUser({ password: senha }); if (error) throw error;
          authMode = "login"; history.replaceState(null, "", location.pathname); await iniciarSessao(); return;
        }
        const cad = await sb.rpc("adm_email_cadastrado", { p_email: email });
        if (cad.error) throw cad.error;
        if (!cad.data) throw new Error("Esse e-mail não está cadastrado. Peça ao coordenador para cadastrar você na aba Usuários.");
        const { data, error } = await sb.auth.signUp({ email, password: senha, options: { emailRedirectTo: APP_URL, data: { app: "adm3colinas" } } });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error("Esse e-mail já tem senha. Volte e use Entrar, ou Esqueci minha senha.");
        if (data.session) { await iniciarSessao(); return; }
        authMode = "login"; loginForm(`Pronto! Enviamos um e-mail para ${email}. Abra o link de confirmação e depois entre aqui com a sua senha.`);
      } else if (m === "reset") {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_URL }); if (error) throw error;
        err(`Se ${email} estiver cadastrado, vai chegar um link para criar a senha nova.`, false);
      }
    } catch (x) { err(erroAmigavel(x)); }
    finally { if (btn.isConnected) btn.disabled = false; }
  });
}

/* Aplica o perfil (nível e abas) que o banco devolveu. */
function aplicarPerfil(p) {
  ME.id = p.id; ME.adm = p.nome; ME.dono = !!p.dono; S.isOwner = ME.dono;
  ME.acesso = { nivel: p.dono ? "total" : (p.nivel || "leitura"), abas: p.dono || p.nivel === "total" ? ABAS().map(v => v.id) : (p.abas || []) };
  document.body.classList.toggle("ro", ME.acesso.nivel === "leitura" && !ME.dono);
}
let sessaoOk = false;
async function iniciarSessao() {
  if (sessaoOk) return;
  const r = await sb.rpc("adm_vincular");
  if (r.error) throw r.error;
  const p = r.data;
  if (!p || p.inativo) {
    await sb.auth.signOut();
    authMode = "login";
    loginForm(p ? "Seu acesso está bloqueado. Fale com o coordenador." : "Seu e-mail ainda não está cadastrado na equipe. Peça ao coordenador para cadastrar você na aba Usuários.", true);
    return;
  }
  sessaoOk = true;
  showSplash();
  aplicarPerfil(p);
  // primeiro acesso = ainda não tem "último acesso" registrado (conferido antes de marcar a presença)
  let primeiro = false;
  try { const v = await sb.from("adm_membros").select("visto_em").eq("id", p.id).maybeSingle(); primeiro = !v.error && v.data && !v.data.visto_em; } catch {}
  if ($(".login")) closeModal();
  conectarDados();
  if (primeiro && store.get("adm3-bemvindo-" + p.id) !== "1") boasVindas(); else toast(`Bem-vindo, ${ME.adm.split(" ")[0]}`);
}
function entrarDemo(e) {
  aplicarPerfil(e); e.user_id = e.user_id || "demo"; e.visto_em = new Date().toISOString();
  S.peers = [{ membro: e.id, nome: e.nome, tela: S.view }];
  showSplash(); closeModal(); conectarDados(); toast(`Demonstração: entrou como ${e.nome.split(" ")[0]}`);
  if (store.get("adm3-bemvindo-" + e.id) !== "1") boasVindas();   // na demonstração aparece na 1ª vez de cada pessoa neste aparelho
}
/* Boas-vindas no primeiro acesso: quem é, o que pode ver e as dicas principais */
function boasVindas() {
  if (!splashDone) { setTimeout(boasVindas, 300); return; }
  const first = (ME.adm || "").split(" ")[0];
  const nivel = ME.dono ? "Coordenador (dono do app): vê e altera tudo" : ME.acesso.nivel === "total" ? "Acesso total: vê e altera todas as abas"
    : ME.acesso.nivel === "leitura" ? "Somente leitura: vê as abas liberadas, sem alterar" : "Pode ver e alterar as abas liberadas";
  const abas = VIEWS.filter(canSee).map(v => v.l);
  const dicas = [
    ["home", "Dashboard", "o resumo do TOP: participantes, documentos, checklist e estoque."],
    canSee({ id: "participantes" }) && ["users", "Participantes", "toque no status do atestado ou do termo para avançar. Quem mexer por último vira o ADM responsável."],
    canSee({ id: "pendencias", need: ["participantes", "legendarios"] }) && ["bell", "Pendências", "veja quem falta atestado, termo ou grupo e cobre pelo WhatsApp com a mensagem pronta."],
    ["route", "Tudo em tempo real", "o que alguém da equipe muda aparece na hora para todos. No celular, puxe a tela para baixo para atualizar."],
  ].filter(Boolean);
  const podeNotif = "Notification" in window && Notification.permission === "default";
  modal(`
    <div class="bv-top"><img src="assets/logo.png" alt="" class="bv-logo"><div><h3>Bem-vindo, ${esc(first)}!</h3>
      <p class="hint" style="margin:4px 0 0">Você agora faz parte da equipe ADM do <b>${esc(topName())}</b> · Legendários Base 3 Colinas. Que bom ter você com a gente.</p></div></div>
    <div class="bv-acesso"><span class="lab">Seu acesso</span><b>${esc(nivel)}</b><div class="pendtags">${abas.map(a => `<span class="tag">${esc(a)}</span>`).join("")}</div></div>
    <ul class="bv-dicas">${dicas.map(([i, t, d]) => `<li>${ico(i)}<div><b>${t}</b>: ${d}</div></li>`).join("")}</ul>
    <p class="hint" style="margin:0">Dica: instale o app na tela inicial do celular (Android: menu ⋮ → Instalar app · iPhone: Compartilhar → Adicionar à Tela de Início).</p>
    <div class="modal-foot"><div>${podeNotif ? `<button class="btn" type="button" id="bvNotif">${ico("bell")} Ativar notificações</button>` : ""}</div>
      <div class="actions"><button class="btn primary" type="submit">Começar</button></div></div>`,
  () => { store.set("adm3-bemvindo-" + ME.id, "1"); closeModal(); checarAviso(); });
  const nb = $("#bvNotif"); if (nb) nb.onclick = async () => { await pedirNotificacao(); nb.remove(); };
}
async function sair() {
  setMenu(false);
  if (!DEMO) await sb.auth.signOut();
  location.reload();
}

let canal = null, lastSeenAt = 0;
function sharePresence() { if (canal && ME.id) canal.track({ membro: ME.id, nome: ME.adm, tela: S.view }).catch(() => {}); }
function markSeen(force) {
  if (DEMO || !ME.id) return;
  const now = Date.now();
  if (!force && now - lastSeenAt < 5 * 60 * 1000) return;
  lastSeenAt = now;
  sb.rpc("adm_marcar_presenca").then(() => {}, () => {});
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") markSeen(); });
function withAdm(fn) { fn({ adm: ME.adm, admId: ME.id || null, admEm: new Date().toISOString() }); }
function touch(id, data, msg) { markSeen(); withAdm(stamp => save(() => api.update("pessoas", id, { ...data, ...stamp }), msg)); }


let toastT;
function toast(msg) {
  $("#toastRoot").innerHTML = `<div class="toast" role="status">${esc(msg)}</div>`;
  clearTimeout(toastT); toastT = setTimeout(() => { $("#toastRoot").innerHTML = ""; }, 2600);
}

/* ---------- Eventos ---------- */
const pending = new Map();
const WRITE_KEYS = ["editDia", "act", "edit", "obs", "editTask", "editItem", "editTop", "topFin", "cyc", "tog", "task", "step", "kits", "editAdm"];
function debounceWrite(key, fn, ms = 500) { clearTimeout(pending.get(key)); pending.set(key, setTimeout(() => { pending.delete(key); fn(); }, ms)); }

document.addEventListener("click", e => {
  const cob = e.target.closest("a[data-cobrar]");
  if (cob) { const p = S.P.find(x => x.id === cob.dataset.cobrar); if (p) registrarCobranca(p); return; }
  const t = e.target.closest("button, [data-close]");
  if (!t) return;
  if (t.matches("[data-close]") && e.target === t) { closeModal(); return; }
  if (t.matches("[data-close-btn]")) { closeModal(); return; }
  const d = t.dataset;
  if (d.go) { go(d.go); return; }
  if (d.pf) { S.pf[d.pf] = d.v; render(); return; }
  if (d.aviso) {
    if (d.aviso === "abrir") { avisoModal(); return; }
    marcarAvisoVisto(); closeModal();
    if (d.aviso === "pend") { go("pendencias"); S.pf.quem = "todos"; render(); }
    else if (d.aviso === "novos") { const lgs = S.pessoas.filter(p => p.importId === S.aviso.id); go(lgs.length && lgs.every(p => p.tipo === "legendario") ? "legendarios" : "participantes"); S.f.status = "novos"; render(); }
    else render();
    return;
  }
  if (d.pendAct === "msg") { msgForm(); return; }
  if (d.pendAct === "copiar") { copiarPendencias(); return; }
  if (d.pendAct === "seq") { if (podeEditar()) cobrarSequencia(); return; }
  if (d.histAct === "atualizar") { S.histOk = false; render(); return; }
  if (d.act === "sair") { sair(); return; }
  if (t.id === "notifBtn") { pedirNotificacao(); return; }
  if (!podeEditar() && WRITE_KEYS.some(k => d[k] != null)) { toast("Seu acesso é somente leitura."); return; }
  if (d.fil) { S.f.status = d.fil; render(); return; }
  if (d.act === "novo") { personForm(null, S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.act === "importar") { importForm(S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.restaurar && S.isOwner) {
    const h = S.hist.find(x => String(x.id) === d.restaurar);
    if (h && h.dados) save(() => api.set(h.col, h.doc_id, h.dados), `${h.nome || "Registro"} restaurado`);
    return;
  }
  if (d.act === "colar") { pasteForm(S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.act === "nova-tarefa") { taskForm(); return; }
  if (d.act === "novo-item") { itemForm(); return; }
  if (d.act === "novo-top") { topForm(); return; }
  if (d.act === "novo-adm") { admCadForm(); return; }
  if (d.act === "novo-dia") { diaForm(); return; }
  if (d.editDia) { diaForm(S.pista.find(x => x.id === d.editDia)); return; }
  if (d.editAdm) { admCadForm(S.equipe.find(x => x.id === d.editAdm)); return; }
  if (d.editTop) { topForm(S.tops.find(x => x.id === d.editTop)); return; }
  if (d.topOpen) {
    S.topSel = d.topOpen === atualId() ? null : d.topOpen; store.set("top-sel", S.topSel || "");
    go("painel"); toast(`${topName()} aberto`); return;
  }
  if (d.topFin) {
    if (t.dataset.ok !== "1") { t.dataset.ok = "1"; t.textContent = "Confirmar finalização"; return; }
    save(() => api.update("tops", d.topFin, { status: "finalizado", finalizadoEm: new Date().toISOString().slice(0, 10) }), "TOP finalizado e guardado no histórico"); return;
  }
  if (d.act === "selecionar" && S.isOwner) {
    const tipo = S.view === "legendarios" ? "legendario" : "participante";
    const on = !(S.sel.on && S.sel.tipo === tipo);
    S.sel = { on, tipo, ids: new Set() }; render(); return;
  }
  if ((d.act === "apagar-sel" || d.act === "apagar-todos") && S.isOwner) { apagarEmMassa(d.act === "apagar-todos"); return; }
  if (d.act === "limpar-ex") {
    if (t.dataset.ok !== "1") { t.dataset.ok = "1"; t.textContent = "Confirmar: apagar exemplos"; return; }
    const ex = S.P.filter(p => p.exemplo);
    save(async () => { for (const p of ex) await api.remove("pessoas", p.id); }, "Exemplos apagados"); return;
  }
  if (d.edit) { personForm(S.P.find(p => p.id === d.edit)); return; }
  if (d.obs) { obsForm(S.P.find(p => p.id === d.obs)); return; }
  if (d.editTask) { taskForm(S.T.find(x => x.id === d.editTask)); return; }
  if (d.editItem) { itemForm(S.estoque.find(x => x.id === d.editItem)); return; }
  if (d.cyc) {
    const p = S.P.find(x => x.id === d.id); const list = d.cyc === "atestado" ? ATESTADO : TERMO;
    const cycle = list.filter(o => o.v !== "nao");
    const i = cycle.findIndex(o => o.v === p[d.cyc]); const next = cycle[(i + 1) % cycle.length].v;
    touch(p.id, { [d.cyc]: next }); return;
  }
  if (d.tog) { const p = S.P.find(x => x.id === d.id); touch(p.id, { [d.tog]: !p[d.tog] }); return; }
  if (d.task) {
    const tk = S.T.find(x => x.id === d.task); const order = ["afazer", "andamento", "pronto"];
    const next = order[(order.indexOf(tk.status) + 1) % 3];
    save(() => api.update("tarefas", tk.id, { status: next })); return;
  }
  if (d.step) {
    const it = S.estoque.find(x => x.id === d.id); const q = Math.max(0, (it.qtd || 0) + Number(d.step));
    it.qtd = q; render();
    debounceWrite("e" + it.id, () => save(() => api.update("estoque", it.id, { qtd: it.qtd, atualizado: new Date().toISOString() })));
    return;
  }
  if (d.kits) {
    const td = topDoc(); const k = Math.max(0, topKits() + Number(d.kits));
    if (td) { td.kitsMRE = k; render(); debounceWrite("kits", () => save(() => api.update("tops", td.id, { kitsMRE: td.kitsMRE }))); }
    else { S.config.kitsMRE = k; render(); debounceWrite("kits", () => save(() => api.config({ kitsMRE: S.config.kitsMRE }))); }
    return;
  }
});
document.addEventListener("input", e => {
  if (e.target.id === "q") { S.f.q = e.target.value; render(); }
  if (e.target.id === "hq") { S.hf.q = e.target.value; render(); }
});
document.addEventListener("change", e => {
  if (e.target.dataset.sel && S.isOwner) { const id = e.target.dataset.sel; e.target.checked ? S.sel.ids.add(id) : S.sel.ids.delete(id); render(); return; }
  if (e.target.dataset.selall && S.isOwner) { S.sel.ids = new Set(e.target.checked ? filterPeople().map(p => p.id) : []); render(); return; }
  if (e.target.id === "admSel") { S.f.adm = e.target.value; render(); }
  if (e.target.id === "pfAdm") { S.pf.adm = e.target.value; render(); }
  const hk = { hQuem: "quem", hAba: "aba", hAcao: "acao" }[e.target.id];
  if (hk) { S.hf[hk] = e.target.value; render(); }
  if (e.target.dataset.fam && !podeEditar()) { toast("Seu acesso é somente leitura."); render(); return; }
  if (e.target.dataset.fam) { const v = e.target.value; if (v) touch(e.target.dataset.fam, { familia: Number(v) }, `Família ${v.padStart(2, "0")} definida`); }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if ($(".login") && precisaLogin()) return;
  if ($("#modalRoot").innerHTML) closeModal();
  else if ($(".app").classList.contains("menu-open")) { setMenu(false); $("#menuBtn").focus(); }
});

/* ---------- Pendências: quem ainda deve atestado, termo ou entrar no grupo, com cobrança pelo WhatsApp ---------- */
const PEND = { atestado: "atestado médico", termo: "assinatura do termo", grupo: "entrar no grupo de participantes" };
const MSG_COBRANCA = "Olá {nome}, tudo bem? Aqui é {adm}, da equipe ADM do {top} Legendários 3 Colinas. Para garantir sua participação, ainda falta: {pendencias}. Consegue resolver o quanto antes? Qualquer dúvida estou à disposição.";
const msgCobranca = () => store.get("adm3-msg-cobranca") || MSG_COBRANCA;
const cancelado = p => p.inscricao === "cancelada";
function pendDe(p) {
  if (cancelado(p)) return [];
  const r = [];
  if (p.atestado !== "confirmado") r.push("atestado");
  if (p.termo !== "assinado") r.push("termo");
  if (p.tipo !== "legendario" && !p.noGrupo) r.push("grupo");
  return r;
}
const listaE = a => a.length > 1 ? a.slice(0, -1).join(", ") + " e " + a[a.length - 1] : (a[0] || "");
function textoCobranca(p, tpl = msgCobranca()) {
  const first = String(p.nome || "").trim().split(/\s+/)[0] || "";
  return tpl.replace(/\{nome\}/g, first).replace(/\{adm\}/g, (ME.adm || "a equipe").split(" ")[0])
    .replace(/\{top\}/g, topName()).replace(/\{pendencias\}/g, listaE(pendDe(p).map(k => PEND[k])));
}
const waCobrar = (p, txt) => { const n = waNumber(p.telefone); return n ? `https://wa.me/${n}?text=${encodeURIComponent(txt || textoCobranca(p))}` : ""; };
function pendLista() {
  const { quem, oque, adm } = S.pf;
  return S.P.filter(p => quem === "todos" || (quem === "legendario") === (p.tipo === "legendario"))
    .filter(p => !adm || (p.adm || "") === adm)
    .filter(p => { const k = pendDe(p); return oque === "qualquer" ? k.length : k.includes(oque); })
    .sort((a, b) => (a.cobradoEm || "").localeCompare(b.cobradoEm || "") || norm(a.nome).localeCompare(norm(b.nome)));
}
function diasParaTop() {
  const ini = (topDoc() || {}).inicio; if (!ini) return null;
  const d = Math.ceil((new Date(ini + "T00:00:00") - new Date()) / 864e5);
  return isNaN(d) ? null : d;
}
function vPendencias() {
  const vivos = S.P.filter(p => !cancelado(p));
  const conta = k => vivos.filter(p => pendDe(p).includes(k)).length;
  const rows = pendLista(), dias = diasParaTop();
  const seg = (k, v, l) => `<button type="button" data-pf="${k}" data-v="${v}" aria-pressed="${S.pf[k] === v}">${l}</button>`;
  const tags = p => pendDe(p).map(k => `<span class="chip ${k === "grupo" ? "sent" : "wait"}">${k === "atestado" ? "Atestado" : k === "termo" ? "Termo" : "Grupo"}</span>`).join("");
  return `
  <div class="head"><div><h2>Pendências</h2><p>Quem ainda deve atestado, termo ou entrar no grupo. Toque em <b>Cobrar</b> para abrir o WhatsApp com a mensagem pronta. Quem foi cobrado há mais tempo aparece primeiro.</p></div>
    <div class="actions">
      <button class="btn" type="button" data-pend-act="msg">${ico("chat")} Editar mensagem</button>
      <button class="btn" type="button" data-pend-act="copiar" ${rows.length ? "" : "disabled"}>${ico("paste")} Copiar lista</button>
      ${podeEditar() ? `<button class="btn primary" type="button" data-pend-act="seq" ${rows.length ? "" : "disabled"}>${ico("wa")} Cobrar em sequência (${rows.length})</button>` : ""}
    </div></div>
  ${dias != null ? `<div class="banner"><span>${dias > 0 ? `Faltam <b>${dias} dia${dias > 1 ? "s" : ""}</b> para o ${esc(topName())}.` : dias === 0 ? `O ${esc(topName())} começa hoje.` : `O ${esc(topName())} já começou.`} ${rows.length} pessoa(s) com pendência neste filtro.</span></div>` : ""}
  <div class="kpis">
    <button class="kpi ${conta("atestado") ? "alert" : ""}" type="button" data-pf="oque" data-v="atestado"><span class="lbl">Sem atestado</span><span class="val num">${conta("atestado")}</span><span class="sub">participantes e legendários</span></button>
    <button class="kpi ${conta("termo") ? "alert" : ""}" type="button" data-pf="oque" data-v="termo"><span class="lbl">Sem termo</span><span class="val num">${conta("termo")}</span><span class="sub">participantes e legendários</span></button>
    <button class="kpi" type="button" data-pf="oque" data-v="grupo"><span class="lbl">Fora do grupo</span><span class="val num">${conta("grupo")}</span><span class="sub">participantes</span></button>
    <div class="kpi"><span class="lbl">Tudo em dia</span><span class="val num">${vivos.filter(p => !pendDe(p).length).length}</span><span class="sub">de ${vivos.length} pessoas</span></div>
  </div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Quem">${seg("quem", "participante", "Participantes")}${seg("quem", "legendario", "Legendários")}${seg("quem", "todos", "Todos")}</div>
    <select class="sel" id="pfAdm" aria-label="ADM responsável"><option value="">Todos os ADMs</option>${admOptions().map(a => `<option ${S.pf.adm === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
  </div>
  <div class="seg" role="group" aria-label="Pendência">${seg("oque", "qualquer", "Qualquer pendência")}${seg("oque", "atestado", "Atestado")}${seg("oque", "termo", "Termo")}${seg("oque", "grupo", "Grupo")}</div>
  ${rows.length ? `<section class="panel"><div class="list pend">${rows.map(p => `<div class="li pendrow">
      <div class="grow"><b>${esc(p.nome)}</b> ${p.tipo === "legendario" ? '<span class="tag">LGND</span>' : ""}
        <div class="pendtags">${tags(p)}${p.dataAtestado && p.atestado !== "confirmado" ? `<span class="hint">previsão: ${esc(p.dataAtestado)}</span>` : ""}</div>
        ${obsLinha(p)}<small class="hint">${esc(p.adm || "Sem ADM")}${p.cobradoEm ? ` · cobrado ${esc(quando(p.cobradoEm))}` : " · ainda não cobrado"}</small></div>
      ${waNumber(p.telefone) ? `<a class="wa" href="${waCobrar(p)}" target="_blank" rel="noopener" data-cobrar="${p.id}">${ico("wa")} Cobrar</a>` : `<span class="wa off">${ico("wa")} Sem telefone</span>`}
    </div>`).join("")}</div></section>`
  : `<section class="panel"><div class="empty">Ninguém com essa pendência. Bom trabalho.</div></section>`}`;
}
// marca que foi cobrado e passa "pendente" para "mensagem enviada"
function registrarCobranca(p) {
  if (!podeEditar()) return;
  const k = pendDe(p), data = { cobradoEm: new Date().toISOString() };
  if (k.includes("atestado") && (p.atestado || "pendente") === "pendente") data.atestado = "enviada";
  if (k.includes("termo") && (p.termo || "pendente") === "pendente") data.termo = "enviada";
  if (k.includes("grupo") && !p.msgGrupo) data.msgGrupo = true;
  touch(p.id, data);
}
function msgForm() {
  modal(`
    <h3>Mensagem de cobrança</h3>
    <p class="hint" style="margin:0">Use <b>{nome}</b>, <b>{adm}</b>, <b>{top}</b> e <b>{pendencias}</b>: o app troca pelo primeiro nome da pessoa, o seu nome, o nome do TOP e o que falta. Fica salva neste aparelho.</p>
    <div class="field"><label for="f-msg">Mensagem</label><textarea id="f-msg" name="msg" style="min-height:150px">${esc(msgCobranca())}</textarea></div>
    <div class="modal-foot"><div><button class="btn ghost" type="button" id="msgPadrao">Voltar ao padrão</button></div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { store.set("adm3-msg-cobranca", String(fd.get("msg") || "").trim() || MSG_COBRANCA); closeModal(); toast("Mensagem salva"); render(); });
  $("#msgPadrao").onclick = () => { $("#f-msg").value = MSG_COBRANCA; };
}
function cobrarSequencia() {
  const fila = pendLista().filter(p => waNumber(p.telefone));
  if (!fila.length) { toast("Ninguém com telefone nesse filtro."); return; }
  let i = 0;
  const passo = () => {
    if (i >= fila.length) { closeModal(); toast(`Cobrança concluída: ${fila.length} pessoa(s)`); return; }
    const p = S.P.find(x => x.id === fila[i].id) || fila[i];
    modal(`
      <h3>Cobrar ${i + 1} de ${fila.length}</h3>
      <div class="bar"><i style="width:${pct(i, fila.length)}%"></i></div>
      <div><b style="font-size:18px">${esc(p.nome)}</b><div class="pendtags">${pendDe(p).map(k => `<span class="chip wait">${PEND[k]}</span>`).join("")}</div>
        <small class="hint">${esc(p.telefone || "")} · ${esc(p.adm || "Sem ADM")}${p.cobradoEm ? " · cobrado " + esc(quando(p.cobradoEm)) : ""}</small></div>
      <div class="field"><label for="f-txt">Mensagem (pode ajustar antes de enviar)</label><textarea id="f-txt" style="min-height:130px">${esc(textoCobranca(p))}</textarea></div>
      <div class="modal-foot"><div><button class="btn ghost" type="button" data-close-btn>Parar</button></div>
        <div class="actions"><button class="btn" type="button" id="seqPular">Pular</button><a class="btn primary" id="seqWa" href="#" target="_blank" rel="noopener">${ico("wa")} Abrir WhatsApp</a></div></div>`, () => {});
    const wa = $("#seqWa");
    const atual = () => { wa.href = waCobrar(p, $("#f-txt").value); };
    atual(); $("#f-txt").addEventListener("input", atual);
    wa.addEventListener("click", () => { registrarCobranca(p); i++; setTimeout(passo, 400); });
    $("#seqPular").onclick = () => { i++; passo(); };
  };
  passo();
}
async function copiarPendencias() {
  const rows = pendLista();
  const txt = `Pendências · ${topName()}\n\n` + rows.map(p => `• ${p.nome}: ${listaE(pendDe(p).map(k => k === "grupo" ? "grupo" : k))}${p.adm ? ` (${p.adm})` : ""}`).join("\n");
  try { await navigator.clipboard.writeText(txt); toast(`Lista copiada (${rows.length})`); }
  catch { modal(`<h3>Copiar lista</h3><textarea style="min-height:240px;width:100%" readonly>${esc(txt)}</textarea><div class="modal-foot"><span></span><button class="btn" type="button" data-close-btn>Fechar</button></div>`, () => {}); }
}

/* ---------- Histórico de alterações (só o dono). No Supabase vem da tabela adm_historico; na demonstração fica na memória. ---------- */
const CAMPOS = { nome: "Nome", telefone: "Telefone", email: "E-mail", atestado: "Atestado", termo: "Termo", dataAtestado: "Previsão do atestado",
  cidade: "Cidade", idade: "Idade", familia: "Família", nfc: "NFC", msgGrupo: "Mensagem do grupo", noGrupo: "Entrou no grupo", obs: "Observações",
  equipe: "Equipe", status: "Status", qtd: "Quantidade", titulo: "Tarefa", responsavel: "Responsável", fornecedor: "Fornecedor", item: "Item",
  local: "Local", trechos: "Trechos", kitsMRE: "Kits MRE", topAtual: "TOP atual", inscricao: "Inscrição", ficha: "Dados da inscrição",
  tipo: "Tipo", top: "TOP", mais40: "+40", cobradoEm: "Cobrado em", fase: "Fase", ordem: "Ordem", metaMRE: "Meta MRE", alertaBaixo: "Alerta de estoque",
  inicio: "Início", fim: "Fim", finalizadoEm: "Finalizado em", resp: "Responsável", dia: "Dia" };
const IGNORAR = ["adm", "admId", "admEm", "atualizado", "obsPor", "obsEm"];
function abaDoRegistro(col, d) {
  if (col === "pessoas") return d && d.tipo === "legendario" ? "Legendários" : "Participantes";
  return { tarefas: "Checklist", estoque: "Estoque", pista: "Pista", tops: "Tops", config: "Configurações" }[col] || col;
}
function fmtValor(k, v) {
  if (v == null || v === "") return "vazio";
  if (k === "atestado") return opt(ATESTADO, v).l;
  if (k === "termo") return opt(TERMO, v).l;
  if (k === "status" && TASK.some(o => o.v === v)) return opt(TASK, v).l;
  if (k === "fase") return opt(FASES, v).l;
  if (k === "familia") return "Família " + String(v).padStart(2, "0");
  if (k === "cobradoEm" || k === "criadoEm") return quando(v);
  if (k === "inscricao") return { cancelada: "Compra cancelada", pendente: "Pagamento pendente", ativa: "Ativa" }[v] || v;
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (Array.isArray(v)) return `${v.length} item(ns)`;
  if (typeof v === "object") return "atualizado";
  return String(v).length > 60 ? String(v).slice(0, 57) + "…" : String(v);
}
function diffDados(a, b) {
  const r = {};
  new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach(k => {
    if (IGNORAR.includes(k)) return;
    const x = (a || {})[k], y = (b || {})[k];
    if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null)) r[k] = [x ?? null, y ?? null];
  });
  return r;
}
function logLocal(col, id, antes, depois) {
  if (!DEMO) return;
  const acao = !antes ? "criou" : !depois ? "apagou" : "alterou";
  const mud = acao === "alterou" ? diffDados(antes, depois) : null;
  if (mud && !Object.keys(mud).length) return;
  const d = depois || antes || {};
  S.hist.unshift({ id: "h" + Date.now() + Math.random(), em: new Date().toISOString(), quem: ME.adm || "Demonstração", col, doc_id: id, acao,
    nome: d.nome || d.titulo || d.item || d.dia || "", mudancas: mud, dados: acao === "apagou" ? antes : null, tipo: d.tipo });
  if (S.view === "historico") render();
}
async function carregarHist() {
  if (DEMO || !S.isOwner) return;
  const r = await sb.from("adm_historico").select("*").order("em", { ascending: false }).limit(1000);
  const e = r.error;
  S.histErro = e ? (e.code === "PGRST205" || e.code === "42P01" || /does not exist|schema cache/i.test(e.message || "") ? "sem-tabela" : erroAmigavel(e)) : "";
  S.histDetalhe = e ? [e.code, e.message].filter(Boolean).join(": ") : "";
  if (!r.error) S.hist = r.data;
  S.histOk = true; if (S.view === "historico") render();
}
function vHistorico() {
  if (!DEMO && !S.histOk) { carregarHist(); return `<div class="head"><div><h2>Histórico</h2><p>Carregando…</p></div></div>`; }
  if (S.histErro === "sem-tabela") return `
    <div class="head"><div><h2>Histórico</h2></div></div>
    <section class="panel"><div class="empty">Falta criar o histórico no banco. No Supabase, abra <b>SQL Editor → New query</b>, cole o arquivo <b>supabase/historico.sql</b> e clique em <b>Run</b>. Depois toque em <b>Tentar de novo</b>.
      <div style="margin-top:12px"><button class="btn primary" type="button" data-hist-act="atualizar">Tentar de novo</button></div>
      ${S.histDetalhe ? `<p class="hint" style="margin-top:10px;font-size:12px">Detalhe: ${esc(S.histDetalhe)}</p>` : ""}</div></section>`;
  const h = S.hf, nq = norm(h.q);
  const quem = [...new Set(S.hist.map(x => x.quem))].sort();
  const linha = x => ({ ...x, aba: abaDoRegistro(x.col, x.dados || { tipo: x.tipo || ((S.pessoas.find(p => p.id === x.doc_id) || {}).tipo) }) });
  const rows = S.hist.map(linha).filter(x => (!h.quem || x.quem === h.quem) && (!h.aba || x.aba === h.aba) && (!h.acao || x.acao === h.acao)
    && (!nq || norm(x.nome).includes(nq) || norm(x.quem).includes(nq)));
  const abas = [...new Set(S.hist.map(linha).map(x => x.aba))].sort();
  const verbo = { criou: "criou", alterou: "alterou", apagou: "apagou" };
  let dia = "";
  const itens = rows.slice(0, 400).map(x => {
    const d = new Date(x.em), dd = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    const cab = dd !== dia ? `<div class="hdia">${esc(dd)}</div>` : ""; dia = dd;
    const mud = x.mudancas ? Object.entries(x.mudancas).filter(([k]) => !IGNORAR.includes(k)).map(([k, [a, b]]) => `<li><span>${esc(CAMPOS[k] || k)}:</span> ${esc(fmtValor(k, a))} → <b>${esc(fmtValor(k, b))}</b></li>`).join("") : "";
    return `${cab}<div class="hrow ${x.acao}">
      <span class="htime num">${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      <div class="grow"><div><b>${esc(x.quem)}</b> ${verbo[x.acao]} <span class="tag">${esc(x.aba)}</span> ${esc(x.nome || x.doc_id)}</div>
        ${mud ? `<ul class="hmud">${mud}</ul>` : ""}</div>
      ${x.acao === "apagou" && x.dados ? `<button class="btn" type="button" data-restaurar="${esc(String(x.id))}">Restaurar</button>` : ""}
    </div>`;
  }).join("");
  return `
  <div class="head"><div><h2>Histórico de alterações</h2><p>Quem criou, alterou ou apagou cada coisa no app, e o que mudou. Só você vê esta aba. O que foi apagado pode ser restaurado.</p></div>
    <div class="actions">${DEMO ? "" : `<button class="btn" type="button" data-hist-act="atualizar">Atualizar</button>`}</div></div>
  ${S.histErro ? `<div class="banner"><span>Não foi possível carregar o histórico. ${esc(S.histErro)}</span></div>` : ""}
  <div class="toolbar">
    <label class="search">${ico("search")}<input id="hq" type="search" placeholder="Buscar por nome ou ADM" value="${esc(h.q)}" aria-label="Buscar no histórico"></label>
    <select class="sel" id="hQuem" aria-label="Quem"><option value="">Todos os ADMs</option>${quem.map(q => `<option ${h.quem === q ? "selected" : ""}>${esc(q)}</option>`).join("")}</select>
    <select class="sel" id="hAba" aria-label="Aba"><option value="">Todas as abas</option>${abas.map(q => `<option ${h.aba === q ? "selected" : ""}>${esc(q)}</option>`).join("")}</select>
    <select class="sel" id="hAcao" aria-label="Ação"><option value="">Tudo</option>${["criou", "alterou", "apagou"].map(q => `<option value="${q}" ${h.acao === q ? "selected" : ""}>${q === "criou" ? "Criados" : q === "alterou" ? "Alterados" : "Apagados"}</option>`).join("")}</select>
  </div>
  <div class="hint num">${rows.length} alteração(ões)${rows.length > 400 ? " · mostrando as 400 mais recentes" : ""}</div>
  ${rows.length ? `<section class="panel hist">${itens}</section>` : `<section class="panel"><div class="empty">${S.hist.length ? "Nada com esse filtro." : "Nenhuma alteração registrada ainda. Tudo o que a equipe mudar a partir de agora aparece aqui."}</div></section>`}`;
}

/* ---------- Importar o relatório de inscrições (xlsx/csv da plataforma) sem repetir quem já está ---------- */
let xlsxLib = null;
function carregarXlsx() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return xlsxLib || (xlsxLib = new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = () => ok(window.XLSX); s.onerror = () => { xlsxLib = null; erro(new Error("Não foi possível abrir o leitor de planilhas. Confira a internet.")); };
    document.head.appendChild(s);
  }));
}
const limpaNome = n => { n = String(n || "").replace(/\s+/g, " ").trim(); return n === n.toUpperCase() || n === n.toLowerCase() ? n.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()).replace(/ (Da|De|Do|Das|Dos|E) /g, m => m.toLowerCase()) : n; };
const UF = { "sao paulo": "SP", "minas gerais": "MG", "rio de janeiro": "RJ", "parana": "PR", "goias": "GO", "mato grosso do sul": "MS", "mato grosso": "MT", "santa catarina": "SC", "rio grande do sul": "RS", "bahia": "BA", "distrito federal": "DF", "espirito santo": "ES" };
const vazio = v => v == null || String(v).trim() === "" ;
function lerRelatorio(linhas) {
  const head = (linhas[0] || []).map(norm);
  const col = (...nomes) => { for (const n of nomes) { const i = head.indexOf(norm(n)); if (i >= 0) return i; } return -1; };
  const iNome = col("Nome", "Nomes", "Nome completo");
  if (iNome < 0) throw new Error("Não achei a coluna Nome na primeira linha da planilha.");
  const sts = head.map((h, i) => h === "status" ? i : -1).filter(i => i >= 0);
  const I = { email: col("Email", "E-mail"), tel: col("Telefone", "WhatsApp", "Celular"), ddi: col("DDI"), idade: col("Idade"), cidade: col("Cidade que reside", "Cidade"),
    uf: col("Estado que reside", "Estado"), tipo: col("Top para quem"), ingresso: col("Ingresso"), nasc: col("Data Nascimento"), camisa: col("Tamanho camisa"),
    peso: col("Peso"), altura: col("Altura"), cond: col("Condicionamento físico"), medica: col("Condição médica"), remedio: col("Faz uso de medicamento"),
    alim: col("Tem restrição alimentar"), igreja: col("Igreja que Frequenta"), prof: col("Profissão"), insta: col("Qual seu Instagram"),
    cNome: col("Nome para contato"), cTel: col("Whatsapp para contato"), eNome: col("Nome esposa ou mãe"), eTel: col("Telefone da esposa ou mãe"),
    parente: col("Parente"), sede: col("Sede que faz parte"), numLg: col("Número Legendário"), serviu: col("Você já serviu antes"),
    areasJa: col("Quais áreas já serviu"), areas: col("Quais áreas pretende servir"), hab: col("Habilidades"), temVeic: col("Tem veículo"),
    veic: col("Descrição do veículo"), temEq: col("Tem equipamento ou recurso próprio"), eq: col("Descrição equipamento/recurso"), codigo: col("Código"), cad: col("Data cadastro") };
  const g = (r, i) => i >= 0 && !vazio(r[i]) ? String(r[i]).replace(/\s+/g, " ").trim() : "";
  const out = [];
  linhas.slice(1).forEach(r => {
    const nome = limpaNome(r[iNome]); if (!nome) return;
    const st = sts.map(i => norm(r[i])).join(" ");
    const tipoTxt = norm(g(r, I.tipo) || g(r, I.ingresso));
    const tipo = /legendario/.test(tipoTxt) ? "legendario" : "participante";
    let tel = g(r, I.tel); if (tel && !/^\+/.test(tel) && digits(tel).length <= 11 && g(r, I.ddi)) tel = "+" + g(r, I.ddi) + " " + tel;
    const lg = tipo === "legendario";
    const ficha = {
      nascimento: g(r, I.nasc), camisa: g(r, I.camisa), peso: g(r, I.peso) && g(r, I.peso) + " kg", altura: g(r, I.altura) && g(r, I.altura) + " cm",
      condicionamento: g(r, I.cond), condicaoMedica: g(r, I.medica), medicamento: g(r, I.remedio), restricaoAlimentar: g(r, I.alim),
      igreja: g(r, I.igreja), profissao: g(r, I.prof), instagram: g(r, I.insta), parente: g(r, I.parente),
      contato: lg ? [g(r, I.eNome), g(r, I.eTel)].filter(Boolean).join(" · ") : [g(r, I.cNome), g(r, I.cTel)].filter(Boolean).join(" · "),
      sede: g(r, I.sede), numeroLegendario: g(r, I.numLg), jaServiu: g(r, I.serviu), areasServiu: g(r, I.areasJa), areasPretende: g(r, I.areas), habilidades: g(r, I.hab),
      veiculo: norm(g(r, I.temVeic)) === "sim" ? g(r, I.veic) || "Sim" : "", equipamento: norm(g(r, I.temEq)) === "sim" ? g(r, I.eq) || "Sim" : "",
      ingresso: g(r, I.ingresso), codigo: g(r, I.codigo), cadastro: g(r, I.cad),
    };
    Object.keys(ficha).forEach(k => { if (!ficha[k]) delete ficha[k]; });
    const idade = Number(g(r, I.idade)) || null;
    out.push({ nome, tipo, email: g(r, I.email).toLowerCase(), telefone: tel, idade, cidade: [g(r, I.cidade), UF[norm(g(r, I.uf))] || g(r, I.uf)].filter(Boolean).join(" - "),
      inscricao: /cancel/.test(st) ? "cancelada" : /pendente/.test(st) ? "pendente" : "ativa", ficha });
  });
  return out;
}
function acharNoApp(n) {
  const base = S.P.filter(p => (p.tipo === "legendario") === (n.tipo === "legendario"));
  const nn = norm(n.nome), dt = digits(n.telefone);
  let p = base.find(p => norm(p.nome) === nn); if (p) return { p, por: "nome" };
  if (dt.length >= 10) { p = base.find(p => digits(p.telefone) === dt); if (p) return { p, por: "telefone" }; }
  if (n.email) { p = base.find(p => (p.email || "").toLowerCase() === n.email && norm(p.nome).split(" ")[0] === nn.split(" ")[0]); if (p) return { p, por: "e-mail" }; }
  return null;
}
function analisarImport(lidos) {
  const chave = n => n.tipo + "|" + norm(n.nome);
  // quem cancelou e comprou de novo (às vezes com o nome escrito diferente) vale pela compra ativa
  const ativos = new Set(lidos.filter(n => n.inscricao !== "cancelada").flatMap(n => [chave(n), digits(n.telefone).length >= 10 && n.tipo + "|t" + digits(n.telefone), n.email && n.tipo + "|e" + n.email].filter(Boolean)));
  const ativo = n => ativos.has(chave(n)) || ativos.has(n.tipo + "|t" + digits(n.telefone)) || (n.email && ativos.has(n.tipo + "|e" + n.email));
  const vistos = new Set(), novos = [], ja = [], canc = [];
  lidos.forEach(n => {
    if (n.inscricao === "cancelada") {
      if (ativo(n) || vistos.has("c" + chave(n))) return;
      vistos.add("c" + chave(n));
      const a = acharNoApp(n); canc.push({ n, p: a && a.p }); return;
    }
    if (vistos.has(chave(n))) return; vistos.add(chave(n));
    const a = acharNoApp(n);
    if (a) ja.push({ n, p: a.p, por: a.por }); else novos.push(n);
  });
  return { novos, ja, canc, total: lidos.length };
}
function importForm(tipoAtual) {
  modal(`
    <h3>Importar relatório de inscrições</h3>
    <p class="hint" style="margin:0">Envie a planilha de inscritos da plataforma (.xlsx ou .csv). O app compara com quem já está cadastrado (pelo nome, telefone ou e-mail) e só adiciona quem ainda não está. Inscrições canceladas são ignoradas. O CPF não é importado.</p>
    <div class="field"><label for="f-arq">Planilha</label><input id="f-arq" type="file" accept=".xlsx,.xls,.csv"></div>
    <div id="impPrev" class="imp-prev"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="impBtn" disabled>Importar</button></div></div>`,
  async () => {
    if (!R) return;
    const marcados = new Set([...document.querySelectorAll("[data-imp-novo]:checked")].map(x => Number(x.dataset.impNovo)));
    const novos = R.novos.filter((_, i) => marcados.has(i));
    const completar = $("#impCompletar") && $("#impCompletar").checked;
    const marcarCanc = $("#impCanc") && $("#impCanc").checked;
    closeModal();
    await importarRelatorio(novos, completar ? R.ja : [], marcarCanc ? R.canc.filter(c => c.p && !cancelado(c.p)) : [], R.arquivo);
  });
  let R = null;
  $("#f-arq").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    const prev = $("#impPrev"); prev.innerHTML = `<div class="hint">Lendo ${esc(f.name)}…</div>`; $("#impBtn").disabled = true;
    try {
      const X = await carregarXlsx();
      const wb = X.read(await f.arrayBuffer(), { type: "array" });
      const linhas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" });
      R = analisarImport(lerRelatorio(linhas)); R.arquivo = f.name;
      prev.innerHTML = previewImport(R);
      $("#impBtn").disabled = !R.novos.length && !R.ja.length && !R.canc.some(c => c.p);
      $("#impBtn").textContent = R.novos.length ? `Importar ${R.novos.length} novo(s)` : "Aplicar";
      prev.addEventListener("change", ev => {
        if (ev.target.id === "impTodos") document.querySelectorAll("[data-imp-novo]").forEach(x => { x.checked = ev.target.checked; });
        const n = document.querySelectorAll("[data-imp-novo]:checked").length;
        $("#impBtn").textContent = n ? `Importar ${n} novo(s)` : "Aplicar";
      });
    } catch (err) { console.error(err); R = null; prev.innerHTML = `<div class="warn-text">${esc(err.message || err)}</div>`; }
  });
}
function previewImport(R) {
  const tl = n => n.tipo === "legendario" ? "Legendário" : "Participante";
  const nP = R.novos.filter(n => n.tipo !== "legendario").length, nL = R.novos.length - nP;
  const cancApp = R.canc.filter(c => c.p);
  const tag = n => [n.inscricao === "pendente" ? '<span class="chip wait">Pagamento pendente</span>' : "", n.idade >= 40 ? '<span class="tag">+40</span>' : "", n.ficha.camisa ? `<span class="tag">Camisa ${esc(n.ficha.camisa)}</span>` : ""].join(" ");
  return `
  <div class="imp-kpis">
    <div><b class="num">${R.total}</b><span>linhas lidas</span></div>
    <div class="ok"><b class="num">${R.novos.length}</b><span>novos (${nP} part. · ${nL} LGND)</span></div>
    <div><b class="num">${R.ja.length}</b><span>já estão no app</span></div>
    <div class="bad"><b class="num">${R.canc.length}</b><span>compra cancelada</span></div>
  </div>
  ${R.novos.length ? `<details open><summary><b>Novos para adicionar (${R.novos.length})</b></summary>
    <label class="selall"><input type="checkbox" id="impTodos" checked> Marcar todos</label>
    <ul class="imp-list">${R.novos.map((n, i) => `<li><label><input type="checkbox" data-imp-novo="${i}" checked> <b>${esc(n.nome)}</b> <span class="hint">${tl(n)} · ${esc(n.cidade || "")}${n.idade ? " · " + n.idade + " anos" : ""}</span> ${tag(n)}</label></li>`).join("")}</ul></details>`
  : `<div class="banner"><span>Ninguém novo: todos os inscritos ativos já estão no app.</span></div>`}
  ${R.ja.length ? `<details><summary>Já estão no app (${R.ja.length}): não serão repetidos</summary>
    <ul class="imp-list">${R.ja.map(x => `<li>${esc(x.n.nome)} <span class="hint">${tl(x.n)} · achado pelo ${x.por}</span></li>`).join("")}</ul></details>
    <label class="selall"><input type="checkbox" id="impCompletar"> Completar os dados de quem já está (idade, cidade, camisa, saúde, contato de emergência). Não muda status, ADM nem nada que já esteja preenchido.</label>` : ""}
  ${cancApp.length ? `<details open><summary class="bad-text">Compra cancelada, mas estão no app (${cancApp.length})</summary>
    <ul class="imp-list">${cancApp.map(c => `<li>${esc(c.p.nome)} <span class="hint">${tl(c.n)}</span></li>`).join("")}</ul></details>
    <label class="selall"><input type="checkbox" id="impCanc" checked> Marcar essas pessoas como <b>compra cancelada</b> no app (não apaga ninguém)</label>` : ""}`;
}
async function importarRelatorio(novos, completar, cancelar, arquivo) {
  if (!novos.length && !completar.length && !cancelar.length) { toast("Nada para importar."); return; }
  toast("Importando…");
  const importId = "imp" + Date.now().toString(36);
  let completados = 0, erro = false;
  await new Promise(ok => withAdm(stamp => save(async () => {
    const fila = [
      ...novos.map(n => () => api.add("pessoas", { nome: n.nome, email: n.email, telefone: n.telefone, cidade: n.cidade, idade: n.idade, tipo: n.tipo,
        mais40: (n.idade || 0) >= 40, atestado: "pendente", termo: "pendente", dataAtestado: "", obs: "", ficha: n.ficha, inscricao: n.inscricao,
        ...(n.tipo === "legendario" ? { equipe: "" } : { nfc: false, msgGrupo: false, noGrupo: false, familia: null }),
        ...stamp, exemplo: false, origem: "relatorio", importId, criadoEm: new Date().toISOString() })),
      ...completar.map(({ n, p }) => () => {
        const d = {};
        ["email", "telefone", "cidade", "idade"].forEach(k => { if (vazio(p[k]) && !vazio(n[k])) d[k] = n[k]; });
        if (n.idade >= 40 && !p.mais40) d.mais40 = true;
        const ficha = { ...n.ficha, ...(p.ficha || {}) };
        if (JSON.stringify(ficha) !== JSON.stringify(p.ficha || {})) d.ficha = ficha;
        if (n.inscricao === "pendente" && !p.inscricao) d.inscricao = "pendente";
        if (Object.keys(d).length) { completados++; return api.update("pessoas", p.id, d); }
        return null;
      }),
      ...cancelar.map(({ p }) => () => api.update("pessoas", p.id, { inscricao: "cancelada" })),
    ];
    try { for (let i = 0; i < fila.length; i += 8) await Promise.all(fila.slice(i, i + 8).map(f => f())); }
    catch (e) { erro = true; throw e; }
  }, [novos.length && `${novos.length} adicionado(s)`, completar.length && "dados completados", cancelar.length && `${cancelar.length} marcado(s) como cancelado`].filter(Boolean).join(" · ")).then(ok)));
  if (erro) return;
  render();
  // aviso para a equipe: os outros ADMs veem o resumo na tela assim que a importação termina
  const lg = n => n.tipo === "legendario";
  const aviso = { id: importId, em: new Date().toISOString(), por: ME.adm || "", porId: ME.id || "", arquivo: arquivo || "", top: curTopId(),
    novosP: novos.filter(n => !lg(n)).length, novosL: novos.filter(lg).length,
    mais40: novos.filter(n => (n.idade || 0) >= 40).length, pagPend: novos.filter(n => n.inscricao === "pendente").length,
    saude: novos.filter(n => saudeAlerta(n)).length, completados, cancelados: cancelar.length,
    totalP: S.P.filter(p => !lg(p) && !cancelado(p)).length, totalL: S.P.filter(p => lg(p) && !cancelado(p)).length };
  if (!DEMO) store.set("adm3-aviso-visto", importId);   // quem importou já sabe o resultado
  try { await api.set("config", "aviso", aviso); } catch (e) { console.error(e); }
}

/* ---------- Aviso de planilha nova para a equipe ---------- */
const avisoVisivel = () => { const a = S.aviso; return !!(a && ME.acesso && a.top === curTopId() && store.get("adm3-aviso-visto") !== a.id
  && (DEMO || a.porId !== ME.id) && ["participantes", "legendarios"].some(v => canSee({ id: v }))); };
function checarAviso() {
  if (!avisoVisivel()) return;
  notificarAviso(S.aviso);
  if ($("#modalRoot").innerHTML) return;   // tem outra janela aberta: fica a faixa no alto da tela
  avisoModal();
}
// notificação do celular/computador (aparece mesmo com o app em segundo plano, se a pessoa permitiu)
function notificarAviso(a) {
  if (store.get("adm3-aviso-notif") === a.id) return;
  store.set("adm3-aviso-notif", a.id);
  try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch {}
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const corpo = `${a.novosP} novo(s) participante(s) e ${a.novosL} legendário(s)${a.pagPend ? ` · ${a.pagPend} com pagamento pendente` : ""}. Importado por ${a.por || "um ADM"}.`;
  const op = { body: corpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "adm3-" + a.id };
  (navigator.serviceWorker && navigator.serviceWorker.ready ? navigator.serviceWorker.ready.then(r => r.showNotification("Planilha atualizada · ADM 3Colinas", op))
    : Promise.reject()).catch(() => { try { new Notification("Planilha atualizada · ADM 3Colinas", op); } catch {} });
}
function pintarNotifBtn() {
  const b = $("#notifBtn"); if (!b) return;
  b.hidden = !("Notification" in window) || Notification.permission !== "default" || !ME.acesso;
}
async function pedirNotificacao() {
  try { const r = await Notification.requestPermission(); toast(r === "granted" ? "Notificações ativadas neste aparelho" : "Notificações não foram permitidas"); }
  catch { toast("Este aparelho não aceita notificações. No iPhone, instale o app na tela inicial primeiro."); }
  pintarNotifBtn();
}

/* Puxar a tela para baixo (celular) atualiza os dados */
async function atualizarTudo() {
  try {
    if (db) await db.recarregar();
    if (S.isOwner && !DEMO) { S.histOk = false; }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
    render(); toast("Atualizado");
  } catch (e) { toast("Não foi possível atualizar. " + erroAmigavel(e)); }
}
(() => {
  const ind = document.createElement("div"); ind.className = "ptr"; ind.setAttribute("aria-hidden", "true");
  ind.innerHTML = `<span class="ptr-ico">↻</span><span class="ptr-txt">Puxe para atualizar</span>`;
  document.body.appendChild(ind);
  let y0 = null, dy = 0, ativo = false;
  const LIM = 80;
  const pode = () => !!ME.acesso && !$("#modalRoot").innerHTML && !$(".app").classList.contains("menu-open") && window.scrollY <= 0;
  document.addEventListener("touchstart", e => { if (ativo || e.touches.length !== 1 || !pode()) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy <= 0 || window.scrollY > 0) { ind.classList.remove("on"); ind.style.transform = ""; return; }
    const d = Math.min(dy * 0.5, 110);
    ind.classList.add("on"); ind.style.transform = `translate(-50%, ${d}px)`;
    ind.querySelector(".ptr-ico").style.transform = `rotate(${d * 3}deg)`;
    ind.querySelector(".ptr-txt").textContent = dy * 0.5 >= LIM ? "Solte para atualizar" : "Puxe para atualizar";
  }, { passive: true });
  document.addEventListener("touchend", async () => {
    if (y0 == null) return; y0 = null;
    if (dy * 0.5 < LIM) { ind.classList.remove("on"); ind.style.transform = ""; return; }
    ativo = true; ind.classList.add("girando"); ind.querySelector(".ptr-txt").textContent = "Atualizando…";
    ind.style.transform = `translate(-50%, ${LIM}px)`;
    await atualizarTudo();
    setTimeout(() => { ind.classList.remove("on", "girando"); ind.style.transform = ""; ativo = false; }, 300);
  });
})();
function marcarAvisoVisto() { if (S.aviso) store.set("adm3-aviso-visto", S.aviso.id); }
function avisoModal() {
  const a = S.aviso; if (!a) return;
  const novos = S.pessoas.filter(p => p.importId === a.id).sort((x, y) => norm(x.nome).localeCompare(norm(y.nome)));
  const n = a.novosP + a.novosL;
  const itens = [
    a.mais40 && `<b>${a.mais40}</b> com 40 anos ou mais`,
    a.pagPend && `<b>${a.pagPend}</b> com pagamento pendente`,
    a.saude && `<b>${a.saude}</b> com condição médica, medicamento ou restrição alimentar`,
    a.completados && `Dados completados de <b>${a.completados}</b> pessoa(s) que já estavam no app`,
    a.cancelados && `<b>${a.cancelados}</b> marcado(s) como compra cancelada`,
    n && `Os novos chegam <b>sem atestado e sem termo</b>: já aparecem em Pendências`,
  ].filter(Boolean);
  modal(`
    ${DEMO && a.porId === ME.id ? `<div class="banner"><span>Demonstração: é assim que os outros ADMs veem quando você importa uma planilha.</span></div>` : ""}
    <h3>Planilha atualizada</h3>
    <p class="hint" style="margin:0"><b>${esc(a.por || "Um ADM")}</b> importou ${a.arquivo ? `<b>${esc(a.arquivo)}</b>` : "o relatório de inscrições"} · ${esc(quando(a.em))}</p>
    <div class="imp-kpis">
      <div class="ok"><b class="num">${a.novosP}</b><span>novo(s) participante(s)</span></div>
      <div class="ok"><b class="num">${a.novosL}</b><span>novo(s) legendário(s)</span></div>
      <div><b class="num">${a.totalP}</b><span>participantes no TOP</span></div>
      <div><b class="num">${a.totalL}</b><span>legendários no TOP</span></div>
    </div>
    ${itens.length ? `<ul class="aviso-list">${itens.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
    ${novos.length ? `<details ${novos.length <= 8 ? "open" : ""}><summary><b>Quem entrou (${novos.length})</b></summary><ul class="imp-list">${novos.map(p => `<li>${esc(p.nome)} <span class="hint">${p.tipo === "legendario" ? "Legendário" : "Participante"}${p.cidade ? " · " + esc(p.cidade) : ""}</span></li>`).join("")}</ul></details>` : ""}
    <div class="modal-foot"><div><button class="btn ghost" type="button" data-aviso="ok">Entendi</button></div>
      <div class="actions">${n ? `<button class="btn" type="button" data-aviso="pend">Ver pendências</button><button class="btn primary" type="button" data-aviso="novos">Ver os novos</button>` : ""}</div></div>`, () => {});
}
function fichaHtml(p) {
  const f = p.ficha; if (!f || !Object.keys(f).length) return "";
  const L = [["camisa", "Camisa"], ["nascimento", "Nascimento"], ["peso", "Peso"], ["altura", "Altura"], ["condicionamento", "Condicionamento (1 a 5)"],
    ["condicaoMedica", "Condição médica"], ["medicamento", "Medicamento"], ["restricaoAlimentar", "Restrição alimentar"], ["contato", "Contato de emergência"],
    ["parente", "Parente no TOP"], ["igreja", "Igreja"], ["profissao", "Profissão"], ["instagram", "Instagram"], ["sede", "Sede"], ["numeroLegendario", "Nº Legendário"],
    ["jaServiu", "Já serviu"], ["areasServiu", "Áreas que já serviu"], ["areasPretende", "Quer servir em"], ["habilidades", "Habilidades"], ["veiculo", "Veículo"],
    ["equipamento", "Equipamento"], ["ingresso", "Ingresso"], ["codigo", "Código"], ["cadastro", "Inscrito em"]];
  return `<div class="field full"><span class="lab">Dados da inscrição</span><dl class="ficha">${L.filter(([k]) => f[k]).map(([k, l]) => `<dt>${l}</dt><dd>${esc(f[k])}</dd>`).join("")}</dl></div>`;
}
const saudeAlerta = p => { const f = p.ficha || {}; return [f.condicaoMedica, f.medicamento, f.restricaoAlimentar].some(v => v && !/^n[aã]o\b/i.test(v)); };

/* ---------- Abertura: trilha de luz subindo a crista até o cume enquanto o app carrega ----------
   Aparece depois do login (ou na hora, para quem já está logado). */
let splashStart = 0, splashDone = true;
function showSplash() {
  if (!splashDone) return;
  splashDone = false; splashStart = Date.now();
  $("#splash").classList.remove("out");
  setTimeout(() => { if (!splashDone && !precisaLogin()) hideSplash(); }, 9000);
}
function hideSplash() {
  if (splashDone) return; splashDone = true;
  setTimeout(() => {
    $("#splash").classList.add("out");
    if (precisaLogin()) setTimeout(() => { if (precisaLogin() && !$(".login")) loginForm(); }, 350);
  }, Math.max(0, 2800 - (Date.now() - splashStart)));
}

/* ---------- Dados ---------- */
render();
// assina as coleções depois do login (o banco só entrega o que a pessoa pode ver)
function conectarDados() {
  db = ADM_DADOS.criarBanco(DEMO ? ADM_DADOS.fonteMemoria(ADM_DEMO.docs)
    : ADM_DADOS.fonteSupabase(sb, st => { S.online = st === "SUBSCRIBED" ? true : st === "CHANNEL_ERROR" || st === "TIMED_OUT" ? false : S.online; renderNav(); }));
  if (DEMO) S.online = "demo";
  const sub = col => db.collection(col).onSnapshot(snap => {
    S[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    S.loaded[col] = true; render();
    if (S.loaded.pessoas && S.loaded.tops) hideSplash();
  }, e => { console.error(e); toast("Não foi possível carregar os dados. " + erroAmigavel(e)); hideSplash(); });
  ["pessoas", "tarefas", "estoque", "pista", "tops"].forEach(sub);
  db.doc("config/geral").onSnapshot(snap => { if (snap.exists && !pending.has("kits")) { S.config = { ...S.config, ...snap.data() }; render(); } });
  db.doc("config/aviso").onSnapshot(snap => { S.aviso = snap.exists ? snap.data() : null; render(); setTimeout(checarAviso, 400); });
  render();
  if (DEMO) return;
  markSeen(true);
  if (S.isOwner) membros.listar().catch(() => {});
  // quem está com o app aberto + mudanças no meu próprio acesso (bloqueio, abas) e, para o dono, na equipe
  canal = sb.channel("adm-online", { config: { presence: { key: ME.id } } });
  canal.on("presence", { event: "sync" }, () => {
    S.peers = Object.values(canal.presenceState()).map(l => l[0]);
    renderNav(); if (S.view === "usuarios") render();
  });
  canal.on("postgres_changes", { event: "*", schema: "public", table: "adm_membros" }, async () => {
    if (S.isOwner) membros.listar().catch(() => {});
    const r = await sb.rpc("adm_vincular");
    const p = r.data;
    if (!r.error && (!p || p.inativo)) { await sb.auth.signOut(); location.reload(); return; }
    if (p && !p.inativo) {
      const antes = JSON.stringify(ME.acesso); aplicarPerfil(p);
      if (JSON.stringify(ME.acesso) !== antes) { db.recarregar(); toast("Seu acesso foi atualizado pelo coordenador."); }
      render();
    }
  });
  if (S.isOwner) canal.on("postgres_changes", { event: "INSERT", schema: "public", table: "adm_historico" }, p => {
    if (!S.hist.some(x => x.id === p.new.id)) S.hist.unshift(p.new);
    if (S.view === "historico") render();
  });
  canal.subscribe(st => { if (st === "SUBSCRIBED") sharePresence(); });
  setInterval(() => markSeen(), 60 * 1000);
}
if (DEMO) {
  S.equipe = ADM_DEMO.membros.map(m => ({ ...m }));
  loginForm();
} else {
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === "PASSWORD_RECOVERY") { authMode = "newpass"; if (splashDone) loginForm(); return; }
    if (ev === "SIGNED_IN" && session && !sessaoOk && authMode !== "newpass") setTimeout(() => iniciarSessao().catch(e => loginForm(erroAmigavel(e), true)), 0);
  });
  if (/type=recovery/.test(location.hash)) authMode = "newpass";
  // quem já tem sessão salva vê a abertura; os outros vão direto para o login
  let temSessao = false;
  try { temSessao = Object.keys(localStorage).some(k => /^sb-.+-auth-token$/.test(k)); } catch (e) {}
  if (temSessao && authMode !== "newpass") showSplash(); else loginForm();
  sb.auth.getSession().then(async ({ data }) => {
    if (data.session && authMode !== "newpass") { try { await iniciarSessao(); } catch (e) { loginForm(erroAmigavel(e), true); } }
    if (!sessaoOk) hideSplash();
  }).catch(() => hideSplash());
}
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
