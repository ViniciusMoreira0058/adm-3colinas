"use strict";
/* =====================================================================
   Banco do app. As telas falam com um "banco de documentos" simples
   (coleção → documentos JSON). Aqui ele é ligado ao Supabase (tabela
   adm_docs, com tempo real) ou à memória, no modo demonstração.
   ===================================================================== */
(() => {
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

/* Erro de rede (sem internet, servidor fora do ar, sessão vencida): a alteração fica na fila e tenta de novo. */
const ehRede = e => (typeof navigator !== "undefined" && navigator.onLine === false)
  || /failed to fetch|load failed|networkerror|network request failed|fetch failed|timeout|jwt|token|sem conex/i.test(String((e && (e.message || e)) || ""));
// internet fraca (trilha): desiste depois de alguns segundos e usa o que está guardado
const comPrazo = (pr, ms) => Promise.race([pr, new Promise((_, no) => setTimeout(() => no(new Error("timeout: sem conexão")), ms))]);
const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* Cache em memória + ouvintes. `fonte` faz a leitura/gravação de verdade.
   Com `opc.chave`, os dados ficam guardados no aparelho e o app funciona sem internet:
   as alterações vão para uma fila e são enviadas quando a conexão volta. */
function criarBanco(fonte, opc = {}) {
  const kCache = opc.chave && "adm3-cache-" + opc.chave, kFila = opc.chave && "adm3-fila-" + opc.chave;
  let fila = (kFila && ls.get(kFila)) || [];
  let offline = false, enviando = null, falhas = 0;
  const avisarFila = () => opc.onFila && opc.onFila({ pendentes: fila.length, offline, falhas });
  const salvarFila = () => { if (kFila) ls.set(kFila, fila); avisarFila(); };
  let tSalvar = null;
  const salvarCache = () => { if (!kCache) return; clearTimeout(tSalvar); tSalvar = setTimeout(() => {
    const linhas = []; cache.forEach((m, col) => m.forEach((data, id) => linhas.push({ col, id, data })));
    ls.set(kCache, { em: new Date().toISOString(), linhas });
  }, 300); };
  const cache = new Map();          // col → Map(id → data)
  const ouvCol = new Map();         // col → Set(cb)
  const ouvDoc = new Map();         // "col/id" → Set(cb)
  let pronto = null;
  const colMap = col => { if (!cache.has(col)) cache.set(col, new Map()); return cache.get(col); };
  const snapCol = col => ({ docs: [...colMap(col)].map(([id, d]) => ({ id, data: () => clone(d) })) });
  const snapDoc = (col, id) => { const d = colMap(col).get(id); return { id, exists: d !== undefined, data: () => clone(d) }; };
  function avisar(col, id) {
    (ouvCol.get(col) || []).forEach(cb => cb(snapCol(col)));
    if (id != null) (ouvDoc.get(col + "/" + id) || []).forEach(cb => cb(snapDoc(col, id)));
    else ouvDoc.forEach((set, k) => { if (k.startsWith(col + "/")) set.forEach(cb => cb(snapDoc(col, k.slice(col.length + 1)))); });
  }
  function aplicar(col, id, data) {
    if (data === null) colMap(col).delete(id); else colMap(col).set(id, data);
    avisar(col, id); salvarCache();
  }
  // aplica na tela uma alteração da fila (usado depois de recarregar, para não "voltar" o que ainda não foi enviado)
  function aplicarOp(o) {
    const m = colMap(o.col);
    if (o.t === "del") m.delete(o.id);
    else if (o.t === "patch") m.set(o.id, { ...(m.get(o.id) || {}), ...clone(o.data) });
    else m.set(o.id, clone(o.data));
  }
  async function carregar() {
    let linhas;
    try { linhas = await fonte.carregar(); if (offline) { offline = false; avisarFila(); } }
    catch (e) {
      const guardado = kCache && ls.get(kCache);
      if (!guardado || !ehRede(e)) throw e;
      linhas = guardado.linhas; offline = true; avisarFila();
    }
    const cols = new Set([...cache.keys()]);
    cache.forEach(m => m.clear());
    linhas.forEach(r => { colMap(r.col).set(r.id, r.data); cols.add(r.col); });
    fila.forEach(o => { aplicarOp(o); cols.add(o.col); });
    cols.forEach(c => avisar(c));
    salvarCache();
  }
  const pendente = (col, id) => fila.some(o => o.col === col && o.id === id);
  const iniciar = () => pronto || (pronto = carregar().then(() => {
    // o que chega em tempo real não passa por cima do que ainda está na fila deste aparelho
    fonte.ouvir((col, id, data) => { if (!pendente(col, id)) aplicar(col, id, data); });
    if (fila.length) sincronizar();
  }));
  // envia a fila em ordem; para no primeiro erro de rede e tenta de novo depois
  function sincronizar() {
    if (enviando || !fila.length) return enviando || Promise.resolve();
    enviando = (async () => {
      let enviou = 0;
      try { if (fonte.preparar) await fonte.preparar(); } catch (e) { offline = true; avisarFila(); return; }
      while (fila.length) {
        const o = fila[0];
        try { await executar(o); offline = false; }
        catch (e) {
          if (ehRede(e)) { offline = true; break; }
          falhas++; console.error("Alteração recusada pelo servidor", o, e);   // sem permissão, por exemplo: descarta
        }
        fila.shift(); enviou++; salvarFila();
      }
      avisarFila();
      if (enviou) { try { await carregar(); } catch (e) {} if (opc.onEnviado) opc.onEnviado(enviou); }
    })().finally(() => { enviando = null; });
    return enviando;
  }
  const executar = o => o.t === "del" ? fonte.apagar(o.col, o.id) : o.t === "patch" ? fonte.mesclar(o.col, o.id, o.data) : fonte.gravar(o.col, o.id, o.data);
  // grava na hora na tela; sem internet, guarda na fila; se o banco recusar, desfaz
  async function gravar(col, id, local, op) {
    const antes = colMap(col).get(id);
    aplicar(col, id, local);
    const naFila = () => { fila.push({ ...op, col, id, em: Date.now() }); salvarFila(); };
    if (typeof navigator !== "undefined" && navigator.onLine === false) offline = true;
    if (kFila && (fila.length || offline)) { naFila(); sincronizar(); return; }
    try { await (op.t === "add" ? fonte.gravar(col, id, op.data, true) : executar(op)); }
    catch (e) {
      if (kFila && ehRede(e)) { offline = true; naFila(); return; }
      if (antes === undefined) colMap(col).delete(id); else colMap(col).set(id, antes); avisar(col, id); salvarCache(); throw e;
    }
  }
  function docRef(col, id) {
    return {
      id,
      async get() { await iniciar(); return snapDoc(col, id); },
      set(data) { return gravar(col, id, clone(data), { t: "set", data: clone(data) }); },
      update(patch) { const cur = colMap(col).get(id) || {}; return gravar(col, id, { ...cur, ...clone(patch) }, { t: "patch", data: clone(patch) }); },
      delete() { return gravar(col, id, null, { t: "del" }); },
      onSnapshot(cb, onErr) {
        const k = col + "/" + id; if (!ouvDoc.has(k)) ouvDoc.set(k, new Set()); ouvDoc.get(k).add(cb);
        iniciar().then(() => cb(snapDoc(col, id)), e => onErr && onErr(e));
        return () => ouvDoc.get(k).delete(cb);
      },
    };
  }
  return {
    collection(col) {
      return {
        doc: id => docRef(col, id),
        async add(data) { const id = novoId(); await gravar(col, id, clone(data), { t: "add", data: clone(data) }); return { id }; },
        onSnapshot(cb, onErr) {
          if (!ouvCol.has(col)) ouvCol.set(col, new Set()); ouvCol.get(col).add(cb);
          iniciar().then(() => cb(snapCol(col)), e => onErr && onErr(e));
          return () => ouvCol.get(col).delete(cb);
        },
      };
    },
    doc(path) { const [col, id] = path.split("/"); return docRef(col, id); },
    recarregar: () => (pronto ? sincronizar().then(carregar) : iniciar()),
    sincronizar,
    estado: () => ({ pendentes: fila.length, offline, falhas }),
  };
}

/* Supabase: tabela adm_docs. As permissões (RLS) decidem o que cada um vê e altera. */
function fonteSupabase(sb, onStatus) {
  const ok = r => { if (r.error) throw r.error; return r.data; };
  return {
    async preparar() {
      if (navigator.onLine === false) throw new TypeError("Failed to fetch");
      const { data, error } = await comPrazo(sb.auth.getSession(), 20000);
      if (error || !data.session) throw new Error("sem conexão (sessão não renovada)");
    },
    async carregar() {
      if (navigator.onLine === false) throw new TypeError("Failed to fetch");
      return comPrazo(this.baixar(), 15000);
    },
    async baixar() {
      const linhas = [];
      for (let de = 0; ; de += 1000) {
        const parte = ok(await sb.from("adm_docs").select("col,id,data").order("col").order("id").range(de, de + 999));
        linhas.push(...parte); if (parte.length < 1000) break;
      }
      return linhas;
    },
    async gravar(col, id, data, novo) {
      ok(novo ? await sb.from("adm_docs").insert({ col, id, data })
              : await sb.from("adm_docs").upsert({ col, id, data }, { onConflict: "col,id" }));
    },
    async mesclar(col, id, patch) { ok(await sb.rpc("adm_patch", { p_col: col, p_id: id, p_patch: patch })); },
    async apagar(col, id) { ok(await sb.from("adm_docs").delete().eq("col", col).eq("id", id)); },
    ouvir(aplicar) {
      sb.channel("adm-docs")
        .on("postgres_changes", { event: "*", schema: "public", table: "adm_docs" }, p => {
          if (p.eventType === "DELETE") { if (p.old && p.old.col) aplicar(p.old.col, p.old.id, null); }
          else aplicar(p.new.col, p.new.id, p.new.data);
        })
        .subscribe(st => onStatus && onStatus(st));
    },
  };
}

/* Demonstração: tudo na memória, some ao recarregar a página. */
function fonteMemoria(docs) {
  const linhas = clone(docs);
  const idx = (col, id) => linhas.findIndex(r => r.col === col && r.id === id);
  const rede = () => { if (navigator.onLine === false) throw new TypeError("Failed to fetch"); };
  return {
    async carregar() { return clone(linhas); },
    async gravar(col, id, data) { rede(); const i = idx(col, id); if (i >= 0) linhas[i].data = clone(data); else linhas.push({ col, id, data: clone(data) }); },
    async mesclar(col, id, patch) { rede(); const i = idx(col, id); if (i >= 0) Object.assign(linhas[i].data, clone(patch)); },
    async apagar(col, id) { rede(); const i = idx(col, id); if (i >= 0) linhas.splice(i, 1); },
    ouvir() {},
  };
}

window.ADM_DADOS = { comPrazo, criarBanco, fonteSupabase, fonteMemoria, novoId, ehRede, limparLocal: chave => { ls.del("adm3-cache-" + chave); ls.del("adm3-fila-" + chave); }, filaDe: chave => ls.get("adm3-fila-" + chave) || [] };
})();
