"use strict";
/* =====================================================================
   Banco do app. As telas falam com um "banco de documentos" simples
   (coleção → documentos JSON). Aqui ele é ligado ao Supabase (tabela
   adm_docs, com tempo real) ou à memória, no modo demonstração.
   ===================================================================== */
(() => {
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

/* Cache em memória + ouvintes. `fonte` faz a leitura/gravação de verdade. */
function criarBanco(fonte) {
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
    avisar(col, id);
  }
  async function carregar() {
    const linhas = await fonte.carregar();
    const cols = new Set([...cache.keys()]);
    cache.forEach(m => m.clear());
    linhas.forEach(r => { colMap(r.col).set(r.id, r.data); cols.add(r.col); });
    cols.forEach(c => avisar(c));
  }
  const iniciar = () => pronto || (pronto = carregar().then(() => fonte.ouvir((col, id, data) => aplicar(col, id, data))));
  // grava na hora na tela; se o banco recusar, recarrega do servidor para desfazer
  async function gravar(col, id, local, remoto) {
    const antes = colMap(col).get(id);
    aplicar(col, id, local);
    try { await remoto(); }
    catch (e) { if (antes === undefined) colMap(col).delete(id); else colMap(col).set(id, antes); avisar(col, id); throw e; }
  }
  function docRef(col, id) {
    return {
      id,
      async get() { await iniciar(); return snapDoc(col, id); },
      set(data) { return gravar(col, id, clone(data), () => fonte.gravar(col, id, data)); },
      update(patch) { const cur = colMap(col).get(id) || {}; return gravar(col, id, { ...cur, ...clone(patch) }, () => fonte.mesclar(col, id, patch)); },
      delete() { return gravar(col, id, null, () => fonte.apagar(col, id)); },
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
        async add(data) { const id = novoId(); await gravar(col, id, clone(data), () => fonte.gravar(col, id, data, true)); return { id }; },
        onSnapshot(cb, onErr) {
          if (!ouvCol.has(col)) ouvCol.set(col, new Set()); ouvCol.get(col).add(cb);
          iniciar().then(() => cb(snapCol(col)), e => onErr && onErr(e));
          return () => ouvCol.get(col).delete(cb);
        },
      };
    },
    doc(path) { const [col, id] = path.split("/"); return docRef(col, id); },
    recarregar: () => (pronto ? carregar() : iniciar()),
  };
}

/* Supabase: tabela adm_docs. As permissões (RLS) decidem o que cada um vê e altera. */
function fonteSupabase(sb, onStatus) {
  const ok = r => { if (r.error) throw r.error; return r.data; };
  return {
    async carregar() {
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
  return {
    async carregar() { return clone(linhas); },
    async gravar(col, id, data) { const i = idx(col, id); if (i >= 0) linhas[i].data = clone(data); else linhas.push({ col, id, data: clone(data) }); },
    async mesclar(col, id, patch) { const i = idx(col, id); if (i >= 0) Object.assign(linhas[i].data, clone(patch)); },
    async apagar(col, id) { const i = idx(col, id); if (i >= 0) linhas.splice(i, 1); },
    ouvir() {},
  };
}

window.ADM_DADOS = { criarBanco, fonteSupabase, fonteMemoria, novoId };
})();
