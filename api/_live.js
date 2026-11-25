// MCP do XLIDE v2 (Live Church): decks e slides, textos em várias línguas, programas do culto e o relatório de auditoria.
// Tudo no Supabase (xlide_decks, xlide_programs), com a chave de serviço; cada mudança entra em xlide_audit com via = 'mcp'.
// Somado às ferramentas de boards em shared/board.js (ctx.extraTools / ctx.extraCall).
import { auditReport, hasSupabase, rest } from "./_supabase.js";
import { getLyrics, translateLines } from "./_music.js";

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
const deckSummary = (d) => ({ id: d.id, title: txt(d.title, d.defaultLanguage), languages: d.languages, slides: d.slides.length, updatedAt: d.updatedAt });
const slideOutline = (d, l) => d.slides.map((s, i) => ({ n: i + 1, id: s.id, layout: s.layout, ...Object.fromEntries(TEXT_FIELDS.filter((f) => s[f] != null).map((f) => [f, txt(s[f], l)])) }));

/* ── programa ── */
function cleanItem(raw) {
  const type = ITEM_TYPES.includes(raw.type) ? raw.type : "notice";
  const it = { id: raw.id || rid("i_"), type, title: String(raw.title || type), planned: Math.max(10, Math.round((Number(raw.minutes) || Number(raw.planned) / 60 || 3) * 60)), advance: raw.advance || (["wait", "notice", "video", "media"].includes(type) ? "auto" : "manual"), public: raw.public !== false };
  for (const k of ["text", "owner", "area", "deck", "song", "media", "eyebrow", "bg", "font", "hidden"]) if (raw[k] != null) it[k] = raw[k];
  if (raw.track != null) it.bgm = trackOf(raw.track, raw.track_volume);
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
const slideProps = { bg: { type: "string", description: "Fundo: wash:<ember|amber|crimson|dusk|ocean|midnight|teal|mist|gold>, loop:<id YouTube>, plain:<papel|tinta|grade|coluna|sabado|brasa>, ou URL de imagem/vídeo" }, font: { type: "string", enum: ["grotesk", "serif", "condensed", "mono"] }, tone: { type: "string", enum: ["dark", "light"] }, section: { type: "string", enum: ["intro", "verse", "prechorus", "chorus", "bridge", "tag", "instrumental", "outro"] }, repeat: { type: "number" }, at: { type: "number", description: "Segundo da música em que o slide entra" }, notes: { type: "string", description: "Notas do apresentador" }, layout: { type: "string", enum: LAYOUTS }, eyebrow: { type: "string" }, title: { type: "string" }, subtitle: { type: "string" }, body: { type: "string" }, cta: { type: "string" }, image: { type: "string", description: "URL https real de imagem" } };
const itemProps = { type: { type: "string", enum: ITEM_TYPES }, title: { type: "string" }, minutes: { type: "number" }, text: { type: "string" }, owner: { type: "string" }, area: { type: "string", enum: ["music", "sound", "comms", "pulpit"] }, deck_id: { type: "string" }, song_id: { type: "string" }, media: { type: "string", description: "Link do YouTube, Vimeo, Spotify ou arquivo, para itens media" }, advance: { type: "string", enum: ["auto", "manual"] }, public: { type: "boolean" }, track: { type: "string", description: "Trilha de fundo desta tela: off, mix1, mix2, ou link/id do YouTube" }, track_volume: { type: "number" } };

export const LIVE_TOOLS = [
  { name: "list_decks", description: "Lista os decks e músicas do XLIDE (id, título, línguas, nº de slides). Filtros: texto no título e tipo (deck ou song).", inputSchema: S({ query: { type: "string" }, kind: { type: "string", enum: ["deck", "song"] } }) },
  { name: "get_deck", description: "Lê um deck: cada slide com posição, id, layout e textos na língua pedida.", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS } }, ["deck_id"]) },
  { name: "create_deck", description: "Cria um deck inteiro em uma chamada (título, línguas e todos os slides). Textos na língua `lang`; depois use add_translations para as outras.", inputSchema: S({ title: { type: "string" }, lang: { type: "string", enum: LANGS }, languages: { type: "array", items: { type: "string", enum: LANGS } }, slides: { type: "array", items: S(slideProps) } }, ["title", "slides"]) },
  { name: "add_slides", description: "Acrescenta slides a um deck (no fim ou depois da posição `after`).", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS }, after: { type: "number" }, slides: { type: "array", items: S(slideProps) } }, ["deck_id", "slides"]) },
  { name: "update_slide", description: "Edita um slide (por id ou posição 1..n): layout, imagem e textos na língua `lang`. Campos vazios ('') apagam o texto daquela língua.", inputSchema: S({ deck_id: { type: "string" }, slide: { type: ["string", "number"] }, lang: { type: "string", enum: LANGS }, ...slideProps }, ["deck_id", "slide"]) },
  { name: "move_slide", description: "Muda um slide de posição.", inputSchema: S({ deck_id: { type: "string" }, slide: { type: ["string", "number"] }, to: { type: "number" } }, ["deck_id", "slide", "to"]) },
  { name: "remove_slides", description: "Remove slides (ids ou posições).", inputSchema: S({ deck_id: { type: "string" }, slides: { type: "array", items: { type: ["string", "number"] } } }, ["deck_id", "slides"]) },
  { name: "missing_translations", description: "Lista os textos de um deck que ainda não têm a língua `lang`, com o texto de origem para traduzir.", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS }, from: { type: "string", enum: LANGS } }, ["deck_id", "lang"]) },
  { name: "add_translations", description: "Grava traduções de uma vez (slide + campo + texto) e acrescenta a língua ao deck. Use depois de missing_translations.", inputSchema: S({ deck_id: { type: "string" }, lang: { type: "string", enum: LANGS }, title: { type: "string", description: "Título do deck nessa língua" }, items: { type: "array", items: S({ slide: { type: ["string", "number"] }, field: { type: "string", enum: TEXT_FIELDS }, text: { type: "string" } }, ["slide", "field", "text"]) } }, ["deck_id", "lang", "items"]) },
  { name: "create_song", description: "Cria uma música (deck de letra) como no editor de música: do link do YouTube (letra e tempos das legendas) e/ou da letra colada ([Verso], [Refrão] marcam seções; linha em branco separa slides). Pode traduzir para outra língua.", inputSchema: S({ title: { type: "string" }, artist: { type: "string" }, youtube_url: { type: "string" }, lyrics: { type: "string" }, lang: { type: "string", enum: LANGS }, translate_to: { type: "string", enum: LANGS }, lines_per_slide: { type: "number" }, bg: { type: "string" }, font: { type: "string", enum: ["grotesk", "serif", "condensed", "mono"] } }) },
  { name: "deck_links", description: "Links de um deck: editar, apresentar, tocar (música), controle remoto e a página do público.", inputSchema: S({ deck_id: { type: "string" } }, ["deck_id"]) },
  { name: "list_files", description: "Meus arquivos: lista por pasta (avisos, pregacao, inicio, oracao, versiculo) e estado (ativo, padrao, arquivado, lixeira).", inputSchema: S({ folder: { type: "string", enum: FOLDERS }, status: { type: "string", enum: FILE_STATUS } }) },
  { name: "save_file", description: "Cria ou atualiza um arquivo em Meus arquivos (ligado a um deck).", inputSchema: S({ id: { type: "string" }, name: { type: "string" }, folder: { type: "string", enum: FOLDERS }, deck_id: { type: "string" }, starred: { type: "boolean" } }, ["name"]) },
  { name: "set_file_status", description: "Arquiva, torna padrão, manda para a lixeira ou restaura um arquivo.", inputSchema: S({ id: { type: "string" }, status: { type: "string", enum: FILE_STATUS } }, ["id", "status"]) },
  { name: "set_program_settings", description: "Ajustes do programa para o ao vivo: transição entre telas (fade padrão, corte, slide, sobrepor) e piloto automático.", inputSchema: S({ program_id: { type: "string" }, transition: { type: "string", enum: TRANSITIONS }, autopilot: { type: "boolean" } }, ["program_id"]) },
  { name: "list_programs", description: "Lista os programas do culto (Programa Estúdio) com estado: rascunho, salvo, feito, arquivado, lixeira.", inputSchema: S({ status: { type: "string", enum: PROG_STATUS } }) },
  { name: "get_program", description: "Lê um programa com todos os itens na ordem (horário de cada um calculado).", inputSchema: S({ program_id: { type: "string" } }, ["program_id"]) },
  { name: "create_program", description: "Cria um programa inteiro (rascunho) com todos os itens em ordem. Itens podem apontar para decks (deck_id), músicas (song_id) ou links de vídeo/áudio (media).", inputSchema: S({ title: { type: "string" }, date: { type: "string", description: "AAAA-MM-DD" }, starts: { type: "string", description: "HH:MM" }, target_min: { type: "number" }, items: { type: "array", items: S(itemProps, ["type", "title"]) } }, ["title", "items"]) },
  { name: "add_program_items", description: "Acrescenta itens a um programa (no fim ou depois da posição `after`).", inputSchema: S({ program_id: { type: "string" }, after: { type: "number" }, items: { type: "array", items: S(itemProps, ["type", "title"]) } }, ["program_id", "items"]) },
  { name: "update_program_item", description: "Edita um item do programa (id ou posição): título, tipo, minutos, texto, responsável, deck, música, mídia, avanço, público, oculto.", inputSchema: S({ program_id: { type: "string" }, item: { type: ["string", "number"] }, hidden: { type: "boolean" }, ...itemProps }, ["program_id", "item"]) },
  { name: "move_program_item", description: "Muda um item de posição (os horários seguintes se recalculam).", inputSchema: S({ program_id: { type: "string" }, item: { type: ["string", "number"] }, to: { type: "number" } }, ["program_id", "item", "to"]) },
  { name: "remove_program_items", description: "Tira itens do programa: arquivar (padrão) ou mandar para a lixeira do programa.", inputSchema: S({ program_id: { type: "string" }, items: { type: "array", items: { type: ["string", "number"] } }, to: { type: "string", enum: ["arquivo", "lixeira"] } }, ["program_id", "items"]) },
  { name: "set_program_status", description: "Muda o estado (rascunho, salvo, feito, arquivado, lixeira) e/ou põe o programa no ao vivo.", inputSchema: S({ program_id: { type: "string" }, status: { type: "string", enum: PROG_STATUS }, live: { type: "boolean" } }, ["program_id"]) },
  { name: "duplicate_program", description: "Duplica um programa (por exemplo um culto já feito) como novo rascunho, com outra data.", inputSchema: S({ program_id: { type: "string" }, title: { type: "string" }, date: { type: "string" } }, ["program_id"]) },
  { name: "get_audit_report", description: "Relatório de uso e auditoria: páginas mais abertas, onde as pessoas têm dificuldade (erros, tentativas, buscas vazias), de onde saem, o que não encontram, e quem mudou o quê (app ou MCP).", inputSchema: S({ days: { type: "number" } }) },
];
const NAMES = new Set(LIVE_TOOLS.map((t) => t.name));
export const isLiveTool = (n) => NAMES.has(n);

