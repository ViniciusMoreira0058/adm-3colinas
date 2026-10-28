/* NFC 3COLINAS: lacra a ficha de saúde para gravar na tag e abre de novo na leitura.
   A ficha vai dentro do link da tag (depois do #, que nunca sai do celular), cifrada com AES-GCM
   e uma chave tirada do código da equipe médica. Sem o código, quem ler a tag vê só letras embaralhadas.
   Serve para o app (gravar) e para e.html (ler, inclusive sem internet). */
window.NFC3 = (function () {
  const SAL = new TextEncoder().encode("3colinas-nfc-v1");
  const COMORB = ["Bariátrico", "Diabético", "Convulsões", "Desmaios", "Prob. alimentares", "Depressão", "Cuidados psiquiátricos", "Prob. respiratórios",
    "Prob. musculoesqueléticos", "Cardíaco", "Problemas renais", "Morte súbita na família", "Pressão alta", "Histórico oncológico", "Problemas na coluna"];
  // ordem dos campos dentro da tag (lista, não objeto, para caber em tags pequenas)
  const CAMPOS = ["t", "nome", "nascimento", "sangue", "peso", "altura", "plano", "comorb", "alergias", "medicacoes", "cirurgias", "outras", "emergNome", "emergTel", "emergParent", "conjuge", "conjugeTel", "top", "demo", "em"];
  const b64 = u => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const deB64 = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  const chave = cod => crypto.subtle.importKey("raw", new TextEncoder().encode(String(cod).trim().toUpperCase()), "PBKDF2", false, ["deriveKey"])
    .then(k => crypto.subtle.deriveKey({ name: "PBKDF2", salt: SAL, iterations: 150000, hash: "SHA-256" }, k, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]));
  const passa = (u, Tipo, fmt) => new Response(new Blob([u]).stream().pipeThrough(new Tipo(fmt))).arrayBuffer().then(b => new Uint8Array(b));
  const temZip = typeof CompressionStream === "function";
  async function selar(f, cod) {
    const lista = CAMPOS.map(k => f[k] == null ? "" : f[k]);
    while (lista.length && lista[lista.length - 1] === "") lista.pop();
    let u = new TextEncoder().encode(JSON.stringify(lista)), z = 0;
    if (temZip) { const c = await passa(u, CompressionStream, "deflate-raw"); if (c.length < u.length) { u = c; z = 1; } }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await chave(cod), u));
    const out = new Uint8Array(1 + 12 + ct.length); out[0] = z; out.set(iv, 1); out.set(ct, 13);
    return b64(out);
  }
  async function abrir(txt, cod) {
    const b = deB64(txt), iv = b.slice(1, 13);
    let u = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await chave(cod), b.slice(13)));
    if (b[0] === 1) u = await passa(u, DecompressionStream, "deflate-raw");
    const lista = JSON.parse(new TextDecoder().decode(u)), f = {};
    CAMPOS.forEach((k, i) => { f[k] = lista[i] == null ? "" : lista[i]; });
    return f;
  }
  // tamanho que a tag precisa ter (bytes livres aproximados de cada modelo para um link)
  const TAGS = [["NTAG213", 132], ["NTAG215", 492], ["NTAG216", 854]];
  const tagPara = url => { const n = new TextEncoder().encode(url).length; return { n, tag: (TAGS.find(([, m]) => n <= m) || [null])[0] }; };
  return { selar, abrir, tagPara, COMORB, CAMPOS };
})();
