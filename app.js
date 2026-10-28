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
const CP1252 = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";   // bytes 0x80–0x9F lidos como Windows-1252
const consertaAcento = v => {
  if (typeof v !== "string" || !/[ÃÂ][\u0080-\u00ff]|Ã/.test(v)) return v;
  try { const b = Uint8Array.from([...v].map(c => { const k = c.charCodeAt(0); if (k <= 255) return k; const w = CP1252.indexOf(c); if (w < 0) throw 0; return 0x80 + w; })); return new TextDecoder("utf-8", { fatal: true }).decode(b); } catch (e) { return v; }
};
const norm = s => String(consertaAcento(s) || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
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
  { v: "apto", l: "Apto", c: "ok" },   // equipe médica liberou (planilha de avaliações: Status Avaliação = Apto)
];
const atOk = p => p.atestado === "confirmado" || p.atestado === "apto";
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
const EQUIPES = ["ADM", "Logística", "Mídia", "Segurança", "Voz", "Hakunas", "Intercessão", "Eventos", "Produção", "Base", "Coordenação"];
// nome da equipe da planilha → nome usado no app ("Hakuna" → "Hakunas"); equipe nova entra como veio
const equipeCanon = x => { const k = norm(x); if (!k) return ""; return EQUIPES.find(e => norm(e) === k || norm(e).startsWith(k) || k.startsWith(norm(e))) || String(x).trim(); };
const equipesUsadas = () => [...new Set([...EQUIPES, ...S.P.filter(p => p.tipo === "legendario" && p.equipe).map(p => p.equipe)])];
const FUNC_ORDEM = f => /^chefe/i.test(f || "") ? 0 : /^sub/i.test(f || "") ? 1 : f ? 2 : 3;
const equipeTxt = p => p.equipe ? p.equipe + (p.funcao ? " · " + p.funcao : "") : "";
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
  cfgDocs: {}, cronoDia: store.get("crono-dia"), cronoAdm: store.get("crono-adm"),
  P: [], T: [], topSel: null, equipe: [], peers: [], isOwner: false,
  loaded: { pessoas: false, tarefas: false, estoque: false, pista: false, tops: false },
  f: { q: "", tipo: "participante", status: "todos", adm: "" },
  sel: { on: false, tipo: "", ids: new Set() },   // seleção para apagar em massa (só o dono)
  pf: { quem: "participante", oque: "qualquer", adm: "", aba: store.get("pend-aba") || "doc" },   // filtros de Pendências (aba: doc | pag)
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
  { id: "notificacoes", l: "Notificações", i: "bell", all: true },   // todos que entram no app
  { id: "participantes", l: "Senderistas", i: "users" },
  { id: "legendarios", l: "Legendários", i: "shield" },
  { id: "equipes", l: "Equipes LGND", i: "group", need: ["legendarios"] },
  { id: "pendencias", l: "Pendências", i: "bell", need: ["participantes", "legendarios"] },
  { id: "familias", l: "Famílias", i: "fam" },
  { id: "cronograma", l: "Cronograma", i: "clock" },
  { id: "aovivo", l: "Ao vivo", i: "flag", need: ["cronograma"] },   // painel para TV/celular
  { id: "consagracao", l: "Consagração", i: "group" },
  { id: "pins", l: "Pins", i: "check" },
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
const ABAS = () => VIEWS.filter(v => !v.owner && !v.need && !v.all && v.id !== "painel" && (!v.demo || DEMO));
const precisaLogin = () => !ME.acesso;
const canSee = v => {
  if (!ME.acesso) return v.id === "painel";
  if ((VIEWS.find(x => x.id === v.id) || v).demo && !DEMO) return false;
  if (S.isOwner || (VIEWS.find(x => x.id === v.id) || v).all) return true;
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
  if (v === "notificacoes") { S.notifAntes = S.notifLido || 0; marcarNotifs(); } else S.notifAntes = null;
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
  const parts = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)).length;
  const lg = S.P.filter(p => p.tipo === "legendario" && !cancelado(p)).length;
  const counts = { participantes: parts, legendarios: lg };
  if (!canSee(VIEWS.find(v => v.id === S.view) || {})) S.view = "painel";
  const online = onlineAdms().length;
  counts.usuarios = online ? `${online} on` : null;
  const novas = ME.acesso ? notifNovas() : 0;
  $("#nav").innerHTML = VIEWS.filter(v => canSee(v) && !v.all).map(v => `<button type="button" data-go="${v.id}" ${S.view === v.id ? 'aria-current="page"' : ""}>${ico(v.i)}<span>${v.l}</span>${v.id === "notificacoes" ? (novas ? `<span class="badge num">${novas}</span>` : "") : counts[v.id] != null ? `<span class="count num">${counts[v.id]}</span>` : ""}</button>`).join("");
  const sb = $("#saudeBtn"); if (sb) sb.hidden = !(NOVO() && ME.acesso && (canSee({ id: "participantes" }) || canSee({ id: "legendarios" })));
  const sino = $("#bellBtn");
  if (sino) { sino.hidden = !ME.acesso; sino.querySelector(".badge").hidden = !novas; sino.querySelector(".badge").textContent = novas > 99 ? "99+" : novas;
    sino.setAttribute("aria-label", novas ? `Notificações: ${novas} nova(s)` : "Notificações"); }
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
  const F = S.fila || {}, semNet = F.offline || navigator.onLine === false;
  sync.lastElementChild.textContent = F.pendentes ? `${semNet ? "Sem internet" : "Enviando"} · ${F.pendentes} alteração(ões) para enviar`
    : semNet ? "Sem internet: usando os dados guardados" : S.online === "demo" ? "Demonstração (não salva)" : S.online === true ? "Sincronizado com a equipe" : S.online === false ? "Sem conexão: tentando de novo" : "Conectando…";
  if (semNet || F.pendentes) sync.className = "sync off";
  pintarRede();
}
/* Selo de modo offline: aparece em qualquer tela enquanto estiver sem internet ou com alterações para enviar */
function pintarRede() {
  const F = S.fila || {}, semNet = (F.offline || navigator.onLine === false) && !!ME.acesso;
  let el = $("#netPill");
  if (!semNet && !F.pendentes) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("button"); el.id = "netPill"; el.type = "button"; el.className = "netpill"; el.dataset.act = "rede"; document.body.appendChild(el); }
  el.classList.toggle("enviando", !semNet);
  el.innerHTML = `<i></i><span>${semNet ? "Offline" : "Enviando…"}${F.pendentes ? ` · <b class="num">${F.pendentes}</b> para enviar` : ""}</span>`;
}
function redeInfo() {
  const F = S.fila || {}, semNet = F.offline || navigator.onLine === false;
  modal(`
    <h3>${semNet ? "Você está sem internet" : "Enviando alterações"}</h3>
    <p class="hint" style="margin:0">O app continua funcionando com os dados guardados neste aparelho${S.cacheEm ? ` (atualizados ${esc(quando(S.cacheEm))})` : ""}. Tudo o que você alterar fica guardado aqui e é enviado sozinho para a equipe quando a internet voltar.</p>
    <div class="imp-kpis"><div><b class="num">${F.pendentes || 0}</b><span>alteração(ões) esperando envio</span></div></div>
    <p class="hint" style="margin:0">Não saia da conta nem limpe os dados do navegador antes de enviar. Se duas pessoas mudarem o mesmo campo, vale a última que chegar. O que a equipe mudou enquanto você estava offline aparece quando a internet voltar.</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button><button class="btn primary" type="submit">Tentar enviar agora</button></div></div>`,
  () => { closeModal(); if (db) db.recarregar().catch(() => {}).finally(renderNav); });
}