export async function callLiveTool(name, a = {}, origin = "") {
  if (!hasSupabase) throw new Error("Supabase não configurado (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY). As ferramentas de decks, programas e auditoria precisam dele.");
  const lang = LANGS.includes(a.lang) ? a.lang : "pt";
  switch (name) {
    case "list_decks": {
      const rows = await rest(`xlide_decks?select=doc&order=updated_at.desc&limit=200${a.query ? `&title=ilike.*${enc(a.query)}*` : ""}${a.kind ? `&kind=eq.${a.kind}` : ""}`);
      return { decks: rows.map((r) => deckSummary(r.doc)) };
    }
    case "get_deck": { const d = await loadDeck(a.deck_id); return { ...deckSummary(d), slides: slideOutline(d, lang) }; }
    case "create_deck": {
      const now = Date.now(), languages = [...new Set([lang, ...(a.languages || []).filter((l) => LANGS.includes(l))])];
      const d = { id: rid("p_"), title: { [lang]: String(a.title) }, languages, defaultLanguage: lang, template: "editorial", slides: (a.slides || []).map((s) => cleanSlide(s, lang)), createdAt: now, updatedAt: now };
      if (!d.slides.length) throw new Error("Mande pelo menos um slide.");
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
      if (a.track != null) { it.bgm = trackOf(a.track, a.track_volume); delete it.track; delete it.track_volume; }
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
      let lines = [], times = null, title = a.title, artist = a.artist, video = null;
      if (a.youtube_url) {
        const r = await getLyrics(a.youtube_url, lang);
        video = r.id || null; title ||= r.title; artist ||= r.author;
        if (!a.lyrics && r.lines?.length) { lines = r.lines; times = r.times || null; }
        if (!a.lyrics && !lines.length) throw new Error(`Não achei a letra desse vídeo (${r.error || "sem legenda"}). Cole a letra em lyrics.`);
      }
      if (a.lyrics) lines = String(a.lyrics).split("\n");
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
      const d = { id: rid("p_"), title: { [lang]: title || "Música" }, languages: langs, defaultLanguage: lang, template: "editorial", slides, music: video ? { video, sections: true } : undefined, createdAt: now, updatedAt: now };
      await saveDeck(d);
      return { ...deckSummary(d), video, timed: !!times, translated: !!trans, slides: slideOutline(d, lang) };
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
    case "get_audit_report": return auditReport(Math.min(365, Math.max(1, Number(a.days) || 30)));
  }
  throw new Error(`Ferramenta desconhecida: ${name}`);
}

export const LIVE_INSTRUCTIONS =
  " XLIDE v2 (Live Church): também cria e edita decks e slides (create_deck com todos os slides de uma vez; update_slide para cada slide; textos por língua pt/en/nl), " +
  "replica para outras línguas (missing_translations → traduza → add_translations), monta programas do culto (create_program com todos os itens; add_program_items, update_program_item, move_program_item, set_program_status, duplicate_program) " +
  "e lê o relatório de uso e auditoria (get_audit_report). Escreva no idioma do usuário.";
