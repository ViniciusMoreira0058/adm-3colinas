/* Service worker do ADM 3Colinas: deixa o app instalável e faz ele abrir sem internet.
   Os arquivos do app vêm da rede quando dá (sempre a versão mais nova) e da cópia guardada quando não dá.
   Os dados não passam por aqui: ficam guardados pelo próprio app (dados.js) e vão para o Supabase quando a internet volta. */
const CACHE = "adm3-v47";
const ARQUIVOS = ["./", "index.html", "app.js", "dados.js", "cronograma.js", "demo.js", "manifest.webmanifest",
  "assets/bg.jpg", "assets/logo.png", "icons/icon-192.png", "icons/icon-512.png"];
// bibliotecas e fontes de fora (supabase-js, leitor de planilha, fonte Outfit)
const EXTERNOS = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js",
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap"];
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS).then(() => Promise.all(EXTERNOS.map(u => c.add(new Request(u, { mode: "cors" })).catch(() => {})))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const guardar = (req, r) => { if (r && (r.ok || r.type === "opaque")) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; };
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // bibliotecas com versão fixa: usa a guardada e atualiza por trás
  if (CDN.test(e.request.url)) {
    e.respondWith(caches.match(e.request).then(c => {
      const rede = fetch(e.request).then(r => guardar(e.request, r));
      if (c) { rede.catch(() => {}); return c; }
      return rede;
    }));
    return;
  }
  if (u.origin !== location.origin) return;   // Supabase e o resto: direto, sem cache
  // rede primeiro (sempre a versão mais nova); sem internet, usa a cópia guardada
  e.respondWith(fetch(e.request).then(r => guardar(e.request, r))
    .catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === "navigate" }).then(r => r || caches.match("index.html"))));
});
// tocar na notificação abre (ou traz para frente) o app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow("./")));
});
// notificação que chega com o app fechado (enviada por api/push.js); sempre mostra, o celular exige
self.addEventListener("push", e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { m = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(m.title || "ADM 3Colinas", {
    body: m.body || "Tem novidade no app.", icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    tag: m.tag || "adm3", renotify: true, data: { url: m.url || "./" } }));
});
