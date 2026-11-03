/* ADM 3COLINAS · página de confirmação de presença de um evento com a prévia certa no WhatsApp.
   O WhatsApp não roda JavaScript: aqui o título, a descrição e a imagem do convite já vão no HTML (tags og:).
   O resto é a mesma acao.html. Link curto /c/<token>[-<nº da equipe>]: busca os dados do evento pela RPC adm_acao_link (só leitura). */
const URL_SB = "https://jgoewqyfihdzpurlvaxe.supabase.co", KEY_SB = "sb_publishable_QBxqFv2T9W-4-XTj_OSVEA_d1olCthu";
const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let cache = null;

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host, base = `https://${host}`;
  const q = new URL(req.url, base).searchParams;
  let I = {}, longo = "";
  if (q.get("c")) {   // link curto: monta o mesmo "i" que o app montaria
    try { const code = String(q.get("c")).toLowerCase().slice(0, 40);
      const r = await fetch(URL_SB + "/rest/v1/rpc/adm_acao_link", { method: "POST", headers: { "Content-Type": "application/json", apikey: KEY_SB }, body: JSON.stringify({ p_code: code }) });
      const j = r.ok ? await r.json() : null;
      if (j && j.ev) { const a = j.ev, R = (a.resp || []).filter(x => x && x.eq), eqI = +(code.split("-")[1] || 0), rr = R[eqI - 1];
        I = { t: a.titulo, d: a.data, h: a.hora, l: a.local, e: a.endereco, q: rr ? rr.eq : R.length > 1 ? "Legendários Base 3 Colinas" : a.equipe, v: 2, x: a.aberto && !rr ? 1 : 0, ...(rr ? { fe: rr.eq, m: String(rr.oque || "").slice(0, 160), n: rr.homens || 0 } : {}) };
        const p = new URLSearchParams({ t: j.t, top: j.top, a: j.a, i: Buffer.from(JSON.stringify(I), "utf8").toString("base64") }); longo = "/api/convite?" + p.toString(); }
    } catch (e) {}
  } else { try { I = JSON.parse(Buffer.from(String(q.get("i") || ""), "base64").toString("utf8")); } catch (e) {} }
  const titulo = (I.fe ? `Equipe ${I.fe}, precisamos de você no ${I.t || "evento"}` : String(I.t || "Convite")).slice(0, 110);
  let quando = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(I.d || "")) {
    const d = new Date(I.d + "T12:00:00-03:00");
    quando = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
    quando = quando[0].toUpperCase() + quando.slice(1) + (I.h ? " às " + String(I.h).slice(0, 5) : "");
  }
  const desc = [I.fe && I.m && String(I.m).slice(0, 80), quando, I.l && String(I.l).slice(0, 80), "Toque para confirmar sua presença"].filter(Boolean).join(" · ");
  try {
    if (!cache) { const r = await fetch(base + "/acao.html"); cache = await r.text(); }
  } catch (e) { res.statusCode = 302; res.setHeader("Location", "/acao.html?" + q.toString()); return res.end(); }
  const og = `<base href="/">
<meta property="og:type" content="website"><meta property="og:site_name" content="Legendários · Base 3 Colinas">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${base}/assets/convite-og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(base + req.url)}"><meta name="twitter:card" content="summary_large_image">
<meta name="description" content="${esc(desc)}">`;
  // link curto: a página troca o endereço pelo completo antes de rodar (a acao.html lê tudo do endereço)
  const fix = longo ? `<script>history.replaceState(null, "", ${JSON.stringify(longo)})</script>\n` : "";
  const html = cache.replace(/<meta property="og:[^>]*>/g, "").replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)} · Convite</title>\n${og}\n${fix}`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(html);
};
