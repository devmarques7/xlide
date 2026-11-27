// MCP do XLIDE: decks e slides, textos em várias línguas, programas do culto e o relatório de auditoria.
// Tudo no Supabase (xlide_decks, xlide_programs), com a chave de serviço; cada mudança entra em xlide_audit com via = 'mcp'.
// Somado às ferramentas de boards em shared/board.js (ctx.extraTools / ctx.extraCall).
import { auditFeed, auditReport, currentActor, hasSupabase, rest } from "./_supabase.js";
import { CONTEXT_MD, SKILL_MD } from "../shared/skill.js";
import { getLyrics, translateLines } from "./_music.js";
import { addFont, searchFonts } from "./_fonts.js";
import { importBackgrounds, listBackgrounds } from "./_backgrounds.js";
import { searchBackgrounds } from "./_music.js";

const LANGS = ["pt", "en", "nl"];
const TEXT_FIELDS = ["eyebrow", "title", "subtitle", "body", "cta"];
const LAYOUTS = ["aura", "cover", "stats", "services", "gallery", "split", "statement", "contact", "image", "chapter", "questions", "reel", "moodboard", "lyrics"];
const STYLE_FIELDS = ["bg", "font", "tone", "section", "repeat", "at", "notes"];
const FOLDERS = ["avisos", "pregacao", "inicio", "oracao", "versiculo"];
const FILE_STATUS = ["ativo", "padrao", "arquivado", "lixeira"];
const TRANSITIONS = ["fade", "corte", "slide", "sobrepor"];
const ITEM_TYPES = ["wait", "prayer", "song", "notice", "video", "sermon", "pause", "media"];
const PROG_STATUS = ["rascunho", "salvo", "feito", "arquivado", "lixeira"];
const rid = (p) => p + Math.random().toString(36).slice(2, 10);
const enc = encodeURIComponent;

/* ── acesso ── */
async function getRow(table, id) { const r = await rest(`${table}?select=*&id=eq.${enc(id)}`); if (!r[0]) throw new Error(`Não encontrado em ${table}: ${id}`); return r[0]; }
async function upsert(table, row) { await rest(table, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([row]) }); }
const loadDeck = async (id) => (await getRow("xlide_decks", id)).doc;
async function saveDeck(d) { d.updatedAt = Date.now(); await upsert("xlide_decks", { id: d.id, title: txt(d.title, d.defaultLanguage), doc: d, kind: d.music ? "song" : "deck" }); return d; }
async function loadProg(id) { const r = await getRow("xlide_programs", id); return { ...r, doc: r.doc || {} }; }
async function saveProg(p) { const { created_at, updated_at, ...row } = p; await upsert("xlide_programs", row); return p; }

/* ── brand kits (xlide_brands): a identidade de um ministério, evento ou série, reusada em tudo ── */
async function findBrand(ref) {
  if (!ref) throw new Error("Diga qual brand kit (brand_id ou o nome, ex. Cafofo).");
  const byId = await rest(`xlide_brands?select=*&id=eq.${enc(ref)}`);
  if (byId[0]) return byId[0];
  const byName = await rest(`xlide_brands?select=*&title=ilike.*${enc(String(ref).trim())}*&order=updated_at.desc&limit=1`);
  if (byName[0]) return byName[0];
  throw new Error(`Brand kit não encontrado: ${ref}. Veja list_brands.`);
}
const brandOut = (r) => ({ id: r.id, name: r.title, ...r.doc, updated_at: r.updated_at });
/* identidade de deck a partir do kit (mesmos campos de set_deck_identity) */
function identityFromBrand(b, keepBoard) {
  const refs = [...(b.logos || []).map((x) => ({ url: x.url, note: "Logo" + (x.note ? " · " + x.note : "") })), ...(b.references || []), ...(b.images || []).map((x) => ({ url: x.url, note: x.note || "Imagem da marca" }))].filter((x) => x && x.url);
  const rules = [b.voice && "Tom de voz: " + b.voice, b.rules?.do?.length && "Fazer: " + b.rules.do.join("; "), b.rules?.dont?.length && "Evitar: " + b.rules.dont.join("; ")].filter(Boolean).join("\n");
  return { palette: (b.palette || []).map((c) => ({ hex: c.hex, name: c.name, role: ROLES.includes(c.role) ? c.role : "support" })), fonts: b.fonts ? { heading: b.fonts.heading, body: b.fonts.body } : undefined,
    references: refs.slice(0, 24), mood: b.about || b.voice || undefined, notes: rules || undefined, board: b.board_id || keepBoard, brand_id: b.id, apply: true };
}
/* aplica o kit num deck: identidade + (opcional) fundo/fonte/tom padrão em todos os slides */
function brandDeck(d, b, restyle, k = 0) {
  const keep = d.identity && d.identity.board;
  d.identity = { ...(d.identity || {}), ...Object.fromEntries(Object.entries(identityFromBrand(b, keep)).filter(([, v]) => v !== undefined)) };
  d.brand_id = b.id;
  applyIdentity(d);
  const sl = b.slides || {};
  // restyle: true = todos os slides; "fill" = só os que não trouxeram fundo/fonte próprios
  const fill = restyle === "fill";
  // música: fundos da rotação do kit (slides.song_bgs: [{ lyrics, cover }]), uma por música; letra em Creme, refrão no destaque
  const rot = d.music && Array.isArray(sl.song_bgs) && sl.song_bgs.length ? sl.song_bgs[k % sl.song_bgs.length] : null;
  if (restyle && rot) {
    d.slides.forEach((x, i) => { x.bg = i === 0 && rot.cover ? rot.cover : rot.lyrics || x.bg; if (sl.font) x.font = sl.font; x.tone = "dark"; });
    const pick = (r) => ((b.palette || []).find((c) => c.role === r) || {}).hex;
    d.music = { ...d.music, ...(pick("text") ? { ink: pick("text") } : {}), ...(pick("accent") ? { chorusInk: pick("accent") } : {}) };
    return d;
  }
  if (restyle) d.slides.forEach((x) => { if (sl.bg && !x.image && !(fill && x.bg)) x.bg = sl.bg; if (sl.font && !(fill && x.font)) x.font = sl.font; if (sl.tone && !(fill && x.tone)) x.tone = sl.tone; });
  return d;
}
const brandOf = async (ref) => { const r = await findBrand(ref); return { id: r.id, name: r.title, ...r.doc }; };
const BRAND_GUIDE = "Use o kit em tudo o que criar: fundo e fonte dos slides (slides.bg / slides.font / slides.tone), a cor accent só para destaque, o tom de voz nos textos, as regras (rules.do / rules.dont) e só imagens das references/images (URLs reais). Ao criar deck, música ou programa, passe brand_id.";

/* ── textos multilíngues (LText: string ou { pt, en, nl }) ── */
const txt = (v, l = "pt") => (v == null ? "" : typeof v === "string" ? v : v[l] ?? Object.values(v).find(Boolean) ?? "");
const setText = (v, l, text) => (v == null || typeof v === "string" ? (v && l !== "pt" ? { pt: v, [l]: text } : { [l]: text }) : { ...v, [l]: text });
const toLText = (v, l) => (v == null ? undefined : typeof v === "string" ? { [l]: v } : v);
function findSlide(d, ref) {
  const i = typeof ref === "number" || /^\d+$/.test(String(ref)) ? Number(ref) - 1 : d.slides.findIndex((s) => s.id === ref);
  if (i < 0 || i >= d.slides.length) throw new Error(`Slide não encontrado: ${ref} (use o id ou a posição 1..${d.slides.length}).`);
  return i;
}
function cleanSlide(raw, lang) {
  const s = { id: raw.id || rid("s_"), layout: LAYOUTS.includes(raw.layout) ? raw.layout : "statement" };
  for (const f of TEXT_FIELDS) if (raw[f] != null) s[f] = toLText(raw[f], lang);
  for (const k of ["image", "tone", "variant", "inverse", "items", "images", "bg", "font", "section", "repeat", "at"]) if (raw[k] != null) s[k] = raw[k];
  if (raw.notes != null) s.notes = toLText(raw.notes, lang);
  return s;
}
const deckSummary = (d) => ({ id: d.id, title: txt(d.title, d.defaultLanguage), languages: d.languages, slides: d.slides.length, updatedAt: d.updatedAt, ...(d.folder ? { folder: d.folder } : {}), ...(d.key ? { key: d.key } : {}), ...(d.notes ? { notes: d.notes } : {}) });
/* pasta de músicas (Biblioteca → Músicas): nome livre, ex. "Cafofo" */
const folderName = (v) => String(v || "").trim().replace(/\s+/g, " ").slice(0, 40);
const slideOutline = (d, l) => d.slides.map((s, i) => ({ n: i + 1, id: s.id, layout: s.layout, ...Object.fromEntries(TEXT_FIELDS.filter((f) => s[f] != null).map((f) => [f, txt(s[f], l)])), ...(s.image ? { image: s.image } : {}), ...(s.ai ? { ai_request: s.ai } : {}) }));

