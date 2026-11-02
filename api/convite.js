/* ADM 3COLINAS · página de confirmação de presença de um evento com a prévia certa no WhatsApp.
   O WhatsApp não roda JavaScript: aqui o título, a descrição e a imagem do convite já vão no HTML (tags og:).
   O resto é a mesma acao.html. Não lê nem grava nada no banco. */
const esc = s => String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let cache = null;

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host, base = `https://${host}`;
  const q = new URL(req.url, base).searchParams;
  let I = {}; try { I = JSON.parse(Buffer.from(String(q.get("i") || ""), "base64").toString("utf8")); } catch (e) {}
  const titulo = String(I.t || "Convite").slice(0, 90);
  let quando = "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(I.d || "")) {
    const d = new Date(I.d + "T12:00:00-03:00");
    quando = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
    quando = quando[0].toUpperCase() + quando.slice(1) + (I.h ? " às " + String(I.h).slice(0, 5) : "");
  }
  const desc = [quando, I.l && String(I.l).slice(0, 80), "Toque para confirmar sua presença"].filter(Boolean).join(" · ");
  try {
    if (!cache) { const r = await fetch(base + "/acao.html"); cache = await r.text(); }
  } catch (e) { res.statusCode = 302; res.setHeader("Location", "/acao.html?" + q.toString()); return res.end(); }
  const og = `<base href="/">
<meta property="og:type" content="website"><meta property="og:site_name" content="Legendários · Base 3 Colinas">
<meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${base}/assets/convite-og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${esc(base + req.url)}"><meta name="twitter:card" content="summary_large_image">
<meta name="description" content="${esc(desc)}">`;
  const html = cache.replace(/<meta property="og:[^>]*>/g, "").replace(/<title>[^<]*<\/title>/, `<title>${esc(titulo)} · Convite</title>\n${og}`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(html);
};
