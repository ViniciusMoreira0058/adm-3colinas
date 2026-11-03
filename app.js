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
  { id: "equipes", l: "Equipes LGND", c: "Equipes", i: "group", need: ["legendarios"] },
  { id: "pendencias", l: "Pendências", i: "bell", need: ["participantes", "legendarios"] },
  { id: "comunicados", l: "Comunicados", c: "Comunicados", i: "wa", need: ["participantes", "legendarios"] },   // recado para senderistas e legendários pelo WhatsApp
  { id: "comunicacao", l: "Comunicação", c: "Comunicação", i: "chat", all: true, menu: true },   // recados, lembretes e aprendizados
  { id: "checkin", l: "Check-in", c: "Check-in", i: "door", need: ["participantes"] },
  { id: "remedios", l: "Remédios", c: "Remédios", i: "pill", need: [] , all: true, menu: true },
  { id: "emergencia", l: "Emergência", c: "Emergência", i: "sos", need: [], all: true, menu: true },
  { id: "transporte", l: "Transporte", c: "Transporte", i: "bus", need: [], all: true, menu: true },
  { id: "carros", l: "Carros", c: "Carros", i: "car" },   // todos os veículos que vão ao TOP
  { id: "financeiro", l: "Financeiro", c: "Financeiro", i: "money" },   // completo só para o dono, acesso total ou quem tiver a página marcada (coordenador vê só o da equipe)
  { id: "celulares", l: "Celulares", c: "Celulares", i: "phone", need: ["legendarios"] },   // celulares dos legendários no check-in
  { id: "campo", l: "Campo", c: "Campo", i: "group", need: ["participantes"], demo: true },   // chamada, mural, turnos e entregas com o TOP rodando
  { id: "nfc", l: "NFC 3COLINAS", c: "NFC", i: "nfc", need: ["participantes", "legendarios"], nfc: true },   // ficha de saúde + tag NFC
  { id: "familias", l: "Famílias", i: "fam" },
  { id: "cronograma", l: "Cronograma", i: "clock" },
  { id: "aovivo", l: "Ao vivo", i: "flag", need: ["cronograma"] },   // painel para TV/celular
  { id: "ocorrencias", l: "Ocorrências", i: "heart", need: ["participantes", "legendarios", "cronograma"] },   // registro durante o TOP
  { id: "consagracao", l: "Consagração", i: "group" },
  { id: "pins", l: "Pins", i: "check" },
  { id: "checklist", l: "Checklist", i: "list" },
  { id: "estoque", l: "Estoque", i: "box" },
  { id: "pista", l: "Pista", i: "route" },
  { id: "meta", l: "Meta do TOP", c: "Meta", i: "chart", all: true, menu: true },   // meta de inscrições até o TOP e indicações das equipes (Estratégia 150)
  { id: "agenda", l: "Agenda", i: "clock", all: true, menu: true },   // todos os eventos de divulgação e o TOP, com quem vai e o link de presença
  { id: "importacao", l: "Importação do dia", c: "Importação", i: "upload", need: ["participantes", "legendarios"], org: true },   // as 4 planilhas do dia com ✓
  { id: "tops", l: "Tops", i: "flag" },
  { id: "usuarios", l: "Usuários", i: "key", owner: true },
  { id: "historico", l: "Histórico", i: "clock", owner: true },
  { id: "postop", l: "Pós-TOP", i: "chart", all: true, menu: true, extra: true },   // pesquisa dos ADMs depois do TOP
  { id: "guia", l: "Como usar", c: "Guia", i: "list", all: true, menu: true, extra: true },   // guia para ADM novo
];
/* Acesso: o dono vê tudo; cada usuário vê as abas que o dono liberou no cadastro dele. */
const NIVEIS = [
  { v: "total", l: "Acesso total", d: "Vê e edita todas as abas, inclusive iniciar e finalizar TOPs." },
  { v: "edita", l: "Edita as abas escolhidas", d: "Vê e altera só as abas marcadas abaixo." },
  { v: "leitura", l: "Somente leitura", d: "Vê as abas marcadas abaixo, sem poder alterar nada." },
];
// todas as páginas podem ser liberadas por usuário (menos Dashboard, que todos veem, e Usuários/Histórico, que são só do dono)
const ABAS = () => VIEWS.filter(v => !v.owner && !v.all && v.id !== "painel" && (!v.demo || DEMO) && liberada(v));
// a página já foi lançada no app real? (o que ainda está só na demo não aparece no menu nem em Usuários)
const liberada = v => !(v.org && !ORG()) && !(v.extra && !EXTRA()) && !(v.nfc && !NFC()) && !(v.id === "campo" && !CAMPO()) && !(v.id === "celulares" && !CEL())
  && !(TOP2_VIEWS.includes(v.id) && !TOP2() && !(v.id === "transporte" && TRANSP())) && !(v.id === "carros" && TRANSP()) && !((v.id === "financeiro" || v.id === "emergencia") && !TOP3()) && !(v.id === "comunicacao" && !COM()) && !(v.id === "meta" && !META()) && !(v.id === "agenda" && !META());
// "_v2" marca o cadastro salvo já com a escolha página por página; cadastros antigos seguem a regra antiga (página que usa dados de outra aparece junto)
const ABA_V2 = "_v2";
/* Coordenadores e subcoordenadores de equipe (demo): perfil "coord" no cadastro, só leitura, vê só a própria equipe */
const COORD = () => true;   // liberado no app real em 31/10/2026 (precisa do supabase/coordenadores.sql)
const COORD_ABAS = ["equipes", "familias", "consagracao", "emergencia", "cronograma", "aovivo", "pista", "financeiro"];   // no Financeiro o coordenador só lança os gastos da equipe
const COORD_VER = ["painel", ...COORD_ABAS, "meta", "agenda"];
const coordAbasSalvar = () => [...COORD_ABAS, "legendarios", ABA_V2];   // "legendarios" só para o banco liberar a equipe dele (a página Legendários fica escondida)
const ehCoordEq = () => COORD() && !!ME.coord;
const ehCoordCad = e => COORD() && e && e.perfil === "coord";
const temAba = (abas, v) => { abas = abas || []; const base = !v.need || v.need.some(a => abas.includes(a));
  return v.need && !abas.includes(ABA_V2) ? base : abas.includes(v.id) && base; };
const precisaLogin = () => !ME.acesso;
const canSee = v => {
  if (ORG()) v = VIEWS.find(x => x.id === v.id) || v;   // {id} sozinho também respeita need/owner da aba
  if (v.org && !ORG()) return false;
  if (v.extra && !EXTRA()) return false;
  if (v.nfc && !NFC()) return false;
  if (v.id === "campo" && !CAMPO()) return false;
  if (v.id === "celulares" && !CEL()) return false;
  if (TOP2_VIEWS.includes(v.id) && !TOP2() && !(v.id === "transporte" && TRANSP())) return false;
  if (v.id === "carros" && TRANSP()) return false;   // os Carros ficam dentro do Transporte
  if ((v.id === "financeiro" || v.id === "emergencia") && !TOP3()) return false;
  if (v.id === "comunicacao" && !COM()) return false;
  if ((v.id === "meta" || v.id === "agenda") && !META()) return false;
  if (!ME.acesso) return v.id === "painel";
  if (ehCoordEq()) return COORD_VER.includes(v.id);   // coordenador de equipe: só as páginas dele, sem saúde, telefones e pagamentos
  if ((VIEWS.find(x => x.id === v.id) || v).demo && !DEMO) return false;
  if (S.isOwner || (VIEWS.find(x => x.id === v.id) || v).all) return true;
  if (v.owner) return false;
  if (v.id === "painel" || ME.acesso.nivel === "total") return true;
  return temAba(ME.acesso.abas, v);   // página que usa dados de outra (ex.: Pendências) também precisa de Senderistas ou Legendários
};
const podeEditar = () => S.isOwner || (!!ME.acesso && ME.acesso.nivel !== "leitura");
// importar planilhas: o dono, quem tem acesso total ou quem o dono liberou com a página "Importação do dia" marcada no cadastro
const podeImportar = () => S.isOwner || (!!ME.acesso && (ME.acesso.nivel === "total" || (ME.acesso.nivel !== "leitura" && (ME.acesso.abas || []).includes("importacao"))));
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
  const navBtn = v => `<button type="button" data-go="${v.id}" title="${esc(v.l)}" ${S.view === v.id ? 'aria-current="page"' : ""}>${ico(v.i)}<span>${v.l}</span>${v.id === "notificacoes" ? (novas ? `<span class="badge num">${novas}</span>` : "") : v.id === "comunicacao" && comNaoLidas() + lembretesHoje().length ? `<span class="badge num">${comNaoLidas() + lembretesHoje().length}</span>` : counts[v.id] != null ? `<span class="count num">${counts[v.id]}</span>` : v.id === "importacao" && impFaltam() ? `<span class="badge num">${impFaltam()}</span>` : ""}</button>`;
  const vis = VIEWS.filter(v => canSee(v) && (!v.all || v.menu));
  document.body.classList.toggle("org", ORG());
  document.body.classList.toggle("d2", D2());
  $("#nav").innerHTML = !ORG() ? vis.map(navBtn).join("")
    : MENU_GRUPOS.map(([g, ids]) => { const b = vis.filter(v => ids.includes(v.id)); return b.length ? (g ? `<div class="nav-grp">${g}</div>` : "") + b.map(navBtn).join("") : ""; }).join("")
      + vis.filter(v => !MENU_GRUPOS.some(([, ids]) => ids.includes(v.id))).map(navBtn).join("");
  const bb = $("#buscaBtn"); if (bb) bb.hidden = !(ORG() && ME.acesso && !ehCoordEq());
  const sb = $("#saudeBtn"); if (sb) sb.hidden = !(NOVO() && ME.acesso && (canSee({ id: "participantes" }) || canSee({ id: "legendarios" })));
  const sino = $("#bellBtn");
  if (sino) { sino.hidden = !ME.acesso || ehCoordEq(); sino.querySelector(".badge").hidden = !novas; sino.querySelector(".badge").textContent = novas > 99 ? "99+" : novas;
    sino.setAttribute("aria-label", novas ? `Notificações: ${novas} nova(s)` : "Notificações"); }
  $("#backBtn").hidden = S.view === "painel";
  $("#backBtn").setAttribute("aria-label", "Voltar para " + ((VIEWS.find(x => x.id === hist[hist.length - 1]) || VIEWS[0]).l));
  const vAtual = VIEWS.find(v => v.id === S.view) || VIEWS[0];
  $("#mtopTitle").textContent = ORG() && vAtual.c ? vAtual.c : vAtual.l;
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
    <section class="panel"><h3>Fardas <small>${ps.length} com tamanho informado</small></h3>
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
/* ---------- Dashboard novo ----------
   Topo com contagem regressiva e % de prontos, "O que fazer hoje" com atalhos, e os números em 3 blocos (Pessoas, Documentos, Logística). */
function anel(pc, cor, tam = 92, txt) {
  const r = tam / 2 - 7, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, pc || 0));
  return `<svg class="anel" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="${v}%">
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="8"/>
    <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="${cor}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${tam / 2} ${tam / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="anel-t" style="font-size:${Math.round(tam / 4.2)}px">${txt != null ? txt : v + "%"}</text></svg>`;
}
// histórico do dashboard: um retrato por dia (config/dash-hist-<top>), gravado quando alguém que edita abre o Dashboard
const diaHoje = () => new Date().toLocaleDateString("sv");
const dashHistId = () => "dash-hist-" + curTopId();
const dashHist = () => ((S.cfgDocs || {})[dashHistId()] || {}).dias || {};
function retratoHoje() {
  const s = stats(), P = S.P.filter(p => !cancelado(p));
  return { n: s.n, lg: s.lg.length, atestado: s.atestado, termo: s.termo, grupo: s.grupo, prontos: P.filter(prontoTop).length, total: P.length };
}
let dashGravando = false, dashUltimo = "";
function registrarDia() {
  if (!DASH_NOVO() || !S.isOwner || dashGravando) return;   // só o dono grava: retrato de outro ADM viraria aviso para o dono
  const H = dashHist(), r = retratoHoje(), d = diaHoje();
  // compara campo a campo: o banco devolve o JSON com as chaves em outra ordem
  const ant = H[d] || {}; if (Object.keys(r).every(k => ant[k] === r[k])) return;
  if (dashUltimo === d + JSON.stringify(r)) return;   // já mandei este retrato, esperando o banco devolver
  dashUltimo = d + JSON.stringify(r);
  const dias = { ...H, [d]: r }; Object.keys(dias).sort().slice(0, -90).forEach(k => delete dias[k]);   // guarda 90 dias
  dashGravando = true; api.set("config", dashHistId(), { dias, top: curTopId() }).catch(() => {}).finally(() => { dashGravando = false; });
}
// variação de um número: compara com ontem (ou o dia anterior com dado) e com 7 dias atrás
function tendencia(k, atual) {
  const H = dashHist(), hoje = diaHoje(), dias = Object.keys(H).filter(d => d < hoje).sort();
  if (!dias.length) return "";
  const ont = H[dias[dias.length - 1]][k], d7 = dias.filter(d => d <= new Date(Date.now() - 7 * 864e5).toLocaleDateString("sv")).pop();
  const a = atual - (ont ?? atual), b = d7 ? atual - (H[d7][k] ?? atual) : null;
  const t = (v, l) => v > 0 ? `<span class="tend up">▲ ${v} ${l}</span>` : v < 0 ? `<span class="tend down">▼ ${-v} ${l}</span>` : "";
  return t(a, "hoje") || (b ? t(b, "na semana") : `<span class="tend">sem mudança hoje</span>`);
}
function graficoEvolucao() {
  const H = { ...dashHist(), [diaHoje()]: retratoHoje() }, dias = Object.keys(H).sort().slice(-21);
  if (dias.length < 2) return `<div class="empty">O gráfico começa a aparecer a partir de amanhã: o app guarda um retrato por dia.</div>`;
  const W = 640, Ht = 200, pl = 34, pr = 10, pt = 12, pb = 26, max = Math.max(1, ...dias.map(d => H[d].total || H[d].n || 0));
  const x = i => pl + i * (W - pl - pr) / (dias.length - 1), y = v => pt + (Ht - pt - pb) * (1 - v / max);
  const serie = [["atestado", "#ff7a1a", "Atestado OK"], ["termo", "#f2b233", "Termo assinado"], ["prontos", "#46c486", "Prontos p/ o TOP"]];
  const linhas = serie.map(([k, c]) => `<polyline fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="${dias.map((d, i) => `${x(i).toFixed(1)},${y(H[d][k] || 0).toFixed(1)}`).join(" ")}"/>
    <circle cx="${x(dias.length - 1)}" cy="${y(H[dias[dias.length - 1]][k] || 0)}" r="4.5" fill="${c}"/>`).join("");
  const grade = [0, .5, 1].map(f => { const v = Math.round(max * f); return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" class="g-t">${v}</text>`; }).join("");
  const passo = Math.ceil(dias.length / 7), rot = dias.map((d, i) => i % passo && i !== dias.length - 1 ? "" : `<text x="${x(i)}" y="${Ht - 6}" text-anchor="${i === dias.length - 1 ? "end" : i === 0 ? "start" : "middle"}" class="g-t">${d.slice(8, 10)}/${d.slice(5, 7)}</text>`).join("");
  return `<svg class="grafico" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Evolução de atestados, termos e prontos por dia">${grade}${rot}${linhas}</svg>
    <div class="g-leg">${serie.map(([k, c, l]) => `<span><i style="background:${c}"></i>${l} <b class="num">${H[dias[dias.length - 1]][k] || 0}</b></span>`).join("")}<span class="hint">de ${max} pessoas · últimos ${dias.length} dias</span></div>`;
}
// Visual 2: gráfico com área, curva suave, meta, legenda que liga/desliga e dedo/mouse mostrando o dia
const curva = pts => pts.map((p, i) => { if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const a = pts[i - 2] || pts[i - 1], b = pts[i - 1], c = p, d = pts[i + 1] || p, k = 1 / 6;
  return `C${(b[0] + (c[0] - a[0]) * k).toFixed(1)},${(b[1] + (c[1] - a[1]) * k).toFixed(1)} ${(c[0] - (d[0] - b[0]) * k).toFixed(1)},${(c[1] - (d[1] - b[1]) * k).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`; }).join("");
function graficoEvolucao2() {
  const H = { ...dashHist(), [diaHoje()]: retratoHoje() }, dias = Object.keys(H).sort().slice(-21);
  if (dias.length < 2) return `<div class="empty">O gráfico começa a aparecer a partir de amanhã: o app guarda um retrato por dia.</div>`;
  const aba = S.gAba || "docs", off = S.gOff || {};
  const W = innerWidth < 600 ? 400 : 640, Ht = innerWidth < 600 ? 240 : 230, pl = 30, pr = 12, pt = 18, pb = 28;
  const x = i => pl + i * (W - pl - pr) / (dias.length - 1);
  const rotulos = (y) => { const passo = Math.ceil(dias.length / 7); return dias.map((d, i) => i % passo && i !== dias.length - 1 ? "" : `<text x="${x(i)}" y="${Ht - 8}" text-anchor="${i === dias.length - 1 ? "end" : i === 0 ? "start" : "middle"}" class="g-t">${d.slice(8, 10)}/${d.slice(5, 7)}</text>`).join(""); };
  const fd = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  let corpo = "", leg = "", dados;
  if (aba === "docs") {
    const max = Math.max(1, ...dias.map(d => H[d].total || H[d].n || 0)), y = v => pt + (Ht - pt - pb) * (1 - v / max);
    const serie = [["atestado", "#ff7a1a", "Atestado OK"], ["termo", "#f2b233", "Termo assinado"], ["prontos", "#46c486", "Prontos p/ o TOP"]];
    const grade = [0, .25, .5, .75, 1].map(f => { const v = Math.round(max * f); return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" class="g-t">${v}</text>`; }).join("");
    const defs = serie.map(([k, c]) => `<linearGradient id="g2-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".32"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient>`).join("");
    corpo = `<defs>${defs}</defs>${grade}<line x1="${pl}" x2="${W - pr}" y1="${y(max)}" y2="${y(max)}" class="g-meta"/><text x="${W - pr}" y="${y(max) - 6}" text-anchor="end" class="g-t g-meta-t">meta: ${max} pessoas</text>
      ${serie.filter(([k]) => !off[k]).map(([k, c]) => { const pts = dias.map((d, i) => [x(i), y(H[d][k] || 0)]), l = curva(pts);
        return `<path d="${l} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z" fill="url(#g2-${k})" class="g-area"/><path d="${l}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" class="g-linha"/>
          <circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="5" fill="${c}" stroke="var(--surface)" stroke-width="2"/>`; }).join("")}${rotulos()}`;
    leg = serie.map(([k, c, l]) => `<button type="button" class="g-chave ${off[k] ? "off" : ""}" data-g-off="${k}" aria-pressed="${!off[k]}"><i style="background:${c}"></i>${l} <b class="num">${H[dias[dias.length - 1]][k] || 0}</b></button>`).join("") + `<span class="hint">toque na legenda para esconder uma linha</span>`;
    dados = dias.map(d => ({ d: fd(d), v: serie.filter(([k]) => !off[k]).map(([k, c, l]) => [l, H[d][k] || 0, c]) }));
  } else {
    const tot = dias.map(d => H[d].n || 0), novos = tot.map((v, i) => i ? Math.max(0, v - tot[i - 1]) : 0);
    const max = Math.max(1, ...tot), y = v => pt + (Ht - pt - pb) * (1 - v / max), bw = Math.max(6, (W - pl - pr) / dias.length * .55);
    const maxN = Math.max(1, ...novos), yN = v => (Ht - pb) - (Ht - pt - pb) * .45 * v / maxN;
    const grade = [0, .5, 1].map(f => { const v = Math.round(max * f); return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end" class="g-t">${v}</text>`; }).join("");
    const pts = tot.map((v, i) => [x(i), y(v)]);
    corpo = `<defs><linearGradient id="g2-n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#60a5fa" stop-opacity=".3"/><stop offset="1" stop-color="#60a5fa" stop-opacity="0"/></linearGradient></defs>${grade}
      ${novos.map((v, i) => v ? `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${yN(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(Ht - pb - yN(v)).toFixed(1)}" rx="3" fill="var(--accent)" opacity=".85" class="g-barra"/>` : "").join("")}
      <path d="${curva(pts)} L${pts[pts.length - 1][0]},${y(0)} L${pts[0][0]},${y(0)} Z" fill="url(#g2-n)" class="g-area"/><path d="${curva(pts)}" fill="none" stroke="#60a5fa" stroke-width="3" class="g-linha"/>${rotulos()}`;
    leg = `<span class="g-chave"><i style="background:#60a5fa"></i>Senderistas inscritos <b class="num">${tot[tot.length - 1]}</b></span><span class="g-chave"><i style="background:var(--accent)"></i>Novos no dia</span>`;
    dados = dias.map((d, i) => ({ d: fd(d), v: [["Inscritos", tot[i], "#60a5fa"], ["Novos no dia", novos[i], "#ff7a1a"]] }));
  }
  return `<div class="g2-abas seg"><button type="button" data-g-aba="docs" aria-pressed="${aba === "docs"}">Documentos</button><button type="button" data-g-aba="insc" aria-pressed="${aba === "insc"}">Inscrições</button></div>
    <div class="g2" data-g2='${esc(JSON.stringify({ x: dias.map((_, i) => +(x(i) / W * 100).toFixed(2)), dados }))}'>
      <svg class="grafico g2-svg${g2Anim()}" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Evolução por dia">${corpo}</svg>
      <i class="g2-cursor" hidden></i><div class="g2-tip" hidden></div></div>
    <div class="g-leg">${leg}</div>`;
}
// anima só na primeira vez em cada aba (re-desenhar a cada atualização do banco deixava o gráfico piscando/apagado)
const g2Visto = new Set();
const g2Anim = () => { const k = (S.gAba || "docs") + JSON.stringify(S.gOff || {}); if (g2Visto.has(k)) return ""; g2Visto.add(k); return " anim"; };
// passar o dedo ou o mouse no gráfico mostra os números do dia
function g2Mover(e) {
  const box = e.target.closest && e.target.closest(".g2"); if (!box) return;
  const info = box._g2 || (box._g2 = JSON.parse(box.dataset.g2)), r = box.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * 100;
  let i = 0; info.x.forEach((v, k) => { if (Math.abs(v - px) < Math.abs(info.x[i] - px)) i = k; });
  const cur = box.querySelector(".g2-cursor"), tip = box.querySelector(".g2-tip"), dd = info.dados[i];
  cur.hidden = tip.hidden = false; cur.style.left = info.x[i] + "%";
  tip.innerHTML = `<b>${dd.d}</b>${dd.v.map(([l, v, c]) => `<span><i style="background:${c}"></i>${esc(l)} <b class="num">${v}</b></span>`).join("")}`;
  tip.style.left = Math.min(Math.max(info.x[i], 18), 82) + "%";
}
document.addEventListener("pointermove", e => { if (D2()) g2Mover(e); });
document.addEventListener("pointerdown", e => { if (D2()) g2Mover(e); });
document.addEventListener("pointerleave", e => { const b = e.target.closest && e.target.closest(".g2"); if (b) { b.querySelector(".g2-cursor").hidden = b.querySelector(".g2-tip").hidden = true; } }, true);
// visão do ADM: as pessoas que estão com ele e o que falta de cada uma
function painelMeu() {
  const eu = ME.adm; if (!eu) return "";
  const pn = x => norm(x || "").split(" ")[0], meus = S.P.filter(p => !cancelado(p) && p.adm && (norm(p.adm) === norm(eu) || pn(p.adm) === pn(eu))), pend = meus.filter(p => pendDe(p).length)
    .sort((a, b) => (a.cobradoEm || "").localeCompare(b.cobradoEm || "") || pendDe(b).length - pendDe(a).length);
  const primeiro = eu.split(" ")[0];
  return `<section class="panel dash-meu"><h3>${ico("users")} Suas pessoas, ${esc(primeiro)} <small>${meus.length} com você · ${pend.length} com pendência</small></h3>
    ${!meus.length ? `<div class="empty">Ninguém está com você ainda. Quem você atualizar na lista passa a ficar com você.</div>`
      : !pend.length ? `<div class="empty">Todas as suas pessoas estão em dia. 👏</div>`
      : `<div class="list">${pend.slice(0, 6).map(p => `<div class="li"><span class="grow"><b>${famPre(p)}${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}${p.cobradoEm ? " · cobrado " + esc(quando(p.cobradoEm)) : " · ainda não cobrado"}</span><br>${pendDe(p).map(k => `<span class="chip wait">${{ pagamento: "Pagamento", atestado: "Atestado", termo: "Termo", grupo: "Grupo" }[k] || k}</span>`).join(" ")}</span>
        ${waNumber(p.telefone) ? `<a class="wa" href="${waCobrar(p)}" target="_blank" rel="noopener" data-cobrar="${p.id}">${ico("wa")} Cobrar</a>` : ""}</div>`).join("")}</div>
        ${pend.length > 6 ? `<button class="btn" type="button" data-go="pendencias" data-pf-set="aba:doc;oque:qualquer;quem:todos;adm:${esc(eu)}" style="margin-top:8px">Ver as ${pend.length} em Pendências</button>` : ""}`}
  </section>`;
}
function vPainelNovo() {
  const s = stats(), td = topDoc() || {}, dias = diasParaTop();
  const P = S.P.filter(p => !cancelado(p)), prontos = P.filter(prontoTop).length;
  const conta = k => P.filter(p => pendDe(p).includes(k)).length;
  const pagPend = S.P.filter(pagPendente).length, oc = RELATORIO_FINAL() ? ocorrAbertas().length : 0;
  const valor = S.estoque.reduce((a, e) => a + valorItem(e), 0);
  const pins = canSee({ id: "pins" }) ? pinsTodos() : [], pinsOk = pins.filter(p => p.status === "entregue").length;
  const per = [td.inicio && fmtDate(td.inicio), td.fim && fmtDate(td.fim)].filter(Boolean).join(" a ");
  const cont = dias == null ? `<span class="cd-n">—</span><span class="cd-l">defina a data do TOP em Tops</span>`
    : dias > 1 ? `<span class="cd-n num">${dias}</span><span class="cd-l">dias para o TOP</span>`
    : dias === 1 ? `<span class="cd-n">Amanhã</span><span class="cd-l">começa o TOP</span>`
    : dias === 0 ? `<span class="cd-n">Hoje</span><span class="cd-l">começa o TOP</span>`
    : `<span class="cd-n">Em andamento</span><span class="cd-l">${td.status === "finalizado" ? "TOP finalizado" : "bom TOP!"}</span>`;
  // o que fazer hoje: só o que tem pendência, com atalho para a tela certa
  const tarefas = [
    [ORG() ? impFaltam() : 0, "planilha(s) do dia para importar", "importacao", "", "wait"],
    [conta("termo"), "termo(s) para cobrar", "pendencias", "aba:doc;oque:termo;quem:todos", "wait"],
    [conta("atestado"), "atestado(s) faltando", "pendencias", "aba:doc;oque:atestado;quem:todos", "wait"],
    [pagPend, "boleto(s) pendente(s)", "pendencias", "aba:pag;quem:todos", "bad"],
    [conta("grupo"), "fora do grupo", "pendencias", "aba:doc;oque:grupo;quem:participante", "sent"],
    [oc, "ocorrência(s) aberta(s)", "ocorrencias", "", "bad"],
    [s.zero.length, "item(ns) zerado(s) no estoque", "estoque", "", "bad"],
    [s.low.length, "item(ns) com estoque baixo", "estoque", "", "wait"],
    [s.tTotal - s.tDone, "tarefa(s) do checklist abertas", "checklist", "", "sent"],
  ].filter(t => t[0] > 0 && canSee({ id: t[2] }));
  const bloco = (titulo, ico_, corpo, go_) => `<section class="panel dash-bloco"><h3>${ico(ico_)} ${titulo}${go_ ? `<button class="linkbtn" type="button" data-go="${go_}">ver ›</button>` : ""}</h3>${corpo}</section>`;
  const mini = (l, v, sub, go_, extra = "") => `<${go_ ? `button type="button" data-go="${go_}"${extra}` : "div"} class="dmini"><span class="lbl">${l}</span><b class="num">${v}</b>${sub ? `<small>${sub}</small>` : ""}</${go_ ? "button" : "div"}>`;
  return `${backupBanner()}${EXTRA() && store.get("adm3-guia-visto") !== "1" ? `<div class="banner"><span>${ico("list")} <b>Novo por aqui?</b> O guia mostra em 2 minutos o que fazer em cada página.</span><div class="actions"><button class="btn primary" type="button" data-go="guia">Ver o guia</button><button class="btn ghost" type="button" data-act="guia-ok">Agora não</button></div></div>` : ""}
  ${ME.acesso && ["pedir", "bloqueado", "instalar"].includes(estadoNotif()) ? `<div class="banner aviso"><span>${ico("bell")} <b>Notificações desligadas neste aparelho.</b> Ative para receber os avisos do app no celular.</span><button class="btn primary" type="button" data-act="notif-ajuda">Ativar</button></div>` : ""}
  <section class="dash-topo">
    <div class="dash-id"><img class="dash-logo" src="assets/logo.png" alt="Track 3 Colinas · Franca SP">
      <div><span class="eyebrow">ADM 3Colinas · Legendários</span><h2>${esc(topName())}</h2><p>${esc([td.local || "Franca - SP", per].filter(Boolean).join(" · "))}</p>
        <div class="actions"><button class="btn primary" type="button" data-act="novo">${ico("plus")} Novo senderista</button><button class="btn glass" type="button" data-go="tops">${ico("flag")} Tops</button>${RELATORIO_FINAL() ? `<button class="btn glass" type="button" data-act="relatorio">${ico("list")} Relatório final</button>` : ""}</div></div></div>
    <div class="dash-cd">${cont}</div>
    <div class="dash-pronto">${anel(pct(prontos, P.length), "var(--good)", 112)}<div><b class="num">${prontos} de ${P.length}</b><span>prontos para o TOP</span><small>pago, termo e atestado Apto</small>${tendencia("prontos", prontos)}</div></div>
  </section>
  <section class="panel dash-hoje"><h3>${ico("check")} O que fazer hoje <small>${tarefas.length ? tarefas.length + " frente(s) em aberto" : "tudo em dia"}</small></h3>
    ${tarefas.length ? `<div class="hoje-lista">${tarefas.map(([n, l, v, pf, c]) => `<button class="hoje-item ${c}" type="button" data-go="${v}" ${pf ? `data-pf-set="${pf}"` : ""}><b class="num">${n}</b><span>${l}</span><i aria-hidden="true">›</i></button>`).join("")}</div>`
      : `<div class="empty">Nada pendente agora. Bom trabalho!</div>`}
  </section>
  ${tempoTopCard()}
  <div class="dash-blocos">
    ${bloco("Pessoas", "users", `<div class="dminis">
      ${mini("Senderistas", s.n, `${tendencia("n", s.n)}${s.mais40.length} com +40${s.dup ? ` · ${s.dup} repetido(s)` : ""}`, "participantes")}
      ${mini("Legendários", s.lg.length, `${s.lgAssinado} termos · ${s.lgAtest} atestados`, "legendarios")}
      ${mini("Boleto pendente", pagPend, "pagamento em aberto", "pendencias", ` data-pf-set="aba:pag;quem:todos"`)}
      ${mini("Canceladas", S.P.filter(cancelado).length, "fora da contagem", "")}</div>`, "participantes")}
    ${bloco("Documentos", "check", `<div class="aneis">
      <div>${anel(pct(s.atestado, s.n), "#ff7a1a")}<span>Atestado</span><small class="num">${s.atestado} de ${s.n}</small>${tendencia("atestado", s.atestado)}</div>
      <div>${anel(pct(s.termo, s.n), "#ff7a1a")}<span>Termo</span><small class="num">${s.termo} de ${s.n}</small>${tendencia("termo", s.termo)}</div>
      <div>${anel(pct(s.grupo, s.n), "var(--good)")}<span>Grupo</span><small class="num">${s.grupo} de ${s.n}</small>${tendencia("grupo", s.grupo)}</div></div>`, "pendencias")}
    ${bloco("Itens", "box", `<div class="dminis">
      ${PRECO_ESTOQUE() ? mini("Valor em estoque", `<span class="dinheiro">${brl(valor)}</span>`, `${s.zero.length + s.low.length} item(ns) em alerta`, "estoque") : mini("Estoque em alerta", s.zero.length + s.low.length, `${s.zero.length} zerados`, "estoque")}
      ${mini("Checklist", pct(s.tDone, s.tTotal) + "%", `${s.tDone} de ${s.tTotal} prontas`, "checklist")}
      ${pins.length ? mini("Pins", `${pinsOk}<small>/${pins.length}</small>`, `${pins.length - pinsOk} pendentes`, "pins", ` data-pin-ir="pendente"`) : mini("Pista", (s.pistaM / 1000).toFixed(1).replace(".", ",") + " km", "3 dias", "pista")}</div>`, "estoque")}
  </div>
  <div class="dash-meio">
    <section class="panel"><h3>${ico("chart")} Evolução até o TOP <small>atestados, termos e prontos por dia</small></h3>${D2() ? graficoEvolucao2() : graficoEvolucao()}</section>
    ${painelMeu()}
  </div>
  ${NOVO() ? painelPronto() : ""}
  <div class="grid2">
    <section class="panel"><h3>Pendências por ADM <small>atestado ou termo em aberto</small></h3>
      <div class="list">${(() => { const pa = {}; s.all.filter(p => !atOk(p) || p.termo !== "assinado").forEach(p => { const k = p.adm || "Sem ADM"; pa[k] = (pa[k] || 0) + 1; });
        return Object.keys(pa).length ? Object.entries(pa).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="li"><span class="grow">${esc(k)}</span><b class="num">${v}</b></div>`).join("") : `<div class="empty">Nenhuma pendência.</div>`; })()}</div>
    </section>
    <section class="panel"><h3>Em andamento <small>checklist</small></h3>
      <div class="list">${s.tAnd.length ? s.tAnd.map(t => `<div class="li"><span class="grow">${esc(t.titulo)}</span><span class="tag">${esc(t.responsavel || "sem resp.")}</span></div>`).join("") : `<div class="empty">Nenhuma tarefa em andamento.</div>`}</div>
    </section>
    ${painelInscricao()}
  </div>`;
}
function painelPronto() {
  const P = S.P.filter(p => !cancelado(p)), sen = P.filter(p => p.tipo !== "legendario"), lg = P.filter(p => p.tipo === "legendario");
  const ok = a => a.filter(prontoTop).length, falta = P.filter(p => !prontoTop(p)).sort((a, b) => faltaTop(b).length - faltaTop(a).length || norm(a.nome).localeCompare(norm(b.nome)));
  const porItem = k => P.filter(p => faltaTop(p).includes(k)).length;
  const linha = p => { const url = waCobrar(p);
    return `<div class="li"><span class="grow"><b>${famPre(p)}${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}</span><br>${faltaTop(p).map(k => `<span class="chip ${k === "apto" && atOk(p) ? "wait" : "bad"}">${k === "apto" ? (atOk(p) ? "Atestado: aguardando equipe médica" : "Falta atestado") : "Falta " + FALTA[k].toLowerCase()}</span>`).join(" ")}</span>
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
  if (ehCoordEq()) return vPainelCoord();
  if (DASH_NOVO()) return vPainelNovo();
  const s = stats();
  const kits = topKits();
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
      <div class="actions"><button class="btn primary" type="button" data-act="novo">${ico("plus")} Novo senderista</button><button class="btn glass" type="button" data-go="tops">${ico("flag")} Todos os Tops</button>${RELATORIO_FINAL() ? `<button class="btn glass" type="button" data-act="relatorio">${ico("list")} Relatório final</button>` : ""}</div>
    </div>
  </section>

  <div class="kpis">
    <button class="kpi" type="button" data-go="participantes"><span class="lbl">Senderistas</span><span class="val num">${s.n}</span><span class="sub">${s.dup ? `${s.dup} possível(is) repetido(s)` : "sem repetidos"} · ${s.mais40.length} com +40</span></button>
    <div class="kpi"><span class="lbl">Atestados confirmados</span><span class="val num">${s.atestado}<small style="font-size:18px;color:var(--muted)"> / ${s.n}</small></span><div class="bar good"><i style="width:${pct(s.atestado, s.n)}%"></i></div></div>
    <div class="kpi"><span class="lbl">Termos assinados</span><span class="val num">${s.termo}<small style="font-size:18px;color:var(--muted)"> / ${s.n}</small></span><div class="bar good"><i style="width:${pct(s.termo, s.n)}%"></i></div></div>
    <div class="kpi"><span class="lbl">No grupo</span><span class="val num">${s.grupo}</span><span class="sub">${s.n - s.grupo > 0 ? `faltam ${s.n - s.grupo} entrar` : "todos no grupo"}</span></div>
    <button class="kpi" type="button" data-go="checklist"><span class="lbl">Checklist ADM</span><span class="val num">${pct(s.tDone, s.tTotal)}%</span><span class="sub">${s.tDone} de ${s.tTotal} tarefas prontas</span></button>
    <button class="kpi" type="button" data-go="estoque"><span class="lbl">MREs montados</span><span class="val num">${kits}</span><span class="sub">kits lacrados</span></button>
    <button class="kpi ${s.zero.length ? "alert" : ""}" type="button" data-go="estoque"><span class="lbl">Estoque em alerta</span><span class="val num">${s.zero.length + s.low.length}</span><span class="sub">${s.zero.length} zerados · ${s.low.length} baixos (até ${S.config.alertaBaixo})</span></button>
    ${PRECO_ESTOQUE() ? (() => { const v = S.estoque.reduce((a, e) => a + valorItem(e), 0), sp = S.estoque.filter(e => e.preco == null).length, mre = S.estoque.filter(ehMre), c = mre.reduce((a, e) => a + (Number(e.preco) || 0) * porMre(e), 0);
      return `<button class="kpi" type="button" data-go="estoque"><span class="lbl">Valor em estoque</span><span class="val num dinheiro">${brl(v)}</span><span class="sub">${c ? `1 MRE custa ${brl(c)}` : ""}${c && sp ? " · " : ""}${sp ? `${sp} item(ns) sem preço` : ""}</span></button>`; })() : ""}
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
      ${podeImportar() ? `<button class="btn" type="button" data-act="importar">${ico("upload")} Importar relatório</button>` : ""}
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
      <td><div class="pname">${famPre(p)}${esc(p.nome)} ${p.exemplo ? '<span class="tag acc">exemplo</span>' : ""} ${!lg && is40(p) ? '<span class="tag">+40</span>' : ""}${tagsInscricao(p)}${tagRep(p)}<small>${esc([p.cidade, p.email].filter(Boolean).join(" · ") || "—")}</small></div>${obsLinha(p)}</td>
      <td class="num" style="white-space:nowrap"><div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start">${waBtn(p)}<span class="hint" style="font-size:12px">${esc(p.telefone || "sem telefone")}</span></div></td>
      ${lg ? `<td>${p.equipe ? `${esc(p.equipe)}${p.funcao ? `<div class="hint" style="font-size:12px">${esc(p.funcao)}</div>` : ""}` : "—"}</td>` : ""}
      <td>${atest(p)}</td>
      <td>${cyc(TERMO, "termo", p)}</td>
      ${lg ? "" : `<td>${ticks(p)}</td><td class="num">${p.familia ? "F" + String(p.familia).padStart(2, "0") : "—"}</td>`}
      <td>${respHtml(p)}</td>
      <td style="white-space:nowrap">${obsBtn(p)}<button class="linkbtn" type="button" data-edit="${p.id}" aria-label="Editar ${esc(p.nome)}">${ico("edit")}</button></td>
    </tr>`).join("")}</tbody></table></div>
  <div class="cards">${rows.map(p => `<article class="pcard ${S.sel.ids.has(p.id) ? "picked" : ""}">
      <div class="top">${caixa(p)}<div class="pname" style="flex:1">${famPre(p)}${esc(p.nome)} ${p.exemplo ? '<span class="tag acc">exemplo</span>' : ""} ${!lg && is40(p) ? '<span class="tag">+40</span>' : ""}${tagsInscricao(p)}${tagRep(p)}<small class="num">${esc(p.telefone || "")}${lg && p.equipe ? " · " + esc(equipeTxt(p)) : ""}</small></div>
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
  <div class="head"><div><h2>Famílias</h2><p>Distribuição dos senderistas nas 12 famílias. Defina a família no cadastro de cada um${FAM_IMP() ? " ou importe a planilha do outro sistema" : ""}.</p></div>
    ${FAM_IMP() && podeEditar() ? `<div class="actions"><button class="btn primary" type="button" data-act="fam-importar">${ico("upload")} Importar planilha</button></div>` : ""}</div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Distribuídos</span><span class="val num">${parts.length - sem.length}</span><span class="sub">de ${parts.length} senderistas</span></div>
    <div class="kpi ${sem.length ? "alert" : ""}"><span class="lbl">Sem família</span><span class="val num">${sem.length}</span><span class="sub">média ideal ${parts.length ? (parts.length / 12).toFixed(1).replace(".", ",") : 0} por família</span></div>
  </div>
  ${sem.length ? `<section class="panel"><h3>Sem família <small>${sem.length}</small></h3><div class="list">${sem.map(p => `<div class="li"><span class="grow">${esc(p.nome)} ${is40(p) ? '<span class="tag">+40</span>' : ""}</span>${podeEditar() ? `<select class="sel" data-fam="${p.id}" aria-label="Família de ${esc(p.nome)}"><option value="">Escolher…</option>${fams.map(f => `<option value="${f}">Família ${String(f).padStart(2, "0")}</option>`).join("")}</select>` : ""}</div>`).join("")}</div></section>` : ""}
  <div class="fams">${fams.map(f => { const m = parts.filter(p => Number(p.familia) === f); return `
    <section class="fam"><header><b>Família ${String(f).padStart(2, "0")}</b><span class="hint num">${m.length} · ${m.filter(is40).length} +40</span></header>
    ${m.length ? `<ul>${m.map(p => `<li><span>${esc(p.nome)}</span>${ehCoordEq() ? "" : atOk(p) && p.termo === "assinado" ? '<span class="chip ok">OK</span>' : '<span class="chip wait">Pend.</span>'}</li>`).join("")}</ul>` : `<div class="empty">Ninguém ainda.</div>`}</section>`; }).join("")}</div>`;
}

/* Importar famílias: planilha (.xlsx/.csv) do outro sistema. Aceita coluna de família ("Família", "Fam", "Grupo") ao lado do nome,
   ou a lista em blocos ("Família 01" numa linha e os nomes embaixo). Casa pelo nome (igual, depois primeiro + último nome), telefone ou e-mail. */
const famNum = v => { const m = /(\d{1,2})/.exec(String(v || "")); const n = m ? +m[1] : 0; return n >= 1 && n <= 12 ? n : 0; };
function famLerPlanilha(linhas) {
  const H = c => norm(String(c || "")).trim();
  let hi = linhas.findIndex(r => r.some(c => /^nome|nome completo|participante|senderista/.test(H(c))));
  const out = [];
  if (hi >= 0) {
    const h = linhas[hi].map(H), col = re => h.findIndex(x => re.test(x));
    const cN = col(/^nome|nome completo|participante|senderista/), cF = col(/famil|^fam\b|^grupo/), cT = col(/telefone|celular|whats|fone/), cE = col(/e-?mail/);
    let blocoF = 0;
    linhas.slice(hi + 1).forEach(r => {
      const nome = String(r[cN] || "").trim(), cel = r.map(x => String(x || "").trim()).filter(Boolean);
      if (cel.length === 1 && /famil/i.test(norm(cel[0])) && famNum(cel[0])) { blocoF = famNum(cel[0]); return; }
      if (!nome) return;
      const f = cF >= 0 ? famNum(r[cF]) : blocoF; if (!f) return;
      out.push({ nome, f, tel: cT >= 0 ? telLimpo(r[cT]).slice(-10) : "", email: cE >= 0 ? norm(String(r[cE] || "")).trim() : "" });
    });
  } else {   // sem cabeçalho: blocos "Família 01" e nomes embaixo
    let blocoF = 0;
    linhas.forEach(r => { const cel = r.map(x => String(x || "").trim()).filter(Boolean); if (!cel.length) return;
      if (/famil/i.test(norm(cel[0])) && famNum(cel[0])) { blocoF = famNum(cel[0]); if (cel.length > 1 && blocoF) out.push({ nome: cel[1], f: blocoF }); return; }
      if (blocoF) out.push({ nome: cel[0].replace(/^\d+[\s.)-]+/, ""), f: blocoF }); });
  }
  if (!out.length) throw new Error("Não achei nomes com família nessa planilha. Ela precisa ter uma coluna de nome e outra de família (ou blocos \"Família 01\" com os nomes embaixo).");
  return out;
}
function famCasar(R) {
  const sen = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)), N = x => norm(x).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  const pl = x => { const w = N(x).split(" ").filter(y => y.length > 1); return w.length ? w[0] + " " + w[w.length - 1] : ""; };
  const usados = new Set(), muda = [], igual = [], nao = [];
  R.forEach(r => {
    let p = sen.find(x => !usados.has(x.id) && N(x.nome) === N(r.nome))
      || (r.tel && sen.find(x => !usados.has(x.id) && telLimpo(x.telefone).slice(-10) === r.tel))
      || (r.email && sen.find(x => !usados.has(x.id) && norm(x.email || "").trim() === r.email));
    if (!p) { const c = sen.filter(x => !usados.has(x.id) && pl(x.nome) === pl(r.nome)); if (c.length === 1) p = c[0]; }
    if (!p) { nao.push(r); return; }
    usados.add(p.id);
    (Number(p.familia) === r.f ? igual : muda).push({ p, r });
  });
  const fora = sen.filter(p => !usados.has(p.id));
  return { muda, igual, nao, fora };
}
function famImportarForm() {
  if (!podeEditar()) { toast("Seu acesso é somente leitura."); return; }
  let A = null;
  modal(`<h3>Importar famílias</h3>
    <p class="hint" style="margin:0">Escolha a planilha (.xlsx ou .csv) tirada do outro sistema. Ela precisa ter o <b>nome</b> e a <b>família</b> de cada senderista (pode ser em colunas ou em blocos "Família 01" com os nomes embaixo). Você confere antes de aplicar.</p>
    <div class="field"><label for="f-famx">Arquivo</label><input type="file" id="f-famx" accept=".xlsx,.xls,.csv,text/csv"></div>
    <div id="famPrev" class="hint">Nenhum arquivo escolhido.</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="famImpBtn" disabled>Aplicar</button></div></div>`,
  () => {
    if (!A || !A.muda.length) { closeModal(); toast("Nada para mudar: todo mundo já está na família certa."); return; }
    const ops = A.muda.map(({ p, r }) => () => api.update("pessoas", p.id, { familia: r.f }));
    closeModal();
    save(async () => { for (const op of ops) await op(); }, `Famílias atualizadas: ${A.muda.length} senderista(s)`);
  });
  $("#f-famx").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      A = famCasar(famLerPlanilha(await lerPlanilha(f)));
      const li = (x, t) => `<li><b>${esc(x.p ? x.p.nome : x.nome)}</b> <span class="hint">${t}</span></li>`;
      $("#famPrev").innerHTML = `<p style="margin:6px 0"><b>${A.muda.length}</b> vão mudar de família · <b>${A.igual.length}</b> já estão certos${A.nao.length ? ` · <b class="warn-text">${A.nao.length}</b> não achados no app` : ""}</p>
        ${A.muda.length ? `<details ${A.muda.length <= 15 ? "open" : ""}><summary>Vão mudar (${A.muda.length})</summary><ul class="imp-list">${A.muda.map(x => li(x, `${x.p.familia ? famTxt(x.p.familia) : "sem família"} → <b>${famTxt(x.r.f)}</b>`)).join("")}</ul></details>` : ""}
        ${A.nao.length ? `<details open><summary>Não achei no app (${A.nao.length})</summary><ul class="imp-list">${A.nao.map(x => li(x, "na planilha: " + famTxt(x.f))).join("")}</ul><p class="hint">Confira se o nome está igual ao da inscrição. Esses ficam de fora.</p></details>` : ""}
        ${A.fora.length ? `<details><summary>Senderistas do app que não estão na planilha (${A.fora.length})</summary><ul class="imp-list">${A.fora.map(p => li({ p }, p.familia ? "continua na " + famTxt(p.familia) : "continua sem família")).join("")}</ul></details>` : ""}`;
      $("#famImpBtn").disabled = false; $("#famImpBtn").textContent = A.muda.length ? `Aplicar (${A.muda.length})` : "Fechar";
    } catch (err) { A = null; $("#famPrev").innerHTML = `<span class="warn-text">${esc(err.message || err)}</span>`; $("#famImpBtn").disabled = true; }
  });
}
/* ---------- Equipes LGND: em qual área cada legendário vai servir (campos equipe e funcao do legendário) ---------- */
function vEquipes() {
  if (ehCoordEq()) return vEquipeCoord();
  const lgs = S.P.filter(p => p.tipo === "legendario" && !cancelado(p)), ed = podeEditar();
  const sem = lgs.filter(p => !p.equipe);
  const eqs = equipesUsadas().map(e => ({ e, m: lgs.filter(p => p.equipe === e).sort((a, b) => FUNC_ORDEM(a.funcao) - FUNC_ORDEM(b.funcao) || norm(a.nome).localeCompare(norm(b.nome))) }));
  const com = eqs.filter(x => x.m.length), vazias = eqs.filter(x => !x.m.length);
  const pag = p => pagPendente(p) ? ' <span class="chip wait">Pagamento pendente</span>' : "";
  const pess = p => `<li><button class="linkbtn eq-p" type="button" ${ed ? `data-eq-p="${esc(p.id)}"` : "disabled"}><span>${esc(p.nome)}</span>${p.funcao ? ` <span class="chip ${FUNC_ORDEM(p.funcao) < 2 ? "ok" : ""}">${esc(p.funcao)}</span>` : ""}${pag(p)}</button></li>`;
  const nPag = lgs.filter(pagPendente).length;
  return `
  <div class="head"><div><h2>Equipes LGND</h2><p>Em qual área cada legendário vai servir. Vem da planilha de equipes (botão Importar relatório em Legendários)${ed ? " e você pode mudar ou incluir alguém aqui" : ""}.</p></div>
    ${ed ? `<div class="actions">${podeImportar() ? `<button class="btn" type="button" data-act="importar-eq">${ico("upload")} Importar planilha de equipes</button>` : ""}<button class="btn primary" type="button" data-eq-add="">${ico("plus")} Colocar em uma equipe</button></div>` : ""}</div>
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
    marcarImport("equipes", `${marcar.length} atualizado(s)`);
  });
  if (!marcar.length) marcarImport("equipes", "nada mudou");
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
      ${RELATORIO_FINAL() && !ehCoordEq() && ocorrAbertas().length ? `<button class="chip bad av-atraso" type="button" data-go="ocorrencias">${ocorrAbertas().length} ocorrência(s) aberta(s)</button>` : ""}
      ${OC_RAPIDA() && podeEditar() ? `<button class="btn primary" type="button" data-act="ocorr-rapida">${ico("plus")} Ocorrência</button>` : ""}${paisagem.matches ? "" : tv ? `<button class="btn" type="button" data-act="aovivo-tv">Sair do modo TV</button>` : `<button class="btn" type="button" data-act="aovivo-tv">Modo TV</button><button class="btn" type="button" data-act="aovivo-tela">Tela cheia</button>`}</div></div>
    <section class="av-agora"><span class="lbl">Agora</span><h2>${agora ? esc(agora.atv) : prox ? "Aguardando início" : "Dia encerrado"}</h2>
      ${agora ? `<p>${[agora.local, agora.resp].filter(Boolean).map(esc).join(" · ")}${M[agora.id].ini ? ` · desde ${esc(M[agora.id].ini)}${agora.hora ? ` (previsto ${esc(agora.hora)})` : ""}` : ""}</p>` : ""}${avBtn(agora, "fim")}</section>
    <section class="av-prox"><span class="lbl">Próximo</span><h3>${prox ? esc(prox.atv) : "—"}</h3>
      ${prox ? `<p>${prox.hora ? `previsto ${esc(prox.hora)}${prev && prev !== prox.hora ? ` · deve começar ~${esc(prev)}` : ""}` : ""}${prox.local ? " · " + esc(prox.local) : ""}</p>` : ""}${avBtn(prox, "ini")}</section>${avAviso(prox, prev)}
    ${seguintes.length ? `<ul class="av-depois">${seguintes.map(i => `<li><span class="num">${esc(i.hora || "")}</span>${esc(i.atv)}</li>`).join("")}</ul>` : ""}
    <div class="av-barra"><div class="bar good"><i style="width:${pct(nFeito, D.itens.length)}%"></i></div><span class="hint num">${nFeito} de ${D.itens.length} momentos do ${esc(D.nome || "dia")} concluídos · atualiza sozinho</span></div>
    ${ehCoordEq() ? "" : equipeMapaBarra()}${avPista()}${climaCard()}${avSol()}${avUltimas(D)}
  </div>${mapa}</div>`;
}
setInterval(() => { if (S.view === "aovivo" && !$("#modalRoot").innerHTML) render(); }, 30000);
/* Ao vivo 2 (01/11/2026, só DEMO): marcar daqui, contagem na pista, ocorrência rápida, pôr do sol, aviso 10 min antes e últimas marcações */
const AOVIVO2 = () => false;   // tirado da demo em 02/11/2026 a pedido do Vinicius (código guardado)
const OC_RAPIDA = () => true;    // + Ocorrência rápida no Ao vivo: app real desde 01/11/2026
const POR_DO_SOL = () => true;   // pôr do sol no Ao vivo: app real desde 01/11/2026
const avAvisoLigado = () => store.get("adm3-av-aviso") === "1";
function avBtn(i, tipo) {
  if (!AOVIVO2() || !i || !podeMarcar(eu())) return "";
  const minha = cronoMarcas(eu())[i.id] || {};
  if (tipo === "ini" && minha.ini) return "";
  if (tipo === "fim" && minha.fim) return "";
  return `<div class="av-marcar"><button class="btn ${tipo === "ini" ? "primary" : ""}" type="button" data-av-marca="${tipo}|${esc(i.id)}">${tipo === "ini" ? "Começou agora" : "Terminou agora"}</button></div>`;
}
function avAviso(prox, prev) {
  if (!AOVIVO2() || !prox || !(prev || prox.hora)) return "";
  const falta = difMin(agoraHM(), prev || prox.hora);
  if (falta == null || falta < 0 || falta > 10) return "";
  avNotificar(prox, falta);
  return `<div class="av-aviso">${ico("bell")} <b>${falta ? `Em ${falta} min` : "Agora"}:</b> ${esc(prox.atv)}</div>`;
}
function avNotificar(prox, falta) {
  if (!avAvisoLigado()) return;
  const k = "adm3-av-avisado-" + hojeISO() + "-" + prox.id; if (store.get(k)) return; store.set(k, "1");
  const txt = `${falta ? `Em ${falta} min` : "Agora"}: ${prox.atv}`;
  try { if ("Notification" in window && Notification.permission === "granted" && navigator.serviceWorker) navigator.serviceWorker.ready.then(r => r.showNotification("Próximo momento", { body: txt, tag: "av-" + prox.id, icon: "icons/icon-192.png" })); } catch (e) {}
  toast(txt);
}
function avPessoasPista() {
  const sen = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)), ids = new Set(sen.map(p => p.id));
  const oc = ocorrencias().filter(o => o.pessoaId && ids.has(o.pessoaId));
  const desist = new Set(oc.filter(o => o.tipo === "Desistência").map(o => o.pessoaId));
  const atend = new Set(oc.filter(o => o.status !== "resolvida" && !desist.has(o.pessoaId) && (o.medico || ["Mal-estar", "Lesão", "Atendimento médico"].includes(o.tipo))).map(o => o.pessoaId));
  return { total: sen.length, desist: desist.size, atend: atend.size, pista: sen.length - desist.size };
}
function avPista() {
  if (!AOVIVO2() || ehCoordEq()) return "";
  const c = avPessoasPista(); if (!c.total) return "";
  return `<section class="panel av-napista"><div><span class="lbl">Na pista</span><b class="num">${c.pista}<small> de ${c.total}</small></b></div>
    <div class="av-napista-chips"><button class="chip ${c.desist ? "bad" : ""}" type="button" data-go="ocorrencias">${c.desist} desistência${c.desist === 1 ? "" : "s"}</button>
    <button class="chip ${c.atend ? "wait" : ""}" type="button" data-go="ocorrencias">${c.atend} em atendimento</button></div></section>`;
}
function avSol() {
  if (!POR_DO_SOL()) return "";
  const c = climaDados(), d = c && c.d && c.d.daily; if (!d || !d.sunset) return "";
  const hoje = hojeISO(), i = Math.max(0, d.time.indexOf(hoje)), hm = x => String(x || "").slice(11, 16);
  const agora = minDe(agoraHM()), por = minDe(hm(d.sunset[i])), nasce = minDe(hm(d.sunrise[i])), nasceAm = hm(d.sunrise[i + 1] || d.sunrise[i]);
  const dur = m => m >= 60 ? Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") : m + " min";
  let t;
  if (agora < nasce) t = `Ainda escuro. Amanhece às <b>${hm(d.sunrise[i])}</b> (falta ${dur(nasce - agora)})`;
  else if (agora < por) t = `Escurece às <b>${hm(d.sunset[i])}</b> (falta ${dur(por - agora)})${por - agora <= 60 ? " · separar lanternas" : ""}`;
  else t = `Já escureceu (${hm(d.sunset[i])}). Amanhece às <b>${nasceAm}</b>`;
  return `<section class="panel av-sol ${agora >= nasce && por - agora <= 60 && agora < por ? "perto" : ""}">${ico(agora >= nasce && agora < por ? "sun" : "moon")}<span>${t}</span></section>`;
}
function avUltimas(D) {
  if (!AOVIVO2()) return "";
  const nomes = {}; (D.itens || []).forEach(i => { nomes[i.id] = i.atv; });
  const ev = [];
  admsVisiveis().forEach(a => Object.entries(cronoMarcas(a)).forEach(([k, m]) => { if (!m || typeof m !== "object" || !nomes[k]) return;
    if (m.ini) ev.push({ h: m.ini, quem: m.iniPor || a.nome, txt: `marcou o início de ${nomes[k]}` });
    if (m.fim) ev.push({ h: m.fim, quem: m.fimPor || a.nome, txt: `marcou o fim de ${nomes[k]}` }); }));
  const hoje = hojeISO();
  ocorrencias().filter(o => String(o.em || "").slice(0, 10) === hoje || (o.em && Date.now() - new Date(o.em) < 12 * 3600e3)).forEach(o => {
    ev.push({ h: new Date(o.em).toTimeString().slice(0, 5), quem: o.por || "", txt: `registrou ${o.tipo.toLowerCase()}${o.nome ? " de " + o.nome : ""}`, oc: true }); });
  ev.sort((a, b) => (minDe(b.h) || 0) - (minDe(a.h) || 0));
  const L = ev.slice(0, 6); if (!L.length) return "";
  return `<section class="panel av-ultimas"><div class="av-ult-top"><h3>Últimos acontecimentos</h3>
      <button class="btn sm" type="button" data-act="av-aviso">${ico("bell")} ${avAvisoLigado() ? "Aviso 10 min antes: ligado" : "Avisar 10 min antes"}</button></div>
    <ul>${L.map(e => `<li class="${e.oc ? "ev-oc" : ""}"><span class="num">${esc(e.h)}</span><span><b>${esc(e.quem)}</b> ${esc(e.txt)}</span></li>`).join("")}</ul></section>`;
}
function ocorrRapida() {
  if (!podeEditar()) { toast("Seu acesso é somente leitura."); return; }
  const mo = momentoAtual(), pessoas = S.P.filter(p => !cancelado(p)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  let pos = null;
  modal(`<h3>Ocorrência rápida</h3>
    <p class="hint">Hora: <b>${agoraHM()}</b>${mo ? ` · ${esc(mo.atv)}` : ""} · <span id="orGps">buscando localização…</span></p>
    <div class="form">
      <div class="field full"><label for="or-p">Quem</label><input id="or-p" name="nome" list="orPessoas" placeholder="Nome do senderista ou legendário" autocomplete="off">
        <datalist id="orPessoas">${pessoas.map(p => `<option value="${esc(p.nome)}">${p.tipo === "legendario" ? "Legendário" : "Senderista"}</option>`).join("")}</datalist></div>
      <div class="field full"><span class="lab">O que foi</span><div class="or-tipos">${OC_TIPOS.map((t, n) => `<label class="or-t"><input type="radio" name="tipo" value="${t}" ${n ? "" : "checked"}><span>${t}</span></label>`).join("")}</div></div>
      <div class="field full"><span class="lab">Gravidade</span><div class="or-tipos">${OC_GRAV.map((g, n) => `<label class="or-t ${g.c}"><input type="radio" name="grav" value="${g.v}" ${n ? "" : "checked"}><span>${g.l}</span></label>`).join("")}</div></div>
      <div class="field full"><label for="or-d">Detalhe (opcional)</label><input id="or-d" name="desc" placeholder="ex.: torceu o tornozelo na descida"></div>
    </div>
    <div class="modal-foot"><div><button class="btn ghost" type="button" id="orCompleta">Formulário completo</button></div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Registrar</button></div></div>`,
  fd => {
    const nome = String(fd.get("nome") || "").trim(), desc = String(fd.get("desc") || "").trim();
    if (!nome && !desc) { $("#or-p").focus(); toast("Diga quem ou o que aconteceu."); return; }
    const p = S.P.find(x => norm(x.nome) === norm(nome)), agora = new Date();
    closeModal();
    salvarOcorr(ocPref() + Date.now().toString(36), { nome: p ? p.nome : nome, pessoaId: p ? p.id : null, tipo: fd.get("tipo"), grav: fd.get("grav"), em: agora.toISOString(),
      local: mo ? mo.atv : "", desc, prov: "", atendido: ME.adm || "", status: "aberta", por: ME.adm || "", criadaEm: agora.toISOString(), ...(pos ? { lat: pos.lat, lng: pos.lng } : {}) }, "Ocorrência registrada " + agoraHM());
  });
  $("#orCompleta").onclick = () => { closeModal(); ocorrForm(); };
  const ok = (lat, lng) => { pos = { lat, lng }; const e = $("#orGps"); if (e) e.textContent = "localização anotada"; };
  const falha = () => { const e = $("#orGps"); if (e) e.textContent = "sem localização"; };
  if (!navigator.geolocation) { if (DEMO) ok(-20.2028, -47.2706); else falha(); return; }
  navigator.geolocation.getCurrentPosition(g => ok(g.coords.latitude, g.coords.longitude), () => DEMO ? ok(-20.2028, -47.2706) : falha(), { enableHighAccuracy: true, timeout: 10000 });
}
// Modo TV: tudo numa tela só, sem menu. Liga pelo botão (fica salvo no aparelho) ou sozinho com o celular deitado.
const paisagem = matchMedia("(orientation: landscape) and (max-height: 540px)");
const modoTv = () => S.view === "aovivo" && (paisagem.matches || (() => { try { return localStorage.getItem("adm3-avtv") === "1"; } catch (e) { return false; } })());
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && S.mapaCheio) { S.mapaCheio = false; if (mapaAV) mapaAV.dia = null; render(); } });
paisagem.addEventListener("change", () => { if (S.view === "aovivo" && !$("#modalRoot").innerHTML) render(); });

/* ---------- Mapa da pista ao vivo (em teste: só na demonstração) ----------
   A linha vem do KMZ/KML da pista (config/pista-mapa). Os ADMs marcam quando a corrente sai e chega em cada trecho
   (config/pista-vivo-<top>); enquanto o trecho anda, a posição é estimada pelo tempo previsto do trecho. */
const MAPA_VIVO = () => true;
const MAPA_CHEIO = () => true;
const PRECO_ESTOQUE = () => true; // preços no estoque, custo por MRE e busca em Pendências
const RELATORIO_FINAL = () => true; // ocorrências e relatório final do TOP
const DASH_NOVO = () => true; // Dashboard novo (contagem regressiva, blocos, o que fazer hoje)
const ORG = () => true; // organização: importação do dia, menu em grupos, títulos padrão, busca geral e backup semanal
const MENU_GRUPOS = [["", ["painel"]], ["Pessoas", ["meta", "agenda", "participantes", "legendarios", "equipes", "pendencias", "comunicados", "nfc", "familias", "consagracao"]],
  ["Operação", ["checkin", "cronograma", "aovivo", "comunicacao", "campo", "celulares", "remedios", "transporte", "carros", "emergencia", "ocorrencias", "checklist", "pista"]], ["Itens", ["estoque", "pins"]], ["Gestão", ["importacao", "financeiro", "tops", "postop", "usuarios", "historico"]], ["Ajuda", ["guia"]]];
const EXTRA = () => true; // cobrança em sequência melhorada, Pós-TOP e guia "Como usar"

/* Importação do dia: as 4 planilhas, na ordem, com quem importou e a que horas. Fica em config/importacoes-<top> {ultimo:{k:{dia,em,por,arquivo,txt}}, hist:[]}. */
const IMPS = [
  { k: "inscricoes", l: "Relatório de inscrições", d: "Planilha .xlsx da plataforma. Cria e atualiza senderistas e legendários, pagamento e cancelados. Sempre a primeira." },
  { k: "assinaturas", l: "Assinaturas do termo", d: "CSV assinaturas_evento. Marca quem assinou e guarda o link do termo de cada pessoa." },
  { k: "avaliacoes", l: "Avaliações médicas", d: "relatorio_de_avaliacoes. Documento Recebido vira Confirmado e Apto vira Apto." },
  { k: "equipes", l: "Equipes LGND", d: "relatorio_de_equipe. Equipe e função de cada legendário." },
];
const impDocId = () => "importacoes-" + curTopId();
const impDoc = () => (S.cfgDocs || {})[impDocId()] || {};
const impHoje = k => { const u = (impDoc().ultimo || {})[k]; return u && u.dia === hojeISO() ? u : null; };
const impFaltam = () => canSee({ id: "importacao" }) ? IMPS.filter(i => !impHoje(i.k)).length : 0;
const horaTxt = iso => { try { return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
let impArquivo = "";
function marcarImport(k, txt) {
  if (!ORG()) return;
  const d = impDoc(), ult = { ...(d.ultimo || {}) };
  ult[k] = { dia: hojeISO(), em: new Date().toISOString(), por: ME.adm || "", arquivo: impArquivo || "", txt: txt || "" };
  api.set("config", impDocId(), { ultimo: ult, hist: [{ k, ...ult[k] }, ...(d.hist || [])].slice(0, 60), top: curTopId() }).catch(e => console.error(e));
}
function vImportacao() {
  const ult = impDoc().ultimo || {}, feitos = IMPS.filter(i => impHoje(i.k)).length, ed = podeEditar();
  const passo = (i, n) => { const u = impHoje(i.k), ant = ult[i.k];
    return `<div class="imp-passo ${u ? "ok" : ""}"><span class="imp-n num">${u ? ico("check") : n}</span>
      <div class="imp-txt"><b>${i.l}</b><small>${esc(i.d)}</small>
        ${u ? `<span class="imp-st ok">Importada hoje às ${horaTxt(u.em)}${u.por ? " por " + esc(u.por) : ""}${u.txt ? " · " + esc(u.txt) : ""}</span>`
          : `<span class="imp-st">Falta importar hoje${ant ? ` · última em ${fmtDate(ant.dia)}${ant.por ? " por " + esc(ant.por) : ""}` : ""}</span>`}</div>
      ${podeImportar() ? `<button class="btn ${u ? "glass" : "primary"}" type="button" data-act="importar">${ico("upload")} ${u ? "De novo" : "Importar"}</button>` : ""}</div>`; };
  const pin = ult.pins, nome = k => k === "pins" ? "Pins" : (IMPS.find(i => i.k === k) || {}).l || k;
  const hist = (impDoc().hist || []).slice(0, 12);
  return `
  <div class="head"><div><h2>Importação do dia</h2><p>As 4 planilhas que mantêm o app atualizado, na ordem. Todas entram pelo mesmo botão Importar: o app reconhece qual é.</p></div></div>
  <section class="panel imp-dia"><h3>Hoje <small>${feitos} de ${IMPS.length} importadas</small></h3>
    <div class="bar ${feitos === IMPS.length ? "good" : ""}" style="height:8px;margin-bottom:12px"><i style="width:${pct(feitos, IMPS.length)}%"></i></div>
    <div class="imp-passos">${IMPS.map((i, n) => passo(i, n + 1)).join("")}</div>
    <div class="imp-passo extra"><span class="imp-n">${ico("check")}</span><div class="imp-txt"><b>Pins (alunos do lote)</b><small>Só quando chega lote novo, pela aba Pins.</small>
      <span class="imp-st">${pin ? `Última em ${fmtDate(pin.dia)}${pin.por ? " por " + esc(pin.por) : ""}` : "Ainda não importada por aqui"}</span></div>
      ${canSee({ id: "pins" }) ? `<button class="btn glass" type="button" data-go="pins">Abrir Pins</button>` : ""}</div>
  </section>
  ${hist.length ? `<section class="panel"><h3>Últimas importações</h3><div class="imp-hist">${hist.map(h => `<div><b>${esc(nome(h.k))}</b><span class="hint">${fmtDate(h.dia)} ${horaTxt(h.em)}${h.por ? " · " + esc(h.por) : ""}${h.txt ? " · " + esc(h.txt) : ""}</span></div>`).join("")}</div></section>` : ""}`;
}

/* Busca geral: acha pessoa, item do estoque, ocorrência, tarefa ou tela de qualquer lugar (lupa no alto ou tecla /). */
function buscaGeral() {
  const dig = x => String(x || "").replace(/\D/g, "");
  const achar = q => {
    const k = norm(q.trim()), kd = dig(q); if (k.length < 2) return [];
    const bate = (...xs) => xs.some(x => x && norm(String(x)).includes(k)) || (kd.length >= 4 && xs.some(x => dig(x).includes(kd)));
    const grp = [];
    const pes = S.P.filter(p => canSee({ id: p.tipo === "legendario" ? "legendarios" : "participantes" }) && bate(p.nome, p.telefone, p.email, p.cidade, p.equipe)).slice(0, 8);
    if (pes.length) grp.push(["Pessoas", pes.map(p => `<button type="button" class="bg-li" data-edit="${p.id}"><span><b>${famPre(p)}${esc(p.nome)}</b><small>${tipoNome(p)}${cancelado(p) ? " · cancelada" : ""}${p.telefone ? " · " + esc(p.telefone) : ""}${p.equipe ? " · " + esc(equipeTxt(p)) : ""}</small></span>${ico("users")}</button>`)]);
    if (canSee({ id: "estoque" })) { const it = S.estoque.filter(e => bate(e.item, e.local)).slice(0, 6);
      if (it.length) grp.push(["Estoque", it.map(e => `<button type="button" class="bg-li" data-edit-item="${e.id}"><span><b>${esc(e.item)}</b><small>${e.qtd ?? 0} un.${e.local ? " · " + esc(e.local) : ""}</small></span>${ico("box")}</button>`)]); }
    if (canSee({ id: "ocorrencias" })) { const oc = ocorrencias().filter(o => bate(o.nome, o.tipo, o.local, o.desc, o.texto, o.obs, o.oque)).slice(0, 6);
      if (oc.length) grp.push(["Ocorrências", oc.map(o => `<button type="button" class="bg-li" data-bg-go="ocorrencias"><span><b>${esc(o.nome || o.tipo || "Ocorrência")}</b><small>${esc([o.tipo, o.status === "resolvida" ? "resolvida" : "aberta"].filter(Boolean).join(" · "))}</small></span>${ico("heart")}</button>`)]); }
    if (canSee({ id: "checklist" })) { const tk = S.T.filter(t => bate(t.titulo, t.responsavel)).slice(0, 6);
      if (tk.length) grp.push(["Checklist", tk.map(t => `<button type="button" class="bg-li" data-edit-task="${t.id}"><span><b>${esc(t.titulo || "Tarefa")}</b><small>${esc(opt(TASK, t.status).l)}${t.responsavel ? " · " + esc(t.responsavel) : ""}</small></span>${ico("list")}</button>`)]); }
    const tl = VIEWS.filter(v => canSee(v) && bate(v.l, v.c)).slice(0, 5);
    if (tl.length) grp.push(["Telas", tl.map(v => `<button type="button" class="bg-li" data-bg-go="${v.id}"><span><b>${v.l}</b><small>abrir a tela</small></span>${ico(v.i)}</button>`)]);
    return grp;
  };
  const pinta = q => { const g = achar(q);
    $("#bgRes").innerHTML = q.trim().length < 2 ? `<div class="hint">Digite pelo menos 2 letras: nome, telefone, e-mail, item do estoque, tarefa…</div>`
      : g.length ? g.map(([t, l]) => `<div class="bg-grp"><span class="eyebrow">${t}</span>${l.join("")}</div>`).join("") : `<div class="empty">Nada encontrado para “${esc(q)}”.</div>`; };
  modal(`
    <h3>Buscar no app</h3>
    <div class="field"><input id="bgQ" type="search" placeholder="Nome, telefone, item, tarefa ou tela" autocomplete="off" enterkeyhint="search"></div>
    <div id="bgRes" class="bg-res"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => {});
  pinta("");
  $("#bgQ").addEventListener("input", e => pinta(e.target.value));
  $("#bgRes").addEventListener("click", e => { const b = e.target.closest("[data-bg-go]"); if (b) { e.stopPropagation(); closeModal(); go(b.dataset.bgGo); } }, true);
}

/* Backup semanal: baixa uma planilha (.xlsx) com tudo do TOP. O dono vê um lembrete no Dashboard quando passa de 7 dias. */
const backupDoc = () => (S.cfgDocs || {})["backup-ultimo"] || null;
const diasDesde = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;
function backupBanner() {
  if (!ORG() || !S.isOwner) return "";
  const b = backupDoc(), d = b ? diasDesde(b.em) : null;
  if (d != null && d < 7) return "";
  return `<div class="banner aviso"><span>${ico("upload")} <b>Backup da semana.</b> ${d == null ? "Ainda não tem nenhum backup guardado." : `O último foi há ${d} dias${b.por ? " (" + esc(b.por) + ")" : ""}.`} Baixe a planilha com tudo do TOP e guarde no Drive.</span><button class="btn primary" type="button" data-act="backup">Baixar backup</button></div>`;
}
/* ---------- Pós-TOP: cada ADM avalia o TOP (1 a 5) e conta o que foi bom e o que melhorar. config/postop-<top>-<membro>; lições do dono em config/postop-<top>-licoes ---------- */
const PT_ITENS = [["organizacao", "Organização geral"], ["comunicacao", "Comunicação da equipe ADM"], ["cronograma", "Cumprimento do cronograma"],
  ["logistica", "Logística e estoque"], ["alimentacao", "Alimentação e MRE"], ["seguranca", "Segurança e saúde"]];
const ptPref = () => "postop-" + curTopId() + "-";
const ptRespostas = () => Object.entries(S.cfgDocs || {}).filter(([k, v]) => k.startsWith(ptPref()) && v && v.notas).map(([id, v]) => ({ ...v, id })).sort((a, b) => String(a.por || "").localeCompare(String(b.por || "")));
const ptMinha = () => (S.cfgDocs || {})[ptPref() + (ME.id || "eu")] || null;
const ptLicoes = () => ((S.cfgDocs || {})[ptPref() + "licoes"] || {}).texto || "";
const notaTxt = m => m == null ? "sem nota" : m.toFixed(1).replace(".", ",") + " de 5";
function ptResumo() {
  const R = ptRespostas();
  const itens = PT_ITENS.map(([k, l]) => { const xs = R.map(r => Number((r.notas || {})[k])).filter(n => n > 0); return { k, l, m: xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, n: xs.length }; });
  const ok = itens.filter(i => i.m != null);
  return { R, itens, geral: ok.length ? ok.reduce((a, i) => a + i.m, 0) / ok.length : null };
}
function vPosTop() {
  const P = ptResumo(), eu = ptMinha(), lic = ptLicoes(), ativos = (S.equipe || []).filter(m => m.ativo !== false).length;
  const cor = m => m == null ? "" : m >= 4 ? "good" : m >= 3 ? "" : "bad";
  return `
  <div class="head"><div><h2>Pós-TOP</h2><p>Cada ADM dá uma nota de 1 a 5 para o TOP e conta o que foi bom e o que dá para melhorar. As respostas viram as lições para o próximo TOP e entram no Relatório final.</p></div>
    <div class="actions">${RELATORIO_FINAL() ? `<button class="btn glass" type="button" data-act="relatorio">${ico("list")} Relatório final</button>` : ""}<button class="btn primary" type="button" data-act="pt-responder">${ico("edit")} ${eu ? "Editar minha resposta" : "Responder a pesquisa"}</button></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Nota geral</span><span class="val num">${P.geral == null ? "—" : P.geral.toFixed(1).replace(".", ",")}</span><span class="sub">média de 1 a 5</span></div>
    <div class="kpi"><span class="lbl">Respostas</span><span class="val num">${P.R.length}</span><span class="sub">${S.isOwner && ativos ? `de ${ativos} ADMs` : "ADMs responderam"}</span></div>
    <div class="kpi ${eu ? "" : "alert"}"><span class="lbl">Sua resposta</span><span class="val num" style="font-size:22px">${eu ? "Enviada" : "Falta"}</span><span class="sub">${eu ? esc(quando(eu.em)) : "toque em Responder"}</span></div>
  </div>
  <section class="panel"><h3>Notas por área</h3>
    <div class="pt-notas">${P.itens.map(it => `<div class="pt-nota"><span>${it.l}</span><div class="bar ${cor(it.m)}"><i style="width:${it.m == null ? 0 : it.m * 20}%"></i></div><b class="num">${it.m == null ? "—" : it.m.toFixed(1).replace(".", ",")}</b></div>`).join("")}</div></section>
  <div class="grid2">
    <section class="panel"><h3>O que foi bom <small>${P.R.filter(r => r.bom).length}</small></h3>${P.R.filter(r => r.bom).map(r => `<div class="pt-fala"><p>${esc(r.bom)}</p><small>${esc(r.por || "ADM")}</small></div>`).join("") || `<div class="empty">Ninguém escreveu ainda.</div>`}</section>
    <section class="panel"><h3>O que melhorar <small>${P.R.filter(r => r.melhorar).length}</small></h3>${P.R.filter(r => r.melhorar).map(r => `<div class="pt-fala"><p>${esc(r.melhorar)}</p><small>${esc(r.por || "ADM")}</small></div>`).join("") || `<div class="empty">Ninguém escreveu ainda.</div>`}</section>
  </div>
  <section class="panel"><h3>Lições para o próximo TOP ${S.isOwner ? `<button class="linkbtn" type="button" data-act="pt-licoes">${lic ? "editar ›" : "escrever ›"}</button>` : ""}</h3>
    ${lic ? `<div class="pt-licoes">${esc(lic).replace(/\n/g, "<br>")}</div>` : `<div class="empty">${S.isOwner ? "Leia as respostas e escreva aqui o que muda no próximo TOP. Isso vai para o Relatório final." : "O dono escreve aqui o que muda no próximo TOP."}</div>`}</section>`;
}
function posTopForm() {
  const eu = ptMinha() || {}, n = eu.notas || {};
  modal(`
    <h3>Pesquisa pós-TOP</h3>
    <p class="hint" style="margin:0">De 1 (ruim) a 5 (excelente). Leva 1 minuto. Sua resposta aparece com o seu nome para a equipe.</p>
    <div class="pt-form">${PT_ITENS.map(([k, l]) => `<div class="pt-q"><span>${l}</span><div class="pt-escala" role="radiogroup" aria-label="${l}">${[1, 2, 3, 4, 5].map(v => `<label><input type="radio" name="${k}" value="${v}" ${Number(n[k]) === v ? "checked" : ""}><span>${v}</span></label>`).join("")}</div></div>`).join("")}</div>
    <div class="field"><label for="f-ptbom">O que foi bom</label><textarea id="f-ptbom" name="bom" style="min-height:70px">${esc(eu.bom || "")}</textarea></div>
    <div class="field"><label for="f-ptmel">O que dá para melhorar no próximo TOP</label><textarea id="f-ptmel" name="melhorar" style="min-height:70px">${esc(eu.melhorar || "")}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Enviar</button></div></div>`,
  fd => {
    const notas = {}; PT_ITENS.forEach(([k]) => { const v = Number(fd.get(k)); if (v) notas[k] = v; });
    if (!Object.keys(notas).length) { toast("Dê pelo menos uma nota."); return; }
    closeModal();
    save(() => api.set("config", ptPref() + (ME.id || "eu"), { notas, bom: String(fd.get("bom") || "").trim(), melhorar: String(fd.get("melhorar") || "").trim(), por: ME.adm || "", em: new Date().toISOString(), top: curTopId() }), "Obrigado! Resposta enviada.").then(render);
  });
}
function licoesForm() {
  modal(`
    <h3>Lições para o próximo TOP</h3>
    <p class="hint" style="margin:0">Uma por linha. Vai para o Relatório final.</p>
    <div class="field"><textarea id="f-lic" name="texto" style="min-height:180px" placeholder="ex.: começar a cobrança de atestado 30 dias antes">${esc(ptLicoes())}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { closeModal(); save(() => api.set("config", ptPref() + "licoes", { texto: String(fd.get("texto") || "").trim(), por: ME.adm || "", em: new Date().toISOString(), top: curTopId() }), "Lições salvas").then(render); });
}

/* ---------- Guia "Como usar": o que fazer em cada página, só das páginas que a pessoa vê ---------- */
const GUIA = {
  meta: ["Meta do TOP", ["Equipes: os grupos de equipes e as duas missões, trazer senderistas e cuidar dos legendários.", "Tarefas: a ADM cria e manda para um grupo; o coordenador escolhe quem faz e marca feita.", "Indicações: os nomes de cada equipe, com respostas prontas para as dúvidas.", "Resumo: o que pede atenção agora e como cada grupo está nas duas missões."]],
  agenda: ["Agenda", ["Todos os eventos de divulgação do Legendários e o TOP, por mês.", "Toque num evento para ver quantos vão, quem vai e mandar o link para mais pessoas confirmarem.", "Qualquer coordenador pode criar um evento em \"Novo evento\"."]],
  painel: ["Visão geral do TOP", ["Mostra quantos dias faltam, quantos estão prontos e o que fazer hoje.", "Toque em qualquer item de \"O que fazer hoje\" para ir direto à tela certa."]],
  participantes: ["Lista dos senderistas", ["Toque no status de atestado ou termo para avançar.", "O lápis abre a ficha completa. Quem mexe por último vira o ADM responsável."]],
  legendarios: ["Lista dos legendários", ["Mesma ideia dos senderistas: atestado, termo e equipe de cada um."]],
  equipes: ["Equipes LGND", ["Mostra cada legendário na sua área e função.", "Atualiza sozinho quando a planilha de equipes é importada."]],
  pendencias: ["Quem ainda deve algo", ["Filtre por atestado, termo, grupo ou boleto.", "Use \"Cobrar em sequência\" para mandar o WhatsApp de um por um com a mensagem pronta e o link do termo."]],
  familias: ["Famílias", ["Monte e confira as famílias de senderistas."]],
  consagracao: ["Consagração", ["Organiza a consagração por dia, com quem está em cada momento."]],
  cronograma: ["Cronograma do TOP", ["Marque início e fim de cada momento na hora em que acontece.", "O app calcula o atraso e mostra no Ao vivo."]],
  aovivo: ["Painel ao vivo", ["Mostra o momento atual, atrasos e a pista no mapa.", "Use o Modo TV (ou vire o celular) para deixar no telão."]],
  ocorrencias: ["Ocorrências", ["Registre mal-estar, lesão, desistência e outros na hora.", "Marque como resolvida quando terminar. Entra no Relatório final."]],
  checklist: ["Checklist da equipe ADM", ["Cada tarefa tem etapa, responsável e status.", "Mude o status conforme for fazendo."]],
  pista: ["KM da pista", ["Trechos de cada dia com metros e tempo."]],
  pins: ["Pins", ["Entrega dos pins por lote. Importe a planilha do lote quando chegar."]],
  estoque: ["Estoque e compras", ["Use + e − na conferência. Preço de cada item soma o valor em estoque.", "Marque MRE nos itens que vão no kit e some os MREs montados."]],
  importacao: ["Importação do dia", ["As 4 planilhas na ordem: inscrições, assinaturas, avaliações e equipes.", "Só importa quem o dono liberou no cadastro. O ✓ mostra quem já importou hoje."]],
  tops: ["Tops", ["Histórico dos TOPs, iniciar e finalizar. Também gera o backup."]],
  postop: ["Pós-TOP", ["Depois do TOP, dê suas notas e conte o que foi bom e o que melhorar."]],
  usuarios: ["Usuários", ["Cadastre ADMs e escolha as páginas que cada um vê e se pode editar."]],
  historico: ["Histórico", ["Tudo que foi alterado, por quem e quando. Toque numa linha para ver o detalhe."]],
};
function vGuia() {
  const vs = VIEWS.filter(v => GUIA[v.id] && canSee(v));
  const ROTINA = [
    ["Todo dia de manhã", "Após o Admin importar a planilha do dia.", canSee({ id: "importacao" }) ? "importacao" : "painel"],
    canSee({ id: "pendencias" }) && ["Depois de importar", "Abra Pendências e use Cobrar em sequência.", "pendencias"],
    ["Durante o TOP", "Marque o Cronograma e registre as Ocorrências. O Ao vivo mostra tudo para a equipe.", canSee({ id: "cronograma" }) ? "cronograma" : "painel"],
    canSee({ id: "postop" }) && ["Depois do TOP", "Responda o Pós-TOP. O dono gera o Relatório final.", "postop"],
  ].filter(Boolean);
  return `
  <div class="head"><div><h2>Como usar</h2><p>O básico de cada página que você pode ver. Na lupa do alto você acha qualquer pessoa ou item de qualquer lugar.</p></div>
    ${store.get("adm3-guia-visto") !== "1" ? `<div class="actions"><button class="btn primary" type="button" data-act="guia-ok">${ico("check")} Entendi</button></div>` : ""}</div>
  <section class="panel"><h3>A rotina em 4 passos</h3><div class="guia-rotina">${ROTINA.map(([q, t, v], i) => `<button type="button" class="guia-passo" data-go="${v}"><span class="imp-n num">${i + 1}</span><span><b>${q}</b><small>${t}</small></span><i aria-hidden="true">›</i></button>`).join("")}</div></section>
  <div class="guia-cards">${vs.map(v => `<section class="panel guia-card"><h3>${ico(v.i)} ${v.l}</h3><p class="guia-sub">${GUIA[v.id][0]}</p><ul>${GUIA[v.id][1].map(t => `<li>${esc(t)}</li>`).join("")}</ul>${v.id !== "guia" ? `<button class="linkbtn" type="button" data-go="${v.id}">abrir ›</button>` : ""}</section>`).join("")}</div>`;
}

/* ---------- NFC 3COLINAS: ficha de saúde de cada participante (formulário por link), tag NFC no pescoço e atendimento médico ----------
   Dados em config/saude-<pessoaId> {token, r:{...respostas}, respondidoEm, tagEm, tagPor}. A tag guarda só um link com o código (token),
   nunca os dados: a ficha abre no app para quem está logado. Atendimento vira uma ocorrência (tipo "Atendimento médico") com sinais vitais. */
const NFC = () => false;   // tirado da demo em 02/11/2026 a pedido do Vinicius (código guardado)
/* Visual 2 (só na demo por enquanto): telas de carregamento com esqueleto, telas vazias com ícone e versão de computador mais larga */
const D2 = () => true;
// o que cada tela precisa já ter carregado para aparecer (enquanto não chega, mostra o esqueleto)
const PRECISA = { painel: ["pessoas", "tarefas", "estoque"], participantes: ["pessoas"], legendarios: ["pessoas"], pendencias: ["pessoas"], nfc: ["pessoas", "config"],
  familias: ["pessoas"], equipes: ["pessoas"], consagracao: ["pessoas"], checklist: ["tarefas"], estoque: ["estoque"], pista: ["pista"], aovivo: ["pista", "config"],
  ocorrencias: ["config"], cronograma: ["config"], pins: ["config"], postop: ["config"], importacao: ["config"] };
const carregando = v => (PRECISA[v] || []).some(c => !S.loaded[c]);
function esqueleto(v) {
  const l = n => Array.from({ length: n }, (_, i) => `<div class="sk-li"><i class="sk sk-av"></i><div><i class="sk" style="width:${[62, 48, 70, 55, 40][i % 5]}%"></i><i class="sk sk-sm" style="width:${[35, 28, 42, 30, 25][i % 5]}%"></i></div></div>`).join("");
  return `<div class="sk-wrap" aria-busy="true" aria-label="Carregando">
    <div class="head"><div><i class="sk sk-eb"></i><i class="sk sk-h"></i><i class="sk sk-p"></i></div></div>
    <div class="kpis">${'<div class="kpi"><i class="sk sk-sm" style="width:50%"></i><i class="sk sk-big"></i><i class="sk sk-sm" style="width:70%"></i></div>'.repeat(4)}</div>
    <section class="panel">${l(v === "painel" ? 4 : 6)}</section></div>`;
}
// telas vazias: ícone, texto centralizado e cor de "tudo certo" quando a mensagem é boa
const VAZIO_OK = /em dia|bom trabalho|nada pendente|nenhuma pend|todas as suas|todo mundo|👏/i, VAZIO_BUSCA = /nenhum resultado|nada encontrado|neste filtro|para esse filtro/i;
const vazios = html => html.replace(/<div class="empty">([\s\S]*?)<\/div>/g, (m, txt) => {
  const ok = VAZIO_OK.test(txt), busca = !ok && VAZIO_BUSCA.test(txt);
  return `<div class="empty e2${ok ? " ok" : busca ? " busca" : ""}"><span class="e2-ic">${ico(ok ? "check" : busca ? "search" : "box")}</span><span class="e2-t">${txt}</span></div>`;
});
const COMORB = [["bariatrico", "Bariátrico"], ["diabetico", "Diabético"], ["convulsoes", "Tem convulsões"], ["desmaios", "Tem desmaios"],
  ["alimentares", "Prob. alimentares"], ["depressao", "Tem depressão"], ["psiquiatrico", "Cuidados psiquiátricos"], ["respiratorio", "Prob. respiratórios"],
  ["musculo", "Prob. musculoesqueléticos"], ["cardiaco", "Cardíaco"], ["renal", "Problemas renais"], ["morteSubita", "Morte súbita na família"],
  ["pressao", "Pressão alta"], ["oncologico", "Histórico oncológico"], ["coluna", "Problemas na coluna"]];
const SANGUE = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Não sei"];
const BIOTIPO = ["Ectomorfo (magro)", "Mesomorfo (atlético)", "Endomorfo (mais pesado)"];
const ATIV = ["Nenhuma", "1 a 2 vezes", "3 a 4 vezes", "5 ou mais vezes"];
const saudeId = p => "saude-" + p.id;
const saudeDoc = p => (S.cfgDocs || {})[saudeId(p)] || null;
const saudeResp = p => (saudeDoc(p) || {}).r || null;
const hashTxt = t => { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const saudeToken = p => (saudeDoc(p) || {}).token || (hashTxt(p.id + "·3colinas") + hashTxt(p.nome || "")).slice(0, 12);
const saudeLink = p => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}saude.html?t=${saudeToken(p)}`;
const tagLink = p => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}?nfc=${saudeToken(p)}`;
// a tag leva a ficha inteira (cifrada com o código da equipe médica) e abre em e.html, mesmo sem internet
const nfcCodigo = () => ((S.cfgDocs || {})["nfc-codigo"] || {}).codigo || "";
const tagDesatualizada = d => !!(d && d.tagEm && d.respondidoEm && d.respondidoEm > d.tagEm);
function tagDados(p) {
  const r = saudeResp(p) || {};
  return { t: saudeToken(p), nome: r.nome || p.nome, nascimento: r.nascimento, sangue: r.sangue, peso: r.peso, altura: r.altura, plano: r.plano,
    comorb: COMORB.map(([k], i) => r.comorb && r.comorb[k] === "sim" ? i : -1).filter(i => i >= 0),
    alergias: r.alergias, medicacoes: r.medicacoes, cirurgias: r.cirurgias, outras: String(r.outras || "").slice(0, 160),
    emergNome: r.emergNome, emergTel: r.emergTel, emergParent: r.emergParent, conjuge: r.conjuge, conjugeTel: r.conjugeTel,
    top: (S.top || {}).numero || "", demo: DEMO ? 1 : "", em: new Date().toISOString().slice(0, 16) };
}
const tagUrl = (p, lacre) => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}e.html?t=${saudeToken(p)}#${lacre}`;
function codigoForm() {
  modal(`
    <h3>Código da equipe médica</h3>
    <p class="hint" style="margin:0">A tag guarda a ficha de saúde inteira, mas trancada com este código. Quem encostar o celular na tag sem saber o código não vê nada. A equipe médica digita o código uma vez no celular e depois lê todas as tags, até sem internet.</p>
    <div class="field"><label for="f-cod">Código (4 a 12 letras ou números)</label><input id="f-cod" name="codigo" value="${esc(nfcCodigo())}" maxlength="12" autocomplete="off" style="font-size:22px;letter-spacing:.2em;text-transform:uppercase" required></div>
    ${nfcCodigo() ? `<div class="banner aviso"><span>Trocar o código não muda as tags já gravadas: elas continuam abrindo com o código antigo. Para usar o novo, regrave as tags.</span></div>` : ""}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar código</button></div></div>`, fd => {
    const c = String(fd.get("codigo") || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{4,12}$/.test(c)) { toast("Use de 4 a 12 letras ou números."); return false; }
    closeModal(); save(() => api.set("config", "nfc-codigo", { codigo: c, em: new Date().toISOString(), por: ME.adm || "" }), "Código salvo").then(render);
  });
}
const idadeDe = d => { if (!d) return null; const n = new Date(d + "T00:00:00"), h = new Date(); let a = h.getFullYear() - n.getFullYear(); if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) a--; return isNaN(a) ? null : a; };
const imcDe = r => { const kg = Number(String(r.peso || "").replace(",", ".")), cm = Number(r.altura); return kg && cm ? (kg / ((cm / 100) ** 2)).toFixed(1).replace(".", ",") : ""; };
const nada = v => !v || /^(n[aã]o|nenhum[a]?|-)\b/i.test(String(v).trim());
// alertas de saúde: comorbidades marcadas Sim + alergia + remédio
function saudeAlertas(r) {
  if (!r) return [];
  const a = COMORB.filter(([k]) => r.comorb && r.comorb[k] === "sim").map(([, l]) => l.replace(/^Tem /, "").replace(/^Prob\. /, "Prob. "));
  if (!nada(r.alergias)) a.unshift("Alergia");
  if (!nada(r.medicacoes)) a.push("Usa remédio");
  return a;
}
// indicativo de saúde de 0 a 5 (como no Hakuna NFC): soma comorbidades, alergia, remédio e IMC alto; "—" = ainda sem ficha
function nivelSaude(r) {
  if (!r) return null;
  const c = COMORB.filter(([k]) => r.comorb && r.comorb[k] === "sim").length, imc = Number((imcDe(r) || "").replace(",", "."));
  return Math.min(5, c + (nada(r.alergias) ? 0 : 1) + (nada(r.medicacoes) ? 0 : 1) + (imc >= 30 ? 1 : 0));
}
const NIVEL_COR = ["#7c8794", "#46c486", "#f2c233", "#ff8a1a", "#ef4444", "#a855f7"];
const nivelBadge = r => { const n = nivelSaude(r); return `<span class="nfc-nivel" style="background:${n == null ? "transparent" : NIVEL_COR[n]};${n == null ? "border:1px dashed var(--line);color:var(--muted)" : ""}" title="Indicativo de saúde ${n == null ? "sem ficha" : n + " de 5"}">${n == null ? "—" : n}</span>`; };
const IMC_FAIXAS = [[0, 18.5, "Abaixo", "#60a5fa"], [18.5, 25, "Normal", "#46c486"], [25, 30, "Sobrepeso", "#f2c233"], [30, 35, "Obesidade I", "#ff8a1a"], [35, 40, "Obesidade II", "#ef4444"], [40, 99, "Obesidade III", "#a855f7"]];
function imcBarra(r) {
  const v = Number((imcDe(r) || "").replace(",", ".")); if (!v) return "";
  const i = IMC_FAIXAS.findIndex(([a, b]) => v >= a && v < b);
  return `<div class="imc-bar">${IMC_FAIXAS.map(([, , l, c], k) => `<span style="background:${c};${k === i ? "outline:2px solid var(--fg);outline-offset:1px" : "opacity:.45"}">${l}</span>`).join("")}</div>`;
}
const atendimentosDe = p => ocorrencias().filter(o => o.pessoaId === p.id && o.medico);
function vNfc() {
  const P = S.P.filter(p => !cancelado(p)), f = S.nfcF || "todos", q = norm(S.nfcQ || "");
  const resp = P.filter(p => saudeResp(p)), alerta = resp.filter(p => saudeAlertas(saudeResp(p)).length), tags = P.filter(p => (saudeDoc(p) || {}).tagEm);
  const atend = ocorrencias().filter(o => o.medico);
  const lista = P.filter(p => f === "todos" || (f === "falta" ? !saudeResp(p) : f === "alerta" ? saudeAlertas(saudeResp(p)).length : f === "semtag" ? saudeResp(p) && !(saudeDoc(p) || {}).tagEm : true))
    .filter(p => !q || norm(p.nome).includes(q)).sort((a, b) => (saudeAlertas(saudeResp(b)).length - saudeAlertas(saudeResp(a)).length) || norm(a.nome).localeCompare(norm(b.nome)));
  const seg = (v, l, n) => `<button type="button" data-nfc-f="${v}" aria-pressed="${f === v}">${l} <span class="num" style="opacity:.75">${n}</span></button>`;
  return `
  <div class="head"><div><h2>NFC 3COLINAS</h2><p>A ficha de saúde de cada participante. Ele responde pelo link, os dados caem aqui, e no check-in a equipe grava a tag NFC que vai no pescoço. A ficha vai gravada na tag, trancada com o código da equipe médica: encostou o celular, abre a ficha de emergência, mesmo sem internet.</p></div>
    <div class="actions">${podeEditar() ? `<button class="btn" type="button" data-act="nfc-codigo">${ico("key")} Código da equipe médica${nfcCodigo() ? "" : " (definir)"}</button>` : ""}<button class="btn" type="button" data-act="nfc-ler">${ico("search")} Ler tag NFC</button>${podeEditar() ? `<button class="btn primary" type="button" data-act="nfc-seq">${ico("wa")} Enviar link para quem falta (${P.filter(p => !saudeResp(p) && waNumber(p.telefone)).length})</button>` : ""}</div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Fichas respondidas</span><span class="val num">${resp.length}<small style="font-size:.5em;opacity:.7"> / ${P.length}</small></span><span class="sub">${P.length - resp.length} ainda faltam</span></div>
    <div class="kpi ${alerta.length ? "alert" : ""}"><span class="lbl">Com alerta de saúde</span><span class="val num">${alerta.length}</span><span class="sub">alergia, remédio ou comorbidade</span></div>
    <div class="kpi"><span class="lbl">Tags gravadas</span><span class="val num">${tags.length}</span><span class="sub">de ${resp.length} com ficha</span></div>
    <div class="kpi"><span class="lbl">Atendimentos</span><span class="val num">${atend.length}</span><span class="sub">registrados no TOP</span></div>
  </div>
  <div class="toolbar">
    <div class="seg" role="group" aria-label="Filtro">${seg("todos", "Todos", P.length)}${seg("falta", "Falta responder", P.length - resp.length)}${seg("alerta", "Com alerta", alerta.length)}${seg("semtag", "Sem tag", resp.length - resp.filter(p => (saudeDoc(p) || {}).tagEm).length)}</div>
    <label class="search">${ico("search")}<input id="nq" type="search" placeholder="Buscar pelo nome" value="${esc(S.nfcQ || "")}" aria-label="Buscar no NFC"></label>
  </div>
  <div class="nivel-leg"><span>Indicativo de saúde:</span>${NIVEL_COR.map((c, n) => `<span><i style="background:${c}"></i>${n}</span>`).join("")}<span class="hint">0 = nada informado · 5 = mais pontos de atenção</span></div>
  <section class="panel"><div class="list">${lista.map(p => { const r = saudeResp(p), d = saudeDoc(p) || {}, al = saudeAlertas(r);
    return `<div class="li nfc-row">
      ${nivelBadge(r)}
      <div class="grow"><b>${esc(p.nome)}</b> ${p.tipo === "legendario" ? '<span class="tag">LGND</span>' : ""}${p.familia ? ` <span class="tag">F.${esc(p.familia)}</span>` : ""}${r && r.sangue && r.sangue !== "Não sei" ? ` <span class="tag sangue">${esc(r.sangue)}</span>` : ""}
        <div class="pendtags">${r ? (al.length ? al.slice(0, 4).map(a => `<span class="chip bad">${esc(a)}</span>`).join("") + (al.length > 4 ? `<span class="hint">+${al.length - 4}</span>` : "") : '<span class="chip ok">Sem alerta</span>') : '<span class="chip wait">Falta responder</span>'}
          ${tagDesatualizada(d) ? '<span class="chip wait">Ficha mudou, regravar tag</span>' : d.tagEm ? '<span class="chip sent">Tag gravada</span>' : ""}</div>
        <small class="hint">${r ? "respondida " + esc(quando(d.respondidoEm)) : d.linkEm ? "link enviado " + esc(quando(d.linkEm)) : "link ainda não enviado"}</small></div>
      <div class="actions">${r ? `<button class="btn sm" type="button" data-nfc-ficha="${p.id}">${ico("heart")} Ficha</button>${podeEditar() ? `<button class="btn sm" type="button" data-nfc-tag="${p.id}">${ico("nfc")} ${d.tagEm ? "Regravar" : "Gravar tag"}</button>` : ""}`
        : `${waNumber(p.telefone) && podeEditar() ? `<a class="wa" href="${waCobrar(p, textoLinkSaude(p))}" target="_blank" rel="noopener" data-nfc-link="${p.id}">${ico("wa")} Enviar link</a>` : ""}<button class="btn sm" type="button" data-nfc-form="${p.id}">Abrir formulário</button>`}</div>
    </div>`; }).join("") || `<div class="empty">Ninguém neste filtro.</div>`}</div></section>
  ${atend.length ? `<section class="panel"><h3>Atendimentos médicos <small>${atend.length}</small></h3><div class="list">${atend.map(o => `<button type="button" class="li nfc-at" data-nfc-ficha="${o.pessoaId}"><span class="chip ${(OC_GRAV.find(g => g.v === o.grav) || {}).c || ""}">${(OC_GRAV.find(g => g.v === o.grav) || {}).l || ""}</span><span class="grow"><b>${esc(o.nome || "")}</b><small class="hint"> · ${esc(quando(o.em))}</small><br><small>${esc(String(o.desc || "").slice(0, 110))}</small></span></button>`).join("")}</div></section>` : ""}`;
}
const textoLinkSaude = p => `Olá, ${String(p.nome || "").split(" ")[0]}! Aqui é ${ME.adm ? ME.adm.split(" ")[0] + ", " : ""}da equipe ADM do ${topName()}.\n\nPreencha a sua *ficha de saúde* pelo link abaixo (leva uns 3 minutos). Ela é muito importante caso você precise de atendimento durante o TOP:\n${saudeLink(p)}`;
function saudeForm(p) {
  if (!p) return;
  const r = saudeResp(p) || {}, c = r.comorb || {}, f = p.ficha || {};
  const v = (k, d = "") => esc(r[k] != null ? r[k] : d);
  const opts = (l, cur) => `<option value="">Selecione</option>` + l.map(x => `<option ${x === cur ? "selected" : ""}>${esc(x)}</option>`).join("");
  modal(`
    <div class="sf-top"><span class="eyebrow">NFC 3COLINAS · Ficha de saúde</span><h3>${esc(p.nome)}</h3><p class="hint" style="margin:0">É isto que o participante vê ao abrir o link. Preencha com cuidado: estas informações são usadas se ele precisar de atendimento no TOP.</p></div>
    <div class="sf-foto"><img id="sfFotoImg" ${r.foto ? `src="${esc(r.foto)}"` : "hidden"} alt="Foto"><span id="sfFotoVazio" ${r.foto ? "hidden" : ""}>${ico("users")}</span>
      <label class="btn sm">${ico("upload")} Tirar uma selfie<input type="file" accept="image/*" capture="user" id="sfFoto" hidden></label></div>
    <h4 class="sf-h">Dados pessoais</h4>
    <div class="form">
      <div class="field full"><label for="sf-nome">Nome</label><input id="sf-nome" name="nome" value="${v("nome", p.nome)}" required></div>
      <div class="field"><label for="sf-prof">Profissão</label><input id="sf-prof" name="profissao" value="${v("profissao")}"></div>
      <div class="field"><label for="sf-cel">Celular</label><input id="sf-cel" name="celular" inputmode="tel" value="${v("celular", p.telefone || "")}"></div>
      <div class="field"><label for="sf-cid">Cidade</label><input id="sf-cid" name="cidade" value="${v("cidade", p.cidade || "")}"></div>
      <div class="field"><label for="sf-uf">UF</label><input id="sf-uf" name="uf" value="${v("uf", "SP")}" maxlength="2"></div>
      <div class="field"><label for="sf-nasc">Data de nascimento</label><input id="sf-nasc" name="nascimento" type="date" value="${v("nascimento")}"></div>
      <div class="field"><label>Idade</label><output class="sf-calc" id="sfIdade">${idadeDe(r.nascimento) ?? (p.idade || "—")}</output></div>
      <div class="field"><label for="sf-peso">Peso (kg)</label><input id="sf-peso" name="peso" inputmode="decimal" value="${v("peso")}"></div>
      <div class="field"><label for="sf-alt">Altura (cm)</label><input id="sf-alt" name="altura" inputmode="numeric" value="${v("altura")}"></div>
      <div class="field"><label>IMC</label><output class="sf-calc" id="sfImc">${imcDe(r) || "—"}</output></div>
      <div class="field"><label for="sf-sang">Tipo sanguíneo</label><select id="sf-sang" name="sangue">${opts(SANGUE, r.sangue)}</select></div>
      <div class="field"><label for="sf-bio">Biotipo</label><select id="sf-bio" name="biotipo">${opts(BIOTIPO, r.biotipo)}</select></div>
      <div class="field"><label for="sf-ativ">Atividades físicas por semana</label><select id="sf-ativ" name="atividade">${opts(ATIV, r.atividade)}</select></div>
      <div class="field full"><label for="sf-plano">Plano de saúde</label><input id="sf-plano" name="plano" value="${v("plano")}" placeholder="nome do plano e número da carteirinha, ou Não tenho"></div>
    </div>
    <h4 class="sf-h">Comorbidades</h4>
    <div class="sf-comorb">${COMORB.map(([k, l]) => `<div class="sf-c"><span>${l}</span><div class="sf-sn"><label><input type="radio" name="c-${k}" value="sim" ${c[k] === "sim" ? "checked" : ""}><span>Sim</span></label><label><input type="radio" name="c-${k}" value="nao" ${c[k] !== "sim" ? "checked" : ""}><span>Não</span></label></div></div>`).join("")}</div>
    <h4 class="sf-h">Informações médicas</h4>
    <div class="form">
      <div class="field full"><label for="sf-med">Medicações em uso</label><textarea id="sf-med" name="medicacoes" placeholder="nome, dose e horário">${v("medicacoes", nada(f.medicamento) ? "" : f.medicamento || "")}</textarea></div>
      <div class="field full"><label for="sf-cir">Fez ou vai fazer cirurgia(s)</label><textarea id="sf-cir" name="cirurgias">${v("cirurgias")}</textarea></div>
      <div class="field full"><label for="sf-ale">Alergias</label><textarea id="sf-ale" name="alergias" placeholder="remédios, alimentos, picada de inseto…">${v("alergias", nada(f.restricaoAlimentar) ? "" : f.restricaoAlimentar || "")}</textarea></div>
      <div class="field full"><label for="sf-out">Outras informações médicas</label><textarea id="sf-out" name="outras">${v("outras", nada(f.condicaoMedica) ? "" : f.condicaoMedica || "")}</textarea></div>
    </div>
    <h4 class="sf-h sf-red">Contatos de emergência</h4>
    <div class="form">
      <div class="field full"><label for="sf-conj">Nome do cônjuge</label><input id="sf-conj" name="conjuge" value="${v("conjuge")}"></div>
      <div class="field"><label for="sf-conjt">Telefone</label><input id="sf-conjt" name="conjugeTel" inputmode="tel" value="${v("conjugeTel")}"></div>
      <div class="field"><label for="sf-conje">E-mail</label><input id="sf-conje" name="conjugeEmail" type="email" value="${v("conjugeEmail")}"></div>
      <div class="field full"><label for="sf-emn">Nome da pessoa de emergência</label><input id="sf-emn" name="emergNome" value="${v("emergNome")}"></div>
      <div class="field"><label for="sf-emt">Telefone</label><input id="sf-emt" name="emergTel" inputmode="tel" value="${v("emergTel")}"></div>
      <div class="field"><label for="sf-emp">Parentesco</label><input id="sf-emp" name="emergParent" value="${v("emergParent")}"></div>
    </div>
    <label class="selall sf-lgpd"><input type="checkbox" name="consent" ${r.consent ? "checked" : ""} required> Autorizo a equipe do ${esc(topName())} a usar estes dados só para cuidar da minha saúde durante o evento.</label>
    <span class="err" id="sfErr" hidden></span>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button><button class="btn primary" type="submit">Enviar ficha</button></div></div>`,
  fd => {
    if (!fd.get("consent")) { const e = $("#sfErr"); e.textContent = "Marque a autorização no final para enviar."; e.hidden = false; return; }
    const out = {}; ["nome", "profissao", "celular", "cidade", "uf", "nascimento", "peso", "altura", "sangue", "biotipo", "atividade", "plano", "medicacoes", "cirurgias", "alergias", "outras",
      "conjuge", "conjugeTel", "conjugeEmail", "emergNome", "emergTel", "emergParent"].forEach(k => { out[k] = String(fd.get(k) || "").trim(); });
    out.comorb = Object.fromEntries(COMORB.map(([k]) => [k, fd.get("c-" + k) || "nao"]));
    out.foto = $("#sfFotoImg").hidden ? "" : $("#sfFotoImg").src; out.consent = true;
    closeModal();
    const d = saudeDoc(p) || {};
    save(() => api.set("config", saudeId(p), { ...d, token: saudeToken(p), pessoaId: p.id, r: out, respondidoEm: new Date().toISOString(), top: curTopId() }), "Ficha de saúde enviada").then(render);
  });
  const calc = () => { const nasc = $("#sf-nasc").value; $("#sfIdade").textContent = idadeDe(nasc) ?? (p.idade || "—"); $("#sfImc").textContent = imcDe({ peso: $("#sf-peso").value, altura: $("#sf-alt").value }) || "—"; };
  ["sf-nasc", "sf-peso", "sf-alt"].forEach(id => $("#" + id).addEventListener("input", calc));
  $("#sfFoto").addEventListener("change", async e => { const fl = e.target.files[0]; if (!fl) return; try { const u = await reduzirFoto(fl, 360); $("#sfFotoImg").src = u; $("#sfFotoImg").hidden = false; $("#sfFotoVazio").hidden = true; } catch { toast("Não consegui abrir a foto."); } });
}
// diminui a foto antes de guardar (selfie e foto do atendimento)
function reduzirFoto(fl, lado) {
  return new Promise((ok, erro) => { const img = new Image(), url = URL.createObjectURL(fl);
    img.onload = () => { const k = Math.min(1, lado / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", .78)); };
    img.onerror = erro; img.src = url; });
}
// ficha de emergência: o que abre ao encostar o celular na tag
function fichaNfc(p) {
  if (!p) return;
  const r = saudeResp(p), d = saudeDoc(p) || {};
  if (!r) { saudeForm(p); return; }
  const al = saudeAlertas(r), sim = COMORB.filter(([k]) => r.comorb && r.comorb[k] === "sim").map(([, l]) => l);
  const tel = t => t ? `<a class="btn sm" href="tel:${esc(String(t).replace(/[^\d+]/g, ""))}">Ligar</a>${waNumber(t) ? `<a class="wa" href="https://wa.me/${waNumber(t)}" target="_blank" rel="noopener">${ico("wa")}</a>` : ""}` : "";
  const bloco = (l, val, alerta) => `<div class="nf-item ${alerta ? "alerta" : ""}"><span>${l}</span><b>${nada(val) ? "Não" : esc(val)}</b></div>`;
  const at = atendimentosDe(p);
  modal(`
    <div class="nf-head"><span>${ico("heart")} Ficha de emergência · NFC 3COLINAS</span></div>
    <div class="nf-id">${r.foto ? `<img src="${esc(r.foto)}" alt="">` : `<span class="nfc-foto vazio grande">${esc((p.nome || "?")[0])}</span>`}
      <div><h3>${esc(r.nome || p.nome)}</h3><p class="hint" style="margin:0">${tipoNome(p)}${p.equipe ? " · " + esc(equipeTxt(p)) : ""} · ${idadeDe(r.nascimento) ?? p.idade ?? "—"} anos${r.cidade ? " · " + esc(r.cidade) + (r.uf ? "/" + esc(r.uf) : "") : ""}</p>
        <div class="nf-nums">${nivelBadge(r)}<span class="sangue-big">${esc(r.sangue || "—")}</span><span><b class="num">${esc(r.peso || "—")}</b> kg</span><span><b class="num">${esc(r.altura || "—")}</b> cm</span><span>IMC <b class="num">${imcDe(r) || "—"}</b></span></div></div></div>
    ${imcBarra(r)}
    ${al.length ? `<div class="nf-alertas">${al.map(a => `<span class="chip bad">${esc(a)}</span>`).join("")}</div>` : `<div class="nf-alertas"><span class="chip ok">Nenhum alerta de saúde informado</span></div>`}
    <div class="nf-grid">
      ${bloco("Alergias", r.alergias, !nada(r.alergias))}
      ${bloco("Medicações em uso", r.medicacoes, !nada(r.medicacoes))}
      ${bloco("Comorbidades", sim.join(", ") || "Não", sim.length)}
      ${bloco("Cirurgias", r.cirurgias)}
      ${bloco("Outras informações", r.outras, !nada(r.outras))}
      ${bloco("Plano de saúde", r.plano)}
    </div>
    <h4 class="sf-h sf-red">Contatos de emergência</h4>
    <div class="nf-contatos">
      ${r.emergNome || r.emergTel ? `<div class="nf-ct"><div><b>${esc(r.emergNome || "Contato")}</b><small>${esc(r.emergParent || "")} ${esc(r.emergTel || "")}</small></div><div class="actions">${tel(r.emergTel)}</div></div>` : ""}
      ${r.conjuge || r.conjugeTel ? `<div class="nf-ct"><div><b>${esc(r.conjuge || "Cônjuge")}</b><small>cônjuge ${esc(r.conjugeTel || "")}</small></div><div class="actions">${tel(r.conjugeTel)}</div></div>` : ""}
      ${!(r.emergNome || r.emergTel || r.conjuge || r.conjugeTel) ? `<div class="hint">Nenhum contato informado.</div>` : ""}
    </div>
    ${at.length ? `<h4 class="sf-h">Atendimentos no TOP (${at.length})</h4><div class="nf-ats">${at.map(o => `<div class="nf-at"><div><span class="chip ${(OC_GRAV.find(g => g.v === o.grav) || {}).c || ""}">${(OC_GRAV.find(g => g.v === o.grav) || {}).l || ""}</span> <b>${esc(quando(o.em))}</b>${o.atualizadoPor ? ` <span class="hint">· ${esc(o.atualizadoPor)}</span>` : ""}</div>
      ${o.sinais ? `<div class="nf-sinais">${Object.entries(o.sinais).filter(([, x]) => x).map(([k, x]) => `<span><small>${SINAIS_L[k] || k}</small><b>${esc(x)}</b></span>`).join("")}</div>` : ""}
      <p>${esc(o.desc || "")}</p>${o.prov ? `<p class="hint">Conduta: ${esc(o.prov)}</p>` : ""}${o.foto ? `<img class="nf-atfoto" src="${esc(o.foto)}" alt="Registro fotográfico">` : ""}
      ${o.lat ? `<a class="linkbtn" href="https://www.google.com/maps?q=${o.lat},${o.lng}" target="_blank" rel="noopener">${ico("route")} Ver no mapa (${Number(o.lat).toFixed(4)}, ${Number(o.lng).toFixed(4)})</a>` : ""}</div>`).join("")}</div>` : ""}
    <p class="hint" style="margin:0">Respondida ${esc(quando(d.respondidoEm))}${d.tagEm ? ` · tag gravada ${esc(quando(d.tagEm))}${d.tagPor ? " por " + esc(d.tagPor) : ""}` : " · tag ainda não gravada"}</p>
    <div class="modal-foot"><div>${podeEditar() ? `<button class="btn ghost" type="button" id="nfEditar">Editar ficha</button>` : ""}</div><div class="actions"><button class="btn" type="button" data-close-btn>Fechar</button>${podeEditar() ? `<button class="btn primary" type="button" id="nfAtender">${ico("plus")} Registrar atendimento</button>` : ""}</div></div>`, () => {});
  const ed = $("#nfEditar"); if (ed) ed.onclick = () => saudeForm(p);
  const atb = $("#nfAtender"); if (atb) atb.onclick = () => atendimentoForm(p);
}
const SINAIS_L = { pa: "PA", fc: "FC", fr: "FR", sat: "Sat O₂", temp: "Temp.", glasgow: "Glasgow", hgt: "Glicemia" };
function atendimentoForm(p) {
  let foto = "", pos = null;
  modal(`
    <h3>Atendimento · ${esc(p.nome)}</h3>
    <p class="hint" style="margin:0">Fica na ficha da pessoa e em Ocorrências, e entra no Relatório final.</p>
    <div class="form">
      <div class="field"><label for="at-grav">Gravidade</label>${sel("grav", OC_GRAV, "leve")}</div>
      <div class="field"><label for="at-hakuna">Hakuna / quem atendeu</label><input id="at-hakuna" name="hakuna" value="${esc(ME.adm || "")}"></div>
      <div class="field full"><label for="at-desc">Descrição da ocorrência</label><textarea id="at-desc" name="desc" style="min-height:90px" required placeholder="ex.: dor no tornozelo direito após queda na trilha"></textarea></div>
    </div>
    <h4 class="sf-h">Sinais vitais</h4>
    <div class="at-sinais">${Object.entries(SINAIS_L).map(([k, l]) => `<div class="field"><label for="at-${k}">${l}</label><input id="at-${k}" name="s-${k}" placeholder="${{ pa: "120x80", fc: "81", fr: "16", sat: "97%", temp: "36,5", glasgow: "15", hgt: "98" }[k]}"></div>`).join("")}</div>
    <div class="form">
      <div class="field full"><label for="at-prov">Medicação e conduta</label><textarea id="at-prov" name="prov" style="min-height:70px" placeholder="ex.: dipirona 1g, imobilização com tala, extração"></textarea></div>
    </div>
    <div class="at-extras">
      <label class="btn">${ico("upload")} Registro fotográfico<input type="file" accept="image/*" capture="environment" id="atFoto" hidden></label>
      <button class="btn" type="button" id="atGps">${ico("route")} Marcar localização</button>
    </div>
    <img id="atFotoPrev" class="nf-atfoto" hidden alt=""><span class="hint" id="atGpsTxt"></span>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" id="atVoltar">Voltar</button><button class="btn primary" type="submit">Salvar atendimento</button></div></div>`,
  fd => {
    const desc = String(fd.get("desc") || "").trim(); if (!desc) { $("#at-desc").focus(); return; }
    const sinais = Object.fromEntries(Object.keys(SINAIS_L).map(k => [k, String(fd.get("s-" + k) || "").trim()]));
    closeModal();
    salvarOcorr(ocPref() + Date.now().toString(36), { nome: p.nome, pessoaId: p.id, tipo: "Atendimento médico", medico: true, grav: fd.get("grav"), desc, prov: String(fd.get("prov") || "").trim(),
      hakuna: String(fd.get("hakuna") || "").trim(), sinais, foto, ...(pos ? { lat: pos.lat, lng: pos.lng } : {}), em: new Date().toISOString(), status: "aberta" }, "Atendimento registrado");
    setTimeout(() => { render(); fichaNfc(p); }, 300);
  });
  $("#atVoltar").onclick = () => fichaNfc(p);
  $("#atFoto").addEventListener("change", async e => { const fl = e.target.files[0]; if (!fl) return; try { foto = await reduzirFoto(fl, 900); $("#atFotoPrev").src = foto; $("#atFotoPrev").hidden = false; } catch { toast("Não consegui abrir a foto."); } });
  $("#atGps").onclick = () => {
    const ok = (lat, lng) => { pos = { lat, lng }; $("#atGpsTxt").textContent = `Localização marcada: ${lat.toFixed(5)}, ${lng.toFixed(5)}`; };
    if (!navigator.geolocation) { if (DEMO) ok(-20.2028, -47.2706); else toast("Este aparelho não dá a localização."); return; }
    $("#atGpsTxt").textContent = "Pegando a localização…";
    navigator.geolocation.getCurrentPosition(g => ok(g.coords.latitude, g.coords.longitude), () => { if (DEMO) ok(-20.2028, -47.2706); else $("#atGpsTxt").textContent = "Não consegui a localização. Confira a permissão."; }, { enableHighAccuracy: true, timeout: 10000 });
  };
}
// gravar a tag: Android (Chrome) grava direto pelo navegador; iPhone precisa de um app como o NFC Tools
function tagForm(p) {
  if (!saudeResp(p)) { toast("Essa pessoa ainda não respondeu a ficha de saúde."); return; }
  if (!nfcCodigo()) { toast("Primeiro defina o código da equipe médica."); codigoForm(); return; }
  const pode = "NDEFReader" in window;
  let url = "";
  const marcar = () => { const d = saudeDoc(p) || {}; save(() => api.set("config", saudeId(p), { ...d, token: saudeToken(p), pessoaId: p.id, tagEm: new Date().toISOString(), tagPor: ME.adm || "", tagUrl: url }), "Tag gravada").then(render); };
  modal(`
    <h3>Gravar tag NFC · ${esc(p.nome)}</h3>
    <p class="hint" style="margin:0">A tag leva a ficha de saúde que ${esc(String(p.nome).split(" ")[0])} respondeu no formulário, trancada com o código da equipe médica. Na leitura, a ficha abre direto do que está gravado na tag, mesmo sem internet.</p>
    <div class="nf-link"><code id="tgUrl">Preparando…</code><button class="btn sm" type="button" id="tgCopiar">${ico("paste")} Copiar</button></div>
    <span class="hint" id="tgTam"></span>
    ${pode ? `<div class="banner"><span>${ico("nfc")} Toque em <b>Gravar agora</b> e encoste a tag nas costas do celular.</span></div>`
      : `<div class="banner aviso"><span>Este aparelho não grava NFC pelo navegador (iPhone ou computador). Use o app <b>NFC Tools</b>: Escrever → Adicionar registro → URL → cole o link acima → Escrever. Depois toque em <b>Já gravei</b>.</span></div>`}
    <span class="hint" id="tgTxt"></span>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button>
      ${pode ? `<button class="btn primary" type="button" id="tgGravar" disabled>${ico("nfc")} Gravar agora</button>` : `<button class="btn primary" type="button" id="tgJa" disabled>${ico("check")} Já gravei</button>`}
      ${DEMO ? `<button class="btn" type="button" id="tgSim" disabled>Simular gravação</button>` : ""}</div></div>`, () => {});
  NFC3.selar(tagDados(p), nfcCodigo()).then(lacre => {
    url = tagUrl(p, lacre); const el = $("#tgUrl"); if (!el) return;
    el.textContent = url;
    const { n, tag } = NFC3.tagPara(url);
    $("#tgTam").innerHTML = tag ? `Ocupa ${n} bytes: precisa de tag <b>${tag}</b> ou maior.` : `<b style="color:var(--danger,#ef4444)">Ocupa ${n} bytes, mais do que cabe numa NTAG216.</b> Encurte "Outras informações" ou medicações na ficha.`;
    ["#tgGravar", "#tgJa", "#tgSim"].forEach(s => { const b = $(s); if (b) b.disabled = !tag; });
  }).catch(e => { const el = $("#tgUrl"); if (el) el.textContent = "Não consegui preparar a tag: " + (e.message || e); });
  $("#tgCopiar").onclick = () => url && copiarTexto(url, "Link da tag copiado");
  const ja = $("#tgJa"); if (ja) ja.onclick = () => { closeModal(); marcar(); };
  const sim = $("#tgSim"); if (sim) sim.onclick = () => { closeModal(); marcar(); };
  const gv = $("#tgGravar"); if (gv) gv.onclick = async () => {
    $("#tgTxt").textContent = "Encoste a tag no celular…";
    try { await new NDEFReader().write({ records: [{ recordType: "url", data: url }] }); closeModal(); marcar(); }
    catch (e) { $("#tgTxt").textContent = "Não gravou: " + (e.message || e) + ". Tente de novo."; }
  };
}
// ler a tag dentro do app (Android); no iPhone, encostar na tag já abre o link sozinho
function lerNfc() {
  const pode = "NDEFReader" in window, comTag = S.P.filter(p => (saudeDoc(p) || {}).tagEm);
  modal(`
    <h3>Ler tag NFC</h3>
    <p class="hint" style="margin:0">${pode ? "Encoste a tag nas costas do celular." : "No iPhone, com a tela desbloqueada, é só encostar o celular na tag: aparece um aviso para abrir a ficha. No Android, use o botão abaixo."}</p>
    <span class="hint" id="lnTxt"></span>
    ${DEMO && comTag.length ? `<p class="hint" style="margin:0">Na demonstração, escolha quem "encostou" e veja o que a equipe médica vê ao ler a tag (código da demo: <b>${esc(nfcCodigo())}</b>).</p><div class="field"><label for="lnSim">Simular leitura (demonstração)</label><select id="lnSim">${comTag.map(p => `<option value="${p.id}">${esc(p.nome)}</option>`).join("")}</select></div>` : ""}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button>${DEMO && comTag.length ? `<button class="btn" type="button" id="lnSimBtn">Ficha no app</button><button class="btn primary" type="button" id="lnSimTag">Ler como a equipe médica</button>` : ""}${pode ? `<button class="btn primary" type="button" id="lnLer">${ico("nfc")} Ler agora</button>` : ""}</div></div>`, () => {});
  const sb = $("#lnSimBtn"); if (sb) sb.onclick = () => fichaNfc(S.P.find(p => p.id === $("#lnSim").value));
  const st = $("#lnSimTag"); if (st) st.onclick = () => { const p = S.P.find(x => x.id === $("#lnSim").value), u = (saudeDoc(p) || {}).tagUrl;
    if (u) window.open(u, "_blank", "noopener"); else NFC3.selar(tagDados(p), nfcCodigo()).then(l => window.open(tagUrl(p, l), "_blank", "noopener")); };
  const lb = $("#lnLer"); if (lb) lb.onclick = async () => {
    try { const r = new NDEFReader(); await r.scan(); $("#lnTxt").textContent = "Aguardando a tag…";
      r.onreading = ev => { const rec = [...ev.message.records].find(x => x.recordType === "url"); const url = rec ? new TextDecoder().decode(rec.data) : ""; abrirPorToken((/[?&](?:nfc|t)=([\w-]+)/.exec(url) || [])[1]); };
    } catch (e) { $("#lnTxt").textContent = "Não consegui ler: " + (e.message || e); }
  };
}
function abrirPorToken(t) {
  if (!t) { toast("Essa tag não é do NFC 3COLINAS."); return; }
  const p = S.P.find(x => saudeToken(x) === t);
  if (!p) { toast("Não achei essa pessoa neste TOP."); return; }
  fichaNfc(p);
}
function nfcSequencia() {
  const fila = S.P.filter(p => !cancelado(p) && !saudeResp(p) && waNumber(p.telefone));
  if (!fila.length) { toast("Todo mundo com telefone já respondeu."); return; }
  let i = 0;
  const passo = () => {
    if (i >= fila.length) { closeModal(); toast(`Link enviado para ${fila.length} pessoa(s)`); return; }
    const p = fila[i];
    modal(`
      <h3>Enviar link ${i + 1} de ${fila.length}</h3>
      <div class="bar"><i style="width:${pct(i, fila.length)}%"></i></div>
      <b style="font-size:18px">${esc(p.nome)}</b><small class="hint">${esc(p.telefone || "")}</small>
      <div class="field"><label for="f-txt">Mensagem</label><textarea id="f-txt" style="min-height:150px">${esc(textoLinkSaude(p))}</textarea></div>
      <div class="modal-foot"><div><button class="btn ghost" type="button" data-close-btn>Parar</button></div>
        <div class="actions"><button class="btn" type="button" id="seqPular">Pular</button><a class="btn primary" id="seqWa" href="#" target="_blank" rel="noopener">${ico("wa")} Abrir WhatsApp</a></div></div>`, () => {});
    const wa = $("#seqWa"), atual = () => { wa.href = waCobrar(p, $("#f-txt").value); };
    atual(); $("#f-txt").addEventListener("input", atual);
    wa.addEventListener("click", () => { linkEnviado(p); i++; setTimeout(passo, 400); });
    $("#seqPular").onclick = () => { i++; passo(); };
  };
  passo();
}
function linkEnviado(p) { if (!podeEditar()) return; const d = saudeDoc(p) || {}; api.set("config", saudeId(p), { ...d, token: saudeToken(p), pessoaId: p.id, linkEm: new Date().toISOString(), top: curTopId() }).then(render).catch(e => console.error(e)); }
var nfcPendente = (new URLSearchParams(location.search).get("nfc") || "");

/* ---------- Campo (só na demo por enquanto): o que a equipe usa com o TOP rodando ----------
   Chamada por família (config chamada-<top>-<id>), mural rápido (config mural-<top>), escala de turnos (config turnos-<top>),
   entregas no camp (config entregas-<top>), clima na pista (Open-Meteo, sem chave) e ADMs no mapa do Ao vivo (config loc-<top>-<membro>). */
const CAMPO = () => false;   // tirado da demo em 02/11/2026 a pedido do Vinicius (código guardado)
const COM = () => true;   // aba Comunicação: liberada no app real em 31/10/2026 (o resto do Campo segue só na demo)
const cfgDe = id => (S.cfgDocs || {})[id] || null;
const campoId = k => `${k}-${curTopId()}`;
const hmDe = iso => iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
const haQuanto = iso => { const m = Math.round((Date.now() - new Date(iso)) / 6e4); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`; };
const famTxt = f => "Família " + String(f).padStart(2, "0");
// família na frente do nome (senderistas) e importação das famílias por planilha: só na DEMO até ele mandar jogar no app real
const FAM_IMP = () => true;   // app real desde 01/11/2026
const famPre = p => FAM_IMP() && p && p.tipo !== "legendario" && p.familia ? `<span class="fam-pre num" title="${famTxt(p.familia)}">F${String(p.familia).padStart(2, "0")}</span> ` : "";
const famDe = f => S.P.filter(p => p.tipo !== "legendario" && !cancelado(p) && Number(p.familia) === Number(f)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
const pontosCampo = () => { const P = pistaMapa(); return (P && P.pontos || []).map(p => p.n).filter(Boolean); };
// chamadas
const chamadas = () => Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(`chamada-${curTopId()}-`)).map(([id, d]) => ({ id, ...d })).sort((a, b) => (b.em || "").localeCompare(a.em || ""));
const ultimaChamada = f => chamadas().find(c => Number(c.familia) === Number(f));
function vCampo() {
  const aba = S.campoAba || "chamada";
  const ab = (v, l, n) => `<button type="button" data-campo-aba="${v}" aria-pressed="${aba === v}">${l}${n ? ` <span class="num" style="opacity:.75">${n}</span>` : ""}</button>`;
  const mural = (cfgDe(campoId("mural")) || {}).msgs || [];
  const novas = mural.filter(m => Date.now() - new Date(m.em) < 30 * 6e4).length;
  return `
  <div class="head"><div><h2>Campo</h2><p>O que a equipe usa com o TOP rodando: chamada das famílias em cada ponto, escala de turnos e entregas no camp. Funciona sem internet: o que marcar aqui vai quando o sinal voltar.</p></div></div>
  <div class="seg campo-abas">${ab("chamada", "Chamada")}${ab("turnos", "Turnos")}${ab("entregas", "Entregas")}</div>
  ${aba === "turnos" ? vTurnos() : aba === "entregas" ? vEntregas() : vChamada()}`;
}
function vChamada() {
  const fams = Array.from({ length: 12 }, (_, i) => i + 1).filter(f => famDe(f).length), ed = podeEditar();
  const cs = chamadas(), falta = cs.filter(c => (c.faltam || []).length && !c.resolvida);
  return `
  <div class="kpis">
    <div class="kpi"><span class="lbl">Chamadas feitas</span><span class="val num">${cs.length}</span><span class="sub">neste TOP</span></div>
    <div class="kpi ${falta.length ? "alert" : ""}"><span class="lbl">Com falta</span><span class="val num">${falta.length}</span><span class="sub">${falta.length ? "precisam de atenção" : "todas completas"}</span></div>
  </div>
  <section class="panel"><h3>Famílias <small>toque para fazer a chamada</small></h3>
    <div class="cham-grid">${fams.map(f => { const u = ultimaChamada(f), m = famDe(f), nf = u ? (u.faltam || []).length : 0;
      return `<button type="button" class="cham-fam ${!u ? "" : nf && !u.resolvida ? "bad" : "ok"}" ${ed ? `data-chamada="${f}"` : "disabled"}>
        <b>${famTxt(f)}</b><span>${m.length} pessoa(s)</span>
        <small>${!u ? "sem chamada ainda" : nf && !u.resolvida ? `faltou ${nf} · ${esc(u.ponto || "")} · ${hmDe(u.em)}` : `completa · ${esc(u.ponto || "")} · ${hmDe(u.em)}`}</small></button>`; }).join("") || `<div class="empty">Nenhum senderista com família ainda. Defina a família no cadastro de cada um.</div>`}</div></section>
  <section class="panel"><h3>Últimas chamadas <small>${cs.length}</small></h3>
    <div class="list">${cs.slice(0, 12).map(c => { const nf = (c.faltam || []).length;
      return `<div class="li"><span class="grow"><b>${famTxt(c.familia)}</b> · ${esc(c.ponto || "")} <span class="hint">· ${hmDe(c.em)} por ${esc(c.por || "ADM")}</span>
        ${nf ? `<br><span class="bad-text">Faltou: ${(c.faltam || []).map(id => esc((S.P.find(p => p.id === id) || {}).nome || "?")).join(", ")}</span>` : ""}</span>
        ${nf ? (c.resolvida ? '<span class="chip ok">Encontrado</span>' : ed ? `<button class="btn sm" type="button" data-chamada-ok="${esc(c.id)}">${ico("check")} Encontrado</button>` : '<span class="chip bad">Falta</span>') : '<span class="chip ok">Completa</span>'}</div>`; }).join("") || `<div class="empty">Nenhuma chamada ainda.</div>`}</div></section>`;
}
function chamadaForm(f) {
  const m = famDe(f), pts = pontosCampo(), u = ultimaChamada(f);
  modal(`
    <h3>Chamada · ${famTxt(f)}</h3>
    <div class="field"><label for="f-ponto">Onde</label><input id="f-ponto" name="ponto" list="pontosCampo" value="${esc(u && u.ponto || "")}" placeholder="ex.: Camp D1, Segunda Revista" required>
      <datalist id="pontosCampo">${pts.map(p => `<option value="${esc(p)}">`).join("")}</datalist></div>
    <div class="cham-topo"><span class="hint">Toque em quem está presente.</span><button class="btn sm" type="button" id="chTodos">${ico("check")} Todos presentes</button></div>
    <div class="cham-lista">${m.map(p => `<label class="cham-p"><input type="checkbox" name="pres" value="${esc(p.id)}"><span class="cham-box">${ico("check")}</span><span class="grow">${esc(p.nome)}${is40(p) ? ' <span class="tag">+40</span>' : ""}</span></label>`).join("")}</div>
    <p class="hint" id="chResumo" style="margin:0"></p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar chamada</button></div></div>`, fd => {
    const ponto = String(fd.get("ponto") || "").trim(); if (!ponto) { toast("Diga onde a chamada foi feita."); return; }
    const pres = fd.getAll("pres"), faltam = m.filter(p => !pres.includes(p.id)).map(p => p.id), em = new Date().toISOString();
    closeModal();
    save(() => api.set("config", `chamada-${curTopId()}-${Date.now().toString(36)}`, { familia: f, ponto, presentes: pres, faltam, por: ME.adm || "", em, top: curTopId() }),
      faltam.length ? `${famTxt(f)}: faltou ${faltam.length}. A equipe foi avisada.` : `${famTxt(f)} completa`).then(render);
    if (faltam.length) {
      const nomes = faltam.map(id => (S.P.find(p => p.id === id) || {}).nome).filter(Boolean);
      salvarOcorr(ocPref() + Date.now().toString(36), { tipo: "Falta na chamada", grav: "grave", pessoaId: faltam[0], nome: nomes.join(", "), local: ponto, em, status: "aberta",
        desc: `Chamada da ${famTxt(f)} em ${ponto}: não responderam ${nomes.join(", ")}.`, prov: "", atendido: "", por: ME.adm || "" }, "");
      muralPostar(`🚨 ${famTxt(f)} em ${ponto}: faltou ${nomes.join(", ")}`, "alerta");
    }
  });
  const atual = () => { const n = $("#mform").querySelectorAll("[name=pres]:checked").length; $("#chResumo").innerHTML = `<b>${n}</b> de ${m.length} presentes${n < m.length ? ` · <span class="bad-text">faltam ${m.length - n}</span>` : ""}`; };
  $("#mform").addEventListener("change", atual); atual();
  $("#chTodos").onclick = () => { $("#mform").querySelectorAll("[name=pres]").forEach(i => { i.checked = true; }); atual(); };
}
// mural
const MURAL_RAPIDO = [["🚌", "Ônibus chegou"], ["⏱️", "Atraso de 20 min"], ["🆘", "Preciso de apoio aqui"], ["✅", "Corrente saiu"], ["🍽️", "Refeição pronta"], ["💧", "Faltando água"]];
function muralPostar(txt, tipo) {
  const id = campoId("mural"), M = cfgDe(id) || {}, msgs = [{ id: Date.now().toString(36), txt, tipo: tipo || "", por: ME.adm || "ADM", em: new Date().toISOString() }, ...(M.msgs || [])].slice(0, 80);
  save(() => api.set("config", id, { msgs, top: curTopId() }), "").then(render);
  if (DEMO) novaNotif({ id: "mural-" + msgs[0].id, em: msgs[0].em, ator: ME.id, ator_nome: ME.adm, publico: "todos", col: "config", doc_id: id, acao: "mural", nome: txt });
}
function vMural(msgs) {
  const ed = podeEditar();
  return `
  ${ed ? `<section class="panel"><h3>Avisar a equipe <small>chega para todos os ADMs</small></h3>
    <div class="mural-rapido">${MURAL_RAPIDO.map(([e, t]) => `<button type="button" class="btn" data-mural="${esc(e + " " + t)}"><span aria-hidden="true">${e}</span> ${esc(t)}</button>`).join("")}</div>
    <div class="mural-livre"><input id="muralTxt" placeholder="Ou escreva um recado curto…" maxlength="140" aria-label="Recado"><button class="btn primary" type="button" data-act="mural-enviar">Enviar</button></div></section>` : ""}
  <section class="panel"><h3>Recados <small>${msgs.length}</small></h3>
    <div class="mural-lista">${msgs.map(m => `<div class="mural-msg ${m.tipo === "alerta" ? "alerta" : ""} ${Date.now() - new Date(m.em) < 10 * 6e4 ? "novo" : ""}"><p>${esc(m.txt)}</p><small>${esc(m.por)} · ${hmDe(m.em)} · ${haQuanto(m.em)}</small></div>`).join("") || `<div class="empty">Nenhum recado ainda.</div>`}</div></section>`;
}
// turnos
const FUNC_TURNO = ["Vigília (Segurança)", "Apoio na pista", "Camp", "Carro de apoio", "Cozinha", "Equipe médica", "Base"];
const turnos = () => ((cfgDe(campoId("turnos")) || {}).lista || []).slice().sort((a, b) => (a.ini || "").localeCompare(b.ini || ""));
const turnoAgora = t => { const n = Date.now(); return new Date(t.ini) <= n && n < new Date(t.fim); };
const meusTurnos = () => turnos().filter(t => (t.adms || []).some(n => norm(n).split(" ")[0] === norm(ME.adm || "").split(" ")[0]));
function vTurnos() {
  const L = turnos(), ed = podeEditar(), agora = L.filter(turnoAgora), meu = meusTurnos().find(t => new Date(t.fim) > Date.now());
  const porDia = {}; L.forEach(t => { const d = new Date(t.ini).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }); (porDia[d] = porDia[d] || []).push(t); });
  return `
  <div class="kpis">
    <div class="kpi"><span class="lbl">De turno agora</span><span class="val num">${agora.reduce((a, t) => a + (t.adms || []).length, 0)}</span><span class="sub">${agora.map(t => esc(t.funcao)).join(", ") || "ninguém"}</span></div>
    <div class="kpi ${meu && !turnoAgora(meu) && new Date(meu.ini) - Date.now() < 3600e3 ? "alert" : ""}"><span class="lbl">Seu próximo turno</span><span class="val" style="font-size:22px">${meu ? (turnoAgora(meu) ? "Agora" : hmDe(meu.ini)) : "—"}</span><span class="sub">${meu ? esc(meu.funcao) + " até " + hmDe(meu.fim) : "sem turno marcado"}</span></div>
  </div>
  ${ed ? `<div class="actions" style="margin:4px 0 12px"><button class="btn primary" type="button" data-turno="">${ico("plus")} Novo turno</button></div>` : ""}
  ${Object.entries(porDia).map(([d, ts]) => `<section class="panel"><h3>${esc(d)} <small>${ts.length} turno(s)</small></h3><div class="list">${ts.map(t => `
    <div class="li turno ${turnoAgora(t) ? "agora" : new Date(t.fim) < Date.now() ? "passou" : ""}"><span class="turno-h num">${hmDe(t.ini)}<br><small>${hmDe(t.fim)}</small></span>
      <span class="grow"><b>${esc(t.funcao)}</b>${turnoAgora(t) ? ' <span class="chip ok">agora</span>' : ""}<br><span class="hint">${(t.adms || []).map(esc).join(", ") || "sem ninguém"}</span></span>
      ${ed ? `<button class="icon-btn" type="button" data-turno="${esc(t.id)}" aria-label="Editar turno">${ico("edit")}</button>` : ""}</div>`).join("")}</div></section>`).join("") || `<section class="panel"><div class="empty">Nenhum turno ainda. Monte a escala de vigília, apoio e camp.</div></section>`}`;
}
function turnoForm(id) {
  const L = turnos(), t = L.find(x => x.id === id) || {};
  const seg = S.P.filter(p => p.tipo === "legendario" && !cancelado(p) && /segur/i.test(p.equipe || "")).map(p => p.nome).sort();
  const adms = (S.equipe || []).map(e => e.nome).filter(Boolean).sort(), outros = (t.adms || []).filter(n => !seg.includes(n) && !adms.includes(n));
  const grupo = (tit, ns, vazio) => `<div class="turno-grupo"><small>${tit}</small><div class="turno-quem">${ns.map(n => `<label class="chk"><input type="checkbox" name="adm" value="${esc(n)}" ${(t.adms || []).includes(n) ? "checked" : ""}> ${esc(n)}</label>`).join("") || `<span class="hint">${vazio}</span>`}</div></div>`;
  const loc = iso => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  modal(`
    <h3>${t.id ? "Editar turno" : "Novo turno"}</h3>
    <div class="form">
      <div class="field full"><label for="f-tf">Função</label><input id="f-tf" name="funcao" list="funcTurno" value="${esc(t.funcao || "")}" required><datalist id="funcTurno">${FUNC_TURNO.map(f => `<option value="${esc(f)}">`).join("")}</datalist></div>
      <div class="field"><label for="f-ti">Começa</label><input id="f-ti" name="ini" type="datetime-local" value="${loc(t.ini)}" required></div>
      <div class="field"><label for="f-tm">Termina</label><input id="f-tm" name="fim" type="datetime-local" value="${loc(t.fim)}" required></div>
      <div class="field full"><span class="lab">Quem</span>
        ${grupo("Equipe de Segurança (legendários) · vigília da noite", seg, "Nenhum legendário na equipe Segurança ainda.")}${grupo("ADMs", adms, "")}${outros.length ? grupo("Outros", outros, "") : ""}</div>
    </div>
    <div class="modal-foot"><div>${t.id ? `<button class="btn danger" type="button" id="tDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const ini = fd.get("ini"), fim = fd.get("fim"); if (!ini || !fim || fim <= ini) { toast("Confira o horário de início e fim."); return; }
    const novo = { id: t.id || Date.now().toString(36), funcao: String(fd.get("funcao") || "").trim(), ini: new Date(ini).toISOString(), fim: new Date(fim).toISOString(), adms: fd.getAll("adm") };
    closeModal(); save(() => api.set("config", campoId("turnos"), { lista: [...L.filter(x => x.id !== novo.id), novo], top: curTopId() }), "Turno salvo").then(render);
  });
  const del = $("#tDel"); if (del) del.onclick = () => { closeModal(); save(() => api.set("config", campoId("turnos"), { lista: L.filter(x => x.id !== t.id), top: curTopId() }), "Turno excluído").then(render); };
}
// aviso no topo: seu turno começa em até 30 min
function avisoTurno() {
  if (!CAMPO()) return "";
  const t = meusTurnos().find(x => { const d = new Date(x.ini) - Date.now(); return d > 0 && d <= 30 * 6e4; });
  return t ? `<div class="banner aviso"><span>${ico("clock")} <b>Seu turno começa às ${hmDe(t.ini)}:</b> ${esc(t.funcao)} até ${hmDe(t.fim)}.</span><button class="btn" type="button" data-go="campo" data-campo-ir="turnos">Ver escala</button></div>` : "";
}
// entregas
const ENT_ITENS = [["agua", "💧 Água"], ["mre", "🥫 MRE"], ["gelo", "🧊 Gelo"], ["equip", "🎒 Equipamento"]];
function vEntregas() {
  const plano = cronoPlano(), dias = plano.map(d => ({ id: d.id, nome: d.nome })).slice(0, 4);
  const dia = S.entDia || (dias[0] || {}).id || "d1", E = (cfgDe(campoId("entregas")) || {}).reg || {}, ed = podeEditar();
  const fams = Array.from({ length: 12 }, (_, i) => i + 1).filter(f => famDe(f).length);
  const k = (f, it) => `${dia}|${f}|${it}`, tot = it => fams.filter(f => E[k(f, it)]).length;
  return `
  <div class="seg" style="margin-bottom:10px">${dias.map(d => `<button type="button" data-ent-dia="${esc(d.id)}" aria-pressed="${d.id === dia}">${esc(d.nome)}</button>`).join("")}</div>
  <div class="kpis">${ENT_ITENS.map(([it, l]) => `<div class="kpi"><span class="lbl">${l}</span><span class="val num">${tot(it)}<small style="font-size:.5em;opacity:.7"> / ${fams.length}</small></span><span class="sub">famílias receberam</span></div>`).join("")}</div>
  <section class="panel"><h3>Entregas por família <small>toque para marcar entregue</small></h3>
    <div class="ent-tab" style="--n:${ENT_ITENS.length}"><span></span>${ENT_ITENS.map(([, l]) => `<b>${l}</b>`).join("")}
    ${fams.map(f => `<span class="ent-fam">${famTxt(f)}</span>${ENT_ITENS.map(([it, l]) => { const r = E[k(f, it)];
      return `<button type="button" class="ent-c ${r ? "on" : ""}" ${ed ? `data-ent="${esc(k(f, it))}"` : "disabled"} aria-label="${famTxt(f)} ${l}: ${r ? "entregue" : "não entregue"}" title="${r ? `${esc(r.por)} · ${hmDe(r.em)}` : ""}">${r ? ico("check") + `<small>${hmDe(r.em)}</small>` : ""}</button>`; }).join("")}`).join("")}</div></section>`;
}
function entregaMarcar(chave) {
  const id = campoId("entregas"), reg = { ...((cfgDe(id) || {}).reg || {}) };
  if (reg[chave]) delete reg[chave]; else reg[chave] = { por: ME.adm || "", em: new Date().toISOString() };
  save(() => api.set("config", id, { reg, top: curTopId() }), "").then(render);
}
// clima na pista (Open-Meteo, grátis e sem chave); guarda a última previsão para ver sem internet
const CLIMA_COD = c => c >= 95 ? ["⛈️", "Tempestade"] : c >= 80 ? ["🌧️", "Pancadas de chuva"] : c >= 61 ? ["🌧️", "Chuva"] : c >= 51 ? ["🌦️", "Garoa"] : c >= 45 ? ["🌫️", "Neblina"] : c >= 3 ? ["☁️", "Nublado"] : c >= 1 ? ["⛅", "Parcialmente nublado"] : ["☀️", "Céu limpo"];
let climaBusca = 0;
function climaDados() {
  let c = null; try { c = JSON.parse(store.get("adm3-clima") || "null"); } catch {}
  if ((!c || Date.now() - c.t > 30 * 6e4) && Date.now() - climaBusca > 60e3 && navigator.onLine !== false) {
    climaBusca = Date.now();
    const P = pistaMapa(), p0 = (P && P.pontos || [])[0] || { lat: -20.2028, lng: -47.2706 };
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p0.lat}&longitude=${p0.lng}&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=sunrise,sunset&timezone=America%2FSao_Paulo&forecast_days=3`)
      .then(r => r.json()).then(d => { if (!d.hourly) return; store.set("adm3-clima", JSON.stringify({ t: Date.now(), d })); if (S.view === "aovivo" || S.view === "painel") render(); }).catch(() => {});
  }
  return c;
}
const CLIMA = () => true;   // clima na pista (Ao vivo) e previsão do TOP no Dashboard: app real desde 01/11/2026
function climaCard() {
  if (!CAMPO() && !CLIMA()) return "";
  const c = climaDados(); if (!c) return `<section class="panel clima"><h3>Clima na pista</h3><div class="hint">Buscando a previsão…</div></section>`;
  const H = c.d.hourly, agora = Date.now(), idx = H.time.findIndex(t => new Date(t) >= agora - 36e5), prox = H.time.slice(Math.max(0, idx), Math.max(0, idx) + 12).map((t, k) => { const i = Math.max(0, idx) + k;
    return { h: t.slice(11, 16), temp: Math.round(H.temperature_2m[i]), chuva: H.precipitation_probability[i] || 0, vento: Math.round(H.wind_speed_10m[i]), cod: H.weather_code[i] }; });
  const cur = c.d.current || {}, [ic, desc] = CLIMA_COD(cur.weather_code || 0);
  const alertas = [];
  const chuvaMax = prox.reduce((a, x) => x.chuva > a.chuva ? x : a, { chuva: 0 }), quente = prox.find(x => x.temp >= 32), vento = prox.find(x => x.vento >= 40);
  if (chuvaMax.chuva >= 60) alertas.push(["bad", `Chuva provável às ${chuvaMax.h} (${chuvaMax.chuva}%)`]);
  if (quente) alertas.push(["wait", `Calor de ${quente.temp}° às ${quente.h}: reforçar água`]);
  if (vento) alertas.push(["wait", `Vento forte (${vento.vento} km/h) às ${vento.h}`]);
  return `<section class="panel clima"><h3>Clima na pista <small>${Date.now() - c.t > 2 * 3600e3 ? "previsão de " + haQuanto(new Date(c.t).toISOString()) : "atualizado " + haQuanto(new Date(c.t).toISOString())}</small></h3>
    <div class="clima-agora"><span class="clima-ic">${ic}</span><b class="num">${Math.round(cur.temperature_2m ?? prox[0].temp)}°</b><div><b>${desc}</b><small>vento ${Math.round(cur.wind_speed_10m ?? 0)} km/h</small></div></div>
    ${alertas.length ? `<div class="clima-alertas">${alertas.map(([c, t]) => `<span class="chip ${c}">${esc(t)}</span>`).join("")}</div>` : `<div class="clima-alertas"><span class="chip ok">Sem alerta nas próximas 12 h</span></div>`}
    <div class="clima-horas">${prox.map(x => `<div><small>${x.h}</small><span>${CLIMA_COD(x.cod)[0]}</span><b class="num">${x.temp}°</b><i class="${x.chuva >= 60 ? "bad-text" : ""}">${x.chuva}%</i></div>`).join("")}</div></section>`;
}
/* Previsão do tempo para os dias do TOP (Dashboard). Open-Meteo prevê até 16 dias; antes disso mostra como foi no ano passado nas mesmas datas.
   Busca de novo todo dia (localStorage adm3-tempo-top) e guarda a previsão de ontem para mostrar o que mudou. */
let tempoBusca = 0;
const tempoLocal = () => { const P = pistaMapa(), p0 = (P && P.pontos || [])[0]; return p0 || { lat: -20.2028, lng: -47.2706 }; };
function tempoTopDados(td) {
  let c = null; try { c = JSON.parse(store.get("adm3-tempo-top") || "null"); } catch {}
  const chave = `${curTopId()}|${td.inicio}|${td.fim || td.inicio}`, hj = hojeISO();
  if ((!c || c.chave !== chave || c.dia !== hj) && Date.now() - tempoBusca > 60e3 && navigator.onLine !== false) {
    tempoBusca = Date.now(); const L = tempoLocal(), fim = td.fim || td.inicio, dias = difDias(hj, td.inicio);
    const ano = d => { const x = new Date(d + "T12:00"); x.setFullYear(x.getFullYear() - 1); return x.toISOString().slice(0, 10); };
    const base = `latitude=${L.lat}&longitude=${L.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=America%2FSao_Paulo`;
    const prev = dias <= 15 && difDias(hj, fim) >= 0 ? fetch(`https://api.open-meteo.com/v1/forecast?${base},precipitation_probability_max&start_date=${td.inicio < hj ? hj : td.inicio}&end_date=${fim}`).then(r => r.json()).catch(() => null) : Promise.resolve(null);
    const hist = fetch(`https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${ano(td.inicio)}&end_date=${ano(fim)}`).then(r => r.json()).catch(() => null);
    Promise.all([prev, hist]).then(([p, h]) => { if (!(p && p.daily) && !(h && h.daily)) return;
      const ant = c && c.chave === chave && c.dia !== hj ? c.prev : (c && c.ant) || null;
      store.set("adm3-tempo-top", JSON.stringify({ chave, dia: hj, t: Date.now(), prev: p && p.daily ? p.daily : null, hist: h && h.daily ? h.daily : null, ant }));
      if (S.view === "painel") render(); });
  }
  return c && c.chave === chave ? c : null;
}
function tempoTopCard() {
  if (!CLIMA()) return ""; const td = topDoc() || {}; if (!td.inicio || td.status === "finalizado" || difDias(hojeISO(), td.fim || td.inicio) < 0) return "";
  const c = tempoTopDados(td), faltam = difDias(hojeISO(), td.inicio), wd = d => new Date(d + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  const cab = `<h3>Tempo nos dias do TOP <small>${c ? "atualizado " + haQuanto(new Date(c.t).toISOString()) : "buscando…"}</small></h3>`;
  if (!c) return `<section class="panel tempo-top">${cab}<div class="hint">Buscando a previsão…</div></section>`;
  const linha = (D, i, prob) => { const [ic, desc] = CLIMA_COD(D.weather_code[i] || 0), ch = prob ? D.precipitation_probability_max[i] : null, mm = D.precipitation_sum[i];
    return `<div class="tt-dia"><small>${wd(D.time[i])}</small><span class="tt-ic">${ic}</span><b class="num">${Math.round(D.temperature_2m_max[i])}° <i>${Math.round(D.temperature_2m_min[i])}°</i></b><span class="${(ch ?? 0) >= 60 || mm >= 10 ? "bad-text" : "hint"}">${ch != null ? `chuva ${ch}%` : `${(mm || 0).toFixed(0)} mm`}</span><small class="hint">${desc}</small></div>`; };
  const P = c.prev, H = c.hist, mud = [];
  if (P && c.ant) P.time.forEach((d, i) => { const j = c.ant.time.indexOf(d); if (j < 0) return; const a = c.ant.precipitation_probability_max[j], b = P.precipitation_probability_max[i], ta = Math.round(c.ant.temperature_2m_max[j]), tb = Math.round(P.temperature_2m_max[i]);
    if (Math.abs(b - a) >= 20) mud.push(`${wd(d)}: chuva ${a}% → ${b}%`); if (Math.abs(tb - ta) >= 3) mud.push(`${wd(d)}: máxima ${ta}° → ${tb}°`); });
  const alerta = P ? (() => { const x = []; P.time.forEach((d, i) => { if (P.precipitation_probability_max[i] >= 60) x.push(["bad", `Chuva provável ${wd(d)} (${P.precipitation_probability_max[i]}%)`]); if (P.temperature_2m_max[i] >= 32) x.push(["wait", `Calor de ${Math.round(P.temperature_2m_max[i])}° ${wd(d)}: reforçar água`]); if (P.temperature_2m_min[i] <= 10) x.push(["wait", `Frio de ${Math.round(P.temperature_2m_min[i])}° na madrugada ${wd(d)}: avisar agasalho`]); }); return x; })() : [];
  return `<section class="panel tempo-top">${cab}
    ${P ? `<div class="tt-dias">${P.time.map((_, i) => linha(P, i, true)).join("")}</div>
      <div class="clima-alertas">${alerta.length ? alerta.map(([k, t]) => `<span class="chip ${k}">${esc(t)}</span>`).join("") : `<span class="chip ok">Sem alerta de chuva forte, calor ou frio</span>`}</div>
      ${mud.length ? `<p class="hint" style="margin:8px 0 0"><b>Mudou desde ontem:</b> ${esc(mud.join(" · "))}</p>` : ""}`
    : `<p class="hint" style="margin:0 0 8px">Faltam ${faltam} dias. A previsão para os dias do TOP aparece a partir de <b>${fmtDate(somaDias(td.inicio, -15))}</b> e atualiza todo dia.${H ? " Enquanto isso, veja como foi nas mesmas datas no ano passado:" : ""}</p>
      ${H ? `<div class="tt-dias tt-hist">${H.time.map((_, i) => linha(H, i, false)).join("")}</div>` : ""}`}</section>`;
}
// ADMs no mapa: cada um liga "Mostrar minha localização" e o app manda a posição a cada minuto
const locsEquipe = () => Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(`loc-${curTopId()}-`)).map(([id, d]) => ({ id, ...d })).filter(l => Date.now() - new Date(l.em) < 3 * 3600e3);
let locWatch = null, locUltimo = 0;
function locLigar(ligar) {
  store.set("adm3-loc", ligar ? "1" : "");
  if (locWatch != null) { try { navigator.geolocation.clearWatch(locWatch); } catch {} locWatch = null; }
  if (!ligar) { toast("Você parou de aparecer no mapa."); render(); return; }
  const enviar = (lat, lng) => { if (Date.now() - locUltimo < 55e3) return; locUltimo = Date.now();
    api.set("config", `loc-${curTopId()}-${ME.id || "eu"}`, { lat: +lat.toFixed(5), lng: +lng.toFixed(5), nome: ME.adm || "ADM", em: new Date().toISOString(), top: curTopId() }).then(() => { if (S.view === "aovivo") render(); }).catch(() => {}); };
  if (!navigator.geolocation) { if (DEMO) enviar(-20.2047, -47.2712); else toast("Este aparelho não dá a localização."); return; }
  locWatch = navigator.geolocation.watchPosition(g => enviar(g.coords.latitude, g.coords.longitude), () => { if (DEMO) enviar(-20.2047, -47.2712); else toast("Libere a localização para aparecer no mapa."); }, { enableHighAccuracy: true, maximumAge: 30e3 });
  toast("Pronto: a equipe vê você no mapa do Ao vivo.");
  render();
}
function equipeMapaBarra() {
  if (!CAMPO()) return "";
  const L = locsEquipe(), on = store.get("adm3-loc") === "1";
  return `<div class="av-equipe"><span>${ico("users")} <b>${L.length}</b> da equipe no mapa${L.length ? ": " + L.map(l => `${esc(l.nome.split(" ")[0])} <small>${haQuanto(l.em)}</small>`).join(" · ") : ""}</span>
    <button class="btn sm ${on ? "" : "primary"}" type="button" data-act="loc-${on ? "desligar" : "ligar"}">${on ? "Parar de mostrar" : "Mostrar minha localização"}</button></div>`;
}
function equipeNoMapa(L, map) {
  if (!CAMPO()) return;
  locsEquipe().forEach(l => { const ini = (l.nome || "?").split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase(), carro = /carro|apoio/i.test(l.nome);
    L.marker([l.lat, l.lng], { icon: L.divIcon({ className: "adm-pin" + (carro ? " carro" : ""), html: `<i>${carro ? "🚙" : esc(ini)}</i>`, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 900 })
      .addTo(map).bindTooltip(`${esc(l.nome)} · ${haQuanto(l.em)}`, { direction: "top" }); });
}
if (CAMPO() && store.get("adm3-loc") === "1") setTimeout(() => { if (ME.acesso) locLigar(true); }, 4000);

/* ---------- Comunicação (só na demo): Agora (mural com fixar e "vi"), Lembretes com data e Aprendizados do TOP ----------
   config mural-<top> {msgs}, comvisto-<top>-<membro> {ate}, lembretes {lista}, aprend-<top> {itens, revisados}. */
const comVistoId = (m = ME.id) => `comvisto-${curTopId()}-${m || "eu"}`;
const muralMsgs = () => (cfgDe(campoId("mural")) || {}).msgs || [];
const comViAte = (m = ME.id) => (cfgDe(comVistoId(m)) || {}).ate || "";
const comNaoLidas = () => { if (!COM() || !ME.acesso) return 0; const ate = comViAte(); return muralMsgs().filter(m => m.por !== ME.adm && (m.em || "") > ate).length; };
const admsAtivos = () => (S.equipe || []).filter(m => m.ativo !== false);
function comEditar(mid) {
  const id = campoId("mural"), M = cfgDe(id) || {}, m = (M.msgs || []).find(x => x.id === mid); if (!m) return;
  modal(`<h3>Editar recado</h3>
    <div class="field"><textarea id="f-mt" name="txt" maxlength="200" style="min-height:100px" required>${esc(m.txt)}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const txt = String(fd.get("txt") || "").trim(); if (!txt) { toast("Escreva o recado."); return; }
    closeModal(); const A = cfgDe(id) || {};
    save(() => api.set("config", id, { ...A, msgs: (A.msgs || []).map(x => x.id === mid ? { ...x, txt, editadoEm: new Date().toISOString(), editadoPor: ME.adm || "" } : x) }), "Recado editado").then(render);
  });
}
function comMarcarVi(ate) {
  const atual = comViAte(); if (atual && atual >= ate) return;
  save(() => api.set("config", comVistoId(), { ate, nome: ME.adm || "", top: curTopId() }), "").then(render);
}
function vComunicacao() {
  const aba = S.comAba || "agora", nl = comNaoLidas(), lh = lembretesHoje().length, rev = aprendPraRevisar().length;
  const ab = (v, l, n) => `<button type="button" data-com-aba="${v}" aria-pressed="${aba === v}">${l}${n ? ` <span class="com-n num">${n}</span>` : ""}</button>`;
  return `
  <div class="head"><div><h2>Comunicação</h2><p>Recados da equipe na hora, lembretes para o dia certo e o que aprendemos para o próximo TOP.</p></div></div>
  <div class="seg campo-abas">${ab("agora", "Agora", nl)}${ab("lembretes", "Lembretes", lh)}${ab("aprendizados", "Aprendizados", rev)}</div>
  ${aba === "lembretes" ? vLembretes() : aba === "aprendizados" ? vAprendizados() : vAgora()}`;
}
function vAgora() {
  const msgs = muralMsgs(), ed = podeEditar(), ate = comViAte(), equipe = admsAtivos();
  const fixos = msgs.filter(m => m.fixo), resto = msgs.filter(m => !m.fixo), nl = comNaoLidas();
  // quem viu sai dos registros de "Vi" (comvisto-<top>-<membro>); a lista completa da equipe só o dono tem
  const vistos = Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(`comvisto-${curTopId()}-`)).map(([k, d]) => ({ id: k.slice(`comvisto-${curTopId()}-`.length), nome: d.nome || "", ate: d.ate || "" }));
  const nomeDe = e => e.nome || ((equipe.find(x => x.id === e.id) || {}).nome) || "ADM";
  const viram = m => { const L = vistos.filter(e => e.ate >= m.em).map(e => ({ id: e.id, nome: nomeDe(e) })); if (m.por && !L.some(e => e.nome === m.por)) L.unshift({ id: "", nome: m.por }); return L; };
  const card = m => { const v = viram(m), falta = equipe.filter(e => !v.some(x => x.id === e.id || x.nome === e.nome)), novo = m.por !== ME.adm && (m.em || "") > ate;
    return `<div class="mural-msg ${m.tipo === "alerta" ? "alerta" : ""} ${m.fixo ? "fixo" : ""} ${novo ? "novo" : ""}">
      ${m.fixo ? `<span class="mural-pin">📌 Fixado</span>` : ""}<p>${esc(m.txt)}</p>
      <div class="mural-pe"><small>${esc(m.por)} · ${hmDe(m.em)} · ${haQuanto(m.em)}${m.editadoEm ? " · editado" : ""}</small>
        <span class="mural-acoes"><button type="button" class="mural-vistos" data-com-vistos="${esc(m.id)}" title="${falta.length ? "Falta ver: " + esc(falta.map(e => e.nome.split(" ")[0]).join(", ")) : "Quem viu"}">👁 ${v.length}${equipe.length ? "/" + equipe.length : ""}</button>
        ${novo ? `<button type="button" class="btn sm primary" data-com-vi="${esc(m.em)}">${ico("check")} Vi</button>` : ""}
        <span class="mural-sp"></span>
        ${ed ? `<button type="button" class="icon-btn ${m.fixo ? "on" : ""}" data-com-fixar="${esc(m.id)}" aria-label="${m.fixo ? "Desafixar" : "Fixar no topo"}" title="${m.fixo ? "Desafixar" : "Fixar no topo"}">📌</button>` : ""}
        ${ed && (m.por === ME.adm || S.isOwner) ? `<button type="button" class="icon-btn" data-com-editar="${esc(m.id)}" aria-label="Editar recado" title="Editar">${ico("edit")}</button><button type="button" class="icon-btn" data-com-apagar="${esc(m.id)}" aria-label="Excluir recado" title="Excluir">${ico("trash")}</button>` : ""}</span></div>
      ${S.comVistos === m.id ? `<div class="mural-quem">${v.length ? `<span><b>Viram:</b> ${v.map(e => esc(String(e.nome).split(" ")[0])).join(", ")}</span>` : ""}${falta.length ? `<span class="bad-text"><b>Falta ver:</b> ${falta.map(e => esc(e.nome.split(" ")[0])).join(", ")}</span>` : ""}</div>` : ""}</div>`; };
  return `
  ${ed ? `<section class="panel"><h3>Avisar a equipe <small>todos recebem</small></h3>
    <div class="mural-rapido">${MURAL_RAPIDO.map(([e, t]) => `<button type="button" class="mural-q" data-mural="${esc(e + " " + t)}"><span class="mural-q-e" aria-hidden="true">${e}</span><span>${esc(t)}</span></button>`).join("")}</div>
    <div class="mural-livre"><input id="muralTxt" placeholder="Ou escreva um recado…" maxlength="200" aria-label="Recado"><button class="btn primary" type="button" data-act="mural-enviar">Enviar</button></div></section>` : ""}
  ${fixos.length ? `<section class="panel"><h3>Fixados <small>${fixos.length}</small></h3><div class="mural-lista">${fixos.map(card).join("")}</div></section>` : ""}
  <section class="panel"><h3>Recados <small>${nl ? `${nl} não lido(s) · <button type="button" class="linkbtn" data-com-vi="${esc((msgs[0] || {}).em || "")}">marcar tudo como visto</button>` : msgs.length}</small></h3>
    <div class="mural-lista">${resto.map(card).join("") || `<div class="empty">Nenhum recado ainda.</div>`}</div></section>`;
}
// lembretes: valem para uma data, um dia do TOP (D1, D2…) ou para o próximo TOP
const lembretes = () => (cfgDe("lembretes") || {}).lista || [];
function lembreteVence(l) {
  if (l.feito) return false;
  if (l.quando === "data") return (l.data || "") <= hojeISO();
  if (l.quando === "proximo") return l.top !== curTopId();
  if (l.quando === "dia") { if (l.top !== curTopId()) return false; const plano = cronoPlano(), ids = plano.map(d => d.id), at = ids.indexOf(cronoDiaAtual(plano)); return at >= 0 && at >= ids.indexOf(l.dia); }
  return false;
}
const lembretesHoje = () => COM() && ME.acesso ? lembretes().filter(lembreteVence) : [];
const lembreteQuando = l => l.quando === "data" ? (l.data === hojeISO() ? "hoje" : new Date(l.data + "T12:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }))
  : l.quando === "dia" ? `${(cronoPlano().find(d => d.id === l.dia) || {}).nome || l.dia} do ${l.topNome || "TOP"}` : `próximo TOP (anotado no ${l.topNome || "TOP anterior"})`;
function vLembretes() {
  const L = lembretes(), ed = podeEditar(), hoje = L.filter(lembreteVence), depois = L.filter(l => !l.feito && !lembreteVence(l)), feitos = L.filter(l => l.feito).slice(0, 10);
  const item = l => `<div class="li lembrete ${l.feito ? "passou" : ""}"><span class="grow"><b>${esc(l.txt)}</b><br><span class="hint">📅 ${esc(lembreteQuando(l))}${l.area ? " · " + esc(l.area) : ""} · por ${esc(l.por || "ADM")}${l.feito ? ` · feito por ${esc(l.feitoPor || "")}` : ""}</span></span>
    ${ed && !l.feito ? `<button class="btn sm" type="button" data-lem-feito="${esc(l.id)}">${ico("check")} Feito</button>` : ""}${ed ? `<button class="icon-btn" type="button" data-lem="${esc(l.id)}" aria-label="Editar lembrete">${ico("edit")}</button>` : ""}</div>`;
  return `
  ${ed ? `<div class="actions" style="margin:4px 0 12px"><button class="btn primary" type="button" data-lem="">${ico("plus")} Novo lembrete</button></div>` : ""}
  <section class="panel"><h3>Para agora <small>${hoje.length}</small></h3><div class="list">${hoje.map(item).join("") || `<div class="empty">Nada para hoje.</div>`}</div></section>
  <section class="panel"><h3>Mais pra frente <small>${depois.length}</small></h3><div class="list">${depois.map(item).join("") || `<div class="empty">Nenhum lembrete marcado. Anote algo para amanhã, para um dia do TOP ou para o próximo TOP.</div>`}</div></section>
  ${feitos.length ? `<section class="panel"><h3>Feitos <small>${feitos.length}</small></h3><div class="list">${feitos.map(item).join("")}</div></section>` : ""}`;
}
const AREAS = ["Logística", "Pista", "Saúde", "Alimentação", "Comunicação", "Inscrições", "Geral"];
function lembreteForm(id) {
  const L = lembretes(), l = L.find(x => x.id === id) || { quando: "data", data: (() => { const d = new Date(Date.now() + 864e5); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); })() };
  const dias = cronoPlano();
  modal(`
    <h3>${l.id ? "Editar lembrete" : "Novo lembrete"}</h3>
    <div class="form">
      <div class="field full"><label for="f-lt">O que lembrar</label><textarea id="f-lt" name="txt" style="min-height:80px" required placeholder="ex.: levar mais gelo para o camp do D2">${esc(l.txt || "")}</textarea></div>
      <div class="field full"><span class="lab">Para quando</span><div class="seg lem-quando">
        ${[["data", "Uma data"], ["dia", "Dia do TOP"], ["proximo", "Próximo TOP"]].map(([v, t]) => `<label><input type="radio" name="quando" value="${v}" ${l.quando === v ? "checked" : ""}> ${t}</label>`).join("")}</div></div>
      <div class="field" data-lq="data"><label for="f-ld">Data</label><input id="f-ld" name="data" type="date" value="${esc(l.data || "")}"></div>
      <div class="field" data-lq="dia"><label for="f-ldia">Dia</label><select id="f-ldia" name="dia">${dias.map(d => `<option value="${esc(d.id)}" ${l.dia === d.id ? "selected" : ""}>${esc(d.nome)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-la">Área</label><select id="f-la" name="area"><option value="">—</option>${AREAS.map(a => `<option ${l.area === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
    </div>
    <div class="modal-foot"><div>${l.id ? `<button class="btn danger" type="button" id="lDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const txt = String(fd.get("txt") || "").trim(), quando = fd.get("quando") || "data"; if (!txt) { toast("Escreva o lembrete."); return; }
    if (quando === "data" && !fd.get("data")) { toast("Escolha a data."); return; }
    const novo = { ...l, id: l.id || Date.now().toString(36), txt, quando, data: quando === "data" ? fd.get("data") : "", dia: quando === "dia" ? fd.get("dia") : "", area: fd.get("area") || "",
      top: l.top || curTopId(), topNome: l.topNome || topName(), por: l.por || ME.adm || "", em: l.em || new Date().toISOString() };
    closeModal(); save(() => api.set("config", "lembretes", { lista: [...L.filter(x => x.id !== novo.id), novo] }), "Lembrete salvo").then(render);
  });
  const sync = () => { const q = ($("#mform [name=quando]:checked") || {}).value; $("#mform").querySelectorAll("[data-lq]").forEach(el => { el.hidden = el.dataset.lq !== q; }); };
  $("#mform").addEventListener("change", sync); sync();
  const del = $("#lDel"); if (del) del.onclick = () => { closeModal(); save(() => api.set("config", "lembretes", { lista: L.filter(x => x.id !== l.id) }), "Lembrete excluído").then(render); };
}
function lembreteFeito(id) {
  const L = lembretes().map(l => l.id === id ? { ...l, feito: true, feitoPor: ME.adm || "", feitoEm: new Date().toISOString() } : l);
  save(() => api.set("config", "lembretes", { lista: L }), "Lembrete feito").then(render);
}
const lemAvisados = new Set();
function avisoLembretes() {
  const L = lembretesHoje();
  L.filter(l => !lemAvisados.has(l.id)).forEach(l => { lemAvisados.add(l.id); setTimeout(() => novaNotif({ id: "lem-" + l.id + "-" + hojeISO(), em: new Date().toISOString(), ator: null, ator_nome: l.por || "ADM", publico: "todos", col: "config", doc_id: "lembretes", acao: "lembrete", nome: "📌 " + l.txt }), 0); });
  if (!L.length || S.view === "comunicacao") return "";
  return `<div class="banner aviso lem-banner"><span>📌 <b>${L.length === 1 ? "Lembrete" : L.length + " lembretes"}:</b> ${esc(L[0].txt)}${L.length > 1 ? ` <small>e mais ${L.length - 1}</small>` : ""}</span>
    <span class="actions">${podeEditar() && L.length === 1 ? `<button class="btn" type="button" data-lem-feito="${esc(L[0].id)}">Feito</button>` : ""}<button class="btn" type="button" data-go="comunicacao" data-com-ir="lembretes">Ver</button></span></div>`;
}
// aprendizados: o que funcionou e o que mudar, por área. Os do TOP anterior aparecem para revisar antes de começar.
const aprendDoc = (t = curTopId()) => cfgDe(`aprend-${t}`) || {};
function aprendAnterior() {
  const outros = Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith("aprend-") && k !== `aprend-${curTopId()}`).map(([k, d]) => ({ top: k.slice(7), ...d })).filter(d => (d.itens || []).length);
  return outros.sort((a, b) => (b.em || "").localeCompare(a.em || ""))[0] || null;
}
const aprendPraRevisar = () => { if (!COM()) return []; const A = aprendAnterior(), rev = aprendDoc().revisados || {}; return A ? A.itens.filter(i => !rev[A.top + "|" + i.id]) : []; };
function vAprendizados() {
  const D = aprendDoc(), itens = D.itens || [], ed = podeEditar(), A = aprendAnterior(), rev = D.revisados || {};
  const grupo = (lista, ant) => { const por = {}; lista.forEach(i => (por[i.area || "Geral"] = por[i.area || "Geral"] || []).push(i));
    return Object.entries(por).map(([a, is]) => `<div class="apr-area"><b>${esc(a)}</b>${is.map(i => { const k = ant ? A.top + "|" + i.id : "";
      return `<div class="apr-item ${i.tipo === "funcionou" ? "ok" : "mudar"} ${ant && rev[k] ? "feito" : ""}"><span class="apr-tipo">${i.tipo === "funcionou" ? "👍 Funcionou" : "🔧 Mudar"}</span><span class="grow">${esc(i.txt)}<br><small class="hint">${esc(i.por || "ADM")}</small></span>
        ${ant && ed ? `<button type="button" class="btn sm ${rev[k] ? "" : "primary"}" data-apr-rev="${esc(k)}">${rev[k] ? "Revisado ✓" : "Revisar"}</button>` : !ant && ed ? `<button class="icon-btn" type="button" data-apr-del="${esc(i.id)}" aria-label="Apagar">${ico("trash")}</button>` : ""}</div>`; }).join("")}</div>`).join(""); };
  const falta = A ? A.itens.filter(i => !rev[A.top + "|" + i.id]).length : 0;
  return `
  ${A ? `<section class="panel ${falta ? "apr-revisar" : ""}"><h3>Do ${esc(A.topNome || "TOP anterior")} <small>${falta ? `${falta} para revisar antes de começar` : "tudo revisado"}</small></h3>${grupo(A.itens, true)}</section>` : ""}
  ${ed ? `<section class="panel"><h3>Anotar um aprendizado <small>vai para o Relatório final</small></h3>
    <div class="apr-novo"><select id="aprArea" aria-label="Área">${AREAS.map(a => `<option>${a}</option>`).join("")}</select>
      <div class="seg"><button type="button" data-apr-tipo="funcionou" aria-pressed="${S.aprTipo !== "mudar"}">👍 Funcionou</button><button type="button" data-apr-tipo="mudar" aria-pressed="${S.aprTipo === "mudar"}">🔧 Mudar</button></div>
      <input id="aprTxt" maxlength="240" placeholder="ex.: separar água por família antes do camp" aria-label="Aprendizado"><button class="btn primary" type="button" data-act="apr-add">Anotar</button></div></section>` : ""}
  <section class="panel"><h3>Deste TOP <small>${itens.length}</small></h3>${grupo(itens, false) || `<div class="empty">Ainda nada anotado. Anote durante o TOP, na hora em que acontece.</div>`}</section>`;
}
function aprendSalvar(fn, msg) { const D = aprendDoc(); save(() => api.set("config", `aprend-${curTopId()}`, { itens: D.itens || [], revisados: D.revisados || {}, ...fn(D), topNome: topName(), em: new Date().toISOString(), top: curTopId() }), msg).then(render); }

/* ---------- Celulares dos legendários (só na demo): guardar no check-in com foto, motivo de quem não entregou, devolução e relatório por equipe ----------
   config cel-<top>-<pessoaId> {status: guardado|nao|devolvido, foto, motivo, obs, em, por, devolvidoEm, devolvidoPor} */
const CEL = () => true;   // liberada no app real em 31/10/2026
// fotos: no app real vão para o Supabase Storage (bucket adm-fotos, supabase/fotos.sql); sem o bucket (ou sem internet) ficam pequenas dentro do registro
const fotoUrls = {}; let fotoBuscando = new Set(), fotoRender = 0;
function celFotoSrc(c) {
  if (c.foto) return c.foto; if (!c.fotoPath || !sb) return "";
  if (fotoUrls[c.fotoPath]) return fotoUrls[c.fotoPath];
  if (!fotoBuscando.has(c.fotoPath)) { fotoBuscando.add(c.fotoPath);
    sb.storage.from("adm-fotos").createSignedUrl(c.fotoPath, 6 * 3600).then(r => { if (r.data && r.data.signedUrl) { fotoUrls[c.fotoPath] = r.data.signedUrl; clearTimeout(fotoRender); fotoRender = setTimeout(() => { if (!$("#modalRoot").innerHTML) render(); }, 150); } }).catch(() => {}); }
  return "";
}
async function celFotoData(c) {   // para o PDF: a foto como data URL
  if (c.foto) return c.foto; if (!c.fotoPath || !sb) return "";
  try { const r = await sb.storage.from("adm-fotos").download(c.fotoPath); if (!r.data) return ""; return await reduzirFoto(r.data, 360); } catch { return ""; }
}
async function celGuardarFoto(p, fl) { return fotoGuardar(fl, `celulares/${curTopId()}/${p.id}`); }
async function fotoGuardar(fl, base) {
  if (!DEMO && sb && navigator.onLine !== false) {
    try { const grande = await reduzirFoto(fl, 1000), blob = await (await fetch(grande)).blob(), path = `${base}-${Date.now().toString(36)}.jpg`;
      const r = await sb.storage.from("adm-fotos").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (!r.error) { fotoUrls[path] = grande; return { foto: "", fotoPath: path }; }
    } catch (e) {}
  }
  return { foto: await reduzirFoto(fl, 360), fotoPath: "" };
}
const CEL_MOTIVOS = ["Esqueceu no carro", "Liberado pela coordenação", "Precisa por trabalho", "Precisa pela família", "Não veio ao TOP", "Outro"];
const celId = p => `cel-${curTopId()}-${p.id}`;
const celDe = p => cfgDe(celId(p)) || {};
const celSt = p => celDe(p).status || "falta";
const CEL_TXT = { falta: "Falta entregar", guardado: "Guardado", nao: "Não entregou", devolvido: "Devolvido" };
const CEL_CHIP = { falta: "wait", guardado: "ok", nao: "bad", devolvido: "ok" };
const celLgs = () => S.P.filter(p => p.tipo === "legendario" && !cancelado(p)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
const celCoord = eq => celLgs().filter(p => (p.equipe || "Sem equipe") === eq && p.funcao).sort((a, b) => FUNC_ORDEM(a.funcao) - FUNC_ORDEM(b.funcao))[0] || null;
function celSalvar(p, dados, msg) {
  const atual = celDe(p);
  return save(() => api.set("config", celId(p), { ...atual, ...dados, pessoaId: p.id, nome: p.nome, equipe: p.equipe || "", top: curTopId() }), msg).then(render);
}
function vCelulares() {
  const L = celLgs(), ed = podeEditar(), q = norm(S.celQ || ""), f = S.celF || "falta";
  const conta = s => L.filter(p => celSt(p) === s).length, nG = conta("guardado"), nF = conta("falta"), nN = conta("nao"), nD = conta("devolvido");
  const eqSel = S.celEq || "", vis = L.filter(p => (!q || norm(p.nome).includes(q)) && (!eqSel || (p.equipe || "Sem equipe") === eqSel) && (f === "todos" || celSt(p) === f));
  const porEq = {}; vis.forEach(p => (porEq[p.equipe || "Sem equipe"] = porEq[p.equipe || "Sem equipe"] || []).push(p));
  const eqs = [...new Set(L.map(p => p.equipe || "Sem equipe"))].sort();
  const fb = (v, l, n) => `<button type="button" data-cel-f="${v}" aria-pressed="${f === v}">${l}${n != null ? ` <span class="num" style="opacity:.75">${n}</span>` : ""}</button>`;
  const linha = p => { const c = celDe(p), st = celSt(p);
    return `<div class="cel-li ${st}">
      ${c.foto || c.fotoPath ? `<button type="button" class="cel-foto" data-cel-ver="${esc(p.id)}" aria-label="Ver foto">${celFotoSrc(c) ? `<img src="${esc(celFotoSrc(c))}" alt="">` : "🖼"}</button>` : `<span class="cel-foto vazia">${st === "nao" ? "✕" : "📱"}</span>`}
      <button type="button" class="cel-info" ${ed ? `data-cel="${esc(p.id)}"` : "disabled"}><b>${famPre(p)}${esc(p.nome)}</b>
        <small>${p.funcao ? esc(p.funcao) + " · " : ""}<span class="chip ${CEL_CHIP[st]}">${CEL_TXT[st]}</span>${c.em && st !== "falta" ? ` ${hmDe(st === "devolvido" ? c.devolvidoEm : c.em)}` : ""}${st === "nao" && c.motivo ? ` · ${esc(c.motivo)}` : ""}${c.qtd > 1 ? ` · ${c.qtd} aparelhos` : ""}${c.obs && st !== "nao" ? ` · ${esc(c.obs)}` : ""}</small></button>
      ${ed ? (st === "falta" ? `<label class="btn sm primary cel-cam">📷 Guardar<input type="file" accept="image/*" capture="environment" data-cel-foto="${esc(p.id)}" hidden></label><button class="btn sm" type="button" data-cel-nao="${esc(p.id)}">Não entregou</button>`
        : st === "guardado" ? `<button class="btn sm" type="button" data-cel-dev="${esc(p.id)}">Devolver</button>` : "") : ""}
      ${ed ? `<button class="icon-btn" type="button" data-cel-edit="${esc(p.id)}" aria-label="Editar" title="Editar">${ico("edit")}</button>` : ""}</div>`; };
  return `
  <div class="head"><div><h2>Celulares</h2><p>No check-in: guarde o celular, tire a foto do saquinho com o nome e pronto. Quem não entregar fica com o motivo. No fim do TOP, marque a devolução. Cada coordenador recebe o relatório da equipe dele.</p></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Guardados</span><span class="val num">${nG + nD}<small style="font-size:.5em;opacity:.7"> / ${L.length}</small></span><div class="bar good"><i style="width:${pct(nG + nD, L.length)}%"></i></div></div>
    <div class="kpi ${nF ? "alert" : ""}"><span class="lbl">Faltam</span><span class="val num">${nF}</span><span class="sub">ainda não passaram</span></div>
    <div class="kpi"><span class="lbl">Não entregaram</span><span class="val num">${nN}</span><span class="sub">com motivo</span></div>
    <div class="kpi"><span class="lbl">Devolvidos</span><span class="val num">${nD}</span><span class="sub">${nG ? nG + " ainda guardado(s)" : "nenhum pendente"}</span></div>
  </div>
  <div class="cel-areas">${eqs.map(eq => { const m = L.filter(p => (p.equipe || "Sem equipe") === eq), g = m.filter(p => ["guardado", "devolvido"].includes(celSt(p))).length, n = m.filter(p => celSt(p) === "nao").length, fl = m.length - g - n;
    return `<button type="button" class="cel-area ${eqSel === eq ? "on" : ""} ${fl ? "" : "completa"}" data-cel-eq="${esc(eq)}" aria-pressed="${eqSel === eq}">
      <span class="cel-area-n">${esc(eq)}</span><span class="cel-area-v num"><b>${g}</b> / ${m.length}</span><span class="cel-area-s">${m.length} servo${m.length === 1 ? "" : "s"} · ${g} ${g === 1 ? "entregou" : "entregaram"}</span>
      <span class="bar good"><i style="width:${pct(g, m.length)}%"></i></span><span class="cel-area-f">${fl ? `faltam ${fl}` : "✓ completa"}${n ? ` · ${n} não entregou` : ""}</span></button>`; }).join("")}</div>
  ${eqSel ? `<p class="hint" style="margin:0">Mostrando só <b>${esc(eqSel)}</b>. <button type="button" class="linkbtn" data-cel-eq="">ver todas as áreas</button></p>` : ""}
  <div class="cel-busca"><input id="celQ" type="search" placeholder="Buscar legendário pelo nome…" value="${esc(S.celQ || "")}" aria-label="Buscar"></div>
  <div class="seg cel-filtro">${fb("falta", "Faltam", nF)}${fb("guardado", "Guardados", nG)}${fb("nao", "Não entregou", nN)}${fb("devolvido", "Devolvidos", nD)}${fb("todos", "Todos")}</div>
  ${Object.keys(porEq).sort().map(eq => { const cd = celCoord(eq);
    return `<section class="panel"><h3>${esc(eq)} <small>${porEq[eq].length}${cd ? ` · coord. ${esc(cd.nome.split(" ")[0])}` : ""}</small></h3><div class="cel-lista">${porEq[eq].map(linha).join("")}</div></section>`; }).join("")
    || `<section class="panel"><div class="empty">${q ? "Ninguém com esse nome aqui." : f === "falta" ? "Todos os celulares já foram recolhidos. 🎉" : "Ninguém nesta lista."}</div></section>`}
  <section class="panel"><h3>Relatório para os coordenadores <small>um por equipe</small></h3>
    <div class="list">${eqs.map(eq => { const cd = celCoord(eq), m = L.filter(p => (p.equipe || "Sem equipe") === eq), g = m.filter(p => ["guardado", "devolvido"].includes(celSt(p))).length, n = m.filter(p => celSt(p) === "nao").length, fl = m.filter(p => celSt(p) === "falta").length;
      return `<div class="li"><span class="grow"><b>${esc(eq)}</b><br><span class="hint">${cd ? `Coord.: ${esc(cd.nome)}` : "sem coordenador marcado nas Equipes LGND"} · ${g} guardado(s)${n ? ` · ${n} não entregou` : ""}${fl ? ` · ${fl} falta(m)` : ""}</span></span>
        <span class="actions"><button class="btn sm" type="button" data-cel-pdf="${esc(eq)}">PDF</button>${cd && waNumber(cd.telefone) ? `<button class="btn sm cel-wa" type="button" data-cel-wa="${esc(eq)}">${ico("wa")} Enviar</button>` : ""}</span></div>`; }).join("")}
      <div class="li"><span class="grow"><b>Todas as equipes</b><br><span class="hint">um PDF só, com uma seção por equipe</span></span><button class="btn sm" type="button" data-cel-pdf="">PDF geral</button></div></div></section>`;
}
async function celFotoTirada(inp) {
  const p = S.P.find(x => x.id === inp.dataset.celFoto), fl = inp.files[0]; if (!p || !fl) return;
  toast("Salvando a foto…");
  try { const f = await celGuardarFoto(p, fl); celSalvar(p, { status: "guardado", ...f, em: new Date().toISOString(), por: ME.adm || "", motivo: "", obs: "" }, `Celular de ${p.nome.split(" ")[0]} guardado`); }
  catch { toast("Não consegui abrir a foto. Tente de novo."); }
}
function celNaoForm(p) {
  const c = celDe(p);
  modal(`<h3>${esc(p.nome)} não entregou</h3>
    <div class="field"><span class="lab">Motivo</span><div class="cel-motivos">${CEL_MOTIVOS.map((m, i) => `<label><input type="radio" name="motivo" value="${esc(m)}" ${c.motivo === m || (!c.motivo && !i) ? "checked" : ""}> ${esc(m)}</label>`).join("")}</div></div>
    <div class="field"><label for="f-co">Detalhe (opcional)</label><input id="f-co" name="obs" value="${esc(c.obs || "")}" placeholder="ex.: entrega amanhã cedo, liberado pelo Pr. João"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const motivo = fd.get("motivo") || "Outro", obs = String(fd.get("obs") || "").trim(); if (motivo === "Outro" && !obs) { toast("Conte o motivo no detalhe."); return; }
    closeModal(); celSalvar(p, { status: "nao", motivo, obs, em: new Date().toISOString(), por: ME.adm || "", foto: "", fotoPath: "" }, "Registrado: não entregou");
  });
}
function celForm(p) {
  const c = celDe(p), st = celSt(p);
  modal(`<h3>${esc(p.nome)}</h3>
    <p class="hint" style="margin:-6px 0 10px">${esc(p.equipe || "Sem equipe")}${p.funcao ? " · " + esc(p.funcao) : ""}</p>
    <div class="cel-ficha"><span class="chip ${CEL_CHIP[st]}">${CEL_TXT[st]}</span>
      ${st !== "falta" ? `<p>${st === "nao" ? `Motivo: <b>${esc(c.motivo || "-")}</b>${c.obs ? ` · ${esc(c.obs)}` : ""}<br>` : ""}Registrado às ${hmDe(c.em)} por ${esc(c.por || "ADM")}${st === "devolvido" ? `<br>Devolvido às ${hmDe(c.devolvidoEm)} por ${esc(c.devolvidoPor || "ADM")}` : ""}</p>` : ""}
      ${celFotoSrc(c) ? `<img class="cel-grande" src="${esc(celFotoSrc(c))}" alt="Foto do celular guardado">` : c.fotoPath ? `<p class="hint">Carregando a foto…</p>` : ""}</div>
    <div class="cel-acoes">
      <label class="btn ${st === "falta" ? "primary" : ""}">📷 ${c.foto || c.fotoPath ? "Trocar foto" : "Guardar com foto"}<input type="file" accept="image/*" capture="environment" data-cel-foto="${esc(p.id)}" hidden></label>
      ${st === "falta" ? `<button class="btn" type="button" id="celSemFoto">Guardar sem foto</button>` : ""}
      ${st !== "nao" ? `<button class="btn" type="button" id="celNao">Não entregou</button>` : `<button class="btn" type="button" id="celNao">Mudar motivo</button>`}
      ${st === "guardado" ? `<button class="btn" type="button" id="celDev">Devolvido</button>` : ""}
      ${st !== "falta" ? `<button class="btn ghost" type="button" id="celVolta">Voltar para "falta entregar"</button>` : ""}</div>
    <div class="modal-foot"><span>${podeEditar() ? `<button class="btn" type="button" id="celEdit">${ico("edit")} Editar tudo</button>` : ""}</span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal());
  const on = (id, fn) => { const b = $("#" + id); if (b) b.onclick = fn; };
  on("celEdit", () => { closeModal(); celEditar(p); });
  on("celSemFoto", () => { closeModal(); celSalvar(p, { status: "guardado", foto: "", fotoPath: "", em: new Date().toISOString(), por: ME.adm || "" }, "Celular guardado"); });
  on("celNao", () => { closeModal(); celNaoForm(p); });
  on("celDev", () => { closeModal(); celSalvar(p, { status: "devolvido", devolvidoEm: new Date().toISOString(), devolvidoPor: ME.adm || "" }, "Celular devolvido"); });
  on("celVolta", () => { closeModal(); celSalvar(p, { status: "falta", foto: "", fotoPath: "", motivo: "", obs: "", em: "", devolvidoEm: "" }, "Voltou para falta entregar"); });
}
// editar tudo de uma pessoa: situação, quantos aparelhos, motivo, observação, quem recebeu e horários
function celEditar(p) {
  const c = celDe(p), st = celSt(p), loc = iso => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  const adms = [...new Set([...(S.equipe || []).map(e => e.nome), c.por, c.devolvidoPor, ME.adm].filter(Boolean))].sort();
  modal(`<h3>Editar · ${esc(p.nome)}</h3>
    <div class="form">
      <div class="field"><label for="f-cs">Situação</label><select id="f-cs" name="status">${Object.entries(CEL_TXT).map(([k, l]) => `<option value="${k}" ${st === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="field"><label for="f-cq">Aparelhos guardados</label><input id="f-cq" name="qtd" type="number" min="0" max="5" value="${esc(c.qtd ?? 1)}"></div>
      <div class="field full" data-cs="nao"><label for="f-cm">Motivo</label><select id="f-cm" name="motivo">${CEL_MOTIVOS.map(m => `<option ${c.motivo === m ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></div>
      <div class="field full"><label for="f-cob">Observação</label><input id="f-cob" name="obs" value="${esc(c.obs || "")}" placeholder="ex.: 2 celulares (pessoal e trabalho), capinha azul"></div>
      <div class="field" data-cs="guardado nao devolvido"><label for="f-cpor">Recebido por</label><input id="f-cpor" name="por" list="celAdms" value="${esc(c.por || "")}"></div>
      <div class="field" data-cs="guardado nao devolvido"><label for="f-cem">Quando</label><input id="f-cem" name="em" type="datetime-local" value="${loc(c.em)}"></div>
      <div class="field" data-cs="devolvido"><label for="f-cdp">Devolvido por</label><input id="f-cdp" name="devolvidoPor" list="celAdms" value="${esc(c.devolvidoPor || "")}"></div>
      <div class="field" data-cs="devolvido"><label for="f-cde">Devolvido em</label><input id="f-cde" name="devolvidoEm" type="datetime-local" value="${loc(c.devolvidoEm)}"></div>
      ${c.foto || c.fotoPath ? `<div class="field full cel-motivos"><label><input type="checkbox" name="semFoto"> Apagar a foto</label></div>` : ""}
      <datalist id="celAdms">${adms.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
    </div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const s = fd.get("status"), iso = v => v ? new Date(v).toISOString() : "", agora = new Date().toISOString();
    const dados = { status: s, qtd: Math.max(0, Math.min(5, Number(fd.get("qtd")) || 0)), obs: String(fd.get("obs") || "").trim(), motivo: s === "nao" ? fd.get("motivo") : "",
      por: s === "falta" ? "" : String(fd.get("por") || "").trim() || ME.adm || "", em: s === "falta" ? "" : iso(fd.get("em")) || c.em || agora,
      devolvidoPor: s === "devolvido" ? String(fd.get("devolvidoPor") || "").trim() || ME.adm || "" : "", devolvidoEm: s === "devolvido" ? iso(fd.get("devolvidoEm")) || c.devolvidoEm || agora : "",
      editadoPor: ME.adm || "", editadoEm: agora };
    if (fd.get("semFoto") || s === "falta" || s === "nao") { dados.foto = ""; dados.fotoPath = ""; }
    closeModal(); celSalvar(p, dados, "Alterações salvas");
  });
  const sync = () => { const s = $("#f-cs").value; $("#mform").querySelectorAll("[data-cs]").forEach(el => { el.hidden = !el.dataset.cs.split(" ").includes(s); }); };
  $("#f-cs").addEventListener("change", sync); sync();
}
async function celPdf(eq, wa) {
  const L = celLgs(), fotos = {};
  toast("Montando o PDF com as fotos…");
  await Promise.all(L.filter(p => eq === "" || (p.equipe || "Sem equipe") === eq).map(async p => { fotos[p.id] = await celFotoData(celDe(p)); }));
  const eqs = eq ? [eq] : [...new Set(L.map(p => p.equipe || "Sem equipe"))].sort();
  const ordem = { nao: 0, falta: 1, guardado: 2, devolvido: 3 };
  const secoes = eqs.map(e => { const cd = celCoord(e);
    return { titulo: `${e}${cd ? " · coord. " + cd.nome : ""}`, linhas: L.filter(p => (p.equipe || "Sem equipe") === e).sort((a, b) => ordem[celSt(a)] - ordem[celSt(b)] || norm(a.nome).localeCompare(norm(b.nome))).map(p => { const c = celDe(p), st = celSt(p);
      return [fotos[p.id] || "", p.nome, p.funcao || "", CEL_TXT[st], st === "falta" ? "" : (c.em ? new Date(c.em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "") + (st === "devolvido" && c.devolvidoEm ? ` · devolvido ${hmDe(c.devolvidoEm)}` : ""),
        [st === "nao" ? c.motivo : c.por ? "Recebido por " + c.por : "", c.qtd > 1 ? c.qtd + " aparelhos" : "", c.obs].filter(Boolean).join(" · ")]; }) }; });
  const m = L.filter(p => eqs.includes(p.equipe || "Sem equipe")), cnt = s => m.filter(p => celSt(p) === s).length;
  return gerarListaPdf({ titulo: eq ? `Celulares · ${eq}` : "Celulares dos legendários", arquivo: `Celulares ${eq || "todas as equipes"} ${topName()}`, orient: "portrait",
    resumo: [["Guardados", `${cnt("guardado") + cnt("devolvido")} de ${m.length}`], ["Não entregaram", cnt("nao")], ["Faltam", cnt("falta")]],
    legenda: "Foto do saquinho com o nome tirada no check-in. Quem não entregou aparece primeiro, com o motivo.",
    colunas: [{ t: "Foto", w: 20, foto: true }, { t: "Nome", bold: true }, { t: "Função", w: 26, cinza: true }, { t: "Situação", w: 26, status: true }, { t: "Hora", w: 24 }, { t: "Motivo / quem recebeu", w: 46 }], secoes }, wa)
    .catch(e => toast("Não foi possível gerar o PDF. " + e.message));
}
function celResumoWa(eq) {
  const L = celLgs().filter(p => (p.equipe || "Sem equipe") === eq), cd = celCoord(eq); if (!cd) return;
  const g = L.filter(p => ["guardado", "devolvido"].includes(celSt(p))), n = L.filter(p => celSt(p) === "nao"), f = L.filter(p => celSt(p) === "falta");
  const txt = `*Celulares · ${eq} · ${topName()}*\n\nOlá, ${cd.nome.split(" ")[0]}! Resumo da sua equipe:\n✅ Guardados: ${g.length} de ${L.length}` +
    (n.length ? `\n\n❌ *Não entregaram (${n.length}):*\n` + n.map(p => `• ${p.nome}: ${[celDe(p).motivo, celDe(p).obs].filter(Boolean).join(" · ")}`).join("\n") : "") +
    (f.length ? `\n\n⏳ *Ainda não passaram (${f.length}):*\n` + f.map(p => `• ${p.nome}`).join("\n") : "") + `\n\nO PDF com as fotos vai em seguida. ADM 3Colinas`;
  window.open(`https://wa.me/${waNumber(cd.telefone)}?text=${encodeURIComponent(txt)}`, "_blank");
}
document.addEventListener("change", e => { const i = e.target; if (i && i.matches && i.matches("input[data-cel-foto]")) { if ($("#modalRoot").innerHTML) closeModal(); celFotoTirada(i); } });
document.addEventListener("input", e => { if (e.target && e.target.id === "celQ") { S.celQ = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#celQ"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } });

/* ---------- TOP completo (só na demo): Check-in + Mochila, Remédios, Emergência, Transporte e Financeiro ---------- */
const TOP2 = () => false;   // tirado da demo em 02/11/2026 a pedido do Vinicius (código guardado)
const TOP2_VIEWS = ["checkin", "remedios", "transporte"];
const TRANSP = () => true;   // Transporte (ônibus, vistoria, carros, ida/volta) liberado no app real em 01/11/2026; Check-in e Remédios seguem só na demo
const TOP3 = () => true;   // Financeiro e Emergência: liberados no app real em 31/10/2026
const senderistas = () => S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
const agoraISO = () => new Date().toISOString();
const linhaSel = (k, v) => `data-${k}="${esc(v)}"`;
const busca = (id, val, ph) => `<div class="cel-busca"><input id="${id}" type="search" placeholder="${esc(ph)}" value="${esc(val || "")}" aria-label="Buscar"></div>`;
document.addEventListener("input", e => { const id = e.target && e.target.id; if (!["chkQ", "trQ"].includes(id)) return;
  S[id] = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#" + id); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } });

// ===== 1 e 2: CHECK-IN + MOCHILA =====  config chk-<top>-<pid> {em, por, pulseira, itens:{}, faltou:[], prov:{}, obs}; itens da mochila em config mochila-itens {lista}
const MOCHILA_PADRAO = ["Mochila cargueira", "Saco de dormir", "Isolante térmico", "Lanterna de cabeça", "Cantil ou garrafa 2 L", "Capa de chuva", "Remédios pessoais", "Documento com foto", "Roupa extra", "Kit de higiene"];
const mochilaItens = () => (cfgDe("mochila-itens") || {}).lista || MOCHILA_PADRAO;
const chkId = p => `chk-${curTopId()}-${p.id}`;
const chkDe = p => cfgDe(chkId(p)) || null;
const PEND_TXT = { pagamento: "Pagamento", termo: "Termo", apto: "Atestado" };
function vCheckin() {
  const aba = S.chkAba || "chegada", L = senderistas(), cheg = L.filter(chkDe), pend = L.filter(p => faltaTop(p).length);
  const moch = cheg.filter(p => (chkDe(p).faltou || []).some(k => !(chkDe(p).prov || {})[k]));
  return `
  <div class="head"><div><h2>Check-in</h2><p>Chegada dos senderistas: confere documentos, entrega a pulseira, confirma a família e passa a mochila na hora.</p></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Chegaram</span><span class="val num">${cheg.length}<small style="font-size:.5em;opacity:.7"> / ${L.length}</small></span><div class="bar good"><i style="width:${pct(cheg.length, L.length)}%"></i></div></div>
    <div class="kpi ${L.length - cheg.length ? "alert" : ""}"><span class="lbl">Faltam chegar</span><span class="val num">${L.length - cheg.length}</span><span class="sub">${cheg.length ? "último às " + hmDe(cheg.map(p => chkDe(p).em).sort().pop()) : "ninguém ainda"}</span></div>
    <div class="kpi"><span class="lbl">Com pendência</span><span class="val num">${pend.length}</span><span class="sub">termo, atestado ou pagamento</span></div>
    <div class="kpi"><span class="lbl">Mochila incompleta</span><span class="val num">${moch.length}</span><span class="sub">item ainda não providenciado</span></div>
  </div>
  <div class="seg campo-abas"><button type="button" data-chk-aba="chegada" aria-pressed="${aba === "chegada"}">Chegada</button><button type="button" data-chk-aba="mochila" aria-pressed="${aba === "mochila"}">Mochila ${moch.length ? `<span class="com-n num">${moch.length}</span>` : ""}</button></div>
  ${aba === "mochila" ? vMochila(cheg) : vChegada(L)}`;
}
function vChegada(L) {
  const q = norm(S.chkQ || ""), f = S.chkF || "faltam", ed = podeEditar();
  const vis = L.filter(p => (!q || norm(p.nome).includes(q)) && (f === "todos" || (f === "faltam" ? !chkDe(p) : !!chkDe(p))));
  return `${busca("chkQ", S.chkQ, "Buscar senderista pelo nome…")}
  <div class="seg cel-filtro">${[["faltam", "Faltam chegar"], ["chegaram", "Chegaram"], ["todos", "Todos"]].map(([v, l]) => `<button type="button" data-chk-f="${v}" aria-pressed="${f === v}">${l}</button>`).join("")}</div>
  <section class="panel"><div class="cel-lista">${vis.map(p => { const c = chkDe(p), fl = faltaTop(p);
    return `<div class="cel-li ${c ? "guardado" : fl.length ? "nao" : ""}"><span class="chk-fam">${p.familia ? String(p.familia).padStart(2, "0") : "—"}</span>
      <button type="button" class="cel-info" ${ed ? `data-chk="${esc(p.id)}"` : "disabled"}><b>${esc(p.nome)}${is40(p) ? ' <span class="tag">+40</span>' : ""}</b>
        <small>${c ? `<span class="chip ok">Chegou ${hmDe(c.em)}</span>${c.pulseira ? ` · pulseira ${esc(c.pulseira)}` : ""}${(c.faltou || []).length ? ` · <span class="bad-text">faltou ${(c.faltou || []).length} item(ns)</span>` : ""}`
          : fl.length ? fl.map(k => `<span class="chip bad">${PEND_TXT[k] || k}</span>`).join(" ") : '<span class="chip ok">Documentos ok</span>'}</small></button>
      ${ed && !c ? `<button class="btn sm primary" type="button" data-chk="${esc(p.id)}">Check-in</button>` : ""}</div>`; }).join("") || `<div class="empty">${q ? "Ninguém com esse nome." : f === "faltam" ? "Todos chegaram! 🎉" : "Ninguém aqui ainda."}</div>`}</div></section>`;
}
function chkForm(p) {
  const c = chkDe(p) || {}, fl = faltaTop(p), itens = mochilaItens(), ok = c.itens || {};
  modal(`<h3>Check-in · ${esc(p.nome)}</h3>
    <div class="chk-topo"><span class="chip">${p.familia ? famTxt(p.familia) : "Sem família"}</span>${is40(p) ? '<span class="chip">+40</span>' : ""}
      ${fl.length ? fl.map(k => `<span class="chip bad">Falta ${PEND_TXT[k] || k}</span>`).join("") : '<span class="chip ok">Termo, atestado e pagamento ok</span>'}</div>
    ${fl.length ? `<p class="chk-alerta">⚠️ Pendência de ${fl.map(k => (PEND_TXT[k] || k).toLowerCase()).join(", ")}. Resolva com a coordenação antes de liberar.</p>` : ""}
    <div class="form">
      <div class="field"><label for="f-pul">Pulseira nº</label><input id="f-pul" name="pulseira" inputmode="numeric" value="${esc(c.pulseira || "")}" placeholder="ex.: 027"></div>
      <div class="field"><label for="f-cobs">Observação</label><input id="f-cobs" name="obs" value="${esc(c.obs || "")}"></div>
      <div class="field full"><span class="lab">Mochila <button type="button" class="linkbtn" id="mochTudo">marcar tudo</button></span>
        <div class="moch-grid">${itens.map(it => `<label class="moch-it"><input type="checkbox" name="it" value="${esc(it)}" ${!c.em || ok[it] ? (c.em ? "checked" : "") : ""}><span>${esc(it)}</span></label>`).join("")}</div>
        <p class="hint" id="mochRes" style="margin:6px 0 0"></p></div>
    </div>
    <div class="modal-foot"><div>${c.em ? `<button class="btn danger" type="button" id="chkDesf">Desfazer check-in</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${c.em ? "Salvar" : "Confirmar chegada"}</button></div></div>`, fd => {
    const marcados = fd.getAll("it"), itensOk = Object.fromEntries(itens.map(i => [i, marcados.includes(i)])), faltou = itens.filter(i => !marcados.includes(i));
    closeModal(); save(() => api.set("config", chkId(p), { ...c, pessoaId: p.id, nome: p.nome, em: c.em || agoraISO(), por: c.por || ME.adm || "", pulseira: String(fd.get("pulseira") || "").trim(), obs: String(fd.get("obs") || "").trim(), itens: itensOk, faltou, prov: c.prov || {}, top: curTopId() }),
      c.em ? "Check-in atualizado" : `${p.nome.split(" ")[0]} chegou${faltou.length ? ` · faltou ${faltou.length} item(ns) da mochila` : ""}`).then(render);
  });
  const res = () => { const n = $("#mform").querySelectorAll("[name=it]:checked").length; $("#mochRes").innerHTML = n === itens.length ? `<span style="color:#46c486;font-weight:700">Mochila completa ✓</span>` : `${n} de ${itens.length} itens · <span class="bad-text">faltam ${itens.length - n}</span>`; };
  $("#mform").addEventListener("change", res); res();
  $("#mochTudo").onclick = () => { $("#mform").querySelectorAll("[name=it]").forEach(i => { i.checked = true; }); res(); };
  const d = $("#chkDesf"); if (d) d.onclick = () => { if (!confirm("Desfazer o check-in de " + p.nome + "?")) return; closeModal(); save(() => api.remove("config", chkId(p)), "Check-in desfeito").then(render); };
}
function vMochila(cheg) {
  const itens = mochilaItens(), ed = podeEditar();
  const falta = it => cheg.filter(p => (chkDe(p).faltou || []).includes(it));
  return `<section class="panel"><h3>Itens que faltaram <small>de quem já chegou</small>${S.isOwner ? ` <button class="linkbtn" type="button" data-act="moch-itens">editar itens ›</button>` : ""}</h3>
    <div class="moch-res">${itens.map(it => { const L = falta(it), ab = L.filter(p => !(chkDe(p).prov || {})[it]).length;
      return `<div class="moch-li ${ab ? "bad" : L.length ? "ok" : ""}"><b>${esc(it)}</b><span class="num">${ab ? `${ab} sem` : L.length ? "resolvido" : "—"}</span></div>`; }).join("")}</div></section>
  ${itens.filter(it => falta(it).length).map(it => `<section class="panel"><h3>${esc(it)} <small>${falta(it).length} pessoa(s)</small></h3><div class="list">${falta(it).map(p => { const pr = (chkDe(p).prov || {})[it];
    return `<div class="li"><span class="grow"><b>${famPre(p)}${esc(p.nome)}</b>${pr ? `<br><span class="hint">providenciado por ${esc(pr.por)} às ${hmDe(pr.em)}</span>` : ""}</span>
      ${pr ? '<span class="chip ok">Providenciado</span>' : ed ? `<button class="btn sm primary" type="button" data-moch-prov="${esc(p.id + "|" + it)}">Providenciado</button>` : '<span class="chip bad">Falta</span>'}</div>`; }).join("")}</div></section>`).join("")
    || `<section class="panel"><div class="empty">Nenhum item faltando por enquanto.</div></section>`}`;
}
function mochItensForm() {
  modal(`<h3>Itens da mochila</h3><p class="hint">Um item por linha. Vale para todos os TOPs.</p>
    <div class="field"><textarea name="t" style="min-height:220px">${esc(mochilaItens().join("\n"))}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const lista = String(fd.get("t") || "").split("\n").map(s => s.trim()).filter(Boolean); if (!lista.length) return;
    closeModal(); save(() => api.set("config", "mochila-itens", { lista }), "Itens salvos").then(render); });
}

// ===== 3: REMÉDIOS =====  config remed-<top> {lista:[{id,pid,remedio,horarios[],obs}], doses:{"id|dia|hora":{por,em}}}
const remDoc = () => cfgDe(`remed-${curTopId()}`) || {};
const remSalvar = (fn, msg) => { const D = remDoc(); return save(() => api.set("config", `remed-${curTopId()}`, { lista: D.lista || [], doses: D.doses || {}, ...fn(D), top: curTopId() }), msg).then(render); };
const minHM = h => { const [a, b] = String(h).split(":").map(Number); return a * 60 + (b || 0); };
function dosesHoje() {
  const D = remDoc(), dia = hojeISO(), agora = new Date().getHours() * 60 + new Date().getMinutes();
  return (D.lista || []).flatMap(r => (r.horarios || []).map(h => { const k = `${r.id}|${dia}|${h}`, dado = (D.doses || {})[k], dif = minHM(h) - agora;
    return { r, h, k, dado, dif, p: S.P.find(x => x.id === r.pid) || { nome: r.nome || "?" }, st: dado ? "dado" : dif < -30 ? "atrasado" : dif <= 15 ? "agora" : "depois" }; })).sort((a, b) => minHM(a.h) - minHM(b.h));
}
function avisoRemedio() {
  if (!TOP2() || !ME.acesso || S.view === "remedios") return "";
  const L = dosesHoje().filter(d => d.st === "agora" || d.st === "atrasado"); if (!L.length) return "";
  const at = L.filter(d => d.st === "atrasado").length;
  return `<div class="banner aviso ${at ? "rem-atraso" : ""}"><span>💊 <b>${at ? `${at} dose(s) atrasada(s)` : "Hora do remédio"}:</b> ${esc(L[0].p.nome.split(" ")[0])} · ${esc(L[0].r.remedio)} às ${L[0].h}${L.length > 1 ? ` <small>e mais ${L.length - 1}</small>` : ""}</span><button class="btn" type="button" data-go="remedios">Ver</button></div>`;
}
function vRemedios() {
  const D = remDoc(), ed = podeEditar(), H = dosesHoje(), ja = new Set((D.lista || []).map(r => r.pid));
  const nada = v => !v || /^(n[aã]o|nenhum[a]?|-)\b/i.test(String(v).trim());
  const sug = S.P.filter(p => !cancelado(p) && !ja.has(p.id) && saudeResp(p) && !nada(saudeResp(p).medicacoes));
  const stTxt = { dado: ["ok", "Dado"], atrasado: ["bad", "Atrasado"], agora: ["wait", "Agora"], depois: ["", "Mais tarde"] };
  return `
  <div class="head"><div><h2>Remédios</h2><p>Quem toma remédio no horário certo durante o TOP. A equipe médica marca cada dose dada, e o app avisa no topo quando chega a hora ou atrasa.</p></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Doses hoje</span><span class="val num">${H.filter(d => d.dado).length}<small style="font-size:.5em;opacity:.7"> / ${H.length}</small></span><span class="sub">dadas</span></div>
    <div class="kpi ${H.some(d => d.st === "atrasado") ? "alert" : ""}"><span class="lbl">Atrasadas</span><span class="val num">${H.filter(d => d.st === "atrasado").length}</span><span class="sub">passou mais de 30 min</span></div>
    <div class="kpi"><span class="lbl">Pessoas</span><span class="val num">${ja.size}</span><span class="sub">com remédio na lista</span></div>
  </div>
  ${ed ? `<div class="actions" style="margin:4px 0 12px"><button class="btn primary" type="button" data-rem="">${ico("plus")} Adicionar remédio</button></div>` : ""}
  ${sug.length ? `<section class="panel apr-revisar"><h3>Da ficha de saúde <small>tomam remédio e ainda não têm horário</small></h3><div class="list">${sug.map(p => `<div class="li"><span class="grow"><b>${esc(p.nome)}</b><br><span class="hint">${esc(saudeResp(p).medicacoes)}</span></span>${ed ? `<button class="btn sm" type="button" data-rem-pid="${esc(p.id)}">Agendar</button>` : ""}</div>`).join("")}</div></section>` : ""}
  <section class="panel"><h3>Hoje <small>${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</small></h3>
    <div class="rem-lista">${H.map(d => `<div class="rem-li ${d.st}"><span class="rem-h num">${d.h}</span><span class="grow"><b>${esc(d.p.nome)}</b><br><span class="hint">💊 ${esc(d.r.remedio)}${d.r.obs ? " · " + esc(d.r.obs) : ""}</span>${d.dado ? `<br><small class="hint">dado por ${esc(d.dado.por)} às ${hmDe(d.dado.em)}</small>` : ""}</span>
      ${d.dado ? `<button type="button" class="chip ok" ${ed ? `data-rem-dose="${esc(d.k)}"` : ""} title="Desfazer">✓ Dado</button>` : `<span class="chip ${stTxt[d.st][0]}">${stTxt[d.st][1]}</span>${ed ? `<button class="btn sm ${d.st === "depois" ? "" : "primary"}" type="button" data-rem-dose="${esc(d.k)}">Dar</button>` : ""}`}</div>`).join("") || `<div class="empty">Nenhuma dose marcada para hoje.</div>`}</div></section>
  ${(D.lista || []).length ? `<section class="panel"><h3>Lista de remédios <small>${D.lista.length}</small></h3><div class="list">${D.lista.map(r => `<div class="li"><span class="grow"><b>${esc((S.P.find(x => x.id === r.pid) || {}).nome || r.nome || "?")}</b><br><span class="hint">${esc(r.remedio)} · ${(r.horarios || []).join(", ")}</span></span>${ed ? `<button class="icon-btn" type="button" data-rem="${esc(r.id)}" aria-label="Editar">${ico("edit")}</button>` : ""}</div>`).join("")}</div></section>` : ""}`;
}
function remForm(id, pid) {
  const D = remDoc(), r = (D.lista || []).find(x => x.id === id) || { pid: pid || "", horarios: ["08:00"] }, pessoas = S.P.filter(p => !cancelado(p)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  const ficha = r.pid && saudeResp(S.P.find(x => x.id === r.pid) || {}) ? saudeResp(S.P.find(x => x.id === r.pid)).medicacoes : "";
  modal(`<h3>${r.id ? "Editar remédio" : "Adicionar remédio"}</h3>
    <div class="form">
      <div class="field full"><label for="f-rp">Quem</label><select id="f-rp" name="pid" required><option value="">Escolha…</option>${pessoas.map(p => `<option value="${esc(p.id)}" ${r.pid === p.id ? "selected" : ""}>${esc(p.nome)}${p.tipo === "legendario" ? " (legendário)" : ""}</option>`).join("")}</select></div>
      ${ficha ? `<p class="hint full" style="margin:0">Na ficha de saúde: <b>${esc(ficha)}</b></p>` : ""}
      <div class="field full"><label for="f-rr">Remédio e dose</label><input id="f-rr" name="remedio" value="${esc(r.remedio || "")}" placeholder="ex.: Losartana 50 mg, 1 comprimido" required></div>
      <div class="field full"><label for="f-rh">Horários</label><input id="f-rh" name="horarios" value="${esc((r.horarios || []).join(", "))}" placeholder="ex.: 08:00, 20:00" required></div>
      <div class="field full"><label for="f-ro">Observação</label><input id="f-ro" name="obs" value="${esc(r.obs || "")}" placeholder="ex.: tomar com comida, está na farmácia da base"></div>
    </div>
    <div class="modal-foot"><div>${r.id ? `<button class="btn danger" type="button" id="remDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const hs = String(fd.get("horarios") || "").split(/[,;\s]+/).map(h => { const m = /^(\d{1,2})(?::|h)?(\d{2})?$/.exec(h.trim()); return m ? `${m[1].padStart(2, "0")}:${m[2] || "00"}` : null; }).filter(Boolean);
    if (!fd.get("pid") || !hs.length) { toast("Escolha a pessoa e pelo menos um horário (ex.: 08:00)."); return; }
    const novo = { id: r.id || Date.now().toString(36), pid: fd.get("pid"), remedio: String(fd.get("remedio") || "").trim(), horarios: [...new Set(hs)].sort(), obs: String(fd.get("obs") || "").trim() };
    closeModal(); remSalvar(D => ({ lista: [...(D.lista || []).filter(x => x.id !== novo.id), novo] }), "Remédio salvo");
  });
  const del = $("#remDel"); if (del) del.onclick = () => { closeModal(); remSalvar(D => ({ lista: (D.lista || []).filter(x => x.id !== r.id) }), "Excluído"); };
}

// ===== 4: EMERGÊNCIA =====  config emerg {contatos:[{nome,tel,papel}], hospitais:[{nome,tel,end,lat,lng,obs}], plano, encontro}
const emergDoc = () => cfgDe("emerg") || {};
const telLimpo = t => String(t || "").replace(/[^\d+]/g, "");
function vEmergencia() {
  const E = emergDoc(), ed = podeEditar();
  const fixo = [["SAMU", "192", "🚑"], ["Bombeiros", "193", "🚒"], ["Polícia", "190", "🚓"]];
  return `
  <div class="head"><div><h2>Emergência</h2><p>Tudo o que precisa numa hora difícil, em uma tela. Funciona sem internet: o app guarda no celular.</p></div></div>
  <div class="emg-fixos">${fixo.map(([n, t, e]) => `<a class="emg-btn" href="tel:${t}"><span>${e}</span><b>${n}</b><small class="num">${t}</small></a>`).join("")}</div>
  ${E.encontro ? `<section class="panel emg-encontro"><h3>📍 Ponto de encontro</h3><p>${esc(E.encontro)}</p></section>` : ""}
  <section class="panel"><h3>Equipe de emergência <small>${(E.contatos || []).length}</small>${ed ? ` <button class="linkbtn" type="button" data-act="emg-editar">editar ›</button>` : ""}</h3>
    <div class="list">${(E.contatos || []).map(c => `<div class="li"><span class="grow"><b>${esc(c.nome)}</b><br><span class="hint">${esc(c.papel || "")}${c.tel ? " · " + esc(c.tel) : ""}</span></span>${c.tel ? `<a class="btn sm primary" href="tel:${esc(telLimpo(c.tel))}">Ligar</a>${waNumber(c.tel) ? `<a class="btn sm cel-wa" href="https://wa.me/${waNumber(c.tel)}" target="_blank" rel="noopener">${ico("wa")}</a>` : ""}` : ""}</div>`).join("") || `<div class="empty">Cadastre o médico, o motorista do carro de apoio e o coordenador geral.</div>`}</div></section>
  <section class="panel"><h3>Hospitais e UPAs <small>${(E.hospitais || []).length}</small></h3>
    <div class="list">${(E.hospitais || []).map(h => `<div class="li"><span class="grow"><b>${esc(h.nome)}</b><br><span class="hint">${esc(h.end || "")}${h.obs ? " · " + esc(h.obs) : ""}</span></span>
      ${h.tel ? `<a class="btn sm" href="tel:${esc(telLimpo(h.tel))}">Ligar</a>` : ""}<a class="btn sm primary" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.lat && h.lng ? h.lat + "," + h.lng : h.end || h.nome)}" target="_blank" rel="noopener">Rota</a></div>`).join("") || `<div class="empty">Cadastre os hospitais mais próximos da pista.</div>`}</div></section>
  <section class="panel"><h3>Plano de emergência</h3>${E.plano ? `<div class="pt-licoes">${esc(E.plano).replace(/\n/g, "<br>")}</div>` : `<div class="empty">Escreva o passo a passo: quem decide, quem liga, por onde sai o carro.</div>`}</section>`;
}
function emergForm() {
  const E = emergDoc(), lin = (L, ks) => (L || []).map(o => ks.map(k => o[k] || "").join(" | ")).join("\n");
  modal(`<h3>Editar emergência</h3><p class="hint">Um por linha, separando com <b>|</b>.</p>
    <div class="field"><label>Equipe (nome | telefone | função)</label><textarea name="contatos" style="min-height:110px">${esc(lin(E.contatos, ["nome", "tel", "papel"]))}</textarea></div>
    <div class="field"><label>Hospitais (nome | telefone | endereço | observação)</label><textarea name="hospitais" style="min-height:110px">${esc(lin(E.hospitais, ["nome", "tel", "end", "obs"]))}</textarea></div>
    <div class="field"><label>Ponto de encontro</label><input name="encontro" value="${esc(E.encontro || "")}"></div>
    <div class="field"><label>Plano de emergência</label><textarea name="plano" style="min-height:140px">${esc(E.plano || "")}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const parse = (t, ks) => String(t || "").split("\n").map(l => l.split("|").map(s => s.trim())).filter(a => a[0]).map(a => Object.fromEntries(ks.map((k, i) => [k, a[i] || ""])));
    const hosp = parse(fd.get("hospitais"), ["nome", "tel", "end", "obs"]).map(h => { const v = (E.hospitais || []).find(x => x.nome === h.nome); return v && v.lat ? { ...h, lat: v.lat, lng: v.lng } : h; });
    closeModal(); save(() => api.set("config", "emerg", { contatos: parse(fd.get("contatos"), ["nome", "tel", "papel"]), hospitais: hosp, encontro: String(fd.get("encontro") || "").trim(), plano: String(fd.get("plano") || "").trim(), em: agoraISO(), por: ME.adm || "" }), "Emergência salva").then(render);
  });
}

// ===== 6: TRANSPORTE =====  config transp-<top> {veiculos:[{id,nome,motorista,tel,vagas,pessoas[]}], emb:{"ida|vid|pid":{em,por}}}
/* Transporte (demo, TOP2): ônibus por famílias e carros (os aprovados na página Carros) por legendários, na ida e na volta.
   config transp-<top> {onibus:[{id,num,empresa,motorista,tel,vagas,fam:{ida:[n],volta:[n]},vist:{em,por,lugares,itens:{k:"ok"|"prob"|"nao"},obs,fotos:[{foto,fotoPath}]}}],
   carros:{<carroId>:{ida:[pid],volta:[pid]}}, emb:{"ida|<vid>|<pid>":{por,em}}}  (vid = id do ônibus ou "car:<carroId>") */
const trDoc = () => cfgDe(`transp-${curTopId()}`) || {};
const trSalvar = (fn, msg) => { const D = trDoc(); return save(() => api.set("config", `transp-${curTopId()}`, { onibus: D.onibus || [], carros: D.carros || {}, emb: D.emb || {}, ...fn(D), top: curTopId() }), msg).then(render); };
const TR_VIST = ["Pneus", "Limpeza", "Bancos", "Cintos de segurança", "Ar-condicionado", "Banheiro", "Extintor", "Bagageiro", "Documentação do veículo"];
const TR_VST = { ok: ["OK", "ok"], prob: ["Problema", "bad"], nao: ["Não tem", ""] };
const trFams = () => [...new Set(S.P.filter(p => p.tipo !== "legendario" && !cancelado(p) && p.familia).map(p => Number(p.familia)))].sort((a, b) => a - b);
const trLgs = () => S.P.filter(p => p.tipo === "legendario" && !cancelado(p)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
const trCarros = () => (CARROS() ? carLista().filter(c => !carPend(c)) : []).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
const trOnib = () => (trDoc().onibus || []).slice().sort((a, b) => (+a.num || 99) - (+b.num || 99));
const trCap = o => +((o.vist || {}).lugares) || +o.vagas || 0;
const trBusPess = (o, sent) => ((o.fam || {})[sent] || []).flatMap(f => famDe(f));
const trCarPess = (cid, sent) => (((trDoc().carros || {})[cid] || {})[sent] || []).map(pid => S.P.find(p => p.id === pid)).filter(p => p && !cancelado(p));
const trAbas = aba => `<div class="seg campo-abas tr-abas"><button type="button" data-tr-aba="viagem" aria-pressed="${aba !== "carros"}">🚌 Ônibus e embarque</button><button type="button" data-tr-aba="carros" aria-pressed="${aba === "carros"}">🚗 Carros</button></div>`;
function vTransporte() {
  if (S.trAba === "carros" && CARROS()) return vCarros().replace("<h2>Carros</h2>", "<h2>Transporte</h2>").replace('\n  <div class="kpis">', trAbas("carros") + '\n  <div class="kpis">');
  return vTransporteViagem();
}
function vTransporteViagem() {
  const D = trDoc(), O = trOnib(), C = trCarros(), sent = S.trSent || "ida", E = D.emb || {}, ed = podeEditar(), ab = S.trAberto, q = norm(S.trQ || "");
  const famCom = new Set(O.flatMap(o => (o.fam || {})[sent] || [])), famSem = trFams().filter(f => !famCom.has(f));
  const lgCom = new Set(C.flatMap(c => ((D.carros || {})[c.id] || {})[sent] || [])), lgSem = trLgs().filter(p => !lgCom.has(p.id));
  const grupos = [...O.map(o => ({ vid: o.id, ps: trBusPess(o, sent) })), ...C.map(c => ({ vid: "car:" + c.id, ps: trCarPess(c.id, sent) }))];
  const embN = g => g.ps.filter(p => E[`${sent}|${g.vid}|${p.id}`]).length, tot = grupos.reduce((a, g) => a + g.ps.length, 0), totE = grupos.reduce((a, g) => a + embN(g), 0);
  const vistOk = O.filter(o => o.vist && o.vist.em).length, temVolta = O.some(o => ((o.fam || {}).volta || []).length) || Object.values(D.carros || {}).some(x => (x.volta || []).length);
  const lista = (vid, ps) => `<div class="tr-lista">${ps.filter(p => !q || norm(p.nome).includes(q)).map(p => { const k = `${sent}|${vid}|${p.id}`, ok = E[k];
      return `<button type="button" class="tr-p ${ok ? "on" : ""}" ${ed ? `data-tr-emb="${esc(k)}"` : "disabled"}><span class="cham-box">${ico("check")}</span><span class="grow">${esc(p.nome)}${p.familia && p.tipo !== "legendario" ? ` <small>F${String(p.familia).padStart(2, "0")}</small>` : ""}</span>${ok ? `<small>${hmDe(ok.em)}</small>` : ""}</button>`; }).join("") || `<div class="empty">Ninguém neste veículo ${sent === "ida" ? "na ida" : "na volta"}.</div>`}</div>`;
  const busCard = o => { const ps = trBusPess(o, sent), cap = trCap(o), e = embN({ vid: o.id, ps }), v = o.vist || {}, fs = (o.fam || {})[sent] || [], probs = Object.values(v.itens || {}).filter(x => x === "prob").length;
    return `<section class="panel tr-card ${ps.length && e === ps.length ? "completo" : ""}">
      <button type="button" class="tr-cab" data-tr-abrir="${esc(o.id)}"><span class="tr-ic">🚌</span><span class="grow"><b>Ônibus ${esc(o.num || "?")}${o.empresa ? " · " + esc(o.empresa) : ""}</b><small>${esc(o.motorista || "sem motorista")} · ${ps.length}/${cap || "?"} lugares</small></span><span class="tr-n num">${e}/${ps.length}</span></button>
      <div class="bar ${cap && ps.length > cap ? "bad" : "good"}"><i style="width:${cap ? Math.min(100, pct(ps.length, cap)) : 0}%"></i></div>
      <div class="car-chips" style="margin-top:8px">${v.em ? `<span class="chip ${probs ? "bad" : "ok"}">Vistoriado${probs ? ` · ${probs} problema(s)` : " ✓"}</span>` : `<span class="chip wait">Falta vistoria</span>`}${cap && ps.length > cap ? `<span class="chip bad">passou ${ps.length - cap} da lotação</span>` : ""}${fs.map(f => `<span class="chip">F${String(f).padStart(2, "0")}</span>`).join("")}</div>
      ${ab === o.id ? lista(o.id, ps) : ""}
      <div class="actions" style="margin-top:8px">${ed ? `<button class="btn sm primary" type="button" data-tr-fam="${esc(o.id)}">Famílias</button><button class="btn sm" type="button" data-tr-vist="${esc(o.id)}">Vistoria</button><button class="btn sm" type="button" data-tr-v="${esc(o.id)}">${ico("edit")}</button>` : `<button class="btn sm" type="button" data-tr-vist="${esc(o.id)}">Vistoria</button>`}${o.tel ? `<a class="btn sm" href="tel:${esc(telLimpo(o.tel))}">Ligar</a>` : ""}</div></section>`; };
  const carCard = c => { const vid = "car:" + c.id, ps = trCarPess(c.id, sent), cap = +c.vagas || 0, e = embN({ vid, ps });
    return `<section class="panel tr-card ${ps.length && e === ps.length ? "completo" : ""}">
      <button type="button" class="tr-cab" data-tr-abrir="${esc(vid)}"><span class="tr-ic">🚗</span><span class="grow"><b>${esc(carPlaca(c.placa))}${c.modelo ? " · " + esc(c.modelo) : ""}</b><small>${esc(c.nome || "")}${c.funcao ? " · " + esc(c.funcao) : ""} · ${ps.length}/${cap || "?"} lugares</small></span><span class="tr-n num">${e}/${ps.length}</span></button>
      <div class="bar ${cap && ps.length > cap ? "bad" : "good"}"><i style="width:${cap ? Math.min(100, pct(ps.length, cap)) : 0}%"></i></div>
      ${ab === vid ? lista(vid, ps) : ""}
      <div class="actions" style="margin-top:8px">${ed ? `<button class="btn sm primary" type="button" data-tr-lg="${esc(c.id)}">Quem vai</button>` : ""}${waNumber(c.tel) ? `<a class="btn sm" href="https://wa.me/${waNumber(c.tel)}" target="_blank" rel="noopener">${ico("wa")}</a>` : ""}</div></section>`; };
  return `
  <div class="head"><div><h2>Transporte</h2><p>Os ônibus levam as famílias e os carros levam os legendários. Monte a ida, copie para a volta e, na hora de sair, confira o embarque de cada um.</p></div>
    <div class="actions">${ed ? `<button class="btn primary" type="button" data-tr-v="">${ico("plus")} Ônibus</button>${CARROS() ? `<button class="btn primary" type="button" data-car="">${ico("plus")} Carros</button>` : ""}${sent === "volta" ? `<button class="btn" type="button" data-act="tr-copiar">Volta igual à ida</button>` : ""}` : ""}</div></div>
  ${CARROS() ? trAbas("viagem") : ""}
  <div class="seg campo-abas"><button type="button" data-tr-sent="ida" aria-pressed="${sent === "ida"}">Ida</button><button type="button" data-tr-sent="volta" aria-pressed="${sent === "volta"}">Volta</button></div>
  ${sent === "volta" && !temVolta && (O.length || C.length) ? `<div class="banner"><span>A volta ainda está vazia. Toque em <b>Volta igual à ida</b> para copiar tudo e depois ajuste quem mudou.</span></div>` : ""}
  <div class="kpis">
    <div class="kpi"><span class="lbl">Embarcados (${sent})</span><span class="val num">${totE}<small style="font-size:.5em;opacity:.7"> / ${tot}</small></span><div class="bar good"><i style="width:${pct(totE, tot)}%"></i></div></div>
    <div class="kpi ${O.length && vistOk < O.length ? "alert" : ""}"><span class="lbl">Ônibus</span><span class="val num">${O.length}</span><span class="sub">${vistOk} vistoriado(s) · ${O.reduce((a, o) => a + trCap(o), 0)} lugares</span></div>
    <div class="kpi"><span class="lbl">Carros</span><span class="val num">${C.length}</span><span class="sub">aprovados em Carros</span></div>
    <div class="kpi ${famSem.length || lgSem.length ? "alert" : ""}"><span class="lbl">Sem lugar (${sent})</span><span class="val num">${famSem.length + lgSem.length}</span><span class="sub">${famSem.length} família(s) · ${lgSem.length} legendário(s)</span></div>
  </div>
  ${ab ? `<div class="cel-busca"><input id="trQ" type="search" placeholder="Buscar pessoa no embarque…" value="${esc(S.trQ || "")}" aria-label="Buscar"></div>` : ""}
  <section class="tr-sec"><h3 class="tr-h">Ônibus <small>famílias</small></h3><div class="tr-grid">${O.map(busCard).join("") || `<section class="panel"><div class="empty">Cadastre os ônibus (1, 2, 3…) e faça a vistoria de cada um.</div></section>`}</div></section>
  <section class="tr-sec"><h3 class="tr-h">Carros <small>legendários</small></h3><div class="tr-grid">${C.map(carCard).join("") || `<section class="panel"><div class="empty">Nenhum carro aprovado. Os carros cadastrados e aprovados na página <b>Carros</b> aparecem aqui.</div></section>`}</div></section>
  ${famSem.length || lgSem.length ? `<section class="panel"><h3>Sem lugar ${sent === "ida" ? "na ida" : "na volta"}</h3>
    ${famSem.length ? `<p class="hint"><b>Famílias sem ônibus:</b> ${famSem.map(f => `${famTxt(f)} (${famDe(f).length})`).join(", ")}</p>` : ""}
    ${lgSem.length ? `<p class="hint"><b>Legendários sem carro:</b> ${lgSem.map(p => esc(p.nome)).join(", ")}</p>` : ""}</section>` : ""}`;
}
function trVeicForm(id) {
  const D = trDoc(), O = D.onibus || [], o = O.find(x => x.id === id) || { num: O.length + 1, vagas: 44 };
  modal(`<h3>${o.id ? "Editar ônibus" : "Novo ônibus"}</h3><div class="form">
    <div class="field"><label for="f-on">Número do ônibus</label><input id="f-on" name="num" type="number" min="1" value="${esc(o.num || "")}" required></div>
    <div class="field"><label for="f-ov">Lugares</label><input id="f-ov" name="vagas" type="number" min="1" value="${esc(o.vagas || "")}"></div>
    <div class="field full"><label for="f-oe">Empresa</label><input id="f-oe" name="empresa" value="${esc(o.empresa || "")}"></div>
    <div class="field"><label for="f-om">Motorista</label><input id="f-om" name="motorista" value="${esc(o.motorista || "")}"></div>
    <div class="field"><label for="f-ot">Telefone</label><input id="f-ot" name="tel" inputmode="tel" value="${esc(o.tel || "")}"></div></div>
    <div class="modal-foot"><div>${o.id ? `<button class="btn danger" type="button" id="vDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const g = k => String(fd.get(k) || "").trim(), novo = { ...o, id: o.id || "o" + Date.now().toString(36), num: +g("num") || "", vagas: +g("vagas") || 0, empresa: g("empresa"), motorista: g("motorista"), tel: g("tel"), fam: o.fam || { ida: [], volta: [] } };
    closeModal(); trSalvar(D => ({ onibus: [...(D.onibus || []).filter(x => x.id !== novo.id), novo] }), "Ônibus salvo"); });
  const d = $("#vDel"); if (d) d.onclick = () => { if (!confirm(`Excluir o Ônibus ${o.num}?`)) return; closeModal(); trSalvar(D => ({ onibus: (D.onibus || []).filter(x => x.id !== o.id) }), "Excluído"); };
}
function trVistForm(id) {
  const o = (trDoc().onibus || []).find(x => x.id === id); if (!o) return; const v = o.vist || {}, it = v.itens || {}, ed = podeEditar(), fotos = [...(v.fotos || [])], novas = [];
  const fotosHtml = () => fotos.map((f, i) => `<span class="tr-vf">${celFotoSrc(f) ? `<img src="${esc(celFotoSrc(f))}" alt="">` : "📷"}${ed ? `<button type="button" class="tr-vx" data-i="${i}" aria-label="Tirar foto">×</button>` : ""}</span>`).join("");
  modal(`<h3>Vistoria · Ônibus ${esc(o.num)}</h3>${v.em ? `<p class="hint" style="margin:0">Última vistoria por ${esc(v.por || "")} · ${esc(quando(v.em))}</p>` : ""}
    <div class="field"><span class="lab">Fotos do ônibus</span><div class="tr-vfotos" id="trFotos">${fotosHtml()}</div>${ed ? `<label class="btn sm" style="margin-top:6px">${ico("upload")} Adicionar foto<input type="file" accept="image/*" capture="environment" id="trFotoArq" hidden multiple></label>` : ""}</div>
    <div class="field"><label for="f-vl">Lugares contados</label><input id="f-vl" name="lugares" type="number" min="1" value="${esc(v.lugares || o.vagas || "")}" ${ed ? "" : "disabled"}></div>
    <div class="field"><span class="lab">Condições</span><div class="tr-vlista">${TR_VIST.map((k, i) => `<div class="tr-vi"><span class="grow">${esc(k)}</span><span class="sn3">${Object.entries(TR_VST).map(([val, [l, c]]) => `<label><input type="radio" name="i${i}" value="${val}" ${it[k] === val ? "checked" : ""} ${ed ? "" : "disabled"}><span class="${c}">${l}</span></label>`).join("")}</span></div>`).join("")}</div></div>
    <div class="field"><label for="f-vo">Observações</label><textarea id="f-vo" name="obs" placeholder="ex.: um banco quebrado no fundo, ar fraco" ${ed ? "" : "disabled"}>${esc(v.obs || "")}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>${ed ? "Cancelar" : "Fechar"}</button>${ed ? `<button class="btn primary" type="submit">Salvar vistoria</button>` : ""}</div></div>`, async fd => {
    if (!ed) return closeModal(); const itens = {}; TR_VIST.forEach((k, i) => { const x = fd.get("i" + i); if (x) itens[k] = x; });
    const falta = TR_VIST.filter(k => !itens[k]); if (falta.length && !confirm(`Falta marcar: ${falta.join(", ")}. Salvar mesmo assim?`)) return;
    closeModal(); if (novas.length) toast("Salvando as fotos…");
    const subidas = []; for (const fl of novas) { try { subidas.push(await fotoGuardar(fl, `transporte/${curTopId()}/${o.id}`)); } catch {} }
    const vist = { em: agoraISO(), por: ME.adm || "", lugares: +fd.get("lugares") || "", itens, obs: String(fd.get("obs") || "").trim(), fotos: [...fotos.filter(f => !f._nova), ...subidas] };
    trSalvar(D => ({ onibus: (D.onibus || []).map(x => x.id === o.id ? { ...x, vist } : x) }), "Vistoria salva");
  });
  const box = $("#trFotos"), arq = $("#trFotoArq");
  if (box) box.addEventListener("click", e => { const b = e.target.closest(".tr-vx"); if (!b) return; const i = +b.dataset.i, f = fotos[i]; if (f && f._nova) novas.splice(novas.indexOf(f._arq), 1); fotos.splice(i, 1); box.innerHTML = fotosHtml(); });
  if (arq) arq.addEventListener("change", async e => { for (const fl of [...e.target.files]) { try { fotos.push({ foto: await reduzirFoto(fl, 360), _nova: true, _arq: fl }); novas.push(fl); } catch {} } box.innerHTML = fotosHtml(); arq.value = ""; });
}
function trFamForm(id) {
  const sent = S.trSent || "ida", O = trDoc().onibus || [], o = O.find(x => x.id === id); if (!o) return; const cap = trCap(o);
  const outro = f => O.find(x => x.id !== id && ((x.fam || {})[sent] || []).includes(f)), fams = trFams(), atual = (o.fam || {})[sent] || [];
  modal(`<h3>Famílias no Ônibus ${esc(o.num)} · ${sent}</h3><p class="hint" id="trConta"></p>
    <div class="cham-lista" style="max-height:56vh">${fams.map(f => { const x = outro(f); return `<label class="cham-p"><input type="checkbox" name="f" value="${f}" data-n="${famDe(f).length}" ${atual.includes(f) ? "checked" : ""}><span class="cham-box">${ico("check")}</span><span class="grow"><b>${famTxt(f)}</b> <small class="hint">${famDe(f).length} pessoa(s)${x ? ` · hoje no Ônibus ${esc(x.num)}` : ""}</small></span></label>`; }).join("") || `<div class="empty">Nenhuma família montada ainda. Defina as famílias na página Famílias.</div>`}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const sel = fd.getAll("f").map(Number); closeModal();
    trSalvar(D => ({ onibus: (D.onibus || []).map(x => { const fm = { ida: [], volta: [], ...(x.fam || {}) }; fm[sent] = x.id === id ? sel : (fm[sent] || []).filter(f => !sel.includes(f)); return { ...x, fam: fm }; }) }), "Famílias salvas"); });
  const c = () => { const n = [...$("#mform").querySelectorAll("[name=f]:checked")].reduce((a, i) => a + +i.dataset.n, 0); $("#trConta").innerHTML = `<b>${n}</b> pessoa(s) de ${cap || "?"} lugares${cap && n > cap ? ' · <span class="bad-text">passou da lotação</span>' : ""}`; };
  $("#mform").addEventListener("change", c); c();
}
function trLgForm(cid) {
  const sent = S.trSent || "ida", C = trCarros(), c = C.find(x => x.id === cid); if (!c) return; const M = trDoc().carros || {}, atual = (M[cid] || {})[sent] || [];
  const outro = pid => C.find(x => x.id !== cid && ((M[x.id] || {})[sent] || []).includes(pid));
  modal(`<h3>Quem vai no ${esc(carPlaca(c.placa))} · ${sent}</h3><p class="hint" id="trConta"></p>
    <div class="cham-lista" style="max-height:56vh">${trLgs().map(p => { const x = outro(p.id); return `<label class="cham-p"><input type="checkbox" name="p" value="${esc(p.id)}" ${atual.includes(p.id) ? "checked" : ""}><span class="cham-box">${ico("check")}</span><span class="grow">${esc(p.nome)}${p.equipe ? ` <span class="tag">${esc(p.equipe)}</span>` : ""}${x ? ` <small class="hint">· hoje no ${esc(carPlaca(x.placa))}</small>` : ""}</span></label>`; }).join("")}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const sel = fd.getAll("p"); closeModal();
    trSalvar(D => { const N = {}; Object.entries(D.carros || {}).forEach(([k, v]) => { N[k] = { ida: [], volta: [], ...v, [sent]: ((v || {})[sent] || []).filter(pid => !sel.includes(pid)) }; }); N[cid] = { ida: [], volta: [], ...(N[cid] || {}), [sent]: sel }; return { carros: N }; }, "Lista salva"); });
  const n = () => { const k = $("#mform").querySelectorAll("[name=p]:checked").length; $("#trConta").innerHTML = `<b>${k}</b> de ${c.vagas || "?"} lugares${c.vagas && k > c.vagas ? ' · <span class="bad-text">passou da lotação</span>' : ""}`; };
  $("#mform").addEventListener("change", n); n();
}
function trCopiarVolta() {
  const D = trDoc(), tem = (D.onibus || []).some(o => ((o.fam || {}).volta || []).length) || Object.values(D.carros || {}).some(x => (x.volta || []).length);
  if (tem && !confirm("A volta já tem pessoas distribuídas. Trocar tudo pelo que está na ida?")) return;
  trSalvar(D => ({ onibus: (D.onibus || []).map(o => ({ ...o, fam: { ...(o.fam || {}), volta: [...((o.fam || {}).ida || [])] } })),
    carros: Object.fromEntries(Object.entries(D.carros || {}).map(([k, v]) => [k, { ...v, volta: [...((v || {}).ida || [])] }])) }), "Volta igual à ida");
}
/* ---------- CARROS: todos os veículos que vão ao TOP (app real desde 31/10/2026) ----------
   config carros-<top> {token, lista:[{id,nome,tel,modelo,cor,placa,vagas,funcao,local,obs,foto,fotoPlaca,origem:"adm"|"link",conferido,em,chegou,saiu}]}
   Link do proprietário: carro.html?t=<token>&top=<top>. No app real o formulário chama a função adm_carro_enviar (supabase/carros.sql),
   que grava cada carro em config/carlink-<top>-<id>; na demo guarda no próprio aparelho (localStorage "adm3-carros-link").
   Fotos que a ADM tira vão para o Storage (fotoPath/placaPath); as que vêm pelo link ficam no carlink, sem copiar para a lista. */
const CARROS = () => true;
const CAR_FUNC = [...EQUIPES, "Ambulância"];   // as áreas das equipes dos legendários e ambulância
const CAR_LS = "adm3-carros-link";
const carId = () => `carros-${curTopId()}`;
const carDoc = () => cfgDe(carId()) || {};
const carDoLink = () => { try { return (JSON.parse(localStorage.getItem(CAR_LS) || "[]") || []).filter(c => c && c.id && (c.top || curTopId()) === curTopId()); } catch { return []; } };
const carLinkDocs = () => DEMO ? carDoLink() : Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(`carlink-${curTopId()}-`)).map(([k, d]) => ({ ...d, id: k }));
const carLista = () => { const D = carDoc(), L = D.lista || [], ids = new Set(L.map(c => c.id)), fora = new Set(D.apagados || []), lk = carLinkDocs(), porId = Object.fromEntries(lk.map(c => [c.id, c]));
  const comFoto = c => { const b = porId[c.id]; return b ? { ...c, foto: c.foto || c.fotoPath ? c.foto : b.foto || "", fotoPlaca: c.fotoPlaca || c.placaPath ? c.fotoPlaca : b.fotoPlaca || "" } : c; };
  return [...L.map(comFoto), ...lk.filter(c => !ids.has(c.id) && !fora.has(c.id)).map(({ token, ...c }) => ({ ...c, origem: "link" }))]; };
// na lista principal não repete a foto que já está no cadastro feito pelo link
const carEnxuga = L => { const lk = Object.fromEntries(carLinkDocs().map(c => [c.id, c])); return L.map(({ token, top, ...c }) => { const b = lk[c.id]; if (b) { if (c.foto && c.foto === b.foto) c.foto = ""; if (c.fotoPlaca && c.fotoPlaca === b.fotoPlaca) c.fotoPlaca = ""; } return c; }); };
const carImg = (c, placa) => celFotoSrc(placa ? { foto: c.fotoPlaca, fotoPath: c.placaPath } : { foto: c.foto, fotoPath: c.fotoPath });
const carSt = c => c.saiu ? "saiu" : c.chegou ? "dentro" : "espera";
const CAR_ST = { espera: ["Aguardando", "wait"], dentro: ["No TOP", "ok"], saiu: ["Saiu", ""] };
const carPlaca = p => String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^([A-Z]{3})(\d[A-Z0-9]\d{2})$/, "$1-$2");
const carSalvar = (fn, msg) => { const D = carDoc(), out = { token: D.token || "", lista: carLista(), apagados: D.apagados || [], ...fn({ ...D, lista: carLista() }), top: curTopId() };
  out.lista = carEnxuga(out.lista); return save(() => api.set("config", carId(), out), msg).then(render); };
const carLink = () => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}carro.html?t=${encodeURIComponent(carDoc().token || "")}&top=${encodeURIComponent(curTopId())}${DEMO ? "&demo=1" : ""}`;
const carTexto = () => `Olá! Aqui é ${ME.adm ? ME.adm.split(" ")[0] + ", " : ""}da equipe ADM do ${topName()}.\n\nVocê vai levar um veículo ao TOP. Cadastre ele pelo link abaixo (leva 2 minutos, com foto do carro e da placa):\n${carLink()}`;
const carPend = c => c.origem === "link" && !c.conferido;   // chegou pelo link e ainda não foi aprovado por um ADM
function vCarros() {
  const T = carLista(), ed = podeEditar(), q = norm(S.carQ || ""), f = S.carF || "";
  const pend = T.filter(carPend), L = T.filter(c => !carPend(c)), n = st => L.filter(c => carSt(c) === st).length;
  const V = L.filter(c => (!f || c.funcao === f) && (!q || [c.nome, c.placa, carPlaca(c.placa), c.modelo, c.cor].some(x => norm(x || "").includes(q)))).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  const funcs = CAR_FUNC.filter(x => L.some(c => c.funcao === x));
  const cab = c => `<button type="button" class="car-cab" data-car-ver="${esc(c.id)}">
        <span class="car-foto">${carImg(c) ? `<img src="${esc(carImg(c))}" alt="">` : ico("car")}</span>
        <span class="grow"><b class="car-placa num">${esc(carPlaca(c.placa) || "SEM PLACA")}</b><span class="car-mod">${esc([c.modelo, c.cor].filter(Boolean).join(" · "))}</span>
          <small>${esc(c.nome || "")}${c.funcao ? " · " + esc(c.funcao) : ""}</small></span></button>`;
  const wa = c => waNumber(c.tel) ? `<a class="btn sm" href="https://wa.me/${waNumber(c.tel)}" target="_blank" rel="noopener">${ico("wa")} WhatsApp</a>` : "";
  return `
  <div class="head"><div><h2>Carros</h2><p>Todos os veículos que vão ao TOP: de quem é, telefone, modelo, placa e foto. Mande o link e o próprio dono cadastra o carro; ele só entra na lista depois que um ADM aprovar.</p></div>
    <div class="actions">${ed ? `<button class="btn primary" type="button" data-car="">${ico("plus")} Cadastrar carro</button><button class="btn" type="button" data-act="car-link">${ico("wa")} Link para o dono</button>` : ""}</div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Aprovados</span><span class="val num">${L.length}</span><span class="sub">${L.reduce((a, c) => a + (+c.vagas || 0), 0)} lugares</span></div>
    <div class="kpi"><span class="lbl">No TOP agora</span><span class="val num">${n("dentro")}</span><span class="sub">chegaram e não saíram</span></div>
    <div class="kpi"><span class="lbl">Saíram</span><span class="val num">${n("saiu")}</span><span class="sub">${n("espera")} ainda não chegaram</span></div>
    <div class="kpi ${pend.length ? "alert" : ""}"><span class="lbl">Para aprovar</span><span class="val num">${pend.length}</span><span class="sub">${pend.length ? "cadastrados pelo link" : "nada esperando"}</span></div>
  </div>
  ${pend.length ? `<section class="panel car-pend"><h3>Para aprovar <small>${pend.length}</small></h3><p class="hint">Cadastrados pelo dono, pelo link. Confira os dados e as fotos: só depois de aprovado o carro entra na lista.</p>
    <div class="car-grid">${pend.map(c => `<section class="panel car-card novo">${cab(c)}
      <div class="car-chips"><span class="chip wait">Aguardando aprovação</span>${c.vagas ? `<span class="chip">${esc(c.vagas)} lugares</span>` : ""}${c.em ? `<span class="chip">${esc(quando(c.em))}</span>` : ""}</div>
      ${c.obs ? `<p class="hint" style="margin:0">${esc(c.obs)}</p>` : ""}
      <div class="actions">${wa(c)}${ed ? `<button class="btn sm danger" type="button" data-car-nao="${esc(c.id)}">Recusar</button><button class="btn sm primary" type="button" data-car-ok="${esc(c.id)}">${ico("check")} Aprovar</button>` : ""}</div></section>`).join("")}</div></section>` : ""}
  <div class="cel-busca"><input id="carQ" type="search" placeholder="Buscar por placa, nome ou modelo…" value="${esc(S.carQ || "")}" aria-label="Buscar carro"></div>
  ${funcs.length > 1 || f ? `<div class="seg campo-abas car-f"><button type="button" data-car-f="" aria-pressed="${!f}">Todos</button>${funcs.map(x => `<button type="button" data-car-f="${esc(x)}" aria-pressed="${f === x}">${esc(x)}</button>`).join("")}</div>` : ""}
  <div class="car-grid">${V.map(c => { const st = carSt(c), [stl, stc] = CAR_ST[st];
    return `<section class="panel car-card ${st}">${cab(c)}
      <div class="car-chips"><span class="chip ${stc}">${stl}${c.chegou && !c.saiu ? " " + hmDe(c.chegou) : c.saiu ? " " + hmDe(c.saiu) : ""}</span>${c.origem === "link" ? `<span class="chip">pelo link</span>` : ""}${c.vagas ? `<span class="chip">${esc(c.vagas)} lugares</span>` : ""}${c.local ? `<span class="chip">${esc(c.local)}</span>` : ""}</div>
      <div class="actions">${wa(c)}${ed ? (st === "dentro" ? `<button class="btn sm" type="button" data-car-st="${esc(c.id)}|saiu">Saiu</button>` : `<button class="btn sm primary" type="button" data-car-st="${esc(c.id)}|chegou">Chegou</button>`) : ""}</div></section>`; }).join("")}</div>
  ${!V.length ? `<section class="panel"><div class="empty">${L.length ? "Nenhum carro com essa busca." : pend.length ? "Nenhum carro aprovado ainda." : "Nenhum carro ainda. Cadastre aqui ou mande o link para o dono do carro."}</div></section>` : ""}`;
}
function carVer(id) {
  const c = carLista().find(x => x.id === id); if (!c) return; const ed = podeEditar(), dt = s => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  modal(`<h3>${esc(carPlaca(c.placa) || "Carro")} <small class="hint">${esc([c.modelo, c.cor].filter(Boolean).join(" · "))}</small></h3>
    <div class="car-fotos">${carImg(c) ? `<img src="${esc(carImg(c))}" alt="Foto do carro">` : ""}${carImg(c, 1) ? `<img src="${esc(carImg(c, 1))}" alt="Foto da placa">` : ""}</div>
    <div class="list">
      <div class="li"><span class="grow"><b>${esc(c.nome || "—")}</b><br><span class="hint">${esc(c.tel || "sem telefone")}</span></span>${c.tel ? `<a class="btn sm" href="tel:${esc(telLimpo(c.tel))}">Ligar</a>` : ""}${waNumber(c.tel) ? `<a class="btn sm" href="https://wa.me/${waNumber(c.tel)}" target="_blank" rel="noopener">${ico("wa")}</a>` : ""}</div>
      <div class="li"><span class="grow">Função</span><b>${esc(c.funcao || "—")}</b></div>
      <div class="li"><span class="grow">Lugares</span><b>${esc(c.vagas || "—")}</b></div>
      <div class="li"><span class="grow">Onde fica estacionado</span><b>${esc(c.local || "—")}</b></div>
      <div class="li"><span class="grow">Chegou · Saiu</span><b>${dt(c.chegou)} · ${dt(c.saiu)}</b></div>
      ${c.obs ? `<div class="li"><span class="grow">${esc(c.obs)}</span></div>` : ""}
      <div class="li"><span class="grow hint">${c.origem === "link" ? "Cadastrado pelo dono, pelo link" : "Cadastrado pela ADM"}${c.em ? " em " + dt(c.em) : ""}</span></div></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button>${ed ? `<button class="btn" type="button" data-car="${esc(c.id)}">${ico("edit")} Editar</button>` : ""}${ed && carPend(c) ? `<button class="btn primary" type="button" data-car-ok="${esc(c.id)}">${ico("check")} Aprovar</button>` : ""}</div></div>`, () => closeModal());
}
function carForm(id) {
  const c = carLista().find(x => x.id === id) || { funcao: "" }, arq = {};
  const fotoCampo = (k, l, v) => `<div class="field"><span class="lab">${l}</span><label class="btn car-up"><img id="${k}Prev" src="${esc(v)}" ${v ? "" : "hidden"} alt=""><span>${ico("upload")} ${v ? "Trocar" : "Tirar foto"}</span><input type="file" accept="image/*" capture="environment" id="${k}Arq" hidden></label></div>`;
  modal(`<h3>${c.id ? "Editar carro" : "Cadastrar carro"}</h3><div class="form">
    <div class="field full"><label for="f-cn">Nome do dono ou motorista</label><input id="f-cn" name="nome" value="${esc(c.nome || "")}" list="carPessoas" required autocomplete="off"><datalist id="carPessoas">${S.P.filter(p => !cancelado(p)).map(p => `<option value="${esc(p.nome)}">`).join("")}</datalist></div>
    <div class="field"><label for="f-ct">Telefone / WhatsApp</label><input id="f-ct" name="tel" inputmode="tel" value="${esc(c.tel || "")}" placeholder="(16) 99999-0000"></div>
    <div class="field"><label for="f-cp">Placa</label><input id="f-cp" name="placa" value="${esc(carPlaca(c.placa))}" placeholder="ABC-1D23" style="text-transform:uppercase" required></div>
    <div class="field"><label for="f-cm">Modelo</label><input id="f-cm" name="modelo" value="${esc(c.modelo || "")}" placeholder="ex.: Hilux, Gol, Sprinter"></div>
    <div class="field"><label for="f-cc">Cor</label><input id="f-cc" name="cor" value="${esc(c.cor || "")}"></div>
    <div class="field"><label for="f-cf">Função</label><select id="f-cf" name="funcao" required><option value="">Selecione</option>${(c.funcao && !CAR_FUNC.includes(c.funcao) ? [c.funcao, ...CAR_FUNC] : CAR_FUNC).map(x => `<option ${c.funcao === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
    <div class="field"><label for="f-cv">Lugares</label><input id="f-cv" name="vagas" type="number" min="1" max="60" value="${esc(c.vagas || "")}"></div>
    <div class="field full"><label for="f-cl">Onde fica estacionado</label><input id="f-cl" name="local" value="${esc(c.local || "")}" placeholder="ex.: estacionamento da base, portaria"></div>
    ${fotoCampo("carF", "Foto do carro", carImg(c))}${fotoCampo("carP", "Foto da placa", carImg(c, 1))}
    <div class="field full"><label for="f-co">Observação</label><input id="f-co" name="obs" value="${esc(c.obs || "")}"></div></div>
    <div class="modal-foot"><div>${c.id ? `<button class="btn danger" type="button" id="carDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const g = k => String(fd.get(k) || "").trim();
    if (!g("nome") || !g("placa") || !g("funcao")) { toast("Preencha o nome, a placa e a função."); return; }
    const novo = { ...c, id: c.id || "car" + Date.now().toString(36), nome: g("nome"), tel: g("tel"), placa: carPlaca(g("placa")), modelo: g("modelo"), cor: g("cor"), funcao: g("funcao"), vagas: +g("vagas") || "", local: g("local"), obs: g("obs"), origem: c.origem || "adm", em: c.em || new Date().toISOString(), por: c.por || ME.adm || "" };
    if (novo.origem === "link") novo.conferido = true;
    closeModal(); (async () => {
      if (arq.carF || arq.carP) toast("Salvando as fotos…");
      try { if (arq.carF) { const f = await fotoGuardar(arq.carF, `carros/${curTopId()}/${novo.id}`); novo.foto = f.foto; novo.fotoPath = f.fotoPath; }
        if (arq.carP) { const f = await fotoGuardar(arq.carP, `carros/${curTopId()}/${novo.id}-placa`); novo.fotoPlaca = f.foto; novo.placaPath = f.fotoPath; } } catch { toast("Não consegui salvar a foto."); }
      carSalvar(D => ({ lista: [...D.lista.filter(x => x.id !== novo.id), novo] }), "Carro salvo"); })();
  });
  ["carF", "carP"].forEach(k => $("#" + k + "Arq").addEventListener("change", async e => { const fl = e.target.files[0]; if (!fl) return;
    try { const u = await reduzirFoto(fl, 700); arq[k] = fl; $("#" + k + "Prev").src = u; $("#" + k + "Prev").hidden = false; } catch { toast("Não consegui abrir a foto."); } }));
  const d = $("#carDel"); if (d) d.onclick = () => { if (!confirm("Excluir o carro " + carPlaca(c.placa) + "?")) return; closeModal();
    carSalvar(D => ({ lista: D.lista.filter(x => x.id !== c.id), apagados: [...(D.apagados || []), c.id] }), "Carro excluído")
      .then(() => { if (!DEMO && c.id.startsWith("carlink-")) api.remove("config", c.id).catch(() => {}); }); };
}
function carLinkForm() {
  const D = carDoc(); const abrir = () => {
    modal(`<h3>Link para o dono do carro</h3><p class="hint">Mande este link para quem vai levar um veículo ao TOP. Ele preenche nome, telefone, modelo, placa, função e as fotos, e o carro aparece aqui na hora, marcado como <b>Novo · pelo link</b> para você conferir.</p>
      <div class="field"><input readonly value="${esc(carLink())}" id="carLinkTxt" onfocus="this.select()"></div>
      ${DEMO ? `<p class="hint">Na demonstração o cadastro fica guardado só neste aparelho: abra o link aqui mesmo para testar.</p>` : ""}
      <div class="modal-foot"><span></span><div class="actions"><button class="btn" type="button" id="carCopiar">Copiar</button><a class="btn" href="${esc(carLink())}" target="_blank" rel="noopener">Abrir</a><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(carTexto())}" target="_blank" rel="noopener">${ico("wa")} Enviar no WhatsApp</a></div></div>`, () => closeModal());
    $("#carCopiar").onclick = () => copiarTexto(carLink(), "Link copiado"); };
  if (D.token) abrir(); else carSalvar(() => ({ token: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4) })).then(abrir);
}
document.addEventListener("input", e => { if (e.target && e.target.id === "carQ") { S.carQ = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#carQ"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } });
window.addEventListener("storage", e => { if (e.key === CAR_LS && (S.view === "carros" || S.view === "transporte" && S.trAba === "carros") && !$("#modalRoot").innerHTML) render(); });

/* ---------- COMUNICADOS (app real desde 01/11/2026): mensagem para senderistas e legendários pelo WhatsApp, uma pessoa por vez ----------
   O WhatsApp não deixa disparar para todos de uma vez pelo número pessoal: o app abre a conversa de cada um com a mensagem pronta.
   config comunicados-<top> {envios:[{id, msg, em, por, ids:[pid], feitos:{pid: iso}, pulados:[pid]}]}; rascunho no aparelho (adm3-comunicado). */
const COMUNICADOS = () => true;   // liberado no app real em 01/11/2026
const cmdId = () => `comunicados-${curTopId()}`;
const cmdDoc = () => cfgDe(cmdId()) || {};
const cmdMsg = () => S.cmdMsg != null ? S.cmdMsg : (store.get("adm3-comunicado") || "");
const cmdTexto = (msg, p) => String(msg || "").replace(/\{nome\}/gi, String(p.nome || "").trim().split(/\s+/)[0] || "").replace(/\{top\}/gi, topName()).replace(/\{adm\}/gi, (ME.adm || "").split(" ")[0]);
const cmdF = () => S.cmdF || (S.cmdF = { quem: "todos", equipe: "", pend: false, q: "" });
const cmdExcl = () => S.cmdExcl || (S.cmdExcl = new Set());
function cmdLista() {
  const F = cmdF(), q = norm(F.q || "");
  return S.P.filter(p => !cancelado(p) && (F.quem === "todos" || (F.quem === "legendario" ? p.tipo === "legendario" : p.tipo !== "legendario"))
    && (!F.equipe || p.tipo === "legendario" && (p.equipe || "") === F.equipe) && (!F.pend || p.tipo !== "legendario" && pendDe(p).length) && (!q || norm(p.nome).includes(q)))
    .sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
}
const cmdSel = () => cmdLista().filter(p => !cmdExcl().has(p.id) && waNumber(p.telefone));
function vComunicados() {
  const F = cmdF(), L = cmdLista(), ex = cmdExcl(), semTel = L.filter(p => !waNumber(p.telefone)), sel = cmdSel(), ed = podeEditar(), msg = cmdMsg();
  const eqs = [...new Set(S.P.filter(p => p.tipo === "legendario" && p.equipe).map(p => p.equipe))].sort();
  const E = (cmdDoc().envios || []).slice().sort((a, b) => (b.em || "").localeCompare(a.em || ""));
  const ex1 = L.find(p => waNumber(p.telefone)) || { nome: "João" };
  return `
  <div class="head"><div><h2>Comunicados</h2><p>Escreva um recado, escolha quem recebe e mande pelo WhatsApp. O app abre a conversa de cada pessoa com a mensagem pronta: você toca em enviar, volta e a próxima já aparece.</p></div></div>
  <section class="panel"><h3>Mensagem</h3>
    <p class="hint" style="margin-top:0">Use <b>{nome}</b> para o primeiro nome da pessoa, <b>{top}</b> para o nome do TOP e <b>{adm}</b> para o seu nome.</p>
    <textarea id="cmdMsg" class="cmd-msg" placeholder="Olá, {nome}! Aqui é a equipe ADM do {top}…" ${ed ? "" : "disabled"}>${esc(msg)}</textarea>
    <div class="cmd-prev"><span class="lbl">Como chega para ${esc(String(ex1.nome).split(" ")[0])}</span><div id="cmdPrev">${msg.trim() ? esc(cmdTexto(msg, ex1)) : '<span class="hint">Escreva a mensagem acima.</span>'}</div></div></section>
  <section class="panel"><h3>Para quem</h3>
    <div class="seg campo-abas"><button type="button" data-cmd-quem="todos" aria-pressed="${F.quem === "todos"}">Todos</button><button type="button" data-cmd-quem="participante" aria-pressed="${F.quem === "participante"}">Senderistas</button><button type="button" data-cmd-quem="legendario" aria-pressed="${F.quem === "legendario"}">Legendários</button></div>
    <div class="cmd-filtros">
      ${F.quem !== "participante" ? `<select id="cmdEq" aria-label="Equipe"><option value="">Todas as equipes</option>${eqs.map(e => `<option ${F.equipe === e ? "selected" : ""}>${esc(e)}</option>`).join("")}</select>` : ""}
      ${F.quem !== "legendario" ? `<label class="selall"><input type="checkbox" id="cmdPend" ${F.pend ? "checked" : ""}> Só senderistas com pendência</label>` : ""}
      <input id="cmdQ" type="search" placeholder="Buscar pelo nome…" value="${esc(F.q || "")}" aria-label="Buscar">
    </div>
    <div class="cmd-conta"><b id="cmdN">${sel.length}</b> selecionado(s) de ${L.length}${semTel.length ? ` · <span class="bad-text">${semTel.length} sem telefone</span>` : ""}
      <span class="grow"></span><span><button class="linkbtn" type="button" data-cmd-todos="1">Marcar todos</button> · <button class="linkbtn" type="button" data-cmd-todos="0">Desmarcar</button></span></div>
    <div class="cham-lista cmd-lista">${L.map(p => { const tel = waNumber(p.telefone);
      return `<label class="cham-p ${tel ? "" : "off"}"><input type="checkbox" data-cmd-p="${esc(p.id)}" ${tel && !ex.has(p.id) ? "checked" : ""} ${tel ? "" : "disabled"}><span class="cham-box">${ico("check")}</span><span class="grow">${famPre(p)}${esc(p.nome)}${p.tipo === "legendario" ? ` <span class="tag">LGND${p.equipe ? " · " + esc(p.equipe) : ""}</span>` : ""}${tel ? "" : ' <small class="bad-text">sem telefone</small>'}</span></label>`; }).join("") || `<div class="empty">Ninguém com esse filtro.</div>`}</div>
    ${ed ? `<div class="actions cmd-acoes"><button class="btn" type="button" data-act="cmd-copiar">Copiar números</button><button class="btn" type="button" data-act="cmd-xlsx">${ico("upload")} Exportar planilha</button><button class="btn primary wa-btn" type="button" data-act="cmd-enviar">${ico("wa")} Enviar pelo WhatsApp · <span id="cmdN2">${sel.length}</span></button></div>` : ""}
  </section>
  <section class="panel"><h3>Enviados <small>${E.length}</small></h3><div class="list">${E.map(e => { const ids = e.ids || [], f = Object.keys(e.feitos || {}).filter(id => ids.includes(id)).length, falta = ids.length - f;
    return `<div class="li cmd-env"><span class="grow"><b>${esc(String(e.msg || "").split("\n")[0].slice(0, 70))}</b><br><small class="hint">${esc(quando(e.em))} · ${esc(e.por || "")} · ${f} de ${ids.length} enviados</small><div class="bar good"><i style="width:${pct(f, ids.length)}%"></i></div></span>
      <span class="actions"><button class="btn sm" type="button" data-cmd-ver="${esc(e.id)}">Ver</button>${ed && falta ? `<button class="btn sm primary" type="button" data-cmd-cont="${esc(e.id)}">${ico("wa")} Continuar (${falta})</button>` : ""}</span></div>`; }).join("") || `<div class="empty">Nenhum comunicado enviado ainda.</div>`}</div></section>`;
}
const cmdSalvarEnvio = (id, fn) => { const D = cmdDoc(), envios = (D.envios || []).map(e => e.id === id ? fn(e) : e); return api.set("config", cmdId(), { ...D, envios, top: curTopId() }).catch(() => {}); };
function cmdEnviar() {
  const msg = cmdMsg().trim(), sel = cmdSel();
  if (!msg) { toast("Escreva a mensagem primeiro."); $("#cmdMsg") && $("#cmdMsg").focus(); return; }
  if (!sel.length) { toast("Ninguém selecionado com telefone."); return; }
  modal(`<h3>Enviar comunicado</h3>
    <p class="hint" style="margin:0">O WhatsApp não deixa disparar para todos de uma vez pelo seu número. O app abre a conversa de uma pessoa por vez com a mensagem pronta: toque em enviar no WhatsApp e volte para o app.</p>
    <div class="imp-kpis"><div class="ok"><b class="num">${sel.length}</b><span>pessoa(s)</span></div><div><b class="num">~${Math.max(1, Math.round(sel.length * 4 / 60))} min</b><span>tempo estimado</span></div></div>
    <div class="cmd-prev"><span class="lbl">Mensagem</span><div>${esc(cmdTexto(msg, sel[0]))}</div></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${ico("wa")} Começar</button></div></div>`, () => {
    const e = { id: "c" + Date.now().toString(36), msg, em: new Date().toISOString(), por: ME.adm || "", ids: sel.map(p => p.id), feitos: {}, pulados: [] };
    const D = cmdDoc(); save(() => api.set("config", cmdId(), { ...D, envios: [...(D.envios || []), e], top: curTopId() })).then(() => cmdSequencia(e.id));
  });
}
function cmdSequencia(id) {
  const env = () => (cmdDoc().envios || []).find(e => e.id === id); let e = env(); if (!e) return;
  const fila = (e.ids || []).filter(pid => !(e.feitos || {})[pid]).map(pid => S.P.find(p => p.id === pid)).filter(p => p && waNumber(p.telefone));
  let i = 0; const feitos = new Set(), pulados = new Set();
  const passo = () => {
    if (i >= fila.length) { closeModal(); render();
      modal(`<h3>Comunicado enviado</h3><div class="imp-kpis"><div class="ok"><b class="num">${feitos.size}</b><span>enviados agora</span></div><div class="${pulados.size ? "bad" : ""}"><b class="num">${pulados.size}</b><span>pulados</span></div></div>
        <p class="hint" style="margin:0">${pulados.size ? "Os pulados ficam no histórico: toque em Continuar quando quiser mandar para eles." : "Todo mundo da lista recebeu."}</p>
        <div class="modal-foot"><span></span><button class="btn primary" type="button" data-close-btn>Fechar</button></div>`, () => {}); return; }
    const p = fila[i], txt = cmdTexto(e.msg, p);
    modal(`<h3>Enviar ${i + 1} de ${fila.length}</h3><div class="bar good"><i style="width:${pct(i, fila.length)}%"></i></div>
      <div><b style="font-size:18px">${famPre(p)}${esc(p.nome)}</b><br><small class="hint">${esc(p.telefone || "")}${p.tipo === "legendario" ? " · Legendário" + (p.equipe ? " · " + esc(p.equipe) : "") : " · Senderista"}</small></div>
      <div class="field"><label for="f-txt">Mensagem (pode ajustar só para esta pessoa)</label><textarea id="f-txt" style="min-height:130px">${esc(txt)}</textarea></div>
      <div class="modal-foot"><div><button class="btn ghost" type="button" data-close-btn>Parar</button></div>
        <div class="actions"><button class="btn" type="button" id="cmdPular">Pular</button><a class="btn primary" id="cmdWa" href="#" target="_blank" rel="noopener">${ico("wa")} Abrir WhatsApp</a></div></div>`, () => {});
    const wa = $("#cmdWa"), atual = () => { wa.href = `https://wa.me/${waNumber(p.telefone)}?text=${encodeURIComponent($("#f-txt").value)}`; };
    atual(); $("#f-txt").addEventListener("input", atual);
    wa.addEventListener("click", () => { feitos.add(p.id); const em = new Date().toISOString(); cmdSalvarEnvio(id, x => ({ ...x, feitos: { ...(x.feitos || {}), [p.id]: em } })); e = env() || e; i++; setTimeout(passo, 400); });
    $("#cmdPular").onclick = () => { pulados.add(p.id); cmdSalvarEnvio(id, x => ({ ...x, pulados: [...new Set([...(x.pulados || []), p.id])] })); i++; passo(); };
  };
  passo();
}
function cmdVer(id) {
  const e = (cmdDoc().envios || []).find(x => x.id === id); if (!e) return; const F = e.feitos || {};
  const ps = (e.ids || []).map(pid => S.P.find(p => p.id === pid) || { id: pid, nome: "(removido)" });
  modal(`<h3>Comunicado</h3><p class="hint" style="margin:0">${esc(quando(e.em))} · ${esc(e.por || "")}</p>
    <div class="cmd-prev"><div>${esc(e.msg)}</div></div>
    <details open><summary><b>Recebeu (${ps.filter(p => F[p.id]).length})</b></summary><ul class="imp-list">${ps.filter(p => F[p.id]).map(p => `<li>${esc(p.nome)} <span class="hint">${esc(quando(F[p.id]))}</span></li>`).join("") || "<li class=hint>ninguém ainda</li>"}</ul></details>
    <details ${ps.some(p => !F[p.id]) ? "open" : ""}><summary><b>Falta (${ps.filter(p => !F[p.id]).length})</b></summary><ul class="imp-list">${ps.filter(p => !F[p.id]).map(p => `<li>${esc(p.nome)}${(e.pulados || []).includes(p.id) ? ' <span class="hint">pulado</span>' : ""}</li>`).join("")}</ul></details>
    <div class="modal-foot"><div><button class="btn ghost" type="button" id="cmdReusar">Usar este texto de novo</button></div><button class="btn" type="button" data-close-btn>Fechar</button></div>`, () => {});
  $("#cmdReusar").onclick = () => { S.cmdMsg = e.msg; store.set("adm3-comunicado", e.msg); closeModal(); render(); scrollTo(0, 0); };
}
async function cmdXlsx() {
  const sel = cmdSel(); if (!sel.length) { toast("Ninguém selecionado com telefone."); return; }
  try { const X = await carregarXlsx(), wb = X.utils.book_new();
    const linhas = [["Nome", "Telefone", "WhatsApp", "Tipo", "Equipe"], ...sel.map(p => [p.nome, p.telefone || "", "+" + waNumber(p.telefone), p.tipo === "legendario" ? "Legendário" : "Senderista", p.equipe || ""])];
    const ws = X.utils.aoa_to_sheet(linhas); ws["!cols"] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
    X.utils.book_append_sheet(wb, ws, "Contatos"); X.writeFile(wb, `contatos-${curTopId()}-${hojeISO()}.xlsx`); toast(`Planilha com ${sel.length} contato(s)`);
  } catch (e) { toast(e.message || "Não consegui gerar a planilha."); }
}
async function cmdCopiar() {
  const sel = cmdSel(), txt = sel.map(p => `${p.nome}\t${p.telefone}`).join("\n");
  try { await navigator.clipboard.writeText(txt); toast(`${sel.length} número(s) copiados`); }
  catch { modal(`<h3>Números</h3><textarea style="min-height:240px;width:100%" readonly>${esc(txt)}</textarea><div class="modal-foot"><span></span><button class="btn" type="button" data-close-btn>Fechar</button></div>`, () => {}); }
}
const cmdConta = () => { const n = cmdSel().length; ["cmdN", "cmdN2"].forEach(k => { const el = $("#" + k); if (el) el.textContent = n; }); };
document.addEventListener("input", e => { const t = e.target; if (!t) return;
  if (t.id === "cmdMsg") { S.cmdMsg = t.value; store.set("adm3-comunicado", t.value); const pv = $("#cmdPrev"), p = cmdLista().find(x => waNumber(x.telefone)) || { nome: "João" }; if (pv) pv.innerHTML = t.value.trim() ? esc(cmdTexto(t.value, p)) : '<span class="hint">Escreva a mensagem acima.</span>'; }
  if (t.id === "cmdQ") { cmdF().q = t.value; const pos = t.selectionStart; render(); const n = $("#cmdQ"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } });
document.addEventListener("change", e => { const t = e.target; if (t && t.dataset && t.dataset.finF) { finFilt()[t.dataset.finF] = t.type === "checkbox" ? t.checked : t.value; render(); } });
document.addEventListener("input", e => { if (e.target && e.target.id === "finQ") { finFilt().q = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#finQ"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} } } });
document.addEventListener("change", e => { const t = e.target; if (!t) return;
  if (t.matches && t.matches("input[data-cmd-p]")) { const s = cmdExcl(); t.checked ? s.delete(t.dataset.cmdP) : s.add(t.dataset.cmdP); cmdConta(); }
  if (t.id === "cmdEq") { cmdF().equipe = t.value; render(); }
  if (t.id === "cmdPend") { cmdF().pend = t.checked; render(); } });

// ===== 7: FINANCEIRO =====  config fin-<top> {itens:[{id,tipo:gasto|entrada,area,desc,valor,data,por,em,foto}], orc:{area:valor}}
let finFotoArq = null;
const FIN_AREAS = ["Alimentação", "Logística", "Transporte", "Saúde", "Material e brindes", "Hospedagem", "Mídia", "Outros"];
const finDoc = () => cfgDe(`fin-${curTopId()}`) || {};
const finSalvar = (fn, msg) => { const D = finDoc(); return save(() => api.set("config", `fin-${curTopId()}`, { ...D, itens: D.itens || [], orc: D.orc || {}, ...fn(D), top: curTopId() }), msg).then(render); };
/* Financeiro 2 (demo, flag FIN2): previsão, custo por senderista, aviso de contas, saídas sem recibo, filtros, gráfico e Excel */
const FIN2 = () => true;   // liberado no app real em 01/11/2026
const finSemRecibo = () => (finDoc().itens || []).filter(i => i.tipo !== "entrada" && !i.foto && !i.fotoPath);
const finFilt = () => S.finF || (S.finF = { q: "", area: "", mes: "", pag: "", tipo: "", sem: false });
function avisoContas() {
  if (!FIN2() || !CONTAS() || !ME.acesso || ehCoordEq() || S.view === "financeiro" || !canSee({ id: "financeiro" })) return "";
  const hj = hojeISO(), A = contasAbertas().filter(p => p.venc && p.venc <= somaDias(hj, 3)); if (!A.length) return "";
  const at = A.filter(p => p.venc < hj), v = A.reduce((s, p) => s + (+p.valor || 0), 0), dd = d => new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `<div class="banner aviso ${at.length ? "rem-atraso" : ""}"><span>🧾 <b>${at.length ? `${at.length} conta(s) vencida(s)` : `${A.length} conta(s) vencem até ${dd(somaDias(hj, 3))}`}:</b> ${esc(A[0].item.desc)} ${brl(A[0].valor)} · ${A[0].venc < hj ? "venceu" : "vence"} ${dd(A[0].venc)}${A.length > 1 ? ` <small>e mais ${A.length - 1} · total ${brl(v)}</small>` : ""}</span><button class="btn" type="button" data-go="financeiro">Ver</button></div>`;
}
async function finXlsx() {
  const D = finDoc(), dd = d => d ? d.split("-").reverse().join("/") : "";
  const L = [...(D.itens || []).map(i => [dd(i.data), i.tipo === "entrada" ? "Entrada" : "Saída", i.area || "", i.desc || "", (i.tipo === "entrada" ? 1 : -1) * (+i.valor || 0), i.pag || "", i.fornecedor || "", { pago: "Pago", apagar: "A pagar", parcelado: "Parcelado" }[i.sit] || "", i.por || "", i.foto || i.fotoPath ? "Sim" : "Não", ""]),
    ...feqAprovados().map(i => [dd(i.data), "Saída", i.area || "", i.desc || "", -(+i.valor || 0), i.pag || "", i.fornecedor || "", { pago: "Pago", apagar: "A pagar", parcelado: "Parcelado" }[i.sit] || "", i.por || "", i.foto || i.fotoPath ? "Sim" : "Não", "Equipe " + (i.equipe || "")])]
    .sort((a, b) => String(a[0]).split("/").reverse().join("").localeCompare(String(b[0]).split("/").reverse().join("")));
  const V = VENDAS() ? vendasResumo() : null;
  try { const X = await carregarXlsx(), wb = X.utils.book_new();
    const ws = X.utils.aoa_to_sheet([["Data", "Tipo", "Área", "Descrição", "Valor (R$)", "Forma de pagamento", "Fornecedor", "Situação", "Lançado por", "Tem recibo", "Equipe"], ...L]);
    ws["!cols"] = [10, 8, 18, 40, 12, 18, 20, 11, 20, 10, 16].map(wch => ({ wch })); X.utils.book_append_sheet(wb, ws, "Lançamentos");
    if (V && V.linhas) X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([["Vendas do TOP", ""], ["Vendido (bruto)", V.bruto], ["Taxa Legendários Global", V.coprod], ["Fica com a base", V.liq], ["Já repassado", V.repassado], ["Parcelas a receber", V.parcFut]]), "Vendas");
    X.writeFile(wb, `financeiro-${curTopId()}-${hojeISO()}.xlsx`); toast("Planilha baixada");
  } catch (e) { toast(e.message || "Não consegui gerar a planilha."); }
}
function vFinanceiro() {
  if (ehCoordEq()) return vFinCoord();
  const D = finDoc(), I = (D.itens || []).slice().sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.em || "").localeCompare(a.em || "")), orc = D.orc || {}, ed = podeEditar();
  const g = [...I.filter(i => i.tipo !== "entrada"), ...feqAprovados()], e = I.filter(i => i.tipo === "entrada"), sg = g.reduce((a, i) => a + (+i.valor || 0), 0), VR = vendasResumo(), vl = VR.liq, se = e.reduce((a, i) => a + (+i.valor || 0), 0) + vl, totOrc = Object.values(orc).reduce((a, v) => a + (+v || 0), 0);
  const porA = a => g.filter(i => i.area === a).reduce((s, i) => s + (+i.valor || 0), 0), areas = [...new Set([...FIN_AREAS.filter(a => porA(a) || orc[a]), ...g.map(i => i.area)])];
  return `
  <div class="head"><div><h2>Financeiro</h2><p>Saídas e entradas do TOP com a foto do recibo. No fim sai a prestação de contas em PDF.</p></div>
    <div class="actions">${ed ? `<button class="btn primary" type="button" data-fin="">${ico("plus")} Lançar</button>` : ""}${VENDAS() && ed ? `<label class="btn">${ico("upload")} Importar vendas<input type="file" accept=".xlsx,.xls,.csv" id="vendasArq" hidden></label>` : ""}<button class="btn" type="button" data-act="fin-pdf">${ico("upload")} Prestação de contas</button>${FIN2() ? `<button class="btn" type="button" data-act="fin-xlsx">${ico("upload")} Excel</button>` : ""}</div></div>
  ${FIN2() ? finAvisos() : ""}
  <div class="kpis ${FIN2() ? "kpis-3" : ""}">
    <button type="button" class="kpi kpi-btn" data-fin-det="saidas"><span class="lbl">Saídas</span><span class="val num" style="font-size:24px">${brl(sg)}</span><span class="sub">${g.length} lançamento(s)${feqAprovados().length ? ` · ${feqAprovados().length} das equipes` : ""}</span></button>
    <button type="button" class="kpi kpi-btn" data-fin-det="entradas"><span class="lbl">Entradas</span><span class="val num" style="font-size:24px">${brl(se)}</span><span class="sub">${vl ? `vendas ${brl(vl)} + doações` : "doações e repasses"}</span></button>
    ${TAXA_GLOBAL() ? `<button type="button" class="kpi kpi-btn ${se - sg < 0 ? "alert" : "lucro"}" data-fin-det="saldo"><span class="lbl">${se - sg < 0 ? "Faltando no TOP" : "Sobrando no TOP"}</span><span class="val num" style="font-size:24px">${brl(se - sg)}</span><span class="sub">${se ? `lucro de ${pct(Math.max(0, se - sg), se)}% das entradas` : "entradas menos saídas"}</span></button>`
      : `<button type="button" class="kpi kpi-btn ${se - sg < 0 ? "alert" : ""}" data-fin-det="saldo"><span class="lbl">Saldo</span><span class="val num" style="font-size:24px">${brl(se - sg)}</span><span class="sub">entradas menos saídas</span></button>`}

    ${FIN2() ? (() => { const pf = VR.parcFut || 0, aPagar = contasAbertas().reduce((s, p) => s + (+p.valor || 0), 0), fim = se + pf - sg, nS = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)).length;
      return `<button type="button" class="kpi kpi-btn ${fim < 0 ? "alert" : ""}" data-fin-det="prev"><span class="lbl">Vai sobrar no fim</span><span class="val num" style="font-size:24px">${brl(fim)}</span><span class="sub">${pf ? `+ ${brl(pf)} em parcelas a receber` : "sem parcelas a receber"}${aPagar ? ` · ${brl(aPagar)} de contas ainda a pagar` : ""}</span></button>
      ${(() => { const C = custoCalc(); return `<button type="button" class="kpi kpi-btn" data-act="custo-pessoa"><span class="lbl">Custo por pessoa</span><span class="val num" style="font-size:22px">${C.nS ? brl(C.porS) : "—"}<small style="font-size:.5em;opacity:.7"> /senderista</small></span><span class="sub">${C.nL ? brl(C.porL) + " por legendário" : "sem legendários"}${C.semC ? ` · ${C.semC} sem classificar` : ""}</span></button>`; })()}`; })() : ""}
    <button type="button" class="kpi kpi-btn ${totOrc && sg > totOrc ? "alert" : ""}" data-fin-det="orc"><span class="lbl">Orçamento</span><span class="val num" style="font-size:24px">${totOrc ? pct(sg, totOrc) + "%" : "—"}</span><span class="sub">${totOrc ? "de " + brl(totOrc) + " usado" : "defina por área"}</span></button>
  </div>
  ${FIN2() && sg ? (() => { const cores = ["#ff7a1a", "#60a5fa", "#46c486", "#f5c542", "#c084fc", "#f472b6", "#2dd4bf", "#94a3b8", "#fb7185", "#a3e635"], A = areas.map(a => [a, porA(a)]).filter(x => x[1] > 0).sort((x, y) => y[1] - x[1]);
    return `<section class="panel"><h3>Para onde foi o dinheiro</h3><div class="fin-pizza">${A.map(([a, v], k) => `<i style="flex:${v};background:${cores[k % cores.length]}" title="${esc(a)}"></i>`).join("")}</div>
      <div class="fin-leg">${A.map(([a, v], k) => `<button type="button" data-fin-det="${esc("area:" + a)}"><span style="background:${cores[k % cores.length]}"></span>${esc(a)} <b>${pct(v, sg)}%</b> <small>${brl(v)}</small></button>`).join("")}</div></section>`; })() : ""}
  <section class="panel"><h3>Por área ${S.isOwner ? `<button class="linkbtn" type="button" data-act="fin-orc">orçamento ›</button>` : ""}</h3>
    <div class="fin-areas">${areas.map(a => { const v = porA(a), o = +orc[a] || 0; return `<button type="button" class="fin-a" data-fin-det="${esc("area:" + a)}"><span class="grow"><b>${esc(a)}</b><small>${brl(v)}${o ? ` de ${brl(o)}` : ""}${FIN2() && sg ? ` · <b>${pct(v, sg)}%</b> das saídas` : ""}</small></span><div class="bar ${o && v > o ? "bad" : "good"}"><i style="width:${o ? Math.min(100, pct(v, o)) : v ? 100 : 0}%"></i></div></button>`; }).join("") || `<div class="empty">Nenhuma saída ainda.</div>`}</div></section>
  ${VENDAS() ? vendasPainel(ed) : ""}
  ${COORD() ? feqPainel(ed) : ""}
  ${CONTAS() ? contasPainel(ed) : ""}
  ${FIN2() ? finFiltrosHtml(I) : ""}
  <section class="panel"><h3>Lançamentos <small>${FIN2() ? finFiltrar(I).length + (finFiltrar(I).length !== I.length ? " de " + I.length : "") : I.length}</small></h3><div class="cel-lista">${(FIN2() ? finFiltrar(I) : I).map(i => `<div class="cel-li ${i.tipo === "entrada" ? "guardado" : ""}">
    ${i.foto || i.fotoPath ? `<button type="button" class="cel-foto" data-fin-foto="${esc(i.id)}" aria-label="Ver recibo">${celFotoSrc(i) ? `<img src="${esc(celFotoSrc(i))}" alt="">` : "🧾"}</button>` : `<span class="cel-foto vazia">${i.tipo === "entrada" ? "＋" : "🧾"}</span>`}
    <button type="button" class="cel-info" ${ed ? `data-fin="${esc(i.id)}"` : "disabled"}><b>${esc(i.desc)}</b><small>${esc(i.area || "")} · ${i.data ? new Date(i.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""} · ${esc(i.por || "")}${CONTAS() && i.pag ? " · " + esc(i.pag) : ""}</small>${CONTAS() ? contaChip(i) : ""}</button>
    <b class="num fin-v ${i.tipo === "entrada" ? "ent" : ""}">${i.tipo === "entrada" ? "+" : "−"} ${brl(i.valor)}</b></div>`).join("") || `<div class="empty">${I.length ? "Nenhum lançamento com esses filtros." : "Toque em Lançar para registrar a primeira saída."}</div>`}</div></section>`;
}
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/* Custo por pessoa: o dono (ou quem edita o Financeiro) marca cada saída como Senderistas (s), Legendários (l) ou Geral (g).
   Fica em fin-<top>.custoPara {"<id do lançamento>" | "<doc da equipe>|<id>": "s"|"l"|"g"}; sem marcação conta como Geral. Geral é repartido pelo número de pessoas. */
const custoKey = i => i.doc ? `${i.doc}|${i.id}` : i.id;
const custoSaidas = () => [...(finDoc().itens || []).filter(i => i.tipo !== "entrada"), ...feqAprovados()].sort((a, b) => (b.valor || 0) - (a.valor || 0));
function custoCalc(M = finDoc().custoPara || {}) {
  const nS = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)).length, nL = S.P.filter(p => p.tipo === "legendario" && !cancelado(p)).length, n = nS + nL || 1;
  let s = 0, l = 0, g = 0, semC = 0; custoSaidas().forEach(i => { const v = +i.valor || 0, k = M[custoKey(i)]; if (!k) semC++; if (k === "s") s += v; else if (k === "l") l += v; else g += v; });
  const gS = g * nS / n, gL = g * nL / n;
  return { nS, nL, s, l, g, gS, gL, semC, porS: nS ? (s + gS) / nS : 0, porL: nL ? (l + gL) / nL : 0 };
}
function custoForm() {
  const ed = podeEditar(), M = { ...(finDoc().custoPara || {}) }, L = custoSaidas(), F = { f: "" };
  const resumo = () => { const C = custoCalc(M); return `<div class="imp-kpis"><div class="ok"><b class="num">${brl(C.porS)}</b><span>por senderista (${C.nS})</span></div><div class="ok"><b class="num">${brl(C.porL)}</b><span>por legendário (${C.nL})</span></div></div>
    <p class="hint" style="margin:0">Senderistas ${brl(C.s)} · Legendários ${brl(C.l)} · Geral ${brl(C.g)} (${brl(C.gS)} para senderistas e ${brl(C.gL)} para legendários, pelo número de pessoas)${C.semC ? ` · <b>${C.semC} sem classificar</b> (contam como Geral)` : ""}</p>`; };
  const linhas = () => L.filter(i => !F.f || (F.f === "sem" ? !M[custoKey(i)] : (M[custoKey(i)] || "g") === F.f)).map(i => { const k = custoKey(i), v = M[k] || "";
    return `<div class="li custo-li"><span class="grow"><b>${esc(i.desc)}</b><br><span class="hint">${esc(i.area || "")}${i.equipe ? " · Equipe " + esc(i.equipe) : ""} · ${brl(i.valor)}</span></span>
      <span class="sn3 custo-sn">${[["s", "Senderistas"], ["l", "Legendários"], ["g", "Geral"]].map(([x, t]) => `<label><input type="radio" name="c-${esc(k)}" value="${x}" data-custo="${esc(k)}" ${v === x ? "checked" : ""} ${ed ? "" : "disabled"}><span class="${x === "g" ? "" : "ok"}">${t}</span></label>`).join("")}</span></div>`; }).join("") || `<div class="empty">Nada neste filtro.</div>`;
  modal(`<h3>Custo por pessoa</h3><div id="custoRes">${resumo()}</div>
    <div class="custo-f" id="custoF">${[["", "Todas"], ["sem", "Sem classificar"], ["s", "Senderistas"], ["l", "Legendários"], ["g", "Geral"]].map(([x, t]) => `<button type="button" class="btn sm ${F.f === x ? "primary" : ""}" data-cf="${x}">${t}</button>`).join("")}</div>
    <div class="list custo-lista" id="custoL">${linhas()}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>${ed ? "Cancelar" : "Fechar"}</button>${ed ? `<button class="btn primary" type="submit">Salvar</button>` : ""}</div></div>`, () => {
    if (!ed) return closeModal(); closeModal(); finSalvar(() => ({ custoPara: M }), "Classificação salva"); });
  $("#custoL").addEventListener("change", e => { const t = e.target; if (!t.dataset.custo) return; M[t.dataset.custo] = t.value; $("#custoRes").innerHTML = resumo(); });
  $("#custoF").addEventListener("click", e => { const b = e.target.closest("[data-cf]"); if (!b) return; F.f = b.dataset.cf; $("#custoF").querySelectorAll("button").forEach(x => x.classList.toggle("primary", x === b)); $("#custoL").innerHTML = linhas(); });
}
function finFiltrar(I) {
  const F = finFilt(), q = norm(F.q || "");
  return I.filter(i => (!F.tipo || (F.tipo === "entrada" ? i.tipo === "entrada" : i.tipo !== "entrada")) && (!F.area || i.area === F.area) && (!F.mes || (i.data || "").slice(0, 7) === F.mes)
    && (!F.pag || i.pag === F.pag) && (!F.sem || (i.tipo !== "entrada" && !i.foto && !i.fotoPath)) && (!q || norm([i.desc, i.fornecedor, i.por, i.area].join(" ")).includes(q)));
}
function finFiltrosHtml(I) {
  const F = finFilt(), opt = (l, v, cur) => `<option value="${esc(v)}" ${cur === v ? "selected" : ""}>${esc(l)}</option>`;
  const areas = [...new Set(I.map(i => i.area).filter(Boolean))].sort(), meses = [...new Set(I.map(i => (i.data || "").slice(0, 7)).filter(Boolean))].sort().reverse(), pags = [...new Set(I.map(i => i.pag).filter(Boolean))].sort();
  const ativo = F.q || F.area || F.mes || F.pag || F.tipo || F.sem;
  return `<section class="panel fin-filtros"><div class="cmd-filtros">
    <input id="finQ" type="search" placeholder="Buscar lançamento, fornecedor…" value="${esc(F.q || "")}" aria-label="Buscar">
    <select data-fin-f="tipo" aria-label="Tipo">${opt("Saídas e entradas", "", F.tipo)}${opt("Só saídas", "saida", F.tipo)}${opt("Só entradas", "entrada", F.tipo)}</select>
    <select data-fin-f="area" aria-label="Área">${opt("Todas as áreas", "", F.area)}${areas.map(a => opt(a, a, F.area)).join("")}</select>
    <select data-fin-f="mes" aria-label="Mês">${opt("Todos os meses", "", F.mes)}${meses.map(m => opt(MESES[+m.slice(5) - 1] + "/" + m.slice(2, 4), m, F.mes)).join("")}</select>
    ${pags.length ? `<select data-fin-f="pag" aria-label="Forma de pagamento">${opt("Toda forma de pagamento", "", F.pag)}${pags.map(a => opt(a, a, F.pag)).join("")}</select>` : ""}
    <label class="selall"><input type="checkbox" data-fin-f="sem" ${F.sem ? "checked" : ""}> Só sem recibo</label>
    ${ativo ? `<button class="linkbtn" type="button" data-act="fin-limpar">limpar filtros</button>` : ""}</div></section>`;
}
function finAvisos() {
  const sr = finSemRecibo(), hj = hojeISO(), at = CONTAS() ? contasAbertas().filter(p => p.venc && p.venc < hj) : [];
  return (at.length ? `<div class="banner rem-atraso"><span>🧾 <b>${at.length} conta(s) vencida(s)</b> · ${brl(at.reduce((s, p) => s + (+p.valor || 0), 0))}. Veja em Contas a pagar e marque como paga.</span></div>` : "")
    + (sr.length ? `<div class="banner"><span>📎 <b>${sr.length} saída(s) sem comprovante</b> (${brl(sr.reduce((s, i) => s + (+i.valor || 0), 0))}). Anexe a foto do recibo para a prestação de contas ficar completa.</span><button class="btn" type="button" data-act="fin-sem">Ver quais</button></div>` : "");
}
/* Detalhe de um card do Financeiro: todas as entradas ou saídas que formam aquele número */
function finDetalhe(key) {
  const D = finDoc(), man = D.itens || [], orc = D.orc || {}, VL = VENDAS() ? (vendasDoc().linhas || []) : [];
  const dd = d => d ? new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "";
  const saiM = man.filter(i => i.tipo !== "entrada").map(i => ({ d: i.data, t: i.desc, s: [i.area, i.por].filter(Boolean).join(" · "), v: +i.valor || 0, sn: -1, foto: (i.foto || i.fotoPath) ? i.id : "" }));
  const saiE = feqAprovados().map(i => ({ d: i.data, t: i.desc, s: [i.area, "Equipe " + i.equipe, i.por, FEQ_TXT[i.status]].filter(Boolean).join(" · "), v: +i.valor || 0, sn: -1, area: i.area }));
  const entM = man.filter(i => i.tipo === "entrada").map(i => ({ d: i.data, t: i.desc, s: [i.area, i.por].filter(Boolean).join(" · "), v: +i.valor || 0, sn: 1, foto: (i.foto || i.fotoPath) ? i.id : "" }));
  const vend = L => L.map(x => ({ d: x.data, t: x.nome || "Comprador", s: [x.oferta, x.parc && "parcela " + x.parc, x.pag, VEND_TXT[x.stat], x.repasse && "repasse " + dd(x.repasse)].filter(Boolean).join(" · "), v: +x.liq || 0, sn: 1, bruto: +x.bruto || 0 }));
  const ap = VL.filter(x => x.stat === "aprovado");
  saiM.forEach((x, i) => x.area = (man.filter(i => i.tipo !== "entrada")[i] || {}).area);
  let titulo = "", L = [], nota = "", campo = "v";
  const [tipo, val] = key.includes(":") ? [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)] : [key, ""];
  if (key === "saidas") { titulo = "Saídas"; L = [...saiM, ...saiE]; }
  else if (key === "entradas") { titulo = "Entradas"; L = [...entM, ...vend(ap)]; nota = ap.length ? "Vendas pelo valor que fica com a base." : ""; }
  else if (key === "prev") { const pf = VENDAS() ? vendasResumo().parcFut : 0; titulo = "Vai sobrar no fim do TOP"; L = [...entM, ...vend(ap), ...(pf ? [{ d: "", t: "Parcelas que ainda vão cair", s: "vendas parceladas na TicketAndGo", v: pf, sn: 1 }] : []), ...saiM, ...saiE];
    nota = "Entradas + parcelas a receber − todas as saídas (as contas ainda a pagar já estão nas saídas)."; }
  else if (key === "saldo") { titulo = TAXA_GLOBAL() ? "Sobrando no TOP: entradas e saídas" : "Saldo: entradas e saídas"; L = [...entM, ...vend(ap), ...saiM, ...saiE]; }
  else if (key === "orc") {
    const areas = [...new Set([...FIN_AREAS, ...[...saiM, ...saiE].map(i => i.area)])].filter(Boolean);
    L = areas.map(a => { const v = [...saiM, ...saiE].filter(i => i.area === a).reduce((s, i) => s + i.v, 0), o = +orc[a] || 0; return { t: a, s: o ? `orçamento ${brl(o)} · ${pct(v, o)}% usado${v > o ? " · estourou " + brl(v - o) : " · sobra " + brl(o - v)}` : "sem orçamento definido", v, sn: -1, area: a }; }).filter(x => x.v || +orc[x.t]);
    titulo = "Orçamento por área"; nota = "Toque em uma área para ver as saídas dela.";
  }
  else if (tipo === "area") { titulo = "Saídas · " + val; L = [...saiM, ...saiE].filter(i => i.area === val); const o = +orc[val] || 0; if (o) nota = `Orçamento ${brl(o)}.`; }
  else if (tipo === "of") { titulo = val; L = vend(ap.filter(x => x.oferta === val)); }
  else if (tipo === "rep") { const [d, id] = val.split("|"); titulo = `Repasse ${id} · ${dd(d)}`; L = vend(ap.filter(x => x.repasse === d && x.repId === id)); }
  else if (key === "v:vendido") { titulo = "Vendido (valor pago pelo comprador)"; L = vend(ap); campo = "bruto"; }
  else if (key === "v:coprod") { titulo = "Taxa da Legendários Global"; nota = "Valor que a plataforma já separa de cada venda para a Legendários Global (coprodutor)."; L = ap.filter(x => +x.coprod).map(x => ({ ...vend([x])[0], v: +x.coprod, sn: 0 })); }
  else if (key === "v:liq") { titulo = "Fica com a base"; L = vend(ap); }
  else if (key === "v:repassado") { titulo = "Já repassado"; L = vend(ap.filter(x => x.repasse)); }
  else if (key === "v:liberar") { titulo = "A liberar (aprovado, sem repasse)"; L = vend(ap.filter(x => !x.repasse)); }
  else if (key === "v:aberto") { titulo = "Boletos em aberto"; L = VL.filter(x => x.stat === "pendente").map(x => ({ ...vend([x])[0], v: +x.pend || +x.bruto || 0 })); nota = "Valor que falta pagar."; }
  else if (key === "v:parc") {
    titulo = "Parcelas a vencer"; const porTx = {}; ap.filter(x => /^\d+x\d+$/.test(x.parc || "")).forEach(x => (porTx[x.tx] = porTx[x.tx] || []).push(x));
    L = Object.values(porTx).map(A => { const n = Math.max(...A.map(x => +x.parc.split("x")[1])), falta = n - A.length, u = A[A.length - 1]; return falta > 0 ? { d: u.data, t: u.nome || "Comprador", s: `${u.oferta} · pagou ${A.length} de ${n} · faltam ${falta}`, v: falta * (+u.liq || 0), sn: 1 } : null; }).filter(Boolean);
  }
  else if (key === "v:cort") { titulo = "Cortesias"; L = vend(ap.filter(x => x.tipo === "cortesia")); nota = "Ingressos gratuitos (prêmios, sorteios, convidados)."; }
  else if (key === "v:canc") { titulo = "Canceladas e estornadas"; L = VL.filter(x => x.stat === "cancelado" || x.stat === "estornado").map(x => ({ ...vend([x])[0], v: +x.pend || +x.bruto || 0, sn: 0 })); nota = "Não entram no Financeiro."; }
  if (campo === "bruto") L.forEach(x => x.v = x.bruto);
  L.sort((a, b) => (b.d || "").localeCompare(a.d || "") || b.v - a.v);
  const tot = L.reduce((s, x) => s + (x.sn === 0 ? x.v : x.sn * x.v), 0);
  modal(`<h3>${esc(titulo)}</h3>
    <p class="hint" style="margin:0 0 8px">${L.length} item(ns) · total <b class="num">${brl(key === "saldo" || key === "prev" ? tot : Math.abs(tot))}</b>${nota ? " · " + esc(nota) : ""}</p>
    <div class="fin-det">${L.map(x => `<div class="li ${key === "orc" ? "li-btn" : ""}" ${key === "orc" ? `role="button" tabindex="0" data-fin-det="${esc("area:" + x.t)}"` : ""}>
      <span class="grow"><b>${esc(x.t)}</b><br><span class="hint">${esc([x.d && dd(x.d), x.s].filter(Boolean).join(" · "))}</span></span>
      ${x.foto ? `<button class="linkbtn" type="button" data-fin-foto="${esc(x.foto)}" aria-label="Ver recibo">🧾</button>` : ""}
      <b class="num fin-v ${x.sn > 0 ? "ent" : ""}">${x.sn > 0 ? "+ " : x.sn < 0 && (key === "saldo" || key === "prev") ? "− " : ""}${brl(x.v)}</b></div>`).join("") || `<div class="empty">Nada aqui ainda.</div>`}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn primary" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal());
}
function finForm(id) {
  const D = finDoc(), it = (D.itens || []).find(x => x.id === id) || { tipo: "gasto", data: hojeISO(), area: "Alimentação" }; let foto = celFotoSrc(it) || ""; finFotoArq = null;
  modal(`<h3>${it.id ? "Editar lançamento" : "Novo lançamento"}</h3>
    <div class="seg lem-quando" style="margin-bottom:10px">${[["gasto", "Saída"], ["entrada", "Entrada"]].map(([v, l]) => `<label><input type="radio" name="tipo" value="${v}" ${it.tipo === v ? "checked" : ""}> ${l}</label>`).join("")}</div>
    <div class="form">
      <div class="field full"><label for="f-fd">Descrição</label><input id="f-fd" name="desc" value="${esc(it.desc || "")}" placeholder="ex.: 40 kg de gelo, combustível da van" required></div>
      <div class="field"><label for="f-fv">Valor (R$)</label><input id="f-fv" name="valor" inputmode="decimal" value="${it.valor != null ? String(it.valor).replace(".", ",") : ""}" required></div>
      <div class="field"><label for="f-fdt">${CONTAS() ? "Data da compra" : "Data"}</label><input id="f-fdt" name="data" type="date" value="${esc(it.data || "")}"></div>
      <div class="field full"><label for="f-fa">Área</label><select id="f-fa" name="area">${FIN_AREAS.map(a => `<option ${it.area === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
      ${CONTAS() ? contaCampos(it) : ""}
      <div class="field full"><span class="lab">Recibo / nota</span><div class="cel-acoes" style="margin:0"><label class="btn">📷 ${foto ? "Trocar foto" : "Tirar foto do recibo"}<input type="file" accept="image/*" capture="environment" id="finFoto" hidden></label></div>
        <img id="finPrev" class="cel-grande" src="${esc(foto)}" alt="" ${foto ? "" : "hidden"}></div>
    </div>
    <div class="modal-foot"><div>${it.id ? `<button class="btn danger" type="button" id="finDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const valor = Number(String(fd.get("valor") || "").replace(/\./g, "").replace(",", ".")); if (!(valor > 0)) { toast("Confira o valor."); return; }
    const arq = finFotoArq; closeModal();
    (async () => { const f = arq ? await fotoGuardar(arq, `financeiro/${curTopId()}/recibo`) : { foto: it.foto || "", fotoPath: it.fotoPath || "" };
      const novo = { ...it, id: it.id || Date.now().toString(36), tipo: fd.get("tipo") || "gasto", desc: String(fd.get("desc") || "").trim(), valor, data: fd.get("data") || hojeISO(), area: fd.get("area"), ...f, por: it.por || ME.adm || "", em: it.em || agoraISO(),
        ...(CONTAS() ? contaLer(fd, valor, it) : {}) };
      finSalvar(D => ({ itens: [...(D.itens || []).filter(x => x.id !== novo.id), novo] }), "Lançamento salvo"); })(); });
  $("#finFoto").addEventListener("change", async e => { const fl = e.target.files[0]; if (!fl) return; finFotoArq = fl; try { foto = await reduzirFoto(fl, 700); $("#finPrev").src = foto; $("#finPrev").hidden = false; } catch { toast("Não consegui abrir a foto."); } });
  const d = $("#finDel"); if (d) d.onclick = () => { if (!confirm("Excluir este lançamento?")) return; closeModal(); finSalvar(D => ({ itens: (D.itens || []).filter(x => x.id !== it.id) }), "Excluído"); };
  if (CONTAS()) contaLigar();
}
/* ---------- Contas a pagar (demo): forma de pagamento, pago ou a pagar, vencimento e parcelas de cada saída ----------
   no item: pag, fornecedor, sit (pago|apagar), parcelas:[{n,de,venc,valor,pago,pagoEm,pagoPor}] (vazio = pago à vista) */
const CONTAS = () => true;   // liberado no app real em 31/10/2026
const CONTA_PAG = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Boleto", "Transferência"];
const somaMes = (iso, n) => { const d = new Date(iso + "T12:00"), dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return d.toISOString().slice(0, 10); };
function contaCampos(it) {
  const P = it.parcelas || [], parc = P.length > 1, sit = it.sit || (P.length ? "apagar" : "pago");
  return `<div class="field full conta-box" id="contaBox" ${it.tipo === "entrada" ? "hidden" : ""}>
    <div class="form" style="padding:0">
      <div class="field"><label for="f-cpag">Forma de pagamento</label><select id="f-cpag" name="pag">${CONTA_PAG.map(x => `<option ${it.pag === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label for="f-cfor">Fornecedor / loja</label><input id="f-cfor" name="fornecedor" value="${esc(it.fornecedor || "")}" placeholder="opcional"></div>
      <div class="field full" id="cxSit" ${parc ? "hidden" : ""}><span class="lab">Situação</span><div class="seg lem-quando conta-seg">${[["pago", "Já pago"], ["apagar", "A pagar (vai vencer)"]].map(([v, l]) => `<label><input type="radio" name="sit" value="${v}" ${sit === v ? "checked" : ""}> ${l}</label>`).join("")}</div></div>
      <div class="field full cel-motivos"><label><input type="checkbox" name="parcelado" id="f-cparc" ${parc ? "checked" : ""}> Parcelado</label></div>
      <div class="field" id="cxN" ${parc ? "" : "hidden"}><label for="f-cn">Em quantas vezes</label><select id="f-cn" name="nparc">${Array.from({ length: 23 }, (_, i) => i + 2).map(n => `<option value="${n}" ${P.length === n ? "selected" : ""}>${n}x</option>`).join("")}</select></div>
      <div class="field" id="cxV"><label for="f-cv" id="cxVl">${parc ? "1º vencimento" : "Vencimento"}</label><input id="f-cv" name="venc" type="date" value="${esc((P[0] || {}).venc || somaDias(hojeISO(), 30))}"></div>
      <div class="field full cel-motivos" id="cxP1" ${parc ? "" : "hidden"}><label><input type="checkbox" name="p1pago" ${parc && P[0] && P[0].pago ? "checked" : ""}> A 1ª parcela já foi paga</label></div>
      <p class="hint field full" id="cxRes" style="margin:0"></p>
    </div></div>`;
}
function contaLigar(valId = "f-fv") {
  const f = $("#mform"); if (!f || !$("#contaBox")) return;
  const sync = () => {
    const tipo = (f.querySelector('[name="tipo"]:checked') || {}).value, sit = (f.querySelector('[name="sit"]:checked') || {}).value, parc = $("#f-cparc").checked;
    $("#contaBox").hidden = tipo === "entrada";
    $("#cxN").hidden = !parc; $("#cxSit").hidden = parc; $("#cxP1").hidden = !parc; $("#cxV").hidden = !parc && sit === "pago"; $("#cxVl").textContent = parc ? "1º vencimento" : "Vencimento";
    const v = Number(String($("#" + valId).value || "").replace(/\./g, "").replace(",", ".")) || 0, n = +$("#f-cn").value || 2;
    $("#cxRes").textContent = parc && v ? `${n}x de ${brl(v / n)}, todo mês a partir de ${$("#f-cv").value ? new Date($("#f-cv").value + "T12:00").toLocaleDateString("pt-BR") : "—"}.` : !parc && sit === "apagar" && v ? `${brl(v)} para pagar até ${$("#f-cv").value ? new Date($("#f-cv").value + "T12:00").toLocaleDateString("pt-BR") : "—"}.` : "";
  };
  f.addEventListener("change", sync); f.addEventListener("input", sync); sync();
}
function contaLer(fd, valor, it) {
  if ((fd.get("tipo") || "gasto") === "entrada") return { pag: "", fornecedor: "", sit: "", parcelas: [] };
  const parc = fd.get("parcelado") === "on", sit = fd.get("sit") || "pago", venc = fd.get("venc") || somaDias(hojeISO(), 30), ant = it.parcelas || [];
  const base = { pag: fd.get("pag") || "", fornecedor: String(fd.get("fornecedor") || "").trim() };
  if (parc) {
    const n = +fd.get("nparc") || 2, cada = Math.round(valor / n * 100) / 100;
    const parcelas = Array.from({ length: n }, (_, i) => { const a = ant[i] || {}; return { n: i + 1, de: n, venc: somaMes(venc, i), valor: i === n - 1 ? Math.round((valor - cada * (n - 1)) * 100) / 100 : cada,
      pago: i === 0 ? fd.get("p1pago") === "on" : !!a.pago, ...(a.pago || (i === 0 && fd.get("p1pago") === "on") ? { pagoEm: a.pagoEm || agoraISO(), pagoPor: a.pagoPor || ME.adm || "" } : {}) }; });
    return { ...base, sit: "parcelado", parcelas };
  }
  if (sit === "apagar") { const a = ant.length === 1 ? ant[0] : {}; return { ...base, sit, parcelas: [{ n: 1, de: 1, venc, valor, pago: !!a.pago, ...(a.pago ? { pagoEm: a.pagoEm, pagoPor: a.pagoPor } : {}) }] }; }
  return { ...base, sit: "pago", parcelas: [] };
}
// todas as parcelas em aberto, da mais atrasada para a mais distante
const contasAbertas = () => [...(finDoc().itens || []).filter(i => i.tipo !== "entrada"), ...feqAprovados()].flatMap(i => (i.parcelas || []).filter(p => !p.pago).map(p => ({ ...p, item: i })))
  .sort((a, b) => (a.venc || "").localeCompare(b.venc || ""));
const contaChip = i => { const P = i.parcelas || []; if (!P.length) return ""; const ab = P.filter(p => !p.pago), prox = ab[0], hj = hojeISO();
  if (!ab.length) return `<span class="chip ok">${P.length > 1 ? P.length + "x pagas" : "Paga"}</span>`;
  const atras = prox.venc < hj, dt = new Date(prox.venc + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `<span class="chip ${atras ? "bad" : prox.venc <= somaDias(hj, 7) ? "wait" : "sent"}">${P.length > 1 ? `${P.length - ab.length}/${P.length} pagas · ` : ""}${atras ? "venceu" : "vence"} ${dt}</span>`; };
function contasPainel(ed) {
  const A = contasAbertas(); if (!A.length) return "";
  const hj = hojeISO(), atras = A.filter(p => p.venc < hj), semana = A.filter(p => p.venc >= hj && p.venc <= somaDias(hj, 7)), tot = A.reduce((s, p) => s + (+p.valor || 0), 0);
  const dd = d => new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return `<section class="panel"><h3>Contas a pagar <small>${A.length}</small></h3>
    <p class="hint" style="margin:0 0 8px">${brl(tot)} em aberto${atras.length ? ` · <b class="bad-t">${atras.length} vencida(s)</b>` : ""}${semana.length ? ` · ${semana.length} vence(m) em 7 dias` : ""}.</p>
    <div class="list">${A.slice(0, 12).map(p => `<div class="li conta-li ${p.venc < hj ? "atras" : ""}"><span class="grow"><b>${esc(p.item.desc)}</b>${p.item.equipe ? ` <span class="tag">${esc(p.item.equipe)}</span>` : ""}${p.de > 1 ? ` <span class="tag">${p.n}/${p.de}</span>` : ""}<br><span class="hint">${p.venc < hj ? "Venceu" : "Vence"} ${dd(p.venc)}${p.item.pag ? " · " + esc(p.item.pag) : ""}${p.item.fornecedor ? " · " + esc(p.item.fornecedor) : ""}</span></span>
      <b class="num fin-v">${brl(p.valor)}</b>${ed ? `<button class="btn sm" type="button" data-conta-paga="${esc((p.item.doc ? p.item.doc + "|" : "") + p.item.id + "|" + p.n)}">${ico("check")} Paga</button>` : ""}</div>`).join("")}</div>
    ${A.length > 12 ? `<p class="hint">e mais ${A.length - 12}. Toque no card Saídas para ver tudo.</p>` : ""}</section>`;
}
function contaPagar(ref) {
  const parts = ref.split("|");
  if (parts.length === 3) {   // saída de equipe (documento do coordenador)
    const [doc, id, n] = parts;
    save(() => { const D = cfgDe(doc) || {}; return api.set("config", doc, { ...D, itens: (D.itens || []).map(i => i.id !== id ? i : { ...i, parcelas: (i.parcelas || []).map(p => p.n === +n ? { ...p, pago: true, pagoEm: agoraISO(), pagoPor: ME.adm || "" } : p) }) }); }, "Marcada como paga").then(render);
    return;
  }
  const [id, n] = parts;
  finSalvar(D => ({ itens: (D.itens || []).map(i => i.id !== id ? i : { ...i, parcelas: (i.parcelas || []).map(p => p.n === +n ? { ...p, pago: true, pagoEm: agoraISO(), pagoPor: ME.adm || "" } : p) }) }), "Marcada como paga");
}
function finOrcForm() {
  const o = finDoc().orc || {};
  modal(`<h3>Orçamento por área</h3><div class="form">${FIN_AREAS.map((a, i) => `<div class="field"><label for="f-o${i}">${a}</label><input id="f-o${i}" name="${esc(a)}" inputmode="decimal" value="${o[a] ? String(o[a]).replace(".", ",") : ""}" placeholder="R$"></div>`).join("")}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`, fd => {
    const orc = Object.fromEntries(FIN_AREAS.map(a => [a, Number(String(fd.get(a) || "").replace(/\./g, "").replace(",", ".")) || 0]).filter(([, v]) => v));
    closeModal(); finSalvar(() => ({ orc }), "Orçamento salvo"); });
}
async function finPdf() {
  toast("Montando o PDF com os recibos…");
  const ext = feqAprovados().map(i => ({ ...i, id: "eq-" + i.id, por: `${i.por} (${i.equipe})` }));
  const fotos = {}; await Promise.all([...(finDoc().itens || []), ...ext].map(async i => { fotos[i.id] = await celFotoData(i); }));
  const D = finDoc(), I = [...(D.itens || []), ...ext].slice().sort((a, b) => (a.data || "").localeCompare(b.data || "")), g = I.filter(i => i.tipo !== "entrada"), e = I.filter(i => i.tipo === "entrada");
  const V = VENDAS() ? vendasResumo() : { liq: 0, ofertas: [] };
  const sg = g.reduce((a, i) => a + (+i.valor || 0), 0), se = e.reduce((a, i) => a + (+i.valor || 0), 0) + V.liq, dt = d => d ? d.split("-").reverse().slice(0, 2).join("/") : "";
  const areas = [...new Set(g.map(i => i.area || "Outros"))].sort();
  return gerarListaPdf({ titulo: "Prestação de contas", arquivo: "Prestacao de contas " + topName(), orient: "portrait",
    resumo: [["Saídas", brl(sg)], ["Entradas", brl(se)], ["Saldo", brl(se - sg)], ...(TAXA_GLOBAL() && V.coprod ? [["Taxa Legendários Global", brl(V.coprod)]] : [])], legenda: "Saídas por área, com a foto do recibo. Entradas no fim.",
    colunas: [{ t: "Recibo", w: 20, foto: true }, { t: "Data", w: 14 }, { t: "Descrição", bold: true }, { t: "Por", w: 26, cinza: true }, { t: "Valor", w: 26, al: "right" }],
    secoes: [...areas.map(a => { const L = g.filter(i => (i.area || "Outros") === a); return { titulo: `${a} · ${brl(L.reduce((s, i) => s + (+i.valor || 0), 0))}`, linhas: L.map(i => [fotos[i.id] || "", dt(i.data), i.desc, i.por || "", brl(i.valor)]) }; }),
      ...(V.liq ? [{ titulo: `Vendas do TOP (TicketAndGo) · ${brl(V.liq)} líquido`, linhas: V.ofertas.map(o => ["", "", `${o.oferta} (${o.n})`, `bruto ${brl(o.bruto)}`, brl(o.liq)]) }] : []),
      ...(e.length ? [{ titulo: `Outras entradas · ${brl(se - V.liq)}`, linhas: e.map(i => [fotos[i.id] || "", dt(i.data), i.desc, i.por || "", brl(i.valor)]) }] : [])] }, false).catch(er => toast("Não foi possível gerar o PDF. " + er.message));
}

/* ---------- Vendas do TOP (demo): relatório de vendas da TicketAndGo vira entrada do Financeiro ----------
   config vendas-<top> {linhas:[{k,tx,st,stat,parc,data,oferta,tipo,pag,bruto,liq,coprod,cupom,nome,lib,repasse,repId}], importadoEm, por, arquivo}
   Nunca guarda CPF, e-mail ou telefone do comprador. Cada linha da planilha é uma transação ou uma parcela. */
const VENDAS = () => true;   // liberado no app real em 31/10/2026
const vendasDoc = () => cfgDe(`vendas-${curTopId()}`) || {};
const ehVendas = linhas => { const h = (linhas[0] || []).map(x => norm(String(x))); return h.includes("id da transacao") && h.includes("minha comissao"); };
const VEND_TXT = { aprovado: "Aprovada", pendente: "Boleto em aberto", cancelado: "Cancelada", estornado: "Estornada" };
function vendasLer(linhas) {
  const h = (linhas[0] || []).map(x => norm(String(x))), col = n => h.indexOf(n);
  const c = { tx: col("id da transacao"), st: col("status da transacao"), dt: col("data da transacao"), of: col("oferta"), bruto: col("valor de compra com acrescimos"), liq: col("minha comissao"),
    cop: col("comissao do(a) coprodutor(a)"), pend: col("valor pendente de pagamento"), pag: col("metodo de pagamento"), cup: col("codigo de cupom"), nome: col("comprador(a)"), lib: col("data liberacao para repasse"), rep: col("data repasse"), repId: col("repasse") };
  const num = v => { let t = String(v == null ? "" : v).replace(/[^\d,.-]/g, ""); if (!t) return 0;
    const lc = t.lastIndexOf(","), lp = t.lastIndexOf("."); t = lc > lp ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, ""); return Math.round((+t || 0) * 100) / 100; };
  const corpo = linhas.slice(1).filter(l => String(l[c.tx] || "").trim());
  // datas "9/1/26 16:10" (planilha em inglês: mês/dia) ou "01/09/2026" (dia/mês): decide pela coluna inteira
  const pares = corpo.map(l => /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(String(l[c.dt] || ""))).filter(Boolean);
  const diaPrimeiro = pares.some(m => +m[1] > 12) || (!pares.some(m => +m[2] > 12) && /\.csv$/i.test(impArquivo || ""));
  const data = v => { v = String(v || "").trim(); if (!v) return ""; const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v); if (iso) return iso[0];
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(v); if (!m) return ""; const [d, mm] = diaPrimeiro ? [m[1], m[2]] : [m[2], m[1]], a = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${a}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`; };
  const vistos = {};
  return corpo.map(l => {
    const st = String(l[c.st] || "").trim(), S_ = st.toUpperCase(), parc = (/(\d+)\s*x\s*(\d+)/i.exec(st) || [])[0] || "", tx = String(l[c.tx]).trim();
    const stat = /ESTORN|REEMBOLS|CHARGEBACK|DEVOLV/.test(S_) ? "estornado" : /CANCEL|EXPIR|RECUS|NEGAD/.test(S_) ? "cancelado" : /^APROVAD|PAGO|CONFIRM/.test(S_) ? "aprovado" : "pendente";
    const oferta = String(l[c.of] || "").trim(), pag = String(l[c.pag] || "").trim();
    const tipo = /cortesia|sorteio|ganhad|premio/i.test(norm(oferta)) || /gratuito/i.test(pag) ? "cortesia" : /servidor|legendari/i.test(norm(oferta)) ? "legendario" : "participante";
    let k = tx + (parc ? "-" + parc.replace(/\s/g, "") : ""); vistos[k] = (vistos[k] || 0) + 1; if (vistos[k] > 1) k += "-" + vistos[k];
    return { k, tx, st, stat, parc: parc.replace(/\s/g, ""), data: data(l[c.dt]), oferta, tipo, pag, bruto: num(l[c.bruto]), liq: num(l[c.liq]), coprod: c.cop >= 0 ? num(l[c.cop]) : 0, pend: c.pend >= 0 ? num(l[c.pend]) : 0,
      cupom: c.cup >= 0 ? String(l[c.cup] || "").trim() : "", nome: c.nome >= 0 ? String(l[c.nome] || "").trim() : "", lib: c.lib >= 0 ? data(l[c.lib]) : "", repasse: c.rep >= 0 ? data(l[c.rep]) : "", repId: c.repId >= 0 ? String(l[c.repId] || "").trim() : "" };
  });
}
function vendasResumo(L = vendasDoc().linhas || []) {
  const ap = L.filter(x => x.stat === "aprovado"), soma = (A, k) => Math.round(A.reduce((s, x) => s + (+x[k] || 0), 0) * 100) / 100;
  const txs = st => new Set(L.filter(x => x.stat === st).map(x => x.tx)).size;
  const ofertas = [...new Set(ap.map(x => x.oferta))].map(o => { const A = ap.filter(x => x.oferta === o); return { oferta: o, tipo: A[0].tipo, n: new Set(A.map(x => x.tx)).size, bruto: soma(A, "bruto"), liq: soma(A, "liq") }; }).sort((a, b) => b.liq - a.liq);
  const reps = [...new Set(ap.filter(x => x.repasse).map(x => x.repasse + "|" + x.repId))].sort().map(kk => { const [d, id] = kk.split("|"), A = ap.filter(x => x.repasse === d && x.repId === id); return { data: d, id, n: A.length, liq: soma(A, "liq") }; });
  const aberto = L.filter(x => x.stat === "pendente");
  // parcelamento: cada parcela paga é uma linha ("APROVADO R 1x3"); as que faltam ainda vão cair
  const porTx = {}; ap.filter(x => /^\d+x\d+$/.test(x.parc || "")).forEach(x => (porTx[x.tx] = porTx[x.tx] || []).push(x));
  let parcFut = 0, parcN = 0; Object.values(porTx).forEach(A => { const n = Math.max(...A.map(x => +x.parc.split("x")[1])), falta = n - A.length; if (falta > 0) { parcN += falta; parcFut += falta * (A[A.length - 1].liq || 0); } });
  return { linhas: L.length, nAp: new Set(ap.map(x => x.tx)).size, bruto: soma(ap, "bruto"), liq: soma(ap, "liq"), coprod: soma(ap, "coprod"), repassado: soma(ap.filter(x => x.repasse), "liq"), aReceber: soma(ap.filter(x => !x.repasse), "liq"),
    aberto: aberto.length, abertoV: soma(aberto, "pend") || soma(aberto, "bruto"), parcN, parcFut: Math.round(parcFut * 100) / 100, canc: txs("cancelado"), est: txs("estornado"), ofertas, reps,
    cortesias: new Set(ap.filter(x => x.tipo === "cortesia").map(x => x.tx)).size };
}
function vendasPainel(ed) {
  const D = vendasDoc(), V = vendasResumo(), dd = d => d ? d.split("-").reverse().slice(0, 2).join("/") : "";
  if (!V.linhas) return `<section class="panel"><h3>Vendas do TOP</h3><div class="empty">Importe o relatório de vendas da TicketAndGo${ed ? " no botão <b>Importar vendas</b> (ou em Importar relatório)" : ""}. As vendas aprovadas entram como entrada do Financeiro.</div></section>`;
  const TIPO = { participante: "Senderistas", legendario: "Legendários servidores", cortesia: "Cortesias" };
  return `<section class="panel vend"><h3>Vendas do TOP <small>TicketAndGo</small></h3>
    <p class="hint" style="margin:0 0 10px">Importado ${D.importadoEm ? new Date(D.importadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}${D.por ? " por " + esc(D.por) : ""} · ${V.linhas} linha(s) da planilha.</p>
    <div class="kpis vend-cards">
      ${[["v:vendido", "Vendido", brl(V.bruto), `${V.nAp} venda(s) aprovada(s)`, ""],
        ["v:coprod", "Taxa Legendários Global", brl(V.coprod), V.bruto ? pct(V.coprod, V.bruto) + "% do vendido" : "comissão do coprodutor", ""],
        ["v:liq", "Fica com a base", brl(V.liq), "entra no Financeiro", "lucro"],
        ["v:repassado", "Já repassado", brl(V.repassado), `${brl(V.aReceber)} a liberar`, ""],
        ["v:aberto", "Boletos em aberto", String(V.aberto), V.aberto ? brl(V.abertoV) + " para pagar" : "nenhum", V.aberto ? "alert" : ""],
        ["v:parc", "Parcelas a vencer", brl(V.parcFut), V.parcN ? V.parcN + " parcela(s) do parcelamento" : "nenhuma", ""],
        ["v:canc", "Canceladas / estornadas", String(V.canc + V.est), `${V.canc} cancelada(s) · ${V.est} estorno(s)`, ""],
        ["v:cort", "Cortesias", String(V.cortesias), "ingressos gratuitos", ""]]
        .map(([k, l, v, sub, cl]) => `<button type="button" class="kpi kpi-btn ${cl}" data-fin-det="${k}"><span class="lbl">${l}</span><span class="val num" style="font-size:24px">${v}</span><span class="sub">${sub}</span></button>`).join("")}
    </div>
    <div class="vend-grid">
      <div><h4>Por oferta</h4><div class="list">${V.ofertas.map(o => `<div class="li li-btn" role="button" tabindex="0" data-fin-det="${esc("of:" + o.oferta)}"><span class="grow"><b>${esc(o.oferta)}</b><br><span class="hint">${TIPO[o.tipo]} · ${o.n} venda(s) · bruto ${brl(o.bruto)}</span></span><b class="num">${brl(o.liq)}</b></div>`).join("")}</div></div>
      <div><h4>Repasses recebidos</h4><div class="list">${V.reps.map(x => `<div class="li li-btn" role="button" tabindex="0" data-fin-det="${esc("rep:" + x.data + "|" + x.id)}"><span class="grow"><b>${dd(x.data)}</b><br><span class="hint">repasse ${esc(x.id)} · ${x.n} pagamento(s)</span></span><b class="num">${brl(x.liq)}</b></div>`).join("") || `<div class="empty">Nenhum repasse ainda.</div>`}
        ${V.aReceber ? `<div class="li li-btn" role="button" tabindex="0" data-fin-det="v:liberar"><span class="grow"><b>A liberar</b><br><span class="hint">aprovado, ainda sem repasse</span></span><b class="num">${brl(V.aReceber)}</b></div>` : ""}</div></div>
    </div></section>`;
}
document.addEventListener("change", async e => {
  if (!e.target || e.target.id !== "vendasArq") return;
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { impArquivo = f.name; const linhas = await lerPlanilha(f);
    if (!ehVendas(linhas)) { toast("Essa planilha não parece o relatório de vendas da TicketAndGo."); return; }
    vendasImportForm(linhas, f.name);
  } catch (x) { toast("Não consegui ler a planilha. " + (x.message || "")); }
});
/* Taxa da Legendários Global (demo): a comissão do coprodutor que a TicketAndGo separa de cada venda */
const TAXA_GLOBAL = () => true;   // liberado no app real em 31/10/2026
function vendasImportForm(linhas, arquivo) {
  const L = vendasLer(linhas), V = vendasResumo(L), antes = vendasDoc().linhas || [], ja = new Set(antes.map(x => x.k));
  const novas = L.filter(x => !ja.has(x.k)).length, mudou = L.filter(x => { const a = antes.find(y => y.k === x.k); return a && (a.stat !== x.stat || a.repasse !== x.repasse); }).length;
  modal(`<h3>Importar vendas do TOP</h3>
    <p class="hint" style="margin:0">Reconheci o <b>relatório de vendas da TicketAndGo</b>. As vendas aprovadas entram como entrada no Financeiro de ${esc(topName())}. CPF, e-mail e telefone dos compradores não são guardados.</p>
    <div class="imp-kpis">
      <div class="ok"><b class="num">${brl(V.liq)}</b><span>fica com a base</span></div>
      <div><b class="num">${V.nAp}</b><span>vendas aprovadas</span></div>
      <div><b class="num">${novas}</b><span>linhas novas</span></div>
      <div><b class="num">${mudou}</b><span>mudaram de status ou repasse</span></div>
    </div>
    <p class="hint">Vendido ${brl(V.bruto)} · Taxa Legendários Global ${brl(V.coprod)} · ${V.aberto} boleto(s) em aberto · ${V.canc} cancelada(s). A planilha nova substitui a anterior deste TOP.</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${ico("upload")} Importar</button></div></div>`,
  () => { closeModal(); save(() => api.set("config", `vendas-${curTopId()}`, { top: curTopId(), linhas: L, importadoEm: agoraISO(), por: ME.adm || "", arquivo: arquivo || "" }), `Vendas importadas: ${brl(V.liq)} de entrada`).then(() => { if (S.view !== "financeiro") go("financeiro"); else render(); }); });
}

/* ---------- Gastos das equipes (demo): o coordenador lança, a ADM aprova ----------
   config fingasto-<top>-<membro> {top, membro, nome, equipe, itens:[{id,desc,valor,data,area,pag,reemb,pix,obs,foto,fotoPath,status,motivo,decPor,decEm,por,em}]}
   status: pendente | aprovado | recusado | reembolsado. Só aprovado e reembolsado entram no total e no PDF. */
const FEQ_PAG = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"];
const FEQ_TXT = { pendente: "Aguardando aprovação", aprovado: "Aprovado", recusado: "Recusado", reembolsado: "Reembolsado" };
const FEQ_CHIP = { pendente: "wait", aprovado: "ok", recusado: "bad", reembolsado: "ok" };
const gastoDocId = (mid = ME.id) => `fingasto-${curTopId()}-${mid || "eu"}`;
const feqDocs = () => Object.entries(S.cfgDocs || {}).filter(([k, v]) => k.startsWith(`fingasto-${curTopId()}-`) && v && Array.isArray(v.itens));
const feqItens = () => feqDocs().flatMap(([doc, v]) => v.itens.map(i => ({ ...i, doc, equipe: v.equipe || "", por: i.por || v.nome || "" })));
const feqAprovados = () => COORD() ? feqItens().filter(i => i.status === "aprovado" || i.status === "reembolsado").map(i => ({ ...i, tipo: "gasto" })) : [];
let gastoFotoArq = null;
async function gastoSalvar(fn, msg) {   // o coordenador grava só o documento dele (o banco confere)
  const id = gastoDocId(), D = cfgDe(id) || {};
  try { await api.set("config", id, { top: curTopId(), membro: ME.id, nome: ME.adm, equipe: ME.equipeLgnd, cargo: ME.cargo, itens: fn(D.itens || []) }); if (msg) toast(msg); }
  catch (e) { toast("Não foi possível salvar. " + erroAmigavel(e)); }
  render();
}
const feqLinha = (i, acoes) => `<div class="cel-li feq ${i.status === "recusado" ? "nao" : i.status === "pendente" ? "" : "guardado"}">
    ${i.foto || i.fotoPath ? `<button type="button" class="cel-foto" data-feq-foto="${esc(i.doc + "|" + i.id)}" aria-label="Ver comprovante">${celFotoSrc(i) ? `<img src="${esc(celFotoSrc(i))}" alt="">` : "🧾"}</button>` : `<span class="cel-foto vazia">🧾</span>`}
    <div class="cel-info"><b>${esc(i.desc)}</b><small>${esc([i.equipe && "Equipe " + i.equipe, i.por, i.area, i.data && new Date(i.data + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), i.pag].filter(Boolean).join(" · "))}</small>
      <span class="feq-st"><span class="chip ${FEQ_CHIP[i.status] || "wait"}">${FEQ_TXT[i.status] || "Aguardando aprovação"}</span>${CONTAS() ? contaChip(i) : ""}${i.reemb && i.status !== "reembolsado" && i.status !== "recusado" ? ` <span class="chip sent">Reembolsar${i.pix ? " · Pix " + esc(i.pix) : ""}</span>` : ""}</span>
      ${i.obs ? `<small>${esc(i.obs)}</small>` : ""}${i.motivo && i.status === "recusado" ? `<small class="feq-mot">Motivo: ${esc(i.motivo)}</small>` : ""}
      ${acoes || ""}</div>
    <b class="num fin-v">${brl(i.valor)}</b></div>`;
function feqPainel(ed) {
  const L = feqItens().sort((a, b) => (a.status === "pendente" ? 0 : 1) - (b.status === "pendente" ? 0 : 1) || (b.em || "").localeCompare(a.em || ""));
  const pend = L.filter(i => i.status === "pendente"), aReemb = L.filter(i => i.reemb && i.status === "aprovado");
  const acoes = i => !ed ? "" : `<div class="feq-acoes">${i.status === "pendente" ? `<button class="btn sm primary" type="button" data-feq="${esc(i.doc + "|" + i.id + "|ok")}">${ico("check")} Aprovar</button><button class="btn sm" type="button" data-feq="${esc(i.doc + "|" + i.id + "|no")}">Recusar</button>` : ""}${i.status === "aprovado" && i.reemb ? `<button class="btn sm primary" type="button" data-feq="${esc(i.doc + "|" + i.id + "|reemb")}">Marcar reembolsado</button>` : ""}${i.status !== "pendente" ? `<button class="btn sm ghost" type="button" data-feq="${esc(i.doc + "|" + i.id + "|volta")}">Voltar para análise</button>` : ""}</div>`;
  return `<section class="panel"><h3>Saídas das equipes <small>${L.length}</small></h3>
    <p class="hint" style="margin:0 0 8px">Lançados pelos coordenadores com o comprovante. ${pend.length ? `<b>${pend.length} aguardando aprovação</b>. ` : ""}${aReemb.length ? `${aReemb.length} para reembolsar (${brl(aReemb.reduce((s, i) => s + (+i.valor || 0), 0))}). ` : ""}Só os aprovados entram no total e na prestação de contas.</p>
    <div class="cel-lista">${L.map(i => feqLinha(i, acoes(i))).join("") || `<div class="empty">Nenhuma saída lançada pelas equipes ainda.</div>`}</div></section>`;
}
function feqDecidir(doc, id, acao) {
  if (!podeEditar()) { toast("Seu acesso é somente leitura."); return; }
  const muda = (extra) => save(() => { const D = cfgDe(doc) || {}; return api.set("config", doc, { ...D, itens: (D.itens || []).map(i => i.id === id ? { ...i, ...extra, decPor: ME.adm || "", decEm: agoraISO() } : i) }); },
    { ok: "Saída aprovada", no: "Saída recusada", reemb: "Marcado como reembolsado", volta: "Voltou para análise" }[acao]).then(render);
  if (acao === "no") {
    modal(`<h3>Recusar saída</h3><div class="field"><label for="f-fm">Motivo (o coordenador vê)</label><input id="f-fm" name="motivo" required placeholder="ex.: comprovante ilegível, compra não combinada"></div>
      <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn danger" type="submit">Recusar</button></div></div>`,
      fd => { const motivo = String(fd.get("motivo") || "").trim(); if (!motivo) return; closeModal(); muda({ status: "recusado", motivo }); });
    return;
  }
  muda(acao === "ok" ? { status: "aprovado", motivo: "" } : acao === "reemb" ? { status: "reembolsado", reembEm: agoraISO() } : { status: "pendente", motivo: "" });
}
function vFinCoord() {
  const L = feqItens().filter(i => i.equipe === ME.equipeLgnd).sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.em || "").localeCompare(a.em || ""));
  const meu = i => i.doc === gastoDocId(), soma = st => L.filter(i => st.includes(i.status)).reduce((s, i) => s + (+i.valor || 0), 0);
  const pend = L.filter(i => i.status === "pendente"), aReemb = L.filter(i => meu(i) && i.reemb && i.status === "aprovado");
  return `
  <div class="head"><div><h2>Financeiro da equipe</h2><p>Lance aqui as saídas (o que você gastou) pela equipe ${esc(ME.equipeLgnd || "")}, com a foto do comprovante. Vai direto para a ADM aprovar.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-gasto="">${ico("plus")} Lançar saída</button></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Aprovado</span><span class="val num" style="font-size:24px">${brl(soma(["aprovado", "reembolsado"]))}</span><span class="sub">saídas da equipe</span></div>
    <div class="kpi ${pend.length ? "alert" : ""}"><span class="lbl">Em análise</span><span class="val num" style="font-size:24px">${brl(soma(["pendente"]))}</span><span class="sub">${pend.length} aguardando a ADM</span></div>
    <div class="kpi"><span class="lbl">A receber</span><span class="val num" style="font-size:24px">${brl(aReemb.reduce((s, i) => s + (+i.valor || 0), 0))}</span><span class="sub">reembolso aprovado para você</span></div>
  </div>
  <section class="panel"><h3>Saídas da equipe <small>${L.length}</small></h3><div class="cel-lista">${L.map(i => feqLinha(i, meu(i) && i.status !== "aprovado" && i.status !== "reembolsado" ? `<div class="feq-acoes"><button class="btn sm" type="button" data-gasto="${esc(i.id)}">${ico("edit")} ${i.status === "recusado" ? "Corrigir e reenviar" : "Editar"}</button></div>` : "")).join("") || `<div class="empty">Nenhuma saída ainda. Toque em <b>Lançar saída</b> e tire a foto do comprovante.</div>`}</div></section>
  <p class="hint">Depois de aprovada, a saída não pode mais ser alterada. Se precisar corrigir, fale com a ADM.</p>`;
}
function gastoForm(id) {
  const it = ((cfgDe(gastoDocId()) || {}).itens || []).find(x => x.id === id) || { data: hojeISO(), area: "Outros", pag: "Pix", reemb: false };
  if (it.status === "aprovado" || it.status === "reembolsado") { toast("Saída já aprovada: fale com a ADM para mudar."); return; }
  let foto = celFotoSrc(it) || ""; gastoFotoArq = null;
  modal(`<h3>${it.id ? "Editar saída" : "Lançar saída"}</h3>
    ${it.status === "recusado" && it.motivo ? `<p class="hint" style="margin:0 0 8px">A ADM recusou: <b>${esc(it.motivo)}</b>. Corrija e salve para reenviar.</p>` : ""}
    <div class="form">
      <div class="field full"><label for="f-gd">O que foi comprado</label><input id="f-gd" name="desc" value="${esc(it.desc || "")}" placeholder="ex.: 6 pilhas para os rádios, lona" required></div>
      <div class="field"><label for="f-gv">Valor (R$)</label><input id="f-gv" name="valor" inputmode="decimal" value="${it.valor != null ? String(it.valor).replace(".", ",") : ""}" required></div>
      <div class="field"><label for="f-gdt">${CONTAS() ? "Data da compra" : "Data"}</label><input id="f-gdt" name="data" type="date" value="${esc(it.data || "")}"></div>
      <div class="field"><label for="f-ga">Categoria</label><select id="f-ga" name="area">${FIN_AREAS.map(a => `<option ${it.area === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
      ${CONTAS() ? contaCampos(it) : `<div class="field"><label for="f-gp">Como pagou</label><select id="f-gp" name="pag">${FEQ_PAG.map(a => `<option ${it.pag === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>`}
      <div class="field full"><div class="cel-motivos"><label><input type="checkbox" name="reemb" id="f-gr" ${it.reemb ? "checked" : ""}> Paguei do meu bolso, preciso de reembolso</label></div></div>
      <div class="field full" id="gPix" ${it.reemb ? "" : "hidden"}><label for="f-gx">Chave Pix para o reembolso</label><input id="f-gx" name="pix" value="${esc(it.pix || "")}" autocomplete="off" placeholder="celular, e-mail ou chave aleatória"></div>
      <div class="field full"><label for="f-go">Observação</label><input id="f-go" name="obs" value="${esc(it.obs || "")}" placeholder="opcional"></div>
      <div class="field full"><span class="lab">Comprovante (obrigatório)</span><div class="cel-acoes" style="margin:0"><label class="btn">📷 ${foto ? "Trocar foto" : "Tirar foto do comprovante"}<input type="file" accept="image/*" capture="environment" id="gFoto" hidden></label></div>
        <img id="gPrev" class="cel-grande" src="${esc(foto)}" alt="" ${foto ? "" : "hidden"}></div>
      <span class="err field full" id="gErr" hidden></span>
    </div>
    <div class="modal-foot"><div>${it.id ? `<button class="btn danger" type="button" id="gDel">Excluir</button>` : ""}</div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${it.id ? "Salvar e enviar" : "Enviar para a ADM"}</button></div></div>`, fd => {
    const err = m => { const x = $("#gErr"); x.textContent = m; x.hidden = false; };
    const desc = String(fd.get("desc") || "").trim(); if (!desc) { err("Diga o que foi comprado."); return; }
    const valor = Number(String(fd.get("valor") || "").replace(/\./g, "").replace(",", ".")); if (!(valor > 0)) { err("Confira o valor."); return; }
    if (!foto) { err("Tire a foto do comprovante."); return; }
    const reemb = fd.get("reemb") === "on", pix = String(fd.get("pix") || "").trim(); if (reemb && !pix) { err("Coloque a chave Pix para o reembolso."); return; }
    const arq = gastoFotoArq; closeModal();
    (async () => { const f = arq ? await fotoGuardar(arq, `gastos/${curTopId()}/${ME.id}/comprovante`) : { foto: it.foto || "", fotoPath: it.fotoPath || "" };
      const novo = { ...it, id: it.id || Date.now().toString(36), desc, valor, data: fd.get("data") || hojeISO(), area: fd.get("area"), pag: fd.get("pag"), reemb, pix: reemb ? pix : "", obs: String(fd.get("obs") || "").trim(), ...f, ...(CONTAS() ? contaLer(fd, valor, it) : {}), status: "pendente", motivo: "", por: ME.adm || "", em: it.em || agoraISO() };
      gastoSalvar(L => [...L.filter(x => x.id !== novo.id), novo], it.id ? "Saída reenviada para a ADM" : "Saída enviada para a ADM"); })(); });
  $("#gFoto").addEventListener("change", async e => { const fl = e.target.files[0]; if (!fl) return; gastoFotoArq = fl; try { foto = await reduzirFoto(fl, 700); $("#gPrev").src = foto; $("#gPrev").hidden = false; } catch { toast("Não consegui abrir a foto."); } });
  $("#f-gr").addEventListener("change", e => { $("#gPix").hidden = !e.target.checked; });
  if (CONTAS()) contaLigar("f-gv");
  const d = $("#gDel"); if (d) d.onclick = () => { if (!confirm("Excluir esta saída?")) return; closeModal(); gastoSalvar(L => L.filter(x => x.id !== it.id), "Saída excluída"); };
}

/* Período do backup: dia, semana (7 dias), mês (30 dias) ou o TOP todo. Num período, entra o que foi criado ou alterado dentro dele. */
const BK_PER = [{ v: "dia", l: "Diário", d: "o que mudou hoje", dias: 1 }, { v: "semana", l: "Semanal", d: "o que mudou nos últimos 7 dias", dias: 7 },
  { v: "mes", l: "Mensal", d: "o que mudou nos últimos 30 dias", dias: 30 }, { v: "top", l: "TOP todo", d: "tudo do TOP, completo", dias: 0 }];
const BK_DATAS = ["atualizado", "admEm", "em", "criadoEm", "importadoEm", "entregueEm", "aptoEm", "termoAssinadoEm", "pagoEm", "cobradoEm", "cobradoPagEm", "atualizadoEm"];
const ultimaMudanca = o => BK_DATAS.map(k => o && o[k]).filter(x => typeof x === "string" && /^\d{4}-\d{2}-\d{2}/.test(x)).sort().pop() || "";
function backupForm() {
  modal(`
    <h3>Baixar backup</h3>
    <p class="hint" style="margin:0">Escolha o período. Diário, semanal e mensal trazem só o que foi criado ou alterado nesse tempo. TOP todo traz tudo.</p>
    <div class="bk-opcoes">${BK_PER.map((o, i) => `<label class="bk-op"><input type="radio" name="per" value="${o.v}" ${o.v === "top" ? "checked" : ""}><span><b>${o.l}</b><small>${o.d}</small></span></label>`).join("")}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${ico("upload")} Baixar</button></div></div>`,
  fd => { const per = fd.get("per") || "top"; closeModal(); baixarBackup(per); });
}
async function baixarBackup(per = "top") {
  toast("Gerando o backup…");
  try {
    const X = await carregarXlsx(), wb = X.utils.book_new(), P = BK_PER.find(o => o.v === per) || BK_PER[3];
    const desde = P.dias ? (P.dias === 1 ? hojeISO() : new Date(Date.now() - P.dias * 864e5).toISOString()) : "";
    const noPer = lista => !desde ? lista : lista.filter(o => { const m = ultimaMudanca(o); return m && (P.dias === 1 ? m.slice(0, 10) >= desde || new Date(m).toLocaleDateString("sv") === desde : m >= desde); });
    const resumo = [];
    const cel = v => v == null ? "" : typeof v === "object" ? JSON.stringify(v).slice(0, 32000) : v;
    const aba = (nome, lista) => {
      lista = noPer(lista); resumo.push([nome, lista.length]);
      const cols = [...new Set(lista.flatMap(o => Object.keys(o || {})))].filter(c => c !== "_adm");
      X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet([cols, ...lista.map(o => cols.map(c => cel(o[c])))]), nome.slice(0, 31));
    };
    const lg = p => p.tipo === "legendario";
    aba("Senderistas", S.P.filter(p => !lg(p)));
    aba("Legendários", S.P.filter(lg));
    aba("Checklist", S.T);
    aba("Estoque", S.estoque);
    aba("Pista", S.pista);
    aba("Ocorrências", ocorrencias());
    aba("Pins", pinsTodos());
    aba("Tops", S.tops);
    aba("Configurações", Object.entries(S.cfgDocs || {}).filter(([k]) => k !== "pista-mapa" && (!desde || ultimaMudanca(S.cfgDocs[k]))).map(([id, d]) => ({ id, dados: d, ...(ultimaMudanca(d) ? { atualizado: ultimaMudanca(d) } : {}) })));
    const rs = X.utils.aoa_to_sheet([["Backup ADM 3Colinas"], ["TOP", topName()], ["Período", `${P.l} (${P.d})`], ["Gerado em", new Date().toLocaleString("pt-BR")], ["Por", ME.adm || ""], [], ["Aba", "Registros"], ...resumo]);
    X.utils.book_append_sheet(wb, rs, "Resumo"); wb.SheetNames.unshift(wb.SheetNames.pop());   // Resumo como primeira aba
    X.writeFile(wb, `backup-adm3colinas-${curTopId()}-${P.v}-${hojeISO()}.xlsx`);
    await api.set("config", "backup-ultimo", { em: new Date().toISOString(), por: ME.adm || "", top: curTopId(), periodo: P.v });
    toast("Backup baixado. Guarde o arquivo no Drive.");
  } catch (e) { console.error(e); toast("Não consegui gerar o backup. Confira a internet."); }
}
const TERMO_LINK = () => true; // link individual do termo (planilha de assinaturas) na cobrança
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
      ${podePontos() && MAPA_PONTOS() && E.lin ? `<button class="btn primary" type="button" data-act="mp-novo">${ico("plus")} Ponto no mapa</button>` : ""}
      ${ed ? `<button class="btn" type="button" data-act="kmz">${ico("upload")} Importar KMZ</button>` : ""}</div></div>
    ${MAPA_PONTOS() && S.mpPick ? `<div class="mp-faixa">${ico("route")} <b>Toque no mapa</b> onde fica o ponto <span class="grow"></span><button class="btn sm" type="button" data-act="mp-gps">Estou aqui (GPS)</button><button class="btn sm ghost" type="button" data-act="mp-cancelar">Cancelar</button></div>` : ""}
    ${mom ? `<div class="av-momento"><span class="lbl">${mom.andando ? "Acontecendo agora" : "Último momento"}</span><b>${esc(mom.atv)}</b><small class="hint">${mom.andando ? "começou " : "terminou "}${esc(mom.andando ? mom.ini : mom.fim || mom.ini)}${E.ponto ? ` · no mapa: ${esc(E.ponto.n)}` : ""}</small></div>` : ""}
    <p class="hint" style="margin:0">${!E.andou ? "A corrente ainda não saiu neste dia." : E.lin ? `${km(E.ateM)} de ${km(E.total)} km do ${esc(dia.dia)} (${Math.round(E.ateM / (E.total || 1) * 100)}%)${!E.usaPonto && pos.estimado ? " · posição estimada pelo tempo previsto do trecho" : ""}` : ""}</p>
    ${E.lin ? `<div id="avMapa" class="av-mapa"></div>` : `<div class="empty">${pistaMapa() ? `O KMZ não tem a linha do ${esc(dia.dia)}.` : ed ? "Importe o KMZ da pista para ver o mapa." : "O mapa da pista ainda não foi enviado."}</div>`}
    ${MAPA_PONTOS() && E.lin ? mpFiltro() : ""}
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
  const ruas = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap", crossOrigin: true });
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri", crossOrigin: true });
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
  const tipos = MAPA_PONTOS() ? mpOcultos() : null;
  (P.pontos || []).forEach(p => { const on = ponto && p === ponto, tp = MAPA_PONTOS() && mpTipoDoNome(p.n);
    if (tp) { if (!tipos.has(tp.k)) mpMarcador(L, map, { ...p, nome: p.n, tipo: tp.k, kmz: true }, on); return; }
    if (MAPA_PONTOS() && tipos.has("kmz")) return;
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
  equipeNoMapa(L, map);
  if (MAPA_PONTOS()) { const off = mpOcultos(); mpLista().filter(x => !off.has(x.tipo)).forEach(x => mpMarcador(L, map, x));
    if (S.mpPick) { el.classList.add("mp-pegar"); map.once("click", e => { S.mpPick = false; el.classList.remove("mp-pegar"); pontoForm(null, { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }); }); } }
  if (antes) map.setView(antes.c, antes.z); else map.fitBounds(L.latLngBounds(lin), { padding: [30, 30] });
  mapaAV = { map, dia: dia.id, cam };
}
/* Pontos no mapa (01/11/2026, só DEMO): hidratação, almoço, carro de apoio etc. Quem edita adiciona pelo app (tocar no mapa ou GPS) e todos veem.
   config mapa-pontos-<top> {lista:[{id,tipo,nome,obs,lat,lng,por,em}]}. Pontos do KMZ com o tipo no nome ("Hidratação 1", "Almoço D2") ganham o mesmo ícone. */
const MAPA_PONTOS = () => true;   // app real desde 01/11/2026
const MP_PERM = "mapa-pontos";   // marcado em Usuários: pode colocar pontos no mapa (além do dono)
const podePontos = () => S.isOwner || (!!ME.permMapa && podeEditar());
const MP_TIPOS = [
  { k: "agua", l: "Hidratação", e: "💧", c: "#3ba3ff", re: /hidrat|\bagua\b|abastec/ },
  { k: "almoco-s", l: "Almoço senderistas", e: "🍽️", c: "#ff7a1a", re: /almoco.*send|refeic.*send|almoco(?!.*leg)/ },
  { k: "almoco-l", l: "Almoço legendários", e: "🍲", c: "#f2b233", re: /almoco.*(leg|lgnd)|refeic.*(leg|lgnd)/ },
  { k: "apoio", l: "Carro de apoio", e: "🚙", c: "#a78bfa", re: /apoio|resgate/ },
  { k: "ambulancia", l: "Ambulância", e: "🚑", c: "#ff5d52", re: /ambulan|medic|socorr/ },
  { k: "banheiro", l: "Banheiro", e: "🚻", c: "#46c486", re: /banheir|sanitar/ },
  { k: "acesso", l: "Ponto de acesso", e: "🚧", c: "#9ca3af", re: /acesso|portao|portaria/ },
  { k: "outro", l: "Outro", e: "📍", c: "#e5e7eb", re: null },
];
const mpTipo = k => MP_TIPOS.find(t => t.k === k) || MP_TIPOS[MP_TIPOS.length - 1];
const mpTipoDoNome = n => { const x = norm(n || ""); return MP_TIPOS.find(t => t.re && (t.k === "almoco-l" ? t.re.test(x) : false)) || MP_TIPOS.find(t => t.re && t.re.test(x)) || null; };
const mpId = () => "mapa-pontos-" + curTopId();
const mpLista = () => ((S.cfgDocs || {})[mpId()] || {}).lista || [];
const mpOcultos = () => { try { return new Set(JSON.parse(store.get("adm3-mp-off") || "[]")); } catch (e) { return new Set(); } };
function mpMarcador(L, map, p, on) {
  const t = mpTipo(p.tipo), ed = !p.kmz && podePontos();
  L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "mp-pin" + (on ? " on" : ""), html: `<i style="--c:${t.c}">${t.e}</i>`, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: on ? 950 : 800 })
    .addTo(map).bindTooltip(esc(p.nome || t.l), { direction: "top", offset: [0, -12] })
    .bindPopup(`<div class="mp-pop"><small>${t.e} ${esc(t.l)}</small><b>${esc(p.nome || t.l)}</b>${p.obs ? `<p>${esc(p.obs)}</p>` : ""}
      <small class="hint">${p.kmz ? "do KMZ da pista" : [p.por && "por " + esc(p.por), p.em && haQuanto(p.em)].filter(Boolean).join(" · ")}</small>
      <div class="mp-pop-a"><a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}" target="_blank" rel="noopener">Rota</a>${ed ? `<button class="btn sm" type="button" data-mp-edit="${esc(p.id)}">Editar</button>` : ""}</div></div>`);
}
function mpFiltro() {
  const P = pistaMapa() || {}, off = mpOcultos(), cont = {};
  mpLista().forEach(x => { cont[x.tipo] = (cont[x.tipo] || 0) + 1; });
  (P.pontos || []).forEach(x => { const t = mpTipoDoNome(x.n); const k = t ? t.k : "kmz"; cont[k] = (cont[k] || 0) + 1; });
  const ks = [...MP_TIPOS.map(t => t.k), "kmz"].filter(k => cont[k]); if (!ks.length) return "";
  return `<div class="mp-filtro" role="group" aria-label="Mostrar no mapa">${ks.map(k => { const t = k === "kmz" ? { e: "•", l: "Outros pontos da pista", c: "#ffd29a" } : mpTipo(k);
    return `<button type="button" class="mp-f" data-mp-f="${k}" aria-pressed="${!off.has(k)}" style="--c:${t.c}"><span>${t.e}</span>${esc(t.l)} <small class="num">${cont[k]}</small></button>`; }).join("")}</div>`;
}
function pontoForm(p, pos) {
  if (!podePontos()) { toast("Só o dono e quem ele liberar em Usuários podem colocar pontos no mapa."); return; }
  const novo = !p; p = p || { tipo: "agua", nome: "", obs: "" }; let onde = pos || { lat: p.lat, lng: p.lng };
  modal(`<h3>${novo ? "Novo ponto no mapa" : "Editar ponto"}</h3>
    <div class="form">
      <div class="field full"><span class="lab">Tipo</span><div class="or-tipos">${MP_TIPOS.map(t => `<label class="or-t"><input type="radio" name="tipo" value="${t.k}" ${p.tipo === t.k ? "checked" : ""}><span>${t.e} ${t.l}</span></label>`).join("")}</div></div>
      <div class="field full"><label for="mp-n">Nome (opcional)</label><input id="mp-n" name="nome" value="${esc(p.nome || "")}" placeholder="ex.: Hidratação 2, Almoço D2"></div>
      <div class="field full"><label for="mp-o">Observação (opcional)</label><input id="mp-o" name="obs" value="${esc(p.obs || "")}" placeholder="ex.: 40 galões, chega às 11h, responsável Henrique"></div>
      <p class="hint full" id="mpOnde">Local: ${onde.lat.toFixed(5)}, ${onde.lng.toFixed(5)}${novo ? "" : ` · <button class="linkbtn" type="button" id="mpGps">usar minha posição agora</button>`}</p>
    </div>
    <div class="modal-foot"><div>${novo ? "" : `<button class="btn danger" type="button" id="delBtn">Excluir</button>`}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => {
    const t = mpTipo(fd.get("tipo") || "outro"), item = { ...p, id: p.id || "mp" + Date.now().toString(36), tipo: t.k, nome: String(fd.get("nome") || "").trim() || t.l,
      obs: String(fd.get("obs") || "").trim(), lat: onde.lat, lng: onde.lng, por: p.por || ME.adm || "", em: p.em || new Date().toISOString() };
    closeModal();
    const L = mpLista().filter(x => x.id !== item.id); L.push(item);
    save(() => api.set("config", mpId(), { lista: L }), novo ? `${t.l} adicionado no mapa` : "Ponto atualizado");
  });
  const g = $("#mpGps"); if (g) g.onclick = () => mpPegarGps(q => { onde = q; $("#mpOnde").textContent = `Local: ${q.lat.toFixed(5)}, ${q.lng.toFixed(5)} (sua posição)`; });
  const del = $("#delBtn");
  if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal();
    save(() => api.set("config", mpId(), { lista: mpLista().filter(x => x.id !== p.id) }), "Ponto excluído"); };
}
function mpPegarGps(ok) {
  const falha = () => toast("Não consegui sua localização. Confira a permissão ou toque no mapa.");
  if (!navigator.geolocation) { if (DEMO) ok({ lat: -20.2105, lng: -47.2731 }); else falha(); return; }
  toast("Pegando sua localização…");
  navigator.geolocation.getCurrentPosition(g => ok({ lat: +g.coords.latitude.toFixed(6), lng: +g.coords.longitude.toFixed(6) }), () => DEMO ? ok({ lat: -20.2105, lng: -47.2731 }) : falha(), { enableHighAccuracy: true, timeout: 10000 });
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
const corStatus = t => /^(confirmado|apto|assinado|sim|ok|pronto|entregue|ativa|pago|guardado|devolvido)/i.test(t) ? PDF_COR.VERDE
  : /^(zerado|não assinou|não entregou|cancelad|bloquead)/i.test(t) ? PDF_COR.VERMELHO
  : /^(pendente|baixo|aguardando|msg enviada|em andamento|a fazer|não|conferir|boleto|falta)/i.test(t) ? PDF_COR.AMBAR : null;
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
  const [logo, faixa, fundo] = await Promise.all([imagemDataUrl("assets/logo.png"), faixaPdf(), sp.capa ? imagemDataUrl("assets/bg.jpg") : null]);
  const doc = new jsPDF({ orientation: retrato ? "portrait" : "landscape", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const adm = ME.adm || "-", gerado = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const p1 = sp.capa ? 2 : 1;   // com capa, a lista começa na página 2
  if (sp.capa) { capaPdf(doc, sp, { logo, fundo, W, H, adm, gerado }); doc.addPage(); }
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
      const col = cols[c.column.index]; if (col && col.foto && c.cell.colSpan === 1) { c.cell.text = []; c.cell.styles.minCellHeight = 22; return; }
      if (!col || !col.status || c.cell.colSpan > 1) return;
      const cor = corStatus(String(c.cell.raw || "")); if (cor) { c.cell.styles.textColor = cor; c.cell.styles.fontStyle = "bold"; }
    },
    didDrawCell: c => {
      const col = cols[c.column.index], raw = String(c.cell.raw || ""); if (c.section !== "body" || !col || !col.foto || !raw.startsWith("data:image")) return;
      try { const pr = doc.getImageProperties(raw), mw = c.cell.width - 2, mh = c.cell.height - 2, k = Math.min(mw / pr.width, mh / pr.height);
        doc.addImage(raw, "JPEG", c.cell.x + 1 + (mw - pr.width * k) / 2, c.cell.y + 1 + (mh - pr.height * k) / 2, pr.width * k, pr.height * k); } catch (e) {}
    },
    didDrawPage: () => { if (doc.internal.getCurrentPageInfo().pageNumber > p1) cabecalho(false); },
  });
  const pg = doc.getNumberOfPages();
  for (let i = p1; i <= pg; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.LARANJA); doc.setLineWidth(0.5); doc.line(12, H - 9.5, W - 12, H - 9.5);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...C.TINTA); doc.text("ADM 3COLINAS", 12, H - 5.5);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.CINZA); doc.text(`${sp.titulo} · ${topName()} · ADM ${adm}`, 12 + doc.getTextWidth("ADM 3COLINAS") + 3, H - 5.5);
    doc.text(`Página ${i - p1 + 1} de ${pg - p1 + 1}`, W - 12, H - 5.5, { align: "right" });
  }
  const hoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const arq = `${sp.arquivo || sp.titulo} ${hoje}.pdf`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w .-]/g, "");
  await entregarPdf(doc.output("blob"), arq, `${sp.titulo} · ${topName()}`, wa);
}
// Visual 2 (demo): capa do relatório, com a montanha, o brasão, os números principais e o que tem dentro
function capaPdf(doc, sp, { logo, fundo, W, H, adm, gerado }) {
  const C = PDF_COR, opac = o => { try { doc.setGState(new doc.GState({ opacity: o })); } catch (e) {} };
  doc.setFillColor(...C.NAVY); doc.rect(0, 0, W, H, "F");
  if (fundo) try { const ih = W * 1308 / 736; doc.addImage(fundo, "JPEG", 0, (H - ih) * .35, W, ih, "fundo", "FAST"); } catch (e) {}
  opac(.4); doc.setFillColor(...C.NAVY); doc.rect(0, 0, W, H, "F");
  for (let k = 0; k < 24; k++) { opac(.035 + k * .0015); doc.rect(0, H * .36 + k * H * .012, W, H, "F"); }   // escurece aos poucos para baixo
  opac(1);
  doc.setFillColor(...C.LARANJA); doc.rect(0, 0, W, 2.2, "F");
  if (logo) try { doc.addImage(logo, "PNG", W / 2 - 19, 32, 38, 48, "logo"); } catch (e) {}
  doc.setFont("helvetica", "bold"); doc.setTextColor(...C.LARANJA); doc.setFontSize(9);
  doc.text("ADM 3COLINAS  ·  LEGENDÁRIOS BASE 3 COLINAS", W / 2, 96, { align: "center" });
  doc.setTextColor(255, 255, 255); doc.setFontSize(34); doc.text(sp.titulo.toUpperCase(), W / 2, 112, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(235, 225, 215); doc.text((sp.sub || topName()).toUpperCase(), W / 2, 122, { align: "center", maxWidth: W - 40 });
  // números principais
  const R = (sp.resumo || []).slice(0, 4), wc = 42, gap = 6, x0 = W / 2 - (R.length * wc + (R.length - 1) * gap) / 2;
  R.forEach(([l, v], k) => { const x = x0 + k * (wc + gap);
    opac(.14); doc.setFillColor(255, 255, 255); doc.roundedRect(x, 150, wc, 30, 3, 3, "F"); opac(1);
    doc.setDrawColor(...C.LARANJA); doc.setLineWidth(0.7); doc.line(x + 8, 154, x + wc - 8, 154);
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text(String(v), x + wc / 2, 168, { align: "center" });
    doc.setFontSize(7); doc.setTextColor(255, 200, 150); doc.text(String(l).toUpperCase(), x + wc / 2, 175, { align: "center" }); });
  // o que tem dentro
  const sec = (sp.secoes || []).map(s => s.titulo).filter(Boolean);
  if (sec.length) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...C.LARANJA); doc.text("NESTE RELATÓRIO", 30, 200, { charSpace: 0.6 });
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(240, 232, 224);
    sec.forEach((s, i) => { const col = i % 2, lin = Math.floor(i / 2), x = 30 + col * (W - 60) / 2, y = 209 + lin * 8;
      doc.setFillColor(...C.LARANJA); doc.circle(x + 1.2, y - 1.3, 1, "F"); doc.text(s, x + 5, y, { maxWidth: (W - 60) / 2 - 8 }); });
  }
  doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.2); doc.line(30, H - 26, W - 30, H - 26);
  doc.setFontSize(8.5); doc.setTextColor(200, 190, 180);
  doc.text(`Gerado em ${gerado} por ${adm}`, 30, H - 19); if (sp.legenda) { doc.setFontSize(7.5); doc.setTextColor(160, 150, 140); doc.text(sp.legenda, 30, H - 14); }
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
    const s = stats(), kits = topKits();
    const sit = e => e.grupo === "equip" ? (e.conferir ? "Conferir" : "OK") : e.qtd === 0 ? "Zerado" : e.qtd <= S.config.alertaBaixo ? "Baixo" : "OK";
    return { titulo: "Estoque e compras", legenda: `Alerta de estoque baixo em até ${S.config.alertaBaixo} unidades`,
      resumo: [["MREs montados", kits], ["Zerados", s.zero.length], ["Baixos", s.low.length]],
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
    const nivel = e => e.dono ? "Dono · acesso total" : e.ativo === false ? "Bloqueado" : e.nivel === "total" ? "Acesso total" : (e.nivel === "leitura" ? "Somente leitura: " : "Edita: ") + (ABAS().filter(x => temAba(e.abas, x)).map(x => x.l).join(", ") || "só o Dashboard");
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
    const s = stats(), pins = pinsTodos(), kits = topKits();
    const L = (a, b, c) => [a, String(b), c];
    return { semSimples: true, titulo: "Dashboard", sub: `Resumo do ${topName()}`, legenda: "Números do momento em que o PDF foi gerado",
      resumo: [["Senderistas", s.n], ["Legendários", s.lg.length], ["Checklist", pct(s.tDone, s.tTotal) + "%"]],
      colunas: [{ t: "Indicador", bold: true }, { t: "Valor", w: 30, al: "center" }, { t: "Detalhe", w: 80, cinza: true }],
      secoes: [
        { titulo: "Senderistas", linhas: [L("Cadastrados", s.n, `${s.mais40.length} com +40 · ${s.semFamilia} sem família`), L("Atestado confirmado", s.atestado, pct(s.atestado, s.n) + "%"), L("Termo assinado", s.termo, pct(s.termo, s.n) + "%"),
          L("Mensagem do grupo", s.msg, pct(s.msg, s.n) + "%"), L("Entraram no grupo", s.grupo, pct(s.grupo, s.n) + "%"), L("NFC registrado", s.nfc, pct(s.nfc, s.n) + "%"), L("Pagamento pendente", S.P.filter(pagPendente).length, "boleto em aberto")] },
        { titulo: "Legendários", linhas: [L("Cadastrados", s.lg.length, ""), L("Atestado confirmado", s.lgAtest, pct(s.lgAtest, s.lg.length) + "%"), L("Termo assinado", s.lgAssinado, pct(s.lgAssinado, s.lg.length) + "%")] },
        { titulo: "Operação", linhas: [L("Checklist pronto", `${s.tDone}/${s.tTotal}`, `${s.tAnd.length} em andamento`), L("MREs montados", kits, "kits lacrados"),
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
  if (!ME.acesso || ehCoordEq() || $("#view .sk-wrap") || !PDF_TELAS.includes(S.view) || (S.view === "usuarios" && S.usrAba === "notif")) return;
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
    marcarImport("pins", `${R.filter(n => !atuais[n.id]).length} novo(s)`);
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
  const kits = topKits();
  const sit = e => {
    if (e.grupo === "equip") return e.conferir ? '<span class="chip sent">Conferir</span>' : '<span class="chip ok">OK</span>';
    if (e.qtd === 0) return '<span class="chip bad">Zerado</span>';
    if (e.qtd <= S.config.alertaBaixo) return '<span class="chip wait">Baixo</span>';
    return '<span class="chip ok">OK</span>';
  };
  const pr = PRECO_ESTOQUE(), ed = podeEditar();
  const section = g => { const items = S.estoque.filter(e => e.grupo === g.v).sort((a, b) => (a.ordem || 0) - (b.ordem || 0)); const vg = items.reduce((a, e) => a + valorItem(e), 0); return `
    <section class="panel"><h3>${g.l} <small>${items.length} itens${pr && vg ? " · " + brl(vg) : ""}</small></h3>
    <div>${items.length ? items.map(e => `<div class="stock-row${pr ? " com-preco" : ""}">
      <div style="min-width:0"><b>${esc(e.item)}</b><div class="meta">${esc([e.local, e.resp ? "compra: " + e.resp : "", e.obs].filter(Boolean).join(" · "))}</div>
        ${pr ? `<div class="preco-linha"><label class="preco-in"><span>R$</span><input type="text" inputmode="decimal" data-preco="${e.id}" value="${e.preco != null ? fmtPreco(e.preco) : ""}" placeholder="preço un." aria-label="Preço unitário de ${esc(e.item)}" ${ed ? "" : "disabled"}></label>
          ${e.preco != null && e.qtd ? `<span class="hint num">= ${brl(valorItem(e))}</span>` : ""}
          <label class="mre-ck" title="Vai no MRE"><input type="checkbox" data-mre="${e.id}" ${ehMre(e) ? "checked" : ""} ${ed ? "" : "disabled"}> MRE</label></div>` : ""}</div>
      ${g.v === "equip" ? `<span class="num" style="font-weight:700">${e.qtd != null ? e.qtd : "—"}</span>` : `<div class="stepper"><button type="button" data-step="-1" data-id="${e.id}" aria-label="Menos ${esc(e.item)}">−</button><span>${e.qtd ?? 0}</span><button type="button" data-step="1" data-id="${e.id}" aria-label="Mais ${esc(e.item)}">+</button></div>`}
      <div style="display:flex;gap:4px;align-items:center">${sit(e)}<button class="linkbtn" type="button" data-edit-item="${e.id}" aria-label="Editar ${esc(e.item)}">${ico("edit")}</button></div>
    </div>`).join("") : `<div class="empty">Nenhum item.</div>`}</div></section>`; };
  return `
  <div class="head"><div><h2>Estoque e compras</h2><p>Use + e − para atualizar na hora da conferência. Alerta de estoque baixo em até ${S.config.alertaBaixo} unidades.</p></div>
    <div class="actions"><button class="btn primary" type="button" data-act="novo-item">${ico("plus")} Novo item</button></div></div>
  ${pr ? vValoresEstoque(kits) : ""}
  <section class="panel"><h3>MREs montados <small>kits lacrados</small></h3>
    <div class="goal"><div class="big num">${kits}<small> MREs</small></div>
      <div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:8px"><span class="hint">Use + e − para somar os MREs conforme forem lacrados · ${s.zero.length} itens zerados e ${s.low.length} baixos no estoque</span></div>
      <div class="stepper"><button type="button" data-kits="-1" aria-label="Menos um kit">−</button><span>${kits}</span><button type="button" data-kits="1" aria-label="Mais um kit">+</button></div>
    </div></section>
  <div class="grid2">${section(GRUPOS[0])}<div style="display:flex;flex-direction:column;gap:16px;min-width:0">${section(GRUPOS[1])}${section(GRUPOS[2])}</div></div>`;
}

// Preços do estoque: preço unitário por item (preco), valor = preço × quantidade. MRE: itens marcados (mre) com quantidade por kit (porMre).
const brl = v => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPreco = v => (Number(v) || 0).toFixed(2).replace(".", ",");
const lePreco = t => { t = String(t || "").replace(/[^\d,.-]/g, ""); if (!t) return null; if (t.includes(",")) t = t.replace(/\./g, "").replace(",", "."); const n = parseFloat(t); return isNaN(n) ? null : Math.round(n * 100) / 100; };
const valorItem = e => (Number(e.preco) || 0) * (Number(e.qtd) || 0);
const ehMre = e => e.mre != null ? !!e.mre : e.grupo === "mre";
const porMre = e => Number(e.porMre) > 0 ? Number(e.porMre) : 1;
function vValoresEstoque(kits) {
  const total = S.estoque.reduce((a, e) => a + valorItem(e), 0), semPreco = S.estoque.filter(e => e.preco == null).length;
  const mre = S.estoque.filter(ehMre).sort((a, b) => norm(a.item).localeCompare(norm(b.item)));
  const custo = mre.reduce((a, e) => a + (Number(e.preco) || 0) * porMre(e), 0), ed = podeEditar();
  const kitsDoEstoque = mre.length ? Math.min(...mre.map(e => Math.floor((Number(e.qtd) || 0) / porMre(e)))) : 0;
  const limita = mre.find(e => Math.floor((Number(e.qtd) || 0) / porMre(e)) === kitsDoEstoque);
  return `<div class="kpis">
    <div class="kpi"><span class="lbl">Valor em estoque</span><span class="val num dinheiro">${brl(total)}</span><span class="sub">${semPreco ? `${semPreco} item(ns) sem preço` : "todos os itens com preço"}</span></div>
    <div class="kpi alert"><span class="lbl">Custo de 1 MRE</span><span class="val num dinheiro">${brl(custo)}</span><span class="sub">${mre.length} item(ns) no MRE${mre.some(e => e.preco == null) ? " · falta preço em " + mre.filter(e => e.preco == null).length : ""}</span></div>
    <div class="kpi"><span class="lbl">MREs montados</span><span class="val num">${kits}</span><span class="sub">gasto nos lacrados: ${brl(custo * kits)}</span></div>
    <div class="kpi"><span class="lbl">Dá para montar</span><span class="val num">${kitsDoEstoque}</span><span class="sub">${limita ? `com o estoque atual · limitado por ${esc(limita.item)}` : "MREs com o estoque atual"}</span></div>
  </div>
  <section class="panel mre-box"><h3>MRE <small>o que vai em cada kit · marque o quadradinho MRE no item para incluir</small></h3>
    ${mre.length ? `<div class="mre-lista">${mre.map(e => `<div class="mre-item"><b>${esc(e.item)}</b>
      <label class="mre-qtd">${ed ? `<input type="number" min="1" step="1" inputmode="numeric" data-por-mre="${e.id}" value="${porMre(e)}" aria-label="Quantidade de ${esc(e.item)} por MRE">` : `<span class="num">${porMre(e)}</span>`} por kit</label>
      <span class="num hint">${e.preco != null ? `${brl(e.preco)} un.` : "sem preço"}</span><b class="num">${e.preco != null ? brl(e.preco * porMre(e)) : "—"}</b></div>`).join("")}
      <div class="mre-item total"><b>Total por MRE</b><span></span><span></span><b class="num">${brl(custo)}</b></div></div>` : `<div class="empty">Nenhum item marcado como MRE.</div>`}
  </section>`;
}

/* ---------- Ocorrências durante o TOP ----------
   Cada ocorrência é um documento config/ocorr-<top>-<id> (um por ocorrência, para dois ADMs não sobrescreverem um ao outro).
   O dono recebe o aviso como qualquer alteração dos ADMs. Apagar = marcar excluida (fica no histórico). */
const OC_TIPOS = ["Mal-estar", "Lesão", "Desistência", "Equipamento perdido ou quebrado", "Comportamento", "Outro"];
const OC_GRAV = [{ v: "leve", l: "Leve", c: "ok" }, { v: "moderada", l: "Moderada", c: "wait" }, { v: "grave", l: "Grave", c: "bad" }];
const ocPref = () => "ocorr-" + curTopId() + "-";
const ocorrencias = () => Object.entries(S.cfgDocs || {}).filter(([k, v]) => k.startsWith(ocPref()) && v && !v.excluida).map(([id, v]) => ({ ...v, id })).sort((a, b) => String(b.em).localeCompare(String(a.em)));
const ocorrAbertas = () => ocorrencias().filter(o => o.status !== "resolvida");
function salvarOcorr(id, o, msg) { const { id: _, ...data } = o; save(() => api.set("config", id, { ...data, top: curTopId(), atualizadoPor: ME.adm || "" }), msg); }
async function copiarTexto(t, ok) {
  try { await navigator.clipboard.writeText(t); toast(ok); }
  catch { const a = document.createElement("textarea"); a.value = t; a.style.position = "fixed"; a.style.opacity = "0"; document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); toast(ok); } catch (e) { prompt("Copie o link:", t); } a.remove(); }
}
function vOcorrencias() {
  const L = ocorrencias(), ab = L.filter(o => o.status !== "resolvida"), f = S.ocFiltro || "abertas", ed = podeEditar();
  const rows = f === "abertas" ? ab : L;
  const hm = iso => new Date(iso).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  const pessoaDe = o => o.pessoaId && S.pessoas.find(p => p.id === o.pessoaId);
  return `
  <div class="head"><div><h2>Ocorrências</h2><p>Tudo o que acontecer durante o ${esc(topName())}: mal-estar, lesão, desistência, equipamento. Quem registra fica anotado e você recebe o aviso.</p></div>
    <div class="actions">${ed ? `<button class="btn primary" type="button" data-act="nova-ocorr">${ico("plus")} Nova ocorrência</button>` : ""}</div></div>
  <div class="kpis">
    <button class="kpi ${ab.length ? "alert" : ""}" type="button" data-oc-filtro="abertas"><span class="lbl">Abertas</span><span class="val num">${ab.length}</span><span class="sub">precisam de acompanhamento</span></button>
    <div class="kpi"><span class="lbl">Graves</span><span class="val num">${L.filter(o => o.grav === "grave").length}</span><span class="sub">${ab.filter(o => o.grav === "grave").length} ainda aberta(s)</span></div>
    <div class="kpi"><span class="lbl">Desistências</span><span class="val num">${L.filter(o => o.tipo === "Desistência").length}</span><span class="sub">no TOP</span></div>
    <button class="kpi" type="button" data-oc-filtro="todas"><span class="lbl">Total</span><span class="val num">${L.length}</span><span class="sub">${L.length - ab.length} resolvida(s)</span></button>
  </div>
  <div class="seg" role="group" aria-label="Quais"><button type="button" data-oc-filtro="abertas" aria-pressed="${f === "abertas"}">Abertas</button><button type="button" data-oc-filtro="todas" aria-pressed="${f === "todas"}">Todas</button></div>
  ${rows.length ? `<div class="oc-lista">${rows.map(o => { const g = OC_GRAV.find(x => x.v === o.grav) || OC_GRAV[0], p = pessoaDe(o); return `
    <article class="panel oc ${o.status === "resolvida" ? "feita" : ""} ${o.grav}">
      <div class="oc-top"><span class="num oc-hora">${esc(hm(o.em))}</span><span class="chip ${g.c}">${g.l}</span><span class="tag">${esc(o.tipo)}</span>${o.status === "resolvida" ? `<span class="chip ok">Resolvida</span>` : ""}</div>
      <h3>${esc(o.nome || "Sem pessoa")}${p ? ` <small>${tipoNome(p)}${p.equipe ? " · " + esc(equipeTxt(p)) : ""}</small>` : ""}</h3>
      ${o.desc ? `<p>${esc(o.desc)}</p>` : ""}
      ${o.prov ? `<p class="hint"><b>Providência:</b> ${esc(o.prov)}</p>` : ""}
      ${o.lat && o.lng ? `<a class="linkbtn" href="https://www.google.com/maps?q=${o.lat},${o.lng}" target="_blank" rel="noopener">${ico("route")} Ver onde foi no mapa</a>` : ""}
      <small class="hint">${[o.local && "em " + o.local, o.atendido && "atendido por " + o.atendido, o.por && "registrado por " + o.por, o.status === "resolvida" && o.resolvidaEm && `resolvida ${quando(o.resolvidaEm)}${o.resolvidaPor ? " por " + o.resolvidaPor : ""}`].filter(Boolean).map(esc).join(" · ")}</small>
      <div class="actions">${p ? `<button class="btn sm" type="button" data-oc-saude="${esc(p.id)}">${ico("heart")} Ficha de saúde</button>` : ""}
        ${ed ? `<button class="btn sm" type="button" data-oc-edit="${esc(o.id)}">${ico("edit")} Editar</button><button class="btn sm ${o.status === "resolvida" ? "" : "primary"}" type="button" data-oc-resolver="${esc(o.id)}">${o.status === "resolvida" ? "Reabrir" : "Marcar resolvida"}</button>` : ""}</div>
    </article>`; }).join("")}</div>`
  : `<section class="panel"><div class="empty">${f === "abertas" && L.length ? "Nenhuma ocorrência aberta." : "Nenhuma ocorrência registrada neste TOP."}</div></section>`}`;
}
function ocorrForm(o) {
  if (!podeEditar()) { toast("Seu acesso é somente leitura."); return; }
  const novo = !o, agora = new Date(), mo = momentoAtual();
  o = o || { tipo: "Mal-estar", grav: "leve", local: mo ? mo.atv : "", atendido: ME.adm || "", status: "aberta" };
  const quando0 = new Date(o.em || agora), hh = quando0.toTimeString().slice(0, 5), dd = quando0.toLocaleDateString("sv");
  const pessoas = S.P.filter(p => !cancelado(p)).sort((a, b) => norm(a.nome).localeCompare(norm(b.nome)));
  modal(`
    <h3>${novo ? "Nova ocorrência" : "Editar ocorrência"}</h3>
    <div class="form">
      <div class="field full"><label for="f-ocp">Pessoa</label><input id="f-ocp" name="nome" list="ocPessoas" value="${esc(o.nome || "")}" placeholder="Nome do senderista ou legendário" autocomplete="off">
        <datalist id="ocPessoas">${pessoas.map(p => `<option value="${esc(p.nome)}">${p.tipo === "legendario" ? "Legendário" : "Senderista"}</option>`).join("")}</datalist></div>
      <div class="field"><label for="f-oct">Tipo</label><select id="f-oct" name="tipo">${OC_TIPOS.map(t => `<option ${o.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label for="f-ocg">Gravidade</label><select id="f-ocg" name="grav">${OC_GRAV.map(g => `<option value="${g.v}" ${o.grav === g.v ? "selected" : ""}>${g.l}</option>`).join("")}</select></div>
      <div class="field"><label for="f-ocd">Dia</label><input id="f-ocd" name="dia" type="date" value="${dd}"></div>
      <div class="field"><label for="f-och">Hora</label><input id="f-och" name="hora" type="time" value="${hh}"></div>
      <div class="field full"><label for="f-ocl">Onde ou em qual momento</label><input id="f-ocl" name="local" value="${esc(o.local || "")}" placeholder="ex.: trecho Cemitério → Cercados, Camp D1"></div>
      <div class="field full"><label for="f-ocx">O que aconteceu</label><textarea id="f-ocx" name="desc" style="min-height:90px">${esc(o.desc || "")}</textarea></div>
      <div class="field full"><label for="f-ocv">O que foi feito</label><textarea id="f-ocv" name="prov" style="min-height:70px" placeholder="ex.: atendido pela equipe médica, voltou para a pista">${esc(o.prov || "")}</textarea></div>
      <div class="field"><label for="f-oca">Atendido por</label><input id="f-oca" name="atendido" value="${esc(o.atendido || "")}"></div>
      <div class="field"><label for="f-ocs">Situação</label><select id="f-ocs" name="status"><option value="aberta" ${o.status !== "resolvida" ? "selected" : ""}>Aberta</option><option value="resolvida" ${o.status === "resolvida" ? "selected" : ""}>Resolvida</option></select></div>
    </div>
    <div class="modal-foot"><div>${novo ? "" : `<button class="btn danger" type="button" id="delBtn">Excluir</button>`}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => {
    const nome = String(fd.get("nome") || "").trim(), desc = String(fd.get("desc") || "").trim();
    if (!nome && !desc) { $("#f-ocx").focus(); toast("Diga quem ou o que aconteceu."); return; }
    const p = S.P.find(x => norm(x.nome) === norm(nome));
    const em = new Date(`${fd.get("dia") || dd}T${fd.get("hora") || hh}:00`);
    const st = fd.get("status");
    const data = { ...o, nome: p ? p.nome : nome, pessoaId: p ? p.id : null, tipo: fd.get("tipo"), grav: fd.get("grav"), em: isNaN(em) ? agora.toISOString() : em.toISOString(),
      local: String(fd.get("local") || "").trim(), desc, prov: String(fd.get("prov") || "").trim(), atendido: String(fd.get("atendido") || "").trim(), status: st,
      por: o.por || ME.adm || "", criadaEm: o.criadaEm || agora.toISOString(),
      resolvidaEm: st === "resolvida" ? (o.resolvidaEm || agora.toISOString()) : null, resolvidaPor: st === "resolvida" ? (o.resolvidaPor || ME.adm || "") : null };
    closeModal();
    salvarOcorr(o.id || ocPref() + Date.now().toString(36), data, novo ? "Ocorrência registrada" : "Ocorrência atualizada");
  });
  const del = $("#delBtn");
  if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); salvarOcorr(o.id, { ...o, excluida: true }, "Ocorrência excluída"); };
}

/* ---------- Relatório final do TOP ----------
   Junta os números do TOP em um PDF (mesmo visual das listas): inscritos, documentos, cronograma (atrasos), ocorrências, estoque/MRE, pista e pins. */
const atrasoTxt = a => a == null ? "-" : a > 0 ? fmtDif(a).slice(1) + " atrasado" : a < 0 ? fmtDif(a).slice(1) + " adiantado" : "no horário";
function dadosRelatorio() {
  const s = stats(), plano = cronoPlano(), M = marcasTodas(), td = topDoc() || {};
  const dias = plano.map(d => {
    const it = (d.itens || []).filter(i => M[i.id] && M[i.id].ini);
    const at = it.map(i => ({ i, a: i.hora ? atrasoDe(i.hora, M[i.id].ini) : null })).filter(x => x.a != null);
    const pior = at.reduce((m, x) => !m || x.a > m.a ? x : m, null), ult = at[at.length - 1];
    return { nome: d.nome || d.id, total: (d.itens || []).length, feitos: (d.itens || []).filter(i => M[i.id] && M[i.id].fim).length, marcados: it.length,
      media: at.length ? Math.round(at.reduce((a, x) => a + x.a, 0) / at.length) : null, pior, fim: ult ? ult.a : null };
  }).filter(d => d.total);
  const oc = ocorrencias(), porTipo = {}; oc.forEach(o => { porTipo[o.tipo] = (porTipo[o.tipo] || 0) + 1; });
  const mre = S.estoque.filter(ehMre), custo = mre.reduce((a, e) => a + (Number(e.preco) || 0) * porMre(e), 0), kits = topKits();
  const valor = S.estoque.reduce((a, e) => a + valorItem(e), 0);
  const pins = typeof pinsTodos === "function" ? pinsTodos() : [], pinsOk = pins.filter(p => p.status === "entregue").length;
  const canc = S.P.filter(p => p.tipo !== "legendario" && cancelado(p)).length, pend = S.P.filter(p => !cancelado(p) && p.inscricao === "pendente").length;
  const desist = oc.filter(o => o.tipo === "Desistência").length;
  return { s, td, dias, oc, porTipo, custo, kits, valor, pins, pinsOk, canc, pend, desist, mreN: mre.length, pt: EXTRA() ? ptResumo() : null };
}
function relatorioForm() {
  const R = dadosRelatorio(), { s } = R, km = (s.pistaM / 1000).toFixed(1).replace(".", ",");
  const linha = (l, v) => `<div class="li"><span class="grow">${l}</span><b class="num">${v}</b></div>`;
  modal(`
    <h3>Relatório final · ${esc(topName())}</h3>
    <p class="hint" style="margin:0 0 10px">Resumo do TOP com os dados do app agora. Baixe o PDF para guardar ou mandar para a coordenação.</p>
    <div class="rel-grid">
      <section><h4>Pessoas</h4><div class="list">${linha("Senderistas", s.n)}${linha("Legendários", s.lg.length)}${linha("Desistências no TOP", R.desist)}${linha("Compras canceladas", R.canc)}${linha("Boletos ainda pendentes", R.pend)}</div></section>
      <section><h4>Documentos</h4><div class="list">${linha("Atestado OK", `${s.atestado} / ${s.n}`)}${linha("Termo assinado", `${s.termo} / ${s.n}`)}${linha("No grupo", `${s.grupo} / ${s.n}`)}${linha("Checklist ADM", `${pct(s.tDone, s.tTotal)}%`)}</div></section>
      <section><h4>Cronograma</h4><div class="list">${R.dias.map(d => linha(esc(d.nome), `${d.feitos}/${d.total} · ${d.fim == null ? "sem marcação" : atrasoTxt(d.fim)}`)).join("") || linha("Sem marcações", "-")}</div></section>
      <section><h4>Ocorrências</h4><div class="list">${linha("Total", R.oc.length)}${linha("Graves", R.oc.filter(o => o.grav === "grave").length)}${Object.entries(R.porTipo).map(([t, n]) => linha(esc(t), n)).join("")}</div></section>
      <section><h4>Estoque e MRE</h4><div class="list">${linha("MREs montados", R.kits)}${linha("Custo de 1 MRE", brl(R.custo))}${linha("Gasto nos kits lacrados", brl(R.custo * R.kits))}${linha("Valor em estoque", brl(R.valor))}</div></section>
      <section><h4>Pista e pins</h4><div class="list">${linha("Pista total", km + " km")}${R.pins.length ? linha("Pins entregues", `${R.pinsOk} / ${R.pins.length}`) : ""}</div></section>
      ${R.pt && R.pt.R.length ? `<section><h4>Pós-TOP (ADMs)</h4><div class="list">${linha("Respostas", R.pt.R.length)}${linha("Nota geral", notaTxt(R.pt.geral))}${R.pt.itens.map(it => linha(esc(it.l), notaTxt(it.m))).join("")}</div></section>` : ""}
    </div>
    <div class="modal-foot"><span><button class="btn ghost" type="button" data-close-btn>Fechar</button></span>
      <div class="actions"><button class="btn" type="button" id="relWa">${ico("wa")} Enviar no WhatsApp</button><button class="btn primary" type="button" id="relPdf">Baixar PDF</button></div></div>`, () => {});
  const gera = wa => gerarListaPdf(relatorioPdf(R), wa).catch(e => toast("Não foi possível gerar o PDF. " + e.message));
  $("#relPdf").onclick = () => gera(false); $("#relWa").onclick = () => gera(true);
}
function relatorioPdf(R) {
  const { s, td } = R, km = (s.pistaM / 1000).toFixed(1).replace(".", ",");
  const hm = iso => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const per = [td.inicio && fmtDate(td.inicio), td.fim && fmtDate(td.fim)].filter(Boolean).join(" a ");
  return { titulo: "Relatório final", arquivo: "Relatorio final " + topName(), orient: "portrait", capa: D2(),
    sub: [topName(), td.local, per].filter(Boolean).join(" · "), legenda: "Números do TOP no momento em que o relatório foi gerado",
    resumo: [["Senderistas", s.n], ["Ocorrências", R.oc.length], ["MREs", R.kits]],
    colunas: [{ t: "Item", bold: true }, { t: "Resultado", w: 92 }],
    secoes: [
      { titulo: "Pessoas", linhas: [["Senderistas", s.n], ["Legendários", s.lg.length], ["+40", s.mais40.length], ["Desistências registradas no TOP", R.desist], ["Compras canceladas", R.canc], ["Boletos ainda pendentes", R.pend]] },
      { titulo: "Documentos e preparação", linhas: [["Atestado OK", `${s.atestado} de ${s.n} (${pct(s.atestado, s.n)}%)`], ["Termo assinado", `${s.termo} de ${s.n} (${pct(s.termo, s.n)}%)`], ["Entraram no grupo", `${s.grupo} de ${s.n}`], ["Legendários com termo", `${s.lgAssinado} de ${s.lg.length}`], ["Checklist ADM", `${s.tDone} de ${s.tTotal} tarefas (${pct(s.tDone, s.tTotal)}%)`]] },
      { titulo: "Cronograma", linhas: R.dias.length ? R.dias.flatMap(d => [[`${d.nome}: momentos concluídos`, `${d.feitos} de ${d.total}`], [`${d.nome}: atraso médio`, d.media == null ? "sem marcação" : atrasoTxt(d.media)],
          [`${d.nome}: maior atraso`, d.pior ? `${atrasoTxt(d.pior.a)} em ${d.pior.i.atv}` : "-"], [`${d.nome}: no último momento marcado`, atrasoTxt(d.fim)]]) : [["Cronograma", "sem marcações"]] },
      { titulo: `Ocorrências (${R.oc.length})`, linhas: [["Graves", R.oc.filter(o => o.grav === "grave").length], ...Object.entries(R.porTipo).map(([t, n]) => [t, n]),
          ...[...R.oc].reverse().map(o => [`${hm(o.em)} · ${o.nome || "Sem pessoa"}`, `${o.tipo} (${(OC_GRAV.find(g => g.v === o.grav) || {}).l || ""})${o.desc ? ": " + o.desc : ""}${o.prov ? " · " + o.prov : ""}${o.status === "resolvida" ? " · resolvida" : " · ABERTA"}`])] },
      { titulo: "Estoque e MRE", linhas: [["MREs montados", R.kits], ["Itens no MRE", R.mreN], ["Custo de 1 MRE", brl(R.custo)], ["Gasto nos kits lacrados", brl(R.custo * R.kits)], ["Valor em estoque", brl(R.valor)], ["Itens zerados", s.zero.length], ["Itens baixos", s.low.length]] },
      { titulo: "Pista e pins", linhas: [["Pista total", km + " km"], ...(R.pins.length ? [["Pins entregues", `${R.pinsOk} de ${R.pins.length}`]] : [])] },
      ...(R.pt && (R.pt.R.length || ptLicoes()) ? [{ titulo: `Pós-TOP: avaliação dos ADMs (${R.pt.R.length})`, linhas: [["Nota geral", notaTxt(R.pt.geral)], ...R.pt.itens.map(it => [it.l, notaTxt(it.m)]),
          ...R.pt.R.filter(r => r.bom).map(r => [`Foi bom · ${r.por || "ADM"}`, r.bom]), ...R.pt.R.filter(r => r.melhorar).map(r => [`Melhorar · ${r.por || "ADM"}`, r.melhorar]),
          ...(ptLicoes() ? [["Lições para o próximo TOP", ptLicoes()]] : [])] }] : []),
      ...(COM() && (aprendDoc().itens || []).length ? [{ titulo: `Aprendizados do TOP (${aprendDoc().itens.length})`, linhas: aprendDoc().itens.map(i => [`${i.tipo === "funcionou" ? "Funcionou" : "Mudar"} · ${i.area || "Geral"}`, i.txt]) }] : []),
    ] };
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
  if (ehCoordCad(e)) return `<span class="chip">${esc(e.cargo || "Coordenador")} · ${esc(e.equipe_lgnd || "sem equipe")}</span><div class="hint" style="font-size:12px;margin-top:3px">Só leitura: Dashboard, ${COORD_ABAS.map(id => (VIEWS.find(v => v.id === id) || {}).l).join(", ")} (só a equipe dele)</div>`;
  const abas = ABAS().filter(v => temAba(e.abas, v)).map(v => v.l);
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
    <div class="actions">${COORD() ? `<button class="btn" type="button" data-act="coord-liberar">${ico("shield")} Coordenadores</button>` : ""}<button class="btn primary" type="button" data-act="novo-adm">${ico("plus")} Cadastrar usuário</button></div></div>
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
      <td>${esc(ehCoordCad(e) ? (e.cargo || "Coordenador") + " · " + (e.equipe_lgnd || "") : e.funcao || "ADM")}</td>
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
  e = e || { funcao: "ADM", ativo: true, nome: "", email: "", nivel: "edita", abas: [...ABAS().map(v => v.id), ABA_V2] };
  const dono = !!e.dono, coord = ehCoordCad(e), comPerfil = COORD() && !dono;
  modal(`
    <h3>${novo ? "Cadastrar usuário" : "Editar " + esc(e.nome)}</h3>
    <div class="form">
      ${comPerfil ? `<div class="field full"><span class="lab">Tipo de acesso</span><div class="seg" role="radiogroup" id="perfilSeg"><label><input type="radio" name="perfil" value="adm" ${coord ? "" : "checked"}> ADM</label><label><input type="radio" name="perfil" value="coord" ${coord ? "checked" : ""}> Coordenador de equipe</label></div></div>
      <div class="coord-box field full" id="coordBox" ${coord ? "" : "hidden"}>
        <div class="form" style="padding:0">
          <div class="field"><label for="f-aeq">Equipe LGND</label><select id="f-aeq" name="equipe_lgnd"><option value="">Escolher…</option>${equipesUsadas().map(x => `<option ${e.equipe_lgnd === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>
          <div class="field"><label for="f-acargo">Cargo</label><select id="f-acargo" name="cargo">${["Coordenador", "Subcoordenador"].map(x => `<option ${e.cargo === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
        </div>
        <p class="hint" style="margin:6px 0 0">Somente leitura. Vê o Dashboard da equipe dele, Equipes (só a equipe dele), Famílias, Consagração, Emergência, Cronograma, Ao vivo e Pista, e lança os gastos da equipe no Financeiro. Saúde, telefones, pendências e pagamentos ficam escondidos.</p>
      </div>` : ""}
      <div class="field full"><label for="f-anome">Nome</label><input id="f-anome" name="nome" value="${esc(e.nome)}" required placeholder="Como a equipe chama"></div>
      <div class="field"><label for="f-aemail">E-mail (login)</label><input id="f-aemail" name="email" type="email" inputmode="email" value="${esc(e.email)}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="nome@email.com"></div>
      <div class="field"><label for="f-atel">Telefone / WhatsApp</label><input id="f-atel" name="telefone" inputmode="tel" value="${esc(e.telefone)}"></div>
      <div class="field adm-only" ${coord ? "hidden" : ""}><label for="f-afun">Função</label>${sel("funcao", FUNCOES.map(x => ({ v: x, l: x })), e.funcao || "ADM")}</div>
      ${dono ? `<div class="field full"><p class="hint" style="margin:0">Esta é a conta do dono: sempre tem acesso total e não pode ser bloqueada.</p></div>` : `
      <div class="field full adm-only" ${coord ? "hidden" : ""}><span class="lab">O que pode acessar</span><div class="nivel-opts">${NIVEIS.map(n => `<label><input type="radio" name="nivel" value="${n.v}" ${e.nivel === n.v ? "checked" : ""}><span>${n.l}<small>${n.d}</small></span></label>`).join("")}</div></div>
      <div class="field full adm-only" ${coord ? "hidden" : ""}><span class="lab">Páginas que pode ver (o Dashboard sempre aparece)</span><div class="abas ${e.nivel === "total" ? "off" : ""}" id="abasBox">${MENU_GRUPOS.map(([g, ids]) => { const vs = ABAS().filter(v => ids.includes(v.id)); return vs.length ? `<div class="abas-grp">${g}</div>` + vs.map(v => `<label><input type="checkbox" name="abas" value="${v.id}" ${e.nivel === "total" || temAba(e.abas, v) ? "checked" : ""}> ${v.l}</label>`).join("") : ""; }).join("")}${ABAS().filter(v => !MENU_GRUPOS.some(([, ids]) => ids.includes(v.id))).map(v => `<label><input type="checkbox" name="abas" value="${v.id}" ${e.nivel === "total" || temAba(e.abas, v) ? "checked" : ""}> ${v.l}</label>`).join("")}</div>
        <p class="hint" style="margin:6px 0 0">Equipes LGND, Pendências, Ao vivo, Ocorrências e Importação do dia usam os dados de Senderistas, Legendários ou Cronograma: marque também a página de onde vêm os dados. Marcar <b>Importação do dia</b> libera a pessoa para importar as planilhas. Usuários e Histórico são só seus.</p></div>`}
      ${dono ? "" : `<div class="field full adm-only" ${coord ? "hidden" : ""}><div class="checks"><label><input type="checkbox" name="permMapa" ${(e.abas || []).includes(MP_PERM) ? "checked" : ""}> Pode colocar pontos no mapa da pista (hidratação, almoço, apoio…)</label></div></div>`}
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
    const ehC = comPerfil && fd.get("perfil") === "coord";
    if (ehC && !fd.get("equipe_lgnd")) { err("Escolha a equipe do coordenador."); $("#f-aeq").focus(); return; }
    const nivel = dono ? "total" : ehC ? "leitura" : (fd.get("nivel") || "edita");
    const row = { nome, email, telefone: String(fd.get("telefone") || "").trim(), funcao: fd.get("funcao"), obs: String(fd.get("obs") || "").trim(),
      nivel, abas: ehC ? coordAbasSalvar() : [...(nivel === "total" ? ABAS().map(v => v.id) : fd.getAll("abas")), ABA_V2, ...(fd.get("permMapa") === "on" ? [MP_PERM] : [])], ativo: dono ? true : fd.get("ativo") === "on" };
    if (comPerfil && (ehC || e.perfil)) Object.assign(row, ehC ? { perfil: "coord", equipe_lgnd: String(fd.get("equipe_lgnd")), cargo: String(fd.get("cargo") || "Coordenador"), funcao: "Outros" } : { perfil: "adm", equipe_lgnd: null, cargo: null });
    if (!novo && e.email && e.email !== email && e.user_id && !confirm(`Trocar o e-mail desliga o login atual de ${nome}. A pessoa vai precisar criar a senha de novo com o e-mail novo. Continuar?`)) return;
    closeModal();
    try {
      await membros.salvar(row, novo ? null : e.id);
      toast(novo ? `${nome} cadastrado` : "Usuário atualizado");
      if (novo || e.email !== email) conviteModal(row);
    } catch (x) { toast(erroAmigavel(x)); }
  });
  const box = $("#abasBox");
  if (box) $("#mform").addEventListener("change", ev => { if (ev.target.name === "nivel") box.classList.toggle("off", ev.target.value === "total");
    if (ev.target.name === "perfil") { const c = ev.target.value === "coord"; $("#coordBox").hidden = !c; document.querySelectorAll("#mform .adm-only").forEach(x => x.hidden = c); } });
  const re = $("#reenviar"); if (re) re.onclick = () => conviteModal(e);
  const del = $("#delBtn");
  if (del) del.onclick = async () => {
    if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; }
    closeModal();
    try { await membros.excluir(e.id); toast("Usuário excluído e acesso removido"); } catch (x) { toast(erroAmigavel(x)); }
  };
}
const APP_URL = location.origin + location.pathname.replace(/index\.html$/, "");
function conviteTxt(e) {
  const nivel = e.nivel, abas = e.abas || [];
  const oq = ehCoordCad(e) ? `somente leitura, como ${(e.cargo || "coordenador").toLowerCase()} da equipe ${e.equipe_lgnd || ""}: Dashboard, ` + COORD_ABAS.map(id => (VIEWS.find(v => v.id === id) || {}).l).join(", ")
    : nivel === "total" ? "acesso total" : (nivel === "leitura" ? "somente leitura" : "edição") + " em: Dashboard" + ABAS().filter(v => temAba(abas, v)).map(v => ", " + v.l).join("");
  const msg = `Olá ${e.nome.split(" ")[0]}! Seu acesso ao app ADM 3Colinas está liberado.\n\n1. Abra: ${APP_URL}\n2. Toque em "Primeiro acesso? Criar minha senha"\n3. Use este e-mail: ${e.email}\n4. Crie sua senha e confirme pelo link que chega no e-mail.\n\nDepois é só entrar com o e-mail e a senha. Dica: no celular, use "Adicionar à tela inicial" para ficar como app.\n\nAcesso: ${oq}.`;
  return { oq, msg };
}
function conviteModal(e) {
  const { oq, msg } = conviteTxt(e);
  const n = waNumber(e.telefone);
  modal(`
    <h3>Convite para ${esc(e.nome)}</h3>
    <div class="cred"><span>E-mail de login: <b>${esc(e.email)}</b></span><span class="hint">${esc(oq.charAt(0).toUpperCase() + oq.slice(1))}</span></div>
    <p class="hint">A pessoa cria a própria senha em "Primeiro acesso". Você não precisa saber a senha dela.</p>
    <div class="modal-foot"><div></div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button>${n ? `<a class="btn primary" href="https://wa.me/${n}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ico("wa")} Enviar no WhatsApp</a>` : `<button class="btn primary" type="button" id="copiarConvite">Copiar convite</button>`}</div></div>`, () => closeModal());
  const c = $("#copiarConvite");
  if (c) c.onclick = () => { navigator.clipboard.writeText(msg).then(() => toast("Convite copiado"), () => toast("Não deu para copiar")); };
}


/* ---------- Coordenadores de equipe (demo) ---------- */
// candidatos: Chefe e Sub de cada equipe LGND (vem da planilha de equipes)
const coordCands = () => S.P.filter(p => p.tipo === "legendario" && !cancelado(p) && p.equipe && FUNC_ORDEM(p.funcao) < 2)
  .sort((a, b) => norm(a.equipe).localeCompare(norm(b.equipe)) || FUNC_ORDEM(a.funcao) - FUNC_ORDEM(b.funcao) || norm(a.nome).localeCompare(norm(b.nome)));
const coordCadDe = p => { const em = String(p.email || "").trim().toLowerCase(); return em ? S.equipe.find(x => String(x.email || "").toLowerCase() === em) : null; };
function coordLiberarForm() {
  const C = coordCands();
  const linha = p => {
    const m = coordCadDe(p), em = String(p.email || "").trim(), cargo = m && ehCoordCad(m) && m.cargo ? m.cargo : FUNC_ORDEM(p.funcao) === 0 ? "Coordenador" : "Subcoordenador";
    const st = !isEmail(em) ? `<span class="chip bad">Sem e-mail</span>` : !m ? `<span class="chip wait">Novo</span>` : !ehCoordCad(m) ? `<span class="chip sent">Já é ADM</span>` : m.ativo === false ? `<span class="chip bad">Bloqueado</span>` : `<span class="chip ok">Com acesso</span>`;
    const pode = isEmail(em) && (!m || ehCoordCad(m)), on = pode && (!m || m.ativo !== false);
    return `<label class="coord-li ${pode ? "" : "off"}"><input type="checkbox" name="c" value="${esc(p.id)}" ${on ? "checked" : ""} ${pode ? "" : "disabled"}>
      <span class="grow"><b>${esc(p.nome)}</b><small>${esc(p.funcao)} na planilha${em ? " · " + esc(em) : ""}</small>
      ${pode ? `<select class="sel coord-cargo" name="cargo-${esc(p.id)}" aria-label="Cargo de ${esc(p.nome)}">${["Coordenador", "Subcoordenador"].map(x => `<option ${cargo === x ? "selected" : ""}>${x}</option>`).join("")}</select>` : ""}</span>${st}</label>`;
  };
  const eqs = [...new Set(C.map(p => p.equipe))];
  const semEmail = C.filter(p => !isEmail(String(p.email || "").trim())).length;
  modal(`
    <h3>${ico("shield")} Coordenadores de equipe</h3>
    <p class="hint" style="margin:0">Chefes e subchefes de cada equipe, da planilha de equipes LGND. Marque quem tem acesso e escolha se é Coordenador ou Subcoordenador (os dois veem o mesmo, somente leitura): Dashboard, a própria equipe, Famílias, Consagração, Emergência, Cronograma, Ao vivo, Pista e o Financeiro da equipe (onde lança os gastos). Desmarcar bloqueia.</p>
    ${C.length ? `<div class="coord-tools"><button class="btn sm" type="button" id="coordTodos">Marcar todos</button><button class="btn sm ghost" type="button" id="coordNenhum">Desmarcar todos</button>${semEmail ? `<span class="hint">${semEmail} sem e-mail: coloque o e-mail no cadastro do legendário para liberar.</span>` : ""}</div>
    <div class="coord-lista">${eqs.map(eq => `<section><h4>${esc(eq)}</h4>${C.filter(p => p.equipe === eq).map(linha).join("")}</section>`).join("")}</div>`
    : `<div class="empty">Nenhum chefe ou subchefe nas equipes ainda. Importe a planilha de equipes LGND em Legendários.</div>`}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button>${C.length ? `<button class="btn primary" type="submit">${ico("check")} Liberar acesso</button>` : ""}</div></div>`,
  async fd => {
    const marc = new Set(fd.getAll("c")), novos = [];
    let lib = 0, blq = 0;
    closeModal();
    try {
      for (const p of C) {
        const em = String(p.email || "").trim().toLowerCase(); if (!isEmail(em)) continue;
        const m = coordCadDe(p), quer = marc.has(p.id), cargo = fd.get("cargo-" + p.id) || (FUNC_ORDEM(p.funcao) === 0 ? "Coordenador" : "Subcoordenador");
        const base = { perfil: "coord", equipe_lgnd: p.equipe, cargo, nivel: "leitura", abas: coordAbasSalvar() };
        if (!m) { if (!quer) continue; const row = { nome: p.nome, email: em, telefone: p.telefone || "", funcao: "Outros", obs: "", ativo: true, ...base }; await membros.salvar(row, null); novos.push(row); lib++; }
        else if (ehCoordCad(m)) {
          const muda = (m.ativo !== false) !== quer || m.equipe_lgnd !== p.equipe || m.cargo !== cargo;
          if (muda) { await membros.salvar({ ...base, ativo: quer }, m.id); quer ? lib++ : blq++; }
        }
      }
      toast(lib || blq ? [lib && `${lib} liberado(s)`, blq && `${blq} bloqueado(s)`].filter(Boolean).join(", ") : "Nada mudou");
      if (novos.length) coordConvites(novos);
    } catch (x) { toast(erroAmigavel(x)); }
  });
  const box = (v) => document.querySelectorAll('#mform input[name="c"]:not(:disabled)').forEach(x => x.checked = v);
  const t = $("#coordTodos"), n = $("#coordNenhum"); if (t) t.onclick = () => box(true); if (n) n.onclick = () => box(false);
}
function coordConvites(L) {
  modal(`
    <h3>Convites dos coordenadores</h3>
    <p class="hint" style="margin:0">Cada um cria a própria senha em "Primeiro acesso". Toque para mandar o convite no WhatsApp de cada um.</p>
    <div class="coord-lista">${L.map((e, i) => { const n = waNumber(e.telefone);
      return `<div class="coord-li"><span class="grow"><b>${esc(e.nome)}</b><small>${esc(e.cargo)} · ${esc(e.equipe_lgnd)} · ${esc(e.email)}</small></span>${n ? `<a class="btn sm primary" href="https://wa.me/${n}?text=${encodeURIComponent(conviteTxt(e).msg)}" target="_blank" rel="noopener">${ico("wa")} Enviar</a>` : `<button class="btn sm" type="button" data-coord-copiar="${i}">Copiar</button>`}</div>`; }).join("")}</div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn primary" type="button" data-close-btn>Pronto</button></div></div>`, () => closeModal());
  document.querySelectorAll("[data-coord-copiar]").forEach(b => b.onclick = () => navigator.clipboard.writeText(conviteTxt(L[+b.dataset.coordCopiar]).msg).then(() => toast("Convite copiado"), () => toast("Não deu para copiar")));
}
// equipe do coordenador: só nome e função (sem telefone, saúde e pagamento)
const coordMembros = () => S.P.filter(p => p.tipo === "legendario" && !cancelado(p) && ME.equipeLgnd && p.equipe === ME.equipeLgnd)
  .sort((a, b) => FUNC_ORDEM(a.funcao) - FUNC_ORDEM(b.funcao) || norm(a.nome).localeCompare(norm(b.nome)));
function vEquipeCoord() {
  const m = coordMembros(), lid = m.filter(p => FUNC_ORDEM(p.funcao) < 2);
  return `
  <div class="head"><div><h2>Equipe ${esc(ME.equipeLgnd || "")}</h2><p>Os legendários que servem na sua equipe neste TOP. Somente leitura: mudanças são feitas pela ADM.</p></div></div>
  <div class="kpis">
    <div class="kpi"><span class="lbl">Na equipe</span><span class="val num">${m.length}</span><span class="sub">legendários</span></div>
    <div class="kpi"><span class="lbl">Liderança</span><span class="val num">${lid.length}</span><span class="sub">${esc(lid.map(p => p.nome.split(" ")[0]).join(", ") || "—")}</span></div>
  </div>
  ${ME.equipeLgnd ? `<section class="fam coord-eq"><header><b>${esc(ME.equipeLgnd)}</b><span class="hint num">${m.length}</span></header>
    ${m.length ? `<ul class="eq-list">${m.map(p => `<li><span>${esc(p.nome)}</span>${p.funcao ? ` <span class="chip ${FUNC_ORDEM(p.funcao) < 2 ? "ok" : ""}">${esc(p.funcao)}</span>` : ""}</li>`).join("")}</ul>` : `<div class="empty">Ninguém na equipe ainda.</div>`}</section>`
    : `<div class="empty">Seu cadastro ainda não tem equipe. Peça à ADM para definir.</div>`}`;
}
function vPainelCoord() {
  const td = topDoc() || {}, dias = diasParaTop(), m = coordMembros();
  const quando = dias == null ? "" : dias > 1 ? `faltam <b class="num">${dias}</b> dias` : dias === 1 ? "começa <b>amanhã</b>" : dias === 0 ? "começa <b>hoje</b>" : td.status === "finalizado" ? "TOP finalizado" : "<b>em andamento</b>";
  const tiles = COORD_ABAS.map(id => VIEWS.find(v => v.id === id)).filter(v => v && canSee(v));
  return `
  <section class="panel coord-hero"><span class="eyebrow">${esc(ME.cargo || "Coordenador")} · Equipe ${esc(ME.equipeLgnd || "—")}</span>
    <h2>Olá, ${esc((ME.adm || "").split(" ")[0])}!</h2><p>${esc(topName())}${quando ? " · " : ""}${quando}</p></section>
  <div class="coord-tiles">${tiles.map(v => `<button class="coord-tile" type="button" data-go="${v.id}">${ico(v.id === "equipes" ? "shield" : v.i)}<b>${v.id === "equipes" ? "Minha equipe" : esc(v.l)}</b>${v.id === "equipes" ? `<small class="num">${m.length} legendários</small>` : ""}</button>`).join("")}</div>
  <section class="panel"><h3>Equipe ${esc(ME.equipeLgnd || "")} <small>${m.length}</small><button class="linkbtn" type="button" data-go="equipes">ver ›</button></h3>
    ${m.length ? `<div class="list">${m.slice(0, 6).map(p => `<div class="li"><span class="grow">${esc(p.nome)}</span>${p.funcao ? `<span class="chip ${FUNC_ORDEM(p.funcao) < 2 ? "ok" : ""}">${esc(p.funcao)}</span>` : ""}</div>`).join("")}</div>${m.length > 6 ? `<p class="hint">e mais ${m.length - 6}.</p>` : ""}` : `<div class="empty">Ninguém na sua equipe ainda.</div>`}</section>
  ${META() ? metaCoordCard() : ""}
  <p class="hint">Seu acesso é somente leitura. Dados de saúde, telefones, pendências e pagamentos ficam só com a ADM.</p>`;
}

/* ---------- Meta do TOP (Estratégia 150) ----------
   A meta nasce sozinha de cada TOP: vagas (padrão 150) + 10% de desistência, espalhada pelas semanas até o TOP na curva do PDF.
   Equipes: nomes e inscritos por indicação divididos pelo nº de servidores (legendários da equipe; sem legendários ainda, usa o TOP anterior).
   Indicações: config indic-<top>-<membroId> {lista:[{id,nome,tel,quem,equipe,canal,status,em,contatoEm,contatoPor,obs}]} (cada um grava o seu; coordenador também).
   Ajustes do dono: config meta-<top> {vagas, desist}. Inscrito = senderista do TOP com o mesmo telefone ou nome. */
const META = () => true;   // Meta do TOP, Agenda e próximo TOP: liberados no app real em 01/11/2026 (precisa do supabase/indicacoes.sql)
const META_CURVA = [0, 0, 5, 15, 28, 42, 58, 75, 92, 108, 125, 142, 158, 165];   // acumulado no fim das semanas -13 … 0 (PDF)
const META_CHECK = [[10, 10], [7, 45], [4, 90], [2, 125]];   // semana antes do TOP, mínimo (para 165)
const IND_CANAIS = ["Indicação pessoal", "Igreja", "Redes sociais", "Panfletagem", "Evento"];
const IND_ST = [{ v: "novo", l: "Sem contato", c: "wait" }, { v: "contatado", l: "Contatado", c: "" }, { v: "interessado", l: "Interessado", c: "ok" }, { v: "nao", l: "Não vai agora", c: "" }];
const metaCfg = () => cfgDe("meta-" + curTopId()) || {};
const diaISO = d => d.toISOString().slice(0, 10);
function topAnterior() { const td = topDoc(); if (!td) return null; const L = [...S.tops].filter(t => t.id !== td.id && (t.inicio || "") < (td.inicio || "9")).sort((a, b) => String(b.inicio || "").localeCompare(String(a.inicio || ""))); return L[0] || null; }
function metaDados() {
  const td = topDoc() || {}, c = metaCfg(), vagas = +c.vagas || +td.vagas || 150, desist = c.desist != null ? +c.desist : 10;
  const meta = Math.round(vagas * (1 + desist / 100));
  const fimD = td.inicio ? new Date(td.inicio + "T00:00:00") : null;
  const iniD = fimD ? new Date(fimD - 91 * 864e5) : null;   // ciclo de 13 semanas antes do TOP
  const hoje = new Date(), esc165 = x => Math.round(x * meta / 165);
  // meta acumulada em um dia, pelas semanas que faltam para o TOP (igual ao PDF: semana -13 = 0, semana 0 = meta)
  const metaEm = d => { const w = (fimD - d) / (7 * 864e5); if (w >= 13) return 0; if (w <= 0) return meta; const x = 13 - w, i = Math.floor(x), a = META_CURVA[i], b = META_CURVA[Math.min(i + 1, 13)]; return esc165(a + (b - a) * (x - i)); };
  const metaHoje = fimD ? metaEm(hoje) : 0;
  const dias = fimD ? Math.ceil((fimD - hoje) / 864e5) : null, semana = dias == null ? null : -Math.max(0, Math.ceil(dias / 7));
  const sen = S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)), inscritos = sen.length;
  const checks = META_CHECK.map(([w, m]) => { const d = fimD ? new Date(fimD - w * 7 * 864e5) : null; return { w, min: esc165(m), d, passou: d && d <= hoje }; });
  // semanas para o gráfico: meta x real (pelo dia em que a pessoa entrou no app)
  const semanas = []; if (fimD && iniD) { for (let d = new Date(iniD); d < fimD; d = new Date(+d + 7 * 864e5)) { const fimS = new Date(Math.min(+d + 7 * 864e5, +fimD));
    semanas.push({ d, meta: metaEm(fimS), real: fimS <= hoje ? sen.filter(p => !p.criadoEm || new Date(p.criadoEm) < fimS).length : null }); } }
  return { td, vagas, desist, meta, metaHoje, dias, semana, inscritos, checks, semanas, iniD, fimD };
}
// indicações pelo link público (indica.html): config indlink-<top>-<id> (na demo, localStorage "adm3-indic-link"). Quando a ADM mexe nela, vira item da lista dela (mesmo id).
const IND_LS = "adm3-indic-link";
const indCfgId = () => "indic-cfg-" + curTopId();
const indLink = eq => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}indica.html?t=${encodeURIComponent((cfgDe(indCfgId()) || {}).token || "")}&top=${encodeURIComponent(curTopId())}${eq ? "&eq=" + encodeURIComponent(eq) : ""}${DEMO ? "&demo=1" : ""}`;
function indDoLink() {
  if (DEMO) { try { return (JSON.parse(localStorage.getItem(IND_LS) || "[]") || []).filter(x => x && x.id && (x.top || curTopId()) === curTopId()).map(x => ({ ...x, doc: "link" })); } catch { return []; } }
  return Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(`indlink-${curTopId()}-`)).map(([k, d]) => ({ ...d, id: k, doc: "link" }));
}
function indTodas() {
  const pre = "indic-" + curTopId() + "-", L = Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(pre) && k !== indCfgId()).flatMap(([k, d]) => (d.lista || []).map(x => ({ ...x, doc: k })));
  const ids = new Set(L.map(x => x.id)), fora = new Set((cfgDe(indCfgId()) || {}).apagados || []);
  const doEvento = acoesTodas().flatMap(a => acaoConfirmados(a).filter(x => x.leg === false && x.nome).map(x => ({ id: "ev" + a.id + hashCurto(confKey(x)), nome: x.nome, tel: x.tel || "", equipe: a.equipe || "", canal: "Evento", quem: "",
    obs: ["Evento: " + a.titulo, x.igreja, x.info].filter(Boolean).join(" · "), status: "novo", em: x.em || (a.data + "T12:00:00"), origem: "evento", por: "evento" })));
  return [...L, ...[...indDoLink().map(x => ({ canal: "Indicação pessoal", status: "novo", ...x, origem: "link", por: "link" })), ...doEvento.map(x => ({ ...x, doc: "link" }))].filter(x => !ids.has(x.id) && !fora.has(x.id))];
}
function indLinkForm() {
  const abrir = () => { const l = indLink(), msg = `Quer indicar um amigo para o próximo TOP dos Legendários 3 Colinas? Preencha aqui, leva 1 minuto: ${l}`;
    modal(`<h3>Link de indicação</h3><p class="hint">Mande este link para os servidores (no grupo da equipe, por exemplo). Cada um coloca o nome dele, a área em que serve e os dados de quem quer indicar. A indicação cai aqui na hora e já conta para a equipe que ele escolheu.</p>
      <div class="field"><input readonly value="${esc(l)}" id="indLinkTxt" onfocus="this.select()"></div>
      ${DEMO ? `<p class="hint">Na demonstração a indicação fica guardada só neste aparelho: abra o link aqui mesmo para testar.</p>` : ""}
      <div class="modal-foot"><span></span><div class="actions"><button class="btn" type="button" id="indCopiar">Copiar</button><a class="btn" href="${esc(l)}" target="_blank" rel="noopener">Abrir</a><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ico("wa")} Enviar no WhatsApp</a></div></div>`, () => closeModal());
    $("#indCopiar").onclick = () => copiarTexto(l, "Link copiado"); };
  if ((cfgDe(indCfgId()) || {}).token) abrir();
  else save(() => api.set("config", indCfgId(), { ...(cfgDe(indCfgId()) || {}), token: Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4) })).then(abrir);
}
window.addEventListener("storage", e => { if (e.key === IND_LS && (S.view === "meta" || S.view === "painel") && !$("#modalRoot").innerHTML) render(); });
const indDocMeu = () => "indic-" + curTopId() + "-" + (ME.id || "eu");
function indInscrito(x) { const t = telLimpo(x.tel).slice(-10), n = norm(x.nome || "").trim();
  return S.P.find(p => p.tipo !== "legendario" && !cancelado(p) && ((t.length >= 10 && telLimpo(p.telefone).slice(-10) === t) || (n && norm(p.nome).trim() === n))) || null; }
const indAtrasada = x => x.status === "novo" && !indInscrito(x) && Date.now() - Date.parse(x.em) > 48 * 3600e3;
function metaEquipes(D) {
  let lgs = S.P.filter(p => p.tipo === "legendario" && !cancelado(p) && p.equipe);
  if (!lgs.length) { const a = topAnterior(); if (a) lgs = S.pessoas.filter(p => topOf(p) === a.id && p.tipo === "legendario" && p.equipe); }
  const tot = lgs.length || 1, nomesTot = Math.round(D.meta * 300 / 165), inscTot = Math.round(D.meta * 99 / 165), I = indTodas();
  return equipesUsadas().map(e => { const n = lgs.filter(p => p.equipe === e).length; if (!n) return null;
    const ind = I.filter(x => x.equipe === e), ok = ind.filter(indInscrito).length;
    return { e, n, nomes: ind.length, metaNomes: Math.max(1, Math.round(nomesTot * n / tot)), insc: ok, metaInsc: Math.max(1, Math.round(inscTot * n / tot)) }; }).filter(Boolean);
}
const podeIndicar = () => podeEditar() || ehCoordEq();
function indForm(x) {
  if (!podeIndicar()) { toast("Seu acesso é somente leitura."); return; }
  const novo = !x, eq = ehCoordEq() ? ME.equipeLgnd : (x && x.equipe) || "";
  x = x || { canal: "Indicação pessoal", status: "novo", quem: ME.adm || "", equipe: eq };
  modal(`<h3>${novo ? "Indicar nome" : "Editar indicação"}</h3>
    <p class="hint" style="margin:0">Quem você convidou para o próximo TOP. A ADM faz o contato em até 48 h, e quando a pessoa se inscrever ela conta sozinha para a sua equipe.</p>
    <div class="form">
      <div class="field full"><label for="ix-n">Nome</label><input id="ix-n" name="nome" value="${esc(x.nome || "")}" required autocomplete="off"></div>
      <div class="field"><label for="ix-t">Telefone (WhatsApp)</label><input id="ix-t" name="tel" type="tel" value="${esc(x.tel || "")}" placeholder="(16) 99999-9999"></div>
      <div class="field"><label for="ix-q">Quem indicou</label><input id="ix-q" name="quem" value="${esc(x.quem || "")}" placeholder="nome do servidor"></div>
      <div class="field"><label for="ix-e">Equipe</label>${ehCoordEq() ? `<input id="ix-e" name="equipe" value="${esc(eq)}" readonly>` : `<select id="ix-e" name="equipe" class="sel"><option value="">Sem equipe</option>${equipesUsadas().map(e => `<option ${x.equipe === e ? "selected" : ""}>${esc(e)}</option>`).join("")}</select>`}</div>
      <div class="field"><label for="ix-c">Canal</label><select id="ix-c" name="canal" class="sel">${IND_CANAIS.map(c => `<option ${x.canal === c ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="field full"><label for="ix-o">Observação (opcional)</label><input id="ix-o" name="obs" value="${esc(x.obs || "")}" placeholder="ex.: amigo do trabalho, igreja Batista Central"></div>
    </div>
    <div class="modal-foot"><div>${novo ? "" : `<button class="btn danger" type="button" id="delBtn">Excluir</button>`}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${novo ? "Indicar" : "Salvar"}</button></div></div>`,
  fd => {
    const nome = String(fd.get("nome") || "").trim(); if (!nome) return;
    const item = { ...x, id: x.id || "in" + Date.now().toString(36), nome, tel: String(fd.get("tel") || "").trim(), quem: String(fd.get("quem") || "").trim(), equipe: String(fd.get("equipe") || ""),
      canal: fd.get("canal"), obs: String(fd.get("obs") || "").trim(), em: x.em || new Date().toISOString(), por: x.por || ME.adm || "" };
    delete item.doc; closeModal(); indSalvar(x.doc || indDocMeu(), item, novo ? `${nome.split(" ")[0]} indicado` : "Indicação atualizada");
  });
  const del = $("#delBtn"); if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); indSalvar(x.doc, null, "Indicação excluída", x.id); };
}
function indSalvar(doc, item, msg, apagar) {
  if (doc === "link") {
    if (apagar) { save(() => api.set("config", indCfgId(), { ...(cfgDe(indCfgId()) || {}), apagados: [...((cfgDe(indCfgId()) || {}).apagados || []), apagar] }), msg); return; }
    doc = indDocMeu(); const { doc: _d, origem: _o, ...x } = item; item = { ...x, origem: _o === "evento" ? "evento" : "link" };
  }
  const L = ((S.cfgDocs || {})[doc] || {}).lista || [], id = apagar || item.id;
  const nova = L.filter(y => y.id !== id); if (item) nova.push(item);
  if (!podeIndicar()) { toast("Seu acesso é somente leitura."); return; }   // o coordenador grava só o documento dele (indic-<top>-<id>)
  (async () => { try { await api.set("config", doc, { lista: nova }); if (msg) toast(msg); } catch (e) { toast("Não foi possível salvar. " + erroAmigavel(e)); } render(); })();
}
function indMarcar(doc, id, st) {
  const x = doc === "link" ? indTodas().find(y => y.doc === "link" && y.id === id) : (((S.cfgDocs || {})[doc] || {}).lista || []).find(y => y.id === id); if (!x) return;
  indSalvar(doc, { ...x, status: st, contatoEm: st !== "novo" ? (x.contatoEm || new Date().toISOString()) : null, contatoPor: st !== "novo" ? (x.contatoPor || ME.adm || "") : null }, IND_ST.find(o => o.v === st).l);
}
function metaCoordCard() {
  const D = metaDados(), e = metaEquipes(D).find(x => x.e === ME.equipeLgnd), mine = indTodas().filter(x => x.equipe === ME.equipeLgnd);
  const g = meuGrupo(), novas = g ? quadro().filter(t => !t.feito && (t.pegou || {}).grupo === g.id && (t.pegou || {}).por !== ME.adm) : [];
  return `${novas.length ? `<section class="panel q-novas"><h3>${ico("flag")} A ADM mandou para a sua equipe <small>${novas.length}</small> <button class="linkbtn" type="button" data-meta-aba="grupo">ver ›</button></h3><div class="list">${novas.map(t => quadroLi(t, true)).join("")}</div></section>` : ""}
  <section class="panel meta-coord"><h3>Meta da minha equipe <button class="linkbtn" type="button" data-meta-aba="grupo">minha equipe ›</button></h3>
    ${e ? `<div class="meta-mini"><div><span class="lbl">Nomes indicados</span><b class="num">${e.nomes}<small> de ${e.metaNomes}</small></b><div class="bar"><i style="width:${pct(e.nomes, e.metaNomes)}%"></i></div></div>
      <div><span class="lbl">Viraram inscritos</span><b class="num">${e.insc}<small> de ${e.metaInsc}</small></b><div class="bar good"><i style="width:${pct(e.insc, e.metaInsc)}%"></i></div></div></div>` : `<p class="hint">Sua equipe ainda não tem servidores contados para a meta.</p>`}
    <p class="hint" style="margin:0">Placar geral: <b class="num">${D.inscritos}</b> inscritos de ${D.meta} · meta para hoje ${D.metaHoje}</p>
    <div class="actions"><button class="btn primary" type="button" data-ind-novo="1">${ico("plus")} Indicar nome</button><button class="btn" type="button" data-acao-novo="1">${ico("plus")} Novo evento</button>${mine.length ? `<span class="hint">${mine.length} indicação(ões) da equipe</span>` : ""}</div></section>
  ${metaFaltamCoord()}
  ${"Notification" in window && Notification.permission === "default" ? `<section class="panel"><h3>${ico("bell")} Avisos no celular</h3><p class="hint" style="margin:0 0 8px">Ative para saber na hora quando a ADM mandar uma tarefa, e 2 dias antes de um evento se faltar gente da sua equipe.</p><div class="actions"><button class="btn primary" type="button" data-act="ativar-notif">${ico("bell")} Ativar avisos</button></div></section>` : ""}
  ${(() => { const A = acoesTodas().filter(a => a.data >= hojeISO()).slice(0, 3); return A.length ? `<section class="panel"><h3>Próximos eventos <button class="linkbtn" type="button" data-go="agenda">agenda ›</button></h3><div class="acao-lista">${A.map(a => `<button class="acao-c" type="button" data-acao-ver="${esc(a.doc)}|${esc(a.id)}"><span class="grow"><b>${esc(a.titulo)}</b><small class="hint">${esc(a.equipe)} · ${esc(acaoQuando(a))}</small></span><span class="chip">${acaoConfirmados(a).length} vão</span></button>`).join("")}</div></section>` : ""; })()}`;
}
function vMeta() {
  const D = metaDados(), E = metaEquipes(D), I = indTodas(), ed = podeEditar(), fmt = d => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (!D.fimD) return `<div class="head"><div><h2>Meta do TOP</h2></div></div><section class="panel"><div class="empty">Coloque a data de início do ${esc(topName())} em Tops para o app montar a meta.</div></section>`;
  const ok = D.inscritos >= D.metaHoje, f = S.indF || (ehCoordEq() ? "equipe" : "todas");
  const meusI = ehCoordEq() ? I.filter(x => x.equipe === ME.equipeLgnd) : I;
  const filt = { todas: meusI, equipe: meusI, atras: meusI.filter(indAtrasada), int: meusI.filter(x => x.status === "interessado" && !indInscrito(x)), insc: meusI.filter(indInscrito) }[f] || meusI;
  const max = Math.max(D.meta, ...D.semanas.map(s => s.real || 0));
  const st = x => { const p = indInscrito(x); if (p) return `<span class="chip ok">Inscrito ✓</span>`; const o = IND_ST.find(y => y.v === x.status) || IND_ST[0]; return `<span class="chip ${indAtrasada(x) ? "bad" : o.c}">${indAtrasada(x) ? "Sem contato há +48 h" : o.l}</span>`; };
  const tel = x => waNumber(x.tel);
  const cab = `
  <div class="head"><div><h2>Meta do TOP</h2><p>${esc(topName())}: ${D.vagas} vagas + ${D.desist}% de desistência = <b>${D.meta} inscritos</b> até ${fmt(D.fimD)}. A meta é montada sozinha para cada TOP novo.</p></div>
    <div class="actions">${podeIndicar() ? `<button class="btn primary" type="button" data-ind-novo="1">${ico("plus")} Indicar nome</button>` : ""}${podeEditar() ? `<button class="btn" type="button" data-act="ind-link">${ico("route")} Link de indicação</button>` : ""}<button class="btn" type="button" data-go="agenda">${ico("clock")} Agenda</button>${S.isOwner ? `<button class="btn" type="button" data-act="meta-ajustar">${ico("edit")} Ajustar meta</button>` : ""}</div></div>
`;
  const pPlacar = `
  <div class="kpis">
    <div class="kpi ${ok ? "" : "alert"}"><span class="lbl">Inscritos</span><span class="val num">${D.inscritos}<small style="font-size:.5em;color:var(--muted)"> / ${D.meta}</small></span><span class="sub">meta para hoje: ${D.metaHoje} ${ok ? "· no ritmo ✓" : `· faltam ${D.metaHoje - D.inscritos}`}</span></div>
    <div class="kpi"><span class="lbl">Semana</span><span class="val num">${D.semana ?? "—"}</span><span class="sub">${D.dias > 0 ? `faltam ${D.dias} dias` : "semana do TOP"}</span></div>
    <div class="kpi"><span class="lbl">Indicações</span><span class="val num">${I.length}</span><span class="sub">${I.filter(indInscrito).length} viraram inscritos</span></div>
    ${ehCoordEq() ? "" : `<button class="kpi ${I.filter(indAtrasada).length ? "alert" : ""}" type="button" data-ind-f="atras"><span class="lbl">Sem contato +48 h</span><span class="val num">${I.filter(indAtrasada).length}</span><span class="sub">fazer o contato</span></button>`}
  </div>
  <section class="panel"><h3>Ritmo até o TOP <small>barra = inscritos · linha = meta</small></h3>
    <div class="meta-graf">${D.semanas.map((s, i) => { const w = -(D.semanas.length - i); return `<div class="mg-col ${s.real == null ? "fut" : s.real >= s.meta ? "ok" : "baixo"}" title="Semana ${w}: meta ${s.meta}${s.real != null ? `, inscritos ${s.real}` : ""}">
      <div class="mg-area"><i class="mg-meta" style="bottom:${pct(s.meta, max)}%"></i>${s.real != null ? `<i class="mg-real" style="height:${pct(s.real, max)}%"></i>` : ""}</div><small class="num">${w}</small></div>`; }).join("")}</div>
    <div class="meta-checks">${D.checks.map(c => { const cls = !c.passou ? "" : D.inscritos >= c.min ? "ok" : "bad";
      return `<div class="mc ${cls}"><span class="lbl">Semana -${c.w} · ${fmt(c.d)}</span><b class="num">mín. ${c.min}</b><small>${!c.passou ? "ainda vem" : cls === "ok" ? "batido ✓" : "abaixo: plano B"}</small></div>`; }).join("")}</div>
  </section>
`;
  const pInd = `
  <section class="panel"><h3>${ehCoordEq() ? `Indicações da ${esc(ME.equipeLgnd || "equipe")}` : "Indicações"} <small>${filt.length}</small></h3>
    ${ehCoordEq() ? "" : `<div class="seg" role="group" aria-label="Filtro">${[["todas", "Todas"], ["atras", "Sem contato +48 h"], ["int", "Interessados"], ["insc", "Inscritos"]].map(([k, l]) => `<button type="button" data-ind-f="${k}" aria-pressed="${f === k || (k === "todas" && f === "equipe")}">${l}</button>`).join("")}</div>`}
    ${filt.length ? `<div class="list">${[...filt].sort((a, b) => (indAtrasada(b) - indAtrasada(a)) || String(b.em).localeCompare(String(a.em))).map(x => `<div class="li ind-li">
      <div class="grow"><b>${esc(x.nome)}</b> ${st(x)}${x.origem === "link" ? ' <span class="tag">pelo link</span>' : x.origem === "evento" ? ' <span class="tag ev-captar">do evento</span>' : ""}<br><small class="hint">${[x.equipe, x.canal, x.quem && "indicado por " + x.quem, haQuanto(x.em)].filter(Boolean).map(esc).join(" · ")}${x.obs ? " · " + esc(x.obs) : ""}</small></div>
      ${!ehCoordEq() && ed && !indInscrito(x) ? `<div class="actions">${tel(x) ? `<a class="btn sm" href="https://wa.me/${tel(x)}?text=${encodeURIComponent(`Olá ${x.nome.split(" ")[0]}, tudo bem? Aqui é da equipe ADM dos Legendários 3 Colinas. ${x.quem ? x.quem.split(" ")[0] + " indicou você para o próximo TOP" : "Você foi indicado para o próximo TOP"}. Posso te contar como funciona?`)}" target="_blank" rel="noopener" data-ind-zap="${esc(x.doc)}|${esc(x.id)}">${ico("wa")} Chamar</a>` : ""}
        <select class="sel sm" data-ind-st="${esc(x.doc)}|${esc(x.id)}" aria-label="Situação">${IND_ST.map(o => `<option value="${o.v}" ${x.status === o.v ? "selected" : ""}>${o.l}</option>`).join("")}</select>
        <button class="linkbtn" type="button" data-ind-ed="${esc(x.doc)}|${esc(x.id)}" aria-label="Editar">${ico("edit")}</button></div>` : ""}</div>`).join("")}</div>`
    : `<div class="empty">${I.length ? "Nada neste filtro." : "Nenhum nome indicado ainda. Cada servidor indica 5 nomes."}</div>`}
  </section>`;
  const aba = ["grupo", "quadro", "ind", ...(ehCoordEq() ? [] : ["placar"])].includes(S.metaAba) ? S.metaAba : "grupo";
  return cab + metaAbas(aba) + (aba === "grupo" ? vGrupos(D) : aba === "quadro" ? vQuadro(D) : aba === "ind" ? metaFaq() + pInd : metaResumo2(D) + pPlacar);
}
document.addEventListener("change", e => { const t = e.target; if (t && t.dataset && t.dataset.qResp) { quadroMarcar(t.dataset.qResp, "resp", t.value); return; } if (t && t.dataset && t.dataset.qDar && t.value) { quadroMarcar(t.dataset.qDar, "pegar", t.value); return; } if (t && t.dataset && t.dataset.indSt) { const [doc, id] = t.dataset.indSt.split("|"); indMarcar(doc, id, t.value); } });
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("a[data-ind-zap]"); if (!a) return;
  const [doc, id] = a.dataset.indZap.split("|"), x = indTodas().find(y => y.doc === doc && y.id === id); if (x && x.status === "novo") setTimeout(() => indMarcar(doc, id, "contatado"), 300); });
/* Tarefas do PDF Estratégia 150: hoje só servem para o plano de 13 semanas do próximo TOP (prevPlano) */
const TAR_PDF = [
  ["Diretoria", -12, "Aprovar meta, gastos e o desconto da panfletagem"], ["Diretoria", -10, "Abrir igrejas e conversar com os pastores", 3, "igreja"],
  ["Intercessão", -9, "Adote um nome: cada intercessor ora por 3 convidados e manda mensagem"], ["Intercessão", -8, "Abrir as igrejas dos intercessores", 2, "igreja"],
  ["ADM", -13, "Planilha única e formulário de inscrição prontos"], ["ADM", -10, "Formulário da panfletagem e controle dos cupons"], ["ADM", -6, "Pesquisa de feedback do pré-TOP"],
  ["Logística", -13, "Fechar o limite de vagas"], ["Logística", -6, "Abrir a lista de caronas"], ["Logística", -1, "Comunicado prático aos confirmados"],
  ["Produção", -10, "Panfletos com QR code impressos (1.400)"], ["Produção", -8, "Kit do pré-TOP"], ["Produção", -5, "Mesas de inscrição com banner e QR code", 8],
  ["Mídia", -11, "Arte do panfleto e kit de divulgação"], ["Mídia", -6, "Vídeos de testemunho", 4],
  ["Segurança", -12, "FAQ de segurança"], ["Segurança", -10, "Escolher 3 membros para a panfletagem"],
  ["Hakunas", -12, "FAQ de saúde"], ["Hakunas", -10, "Escolher 3 membros para a panfletagem"], ["Hakunas", -3, "Fichas de saúde de 100% dos inscritos"],
  ["Voz", -8, "Vídeos curtos de convite para a família", 2], ["Voz", -5, "Apresentações de 5 min nas igrejas parceiras", 3, "igreja"], ["Voz", -10, "Escolher 3 membros para a panfletagem"],
  ["Eventos", -12, "Calendário de eventos da cidade"], ["Eventos", -9, "Encontro menor de apresentação", 1, "encontro"], ["Eventos", -7, "Fazer o pré-TOP (meta: 60 presentes)", 1, "pretop"], ["Eventos", -10, "Escolher 3 membros para a panfletagem"],
  ["Esposas", -7, "Ajudar na recepção do pré-TOP"], ["Esposas", -4, "Conversar com as esposas dos inscritos indecisos"],
];
const TAR_CONT = [[-11, "Diretoria", "Lançamento do TOP"], [-10, "Voz", "Convite aos homens de Franca"], [-9, "Mídia", "Testemunhos do último TOP"], [-8, "Eventos", "Convite para o pré-TOP"],
  [-7, "Eventos", "Pré-TOP ao vivo e bastidores"], [-6, "Hakunas", "Cuidado com você: saúde"], [-6, "Segurança", "Cuidado com você: segurança"], [-5, "Logística", "Bastidores da estrutura"],
  [-5, "Produção", "Bastidores da montagem"], [-4, "Intercessão", "Oração e mensagem de fé"], [-3, "ADM", "Como se inscrever e últimas vagas"], [-2, "Esposas", "Esposas e famílias"], [-1, "ADM", "Reta final e orientações práticas"]];
/* Eventos de divulgação (ida à igreja, panfletagem, pré-TOP…; na tela se chamam "Eventos"): config acao-<top>-<membroId> {lista:[{id,tipo,titulo,data,hora,local,endereco,equipe,obs,token,por,em,resultado}]}.
   Link de presença acao.html (na demo, localStorage "adm3-acao-link"; no real, RPC adm_acao_confirmar). Convite em PDF para os legendários. */
const ACAO_CAPTAR = ["Apresentação em igreja", "Panfletagem", "Pré-TOP", "Encontro de apresentação"];
const ACAO_CUIDAR = ["Encontro de legendários", "Culto ou célula", "Confraternização", "Trilha ou treino", "Ação social"];
const ACAO_TIPOS = [...ACAO_CAPTAR, ...ACAO_CUIDAR, "Outro"];
const acaoCuidar = a => a.objetivo ? a.objetivo === "cuidar" : ACAO_CUIDAR.includes(a.tipo);
/* Objetivo do evento: captar (Divulgação), cuidar (Legendários) ou outro com texto livre (a.objetivo, a.objetivoTxt) */
const acaoObj = a => a.objetivo === "outro" ? { k: "outro", tag: a.objetivoTxt || "Outro", cls: "ev-outro", txt: a.objetivoTxt || "" }
  : acaoCuidar(a) ? { k: "cuidar", tag: "Legendários", cls: "ev-cuidar", txt: "Cuidar dos legendários: estar junto de quem já passou pelo TOP e fortalecer a irmandade." }
  : { k: "captar", tag: "Divulgação", cls: "ev-captar", txt: "Trazer senderistas: apresentar o Legendários e levar mais homens para o próximo TOP." };
const acaoTag = a => { const o = acaoObj(a); return `<span class="tag ${o.cls}">${esc(o.tag)}</span>`; };   // evento com os legendários (cuidar) x divulgação (trazer senderistas)
const ACAO_LS = "adm3-acao-link";
const acaoDocMeu = () => "acao-" + curTopId() + "-" + (ME.id || "eu");
function acoesTodas() { const pre = "acao-" + curTopId() + "-"; return Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(pre)).flatMap(([k, d]) => (d.lista || []).map(x => ({ ...x, doc: k }))).sort((a, b) => String(a.data + a.hora).localeCompare(String(b.data + b.hora))); }
function acaoConfirmados(a) {
  if (DEMO) { try { return (JSON.parse(localStorage.getItem(ACAO_LS) || "[]") || []).filter(x => x.acao === a.id); } catch { return []; } }
  return Object.entries(S.cfgDocs || {}).filter(([k]) => k.startsWith(`acaopres-${curTopId()}-${a.id}-`)).map(([, d]) => d);
}
const acaoLink = (a, r) => { const info = { t: a.titulo, d: a.data, h: a.hora, l: a.local, e: a.endereco, q: r ? r.eq : acaoResp(a).length > 1 ? "Legendários Base 3 Colinas" : a.equipe, v: 2, x: a.aberto && !r ? 1 : 0, ...(r ? { fe: r.eq, m: String(r.oque || "").slice(0, 160), n: r.homens || 0 } : {}) };
  return `${location.origin}${DEMO ? location.pathname.replace(/[^/]*$/, "") + "acao.html" : "/api/convite"}?t=${encodeURIComponent(a.token)}&top=${encodeURIComponent(curTopId())}&a=${encodeURIComponent(a.id)}&i=${encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(info)))))}${DEMO ? "&demo=1" : ""}`; };
const acaoQuando = a => { const d = a.data ? new Date(a.data + "T12:00:00") : null; return (d ? d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "data a definir") + (a.hora ? " às " + a.hora : ""); };
function acaoSalvar(doc, item, msg, apagar) {
  if (!podeIndicar()) { toast("Seu acesso é somente leitura."); return; }
  const L = ((S.cfgDocs || {})[doc] || {}).lista || [], id = apagar || item.id, nova = L.filter(y => y.id !== id); if (item) { const { doc: _d, ...x } = item; nova.push(x); }
  (async () => { try { await api.set("config", doc, { lista: nova }); if (msg) toast(msg); } catch (e) { toast("Não foi possível salvar. " + erroAmigavel(e)); } render(); })();
}
/* Equipes responsáveis no evento: a.resp = [{eq, oque, homens}]. "Todas as equipes" põe uma linha por equipe. */
const acaoEqLista = () => [...new Set([...equipesUsadas(), "Diretoria", "Esposas"])];
const acaoResp = a => (a.resp || []).filter(x => x && x.eq);
const acaoEquipeTxt = a => { const R = acaoResp(a); return !R.length ? a.equipe : R.length >= equipesUsadas().length ? "Todas as equipes" : R.length > 2 ? `${R.length} equipes` : R.map(x => x.eq).join(" e "); };
const acaoTemEq = (a, eq) => a.equipe === eq || acaoResp(a).some(x => x.eq === eq);
const acaoRespLinha = (x, i) => `<div class="ev-resp" data-i="${i}"><select name="req-eq" class="sel" aria-label="Equipe">${acaoEqLista().map(e => `<option ${x.eq === e ? "selected" : ""}>${esc(e)}</option>`).join("")}</select>
    <input name="req-o" value="${esc(x.oque || "")}" placeholder="o que essa equipe faz" aria-label="O que faz"><input name="req-h" type="number" min="0" value="${x.homens || ""}" placeholder="homens" title="Quantos homens" aria-label="Homens" class="ev-h">
    <button class="linkbtn" type="button" data-ev-tira aria-label="Tirar equipe">${ico("x")}</button></div>`;
function acaoForm(a) {
  if (!podeIndicar()) { toast("Seu acesso é somente leitura."); return; }
  const novo = !a; a = a || { tipo: ACAO_TIPOS[0], equipe: ehCoordEq() ? ME.equipeLgnd : "", data: "", hora: "19:00" };
  modal(`<h3>${novo ? "Novo evento" : "Editar evento"}</h3><div class="form">
    <div class="field"><label for="ac-ob">Objetivo</label><select id="ac-ob" name="objetivo" class="sel">${[["captar", "Divulgação: trazer senderistas"], ["cuidar", "Cuidar dos legendários"], ["outro", "Outro (escrever)"]].map(([k, l]) => `<option value="${k}" ${acaoObj(a).k === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field" id="ac-obw" ${acaoObj(a).k === "outro" ? "" : "hidden"}><label for="ac-obt">Qual objetivo?</label><input id="ac-obt" name="objetivoTxt" value="${esc(a.objetivoTxt || "")}" placeholder="ex.: Arrecadar alimentos" maxlength="40"></div>
    <label class="field full ck-line"><input type="checkbox" name="aberto" ${a.aberto ? "checked" : ""}> Convite aberto: quem ainda não é legendário também pode confirmar</label>
    <div class="field full"><label for="ac-ti">Título</label><input id="ac-ti" name="titulo" value="${esc(a.titulo || "")}" placeholder="ex.: Apresentação na Igreja Batista Central" required></div>
    <div class="field"><label for="ac-d">Dia</label><input id="ac-d" name="data" type="date" value="${esc(a.data || "")}" required></div>
    <div class="field"><label for="ac-h">Hora</label><input id="ac-h" name="hora" type="time" value="${esc(a.hora || "")}"></div>
    <div class="field full"><label for="ac-l">Local</label><input id="ac-l" name="local" value="${esc(a.local || "")}" placeholder="ex.: Igreja Batista Central"></div>
    <div class="field full"><label for="ac-en">Endereço</label><input id="ac-en" name="endereco" value="${esc(a.endereco || "")}" placeholder="Rua, número, bairro"></div>
    ${!ehCoordEq() ? `<div class="field full"><label>Equipes responsáveis</label><p class="hint" style="margin:0 0 6px">Para cada equipe: o que ela faz no evento e quantos homens precisa.</p>
      <div id="evResp">${(acaoResp(a).length ? acaoResp(a) : [{ eq: a.equipe || acaoEqLista()[0] }]).map(acaoRespLinha).join("")}</div>
      <div class="actions"><button class="btn sm" type="button" id="evMais">${ico("plus")} Adicionar equipe</button><button class="btn sm" type="button" id="evTodas">Todas as equipes</button><span class="hint" id="evTot"></span></div></div>`
    : `<div class="field"><label for="ac-eq">Equipe</label>${ehCoordEq() ? `<input id="ac-eq" name="equipe" value="${esc(a.equipe)}" readonly>` : `<select id="ac-eq" name="equipe" class="sel">${acaoEqLista().map(e => `<option ${a.equipe === e ? "selected" : ""}>${esc(e)}</option>`).join("")}</select>`}</div>
    <div class="field"><label for="ac-v">Legendários precisos</label><input id="ac-v" name="vagas" type="number" min="0" value="${a.vagas || ""}" placeholder="ex.: 6"></div>`}
    <div class="field full"><label for="ac-o">Recado para quem for (opcional)</label><input id="ac-o" name="obs" value="${esc(a.obs || "")}" placeholder="ex.: ir de camiseta da Base, chegar 30 min antes"></div>
  </div><div class="modal-foot"><div>${novo ? "" : `<button class="btn danger" type="button" id="delBtn">Excluir</button>`}</div>
    <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const titulo = String(fd.get("titulo") || "").trim(), data = String(fd.get("data") || ""); if (!titulo || !data) { toast("Coloque o título e o dia."); return; }
    let resp = null;
    if ($("#evResp")) { const E = fd.getAll("req-eq"), O = fd.getAll("req-o"), Hh = fd.getAll("req-h"), vis = new Set();
      resp = E.map((eq, i) => ({ eq: String(eq), oque: String(O[i] || "").trim(), homens: +Hh[i] || 0 })).filter(x => x.eq && !vis.has(x.eq) && vis.add(x.eq));
      if (!resp.length) { toast("Coloque pelo menos uma equipe."); return; } }
    const obj = { objetivo: String(fd.get("objetivo") || ""), objetivoTxt: fd.get("objetivo") === "outro" ? String(fd.get("objetivoTxt") || "").trim().slice(0, 40) : "", aberto: !!fd.get("aberto") };
    if (obj.objetivo === "outro" && !obj.objetivoTxt) { toast("Escreva qual é o objetivo."); return; }
    const item = { ...a, ...obj, id: a.id || "ac" + Date.now().toString(36), token: a.token || Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), tipo: a.tipo && a.objetivo === obj.objetivo ? a.tipo : obj.objetivo === "cuidar" ? "Encontro de legendários" : obj.objetivo === "outro" ? "Outro" : "Encontro de apresentação", titulo, data,
      hora: String(fd.get("hora") || ""), local: String(fd.get("local") || "").trim(), endereco: String(fd.get("endereco") || "").trim(), equipe: resp ? resp[0].eq : String(fd.get("equipe") || ""), vagas: resp ? resp.reduce((n, x) => n + x.homens, 0) : +fd.get("vagas") || 0, ...(resp ? { resp } : {}),
      obs: String(fd.get("obs") || "").trim(), por: a.por || ME.adm || "", em: a.em || new Date().toISOString() };
    closeModal(); acaoSalvar(a.doc || acaoDocMeu(), item, novo ? "Evento criado: agora mande o link e o convite" : "Evento salvo"); });
  const del = $("#delBtn"); if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); acaoSalvar(a.doc, null, "Evento excluído", a.id); };
  const ob = $("#ac-ob"); if (ob) ob.onchange = () => { $("#ac-obw").hidden = ob.value !== "outro"; if (ob.value === "outro") $("#ac-obt").focus(); };
  const box = $("#evResp"); if (!box) return;
  const tot = () => { const n = [...box.querySelectorAll('[name="req-h"]')].reduce((s, i) => s + (+i.value || 0), 0), q = box.children.length; $("#evTot").textContent = `${q} equipe(s)${n ? ` · ${n} homens` : ""}`; };
  const usadas = () => [...box.querySelectorAll('[name="req-eq"]')].map(x => x.value);
  const add = eq => { const d = document.createElement("div"); d.innerHTML = acaoRespLinha({ eq }, box.children.length); box.appendChild(d.firstElementChild); };
  $("#evMais").onclick = () => { add(acaoEqLista().find(e => !usadas().includes(e)) || acaoEqLista()[0]); tot(); };
  $("#evTodas").onclick = () => { const u = usadas(); equipesUsadas().filter(e => !u.includes(e)).forEach(add); tot(); toast("Todas as equipes no evento. Tire as que não vão."); };
  box.addEventListener("click", e => { const b = e.target.closest("[data-ev-tira]"); if (!b) return; if (box.children.length > 1) b.closest(".ev-resp").remove(); else toast("O evento precisa de pelo menos uma equipe."); tot(); });
  box.addEventListener("input", tot); tot();
}
async function acaoXlsx(a) {
  const C = acaoConfirmados(a), dt = v => v ? new Date(v).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  try { const X = await carregarXlsx(), wb = X.utils.book_new();
    const ws = X.utils.aoa_to_sheet([["Nome", "É legendário?", "Nº de legendário", "Área que serve", "Telefone", "Igreja", "Pode contribuir com", "Confirmou em"],
      ...C.map(x => [x.nome || "", x.leg === false ? "Ainda não" : "Sim", x.num || "", x.equipe || "", x.tel || "", x.igreja || "", x.info || "", dt(x.em)])]);
    ws["!cols"] = [{ wch: 30 }, { wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 45 }, { wch: 14 }];
    X.utils.book_append_sheet(wb, ws, "Confirmados");
    const R = acaoResp(a), ev = X.utils.aoa_to_sheet([["Evento", a.titulo], ["Objetivo", acaoObj(a).tag], ["Quando", acaoQuando(a)], ["Local", [a.local, a.endereco].filter(Boolean).join(" · ")], ["Recado", a.obs || ""],
      ["Confirmados", C.length], ["Legendários", C.filter(x => x.leg !== false).length], ["Ainda não legendários", C.filter(x => x.leg === false).length], [],
      ["Equipe", "O que faz", "Homens", "Confirmados da equipe"], ...R.map(x => [x.eq, x.oque || "", x.homens || 0, C.filter(c => c.equipe === x.eq).length])]);
    ev["!cols"] = [{ wch: 22 }, { wch: 50 }, { wch: 10 }, { wch: 20 }]; X.utils.book_append_sheet(wb, ev, "Evento");
    X.writeFile(wb, `evento-${a.titulo.replace(/[^\wÀ-ú -]/g, "").slice(0, 40).trim().replace(/\s+/g, "-")}-${a.data}.xlsx`); toast(`Planilha com ${C.length} confirmado(s)`);
  } catch (e) { toast("Não consegui gerar a planilha. " + (e.message || "")); }
}
async function acaoPlanoPdf(a) {
  const R = acaoResp(a).length ? acaoResp(a) : [{ eq: a.equipe, oque: "", homens: a.vagas || 0 }], C0 = acaoConfirmados(a), tot = R.reduce((n, x) => n + (x.homens || 0), 0);
  const X = await pdfBase("Plano do evento", `${acaoObj(a).tag} · ${acaoEquipeTxt(a)} · ${topName()}`), { doc, C, W } = X;
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(255, 255, 255); const tl = doc.splitTextToSize(a.titulo, W - 28); doc.text(tl, 14, X.y); X.y += tl.length * 7 + 3;
  const caixas = [["QUANDO", acaoQuando(a)], ["ONDE", [a.local, a.endereco].filter(Boolean).join(" · ") || "a definir"], ["EQUIPES", `${R.length} · ${tot} homens`]];
  const cw = (W - 28 - 8) / 3; X.cabe(24);
  caixas.forEach(([l, v], k) => { const x = 14 + k * (cw + 4); doc.setFillColor(26, 34, 45); doc.roundedRect(x, X.y, cw, 20, 2.5, 2.5, "F"); doc.setFillColor(...C.LARANJA); doc.rect(x, X.y + 4, 1.3, 12, "F");
    doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text(l, x + 5, X.y + 6.5, { charSpace: 0.5 });
    doc.setTextColor(255, 255, 255); doc.setFontSize(9.5); doc.text(doc.splitTextToSize(v, cw - 8).slice(0, 2), x + 5, X.y + 11.5); });
  X.y += 26;
  const missao = acaoObj(a).txt || acaoObj(a).tag;
  doc.setTextColor(255, 210, 170); doc.setFont("helvetica", "italic"); doc.setFontSize(10); let ml = doc.splitTextToSize("Missão: " + missao, W - 28); doc.text(ml, 14, X.y); X.y += ml.length * 4.6 + 2;
  if (a.aberto) { doc.setTextColor(225, 214, 202); doc.setFont("helvetica", "normal"); doc.text("Convite aberto: pode trazer quem ainda não é legendário.", 14, X.y); X.y += 6.6; }
  if (a.obs) { doc.setTextColor(225, 214, 202); doc.setFont("helvetica", "normal"); ml = doc.splitTextToSize("Recado: " + a.obs, W - 28); doc.text(ml, 14, X.y); X.y += ml.length * 4.6 + 2; }
  X.y += 4; doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("O QUE PRECISAMOS DAS EQUIPES", 14, X.y, { charSpace: 1 });
  doc.setDrawColor(...C.LARANJA); doc.setLineWidth(0.3); doc.line(14 + doc.getTextWidth("O QUE PRECISAMOS DAS EQUIPES") + 28 * 1 + 4, X.y - 1.2, W - 14, X.y - 1.2); X.y += 6;
  R.forEach(x => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); const ol = doc.splitTextToSize(x.oque || "a combinar com a ADM", W - 80), conf = C0.filter(c => c.equipe === x.eq).length, h = Math.max(23, 15 + ol.length * 4.8);
    X.cabe(h + 3); doc.setFillColor(24, 32, 43); doc.roundedRect(14, X.y, W - 28, h, 3, 3, "F"); doc.setFillColor(...C.LARANJA); doc.rect(14, X.y + 4, 1.4, h - 8, "F");
    doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5); doc.text(x.eq.toUpperCase(), 20, X.y + 7.5, { charSpace: 0.4 });
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text(ol, 20, X.y + 13.5);
    doc.setFillColor(...C.LARANJA); doc.roundedRect(W - 50, X.y + 4, 32, 12, 2, 2, "F"); doc.setTextColor(26, 12, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text(String(x.homens || "-"), W - 34, X.y + 11.3, { align: "center" });
    doc.setFontSize(6.5); doc.text("HOMENS", W - 34, X.y + 14.6, { align: "center" });
    if (conf) { doc.setTextColor(170, 200, 170); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(`${conf} confirmado(s)`, W - 34, X.y + h - 2.5, { align: "center" }); }
    if (acaoResp(a).length) { doc.setTextColor(255, 170, 110); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text("Servo desta equipe: toque aqui para confirmar", 20, X.y + h - 3); doc.link(14, X.y, W - 28, h, { url: acaoLink(a, x) }); }
    X.y += h + 3; });
  X.cabe(16); doc.setFillColor(...C.LARANJA); doc.roundedRect(14, X.y + 2, W - 28, 12, 3, 3, "F"); doc.setTextColor(26, 12, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
  doc.text(`TOTAL: ${tot} HOMENS EM ${R.length} EQUIPE(S)`, W / 2, X.y + 9.6, { align: "center" }); doc.link(14, X.y + 2, W - 28, 12, { url: acaoLink(a) }); X.y += 18;
  doc.setTextColor(190, 180, 170); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text("Toque na faixa laranja para confirmar presença.", W / 2, X.y, { align: "center" });
  await entregarPdf(doc.output("blob"), `Evento - ${a.titulo.replace(/[^\wÀ-ú -]/g, "").slice(0, 50)}.pdf`, `Evento: ${a.titulo}`, true);
}
async function acaoPdf(a) {
  const jsPDF = await carregarPdf(), C = PDF_COR, [logo, fundo] = await Promise.all([imagemDataUrl("assets/logo.png"), imagemDataUrl("assets/bg.jpg")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210, H = 297;
  doc.setFillColor(...C.NAVY); doc.rect(0, 0, W, H, "F");
  if (fundo) try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: 0.35 })); doc.addImage(fundo, "JPEG", -40, 0, 290, 150, "fundo", "FAST"); doc.restoreGraphicsState(); } catch (e) {}
  if (logo) try { doc.addImage(logo, "PNG", W / 2 - 14, 16, 28, 35.4, "logo"); } catch (e) {}
  doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("CONVITE · LEGENDÁRIOS BASE 3 COLINAS", W / 2, 64, { align: "center", charSpace: 0.8 });
  doc.setTextColor(255, 255, 255); doc.setFontSize(27); const tl = doc.splitTextToSize(a.titulo.toUpperCase(), W - 36); doc.text(tl, W / 2, 78, { align: "center", lineHeightFactor: 1.1 });
  let y = 78 + tl.length * 11 + 2;
  doc.setFont("helvetica", "normal"); doc.setFontSize(12.5); doc.setTextColor(220, 210, 200);
  doc.text(doc.splitTextToSize(acaoCuidar(a) ? `${acaoResp(a).length > 1 ? "A Base 3 Colinas" : "A equipe " + acaoEquipeTxt(a)} convida os legendários para estarmos juntos de novo. Traga sua família e seus irmãos de TOP.` : `${acaoResp(a).length > 1 ? "A Base 3 Colinas" : "A equipe " + acaoEquipeTxt(a)} convida os legendários para estar junto neste evento e levar o TOP para mais homens.`, W - 50), W / 2, y, { align: "center" }); y += 16;
  const caixa = (lbl, val, yy) => { doc.setFillColor(26, 34, 45); doc.roundedRect(24, yy, W - 48, 21, 3, 3, "F"); doc.setFillColor(...C.LARANJA); doc.rect(24, yy + 4, 1.6, 13, "F");
    doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(lbl, 32, yy + 7.5, { charSpace: 0.5 });
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.text(doc.splitTextToSize(val, W - 64)[0] || "", 32, yy + 15.5); };
  caixa("QUANDO", acaoQuando(a), y); y += 25;
  caixa("ONDE", a.local || "a definir", y); y += 25;
  if (a.endereco) { caixa("ENDEREÇO", a.endereco, y); y += 25; }
  if (a.obs) { doc.setTextColor(255, 210, 160); doc.setFont("helvetica", "italic"); doc.setFontSize(12); doc.text(doc.splitTextToSize(a.obs, W - 50), W / 2, y + 6, { align: "center" }); y += 16; }
  doc.setFillColor(...C.LARANJA); doc.roundedRect(24, y + 4, W - 48, 30, 4, 4, "F");
  doc.setTextColor(26, 12, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("CONFIRME SUA PRESENÇA", W / 2, y + 15, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text("Toque aqui ou use o link enviado no grupo", W / 2, y + 23, { align: "center" });
  doc.link(24, y + 4, W - 48, 30, { url: acaoLink(a) });
  if (a.endereco || a.local) { doc.setTextColor(180, 170, 160); doc.setFontSize(10); doc.setTextColor(255, 170, 110); doc.textWithLink("Abrir no mapa", W / 2 - 12, y + 44, { url: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([a.local, a.endereco, "Franca SP"].filter(Boolean).join(", ")) }); }
  doc.setTextColor(140, 130, 120); doc.setFontSize(8.5); doc.text(`${topName()} · ${acaoEquipeTxt(a)}${a.por ? " · " + a.por : ""}`, W / 2, H - 12, { align: "center" });
  await entregarPdf(doc.output("blob"), `Convite - ${a.titulo.replace(/[^\wÀ-ú -]/g, "").slice(0, 50)}.pdf`, `Convite: ${a.titulo}`, true);
}
/* Lembrete no WhatsApp para cada confirmado (só na demo): mensagem editável por evento em a.lembrete, enviados em a.lembrados {chave: iso} */
const ZAP = () => DEMO;
const LEMBRETE_PADRAO = "Olá {nome}! Passando para lembrar: *{evento}* é {quando}{local}. Contamos com você! 🙏";
const lembreteTxt = (tpl, a, x) => String(tpl || LEMBRETE_PADRAO).replace(/\{nome\}/g, String(x.nome || "").split(" ")[0]).replace(/\{evento\}/g, a.titulo).replace(/\{quando\}/g, acaoQuando(a))
  .replace(/\{local\}/g, a.local ? " em " + a.local : "").replace(/\{endereco\}/g, a.endereco || "");
function acaoVer(a) {
  const zap = ZAP() && podeEditar() && !ehCoordEq();
  const C = acaoConfirmados(a), l = acaoLink(a), R = acaoResp(a), msg = `*${a.titulo}*\n${acaoQuando(a)}${a.local ? "\n" + a.local : ""}${R.length ? "\n\n" + R.map(x => `• ${x.eq}${x.oque ? ": " + x.oque : ""}${x.homens ? ` (${x.homens} homens)` : ""}`).join("\n") : ""}\n\n${R.length ? "Contamos com você!" : `A equipe ${a.equipe} convida você!`} Confirme sua presença: ${l}`, pode = podeEditar() || (ehCoordEq() && a.equipe === ME.equipeLgnd);
  modal(`<h3>${esc(a.titulo)}</h3><p class="hint" style="margin:0">${acaoTag(a)} · ${esc(acaoEquipeTxt(a))} · ${esc(acaoQuando(a))}${a.local ? " · " + esc(a.local) : ""}</p>
    <div class="actions" style="flex-wrap:wrap"><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ico("wa")} Mandar link no WhatsApp</a>
      <button class="btn" type="button" id="acCopiar">Copiar link</button><button class="btn" type="button" id="acPdf">${ico("upload")} Convite em PDF</button><button class="btn" type="button" id="acPlano">${ico("upload")} PDF do evento</button>${podeEditar() && !ehCoordEq() ? `<button class="btn" type="button" id="acXls">${ico("upload")} Planilha dos confirmados</button>` : ""}${pode ? `<button class="btn ghost" type="button" id="acEd">${ico("edit")} Editar</button>` : ""}</div>
    ${R.length ? `<section class="panel" style="margin-top:6px"><h3>O que precisamos das equipes <small>${R.reduce((n, x) => n + (x.homens || 0), 0)} homens</small></h3><p class="hint" style="margin:0 0 6px">Cada equipe tem o seu link: mande para os servos daquela área. Quem confirmar já entra na equipe certa.</p><div class="list">${R.map((x, i) => { const c = C.filter(y => y.equipe === x.eq).length, pode = podeEditar() || x.eq === ME.equipeLgnd;
      const m = `*${a.titulo}*\n${acaoQuando(a)}${a.local ? "\n" + a.local : ""}\n\n*Equipe ${x.eq}*, precisamos de você${x.homens ? ` (${x.homens} homens)` : ""}${x.oque ? ":\n" + x.oque : "."}\n\nConfirme aqui: ${acaoLink(a, x)}`;
      return `<div class="li ${x.eq === ME.equipeLgnd ? "ev-minha" : ""}"><span class="grow"><b>${esc(x.eq)}</b><small class="hint" style="display:block;white-space:normal">${esc(x.oque || "a combinar")}</small>
        ${pode ? `<span class="actions" style="margin-top:4px"><a class="btn sm" style="color:var(--fg)" href="https://wa.me/?text=${encodeURIComponent(m)}" target="_blank" rel="noopener">${ico("wa")} Link da equipe</a><button class="linkbtn" type="button" data-ev-copia="${i}">copiar</button></span>` : ""}</span><span class="chip ${x.homens && c >= x.homens ? "ok" : ""}">${c}/${x.homens || "-"}</span></div>`; }).join("")}</div></section>` : ""}
    ${a.data <= hojeISO() && (podeEditar() || a.por === ME.adm) ? `<section class="panel" style="margin-top:6px"><h3>Quem foi de verdade ${a.foram ? `<small>${acaoPresentes(a)} foram</small>` : ""}</h3>
      <p class="hint" style="margin:0 0 6px">Marque quem apareceu. É isso que conta como presença da equipe no Resumo.</p>
      ${C.length ? `<div class="list">${C.map(x => `<label class="li ck-line" style="cursor:pointer"><input type="checkbox" class="ev-foi" value="${esc(confKey(x))}" ${!a.foram || a.foram.includes(confKey(x)) ? "checked" : ""}> <span class="grow"><b>${esc(x.nome)}</b> <span class="hint">${esc(x.leg === false ? "convidado" : x.equipe || "")}</span></span></label>`).join("")}</div>` : ""}
      <div class="actions" style="margin-top:8px"><label class="hint" for="evExtra">Foram sem confirmar:</label><input id="evExtra" type="number" min="0" value="${+a.foramExtra || 0}" style="width:80px"><button class="btn primary sm" type="button" id="evForam">${ico("check")} Salvar presença</button></div></section>` : ""}
    <section class="panel" style="margin-top:6px"><h3>Confirmados <small>${C.length}${a.vagas ? " de " + a.vagas : ""}</small></h3>
      ${zap && C.length ? `<details class="ev-msg"><summary>✏️ Mensagem do lembrete</summary><textarea id="evMsg" rows="4">${esc(a.lembrete || LEMBRETE_PADRAO)}</textarea>
        <p class="hint" style="margin:4px 0">Troca sozinho: {nome} {evento} {quando} {local} {endereco}</p><div class="actions"><button class="btn sm" type="button" id="evMsgPadrao">Voltar ao padrão</button><button class="btn sm primary" type="button" id="evMsgSalvar">Salvar mensagem</button></div></details>` : ""}
      ${C.length ? `<div class="list">${C.map((x, i) => `<div class="li"><span class="grow"><b>${esc(x.nome)}</b> ${x.leg === false ? `<span class="chip wait">ainda não é legendário</span>` : `<span class="hint">${esc(x.equipe || "")}${x.num ? " · nº " + esc(x.num) : ""}</span>`}${x.igreja || x.info ? `<small class="hint" style="display:block">${esc([x.igreja, x.info].filter(Boolean).join(" · "))}</small>` : ""}</span>${zap ? (waNumber(x.tel) ? `<button class="btn sm ${(a.lembrados || {})[confKey(x)] ? "" : "primary"}" type="button" data-ev-zap="${i}">${ico("wa")} ${(a.lembrados || {})[confKey(x)] ? "Enviado ✓" : "WhatsApp"}</button>` : `<span class="hint">sem telefone</span>`) : ""}</div>`).join("")}</div>` : `<div class="empty">Ninguém confirmou ainda. Mande o link no grupo.</div>`}</section>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal());
  $("#acCopiar").onclick = () => copiarTexto(l, "Link copiado");
  $("#acPdf").onclick = () => acaoPdf(a).catch(e => toast("Não consegui gerar o PDF. " + (e.message || "")));
  const xl = $("#acXls"); if (xl) xl.onclick = () => acaoXlsx(a);
  const tpl = () => ($("#evMsg") || {}).value || a.lembrete || LEMBRETE_PADRAO;
  const ms = $("#evMsgSalvar"); if (ms) ms.onclick = () => { a.lembrete = tpl().trim(); api.set("config", a.doc, { lista: (((S.cfgDocs || {})[a.doc] || {}).lista || []).map(y => y.id === a.id ? { ...y, lembrete: a.lembrete } : y) }).then(() => toast("Mensagem salva para este evento")).catch(e => toast("Não foi possível salvar. " + erroAmigavel(e))); };
  const mp = $("#evMsgPadrao"); if (mp) mp.onclick = () => { $("#evMsg").value = LEMBRETE_PADRAO; };
  document.querySelectorAll("[data-ev-zap]").forEach(b => b.onclick = () => { const x = C[+b.dataset.evZap];
    window.open(`https://wa.me/${waNumber(x.tel)}?text=${encodeURIComponent(lembreteTxt(tpl(), a, x))}`, "_blank", "noopener");
    b.classList.remove("primary"); b.innerHTML = `${ico("wa")} Enviado ✓`; a.lembrados = { ...(a.lembrados || {}), [confKey(x)]: new Date().toISOString() };
    api.set("config", a.doc, { lista: (((S.cfgDocs || {})[a.doc] || {}).lista || []).map(y => y.id === a.id ? { ...y, lembrados: a.lembrados } : y) }).catch(() => {}); });
  const fo = $("#evForam"); if (fo) fo.onclick = () => { const foram = [...document.querySelectorAll(".ev-foi:checked")].map(i => i.value), extra = Math.max(0, +$("#evExtra").value || 0);
    closeModal(); acaoSalvar(a.doc, { ...a, foram, foramExtra: extra, foramEm: new Date().toISOString(), foramPor: ME.adm || "" }, `${foram.length + extra} presença(s) marcada(s)`); };
  document.querySelectorAll("[data-ev-copia]").forEach(b => b.onclick = () => copiarTexto(acaoLink(a, R[+b.dataset.evCopia]), "Link da equipe copiado"));
  const pl = $("#acPlano"); if (pl) pl.onclick = () => acaoPlanoPdf(a).catch(e => toast("Não consegui gerar o PDF. " + (e.message || "")));
  const ed = $("#acEd"); if (ed) ed.onclick = () => { closeModal(); acaoForm(a); };
}
/* Agenda: eventos de divulgação + os TOPs, por mês. Toque no evento: quantos vão, quem vai e o link de presença. */
function agTops() { const p = topPrev(); return [...(S.tops.length ? S.tops : [topDoc()].filter(Boolean)).filter(t => t.inicio), ...(p ? [{ ...p, id: "previsto" }] : [])]; }
function vAgenda() {
  const hoje = hojeISO(), M = [];
  acoesTodas().forEach(a => M.push({ k: "ev", data: a.data, fim: a.data, a }));
  agTops().forEach(t => M.push({ k: "top", data: t.inicio, fim: t.fim || t.inicio, t }));
  const GR = grupos();
  quadro().filter(t => t.prazo && (t.pegou || podeEditar())).forEach(t => M.push({ k: "tar", data: t.prazo, fim: t.feito ? t.prazo : (t.prazo < hoje ? hoje : t.prazo), t }));
  M.sort((x, y) => String(x.data + (x.a ? x.a.hora : "")).localeCompare(String(y.data + (y.a ? y.a.hora : ""))));
  const prox = M.filter(x => x.fim >= hoje), pass = M.filter(x => x.fim < hoje).reverse(), L = S.agPass ? pass : prox;
  const mes = d => { const t = new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" }); return t[0].toUpperCase() + t.slice(1); };
  const dia = d => { const x = new Date(d + "T12:00:00"); return `<span class="acao-d"><b class="num">${String(x.getDate()).padStart(2, "0")}</b><small>${x.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</small></span>`; };
  const card = x => {
    if (x.k === "top") { const t = x.t, atual = t.id === curTopId(), n = atual ? S.P.filter(p => p.tipo !== "legendario" && !cancelado(p)).length : null;
      return `<button class="acao-c ag-top" type="button" data-ag-top="${esc(t.id)}">${dia(t.inicio)}<span class="grow"><b>${esc(t.nome)} <span class="chip acc">TOP</span>${t.id === "previsto" ? ` <span class="chip ${t.confirmado ? "ok" : "wait"}">${t.confirmado ? "data confirmada" : "data prevista"}</span>` : ""}</b><small class="hint">${esc(fmtPeriodo(t))}${t.local ? " · " + esc(t.local) : ""}</small></span>${n != null ? `<span class="chip ok">${n} inscritos</span>` : ""}</button>`; }
    if (x.k === "tar") { const t = x.t, g = GR.find(y => y.id === (t.pegou || {}).grupo), m = MISSOES[t.missao] || MISSOES.outro, venc = !t.feito && t.prazo < hoje, minha = g && meuGrupo() && g.id === meuGrupo().id;
      return `<button class="acao-c ag-tar ${minha ? "minha" : ""} ${t.feito ? "feito" : ""}" type="button" data-meta-tar="1">${dia(t.prazo)}<span class="grow"><b>${esc(t.titulo)} <span class="chip ${t.feito ? "ok" : venc ? "bad" : "wait"}">${t.feito ? "feita" : venc ? "atrasada" : "tarefa"}</span></b><small class="hint"><span class="tag ${m[1]}">${m[0]}</span> prazo · ${g ? esc(g.nome) : "sem grupo"}${t.resp ? " · com " + esc(t.resp.split(" ")[0]) : ""}</small></span></button>`; }
    const a = x.a, c = acaoConfirmados(a).length;
    return `<button class="acao-c ${acaoTemEq(a, ME.equipeLgnd) ? "minha" : ""}" type="button" data-acao-ver="${esc(a.doc)}|${esc(a.id)}">${dia(a.data)}
      <span class="grow"><b>${esc(a.titulo)}</b><small class="hint">${acaoTag(a)} ${esc(acaoEquipeTxt(a))}${a.hora ? " · " + esc(a.hora) : ""}${a.local ? " · " + esc(a.local) : ""}</small></span>
      ${a.data < hoje ? (a.foram ? `<span class="chip ok">${acaoPresentes(a)} foram</span>` : podeEditar() || a.por === ME.adm ? `<span class="chip wait">marcar quem foi</span>` : `<span class="chip">${c} confirmaram</span>`)
        : `<span class="chip ${a.vagas && c >= a.vagas ? "ok" : ""}">${c}${a.vagas ? "/" + a.vagas : ""} vão</span>`}</button>`; };
  const meses = []; L.forEach(x => { const m = mes(x.data), g = meses[meses.length - 1]; if (g && g.m === m) g.l.push(x); else meses.push({ m, l: [x] }); });
  const nEv = prox.filter(x => x.k === "ev").length, nVao = prox.filter(x => x.k === "ev").reduce((s, x) => s + acaoConfirmados(x.a).length, 0);
  return `<div class="head"><div><h2>Agenda</h2><p>Eventos para levar o Legendários a mais homens, e o TOP. Toque num evento para ver quem vai e mandar o link.</p></div>
      <div class="actions">${podeIndicar() ? `<button class="btn primary" type="button" data-acao-novo="1">${ico("plus")} Novo evento</button>` : ""}<button class="btn" type="button" data-pdf-ag="1">${ico("upload")} Agenda em PDF</button>${podeTops() && !topPrev() ? `<button class="btn" type="button" data-prev-ed="1">${ico("clock")} Planejar próximo TOP</button>` : ""}</div></div>
    <div class="kpis ag-kpis"><div class="kpi"><span class="lbl">Próximos eventos</span><span class="val num">${nEv}</span></div><div class="kpi"><span class="lbl">Legendários confirmados</span><span class="val num">${nVao}</span><span class="sub">nos próximos eventos</span></div></div>
    <div class="seg" role="tablist"><button type="button" ${S.agPass ? 'data-ag-pass="1"' : ""} aria-pressed="${!S.agPass}">Próximos <small>${prox.length}</small></button><button type="button" ${S.agPass ? "" : 'data-ag-pass="1"'} aria-pressed="${!!S.agPass}">Já aconteceram <small>${pass.length}</small></button></div>
    ${meses.length ? meses.map(g => `<section class="panel"><h3>${esc(g.m)} <small>${g.l.length}</small></h3><div class="acao-lista">${g.l.map(card).join("")}</div></section>`).join("")
      : `<section class="panel"><div class="empty">${S.agPass ? "Nenhum evento passado ainda." : "Nada marcado. Toque em Novo evento para colocar a primeira ida a uma igreja."}</div></section>`}`;
}
/* Próximo TOP planejado (data prevista ou confirmada), sem fechar o TOP atual: config top-previsto {nome,inicio,fim,local,confirmado,vagas,por,em} */
const topPrev = () => { const p = cfgDe("top-previsto"); return p && p.inicio ? p : null; };
function prevForm() {
  if (!podeTops()) { toast("Só quem cuida dos TOPs marca a data."); return; }
  const p = topPrev() || { local: "Franca - SP", vagas: 150 };
  modal(`<h3>Próximo TOP</h3><p class="hint" style="margin:0">Não fecha o ${esc(topName())}. Se a data ainda não estiver certa, marque como prevista: o app já mostra o plano das 13 semanas e você ajusta depois.</p><div class="form">
    <div class="field full"><label for="pv-n">Nome</label><input id="pv-n" name="nome" value="${esc(p.nome || "")}" placeholder="ex.: TOP 1950" required></div>
    <div class="field"><label for="pv-i">Início</label><input id="pv-i" name="inicio" type="date" value="${esc(p.inicio || "")}" required></div>
    <div class="field"><label for="pv-f">Fim</label><input id="pv-f" name="fim" type="date" value="${esc(p.fim || "")}"></div>
    <div class="field"><label for="pv-l">Local</label><input id="pv-l" name="local" value="${esc(p.local || "")}"></div>
    <div class="field"><label for="pv-v">Vagas</label><input id="pv-v" name="vagas" type="number" min="1" value="${esc(p.vagas || 150)}"></div>
    <div class="field full"><div class="checks"><label><input type="radio" name="conf" value="0" ${p.confirmado ? "" : "checked"}> Data prevista (pode mudar)</label><label><input type="radio" name="conf" value="1" ${p.confirmado ? "checked" : ""}> Data confirmada</label></div></div>
  </div><div class="modal-foot"><div>${topPrev() ? `<button class="btn danger" type="button" id="delBtn">Apagar</button>` : ""}</div>
    <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const nome = String(fd.get("nome") || "").trim(), inicio = String(fd.get("inicio") || ""); if (!nome || !inicio) { toast("Coloque o nome e o dia de início."); return; }
    let fim = String(fd.get("fim") || ""); if (!fim || fim < inicio || (new Date(fim) - new Date(inicio)) > 7 * 864e5) fim = new Date(new Date(inicio + "T12:00:00").getTime() + 3 * 864e5).toLocaleDateString("sv");   // TOP dura 4 dias
    const d = { nome, inicio, fim, local: String(fd.get("local") || "").trim(), vagas: +fd.get("vagas") || 150, confirmado: fd.get("conf") === "1", por: ME.adm || "", em: new Date().toISOString() };
    closeModal(); save(() => api.set("config", "top-previsto", d), d.confirmado ? "Data confirmada" : "Data prevista salva").then(() => prevVer()); });
  const del = $("#delBtn"); if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar"; return; } closeModal(); save(() => api.set("config", "top-previsto", {}), "Planejamento apagado"); };
}
// o plano das 13 semanas a partir de uma data: o que cada semana pede, com as datas de verdade
function prevPlano(p) {
  const fimD = new Date(p.inicio + "T00:00:00"), meta = Math.round((+p.vagas || 150) * 1.1), e = x => Math.round(x * meta / 165), hoje = new Date(), f = d => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const tops = topDoc(), fimAtual = tops && (tops.fim || tops.inicio) ? new Date((tops.fim || tops.inicio) + "T23:59:00") : null;
  return Array.from({ length: 14 }, (_, i) => -13 + i).map(w => { const ini = new Date(+fimD + w * 7 * 864e5), fim = new Date(+ini + 6 * 864e5);
    const ck = META_CHECK.find(c => -c[0] === w), tar = TAR_PDF.filter(x => x[1] === w).map(x => `${x[0]}: ${x[2]}`), cont = TAR_CONT.filter(x => x[0] === w).map(x => `Conteúdo (${x[1]}): ${x[2]}`);
    const extra = [w === -13 ? "Começa logo depois do TOP anterior: testemunhos, agradecimento e 3 nomes de cada novo legendário" : "", w >= -9 && w <= -3 ? "Panfletagem: 1 saída da Equipe 1 e 1 da Equipe 2" : "", w === 0 ? "TOP" : ""].filter(Boolean);
    return { w, ini, txt: `${f(ini)} a ${f(fim)}`, meta: w === 0 ? meta : e(META_CURVA[w + 13]), ck: ck ? e(ck[1]) : null, itens: [...extra, ...tar, ...cont], passou: fim < hoje, choca: fimAtual && ini < fimAtual }; });
}
function prevVer() {
  const p = topPrev(); if (!p) { prevForm(); return; }
  const P = prevPlano(p), meta = Math.round((+p.vagas || 150) * 1.1), hoje = new Date(), atrasadas = P.filter(x => x.passou && x.w < 0).length, choca = P.filter(x => x.choca).length;
  const dias = Math.ceil((new Date(p.inicio + "T00:00:00") - hoje) / 864e5), sem13 = P[0];
  modal(`<h3>${esc(p.nome)} <span class="chip ${p.confirmado ? "ok" : "wait"}">${p.confirmado ? "data confirmada" : "data prevista"}</span></h3>
    <p class="hint" style="margin:0">${esc(fmtPeriodo(p))}${p.local ? " · " + esc(p.local) : ""} · faltam ${dias} dias · meta de ${meta} inscritos (${p.vagas} vagas + 10%)</p>
    ${atrasadas ? `<p class="chk-alerta">Se for nesta data, ${atrasadas} semana(s) do plano já passaram (a semana -13 foi em ${sem13.txt.split(" a ")[0]}). Comece pelas tarefas dessas semanas e corra com as indicações.</p>`
      : choca ? `<p class="chk-alerta">As primeiras ${choca} semana(s) caem antes do fim do ${esc(topName())}. Dá para começar a pedir nomes já durante este TOP.</p>`
      : `<p class="hint">Se for nesta data, a semana -13 começa em <b>${sem13.txt.split(" a ")[0]}</b>. Até lá, deixe o TOP atual terminar e crie o novo na página Tops.</p>`}
    <div class="list prev-plano">${P.map(x => `<div class="li ${x.passou ? "passou" : ""}"><div class="prev-w"><b class="num">${x.w}</b><small>${x.txt}</small></div><div class="grow">
      <small class="hint">Meta acumulada: ${x.meta} inscritos${x.ck ? ` · <b>checkpoint: mínimo ${x.ck}</b>` : ""}</small>${x.itens.length ? `<ul>${x.itens.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}</div></div>`).join("")}</div>
    <div class="modal-foot"><span></span><div class="actions">${podeTops() ? `<button class="btn ghost" type="button" id="pvEd">${ico("edit")} Mudar data</button>` : ""}<button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal());
  const e = $("#pvEd"); if (e) e.onclick = () => { closeModal(); prevForm(); };
}
function fmtPeriodo(t) { const f = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", ""); return t.fim && t.fim !== t.inicio ? `${f(t.inicio)} a ${f(t.fim)}` : f(t.inicio); }
function agTopVer(t) {
  const atual = t.id === curTopId(), P = atual ? S.P.filter(p => !cancelado(p)) : [], sen = P.filter(p => p.tipo !== "legendario").length, leg = P.filter(p => p.tipo === "legendario").length;
  const D = atual && META() ? metaDados() : null, l = t.linkInsc || "", msg = `*${t.nome}*\n${fmtPeriodo(t)}${t.local ? " · " + t.local : ""}\n\nVem viver o TOP do Legendários! Inscrição: ${l}`;
  modal(`<h3>${esc(t.nome)}</h3><p class="hint" style="margin:0">${esc(fmtPeriodo(t))}${t.local ? " · " + esc(t.local) : ""}</p>
    ${atual ? `<div class="kpis ag-kpis"><div class="kpi"><span class="lbl">Senderistas inscritos</span><span class="val num">${sen}</span>${D ? `<span class="sub">meta: ${D.meta}</span>` : ""}</div><div class="kpi"><span class="lbl">Legendários servindo</span><span class="val num">${leg}</span></div></div>` : `<p class="hint">Os números aparecem quando este TOP estiver aberto no app.</p>`}
    ${l ? `<div class="actions" style="flex-wrap:wrap"><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ico("wa")} Mandar link de inscrição</a><button class="btn" type="button" id="agCopiar">Copiar link</button></div>`
      : `<p class="hint">${podeTops() ? "Coloque o link de inscrição em Editar TOP para mandar daqui." : "O link de inscrição ainda não foi colocado no app."}</p>`}
    <div class="modal-foot"><span></span><div class="actions">${podeTops() && S.tops.length ? `<button class="btn ghost" type="button" id="agEd">${ico("edit")} Editar TOP</button>` : ""}${atual && canSee(VIEWS.find(v => v.id === "participantes")) ? `<button class="btn ghost" type="button" data-go="participantes">Ver inscritos</button>` : ""}<button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal());
  const c = $("#agCopiar"); if (c) c.onclick = () => copiarTexto(l, "Link copiado");
  const e = $("#agEd"); if (e) e.onclick = () => { closeModal(); topForm(t); };
}
/* Frentes (Estratégia 150): os blocos que unem equipes numa missão. As tarefas são as mesmas da lista, agrupadas por frente. */
const FRENTES = [
  { k: "esp", l: "Espiritual", eq: ["Diretoria", "Intercessão"], m: "Cobertura em oração e abertura das igrejas" },
  { k: "adm", l: "Administrativo", eq: ["ADM"], m: "Funil, inscrições, pagamentos, contato em 48 h e placar da segunda" },
  { k: "op", l: "Operacional", eq: ["Logística", "Produção"], m: "Vagas, caronas, mesas de inscrição, banners e panfletos" },
  { k: "com", l: "Comercial", eq: ["Segurança", "Hakunas", "Voz", "Eventos"], sub: "Equipe 1: Segurança e Hakunas · Equipe 2: Voz e Eventos", m: "Rua, igrejas e pré-TOP; tirar dúvidas e virar interesse em inscrição" },
  { k: "mkt", l: "Marketing", eq: ["Mídia"], m: "Redes sociais, vídeos e a arte de tudo" },
  { k: "apoio", l: "Apoio", eq: ["Esposas"], m: "Esposas de legendários cuidam das famílias; coordenadores cobram os 5 nomes por servidor" }];
/* PDFs da Meta: fundo azul-marinho com a montanha, faixa laranja e rodapé em todas as páginas */
async function pdfBase(titulo, sub) {
  const jsPDF = await carregarPdf(), C = PDF_COR, [logo, fundo] = await Promise.all([imagemDataUrl("assets/logo.png"), imagemDataUrl("assets/bg.jpg")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" }), W = 210, H = 297;
  const fundoPag = primeira => {
    doc.setFillColor(...C.NAVY); doc.rect(0, 0, W, H, "F");
    if (fundo) try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: primeira ? 0.42 : 0.16 })); doc.addImage(fundo, "JPEG", -40, primeira ? 0 : -60, 290, 150, "fundo", "FAST"); doc.restoreGraphicsState(); } catch (e) {}
    doc.setFillColor(...C.LARANJA); doc.rect(0, 0, W, 2.2, "F");
    doc.setDrawColor(255, 122, 26); doc.setLineWidth(0.25); doc.line(14, H - 16, W - 14, H - 16);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(150, 140, 130);
    doc.text(`Legendários Base 3 Colinas · ${topName()}`, 14, H - 10); doc.text(`Página ${doc.getNumberOfPages()}`, W - 14, H - 10, { align: "right" }); };
  fundoPag(true);
  if (logo) try { doc.addImage(logo, "PNG", 14, 14, 22, 27.8, "logo"); } catch (e) {}
  doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.text("LEGENDÁRIOS BASE 3 COLINAS", 42, 22, { charSpace: 0.8 });
  doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.text(titulo, 42, 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(225, 214, 202); doc.text(doc.splitTextToSize(sub, W - 56), 42, 39);
  const ctx = { doc, C, W, H, y: 56 };
  ctx.cabe = h => { if (ctx.y + h > H - 22) { doc.addPage(); fundoPag(false); ctx.y = 16; return false; } return true; };
  return ctx;
}
async function agendaPdf() {
  const hoje = hojeISO(), M = [];
  acoesTodas().filter(a => a.data >= hoje).forEach(a => M.push({ data: a.data, a }));
  agTops().filter(t => (t.fim || t.inicio) >= hoje).forEach(t => M.push({ data: t.inicio, t }));
  M.sort((x, y) => String(x.data + (x.a ? x.a.hora : "")).localeCompare(String(y.data + (y.a ? y.a.hora : ""))));
  const X = await pdfBase("Agenda", `Próximos eventos para levar o Legendários a mais homens · ${M.length} na agenda · atualizada em ${new Date().toLocaleDateString("pt-BR")}`), { doc, C, W } = X;
  if (!M.length) { doc.setTextColor(220, 210, 200); doc.setFontSize(12); doc.text("Nenhum evento marcado ainda.", W / 2, X.y + 20, { align: "center" }); }
  let mesAt = "";
  M.forEach(x => {
    const d = new Date(x.data + "T12:00:00"), mes = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase();
    if (mes !== mesAt) { X.cabe(40); mesAt = mes; doc.setTextColor(...C.LARANJA); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(mes, 14, X.y + 5, { charSpace: 1 });
      doc.setDrawColor(...C.LARANJA); doc.setLineWidth(0.3); doc.line(14 + doc.getTextWidth(mes) + 1 + mes.length * 1 + 4, X.y + 3.6, W - 14, X.y + 3.6); X.y += 11; }
    const top = !!x.t, a = x.a || {}, titulo = top ? x.t.nome + (x.t.id === "previsto" ? (x.t.confirmado ? " · data confirmada" : " · data prevista") : "") : a.titulo;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); const tl = doc.splitTextToSize(titulo, W - 70);
    const linhas = top ? [`${fmtPeriodo(x.t)}${x.t.local ? " · " + x.t.local : ""}`, x.t.linkInsc ? "Inscrições abertas: toque para se inscrever" : ""] :
      [`${acaoObj(a).tag} · ${acaoEquipeTxt(a)}`, `${a.hora ? a.hora + " · " : ""}${[a.local, a.endereco].filter(Boolean).join(" · ") || "local a definir"}`, a.obs || ""];
    const L = linhas.filter(Boolean), h = Math.max(26, 8 + tl.length * 5.4 + L.length * 4.6 + (top ? 2 : 8));
    X.cabe(h + 4);
    if (top) { doc.setFillColor(...C.LARANJA); doc.roundedRect(14, X.y, W - 28, h, 3, 3, "F"); } else { doc.setFillColor(24, 32, 43); doc.roundedRect(14, X.y, W - 28, h, 3, 3, "F"); doc.setFillColor(...C.LARANJA); doc.rect(14, X.y + 4, 1.4, h - 8, "F"); }
    const tx = top ? [26, 12, 0] : [255, 255, 255], sb = top ? [70, 35, 10] : [190, 180, 170];
    doc.setTextColor(...tx); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text(String(d.getDate()).padStart(2, "0"), 30, X.y + 12, { align: "center" });
    doc.setFontSize(8); doc.text(d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase(), 30, X.y + 17, { align: "center" });
    doc.setDrawColor(...(top ? [200, 90, 10] : [60, 70, 85])); doc.setLineWidth(0.3); doc.line(42, X.y + 5, 42, X.y + h - 5);
    let yy = X.y + 8; doc.setFontSize(12.5); doc.setTextColor(...tx); doc.text(tl, 47, yy); yy += tl.length * 5.4;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...sb); L.forEach(l => { doc.text(doc.splitTextToSize(l, W - 66)[0], 47, yy); yy += 4.6; });
    if (top && x.t.linkInsc) doc.link(14, X.y, W - 28, h, { url: x.t.linkInsc });
    if (!top && a.token) { const c = acaoConfirmados(a).length; doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); const lab = "CONFIRMAR PRESENÇA", lw = doc.getTextWidth(lab) + 8;
      doc.setFillColor(...C.LARANJA); doc.roundedRect(47, yy - 1.6, lw, 6, 3, 3, "F"); doc.setTextColor(26, 12, 0); doc.text(lab, 47 + lw / 2, yy + 2.6, { align: "center" }); doc.link(47, yy - 1.6, lw, 6, { url: acaoLink(a) });
      doc.setTextColor(...sb); doc.setFont("helvetica", "normal"); doc.text(`${c}${a.vagas ? " de " + a.vagas : ""} legendário(s) confirmado(s)`, 47 + lw + 4, yy + 2.6); }
    X.y += h + 4; });
  await entregarPdf(doc.output("blob"), `Agenda Legendarios 3 Colinas.pdf`, "Agenda · Legendários 3 Colinas", true);
}
/* ===== Equipes trabalhando juntas (no app real desde 02/11/2026) =====
   Grupos: a ADM junta ou separa as equipes LGND (config meta-grupos {lista:[{id,nome,equipes,missao}]}; sem nada salvo, começa pelas frentes do PDF).
   Tarefas: a ADM cria e manda para um grupo; o coordenador escolhe quem faz e marca feito.
   config metatar-<top>-quadro {lista:[{id,titulo,missao:captar|cuidar|outro,prazo,obs,para,pegou:{grupo,por,em},resp,feito,feitoEm,feitoPor,por,em}]} */
const MISSOES = { captar: ["Trazer senderistas", "ev-captar"], cuidar: ["Cuidar dos legendários", "ev-cuidar"], outro: ["Outra", ""] };
const grupos = () => { const g = (cfgDe("meta-grupos") || {}).lista; return g && g.length ? g : FRENTES.map(f => ({ id: f.k, nome: f.l, equipes: f.eq, missao: f.m })); };
const grupoDe = eq => grupos().find(g => (g.equipes || []).includes(eq));
const meuGrupo = () => ehCoordEq() ? grupoDe(ME.equipeLgnd) : null;
const quadroId = () => "metatar-" + curTopId() + "-quadro";
const quadro = () => ((cfgDe(quadroId()) || {}).lista || []).slice().sort((a, b) => (!!a.feito - !!b.feito) || String(a.prazo || "9").localeCompare(String(b.prazo || "9")));
const quadroLivres = () => { const g = meuGrupo(); return ehCoordEq() ? (g ? quadro().filter(t => !t.feito && (t.pegou || {}).grupo === g.id).length : 0) : quadro().filter(t => !t.feito && !t.pegou).length; };
const podeGrupo = gid => podeEditar() || (ehCoordEq() && (meuGrupo() || {}).id === gid);
function quadroSalvar(lista, msg, avisar) {
  (async () => { try { await api.set("config", quadroId(), { lista, ...(avisar ? { avisar } : {}) }); if (msg) toast(msg); } catch (e) { toast("Não foi possível salvar. " + erroAmigavel(e)); } render(); })();
}
const quadroAviso = (g, t) => { const G = grupos().find(x => x.id === g); return G ? { grupo: G.nome, equipes: G.equipes || [], titulo: t.titulo, prazo: t.prazo || "", em: new Date().toISOString() } : null; };
function quadroMarcar(id, op, val) {
  const L = quadro(), t = L.find(x => x.id === id); if (!t) return;
  const g = op === "pegar" ? (val || (meuGrupo() || {}).id) : (t.pegou || {}).grupo;
  if (!g || !podeGrupo(g) || (op === "pegar" && !podeEditar())) { toast("Só a ADM ou o coordenador do grupo mexem nesta tarefa."); return; }
  const agora = new Date().toISOString(), nome = (grupos().find(x => x.id === g) || {}).nome || "";
  const n = op === "pegar" ? { ...t, ...(ehCoordEq() ? {} : { para: g }), pegou: { grupo: g, por: ME.adm || "", em: agora } } : op === "devolver" ? { ...t, pegou: null, resp: "", feito: false }
    : op === "resp" ? { ...t, resp: val } : { ...t, feito: !t.feito, feitoEm: t.feito ? "" : agora, feitoPor: t.feito ? "" : ME.adm || "" };
  quadroSalvar(L.map(x => x.id === id ? n : x), op === "pegar" ? `Tarefa com ${nome} 💪` : op === "devolver" ? "Tarefa voltou para as livres" : op === "feito" ? (n.feito ? "Feito! 🙌" : "Desmarcada") : "", op === "pegar" && !ehCoordEq() ? quadroAviso(g, t) : null);
}
function quadroForm(id) {
  if (!podeEditar()) { toast("Quem cria as tarefas é a ADM."); return; }
  const t = quadro().find(x => x.id === id) || { missao: "captar" }, G = grupos();
  modal(`<h3>${id ? "Editar tarefa" : "Nova tarefa"}</h3><div class="form">
    <div class="field full"><label for="q-t">O que fazer</label><input id="q-t" name="titulo" value="${esc(t.titulo || "")}" placeholder="ex.: Visitar 2 igrejas e apresentar o TOP" required></div>
    <div class="field"><label for="q-m">Missão</label><select id="q-m" name="missao" class="sel">${Object.entries(MISSOES).map(([k, [l]]) => `<option value="${k}" ${t.missao === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="field"><label for="q-p">Até quando</label><input id="q-p" name="prazo" type="date" value="${esc(t.prazo || "")}"></div>
    <div class="field full"><label for="q-g">Para quem</label><select id="q-g" name="para" class="sel"><option value="">Sem grupo por enquanto (só você vê)</option>${G.map(g => `<option value="${esc(g.id)}" ${t.para === g.id ? "selected" : ""}>Mandar para ${esc(g.nome)} (${esc((g.equipes || []).join(", "))})</option>`).join("")}</select></div>
    <div class="field full"><label for="q-o">Detalhes (opcional)</label><input id="q-o" name="obs" value="${esc(t.obs || "")}"></div>
  </div><div class="modal-foot"><div>${id ? `<button class="btn danger" type="button" id="delBtn">Excluir</button>` : ""}</div>
    <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const titulo = String(fd.get("titulo") || "").trim(); if (!titulo) return; const para = String(fd.get("para") || "");
    const n = { ...t, id: t.id || "q" + Date.now().toString(36), titulo, missao: fd.get("missao"), prazo: String(fd.get("prazo") || ""), para, obs: String(fd.get("obs") || "").trim(), por: t.por || ME.adm || "", em: t.em || new Date().toISOString() };
    const novoG = para && (!t.pegou || t.pegou.grupo !== para);
    if (novoG) n.pegou = { grupo: para, por: ME.adm || "", em: new Date().toISOString() };   // tarefa direcionada já nasce com o grupo
    else if (!para && t.pegou) n.pegou = null;
    closeModal(); const L = quadro(); quadroSalvar(id ? L.map(x => x.id === id ? n : x) : [...L, n], id ? "Tarefa salva" : "Tarefa no quadro", novoG ? quadroAviso(para, n) : null); });
  const del = $("#delBtn"); if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar exclusão"; return; } closeModal(); quadroSalvar(quadro().filter(x => x.id !== id), "Tarefa excluída"); };
}
function grupoForm(id) {
  if (!podeEditar()) return;
  const G = grupos(), g = G.find(x => x.id === id) || { equipes: [] }, usadas = new Set(G.filter(x => x.id !== g.id).flatMap(x => x.equipes || []));
  const todas = [...new Set([...equipesUsadas(), "Diretoria", "Esposas"])];
  modal(`<h3>${id ? "Editar grupo" : "Novo grupo"}</h3><p class="hint" style="margin:0">Junte as equipes que vão trabalhar juntas. Cada equipe fica em um grupo só.</p><div class="form">
    <div class="field full"><label for="g-n">Nome do grupo</label><input id="g-n" name="nome" value="${esc(g.nome || "")}" placeholder="ex.: Comercial 1" required></div>
    <div class="field full"><span class="lab">Equipes</span><div class="checks">${todas.map(e => `<label><input type="checkbox" name="eq" value="${esc(e)}" ${(g.equipes || []).includes(e) ? "checked" : ""}> ${esc(e)}${usadas.has(e) ? ` <small class="hint">(está em ${esc((G.find(x => (x.equipes || []).includes(e)) || {}).nome || "")})</small>` : ""}</label>`).join("")}</div></div>
    <div class="field full"><label for="g-m">Missão do grupo (opcional)</label><input id="g-m" name="missao" value="${esc(g.missao || "")}"></div>
  </div><div class="modal-foot"><div>${id ? `<button class="btn danger" type="button" id="delBtn">Desfazer grupo</button>` : ""}</div>
    <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const nome = String(fd.get("nome") || "").trim(), eqs = fd.getAll("eq").map(String); if (!nome || !eqs.length) { toast("Dê um nome e marque pelo menos uma equipe."); return; }
    const n = { id: g.id || "g" + Date.now().toString(36), nome, equipes: eqs, missao: String(fd.get("missao") || "").trim() };
    const L = G.filter(x => x.id !== n.id).map(x => ({ ...x, equipes: (x.equipes || []).filter(e => !eqs.includes(e)) })).filter(x => x.equipes.length);   // equipe sai do grupo antigo
    closeModal(); save(() => api.set("config", "meta-grupos", { lista: id ? G.map(x => x.id === n.id ? n : L.find(y => y.id === x.id)).filter(Boolean) : [...L, n] }), "Grupos salvos").then(render); });
  const del = $("#delBtn"); if (del) del.onclick = () => { if (del.dataset.ok !== "1") { del.dataset.ok = "1"; del.textContent = "Confirmar"; return; } closeModal(); save(() => api.set("config", "meta-grupos", { lista: G.filter(x => x.id !== id) }), "Grupo desfeito").then(render); };
}
function grupoNumeros(g, D) {
  const eqs = g.equipes || [], I = indTodas().filter(x => eqs.includes(x.equipe)), E = metaEquipes(D).filter(e => eqs.includes(e.e)), A = acoesTodas().filter(a => eqs.some(e => acaoTemEq(a, e))), hoje = hojeISO();
  const cuidar = A.filter(a => acaoCuidar(a) && a.data < hoje), T = quadro().filter(t => (t.pegou || {}).grupo === g.id);
  return { nomes: I.length, metaNomes: E.reduce((s, e) => s + e.metaNomes, 0), insc: I.filter(indInscrito).length, metaInsc: E.reduce((s, e) => s + e.metaInsc, 0),
    encontros: cuidar.length, presentes: cuidar.reduce((s, a) => s + (a.foram ? acaoPresentes(a) : acaoConfirmados(a).length), 0), prox: A.filter(a => a.data >= hoje), T, servidores: S.P.filter(p => p.tipo === "legendario" && eqs.includes(p.equipe)).length };
}
function grupoCard(g, D, aberto) {
  const N = grupoNumeros(g, D), pode = podeGrupo(g.id), pend = N.T.filter(t => !t.feito), temLink = !!(cfgDe(indCfgId()) || {}).token;
  const bar = (n, m) => `<div class="bar good"><i style="width:${pct(n, m || 1)}%"></i></div>`;
  return `<section class="panel grp ${aberto ? "meu" : ""}"><div class="grp-cab"><div class="grow"><b class="grp-n">${esc(g.nome)}</b><small class="hint">${esc((g.equipes || []).join(" · "))} · ${N.servidores} legendário(s)</small>${g.missao ? `<small>${esc(g.missao)}</small>` : ""}</div>
      ${podeEditar() ? `<button class="linkbtn" type="button" data-grp-ed="${esc(g.id)}" aria-label="Editar grupo">${ico("edit")}</button>` : ""}</div>
    <div class="grp-mis">
      <div class="grp-box"><span class="tag ev-captar">Trazer senderistas</span>
        <div class="grp-num"><b class="num">${N.nomes}</b><small>nomes indicados${N.metaNomes ? ` de ${N.metaNomes}` : ""}</small></div>${N.metaNomes ? bar(N.nomes, N.metaNomes) : ""}
        <div class="grp-num"><b class="num">${N.insc}</b><small>já se inscreveram${N.metaInsc ? ` de ${N.metaInsc}` : ""}</small></div>
        ${aberto ? `<div class="actions">${podeIndicar() ? `<button class="btn sm primary" type="button" data-ind-novo="1">${ico("plus")} Indicar nome</button>` : ""}${temLink ? (g.equipes || []).filter(e => !ehCoordEq() || e === ME.equipeLgnd).map(e => `<button class="btn sm" type="button" data-sala-link="${esc(e)}">${ico("wa")} Link ${esc(e)}</button>`).join("") : ""}</div>` : ""}</div>
      <div class="grp-box"><span class="tag ev-cuidar">Cuidar dos legendários</span>
        <div class="grp-num"><b class="num">${N.encontros}</b><small>encontro(s) feitos</small></div>
        <div class="grp-num"><b class="num">${N.presentes}</b><small>legendários nos encontros</small></div>
        ${aberto && pode ? `<div class="actions"><button class="btn sm" type="button" data-acao-novo="1">${ico("plus")} Novo evento</button></div>` : ""}</div></div>
    ${aberto ? `<h4>Tarefas do grupo <small class="hint">${N.T.filter(t => t.feito).length}/${N.T.length} feitas</small></h4>
      ${pend.length ? `<div class="list">${pend.map(t => quadroLi(t, true)).join("")}</div>` : `<p class="hint">Nenhuma tarefa pendente. ${pode ? `<button class="linkbtn" type="button" data-meta-aba="quadro">Pegar uma no quadro ›</button>` : ""}</p>`}
      <h4>Próximos eventos</h4>${N.prox.length ? `<div class="acao-lista">${N.prox.map(a => `<button class="acao-c" type="button" data-acao-ver="${esc(a.doc)}|${esc(a.id)}"><span class="grow"><b>${esc(a.titulo)}</b><small class="hint">${acaoTag(a)} ${esc(acaoQuando(a))}</small></span><span class="chip">${acaoConfirmados(a).length} vão</span></button>`).join("")}</div>` : `<p class="hint">Nenhum evento marcado.</p>`}`
      : `<div class="actions"><button class="btn sm" type="button" data-sala="${esc(g.id)}">Abrir ›</button>${pend.length ? `<span class="hint">${pend.length} tarefa(s) em andamento</span>` : ""}</div>`}
  </section>`;
}
function vGrupos(D) {
  const G = grupos(), meu = meuGrupo();
  if (ehCoordEq()) return meu ? grupoCard(meu, D, true) : `<section class="panel"><div class="empty">Sua equipe ainda não está em nenhum grupo. Peça para a ADM organizar.</div></section>`;
  const aberto = G.find(g => g.id === S.salaEq);
  return `<div class="actions" style="justify-content:space-between"><p class="hint" style="margin:0">Cada grupo junta equipes com duas missões: trazer senderistas e cuidar dos legendários.</p>
      ${podeEditar() ? `<button class="btn" type="button" data-grp-ed="novo">${ico("plus")} Novo grupo</button>` : ""}</div>
    ${aberto ? `<div class="actions"><button class="btn ghost sm" type="button" data-sala="">${ico("back")} Todos os grupos</button></div>${grupoCard(aberto, D, true)}` : G.map(g => grupoCard(g, D, false)).join("")}`;
}
function quadroLi(t, noGrupo) {
  const G = grupos(), g = G.find(x => x.id === (t.pegou || {}).grupo), m = MISSOES[t.missao] || MISSOES.outro, meu = meuGrupo();
  const venc = t.prazo && !t.feito && t.prazo < hojeISO(), pode = g && podeGrupo(g.id);
  const leg = g ? S.P.filter(p => p.tipo === "legendario" && (g.equipes || []).includes(p.equipe)).sort((a, b) => a.nome.localeCompare(b.nome)) : [];
  const fmt = d => new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const acoes = t.feito ? (pode ? `<button class="btn sm" type="button" data-q-feito="${t.id}">Desfazer</button>` : "")
    : g ? (pode ? `<button class="btn sm primary" type="button" data-q-feito="${t.id}">${ico("check")} Feito</button>${podeEditar() ? `<button class="linkbtn" type="button" data-q-devolver="${t.id}">tirar do grupo</button>` : ""}` : "")
    : podeEditar() ? `<select class="sel sm" aria-label="Mandar para" data-q-dar="${t.id}"><option value="">Mandar para…</option>${G.map(x => `<option value="${esc(x.id)}">${esc(x.nome)}</option>`).join("")}</select>` : "";
  return `<div class="li q-li ${t.feito ? "feito" : venc ? "venc" : ""}"><span class="tar-ck">${t.feito ? ico("check") : ""}</span><div class="grow"><b>${esc(t.titulo)}</b>
      <small class="hint"><span class="tag ${m[1]}">${m[0]}</span>${t.prazo ? ` · até ${fmt(t.prazo)}${venc ? " (venceu)" : ""}` : ""}${!noGrupo && g ? ` · <b>${esc(g.nome)}</b>` : ""}${t.resp ? ` · com ${esc(t.resp.split(" ")[0])}` : ""}${t.obs ? " · " + esc(t.obs) : ""}</small>
      ${g && pode && !t.feito && leg.length ? `<select class="sel sm" data-q-resp="${t.id}" aria-label="Quem faz"><option value="">Quem faz?</option>${leg.map(p => `<option ${t.resp === p.nome ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}</select>` : ""}</div>
    <div class="actions">${acoes}${podeEditar() ? `<button class="linkbtn" type="button" data-q-ed="${t.id}" aria-label="Editar">${ico("edit")}</button>` : ""}</div></div>`;
}
function vQuadro(D) {
  const L = quadro(), meu = meuGrupo(), f = S.qFiltro || (ehCoordEq() ? "andamento" : "livres");
  const livres = ehCoordEq() ? [] : L.filter(t => !t.feito && !t.pegou), andamento = L.filter(t => !t.feito && t.pegou && (!meu || t.pegou.grupo === meu.id)), feitas = L.filter(t => t.feito && (!meu || (t.pegou || {}).grupo === meu.id));
  const lista = { livres, andamento, feitas }[f] || livres;
  return `<div class="actions" style="justify-content:space-between"><p class="hint" style="margin:0">${ehCoordEq() ? "Aqui ficam as tarefas que a ADM passou para a sua equipe. Escolha quem faz e marque quando terminar. As tarefas de todas as equipes aparecem na Agenda, no dia do prazo." : "Crie as tarefas e mande para um grupo: cai na hora no app do coordenador. As livres ficam só com você até escolher o grupo. Todas aparecem na Agenda, no dia do prazo."}</p>
      ${podeEditar() ? `<button class="btn primary" type="button" data-q-novo="1">${ico("plus")} Nova tarefa</button>` : ""}</div>
    <div class="seg" role="tablist">${[...(ehCoordEq() ? [] : [["livres", "Sem grupo", livres.length]]), ["andamento", ehCoordEq() ? "A fazer" : "Com os grupos", andamento.length], ["feitas", "Feitas", feitas.length]].map(([k, l, n]) => `<button type="button" data-q-filtro="${k}" aria-pressed="${f === k}">${l} <small>${n}</small></button>`).join("")}</div>
    <section class="panel">${lista.length ? `<div class="list">${lista.map(t => quadroLi(t)).join("")}</div>` : `<div class="empty">${f === "livres" ? "Nenhuma tarefa sem grupo. Toque em Nova tarefa para colocar a primeira." : f === "andamento" ? (ehCoordEq() ? "Nenhuma tarefa para a sua equipe agora." : "Nenhuma tarefa com os grupos.") : "Nenhuma feita ainda."}</div>`}</section>`;
}
/* Resumo, convidado de evento vira indicação, quem foi de verdade e avisos ao coordenador (app real desde 02/11/2026): convidado de evento vira indicação, quem foi de verdade, avisos ao coordenador */
const hashCurto = t => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); };
const confKey = x => norm(x.nome || "").trim() + "|" + telLimpo(x.tel || "").slice(-8);
const acaoPresentes = a => a.foram ? acaoConfirmados(a).filter(x => a.foram.includes(confKey(x))).length + (+a.foramExtra || 0) : null;
const acaoFaltam = (a, eq) => { const r = acaoResp(a).find(x => x.eq === eq); if (!r || !r.homens) return 0; return Math.max(0, r.homens - acaoConfirmados(a).filter(c => c.equipe === eq).length); };
const diaMais = n => new Date(Date.now() + n * 864e5).toLocaleDateString("sv");
/* Resumo: o que pede atenção agora + as duas missões por grupo */
function metaResumo2(D) {
  const hoje = hojeISO(), ate = diaMais(7), Q = quadro().filter(t => !t.feito), at = Q.filter(t => t.prazo && t.prazo < hoje), sem = Q.filter(t => t.prazo && t.prazo >= hoje && t.prazo <= ate);
  const A = acoesTodas(), prox = A.filter(a => a.data >= hoje && a.data <= ate), marcar = A.filter(a => a.data < hoje && !a.foram && a.data >= diaMais(-30)), G = grupos();
  const nomeG = t => (G.find(g => g.id === (t.pegou || {}).grupo) || {}).nome || "sem grupo";
  const faltam = a => acaoResp(a).reduce((n, x) => n + acaoFaltam(a, x.eq), 0);
  const itens = [
    ...at.map(t => `<button class="acao-c" type="button" data-meta-aba="quadro"><span class="grow"><b>${esc(t.titulo)}</b><small class="hint">${esc(nomeG(t))}</small></span><span class="chip bad">atrasada</span></button>`),
    ...prox.map(a => { const f = faltam(a); return `<button class="acao-c" type="button" data-acao-ver="${esc(a.doc)}|${esc(a.id)}"><span class="grow"><b>${esc(a.titulo)}</b><small class="hint">${acaoTag(a)} ${esc(acaoQuando(a))}</small></span><span class="chip ${f ? "wait" : "ok"}">${f ? `faltam ${f} homens` : "equipes completas"}</span></button>`; }),
    ...marcar.map(a => `<button class="acao-c" type="button" data-acao-ver="${esc(a.doc)}|${esc(a.id)}"><span class="grow"><b>${esc(a.titulo)}</b><small class="hint">já aconteceu · ${esc(acaoQuando(a))}</small></span><span class="chip wait">marcar quem foi</span></button>`),
    ...sem.map(t => `<button class="acao-c" type="button" data-meta-aba="quadro"><span class="grow"><b>${esc(t.titulo)}</b><small class="hint">${esc(nomeG(t))} · até ${new Date(t.prazo + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</small></span><span class="chip">esta semana</span></button>`)];
  return `<section class="panel"><h3>Pede atenção agora <small>${itens.length}</small></h3>${itens.length ? `<div class="acao-lista">${itens.join("")}</div>` : `<div class="empty">Tudo em dia nesta semana. 🙌</div>`}</section>
    <section class="panel"><h3>Grupos <small>as duas missões</small></h3><div class="list">${G.map(g => { const N = grupoNumeros(g, D);
      return `<button class="li" type="button" data-sala="${esc(g.id)}" style="text-align:left;width:100%;background:none;border:0;color:inherit;font:inherit;cursor:pointer"><span class="grow"><b>${esc(g.nome)}</b><small class="hint" style="display:block">${esc((g.equipes || []).join(" · "))}</small></span>
        <span class="chip ev-captar" title="Trazer senderistas">${N.insc}/${N.metaInsc || "-"} inscritos</span> <span class="chip" title="Cuidar dos legendários">${N.encontros} encontro(s) · ${N.presentes}</span></button>`; }).join("")}</div></section>`;
}
/* Dashboard do coordenador: evento em até 2 dias com a equipe dele faltando homens */
function metaFaltamCoord() {
  const eq = ME.equipeLgnd; if (!eq) return "";
  const L = acoesTodas().filter(a => a.data >= hojeISO() && a.data <= diaMais(2) && acaoFaltam(a, eq) > 0); if (!L.length) return "";
  return `<section class="panel q-novas"><h3>${ico("flag")} Faltam homens da ${esc(eq)}</h3><div class="list">${L.map(a => { const r = acaoResp(a).find(x => x.eq === eq), f = acaoFaltam(a, eq);
    const m = `*${a.titulo}*\n${acaoQuando(a)}${a.local ? "\n" + a.local : ""}\n\n*Equipe ${eq}*, precisamos de você${r.homens ? ` (${r.homens} homens)` : ""}${r.oque ? ":\n" + r.oque : "."}\n\nConfirme aqui: ${acaoLink(a, r)}`;
    return `<div class="li"><span class="grow"><b>${esc(a.titulo)}</b><small class="hint" style="display:block">${esc(acaoQuando(a))} · faltam ${f} de ${r.homens}</small></span><a class="btn sm primary" href="https://wa.me/?text=${encodeURIComponent(m)}" target="_blank" rel="noopener">${ico("wa")} Chamar a equipe</a></div>`; }).join("")}</div></section>`;
}
/* Respostas prontas: as perguntas do PDF, quem responde e o texto aprovado. config meta-faq {q0:{txt,por,em}} */
const FAQ = [["Será que eu aguento?", "Hakunas", "Como é o preparo e o cuidado com a saúde, e o que fazer antes"], ["É seguro?", "Segurança", "Como a equipe cuida de quem sobe"],
  ["Quanto custa e para onde vai o dinheiro?", "ADM", "Valor e destino dos recursos; toda contribuição é voluntária"], ["Não tenho tempo", "Eventos", "Datas e programa com antecedência, e a lista de caronas"],
  ["Minha esposa tem dúvidas", "Esposas", "Conversa direta e convite para o pré-TOP"], ["Será que é para mim?", "Voz", "O propósito do TOP e o testemunho de quem já subiu"],
  ["Sou de outra igreja", "Diretoria", "O TOP serve às igrejas locais e não batiza ninguém"]];
const faqDoc = () => cfgDe("meta-faq") || {};
const podeFaq = i => podeEditar() || (ehCoordEq() && FAQ[i][1] === ME.equipeLgnd);
function metaFaq() {
  const F = faqDoc(), prontas = FAQ.filter((_, i) => F["q" + i]).length;
  return `<details class="panel faq"><summary><b>Respostas prontas para as dúvidas</b> <small class="hint">${prontas} de ${FAQ.length} escritas</small></summary><div class="list">
    ${FAQ.map(([q, eq, dica], i) => { const r = F["q" + i]; return `<div class="li faq-li"><div class="grow"><b>${esc(q)}</b> <span class="tag">${esc(eq)}</span><br>${r ? `<span>${esc(r.txt)}</span>` : `<small class="hint">Falta escrever. Precisa dizer: ${esc(dica)}.</small>`}</div>
      <div class="actions">${r ? `<button class="btn sm" type="button" data-faq-copiar="${i}">Copiar</button>` : ""}${podeFaq(i) ? `<button class="linkbtn" type="button" data-faq-ed="${i}" aria-label="Escrever resposta">${ico("edit")}</button>` : ""}</div></div>`; }).join("")}
  </div></details>`;
}
function faqForm(i) {
  if (!podeFaq(i)) { toast("Quem escreve esta resposta é a equipe " + FAQ[i][1] + "."); return; }
  const r = faqDoc()["q" + i] || {};
  modal(`<h3>${esc(FAQ[i][0])}</h3><p class="hint" style="margin:0">Responde: ${esc(FAQ[i][1])}. Precisa dizer: ${esc(FAQ[i][2])}. A Coordenação aprova antes de usar.</p>
    <div class="field"><label for="fq-t">Resposta</label><textarea id="fq-t" name="txt" style="min-height:140px">${esc(r.txt || "")}</textarea></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { const txt = String(fd.get("txt") || "").trim(), F = { ...faqDoc() }; if (txt) F["q" + i] = { txt, por: ME.adm || "", em: new Date().toISOString() }; else delete F["q" + i]; closeModal();
    (async () => { try { await api.set("config", "meta-faq", F); toast("Resposta salva"); } catch (e) { toast("Não foi possível salvar. " + erroAmigavel(e)); } render(); })(); });
}
function metaAbas(aba) {
  return `<div class="seg meta-abas" role="tablist">${[["grupo", ehCoordEq() ? "Minha equipe" : "Equipes"], ["quadro", "Tarefas" + (quadroLivres() ? ` <span class="badge num">${quadroLivres()}</span>` : "")], ["ind", "Indicações"], ...(ehCoordEq() ? [] : [["placar", "Resumo"]])].map(([k, l]) => `<button type="button" data-meta-aba="${k}" aria-pressed="${aba === k}">${l}</button>`).join("")}</div>`;
}
function metaAjustarForm() {
  const D = metaDados();
  modal(`<h3>Ajustar meta</h3>
    <div class="form"><div class="field"><label for="mt-v">Vagas (homens no TOP)</label><input id="mt-v" name="vagas" type="number" min="1" value="${D.vagas}"></div>
      <div class="field"><label for="mt-d">Desistência esperada (%)</label><input id="mt-d" name="desist" type="number" min="0" max="50" value="${D.desist}"></div></div>
    <p class="hint">A meta de inscritos fica vagas + desistência. Recalibre na semana -9 com os primeiros inscritos, como diz a Estratégia 150.</p>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { closeModal(); save(() => api.set("config", "meta-" + curTopId(), { vagas: +fd.get("vagas") || 150, desist: +fd.get("desist") || 0 }), "Meta ajustada"); });
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
  <div class="head"><div><h2>Tops</h2><p>Histórico de todos os TOPs da base 3 Colinas. Ao finalizar um TOP, ele fica registrado aqui com senderistas, documentos e checklist.</p></div>${ORG() && S.isOwner ? `<div class="actions"><button class="btn glass" type="button" data-act="backup">${ico("upload")} Baixar backup</button></div>` : ""}
    <div class="actions">${RELATORIO_FINAL() ? `<button class="btn" type="button" data-act="relatorio">${ico("list")} Relatório final do ${esc(topName())}</button>` : ""}${podeTops() && META() ? `<button class="btn" type="button" data-prev-ed="1">${ico("clock")} ${topPrev() ? "Próximo TOP: " + esc(fmtPeriodo(topPrev())) : "Planejar próximo TOP"}</button>` : ""}${podeTops() ? `<button class="btn primary" type="button" data-act="novo-top">${ico("plus")} Iniciar novo TOP</button>` : ""}</div></div>
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
  let html = faixa + (ehCoordEq() ? "" : avisoRemedio() + avisoContas() + avisoLembretes() + avisoTurno()) + other + (v === "painel" ? vPainel()
    : v === "tops" ? vTops()
    : v === "usuarios" ? vUsuarios()
    : v === "historico" ? vHistorico()
    : v === "pendencias" ? vPendencias()
    : v === "participantes" ? vPessoas("participante")
    : v === "legendarios" ? vPessoas("legendario")
    : v === "familias" ? vFamilias()
    : v === "equipes" ? vEquipes()
    : v === "aovivo" ? vAoVivo()
    : v === "ocorrencias" ? vOcorrencias()
    : v === "checklist" ? vChecklist()
    : v === "cronograma" ? vCronograma()
    : v === "consagracao" ? vConsagracao()
    : v === "pins" ? vPins()
    : v === "notificacoes" ? vNotificacoes()
    : v === "estoque" ? vEstoque()
    : v === "meta" ? vMeta()
    : v === "agenda" ? vAgenda()
    : v === "importacao" ? vImportacao()
    : v === "postop" ? vPosTop()
    : v === "nfc" ? vNfc()
    : v === "campo" ? vCampo()
    : v === "comunicacao" ? vComunicacao()
    : v === "celulares" ? vCelulares()
    : v === "checkin" ? vCheckin()
    : v === "remedios" ? vRemedios()
    : v === "emergencia" ? vEmergencia()
    : v === "transporte" ? vTransporte()
    : v === "carros" ? vCarros()
    : v === "comunicados" ? vComunicados()
    : v === "financeiro" ? vFinanceiro()
    : v === "guia" ? vGuia()
    : vPista());
  if (D2()) { if (carregando(v)) html = faixa + other + esqueleto(v); else html = vazios(html); }
  // padrão das telas: o nome do grupo do menu aparece em cima do título de cada tela
  if (ORG()) { const g = (MENU_GRUPOS.find(([, ids]) => ids.includes(v)) || [])[0]; if (g) html = html.replace('<div class="head"><div><h2>', `<div class="head"><div><span class="eyebrow">${g}</span><h2>`); }
  const view = $("#view");
  const focusId = document.activeElement && document.activeElement.id;
  const caret = focusId === "q" || focusId === "hq" || focusId === "pq" || focusId === "nq" ? document.activeElement.selectionStart : null;
  // só troca a tela se algo mudou: evita a tela piscar (logo "tremendo") quando chega atualização de outro ADM sem mudança visível
  if (view._html !== html || !view.firstChild) { view.innerHTML = html; view._html = html; }
  botaoPdf();
  if (S.view === "painel") setTimeout(registrarDia, 0);
  document.body.classList.toggle("av-tv", modoTv());
  if (S.view !== "aovivo") S.mapaCheio = false;
  document.body.classList.toggle("av-mapa-cheio", !!S.mapaCheio);
  if (S.view === "aovivo") montarMapaVivo(); else if (mapaAV) { try { mapaAV.map.remove(); } catch (e) {} mapaAV = null; }
  if (nfcPendente && ME.acesso && S.P.length && !$("#modalRoot").innerHTML) { const t = nfcPendente; nfcPendente = ""; try { history.replaceState(null, "", location.pathname + location.search.replace(/[?&]nfc=[\w-]+/, "").replace(/^&/, "?") + location.hash); } catch {} setTimeout(() => abrirPorToken(t), 200); }
  if ((focusId === "q" || focusId === "hq" || focusId === "pq" || focusId === "nq") && $("#" + focusId)) { const q = $("#" + focusId); q.focus(); try { q.setSelectionRange(caret, caret); } catch {} }
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
      <div class="field"><label for="f-termo">Termo LGND</label>${sel("termo", TERMO, p.termo)}${TERMO_LINK() && p.termoLink && p.termo !== "assinado" ? `<span class="termo-link"><a class="hint" href="${esc(p.termoLink)}" target="_blank" rel="noopener">Abrir link do termo</a> · <button class="linkbtn hint" type="button" data-copiar-link="${esc(p.id)}">Copiar link</button></span>` : ""}</div>
      <div class="field"><label for="f-atestado">Status do atestado</label>${sel("atestado", ATESTADO, p.atestado)}</div>
      <div class="field"><label for="f-dataAtestado">Previsão do atestado</label><input id="f-dataAtestado" name="dataAtestado" value="${esc(p.dataAtestado)}" placeholder="ex.: semana do dia 30/10"></div>
      ` : `
      <div class="field"><label for="f-cidade">Cidade</label><input id="f-cidade" name="cidade" value="${esc(p.cidade)}"></div>
      <div class="field"><label for="f-idade">Idade</label><input id="f-idade" name="idade" type="number" min="14" max="99" inputmode="numeric" value="${esc(p.idade)}"></div>
      <div class="field"><label for="f-familia">Família</label>${sel("familia", [{ v: "", l: "Sem família" }, ...Array.from({ length: 12 }, (_, i) => ({ v: String(i + 1), l: "Família " + String(i + 1).padStart(2, "0") }))], p.familia ? String(p.familia) : "")}</div>
      <div class="field"><label for="f-atestado">Status do atestado</label>${sel("atestado", ATESTADO, p.atestado)}</div>
      <div class="field"><label for="f-dataAtestado">Previsão do atestado</label><input id="f-dataAtestado" name="dataAtestado" value="${esc(p.dataAtestado)}" placeholder="ex.: semana do dia 30/10"></div>
      <div class="field"><label for="f-termo">Status do termo</label>${sel("termo", TERMO, p.termo)}${TERMO_LINK() && p.termoLink && p.termo !== "assinado" ? `<span class="termo-link"><a class="hint" href="${esc(p.termoLink)}" target="_blank" rel="noopener">Abrir link do termo</a> · <button class="linkbtn hint" type="button" data-copiar-link="${esc(p.id)}">Copiar link</button></span>` : ""}</div>
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
      ${PRECO_ESTOQUE() ? `<div class="field"><label for="f-preco">Preço unitário (R$)</label><input id="f-preco" name="preco" inputmode="decimal" value="${e.preco != null ? fmtPreco(e.preco) : ""}" placeholder="0,00"></div>
      <div class="field"><label for="f-pormre">Quantidade por MRE</label><input id="f-pormre" name="porMre" type="number" min="1" inputmode="numeric" value="${porMre(e)}"></div>` : ""}
      <div class="field full"><label for="f-iobs">Observações</label><input id="f-iobs" name="obs" value="${esc(e.obs)}"></div>
      <div class="field full"><div class="checks"><label><input type="checkbox" id="f-conferir" name="conferir" ${e.conferir ? "checked" : ""}> Falta conferir</label>${PRECO_ESTOQUE() ? `<label><input type="checkbox" name="mre" ${ehMre(e) ? "checked" : ""}> Vai no MRE</label>` : ""}</div></div>
    </div>
    <div class="modal-foot"><div>${e.id ? `<button class="btn danger" type="button" id="delBtn">Excluir</button>` : ""}</div>
      <div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  (fd) => {
    const item = String(fd.get("item") || "").trim(); if (!item) { $("#f-item").focus(); return; }
    const data = { item, grupo: fd.get("grupo"), qtd: fd.get("qtd") === "" ? null : Number(fd.get("qtd")), local: String(fd.get("local") || "").trim(), resp: String(fd.get("resp") || "").trim(), obs: String(fd.get("obs") || "").trim(), conferir: fd.get("conferir") === "on", atualizado: new Date().toISOString() };
    if (PRECO_ESTOQUE()) { data.preco = lePreco(fd.get("preco")); data.mre = fd.get("mre") === "on"; data.porMre = Math.max(1, Number(fd.get("porMre")) || 1); }
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
  t = t || (META() && topPrev() ? { ...topPrev(), status: "ativo" } : { local: "Franca - SP", status: "ativo" });
  modal(`
    <h3>${novo ? "Iniciar novo TOP" : "Editar TOP"}</h3>
    <div class="form">
      <div class="field full"><label for="f-tnome">Nome do TOP</label><input id="f-tnome" name="nome" value="${esc(t.nome)}" placeholder="ex.: TOP 1950" required></div>
      <div class="field full"><label for="f-tlocal">Local</label><input id="f-tlocal" name="local" value="${esc(t.local)}"></div>
      <div class="field"><label for="f-tinicio">Início</label><input id="f-tinicio" name="inicio" type="date" value="${esc(t.inicio)}"></div>
      <div class="field"><label for="f-tfim">Fim</label><input id="f-tfim" name="fim" type="date" value="${esc(t.fim)}"></div>
      ${META() ? `<div class="field full"><label for="f-tlink">Link de inscrição (aparece na Agenda)</label><input id="f-tlink" name="linkInsc" type="url" value="${esc(t.linkInsc || "")}" placeholder="https://…"></div>` : ""}
      ${novo ? `<div class="field full"><div class="checks"><label><input type="checkbox" id="f-tcopy" name="copiar" checked> Copiar as tarefas do checklist do ${esc(topName(atualId()))}, zeradas</label></div></div>`
        : `<div class="field"><label for="f-tstatus">Situação</label>${sel("status", [{ v: "ativo", l: "Em andamento" }, { v: "finalizado", l: "Finalizado" }], t.status)}</div>`}
    </div>
    ${novo && ativo ? `<p class="hint" style="margin:0">O ${esc(ativo.nome)} será finalizado e guardado na aba Tops. Senderistas, legendários e checklist do novo TOP começam do zero; estoque e pista continuam os mesmos.</p>` : ""}
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${novo ? "Iniciar TOP" : "Salvar"}</button></div></div>`,
  async (fd) => {
    const nome = String(fd.get("nome") || "").trim(); if (!nome) { $("#f-tnome").focus(); return; }
    const data = { nome, local: String(fd.get("local") || "").trim(), inicio: String(fd.get("inicio") || ""), fim: String(fd.get("fim") || "") };
    if (fd.has("linkInsc")) data.linkInsc = String(fd.get("linkInsc") || "").trim();
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
    if (META() && topPrev()) try { await api.set("config", "top-previsto", {}); } catch (e) {}
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
        ${DEMO ? `<div class="demo-pick" role="group" aria-label="Entrar como">${S.equipe.map((e, i) => `<button type="button" data-demo="${esc(e.id)}" aria-pressed="${i === 0}">${esc(e.nome.split(" ")[0])}<small>${e.dono ? "Dono" : ehCoordCad(e) ? "Coord. " + esc(e.equipe_lgnd || "") : e.nivel === "leitura" ? "Só leitura" : e.nivel === "total" ? "Acesso total" : "Edita abas"}</small></button>`).join("")}</div>` : `
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
  ME.acesso = { nivel: p.dono ? "total" : (p.nivel || "leitura"), abas: p.dono || p.nivel === "total" ? [...ABAS().map(v => v.id), ABA_V2] : (p.abas || []) };
  ME.permMapa = !!p.dono || (p.abas || []).includes(MP_PERM);
  ME.coord = !p.dono && p.perfil === "coord"; ME.equipeLgnd = ME.coord ? (p.equipe_lgnd || "") : ""; ME.cargo = p.cargo || "";
  if (ME.coord) ME.acesso = { nivel: "leitura", abas: coordAbasSalvar() };
  document.body.classList.toggle("ro", ME.acesso.nivel === "leitura" && !ME.dono);
  document.body.classList.toggle("coord", ehCoordEq());
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

/* Visual 2 (demo): comemoração curta quando algo fica pronto (tarefa, atestado, termo, pagamento, pin, ocorrência, horário) */
function comemorar(x, y, sel) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const b = document.createElement("div"); b.className = "festa"; b.style.left = x + "px"; b.style.top = y + "px";
  const cores = ["#ff7a1a", "#46c486", "#f2c233", "#60a5fa", "#fff6ee"];
  b.innerHTML = `<span class="festa-ok">${ico("check")}</span>` + Array.from({ length: 14 }, (_, i) => { const ang = i / 14 * Math.PI * 2 + Math.random() * .4, r = 38 + Math.random() * 34;
    return `<i style="--dx:${(Math.cos(ang) * r).toFixed(0)}px;--dy:${(Math.sin(ang) * r).toFixed(0)}px;background:${cores[i % cores.length]};${i % 3 ? "" : "border-radius:2px;width:8px;height:4px;"}"></i>`; }).join("");
  document.body.appendChild(b); setTimeout(() => b.remove(), 900);
  try { navigator.vibrate && navigator.vibrate(12); } catch {}
  if (sel) setTimeout(() => { const el = document.querySelector(sel); const alvo = el && (el.closest("tr, .pcard, .task, .li, .oc, .card, .row") || el); if (alvo) { alvo.classList.remove("feito-agora"); void alvo.offsetWidth; alvo.classList.add("feito-agora"); } }, 60);
}
document.addEventListener("click", e => {
  if (!D2()) return;
  const t = e.target.closest("button, a, [data-task], [data-cyc]"); if (!t) return;
  const d = t.dataset, css = (k, v) => `[data-${k}="${CSS.escape(v)}"]`;
  let ok = false, sel = "";
  if (d.task) { const tk = S.T.find(x => x.id === d.task); ok = tk && tk.status === "andamento"; sel = css("task", d.task); }
  else if (d.cyc && d.id) { const p = S.P.find(x => x.id === d.id); if (p) { const l = (d.cyc === "atestado" ? ATESTADO : TERMO).filter(o => o.v !== "nao"), i = l.findIndex(o => o.v === p[d.cyc]), nx = l[(i + 1) % l.length]; ok = nx.c === "ok" && (l[i] || {}).c !== "ok"; sel = `[data-cyc="${d.cyc}"][data-id="${CSS.escape(d.id)}"]`; } }
  else if (d.tog && d.id) { const p = S.P.find(x => x.id === d.id); ok = p && !p[d.tog]; sel = `[data-tog="${d.tog}"][data-id="${CSS.escape(d.id)}"]`; }
  else if (d.pagOk) { ok = true; }
  else if (d.pinOk) { ok = true; sel = css("pin-desfaz", d.pinOk); }
  else if (d.cronoFim) { ok = true; }
  else if (d.ocResolver) { const o = ocorrencias().find(x => x.id === d.ocResolver); ok = o && o.status !== "resolvida"; sel = css("oc-resolver", d.ocResolver); }
  if (!ok) return;
  const r = t.getBoundingClientRect(); comemorar(r.left + r.width / 2, r.top + r.height / 2, sel);
}, true);
document.addEventListener("click", e => {
  const cob = e.target.closest("a[data-cobrar]");
  if (cob) { const p = S.P.find(x => x.id === cob.dataset.cobrar); if (p) registrarCobranca(p); return; }
  const nl = e.target.closest("a[data-nfc-link]");
  if (nl) { const p = S.P.find(x => x.id === nl.dataset.nfcLink); if (p) linkEnviado(p); return; }
  const cobPag = e.target.closest("a[data-cobrar-pag]");
  if (cobPag) { const p = S.P.find(x => x.id === cobPag.dataset.cobrarPag); if (p) registrarAvisoPag(p); return; }
  const t = e.target.closest("button, [data-close], [data-hist-ver], [data-fin-det]");
  if (!t) return;
  if (t.matches("[data-close]") && e.target === t) { closeModal(); return; }
  if (t.matches("[data-close-btn]")) { closeModal(); return; }
  const d = t.dataset;
  if (d.go) { if (d.pinIr) S.pinf = { lote: "", q: "", ...(S.pinf || {}), st: d.pinIr };
    if (d.pfSet) d.pfSet.split(";").forEach(x => { const [k, v] = x.split(":"); S.pf[k] = v; if (k === "aba") store.set("pend-aba", v); });
    if (d.campoIr) S.campoAba = d.campoIr;
    if (d.comIr) S.comAba = d.comIr;
    go(d.go); return; }
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
  if (d.indNovo) { indForm(); return; }   // coordenador também indica nomes
  if (d.metaAba) { S.metaAba = d.metaAba; if (S.view !== "meta") go("meta"); else render(); return; }
  if (d.acaoNovo) { acaoForm(); return; }
  if (d.grpEd) { grupoForm(d.grpEd === "novo" ? null : d.grpEd); return; }
  if (d.qNovo || d.qEd) { quadroForm(d.qEd || null); return; }
  if (d.qPegar || d.qDevolver || d.qFeito) { quadroMarcar(d.qPegar || d.qDevolver || d.qFeito, d.qPegar ? "pegar" : d.qDevolver ? "devolver" : "feito", d.qGrupo); return; }
  if (d.metaTar) { S.metaAba = "quadro"; S.qFiltro = ""; go("meta"); return; }
  if (d.qFiltro) { S.qFiltro = d.qFiltro; render(); return; }
  if (d.sala) { S.salaEq = d.sala; S.metaAba = "grupo"; if (S.view !== "meta") go("meta"); else render(); return; }
  if (d.salaLink) { const l = indLink(d.salaLink), msg = `Equipe ${d.salaLink}: vamos juntos levar mais homens ao ${topName()}! Indique um amigo aqui, leva 1 minuto: ${l}`; window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank", "noopener"); return; }
  if (d.pdfAg) { const b = t; b.disabled = true; agendaPdf().catch(e => toast("Não consegui gerar o PDF. " + (e.message || ""))).finally(() => { b.disabled = false; }); return; }
  if (d.faqEd) { faqForm(+d.faqEd); return; }
  if (d.faqCopiar) { const q = FAQ[+d.faqCopiar], r = faqDoc()["q" + d.faqCopiar]; if (r) copiarTexto(r.txt, "Resposta copiada"); return; }
  if (d.agTop === "previsto") { prevVer(); return; }
  if (d.agTop) { const t = S.tops.find(x => x.id === d.agTop) || topDoc(); if (t) agTopVer(t); return; }
  if (d.prevEd) { prevForm(); return; }
  if (d.agPass) { S.agPass = !S.agPass; render(); return; }
  if (d.acaoVer) { const [doc, id] = d.acaoVer.split("|"), a = acoesTodas().find(x => x.doc === doc && x.id === id); if (a) acaoVer(a); return; }
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
  if (d.act === "busca") { buscaGeral(); return; }
  if (d.nfcF) { S.nfcF = d.nfcF; render(); return; }
  if (d.nfcFicha) { fichaNfc(S.P.find(p => p.id === d.nfcFicha)); return; }
  if (d.nfcTag) { tagForm(S.P.find(p => p.id === d.nfcTag)); return; }
  if (d.nfcForm) { saudeForm(S.P.find(p => p.id === d.nfcForm)); return; }
  if (d.act === "nfc-ler") { lerNfc(); return; }
  if (d.act === "nfc-seq") { if (podeEditar()) nfcSequencia(); return; }
  if (d.act === "nfc-codigo") { if (podeEditar()) codigoForm(); return; }
  if (d.gAba) { S.gAba = d.gAba; render(); return; }
  if (d.campoAba) { S.campoAba = d.campoAba; render(); return; }
  if (d.comAba) { S.comAba = d.comAba; render(); return; }
  if (d.celF) { S.celF = d.celF; render(); return; }
  if (d.chkAba) { S.chkAba = d.chkAba; render(); return; }
  if (d.chkF) { S.chkF = d.chkF; render(); return; }
  if (d.chk) { const p = S.P.find(x => x.id === d.chk); if (p && podeEditar()) chkForm(p); return; }
  if (d.mochProv) { const [pid, it] = d.mochProv.split("|"), p = S.P.find(x => x.id === pid), c = p && chkDe(p); if (c && podeEditar()) save(() => api.set("config", chkId(p), { ...c, prov: { ...(c.prov || {}), [it]: { por: ME.adm || "", em: agoraISO() } } }), "Providenciado").then(render); return; }
  if (d.act === "moch-itens") { mochItensForm(); return; }
  if (d.rem != null && t.matches("[data-rem]")) { if (podeEditar()) remForm(d.rem); return; }
  if (d.remPid) { if (podeEditar()) remForm("", d.remPid); return; }
  if (d.remDose) { if (podeEditar()) remSalvar(D => { const x = { ...(D.doses || {}) }; if (x[d.remDose]) delete x[d.remDose]; else x[d.remDose] = { por: ME.adm || "", em: agoraISO() }; return { doses: x }; }, ""); return; }
  if (d.act === "emg-editar") { emergForm(); return; }
  if (d.trSent) { S.trSent = d.trSent; render(); return; }
  if (d.trAba) { S.trAba = d.trAba; render(); return; }
  if (d.trAbrir) { S.trAberto = S.trAberto === d.trAbrir ? null : d.trAbrir; render(); return; }
  if (d.car != null && t.matches("[data-car]")) { if (podeEditar()) carForm(d.car); return; }
  if (d.carVer) { carVer(d.carVer); return; }
  if (d.carF != null && t.matches("[data-car-f]")) { S.carF = d.carF; render(); return; }
  if (d.carOk) { if (!podeEditar()) return; if ($("#modalRoot").innerHTML) closeModal(); carSalvar(D => ({ lista: D.lista.map(x => x.id === d.carOk ? { ...x, conferido: true, aprovPor: ME.adm || "", aprovEm: new Date().toISOString() } : x) }), "Carro aprovado"); return; }
  if (d.carNao) { const c = carLista().find(x => x.id === d.carNao); if (!c || !podeEditar() || !confirm(`Recusar o carro ${carPlaca(c.placa)} de ${c.nome}? Ele sai da lista.`)) return;
    carSalvar(D => ({ lista: D.lista.filter(x => x.id !== c.id), apagados: [...(D.apagados || []), c.id] }), "Cadastro recusado").then(() => { if (!DEMO && c.id.startsWith("carlink-")) api.remove("config", c.id).catch(() => {}); }); return; }
  if (d.carSt) { const [cid, ac] = d.carSt.split("|"), agora = new Date().toISOString();
    carSalvar(D => ({ lista: D.lista.map(x => x.id !== cid ? x : ac === "chegou" ? { ...x, chegou: agora, saiu: "" } : { ...x, saiu: agora }) }), ac === "chegou" ? "Chegada registrada" : "Saída registrada"); return; }
  if (d.trV != null && t.matches("[data-tr-v]")) { if (podeEditar()) trVeicForm(d.trV); return; }
  if (d.trFam) { if (podeEditar()) trFamForm(d.trFam); return; }
  if (d.trLg) { if (podeEditar()) trLgForm(d.trLg); return; }
  if (d.trVist) { trVistForm(d.trVist); return; }
  if (d.act === "tr-copiar") { if (podeEditar()) trCopiarVolta(); return; }
  if (d.trEmb) { if (podeEditar()) trSalvar(D => { const x = { ...(D.emb || {}) }; if (x[d.trEmb]) delete x[d.trEmb]; else x[d.trEmb] = { por: ME.adm || "", em: agoraISO() }; return { emb: x }; }, ""); return; }
  if (d.fin != null && t.matches("[data-fin]")) { if (podeEditar()) finForm(d.fin); return; }
  if (d.finFoto) { const i = (finDoc().itens || []).find(x => x.id === d.finFoto); if (i) modal(`<h3>${esc(i.desc)}</h3><img class="cel-grande" src="${esc(celFotoSrc(i))}" alt="Recibo"><div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal()); return; }
  if (d.act === "fin-orc") { finOrcForm(); return; }
  if (d.act === "fin-pdf") { finPdf(); return; }
  if (d.finDet) { finDetalhe(d.finDet); return; }
  if (d.contaPaga) { if (podeEditar()) contaPagar(d.contaPaga); return; }
  if (d.gasto != null && t.matches("[data-gasto]")) { gastoForm(d.gasto); return; }
  if (d.feqFoto) { const [doc, id] = d.feqFoto.split("|"), i = ((cfgDe(doc) || {}).itens || []).find(x => x.id === id); if (i) modal(`<h3>${esc(i.desc)}</h3><img class="cel-grande" src="${esc(celFotoSrc(i))}" alt="Comprovante"><div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button></div></div>`, () => closeModal()); return; }
  if (d.feq) { const [doc, id, acao] = d.feq.split("|"); feqDecidir(doc, id, acao); return; }
  if (d.celEq != null && t.matches("[data-cel-eq]")) { S.celEq = S.celEq === d.celEq ? "" : d.celEq; if (S.celEq) S.celF = "todos"; render(); return; }
  if (d.cel) { const p = S.P.find(x => x.id === d.cel); if (p && podeEditar()) celForm(p); return; }
  if (d.celNao) { const p = S.P.find(x => x.id === d.celNao); if (p && podeEditar()) celNaoForm(p); return; }
  if (d.celDev) { const p = S.P.find(x => x.id === d.celDev); if (p && podeEditar()) celSalvar(p, { status: "devolvido", devolvidoEm: new Date().toISOString(), devolvidoPor: ME.adm || "" }, `Celular devolvido a ${p.nome.split(" ")[0]}`); return; }
  if (d.celEdit) { const p = S.P.find(x => x.id === d.celEdit); if (p && podeEditar()) celEditar(p); return; }
  if (d.celVer) { const p = S.P.find(x => x.id === d.celVer); if (p) celForm(p); return; }
  if (d.celPdf != null && t.matches("[data-cel-pdf]")) { celPdf(d.celPdf, false); return; }
  if (d.celWa) { celResumoWa(d.celWa); return; }
  if (d.comVi != null && t.matches("[data-com-vi]")) { if (d.comVi) comMarcarVi(d.comVi); return; }
  if (d.comVistos) { S.comVistos = S.comVistos === d.comVistos ? null : d.comVistos; render(); return; }
  if (d.comEditar) { comEditar(d.comEditar); return; }
  if (d.comApagar) { const id = campoId("mural"), M = cfgDe(id) || {}, m = (M.msgs || []).find(x => x.id === d.comApagar);
    if (m && confirm(`Excluir o recado "${m.txt.slice(0, 60)}"?`)) save(() => api.set("config", id, { ...M, msgs: M.msgs.filter(x => x.id !== m.id) }), "Recado excluído").then(render); return; }
  if (d.comFixar) { const id = campoId("mural"), M = cfgDe(id) || {}; if (podeEditar()) save(() => api.set("config", id, { ...M, msgs: (M.msgs || []).map(m => m.id === d.comFixar ? { ...m, fixo: !m.fixo } : m) }), "").then(render); return; }
  if (d.lem != null && t.matches("[data-lem]")) { if (podeEditar()) lembreteForm(d.lem); return; }
  if (d.lemFeito) { if (podeEditar()) lembreteFeito(d.lemFeito); return; }
  if (d.aprTipo) { S.aprTipo = d.aprTipo; render(); return; }
  if (d.act === "apr-add") { const tx = ($("#aprTxt") || {}).value, area = ($("#aprArea") || {}).value; if (tx && tx.trim() && podeEditar()) { S.aprArea = area;
      aprendSalvar(D => ({ itens: [...(D.itens || []), { id: Date.now().toString(36), area, tipo: S.aprTipo === "mudar" ? "mudar" : "funcionou", txt: tx.trim(), por: ME.adm || "", em: new Date().toISOString() }] }), "Aprendizado anotado"); } return; }
  if (d.aprDel) { if (podeEditar()) aprendSalvar(D => ({ itens: (D.itens || []).filter(i => i.id !== d.aprDel) }), "Apagado"); return; }
  if (d.aprRev) { if (podeEditar()) aprendSalvar(D => { const r = { ...(D.revisados || {}) }; if (r[d.aprRev]) delete r[d.aprRev]; else r[d.aprRev] = { por: ME.adm || "", em: new Date().toISOString() }; return { revisados: r }; }, ""); return; }
  if (d.chamada) { if (podeEditar()) chamadaForm(Number(d.chamada)); return; }
  if (d.chamadaOk) { const c = cfgDe(d.chamadaOk); if (c && podeEditar()) save(() => api.set("config", d.chamadaOk, { ...c, resolvida: true, resolvidaEm: new Date().toISOString(), resolvidaPor: ME.adm || "" }), "Marcado como encontrado").then(render); return; }
  if (d.mural) { if (podeEditar()) muralPostar(d.mural); toast("Recado enviado para a equipe"); return; }
  if (d.act === "mural-enviar") { const i = $("#muralTxt"), v = i && i.value.trim(); if (v && podeEditar()) { muralPostar(v); toast("Recado enviado para a equipe"); } return; }
  if (d.turno != null && t.matches("[data-turno]")) { if (podeEditar()) turnoForm(d.turno); return; }
  if (d.entDia) { S.entDia = d.entDia; render(); return; }
  if (d.ent) { if (podeEditar()) entregaMarcar(d.ent); return; }
  if (d.act === "loc-ligar") { locLigar(true); return; }
  if (d.act === "loc-desligar") { locLigar(false); return; }
  if (d.gOff) { S.gOff = { ...(S.gOff || {}), [d.gOff]: !(S.gOff || {})[d.gOff] }; render(); return; }
  if (d.act === "guia-ok") { store.set("adm3-guia-visto", "1"); render(); return; }
  if (d.act === "pt-responder") { posTopForm(); return; }
  if (d.act === "pt-licoes") { licoesForm(); return; }
  if (d.act === "backup") { backupForm(); return; }
  if (d.act === "fin-xlsx") { finXlsx(); return; }
  if (d.act === "custo-pessoa") { custoForm(); return; }
  if (d.act === "fin-limpar") { S.finF = null; render(); return; }
  if (d.act === "fin-sem") { S.finF = { ...finFilt(), sem: true, tipo: "" }; render(); setTimeout(() => { const el = $(".fin-filtros"); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 50); return; }
  if (d.act === "cmd-enviar") { if (podeEditar()) cmdEnviar(); return; }
  if (d.act === "cmd-copiar") { cmdCopiar(); return; }
  if (d.act === "cmd-xlsx") { cmdXlsx(); return; }
  if (d.cmdQuem) { Object.assign(cmdF(), { quem: d.cmdQuem, equipe: d.cmdQuem === "participante" ? "" : cmdF().equipe, pend: d.cmdQuem === "legendario" ? false : cmdF().pend }); render(); return; }
  if (d.cmdTodos != null && t.matches("[data-cmd-todos]")) { const s = cmdExcl(); cmdLista().forEach(p => d.cmdTodos === "1" ? s.delete(p.id) : s.add(p.id)); render(); return; }
  if (d.cmdVer) { cmdVer(d.cmdVer); return; }
  if (d.cmdCont) { if (podeEditar()) cmdSequencia(d.cmdCont); return; }
  if (d.act === "car-link") { if (podeEditar()) carLinkForm(); return; }
  if (d.act === "aovivo-tv") { const on = !modoTv(); try { localStorage.setItem("adm3-avtv", on ? "1" : "0"); } catch (e) {} if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); render(); return; }
  if (d.copiarLink) { const p = S.pessoas.find(x => x.id === d.copiarLink); if (p && p.termoLink) copiarTexto(p.termoLink, "Link do termo copiado"); return; }
  if (d.act === "nova-ocorr") { ocorrForm(); return; }
  if (d.act === "ocorr-rapida") { ocorrRapida(); return; }
  if (d.act === "fam-importar") { famImportarForm(); return; }
  if (d.act === "meta-ajustar") { metaAjustarForm(); return; }
  if (d.act === "ind-link") { indLinkForm(); return; }
  if (d.indF) { S.indF = d.indF; render(); return; }
  if (d.indEd) { const [doc, id] = d.indEd.split("|"); const x = indTodas().find(y => y.doc === doc && y.id === id); if (x) indForm(x); return; }
  if (d.act === "mp-novo") { S.mpPick = true; render(); return; }
  if (d.act === "mp-cancelar") { S.mpPick = false; render(); return; }
  if (d.act === "mp-gps") { S.mpPick = false; render(); mpPegarGps(q => pontoForm(null, q)); return; }
  if (d.mpEdit) { const x = mpLista().find(y => y.id === d.mpEdit); if (x) { if (mapaAV) mapaAV.map.closePopup(); pontoForm(x); } return; }
  if (d.mpF) { const off = mpOcultos(); off.has(d.mpF) ? off.delete(d.mpF) : off.add(d.mpF); store.set("adm3-mp-off", JSON.stringify([...off])); render(); return; }
  if (d.act === "av-aviso") { if (avAvisoLigado()) { store.set("adm3-av-aviso", "0"); toast("Aviso desligado neste aparelho"); render(); return; }
    store.set("adm3-av-aviso", "1"); try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().then(render); } catch (e) {}
    toast("Vou avisar 10 min antes de cada momento enquanto o app estiver aberto"); render(); return; }
  if (d.avMarca) { const [t, id] = d.avMarca.split("|"); S.cronoAdm = ME.id; const h = agoraHM();
    cronoMarcar(id, t === "ini" ? { ini: h, iniPor: ME.adm, iniEm: new Date().toISOString() } : { fim: h, fimPor: ME.adm, fimEm: new Date().toISOString() }, (t === "ini" ? "Início marcado " : "Fim marcado ") + h); return; }
  if (d.ocEdit) { const o = ocorrencias().find(x => x.id === d.ocEdit); if (o) ocorrForm(o); return; }
  if (d.ocResolver && podeEditar()) { const o = ocorrencias().find(x => x.id === d.ocResolver); if (o) salvarOcorr(o.id, { ...o, status: o.status === "resolvida" ? "aberta" : "resolvida", resolvidaEm: o.status === "resolvida" ? null : new Date().toISOString(), resolvidaPor: ME.adm || "" }, o.status === "resolvida" ? "Ocorrência reaberta" : "Ocorrência resolvida"); return; }
  if (d.ocSaude) { const p = S.pessoas.find(x => x.id === d.ocSaude); if (p) saudeFicha(p); return; }
  if (d.ocFiltro) { S.ocFiltro = d.ocFiltro; render(); return; }
  if (d.act === "relatorio") { relatorioForm(); return; }
  if (d.act === "mapa-cheio") { S.mapaCheio = !S.mapaCheio; if (mapaAV) mapaAV.dia = null;
    const el = document.documentElement;
    if (S.mapaCheio && !document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (!S.mapaCheio && document.fullscreenElement && !modoTv()) document.exitFullscreen().catch(() => {});
    render(); return; }
  if (d.act === "aovivo-tela") { const el = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen ? el.requestFullscreen() : Promise.resolve()).catch(() => {}); return; }
  if (d.act === "importar-eq") { if (podeImportar()) importForm("legendario"); return; }
  if (d.eqAdd !== undefined && podeEditar()) { equipePessoaForm(null, d.eqAdd); return; }
  if (d.eqP && podeEditar()) { const p = S.P.find(x => x.id === d.eqP); if (p) equipePessoaForm(p); return; }
  if (d.act === "assinaturas") { if (podeImportar()) assinaturasForm(); return; }
  if (d.act === "lixeira") { lixeiraForm(S.view === "legendarios" ? "legendario" : "participante"); return; }
  if (d.act === "importar") { if (podeImportar()) importForm(S.view === "legendarios" ? "legendario" : "participante"); return; }
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
  if (d.act === "coord-liberar") { coordLiberarForm(); return; }
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
  if (e.target.id === "pq") { S.pf.q = e.target.value; render(); }
  if (e.target.id === "nq") { S.nfcQ = e.target.value; render(); }
  if (e.target.id === "pinQ") { S.pinf.q = e.target.value; render(); const q = $("#pinQ"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  if (e.target.id === "csgQ") { S.csg.q = e.target.value; render(); const q = $("#csgQ"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
});
document.addEventListener("change", e => {
  if (e.target.dataset.sel && S.isOwner) { const id = e.target.dataset.sel; e.target.checked ? S.sel.ids.add(id) : S.sel.ids.delete(id); render(); return; }
  if (e.target.dataset.selall && S.isOwner) { S.sel.ids = new Set(e.target.checked ? filterPeople().map(p => p.id) : []); render(); return; }
  if (e.target.id === "admSel") { S.f.adm = e.target.value; render(); }
  if (e.target.id === "pfAdm") { S.pf.adm = e.target.value; render(); }
  if (e.target.dataset.preco && podeEditar()) { const v = lePreco(e.target.value); save(() => api.update("estoque", e.target.dataset.preco, { preco: v, atualizado: new Date().toISOString() }), v == null ? "Preço apagado" : "Preço salvo"); return; }
  if (e.target.dataset.mre && podeEditar()) { const on = e.target.checked; save(() => api.update("estoque", e.target.dataset.mre, { mre: on, atualizado: new Date().toISOString() }), on ? "Item incluído no MRE" : "Item tirado do MRE"); return; }
  if (e.target.dataset.porMre && podeEditar()) { const n = Math.max(1, Math.round(Number(e.target.value) || 1)); save(() => api.update("estoque", e.target.dataset.porMre, { porMre: n, atualizado: new Date().toISOString() })); return; }
  if (e.target.id === "csgDe" || e.target.id === "csgAte") { S.csg[e.target.id === "csgDe" ? "de" : "ate"] = e.target.value; render(); }
  const hk = { hQuem: "quem", hAba: "aba", hAcao: "acao" }[e.target.id];
  if (hk) { S.hf[hk] = e.target.value; render(); }
  if (e.target.dataset.eqSel && podeEditar()) { const v = e.target.value; if (v) touch(e.target.dataset.eqSel, { equipe: v }, `Equipe ${v} definida`); return; }
  if (e.target.dataset.fam && !podeEditar()) { toast("Seu acesso é somente leitura."); render(); return; }
  if (e.target.dataset.fam) { const v = e.target.value; if (v) touch(e.target.dataset.fam, { familia: Number(v) }, `Família ${v.padStart(2, "0")} definida`); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches && e.target.matches("[data-hist-ver]")) { e.target.click(); return; }
  if (ORG() && ME.acesso && !$("#modalRoot").innerHTML && (e.key === "/" || (e.key === "k" && (e.ctrlKey || e.metaKey))) && !(e.target.closest && e.target.closest("input, textarea, select"))) { e.preventDefault(); buscaGeral(); return; }
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
    .replace(/\{top\}/g, topName()).replace(/\{pendencias\}/g, listaE(pendDe(p).map(k => PEND[k])))
    .replace(/\{link\}/g, linkTermo(p)) + (linkTermo(p) && !/\{link\}/.test(tpl) ? `\n\nLink para assinar o seu termo: ${linkTermo(p)}` : "");
}
// link individual do termo (vem da planilha de assinaturas): só entra na cobrança se o termo ainda falta
const linkTermo = p => TERMO_LINK() && p.termoLink && pendDe(p).includes("termo") ? p.termoLink : "";
const waCobrar = (p, txt) => { const n = waNumber(p.telefone); return n ? `https://wa.me/${n}?text=${encodeURIComponent(txt || textoCobranca(p))}` : ""; };
// busca em Pendências: nome, telefone, e-mail ou ADM
const pendBusca = p => { const q = PRECO_ESTOQUE() ? norm(S.pf.q || "").trim() : ""; if (!q) return true; const d = q.replace(/\D/g, "");
  return norm(p.nome).includes(q) || norm(p.email).includes(q) || norm(p.adm).includes(q) || (d.length >= 3 && digits(p.telefone).includes(d)); };
function pendLista() {
  const { quem, oque, adm } = S.pf;
  return S.P.filter(pendBusca).filter(p => quem === "todos" || (quem === "legendario") === (p.tipo === "legendario"))
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
  return S.P.filter(pagPendente).filter(pendBusca).filter(p => quem === "todos" || (quem === "legendario") === (p.tipo === "legendario"))
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
    ${PRECO_ESTOQUE() ? `<label class="search">${ico("search")}<input id="pq" type="search" placeholder="Buscar pessoa por nome, telefone ou e-mail" value="${esc(S.pf.q || "")}" aria-label="Buscar nas pendências"></label>` : ""}
    <select class="sel" id="pfAdm" aria-label="ADM responsável"><option value="">Todos os ADMs</option>${admOptions().map(a => `<option ${S.pf.adm === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
  </div>
  ${rows.length ? `<section class="panel"><div class="list pend">${rows.map(p => `<div class="li pendrow">
      <div class="grow"><b>${famPre(p)}${esc(p.nome)}</b> ${p.tipo === "legendario" ? '<span class="tag">LGND</span>' : ""}
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
    ${PRECO_ESTOQUE() ? `<label class="search">${ico("search")}<input id="pq" type="search" placeholder="Buscar pessoa por nome, telefone ou e-mail" value="${esc(S.pf.q || "")}" aria-label="Buscar nas pendências"></label>` : ""}
    <select class="sel" id="pfAdm" aria-label="ADM responsável"><option value="">Todos os ADMs</option>${admOptions().map(a => `<option ${S.pf.adm === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select>
  </div>
  <div class="seg" role="group" aria-label="Pendência">${seg("oque", "qualquer", "Qualquer pendência")}${seg("oque", "atestado", "Atestado")}${seg("oque", "termo", "Termo")}${seg("oque", "grupo", "Grupo")}</div>
  ${rows.length ? `<section class="panel"><div class="list pend">${rows.map(p => `<div class="li pendrow">
      <div class="grow"><b>${famPre(p)}${esc(p.nome)}</b> ${p.tipo === "legendario" ? '<span class="tag">LGND</span>' : ""}
        <div class="pendtags">${tags(p)}${linkTermo(p) ? `<button class="chip ok chip-btn" type="button" data-copiar-link="${esc(p.id)}" title="Copiar só o link do termo">${ico("paste")} link do termo</button>` : ""}${p.dataAtestado && !atOk(p) ? `<span class="hint">previsão: ${esc(p.dataAtestado)}</span>` : ""}</div>
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
    <p class="hint" style="margin:0">Use <b>{nome}</b>, <b>{adm}</b>${pag ? " e <b>{top}</b>" : `, <b>{top}</b> e <b>{pendencias}</b>${TERMO_LINK() ? " (e <b>{link}</b> para escolher onde vai o link do termo; sem ele, o link vai no final quando o termo estiver faltando)" : ""}`}: o app troca pelo primeiro nome da pessoa, o seu nome${pag ? " e o nome do TOP" : ", o nome do TOP e o que falta"}. Fica salva neste aparelho.</p>
    <div class="field"><label for="f-msg">Mensagem</label><textarea id="f-msg" name="msg" style="min-height:150px">${esc(pag ? msgPagamento() : msgCobranca())}</textarea></div>
    <div class="modal-foot"><div><button class="btn ghost" type="button" id="msgPadrao">Voltar ao padrão</button></div><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></div>`,
  fd => { store.set(chave, String(fd.get("msg") || "").trim() || PADRAO); closeModal(); toast("Mensagem salva"); render(); });
  $("#msgPadrao").onclick = () => { $("#f-msg").value = PADRAO; };
}
function cobrarSequencia(soEstes) {
  const pag = abaPag(), texto = pag ? textoPagamento : textoCobranca, registrar = pag ? registrarAvisoPag : registrarCobranca;
  const todos = (pag ? pagLista() : pendLista()).filter(p => waNumber(p.telefone));
  const hoje = p => { const c = pag ? p.cobradoPagEm : p.cobradoEm; return c && new Date(c).toDateString() === new Date().toDateString(); };
  if (!todos.length) { toast("Ninguém com telefone nesse filtro."); return; }
  // tela de início: quantos, e se pula quem já foi cobrado hoje
  if (EXTRA() && !soEstes) {
    const jaHoje = todos.filter(hoje).length, semTel = (pag ? pagLista() : pendLista()).length - todos.length;
    modal(`
      <h3>${pag ? "Avisar em sequência" : "Cobrar em sequência"}</h3>
      <p class="hint" style="margin:0">O app abre o WhatsApp de uma pessoa por vez com a mensagem pronta${pag ? "" : " (e o link do termo de cada um)"}. Você toca em enviar, volta para o app e a próxima pessoa já aparece.</p>
      <div class="imp-kpis"><div class="ok"><b class="num">${todos.length}</b><span>com telefone neste filtro</span></div><div><b class="num">${jaHoje}</b><span>já ${pag ? "avisados" : "cobrados"} hoje</span></div>${semTel ? `<div class="bad"><b class="num">${semTel}</b><span>sem telefone</span></div>` : ""}</div>
      ${jaHoje ? `<label class="selall"><input type="checkbox" id="seqHoje" checked> Pular quem já foi ${pag ? "avisado" : "cobrado"} hoje</label>` : ""}
      <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit">${ico("wa")} Começar</button></div></div>`,
    () => { const pula = $("#seqHoje") && $("#seqHoje").checked; const f = pula ? todos.filter(p => !hoje(p)) : todos;
      if (!f.length) { closeModal(); toast("Todos já foram cobrados hoje."); return; } cobrarSequencia(f); });
    return;
  }
  const fila = soEstes || todos, feitos = new Set(), pulados = new Set();
  let i = 0;
  const passo = () => {
    if (i >= fila.length) {
      if (!EXTRA()) { closeModal(); toast(`${pag ? "Aviso" : "Cobrança"} concluído: ${fila.length} pessoa(s)`); return; }
      const pl = fila.filter(p => pulados.has(p.id) && !feitos.has(p.id));
      modal(`
        <h3>${pag ? "Aviso" : "Cobrança"} concluída</h3>
        <div class="imp-kpis"><div class="ok"><b class="num">${feitos.size}</b><span>${pag ? "avisados" : "cobrados"}</span></div><div class="${pl.length ? "bad" : ""}"><b class="num">${pl.length}</b><span>pulados</span></div></div>
        ${pl.length ? `<details open><summary>Pulados (${pl.length})</summary><ul class="imp-list">${pl.map(p => `<li><b>${esc(p.nome)}</b> <span class="hint">${esc(p.telefone || "")}</span></li>`).join("")}</ul></details>` : `<p class="hint" style="margin:0">Todo mundo da lista recebeu a mensagem.</p>`}
        <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Fechar</button>${pl.length ? `<button class="btn primary" type="button" id="seqDeNovo">${ico("wa")} Cobrar os pulados</button>` : ""}</div></div>`, () => {});
      const dn = $("#seqDeNovo"); if (dn) dn.onclick = () => cobrarSequencia(pl);
      return;
    }
    const p = S.P.find(x => x.id === fila[i].id) || fila[i];
    modal(`
      <h3>${pag ? "Avisar" : "Cobrar"} ${i + 1} de ${fila.length}</h3>
      <div class="bar"><i style="width:${pct(i, fila.length)}%"></i></div>
      <div><b style="font-size:18px">${famPre(p)}${esc(p.nome)}</b><div class="pendtags">${pag ? '<span class="chip wait">Boleto pendente</span>' : pendDe(p).map(k => `<span class="chip wait">${PEND[k]}</span>`).join("")}</div>
        <small class="hint">${esc(p.telefone || "")} · ${esc(p.adm || "Sem ADM")}${(pag ? p.cobradoPagEm : p.cobradoEm) ? (pag ? " · avisado " : " · cobrado ") + esc(quando(pag ? p.cobradoPagEm : p.cobradoEm)) : ""}</small></div>
      <div class="field"><label for="f-txt">Mensagem (pode ajustar antes de enviar)</label><textarea id="f-txt" style="min-height:130px">${esc(texto(p))}</textarea></div>
      <div class="modal-foot"><div><button class="btn ghost" type="button" data-close-btn>Parar</button>${EXTRA() && i ? `<button class="btn ghost" type="button" id="seqVoltar">Voltar</button>` : ""}</div>
        <div class="actions"><button class="btn" type="button" id="seqPular">Pular</button><a class="btn primary" id="seqWa" href="#" target="_blank" rel="noopener">${ico("wa")} Abrir WhatsApp</a></div></div>`, () => {});
    const vb = $("#seqVoltar"); if (vb) vb.onclick = () => { i--; passo(); };
    const wa = $("#seqWa");
    const atual = () => { wa.href = waCobrar(p, $("#f-txt").value); };
    atual(); $("#f-txt").addEventListener("input", atual);
    wa.addEventListener("click", () => { registrar(p); feitos.add(p.id); i++; setTimeout(passo, 400); });
    $("#seqPular").onclick = () => { pulados.add(p.id); i++; passo(); };
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
  return S.hist.filter(x => !String(x.doc_id || "").startsWith("dash-hist-")).map(histLinha).filter(x => (!h.quem || x.quem === h.quem) && (!h.aba || x.aba === h.aba) && (!h.acao || x.acao === h.acao)
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
    <p class="hint" style="margin:0">Envie a planilha de assinaturas (.csv ou .xlsx, colunas Nome, E-mail, Status e Tipo). Só quem está como <b>Assinado</b> fica com o termo assinado no app. Quem está como Enviado não muda de status${TERMO_LINK() ? ", mas o <b>link do termo</b> de cada pessoa fica guardado para ir junto na cobrança" : ""}.</p>
    ${pre ? `<p class="hint" style="margin:0">Reconheci a planilha como <b>assinaturas do termo</b>.</p>` : ""}
    <div class="field" ${pre ? "hidden" : ""}><label for="f-ass">Planilha</label><input id="f-ass" type="file" accept=".csv,.xlsx,.xls"></div>
    <div id="assPrev" class="imp-prev"></div>
    <div class="modal-foot"><span></span><div class="actions"><button class="btn ghost" type="button" data-close-btn>Cancelar</button><button class="btn primary" type="submit" id="assBtn" disabled>Atualizar</button></div></div>`,
  () => {
    if (!A || !(A.marcar.length + A.links.length)) return;
    closeModal();
    const mud = new Map();
    A.links.forEach(({ p, link }) => mud.set(p.id, { termoLink: link }));
    A.marcar.forEach(({ p, data }) => mud.set(p.id, { ...(mud.get(p.id) || {}), termo: "assinado", ...(data ? { termoAssinadoEm: data } : {}) }));
    const lista = [...mud.entries()];
    save(async () => { for (let i = 0; i < lista.length; i += 8) await Promise.all(lista.slice(i, i + 8).map(([id, d]) => api.update("pessoas", id, d))); },
      [A.marcar.length && `Termo assinado: ${A.marcar.length}`, A.links.length && `link do termo salvo: ${A.links.length}`].filter(Boolean).join(" · "));
    marcarImport("assinaturas", [A.marcar.length && `${A.marcar.length} assinado(s)`, A.links.length && `${A.links.length} link(s)`].filter(Boolean).join(" · "));
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
          ${TERMO_LINK() ? `<div class="ok"><b class="num">${A.links.length}</b><span>links do termo novos</span></div>` : ""}
        </div>
        ${TERMO_LINK() && A.links.length ? `<p class="hint" style="margin:6px 0">O link de cada pessoa fica guardado na ficha e vai junto na mensagem quando você cobrar o termo.</p>` : ""}
        <details open><summary>Vão ficar com termo assinado (${A.marcar.length})</summary><ul class="imp-list">${A.marcar.map(({ p, n }) => li(n, ` · era ${esc((TERMO.find(t => t.v === p.termo) || {}).l || "Pendente")}${norm(p.nome) !== norm(n.nome) ? ` · no app: ${esc(p.nome)}` : ""}`)).join("") || '<li class="hint">Ninguém novo.</li>'}</ul></details>
        ${A.ja.length ? `<details><summary>Já estavam assinados no app (${A.ja.length})</summary><ul class="imp-list">${A.ja.map(x => li(x)).join("")}</ul></details>` : ""}
        ${A.nao.length ? `<details open><summary class="bad-text">Assinaram, mas não achei no app (${A.nao.length})</summary><p class="hint" style="margin:6px 0">Confira se o nome está escrito diferente no app e marque o termo na ficha.</p><ul class="imp-list">${A.nao.map(n => li(n, n.email ? " · " + esc(n.email) : "")).join("")}</ul></details>` : ""}`;
      const nL = A.links.length;
      $("#assBtn").disabled = !(A.marcar.length + nL);
      if (!(A.marcar.length + nL)) marcarImport("assinaturas", "nada mudou");
      $("#assBtn").textContent = A.marcar.length + nL ? [A.marcar.length && `Marcar ${A.marcar.length} como assinado`, nL && `salvar ${nL} link(s)`].filter(Boolean).join(" e ") : "Nada para atualizar";
    } catch (err) { console.error(err); prev.innerHTML = `<div class="bad-text">Não consegui ler esse arquivo.</div>`; }
  };
  if (pre) mostrar(pre);
  $("#f-ass").addEventListener("change", async e => {
    const f = e.target.files[0]; if (!f) return;
    impArquivo = f.name;
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
    marcarImport("avaliacoes", `${A.marcar.length} atualizado(s)`);
  });
  if (!A.marcar.length) marcarImport("avaliacoes", "nada mudou");
}
function analisarAssinaturas(linhas) {
  const h = (linhas[0] || []).map(x => norm(String(x)));
  const col = re => h.findIndex(x => re.test(x));
  const iN = col(/^nome/), iE = col(/mail/), iS = col(/^status/), iT = col(/^tipo/), iD = col(/data assinatura/), iL = col(/^link/);
  if (iN < 0 || iS < 0) return null;
  const rows = linhas.slice(1).filter(r => String(r[iN] || "").trim()).map(r => {
    const st = norm(String(r[iS] || "")), tp = norm(String(iT >= 0 ? r[iT] : ""));
    const dt = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(iD >= 0 ? r[iD] : ""));
    return { nome: String(r[iN]).trim(), email: String(iE >= 0 ? r[iE] : "").trim().toLowerCase(), telefone: "", tipo: /legend/.test(tp) ? "legendario" : "participante",
      assinado: /assinad/.test(st), enviado: /enviad/.test(st), data: dt ? `${dt[3]}-${dt[2]}-${dt[1]}` : "",
      link: iL >= 0 && /^https?:\/\//.test(String(r[iL] || "").trim()) ? String(r[iL]).trim() : "" };
  });
  const out = { assinados: 0, enviados: 0, marcar: [], ja: [], nao: [], links: [] }, vistos = new Set(), vistosL = new Set();
  rows.forEach(n => {
    if (TERMO_LINK() && n.link) { const a = acharNoApp(n); if (a && !vistosL.has(a.p.id)) { vistosL.add(a.p.id); if (a.p.termoLink !== n.link) out.links.push({ p: a.p, link: n.link, assinado: n.assinado }); } }
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
    impArquivo = f.name;
    try {
      const linhas = await lerPlanilha(f);
      if (ehAssinaturas(linhas)) { closeModal(); assinaturasForm(linhas); return; }
      if (ehAvaliacoes(linhas)) { closeModal(); avaliacoesForm(linhas); return; }
      if (ehEquipes(linhas)) { closeModal(); equipesImportForm(linhas); return; }
      if (VENDAS() && ehVendas(linhas)) { closeModal(); vendasImportForm(linhas, f.name); return; }
      R = analisarImport(lerRelatorio(linhas)); R.arquivo = f.name;
      prev.innerHTML = previewImport(R);
      $("#impBtn").disabled = !R.novos.length && !R.ja.length && !R.canc.some(c => c.p) && !R.fora.length;
      $("#impBtn").textContent = R.novos.length ? `Importar ${R.novos.length} novo(s)` : "Aplicar";
      if ($("#impBtn").disabled) marcarImport("inscricoes", "ninguém novo");
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
  if (!novos.length && !completar.length && !cancelar.length && !excluir.length) { toast("Nada para importar."); marcarImport("inscricoes", "ninguém novo"); return; }
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
  marcarImport("inscricoes", [novos.length && `${novos.length} novo(s)`, cancelar.length && `${cancelar.length} cancelado(s)`, excluir.length && `${excluir.length} excluído(s)`].filter(Boolean).join(" · ") || "dados conferidos");
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
    else if (/^cel-/.test(n.doc_id)) { const st = novo("status"); if (!st) return null; i = "phone"; a = "Celulares"; c = `Celulares: ${n.nome || "legendário"} · ${CEL_TXT[st] || st}`; }
    else if (/^mural-/.test(n.doc_id) && n.acao === "mural") { i = "chat"; a = "Comunicação"; c = n.nome || "Novo recado"; }
    else if (n.doc_id === "lembretes" && n.acao === "lembrete") { i = "clock"; a = "Comunicação"; return { i, a, t: "Lembrete para hoje", c: n.nome || "" }; }
    else if (/^mural-|^comvisto-|^lembretes$|^aprend-|^chamada-|^turnos-|^entregas-|^loc-/.test(n.doc_id) && (COM() || CAMPO())) { i = "chat"; a = "Comunicação"; c = /^chamada-/.test(n.doc_id) ? "Fez uma chamada" : /^turnos-/.test(n.doc_id) ? "Mudou a escala de turnos" : /^entregas-/.test(n.doc_id) ? "Marcou entregas no camp" : /^aprend-/.test(n.doc_id) ? "Anotou um aprendizado" : /^lembretes$/.test(n.doc_id) ? "Mexeu nos lembretes" : null; if (!c) return null; }
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
    return r.length ? r.slice(0, 60).map(p => `<button type="button" class="saude-li" data-saude="${p.id}"><span><b>${famPre(p)}${esc(p.nome)}</b> <span class="hint">${tipoNome(p)}${p.idade ? " · " + p.idade + " anos" : ""}</span></span>${saudeAlerta(p) ? '<span class="tag saude">Saúde</span>' : ""}</button>`).join("") : `<div class="empty">Ninguém com esse nome.</div>`; };
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
  if (DEMO && D2()) { ["pessoas", "tops"].forEach(sub); setTimeout(() => ["tarefas", "estoque", "pista"].forEach(sub), Math.max(0, 2800 - (Date.now() - splashStart)) + 1400); }   // demonstração: mostra o esqueleto de carregamento por um instante
  else ["pessoas", "tarefas", "estoque", "pista", "tops"].forEach(sub);
  db.collection("config").onSnapshot(snap => {
    S.cfgDocs = Object.fromEntries(snap.docs.map(d => [d.id, d.data()])); S.loaded.config = true;
    // cria a ficha de horários do TOP enquanto tem internet: assim, sem internet, cada ADM só acrescenta o seu horário (não sobrescreve o dos outros)
    const ficha = podeEditar() && ME.id ? cronoDocId(eu()) : null;
    S.cronoCriando = S.cronoCriando || new Set();
    if (ficha && navigator.onLine !== false && !db.estado().offline && !S.cfgDocs[ficha] && !S.cronoCriando.has(ficha)) {
      S.cronoCriando.add(ficha); db.doc("config/" + ficha).set({ _adm: eu() }).catch(() => {}).finally(() => S.cronoCriando.delete(ficha)); }
    if (["cronograma", "consagracao", "pins", "painel", "usuarios", "participantes", "legendarios", "aovivo", "ocorrencias", "tops"].includes(S.view)) render();
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