/* ── identidade do deck (cores, tipografia, referências, tom) e pedidos para a IA ── */
const ROLES = ["primary", "background", "text", "accent", "support"];
const HEX = /^#[0-9a-f]{6}$/i;
function cleanIdentity(raw = {}, base = {}) {
  const id = { ...base };
  if (Array.isArray(raw.palette)) id.palette = raw.palette.filter((c) => c && HEX.test(c.hex)).slice(0, 12).map((c) => ({ hex: c.hex, ...(c.name ? { name: String(c.name).slice(0, 40) } : {}), ...(ROLES.includes(c.role) ? { role: c.role } : {}) }));
  if (raw.fonts && typeof raw.fonts === "object") id.fonts = { ...(base.fonts || {}), ...Object.fromEntries(["heading", "body"].filter((k) => raw.fonts[k] != null).map((k) => [k, String(raw.fonts[k]).slice(0, 60) || undefined])) };
  if (Array.isArray(raw.references)) id.references = raw.references.filter((r) => r && /^(https?:|data:image\/)/.test(r.url || "")).slice(0, 30).map((r) => ({ url: r.url, ...(r.note ? { note: String(r.note).slice(0, 300) } : {}) }));
  for (const k of ["mood", "notes"]) if (raw[k] != null) id[k] = String(raw[k]).slice(0, 2000) || undefined;
  if (raw.board_id != null) id.board = raw.board_id || undefined;
  if (raw.apply != null) id.apply = !!raw.apply;
  return id;
}
/* o que a identidade muda no visual (igual a lookFromIdentity no app): destaque e tema */
function applyIdentity(d) {
  const id = d.identity || {};
  if (id.apply === false) return;
  const pal = id.palette || [], pick = (r) => (pal.find((c) => c.role === r) || {}).hex;
  const accent = pick("accent") || pick("primary") || (pal[0] && pal[0].hex);
  if (accent) d.accent = accent;
  const th = { light: pick("background"), dark: pick("text"), heading: id.fonts && id.fonts.heading, body: id.fonts && id.fonts.body };
  d.theme = { ...(d.theme || {}), ...Object.fromEntries(Object.entries(th).filter(([, v]) => v)) };
}
async function boardBrief(bid) {
  if (!bid) return null;
  try {
    const b = (await getRow("xlide_boards", bid)).doc || {};
    const items = (b.mood && b.mood.items) || [];
    return {
      id: bid, title: b.title, idea: b.idea,
      map: (b.nodes || []).slice(0, 80).map((n) => ({ kind: n.kind, title: n.title, ...(n.text ? { text: String(n.text).slice(0, 300) } : {}), ...(n.url ? { url: n.url } : {}) })),
      images: items.filter((i) => i.type === "image" && /^https?:/.test(i.src || i.url || "")).slice(0, 24).map((i) => ({ url: i.src || i.url, caption: i.caption })),
      colors: items.filter((i) => i.type === "color" && i.color).slice(0, 12).map((i) => ({ hex: i.color, name: i.name })),
      texts: items.filter((i) => (i.type === "text" || i.type === "note") && (i.text || i.title)).slice(0, 30).map((i) => String(i.title || i.text).slice(0, 200)),
    };
  } catch { return { id: bid, error: "board não encontrado" }; }
}
const IDENTITY_GUIDE = "Use a identidade em todo slide: cores da paleta (accent = destaque; background/text para tom claro/escuro), fontes de títulos/texto (o app já aplica), imagens com a mesma luz, cor e assunto das referências (só URLs https reais), e o tom descrito. Uma ideia por slide, pouco texto. Ao terminar, chame resolve_ai_request.";

/* ── programa ── */
function cleanItem(raw) {
  const type = ITEM_TYPES.includes(raw.type) ? raw.type : "notice";
  const it = { id: raw.id || rid("i_"), type, title: String(raw.title || type), planned: Math.max(10, Math.round((Number(raw.minutes) || Number(raw.planned) / 60 || 3) * 60)), advance: raw.advance || (["wait", "notice", "video", "media"].includes(type) ? "auto" : "manual"), public: raw.public !== false };
  for (const k of ["text", "owner", "area", "deck", "song", "media", "eyebrow", "bg", "font", "hidden"]) if (raw[k] != null) it[k] = raw[k];
  // vídeo por link (YouTube…) é um item media: é ele que toca o link no projetor
  if (type === "video" && raw.media) it.type = "media";
  if (raw.mute) it.mute = true;
  if (raw.track != null) it.bgm = trackOf(raw.track, raw.track_volume ?? (raw.mute ? 70 : undefined));
  if (raw.deck_id) it.deck = raw.deck_id;
  if (raw.song_id) it.song = raw.song_id;
  return it;
}
function findItem(p, ref) {
  const items = p.doc.items || [];
  const i = typeof ref === "number" || /^\d+$/.test(String(ref)) ? Number(ref) - 1 : items.findIndex((x) => x.id === ref);
  if (i < 0 || i >= items.length) throw new Error(`Item não encontrado: ${ref}`);
  return i;
}
/* Trilha de fundo de uma tela: "off", "mix1"/"mix2" (mix inteira), id ou link do YouTube (uma faixa). */
function trackOf(t, vol) {
  const v = String(t || "off").trim();
  if (v === "off" || v === "mix1" || v === "mix2") return { mode: v, vol: vol ?? 20 };
  const id = (v.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{6,})/) || [])[1] || (/^[\w-]{11}$/.test(v) ? v : null);
  if (!id) throw new Error(`Trilha inválida: ${t}. Use off, mix1, mix2, ou um link/id do YouTube.`);
  return { mode: "track:" + id, vol: vol ?? 20 };
}
const progSummary = (p) => ({ id: p.id, title: p.title, date: p.service_date, starts: p.starts_at, status: p.status, live: p.is_live, items: (p.doc.items || []).length, minutes: Math.round((p.doc.items || []).reduce((a, b) => a + (b.planned || 0), 0) / 60) });

const S = (props, required = []) => ({ type: "object", properties: props, required });
const slideProps = { bg: { type: "string", description: "Fundo: wash:<ember|amber|crimson|dusk|ocean|midnight|teal|mist|gold>, loop:<id YouTube>, plain:<papel|tinta|grade|coluna|sabado|brasa>, ou URL de imagem/vídeo" }, font: { type: "string", description: "Fonte: grotesk, serif, condensed, mono (as 4 da casa) ou o nome de QUALQUER família do catálogo (Google Fonts, Fontshare, Fontsource, ~2100) ou importada pela equipe, ex. \"Lexend\". Use search_fonts para achar." }, tone: { type: "string", enum: ["dark", "light"] }, section: { type: "string", enum: ["intro", "verse", "prechorus", "chorus", "bridge", "tag", "instrumental", "outro"] }, repeat: { type: "number" }, at: { type: "number", description: "Segundo da música em que o slide entra" }, notes: { type: "string", description: "Notas do apresentador" }, layout: { type: "string", enum: LAYOUTS }, eyebrow: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, body: { type: "string" }, cta: { type: "string" }, image: { type: "string", description: "URL https real de imagem" } };
const itemProps = { type: { type: "string", enum: ITEM_TYPES }, title: { type: "string" }, minutes: { type: "number" }, text: { type: "string" }, owner: { type: "string" }, area: { type: "string", enum: ["music", "sound", "comms", "pulpit"] }, deck_id: { type: "string" }, song_id: { type: "string" }, media: { type: "string", description: "Link do YouTube, Vimeo, Spotify ou arquivo, para itens media (o vídeo toca no projetor)" }, mute: { type: "boolean", description: "Só para vídeo (item media): true = toca SEM o áudio original do vídeo; o som da tela vem de `track` (a trilha que a pessoa escolheu). false volta o áudio do vídeo." }, advance: { type: "string", enum: ["auto", "manual"] }, public: { type: "boolean" }, track: { type: "string", description: "Trilha de fundo desta tela (toca no computador do console → mesa de som): off, mix1, mix2, ou link/id do YouTube de uma faixa. Com mute: true, é ela que toca por cima do vídeo sem som." }, track_volume: { type: "number" } };

