// Fundos importados da equipe (xlide_kv "bgs" — no navegador, localStorage "xlide.v2.bgs").
// Importar por link: pin do Pinterest (vídeo ou imagem; pin.it também), link direto .mp4/.webm/.jpg/.png, ou YouTube (vira loop:).
// O vídeo do Pinterest é copiado para o Storage do XLIDE (xlide-media/bgs/…): o projetor não depende do Pinterest.
// GET /api/backgrounds → lista · POST /api/backgrounds { urls: [...], name?, tags? } → importa · MCP: import_background, list_backgrounds.
import { hasSupabase, rest, uploadMedia } from "./_supabase.js";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const MAX_BYTES = 40 * 1024 * 1024;

const ytId = (u) => (String(u).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || null;
const isPin = (u) => /(^|\.)pinterest\.[a-z.]+\/pin\/|(^|\/\/)pin\.it\//i.test(String(u));
// <meta property="og:x" content="…"> ou <meta content="…" property="og:x"> (o Pinterest usa a segunda)
const meta = (html, p) => (html.match(new RegExp(`<meta[^>]+(?:property|name)="${p}"[^>]+content="([^"]*)"`, "i")) || html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${p}"`, "i")) || [])[1] || "";
const unesc = (s) => String(s).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Página pública de um pin → { video (mp4 720p), image, title, pin }. */
export async function pinterestMedia(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" }, redirect: "follow", signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Pinterest respondeu ${res.status}.`);
  const html = await res.text();
  const pin = (res.url.match(/\/pin\/(\d+)/) || url.match(/\/pin\/(\d+)/) || [])[1] || null;
  const mp4s = [...new Set(html.match(/https:\/\/v1\.pinimg\.com\/videos\/[^"'\\\s]+?\.mp4/g) || [])];
  // a maior até 1080 (720w é o padrão dos pins); sem largura no nome, a primeira
  const score = (u) => { const w = +(u.match(/_(\d{3,4})w\.mp4/) || u.match(/\/(\d{3,4})p\//) || [])[1] || 0; return w > 1080 ? -1 : w; };
  const video = mp4s.sort((a, b) => score(b) - score(a))[0] || null;
  // capa: o quadro do próprio vídeo; senão a imagem do pin (og:image)
  const vthumb = (html.match(/https:\/\/i\.pinimg\.com\/videos\/thumbnails\/originals\/[^"'\\\s]+?\.(?:jpg|png)/) || [])[0];
  const image = vthumb || unesc(meta(html, "og:image")) || null;
  const title = unesc(meta(html, "og:title") || meta(html, "og:description")).replace(/\s*\|\s*Pinterest.*$/i, "").slice(0, 80);
  if (!video && !image) throw new Error("Não achei vídeo nem imagem neste pin (ele pode ser privado).");
  return { video, image, title, pin };
}

async function copyToStorage(src, path) {
  const r = await fetch(src, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const len = +(r.headers.get("content-length") || 0);
  if (len > MAX_BYTES) throw new Error("vídeo grande demais (> 40 MB)");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("vídeo grande demais (> 40 MB)");
  return uploadMedia(path, buf, r.headers.get("content-type") || "video/mp4");
}

export async function listBackgrounds() {
  if (!hasSupabase) return [];
  const r = await rest(`xlide_kv?select=value&key=eq.bgs`).catch(() => []);
  return Array.isArray(r[0]?.value) ? r[0].value : [];
}
async function saveList(list) {
  await rest("xlide_kv", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ key: "bgs", value: list.slice(0, 400) }]) });
}

/** Um link → item da biblioteca { id, bg, kind, thumb, name, source, from, tags }. bg é o que vai no slide. */
export async function resolveBackground(raw, { name = "", tags = [], copy = true } = {}) {
  const url = String(raw || "").trim();
  if (!/^https?:\/\//i.test(url)) throw new Error(`Link inválido: ${url}`);
  const yt = ytId(url);
  if (yt) return { id: "yt_" + yt, bg: "loop:" + yt, kind: "video", thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, name: name || "YouTube", source: "youtube", from: url, tags };
  if (isPin(url)) {
    const m = await pinterestMedia(url);
    const id = "pin_" + (m.pin || Date.now().toString(36));
    let bg = m.video || m.image, kind = m.video ? "video" : "image";
    if (copy && hasSupabase) bg = await copyToStorage(bg, `bgs/${id}.${kind === "video" ? "mp4" : (bg.split(".").pop() || "jpg").split("?")[0]}`).catch(() => bg);
    return { id, bg, kind, thumb: m.image, name: name || m.title || "Pinterest", source: "pinterest", from: url, tags };
  }
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return { id: "v_" + Buffer.from(url).toString("base64url").slice(-12), bg: url, kind: "video", thumb: null, name: name || "Vídeo", source: "link", from: url, tags };
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return { id: "i_" + Buffer.from(url).toString("base64url").slice(-12), bg: url, kind: "image", thumb: url, name: name || "Imagem", source: "link", from: url, tags };
  throw new Error(`Não sei importar este link: ${url}. Use um pin do Pinterest, YouTube ou um link direto de vídeo/imagem.`);
}

/** Importa vários links de uma vez; os já importados (mesmo pin/vídeo) não repetem. */
export async function importBackgrounds(urls, opts = {}) {
  const list = await listBackgrounds(), out = [], errors = [];
  for (const u of [].concat(urls || []).slice(0, 20)) {
    try {
      const it = await resolveBackground(u, opts);
      const i = list.findIndex((x) => x.id === it.id);
      if (i >= 0) list.splice(i, 1);
      list.unshift({ ...it, added: new Date().toISOString() });
      out.push(it);
    } catch (e) { errors.push({ url: u, error: String(e.message || e) }); }
  }
  if (out.length && hasSupabase) await saveList(list);
  return { imported: out, errors, total: list.length };
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      // quem importa precisa ser da equipe (o navegador manda o token da sessão)
      const { requireActor } = await import("./_auth.js");
      const actor = await requireActor(req, res, "edit");
      if (!actor) return;
      return res.status(200).json(await importBackgrounds(body.urls || body.url, { name: body.name, tags: body.tags }));
    }
    return res.status(200).json({ backgrounds: await listBackgrounds() });
  } catch (e) {
    return res.status(500).json({ error: "backgrounds_failed", message: String(e.message || e) });
  }
}
