/* ADM 3COLINAS · envia as notificações com o app fechado (Web Push).
   Quem chama é o próprio banco (supabase/push.sql), a cada mudança em adm_docs.
   A chave privada VAPID vem no pedido, guardada só no Supabase; aqui só conferimos que combina com a pública do app. */
const webpush = require("web-push");

const VAPID_PUB = "BDxZeBfN6aI5VHiCjJAKEkj7S9GSXC0VSEYKZN4kiSA5x2PmmgACCDqd3n6wubEYsd1ed9dfXEF5DkyMZMXePtA";

const CAMPOS = { nome: "Nome", telefone: "Telefone", email: "E-mail", atestado: "Atestado", termo: "Termo", dataAtestado: "Previsão do atestado",
  cidade: "Cidade", idade: "Idade", familia: "Família", nfc: "NFC", msgGrupo: "Mensagem do grupo", noGrupo: "Entrou no grupo", obs: "Observações",
  equipe: "Equipe", status: "Status", inscricao: "Inscrição", ficha: "Dados da inscrição", tipo: "Tipo", mais40: "+40",
  cobradoEm: "Cobrado em", cobradoPagEm: "Avisado do boleto em", pagoEm: "Pagamento confirmado em" };
const IGNORAR = ["adm", "admId", "admEm", "atualizado", "importId", "obsPor", "obsEm"];
const VALORES = {
  atestado: { pendente: "Pendente", enviada: "Msg enviada", aguardando: "Aguardando", confirmado: "Confirmado", apto: "Apto" },
  termo: { pendente: "Pendente", enviada: "Msg enviada", aguardando: "Aguardando", assinado: "Assinado", nao: "Não assinou" },
  inscricao: { cancelada: "Compra cancelada", pendente: "Pagamento pendente", ativa: "Ativa" },
};
const fmtDia = d => { const [a, m, dd] = String(d).split("-"); return dd && m ? `${dd}/${m}` : String(d); };
function valor(k, v) {
  if (v == null || v === "") return "vazio";
  if (VALORES[k] && VALORES[k][v]) return VALORES[k][v];
  if (k === "familia") return "Família " + String(v).padStart(2, "0");
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return "atualizado";
  if (/Em$/.test(k) && /^\d{4}-\d\d-\d\d/.test(v)) return fmtDia(String(v).slice(0, 10));
  return String(v).slice(0, 60);
}

// texto da notificação para cada tipo de mudança
function mensagem(b) {
  const novo = b.novo || {}, antes = b.antes || {}, quem = b.ator || "Um ADM";
  const mudou = k => JSON.stringify(novo[k]) !== JSON.stringify(antes[k]);
  if (b.tipo === "aviso") {
    const a = novo;
    return { title: "Planilha atualizada · ADM 3Colinas", body: `${a.novosP || 0} novo(s) senderista(s) e ${a.novosL || 0} legendário(s)${a.pagPend ? ` · ${a.pagPend} com pagamento pendente` : ""}. Importado por ${a.por || quem}.`, tag: "adm3-aviso" };
  }
  if (b.tipo === "novidade") return { title: (novo.tipo === "msg" ? "" : "Novidade no app: ") + (novo.titulo || "ADM 3Colinas"), body: String(novo.texto || "").slice(0, 300), tag: "adm3-novidade" };
  let txt = null;
  if (b.col === "pessoas") {
    const campos = Object.keys(novo).filter(k => !IGNORAR.includes(k) && mudou(k));
    if (b.antes && !campos.length) return null;
    txt = `${novo.nome || "Cadastro"} · ` + (b.antes ? campos.slice(0, 3).map(k => `${CAMPOS[k] || k}: ${valor(k, novo[k])}`).join(" · ")
      : `novo cadastro em ${novo.tipo === "legendario" ? "Legendários" : "Senderistas"}`);
  } else if (b.col === "config") {
    const id = String(b.id || ""), c = /^consag-(\d{4}-\d\d-\d\d)$/.exec(id);
    if (c) txt = `Consagração ${fmtDia(c[1])}: lista com ${(novo.nomes || []).length} pessoa(s)`;
    else if (/^crono-.+-adm-/.test(id)) {
      const k = Object.keys(novo).find(k => k[0] !== "_" && mudou(k)); if (!k) return null;
      const a = novo[k] || {}, z = antes[k] || {}, nome = a.atv || "um momento";
      txt = "Cronograma: " + (a.fim && a.fim !== z.fim ? `terminou ${nome} às ${a.fim}` : a.ini && a.ini !== z.ini ? `iniciou ${nome} às ${a.ini}` : `ajustou ${nome}`);
    } else if (/^pin-/.test(id)) {
      if (!mudou("status")) return null;
      txt = `Pins: ${novo.nome || "alguém"} ${novo.status === "entregue" ? "recebeu o pin" : "voltou para pendente"}`;
    } else if (/^equipes-|^cronoplano-/.test(id)) txt = /^equipes-/.test(id) ? "mudou as equipes" : "mudou o plano do cronograma";
    else if (id === "consag-alias") txt = "Consagração: uniu ou separou nomes";
    else return null;
  } else {
    txt = `${{ tarefas: "Checklist", estoque: "Estoque", pista: "Pista", tops: "Tops" }[b.col] || b.col}: ${novo.titulo || novo.item || novo.nome || "registro"} ${b.antes ? "atualizado" : "criado"}`;
  }
  const extra = b.extra > 0 ? ` (+${b.extra} outra(s) mudança(s) desde o último aviso)` : "";
  return { title: `${quem} atualizou o app`, body: txt + extra, tag: "adm3-ativ-" + (b.ator || "") };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ erro: "use POST" }); return; }
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (!b.vapid || b.vapid.pub !== VAPID_PUB || !b.vapid.priv) { res.status(403).json({ erro: "chave inválida" }); return; }
  const msg = mensagem(b);
  const subs = (b.subs || []).filter(s => s && s.endpoint);
  if (!msg || !subs.length) { res.status(200).json({ enviados: 0 }); return; }
  webpush.setVapidDetails("https://adm-3colinas.vercel.app", VAPID_PUB, b.vapid.priv);
  const carga = JSON.stringify({ ...msg, url: "./" });
  const r = await Promise.allSettled(subs.map(s => webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, { TTL: 86400 })));
  // inscrições que o navegador já cancelou (404/410); o app cria outra quando a pessoa abre de novo
  const mortos = r.map((x, i) => x.status === "rejected" && [404, 410].includes(x.reason && x.reason.statusCode) ? subs[i].endpoint : null).filter(Boolean);
  res.status(200).json({ enviados: r.filter(x => x.status === "fulfilled").length, mortos });
};
module.exports.mensagem = mensagem;