export const LIVE_TOOLS = [
  { name: "search_fonts", description: "Busca fontes no catálogo do XLIDE (Google Fonts, Fontshare, Fontsource: ~2100 famílias) e nas importadas pela equipe. Filtros: nome (q), categoria (sans, serif, display, script, mono) e origem. O nome que voltar pode ir direto em font (slides, músicas, brand kit).", inputSchema: S({ q: { type: "string" }, category: { type: "string", enum: ["sans", "serif", "display", "script", "mono"] }, source: { type: "string", enum: ["google", "fontshare", "fontsource", "custom"] }, limit: { type: "number" } }) },
  { name: "add_font", description: "Importa uma fonte por link (arquivo .woff2, .woff, .ttf ou .otf em https) para toda a equipe usar nos slides. Só com fontes que a igreja tem licença para usar.", inputSchema: S({ family: { type: "string" }, url: { type: "string" }, category: { type: "string", enum: ["sans", "serif", "display", "script", "mono"] }, weight: { type: "number" } }, ["family", "url"]) },
  { name: "import_background", description: "Importa fundos para a biblioteca do XLIDE a partir de links: pin do Pinterest (vídeo ou imagem; o vídeo 720p é copiado para o Storage do XLIDE), YouTube (vira loop:) ou link direto .mp4/.webm/.jpg/.png. Até 20 por vez. Devolve o valor `bg` para usar em slides, músicas e brand kits. Só com vídeos que a igreja pode projetar.", inputSchema: S({ urls: { type: "array", items: { type: "string" } }, name: { type: "string" }, tags: { type: "array", items: { type: "string" } } }, ["urls"]) },
  { name: "list_backgrounds", description: "Lista os fundos da equipe: importados (Pinterest, links, YouTube) com o `bg` de cada um, mais os loops e cores da casa.", inputSchema: S({ source: { type: "string", enum: ["pinterest", "youtube", "link"] } }) },
  { name: "search_backgrounds", description: "Busca vídeos de fundo (ex. \"worship background\", \"light rays\", \"clouds\") no Pexels, com licença livre, em 16:9. Para guardar um, chame import_background com o url que voltar. Precisa da chave PEXELS_API_KEY na Vercel.", inputSchema: S({ q: { type: "string" } }, ["q"]) },
  { name: "list_brands", description: "Lista os brand kits (identidade de um ministério, evento ou série, ex. Cafofo): nome, sobre, cores e fontes. Quando a pessoa citar um ministério/evento, procure o kit dele aqui antes de criar.", inputSchema: S({}) },
  { name: "get_brand", description: "Lê um brand kit inteiro (por id ou nome): sobre, público, tom de voz, paleta com o uso de cada cor, fontes, logos, referências, imagens, regras (fazer/evitar) e o visual padrão dos slides (bg, font, tone). Leia antes de criar deck, música ou programa para aquele ministério.", inputSchema: S({ brand_id: { type: "string" }, name: { type: "string" } }) },
  { name: "save_brand", description: "Cria (sem brand_id) ou atualiza um brand kit. Só os campos enviados mudam; listas enviadas substituem as antigas. Nunca invente cores, fontes, logos ou URLs: use o que a pessoa deu ou o que veio de uma fonte (outro app, site da marca).", inputSchema: S({
    brand_id: { type: "string" }, name: { type: "string" }, about: { type: "string", description: "Quem é / o que é" }, audience: { type: "string" }, voice: { type: "string", description: "Tom de voz" }, tagline: { type: "string" },
    palette: { type: "array", items: S({ hex: { type: "string" }, name: { type: "string" }, role: { type: "string", enum: ROLES }, use: { type: "string", description: "Onde usar (ex. fundo dos slides, destaque)" } }, ["hex"]) },
    fonts: S({ heading: { type: "string" }, body: { type: "string" }, accent: { type: "string" }, extra: { type: "array", items: { type: "string" }, description: "Outras fontes do kit (destaque, versículo…)" }, notes: { type: "string" } }),
    logos: { type: "array", items: S({ url: { type: "string" }, note: { type: "string" } }, ["url"]) }, references: { type: "array", items: S({ url: { type: "string" }, note: { type: "string" } }, ["url"]) }, images: { type: "array", items: S({ url: { type: "string" }, note: { type: "string" } }, ["url"]) },
    rules: S({ do: { type: "array", items: { type: "string" } }, dont: { type: "array", items: { type: "string" } } }),
    slides: S({ bg: { type: "string", description: "Fundo padrão: wash:<ember|amber|crimson|dusk|ocean|midnight|teal|mist|gold>, plain:<papel|tinta|grade|coluna|sabado|brasa>, loop:<id YouTube> ou URL de imagem" }, font: { type: "string", description: "Fonte: grotesk, serif, condensed, mono (as 4 da casa) ou o nome de QUALQUER família do catálogo (Google Fonts, Fontshare, Fontsource, ~2100) ou importada pela equipe, ex. \"Lexend\". Use search_fonts para achar." }, tone: { type: "string", enum: ["dark", "light"] }, song_bgs: { type: "array", description: "Fundos das músicas, em rotação (cada música pega o próximo): [{ lyrics: URL do fundo da letra, cover: URL da capa }]", items: S({ lyrics: { type: "string" }, cover: { type: "string" } }) } }),
    board_id: { type: "string", description: "Board com o moodboard/mapa da marca" }, links: { type: "object" }, notes: { type: "string" } }) },
  { name: "apply_brand", description: "Aplica um brand kit: em decks/músicas (deck_id, deck_ids ou uma pasta de músicas inteira com folder) grava a identidade (cores, fontes, referências) e, com restyle (padrão), o fundo/fonte/tom do kit em todos os slides; num programa (program_id) liga o kit e põe o fundo/fonte do kit nos itens que não são música nem vídeo.", inputSchema: S({ brand_id: { type: "string" }, name: { type: "string" }, deck_id: { type: "string" }, deck_ids: { type: "array", items: { type: "string" } }, folder: { type: "string" }, program_id: { type: "string" }, restyle: { type: "boolean" } }) },
  { name: "list_decks", description: "Lista os decks e músicas do XLIDE (id, título, línguas, nº de slides, pasta, tom). Filtros: texto no título, tipo (deck ou song) e pasta de músicas (folder, ex. \"Cafofo\"). Devolve também as pastas que existem.", inputSchema: S({ query: { type: "string" }, kind: { type: "string", enum: ["deck", "song"] }, folder: { type: "string" } }) },
  { name: "retime_song", description: "Acerta os tempos da letra de uma música que já existe, para os slides seguirem a música ao dar play (mesmo id, pasta e visual). Usa o vídeo da música ou outro youtube_url (o áudio que vai tocar passa a ser esse). offset (segundos, + atrasa, − adianta) corrige um deslocamento fixo.", inputSchema: S({ deck_id: { type: "string" }, youtube_url: { type: "string" }, offset: { type: "number" } }, ["deck_id"]) },
  { name: "update_song", description: "Ajusta uma música já criada: pasta (folder, Biblioteca → Músicas; \"\" tira da pasta), tom (key, ex. \"C\", \"A\"), notas para a banda (notes, ex. \"Am · G · F\"), título, o look da letra em todos os slides (bg, font, tone) e o ajuste do fundo (brightness, saturation, contrast: 1 = original, ex. 0.6 = mais escuro, saturation 0 = preto e branco; blur em px).", inputSchema: S({ deck_id: { type: "string" }, brightness: { type: "number" }, saturation: { type: "number" }, contrast: { type: "number" }, blur: { type: "number" }, folder: { type: "string" }, key: { type: "string" }, notes: { type: "string" }, title: { type: "string" }, bg: { type: "string" }, font: { type: "string", description: "Fonte: grotesk, serif, condensed, mono (as 4 da casa) ou o nome de QUALQUER família do catálogo (Google Fonts, Fontshare, Fontsource, ~2100) ou importada pela equipe, ex. \"Lexend\". Use search_fonts para achar." }, tone: { type: "string", enum: ["dark", "light"] } }, ["deck_id"]) },
  { name: "get_deck", description: "Lê um deck: cada slide com posição, id, layout e textos na língua pedida.", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS } }, ["deck_id"]) },
  { name: "create_deck", description: "Cria um deck inteiro em uma chamada (título, línguas e todos os slides). Textos na língua `lang`; depois use add_translations para as outras. Pode já levar a identidade (mesmos campos de set_deck_identity).", inputSchema: S({ brand_id: { type: "string", description: "Brand kit (id ou nome, ex. Cafofo): aplica cores, fontes e o visual padrão dos slides. Veja list_brands." }, title: { type: "string" }, lang: { type: "string", enum: LANGS }, languages: { type: "array", items: { type: "string", enum: LANGS } }, slides: { type: "array", items: S(slideProps) }, identity: { type: "object", description: "palette, fonts, references, mood, notes, board_id" } }, ["title", "slides"]) },
  { name: "get_deck_identity", description: "Lê a identidade de um deck (cores, tipografia, referências, tom, regras), o board ligado (mapa mental + moodboard) e os pedidos abertos para a IA. Leia antes de criar ou melhorar slides do deck.", inputSchema: S({ deck_id: { type: "string" } }, ["deck_id"]) },
  { name: "set_deck_identity", description: "Grava a identidade do deck (só os campos enviados): palette [{hex, name, role: primary|background|text|accent|support}], fonts {heading, body} (Google Fonts/Fontshare), references [{url, note}], mood, notes, board_id, apply. Com apply (padrão), a cor principal vira o destaque e as fontes valem nos slides.", inputSchema: S({ deck_id: { type: "string" }, palette: { type: "array", items: S({ hex: { type: "string" }, name: { type: "string" }, role: { type: "string", enum: ROLES } }, ["hex"]) }, fonts: S({ heading: { type: "string" }, body: { type: "string" } }), references: { type: "array", items: S({ url: { type: "string" }, note: { type: "string" } }, ["url"]) }, mood: { type: "string" }, notes: { type: "string" }, board_id: { type: "string" }, apply: { type: "boolean" } }, ["deck_id"]) },
  { name: "list_ai_requests", description: "Pedidos abertos para a IA feitos no editor (deck inteiro ou um slide), com o texto do pedido. Sem deck_id, lista de todos os decks.", inputSchema: S({ deck_id: { type: "string" }, include_done: { type: "boolean" } }) },
  { name: "resolve_ai_request", description: "Marca um pedido como feito (deck ou slide) com um resumo curto do que foi feito.", inputSchema: S({ deck_id: { type: "string" }, slide: { type: ["string", "number"], description: "Id ou posição; sem ele, o pedido do deck." }, summary: { type: "string" } }, ["deck_id"]) },
  { name: "add_slides", description: "Acrescenta slides a um deck (no fim ou depois da posição `after`).", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS }, after: { type: "number" }, slides: { type: "array", items: S(slideProps) } }, ["deck_id", "slides"]) },
  { name: "update_slide", description: "Edita um slide (por id ou posição 1..n): layout, imagem e textos na língua `lang`. Campos vazios ('') apagam o texto daquela língua.", inputSchema: S({ deck_id: { type: "string" }, slide: { type: ["string", "number"] }, lang: { type: "string", enum: LANGS }, ...slideProps }, ["deck_id", "slide"]) },
  { name: "move_slide", description: "Muda um slide de posição.", inputSchema: S({ deck_id: { type: "string" }, slide: { type: ["string", "number"] }, to: { type: "number" } }, ["deck_id", "slide", "to"]) },
  { name: "remove_slides", description: "Remove slides (ids ou posições).", inputSchema: S({ deck_id: { type: "string" }, slides: { type: "array", items: { type: ["string", "number"] } } }, ["deck_id", "slides"]) },
  { name: "missing_translations", description: "Lista os textos de um deck que ainda não têm a língua `lang`, com o texto de origem para traduzir.", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS }, from: { type: "string", enum: LANGS } }, ["deck_id", "lang"]) },
  { name: "add_translations", description: "Grava traduções de uma vez (slide + campo + texto) e acrescenta a língua ao deck. Use depois de missing_translations.", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS }, title: { type: "string", description: "Título do deck nessa língua" }, items: { type: "array", items: S({ slide: { type: ["string", "number"] }, field: { type: "string", enum: TEXT_FIELDS }, text: { type: "string" } }, ["slide", "field", "text"]) } }, ["deck_id", "lang", "items"]) },
  { name: "create_song", description: "Cria uma música (deck de letra) como no editor de música: do link do YouTube (letra e tempos das legendas) e/ou da letra colada ([Verso], [Refrão] marcam seções; linha em branco separa slides). Pode traduzir para outra língua. Já pode entrar numa pasta de músicas (folder, ex. \"Cafofo\") com o tom (key) e notas para a banda (notes).", inputSchema: S({ brand_id: { type: "string", description: "Brand kit (id ou nome, ex. Cafofo): aplica cores, fontes e o visual padrão dos slides. Veja list_brands." }, title: { type: "string" }, artist: { type: "string" }, youtube_url: { type: "string" }, lyrics: { type: "string" }, folder: { type: "string", description: "Pasta em Biblioteca → Músicas (nome livre; cria a pasta se não existir)" }, key: { type: "string", description: "Tom, ex. C, A, Am" }, notes: { type: "string", description: "Notas/acordes para a banda, ex. Am · G · F" }, lang: { type: "string", enum: LANGS }, translate_to: { type: "string", enum: LANGS }, lines_per_slide: { type: "number" }, bg: { type: "string" }, font: { type: "string", description: "Fonte: grotesk, serif, condensed, mono (as 4 da casa) ou o nome de QUALQUER família do catálogo (Google Fonts, Fontshare, Fontsource, ~2100) ou importada pela equipe, ex. \"Lexend\". Use search_fonts para achar." } }) },
  { name: "deck_links", description: "Links de um deck: editar, apresentar, tocar (música), controle remoto e a página do público.", inputSchema: S({ deck_id: { type: "string" } }, ["deck_id"]) },
  { name: "list_files", description: "Meus arquivos: lista por pasta (avisos, pregacao, inicio, oracao, versiculo) e estado (ativo, padrao, arquivado, lixeira).", inputSchema: S({ folder: { type: "string", enum: FOLDERS }, status: { type: "string", enum: FILE_STATUS } }) },
  { name: "save_file", description: "Cria ou atualiza um arquivo em Meus arquivos (ligado a um deck).", inputSchema: S({ id: { type: "string" }, name: { type: "string" }, folder: { type: "string", enum: FOLDERS }, deck_id: { type: "string" }, starred: { type: "boolean" } }, ["name"]) },
  { name: "set_file_status", description: "Arquiva, torna padrão, manda para a lixeira ou restaura um arquivo.", inputSchema: S({ id: { type: "string" }, status: { type: "string", enum: FILE_STATUS } }, ["id", "status"]) },
  { name: "set_program_settings", description: "Ajustes do programa para o ao vivo: transição entre telas (fade padrão, corte, slide, sobrepor) e piloto automático.", inputSchema: S({ program_id: { type: "string" }, transition: { type: "string", enum: TRANSITIONS }, autopilot: { type: "boolean" } }, ["program_id"]) },
  { name: "list_programs", description: "Lista os programas do culto (Programa Estúdio) com estado: rascunho, salvo, feito, arquivado, lixeira.", inputSchema: S({ status: { type: "string", enum: PROG_STATUS } }) },
  { name: "get_program", description: "Lê um programa com todos os itens na ordem (horário de cada um calculado).", inputSchema: S({ program_id: { type: "string" } }, ["program_id"]) },
  { name: "create_program", description: "Cria um programa inteiro (rascunho) com todos os itens em ordem. Itens podem apontar para decks (deck_id), músicas (song_id) ou links de vídeo/áudio (media). Vídeo do YouTube sem o áudio original e com outra trilha: type media + media (link do vídeo) + mute: true + track (link da trilha) + track_volume (0–100; com o vídeo mudo use 60–80).", inputSchema: S({ brand_id: { type: "string", description: "Brand kit (id ou nome, ex. Cafofo): aplica cores, fontes e o visual padrão dos slides. Veja list_brands." }, title: { type: "string" }, date: { type: "string", description: "AAAA-MM-DD" }, starts: { type: "string", description: "HH:MM" }, target_min: { type: "number" }, items: { type: "array", items: S(itemProps, ["type", "title"]) } }, ["title", "items"]) },
  { name: "add_program_items", description: "Acrescenta itens a um programa (no fim ou depois da posição `after`).", inputSchema: S({ program_id: { type: "string" }, after: { type: "number" }, items: { type: "array", items: S(itemProps, ["type", "title"]) } }, ["program_id", "items"]) },
  { name: "update_program_item", description: "Edita um item do programa (id ou posição): título, tipo, minutos, texto, responsável, deck, música, mídia, avanço, público, oculto, mute (tirar/voltar o áudio original do vídeo) e track/track_volume (a trilha que toca nesta tela).", inputSchema: S({ program_id: { type: "string" }, item: { type: ["string", "number"] }, hidden: { type: "boolean" }, ...itemProps }, ["program_id", "item"]) },
  { name: "move_program_item", description: "Muda um item de posição (os horários seguintes se recalculam).", inputSchema: S({ program_id: { type: "string" }, item: { type: ["string", "number"] }, to: { type: "number" } }, ["program_id", "item", "to"]) },
  { name: "remove_program_items", description: "Tira itens do programa: arquivar (padrão) ou mandar para a lixeira do programa.", inputSchema: S({ program_id: { type: "string" }, items: { type: "array", items: { type: ["string", "number"] } }, to: { type: "string", enum: ["arquivo", "lixeira"] } }, ["program_id", "items"]) },
  { name: "set_program_status", description: "Muda o estado (rascunho, salvo, feito, arquivado, lixeira) e/ou põe o programa no ao vivo.", inputSchema: S({ program_id: { type: "string" }, status: { type: "string", enum: PROG_STATUS }, live: { type: "boolean" } }, ["program_id"]) },
  { name: "duplicate_program", description: "Duplica um programa (por exemplo um culto já feito) como novo rascunho, com outra data.", inputSchema: S({ program_id: { type: "string" }, title: { type: "string" }, date: { type: "string" } }, ["program_id"]) },
  { name: "read_skill", description: "A skill XLIDE · especialista: como ser o designer de decks, o criador de programas de culto e o guia das rotas do XLIDE, mais o documento de contexto (rotas, dados, layouts, papéis). Leia no começo da conversa, antes da primeira tarefa no XLIDE.", inputSchema: S({ part: { type: "string", enum: ["skill", "context", "all"], description: "Padrão: all" } }) },
  { name: "get_audit_report", description: "Só admin. Relatório de uso e auditoria: páginas mais abertas, onde as pessoas têm dificuldade (erros, tentativas, buscas vazias), de onde saem, o que não encontram, jornadas (de qual página para qual), ações mais usadas, páginas lentas, cada pessoa e quem mudou o quê (app ou MCP).", inputSchema: S({ days: { type: "number" } }) },
  { name: "get_audit_feed", description: "Só admin. Linha do tempo do que as pessoas fizeram (páginas, ações, buscas, erros e mudanças), mais novo primeiro. Filtre por pessoa com person_id (id de get_audit_report → people).", inputSchema: S({ days: { type: "number" }, person_id: { type: "string" }, limit: { type: "number" } }) },
];
const NAMES = new Set(LIVE_TOOLS.map((t) => t.name));
export const isLiveTool = (n) => NAMES.has(n);

