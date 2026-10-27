/* Service worker do ADM 3Colinas: deixa o app instalável e abre a última versão
   guardada quando estiver sem internet. Os dados vêm sempre do Supabase. */
const CACHE = "adm3-v5";
const ARQUIVOS = ["./", "index.html", "app.js", "dados.js", "demo.js", "manifest.webmanifest",
  "assets/bg.jpg", "assets/logo.png", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// rede primeiro (sempre a versão mais nova); sem internet, usa a cópia guardada
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
