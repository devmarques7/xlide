/* XLIDE v2 · ponte com o Supabase.
   As telas do v2 leem tudo de forma síncrona (localStorage + XL). Esta ponte:
   1. guarda uma cópia dos dados reais (pessoas, músicas, decks, boards, arquivos) em xlide.v2.cloud
      para a página abrir na hora; data.js troca os dados de exemplo por ela;
   2. busca o que está no Supabase ao abrir e, se mudou, recarrega (só logo na abertura) ou avisa;
   3. sobe toda gravação das listas (programas, arquivos, decks, agenda, visuais, trilha…) para o banco;
   4. recebe as mudanças dos outros na hora (Realtime) e leva o culto ao vivo entre aparelhos.
   Sem /v2/config.js com URL e chave, nada disso liga e o v2 roda como mockup (dados de exemplo). */
(function () {
  const CFG = window.XCFG || {};
  const ON = !!(CFG.url && CFG.key && window.supabase && window.supabase.createClient);
  const PUBLIC = /ao-vivo\.html$/.test(location.pathname);
  const LS = window.localStorage;
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  const get = (k) => { try { return JSON.parse(LS.getItem(k)); } catch { return null; } };
  const put = (k, v) => { try { rawSet.call(LS, k, JSON.stringify(v)); } catch (e) { console.warn("[xcloud] localStorage cheio", k, e); } };

  if (!ON) { window.XCLOUD = { on: false }; return; }

  const REF = new URL(CFG.url).hostname.split(".")[0];
  const TOKEN = `sb-${REF}-auth-token`;
  const CK = PUBLIC ? "xlide.v2.cloud.public" : "xlide.v2.cloud";
  const cache = get(CK);

  /* sessão (síncrono): sem login, vai para /login e volta para cá */
  const sess = get(TOKEN);
  const signed = !!(sess && sess.access_token);
  if (!signed && !PUBLIC) {
    document.documentElement.style.visibility = "hidden";
    location.replace("/login?from=" + encodeURIComponent(location.pathname + location.search + location.hash));
    window.XCLOUD = { on: true, leaving: true };
    return;
  }
  const UID = sess && sess.user ? sess.user.id : null;
  // o mapa e a tela de entrar do mockup não existem no app real
  if (/\/v2\/(index\.html|entrar\.html)?$/.test(location.pathname)) { location.replace("inicio.html" + location.search); window.XCLOUD = { on: true, leaving: true }; return; }

  const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: TOKEN, detectSessionInUrl: false } });

  /* relógio do servidor: todos os aparelhos contam o culto pelo mesmo relógio */
  let skew = Number(sessionStorage.getItem("xlide.v2.skew")) || 0;
  const now = () => Date.now() + skew;

  /* listas que o v2 guarda inteiras no xlide_kv (chave local → chave no banco) */
  const KV = { "xlide.v2.decks": "decks", "xlide.v2.agenda": "agenda", "xlide.v2.looks": "looks", "xlide.v2.trilha": "trilha", "xlide.v2.setlist": "setlist", "xlide.v2.tests": "tests", "xlide.v2.images": "images", "xlide.v2.fonts": "fonts", "xlide.v2.bgs": "bgs" };
  const PK = "xlide.v2.programs", FK = "xlide.v2.files", DIRTY = "xlide.v2.cloud.dirty";

  /* ---------- formatos ---------- */
  const STATUS = ["rascunho", "salvo", "feito", "arquivado", "lixeira"];
  const FOLDERS = ["avisos", "pregacao", "inicio", "oracao", "versiculo"];
  const FSTATUS = ["ativo", "padrao", "arquivado", "lixeira"];
  const isUuid = (s) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);
  const pad = (n) => String(n).padStart(2, "0");
  const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  function rel(ts) {
    if (!ts) return "";
    const d = new Date(ts), t = new Date();
    const day = (x) => Math.floor((x.getTime() - x.getTimezoneOffset() * 60000) / 864e5);
    const diff = day(t) - day(d);
    if (diff <= 0) return "hoje";
    if (diff === 1) return "ontem";
    if (diff < 7) return DAYS[d.getDay()].toLowerCase();
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  }
  const longDate = (iso) => { if (!iso) return ""; const d = new Date(iso + "T12:00:00"); return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
  const shortDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
  function isoOf(p) {
    if (p.iso && /^\d{4}-\d{2}-\d{2}$/.test(p.iso)) return p.iso;
    const m = String(p.short || "").match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) return null;
    const t = new Date();
    let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : t.getFullYear();
    if (!m[3] && +m[2] < t.getMonth() - 5) y++;
    return `${y}-${pad(m[2])}-${pad(m[1])}`;
  }
  const ini = (n) => String(n || "?").split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const ROLE_T = { admin: "Administrador", editor: "Editor", operator: "Operador", reader: "Leitor" };
  const AREA_T = { music: "Música", sound: "Sonoplastia", comms: "Comunicação", pulpit: "Púlpito" };
  const tx = (v, l) => (v == null ? "" : typeof v === "string" ? v : v[l] || v.pt || v.en || Object.values(v).find(Boolean) || "");
  const SEC = { intro: "Intro", verse: "Verso", prechorus: "Pré-refrão", chorus: "Refrão", bridge: "Ponte", tag: "Tag", instrumental: "Instrumental", outro: "Final" };

  const person = (p) => ({ name: p.name || (p.email || "").split("@")[0] || "Sem nome", ini: ini(p.name || p.email), role: p.role || "editor", area: p.area || null, title: p.area ? AREA_T[p.area] : ROLE_T[p.role] || "Equipe", email: p.email, avatar: p.avatar_url });

  function isSong(d) { const s = (d.doc && d.doc.slides) || []; return d.kind === "song" || (!!(d.doc && d.doc.music) && s.some((x) => x.layout === "lyrics")) || (s.length > 0 && s.every((x) => x.layout === "lyrics")); }
  function song(d) {
    const doc = d.doc || {}, langs = (doc.languages && doc.languages.length ? doc.languages : ["pt"]);
    const all = (doc.slides || []).filter((s) => s.layout === "lyrics");
    const cover = all[0] && all[0].eyebrow && (all[0].at || 0) === 0 ? all[0] : null;
    const body = all.filter((s) => s !== cover && tx(s.title, langs[0]).trim());
    const lyrics = {};
    langs.forEach((l) => { lyrics[l] = body.map((s) => (s.section ? `[${SEC[s.section] || s.section}]\n` : "") + tx(s.title, l)).join("\n\n"); });
    const at = body.map((s, i) => (typeof s.at === "number" ? Math.round(s.at) : i * 20));
    const first = all[0] || {};
    return {
      title: tx(doc.title, langs[0]) || d.title || "Sem título", author: tx(cover && cover.eyebrow, langs[0]) || doc.author || "", key: doc.key || "—", bpm: doc.bpm || "", uses: 0, last: rel(d.updated_at),
      langs, source: doc.music && doc.music.video ? "YouTube · letra sincronizada" : "XLIDE", lyrics: Object.keys(lyrics).length ? lyrics : { pt: "" },
      dur: (at.length ? at[at.length - 1] : 0) + 20, at, video: doc.music && doc.music.video, bg: (body[0] || first).bg, font: (body[0] || first).font, bgs: body.map((x) => x.bg), fx: (body[0] || first).fx || null, ink: doc.music && doc.music.ink, chorusInk: doc.music && doc.music.chorusInk, brand: doc.brand_id || null, real: true, folder: doc.folder || "", notes: doc.notes || "",
    };
  }
  function deck(d) {
    const doc = d.doc || {}, s = doc.slides || [], l = (doc.languages || ["pt"])[0];
    const img = (s.find((x) => x.image) || {}).image;
    const pdf = s.length && s.every((x) => x.variant === "page" && x.image);
    const langs = doc.languages && doc.languages.length ? doc.languages : ["pt"], L = langs.includes("pt") ? "pt" : l;
    const small = (u) => (u && (!/^data:/.test(u) || u.length < 30000) ? u : null);
    const first = s[0] || {};
    // o mesmo cartão do painel de slides: capa, título, descrição, tags e idiomas
    return { title: tx(doc.title, L) || d.title || "Sem título", kind: "deck", slides: s.length, layout: first.layout || "cover", updated: rel(d.updated_at), at: d.updated_at, cover: small(img), tone: first.tone || (img ? "dark" : null),
      desc: tx(doc.description, L), tags: (doc.tags || []).filter((t) => t !== "template").slice(0, 3), langs, template: !!doc.template || (doc.tags || []).includes("template"), pages: pdf ? s.map((x) => x.image) : undefined, real: true };
  }
  /* boards: além da contagem, guarda uma prévia de verdade (fotos, cores, um recorte do moodboard e o mapa) */
  const ytId = (u) => { const m = String(u || "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m && m[1]; };
  const imgOf = (i) => i.src || i.url || "";
  const clip = (s, n) => { s = String(s || "").replace(/==/g, "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  function miniMood(items) {
    // recorte: os primeiros itens do quadro (a primeira seção), em coordenadas 0..1000
    const L = items.filter((i) => typeof i.x === "number" && typeof i.y === "number" && i.w > 0 && i.h > 0).slice(0, 60);
    if (!L.length) return null;
    const x0 = Math.min(...L.map((i) => i.x)), y0 = Math.min(...L.map((i) => i.y));
    const W = Math.max(...L.map((i) => i.x + i.w)) - x0, H = Math.max(...L.map((i) => i.y + i.h)) - y0;
    const k = 1000 / Math.max(W, H, 1);
    let budget = 90000;
    const out = L.map((i) => {
      const o = { x: Math.round((i.x - x0) * k), y: Math.round((i.y - y0) * k), w: Math.max(2, Math.round(i.w * k)), h: Math.max(2, Math.round(i.h * k)), t: i.type };
      if (i.type === "image") { const s = imgOf(i); if (s && s.length < 20000 && budget > s.length) { o.s = s; budget -= s.length; } }
      else if (i.type === "video") { const id = ytId(i.video || i.url); if (id) o.s = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`; }
      else if (i.type === "color" || i.type === "shape") o.c = i.color || i.fill || null;
      else if (i.type === "text") { o.c = i.color || null; o.tx = clip(i.text, 40); }
      else if (i.type === "note" || i.type === "todo") o.tx = clip(i.title || i.text, 40);
      return o;
    });
    return { w: Math.round(W * k), h: Math.round(H * k), items: out };
  }
  function miniMap(nodes, edges, title) {
    if (!nodes.length) return null;
    const c = nodes.find((n) => n.kind === "idea") || nodes[0];
    const kids = edges.filter((e) => e.from === c.id).map((e) => nodes.find((n) => n.id === e.to)).filter(Boolean);
    const pool = (kids.length ? kids : nodes.filter((n) => n !== c && n.kind === "stage")).concat(nodes.filter((n) => n !== c));
    const seen = new Set(), around = [];
    for (const n of pool) { if (around.length >= 6) break; if (seen.has(n.id)) continue; seen.add(n.id); const t = clip(n.title || n.tag || n.text, 24); if (t) around.push(t); }
    return { center: clip(c.title || title, 26), around };
  }
  function board(b) {
    const doc = b.doc || {};
    const items = (doc.mood && doc.mood.items) || [];
    const nodes = doc.nodes || [], edges = doc.edges || [];
    const title = tx(doc.title, "pt") || b.title || "Board";
    const loops = items.map((i) => (i.type === "video" ? ytId(i.video || i.url) : null)).filter(Boolean).slice(0, 3);
    const photos = items.filter((i) => i.type === "image" && imgOf(i) && imgOf(i).length < 20000).map(imgOf);
    const thumbs = [...photos, ...loops.map((id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`)].slice(0, 3);
    const colors = items.filter((i) => (i.type === "color" || i.type === "shape") && (i.color || i.fill)).map((i) => i.color || i.fill).filter((v, k, a) => a.indexOf(v) === k).slice(0, 3);
    return {
      title, items: items.length + nodes.length, moodN: items.length, nodesN: nodes.length, updated: rel(b.updated_at), at: b.updated_at, by: b.owner_id || UID, when: shortDate((b.updated_at || "").slice(0, 10)),
      loops, thumbs, colors: colors.length ? colors : ["#e9e4d8", "#161615", "#f7f6f3"], mood: miniMood(items), map: miniMap(nodes, edges, title), archived: /^\[ARQUIVADO\]/i.test(title), real: true,
    };
  }
  function progFromRow(r) {
    const doc = r.doc || {};
    return { ...doc, id: r.id, title: r.title, iso: r.service_date, date: doc.date || longDate(r.service_date) || "Sem data", short: doc.short || shortDate(r.service_date), starts: (r.starts_at || "10:00").slice(0, 5), targetMin: r.target_min || Math.round((doc.items || []).reduce((a, b) => a + (b.planned || 0), 0) / 60), status: r.status, updated: rel(r.updated_at), by: doc.by || r.owner_id, items: doc.items || [], archived: doc.archived || [], trash: doc.trash || [] };
  }
  function progRow(p, liveId) {
    const { id, title, starts, targetMin, status, updated, iso, ...rest } = p;
    const d = isoOf(p);
    return { id, title: title || "Programa", service_date: d, starts_at: /^\d{1,2}:\d{2}/.test(starts || "") ? starts : null, target_min: targetMin ? Math.round(targetMin) : null, status: STATUS.includes(status) ? status : "rascunho", is_live: id === liveId, doc: rest };
  }
  function fileFromRow(r) {
    const doc = r.doc || {};
    return { kind: "deck", slides: 1, font: "grotesk", ...doc, id: r.id, name: r.name, folder: r.folder, status: r.status, star: !!r.starred, owner: r.owner_id || UID, shared: r.shared_with || [], updated: rel(r.updated_at), deleted: r.status === "lixeira" && r.deleted_at ? rel(r.deleted_at) : doc.deleted };
  }
  function fileRow(f) {
    const { id, name, folder, status, star, owner, shared, updated, deleted, ...rest } = f;
    return { id, name: name || f.title || "Sem nome", folder: FOLDERS.includes(folder) ? folder : "avisos", status: FSTATUS.includes(status) ? status : "ativo", starred: !!star, deck_id: /^pdf_/.test(rest.deck || "") ? rest.deck : null, doc: rest, owner_id: isUuid(owner) ? owner : UID, shared_with: (shared || []).filter(isUuid), deleted_at: status === "lixeira" ? new Date().toISOString() : null };
  }

  /* ---------- imagens: data: viram arquivos no bucket xlide-media ---------- */
  const IMGK = "xlide.v2.cloud.imgs";
  const uploaded = get(IMGK) || {};
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += 7) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); };
  async function upload(dataUrl) {
    const h = hash(dataUrl);
    if (uploaded[h]) return uploaded[h];
    const m = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!m) return dataUrl;
    const bin = m[2] ? Uint8Array.from(atob(m[3]), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(m[3]));
    const ext = (m[1].split("/")[1] || "bin").replace("svg+xml", "svg").replace("jpeg", "jpg");
    const path = `v2/${h}.${ext}`;
    const { error } = await sb.storage.from("xlide-media").upload(path, new Blob([bin], { type: m[1] }), { upsert: true, contentType: m[1] });
    if (error) { console.warn("[xcloud] imagem não subiu", error.message); return dataUrl; }
    const url = sb.storage.from("xlide-media").getPublicUrl(path).data.publicUrl;
    uploaded[h] = url; put(IMGK, uploaded);
    return url;
  }
  async function liftImages(v) {
    if (typeof v === "string") return v.startsWith("data:") && v.length > 3000 ? upload(v) : v;
    if (Array.isArray(v)) return Promise.all(v.map(liftImages));
    if (v && typeof v === "object") { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await liftImages(x); return o; }
    return v;
  }

  /* ---------- envio ---------- */
  const dirty = new Set(get(DIRTY) || []);
  const markDirty = () => put(DIRTY, [...dirty]);
  const timers = {};
  let sentProgs = {}, sentFiles = {};
  let status = "ok";
  function setStatus(s) { status = s; document.documentElement.dataset.cloud = s; dispatchEvent(new CustomEvent("xcloud:status", { detail: s })); }

  function schedule(key) {
    dirty.add(key); markDirty();
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => flush(key), 500);
  }
  async function flush(key) {
    try {
      if (KV[key]) {
        const local = get(key);
        const value = await liftImages(local);
        if (JSON.stringify(value) !== JSON.stringify(local)) put(key, value);
        const { error } = await sb.from("xlide_kv").upsert({ key: KV[key], value, updated_by: UID });
        if (error) throw error;
      } else if (key === PK) await flushPrograms();
      else if (key === FK) await flushFiles();
      dirty.delete(key); markDirty(); setStatus("ok");
    } catch (e) {
      console.warn("[xcloud] não salvou", key, e && e.message);
      setStatus("offline");
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => flush(key), 5000);
    }
  }
  async function flushPrograms() {
    const st = get(PK);
    if (!st || !Array.isArray(st.list)) return;
    const rows = [], seen = new Set();
    for (const p of st.list) {
      seen.add(p.id);
      const row = progRow(await liftImages(p), st.live);
      const j = JSON.stringify(row);
      if (sentProgs[p.id] !== j) rows.push([row, j]);
    }
    if (rows.length) {
      // só um programa no ao vivo
      if (rows.some(([r]) => r.is_live)) await sb.from("xlide_programs").update({ is_live: false }).eq("is_live", true).neq("id", st.live);
      const { error } = await sb.from("xlide_programs").upsert(rows.map(([r]) => r));
      if (error) throw error;
      rows.forEach(([r, j]) => (sentProgs[r.id] = j));
    }
    const gone = Object.keys(sentProgs).filter((id) => !seen.has(id));
    if (gone.length) { const { error } = await sb.from("xlide_programs").delete().in("id", gone); if (error) throw error; gone.forEach((id) => delete sentProgs[id]); }
  }
  async function flushFiles() {
    const ov = get(FK) || { edit: {}, added: [], gone: [] };
    const base = {}; ((cache && cache.files) || []).forEach((f) => (base[f.id] = f));
    const byId = {};
    (ov.added || []).forEach((f) => (byId[f.id] = f));
    Object.entries(ov.edit || {}).forEach(([id, patch]) => { const b = byId[id] || base[id]; if (b) byId[id] = { ...b, ...patch }; });
    const rows = [];
    for (const f of Object.values(byId)) {
      if ((ov.gone || []).includes(f.id)) continue;
      const row = fileRow(await liftImages(f)); const j = JSON.stringify(row);
      if (sentFiles[f.id] !== j) rows.push([row, j]);
    }
    if (rows.length) { const { error } = await sb.from("xlide_files").upsert(rows.map(([r]) => r)); if (error) throw error; rows.forEach(([r, j]) => (sentFiles[r.id] = j)); }
    const gone = (ov.gone || []).filter((id) => sentFiles[id] !== "gone");
    if (gone.length) { const { error } = await sb.from("xlide_files").delete().in("id", gone); if (error) throw error; gone.forEach((id) => (sentFiles[id] = "gone")); }
  }

  /* toda gravação das listas sincronizadas sobe para o banco */
  if (!PUBLIC) {
    Storage.prototype.setItem = function (k, v) {
      rawSet.call(this, k, v);
      if (this === LS && cache && (KV[k] || k === PK || k === FK)) schedule(k);
    };
    Storage.prototype.removeItem = function (k) {
      rawRemove.call(this, k);
      if (this === LS && cache && k === FK) schedule(k);
    };
  }

  /* ---------- o culto ao vivo ---------- */
  const runSubs = new Set();
  let channel = null, runVersion = -1, runTimer = null, runPending = null;
  function pushRun(st) {
    if (PUBLIC) return;
    runVersion = st.version;
    channel && channel.send({ type: "broadcast", event: "run", payload: { state: st, by: UID } });
    runPending = st;
    clearTimeout(runTimer);
    runTimer = setTimeout(async () => {
      const s = runPending; runPending = null;
      const prog = get(PK);
      const { error } = await sb.from("xlide_runs").upsert({ id: "main", program_id: prog && prog.live && /^[\w-]+$/.test(prog.live) ? prog.live : null, state: s, version: s.version, updated_by: UID });
      if (error) { console.warn("[xcloud] culto não salvou", error.message); setStatus("offline"); } else setStatus("ok");
      if (s.status === "done") saveReport(s);
    }, 150);
  }
  function takeRun(state) {
    if (!state || typeof state.version !== "number") return;
    if (state.version <= runVersion && runVersion !== -1 && state.version !== 0) return;
    runVersion = state.version;
    runSubs.forEach((f) => f(state));
  }
  /* fim do culto: o tempo real de cada item vai para o programa (relatório planejado × real) */
  async function saveReport(s) {
    const P = window.PROGS; const liveId = P ? P.liveId : (get(PK) || {}).live;
    if (!P || !liveId) return;
    const p = P.get(liveId); if (!p) return;
    const durs = (p.items || []).map((_, i) => { const L = s.log && s.log[i]; return L && L.start && L.end ? Math.round((L.end - L.start) / 1000) : null; });
    const planned = (p.items || []).reduce((a, b) => a + (b.planned || 0), 0);
    const realSec = s.log && s.log.length ? Math.round(((s.log[s.index] && s.log[s.index].end) || now()) - s.runStart) / 1000 : null;
    if (p.runLog && p.runLog.at === s.runStart) return;
    p.runLog = { at: s.runStart, durs, planned, real: realSec, log: s.log };
    if (realSec != null) { const d = Math.round((realSec - planned) / 60); p.real = d === 0 ? "no horário" : `${d > 0 ? "+" : "−"}${Math.abs(d)} min`; }
    p.status = "feito";
    P.put(p);
  }

  /* ---------- carregar do banco ---------- */
  async function fetchAll() {
    const q = (t, sel = "*") => sb.from(t).select(sel).then((r) => { if (r.error) throw r.error; return r.data || []; });
    const [people, decks, boards, programs, files, kv, runs] = await Promise.all([
      q("profiles"), q("xlide_decks", "id,kind,title,doc,updated_at,owner_id"), q("xlide_boards", "id,title,doc,updated_at,owner_id"),
      q("xlide_programs"), q("xlide_files"), q("xlide_kv"), q("xlide_runs"),
    ]);
    return { people, decks, boards, programs, files, kv, runs };
  }
  function buildCache(d) {
    const people = {}; d.people.forEach((p) => (people[p.id] = person(p)));
    if (UID && !people[UID]) people[UID] = person({ id: UID, email: sess.user.email, name: sess.user.user_metadata && (sess.user.user_metadata.full_name || sess.user.user_metadata.name), role: "editor" });
    const songs = {}, decks = {};
    d.decks.forEach((x) => { try { if (isSong(x)) songs[x.id] = song(x); else decks[x.id] = deck(x); } catch (e) { console.warn("[xcloud] deck", x.id, e); } });
    const boards = {}; d.boards.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "")).forEach((b) => (boards[b.id] = board(b)));
    const files = d.files.map(fileFromRow);
    return { v: 1, uid: UID, people, songs, decks, boards, files };
  }
  function applyLists(d) {
    const live = (d.programs.find((r) => r.is_live) || {}).id || null;
    const progs = { live, list: d.programs.sort((a, b) => (b.service_date || "").localeCompare(a.service_date || "")).map(progFromRow) };
    sentProgs = {}; progs.list.forEach((p) => (sentProgs[p.id] = JSON.stringify(progRow(p, live))));
    const changed = [];
    const set = (k, v) => { const old = LS.getItem(k); const nv = JSON.stringify(v); if (old !== nv) { rawSet.call(LS, k, nv); changed.push(k); } };
    if (!dirty.has(PK)) set(PK, progs);
    d.kv.forEach((r) => { const k = Object.keys(KV).find((x) => KV[x] === r.key); if (k && !dirty.has(k) && r.value != null) set(k, r.value); });
    if (!dirty.has(FK)) { const ov = get(FK); if (ov && ((ov.added || []).length || Object.keys(ov.edit || {}).length || (ov.gone || []).length)) { rawRemove.call(LS, FK); changed.push(FK); } }
    sentFiles = {}; d.files.forEach((r) => (sentFiles[r.id] = JSON.stringify(fileRow(fileFromRow(r)))));
    const run = d.runs.find((r) => r.id === "main");
    if (run && run.state && run.state.version != null) { const old = get("xlide.v2.run"); if (!old || (old.version || 0) < run.state.version) { put("xlide.v2.run", run.state); changed.push("xlide.v2.run"); } runVersion = Math.max(runVersion, run.state.version); }
    return changed;
  }

  async function publicLoad() {
    const { data, error } = await sb.rpc("xlide_live_public");
    if (error) throw error;
    if (data && data.server_time) skew = data.server_time - Date.now();
    const songs = {}; Object.entries(data.songs || {}).forEach(([id, doc]) => (songs[id] = song({ id, doc })));
    const prog = data.program ? progFromRow({ ...data.program, status: "salvo" }) : null;
    const pc = { v: 1, public: true, songs, program: prog };
    if (data.run && data.run.state) { put("xlide.v2.run", data.run.state); takeRun(data.run.state); }
    return pc;
  }

  /* ---------- aviso "mudou" e recarregar na abertura ---------- */
  const T0 = Date.now(); let touched = false;
  ["pointerdown", "keydown"].forEach((e) => addEventListener(e, () => (touched = true), { once: true, capture: true }));
  function maybeReload(reason) {
    const k = "xlide.v2.cloud.reloads"; const n = Number(sessionStorage.getItem(k)) || 0;
    if (!touched && Date.now() - T0 < 4000 && n < 2) { sessionStorage.setItem(k, n + 1); location.reload(); return; }
    banner(reason);
  }
  function banner(text) {
    if (document.querySelector(".xc-banner")) return;
    const b = document.createElement("button");
    b.className = "xc-banner";
    b.textContent = text + " · Atualizar";
    b.style.cssText = "position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9999;padding:10px 16px;background:var(--ink,#161615);color:var(--paper,#f7f6f3);border:0;font:500 13px/1.2 var(--font,system-ui);cursor:pointer";
    b.onclick = () => location.reload();
    (document.body || document.documentElement).append(b);
  }
  if (!cache) {
    // primeira vez neste aparelho: segura a página até os dados chegarem
    document.documentElement.style.visibility = "hidden";
    addEventListener("DOMContentLoaded", () => { const l = document.createElement("div"); l.textContent = "Carregando o XLIDE…"; l.style.cssText = "position:fixed;inset:0;display:grid;place-items:center;font:500 14px system-ui;visibility:visible;background:#f7f6f3;color:#161615;z-index:99999"; document.body.append(l); });
  }

  /* ---------- Realtime ---------- */
  function subscribe() {
    // canal privado: todos ouvem (a tela pública também), só quem opera o culto fala (políticas em realtime.messages)
    channel = sb.channel("xlide-live", { config: { private: true, broadcast: { self: false } } });
    channel.on("broadcast", { event: "run" }, ({ payload }) => payload && takeRun(payload.state));
    if (!PUBLIC) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: "xlide_runs" }, ({ new: r }) => r && r.state && takeRun(r.state));
      channel.on("postgres_changes", { event: "*", schema: "public", table: "xlide_kv" }, ({ new: r }) => {
        if (!r || !r.key) return;
        const k = Object.keys(KV).find((x) => KV[x] === r.key); if (!k || dirty.has(k)) return;
        const nv = JSON.stringify(r.value); if (LS.getItem(k) === nv) return;
        rawSet.call(LS, k, nv);
        dispatchEvent(new StorageEvent("storage", { key: k, newValue: nv }));
      });
      const remote = (table, label) => channel.on("postgres_changes", { event: "*", schema: "public", table }, async () => {
        if (dirty.size) return;
        try { const d = await fetchAll(); const c = buildCache(d); put(CK, c); const ch = applyLists(d); if (ch.length || table !== "xlide_programs") banner(label); } catch {}
      });
      remote("xlide_programs", "Programa atualizado por outra pessoa");
      remote("xlide_files", "Arquivos atualizados");
      remote("xlide_decks", "Biblioteca atualizada");
      remote("xlide_boards", "Boards atualizados");
    }
    channel.subscribe();
  }

  /* ---------- abrir ---------- */
  async function boot() {
    try {
      if (!PUBLIC) {
        const { data } = await sb.auth.getSession();
        if (!data.session) { location.replace("/login?from=" + encodeURIComponent(location.pathname + location.search)); return; }
        // sistema fechado: logado sem perfil (sem convite aceito) volta para o login, que explica
        const me = await sb.from("profiles").select("id,role").eq("id", data.session.user.id).maybeSingle();
        if (!me.error && !me.data) {
          let tok = null; try { tok = sessionStorage.getItem("xlide.invite"); } catch {}
          const j = await sb.rpc("xlide_join", { tok });
          if (!j.data) { ["xlide.v2.cloud", "xlide.v2.me"].forEach((k) => rawRemove.call(LS, k)); location.replace("/login?from=" + encodeURIComponent(location.pathname + location.search)); return; }
        }
        if (me.data) window.XCLOUD.role = me.data.role;
        const t0 = Date.now(); const { data: st } = await sb.rpc("xlide_server_time");
        if (st) { skew = st - (t0 + Date.now()) / 2; sessionStorage.setItem("xlide.v2.skew", String(skew)); }
        for (const k of [...dirty]) await flush(k);
        const d = await fetchAll();
        const c = buildCache(d);
        const before = JSON.stringify(cache);
        put(CK, c);
        rawSet.call(LS, "xlide.v2.me", UID);
        const ch = applyLists(d);
        if (!cache) { sessionStorage.setItem("xlide.v2.cloud.reloads", "0"); location.reload(); return; }
        if (before !== JSON.stringify(c) || ch.length) maybeReload("Dados atualizados");
      } else {
        const c = await publicLoad();
        const before = JSON.stringify(cache);
        put(CK, c);
        if (!cache) { location.reload(); return; }
        if (before !== JSON.stringify(c)) maybeReload("Programa atualizado");
        setInterval(async () => { try { const n = await publicLoad(); if (JSON.stringify(n.program) !== JSON.stringify((get(CK) || {}).program)) { put(CK, n); location.reload(); } } catch {} }, 20000);
      }
      subscribe();
      setStatus("ok");
    } catch (e) {
      console.warn("[xcloud] sem conexão com o banco", e && e.message);
      setStatus("offline");
      if (!cache) { document.documentElement.style.visibility = ""; const l = document.body && document.body.lastElementChild; if (l) l.textContent = "Sem conexão com o banco. Tente de novo."; }
    }
  }
  addEventListener("online", () => { [...dirty].forEach((k) => flush(k)); });

  window.XCLOUD = {
    on: true, public: PUBLIC, uid: UID, client: sb, cache, now, pushRun,
    onRun(f) { runSubs.add(f); return () => runSubs.delete(f); },
    get status() { return status; },
    /* música recém-criada (POST /api/music/song): entra na cópia local e em XL.songs sem recarregar */
    async refreshSong(id) {
      const { data, error } = await sb.from("xlide_decks").select("id,kind,title,doc,updated_at,owner_id").eq("id", id).maybeSingle();
      if (error || !data) return null;
      const s = song(data), c = get(CK) || {};
      c.songs = { ...(c.songs || {}), [id]: s }; put(CK, c);
      if (window.XL && XL.songs) XL.songs[id] = s;
      return s;
    },
    async token() { const { data } = await sb.auth.getSession(); return data.session && data.session.access_token; },
    async signOut() { await sb.auth.signOut(); ["xlide.v2.cloud", "xlide.v2.me"].forEach((k) => rawRemove.call(LS, k)); location.href = "/login"; },
  };
  boot();
})();