export async function callLiveTool(name, a = {}, origin = "") {
  if (!hasSupabase && name !== "read_skill" && name !== "search_fonts") throw new Error("Supabase não configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY). As ferramentas de decks, programas e auditoria precisam dele.");
  const lang = LANGS.includes(a.lang) ? a.lang : "pt";
  switch (name) {
    case "import_background": return await importBackgrounds(a.urls || a.url, { name: a.name, tags: a.tags });
    case "list_backgrounds": {
      const L = (await listBackgrounds()).filter((x) => !a.source || x.source === a.source);
      return { imported: L.map(({ id, bg, kind, name, source, from }) => ({ id, bg, kind, name, source, from })), house: { washes: ["ember", "amber", "crimson", "dusk", "ocean", "midnight", "teal", "mist", "gold"].map((w) => "wash:" + w), plain: ["papel", "tinta", "grade", "coluna", "sabado", "brasa"].map((p) => "plain:" + p) } };
    }
    case "search_backgrounds": {
      const r = await searchBackgrounds(a.q, process.env.PEXELS_API_KEY);
      if (r.error === "no_pexels_key") return { error: "no_pexels_key", message: "Falta a chave do Pexels (grátis em pexels.com/api) na Vercel: PEXELS_API_KEY. Enquanto isso, importe por link (Pinterest, YouTube) com import_background.", videos: [] };
      return r;
    }
    case "search_fonts": return await searchFonts(a);
    case "add_font": return await addFont(a);
    case "list_brands": {
      const rows = await rest(`xlide_brands?select=id,title,doc,updated_at&order=updated_at.desc&limit=100`);
      return { brands: rows.map((r) => ({ id: r.id, name: r.title, about: r.doc?.about ? String(r.doc.about).slice(0, 160) : undefined, colors: (r.doc?.palette || []).map((c) => c.hex), fonts: r.doc?.fonts, updated_at: r.updated_at })) };
    }
    case "get_brand": {
      const r = await findBrand(a.brand_id || a.name);
      const used = await rest(`xlide_decks?select=id,title,kind&doc->>brand_id=eq.${enc(r.id)}&limit=100`).catch(() => []);
      return { ...brandOut(r), used_by: used, how_to_use: BRAND_GUIDE };
    }
    case "save_brand": {
      // cria ou atualiza (só os campos enviados); listas enviadas substituem as antigas
      let row = null;
      if (a.brand_id) row = await findBrand(a.brand_id);
      const doc = { ...(row?.doc || {}) };
      for (const k of ["about", "audience", "voice", "tagline", "notes", "board_id", "links"]) if (a[k] !== undefined) doc[k] = a[k];
      if (a.palette) doc.palette = a.palette.map((c) => ({ hex: String(c.hex || "").toUpperCase(), name: c.name || "", role: ROLES.includes(c.role) ? c.role : "support", ...(c.use ? { use: c.use } : {}) })).filter((c) => /^#[0-9A-F]{6}$/.test(c.hex));
      if (a.fonts) doc.fonts = { ...(doc.fonts || {}), ...a.fonts };
      for (const k of ["logos", "references", "images"]) if (a[k]) doc[k] = a[k].filter((x) => x && /^https?:\/\//.test(x.url || ""));
      if (a.rules) doc.rules = { ...(doc.rules || {}), ...a.rules };
      if (a.slides) doc.slides = { ...(doc.slides || {}), ...a.slides };
      const id = row?.id || rid("br_"), name = a.name || row?.title || "Brand kit";
      await upsert("xlide_brands", { id, title: name, doc, ...(row ? {} : { source: "mcp" }) });
      return { ...brandOut({ id, title: name, doc }), link: `${origin || ""}/v2/marcas.html?b=${id}` };
    }
    case "apply_brand": {
      const r = await findBrand(a.brand_id || a.name), b = { id: r.id, name: r.title, ...r.doc };
      const out = { brand: r.title, decks: [], programs: [] };
      for (const id of [a.deck_id, ...(a.deck_ids || [])].filter(Boolean)) {
        const d = brandDeck(await loadDeck(id), b, a.restyle !== false); await saveDeck(d); out.decks.push({ id, title: txt(d.title, d.defaultLanguage) });
      }
      if (a.folder) {
        const rows = await rest(`xlide_decks?select=doc&limit=200`);
        let n = 0;
        for (const row of rows) { const d = row.doc; if (d && String(d.folder || "").toLowerCase() === String(a.folder).toLowerCase()) { brandDeck(d, b, a.restyle !== false, n++); await saveDeck(d); out.decks.push({ id: d.id, title: txt(d.title, d.defaultLanguage) }); } }
      }
      if (a.program_id) {
        const p = await loadProg(a.program_id); p.doc.brand_id = b.id;
        const sl = b.slides || {};
        if (a.restyle !== false) (p.doc.items || []).forEach((it) => { if (["song", "media"].includes(it.type)) return; if (sl.bg) it.bg = sl.bg; if (sl.font) it.font = sl.font; });
        await saveProg(p); out.programs.push({ id: p.id, title: p.title });
      }
      return out;
    }
    case "list_decks": {
      const rows = await rest(`xlide_decks?select=doc&order=updated_at.desc&limit=200${a.query ? `&title=ilike.*${enc(a.query)}*` : ""}${a.kind ? `&kind=eq.${a.kind}` : ""}`);
      const f = a.folder && folderName(a.folder).toLowerCase();
      const L = rows.map((r) => r.doc).filter((d) => d && (!f || String(d.folder || "").toLowerCase() === f));
      return { decks: L.map(deckSummary), folders: [...new Set(rows.map((r) => r.doc && r.doc.folder).filter(Boolean))] };
    }
    case "get_deck": { const d = await loadDeck(a.deck_id); return { ...deckSummary(d), ...(d.identity ? { identity: d.identity } : {}), ...(d.ai ? { ai_request: d.ai } : {}), slides: slideOutline(d, lang) }; }
    case "get_deck_identity": {
      const d = await loadDeck(a.deck_id);
      return { ...deckSummary(d), identity: d.identity || null, accent: d.accent || null, template: d.template || "editorial", theme: d.theme || null, board: await boardBrief(d.identity && d.identity.board),
        requests: [...(d.ai ? [{ scope: "deck", ...d.ai }] : []), ...d.slides.map((s, i) => (s.ai ? { scope: "slide", n: i + 1, slide_id: s.id, layout: s.layout, ...s.ai } : null)).filter(Boolean)],
        guide: d.identity ? IDENTITY_GUIDE : "Este deck ainda não tem identidade. Proponha uma (set_deck_identity) a partir do pedido e das referências antes de montar os slides." };
    }
    case "set_deck_identity": {
      const d = await loadDeck(a.deck_id);
      d.identity = cleanIdentity(a, d.identity || { apply: true });
      applyIdentity(d);
      await saveDeck(d); return { ...deckSummary(d), identity: d.identity, accent: d.accent, theme: d.theme };
    }
    case "list_ai_requests": {
      const rows = a.deck_id ? [{ doc: await loadDeck(a.deck_id) }] : await rest("xlide_decks?select=doc&kind=eq.deck&order=updated_at.desc&limit=200");
      const out = [];
      for (const { doc: d } of rows) {
        if (!d) continue;
        const open = (r) => r && (a.include_done || r.status !== "feito");
        if (open(d.ai)) out.push({ deck_id: d.id, deck: txt(d.title, d.defaultLanguage), scope: "deck", ...d.ai, has_identity: !!d.identity });
        (d.slides || []).forEach((s, i) => open(s.ai) && out.push({ deck_id: d.id, deck: txt(d.title, d.defaultLanguage), scope: "slide", n: i + 1, slide_id: s.id, ...s.ai, has_identity: !!d.identity }));
      }
      return { requests: out, next: out.length ? "Para cada pedido: get_deck_identity → crie/edite os slides → resolve_ai_request." : "Nenhum pedido aberto." };
    }
    case "resolve_ai_request": {
      const d = await loadDeck(a.deck_id);
      const target = a.slide != null ? d.slides[findSlide(d, a.slide)] : d;
      if (!target.ai) throw new Error("Não há pedido aberto aí.");
      target.ai = { ...target.ai, status: "feito", done: String(a.summary || "").slice(0, 300) || undefined };
      await saveDeck(d); return { ok: true, request: target.ai };
    }
    case "create_deck": {
      const now = Date.now(), languages = [...new Set([lang, ...(a.languages || []).filter((l) => LANGS.includes(l))])];
      const d = { id: rid("p_"), title: { [lang]: String(a.title) }, languages, defaultLanguage: lang, template: "editorial", slides: (a.slides || []).map((s) => cleanSlide(s, lang)), createdAt: now, updatedAt: now };
      if (!d.slides.length) throw new Error("Mande pelo menos um slide.");
      if (a.identity) { d.identity = cleanIdentity(a.identity, { apply: true }); applyIdentity(d); }
      if (a.brand_id) brandDeck(d, await brandOf(a.brand_id), "fill");
      await saveDeck(d); return { ...deckSummary(d), slides: slideOutline(d, lang) };
    }
    case "add_slides": {
      const d = await loadDeck(a.deck_id), at = a.after != null ? Math.max(0, Math.min(d.slides.length, Number(a.after))) : d.slides.length;
      d.slides.splice(at, 0, ...(a.slides || []).map((s) => cleanSlide(s, lang)));
      await saveDeck(d); return { ...deckSummary(d), slides: slideOutline(d, lang) };
    }
    case "update_slide": {
      const d = await loadDeck(a.deck_id), i = findSlide(d, a.slide), s = d.slides[i];
      if (a.layout && LAYOUTS.includes(a.layout)) s.layout = a.layout;
      if (a.image != null) a.image ? (s.image = a.image) : delete s.image;
      for (const f of TEXT_FIELDS) if (a[f] != null) s[f] = setText(s[f], lang, a[f]);
      for (const f of STYLE_FIELDS) if (a[f] != null) s[f] = f === "notes" ? setText(s[f], lang, a[f]) : a[f] === "" ? undefined : a[f];
      if (!d.languages.includes(lang)) d.languages.push(lang);
      await saveDeck(d); return { n: i + 1, ...slideOutline(d, lang)[i] };
    }
    case "move_slide": {
      const d = await loadDeck(a.deck_id), i = findSlide(d, a.slide), [s] = d.slides.splice(i, 1);
      d.slides.splice(Math.max(0, Math.min(d.slides.length, Number(a.to) - 1)), 0, s);
      await saveDeck(d); return { slides: slideOutline(d, lang) };
    }
    case "remove_slides": {
      const d = await loadDeck(a.deck_id), idx = new Set((a.slides || []).map((r) => findSlide(d, r)));
      if (idx.size >= d.slides.length) throw new Error("Um deck precisa de pelo menos um slide.");
      d.slides = d.slides.filter((_, i) => !idx.has(i)); await saveDeck(d); return deckSummary(d);
    }
    case "missing_translations": {
      const d = await loadDeck(a.deck_id), from = LANGS.includes(a.from) ? a.from : d.defaultLanguage || "pt", out = [];
      if (typeof d.title !== "object" || !d.title[lang]) out.push({ slide: 0, field: "deck_title", source: txt(d.title, from) });
      d.slides.forEach((s, i) => TEXT_FIELDS.forEach((f) => { if (s[f] == null) return; const has = typeof s[f] === "object" && s[f][lang]?.trim(); if (!has && txt(s[f], from).trim()) out.push({ slide: i + 1, slide_id: s.id, field: f, source: txt(s[f], from) }); }));
      return { deck_id: d.id, lang, from, missing: out.length, items: out };
    }
    case "add_translations": {
      const d = await loadDeck(a.deck_id);
      if (a.title) d.title = setText(d.title, lang, a.title);
      for (const t of a.items || []) { if (!TEXT_FIELDS.includes(t.field)) continue; const s = d.slides[findSlide(d, t.slide)]; s[t.field] = setText(s[t.field], lang, t.text); }
      if (!d.languages.includes(lang)) d.languages.push(lang);
      await saveDeck(d); return { ...deckSummary(d), written: (a.items || []).length };
    }
    case "list_programs": { const rows = await rest(`xlide_programs?select=*&order=service_date.desc.nullslast${a.status ? `&status=eq.${a.status}` : ""}`); return { programs: rows.map((r) => progSummary({ ...r, doc: r.doc || {} })) }; }
    case "get_program": {
      const p = await loadProg(a.program_id); let t = 0; const [h, m] = String(p.starts_at || "10:00").split(":").map(Number);
      const items = (p.doc.items || []).map((it, i) => { const at = h * 60 + m + t / 60; t += it.planned || 0; return { n: i + 1, at: `${String(Math.floor(at / 60) % 24).padStart(2, "0")}:${String(Math.floor(at % 60)).padStart(2, "0")}`, ...it }; });
      return { ...progSummary(p), items, archived: p.doc.archived || [], trash: p.doc.trash || [] };
    }
    case "create_program": {
      const p = { id: rid("pg_"), title: String(a.title), service_date: a.date || null, starts_at: a.starts || "10:00", target_min: a.target_min || null, status: "rascunho", is_live: false, doc: { items: (a.items || []).map(cleanItem), archived: [], trash: [] } };
      if (a.brand_id) { const b = await brandOf(a.brand_id), sl = b.slides || {}; p.doc.brand_id = b.id; p.doc.items.forEach((it) => { if (["song", "media"].includes(it.type)) return; if (sl.bg && !it.bg) it.bg = sl.bg; if (sl.font && !it.font) it.font = sl.font; }); }
      await saveProg(p); return progSummary(p);
    }
    case "add_program_items": {
      const p = await loadProg(a.program_id), items = p.doc.items || (p.doc.items = []);
      items.splice(a.after != null ? Math.max(0, Math.min(items.length, Number(a.after))) : items.length, 0, ...(a.items || []).map(cleanItem));
      await saveProg(p); return progSummary(p);
    }
    case "update_program_item": {
      const p = await loadProg(a.program_id), i = findItem(p, a.item), it = p.doc.items[i];
      const { program_id, item, minutes, deck_id, song_id, ...patch } = a;
      Object.assign(it, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      if (minutes != null) it.planned = Math.round(minutes * 60);
      if (deck_id != null) it.deck = deck_id; if (song_id != null) it.song = song_id;
      if (a.mute === false) delete it.mute;
      if (it.type === "video" && it.media) it.type = "media";
      if (a.track != null) { it.bgm = trackOf(a.track, a.track_volume ?? (it.mute ? 70 : undefined)); delete it.track; delete it.track_volume; }
      else if (a.track_volume != null && it.bgm) { it.bgm.vol = a.track_volume; delete it.track_volume; }
      await saveProg(p); return { n: i + 1, ...it };
    }
    case "move_program_item": {
      const p = await loadProg(a.program_id), i = findItem(p, a.item), [it] = p.doc.items.splice(i, 1);
      p.doc.items.splice(Math.max(0, Math.min(p.doc.items.length, Number(a.to) - 1)), 0, it);
      await saveProg(p); return progSummary(p);
    }
    case "remove_program_items": {
      const p = await loadProg(a.program_id), idx = (a.items || []).map((r) => findItem(p, r)).sort((x, y) => y - x);
      const bin = a.to === "lixeira" ? (p.doc.trash ||= []) : (p.doc.archived ||= []);
      for (const i of idx) { const [it] = p.doc.items.splice(i, 1); bin.push({ ...it, from: i, when: new Date().toISOString() }); }
      await saveProg(p); return progSummary(p);
    }
    case "set_program_status": {
      const p = await loadProg(a.program_id);
      if (a.status) { if (!PROG_STATUS.includes(a.status)) throw new Error("Estado inválido"); p.status = a.status; }
      if (a.live) await rest("xlide_programs?is_live=eq.true", { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ is_live: false }) });
      if (a.live != null) p.is_live = !!a.live;
      await saveProg(p); return progSummary(p);
    }
    case "duplicate_program": {
      const o = await loadProg(a.program_id);
      const p = { id: rid("pg_"), title: a.title || `${o.title} (cópia)`, service_date: a.date || null, starts_at: o.starts_at, target_min: o.target_min, status: "rascunho", is_live: false, doc: { ...o.doc, items: (o.doc.items || []).map((it) => ({ ...it, id: rid("i_") })), archived: [], trash: [] } };
      await saveProg(p); return progSummary(p);
    }
    case "create_song": {
      let lines = [], times = null, title = a.title, artist = a.artist, video = null, timing = null, matched = null;
      if (a.youtube_url) {
        const r = await getLyrics(a.youtube_url, lang);
        video = r.id || null; title ||= r.title; artist ||= r.author;
        if (!a.lyrics && r.lines?.length) { lines = r.lines; times = r.times || null; timing = r.timing || null; matched = r.matched ?? null; }
        if (!a.lyrics && !lines.length) throw new Error(`Não achei a letra desse vídeo (${r.error || "sem legenda"}). Cole a letra em lyrics.`);
      }
      if (a.lyrics) {
        lines = String(a.lyrics).split("\n");
        // letra colada + vídeo: o tempo de cada linha vem do próprio vídeo (legendas) ou da letra sincronizada
        if (video) {
          const t = await getLyrics(a.youtube_url, lang, { lines: lines.map((l) => (/^\s*\[.+\]\s*$/.test(l) ? "" : l)) }).catch(() => null);
          if (t?.times) { times = t.times; timing = t.timing; matched = t.matched; }
        }
      }
      if (!lines.length) throw new Error("Mande youtube_url ou lyrics.");
      // agrupa: seção [Nome] + linha em branco separam; senão N linhas por slide
      const per = Math.max(1, Math.min(6, Number(a.lines_per_slide) || 2)), SEC = { verso: "verse", verse: "verse", refrao: "chorus", "refrão": "chorus", chorus: "chorus", ponte: "bridge", bridge: "bridge", intro: "intro", final: "outro", outro: "outro", "pré-refrão": "prechorus", "pre-refrao": "prechorus", prechorus: "prechorus", tag: "tag" };
      const groups = []; let cur = [], sec, idx0 = 0;
      const push = () => { if (cur.length) { groups.push({ rows: cur, section: sec, i0: idx0 }); cur = []; } };
      lines.forEach((raw, i) => {
        const l = String(raw).trim(), m = l.match(/^\[(.+)\]$/);
        if (m) { push(); sec = SEC[m[1].toLowerCase().replace(/\s*\d+$/, "")] || undefined; return; }
        if (!l) return push();
        if (!cur.length) idx0 = i;
        cur.push(l); if (cur.length >= per) push();
      });
      push();
      let trans = null;
      if (a.translate_to && a.translate_to !== lang) {
        // traduz linha a linha e reagrupa (o tradutor separa por quebra de linha)
        const flat = groups.flatMap((g) => g.rows), out = await translateLines(flat, a.translate_to, lang).catch(() => null);
        if (out && out.length === flat.length) { let k = 0; trans = groups.map((g) => g.rows.map(() => out[k++]).join("\n")); }
      }
      const bg = a.bg || "wash:ember", font = a.font || "grotesk", now = Date.now();
      const langs = [lang, ...(trans ? [a.translate_to] : [])];
      const slides = [{ id: rid("s_"), layout: "lyrics", tone: "dark", title: { [lang]: title || "—" }, eyebrow: artist ? { [lang]: artist } : undefined, bg, font, at: 0 },
        ...groups.map((g, k) => ({ id: rid("s_"), layout: "lyrics", tone: "dark", title: { [lang]: g.rows.join("\n"), ...(trans?.[k] ? { [a.translate_to]: trans[k] } : {}) }, bg, font, section: g.section, at: times ? times[g.i0] : undefined })),
        { id: rid("s_"), layout: "lyrics", tone: "dark", title: "", bg, font }];
      const d = { id: rid("p_"), title: { [lang]: title || "Música" }, languages: langs, defaultLanguage: lang, template: "editorial", slides, music: video ? { video, sections: true } : undefined, createdAt: now, updatedAt: now,
        ...(a.folder ? { folder: folderName(a.folder) } : {}), ...(a.key ? { key: String(a.key).slice(0, 20) } : {}), ...(a.notes ? { notes: String(a.notes).slice(0, 300) } : {}) };
      if (a.brand_id) { const b = await brandOf(a.brand_id); const n = a.folder ? (await rest(`xlide_decks?select=id&doc->>folder=eq.${enc(folderName(a.folder))}`).catch(() => [])).length : 0; brandDeck(d, b, a.bg ? false : true, n); }
      await saveDeck(d);
      const dur = times ? Math.round((times.filter((x) => x != null).pop() || 0) + 20) : null;
      return { ...deckSummary(d), video, timed: !!times, timing, matched, seconds: dur, translated: !!trans, slides: slideOutline(d, lang) };
    }
    case "retime_song": {
      // acerta os tempos da letra de uma música que já existe (mesmo id, pasta e visual):
      // alinha cada slide nas palavras do vídeo (legendas) ou na letra sincronizada (LRCLIB)
      const d = await loadDeck(a.deck_id), L = d.defaultLanguage || lang;
      const vid = a.youtube_url || (d.music && d.music.video ? `https://www.youtube.com/watch?v=${d.music.video}` : null);
      if (!vid) throw new Error("Esta música não tem vídeo. Mande youtube_url.");
      const body = d.slides.map((x, k) => ({ x, k })).filter(({ x, k }) => x.layout === "lyrics" && k > 0 && txt(x.title, L).trim());
      const lines = [], i0 = [];
      body.forEach(({ x }) => { i0.push(lines.length); lines.push(...txt(x.title, L).split("\n"), ""); });
      const r = await getLyrics(vid, L, { lines });
      if (!r.times) throw new Error(`Não achei os tempos desta música (${r.error || "sem legenda e sem letra sincronizada"}). Tente outro youtube_url (vídeo oficial com letra).`);
      const off = Number(a.offset) || 0;
      let set = 0;
      body.forEach(({ x }, j) => { const t = r.times[i0[j]]; if (t != null) { x.at = Math.max(0, Math.round((t + off) * 100) / 100); set++; } else delete x.at; });
      if (r.id) d.music = { ...(d.music || {}), video: r.id, sections: true };
      await saveDeck(d);
      return { ...deckSummary(d), video: r.id, timing: r.timing, matched: r.matched, slides_timed: set, slides: body.length };
    }
    case "update_song": {
      const d = await loadDeck(a.deck_id);
      if (a.folder != null) { const f = folderName(a.folder); if (f) d.folder = f; else delete d.folder; }
      if (a.key != null) { if (a.key) d.key = String(a.key).slice(0, 20); else delete d.key; }
      if (a.notes != null) { if (a.notes) d.notes = String(a.notes).slice(0, 300); else delete d.notes; }
      if (a.title) d.title = { ...(typeof d.title === "object" ? d.title : {}), [d.defaultLanguage || "pt"]: String(a.title) };
      // fundo/fonte/tom do texto em todos os slides da música (o look da letra)
      if (a.bg || a.font || a.tone) d.slides.forEach((x) => { if (a.bg) x.bg = a.bg; if (a.font) x.font = a.font; if (a.tone) x.tone = a.tone; });
      // ajuste do fundo em todos os slides: brilho, saturação, contraste (1 = original) e desfoque (px)
      const fx = Object.fromEntries([["bri", a.brightness], ["sat", a.saturation], ["con", a.contrast], ["blur", a.blur]].filter(([, v]) => v != null).map(([k, v]) => [k, Number(v)]));
      if (Object.keys(fx).length) d.slides.forEach((x) => { x.fx = { ...(x.fx || {}), ...fx }; });
      await saveDeck(d); return deckSummary(d);
    }
    case "deck_links": {
      const d = await loadDeck(a.deck_id), o = origin || "";
      return { edit: `${o}/p/${d.id}`, present: `${o}/present/${d.id}`, ...(d.music ? { play: `${o}/play/${d.id}` } : {}), remote: `${o}/remote/${d.id}`, audience: `${o}/view/${d.id}` };
    }
    case "list_files": { const q = [a.folder && `folder=eq.${a.folder}`, a.status && `status=eq.${a.status}`].filter(Boolean).join("&"); return { files: await rest(`xlide_files?select=id,name,folder,status,starred,deck_id,updated_at&order=updated_at.desc${q ? "&" + q : ""}`) }; }
    case "save_file": {
      const row = { id: a.id || rid("f_"), name: a.name, ...(a.folder ? { folder: a.folder } : {}), ...(a.deck_id ? { deck_id: a.deck_id } : {}), ...(a.starred != null ? { starred: a.starred } : {}) };
      await upsert("xlide_files", row); return row;
    }
    case "set_file_status": {
      await rest(`xlide_files?id=eq.${enc(a.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: a.status, deleted_at: a.status === "lixeira" ? new Date().toISOString() : null }) });
      return { id: a.id, status: a.status };
    }
    case "set_program_settings": {
      const p = await loadProg(a.program_id);
      if (a.transition) p.doc.transition = a.transition;
      if (a.autopilot != null) p.doc.autopilot = !!a.autopilot;
      await saveProg(p); return { ...progSummary(p), transition: p.doc.transition || "fade", autopilot: !!p.doc.autopilot };
    }
    case "read_skill": {
      const part = a.part || "all";
      const text = part === "skill" ? SKILL_MD : part === "context" ? CONTEXT_MD : `${SKILL_MD}\n\n---\n\n${CONTEXT_MD}`;
      return { __content: [{ type: "text", text }], part };
    }
    case "get_audit_report": adminOnly(); return auditReport(Math.min(365, Math.max(1, Number(a.days) || 30)));
    case "get_audit_feed": {
      adminOnly();
      const person = /^[0-9a-f-]{36}$/.test(String(a.person_id || "")) ? String(a.person_id) : null;
      return auditFeed(Math.min(365, Math.max(1, Number(a.days) || 7)), person, Math.min(1000, Math.max(20, Number(a.limit) || 200)));
    }
  }
  throw new Error(`Ferramenta desconhecida: ${name}`);
}

/** Auditoria só para admin (a chave de serviço XLIDE_MCP_KEY conta como admin). */
function adminOnly() {
  const who = currentActor();
  if (who && who.role && who.role !== "admin") throw new Error("Só o admin vê a auditoria.");
}

export const LIVE_INSTRUCTIONS =
  " Você é o especialista do XLIDE: designer de decks, criador de programas de culto e guia de todas as rotas. Antes da primeira tarefa, chame read_skill uma vez e siga a skill (regras de design, fluxo do programa, rotas). " +
  "Brand kits: quando a pessoa citar um ministério, evento ou série (ex. Cafofo), chame list_brands e get_brand ANTES de criar, e passe brand_id em create_deck / create_song / create_program (ou apply_brand depois) para cores, fontes e fundo dos slides saírem iguais em tudo. Novo kit: save_brand (só com dados reais). " +
  "XLIDE: também cria e edita decks e slides (create_deck com todos os slides de uma vez; update_slide para cada slide; textos por língua pt/en/nl), " +
  "com identidade por deck: antes de montar ou melhorar slides, leia get_deck_identity (cores, tipografia, referências, tom e o board ligado) e siga-a; pedidos feitos no editor aparecem em list_ai_requests e se fecham com resolve_ai_request; para definir a identidade use set_deck_identity. " +
  "replica para outras línguas (missing_translations → traduza → add_translations), monta programas do culto (create_program com todos os itens; add_program_items, update_program_item, move_program_item, set_program_status, duplicate_program) " +
  "e, para admin, lê o relatório de uso e auditoria (get_audit_report, get_audit_feed). Escreva no idioma do usuário.";