/* ---------- Métricas ---------- */
function stats() {
  const all = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p));   // compra cancelada não conta (igual à plataforma)
  const dup = all.filter(p => repetidos().has(p.id)).length;
  const n = all.length;
  const lg = S.P.filter(p => p.tipo === "legendario" && !cancelado(p));
  const t = S.T; const done = t.filter(x => x.status === "pronto").length;
  const low = S.estoque.filter(e => e.grupo !== "equip" && typeof e.qtd === "number" && e.qtd > 0 && e.qtd <= S.config.alertaBaixo);
  const zero = S.estoque.filter(e => e.grupo !== "equip" && e.qtd === 0);
  const conferir = S.estoque.filter(e => e.grupo === "equip" && e.conferir);
  const pistaM = S.pista.reduce((s, d) => s + (d.trechos || []).reduce((a, x) => a + (Number(x.m) || 0), 0), 0);
  return {
    n, dup, all,
    atestado: all.filter(p => atOk(p)).length,
    termo: all.filter(p => p.termo === "assinado").length,
    nfc: all.filter(p => p.nfc).length,
    msg: all.filter(p => p.msgGrupo).length,
    grupo: all.filter(p => p.noGrupo).length,
    mais40: all.filter(is40),
    mais40ok: all.filter(p => is40(p) && atOk(p)).length,
    semFamilia: all.filter(p => !p.familia).length,
    lg, lgAssinado: lg.filter(p => p.termo === "assinado").length, lgAtest: lg.filter(p => atOk(p)).length,
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
    <section class="panel"><h3>Camisas dos senderistas <small>${ps.length} com tamanho informado</small></h3>
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
function painelPronto() {
  const P = S.P.filter(p => !cancelado(p)), sen = P.filter(p => p.tipo !== "legendario"), lg = P.filter(p => p.tipo === "legendario");
  const ok = a => a.filter(prontoTop).length, falta = P.filter(p => !prontoTop(p)).sort((a, b) => faltaTop(b).length - faltaTop(a).length || norm(a.nome).localeCompare(norm(b.nome)));
  const porItem = k => P.filter(p => faltaTop(p).includes(k)).length;
  const linha = p => { const url = waCobrar(p);
    return `<div class="li"><span class="grow"><b>${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}</span><br>${faltaTop(p).map(k => `<span class="chip ${k === "apto" && atOk(p) ? "wait" : "bad"}">${k === "apto" ? (atOk(p) ? "Atestado: aguardando equipe médica" : "Falta atestado") : "Falta " + FALTA[k].toLowerCase()}</span>`).join(" ")}</span>
      ${url && pendDe(p).length ? `<a class="wa" href="${url}" target="_blank" rel="noopener" data-cobrar="${p.id}" title="Uma mensagem só com tudo que falta">${ico("wa")} Cobrar tudo</a>` : ""}</div>`; };
  return `<section class="panel pronto-top"><h3>Pronto para o TOP <small>pago, termo assinado e atestado Apto</small></h3>
    <div class="pronto-kpis">
      <div><b class="num ok-text">${ok(sen)}<small> / ${sen.length}</small></b><span>senderistas prontos</span><div class="bar good"><i style="width:${pct(ok(sen), sen.length)}%"></i></div></div>
      <div><b class="num ok-text">${ok(lg)}<small> / ${lg.length}</small></b><span>legendários prontos</span><div class="bar good"><i style="width:${pct(ok(lg), lg.length)}%"></i></div></div>
      <div><b class="num">${falta.length}</b><span>faltam: ${porItem("pagamento")} pagamento · ${porItem("termo")} termo · ${porItem("apto")} atestado Apto</span></div>
    </div>
    ${falta.length ? `<details ${falta.length <= 6 ? "open" : ""}><summary>O que falta para cada um (${falta.length})</summary><div class="list">${falta.map(linha).join("")}</div></details>` : `<p class="ok-text" style="margin:0"><b>Todo mundo pronto para o TOP!</b></p>`}
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
  s.all.filter(p => !atOk(p) || p.termo !== "assinado").forEach(p => { const k = p.adm || "Sem ADM"; pendAdm[k] = (pendAdm[k] || 0) + 1; });
  const alerts = [
    ...s.zero.map(e => ({ t: e.item, d: "Zerado · " + (GRUPOS.find(g => g.v === e.grupo) || {}).l, c: "bad", l: "Zerado" })),
    ...s.low.map(e => ({ t: e.item, d: `${e.qtd} un. · ${(GRUPOS.find(g => g.v === e.grupo) || {}).l}`, c: "wait", l: "Baixo" })),
    ...s.conferir.map(e => ({ t: e.item, d: "Equipamento", c: "sent", l: "Conferir" })),
  ];
  return `
  ${ME.acesso && ["pedir", "bloqueado", "instalar"].includes(estadoNotif()) ? `<div class="banner aviso"><span>${ico("bell")} <b>Notificações desligadas neste aparelho.</b> Ative para receber os avisos do app no celular.</span><button class="btn primary" type="button" data-act="notif-ajuda">Ativar</button></div>` : ""}
  <section class="hero">
    <img class="hero-logo" src="assets/logo.png" alt="Track 3 Colinas · Franca SP">
    <div class="hero-text">
      <span class="eyebrow">ADM 3Colinas · Legendários</span>
      <h2>${esc(topName())}</h2>
      <p>${esc([(topDoc() || {}).local || "Franca - SP", (topDoc() || {}).inicio ? fmtDate(topDoc().inicio) + ((topDoc() || {}).fim ? " a " + fmtDate(topDoc().fim) : "") : ""].filter(Boolean).join(" · "))} · tudo atualiza na hora em que alguém da equipe mexe.</p>
      <div class="actions"><button class="btn primary" type="button" data-act="novo">${ico("plus")} Novo senderista</button><button class="btn glass" type="button" data-go="tops">${ico("flag")} Todos os Tops</button></div>
    </div>
  </section>

  <div class="kpis">
    <button class="kpi" type="button" data-go="participantes"><span class="lbl">Senderistas</span><span class="val num">${s.n}</span><span class="sub">${s.dup ? `${s.dup} possível(is) repetido(s)` : "sem repetidos"} · ${s.mais40.length} com +40</span></button>
    <div class="kpi"><span class="lbl">Atestados confirmados</span><span class="val num">${s.atestado}<small style="font-size:18px;color:var(--muted)"> / ${s.n}</small></span><div class="bar good"><i style="width:${pct(s.atestado, s.n)}%"></i></div></div>
    <div class="kpi"><span class="lbl">Termos assinados</span><span class="val num">${s.termo}<small style="font-size:18px;color:var(--muted)"> / ${s.n}</small></span><div class="bar good"><i style="width:${pct(s.termo, s.n)}%"></i></div></div>
    <div class="kpi"><span class="lbl">No grupo</span><span class="val num">${s.grupo}</span><span class="sub">${s.n - s.grupo > 0 ? `faltam ${s.n - s.grupo} entrar` : "todos no grupo"}</span></div>
    <button class="kpi" type="button" data-go="checklist"><span class="lbl">Checklist ADM</span><span class="val num">${pct(s.tDone, s.tTotal)}%</span><span class="sub">${s.tDone} de ${s.tTotal} tarefas prontas</span></button>
    <button class="kpi ${kits < meta ? "alert" : ""}" type="button" data-go="estoque"><span class="lbl">Kits MRE lacrados</span><span class="val num">${kits}</span><span class="sub">meta ${meta} · faltam ${Math.max(0, meta - kits)}</span></button>
    <button class="kpi ${s.zero.length ? "alert" : ""}" type="button" data-go="estoque"><span class="lbl">Estoque em alerta</span><span class="val num">${s.zero.length + s.low.length}</span><span class="sub">${s.zero.length} zerados · ${s.low.length} baixos (até ${S.config.alertaBaixo})</span></button>
    ${canSee({ id: "pins" }) && pinsTodos().length ? (() => { const P = pinsTodos(), e = P.filter(p => p.status === "entregue").length;
      return `<button class="kpi" type="button" data-go="pins" data-pin-ir="entregue"><span class="lbl">Pins entregues</span><span class="val num">${e}<small style="font-size:18px;color:var(--muted)"> / ${P.length}</small></span><div class="bar good"><i style="width:${pct(e, P.length)}%"></i></div></button>
    <button class="kpi ${P.length - e ? "alert" : ""}" type="button" data-go="pins" data-pin-ir="pendente"><span class="lbl">Pins pendentes</span><span class="val num">${P.length - e}</span><span class="sub">bonés ainda sem pin</span></button>`; })() : ""}
    <button class="kpi" type="button" data-go="legendarios"><span class="lbl">Legendários</span><span class="val num">${s.lg.length}</span><span class="sub">${s.lgAtest} atestados · ${s.lgAssinado} termos</span></button>
  </div>
  ${NOVO() ? painelPronto() : ""}
  <div class="grid2">
    <section class="panel"><h3>Documentos e grupo <small>de ${s.n} senderistas</small></h3>
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
    .filter(p => status === "canc" ? cancelado(p) : !cancelado(p))
    .filter(p => {
      switch (status) {
        case "atestado": return !atOk(p);
        case "termo": return p.termo !== "assinado";
        case "grupo": return !p.noGrupo;
        case "40": return is40(p);
        case "ok": return atOk(p) && p.termo === "assinado";
        case "novos": return !!S.aviso && p.importId === S.aviso.id;
        case "rep": return repetidos().has(p.id);
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
    <p class="hint" style="margin:0"><b>${esc(p.nome)}</b> · ${p.tipo === "legendario" ? "Legendário" : "Senderista"}${p.obsPor ? ` · última por ${esc(p.obsPor)}${p.obsEm ? " " + esc(quando(p.obsEm)) : ""}` : ""}</p>
    <div class="field"><label for="f-obsq">Anotação para a equipe ADM</label><textarea id="f-obsq" name="obs" style="min-height:140px" placeholder="Ex.: vai mandar o atestado na sexta · pediu para ficar na família do irmão · chega de carona">${esc(p.obs || "")}</textarea></div>
    <div class="modal-foot"><div>${p.obs ? `<button class="btn danger" type="button" id="obsLimpar">Apagar observação</button>` : ""}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const obs = String(fd.get("obs") || "").trim(); closeModal();
    if (obs === (p.obs || "")) return;
    touch(p.id, { obs, obsPor: obs ? ME.adm || "" : "", obsEm: obs ? new Date().toISOString() : "" }, obs ? "Observação salva" : "Observação apagada"); });
  const l = $("#obsLimpar"); if (l) l.onclick = () => { closeModal(); touch(p.id, { obs: "", obsPor: "", obsEm: "" }, "Observação apagada"); };
  const ta = $("#f-obsq"); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
}
const tagsInscricao = p => (NOVO() && prontoTop(p) ? ' <span class="chip ok">✓ Pronto p/ o TOP</span>' : "") + (S.aviso && p.importId === S.aviso.id ? ' <span class="chip ok">Novo</span>' : "") + (cancelado(p) ? ' <span class="chip bad">Compra cancelada</span>' : p.inscricao === "pendente" ? ' <span class="chip wait">Pagamento pendente</span>' : "")
  + (saudeAlerta(p) ? ' <span class="tag saude" title="Tem condição médica, medicamento ou restrição alimentar">Saúde</span>' : "");
/* Possíveis repetidos: mesmo nome, telefone ou e-mail dentro do TOP (inclusive entre senderistas e legendários). */
let repCache = { P: null, m: null };
function repetidos() {
  if (repCache.P === S.P) return repCache.m;
  const tel = p => { const d = digits(p.telefone); return d.length >= 10 ? d.slice(-10) : ""; };
  const grupos = new Map();
  const add = (k, p, por) => { if (!k) return; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push({ p, por }); };
  S.P.forEach(p => { add("n" + norm(p.nome), p, "nome"); add(tel(p) && "t" + tel(p), p, "telefone"); add(p.email && "e" + p.email.toLowerCase().trim(), p, "e-mail"); });
  const m = new Map();
  grupos.forEach(g => {
    if (g.length < 2) return;
    g.forEach(({ p, por }) => g.forEach(({ p: o }) => {
      if (o.id === p.id || (p.dupOk || []).includes(o.id) || (o.dupOk || []).includes(p.id)) return;
      if (!m.has(p.id)) m.set(p.id, new Map());
      const x = m.get(p.id); x.set(o.id, [...new Set([...(x.get(o.id) || []), por])]);
    }));
  });
  repCache = { P: S.P, m };
  return m;
}
const tipoNome = p => p.tipo === "legendario" ? "Legendário" : "Senderista";
const tagRep = p => repetidos().has(p.id) ? ` <button type="button" class="chip bad" data-dup="${p.id}" title="Pode estar cadastrado duas vezes. Toque para ver">Repetido?</button>` : "";
function dupForm(p) {
  const x = repetidos().get(p.id); if (!x) return;
  const outros = [...x].map(([id, por]) => ({ o: S.P.find(q => q.id === id), por })).filter(y => y.o);
  modal(`
    <h3>Possível repetido</h3>
    <p class="hint" style="margin:0"><b>${esc(p.nome)}</b> (${tipoNome(p)}) tem o mesmo dado de:</p>
    <ul class="imp-list">${outros.map(({ o, por }) => `<li><b>${esc(o.nome)}</b> <span class="hint">${tipoNome(o)} · mesmo ${por.join(" e ")} · ${esc([o.telefone, o.email].filter(Boolean).join(" · ") || "sem contato")}</span>
      <button class="linkbtn" type="button" data-edit="${o.id}" aria-label="Editar ${esc(o.nome)}">${ico("edit")}</button></li>`).join("")}</ul>
    <p class="hint" style="margin:0">Se for a mesma pessoa, apague um dos cadastros (abra pelo lápis). Se forem pessoas diferentes (por exemplo, pai e filho com o mesmo telefone), marque abaixo e o aviso some.</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button>${podeEditar() ? `<button class="btn primary" type="submit">Não é a mesma pessoa</button>` : ""}</div></div>`,
  () => { closeModal(); const ids = outros.map(y => y.o.id);
    withAdm(() => save(() => api.update("pessoas", p.id, { dupOk: [...new Set([...(p.dupOk || []), ...ids])] }), "Aviso de repetido removido")); });
}
function vPessoas(tipo) {
  const lg = tipo === "legendario";
  const rows = filterPeople();
  const doTipo = S.P.filter(p => lg ? p.tipo === "legendario" : p.tipo !== "legendario");
  const total = doTipo.filter(p => !cancelado(p)).length, nCanc = doTipo.length - total;
  const quebrados = doTipo.filter(p => ["nome", "cidade"].some(k => consertaAcento(p[k]) !== p[k])), nQuebr = quebrados.length;
  const nLix = lixeira().filter(x => (x.data.tipo === "legendario") === lg && (x.data.top || atualId()) === curTopId()).length;
  const exemplos = S.P.some(p => p.exemplo);
  const fil = lg
    ? [["todos", "Todos"], ["atestado", "Sem atestado"], ["termo", "Sem termo"], ["ok", "Tudo OK"]]
    : [["todos", "Todos"], ["atestado", "Sem atestado"], ["termo", "Sem termo"], ["grupo", "Fora do grupo"], ["40", "+40"], ["ok", "Tudo OK"]];
  if (S.aviso && S.P.some(p => p.importId === S.aviso.id && (lg ? p.tipo === "legendario" : p.tipo !== "legendario"))) fil.push(["novos", "Novos da última planilha"]);
  const nRep = S.P.filter(p => (lg ? p.tipo === "legendario" : p.tipo !== "legendario") && repetidos().has(p.id)).length;
  if (nRep || S.f.status === "rep") fil.push(["rep", `Repetidos (${nRep})`]);
  if (nCanc || S.f.status === "canc") fil.push(["canc", `Compra cancelada (${nCanc})`]);
  const tick = (p, k, i, t) => `<button type="button" class="tick ${p[k] ? "on" : ""}" data-tog="${k}" data-id="${p.id}" title="${t}" aria-label="${t}: ${p[k] ? "sim" : "não"}" aria-pressed="${!!p[k]}">${ico(i)}</button>`;
  const ticks = p => lg ? "" : `<div class="ticks">${tick(p, "msgGrupo", "chat", "Mensagem do grupo enviada")}${tick(p, "noGrupo", "group", "Entrou no grupo")}${tick(p, "nfc", "nfc", "NFC registrado")}</div>`;
  const cyc = (list, k, p) => chip(list, p[k], `data-cyc="${k}" data-id="${p.id}" title="Clique para avançar o status"`);
  const sel = S.isOwner && S.sel.on && S.sel.tipo === tipo;
  if (!sel) S.sel.ids.clear();
  const visiveis = new Set(rows.map(p => p.id));
  S.sel.ids.forEach(id => { if (!visiveis.has(id)) S.sel.ids.delete(id); });
  const nSel = S.sel.ids.size, todos = rows.length > 0 && nSel === rows.length;
  const caixa = p => sel ? `<input type="checkbox" class="selbox" data-sel="${p.id}" ${S.sel.ids.has(p.id) ? "checked" : ""} aria-label="Selecionar ${esc(p.nome)}">` : "";
  const nomeTipo = lg ? "legendários" : "senderistas";
  const atest = p => `${cyc(ATESTADO, "atestado", p)}${p.dataAtestado && !atOk(p) ? `<div class="hint" style="font-size:12px;margin-top:3px">${esc(p.dataAtestado)}</div>` : ""}`;
  return `
  <div class="head"><div><h2>${lg ? "Legendários" : "Senderistas"}</h2><p>${lg ? "Servos do TOP: equipe, atestado e termo LGND." : "Cadastro, atestado, termo, grupo e NFC de cada senderista."} Toque no status para avançar. Quem mexer por último vira o ADM responsável.</p></div>
    <div class="actions">
      ${S.isOwner && total ? `<button class="btn ${sel ? "primary" : ""}" type="button" data-act="selecionar" aria-pressed="${sel}">${ico("check")} ${sel ? "Concluir seleção" : "Selecionar"}</button>` : ""}
      <button class="btn" type="button" data-act="importar">${ico("upload")} Importar relatório</button>
      <button class="btn" type="button" data-act="colar">${ico("paste")} Colar lista</button>
      ${nLix ? `<button class="btn" type="button" data-act="lixeira">${ico("trash")} Excluídos (${nLix})</button>` : ""}
      <button class="btn primary" type="button" data-act="novo">${ico("plus")} ${lg ? "Novo legendário" : "Novo senderista"}</button>
    </div></div>
  ${podeEditar() && nQuebr ? `<div class="banner"><span><b>${nQuebr}</b> ${nQuebr > 1 ? "nomes estão" : "nome está"} com acento quebrado (ex.: ${esc(quebrados[0].nome)}).</span><button class="btn" type="button" data-act="conserta-acento">Corrigir</button></div>` : ""}
  ${nRep && S.f.status !== "rep" ? `<div class="banner"><span><b>${nRep}</b> ${nRep > 1 ? "cadastros parecem repetidos" : "cadastro parece repetido"} (mesmo nome, telefone ou e-mail).</span><button class="btn" type="button" data-fil="rep">Ver repetidos</button></div>` : ""}
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
  <div class="hint num">${S.f.status === "canc" ? `${rows.length} com compra cancelada (não entram na conta)` : `${rows.length} de ${total} ${lg ? "legendários" : "senderistas"}${nCanc ? ` · ${nCanc} com compra cancelada fora da conta` : ""}`}</div>
  ${rows.length ? `
  <div class="table-wrap people"><table>
    <thead><tr>${sel ? `<th style="width:36px"><input type="checkbox" class="selbox" data-selall="1" ${todos ? "checked" : ""} aria-label="Selecionar todos"></th>` : ""}<th>Nome</th><th>WhatsApp</th>${lg ? "<th>Equipe</th>" : ""}<th>Atestado</th><th>Termo</th>${lg ? "" : "<th>Grupo · NFC</th><th>Família</th>"}<th>Responsável</th><th></th></tr></thead>
    <tbody>${rows.map(p => `<tr class="${S.sel.ids.has(p.id) ? "picked" : ""}">
      ${sel ? `<td>${caixa(p)}</td>` : ""}
      <td><div class="pname">${esc(p.nome)} ${p.exemplo ? '<span class="tag acc">exemplo</span>' : ""} ${!lg && is40(p) ? '<span class="tag">+40</span>' : ""}${tagsInscricao(p)}${tagRep(p)}<small>${esc([p.cidade, p.email].filter(Boolean).join(" · ") || "—")}</small></div>${obsLinha(p)}</td>
      <td class="num" style="white-space:nowrap"><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start">${waBtn(p)}<span class="hint" style="font-size:12px">${esc(p.telefone || "sem telefone")}</span></div></td>
      ${lg ? `<td>${p.equipe ? `${esc(p.equipe)}${p.funcao ? `<div class="hint" style="font-size:12px">${esc(p.funcao)}</div>` : ""}` : "—"}</td>` : ""}
      <td>${atest(p)}</td>
      <td>${cyc(TERMO, "termo", p)}</td>
      ${lg ? "" : `<td>${ticks(p)}</td><td class="num">${p.familia ? "F" + String(p.familia).padStart(2, "0") : "—"}</td>`}
      <td>${respHtml(p)}</td>
      <td style="white-space:nowrap">${obsBtn(p)}<button class="linkbtn" type="button" data-edit="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></td>
    </tr>`).join("")}</tbody></table></div>
  <div class="cards">${rows.map(p => `<article class="pcard ${S.sel.ids.has(p.id) ? "picked" : ""}">
      <div class="top">${caixa(p)}<div class="pname" style="flex:1">${esc(p.nome)} ${p.exemplo ? '<span class="tag acc">exemplo</span>' : ""} ${!lg && is40(p) ? '<span class="tag">+40</span>' : ""}${tagsInscricao(p)}${tagRep(p)}<small class="num">${esc(p.telefone || "")}${lg && p.equipe ? " · " + esc(equipeTxt(p)) : ""}</small></div>
        <div style="display:flex;gap:2px">${obsBtn(p)}<button class="linkbtn" type="button" data-edit="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></div></div>
      ${obsLinha(p)}
      <div class="row"><span class="lbl">Atestado</span>${cyc(ATESTADO, "atestado", p)}<span class="lbl">Termo</span>${cyc(TERMO, "termo", p)}</div>
      <div class="row" style="justify-content:space-between"><div class="row">${ticks(p)}${!lg && p.familia ? `<span class="tag">Família ${String(p.familia).padStart(2, "0")}</span>` : ""}</div>${waBtn(p)}</div>
      ${p.adm ? `<div class="hint" style="font-size:12px">Responsável: <b style="color:var(--fg)">${esc(p.adm)}</b>${p.admEm ? " · " + esc(quando(p.admEm)) : ""}</div>` : ""}
    </article>`).join("")}</div>`
  : `<section class="panel"><div class="empty">${total ? "Nenhum resultado para esse filtro." : `Nenhum ${lg ? "legendário" : "senderista"} cadastrado ainda. Use <b>${lg ? "Novo legendário" : "Novo senderista"}</b> ou <b>Colar lista</b> para trazer os nomes da planilha.`}</div></section>`}`;
}

function vFamilias() {
  const parts = S.P.filter(p => p.tipo !== "legendario");
  const sem = parts.filter(p => !p.familia);
  const fams = Array.from({ length: 12 }, (_, i) => i + 1);
  return `
  <div class="head"><div><h2>Famílias</h2><p>Distribuição dos senderistas nas 12 famílias. Defina a família no cadastro de cada um.</p></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Distribuídos</span><span class="val num">${parts.length - sem.length}</span><span class="sub">de ${parts.length} senderistas</span></div>
    <div class="kpi ${sem.length ? "alert" : ""}"><span class="lbl">Sem família</span><span class="val num">${sem.length}</span><span class="sub">média ideal ${parts.length ? (parts.length / 12).toFixed(1).replace(".", ",") : 0} por família</span></div>
  </div>
  ${sem.length ? `<section class="panel"><h3>Sem família <small>${sem.length}</small></h3><div class="list">${sem.map(p => `<div class="li"><span class="grow">${esc(p.nome)} ${is40(p) ? '<span class="tag">+40</span>' : ""}</span><select class="sel" data-fam="${p.id}" aria-label="Família de ${esc(p.nome)}"><option value="">Escolher…</option>${fams.map(f => `<option value="${f}">Família ${String(f).padStart(2, "0")}</option>`).join("")}</select></div>`).join("")}</div></section>` : ""}
  <div class="fams">${fams.map(f => { const m = parts.filter(p => Number(p.familia) === f); return `
    <section class="fam"><header><b>Família ${String(f).padStart(2, "0")}</b><span class="hint num">${m.length} · ${m.filter(is40).length} +40</span></header>
    ${m.length ? `<ul>${m.map(p => `<li><span>${esc(p.nome)}</span>${atOk(p) && p.termo === "assinado" ? '<span class="chip ok">OK</span>' : '<span class="chip wait">Pend.</span>'}</li>`).join("")}</ul>` : `<div class="empty">Ninguém ainda.</div>`}</section>`; }).join("")}</div>`;
}

/* ---------- Equipes LGND: em qual área cada legendário vai servir (campos equipe e funcao do legendário) ---------- */
function vEquipes() {
  const lgs = S.P.filter(p => p.tipo === "legendario" && !cancelado(p)), ed = podeEditar();
  const sem = lgs.filter(p => !p.equipe);
  const eqs = equipesUsadas().map(e => ({ e, m: lgs.filter(p => p.equipe === e).sort((a, b) => FUNC_ORDEM(a.funcao) - FUNC_ORDEM(b.funcao) || norm(a.nome).localeCompare(norm(b.nome))) }));
  const com = eqs.filter(x => x.m.length), vazias = eqs.filter(x => !x.m.length);
  const pag = p => pagPendente(p) ? ' <span class="chip wait">Pagamento pendente</span>' : "";
  const pess = p => `<li><button class="linkbtn eq-p" type="button" ${ed ? `data-eq-p="${esc(p.id)}"` : "disabled"}><span>${esc(p.nome)}</span>${p.funcao ? ` <span class="chip ${FUNC_ORDEM(p.funcao) < 2 ? "ok" : ""}">${esc(p.funcao)}</span>` : ""}${pag(p)}</button></li>`;
  const nPag = lgs.filter(pagPendente).length;
  return `
  <div class="head"><div><h2>Equipes LGND</h2><p>Em qual área cada legendário vai servir. Vem da planilha de equipes (botão Importar relatório em Legendários)${ed ? " e você pode mudar ou incluir alguém aqui" : ""}.</p></div>
    ${ed ? `<div class="actions"><button class="btn" type="button" data-act="importar-eq">${ico("upload")} Importar planilha de equipes</button><button class="btn primary" type="button" data-eq-add="">${ico("plus")} Colocar em uma equipe</button></div>` : ""}</div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Com equipe</span><span class="val num">${lgs.length - sem.length}</span><span class="sub">de ${lgs.length} legendários</span></div>
    <div class="kpi"><span class="lbl">Equipes</span><span class="val num">${com.length}</span><span class="sub">com gente</span></div>
    <div class="kpi ${sem.length ? "alert" : ""}"><span class="lbl">Sem equipe</span><span class="val num">${sem.length}</span><span class="sub">${sem.length ? "falta definir a área" : "todos com área"}</span></div>
    <div class="kpi ${nPag ? "alert" : ""}"><span class="lbl">Pagamento pendente</span><span class="val num">${nPag}</span><span class="sub">${nPag ? "boleto em aberto" : "todos pagos"}</span></div>
  </div>
  ${sem.length ? `<section class="panel"><h3>Sem equipe <small>${sem.length}</small></h3><div class="list">${sem.map(p => `<div class="li"><span class="grow">${esc(p.nome)}${pag(p)}</span>${ed ? `<select class="sel" data-eq-sel="${p.id}" aria-label="Equipe de ${esc(p.nome)}"><option value="">Escolher…</option>${equipesUsadas().map(e => `<option>${esc(e)}</option>`).join("")}</select>` : ""}</div>`).join("")}</div></section>` : ""}
  <div class="fams">${com.map(({ e, m }) => `
    <section class="fam"><header><b>${esc(e)}</b><span class="hint num">${m.length}</span></header>
    <ul class="eq-list">${m.map(pess).join("")}</ul>
    ${ed ? `<button class="btn ghost" type="button" data-eq-add="${esc(e)}" style="margin-top:6px">${ico("plus")} Adicionar</button>` : ""}</section>`).join("") || `<div class="empty">Nenhum legendário em equipe ainda. Importe a planilha de equipes.</div>`}</div>
  ${vazias.length && com.length ? `<p class="hint">Sem ninguém: ${vazias.map(x => esc(x.e)).join(", ")}.</p>` : ""}`;
}
function equipePessoaForm(p, equipePre) {
  const lgs = S.P.filter(x => x.tipo === "legendario" && !cancelado(x)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  modal(`
    <h3>${p ? esc(p.nome) : "Colocar em uma equipe"}</h3>
    <div class="form">
      ${p ? "" : `<div class="field full"><label for="f-eqp">Legendário</label><select id="f-eqp" name="pid" required><option value="">Escolher…</option>${lgs.map(x => `<option value="${x.id}">${esc(x.nome)}${x.equipe ? ` (hoje: ${esc(equipeTxt(x))})` : ""}</option>`).join("")}</select></div>`}
      <div class="field"><label for="f-eqe">Equipe</label><select id="f-eqe" name="equipe"><option value="">Sem equipe</option>${equipesUsadas().map(e => `<option ${(p ? p.equipe : equipePre) === e ? "selected" : ""}>${esc(e)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-eqf">Função</label><input id="f-eqf" name="funcao" list="funcoes2" value="${esc(p ? p.funcao : "")}" placeholder="ex.: Chefe, Subchefe"><datalist id="funcoes2"><option value="Chefe"><option value="Subchefe"></datalist></div>
    </div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => {
    const alvo = p || S.P.find(x => x.id === fd.get("pid")); if (!alvo) { toast("Escolha o legendário."); return; }
    const equipe = String(fd.get("equipe") || ""), funcao = equipe ? String(fd.get("funcao") || "").trim() : "";
    closeModal(); touch(alvo.id, { equipe, funcao }, equipe ? `${alvo.nome.split(" ")[0]} na equipe ${equipe}` : `${alvo.nome.split(" ")[0]} sem equipe`);
  });
}
/* Planilha de equipes da plataforma (Nome, Equipe, Função, Número) */
const ehEquipes = linhas => { const h = (linhas[0] || []).map(x => norm(String(x))); return h.includes("nome") && h.includes("equipe") && h.some(x => /^funcao/.test(x)) && !h.some(x => /^top para quem|status/.test(x)); };
function equipesImportForm(linhas) {
  const h = (linhas[0] || []).map(x => norm(String(x))), iN = h.indexOf("nome"), iE = h.indexOf("equipe"), iF = h.findIndex(x => /^funcao/.test(x));
  const marcar = [], ja = [], nao = [], vistos = new Set();
  linhas.slice(1).filter(r => String(r[iN] || "").trim() && String(r[iE] || "").trim()).forEach(r => {
    const nome = String(r[iN]).trim(), equipe = equipeCanon(r[iE]), f = String(r[iF] || "").trim();
    const funcao = norm(f) && norm(f) !== norm(r[iE]) && norm(f) !== norm(equipe) ? f : "";   // função igual ao nome da equipe = membro
    const a = acharNoApp({ nome, email: "", telefone: "", tipo: "legendario" });
    if (!a) { nao.push({ nome, equipe, funcao }); return; }
    if (vistos.has(a.p.id)) return; vistos.add(a.p.id);
    if (a.p.equipe === equipe && (a.p.funcao || "") === funcao) ja.push(a.p); else marcar.push({ p: a.p, equipe, funcao });
  });
  const li = (nome, txt) => `<li><b>${esc(nome)}</b> <span class="hint">${txt}</span></li>`;
  modal(`
    <h3>Importar equipes LGND</h3>
    <p class="hint" style="margin:0">Reconheci a planilha como <b>equipes dos legendários</b>. Cada legendário fica na área (e função) que está na planilha. Quem não está na planilha não muda.</p>
    <div class="imp-kpis">
      <div class="ok"><b class="num">${marcar.length}</b><span>vão ser atualizados</span></div>
      <div><b class="num">${ja.length}</b><span>já estavam assim</span></div>
      <div class="bad"><b class="num">${nao.length}</b><span>não achei em Legendários</span></div>
    </div>
    <details open><summary>Vão ser atualizados (${marcar.length})</summary><ul class="imp-list">${marcar.map(({ p, equipe, funcao }) => li(p.nome, `${p.equipe ? esc(equipeTxt(p)) + " → " : ""}<b>${esc(equipe)}</b>${funcao ? " · " + esc(funcao) : ""}`)).join("") || '<li class="hint">Ninguém novo.</li>'}</ul></details>
    ${ja.length ? `<details><summary>Já estavam assim (${ja.length})</summary><ul class="imp-list">${ja.map(p => li(p.nome, esc(equipeTxt(p)))).join("")}</ul></details>` : ""}
    ${nao.length ? `<details open><summary class="bad-text">Não achei em Legendários (${nao.length})</summary><p class="hint" style="margin:6px 0">Confira se o nome está diferente no app ou se a pessoa ainda não foi importada como legendário.</p><ul class="imp-list">${nao.map(n => li(n.nome, esc(n.equipe) + (n.funcao ? " · " + esc(n.funcao) : ""))).join("")}</ul></details>` : ""}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" ${marcar.length ? "" : "disabled"}>${marcar.length ? `Atualizar ${marcar.length}` : "Nada para atualizar"}</button></div></div>`,
  () => {
    if (!marcar.length) return;
    closeModal();
    save(async () => { for (let i = 0; i < marcar.length; i += 8) await Promise.all(marcar.slice(i, i + 8).map(({ p, equipe, funcao }) => api.update("pessoas", p.id, { equipe, funcao }))); },
      `Equipes: ${marcar.length} legendário(s) atualizado(s)`);
  });
}

/* ---------- Cronograma ----------
   O plano (horários previstos do TOP) vem do cronograma padrão (cronograma.js) até alguém editar; aí fica em config/cronoplano-<top>.
   Cada ADM marca o seu próprio cronograma (início e fim de cada momento) em config/crono-<top>-adm-<membro>,
   então ninguém sobrescreve o horário de ninguém. As equipes (config/equipes-<top>) só agrupam os ADMs:
   o ADM vê o dele e o dos colegas de equipe (só leitura); o dono e os coordenadores veem todos.
   Essa separação é da tela: os dados ficam na mesma tabela, legível pela equipe ADM. */
const CRONO_TIPOS = [{ v: "", l: "Normal" }, { v: "predica", l: "Prédica" }, { v: "refeicao", l: "Refeição" }, { v: "destaque", l: "Destaque" }, { v: "especial", l: "Especial" }, { v: "pausa", l: "Encerramento / pausa" }];
const cronoPlano = () => ((S.cfgDocs || {})["cronoplano-" + curTopId()] || {}).dias || window.ADM_CRONO || [];
const eqDoc = () => { const d = (S.cfgDocs || {})["equipes-" + curTopId()] || {}; return { equipes: d.equipes || [], coord: d.coord || [] }; };
const ehCoord = () => S.isOwner || eqDoc().coord.some(c => c.id === ME.id);
const naEquipe = (e, id = ME.id) => !!e && (e.adms || []).some(a => a.id === id);
const equipeDe = id => eqDoc().equipes.find(e => naEquipe(e, id)) || null;
const eu = () => ({ id: ME.id, nome: ME.adm || "Eu" });
const cronoDocId = adm => "crono-" + curTopId() + "-adm-" + adm.id;
// todos os ADMs que têm (ou podem ter) cronograma: os das equipes, os que já marcaram algo e, para o dono, a lista de usuários
function cronoAdms() {
  const mapa = new Map();
  const add = a => { if (a && a.id && !mapa.has(a.id)) mapa.set(a.id, { id: a.id, nome: a.nome }); };
  eqDoc().equipes.forEach(e => (e.adms || []).forEach(add));
  const pref = "crono-" + curTopId() + "-adm-";
  Object.entries(S.cfgDocs || {}).forEach(([k, d]) => { if (k.startsWith(pref) && d._adm) add(d._adm); });
  if (S.isOwner && Array.isArray(S.equipe)) S.equipe.filter(m => m.ativo !== false).forEach(add);
  if (ME.id) add(eu());
  return [...mapa.values()];
}
// quem eu posso ver: dono/coordenador = todos; ADM = ele e os colegas de equipe
function admsVisiveis() {
  const todos = cronoAdms();
  if (ehCoord()) return todos;
  const e = equipeDe(ME.id);
  return todos.filter(a => a.id === ME.id || (e && naEquipe(e, a.id)));
}
function cronoAdm() { const v = admsVisiveis(); return v.find(a => a.id === S.cronoAdm) || v.find(a => a.id === ME.id) || v[0] || eu(); }
function cronoMarcas(adm) { return (S.cfgDocs || {})[cronoDocId(adm || cronoAdm())] || {}; }
const podeMarcar = adm => podeEditar() && !!ME.id && (adm || cronoAdm()).id === ME.id;   // cada um marca só o seu
const podePlano = () => podeEditar() && (!eqDoc().equipes.length || ehCoord());
const agoraHM = () => new Date().toTimeString().slice(0, 5);
const minDe = h => { const m = /^(\d{1,2}):(\d{2})/.exec(h || ""); return m ? +m[1] * 60 + +m[2] : null; };
// diferença em minutos entre dois horários do mesmo dia do TOP (a madrugada continua o dia anterior)
const difMin = (a, b) => { const x = minDe(a), y = minDe(b); if (x == null || y == null) return null; let d = y - x; if (d > 720) d -= 1440; if (d < -720) d += 1440; return d; };
// atraso só faz sentido perto do horário previsto (mais de 6 h de diferença = marcado em outro dia/teste)
const atrasoDe = (plan, real) => { const d = difMin(plan, real); return d == null || Math.abs(d) > 360 ? null : d; };
const fmtDif = d => d === 0 ? "no horário" : (d > 0 ? "+" : "−") + (Math.abs(d) >= 60 ? Math.floor(Math.abs(d) / 60) + "h" + String(Math.abs(d) % 60).padStart(2, "0") : Math.abs(d) + " min");
function cronoDiaAtual(plano, M = cronoMarcas()) {
  if (S.cronoDia && plano.some(d => d.id === S.cronoDia)) return S.cronoDia;
  const d = plano.find(d => d.itens.some(i => M[i.id] && M[i.id].ini) && d.itens.some(i => !(M[i.id] && M[i.id].fim)));
  return (d || plano[0] || {}).id;
}
function cronoMarcar(id, dados, msg) {
  const adm = cronoAdm();
  if (!podeMarcar(adm)) { toast("Você só pode marcar o seu próprio cronograma."); return; }
  const docId = cronoDocId(adm);
  const atual = { ...(cronoMarcas(adm)[id] || {}), ...dados };
  Object.keys(atual).forEach(k => { if (atual[k] === "") delete atual[k]; });
  const it = cronoPlano().flatMap(d => d.itens).find(i => i.id === id);
  if (it && it.atv) atual.atv = it.atv;
  const existe = !!(S.cfgDocs || {})[docId];
  save(() => existe ? api.update("config", docId, { [id]: atual }) : api.set("config", docId, { _adm: eu(), [id]: atual }), msg);
}
/* Painel ao vivo do TOP: junta as marcações de todos os ADMs (o primeiro início e o primeiro fim de cada momento) */
function marcasTodas() {
  const M = {};
  admsVisiveis().forEach(a => Object.entries(cronoMarcas(a)).forEach(([k, m]) => { if (!m || typeof m !== "object") return;
    const x = M[k] || (M[k] = {}); ["ini", "fim"].forEach(c => { if (m[c] && (!x[c] || minDe(m[c]) < minDe(x[c]))) x[c] = m[c]; }); }));
  return M;
}
function vAoVivo() {
  const plano = cronoPlano(), M = marcasTodas(), dia = cronoDiaAtual(plano, M), D = plano.find(d => d.id === dia) || { itens: [] };
  const comecou = i => M[i.id] && M[i.id].ini, feito = i => M[i.id] && M[i.id].fim;
  const andando = D.itens.filter(i => comecou(i) && !feito(i)), agora = andando[andando.length - 1];
  const prox = D.itens.find(i => !comecou(i)), seguintes = prox ? D.itens.slice(D.itens.indexOf(prox) + 1, D.itens.indexOf(prox) + 4) : [];
  const ult = [...D.itens].reverse().find(comecou), atraso = ult && ult.hora ? atrasoDe(ult.hora, M[ult.id].ini) : null;
  const nFeito = D.itens.filter(feito).length;
  const somaMin = (h, d) => { const m = minDe(h); if (m == null) return h; const t = (m + (d || 0) + 1440) % 1440; return String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const prev = prox && prox.hora ? (atraso > 0 ? somaMin(prox.hora, atraso) : prox.hora) : "";
  const mapa = vMapaVivo(), tv = modoTv();
  const sobre = S.mapaCheio && mapa ? `<div class="av-sobre"><div class="av-sobre-top"><b class="num">${hora}</b>
      <span class="chip ${atraso > 10 ? "bad" : atraso > 0 ? "wait" : "ok"}">${atraso == null ? "Sem marcações" : atraso > 0 ? "Atrasado " + fmtDif(atraso).replace("+", "") : atraso < 0 ? "Adiantado " + fmtDif(atraso).replace("−", "") : "No horário"}</span>
      <button class="btn sm" type="button" data-act="mapa-cheio">Fechar</button></div>
    <span class="lbl">Agora</span><h2>${agora ? esc(agora.atv) : prox ? "Aguardando início" : "Dia encerrado"}</h2>
    ${prox ? `<p><span class="lbl">Próximo</span> ${esc(prox.atv)}${prev ? ` · ~${esc(prev)}` : ""}</p>` : ""}</div>` : "";
  return `<div class="aovivo${mapa ? " tem-mapa" : ""}">${sobre}<div class="av-info">
    <div class="av-top"><div><span class="eyebrow">${esc(topName())} · ${esc(D.nome || "")}</span><b class="av-relogio num">${hora}</b></div>
      <div class="actions"><span class="chip ${atraso > 10 ? "bad" : atraso > 0 ? "wait" : "ok"} av-atraso">${atraso == null ? "Sem marcações ainda" : atraso > 0 ? "Atrasado " + fmtDif(atraso).replace("+", "") : atraso < 0 ? "Adiantado " + fmtDif(atraso).replace("−", "") : "No horário"}</span>
      ${paisagem.matches ? "" : tv ? `<button class="btn" type="button" data-act="aovivo-tv">Sair do modo TV</button>` : `<button class="btn" type="button" data-act="aovivo-tv">Modo TV</button><button class="btn" type="button" data-act="aovivo-tela">Tela cheia</button>`}</div></div>
    <section class="av-agora"><span class="lbl">Agora</span><h2>${agora ? esc(agora.atv) : prox ? "Aguardando início" : "Dia encerrado"}</h2>
      ${agora ? `<p>${[agora.local, agora.resp].filter(Boolean).map(esc).join(" · ")}${M[agora.id].ini ? ` · desde ${esc(M[agora.id].ini)}${agora.hora ? ` (previsto ${esc(agora.hora)})` : ""}` : ""}</p>` : ""}</section>
    <section class="av-prox"><span class="lbl">Próximo</span><h3>${prox ? esc(prox.atv) : "—"}</h3>
      ${prox ? `<p>${prox.hora ? `previsto ${esc(prox.hora)}${prev && prev !== prox.hora ? ` · deve começar ~${esc(prev)}` : ""}` : ""}${prox.local ? " · " + esc(prox.local) : ""}</p>` : ""}</section>
    ${seguintes.length ? `<ul class="av-depois">${seguintes.map(i => `<li><span class="num">${esc(i.hora || "")}</span>${esc(i.atv)}</li>`).join("")}</ul>` : ""}
    <div class="av-barra"><div class="bar good"><i style="width:${pct(nFeito, D.itens.length)}%"></i></div><span class="hint num">${nFeito} de ${D.itens.length} momentos do ${esc(D.nome || "dia")} concluídos · atualiza sozinho</span></div>
  </div>${mapa}</div>`;
}
setInterval(() => { if (S.view === "aovivo" && !$("#modalRoot").innerHTML) render(); }, 30000);
// Modo TV: tudo numa tela só, sem menu. Liga pelo botão (fica salvo no aparelho) ou sozinho com o celular deitado.
const paisagem = matchMedia("(orientation: landscape) and (max-height: 540px)");
const modoTv = () => S.view === "aovivo" && (paisagem.matches || (() => { try { return localStorage.getItem("adm3-avtv") === "1"; } catch (e) { return false; } })());
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && S.mapaCheio) { S.mapaCheio = false; if (mapaAV) mapaAV.dia = null; render(); } });
paisagem.addEventListener("change", () => { if (S.view === "aovivo" && !$("#modalRoot").innerHTML) render(); });

/* ---------- Mapa da pista ao vivo (em teste: só na demonstração) ----------
   A linha vem do KMZ/KML da pista (config/pista-mapa). Os ADMs marcam quando a corrente sai e chega em cada trecho
   (config/pista-vivo-<top>); enquanto o trecho anda, a posição é estimada pelo tempo previsto do trecho. */
const MAPA_VIVO = () => true;
const MAPA_CHEIO = () => DEMO; // mapa em tela cheia: em teste na demonstração
const libJs = {};
function carregarLib(nome, js, css) {
  return libJs[nome] || (libJs[nome] = new Promise((ok, erro) => {
    if (css) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = css; document.head.appendChild(l); }
    const sc = document.createElement("script"); sc.src = js;
    sc.onload = () => ok(window[nome]); sc.onerror = () => { delete libJs[nome]; erro(new Error("Não consegui carregar o mapa. Confira a internet.")); };
    document.head.appendChild(sc);
  }));
}
const carregarMapa = () => carregarLib("L", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
const carregarZip = () => carregarLib("JSZip", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
const pistaMapa = () => (S.cfgDocs || {})["pista-mapa"] || null;
const vivoId = () => "pista-vivo-" + curTopId();
const pistaVivo = () => (S.cfgDocs || {})[vivoId()] || { marcas: {} };
const pistaDias = () => [...(S.pista || [])].sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
// "46 minutos", "1 hora e 30 minutos", "1h10" → minutos
const tempoMin = t => { const x = norm(t); const h = /(\d+)\s*h/.exec(x), m = /(\d+)\s*m/.exec(x.replace(/(\d+)\s*h(ora)?s?/, "")); return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0) || null; };
const distM = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
function linhaAte(lin, d) {   // pedaço da linha do começo até d metros, e o ponto final
  const out = [lin[0]]; let acc = 0;
  for (let i = 1; i < lin.length; i++) { const s = distM(lin[i - 1], lin[i]);
    if (acc + s >= d) { const f = s ? (d - acc) / s : 0, pt = [lin[i - 1][0] + (lin[i][0] - lin[i - 1][0]) * f, lin[i - 1][1] + (lin[i][1] - lin[i - 1][1]) * f]; out.push(pt); return { parte: out, pt }; }
    acc += s; out.push(lin[i]); }
  return { parte: out, pt: lin[lin.length - 1] };
}
const compr = lin => lin.reduce((a, p, i) => i ? a + distM(lin[i - 1], p) : 0, 0);
// linha do dia: uma por dia quando o KMZ tem uma linha por dia; senão a linha toda serve para o dia
// linha do dia: pelo nome no KMZ ("D1 - 8,5 km" é do D1); sem nomes, uma por dia na ordem; senão a linha toda
function idxLinhaDoDia(idx) {
  const M = pistaMapa(), dia = pistaDias()[idx]; if (!M || !M.linhas || !M.linhas.length || !dia) return -1;
  const N = (M.nomes || []).map(norm), k = norm(dia.dia);
  let i = N.findIndex(n => n === k || n.startsWith(k + " ") || n.startsWith(k + "-"));
  if (i < 0) i = N.findIndex(n => new RegExp("\\b" + k + "\\b").test(n));
  if (i < 0 && M.linhas.length === pistaDias().length) i = idx;
  return i;
}
function linhaDoDia(idx) { const M = pistaMapa(); if (!M || !M.linhas || !M.linhas.length) return null; const i = idxLinhaDoDia(idx); return i >= 0 ? M.linhas[i] : M.linhas.length === 1 ? M.linhas[0] : null; }
// momento do cronograma que está acontecendo (ou o último que começou), com a hora marcada
function momentoAtual() {
  const plano = cronoPlano(), M = marcasTodas(), dia = cronoDiaAtual(plano, M), D = plano.find(d => d.id === dia) || { itens: [] };
  const comecou = D.itens.filter(i => M[i.id] && M[i.id].ini), agora = [...comecou].reverse().find(i => !M[i.id].fim);
  const u = agora || comecou[comecou.length - 1]; if (!u) return null;
  return { atv: u.atv, ini: M[u.id].ini, fim: M[u.id].fim, andando: !!agora };
}
// ponto do KMZ citado no nome do momento ("PREDICA 10: CASA ABANDONADA" → ponto "Casa abandonada")
const PARADAS_GENERICAS = new Set(["segunda", "pelo", "mundo", "camp", "base", "colinas", "almoco", "entregue", "sustento", "corredor"]);
function pontoDoMomento(atv) {
  const M = pistaMapa(); if (!M || !atv) return null; const a = " " + norm(atv).replace(/[^a-z0-9 ]/g, " ") + " ";
  let melhor = null, nota = 0;
  (M.pontos || []).forEach(p => { const ws = norm(p.n).replace(/[^a-z0-9 ]/g, " ").split(" ").filter(w => w.length >= 4);
    const fortes = ws.filter(w => !PARADAS_GENERICAS.has(w)), achou = ws.filter(w => a.includes(" " + w + " ")).length, achouF = fortes.filter(w => a.includes(" " + w + " ")).length;
    const n = achouF ? achou + achouF : 0; if (n > nota) { nota = n; melhor = p; } });
  return melhor;
}
const pertoNaLinha = (lin, pt) => { let bi = 0, bd = Infinity; lin.forEach((q, i) => { const d = distM(q, pt); if (d < bd) { bd = d; bi = i; } }); return { i: bi, d: bd, m: compr(lin.slice(0, bi + 1)) }; };
function posicaoCorrente(dia) {
  const tr = dia.trechos || [], V = pistaVivo().marcas || {}, tot = tr.reduce((a, t) => a + (+t.m || 0), 0) || 1;
  let feitoM = 0, atual = -1, estimado = false;
  tr.forEach((t, i) => { const m = V[dia.id + "-" + i] || {};
    if (m.fim) { feitoM = tr.slice(0, i + 1).reduce((a, x) => a + (+x.m || 0), 0); atual = i; }
    else if (m.ini) { const prev = tempoMin(t.tempo) || 30, f = Math.min(.95, Math.max(0, (Date.now() - Date.parse(m.ini)) / 6e4 / prev));
      feitoM = tr.slice(0, i).reduce((a, x) => a + (+x.m || 0), 0) + f * (+t.m || 0); atual = i; estimado = true; } });
  return { frac: feitoM / tot, feitoM, tot, atual, estimado };
}
// onde mostrar a corrente: o momento do cronograma (se cita um ponto do mapa) ou os trechos marcados, o que foi marcado por último
function estadoMapa() {
  const dias = pistaDias(), V = pistaVivo(), mom = momentoAtual(), ponto = mom && pontoDoMomento(mom.atv);
  let idx = dias.findIndex(d => d.id === (S.avDia || ""));
  if (idx < 0 && ponto) { let bd = Infinity; dias.forEach((d, i) => { const l = linhaDoDia(i); if (l) { const r = pertoNaLinha(l, [ponto.lat, ponto.lng]); if (r.d < bd) { bd = r.d; idx = i; } } }); }
  if (idx < 0) idx = Math.max(0, dias.findIndex(d => d.id === V.dia));
  const dia = dias[idx], lin = linhaDoDia(idx), pos = posicaoCorrente(dia), M = V.marcas || {};
  const tTrecho = Math.max(0, ...Object.entries(M).filter(([k]) => k.startsWith(dia.id + "-")).flatMap(([, m]) => [m.ini, m.fim].filter(Boolean).map(Date.parse)));
  let tMom = 0; if (mom) { const h = minDe(mom.fim || mom.ini), d = new Date(); d.setHours(Math.floor(h / 60), h % 60, 0, 0); tMom = d.getTime(); if (tMom > Date.now() + 6e4) tMom -= 864e5; }
  let usaPonto = !!(ponto && lin && pertoNaLinha(lin, [ponto.lat, ponto.lng]).d < 1500 && tMom >= tTrecho);
  const total = lin ? compr(lin) : 0;
  const ateM = usaPonto ? pertoNaLinha(lin, [ponto.lat, ponto.lng]).m : pos.frac * total;
  return { dias, idx, dia, lin, pos, mom, ponto, usaPonto, total, ateM, andou: usaPonto || pos.atual >= 0 };
}
function vMapaVivo() {
  if (!MAPA_VIVO()) return "";
  const E0 = pistaDias(); if (!E0.length) return "";
  const E = estadoMapa(), { dias, dia, pos, mom } = E, V = pistaVivo();
  const tr = dia.trechos || [], M = V.marcas || {}, ed = podeEditar();
  const hm = iso => iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const linha = (t, i) => { const m = M[dia.id + "-" + i] || {}, st = m.fim ? "feito" : m.ini ? "andando" : "";
    return `<li class="${st}"><span class="av-tr-n num">${i + 1}</span><span class="grow"><b>${esc(t.de)} → ${esc(t.para)}</b><small class="hint">${fmtNum(t.m)} m · ${esc(t.tempo || "")}${m.ini ? ` · saiu ${hm(m.ini)}` : ""}${m.fim ? ` · chegou ${hm(m.fim)}` : ""}</small></span>
      ${ed ? (m.fim ? `<button class="linkbtn" type="button" data-pv-desf="${i}" title="Desfazer">↺</button>` : m.ini ? `<button class="btn sm primary" type="button" data-pv-fim="${i}">Chegou</button>` : `<button class="btn sm" type="button" data-pv-ini="${i}">Saiu</button>`) : ""}</li>`; };
  const km = m => (m / 1000).toFixed(1).replace(".", ",");
  return `<section class="panel av-pista"><div class="av-pista-head"><h3>Onde está a corrente</h3>
      <div class="actions"><div class="seg" role="group" aria-label="Dia da pista">${dias.map(d => `<button type="button" data-av-dia="${esc(d.id)}" aria-pressed="${d.id === dia.id}">${esc(d.dia)}</button>`).join("")}</div>
      ${E.lin && MAPA_CHEIO() ? `<button class="btn" type="button" data-act="mapa-cheio">${S.mapaCheio ? "Fechar mapa" : "⤢ Mapa em tela cheia"}</button>` : ""}
      ${ed ? `<button class="btn" type="button" data-act="kmz">${ico("upload")} Importar KMZ</button>` : ""}</div></div>
    ${mom ? `<div class="av-momento"><span class="lbl">${mom.andando ? "Acontecendo agora" : "Último momento"}</span><b>${esc(mom.atv)}</b><small class="hint">${mom.andando ? "começou " : "terminou "}${esc(mom.andando ? mom.ini : mom.fim || mom.ini)}${E.ponto ? ` · no mapa: ${esc(E.ponto.n)}` : ""}</small></div>` : ""}
    <p class="hint" style="margin:0">${!E.andou ? "A corrente ainda não saiu neste dia." : E.lin ? `${km(E.ateM)} de ${km(E.total)} km do ${esc(dia.dia)} (${Math.round(E.ateM / (E.total || 1) * 100)}%)${!E.usaPonto && pos.estimado ? " · posição estimada pelo tempo previsto do trecho" : ""}` : ""}</p>
    ${E.lin ? `<div id="avMapa" class="av-mapa"></div>` : `<div class="empty">${pistaMapa() ? `O KMZ não tem a linha do ${esc(dia.dia)}.` : ed ? "Importe o KMZ da pista para ver o mapa." : "O mapa da pista ainda não foi enviado."}</div>`}
    <details ${E.usaPonto ? "" : "open"}><summary>Trechos do ${esc(dia.dia)} (marcar saída e chegada da corrente)</summary><ol class="av-trechos">${tr.map(linha).join("")}</ol></details>
    ${pistaMapa() ? `<p class="hint" style="margin:0">Mapa: ${esc(pistaMapa().arquivo || "KMZ")}${pistaMapa().por ? " · enviado por " + esc(pistaMapa().por) : ""}</p>` : ""}
  </section>`;
}
let mapaAV = null;
async function montarMapaVivo() {
  const el = $("#avMapa"); if (!el) return;
  const E = estadoMapa(), { dia, lin, mom, ponto } = E;
  if (!lin || lin.length < 2) return;
  let L; try { L = await carregarMapa(); } catch (e) { el.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  if (!el.isConnected) return;
  const antes = mapaAV && mapaAV.dia === dia.id ? { c: mapaAV.map.getCenter(), z: mapaAV.map.getZoom(), cam: mapaAV.cam } : null;
  if (mapaAV) try { mapaAV.map.remove(); } catch (e) {}
  const map = L.map(el, { zoomControl: true, attributionControl: true });
  const ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri" });
  const cam = antes ? antes.cam : (mapaAV && mapaAV.cam) || "sat"; (cam === "sat" ? sat : ruas).addTo(map);
  L.control.layers({ "Satélite": sat, "Ruas": ruas }, null, { position: "topright" }).addTo(map);
  map.on("baselayerchange", e => { if (mapaAV) mapaAV.cam = e.name === "Ruas" ? "ruas" : "sat"; });
  // outras linhas do KMZ (outros dias, acessos) em azul fino
  const P = pistaMapa(); (P.linhas || []).forEach(l => { if (l !== lin) L.polyline(l, { color: "#7aa7ff", weight: 3, opacity: .55, dashArray: "4 6" }).addTo(map); });
  L.polyline(lin, { color: "#ffffff", weight: 7, opacity: .55 }).addTo(map);
  L.polyline(lin, { color: "#26313d", weight: 4, opacity: .9, dashArray: "6 6" }).addTo(map);
  const feito = linhaAte(lin, E.ateM);
  if (E.andou) L.polyline(feito.parte, { color: "#ff7a1a", weight: 6 }).addTo(map);
  // pontos do KMZ (prédicas, camps): o do momento atual acende
  (P.pontos || []).forEach(p => { const on = ponto && p === ponto;
    L.circleMarker([p.lat, p.lng], { radius: on ? 9 : 5, color: on ? "#fff" : "#0b1119", weight: 2, fillColor: on ? "#ff7a1a" : "#ffd29a", fillOpacity: 1 }).addTo(map)
      .bindTooltip(esc(p.n), { direction: "top", permanent: !on && map.getZoom && false }); });
  if (!(P.pontos || []).length) { let acc = 0; const tr = dia.trechos || [], tot = E.pos.tot;
    tr.forEach((t, i) => { acc += +t.m || 0; L.circleMarker(linhaAte(lin, acc / tot * E.total).pt, { radius: 6, color: "#0b1119", weight: 2, fillColor: "#ffd29a", fillOpacity: 1 }).addTo(map).bindTooltip(`${i + 1}. ${esc(t.para)}`, { direction: "top" }); }); }
  L.circleMarker(lin[0], { radius: 7, color: "#0b1119", weight: 2, fillColor: "#46c486", fillOpacity: 1 }).addTo(map).bindTooltip("Saída do " + esc(dia.dia), { direction: "top" });
  if (E.andou) {
    const onde = E.usaPonto ? [ponto.lat, ponto.lng] : feito.pt;
    const rot = mom ? `<small>${mom.andando ? "AGORA" : "ÚLTIMO"}</small>${esc(mom.atv)}` : "Corrente";
    L.marker(onde, { icon: L.divIcon({ className: "corrente-pin", html: `<i></i><b>${rot}</b>`, iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000 }).addTo(map);
  }
  if (antes) map.setView(antes.c, antes.z); else map.fitBounds(L.latLngBounds(lin), { padding: [30, 30] });
  mapaAV = { map, dia: dia.id, cam };
}
function marcarTrecho(i, campo) {
  const dias = pistaDias(), V = pistaVivo(), diaId = estadoMapa().dia.id, k = diaId + "-" + i;
  const marcas = { ...(V.marcas || {}) }, m = { ...(marcas[k] || {}) }, agora = new Date().toISOString();
  if (campo === "desf") delete marcas[k];
  else { m[campo] = agora; m[campo + "Por"] = ME.adm || ""; if (campo === "fim" && !m.ini) m.ini = agora; marcas[k] = m; }
  const dia = dias.find(d => d.id === diaId) || {}, t = (dia.trechos || [])[i] || {};
  save(() => api.set("config", vivoId(), { dia: diaId, marcas }), campo === "ini" ? `Corrente saiu: ${t.de} → ${t.para}` : campo === "fim" ? `Corrente chegou em ${t.para}` : "Marcação desfeita");
}
async function lerKmz(f) {
  let txt;
  if (/\.kmz$/i.test(f.name)) { const Z = await carregarZip(), zip = await Z.loadAsync(await f.arrayBuffer());
    const k = Object.keys(zip.files).find(n => /\.kml$/i.test(n)); if (!k) throw new Error("Não achei o mapa (KML) dentro do KMZ."); txt = await zip.files[k].async("string"); }
  else txt = await textoArquivo(f);
  const x = new DOMParser().parseFromString(txt, "application/xml"), coords = c => c.trim().split(/\s+/).map(v => v.split(",").map(Number)).filter(v => v.length >= 2 && !isNaN(v[0]) && !isNaN(v[1])).map(([lng, lat]) => [+lat.toFixed(6), +lng.toFixed(6)]);
  const nomeDe = el => { while (el && el.tagName !== "Placemark") el = el.parentNode; return el ? ((el.getElementsByTagName("name")[0] || {}).textContent || "").trim() : ""; };
  const nomes = [], linhas = [];
  [...x.getElementsByTagName("LineString")].forEach(l => { const c = coords((l.getElementsByTagName("coordinates")[0] || {}).textContent || ""); if (c.length > 1) { linhas.push(c); nomes.push(nomeDe(l)); } });
  // gx:Track (trilha gravada no GPS)
  [...x.getElementsByTagNameNS("*", "Track")].forEach(t => { const l = [...t.getElementsByTagNameNS("*", "coord")].map(c => c.textContent.trim().split(/\s+/).map(Number)).filter(v => v.length >= 2).map(([lng, lat]) => [+lat.toFixed(6), +lng.toFixed(6)]); if (l.length > 1) { linhas.push(l); nomes.push(nomeDe(t)); } });
  const pontos = [...x.getElementsByTagName("Placemark")].map(pm => { const pt = pm.getElementsByTagName("Point")[0]; if (!pt) return null; const c = coords((pt.getElementsByTagName("coordinates")[0] || {}).textContent || "")[0];
    return c && { n: ((pm.getElementsByTagName("name")[0] || {}).textContent || "").trim(), lat: c[0], lng: c[1] }; }).filter(Boolean);
  if (!linhas.length) throw new Error("Esse arquivo não tem a linha da pista (trajeto).");
  return { linhas, nomes, pontos };
}
function kmzForm() {
  const dias = pistaDias();
  modal(`
    <h3>Mapa da pista</h3>
    <p class="hint" style="margin:0">Envie o KMZ (ou KML) da pista, exportado do Google Earth, Maps ou do GPS. Cada dia (${dias.map(d => esc(d.dia)).join(", ")}) usa a linha com o nome dele (ex.: "D1 - 8,5 km"). Os pontos com nome (prédicas, camps) aparecem no mapa e acendem quando o ADM inicia o momento no cronograma.</p>
    <div class="field"><label for="f-kmz">Arquivo</label><input id="f-kmz" type="file" accept=".kmz,.kml"></div>
    <div id="kmzPrev" class="hint"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="kmzBtn" disabled>Salvar mapa</button></div></div>`,
  () => { if (!K) return; closeModal(); save(() => api.set("config", "pista-mapa", { ...K, em: new Date().toISOString(), por: ME.adm || "" }), "Mapa da pista salvo"); });
  let K = null;
  $("#f-kmz").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return; const pv = $("#kmzPrev"); pv.textContent = "Lendo " + f.name + "…"; $("#kmzBtn").disabled = true;
    try { const r = await lerKmz(f); K = { ...r, arquivo: f.name };
      K.nomes = r.nomes; const M0 = S.cfgDocs["pista-mapa"]; S.cfgDocs["pista-mapa"] = K; const usa = dias.map((d, i) => { const j = idxLinhaDoDia(i); return `${esc(d.dia)}: ${j >= 0 ? esc(r.nomes[j] || "linha " + (j + 1)) : "<span class=\"bad-text\">sem linha</span>"}`; }); S.cfgDocs["pista-mapa"] = M0;
      pv.innerHTML = `${r.linhas.length} trajeto(s): ${r.linhas.map((l, i) => esc(r.nomes[i] || "linha " + (i + 1)) + " (" + (compr(l) / 1000).toFixed(1).replace(".", ",") + " km)").join(", ")} · ${r.pontos.length} ponto(s).<br>Cada dia vai usar: ${usa.join(" · ")}`;
      $("#kmzBtn").disabled = false; }
    catch (err) { console.error(err); pv.innerHTML = `<span class="bad-text">${esc(err.message || "Não consegui ler esse arquivo.")}</span>`; }
  });
}
function vCronograma() {
  const adm = cronoAdm(), meu = adm.id === ME.id, eqAdm = equipeDe(adm.id), E = eqDoc();
  const topo = `<div class="head"><div><h2>Cronograma</h2><p>${esc(topName())} · ${meu ? "<b>Seu cronograma</b>" : `Cronograma de <b>${esc(adm.nome)}</b>`}${eqAdm ? ` · ${esc(eqAdm.nome)}` : ""} · toque em <b>Iniciar</b> quando o momento começar e em <b>Terminar</b> quando acabar. Cada ADM marca o seu e funciona sem internet.</p></div>
    <div class="actions"><button class="btn" type="button" data-act="crono-pdf">${ico("upload")} Exportar PDF</button>${S.isOwner ? `<button class="btn" type="button" data-act="crono-equipes">${ico("users")} Equipes</button>` : ""}${podePlano() ? `<button class="btn" type="button" data-crono-item="novo">${ico("plus")} Novo momento</button>` : ""}</div></div>`;
  // cartões dos cronogramas que posso ver, agrupados por equipe
  const vis = admsVisiveis(), planoAll = cronoPlano();
  const resumo = a => { const M = cronoMarcas(a), dId = cronoDiaAtual(planoAll, M), D0 = planoAll.find(d => d.id === dId) || { itens: [] };
    const n = D0.itens.filter(i => M[i.id] && M[i.id].fim).length, u = [...D0.itens].reverse().find(i => M[i.id] && M[i.id].ini);
    const at = u && u.hora ? atrasoDe(u.hora, M[u.id].ini) : null; return { dia: D0.nome || "", n, t: D0.itens.length, at, agora: u && !(M[u.id] || {}).fim ? u.atv : "" }; };
  const cartao = a => { const r = resumo(a);
    return `<button type="button" class="crono-eq" data-crono-adm="${esc(a.id)}" aria-pressed="${a.id === adm.id}"><b>${esc(a.nome)}${a.id === ME.id ? " (você)" : ""}</b>
      <small>${r.agora ? "Agora: " + esc(r.agora) : r.n ? "Último concluído no " + esc(r.dia) : "Ainda não marcou"}</small>
      <span class="num">${esc(r.dia)} ${r.n}/${r.t}${r.at != null ? ` · <i class="${r.at > 10 ? "bad-text" : ""}">${fmtDif(r.at)}</i>` : ""}</span></button>`; };
  const grupos = [...E.equipes.map(e => ({ nome: e.nome, adms: vis.filter(a => naEquipe(e, a.id)) })), { nome: E.equipes.length ? "Sem equipe" : "ADMs", adms: vis.filter(a => !equipeDe(a.id)) }].filter(g => g.adms.length);
  const painelAdms = vis.length > 1 ? grupos.map(g => `<div class="crono-grupo"><h4>${esc(g.nome)} <span class="hint num">${g.adms.length}</span></h4><div class="crono-eqs">${g.adms.map(cartao).join("")}</div></div>`).join("") : "";
  const aviso = !meu ? `<div class="banner"><span>Você está vendo o cronograma de <b>${esc(adm.nome)}</b> (só leitura).</span>${ME.id ? `<button class="btn" type="button" data-crono-adm="${esc(ME.id)}">Ver o meu</button>` : ""}</div>`
    : S.isOwner && !E.equipes.length ? `<div class="banner"><span>Separe os ADMs por equipe para acompanhar os cronogramas agrupados.</span><button class="btn" type="button" data-act="crono-equipes">Dividir equipes</button></div>` : "";
  const plano = cronoPlano(), M = cronoMarcas(adm), dia = cronoDiaAtual(plano, M), D = plano.find(d => d.id === dia) || { itens: [] };
  const ed = podeMarcar(adm), edPlano = podePlano();
  const feito = i => M[i.id] && M[i.id].fim, comecou = i => M[i.id] && M[i.id].ini;
  const andando = D.itens.filter(i => comecou(i) && !feito(i));
  const proximo = D.itens.find(i => !comecou(i));
  const ultimo = [...D.itens].reverse().find(comecou);
  const atraso = ultimo && ultimo.hora ? atrasoDe(ultimo.hora, M[ultimo.id].ini) : null;
  const nFeito = D.itens.filter(feito).length;
  const inicio = i => { const m = M[i.id] || {};
    if (m.ini) { const d = i.hora ? atrasoDe(i.hora, m.ini) : null;
      return `<button type="button" class="crono-hora" data-crono-hora="${i.id}" ${ed ? "" : "disabled"} title="${m.iniPor ? "Marcado por " + esc(m.iniPor) : ""}">${esc(m.ini)}</button>${d != null ? ` <span class="chip ${d > 10 ? "bad" : d > 0 ? "wait" : "ok"}">${fmtDif(d)}</span>` : ""}`; }
    return ed ? `<button type="button" class="btn sm" data-crono-ini="${i.id}">Iniciar</button>` : `<span class="hint">—</span>`; };
  const fim = i => { const m = M[i.id] || {};
    if (m.fim) { const d = m.ini ? difMin(m.ini, m.fim) : null; return `<button type="button" class="crono-hora" data-crono-hora="${i.id}" ${ed ? "" : "disabled"} title="${m.fimPor ? "Marcado por " + esc(m.fimPor) : ""}">${esc(m.fim)}</button>${d != null && d >= 0 ? ` <span class="hint">${d} min</span>` : ""}`; }
    return m.ini && ed ? `<button type="button" class="btn sm primary" data-crono-fim="${i.id}">Terminar</button>` : `<span class="hint">—</span>`; };
  const cls = i => ["crono-" + (i.tipo || "normal"), feito(i) ? "feito" : comecou(i) ? "andando" : proximo && proximo.id === i.id ? "proximo" : ""].join(" ");
  const quem = i => { const m = M[i.id] || {}; const q = [m.iniPor, m.fimPor].filter(Boolean); return q.length ? `<small class="hint">Marcado por ${esc([...new Set(q)].map(n => n.split(" ")[0]).join(", "))}</small>` : ""; };
  return topo + painelAdms + aviso + `
  <div class="kpis">
    <div class="kpi"><span class="lbl">${esc(D.nome || "")} concluído</span><span class="val num">${nFeito}<small style="font-size:18px;color:var(--muted)"> / ${D.itens.length}</small></span><div class="bar good"><i style="width:${pct(nFeito, D.itens.length)}%"></i></div></div>
    <div class="kpi"><span class="lbl">Acontecendo agora</span><span class="val" style="font-size:17px;line-height:1.25">${andando.length ? esc(andando[andando.length - 1].atv) : "—"}</span>${andando.length ? `<span class="sub">desde ${esc(M[andando[andando.length - 1].id].ini)}${andando.length > 1 ? ` · +${andando.length - 1} em andamento` : ""}</span>` : ""}</div>
    <div class="kpi"><span class="lbl">Próximo</span><span class="val" style="font-size:17px;line-height:1.25">${proximo ? esc(proximo.atv) : "Dia encerrado"}</span>${proximo && proximo.hora ? `<span class="sub">previsto ${esc(proximo.hora)}</span>` : ""}</div>
    <div class="kpi ${atraso > 10 ? "alert" : ""}"><span class="lbl">Atraso</span><span class="val num">${atraso == null ? "—" : fmtDif(atraso)}</span><span class="sub">${ultimo ? "no último início marcado" : "nenhum início marcado"}</span></div>
  </div>
  <div class="seg" role="group" aria-label="Dia">${plano.map(d => { const n = d.itens.filter(feito).length; return `<button type="button" data-crono-dia="${d.id}" aria-pressed="${d.id === dia}">${esc(d.nome)} <span class="num" style="opacity:.75">${n}/${d.itens.length}</span></button>`; }).join("")}</div>
  <div class="crono-leg"><span class="crono-predica">Prédica</span><span class="crono-refeicao">Refeição</span><span class="crono-destaque">Destaque</span><span class="crono-especial">Especial</span></div>
  <div class="table-wrap crono"><table>
    <thead><tr><th>Hora</th><th>Atividade</th><th>Local</th><th>Formação</th><th>Responsável</th><th>Início</th><th>Fim</th>${edPlano ? "<th></th>" : ""}</tr></thead>
    <tbody>${D.itens.map(i => `<tr class="${cls(i)}">
      <td class="num"><b>${esc(i.hora || "")}</b></td><td><b>${esc(i.atv)}</b>${quem(i)}</td><td>${esc(i.local || "")}</td><td>${esc(i.form || "")}</td><td>${esc(i.resp || "")}</td>
      <td style="white-space:nowrap">${inicio(i)}</td><td style="white-space:nowrap">${fim(i)}</td>
      ${edPlano ? `<td><button class="linkbtn" type="button" data-crono-item="${i.id}" aria-label="Editar ${esc(i.atv)}">${ico("edit")}</button></td>` : ""}</tr>`).join("")}</tbody></table></div>
  <div class="cards crono-cards">${D.itens.map(i => `<article class="pcard ${cls(i)}">
      <div class="top"><div class="crono-h num">${esc(i.hora || "—")}</div><div style="flex:1"><b>${esc(i.atv)}</b><small class="hint" style="display:block">${esc([i.local, i.form, i.resp].filter(Boolean).join(" · "))}</small>${quem(i)}</div>
        ${edPlano ? `<button class="linkbtn" type="button" data-crono-item="${i.id}" aria-label="Editar ${esc(i.atv)}">${ico("edit")}</button>` : ""}</div>
      <div class="row"><span class="lbl">Início</span>${inicio(i)}<span class="lbl" style="margin-left:8px">Fim</span>${fim(i)}</div>
    </article>`).join("")}</div>`;
}
/* Exportar o cronograma em PDF (um dia ou todos), com o horário previsto e ao lado o horário real marcado */
let pdfLib = null;
const carregarScript = src => new Promise((ok, erro) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => erro(new Error("Não foi possível gerar o PDF. Confira a internet e tente de novo.")); document.head.appendChild(s); });
function carregarPdf() {
  if (window.jspdf && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf.jsPDF);
  return pdfLib || (pdfLib = carregarScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js")
    .then(() => carregarScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"))
    .then(() => window.jspdf.jsPDF).catch(e => { pdfLib = null; throw e; }));
}
const imagemDataUrl = url => fetch(url).then(r => r.blob()).then(b => new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); })).catch(() => null);
function cronoPdfForm() {
  const plano = cronoPlano(), dia = cronoDiaAtual(plano), adm = cronoAdm(), vis = admsVisiveis(), E = eqDoc();
  const eqsVis = E.equipes.filter(e => vis.some(a => naEquipe(e, a.id)));
  const opQuem = vis.length > 1 ? `<div class="field"><label for="f-pquem">De quem</label><select id="f-pquem">
      <option value="adm:${esc(adm.id)}" selected>Só ${adm.id === ME.id ? "o meu" : "o de " + esc(adm.nome)}</option>
      ${vis.filter(a => a.id !== adm.id).map(a => `<option value="adm:${esc(a.id)}">Só o de ${esc(a.nome)}</option>`).join("")}
      ${eqsVis.map(e => `<option value="eq:${esc(e.id)}">Todos da ${esc(e.nome)} (um depois do outro)</option>`).join("")}
      <option value="todos">Todos os ADMs (um depois do outro)</option></select></div>` : "";
  modal(`
    <h3>Exportar cronograma em PDF</h3>
    ${opQuem}
    <div class="field"><label for="f-pdia">O que exportar</label><select id="f-pdia">${plano.map(d => `<option value="${d.id}" ${d.id === dia ? "selected" : ""}>Só o ${esc(d.nome)}</option>`).join("")}<option value="todos">Todos os dias juntos</option></select></div>
    <p class="hint" style="margin:0">O PDF traz o nome do ADM no cabeçalho, o horário previsto e, ao lado, o horário real de início e fim e o atraso. Dá para mandar pelo WhatsApp ou e-mail.</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="pdfBtn">${ico("upload")} Gerar PDF</button></div></div>`,
  async () => {
    const qual = $("#f-pdia").value, btn = $("#pdfBtn"); btn.disabled = true; btn.textContent = "Gerando…";
    const q = $("#f-pquem") ? $("#f-pquem").value : "adm:" + adm.id;
    const adms = q === "todos" ? vis : q.startsWith("eq:") ? vis.filter(a => naEquipe(E.equipes.find(e => e.id === q.slice(3)), a.id)) : vis.filter(a => a.id === q.slice(4));
    try { await gerarCronoPdf(qual, adms.length ? adms : [adm]); closeModal(); }
    catch (e) { console.error(e); toast(erroAmigavel(e)); btn.disabled = false; btn.textContent = "Gerar PDF"; }
  });
}
// faixa do topo no visual do app: montanha laranja à direita sumindo no azul-marinho
function faixaPdf() {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 2400; c.height = 330;
      const g = c.getContext("2d");
      g.fillStyle = "#0b1119"; g.fillRect(0, 0, c.width, c.height);
      const w = 1000, h = img.height * w / img.width;
      g.drawImage(img, c.width - w, -h * 0.30, w, h);
      const gr = g.createLinearGradient(c.width - w - 40, 0, c.width - w + 520, 0);
      gr.addColorStop(0, "rgba(11,17,25,1)"); gr.addColorStop(1, "rgba(11,17,25,0)");
      g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
      const gb = g.createLinearGradient(0, c.height * 0.55, 0, c.height);
      gb.addColorStop(0, "rgba(11,17,25,0)"); gb.addColorStop(1, "rgba(11,17,25,.85)");
      g.fillStyle = gb; g.fillRect(0, 0, c.width, c.height);
      ok(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = () => ok(null);
    img.src = "assets/bg.jpg";
  });
}
async function gerarCronoPdf(qual, adms = [cronoAdm()]) {
  const jsPDF = await carregarPdf();
  const plano = cronoPlano();
  const dias = qual === "todos" ? plano : plano.filter(d => d.id === qual);
  const [logo, faixa] = await Promise.all([imagemDataUrl("assets/logo.png"), faixaPdf()]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  // cores do app (tema claro para imprimir) e das categorias da planilha
  const NAVY = [11, 17, 25], LARANJA = [255, 122, 26], TINTA = [30, 20, 11], CINZA = [123, 101, 83], LINHA = [241, 220, 199], CREME = [255, 248, 242];
  const VERDE = [29, 138, 85], AMBAR = [168, 111, 0], VERM = [204, 51, 41];
  const COR = { predica: [243, 154, 30], refeicao: [63, 138, 46], destaque: [106, 166, 224], especial: [214, 190, 0], pausa: [150, 150, 150] };
  const mistura = (c, a) => c.map(v => Math.round(255 - (255 - v) * a));
  const top = topName(), gerado = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const limpa = s => String(s || "").replace(/−/g, "-");
  const local = (topDoc() || {}).local || "Franca - SP";
  let admAtual = null;
  const cabecalho = (d, primeira, resumo) => {
    const adm = admAtual || eu(), eq = equipeDe(adm.id);
    const alt = primeira ? 38 : 16;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, alt, "F");
    if (faixa) {
      // nas páginas de continuação mostra só o alto da mesma faixa (sem esticar a imagem)
      doc.saveGraphicsState(); doc.rect(0, 0, W, alt, null); doc.clip(); doc.discardPath();
      doc.addImage(faixa, "JPEG", 0, primeira ? 0 : -6, W, W * 330 / 2400, "faixa", "FAST");
      doc.restoreGraphicsState();
    }
    doc.setFillColor(...LARANJA); doc.rect(0, alt, W, 1.2, "F");
    if (primeira) {
      if (logo) try { doc.addImage(logo, "PNG", 12, 6, 20.6, 26, "logo"); } catch (e) {}
      doc.setTextColor(...LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text("ADM 3COLINAS  ·  LEGENDÁRIOS BASE 3 COLINAS", 38, 12, { charSpace: 0.6 });
      doc.setTextColor(255, 255, 255); doc.setFontSize(24);
      doc.text(`CRONOGRAMA ${d.nome}`, 38, 23);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(220, 210, 200);
      doc.text(`${top} · ${eq ? eq.nome.toUpperCase() : local}`, 38, 30);
      doc.setFontSize(7.5); doc.setTextColor(170, 160, 150); doc.text(`Cronograma marcado por ${adm.nome}`, 38, 34.5, { maxWidth: 150 });
      // resumo em "cartões" à direita
      let x = W - 12;
      [...resumo].reverse().forEach(([lbl, val, cor]) => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); const wv = doc.getTextWidth(val);
        doc.setFontSize(6.5); const wl = doc.getTextWidth(lbl.toUpperCase()) + 0.6 * lbl.length * 0.35;
        const w = Math.max(wv, wl) + 8; x -= w;
        doc.setFillColor(...NAVY); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.25); doc.roundedRect(x, 9, w, 19, 2, 2, "FD");
        doc.setTextColor(230, 220, 210); doc.text(lbl.toUpperCase(), x + 4, 15, { charSpace: 0.35 });
        doc.setFontSize(13); doc.setTextColor(...(cor || [255, 255, 255])); doc.text(val, x + 4, 23.5);
        x -= 3;
      });
    } else {
      if (logo) try { doc.addImage(logo, "PNG", 10, 2.2, 9.1, 11.5, "logo"); } catch (e) {}
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text(`CRONOGRAMA ${d.nome}`, 23, 9.8);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(220, 210, 200);
      doc.text(`${top}${eq ? " · " + eq.nome : ""} · ADM: ${adm.nome} · continuação`, 23 + doc.getTextWidth(`CRONOGRAMA ${d.nome}`) * 11 / 8 + 4, 9.8);
    }
  };
  let n = 0;
  adms.forEach(adm => { admAtual = adm; const M = cronoMarcas(adm); dias.forEach(d => {
    if (n++) doc.addPage();
    const feitos = d.itens.filter(i => M[i.id] && M[i.id].fim).length;
    const ultimo = [...d.itens].reverse().find(i => M[i.id] && M[i.id].ini);
    const at = ultimo && ultimo.hora ? atrasoDe(ultimo.hora, M[ultimo.id].ini) : null;
    const resumo = [["ADM", adm.nome, [255, 170, 100]], ["Concluídos", `${feitos}/${d.itens.length}`], ["Atraso atual", at == null ? "-" : limpa(fmtDif(at)), at == null ? null : at > 10 ? [255, 140, 120] : at > 0 ? [255, 205, 120] : [140, 230, 180]]];
    const paginaInicial = doc.getNumberOfPages();
    cabecalho(d, true, resumo);
    // legenda
    let lx = 12; doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
    [["predica", "Prédica"], ["refeicao", "Refeição"], ["destaque", "Destaque"], ["especial", "Especial"]].forEach(([k, l]) => {
      doc.setFillColor(...COR[k]); doc.roundedRect(lx, 43.2, 3, 3, 0.6, 0.6, "F"); doc.setTextColor(...CINZA); doc.text(l, lx + 4.2, 45.6); lx += doc.getTextWidth(l) + 10;
    });
    doc.setTextColor(...CINZA); doc.text(`Gerado em ${gerado} por ${ME.adm || "ADM"}`, W - 12, 45.6, { align: "right" });
    const linhas = d.itens.map(i => { const m = M[i.id] || {}; const a = m.ini && i.hora ? atrasoDe(i.hora, m.ini) : null;
      return [i.hora || "", m.ini || "", m.fim || "", a == null ? "" : limpa(fmtDif(a)), i.atv || "", i.local || "", i.form || "", i.resp || "",
        [...new Set([m.iniPor, m.fimPor].filter(Boolean).map(x => x.split(" ")[0]))].join(", ")]; });
    doc.autoTable({
      startY: 49, margin: { left: 12, right: 12, top: 22, bottom: 14 },
      head: [["PREVISTO", "INÍCIO", "FIM", "ATRASO", "ATIVIDADE", "LOCAL", "FORMAÇÃO", "RESPONSÁVEL", "MARCADO POR"]],
      body: linhas, theme: "plain",
      styles: { font: "helvetica", fontSize: 7.6, cellPadding: { top: 1.9, bottom: 1.9, left: 2, right: 2 }, textColor: TINTA, valign: "middle", lineColor: LINHA, lineWidth: { bottom: 0.2 } },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7, cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 }, lineWidth: 0 },
      alternateRowStyles: { fillColor: CREME },
      columnStyles: { 0: { cellWidth: 17, fontStyle: "bold", halign: "center", fontSize: 8.6 }, 1: { cellWidth: 16, halign: "center", fontStyle: "bold" }, 2: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 17, halign: "center", fontStyle: "bold" }, 4: { cellWidth: 82, fontStyle: "bold" }, 5: { cellWidth: 27 }, 6: { cellWidth: 29 }, 7: { cellWidth: 45 }, 8: { cellWidth: "auto", textColor: CINZA } },
      didParseCell: c => {
        if (c.section === "head") { if (c.column.index >= 1 && c.column.index <= 3) c.cell.styles.fillColor = [40, 24, 10]; if (c.column.index <= 3) c.cell.styles.halign = "center"; return; }
        const i = d.itens[c.row.index], t = i && i.tipo;
        if (t && COR[t]) c.cell.styles.fillColor = mistura(COR[t], 0.2);
        if (c.column.index === 0 && t && COR[t]) c.cell.styles.textColor = t === "especial" ? TINTA : COR[t].map(v => Math.round(v * 0.75));
        if ((c.column.index === 1 || c.column.index === 2) && c.cell.raw) c.cell.styles.textColor = VERDE;
        if (c.column.index === 3 && c.cell.raw) { const v = c.cell.raw; const mins = /h/.test(v) ? 99 : parseInt(v.slice(1)) || 0; c.cell.styles.textColor = /^\+/.test(v) ? (mins > 10 ? VERM : AMBAR) : VERDE; }
      },
      didDrawCell: c => {
        // traço colorido à esquerda das linhas de prédica, refeição etc.
        if (c.section === "body" && c.column.index === 0) { const t = (d.itens[c.row.index] || {}).tipo; if (t && COR[t]) { doc.setFillColor(...COR[t]); doc.rect(c.cell.x, c.cell.y, 1.4, c.cell.height, "F"); } }
      },
      didDrawPage: () => { if (doc.getNumberOfPages() > paginaInicial) cabecalho(d, false); },
    });
  }); });
  const pg = doc.getNumberOfPages();
  for (let i = 1; i <= pg; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LARANJA); doc.setLineWidth(0.5); doc.line(12, H - 9.5, W - 12, H - 9.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...TINTA); doc.text("ADM 3COLINAS", 12, H - 5.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...CINZA); doc.text(`Legendários Base 3 Colinas · ${top}${adms.length === 1 ? (equipeDe(adms[0].id) ? " · " + equipeDe(adms[0].id).nome : "") + " · ADM " + adms[0].nome : ""}`, 12 + doc.getTextWidth("ADM 3COLINAS") + 3, H - 5.5);
    doc.text(`Página ${i} de ${pg}`, W - 12, H - 5.5, { align: "right" });
  }
  const slug = t => norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const nome = `cronograma-${(qual === "todos" ? "completo" : dias[0].nome).toLowerCase()}-${slug(top)}${adms.length > 1 ? "-" + adms.length + "-adms" : "-" + slug(adms[0].nome)}.pdf`;
  const blob = doc.output("blob");
  const arq = typeof File === "function" ? new File([blob], nome, { type: "application/pdf" }) : null;
  // no celular abre o "compartilhar" (WhatsApp, e-mail…); no computador baixa o arquivo
  if (arq && navigator.canShare && navigator.canShare({ files: [arq] }) && matchMedia("(pointer: coarse)").matches) {
    try { await navigator.share({ files: [arq], title: `Cronograma ${top}` }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("PDF gerado: " + nome);
}
/* ---------- Consagração (40 dias) ----------
   Todo dia um ADM cola a lista de quem participou. Cada dia fica em config/consag-<AAAA-MM-DD> { dia, nomes[], por, em };
   o período (início e total de dias) fica em config/consag-cfg. A contagem junta os nomes iguais (sem acento/maiúscula). */
const CSG_RE = /^consag-(\d{4}-\d{2}-\d{2})$/;
const hojeISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const fmtDia = (iso, ano) => { const [a, m, d] = String(iso || "").split("-"); return d ? `${d}/${m}${ano ? "/" + a : ""}` : ""; };
const somaDias = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const difDias = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);
const csgCfg = () => { const c = (S.cfgDocs || {})["consag-cfg"] || {}; const dias = csgDias(); return { inicio: c.inicio || (dias[0] || {}).dia || hojeISO(), total: Number(c.total) || 40 }; };
function csgDias() {
  return Object.entries(S.cfgDocs || {}).map(([k, d]) => { const m = CSG_RE.exec(k); return m && { ...d, dia: m[1], nomes: d.nomes || [] }; })
    .filter(Boolean).sort((a, b) => a.dia < b.dia ? -1 : 1);
}
// nome bonito: "JOÃO DA SILVA" / "joão da silva" → "João da Silva" (se já veio com maiúsculas e minúsculas, mantém)
const PEQ = new Set(["da", "de", "do", "das", "dos", "e"]);
const capNome = n => n.includes("@") ? n.toLowerCase() : (n === n.toUpperCase() || n === n.toLowerCase())
  ? n.toLowerCase().split(" ").map((w, i) => i && PEQ.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : n;
// lê a lista colada (do WhatsApp, planilha ou bloco de notas): tira numeração, marcadores, emojis e repetidos
function lerNomesColados(txt) {
  const vistos = new Map();
  String(txt || "").split(/\r?\n|;|\t/).forEach(l => {
    let n = l.replace(/^\s*\[[^\]]{4,30}\]\s*[^:]{1,40}:\s*/, "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2705}\u{2714}\u{2713}]/gu, " ")
      .replace(/^[\s•*·>\-–—]*\d{1,3}\s*[.)\-–—ºª°:]?\s*/, "").replace(/^[\s•*·>\-–—]+/, "")
      .replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
    if (n.length < 3 || !/[a-zà-ú]/i.test(n) || /\d/.test(n) || /:$/.test(n)) return;
    if (/^(lista|consagra|presen|participantes|dia\b|hoje\b)/i.test(norm(n))) return;
    const k = norm(n); if (!vistos.has(k)) vistos.set(k, capNome(n));
  });
  return [...vistos.values()];
}
// contagem de presenças entre duas datas (inclusive)
/* Nomes unidos: config/consag-alias { map: { nome normalizado → nome que fica }, separados: ["a|b"] (sugestões dispensadas) } */
const csgAliasDoc = () => { const d = (S.cfgDocs || {})["consag-alias"] || {}; return { map: d.map || {}, separados: d.separados || [] }; };
function csgCanon(n) { const A = csgAliasDoc().map; let x = n; for (let i = 0; i < 8 && A[norm(x)] && norm(A[norm(x)]) !== norm(x); i++) x = A[norm(x)]; return x; }
function csgContagem(de, ate) {
  const dias = csgDias().filter(d => (!de || d.dia >= de) && (!ate || d.dia <= ate));
  const P = new Map();
  dias.forEach(d => { const hoje = new Set(); d.nomes.forEach(n => { const c = csgCanon(n), k = norm(c);
    const p = P.get(k) || { k, nome: c, n: 0, prim: d.dia, ult: d.dia, vari: new Set(), diasL: [] };
    if (norm(n) !== k) p.vari.add(n); else p.nome = n;
    if (!hoje.has(k)) { hoje.add(k); p.n++; p.ult = d.dia; p.diasL.push(d.dia); }   // os dois nomes no mesmo dia contam uma vez
    P.set(k, p); }); });
  const pessoas = [...P.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));   // sempre em ordem alfabética
  return { dias, pessoas, totalPres: dias.reduce((a, d) => a + d.nomes.length, 0) };
}
function vConsagracao() {
  const cfg = csgCfg(), hoje = hojeISO(), todos = csgDias();
  const F = S.csg || (S.csg = { de: "", ate: "", q: "" });
  const { dias, pessoas, totalPres } = csgContagem(F.de, F.ate);
  const nDia = Math.min(cfg.total, Math.max(0, difDias(cfg.inicio, hoje) + 1));
  const ultimo = todos[todos.length - 1], dHoje = todos.find(d => d.dia === hoje);
  const q = norm(F.q), lista = q ? pessoas.filter(p => norm(p.nome).includes(q)) : pessoas;
  const maxN = Math.max(1, dias.length), ed = podeEditar(), sus = csgSuspeitos();
  const periodo = F.de || F.ate ? `${F.de ? fmtDia(F.de) : "início"} a ${F.ate ? fmtDia(F.ate) : "hoje"}` : "período todo";
  return `
  <div class="head"><div><h2>Consagração</h2><p>${cfg.total} dias · começou em ${fmtDia(cfg.inicio, true)}${nDia ? ` · hoje é o <b>dia ${nDia} de ${cfg.total}</b>` : ""}. Cole todo dia a lista de quem participou: o app soma quantas vezes cada pessoa esteve.</p></div>
    <div class="actions"><button class="btn" type="button" data-act="csg-pdf">${ico("upload")} Exportar PDF</button>${ed ? `<button class="btn" type="button" data-act="csg-unir">${ico("group")} Unir nomes</button><button class="btn" type="button" data-act="csg-cfg">${ico("edit")} Período</button><button class="btn primary" type="button" data-act="csg-colar">${ico("paste")} Colar lista do dia</button>` : ""}</div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Dias com lista</span><span class="val num">${todos.length}<small style="font-size:18px;color:var(--muted)"> / ${cfg.total}</small></span><div class="bar good"><i style="width:${pct(todos.length, cfg.total)}%"></i></div></div>
    <div class="kpi"><span class="lbl">Pessoas diferentes</span><span class="val num">${fmtNum(pessoas.length)}</span><span class="sub">no ${esc(periodo)}</span></div>
    <div class="kpi"><span class="lbl">Média por dia</span><span class="val num">${dias.length ? Math.round(totalPres / dias.length) : "—"}</span><span class="sub num">${fmtNum(totalPres)} presenças em ${dias.length} dia(s)</span></div>
    <div class="kpi ${dHoje ? "" : "alert"}"><span class="lbl">Hoje</span><span class="val num">${dHoje ? dHoje.nomes.length : "—"}</span><span class="sub">${dHoje ? "por " + esc((dHoje.por || {}).nome || "ADM") : ultimo ? "lista ainda não colada · último dia " + fmtDia(ultimo.dia) : "nenhuma lista ainda"}</span></div>
  </div>
  ${todos.length ? `<section class="panel"><h3>Dias <small>toque para ver ou corrigir a lista</small></h3><div class="csg-dias">${[...todos].reverse().map(d => `<button type="button" class="csg-dia ${d.dia >= (F.de || "0") && d.dia <= (F.ate || "9") ? "" : "fora"}" data-csg-dia="${d.dia}"><b>${fmtDia(d.dia)}</b><span class="num">Dia ${difDias(cfg.inicio, d.dia) + 1}</span><span class="num">${d.nomes.length} pessoas</span></button>`).join("")}</div></section>` : ""}
  <section class="panel">
    <h3>Presenças <small>${esc(periodo)} · toque no nome para ver os dias</small></h3>
    ${sus.length ? `<div class="banner"><span>${ico("group")} <b>${sus.length}</b> nome(s) parecem ser da mesma pessoa.</span><button class="btn" type="button" data-act="csg-rep">Revisar</button></div>` : ""}
    <div class="csg-filtro">
      <label>De <input type="date" id="csgDe" value="${esc(F.de)}"></label>
      <label>Até <input type="date" id="csgAte" value="${esc(F.ate)}"></label>
      ${F.de || F.ate ? `<button class="btn sm" type="button" data-act="csg-todo">Período todo</button>` : ""}
      <div class="search" style="flex:1;min-width:180px">${ico("search")}<input id="csgQ" type="search" placeholder="Buscar nome" value="${esc(F.q)}" aria-label="Buscar nome"></div>
    </div>
    ${lista.length ? `<div class="csg-lista">${lista.map((p, i) => `<button type="button" class="csg-row" data-csg-pes="${esc(p.k)}"><span class="pos num">${i + 1}</span><span class="nm"><b>${esc(p.nome)}</b><small class="hint">desde ${fmtDia(p.prim)} · última ${fmtDia(p.ult)}${p.vari.size ? ` · também como ${esc([...p.vari].join(", "))}` : ""}</small></span>
      <span class="bar good" title="${pct(p.n, maxN)}% dos dias"><i style="width:${pct(p.n, maxN)}%"></i></span><span class="n num"><b>${p.n}</b>×</span></button>`).join("")}</div>`
      : `<div class="empty">${todos.length ? "Ninguém encontrado." : "Nenhuma lista colada ainda. Toque em <b>Colar lista do dia</b>."}</div>`}
  </section>`;
}
// palavras do nome (de um e-mail usa a parte antes do @: joao.silva@empresa.com → joao silva)
const csgToks = s => norm(String(s).includes("@") ? String(s).split("@")[0].replace(/[._\-+]+/g, " ").replace(/\d+/g, " ") : s).split(" ").filter(w => w.length > 1 && !PEQ.has(w));
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const at = [i]; for (let j = 1; j <= b.length; j++) at[j] = Math.min(ant[j] + 1, at[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); ant = at; }
  return ant[b.length];
}
// pares que parecem ser a mesma pessoa
function csgSuspeitos(pessoas = csgContagem().pessoas) {
  const sep = new Set(csgAliasDoc().separados), out = [];
  const T = pessoas.map(p => ({ p, t: csgToks(p.nome), s: norm(p.nome), mail: p.nome.includes("@") }));
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i], b = T[j]; if (!a.t.length || !b.t.length) continue;
    if (sep.has([a.p.k, b.p.k].sort().join("|"))) continue;
    const [m, M] = a.t.length <= b.t.length ? [a.t, b.t] : [b.t, a.t];
    let por = "";
    if ((a.mail || b.mail) && a.t.join(" ") === b.t.join(" ")) por = "mesmo nome no e-mail";
    else if (a.mail && b.mail && a.s.split("@")[0] === b.s.split("@")[0]) por = "mesmo e-mail com outro domínio";
    else if (m[0] === M[0] && m.length >= 1 && m.every(w => M.includes(w)) && (m.length >= 2 || a.mail || b.mail)) por = "um nome está dentro do outro";
    else if (m.length >= 2 && m[0] === M[0] && m[m.length - 1] === M[M.length - 1]) por = "mesmo primeiro e último nome";
    else if (a.s.length >= 6 && levenshtein(a.s, b.s) <= 2) por = "escrita parecida";
    else if ((a.mail || b.mail) && m.length >= 2 && m.every(w => M.includes(w))) por = "nome parecido com o e-mail";
    if (por) out.push({ a: a.p, b: b.p, por });
  }
  return out;
}
function csgUnir(fica, sai, msg) {
  const A = csgAliasDoc(), map = { ...A.map };
  const destino = csgCanon(fica);
  map[norm(sai)] = destino; delete map[norm(destino)];
  Object.keys(map).forEach(k => { if (norm(map[k]) === norm(sai)) map[k] = destino; });   // quem apontava para o nome que saiu passa a apontar para o que fica
  save(() => api.set("config", "consag-alias", { map, separados: A.separados }), msg || `${sai} unido com ${destino}`);
}
function csgSeparar(variante) {
  const A = csgAliasDoc(), map = { ...A.map }; delete map[norm(variante)];
  save(() => api.set("config", "consag-alias", { map, separados: A.separados }), `${variante} separado`);
}
function csgDispensar(a, b) {
  const A = csgAliasDoc(), separados = [...new Set([...A.separados, [a.k, b.k].sort().join("|")])];
  save(() => api.set("config", "consag-alias", { map: A.map, separados }), "Ok, ficam separados");
}
function csgRepForm() {
  const sus = csgSuspeitos(), ed = podeEditar();
  if (!sus.length) { closeModal(); toast("Nenhum nome parecido para revisar."); return; }
  modal(`
    <h3>Nomes que parecem repetidos <small class="hint">${sus.length}</small></h3>
    <p class="hint" style="margin:0">Escolha o nome que fica e toque em <b>Unir</b>: as presenças passam a contar juntas (no mesmo dia, conta uma vez). Se não for a mesma pessoa, toque em <b>Não é a mesma</b>.</p>
    <div class="csg-sus">${sus.map((x, i) => `<div class="csg-par">
      <small class="hint">${esc(x.por)}</small>
      <label><input type="radio" name="fica${i}" value="a" ${x.a.n >= x.b.n ? "checked" : ""}> <b>${esc(x.a.nome)}</b> <span class="num hint">${x.a.n}×</span></label>
      <label><input type="radio" name="fica${i}" value="b" ${x.a.n < x.b.n ? "checked" : ""}> <b>${esc(x.b.nome)}</b> <span class="num hint">${x.b.n}×</span></label>
      ${ed ? `<div class="actions"><button class="btn sm" type="button" data-sus-nao="${i}">Não é a mesma</button><button class="btn sm primary" type="button" data-sus-unir="${i}">Unir</button></div>` : ""}</div>`).join("")}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn primary" type="button" data-close-btn>Fechar</button></div></div>`, () => {});
  const f = $("#mform");
  f.querySelectorAll("[data-sus-unir]").forEach(b => b.onclick = () => { const x = sus[+b.dataset.susUnir], fa = f.querySelector(`[name=fica${b.dataset.susUnir}]:checked`).value === "a";
    csgUnir(fa ? x.a.nome : x.b.nome, fa ? x.b.nome : x.a.nome); setTimeout(csgRepForm, 350); });
  f.querySelectorAll("[data-sus-nao]").forEach(b => b.onclick = () => { const x = sus[+b.dataset.susNao]; csgDispensar(x.a, x.b); setTimeout(csgRepForm, 350); });
}
// unir na mão: escolhe o nome que fica e o(s) que entram nele
function csgUnirForm(pre) {
  const { pessoas } = csgContagem();
  // cada lado é uma lista com lupa: digita parte do nome (ou do e-mail) e toca na pessoa
  const lado = (id, titulo) => `<div class="csg-lado"><label class="lab" for="${id}q">${titulo}</label>
      <label class="search">${ico("search")}<input id="${id}q" type="search" placeholder="Pesquisar nome" autocomplete="off"></label>
      <div class="csg-pick" id="${id}">${pessoas.map(p => `<label data-n="${esc(norm(p.nome))}"><input type="radio" name="${id}" value="${esc(p.nome)}" ${pre && p.nome === pre && id === "uf" ? "checked" : ""}> <span>${esc(p.nome)}</span> <small class="hint num">${p.n}×</small></label>`).join("")}
        <p class="hint vazio" hidden>Nenhum nome encontrado.</p></div></div>`;
  modal(`
    <h3>Unir nomes</h3>
    <p class="hint" style="margin:0">Use quando a mesma pessoa aparece com nomes diferentes (por exemplo, o Gmail dela e o e-mail da empresa). As presenças passam a contar juntas e dá para separar de novo depois.</p>
    ${lado("uf", "Nome que fica")}
    ${lado("us", "Juntar com")}
    <p class="hint" id="csgUnirResumo" style="margin:0"></p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Unir</button></div></div>`,
  () => { const v = n => (($(`#mform [name=${n}]:checked`) || {}).value || ""), fica = v("uf"), sai = v("us");
    if (!fica || !sai || norm(sai) === norm(fica)) { toast("Escolha dois nomes diferentes."); return; }
    closeModal(); csgUnir(fica, sai); });
  const f = $("#mform");
  ["uf", "us"].forEach(id => {
    const q = $("#" + id + "q"), box = $("#" + id);
    q.addEventListener("input", () => { const t = norm(q.value); let n = 0;
      box.querySelectorAll("label[data-n]").forEach(l => { const ok = !t || l.dataset.n.includes(t); l.hidden = !ok; if (ok) n++; });
      box.querySelector(".vazio").hidden = !!n; });
  });
  const resumo = () => { const v = n => ((f.querySelector(`[name=${n}]:checked`) || {}).value || "");
    $("#csgUnirResumo").innerHTML = v("uf") && v("us") ? `<b>${esc(v("us"))}</b> vai contar como <b>${esc(v("uf"))}</b>.` : ""; };
  f.addEventListener("change", resumo);
  const sel = f.querySelector("[name=uf]:checked"); if (sel) sel.closest("label").scrollIntoView({ block: "nearest" });
  $(pre ? "#usq" : "#ufq").focus();
}
// ficha da pessoa: dias em que veio, outros nomes dela, unir e separar
function csgPessoaForm(k) {
  const p = csgContagem().pessoas.find(x => x.k === k); if (!p) return;
  const ed = podeEditar(), cfg = csgCfg();
  const parecidos = csgSuspeitos().filter(x => x.a.k === k || x.b.k === k).map(x => x.a.k === k ? x.b : x.a);
  modal(`
    <h3>${esc(p.nome)} <small class="hint num">${p.n}×</small></h3>
    <p class="hint" style="margin:0">Participou em ${p.n} dia(s) · desde ${fmtDia(p.prim)} · última ${fmtDia(p.ult)}</p>
    <div class="csg-nomes">${p.diasL.map(d => `<span class="chip ok">${fmtDia(d)} · dia ${difDias(cfg.inicio, d) + 1}</span>`).join("")}</div>
    ${p.vari.size ? `<h4 style="margin:6px 0 0">Também aparece como</h4><div class="csg-nomes">${[...p.vari].map(v => `<span class="chip">${esc(v)}${ed ? ` <button class="linkbtn" type="button" data-csg-sep="${esc(v)}">Separar</button>` : ""}</span>`).join("")}</div>` : ""}
    ${parecidos.length ? `<h4 style="margin:6px 0 0">Parecidos</h4><div class="csg-nomes">${parecidos.map(o => `<span class="chip wait">${esc(o.nome)} · ${o.n}×${ed ? ` <button class="linkbtn" type="button" data-csg-junta="${esc(o.nome)}">Unir</button>` : ""}</span>`).join("")}</div>` : ""}
    <div class="modal-foot"><span></span><div class="actions">${ed ? `<button class="btn" type="button" id="csgUnirOutro">Unir com outro nome</button>` : ""}<button class="btn primary" type="button" data-close-btn>Fechar</button></div></div>`, () => {});
  const f = $("#mform");
  f.querySelectorAll("[data-csg-sep]").forEach(b => b.onclick = () => { closeModal(); csgSeparar(b.dataset.csgSep); });
  f.querySelectorAll("[data-csg-junta]").forEach(b => b.onclick = () => { closeModal(); csgUnir(p.nome, b.dataset.csgJunta); });
  const u = $("#csgUnirOutro"); if (u) u.onclick = () => csgUnirForm(p.nome);
}
function csgColarForm(dia) {
  const ex = (S.cfgDocs || {})["consag-" + (dia || hojeISO())];
  modal(`
    <h3>Colar lista da consagração</h3>
    <div class="form">
      <div class="field"><label for="f-csgdia">Dia</label><input type="date" id="f-csgdia" value="${esc(dia || hojeISO())}" max="${hojeISO()}"></div>
      <div class="field"><label for="f-csghora">Hora da chamada na live</label><input type="time" id="f-csghora" value="${esc((ex || {}).hora || "")}"></div>
    </div>
    <div class="field"><label for="f-csgtxt">Lista de participantes</label><textarea id="f-csgtxt" rows="10" placeholder="Cole aqui a lista do grupo (um nome por linha). Numeração, emojis e nomes repetidos são ignorados."></textarea></div>
    <p class="hint" id="csgPrev" style="margin:0">${ex ? `Esse dia já tem ${ex.nomes.length} nome(s): o que você colar será somado.` : "Nenhuma linha ainda."}</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar lista</button></div></div>`,
  () => {
    const d = $("#f-csgdia").value, nomes = lerNomesColados($("#f-csgtxt").value), hora = $("#f-csghora").value;
    if (!d) { toast("Escolha o dia."); return; }
    if (!nomes.length) { toast("Nenhum nome encontrado na lista."); return; }
    const atual = ((S.cfgDocs || {})["consag-" + d] || {}).nomes || [], ks = new Set(atual.map(norm));
    const novos = nomes.filter(n => !ks.has(norm(n)));
    closeModal();
    const horaAntes = ((S.cfgDocs || {})["consag-" + d] || {}).hora || "";
    save(() => api.set("config", "consag-" + d, { dia: d, nomes: [...atual, ...novos], hora: hora || horaAntes, por: eu(), em: new Date().toISOString() }),
      `${fmtDia(d)}: ${novos.length} nome(s) salvos${nomes.length - novos.length ? ` · ${nomes.length - novos.length} já estavam` : ""}`);
  });
  const prev = () => { const d = $("#f-csgdia").value, n = lerNomesColados($("#f-csgtxt").value), at = (((S.cfgDocs || {})["consag-" + d] || {}).nomes || []).map(norm);
    const novos = n.filter(x => !at.includes(norm(x))).length;
    $("#csgPrev").textContent = n.length ? `${n.length} nome(s) encontrados${at.length ? ` · ${novos} novos neste dia, ${n.length - novos} já estavam` : ""}: ${n.slice(0, 6).join(", ")}${n.length > 6 ? "…" : ""}` : at.length ? `Esse dia já tem ${at.length} nome(s): o que você colar será somado.` : "Nenhuma linha ainda."; };
  $("#f-csgtxt").addEventListener("input", prev);
  $("#f-csgdia").addEventListener("change", () => { prev(); $("#f-csghora").value = ((S.cfgDocs || {})["consag-" + $("#f-csgdia").value] || {}).hora || ""; });
}
function csgDiaForm(dia) {
  const d = (S.cfgDocs || {})["consag-" + dia]; if (!d) return;
  const ed = podeEditar(); let nomes = [...(d.nomes || [])].sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" })), hora = d.hora || "";
  const corpo = () => `
    <h3>Consagração · ${fmtDia(dia, true)} <small class="hint">Dia ${difDias(csgCfg().inicio, dia) + 1}</small></h3>
    <p class="hint" style="margin:0">${nomes.length} pessoa(s) · lista colada por ${esc((d.por || {}).nome || "ADM")}${!ed && hora ? ` · chamada na live às ${esc(hora)}` : ""}${ed ? ". Toque no ✕ para tirar um nome." : ""}</p>
    ${ed ? `<div class="field" style="max-width:220px"><label for="f-csghora">Hora da chamada na live</label><input type="time" id="f-csghora" value="${esc(hora)}"></div>` : ""}
    <div class="csg-nomes">${nomes.map((n, i) => `<span class="chip">${esc(n)}${ed ? ` <button class="linkbtn" type="button" data-csgrm="${i}" aria-label="Tirar ${esc(n)}">✕</button>` : ""}</span>`).join("")}</div>
    <div class="modal-foot">${ed ? `<button class="btn ghost bad-text" type="button" id="csgApagar">Apagar este dia</button>` : "<span></span>"}<div class="actions">
      <button class="btn" type="button" id="csgPdfDia">${ico("upload")} PDF do dia</button>${ed ? `<button class="btn" type="button" id="csgMais">${ico("paste")} Colar mais</button><button class="btn primary" type="submit">Salvar</button>` : `<button class="btn primary" type="button" data-close-btn>Fechar</button>`}</div></div>`;
  modal(corpo(), () => { closeModal(); if (ed) save(() => api.update("config", "consag-" + dia, { nomes, hora }), "Lista atualizada"); });
  const f = $("#mform");
  const ligar = () => {
    f.querySelectorAll("[data-csgrm]").forEach(b => b.onclick = () => { nomes.splice(+b.dataset.csgrm, 1); f.innerHTML = corpo(); ligar(); });
    const h = $("#f-csghora"); if (h) h.oninput = () => { hora = h.value; };
    const ap = $("#csgApagar"); if (ap) ap.onclick = () => { if (ap.dataset.ok !== "1") { ap.dataset.ok = "1"; ap.textContent = "Confirmar: apagar o dia"; return; } closeModal(); save(() => api.remove("config", "consag-" + dia), "Dia apagado"); };
    const mais = $("#csgMais"); if (mais) mais.onclick = () => csgColarForm(dia);
    $("#csgPdfDia").onclick = () => csgPdfForm(dia);
  };
  ligar();
}
function csgCfgForm() {
  const c = csgCfg();
  modal(`
    <h3>Período da consagração</h3>
    <div class="form">
      <div class="field"><label for="f-csgini">Primeiro dia</label><input type="date" id="f-csgini" value="${esc(c.inicio)}"></div>
      <div class="field"><label for="f-csgtot">Quantidade de dias</label><input type="number" id="f-csgtot" min="1" max="365" value="${c.total}" inputmode="numeric"></div>
    </div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  () => { const inicio = $("#f-csgini").value, total = Math.max(1, Number($("#f-csgtot").value) || 40); closeModal();
    save(() => api.set("config", "consag-cfg", { inicio, total }), "Período salvo"); });
}
function csgPdfForm(diaFixo) {
  const todos = csgDias(), F = S.csg || {};
  if (!todos.length) { toast("Ainda não tem nenhuma lista colada."); return; }
  const ult = (todos.find(d => d.dia === diaFixo) || todos[todos.length - 1]).dia;
  modal(`
    <h3>Exportar Lista Consagração</h3>
    <div class="seg" role="group" aria-label="O que exportar" id="csgModo"><button type="button" data-m="dia" aria-pressed="true">Um dia</button><button type="button" data-m="per" aria-pressed="false">Período</button></div>
    <div class="form" id="csgBoxDia">
      <div class="field"><label for="f-pdd">Dia</label><select id="f-pdd">${[...todos].reverse().map(d => `<option value="${d.dia}" ${d.dia === ult ? "selected" : ""}>${fmtDia(d.dia, true)} · Dia ${difDias(csgCfg().inicio, d.dia) + 1} · ${d.nomes.length} pessoas</option>`).join("")}</select></div>
      <div class="field"><label for="f-pdhora">Hora da chamada na live</label><input type="time" id="f-pdhora" value="${esc((todos.find(d => d.dia === ult) || {}).hora || "")}"></div>
    </div>
    <div class="form" id="csgBoxPer" hidden>
      <div class="field"><label for="f-pde">De</label><input type="date" id="f-pde" value="${esc(F.de || todos[0].dia)}"></div>
      <div class="field"><label for="f-pate">Até</label><input type="date" id="f-pate" value="${esc(F.ate || todos[todos.length - 1].dia)}"></div>
    </div>
    <p class="hint" style="margin:0">O PDF traz o nome de cada pessoa e quantas vezes participou. No celular, <b>Enviar no WhatsApp</b> abre o WhatsApp com o PDF anexado.</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn" type="submit" id="csgBaixar">${ico("upload")} Baixar PDF</button><button class="btn primary" type="button" id="csgWa">${ico("wa")} Enviar no WhatsApp</button></div></div>`,
  () => gerar(false));
  let modo = "dia";
  $("#csgModo").onclick = e => { const b = e.target.closest("[data-m]"); if (!b) return; modo = b.dataset.m;
    $("#csgModo").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); $("#csgBoxDia").hidden = modo !== "dia"; $("#csgBoxPer").hidden = modo === "dia"; };
  $("#csgWa").onclick = () => gerar(true);
  $("#f-pdd").onchange = () => { $("#f-pdhora").value = (todos.find(d => d.dia === $("#f-pdd").value) || {}).hora || ""; };
  async function gerar(wa) {
    const de = modo === "dia" ? $("#f-pdd").value : $("#f-pde").value, ate = modo === "dia" ? de : $("#f-pate").value;
    if (!de || !ate || de > ate) { toast("Confira as datas do período."); return; }
    const bts = [$("#csgBaixar"), $("#csgWa")]; bts.forEach(b => b.disabled = true);
    const hora = modo === "dia" ? $("#f-pdhora").value : "";
    // a hora digitada aqui fica salva no dia (quem pode editar)
    if (modo === "dia" && podeEditar() && hora !== ((todos.find(d => d.dia === de) || {}).hora || "")) api.update("config", "consag-" + de, { hora }).catch(e => console.error(e));
    try { await gerarCsgPdf(modo, de, ate, wa, hora); closeModal(); }
    catch (e) { console.error(e); toast(erroAmigavel(e)); bts.forEach(b => b.disabled = false); }
  }
}
// entrega o PDF: "Enviar no WhatsApp" abre o compartilhar do celular (o WhatsApp recebe o arquivo);
// onde não dá para anexar (computador), baixa o PDF e abre o WhatsApp com a mensagem para anexar
async function entregarPdf(blob, nome, titulo, wa) {
  const arq = typeof File === "function" ? new File([blob], nome, { type: "application/pdf" }) : null;
  const podeArq = arq && navigator.canShare && navigator.canShare({ files: [arq] });
  if (podeArq && (wa || matchMedia("(pointer: coarse)").matches)) {
    try { await navigator.share({ files: [arq], title: titulo, text: wa ? titulo : undefined }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  if (wa) { window.open("https://wa.me/?text=" + encodeURIComponent(titulo + " (PDF baixado: " + nome + ")"), "_blank"); toast("PDF baixado. Anexe no WhatsApp que abriu."); }
  else toast("PDF gerado: " + nome);
}
async function gerarCsgPdf(modo, de, ate, wa, hora = "") {
  const jsPDF = await carregarPdf();
  const cfg = csgCfg(), { dias, pessoas, totalPres } = csgContagem(modo === "dia" ? null : de, ate);
  const doDia = modo === "dia" ? (csgDias().find(d => d.dia === de) || { nomes: [] }) : null;
  // no PDF do dia: quem veio naquele dia e quantas vezes já participou até ele
  const linhas = doDia ? [...new Set(doDia.nomes.map(n => norm(csgCanon(n))))].map(k => pessoas.find(p => p.k === k) || { nome: k, n: 1, prim: de, ult: de }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    : pessoas;
  const [logo, faixa] = await Promise.all([imagemDataUrl("assets/logo.png"), faixaPdf()]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const NAVY = [11, 17, 25], LARANJA = [255, 122, 26], TINTA = [30, 20, 11], CINZA = [123, 101, 83], LINHA = [241, 220, 199], CREME = [255, 248, 242], VERDE = [29, 138, 85];
  const gerado = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const adm = ME.adm || "-";
  const nDia = d => difDias(cfg.inicio, d) + 1;
  const sub = doDia ? `${fmtDia(de, true)} · DIA ${nDia(de)} DE ${cfg.total}` : `${fmtDia(de, true)} A ${fmtDia(ate, true)} · ${dias.length} DIA(S) COM LISTA`;
  const resumo = doDia ? [["ADM responsável", adm, [255, 170, 100]], ["Chamada na live", hora ? hora.replace(":", "h") : "-"], ["Participantes", String(linhas.length)]]
    : [["ADM responsável", adm, [255, 170, 100]], ["Pessoas", String(pessoas.length)], ["Média/dia", dias.length ? String(Math.round(totalPres / dias.length)) : "-"]];
  const cabecalho = primeira => {
    const alt = primeira ? 44 : 16;
    doc.setFillColor(...NAVY); doc.rect(0, 0, W, alt, "F");
    if (faixa) { doc.saveGraphicsState(); doc.rect(0, 0, W, alt, null); doc.clip(); doc.discardPath();
      const h = W * 330 / 2400 * 1.6; doc.addImage(faixa, "JPEG", W - h * 2400 / 330, primeira ? 0 : -6, h * 2400 / 330, h, "faixa", "FAST"); doc.restoreGraphicsState(); }
    doc.setFillColor(...LARANJA); doc.rect(0, alt, W, 1.2, "F");
    if (primeira) {
      if (logo) try { doc.addImage(logo, "PNG", 12, 7, 18.2, 23, "logo"); } catch (e) {}
      doc.setTextColor(...LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("ADM 3COLINAS  ·  LEGENDÁRIOS BASE 3 COLINAS", 35, 12, { charSpace: 0.5 });
      doc.setTextColor(255, 255, 255); doc.setFontSize(21); doc.text("LISTA CONSAGRAÇÃO", 35, 22);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(220, 210, 200); doc.text(sub, 35, 28.5);
      doc.setFontSize(7.5); doc.setTextColor(170, 160, 150); doc.text(`${cfg.total} dias de consagração · ADM responsável: ${adm}`, 35, 33);
      // resumo em "cartões" logo abaixo da faixa (no retrato não cabe ao lado do título)
      const wc = (W - 24 - (resumo.length - 1) * 4) / resumo.length;
      resumo.forEach(([lbl, val, cor], k) => {
        const x = 12 + k * (wc + 4);
        doc.setFillColor(...CREME); doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.roundedRect(x, 50, wc, 16, 2, 2, "FD");
        doc.setFillColor(...(cor ? LARANJA : NAVY)); doc.rect(x, 52, 1.2, 12, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...CINZA); doc.text(lbl.toUpperCase(), x + 5, 55.5, { charSpace: 0.3 });
        doc.setFontSize(13); doc.setTextColor(...TINTA); doc.text(val, x + 5, 62.5, { maxWidth: wc - 7 });
      });
    } else {
      if (logo) try { doc.addImage(logo, "PNG", 10, 2.2, 9.1, 11.5, "logo"); } catch (e) {}
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text("LISTA CONSAGRAÇÃO", 23, 9.6);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(220, 210, 200); doc.text(`${sub} · ADM ${adm} · continuação`, 23 + doc.getTextWidth("LISTA CONSAGRAÇÃO") * 10.5 / 7.5 + 4, 9.6);
    }
  };
  cabecalho(true);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...CINZA);
  doc.text(doDia ? `Quem participou no dia · ${linhas.length} pessoa(s)${hora ? ` · chamada na live às ${hora.replace(":", "h")}` : ""}` : `Presenças no período · ${fmtNum(totalPres)} no total`, 12, 73);
  doc.text(`Gerado em ${gerado} por ${adm}`, W - 12, 73, { align: "right" });
  const base = doDia ? nDia(de) : Math.max(1, dias.length);
  doc.autoTable({
    startY: 76, margin: { left: 12, right: 12, top: 22, bottom: 14 }, theme: "plain",
    head: doDia ? [["#", "NOME"]] : [["#", "NOME", "PRESENÇAS", "FREQUÊNCIA", "ÚLTIMA VEZ"]],
    body: linhas.map((p, i) => doDia ? [String(i + 1), p.nome] : [String(i + 1), p.nome, String(p.n), pct(p.n, base) + "%", fmtDia(p.ult)]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 }, textColor: TINTA, valign: "middle", lineColor: LINHA, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 }, lineWidth: 0 },
    alternateRowStyles: { fillColor: CREME },
    columnStyles: { 0: { cellWidth: 12, halign: "center", textColor: CINZA }, 1: { cellWidth: "auto", fontStyle: "bold" }, 2: { cellWidth: 26, halign: "center", fontStyle: "bold" }, 3: { cellWidth: 30, halign: "center" }, 4: { cellWidth: 26, halign: "center", textColor: CINZA } },
    didParseCell: c => {
      if (c.section === "head") { if (c.column.index === 2) c.cell.styles.fillColor = [40, 24, 10]; if (c.column.index !== 1) c.cell.styles.halign = "center"; return; }
      if (c.column.index === 2 && !doDia) c.cell.styles.textColor = LARANJA.map(v => Math.round(v * 0.82));
      if (c.column.index === 3 && !doDia) { const v = parseInt(c.cell.raw) || 0; c.cell.styles.textColor = v >= 75 ? VERDE : v >= 40 ? [168, 111, 0] : CINZA; }
    },
    didDrawPage: () => { if (doc.getNumberOfPages() > 1 && doc.internal.getCurrentPageInfo().pageNumber > 1) cabecalho(false); },
  });
  const pg = doc.getNumberOfPages();
  for (let i = 1; i <= pg; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LARANJA); doc.setLineWidth(0.5); doc.line(12, H - 9.5, W - 12, H - 9.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...TINTA); doc.text("ADM 3COLINAS", 12, H - 5.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...CINZA); doc.text(`Lista Consagração · ${sub.toLowerCase()} · ADM ${adm}`, 12 + doc.getTextWidth("ADM 3COLINAS") + 3, H - 5.5);
    doc.text(`Página ${i} de ${pg}`, W - 12, H - 5.5, { align: "right" });
  }
  const dd = d => fmtDia(d, true).replace(/\//g, "-");
  const nome = `Lista consagracao ${doDia ? dd(de) : dd(de) + " a " + dd(ate)}.pdf`;
  await entregarPdf(doc.output("blob"), nome, `Lista Consagração ${doDia ? fmtDia(de, true) : fmtDia(de, true) + " a " + fmtDia(ate, true)}`, wa);
}
/* ---------- Exportar PDF de qualquer página ----------
   Cada página monta a lista do jeito que está na tela (com o filtro e a busca) e o PDF sai no visual do cronograma:
   faixa azul-marinho com a montanha, título, cartões de resumo e tabela. */
const PDF_COR = { NAVY: [11, 17, 25], LARANJA: [255, 122, 26], TINTA: [30, 20, 11], CINZA: [123, 101, 83], LINHA: [241, 220, 199], CREME: [255, 248, 242], VERDE: [29, 138, 85], AMBAR: [168, 111, 0], VERMELHO: [192, 57, 43] };
const simNao = v => v ? "Sim" : "Não";
const corStatus = t => /^(confirmado|apto|assinado|sim|ok|pronto|entregue|ativa|pago)/i.test(t) ? PDF_COR.VERDE
  : /^(zerado|não assinou|cancelad|bloquead)/i.test(t) ? PDF_COR.VERMELHO
  : /^(pendente|baixo|aguardando|msg enviada|em andamento|a fazer|não|conferir|boleto)/i.test(t) ? PDF_COR.AMBAR : null;
// versão "só nomes": fica o # e a coluna do nome (marcada com nome: true ou a primeira em negrito), em retrato
function pdfSimples(sp) {
  if (sp.simples) return { ...sp, orient: "portrait", arquivo: (sp.arquivo || sp.titulo) + " nomes", ...sp.simples };   // página que define o próprio PDF simples
  const ci = Math.max(0, sp.colunas.findIndex(c => c.nome)) || sp.colunas.findIndex(c => c.bold);
  const k = ci < 0 ? 0 : ci, so = ls => ls.map((l, i) => [String(i + 1), l[k]]);
  const total = sp.linhas ? sp.linhas.length : sp.secoes.reduce((a, x) => a + x.linhas.length, 0);
  return { ...sp, titulo: sp.titulo, orient: "portrait", arquivo: (sp.arquivo || sp.titulo) + " nomes", resumo: [["Total", total]],
    colunas: [{ t: "#", w: 12, al: "center", cinza: true }, { t: sp.colunas[k].t, bold: true }],
    linhas: sp.linhas && so(sp.linhas), secoes: sp.secoes && sp.secoes.map(x => ({ ...x, linhas: so(x.linhas) })) };
}
async function gerarListaPdf(sp, wa) {
  const jsPDF = await carregarPdf();
  const C = PDF_COR, retrato = sp.orient !== "landscape";
  const [logo, faixa] = await Promise.all([imagemDataUrl("assets/logo.png"), faixaPdf()]);
  const doc = new jsPDF({ orientation: retrato ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const adm = ME.adm || "-", gerado = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const titulo = sp.titulo.toUpperCase(), sub = (sp.sub || topName()).toUpperCase();
  const resumo = [["ADM responsável", adm, true], ...(sp.resumo || [])].slice(0, retrato ? 4 : 6);
  const cabecalho = primeira => {
    const alt = primeira ? 44 : 16;
    doc.setFillColor(...C.NAVY); doc.rect(0, 0, W, alt, "F");
    if (faixa) { doc.saveGraphicsState(); doc.rect(0, 0, W, alt, null); doc.clip(); doc.discardPath();
      const h = W * 330 / 2400 * 1.6; doc.addImage(faixa, "JPEG", W - h * 2400 / 330, primeira ? 0 : -6, h * 2400 / 330, h, "faixa", "FAST"); doc.restoreGraphicsState(); }
    doc.setFillColor(...C.LARANJA); doc.rect(0, alt, W, 1.2, "F");
    if (primeira) {
      if (logo) try { doc.addImage(logo, "PNG", 12, 7, 18.2, 23, "logo"); } catch (e) {}
      doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.text("ADM 3COLINAS  ·  LEGENDÁRIOS BASE 3 COLINAS", 35, 12, { charSpace: 0.5 });
      doc.setTextColor(255, 255, 255); doc.setFontSize(21); doc.text(titulo, 35, 22, { maxWidth: W - 47 });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(220, 210, 200); doc.text(sub, 35, 28.5, { maxWidth: W - 47 });
      doc.setFontSize(7.5); doc.setTextColor(170, 160, 150); doc.text(`${topName()} · ADM responsável: ${adm}`, 35, 33);
      const wc = (W - 24 - (resumo.length - 1) * 4) / resumo.length;
      resumo.forEach(([lbl, val, destaque], k) => {
        const x = 12 + k * (wc + 4);
        doc.setFillColor(...C.CREME); doc.setDrawColor(...C.LINHA); doc.setLineWidth(0.3); doc.roundedRect(x, 50, wc, 16, 2, 2, "FD");
        doc.setFillColor(...(destaque ? C.LARANJA : C.NAVY)); doc.rect(x, 52, 1.2, 12, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(...C.CINZA); doc.text(String(lbl).toUpperCase(), x + 5, 55.5, { charSpace: 0.3, maxWidth: wc - 7 });
        doc.setFontSize(13); doc.setTextColor(...C.TINTA); doc.text(String(val), x + 5, 62.5, { maxWidth: wc - 7 });
      });
    } else {
      if (logo) try { doc.addImage(logo, "PNG", 10, 2.2, 9.1, 11.5, "logo"); } catch (e) {}
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.text(titulo, 23, 9.6);
      const xt = 23 + doc.getTextWidth(titulo) + 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(220, 210, 200); doc.text(`${sub} · continuação`, xt, 9.6);
    }
  };
  cabecalho(true);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...C.CINZA);
  doc.text(sp.legenda || "", 12, 73, { maxWidth: W / 2 });
  doc.text(`Gerado em ${gerado} por ${adm}`, W - 12, 73, { align: "right" });
  const cols = sp.colunas, nc = cols.length;
  // seções (ex.: Família 01, Pré TOP): viram uma linha de título dentro da tabela
  const body = [];
  (sp.secoes || [{ linhas: sp.linhas }]).forEach(s => {
    if (s.titulo) body.push([{ content: s.titulo.toUpperCase(), colSpan: nc, styles: { fillColor: [40, 24, 10], textColor: [255, 200, 150], fontStyle: "bold", fontSize: 8 } }]);
    if (!s.linhas.length && s.titulo) body.push([{ content: "Nada aqui.", colSpan: nc, styles: { textColor: C.CINZA, fontStyle: "italic" } }]);
    s.linhas.forEach(l => body.push(l.map(v => v == null || v === "" ? "-" : String(v))));
  });
  if (!body.length) body.push([{ content: "Nada nesta lista.", colSpan: nc, styles: { textColor: C.CINZA, fontStyle: "italic", halign: "center" } }]);
  const colStyles = {};
  cols.forEach((c, i) => { colStyles[i] = { cellWidth: c.w || "auto", halign: c.al || "left", fontStyle: c.bold ? "bold" : "normal", textColor: c.cinza ? C.CINZA : C.TINTA }; });
  doc.autoTable({
    startY: 76, margin: { left: 12, right: 12, top: 22, bottom: 14 }, theme: "plain",
    head: [cols.map(c => c.t.toUpperCase())], body,
    styles: { font: "helvetica", fontSize: retrato ? 8.5 : 8, cellPadding: { top: 2, bottom: 2, left: 2.2, right: 2.2 }, textColor: C.TINTA, valign: "middle", lineColor: C.LINHA, lineWidth: { bottom: 0.2 }, overflow: "linebreak" },
    headStyles: { fillColor: C.NAVY, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7, cellPadding: { top: 2.6, bottom: 2.6, left: 2.2, right: 2.2 }, lineWidth: 0 },
    alternateRowStyles: { fillColor: C.CREME },
    columnStyles: colStyles,
    didParseCell: c => {
      if (c.section === "head") { c.cell.styles.halign = (cols[c.column.index] || {}).al || "left"; return; }
      const col = cols[c.column.index]; if (!col || !col.status || c.cell.colSpan > 1) return;
      const cor = corStatus(String(c.cell.raw || "")); if (cor) { c.cell.styles.textColor = cor; c.cell.styles.fontStyle = "bold"; }
    },
    didDrawPage: () => { if (doc.internal.getCurrentPageInfo().pageNumber > 1) cabecalho(false); },
  });
  const pg = doc.getNumberOfPages();
  for (let i = 1; i <= pg; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.LARANJA); doc.setLineWidth(0.5); doc.line(12, H - 9.5, W - 12, H - 9.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.TINTA); doc.text("ADM 3COLINAS", 12, H - 5.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.CINZA); doc.text(`${sp.titulo} · ${topName()} · ADM ${adm}`, 12 + doc.getTextWidth("ADM 3COLINAS") + 3, H - 5.5);
    doc.text(`Página ${i} de ${pg}`, W - 12, H - 5.5, { align: "right" });
  }
  const hoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const arq = `${sp.arquivo || sp.titulo} ${hoje}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w .-]/g, "");
  await entregarPdf(doc.output("blob"), arq, `${sp.titulo} · ${topName()}`, wa);
}
// o que cada página exporta (a lista como está na tela)
const filtroTxt = partes => partes.filter(Boolean).join(" · ") || "lista completa";
function pdfDaTela() {
  const v = S.view, n = (i, x) => [String(i + 1), ...x];
  const respTxt = p => p.adm ? p.adm + (p.admEm ? " · " + quando(p.admEm) : "") : "";
  if (v === "participantes" || v === "legendarios") {
    const lg = v === "legendarios", rows = filterPeople();
    const fil = { todos: "", atestado: "sem atestado", termo: "sem termo", grupo: "fora do grupo", 40: "+40", ok: "tudo OK", novos: "novos da última planilha", rep: "repetidos", canc: "compra cancelada" }[S.f.status];
    const filtro = filtroTxt([fil, S.f.adm && "ADM " + S.f.adm, S.f.q && `busca "${S.f.q}"`]);
    const insc = p => ({ cancelada: "Cancelada", pendente: "Boleto pendente" })[p.inscricao] || "";
    return { titulo: lg ? "Legendários" : "Senderistas", sub: `${topName()} · ${filtro}`, legenda: `${rows.length} ${lg ? "legendário(s)" : "senderista(s)"} · ${filtro}`, orient: "landscape",
      resumo: [["Na lista", rows.length], ["Atestado OK", rows.filter(p => atOk(p)).length], ["Termo OK", rows.filter(p => p.termo === "assinado").length], ...(lg ? [] : [["+40", rows.filter(is40).length], ["No grupo", rows.filter(p => p.noGrupo).length]])],
      colunas: lg ? [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "Telefone", w: 34 }, { t: "Equipe", w: 34 }, { t: "Atestado", w: 26, status: true }, { t: "Termo", w: 26, status: true }, { t: "Inscrição", w: 28, status: true }, { t: "Responsável", w: 40, cinza: true }]
        : [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true, nome: true }, { t: "Obs.", w: 26, cinza: true }, { t: "Telefone", w: 32 }, { t: "Cidade", w: 26 }, { t: "Atestado", w: 23, status: true }, { t: "Termo", w: 23, status: true }, { t: "Grupo", w: 14, al: "center", status: true }, { t: "NFC", w: 12, al: "center", status: true }, { t: "Fam.", w: 12, al: "center" }, { t: "Responsável", w: 32, cinza: true }],
      linhas: rows.map((p, i) => n(i, lg ? [p.nome, p.telefone, equipeTxt(p), opt(ATESTADO, p.atestado).l, opt(TERMO, p.termo).l, insc(p) || "Ativa", respTxt(p)]
        : [p.nome, [is40(p) ? "+40" : "", insc(p)].filter(Boolean).join(" · "), p.telefone, p.cidade, opt(ATESTADO, p.atestado).l, opt(TERMO, p.termo).l, simNao(p.noGrupo), simNao(p.nfc), p.familia ? String(p.familia).padStart(2, "0") : "", respTxt(p)])) };
  }
  if (v === "pendencias") {
    const quem = { participante: "Senderistas", legendario: "Legendários", todos: "Senderistas e legendários" }[S.pf.quem];
    if (abaPag()) {
      const rows = pagLista(), filtro = filtroTxt([quem, S.pf.adm && "ADM " + S.pf.adm]);
      return { titulo: "Pagamentos pendentes", sub: `${topName()} · ${filtro}`, legenda: `${rows.length} pessoa(s) com boleto pendente · ${filtro}`,
        resumo: [["Na lista", rows.length], ["Já avisados", rows.filter(p => p.cobradoPagEm).length], ["Sem telefone", rows.filter(p => !waNumber(p.telefone)).length]],
        colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "Tipo", w: 22 }, { t: "Telefone", w: 32 }, { t: "Responsável", w: 32, cinza: true }, { t: "Avisado", w: 26, status: true }],
        linhas: rows.map((p, i) => n(i, [p.nome, p.tipo === "legendario" ? "Legendário" : "Senderista", p.telefone, p.adm, p.cobradoPagEm ? quando(p.cobradoPagEm) : "Não"])) };
    }
    const rows = pendLista(), oq = { qualquer: "", atestado: "atestado", termo: "termo", grupo: "grupo" }[S.pf.oque];
    const filtro = filtroTxt([quem, oq && "só " + oq, S.pf.adm && "ADM " + S.pf.adm]);
    return { titulo: "Pendências", sub: `${topName()} · ${filtro}`, legenda: `${rows.length} pessoa(s) com pendência · ${filtro}`,
      resumo: [["Na lista", rows.length], ["Sem atestado", rows.filter(p => pendDe(p).includes("atestado")).length], ["Sem termo", rows.filter(p => pendDe(p).includes("termo")).length]],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "Tipo", w: 22 }, { t: "Telefone", w: 30 }, { t: "Falta", w: 38, status: true }, { t: "Responsável", w: 28, cinza: true }, { t: "Cobrado", w: 22, cinza: true }],
      linhas: rows.map((p, i) => n(i, [p.nome, p.tipo === "legendario" ? "Legendário" : "Senderista", p.telefone, "Pendente: " + listaE(pendDe(p).map(k => PEND[k])), p.adm, p.cobradoEm ? quando(p.cobradoEm) : "Não"])) };
  }
  if (v === "equipes") {
    const lgs = S.P.filter(p => p.tipo === "legendario" && !cancelado(p)), sem = lgs.filter(p => !p.equipe);
    const ord = m => m.sort((a, b) => FUNC_ORDEM(a.funcao) - FUNC_ORDEM(b.funcao) || norm(a.nome).localeCompare(norm(b.nome)));
    const lin = m => ord(m).map((p, i) => n(i, [p.nome, p.funcao || "", pagPendente(p) ? "Pendente" : "Ok", opt(ATESTADO, p.atestado).l, opt(TERMO, p.termo).l, p.telefone]));
    const linS = m => ord(m).map((p, i) => n(i, [p.nome, p.telefone || "", p.equipe || "Sem equipe"]));
    // quem está sem equipe não vai no PDF (pedido do Vinicius)
    const secs = f => equipesUsadas().map(e => { const m = lgs.filter(p => p.equipe === e); return { titulo: `${e} · ${m.length} pessoa(s)`, linhas: f(m) }; }).filter(x => x.linhas.length);
    return { titulo: "Equipes LGND", legenda: `${lgs.length - sem.length} de ${lgs.length} legendários com equipe`,
      resumo: [["Com equipe", lgs.length - sem.length], ["Equipes", equipesUsadas().filter(e => lgs.some(p => p.equipe === e)).length]],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "Função", w: 24 }, { t: "Pagamento", w: 24, status: true }, { t: "Atestado", w: 26, status: true }, { t: "Termo", w: 26, status: true }, { t: "Telefone", w: 34 }],
      secoes: secs(lin),
      simplesTxt: "Simples: nome, telefone e equipe de cada um, separado por equipe.",
      simples: { resumo: [["Total", lgs.length - sem.length]], colunas: [{ t: "#", w: 12, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "Telefone", w: 42 }, { t: "Equipe", w: 40 }], secoes: secs(linS) } };
  }
  if (v === "familias") {
    const parts = S.P.filter(p => p.tipo !== "legendario"), sem = parts.filter(p => !p.familia);
    const lin = m => m.map((p, i) => n(i, [p.nome, is40(p) ? "Sim" : "", opt(ATESTADO, p.atestado).l, opt(TERMO, p.termo).l, p.telefone]));
    return { titulo: "Famílias", legenda: `${parts.length - sem.length} de ${parts.length} senderistas distribuídos nas 12 famílias`,
      resumo: [["Distribuídos", parts.length - sem.length], ["Sem família", sem.length], ["+40", parts.filter(is40).length]],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "+40", w: 12, al: "center" }, { t: "Atestado", w: 26, status: true }, { t: "Termo", w: 26, status: true }, { t: "Telefone", w: 34 }],
      secoes: [...Array.from({ length: 12 }, (_, k) => { const m = parts.filter(p => Number(p.familia) === k + 1); return { titulo: `Família ${String(k + 1).padStart(2, "0")} · ${m.length} pessoa(s)`, linhas: lin(m) }; }).filter(x => x.linhas.length),
        ...(sem.length ? [{ titulo: `Sem família · ${sem.length}`, linhas: lin(sem) }] : [])] };
  }
  if (v === "checklist") {
    const s = stats();
    return { titulo: "Checklist ADM", legenda: `${s.tDone} de ${s.tTotal} tarefas prontas`,
      resumo: [["Prontas", `${s.tDone}/${s.tTotal}`], ["Em andamento", s.tAnd.length], ["A fazer", s.tTotal - s.tDone - s.tAnd.length]],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Tarefa", bold: true }, { t: "Status", w: 28, status: true }, { t: "Responsável", w: 32 }, { t: "Fornecedor / obs.", w: 48, cinza: true }],
      secoes: FASES.map(f => { const ts = S.T.filter(t => t.fase === f.v).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        return { titulo: `${f.l} · ${ts.filter(t => t.status === "pronto").length}/${ts.length}`, linhas: ts.map((t, i) => n(i, [t.titulo, opt(TASK, t.status).l, t.responsavel, [t.fornecedor, t.obs].filter(Boolean).join(" · ")])) }; }) };
  }
  if (v === "estoque") {
    const s = stats(), kits = topKits(), meta = S.config.metaMRE || 110;
    const sit = e => e.grupo === "equip" ? (e.conferir ? "Conferir" : "OK") : e.qtd === 0 ? "Zerado" : e.qtd <= S.config.alertaBaixo ? "Baixo" : "OK";
    return { titulo: "Estoque e compras", legenda: `Alerta de estoque baixo em até ${S.config.alertaBaixo} unidades`,
      resumo: [["Kits MRE", `${kits}/${meta}`], ["Zerados", s.zero.length], ["Baixos", s.low.length]],
      colunas: [{ t: "Item", bold: true }, { t: "Qtd.", w: 16, al: "center" }, { t: "Situação", w: 24, status: true }, { t: "Local", w: 36 }, { t: "Compra / obs.", w: 50, cinza: true }],
      secoes: GRUPOS.map(g => ({ titulo: g.l, linhas: S.estoque.filter(e => e.grupo === g.v).sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map(e => [e.item, e.qtd != null ? e.qtd : "", sit(e), e.local, [e.resp ? "compra: " + e.resp : "", e.obs].filter(Boolean).join(" · ")]) })) };
  }
  if (v === "pista") {
    const dias = [...S.pista].sort((a, b) => (a.ordem || 0) - (b.ordem || 0)), tot = stats().pistaM;
    const km = m => (m / 1000).toFixed(2).replace(".", ",") + " km";
    return { semSimples: true, titulo: "KM da pista", legenda: `Pista total: ${km(tot)} (${fmtNum(tot)} m)`,
      resumo: [["Pista total", km(tot)], ...dias.slice(0, 3).map(d => [d.dia, km((d.trechos || []).reduce((a, x) => a + (Number(x.m) || 0), 0))])],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "De", bold: true }, { t: "Para", bold: true }, { t: "Metros", w: 24, al: "right" }, { t: "Tempo", w: 30, cinza: true }],
      secoes: dias.map(d => { const tr = d.trechos || []; return { titulo: `${d.dia} · ${fmtNum(tr.reduce((a, x) => a + (Number(x.m) || 0), 0))} m`, linhas: tr.map((x, i) => n(i, [x.de, x.para, fmtNum(x.m) + " m", x.tempo])) }; }) };
  }
  if (v === "pins") {
    const F = S.pinf || {}, rows = pinsFiltrados(), st = { pendente: "pendentes", entregue: "entregues", hoje: "entregues hoje", todos: "todos" }[F.st];
    const filtro = filtroTxt([st, F.lote && "lote " + F.lote, F.q && `busca "${F.q}"`]);
    return { titulo: "Pins", sub: `Pins dos bonés · ${filtro}`, legenda: `${rows.length} pessoa(s) · ${filtro}`, orient: "landscape",
      resumo: [["Na lista", rows.length], ["Entregues", rows.filter(p => p.status === "entregue").length], ["Pendentes", rows.filter(p => p.status !== "entregue").length]],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", bold: true }, { t: "Telefone", w: 34 }, { t: "E-mail", w: 58, cinza: true }, { t: "Lote", w: 16, al: "center" }, { t: "Concluiu", w: 22, al: "center" }, { t: "Status", w: 22, status: true }, { t: "Entregue em", w: 24, al: "center" }, { t: "Por", w: 30, cinza: true }],
      linhas: rows.map((p, i) => n(i, [p.nome, p.telefone, p.email, p.lote, dataBr(p.conclusao), p.status === "entregue" ? "Entregue" : "Pendente", dataBr(p.entregueEm), p.entreguePor])) };
  }
  if (v === "tops") {
    const list = S.tops.length ? [...S.tops] : [{ id: LEGACY_TOP, nome: "TOP 1922", status: "ativo", local: "Franca - SP" }];
    return { titulo: "Tops", sub: "Histórico dos TOPs da base 3 Colinas", legenda: `${list.length} TOP(s)`, orient: "landscape",
      resumo: [["TOPs", list.length], ["Finalizados", list.filter(t => t.status === "finalizado").length]],
      colunas: [{ t: "TOP", bold: true }, { t: "Status", w: 28, status: true }, { t: "Local", w: 40 }, { t: "Datas", w: 46 }, { t: "Senderistas", w: 24, al: "center" }, { t: "Atestados", w: 22, al: "center" }, { t: "Termos", w: 20, al: "center" }, { t: "Legendários", w: 24, al: "center" }],
      linhas: list.map(t => { const s = topStats(t.id); return [t.nome, t.status === "finalizado" ? "Finalizado" : "Em andamento", t.local, t.inicio ? fmtDate(t.inicio) + (t.fim ? " a " + fmtDate(t.fim) : "") : "", s.n, s.at, s.te, s.lg]; }) };
  }
  if (v === "usuarios") {
    const nivel = e => e.dono ? "Dono · acesso total" : e.ativo === false ? "Bloqueado" : e.nivel === "total" ? "Acesso total" : (e.nivel === "leitura" ? "Somente leitura: " : "Edita: ") + (ABAS().filter(x => (e.abas || []).includes(x.id)).map(x => x.l).join(", ") || "só o Dashboard");
    const rows = [...(S.equipe || [])].sort((a, b) => (b.dono ? 1 : 0) - (a.dono ? 1 : 0) || norm(a.nome).localeCompare(norm(b.nome)));
    return { titulo: "Usuários", sub: "Equipe ADM com acesso ao app", legenda: `${rows.length} usuário(s) cadastrado(s)`, orient: "landscape",
      resumo: [["Cadastrados", rows.length], ["Com acesso", rows.filter(e => e.ativo !== false).length], ["Sem senha", rows.filter(e => !e.user_id && e.ativo !== false).length]],
      colunas: [{ t: "#", w: 9, al: "center", cinza: true }, { t: "Nome", w: 50, bold: true }, { t: "Função", w: 28 }, { t: "E-mail", w: 62 }, { t: "Acesso" }, { t: "Último acesso", w: 32, cinza: true }],
      linhas: rows.map((e, i) => n(i, [e.nome, e.funcao || "ADM", e.email, nivel(e), e.visto_em ? quando(e.visto_em) : e.user_id ? "Nunca acessou" : "Ainda não criou a senha"])) };
  }
  if (v === "historico") {
    const rows = histFiltrado(), h = S.hf, filtro = filtroTxt([h.quem, h.aba, h.acao, h.q && `busca "${h.q}"`]);
    const dt = iso => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    const mud = x => x.mudancas ? Object.entries(x.mudancas).filter(([k]) => !IGNORAR.includes(k)).map(([k, [a, b]]) => `${CAMPOS[k] || k}: ${fmtValor(k, a)} → ${fmtValor(k, b)}`).join("\n") : "";
    return { semSimples: true, titulo: "Histórico", sub: `Alterações no app · ${filtro}`, legenda: `${rows.length} alteração(ões) · ${filtro}`, orient: "landscape",
      resumo: [["Alterações", rows.length], ["Pessoas", new Set(rows.map(x => x.quem)).size]],
      colunas: [{ t: "Quando", w: 26, cinza: true }, { t: "Quem", w: 36, bold: true }, { t: "Ação", w: 18 }, { t: "Aba", w: 26 }, { t: "Registro", w: 50 }, { t: "O que mudou" }],
      linhas: rows.slice(0, 1500).map(x => [dt(x.em), x.quem, x.acao, x.aba, x.nome || x.doc_id, mud(x)]) };
  }
  if (v === "notificacoes") {
    const L = notifsVisiveis().map(x => ({ n: x, t: notifTexto(x) })).filter(o => o.t);
    return { semSimples: true, titulo: "Notificações", sub: `Últimos ${NOTIF_DIAS} dias`, legenda: `${L.length} notificação(ões)`,
      resumo: [["Notificações", L.length]],
      colunas: [{ t: "Quando", w: 26, cinza: true }, { t: "Quem / título", w: 50, bold: true }, { t: "O que aconteceu" }],
      linhas: L.map(o => [quando(o.n.em), o.t.t, o.t.c]) };
  }
  if (v === "painel") {
    const s = stats(), pins = pinsTodos(), kits = topKits(), meta = S.config.metaMRE || 110;
    const L = (a, b, c) => [a, String(b), c];
    return { semSimples: true, titulo: "Dashboard", sub: `Resumo do ${topName()}`, legenda: "Números do momento em que o PDF foi gerado",
      resumo: [["Senderistas", s.n], ["Legendários", s.lg.length], ["Checklist", pct(s.tDone, s.tTotal) + "%"]],
      colunas: [{ t: "Indicador", bold: true }, { t: "Valor", w: 30, al: "center" }, { t: "Detalhe", w: 80, cinza: true }],
      secoes: [
        { titulo: "Senderistas", linhas: [L("Cadastrados", s.n, `${s.mais40.length} com +40 · ${s.semFamilia} sem família`), L("Atestado confirmado", s.atestado, pct(s.atestado, s.n) + "%"), L("Termo assinado", s.termo, pct(s.termo, s.n) + "%"),
          L("Mensagem do grupo", s.msg, pct(s.msg, s.n) + "%"), L("Entraram no grupo", s.grupo, pct(s.grupo, s.n) + "%"), L("NFC registrado", s.nfc, pct(s.nfc, s.n) + "%"), L("Pagamento pendente", S.P.filter(pagPendente).length, "boleto em aberto")] },
        { titulo: "Legendários", linhas: [L("Cadastrados", s.lg.length, ""), L("Atestado confirmado", s.lgAtest, pct(s.lgAtest, s.lg.length) + "%"), L("Termo assinado", s.lgAssinado, pct(s.lgAssinado, s.lg.length) + "%")] },
        { titulo: "Operação", linhas: [L("Checklist pronto", `${s.tDone}/${s.tTotal}`, `${s.tAnd.length} em andamento`), L("Kits MRE lacrados", `${kits}/${meta}`, `faltam ${Math.max(0, meta - kits)}`),
          L("Estoque", `${s.zero.length} zerado(s)`, `${s.low.length} baixo(s) · ${s.conferir.length} para conferir`), L("Pista", (s.pistaM / 1000).toFixed(2).replace(".", ",") + " km", fmtNum(s.pistaM) + " m"),
          ...(pins.length ? [L("Pins entregues", `${pins.filter(p => p.status === "entregue").length}/${pins.length}`, `${pins.filter(p => p.status !== "entregue").length} pendente(s)`)] : [])] },
      ] };
  }
  return null;
}
function pdfTelaForm() {
  const sp = pdfDaTela(); if (!sp) return;
  const qtd = sp.linhas ? sp.linhas.length : (sp.secoes || []).reduce((a, s) => a + s.linhas.length, 0);
  modal(`
    <h3>Exportar PDF · ${esc(sp.titulo)}</h3>
    <p style="margin:0">${esc(sp.legenda || "")}</p>
    ${sp.semSimples ? "" : `<div class="seg" role="group" aria-label="Tipo de PDF" id="pdfTipo"><button type="button" data-t="nomes" aria-pressed="false">Só nomes</button><button type="button" data-t="completo" aria-pressed="true">Completo</button></div>
    <p class="hint" style="margin:0" id="pdfTipoTxt"></p>`}
    <p class="hint" style="margin:0">O PDF sai com a lista do jeito que está na tela${sp.linhas ? " (filtro e busca)" : ""}, ${qtd} linha(s), com o seu nome como ADM responsável. Dá para baixar ou mandar direto no WhatsApp.</p>
    <div class="modal-foot"><button class="btn" type="button" id="pdfWa">${ico("wa")} Enviar no WhatsApp</button><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="pdfBtn">${ico("upload")} Gerar PDF</button></div></div>`,
  () => ir(false));
  async function ir(wa) {
    const b = wa ? $("#pdfWa") : $("#pdfBtn"); b.disabled = true; b.textContent = "Gerando…";
    try { await gerarListaPdf(tipo === "nomes" ? pdfSimples(sp) : sp, wa); closeModal(); }
    catch (e) { console.error(e); toast(erroAmigavel(e)); b.disabled = false; b.textContent = "Tentar de novo"; }
  }
  $("#pdfWa").onclick = () => ir(true);
  let tipo = sp.semSimples ? "completo" : store.get("adm3-pdf-tipo") || "completo";
  const seg = $("#pdfTipo"), txt = $("#pdfTipoTxt");
  const pinta = () => { if (!seg) return; seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === tipo));
    txt.textContent = tipo === "nomes" ? (sp.simplesTxt || "Só nomes: lista simples numerada, só com o nome de cada um.") : "Completo: com telefone, status e todas as colunas da tela."; };
  if (seg) seg.onclick = e => { const b = e.target.closest("button"); if (!b) return; tipo = b.dataset.t; store.set("adm3-pdf-tipo", tipo); pinta(); };
  pinta();
}
const PDF_TELAS = ["painel", "participantes", "legendarios", "equipes", "pendencias", "familias", "checklist", "estoque", "pista", "pins", "tops", "usuarios", "historico", "notificacoes"];
// coloca o botão "Exportar PDF" no topo da página (cronograma e consagração já têm o deles)
function botaoPdf() {
  if (!ME.acesso || !PDF_TELAS.includes(S.view) || (S.view === "usuarios" && S.usrAba === "notif")) return;
  const head = $("#view .head") || $("#view .hero-text"); if (!head || head.querySelector("[data-act=pdf-tela]")) return;
  let act = head.querySelector(":scope > .actions");
  if (!act) { act = document.createElement("div"); act.className = "actions"; head.appendChild(act); }
  const hero = head.classList.contains("hero-text");
  act.insertAdjacentHTML(hero ? "beforeend" : "afterbegin", `<button class="btn${hero ? " glass" : ""}" type="button" data-act="pdf-tela">${ico("upload")} Exportar PDF</button>`);
}
/* ---------- Pins (pins dos bonés: entregues ou pendentes) ----------
   Cada pessoa fica em config/pin-<id> { nome, telefone, email, conclusao, lote, status: entregue|pendente, entregueEm, entreguePor }.
   Os dados vêm da planilha "alunos do lote" da plataforma (.csv) e o ADM marca a entrega no app. */
const PIN_RE = /^pin-/;
const pinsTodos = () => Object.entries(S.cfgDocs || {}).filter(([k]) => PIN_RE.test(k)).map(([k, d]) => ({ id: k, ...d }))
  .sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
const MSG_PIN = "Olá {nome}, tudo bem? Aqui é {adm}, da equipe ADM Legendários 3 Colinas. O pin do seu boné (lote {lote}) já está com a gente para entregar. Me avisa quando e onde fica melhor para você retirar?";
const msgPin = () => store.get("adm3-msg-pin") || MSG_PIN;
const textoPin = p => msgPin().replace(/\{nome\}/g, String(p.nome || "").trim().split(/\s+/)[0] || "").replace(/\{adm\}/g, (ME.adm || "a equipe").split(" ")[0]).replace(/\{lote\}/g, p.lote || "-");
const dataBr = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
const dataIso = br => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(br || "").trim()); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
function pinChave(nome, tel, email) {
  const base = email ? "e" + norm(email) : digits(tel).length >= 10 ? "t" + digits(tel).slice(-10) : "n" + norm(nome);
  let h = 5381; for (const c of base) h = (h * 33 ^ c.charCodeAt(0)) >>> 0;
  return "pin-" + h.toString(36);
}
function pinsFiltrados() {
  const F = S.pinf || (S.pinf = { st: "pendente", lote: "", q: "" }), q = norm(F.q), hoje = hojeISO();
  return pinsTodos().filter(p => F.st === "todos" || (F.st === "hoje" ? p.status === "entregue" && p.entregueEm === hoje : (F.st === "entregue") === (p.status === "entregue")))
    .filter(p => !F.lote || (p.lote || "sem lote") === F.lote)
    .filter(p => !q || norm(p.nome).includes(q) || digits(p.telefone).includes(digits(F.q) || "§") || norm(p.email).includes(q));
}
function vPins() {
  const F = S.pinf || (S.pinf = { st: "pendente", lote: "", q: "" });
  const todos = pinsTodos(), ed = podeEditar();
  const ent = todos.filter(p => p.status === "entregue"), pend = todos.filter(p => p.status !== "entregue");
  const lotes = [...new Set(todos.map(p => p.lote || "sem lote"))].sort((a, b) => todos.filter(p => (p.lote || "sem lote") === b).length - todos.filter(p => (p.lote || "sem lote") === a).length);
  const hoje = hojeISO(), entHoje = ent.filter(p => p.entregueEm === hoje);
  const rows = pinsFiltrados();
  const seg = (v, l, n) => `<button type="button" data-pin-st="${v}" aria-pressed="${F.st === v}">${l} <span class="num" style="opacity:.75">${n}</span></button>`;
  return `
  <div class="head"><div><h2>Pins</h2><p>Pins dos bonés de quem concluiu a pista: quem já recebeu e quem ainda está pendente. Toque em <b>Entregar</b> quando a pessoa receber.</p></div>
    <div class="actions">${ed ? `<button class="btn" type="button" data-act="pin-msg">${ico("chat")} Editar mensagem</button><button class="btn primary" type="button" data-act="pin-importar">${ico("upload")} Importar planilha</button>` : ""}</div></div>
  <div class="kpis">
    <button class="kpi" type="button" data-pin-st="entregue"><span class="lbl">Entregues</span><span class="val num">${ent.length}<small style="font-size:18px;color:var(--muted)"> / ${todos.length}</small></span><div class="bar good"><i style="width:${pct(ent.length, todos.length)}%"></i></div></button>
    <button class="kpi ${pend.length ? "alert" : ""}" type="button" data-pin-st="pendente"><span class="lbl">Pendentes</span><span class="val num">${pend.length}</span><span class="sub">${pend.filter(p => !waNumber(p.telefone)).length} sem telefone</span></button>
    <div class="kpi"><span class="lbl">Lotes</span><span class="val num">${lotes.length}</span><span class="sub">${todos.length} pessoa(s)</span></div>
    <button class="kpi" type="button" data-pin-st="hoje" aria-pressed="${F.st === "hoje"}"><span class="lbl">Entregues hoje</span><span class="val num">${entHoje.length}</span><span class="sub">${entHoje.length ? "toque para ver quem · " + entHoje.map(p => (p.entreguePor || "").split(" ")[0]).filter((v, i, x) => v && x.indexOf(v) === i).join(", ") : "nenhum ainda"}</span></button>
  </div>
  ${lotes.length > 1 ? `<section class="panel"><h3>Por lote <small>toque para filtrar</small></h3><div class="csg-dias">${lotes.map(l => { const t = todos.filter(p => (p.lote || "sem lote") === l), e = t.filter(p => p.status === "entregue").length;
    return `<button type="button" class="csg-dia ${F.lote && F.lote !== l ? "fora" : ""}" data-pin-lote="${esc(l)}"><b>Lote ${esc(l)}</b><span class="num">${e}/${t.length} entregues</span><span class="bar good" style="margin:4px 0 0"><i style="width:${pct(e, t.length)}%"></i></span></button>`; }).join("")}</div></section>` : ""}
  <section class="panel">
    <div class="csg-filtro">
      <div class="seg" role="group" aria-label="Status">${seg("pendente", "Pendentes", pend.length)}${seg("entregue", "Entregues", ent.length)}${entHoje.length || F.st === "hoje" ? seg("hoje", "Hoje", entHoje.length) : ""}${seg("todos", "Todos", todos.length)}</div>
      ${F.lote ? `<button class="btn sm" type="button" data-pin-lote="">Lote ${esc(F.lote)} ✕</button>` : ""}
      <div class="search" style="flex:1;min-width:180px">${ico("search")}<input id="pinQ" type="search" placeholder="Buscar nome, telefone ou e-mail" value="${esc(F.q)}" aria-label="Buscar"></div>
    </div>
    ${rows.length ? `<div class="list pend">${rows.map(p => { const ok = p.status === "entregue"; return `<div class="li pendrow">
      <div class="grow"><b>${esc(p.nome)}</b> <span class="chip ${ok ? "ok" : "wait"}">${ok ? "Entregue" : "Pendente"}</span>
        <small class="hint" style="display:block">Lote ${esc(p.lote || "-")}${p.conclusao ? ` · concluiu em ${esc(dataBr(p.conclusao))}` : ""}${ok ? ` · entregue ${p.entregueEm ? "em " + esc(dataBr(p.entregueEm)) : ""}${p.entreguePor ? " por " + esc(p.entreguePor) : ""}` : ""}</small>
        <small class="hint" style="display:block">${esc([p.telefone, p.email].filter(Boolean).join(" · "))}</small></div>
      <div class="actions">${ed ? (ok ? `<button class="btn sm ghost" type="button" data-pin-desfaz="${esc(p.id)}">Desfazer</button>` : `<button class="btn sm primary" type="button" data-pin-ok="${esc(p.id)}">${ico("check")} Entregar</button>`) : ""}
        ${!ok && waNumber(p.telefone) ? `<a class="wa" href="https://wa.me/${waNumber(p.telefone)}?text=${encodeURIComponent(textoPin(p))}" target="_blank" rel="noopener">${ico("wa")} Avisar</a>` : ""}</div>
    </div>`; }).join("")}</div>` : `<div class="empty">${todos.length ? "Ninguém neste filtro." : "Nenhum pin ainda. Toque em <b>Importar planilha</b> e escolha o arquivo baixado da plataforma."}</div>`}
  </section>`;
}
function pinEntregar(id, desfazer) {
  const p = (S.cfgDocs || {})[id]; if (!p) return;
  const dados = desfazer ? { status: "pendente", entregueEm: "", entreguePor: "" } : { status: "entregue", entregueEm: hojeISO(), entreguePor: ME.adm || "ADM" };
  save(() => api.update("config", id, dados), desfazer ? `${p.nome.split(" ")[0]}: voltou para pendente` : `Pin entregue para ${p.nome.split(" ")[0]}`);
}
function pinMsgForm() {
  modal(`
    <h3>Mensagem do pin</h3>
    <p class="hint" style="margin:0">Use <b>{nome}</b>, <b>{adm}</b> e <b>{lote}</b>: o app troca pelo primeiro nome da pessoa, o seu nome e o lote. Fica salva neste aparelho.</p>
    <div class="field"><label for="f-msg">Mensagem</label><textarea id="f-msg" name="msg" style="min-height:150px">${esc(msgPin())}</textarea></div>
    <div class="modal-foot"><div><button class="btn ghost" type="button" id="msgPadrao">Voltar ao padrão</button></div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { store.set("adm3-msg-pin", String(fd.get("msg") || "").trim() || MSG_PIN); closeModal(); toast("Mensagem salva"); render(); });
  $("#msgPadrao").onclick = () => { $("#f-msg").value = MSG_PIN; };
}
// lê o .csv "alunos do lote" da plataforma (separado por ponto e vírgula, com aspas)
/* Lê qualquer planilha (.csv, .xlsx) e devolve as linhas. CSV da plataforma pode vir em UTF-8 ou Windows-1252:
   tenta UTF-8 e, se não for, lê como Windows-1252. Texto com acento já quebrado ("FabrÃcio") é consertado. */
async function textoArquivo(f) {
  const buf = await f.arrayBuffer();
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch (e) { return new TextDecoder("windows-1252").decode(buf); }
}
async function lerPlanilha(f) {
  let linhas;
  if (/\.(csv|txt)$/i.test(f.name)) linhas = lerCsv(await textoArquivo(f));
  else { const X = await carregarXlsx(); const wb = X.read(await f.arrayBuffer(), { type: "array" }); linhas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" }); }
  return linhas.map(r => r.map(consertaAcento));
}
function lerCsv(txt) {
  txt = txt.replace(/^﻿/, "");
  const sep = (txt.split(/\r?\n/)[0].match(/;/g) || []).length >= (txt.split(/\r?\n/)[0].match(/,/g) || []).length ? ";" : ",";
  const linhas = []; let campo = "", linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) { if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += c; continue; }
    if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && txt[i + 1] === "\n") i++; linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter(l => l.some(x => String(x).trim()));
}
function lerPlanilhaPins(linhas) {
  const cab = (linhas[0] || []).map(norm), col = (...nomes) => cab.findIndex(h => nomes.some(n => h === n || h.startsWith(n)));
  const I = { nome: col("nome"), tel: col("telefone", "celular"), email: col("email", "e-mail"), conc: col("conclusao"), lote: col("lote"), st: col("status"), data: col("data entrega"), colab: col("colaborador") };
  if (I.nome < 0 || I.st < 0) throw new Error("Não achei as colunas Nome e Status. Use o arquivo \"alunos do lote\" baixado da plataforma.");
  const g = (r, i) => i >= 0 ? String(r[i] || "").trim() : "";
  const vistos = new Map();
  linhas.slice(1).forEach(r => {
    const nome = capNome(g(r, I.nome).replace(/\s+/g, " ")); if (!nome) return;
    const tel = g(r, I.tel), email = g(r, I.email).toLowerCase(), id = pinChave(nome, tel, email);
    vistos.set(id, { id, nome, telefone: tel, email, conclusao: dataIso(g(r, I.conc)), lote: g(r, I.lote), status: /entreg/i.test(g(r, I.st)) ? "entregue" : "pendente",
      entregueEm: dataIso(g(r, I.data)), entreguePor: capNome(g(r, I.colab)) });
  });
  return [...vistos.values()];
}
function pinImportarForm() {
  modal(`
    <h3>Importar planilha de pins</h3>
    <p class="hint" style="margin:0">Escolha o arquivo <b>alunos do lote</b> (.csv) baixado da plataforma. Quem é novo entra na lista; quem já está é atualizado. Se alguém já foi marcado como entregue no app, continua entregue.</p>
    <div class="field"><label for="f-pincsv">Arquivo</label><input type="file" id="f-pincsv" accept=".csv,text/csv"></div>
    <div id="pinPrev" class="hint">Nenhum arquivo escolhido.</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="pinImpBtn" disabled>Importar</button></div></div>`,
  () => {
    if (!R || !R.length) return;
    const atuais = Object.fromEntries(pinsTodos().map(p => [p.id, p]));
    const ops = R.map(n => { const a = atuais[n.id];
      if (!a) return () => api.set("config", n.id, { ...n, id: undefined, importadoEm: new Date().toISOString() });
      const d = {}; ["telefone", "email", "conclusao", "lote"].forEach(k => { if (n[k] && n[k] !== a[k]) d[k] = n[k]; });
      if (a.status !== "entregue" && n.status === "entregue") Object.assign(d, { status: "entregue", entregueEm: n.entregueEm, entreguePor: n.entreguePor });
      return Object.keys(d).length ? () => api.update("config", n.id, d) : null; }).filter(Boolean);
    closeModal();
    save(async () => { for (const op of ops) await op(); }, `Planilha importada: ${R.filter(n => !atuais[n.id]).length} novo(s), ${ops.length - R.filter(n => !atuais[n.id]).length} atualizado(s)`);
  });
  let R = null;
  $("#f-pincsv").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      R = lerPlanilhaPins(await lerPlanilha(f));
      const atuais = new Set(pinsTodos().map(p => p.id)), novos = R.filter(n => !atuais.has(n.id)).length, ent = R.filter(n => n.status === "entregue").length;
      $("#pinPrev").innerHTML = `<b>${R.length}</b> pessoa(s) na planilha · ${ent} entregue(s), ${R.length - ent} pendente(s) · <b>${novos}</b> nova(s) no app`;
      $("#pinImpBtn").disabled = !R.length;
    } catch (err) { R = null; $("#pinPrev").innerHTML = `<span class="warn-text">${esc(err.message || err)}</span>`; $("#pinImpBtn").disabled = true; }
  });
}
/* Dividir os ADMs em equipes (só o dono): cada equipe tem nome, ADM responsável e integrantes; coordenadores veem todas */
function equipesForm() {
  const E = eqDoc();
  const membrosAtivos = (S.equipe || []).filter(m => m.ativo !== false && !m.dono).map(m => ({ id: m.id, nome: m.nome }));
  const rasc = { equipes: E.equipes.map(e => ({ ...e, adms: [...(e.adms || [])] })), coord: [...E.coord] };
  if (!rasc.equipes.length) rasc.equipes = [{ id: "eq1", nome: "Equipe 1", adms: [] }, { id: "eq2", nome: "Equipe 2", adms: [] }];
  const eqDe = id => rasc.equipes.find(e => e.adms.some(a => a.id === id));
  const corpo = () => `
    <h3>Equipes do ${esc(topName())}</h3>
    <p class="hint" style="margin:0">Cada ADM marca o próprio cronograma. A equipe só agrupa: o ADM vê o dele e o dos colegas de equipe; você e os coordenadores veem os de todos.</p>
    <div class="eqf-list">${rasc.equipes.map((e, k) => `<div class="eqf-row">
      <input data-eqf-nome="${k}" value="${esc(e.nome)}" aria-label="Nome da equipe" placeholder="Nome da equipe">
      <span class="hint num">${e.adms.length} ADM(s)</span>
      <button class="linkbtn" type="button" data-eqf-del="${k}" aria-label="Apagar ${esc(e.nome)}">${ico("x")}</button></div>`).join("")}</div>
    <button class="btn" type="button" id="eqfAdd">${ico("plus")} Adicionar equipe</button>
    <h4 style="margin:6px 0 0">ADMs</h4>
    ${membrosAtivos.length ? `<div class="eqf-list">${membrosAtivos.map(m => { const e = eqDe(m.id); const c = rasc.coord.some(x => x.id === m.id);
      return `<div class="eqf-row"><b style="flex:1;min-width:120px">${esc(m.nome)}</b>
        <select data-eqf-adm="${esc(m.id)}" aria-label="Equipe de ${esc(m.nome)}"><option value="">Sem equipe</option>${rasc.equipes.map((x, k) => `<option value="${k}" ${e === x ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select>
        <label class="selall" style="margin:0"><input type="checkbox" data-eqf-coord="${esc(m.id)}" ${c ? "checked" : ""}> Coordenador</label></div>`; }).join("")}</div>`
      : `<p class="hint">Cadastre os ADMs na aba Usuários primeiro.</p>`}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar equipes</button></div></div>`;
  const salvar = () => {
    const equipes = rasc.equipes.filter(e => e.nome.trim()).map(e => ({ id: e.id, nome: e.nome.trim(), adms: e.adms }));
    closeModal();
    save(() => api.set("config", "equipes-" + curTopId(), { equipes, coord: rasc.coord }), "Equipes salvas");
  };
  modal(corpo(), salvar);
  const f = $("#mform");
  const redesenhar = () => { const y = f.scrollTop; f.innerHTML = corpo(); f.scrollTop = y; ligar(); };
  function ligar() {
    f.querySelectorAll("[data-eqf-nome]").forEach(i => i.oninput = () => { rasc.equipes[+i.dataset.eqfNome].nome = i.value; });
    f.querySelectorAll("[data-eqf-nome]").forEach(i => i.onchange = redesenhar);
    f.querySelectorAll("[data-eqf-del]").forEach(b => b.onclick = () => { const e = rasc.equipes[+b.dataset.eqfDel];
      if (e.adms.length && !confirm(`Apagar a ${e.nome}? Os ADMs dela ficam sem equipe (os cronogramas deles continuam guardados).`)) return;
      rasc.equipes.splice(+b.dataset.eqfDel, 1); redesenhar(); });
    const add = $("#eqfAdd"); if (add) add.onclick = () => { rasc.equipes.push({ id: "eq" + ADM_DADOS.novoId(), nome: "Equipe " + (rasc.equipes.length + 1), adms: [] }); redesenhar(); };
    f.querySelectorAll("[data-eqf-adm]").forEach(sl => sl.onchange = () => {
      const m = membrosAtivos.find(x => x.id === sl.dataset.eqfAdm);
      rasc.equipes.forEach(e => { e.adms = e.adms.filter(a => a.id !== m.id); });
      if (sl.value !== "") rasc.equipes[+sl.value].adms.push(m);
      redesenhar(); });
    f.querySelectorAll("[data-eqf-coord]").forEach(c => c.onchange = () => {
      const m = membrosAtivos.find(x => x.id === c.dataset.eqfCoord);
      rasc.coord = rasc.coord.filter(x => x.id !== m.id); if (c.checked) rasc.coord.push(m); });
  }
  ligar();
}
function cronoHoraForm(id) {
  const i = cronoPlano().flatMap(d => d.itens).find(x => x.id === id); if (!i) return;
  const m = cronoMarcas()[id] || {};
  modal(`
    <h3>${esc(i.atv)}</h3>
    <p class="hint" style="margin:0">Previsto: ${esc(i.hora || "sem horário")}${m.iniPor ? ` · início marcado por ${esc(m.iniPor)}` : ""}${m.fimPor ? ` · fim marcado por ${esc(m.fimPor)}` : ""}</p>
    <div class="grid2"><div class="field"><label for="f-cini">Começou</label><input id="f-cini" type="time" value="${esc(m.ini || "")}"></div>
    <div class="field"><label for="f-cfim">Terminou</label><input id="f-cfim" type="time" value="${esc(m.fim || "")}"></div></div>
    <div class="modal-foot"><button class="btn ghost" type="button" id="cLimpar">Limpar horários</button><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  () => { const ini = $("#f-cini").value, fim = $("#f-cfim").value; closeModal();
    const d = { ini, fim };
    if (ini !== (m.ini || "")) d.iniPor = ini ? ME.adm : ""; if (fim !== (m.fim || "")) d.fimPor = fim ? ME.adm : "";
    cronoMarcar(id, d, "Horário salvo"); });
  $("#cLimpar").onclick = () => { closeModal(); cronoMarcar(id, { ini: "", fim: "", iniPor: "", fimPor: "" }, "Horários apagados"); };
}
function cronoItemForm(id) {
  const plano = JSON.parse(JSON.stringify(cronoPlano()));
  const novo = id === "novo";
  const diaAtual = cronoDiaAtual(plano);
  let dia = plano.find(d => d.itens.some(x => x.id === id)) || plano.find(d => d.id === diaAtual) || plano[0];
  const i = novo ? { hora: "", atv: "", tipo: "" } : dia.itens.find(x => x.id === id);
  const campo = (k, l, ph = "") => `<div class="field"><label for="f-c${k}">${l}</label><input id="f-c${k}" value="${esc(i[k] || "")}" placeholder="${ph}"></div>`;
  modal(`
    <h3>${novo ? "Novo momento" : "Editar momento"}</h3>
    <div class="grid2"><div class="field"><label for="f-cdia">Dia</label><select id="f-cdia">${plano.map(d => `<option value="${d.id}" ${d.id === dia.id ? "selected" : ""}>${esc(d.nome)}</option>`).join("")}</select></div>
    <div class="field"><label for="f-chora">Hora prevista</label><input id="f-chora" type="time" value="${esc(i.hora || "")}"></div></div>
    ${campo("atv", "Atividade", "Ex.: PRÉDICA 1: TUA TRANSFORMAÇÃO")}
    <div class="grid2">${campo("local", "Local")}${campo("form", "Formação")}</div>
    <div class="grid2">${campo("resp", "Responsável")}<div class="field"><label for="f-ctipo">Cor</label>${sel("ctipo", CRONO_TIPOS, i.tipo || "")}</div></div>
    <p class="hint" style="margin:0">A mudança vale para todas as equipes do ${esc(topName())}.</p>
    <div class="modal-foot">${novo ? "<span></span>" : `<button class="btn danger" type="button" id="cApagar">Apagar momento</button>`}<div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  () => {
    const atv = $("#f-catv").value.trim(); if (!atv) { $("#f-catv").focus(); return; }
    const dados = { hora: $("#f-chora").value, atv, local: $("#f-clocal").value.trim(), form: $("#f-cform").value.trim(), resp: $("#f-cresp").value.trim(), tipo: $("#f-ctipo").value };
    Object.keys(dados).forEach(k => { if (!dados[k]) delete dados[k]; });
    const destino = plano.find(d => d.id === $("#f-cdia").value);
    if (!novo) dia.itens = dia.itens.filter(x => x.id !== id);
    const item = { id: novo ? destino.id + "-" + ADM_DADOS.novoId() : id, ...dados };
    // entra na ordem do horário (depois da meia-noite conta como fim do dia)
    const ord = h => { const m = minDe(h); const base = minDe((destino.itens[0] || {}).hora) ?? 300; return m == null ? 9999 : m < base - 60 ? m + 1440 : m; };
    const pos = destino.itens.findIndex(x => x.hora && ord(x.hora) > ord(item.hora));
    if (!item.hora || pos < 0) destino.itens.push(item); else destino.itens.splice(pos, 0, item);
    closeModal(); S.cronoDia = destino.id;
    save(() => api.set("config", "cronoplano-" + curTopId(), { dias: plano }), novo ? "Momento adicionado" : "Momento salvo");
  });
  const ap = $("#cApagar");
  if (ap) ap.onclick = () => { if (!confirm(`Apagar "${i.atv}" do cronograma?`)) return; dia.itens = dia.itens.filter(x => x.id !== id); closeModal();
    save(() => api.set("config", "cronoplano-" + curTopId(), { dias: plano }), "Momento apagado"); };
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
    <div class="actions">${MAPA_VIVO() && podeEditar() ? `<button class="btn" type="button" data-act="kmz">${ico("upload")} ${pistaMapa() ? "Trocar KMZ" : "Enviar KMZ"}</button>` : ""}<button class="btn" type="button" data-act="novo-dia">${ico("plus")} Adicionar dia</button></div></div>
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
  const abaU = S.usrAba === "notif" ? "notif" : "equipe";
  const abasU = `<div class="seg" role="group" aria-label="Usuários" style="margin-bottom:16px"><button type="button" data-usr-aba="equipe" aria-pressed="${abaU === "equipe"}">Equipe</button><button type="button" data-usr-aba="notif" aria-pressed="${abaU === "notif"}">Enviar notificação</button></div>`;
  if (abaU === "notif") return vEnviarNotif(abasU);
  return `
  <div class="head"><div><h2>Usuários</h2><p>Cadastre quem pode entrar no app com o e-mail da pessoa e escolha as abas que ela pode ver ou alterar. Só você vê esta aba.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-act="novo-adm">${ico("plus")} Cadastrar usuário</button></div></div>
  ${abasU}
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
    at: parts.filter(p => atOk(p)).length, te: parts.filter(p => p.termo === "assinado").length,
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
  <div class="head"><div><h2>Tops</h2><p>Histórico de todos os TOPs da base 3 Colinas. Ao finalizar um TOP, ele fica registrado aqui com senderistas, documentos e checklist.</p></div>
    <div class="actions">${podeTops() ? `<button class="btn primary" type="button" data-act="novo-top">${ico("plus")} Iniciar novo TOP</button>` : ""}</div></div>
  ${ativo ? "" : `<div class="banner"><span>Nenhum TOP em andamento. Inicie o próximo para começar a cadastrar senderistas.</span></div>`}
  <div class="tops">${list.map(t => { const s = topStats(t.id); const fin = t.status === "finalizado"; const kits = t.kitsMRE || 0; return `
    <article class="topcard ${t.id === sel ? "sel" : ""}">
      <div class="topcard-cover"><div>
        <span class="chip ${fin ? "ok" : "sent"}">${fin ? "Finalizado" : "Em andamento"}</span>
        <h3>${esc(t.nome)}</h3>
        <p>${esc([t.local, t.inicio ? fmtDate(t.inicio) + (t.fim ? " a " + fmtDate(t.fim) : "") : "", fin && t.finalizadoEm ? "finalizado em " + fmtDate(t.finalizadoEm) : ""].filter(Boolean).join(" · ") || "Sem datas definidas")}</p>
      </div>${t.id === sel ? `<span class="tag acc">Aberto agora</span>` : ""}</div>
      <div class="topstats">
        <div><b class="num">${s.n}</b><span>Senderistas</span></div>
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
    : v === "equipes" ? vEquipes()
    : v === "aovivo" ? vAoVivo()
    : v === "checklist" ? vChecklist()
    : v === "cronograma" ? vCronograma()
    : v === "consagracao" ? vConsagracao()
    : v === "pins" ? vPins()
    : v === "notificacoes" ? vNotificacoes()
    : v === "estoque" ? vEstoque()
    : vPista());
  const view = $("#view");
  const focusId = document.activeElement && document.activeElement.id;
  const caret = focusId === "q" || focusId === "hq" ? document.activeElement.selectionStart : null;
  view.innerHTML = html;
  botaoPdf();
  document.body.classList.toggle("av-tv", modoTv());
  if (S.view !== "aovivo") S.mapaCheio = false;
  document.body.classList.toggle("av-mapa-cheio", !!S.mapaCheio);
  if (S.view === "aovivo") montarMapaVivo(); else if (mapaAV) { try { mapaAV.map.remove(); } catch (e) {} mapaAV = null; }
  if ((focusId === "q" || focusId === "hq") && $("#" + focusId)) { const q = $("#" + focusId); q.focus(); try { q.setSelectionRange(caret, caret); } catch {} }
}

/* ---------- Formulários ---------- */
function closeModal() { $("#modalRoot").innerHTML = ""; setTimeout(checarInicio, 300); }
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
    <h3>${p.id ? "Editar" : "Novo"} ${lg ? "legendário" : "senderista"}</h3>
    <div class="form">
      <div class="field full"><label for="f-nome">Nome completo</label><input id="f-nome" name="nome" required value="${esc(p.nome)}" autocomplete="off"></div>
      <div class="field"><label for="f-telefone">Telefone / WhatsApp</label><input id="f-telefone" name="telefone" inputmode="tel" value="${esc(p.telefone)}" placeholder="+55 16 99999-0000"></div>
      <div class="field"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" value="${esc(p.email)}"></div>
      ${lg ? `
      <div class="field"><label for="f-equipe">Equipe</label>${sel("equipe", [{ v: "", l: "—" }, ...equipesUsadas().map(e => ({ v: e, l: e }))], p.equipe || "")}</div>
      <div class="field"><label for="f-funcao">Função na equipe</label><input id="f-funcao" name="funcao" list="funcoes" value="${esc(p.funcao)}" placeholder="ex.: Chefe, Subchefe"><datalist id="funcoes"><option value="Chefe"><option value="Subchefe"></datalist></div>
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
      ${p.id ? `<div class="field full"><label class="selall" style="margin:0"><input type="checkbox" id="f-canc" name="canc" ${cancelado(p) ? "checked" : ""}> Compra cancelada / não está mais na plataforma (sai da contagem, não apaga)</label></div>` : ""}
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
    if (p.id && (fd.get("canc") === "on") !== cancelado(p)) data.inscricao = fd.get("canc") === "on" ? "cancelada" : "ativa";
    if (lg) Object.assign(data, { equipe: String(fd.get("equipe") || ""), funcao: String(fd.get("funcao") || "").trim() });
    else Object.assign(data, {
      cidade: String(fd.get("cidade") || "").trim(), idade: fd.get("idade") ? Number(fd.get("idade")) : null,
      familia: fd.get("familia") ? Number(fd.get("familia")) : null, nfc: fd.get("nfc") === "on",
      msgGrupo: fd.get("msgGrupo") === "on", noGrupo: fd.get("noGrupo") === "on",
    });
    const t10 = v => { const d = digits(v); return d.length >= 10 ? d.slice(-10) : ""; };
    const dup = S.P.find(x => x.id !== p.id && !(p.dupOk || []).includes(x.id) && ((t10(data.telefone) && t10(x.telefone) === t10(data.telefone)) || norm(x.nome) === norm(nome) || (data.email && (x.email || "").toLowerCase() === data.email.toLowerCase())));
    const w = $("#dupWarn");
    if (dup && w.dataset.ok !== "1") { w.hidden = false; w.dataset.ok = "1"; w.textContent = `Já existe "${dup.nome}" (${tipoNome(dup)}) com esse nome, telefone ou e-mail. Clique em Salvar de novo para salvar mesmo assim.`; return; }
    closeModal();
    if ((data.obs || "") !== (p.obs || "")) Object.assign(data, { obsPor: data.obs ? ME.adm || "" : "", obsEm: data.obs ? new Date().toISOString() : "" });
    if (p.id) touch(p.id, data, "Cadastro atualizado");
    else withAdm(stamp => save(() => api.add("pessoas", { ...data, ...stamp, tipo: lg ? "legendario" : "participante", exemplo: false, criadoEm: new Date().toISOString() }), `${nome.split(" ")[0]} cadastrado`));
  });
  const del = $("#delBtn");
  if (del) del.onclick = () => {
    if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; }
    closeModal(); save(() => excluirPessoas([p], "Excluído pela ficha"), "Cadastro excluído (dá para restaurar em Excluídos)");
  };
}

/* Só o dono: apaga os selecionados ou todos do tipo (no TOP aberto), com confirmação digitada. */
/* Lixeira: quem é excluído fica guardado em config/lixeira por 60 dias e pode ser restaurado */
const LIX_DIAS = 60;
const lixeira = () => (((S.cfgDocs || {}).lixeira || {}).lista || []).filter(x => Date.now() - new Date(x.em).getTime() < LIX_DIAS * 864e5);
async function guardarNaLixeira(pessoas, motivo, arquivo) {
  const em = new Date().toISOString(), lote = "lx" + Date.now().toString(36);
  const novos = pessoas.map(p => { const { id, ...data } = p; return { id, lote, em, por: ME.adm || "", motivo, arquivo: arquivo || "", data }; });
  const ids = new Set(novos.map(x => x.id));
  await api.set("config", "lixeira", { lista: [...novos, ...lixeira().filter(x => !ids.has(x.id))].slice(0, 400) });
}
async function excluirPessoas(pessoas, motivo, arquivo) {
  await guardarNaLixeira(pessoas, motivo, arquivo);
  for (let i = 0; i < pessoas.length; i += 8) await Promise.all(pessoas.slice(i, i + 8).map(p => api.remove("pessoas", p.id)));
}
function lixeiraForm(tipo) {
  const lg = tipo === "legendario";
  const itens = lixeira().filter(x => (x.data.tipo === "legendario") === lg && (x.data.top || atualId()) === curTopId());
  const lotes = [...new Set(itens.map(x => x.lote))];
  modal(`
    <h3>Excluídos (${itens.length})</h3>
    <p class="hint" style="margin:0">Quem foi excluído fica guardado aqui por ${LIX_DIAS} dias. Restaurar devolve a pessoa com todos os dados (atestado, termo, família, observações).</p>
    ${itens.length ? lotes.map(l => { const g = itens.filter(x => x.lote === l), a = g[0];
      return `<div class="lix-grupo"><div class="lix-head"><span><b>${esc(a.motivo)}</b><br><span class="hint">${esc(quando(a.em))}${a.por ? " · por " + esc(a.por) : ""}${a.arquivo ? " · " + esc(a.arquivo) : ""}</span></span>
        ${g.length > 1 ? `<button class="btn" type="button" data-lix-lote="${esc(l)}">Restaurar os ${g.length}</button>` : ""}</div>
        <ul class="imp-list">${g.map(x => `<li style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span><b>${esc(x.data.nome)}</b> <span class="hint">${esc(x.data.telefone || "")}</span></span><button class="btn" type="button" data-lix-id="${esc(x.id)}">Restaurar</button></li>`).join("")}</ul></div>`; }).join("")
      : `<div class="empty">Ninguém excluído nos últimos ${LIX_DIAS} dias.</div>`}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`);
  const restaurar = async lista => {
    closeModal();
    const ids = new Set(lista.map(x => x.id));
    await save(async () => {
      for (const x of lista) await api.set("pessoas", x.id, x.data);
      await api.set("config", "lixeira", { lista: lixeira().filter(x => !ids.has(x.id)) });
    }, lista.length > 1 ? `${lista.length} restaurados` : `${lista[0].data.nome.split(" ")[0]} restaurado`);
  };
  document.querySelectorAll("[data-lix-id]").forEach(b => b.onclick = () => restaurar(itens.filter(x => x.id === b.dataset.lixId)));
  document.querySelectorAll("[data-lix-lote]").forEach(b => b.onclick = () => restaurar(itens.filter(x => x.lote === b.dataset.lixLote)));
}

function apagarEmMassa(todos) {
  const tipo = S.view === "legendarios" ? "legendario" : "participante";
  const lg = tipo === "legendario";
  const alvo = todos ? S.P.filter(p => lg ? p.tipo === "legendario" : p.tipo !== "legendario") : S.P.filter(p => S.sel.ids.has(p.id));
  if (!alvo.length) { toast("Nada selecionado."); return; }
  const nome = lg ? (alvo.length > 1 ? "legendários" : "legendário") : (alvo.length > 1 ? "senderistas" : "senderista");
  modal(`
    <h3>Apagar ${alvo.length} ${nome}?</h3>
    <p class="hint" style="margin:0">${todos ? `Isso apaga <b>todos os ${lg ? "legendários" : "senderistas"}</b> do ${esc(topName())}` : `Isso apaga os <b>${alvo.length} selecionados</b>`}, para todos da equipe. Ficam no botão <b>Excluídos</b> por ${LIX_DIAS} dias e dá para restaurar.</p>
    <ul class="hint" style="margin:0;max-height:140px;overflow:auto;padding-left:18px">${alvo.slice(0, 12).map(p => `<li>${esc(p.nome)}</li>`).join("")}${alvo.length > 12 ? `<li>e mais ${alvo.length - 12}…</li>` : ""}</ul>
    <div class="field"><label for="f-conf">Para confirmar, digite <b>APAGAR</b></label><input id="f-conf" name="conf" autocomplete="off" autocapitalize="characters"></div>
    <div class="warn-text" id="confWarn" hidden></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary danger-fill" type="submit">Apagar ${alvo.length}</button></div></div>`,
  async (fd) => {
    if (String(fd.get("conf") || "").trim().toUpperCase() !== "APAGAR") { const w = $("#confWarn"); w.hidden = false; w.textContent = "Digite APAGAR para confirmar."; $("#f-conf").focus(); return; }
    closeModal();
    S.sel = { on: false, tipo: "", ids: new Set() };
    toast(`Apagando ${alvo.length}…`);
    await save(() => excluirPessoas(alvo, todos ? `Apagar todos os ${lg ? "legendários" : "senderistas"}` : "Apagados pela seleção"), `${alvo.length} ${nome} apagado(s)`);
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
    }, `${novos.length} ${lg ? "legendários" : "senderistas"} importados`);
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
    ${novo && ativo ? `<p class="hint" style="margin:0">O ${esc(ativo.nome)} será finalizado e guardado na aba Tops. Senderistas, legendários e checklist do novo TOP começam do zero; estoque e pista continuam os mesmos.</p>` : ""}
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
  if (/rate limit|too many|429/i.test(m)) return "O sistema de e-mails atingiu o limite por hora. Peça ao coordenador para desligar a confirmação por e-mail no Supabase, ou tente de novo daqui a 1 hora.";
  if (/email not confirmed/i.test(m)) return "Seu e-mail ainda não foi confirmado. Abra o link que chegou no seu e-mail, ou peça ao coordenador para liberar.";
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
  const cena = $("#splash svg");
  $("#modalRoot").innerHTML = `<div class="login" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
    ${cena ? `<div class="login-scene" aria-hidden="true">${cena.outerHTML.replace(/ id="(glow|ridgeTrail)"/g, ' id="$1L"').replace(/#(glow|ridgeTrail)\b/g, "#$1L")}</div>` : ""}
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
      ${DEMO ? `<span class="note">Modo demonstração: nada é salvo. Os senderistas e a equipe são fictícios.</span>`
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
        // sem internet: confere a senha com a que ficou guardada (protegida) neste aparelho no último login
        if (navigator.onLine === false) { await entrarOffline(email, senha); return; }
        let res; try { res = await ADM_DADOS.comPrazo(sb.auth.signInWithPassword({ email, password: senha }), 15000); } catch (e) { res = { error: e }; }
        const { error } = res;
        if (error && ADM_DADOS.ehRede(error) && contaOffline(email)) { await entrarOffline(email, senha); return; }
        if (error) throw new Error(/invalid/i.test(error.message) ? "E-mail ou senha incorretos." : /confirm/i.test(error.message) ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : error.message);
        senhaLogin = { email, senha };
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
/* Login sem internet: no login com internet o app guarda neste aparelho uma "impressão" da senha (PBKDF2, não a senha)
   e o perfil. Sem internet, confere a senha digitada com essa impressão e abre com os dados guardados. */
let senhaLogin = null, loginOffline = null;
const contas = () => { try { return JSON.parse(localStorage.getItem("adm3-contas") || "{}"); } catch { return {}; } };
const contaOffline = email => contas()[email];
async function impressao(senha, sal) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(sal), iterations: 200000 }, k, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}
async function guardarContaOffline(email, senha, perfil) {
  if (!crypto.subtle || !email) return;
  try {
    const sal = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
    const c = contas(); c[email] = { sal, hash: await impressao(senha, sal), perfil, em: new Date().toISOString() };
    store.set("adm3-contas", JSON.stringify(c));
  } catch (e) { console.error(e); }
}
function esquecerConta(email) { const c = contas(); if (c[email]) { delete c[email]; store.set("adm3-contas", JSON.stringify(c)); } }
async function entrarOffline(email, senha) {
  const c = contaOffline(email);
  if (!c) throw new Error("Sem internet. Para entrar sem internet, você precisa ter entrado pelo menos uma vez neste aparelho com internet.");
  if (!crypto.subtle || await impressao(senha, c.sal) !== c.hash) throw new Error("E-mail ou senha incorretos.");
  loginOffline = { email, senha };   // só na memória: usado para entrar de verdade quando a internet voltar
  await iniciarSessao(c.perfil);
}
// internet de volta depois de um login sem internet: entra de verdade para poder enviar a fila
async function concluirLoginOffline() {
  if (!loginOffline || navigator.onLine === false) return;
  const { email, senha } = loginOffline;
  let res; try { res = await sb.auth.signInWithPassword({ email, password: senha }); } catch (e) { res = { error: e }; }
  if (res.error) {
    if (ADM_DADOS.ehRede(res.error)) return;   // tenta de novo depois
    loginOffline = null; esquecerConta(email);
    toast("Sua senha mudou. Entre de novo para enviar as alterações guardadas."); setTimeout(() => location.reload(), 2500); return;
  }
  loginOffline = null;
  const r = await sb.rpc("adm_vincular");
  if (!r.error && (!r.data || r.data.inativo)) { esquecerConta(email); ADM_DADOS.limparLocal(ME.id); await sb.auth.signOut(); location.reload(); return; }
  if (!r.error) { store.set("adm3-perfil", JSON.stringify(r.data)); aplicarPerfil(r.data); }
  if (db) db.recarregar().catch(() => {}).finally(renderNav);
}
const perfilSalvo = () => { try { return JSON.parse(localStorage.getItem("adm3-perfil") || "null"); } catch { return null; } };
async function iniciarSessao(perfilOffline) {
  if (sessaoOk) return;
  let r;
  try { if (perfilOffline || (navigator.onLine === false && perfilSalvo())) throw new TypeError("Failed to fetch"); r = await ADM_DADOS.comPrazo(Promise.resolve(sb.rpc("adm_vincular")), 12000); }
  catch (e) { r = { error: e }; }
  let p = r.data;
  // sem internet: entra com o último perfil guardado neste aparelho e os dados guardados
  if (r.error) { if (ADM_DADOS.ehRede(r.error) && (perfilOffline || perfilSalvo())) { p = perfilOffline || perfilSalvo(); S.fila = { ...(S.fila || {}), offline: true }; } else throw r.error; }
  else if (p && !p.inativo) {
    store.set("adm3-perfil", JSON.stringify(p));
    if (senhaLogin) { guardarContaOffline(senhaLogin.email, senhaLogin.senha, p); senhaLogin = null; }
    else { const u = (await sb.auth.getSession()).data.session; const em = u && u.user && u.user.email && u.user.email.toLowerCase(); const c = em && contas()[em]; if (c) { c.perfil = p; const t = contas(); t[em] = c; store.set("adm3-contas", JSON.stringify(t)); } }
  }
  else if (p && p.inativo) { const u = (await sb.auth.getSession()).data.session; if (u && u.user) esquecerConta((u.user.email || "").toLowerCase()); }
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
  if (!r.error) try { const v = await sb.from("adm_membros").select("visto_em").eq("id", p.id).maybeSingle(); primeiro = !v.error && v.data && !v.data.visto_em; } catch {}
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
    ["home", "Dashboard", "o resumo do TOP: senderistas, documentos, checklist e estoque."],
    canSee({ id: "participantes" }) && ["users", "Senderistas", "toque no status do atestado ou do termo para avançar. Quem mexer por último vira o ADM responsável."],
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
  if ($("#bvNotif")) try { sessionStorage.setItem("adm3-pediu-notif", "1"); } catch {}   // as boas-vindas já ofereceram
  const nb = $("#bvNotif"); if (nb) nb.onclick = async () => { await pedirNotificacao(); nb.remove(); };
}
function sair() {
  setMenu(false);
  if (DEMO) { location.reload(); return; }
  const pend = db ? db.estado().pendentes : 0;
  modal(`
    <h3>Sair da conta</h3>
    ${pend ? `<p class="warn-text" style="margin:0">Ainda tem <b>${pend}</b> alteração(ões) esperando internet. Se você só sair, elas continuam guardadas e são enviadas no próximo login neste aparelho. Se apagar os dados, elas se perdem.</p>` : ""}
    <p class="hint" style="margin:0">Os dados ficam guardados neste aparelho para você conseguir entrar sem internet. Em celular que não é seu, marque a opção abaixo.</p>
    <label class="selall"><input type="checkbox" id="f-apagar"> Apagar os dados guardados neste aparelho</label>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Sair</button></div></div>`,
  async () => {
    const apagar = $("#f-apagar").checked;
    if (apagar && pend && !confirm(`As ${pend} alteração(ões) não enviadas serão perdidas. Continuar?`)) return;
    const u = (await sb.auth.getSession().catch(() => ({ data: {} }))).data.session;
    if (apagar) { ADM_DADOS.limparLocal(ME.id); esquecerConta(((u && u.user && u.user.email) || store.get("adm-email") || "").toLowerCase()); }
    try { localStorage.removeItem("adm3-perfil"); } catch {}
    await desativarPush();
    await Promise.resolve(sb.auth.signOut()).catch(() => {});
    location.reload();
  });
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
const WRITE_KEYS = ["editDia", "act", "edit", "obs", "editTask", "editItem", "editTop", "topFin", "cyc", "tog", "task", "step", "kits", "editAdm", "cronoIni", "cronoFim", "cronoItem", "pagOk", "pinOk", "pinDesfaz"];
function debounceWrite(key, fn, ms = 500) { clearTimeout(pending.get(key)); pending.set(key, setTimeout(() => { pending.delete(key); fn(); }, ms)); }

document.addEventListener("click", e => {
  const cob = e.target.closest("a[data-cobrar]");
  if (cob) { const p = S.P.find(x => x.id === cob.dataset.cobrar); if (p) registrarCobranca(p); return; }
  const cobPag = e.target.closest("a[data-cobrar-pag]");
  if (cobPag) { const p = S.P.find(x => x.id === cobPag.dataset.cobrarPag); if (p) registrarAvisoPag(p); return; }
  const t = e.target.closest("button, [data-close], [data-hist-ver]");
  if (!t) return;
  if (t.matches("[data-close]") && e.target === t) { closeModal(); return; }
  if (t.matches("[data-close-btn]")) { closeModal(); return; }
  const d = t.dataset;
  if (d.go) { if (d.pinIr) S.pinf = { lote: "", q: "", ...(S.pinf || {}), st: d.pinIr }; go(d.go); return; }
  if (d.pf) { S.pf[d.pf] = d.v; if (d.pf === "aba") store.set("pend-aba", d.v); render(); return; }
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
  if (d.act === "rede") { redeInfo(); return; }
  if (d.act === "crono-pdf") { cronoPdfForm(); return; }
  if (d.act === "csg-pdf") { csgPdfForm(); return; }
  if (d.act === "csg-todo") { S.csg = { ...(S.csg || {}), de: "", ate: "" }; render(); return; }
  if (d.csgDia) { csgDiaForm(d.csgDia); return; }
  if (d.pinSt) { S.pinf.st = d.pinSt; render(); if (t.classList.contains("kpi")) { const l = $(".list.pend, .empty", $("#view")); if (l) l.scrollIntoView({ behavior: "smooth", block: "start" }); } return; }
  if (d.pinLote != null) { S.pinf.lote = S.pinf.lote === d.pinLote ? "" : d.pinLote; render(); return; }
  if (d.csgPes) { csgPessoaForm(d.csgPes); return; }
  if (d.act === "csg-rep") { csgRepForm(); return; }
  if (t.id === "notifBtn") { pedirNotificacao(); return; }
  if (!podeEditar() && WRITE_KEYS.some(k => d[k] != null)) { toast("Seu acesso é somente leitura."); return; }
  if (d.fil) { S.f.status = d.fil; render(); return; }
  if (d.act === "novo") { personForm(null, S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.act === "conserta-acento") {
    const alvo = S.P.filter(p => ["nome", "cidade"].some(k => consertaAcento(p[k]) !== p[k]));
    save(async () => { for (const p of alvo) { const d = {}; ["nome", "cidade"].forEach(k => { if (consertaAcento(p[k]) !== p[k]) d[k] = consertaAcento(p[k]); }); await api.update("pessoas", p.id, d); } }, `${alvo.length} nome(s) corrigido(s)`);
    return;
  }
  if (d.act === "kmz" && podeEditar()) { kmzForm(); return; }
  if (d.avDia) { S.avDia = d.avDia; render(); return; }
  if (d.pvIni != null && podeEditar()) { marcarTrecho(+d.pvIni, "ini"); return; }
  if (d.pvFim != null && podeEditar()) { marcarTrecho(+d.pvFim, "fim"); return; }
  if (d.pvDesf != null && podeEditar()) { if (confirm("Desfazer a marcação deste trecho?")) marcarTrecho(+d.pvDesf, "desf"); return; }
  if (d.act === "saude") { saudeBusca(); return; }
  if (d.act === "aovivo-tv") { const on = !modoTv(); try { localStorage.setItem("adm3-avtv", on ? "1" : "0"); } catch (e) {} if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); render(); return; }
  if (d.act === "mapa-cheio") { S.mapaCheio = !S.mapaCheio; if (mapaAV) mapaAV.dia = null;
    const el = document.documentElement;
    if (S.mapaCheio && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (!S.mapaCheio && document.fullscreenElement && !modoTv()) document.exitFullscreen().catch(() => {});
    render(); return; }
  if (d.act === "aovivo-tela") { const el = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen ? el.requestFullscreen() : Promise.resolve()).catch(() => {}); return; }
  if (d.act === "importar-eq") { importForm("legendario"); return; }
  if (d.eqAdd !== undefined && podeEditar()) { equipePessoaForm(null, d.eqAdd); return; }
  if (d.eqP && podeEditar()) { const p = S.P.find(x => x.id === d.eqP); if (p) equipePessoaForm(p); return; }
  if (d.act === "assinaturas") { assinaturasForm(); return; }
  if (d.act === "lixeira") { lixeiraForm(S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.act === "importar") { importForm(S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.restaurar && S.isOwner) {
    const h = S.hist.find(x => String(x.id) === d.restaurar);
    if ($("#mform")) closeModal();
    if (h && h.dados) save(() => api.set(h.col, h.doc_id, h.dados), `${h.nome || "Registro"} restaurado`);
    return;
  }
  if (d.histVer) { const h = S.hist.find(x => String(x.id) === d.histVer); if (h) histDetalhe(h); return; }
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
  if (d.dup) { dupForm(S.P.find(p => p.id === d.dup)); return; }
  if (d.pagOk) { const p = S.P.find(x => x.id === d.pagOk); if (p) touch(p.id, { inscricao: "ativa", pagoEm: new Date().toISOString() }, `${p.nome.split(" ")[0]}: pagamento confirmado`); return; }
  if (d.cronoAdm) { S.cronoAdm = d.cronoAdm; store.set("crono-adm", d.cronoAdm); render(); scrollTo({ top: 0, behavior: "smooth" }); return; }
  if (d.act === "crono-equipes") { if (S.isOwner) equipesForm(); return; }
  if (d.act === "csg-colar") { csgColarForm(); return; }
  if (d.act === "csg-cfg") { csgCfgForm(); return; }
  if (d.act === "csg-unir") { csgUnirForm(); return; }
  if (d.act === "novidade") { novidadeForm(); return; }
  if (d.act === "pdf-tela") { pdfTelaForm(); return; }
  if (d.act === "notif-ajuda") { if (estadoNotif() === "pedir") pedirNotificacao().then(render); else { try { sessionStorage.removeItem("adm3-pediu-notif"); } catch {} checarAtivarNotif(); } return; }
  if (d.usrAba) { S.usrAba = d.usrAba; render(); return; }
  if (d.act === "ativar-notif") { pedirNotificacao().then(render); return; }
  if (d.act === "pin-importar") { pinImportarForm(); return; }
  if (d.act === "pin-msg") { pinMsgForm(); return; }
  if (d.pinOk) { pinEntregar(d.pinOk); return; }
  if (d.pinDesfaz) { pinEntregar(d.pinDesfaz, true); return; }
  if (d.cronoDia) { S.cronoDia = d.cronoDia; store.set("crono-dia", d.cronoDia); render(); return; }
  if (d.cronoIni) { cronoMarcar(d.cronoIni, { ini: agoraHM(), iniPor: ME.adm, iniEm: new Date().toISOString() }, "Início marcado " + agoraHM()); return; }
  if (d.cronoFim) { cronoMarcar(d.cronoFim, { fim: agoraHM(), fimPor: ME.adm, fimEm: new Date().toISOString() }, "Fim marcado " + agoraHM()); return; }
  if (d.cronoHora) { cronoHoraForm(d.cronoHora); return; }
  if (d.cronoItem) { cronoItemForm(d.cronoItem); return; }
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
  if (e.target.id === "pinQ") { S.pinf.q = e.target.value; render(); const q = $("#pinQ"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  if (e.target.id === "csgQ") { S.csg.q = e.target.value; render(); const q = $("#csgQ"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
});
document.addEventListener("change", e => {
  if (e.target.dataset.sel && S.isOwner) { const id = e.target.dataset.sel; e.target.checked ? S.sel.ids.add(id) : S.sel.ids.delete(id); render(); return; }
  if (e.target.dataset.selall && S.isOwner) { S.sel.ids = new Set(e.target.checked ? filterPeople().map(p => p.id) : []); render(); return; }
  if (e.target.id === "admSel") { S.f.adm = e.target.value; render(); }
  if (e.target.id === "pfAdm") { S.pf.adm = e.target.value; render(); }
  if (e.target.id === "csgDe" || e.target.id === "csgAte") { S.csg[e.target.id === "csgDe" ? "de" : "ate"] = e.target.value; render(); }
  const hk = { hQuem: "quem", hAba: "aba", hAcao: "acao" }[e.target.id];
  if (hk) { S.hf[hk] = e.target.value; render(); }
  if (e.target.dataset.eqSel && podeEditar()) { const v = e.target.value; if (v) touch(e.target.dataset.eqSel, { equipe: v }, `Equipe ${v} definida`); return; }
  if (e.target.dataset.fam && !podeEditar()) { toast("Seu acesso é somente leitura."); render(); return; }
  if (e.target.dataset.fam) { const v = e.target.value; if (v) touch(e.target.dataset.fam, { familia: Number(v) }, `Família ${v.padStart(2, "0")} definida`); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches && e.target.matches("[data-hist-ver]")) { e.target.click(); return; }
  if (e.key !== "Escape") return;
  if ($(".login") && precisaLogin()) return;
  if (S.mapaCheio && !$("#modalRoot").innerHTML) { S.mapaCheio = false; if (mapaAV) mapaAV.dia = null; render(); return; }
  if ($("#modalRoot").innerHTML) closeModal();
  else if ($(".app").classList.contains("menu-open")) { setMenu(false); $("#menuBtn").focus(); }
});

/* ---------- Pendências: quem ainda deve atestado, termo ou entrar no grupo, com cobrança pelo WhatsApp ---------- */
const PEND = { pagamento: "pagamento do boleto", atestado: "atestado médico", termo: "assinatura do termo", grupo: "entrar no grupo de senderistas" };
/* Semáforo, cobrança única, ficha de saúde rápida e painel ao vivo: aprovados pelo Vinicius em 28/10 (NOVO liga tudo) */
const NOVO = () => true;
// Semáforo "pronto para o TOP": pago + termo assinado + atestado Apto (liberado pela equipe médica)
const FALTA = { pagamento: "Pagamento", termo: "Termo", apto: "Atestado Apto" };
const faltaTop = p => cancelado(p) ? [] : [pagPendente(p) && "pagamento", p.termo !== "assinado" && "termo", p.atestado !== "apto" && "apto"].filter(Boolean);
const prontoTop = p => !cancelado(p) && !faltaTop(p).length;
const MSG_COBRANCA = "Olá {nome}, tudo bem? Aqui é {adm}, da equipe ADM do {top} Legendários 3 Colinas. Para garantir sua participação, ainda falta: {pendencias}. Consegue resolver o quanto antes? Qualquer dúvida estou à disposição.";
const msgCobranca = () => store.get("adm3-msg-cobranca") || MSG_COBRANCA;
const cancelado = p => p.inscricao === "cancelada";
function pendDe(p) {
  if (cancelado(p)) return [];
  const r = [];
  if (NOVO() && pagPendente(p)) r.push("pagamento");   // cobrança única: boleto entra na mesma mensagem
  if (!atOk(p)) r.push("atestado");
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
/* Pagamentos pendentes: inscrição com boleto em aberto (vem do relatório da plataforma: inscricao = "pendente") */
const MSG_PAGAMENTO = "Olá {nome}, tudo bem? Aqui é {adm}, da equipe ADM do {top} Legendários 3 Colinas. Consta no sistema que o pagamento do boleto da sua inscrição ainda está pendente. Consegue verificar e pagar o quanto antes para garantir a sua vaga? Se já pagou, pode desconsiderar esta mensagem e, se puder, me mande o comprovante. Qualquer dúvida estou à disposição.";
const msgPagamento = () => store.get("adm3-msg-pagamento") || MSG_PAGAMENTO;
const pagPendente = p => p.inscricao === "pendente";
const abaPag = () => S.pf.aba === "pag";
function textoPagamento(p, tpl = msgPagamento()) {
  const first = String(p.nome || "").trim().split(/\s+/)[0] || "";
  return tpl.replace(/\{nome\}/g, first).replace(/\{adm\}/g, (ME.adm || "a equipe").split(" ")[0])
    .replace(/\{top\}/g, topName()).replace(/\{pendencias\}/g, "pagamento do boleto");
}
function pagLista() {
  const { quem, adm } = S.pf;
  return S.P.filter(pagPendente).filter(p => quem === "todos" || (quem === "legendario") === (p.tipo === "legendario"))
    .filter(p => !adm || (p.adm || "") === adm)
    .sort((a, b) => (a.cobradoPagEm || "").localeCompare(b.cobradoPagEm || "") || norm(a.nome).localeCompare(norm(b.nome)));
}
function registrarAvisoPag(p) { if (podeEditar()) touch(p.id, { cobradoPagEm: new Date().toISOString() }); }
function vPagamentos(abas) {
  const rows = pagLista(), todos = S.P.filter(pagPendente), ed = podeEditar();
  const seg = (k, v, l) => `<button type="button" data-pf="${k}" data-v="${v}" aria-pressed="${S.pf[k] === v}">${l}</button>`;
  const avisados = todos.filter(p => p.cobradoPagEm).length;
  return `
  <div class="head"><div><h2>Pendências</h2><p>Quem está com o <b>pagamento do boleto pendente</b>. Toque em <b>Avisar</b> para abrir o WhatsApp com a mensagem pronta, ou em <b>Avisar todos</b> para mandar um depois do outro. Quando a pessoa pagar, toque em <b>Pago</b>.</p></div>
    <div class="actions">
      <button class="btn" type="button" data-pend-act="msg">${ico("chat")} Editar mensagem</button>
      <button class="btn" type="button" data-pend-act="copiar" ${rows.length ? "" : "disabled"}>${ico("paste")} Copiar lista</button>
      ${ed ? `<button class="btn primary" type="button" data-pend-act="seq" ${rows.length ? "" : "disabled"}>${ico("wa")} Avisar todos (${rows.filter(p => waNumber(p.telefone)).length})</button>` : ""}
    </div></div>
  ${abas}
  <div class="kpis">
    <div class="kpi ${todos.length ? "alert" : ""}"><span class="lbl">Pagamento pendente</span><span class="val num">${todos.length}</span><span class="sub">senderistas e legendários</span></div>
    <div class="kpi"><span class="lbl">Já avisados</span><span class="val num">${avisados}</span><span class="sub">de ${todos.length}</span></div>
    <div class="kpi"><span class="lbl">Ainda não avisados</span><span class="val num">${todos.length - avisados}</span><span class="sub">${todos.filter(p => !waNumber(p.telefone)).length} sem telefone</span></div>
  </div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Quem">${seg("quem", "participante", "Senderistas")}${seg("quem", "legendario", "Legendários")}${seg("quem", "todos", "Todos")}</div>
    <select class="sel" id="pfAdm" aria-label="ADM responsável"><option value="">Todos os ADMs</option>${admOptions().map(a => `<option ${S.pf.adm === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
  </div>
  ${rows.length ? `<section class="panel"><div class="list pend">${rows.map(p => `<div class="li pendrow">
      <div class="grow"><b>${esc(p.nome)}</b> ${p.tipo === "legendario" ? '<span class="tag">LGND</span>' : ""}
        <div class="pendtags"><span class="chip wait">Boleto pendente</span></div>
        <small class="hint">${esc(p.telefone || "sem telefone")} · ${esc(p.adm || "Sem ADM")}${p.cobradoPagEm ? ` · avisado ${esc(quando(p.cobradoPagEm))}` : " · ainda não avisado"}</small></div>
      <div class="actions">${ed ? `<button class="btn sm" type="button" data-pag-ok="${p.id}">${ico("check")} Pago</button>` : ""}
      ${waNumber(p.telefone) ? `<a class="wa" href="${waCobrar(p, textoPagamento(p))}" target="_blank" rel="noopener" data-cobrar-pag="${p.id}">${ico("wa")} Avisar</a>` : `<span class="wa off">${ico("wa")} Sem telefone</span>`}</div>
    </div>`).join("")}</div></section>`
  : `<section class="panel"><div class="empty">Ninguém com pagamento pendente neste filtro.</div></section>`}`;
}
function diasParaTop() {
  const ini = (topDoc() || {}).inicio; if (!ini) return null;
  const d = Math.ceil((new Date(ini + "T00:00:00") - new Date()) / 864e5);
  return isNaN(d) ? null : d;
}
function vPendencias() {
  const nDoc = S.P.filter(p => pendDe(p).length).length, nPag = S.P.filter(pagPendente).length;
  const abas = `<div class="seg" role="group" aria-label="Tipo de pendência"><button type="button" data-pf="aba" data-v="doc" aria-pressed="${!abaPag()}">Documentos e grupo <span class="num" style="opacity:.75">${nDoc}</span></button><button type="button" data-pf="aba" data-v="pag" aria-pressed="${abaPag()}">Pagamentos pendentes <span class="num" style="opacity:.75">${nPag}</span></button></div>`;
  if (abaPag()) return vPagamentos(abas);
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
  ${abas}
  ${dias != null ? `<div class="banner"><span>${dias > 0 ? `Faltam <b>${dias} dia${dias > 1 ? "s" : ""}</b> para o ${esc(topName())}.` : dias === 0 ? `O ${esc(topName())} começa hoje.` : `O ${esc(topName())} já começou.`} ${rows.length} pessoa(s) com pendência neste filtro.</span></div>` : ""}
  <div class="kpis">
    <button class="kpi ${conta("atestado") ? "alert" : ""}" type="button" data-pf="oque" data-v="atestado"><span class="lbl">Sem atestado</span><span class="val num">${conta("atestado")}</span><span class="sub">senderistas e legendários</span></button>
    <button class="kpi ${conta("termo") ? "alert" : ""}" type="button" data-pf="oque" data-v="termo"><span class="lbl">Sem termo</span><span class="val num">${conta("termo")}</span><span class="sub">senderistas e legendários</span></button>
    <button class="kpi" type="button" data-pf="oque" data-v="grupo"><span class="lbl">Fora do grupo</span><span class="val num">${conta("grupo")}</span><span class="sub">senderistas</span></button>
    <div class="kpi"><span class="lbl">Tudo em dia</span><span class="val num">${vivos.filter(p => !pendDe(p).length).length}</span><span class="sub">de ${vivos.length} pessoas</span></div>
  </div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Quem">${seg("quem", "participante", "Senderistas")}${seg("quem", "legendario", "Legendários")}${seg("quem", "todos", "Todos")}</div>
    <select class="sel" id="pfAdm" aria-label="ADM responsável"><option value="">Todos os ADMs</option>${admOptions().map(a => `<option ${S.pf.adm === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
  </div>
  <div class="seg" role="group" aria-label="Pendência">${seg("oque", "qualquer", "Qualquer pendência")}${seg("oque", "atestado", "Atestado")}${seg("oque", "termo", "Termo")}${seg("oque", "grupo", "Grupo")}</div>
  ${rows.length ? `<section class="panel"><div class="list pend">${rows.map(p => `<div class="li pendrow">
      <div class="grow"><b>${esc(p.nome)}</b> ${p.tipo === "legendario" ? '<span class="tag">LGND</span>' : ""}
        <div class="pendtags">${tags(p)}${p.dataAtestado && !atOk(p) ? `<span class="hint">previsão: ${esc(p.dataAtestado)}</span>` : ""}</div>
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
  if (k.includes("pagamento")) data.cobradoPagEm = data.cobradoEm;   // cobrança única também avisa do boleto
  touch(p.id, data);
}
function msgForm() {
  const pag = abaPag(), chave = pag ? "adm3-msg-pagamento" : "adm3-msg-cobranca", PADRAO = pag ? MSG_PAGAMENTO : MSG_COBRANCA;
  modal(`
    <h3>${pag ? "Mensagem do boleto pendente" : "Mensagem de cobrança"}</h3>
    <p class="hint" style="margin:0">Use <b>{nome}</b>, <b>{adm}</b>${pag ? " e <b>{top}</b>" : ", <b>{top}</b> e <b>{pendencias}</b>"}: o app troca pelo primeiro nome da pessoa, o seu nome${pag ? " e o nome do TOP" : ", o nome do TOP e o que falta"}. Fica salva neste aparelho.</p>
    <div class="field"><label for="f-msg">Mensagem</label><textarea id="f-msg" name="msg" style="min-height:150px">${esc(pag ? msgPagamento() : msgCobranca())}</textarea></div>
    <div class="modal-foot"><div><button class="btn ghost" type="button" id="msgPadrao">Voltar ao padrão</button></div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { store.set(chave, String(fd.get("msg") || "").trim() || PADRAO); closeModal(); toast("Mensagem salva"); render(); });
  $("#msgPadrao").onclick = () => { $("#f-msg").value = PADRAO; };
}
function cobrarSequencia() {
  const pag = abaPag(), texto = pag ? textoPagamento : textoCobranca, registrar = pag ? registrarAvisoPag : registrarCobranca;
  const fila = (pag ? pagLista() : pendLista()).filter(p => waNumber(p.telefone));
  if (!fila.length) { toast("Ninguém com telefone nesse filtro."); return; }
  let i = 0;
  const passo = () => {
    if (i >= fila.length) { closeModal(); toast(`${pag ? "Aviso" : "Cobrança"} concluído: ${fila.length} pessoa(s)`); return; }
    const p = S.P.find(x => x.id === fila[i].id) || fila[i];
    modal(`
      <h3>${pag ? "Avisar" : "Cobrar"} ${i + 1} de ${fila.length}</h3>
      <div class="bar"><i style="width:${pct(i, fila.length)}%"></i></div>
      <div><b style="font-size:18px">${esc(p.nome)}</b><div class="pendtags">${pag ? '<span class="chip wait">Boleto pendente</span>' : pendDe(p).map(k => `<span class="chip wait">${PEND[k]}</span>`).join("")}</div>
        <small class="hint">${esc(p.telefone || "")} · ${esc(p.adm || "Sem ADM")}${(pag ? p.cobradoPagEm : p.cobradoEm) ? (pag ? " · avisado " : " · cobrado ") + esc(quando(pag ? p.cobradoPagEm : p.cobradoEm)) : ""}</small></div>
      <div class="field"><label for="f-txt">Mensagem (pode ajustar antes de enviar)</label><textarea id="f-txt" style="min-height:130px">${esc(texto(p))}</textarea></div>
      <div class="modal-foot"><div><button class="btn ghost" type="button" data-close-btn>Parar</button></div>
        <div class="actions"><button class="btn" type="button" id="seqPular">Pular</button><a class="btn primary" id="seqWa" href="#" target="_blank" rel="noopener">${ico("wa")} Abrir WhatsApp</a></div></div>`, () => {});
    const wa = $("#seqWa");
    const atual = () => { wa.href = waCobrar(p, $("#f-txt").value); };
    atual(); $("#f-txt").addEventListener("input", atual);
    wa.addEventListener("click", () => { registrar(p); i++; setTimeout(passo, 400); });
    $("#seqPular").onclick = () => { i++; passo(); };
  };
  passo();
}
async function copiarPendencias() {
  const pag = abaPag(), rows = pag ? pagLista() : pendLista();
  const txt = pag ? `Pagamento do boleto pendente · ${topName()}\n\n` + rows.map(p => `• ${p.nome}${p.telefone ? " · " + p.telefone : ""}${p.adm ? ` (${p.adm})` : ""}`).join("\n")
    : `Pendências · ${topName()}\n\n` + rows.map(p => `• ${p.nome}: ${listaE(pendDe(p).map(k => k === "grupo" ? "grupo" : k))}${p.adm ? ` (${p.adm})` : ""}`).join("\n");
  try { await navigator.clipboard.writeText(txt); toast(`Lista copiada (${rows.length})`); }
  catch { modal(`<h3>Copiar lista</h3><textarea style="min-height:240px;width:100%" readonly>${esc(txt)}</textarea><div class="modal-foot"><span></span><button class="btn" type="button" data-close-btn>Fechar</button></div>`, () => {}); }
}

/* ---------- Histórico de alterações (só o dono). No Supabase vem da tabela adm_historico; na demonstração fica na memória. ---------- */
const CAMPOS = { nome: "Nome", telefone: "Telefone", email: "E-mail", atestado: "Atestado", termo: "Termo", dataAtestado: "Previsão do atestado",
  cidade: "Cidade", idade: "Idade", familia: "Família", nfc: "NFC", msgGrupo: "Mensagem do grupo", noGrupo: "Entrou no grupo", obs: "Observações",
  equipe: "Equipe", status: "Status", qtd: "Quantidade", titulo: "Tarefa", responsavel: "Responsável", fornecedor: "Fornecedor", item: "Item",
  local: "Local", trechos: "Trechos", kitsMRE: "Kits MRE", topAtual: "TOP atual", inscricao: "Inscrição", ficha: "Dados da inscrição",
  tipo: "Tipo", top: "TOP", mais40: "+40", cobradoEm: "Cobrado em", cobradoPagEm: "Avisado do boleto em", pagoEm: "Pagamento confirmado em", fase: "Fase", ordem: "Ordem", metaMRE: "Meta MRE", alertaBaixo: "Alerta de estoque",
  inicio: "Início", fim: "Fim", finalizadoEm: "Finalizado em", resp: "Responsável", dia: "Dia" };
const IGNORAR = ["adm", "admId", "admEm", "atualizado", "obsPor", "obsEm"];
function abaDoRegistro(col, d) {
  if (col === "pessoas") return d && d.tipo === "legendario" ? "Legendários" : "Senderistas";
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
// Detalhe de uma linha do histórico: tudo o que mudou, sem cortar, e atalho para abrir o registro
function fmtCheio(k, v) {
  if (v == null || v === "") return "vazio";
  if (Array.isArray(v)) return v.every(x => x == null || typeof x !== "object") ? (v.length ? v.join(", ") : "vazio") : `${v.length} item(ns)`;
  if (typeof v === "object") { const e = Object.entries(v).filter(([, x]) => x != null && x !== ""); return e.length && e.length <= 8 && e.every(([, x]) => typeof x !== "object") ? e.map(([a, x]) => `${chaveNome(a)}: ${typeof x === "boolean" ? (x ? "Sim" : "Não") : fmtCheio(a, x)}`).join(" · ") : `${e.length} campo(s)`; }
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) { const d = new Date(v); if (!isNaN(d)) return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  const r = fmtValor(k, v); return r.endsWith("…") ? String(v) : r;
}
// nomes amigáveis para as chaves internas (trechos da pista, momentos do cronograma) e para os documentos de configuração
function chaveNome(k) {
  if (CAMPOS[k]) return CAMPOS[k];
  const t = /^d(\d+)-(\d+)$/.exec(k); if (t) return `D${t[1]} · trecho ${+t[2] + 1}`;
  for (const d of cronoPlano()) { const i = (d.itens || []).find(i => i.id === k); if (i) return `${d.nome || ""} ${i.hora || ""} ${i.atv}`.trim(); }
  return { ini: "Início", fim: "Fim", iniPor: "Início marcado por", fimPor: "Fim marcado por", marcas: "Marcações", linhas: "Linhas do mapa", pontos: "Pontos do mapa", arquivo: "Arquivo" }[k] || k;
}
function nomeConfig(id) {
  const adm = /-adm-(.+)$/.exec(id), m = adm && (S.equipe || []).find(x => String(x.id) === adm[1]);
  return id === "pista-mapa" ? "Mapa da pista (KMZ)" : id.startsWith("pista-vivo-") ? "Mapa ao vivo (Saiu/Chegou da corrente)"
    : id.startsWith("cronoplano-") ? "Cronograma (plano)" : id.startsWith("crono-") ? `Cronograma marcado${m ? " por " + (m.nome || m.email) : ""}`
    : id.startsWith("equipes-") ? "Equipes de ADMs" : id.startsWith("pin-") ? "Pins" : id.startsWith("consagracao") ? "Consagração"
    : id === "lixeira" ? "Excluídos (lixeira)" : id === "msg-hist" ? "Mensagens enviadas" : id === "novidade" ? "Aviso de novidade" : id === "aviso" ? "Aviso de planilha" : id;
}
const rotuloItem = x => x && typeof x === "object" ? x.nome || x.atv || x.titulo || x.item || x.dia || x.de && x.para && `${x.de} → ${x.para}` || "" : String(x);
function linhasMudanca(k, a, b, pre) {
  const nome = (pre ? pre + " › " : "") + chaveNome(k);
  const obj = v => v && typeof v === "object" && !Array.isArray(v);
  if (obj(a) || obj(b)) {
    const sub = diffDados(obj(a) ? a : {}, obj(b) ? b : {}), ks = Object.keys(sub);
    if (ks.length && !pre) return ks.slice(0, 60).flatMap(s => linhasMudanca(s, sub[s][0], sub[s][1], nome)).join("") + (ks.length > 60 ? `<li class="hint">e mais ${ks.length - 60} mudança(s)</li>` : "");
  }
  if (Array.isArray(a) && Array.isArray(b) && [...a, ...b].some(x => x && typeof x === "object")) {
    const ja = a.map(x => JSON.stringify(x)), jb = b.map(x => JSON.stringify(x));
    const saiu = a.filter((x, i) => !jb.includes(ja[i])), entrou = b.filter((x, i) => !ja.includes(jb[i]));
    const lista = l => l.map(rotuloItem).filter(Boolean).slice(0, 12).map(esc).join(", ");
    return `<li><span>${esc(nome)}:</span> ${a.length} → <b>${b.length} item(ns)</b>${entrou.length ? `<br><small>Entrou ou mudou: ${lista(entrou) || entrou.length}</small>` : ""}${saiu.length ? `<br><small>Saiu ou era antes: ${lista(saiu) || saiu.length}</small>` : ""}</li>`;
  }
  const fa = fmtCheio(k, a), fb = fmtCheio(k, b);
  return fa === fb ? "" : `<li><span>${esc(nome)}:</span> ${esc(fa)} → <b>${esc(fb)}</b></li>`;
}
function histDetalhe(h) {
  const x = histLinha(h), d = new Date(x.em);
  const lista = { pessoas: S.pessoas, tarefas: S.tarefas, estoque: S.estoque, pista: S.pista, tops: S.tops }[x.col];
  const atual = lista ? lista.find(r => r.id === x.doc_id) : x.col === "config" ? (S.cfgDocs || {})[x.doc_id] : null;
  const verbo = { criou: "criou", alterou: "alterou", apagou: "apagou" }[x.acao];
  const campos = r => Object.entries(r || {}).filter(([k, v]) => !IGNORAR.includes(k) && k !== "id" && v != null && v !== "" && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => v && typeof v === "object" && !Array.isArray(v) && Object.values(v).some(y => y && typeof y === "object")
      ? Object.entries(v).slice(0, 60).map(([s2, y]) => `<li><span>${esc(chaveNome(k) + " › " + chaveNome(s2))}:</span> <b>${esc(fmtCheio(s2, y))}</b></li>`).join("")
      : `<li><span>${esc(chaveNome(k))}:</span> <b>${esc(fmtCheio(k, v))}</b></li>`).join("");
  const mud = x.mudancas ? Object.entries(x.mudancas).filter(([k]) => !IGNORAR.includes(k)).map(([k, [a, b]]) => linhasMudanca(k, a, b)).join("") : "";
  const corpo = x.acao === "alterou" ? (mud ? `<h4>O que mudou (antes → depois)</h4><ul class="hmud hdet">${mud}</ul>` : `<p class="hint">Sem detalhes da mudança.</p>`)
    : x.acao === "apagou" ? `<h4>Como estava quando foi apagado</h4><ul class="hmud hdet">${campos(x.dados) || "<li>Sem dados guardados.</li>"}</ul>`
    : `<h4>${atual ? "Como está agora" : "Este registro não existe mais"}</h4>${atual ? `<ul class="hmud hdet">${campos(atual)}</ul>` : ""}`;
  const pessoa = x.col === "pessoas" && atual;
  modal(`<h3>${esc(x.col === "config" ? nomeConfig(x.doc_id) : x.nome || x.doc_id)}</h3>
    <p class="hint" style="margin:0 0 12px"><b>${esc(x.quem)}</b> ${verbo} em <span class="tag">${esc(x.aba)}</span> · ${esc(d.toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }))}</p>
    ${corpo}
    <div class="modal-foot"><span>${x.acao === "apagou" && x.dados && !atual ? `<button class="btn" type="button" data-restaurar="${esc(String(x.id))}">Restaurar</button>` : ""}</span>
      <span style="display:flex;gap:8px">${pessoa ? `<button class="btn" type="button" id="histAbrir">Abrir ficha</button>` : ""}<button class="btn primary" type="button" data-close-btn>Fechar</button></span></div>`, () => {});
  const ab = $("#histAbrir"); if (ab) ab.onclick = () => { closeModal(); personForm(atual); };
}
const histLinha = x => ({ ...x, aba: abaDoRegistro(x.col, x.dados || { tipo: x.tipo || ((S.pessoas.find(p => p.id === x.doc_id) || {}).tipo) }) });
function histFiltrado() {
  const h = S.hf, nq = norm(h.q);
  return S.hist.map(histLinha).filter(x => (!h.quem || x.quem === h.quem) && (!h.aba || x.aba === h.aba) && (!h.acao || x.acao === h.acao)
    && (!nq || norm(x.nome).includes(nq) || norm(x.quem).includes(nq)));
}
function vHistorico() {
  if (!DEMO && !S.histOk) { carregarHist(); return `<div class="head"><div><h2>Histórico</h2><p>Carregando…</p></div></div>`; }
  if (S.histErro === "sem-tabela") return `
    <div class="head"><div><h2>Histórico</h2></div></div>
    <section class="panel"><div class="empty">Falta criar o histórico no banco. No Supabase, abra <b>SQL Editor → New query</b>, cole o arquivo <b>supabase/historico.sql</b> e clique em <b>Run</b>. Depois toque em <b>Tentar de novo</b>.
      <div style="margin-top:12px"><button class="btn primary" type="button" data-hist-act="atualizar">Tentar de novo</button></div>
      ${S.histDetalhe ? `<p class="hint" style="margin-top:10px;font-size:12px">Detalhe: ${esc(S.histDetalhe)}</p>` : ""}</div></section>`;
  const h = S.hf;
  const quem = [...new Set(S.hist.map(x => x.quem))].sort();
  const rows = histFiltrado();
  const abas = [...new Set(S.hist.map(histLinha).map(x => x.aba))].sort();
  const verbo = { criou: "criou", alterou: "alterou", apagou: "apagou" };
  let dia = "";
  const itens = rows.slice(0, 400).map(x => {
    const d = new Date(x.em), dd = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
    const cab = dd !== dia ? `<div class="hdia">${esc(dd)}</div>` : ""; dia = dd;
    const mud = x.mudancas ? Object.entries(x.mudancas).filter(([k]) => !IGNORAR.includes(k)).filter(([k, [a, b]]) => fmtValor(k, a) !== fmtValor(k, b) || (a && typeof a === "object")).map(([k, [a, b]]) => `<li><span>${esc(chaveNome(k))}:</span> ${esc(fmtValor(k, a))} → <b>${esc(fmtValor(k, b))}</b></li>`).join("") : "";
    return `${cab}<div class="hrow ${x.acao}" data-hist-ver="${esc(String(x.id))}" role="button" tabindex="0" title="Ver detalhes">
      <span class="htime num">${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      <div class="grow"><div><b>${esc(x.quem)}</b> ${verbo[x.acao]} <span class="tag">${esc(x.aba)}</span> ${esc(x.col === "config" ? nomeConfig(x.doc_id) : x.nome || x.doc_id)}</div>
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
  const out = [], ignorados = [];
  linhas.slice(1).forEach(r => {
    const nome = limpaNome(r[iNome]); if (!nome) return;
    const st = sts.map(i => norm(r[i])).join(" ");
    // participante é só quem está como Senderista; legendário é quem está como Legendário
    const tipoTxt = norm(I.tipo >= 0 ? g(r, I.tipo) : g(r, I.ingresso));
    const tipo = /legendario/.test(tipoTxt) ? "legendario" : /senderista/.test(tipoTxt) || (I.tipo < 0 && /participante/.test(tipoTxt)) ? "participante" : "";
    if (!tipo) { ignorados.push({ nome, como: g(r, I.tipo) || g(r, I.ingresso) || "sem tipo" }); return; }
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
  out.ignorados = ignorados;
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
  const vistos = new Set(), novos = [], ja = [], canc = [], repPlan = [];
  lidos.forEach(n => {
    if (n.inscricao === "cancelada") {
      if (ativo(n) || vistos.has("c" + chave(n))) return;
      vistos.add("c" + chave(n));
      const a = acharNoApp(n); canc.push({ n, p: a && a.p }); return;
    }
    if (vistos.has(chave(n))) { repPlan.push(n); return; } vistos.add(chave(n));
    const a = acharNoApp(n);
    if (a) ja.push({ n, p: a.p, por: a.por }); else novos.push(n);
  });
  const ign = lidos.ignorados || [];
  // quem está no app (do mesmo tipo que veio no relatório) e não aparece em nenhuma linha: saiu da plataforma ou foi cadastrado à mão
  const tipos = new Set(lidos.map(n => n.tipo === "legendario" ? "legendario" : "participante"));
  const achados = new Set([...ja.map(x => x.p.id), ...canc.filter(c => c.p).map(c => c.p.id)]);
  lidos.forEach(n => { const a = acharNoApp(n); if (a) achados.add(a.p.id); });
  const comoOutro = new Map(ign.map(x => [norm(x.nome), x.como]));
  const fora = S.P.filter(p => tipos.has(p.tipo === "legendario" ? "legendario" : "participante") && !cancelado(p) && !achados.has(p.id) && !p.exemplo)
    .map(p => ({ p, como: comoOutro.get(norm(p.nome)) || "" }));
  novos.forEach(n => { const o = acharNoApp({ ...n, tipo: n.tipo === "legendario" ? "participante" : "legendario" }); if (o) n.outroTipo = o.p; });
  return { novos, ja, canc, ign, repPlan, fora, total: lidos.length + ign.length };
}
/* Importar assinaturas (CSV do termo, ZapSign): só quem está "Assinado" vira termo assinado; "Enviado" não muda nada */
const ehAssinaturas = linhas => { const h = (linhas[0] || []).map(x => norm(String(x))); return h.some(x => /assinatura/.test(x)) && h.some(x => /^status/.test(x)); };
function assinaturasForm(pre) {
  modal(`
    <h3>Importar assinaturas do termo</h3>
    <p class="hint" style="margin:0">Envie a planilha de assinaturas (.csv ou .xlsx, colunas Nome, E-mail, Status e Tipo). Só quem está como <b>Assinado</b> fica com o termo assinado no app. Quem está como Enviado não é alterado.</p>
    ${pre ? `<p class="hint" style="margin:0">Reconheci a planilha como <b>assinaturas do termo</b>.</p>` : ""}
    <div class="field" ${pre ? "hidden" : ""}><label for="f-ass">Planilha</label><input id="f-ass" type="file" accept=".csv,.xlsx,.xls"></div>
    <div id="assPrev" class="imp-prev"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="assBtn" disabled>Atualizar</button></div></div>`,
  () => {
    if (!A || !A.marcar.length) return;
    closeModal();
    const lista = A.marcar;
    save(async () => { for (let i = 0; i < lista.length; i += 8) await Promise.all(lista.slice(i, i + 8).map(({ p, data }) => api.update("pessoas", p.id, { termo: "assinado", ...(data ? { termoAssinadoEm: data } : {}) }))); },
      `Termo assinado: ${lista.length} pessoa(s) atualizada(s)`);
  });
  let A = null;
  const mostrar = linhas => {
    const prev = $("#assPrev");
    try {
      A = analisarAssinaturas(linhas);
      if (!A) { prev.innerHTML = `<div class="bad-text">Não achei as colunas Nome e Status nessa planilha.</div>`; return; }
      const li = (x, extra = "") => `<li><b>${esc(x.nome)}</b> <span class="hint">${x.tipo === "legendario" ? "Legendário" : "Senderista"}${extra}</span></li>`;
      prev.innerHTML = `
        <div class="imp-kpis">
          <div class="ok"><b class="num">${A.marcar.length}</b><span>vão ficar assinados</span></div>
          <div><b class="num">${A.assinados}</b><span>assinados na planilha</span></div>
          <div><b class="num">${A.enviados}</b><span>só enviados (não mudam)</span></div>
          <div class="bad"><b class="num">${A.nao.length}</b><span>não achei no app</span></div>
        </div>
        <details open><summary>Vão ficar com termo assinado (${A.marcar.length})</summary><ul class="imp-list">${A.marcar.map(({ p, n }) => li(n, ` · era ${esc((TERMO.find(t => t.v === p.termo) || {}).l || "Pendente")}${norm(p.nome) !== norm(n.nome) ? ` · no app: ${esc(p.nome)}` : ""}`)).join("") || '<li class="hint">Ninguém novo.</li>'}</ul></details>
        ${A.ja.length ? `<details><summary>Já estavam assinados no app (${A.ja.length})</summary><ul class="imp-list">${A.ja.map(x => li(x)).join("")}</ul></details>` : ""}
        ${A.nao.length ? `<details open><summary class="bad-text">Assinaram, mas não achei no app (${A.nao.length})</summary><p class="hint" style="margin:6px 0">Confira se o nome está escrito diferente no app e marque o termo na ficha.</p><ul class="imp-list">${A.nao.map(n => li(n, n.email ? " · " + esc(n.email) : "")).join("")}</ul></details>` : ""}`;
      $("#assBtn").disabled = !A.marcar.length;
      $("#assBtn").textContent = A.marcar.length ? `Marcar ${A.marcar.length} como assinado` : "Nada para atualizar";
    } catch (err) { console.error(err); prev.innerHTML = `<div class="bad-text">Não consegui ler esse arquivo.</div>`; }
  };
  if (pre) mostrar(pre);
  $("#f-ass").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    $("#assPrev").innerHTML = `<div class="hint">Lendo ${esc(f.name)}…</div>`; $("#assBtn").disabled = true;
    try {
      mostrar(await lerPlanilha(f));
    } catch (err) { console.error(err); $("#assPrev").innerHTML = `<div class="bad-text">Não consegui ler esse arquivo.</div>`; }
  });
}
/* Planilha de avaliações médicas (atestados): Documento "Recebido" = atestado confirmado; Status Avaliação "Apto" = Apto. O resto não muda. */
const ehAvaliacoes = linhas => { const h = (linhas[0] || []).map(x => norm(String(x))); return h.some(x => /^status avalia/.test(x)) && h.some(x => /^documento/.test(x)); };
function analisarAvaliacoes(linhas) {
  const h = (linhas[0] || []).map(x => norm(String(x)));
  const iN = h.findIndex(x => /^nome$/.test(x)), iD = h.findIndex(x => /^documento/.test(x)), iS = h.findIndex(x => /^status avalia/.test(x));
  const out = { aptos: 0, recebidos: 0, outros: 0, marcar: [], ja: [], nao: [] }, vistos = new Set();
  linhas.slice(1).filter(r => String(r[iN] || "").trim()).forEach(r => {
    const nome = String(r[iN]).trim(), apto = /^apto/.test(norm(String(r[iS] || ""))), receb = /^recebid/.test(norm(String(r[iD] || "")));
    if (!apto && !receb) { out.outros++; return; }
    apto ? out.aptos++ : out.recebidos++;
    const n = { nome, email: "", telefone: "" };
    const a = acharNoApp({ ...n, tipo: "participante" }) || acharNoApp({ ...n, tipo: "legendario" });
    if (!a) { out.nao.push({ ...n, novo: apto ? "apto" : "confirmado" }); return; }
    if (vistos.has(a.p.id)) return; vistos.add(a.p.id);
    const novo = apto ? "apto" : "confirmado";
    // não rebaixa: quem já está Apto não volta para Confirmado
    if (a.p.atestado === novo || a.p.atestado === "apto") out.ja.push({ p: a.p, novo }); else out.marcar.push({ p: a.p, novo });
  });
  return out;
}
function avaliacoesForm(linhas) {
  const A = analisarAvaliacoes(linhas), lbl = v => (ATESTADO.find(t => t.v === v) || {}).l || "Pendente";
  const li = (p, extra) => `<li><b>${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}${extra || ""}</span></li>`;
  modal(`
    <h3>Importar atestados</h3>
    <p class="hint" style="margin:0">Reconheci a planilha como <b>avaliações médicas</b>. Documento <b>Recebido</b> fica como atestado <b>Confirmado</b> (a pessoa enviou). Status <b>Apto</b> fica como <b>Apto</b> (a equipe médica liberou). Quem está só aguardando ou para avaliar não muda.</p>
    <div class="imp-kpis">
      <div class="ok"><b class="num">${A.marcar.length}</b><span>vão ser atualizados</span></div>
      <div><b class="num">${A.aptos}</b><span>aptos na planilha</span></div>
      <div><b class="num">${A.recebidos}</b><span>recebidos (ainda sem avaliação)</span></div>
      <div class="bad"><b class="num">${A.nao.length}</b><span>não achei no app</span></div>
    </div>
    <details open><summary>Vão ser atualizados (${A.marcar.length})</summary><ul class="imp-list">${A.marcar.map(({ p, novo }) => li(p, ` · ${esc(lbl(p.atestado))} → <b>${esc(lbl(novo))}</b>`)).join("") || '<li class="hint">Ninguém novo.</li>'}</ul></details>
    ${A.ja.length ? `<details><summary>Já estavam assim no app (${A.ja.length})</summary><ul class="imp-list">${A.ja.map(({ p }) => li(p, " · " + esc(lbl(p.atestado)))).join("")}</ul></details>` : ""}
    ${A.nao.length ? `<details open><summary class="bad-text">Não achei no app (${A.nao.length})</summary><p class="hint" style="margin:6px 0">Confira se o nome está escrito diferente no app e mude o atestado na ficha.</p><ul class="imp-list">${A.nao.map(n => `<li><b>${esc(n.nome)}</b> <span class="hint">${esc(lbl(n.novo))}</span></li>`).join("")}</ul></details>` : ""}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" ${A.marcar.length ? "" : "disabled"}>${A.marcar.length ? `Atualizar ${A.marcar.length}` : "Nada para atualizar"}</button></div></div>`,
  () => {
    if (!A.marcar.length) return;
    closeModal();
    const em = new Date().toISOString();
    save(async () => { for (let i = 0; i < A.marcar.length; i += 8) await Promise.all(A.marcar.slice(i, i + 8).map(({ p, novo }) => api.update("pessoas", p.id, { atestado: novo, ...(novo === "apto" ? { aptoEm: em } : {}) }))); },
      `Atestado: ${A.marcar.length} pessoa(s) atualizada(s)`);
  });
}
function analisarAssinaturas(linhas) {
  const h = (linhas[0] || []).map(x => norm(String(x)));
  const col = re => h.findIndex(x => re.test(x));
  const iN = col(/^nome/), iE = col(/mail/), iS = col(/^status/), iT = col(/^tipo/), iD = col(/data assinatura/);
  if (iN < 0 || iS < 0) return null;
  const rows = linhas.slice(1).filter(r => String(r[iN] || "").trim()).map(r => {
    const st = norm(String(r[iS] || "")), tp = norm(String(iT >= 0 ? r[iT] : ""));
    const dt = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(iD >= 0 ? r[iD] : ""));
    return { nome: String(r[iN]).trim(), email: String(iE >= 0 ? r[iE] : "").trim().toLowerCase(), telefone: "", tipo: /legend/.test(tp) ? "legendario" : "participante",
      assinado: /assinad/.test(st), enviado: /enviad/.test(st), data: dt ? `${dt[3]}-${dt[2]}-${dt[1]}` : "" };
  });
  const out = { assinados: 0, enviados: 0, marcar: [], ja: [], nao: [] }, vistos = new Set();
  rows.forEach(n => {
    if (!n.assinado) { if (n.enviado) out.enviados++; return; }
    out.assinados++;
    // e-mail repetido entre pessoas diferentes: acharNoApp só aceita e-mail se o primeiro nome também bate
    const a = acharNoApp(n);
    if (!a) { out.nao.push(n); return; }
    if (vistos.has(a.p.id)) return; vistos.add(a.p.id);
    if (a.p.termo === "assinado") out.ja.push(n); else out.marcar.push({ p: a.p, n, data: n.data });
  });
  return out;
}
function importForm(tipoAtual) {
  modal(`
    <h3>Importar relatório de inscrições</h3>
    <p class="hint" style="margin:0">Envie a planilha de inscritos, a de assinaturas do termo, a de avaliações (atestados) ou a de equipes dos legendários, em .xlsx ou .csv: o app reconhece qual é. O app compara com quem já está cadastrado (pelo nome, telefone ou e-mail) e só adiciona quem ainda não está. Só entram os que estão como Senderista ou Legendário. Inscrições canceladas são ignoradas. O CPF não é importado.</p>
    <div class="field"><label for="f-arq">Planilha</label><input id="f-arq" type="file" accept=".xlsx,.xls,.csv"></div>
    <div id="impPrev" class="imp-prev"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="impBtn" disabled>Importar</button></div></div>`,
  async () => {
    if (!R) return;
    const marcados = new Set([...document.querySelectorAll("[data-imp-novo]:checked")].map(x => Number(x.dataset.impNovo)));
    const novos = R.novos.filter((_, i) => marcados.has(i));
    const completar = $("#impCompletar") && $("#impCompletar").checked;
    const marcarCanc = $("#impCanc") && $("#impCanc").checked;
    const foraSel = new Set([...document.querySelectorAll("[data-imp-fora]:checked")].map(x => x.dataset.impFora));
    closeModal();
    await importarRelatorio(novos, completar ? R.ja : [], marcarCanc ? R.canc.filter(c => c.p && !cancelado(c.p)) : [], R.arquivo, R.fora.filter(f => foraSel.has(f.p.id)).map(f => f.p));
  });
  let R = null;
  $("#f-arq").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    const prev = $("#impPrev"); prev.innerHTML = `<div class="hint">Lendo ${esc(f.name)}…</div>`; $("#impBtn").disabled = true;
    try {
      const linhas = await lerPlanilha(f);
      if (ehAssinaturas(linhas)) { closeModal(); assinaturasForm(linhas); return; }
      if (ehAvaliacoes(linhas)) { closeModal(); avaliacoesForm(linhas); return; }
      if (ehEquipes(linhas)) { closeModal(); equipesImportForm(linhas); return; }
      R = analisarImport(lerRelatorio(linhas)); R.arquivo = f.name;
      prev.innerHTML = previewImport(R);
      $("#impBtn").disabled = !R.novos.length && !R.ja.length && !R.canc.some(c => c.p) && !R.fora.length;
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
  const tl = n => n.tipo === "legendario" ? "Legendário" : "Senderista";
  const nP = R.novos.filter(n => n.tipo !== "legendario").length, nL = R.novos.length - nP;
  const cancApp = R.canc.filter(c => c.p);
  const tag = n => [n.outroTipo ? `<span class="chip bad">Já está como ${tipoNome(n.outroTipo)}</span>` : "", n.inscricao === "pendente" ? '<span class="chip wait">Pagamento pendente</span>' : "", n.idade >= 40 ? '<span class="tag">+40</span>' : "", n.ficha.camisa ? `<span class="tag">Camisa ${esc(n.ficha.camisa)}</span>` : ""].join(" ");
  return `
  <div class="imp-kpis">
    <div><b class="num">${R.total}</b><span>linhas lidas</span></div>
    <div class="ok"><b class="num">${R.novos.length}</b><span>novos (${nP} send. · ${nL} LGND)</span></div>
    <div><b class="num">${R.ja.length}</b><span>já estão no app</span></div>
    <div class="bad"><b class="num">${R.canc.length}</b><span>compra cancelada</span></div>
  </div>
  ${R.repPlan.length ? `<details><summary class="bad-text">Repetidos na própria planilha (${R.repPlan.length}): entram uma vez só</summary>
    <ul class="imp-list">${R.repPlan.map(n => `<li>${esc(n.nome)} <span class="hint">${tl(n)}</span></li>`).join("")}</ul></details>` : ""}
  ${R.novos.some(n => n.outroTipo) ? `<div class="banner"><span>Atenção: ${R.novos.filter(n => n.outroTipo).length} novo(s) já estão no app no outro tipo (marcados abaixo). Confira antes de importar.</span></div>` : ""}
  ${R.ign.length ? `<details><summary class="bad-text">Fora da regra (${R.ign.length}): não são Senderista nem Legendário, não entram</summary>
    <ul class="imp-list">${R.ign.map(x => `<li>${esc(x.nome)} <span class="hint">está como ${esc(x.como)}</span></li>`).join("")}</ul></details>` : ""}
  ${R.novos.length ? `<details open><summary><b>Novos para adicionar (${R.novos.length})</b></summary>
    <label class="selall"><input type="checkbox" id="impTodos" checked> Marcar todos</label>
    <ul class="imp-list">${R.novos.map((n, i) => `<li><label><input type="checkbox" data-imp-novo="${i}" checked> <b>${esc(n.nome)}</b> <span class="hint">${tl(n)} · ${esc(n.cidade || "")}${n.idade ? " · " + n.idade + " anos" : ""}</span> ${tag(n)}</label></li>`).join("")}</ul></details>`
  : `<div class="banner"><span>Ninguém novo: todos os inscritos ativos já estão no app.</span></div>`}
  ${R.ja.length ? `<details><summary>Já estão no app (${R.ja.length}): não serão repetidos</summary>
    <ul class="imp-list">${R.ja.map(x => `<li>${esc(x.n.nome)} <span class="hint">${tl(x.n)} · achado pelo ${x.por}</span></li>`).join("")}</ul></details>
    <label class="selall"><input type="checkbox" id="impCompletar"> Completar os dados de quem já está (idade, cidade, camisa, saúde, contato de emergência). Não muda status, ADM nem nada que já esteja preenchido.</label>` : ""}
  ${cancApp.length ? `<details open><summary class="bad-text">Compra cancelada, mas estão no app (${cancApp.length})</summary>
    <ul class="imp-list">${cancApp.map(c => `<li>${esc(c.p.nome)} <span class="hint">${tl(c.n)}</span></li>`).join("")}</ul></details>
    <label class="selall"><input type="checkbox" id="impCanc" checked> <span>Marcar essas pessoas como <b>compra cancelada</b> no app (não apaga ninguém)</span></label>` : ""}
  ${R.fora.length ? `<details open><summary class="bad-text">Estão no app, mas não estão neste relatório (${R.fora.length})</summary>
    <p class="hint" style="margin:6px 0">Os marcados serão <b>excluídos do app</b> ao importar (é o que deixa o número igual ao da plataforma). Ficam guardados em <b>Excluídos</b> por ${LIX_DIAS} dias e dá para restaurar. Desmarque quem deve continuar.</p>
    <ul class="imp-list">${R.fora.map(({ p, como }) => `<li><label><input type="checkbox" data-imp-fora="${esc(p.id)}" checked> <b>${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}${p.telefone ? " · " + esc(p.telefone) : ""}${p.adm ? " · cadastrado/mexido por " + esc(p.adm) : ""}</span>${como ? ` <span class="chip wait">no relatório está como ${esc(como)}</span>` : ""}</label></li>`).join("")}</ul></details>` : ""}`;
}
async function importarRelatorio(novos, completar, cancelar, arquivo, excluir = []) {
  if (!novos.length && !completar.length && !cancelar.length && !excluir.length) { toast("Nada para importar."); return; }
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
    try {
      for (let i = 0; i < fila.length; i += 8) await Promise.all(fila.slice(i, i + 8).map(f => f()));
      if (excluir.length) await excluirPessoas(excluir, "Não estavam no relatório importado", arquivo);
    }
    catch (e) { erro = true; throw e; }
  }, [novos.length && `${novos.length} adicionado(s)`, completar.length && "dados completados", cancelar.length && `${cancelar.length} marcado(s) como cancelado`, excluir.length && `${excluir.length} excluído(s)`].filter(Boolean).join(" · ")).then(ok)));
  if (erro) return;
  render();
  // aviso para a equipe: os outros ADMs veem o resumo na tela assim que a importação termina
  const lg = n => n.tipo === "legendario";
  const aviso = { id: importId, em: new Date().toISOString(), por: ME.adm || "", porId: ME.id || "", arquivo: arquivo || "", top: curTopId(),
    novosP: novos.filter(n => !lg(n)).length, novosL: novos.filter(lg).length,
    mais40: novos.filter(n => (n.idade || 0) >= 40).length, pagPend: novos.filter(n => n.inscricao === "pendente").length,
    saude: novos.filter(n => saudeAlerta(n)).length, completados, cancelados: cancelar.length, excluidos: excluir.length,
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
// mostra a notificação do celular/computador (aparece com o app em segundo plano, se a pessoa permitiu)
function mostrarNotificacao(titulo, corpo, tag) {
  try { if (navigator.vibrate) navigator.vibrate([120, 60, 120]); } catch {}
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const op = { body: corpo, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag };
  const direto = () => { try { new Notification(titulo, op); } catch {} };
  // no celular a notificação precisa sair pelo service worker; sem ele (ou se falhar), usa a do navegador
  (navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration() : Promise.resolve(null))
    .then(r => r ? r.showNotification(titulo, op) : direto()).catch(direto);
  return true;
}
/* O dono recebe aviso de tudo que os ADMs atualizam (cadastros, cronograma, consagração), agrupado a cada poucos segundos */
const notifTudo = () => S.isOwner && store.get("adm3-notif-tudo") !== "0";
function atividadeDe(col, id, novo, antes) {
  if (!novo) return null;
  const mudou = k => JSON.stringify(novo[k]) !== JSON.stringify((antes || {})[k]);
  if (col === "pessoas") {
    if (!novo.admId || novo.admId === ME.id || (antes && antes.admEm === novo.admEm)) return null;
    const campos = Object.keys(novo).filter(k => !["adm", "admId", "admEm", "atualizado", "importId"].includes(k) && mudou(k));
    if (!campos.length) return null;
    const txt = antes ? campos.slice(0, 3).map(k => `${CAMPOS[k] || k}: ${fmtValor(k, novo[k])}`).join(" · ") : `novo cadastro em ${abaDoRegistro("pessoas", novo)}`;
    return { quem: novo.adm || "Um ADM", txt: `${novo.nome || "Cadastro"} · ${txt}` };
  }
  if (col !== "config") return null;
  const m = CSG_RE.exec(id);
  if (m && novo.por && novo.por.id !== ME.id && (novo.nomes || []).length !== ((antes || {}).nomes || []).length)
    return { quem: novo.por.nome || "Um ADM", txt: `Consagração ${fmtDia(m[1])}: lista com ${(novo.nomes || []).length} pessoa(s)` };
  if (/^crono-.+-adm-/.test(id) && novo._adm && novo._adm.id !== ME.id) {
    const k = Object.keys(novo).find(k => k[0] !== "_" && mudou(k)); if (!k) return null;
    const it = cronoPlano().flatMap(d => d.itens).find(i => i.id === k) || {}, a = novo[k] || {}, b = (antes || {})[k] || {};
    const acao = a.fim && a.fim !== b.fim ? `terminou ${it.atv || k} às ${a.fim}` : a.ini && a.ini !== b.ini ? `iniciou ${it.atv || k} às ${a.ini}` : `ajustou ${it.atv || k}`;
    return { quem: novo._adm.nome || "Um ADM", txt: "Cronograma: " + acao };
  }
  return null;
}
let filaAtiv = [], tAtiv = null;
function notificarAtividade(col, id, novo, antes) {
  if (!notifTudo()) return;
  const a = atividadeDe(col, id, novo, antes); if (!a) return;
  filaAtiv.push(a); clearTimeout(tAtiv); tAtiv = setTimeout(dispararAtividade, 4000);
}
function dispararAtividade() {
  const f = filaAtiv; filaAtiv = []; if (!f.length) return;
  const um = f.length === 1, titulo = um ? `${f[0].quem} atualizou o app` : `${f.length} atualizações da equipe`;
  const corpo = f.slice(0, 4).map(a => (um ? "" : a.quem.split(" ")[0] + ": ") + a.txt).join("\n") + (f.length > 4 ? `\n+ ${f.length - 4} outra(s)` : "");
  if (!pushOk()) mostrarNotificacao(titulo + " · ADM 3Colinas", corpo, "adm3-ativ-" + Date.now());
  toast(um ? `${f[0].quem}: ${f[0].txt}` : `${titulo}: ${f.map(a => a.quem.split(" ")[0]).filter((v, i, x) => x.indexOf(v) === i).join(", ")}`);
}
// notificação de planilha importada
function notificarAviso(a) {
  if (store.get("adm3-aviso-notif") === a.id) return;
  store.set("adm3-aviso-notif", a.id);
  const corpo = `${a.novosP} novo(s) senderista(s) e ${a.novosL} legendário(s)${a.pagPend ? ` · ${a.pagPend} com pagamento pendente` : ""}. Importado por ${a.por || "um ADM"}.`;
  if (!pushOk()) mostrarNotificacao("Planilha atualizada · ADM 3Colinas", corpo, "adm3-" + a.id);
}
function pintarNotifBtn() {
  const b = $("#notifBtn"); if (!b) return;
  const tem = "Notification" in window, perm = tem ? Notification.permission : "denied";
  if (S.isOwner && ME.acesso && perm === "granted") {
    b.hidden = false; b.innerHTML = `${ico("bell")} ${notifTudo() ? "Avisos da equipe: ligados" : "Avisos da equipe: desligados"}`; return;
  }
  b.innerHTML = `${ico("bell")} Ativar notificações`;
  b.hidden = !tem || perm !== "default" || !ME.acesso;
}
async function pedirNotificacao() {
  if (S.isOwner && "Notification" in window && Notification.permission === "granted") {
    store.set("adm3-notif-tudo", notifTudo() ? "0" : "1"); pintarNotifBtn();
    if (notifTudo()) ativarPush(); else desativarPush();
    toast(notifTudo() ? "Você vai receber aviso de tudo que os ADMs atualizarem" : "Avisos da equipe desligados neste aparelho"); return;
  }
  try { const r = await Notification.requestPermission(); if (r === "granted") ativarPush();
    toast(r === "granted" ? (S.isOwner ? "Notificações ativadas: você vai receber aviso de tudo que os ADMs atualizarem, mesmo com o app fechado" : "Notificações ativadas neste aparelho") : "Notificações não foram permitidas"); }
  catch { toast("Este aparelho não aceita notificações. No iPhone, instale o app na tela inicial primeiro."); }
  pintarNotifBtn();
}

/* Notificações com o app fechado (Web Push): o aparelho fica guardado em adm_push e o banco
   chama api/push.js quando precisa avisar (supabase/push.sql). Sem isso, valem só os avisos locais acima. */
const VAPID_PUB = "BDxZeBfN6aI5VHiCjJAKEkj7S9GSXC0VSEYKZN4kiSA5x2PmmgACCDqd3n6wubEYsd1ed9dfXEF5DkyMZMXePtA";
const pushOk = () => !DEMO && store.get("adm3-push") === "1";
const b64uBytes = t => { const b = atob((t + "===".slice((t.length + 3) % 4)).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function ativarPush() {
  if (DEMO || !sb || !ME.acesso || !("PushManager" in window) || !navigator.serviceWorker || !("Notification" in window) || Notification.permission !== "granted") return false;
  if (S.isOwner && !notifTudo()) return false;
  try {
    const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register("sw.js"));
    let s = await reg.pushManager.getSubscription();
    if (!s) s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uBytes(VAPID_PUB) });
    const j = s.toJSON();
    const { error } = await sb.rpc("adm_push_salvar", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth });
    if (error) throw error;
    store.set("adm3-push", "1"); return true;
  } catch (e) { console.warn("push:", e); store.set("adm3-push", "0"); return false; }
}
async function desativarPush() {
  if (DEMO) return;
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(), s = reg && reg.pushManager && await reg.pushManager.getSubscription();
    if (s) { await Promise.resolve(sb.rpc("adm_push_apagar", { p_endpoint: s.endpoint })).catch(() => {}); await s.unsubscribe(); }
  } catch {}
  store.set("adm3-push", "0");
}

/* ---------- Página Notificações: avisos dos últimos 10 dias + número no sininho ----------
   No app real vêm da tabela adm_notif (supabase/push.sql), que já filtra quem vê o quê. */
const NOTIF_DIAS = 10;
function notifsVisiveis() {
  const lim = Date.now() - NOTIF_DIAS * 864e5;
  // avisos e mensagens que eu mesmo mandei também ficam no meu sininho
  const praMim = n => n.ator === ME.id || !(n.dados && n.dados.para && n.dados.para.length) || n.dados.para.includes(ME.id);
  return (S.notifs || []).filter(n => Date.parse(n.em) > lim && (!DEMO || (n.publico === "todos" ? praMim(n) : n.ator !== ME.id && S.isOwner)))
    .sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
}
const notifNovas = () => { const l = S.notifLido || 0; return notifsVisiveis().filter(n => Date.parse(n.em) > l && notifTexto(n)).length; };
function notifTexto(n) {
  const M = n.mudancas || {}, d = n.dados || {}, novo = k => (M[k] || [])[1], quem = n.ator_nome || "Um ADM";
  if (n.doc_id === "aviso") return { i: "upload", a: "aviso", t: "Planilha atualizada", c: `${d.novosP || 0} novo(s) senderista(s) e ${d.novosL || 0} legendário(s)${d.pagPend ? ` · ${d.pagPend} com pagamento pendente` : ""}.`, por: d.por || quem };
  if (n.doc_id === "novidade") return { i: "bell", a: "novidade", t: (d.tipo === "msg" ? "" : "Novidade no app: ") + (d.titulo || ""), c: d.texto || "", por: d.por || quem };
  let c, i = "edit", a = abaDoRegistro(n.col);
  if (n.col === "pessoas") {
    i = "users"; a = abaDoRegistro("pessoas", { tipo: novo("tipo") || (n.dados || {}).tipo });
    const campos = Object.keys(M).filter(k => !IGNORAR.includes(k));
    c = `${n.nome || "Cadastro"} · ` + (n.acao === "criou" ? `novo cadastro em ${a}` : campos.slice(0, 3).map(k => `${CAMPOS[k] || k}: ${fmtValor(k, novo(k))}`).join(" · "));
  } else if (n.col === "config") {
    const m = CSG_RE.exec(n.doc_id);
    if (m) { i = "group"; a = "Consagração"; c = `Consagração ${fmtDia(m[1])}: lista com ${(novo("nomes") || []).length} pessoa(s)`; }
    else if (/^crono-.+-adm-/.test(n.doc_id)) {
      const k = Object.keys(M).find(k => k[0] !== "_"); if (!k) return null;
      const x = M[k][1] || {}, y = M[k][0] || {}, it = cronoPlano().flatMap(dd => dd.itens).find(o => o.id === k) || {}, nome = x.atv || it.atv || k;
      i = "clock"; a = "Cronograma"; c = "Cronograma: " + (x.fim && x.fim !== y.fim ? `terminou ${nome} às ${x.fim}` : x.ini && x.ini !== y.ini ? `iniciou ${nome} às ${x.ini}` : `ajustou ${nome}`);
    } else if (/^pin-/.test(n.doc_id)) { if (!M.status) return null; i = "check"; a = "Pins"; c = `Pins: ${n.nome || "alguém"} ${novo("status") === "entregue" ? "recebeu o pin" : "voltou para pendente"}`; }
    else if (/^equipes-/.test(n.doc_id)) { i = "users"; a = "Cronograma"; c = "Mudou as equipes do cronograma"; }
    else if (/^cronoplano-/.test(n.doc_id)) { i = "clock"; a = "Cronograma"; c = "Mudou o plano do cronograma"; }
    else if (n.doc_id === "consag-alias") { i = "group"; a = "Consagração"; c = "Consagração: uniu ou separou nomes"; }
    else c = "Mudou as configurações";
  } else c = `${a}: ${n.nome || "registro"} ${n.acao === "criou" ? "criado" : "atualizado"}`;
  return { i, a, t: quem, c };
}
function vNotificacoes() {
  const antes = S.notifAntes != null ? S.notifAntes : (S.notifLido || 0);
  const L = notifsVisiveis().map(n => ({ n, x: notifTexto(n), ms: Date.parse(n.em) })).filter(o => o.x);
  // várias mudanças seguidas da mesma pessoa na mesma área (até 10 min entre elas) viram um cartão só
  const grupos = [];
  for (const o of L) {
    const g = grupos[grupos.length - 1], solo = x => x.a === "aviso" || x.a === "novidade";
    if (g && !solo(o.x) && !solo(g[0].x) && g[0].x.t === o.x.t && g[0].x.a === o.x.a && g[g.length - 1].ms - o.ms < 6e5) g.push(o); else grupos.push([o]);
  }
  const cartao = g => { const o = g[0], nova = g.some(z => z.ms > antes), solo = o.x.a === "aviso" || o.x.a === "novidade";
    const corpo = g.length < 3 ? g.map(z => `<p>${esc(z.x.c)}</p>`).join("")
      : `<p>${g.length} alterações em ${esc(o.x.a)}</p><details><summary>Ver todas</summary>${g.map(z => `<p>${esc(z.x.c)} <small class="inline">${esc(quando(z.n.em))}</small></p>`).join("")}</details>`;
    return `<article class="notif${nova ? " nova" : ""}${o.x.a === "novidade" ? " nov" : ""}">${ico(o.x.i)}<div><b>${esc(o.x.t)}</b>${nova ? ' <span class="chip ok">Nova</span>' : ""}${corpo}
      <small>${solo ? "Por " + esc(o.x.por) + " · " : ""}${esc(quando(o.n.em))}</small></div></article>`; };
  const podeAtivar = "Notification" in window && Notification.permission === "default";
  return `
  <div class="head"><div><h2>Notificações</h2><p>Os avisos ficam guardados aqui por ${NOTIF_DIAS} dias. ${S.isOwner ? "Você vê tudo que os ADMs mudam no app, além das planilhas importadas e das novidades." : "Aqui chegam as planilhas importadas e as novidades do app."}</p></div>
    ${podeAtivar ? `<div class="actions"><button class="btn primary" type="button" data-act="ativar-notif">${ico("bell")} Ativar notificações no celular</button></div>` : ""}</div>
  ${S.notifErro && S.isOwner ? `<div class="banner aviso"><span>${ico("bell")} Para guardar as notificações, falta rodar o <b>push.sql</b> no Supabase (SQL Editor).</span></div>` : ""}
  <div class="notif-list">${grupos.length ? grupos.map(cartao).join("") : `<p class="empty">Nenhuma notificação nos últimos ${NOTIF_DIAS} dias.</p>`}</div>`;
}
async function carregarNotifs() {
  if (DEMO) {
    const base = Date.now();
    S.notifs = S.notifs || (ADM_DEMO.notifs || []).map(n => ({ ...n, em: new Date(base - n.min * 6e4).toISOString() }));
    S.notifLido = Number(store.get("adm3-notif-lido-" + ME.id) || 0);
  } else {
    try {
      const [r, l] = await Promise.all([sb.from("adm_notif").select("*").order("em", { ascending: false }).limit(400), sb.rpc("adm_notif_visto")]);
      if (r.error) throw r.error;
      S.notifs = r.data || []; S.notifLido = l.data ? Date.parse(l.data) : 0; S.notifErro = false;
    } catch (e) { console.warn("notificações:", e); S.notifErro = true; S.notifs = S.notifs || []; }
  }
  renderNav(); if (S.view === "notificacoes") render();
}
function marcarNotifs() {
  S.notifLido = Date.now();
  if (DEMO) store.set("adm3-notif-lido-" + ME.id, String(S.notifLido));
  else if (!S.notifErro && sb) Promise.resolve(sb.rpc("adm_notif_marcar")).catch(() => {});
}
function novaNotif(n) {
  S.notifs = [n, ...(S.notifs || []).filter(x => x.id !== n.id)];
  if (S.view === "notificacoes") { marcarNotifs(); render(); } else renderNav();
}

/* Novidade do app: o dono escreve, todos os ADMs recebem a notificação e veem a explicação ao abrir o app */
/* Usuários → Enviar notificação (só o dono): mensagem na hora para todos ou para quem ele escolher.
   Fica em config/novidade {para: [ids dos membros] (vazio = todos)} e no histórico config/msg-hist. */
const destinatarios = () => (S.equipe || []).filter(e => e.ativo !== false && e.id !== ME.id).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
function vEnviarNotif(abas) {
  const H = ((S.cfgDocs || {})["msg-hist"] || {}).lista || [], nome = id => ((S.equipe || []).find(e => e.id === id) || {}).nome || "ADM";
  return `
  <div class="head"><div><h2>Usuários</h2><p>Envie uma notificação na hora para toda a equipe ou só para quem você escolher. Chega no celular de quem ativou as notificações e fica no sininho por 10 dias. Só você vê esta aba.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-act="novidade">${ico("bell")} Nova notificação</button></div></div>
  ${abas}
  <section class="panel"><h3>Enviadas <small>${H.length}</small></h3>
  ${H.length ? `<div class="notif-list">${H.map(n => `<article class="notif">${ico("bell")}<div><b>${esc(n.titulo)}</b><p>${esc(n.texto)}</p>
    <small>Para ${n.para && n.para.length ? esc(n.para.map(nome).join(", ")) : "todos"} · ${esc(quando(n.em))}</small></div></article>`).join("")}</div>`
    : `<p class="empty">Nenhuma notificação enviada ainda. Toque em <b>Nova notificação</b>.</p>`}
  </section>`;
}
function novidadeForm() {
  const D = destinatarios();
  modal(`
    <h3>Enviar notificação</h3>
    <p class="hint" style="margin:0">Chega na hora no celular de quem ativou as notificações (mesmo com o app fechado), aparece como aviso quando a pessoa abrir o app e fica no sininho por 10 dias.</p>
    <div class="field"><label for="f-nt">Título</label><input id="f-nt" name="titulo" maxlength="60" required placeholder="Ex.: Reunião hoje às 20h"></div>
    <div class="field"><label for="f-nx">Mensagem</label><textarea id="f-nx" name="texto" rows="4" maxlength="600" required placeholder="Ex.: Pessoal, reunião da equipe ADM hoje às 20h no grupo do WhatsApp."></textarea></div>
    <div class="dest"><span class="dest-lbl">Quem recebe</span>
      <label class="selall"><input type="checkbox" id="f-todos" checked> <b>Todos</b> (${D.length})</label>
      <div class="pick-list" id="f-para" hidden>${D.map(e => `<label class="selall"><input type="checkbox" name="para" value="${esc(e.id)}"> ${esc(e.nome)}${e.user_id ? "" : ' <small class="hint">(ainda não entrou no app)</small>'}</label>`).join("")}</div></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${ico("bell")} Enviar agora</button></div></div>`,
  fd => {
    const titulo = String(fd.get("titulo") || "").trim(), texto = String(fd.get("texto") || "").trim();
    const todos = $("#f-todos").checked, para = todos ? [] : fd.getAll("para").map(String);
    if (!titulo || !texto) { toast("Preencha o título e a mensagem."); return; }
    if (!todos && !para.length) { toast("Escolha pelo menos uma pessoa ou marque Todos."); return; }
    const n = { id: "n" + Date.now().toString(36), tipo: "msg", titulo, texto, para, em: new Date().toISOString(), por: ME.adm || "", porId: ME.id || "" };
    const hist = [n, ...((((S.cfgDocs || {})["msg-hist"] || {}).lista) || [])].slice(0, 30);
    closeModal(); S.usrAba = "notif";
    save(async () => { await api.set("config", "novidade", n); await api.set("config", "msg-hist", { lista: hist });
        if (DEMO) novaNotif({ id: "env-" + n.id, em: n.em, ator: ME.id, ator_nome: ME.adm || "", publico: "todos", col: "config", doc_id: "novidade", acao: "insert", nome: n.titulo, dados: n }); },
      todos ? "Notificação enviada para todos" : `Notificação enviada para ${para.length} pessoa(s)`);
  });
  const t = $("#f-todos"), L = $("#f-para");
  t.onchange = () => { L.hidden = t.checked; };
}
/* Ao abrir o app: primeiro a novidade (se tiver); depois, para quem ainda não ativou, o pedido para ativar as notificações.
   "Agora não" esconde só até a próxima vez que a pessoa abrir o app. */
function checarInicio() { checarNovidade(); if (!$("#modalRoot").innerHTML) checarAtivarNotif(); }
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function estadoNotif() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return ehIOS() && !instalado() ? "instalar" : "sem-suporte";
  if (Notification.permission === "granted") return "ok";
  return Notification.permission === "denied" ? "bloqueado" : "pedir";
}
function checarAtivarNotif() {
  if (!ME.acesso || $("#modalRoot").innerHTML) return;
  let visto = null; try { visto = sessionStorage.getItem("adm3-pediu-notif"); } catch {}
  const st = estadoNotif(); if (visto || st === "ok" || st === "sem-suporte") return;
  try { sessionStorage.setItem("adm3-pediu-notif", "1"); } catch {}
  const quem = S.isOwner ? "tudo que os ADMs mudarem no app, mensagens e novidades" : "planilhas importadas, mensagens da coordenação e novidades do app";
  const corpo = st === "instalar" ? `<p style="margin:0">No iPhone, as notificações só funcionam com o app instalado na tela inicial:</p>
      <ol style="margin:0;padding-left:20px;display:grid;gap:6px"><li>Toque no botão <b>Compartilhar</b> do Safari (quadrado com a seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>.</li><li>Abra o app pelo ícone novo e toque em <b>Ativar notificações</b>.</li></ol>`
    : st === "bloqueado" ? `<p style="margin:0">As notificações estão bloqueadas neste aparelho. Para liberar:</p>
      <ol style="margin:0;padding-left:20px;display:grid;gap:6px"><li><b>Android (Chrome):</b> toque no cadeado ao lado do endereço (ou segure o ícone do app → Informações do app) → <b>Notificações</b> → Permitir.</li><li><b>iPhone:</b> Ajustes → Notificações → <b>ADM 3Colinas</b> → Permitir notificações.</li><li>Depois feche e abra o app de novo.</li></ol>`
    : `<p style="margin:0">Toque em <b>Ativar notificações</b> e depois em <b>Permitir</b>. Leva 5 segundos e você passa a receber avisos no celular, mesmo com o app fechado.</p>`;
  modal(`
    <h3>Ative as notificações</h3>
    <p style="margin:0">Você ainda não está recebendo os avisos do app: ${quem}.</p>
    ${corpo}
    <div class="modal-foot"><button class="btn ghost" type="button" data-close-btn>Agora não</button><div class="actions">${st === "pedir" ? `<button class="btn primary" type="submit">${ico("bell")} Ativar notificações</button>` : `<button class="btn primary" type="submit">Entendi</button>`}</div></div>`,
  async () => { closeModal(); if (st === "pedir") { await pedirNotificacao(); render(); } });
}
function checarNovidade() {
  const n = S.novidade;
  if (!n || !n.id || !ME.acesso || n.porId === ME.id || store.get("adm3-novidade-visto") === n.id) return;
  if (n.para && n.para.length && !n.para.includes(ME.id)) return;   // mensagem só para algumas pessoas
  if (Date.now() - new Date(n.em || 0).getTime() > 30 * 864e5) return;   // novidade antiga não aparece para quem entrou depois
  if ($("#modalRoot").innerHTML) return;
  modal(`
    <h3>${n.tipo === "msg" ? "" : "Novidade no app: "}${esc(n.titulo)}</h3>
    <p style="margin:0;white-space:pre-line">${esc(n.texto)}</p>
    <p class="hint" style="margin:0">Enviado por ${esc(n.por || "Vinicius")} · ${esc(quando(n.em))}</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn primary" type="submit">Entendi</button></div></div>`, () => { store.set("adm3-novidade-visto", n.id); closeModal(); });
}

/* Puxar a tela para baixo (celular) atualiza os dados */
async function atualizarTudo() {
  try {
    if (db) await db.recarregar();
    carregarNotifs();
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
    a.excluidos && `<b>${a.excluidos}</b> excluído(s) por não estarem no relatório (dá para restaurar em <b>Excluídos</b>)`,
    n && `Os novos chegam <b>sem atestado e sem termo</b>: já aparecem em Pendências`,
  ].filter(Boolean);
  modal(`
    ${DEMO && a.porId === ME.id ? `<div class="banner"><span>Demonstração: é assim que os outros ADMs veem quando você importa uma planilha.</span></div>` : ""}
    <h3>Planilha atualizada</h3>
    <p class="hint" style="margin:0"><b>${esc(a.por || "Um ADM")}</b> importou ${a.arquivo ? `<b>${esc(a.arquivo)}</b>` : "o relatório de inscrições"} · ${esc(quando(a.em))}</p>
    <div class="imp-kpis">
      <div class="ok"><b class="num">${a.novosP}</b><span>novo(s) senderista(s)</span></div>
      <div class="ok"><b class="num">${a.novosL}</b><span>novo(s) legendário(s)</span></div>
      <div><b class="num">${a.totalP}</b><span>senderistas no TOP</span></div>
      <div><b class="num">${a.totalL}</b><span>legendários no TOP</span></div>
    </div>
    ${itens.length ? `<ul class="aviso-list">${itens.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}
    ${novos.length ? `<details ${novos.length <= 8 ? "open" : ""}><summary><b>Quem entrou (${novos.length})</b></summary><ul class="imp-list">${novos.map(p => `<li>${esc(p.nome)} <span class="hint">${p.tipo === "legendario" ? "Legendário" : "Senderista"}${p.cidade ? " · " + esc(p.cidade) : ""}</span></li>`).join("")}</ul></details>` : ""}
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
/* Ficha de saúde rápida: botão no topo → busca → ficha (usa o que já está no aparelho, funciona sem internet) */
function saudeBusca() {
  const pess = S.P.filter(p => !cancelado(p)).sort((a, b) => (saudeAlerta(b) - saudeAlerta(a)) || norm(a.nome).localeCompare(norm(b.nome)));
  const lista = q => { const k = norm(q); const r = pess.filter(p => !k || norm(p.nome).includes(k));
    return r.length ? r.slice(0, 60).map(p => `<button type="button" class="saude-li" data-saude="${p.id}"><span><b>${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}${p.idade ? " · " + p.idade + " anos" : ""}</span></span>${saudeAlerta(p) ? '<span class="tag saude">Saúde</span>' : ""}</button>`).join("") : `<div class="empty">Ninguém com esse nome.</div>`; };
  modal(`
    <h3>Ficha de saúde</h3>
    <p class="hint" style="margin:0">${pess.filter(saudeAlerta).length} pessoa(s) com condição médica, remédio ou restrição alimentar aparecem primeiro. Funciona sem internet.</p>
    <div class="field"><input id="saudeQ" type="search" placeholder="Buscar pelo nome" autocomplete="off"></div>
    <div class="saude-lista" id="saudeLista">${lista("")}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => {});
  $("#saudeQ").addEventListener("input", e => { $("#saudeLista").innerHTML = lista(e.target.value); });
  $("#saudeLista").addEventListener("click", e => { const b = e.target.closest("[data-saude]"); if (b) saudeFicha(S.P.find(p => p.id === b.dataset.saude)); });
}
function saudeFicha(p) {
  if (!p) return;
  const f = p.ficha || {}, nao = v => !v || /^n[aã]o\b/i.test(v);
  const tel = (String(f.contato || "").match(/\+?\d[\d\s()-]{8,}/) || [""])[0], n = waNumber(tel);
  const item = (l, v, alerta) => `<div class="saude-item ${alerta ? "alerta" : ""}"><span>${l}</span><b>${nao(v) ? "Não" : esc(v)}</b></div>`;
  modal(`
    <h3>${esc(p.nome)}</h3>
    <p class="hint" style="margin:0">${tipoNome(p)}${p.idade ? " · " + p.idade + " anos" : ""}${p.equipe ? " · " + esc(equipeTxt(p)) : ""} · atestado ${esc(opt(ATESTADO, p.atestado).l.toLowerCase())}</p>
    <div class="saude-ficha">
      ${item("Condição médica", f.condicaoMedica, !nao(f.condicaoMedica))}
      ${item("Remédio", f.medicamento, !nao(f.medicamento))}
      ${item("Restrição alimentar", f.restricaoAlimentar, !nao(f.restricaoAlimentar))}
      <div class="saude-item contato"><span>Contato de emergência</span><b>${f.contato ? esc(f.contato) : "Não informado"}</b>
        ${tel ? `<div class="actions"><a class="btn" href="tel:${esc(tel.replace(/[^\d+]/g, ""))}">Ligar</a>${n ? `<a class="wa" href="https://wa.me/${n}" target="_blank" rel="noopener">${ico("wa")} WhatsApp</a>` : ""}</div>` : ""}</div>
      ${p.telefone ? `<div class="saude-item"><span>Telefone da pessoa</span><b>${esc(p.telefone)}</b></div>` : ""}
    </div>
    <div class="modal-foot"><button class="btn ghost" type="button" id="saudeVoltar">Voltar</button><div class="actions"><button class="btn primary" type="button" data-close-btn>Fechar</button></div></div>`, () => {});
  $("#saudeVoltar").onclick = saudeBusca;
}
const saudeAlerta = p => { const f = p.ficha || {}; return [f.condicaoMedica, f.medicamento, f.restricaoAlimentar].some(v => v && !/^n[aã]o\b/i.test(v)); };

/* ---------- Abertura: trilha de luz subindo a crista até o cume enquanto o app carrega ----------
   Aparece depois do login (ou na hora, para quem já está logado). */
let splashStart = 0, splashDone = true;
// a imagem é em pé (736×1308): em tela larga mostra a faixa da crista (y 429 a 734) em vez do meio da foto
function ajustaCena() {
  const vh = 736 * innerHeight / Math.max(1, innerWidth);
  const vb = vh >= 1308 ? "0 0 736 1308" : `0 ${Math.round(Math.max(0, Math.min(1308 - vh, 730 - vh)))} 736 ${Math.round(vh)}`;
  document.querySelectorAll("svg[data-cena]").forEach(sv => sv.setAttribute("viewBox", vb));
}
addEventListener("resize", ajustaCena); ajustaCena();
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
addEventListener("online", () => { if (loginOffline) { concluirLoginOffline(); return; } if (db) db.recarregar().catch(() => {}).finally(renderNav); renderNav(); });
addEventListener("offline", () => { const ja = S.fila && S.fila.offline; S.fila = { ...(S.fila || {}), offline: true }; renderNav(); if (!ja && ME.acesso && !DEMO || !ja && DEMO && db) toast("Sem internet. Pode continuar usando: as alterações ficam guardadas e são enviadas quando a conexão voltar."); });
setInterval(() => { if (loginOffline) concluirLoginOffline(); else if (db && db.estado().pendentes && navigator.onLine !== false) db.sincronizar(); }, 30000);
// assina as coleções depois do login (o banco só entrega o que a pessoa pode ver)
function conectarDados() {
  const chave = DEMO ? "demo" : ME.id;
  if (DEMO) ADM_DADOS.limparLocal("demo");   // a demonstração sempre começa do zero
  db = ADM_DADOS.criarBanco(DEMO ? ADM_DADOS.fonteMemoria(ADM_DEMO.docs)
    : ADM_DADOS.fonteSupabase(sb, st => { S.online = st === "SUBSCRIBED" ? true : st === "CHANNEL_ERROR" || st === "TIMED_OUT" ? false : S.online; if (st === "SUBSCRIBED") db.sincronizar(); renderNav(); }), {
    chave,
    onFila: f => { const antes = S.fila || {}; S.fila = f; S.cacheEm = (JSON.parse(store.get("adm3-cache-" + chave) || "{}") || {}).em || S.cacheEm;
      if (f.offline && !antes.offline && sessaoOk) toast("Sem internet. Pode continuar usando: as alterações ficam guardadas e são enviadas quando a conexão voltar.");
      renderNav(); },
    onEnviado: n => toast(`Internet de volta: ${n} alteração(ões) enviada(s) para a equipe.`),
    onRemoto: notificarAtividade,
  });
  if (DEMO) S.online = "demo";
  // demonstração: simula um ADM atualizando para o dono ver o aviso chegar
  if (DEMO && S.isOwner && !S.demoAtiv) { S.demoAtiv = true; setTimeout(() => {
    const p = (S.pessoas || []).find(x => x.tipo === "participante" && !atOk(x)); if (!p) return;
    const { id, ...antes } = p, novo = { ...antes, atestado: "confirmado", adm: "Thalisson", admId: "m-thal", admEm: new Date().toISOString() };
    api.update("pessoas", id, { atestado: "confirmado", adm: "Thalisson", admId: "m-thal", admEm: novo.admEm }).then(() => notificarAtividade("pessoas", id, novo, antes));
    novaNotif({ id: "sim1", em: new Date().toISOString(), ator: "m-thal", ator_nome: "Thalisson", publico: "dono", col: "pessoas", doc_id: id, acao: "alterou", nome: p.nome, mudancas: { atestado: [p.atestado || "pendente", "confirmado"] } });
    const cid = "crono-" + curTopId() + "-adm-m-thal", c = (S.cfgDocs || {})[cid];
    if (c) { const k = cronoPlano()[0].itens.find(i => !(c[i.id] || {}).fim); if (k) { const m = { ...(c[k.id] || {}), ini: (c[k.id] || {}).ini || agoraHM(), fim: agoraHM(), fimPor: "Thalisson" };
      api.update("config", cid, { [k.id]: m }).then(() => notificarAtividade("config", cid, { ...c, [k.id]: m }, c));
      novaNotif({ id: "sim2", em: new Date().toISOString(), ator: "m-thal", ator_nome: "Thalisson", publico: "dono", col: "config", doc_id: cid, acao: "alterou", mudancas: { [k.id]: [c[k.id] || null, { ...m, atv: k.atv }] } }); } }
  }, 15000); }
  const sub = col => db.collection(col).onSnapshot(snap => {
    S[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    S.loaded[col] = true; render();
    if (S.loaded.pessoas && S.loaded.tops) hideSplash();
  }, e => { console.error(e); toast("Não foi possível carregar os dados. " + erroAmigavel(e)); hideSplash(); });
  ["pessoas", "tarefas", "estoque", "pista", "tops"].forEach(sub);
  db.collection("config").onSnapshot(snap => {
    S.cfgDocs = Object.fromEntries(snap.docs.map(d => [d.id, d.data()]));
    // cria a ficha de horários do TOP enquanto tem internet: assim, sem internet, cada ADM só acrescenta o seu horário (não sobrescreve o dos outros)
    const ficha = podeEditar() && ME.id ? cronoDocId(eu()) : null;
    S.cronoCriando = S.cronoCriando || new Set();
    if (ficha && navigator.onLine !== false && !db.estado().offline && !S.cfgDocs[ficha] && !S.cronoCriando.has(ficha)) {
      S.cronoCriando.add(ficha); db.doc("config/" + ficha).set({ _adm: eu() }).catch(() => {}).finally(() => S.cronoCriando.delete(ficha)); }
    if (["cronograma", "consagracao", "pins", "painel", "usuarios", "participantes", "legendarios", "aovivo"].includes(S.view)) render();
  });
  db.doc("config/geral").onSnapshot(snap => { if (snap.exists && !pending.has("kits")) { S.config = { ...S.config, ...snap.data() }; render(); } });
  db.doc("config/aviso").onSnapshot(snap => { S.aviso = snap.exists ? snap.data() : null; render(); setTimeout(checarAviso, 400); });
  db.doc("config/novidade").onSnapshot(snap => { S.novidade = snap.exists ? snap.data() : null; setTimeout(checarInicio, 900); });
  render();
  carregarNotifs();
  if (DEMO) return;
  markSeen(true);
  ativarPush();
  // notificação nova aparece na hora (canal separado: se a tabela ainda não existir, o resto não para)
  sb.channel("adm-notif").on("postgres_changes", { event: "INSERT", schema: "public", table: "adm_notif" }, p => p.new && novaNotif(p.new)).subscribe();   // quem já permitiu notificações passa a receber também com o app fechado
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
  // sem internet nem tenta renovar a sessão (demora): entra direto com o que está guardado no aparelho
  if (navigator.onLine === false && temSessao && perfilSalvo() && authMode !== "newpass") iniciarSessao().catch(e => loginForm(erroAmigavel(e), true));
  else sb.auth.getSession().then(async ({ data }) => {
    if (data.session && authMode !== "newpass") { try { await iniciarSessao(); } catch (e) { loginForm(erroAmigavel(e), true); } }
    // sem internet a sessão não consegue ser renovada: entra com o que está guardado no aparelho
    else if (!data.session && temSessao && perfilSalvo() && navigator.onLine === false && !sessaoOk) { try { await iniciarSessao(); } catch (e) { loginForm(erroAmigavel(e), true); } }
    if (!sessaoOk) hideSplash();
  }).catch(() => hideSplash());
}
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
