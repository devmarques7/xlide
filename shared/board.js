// XLIDE boards: a moodboard connected to a mind map. Pure functions shared by
// the app (src/lib/boards.ts), the local server and the Vercel API + MCP.

export const KINDS = ["idea", "stage", "note", "media", "video", "asset", "list", "metric"];

/** Card width per kind (canvas units). */
export const NODE_W = { idea: 340, stage: 250, note: 290, media: 300, video: 200, asset: 170, list: 300, metric: 200 };

/** Rough height per kind, used by the auto layout before the cards are measured. */
export function estimateH(n) {
  return Math.max(n.h ?? 0, baseH(n));
}
function baseH(n) {
  const longText = Math.ceil(((n.text?.length ?? 0) * 7.5) / ((n.w ?? NODE_W[n.kind] ?? 280) - 40)) * 20;
  switch (n.kind) {
    case "idea": return 230;
    case "note": return Math.max(150, 90 + longText) + (n.url ? 40 : 0);
    case "stage": return Math.max(170, 130 + longText);
    case "media": return 280;
    case "video": return 400;
    case "asset": return 190;
    case "list": return 70 + 40 * Math.min(8, n.items?.length ?? 1);
    case "metric": return 130;
    default: return 160;
  }
}

const COL_GAP = 120;
const ROW_GAP = 48;

export function newId(prefix = "n_") {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

/* ───────── video links ───────── */

/**
 * Reads a video link. Instagram (reel, p, tv), YouTube (shorts, watch, youtu.be),
 * TikTok and direct files. `embed` asks for autoplay where the provider allows it.
 */
export function parseVideo(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  const u = url.trim();
  let m = u.match(/instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/i);
  if (m) {
    const type = m[1].toLowerCase() === "p" ? "p" : m[1].toLowerCase() === "tv" ? "tv" : "reel";
    const embed = `https://www.instagram.com/${type}/${m[2]}/embed/`;
    // Instagram has no autoplay in embeds: inline shows the embed itself (cover frame), one tap plays.
    return { provider: "instagram", id: m[2], url: `https://www.instagram.com/${type}/${m[2]}/`, embed, inline: embed, play: embed, autoplay: false, poster: null };
  }
  m = u.match(/(?:youtube\.com\/(?:shorts\/|watch\?(?:.*&)?v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i);
  if (m) {
    const id = m[1];
    return {
      provider: "youtube", id, url: u,
      embed: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&rel=0`,
      inline: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&loop=1&playlist=${id}&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3`,
      // Played inside the card after a click: sound and controls.
      play: `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&playsinline=1&loop=1&playlist=${id}&rel=0&modestbranding=1`,
      autoplay: true,
      poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }
  m = u.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (m) {
    const base = `https://www.tiktok.com/player/v1/${m[1]}?autoplay=1&loop=1&rel=0`;
    return {
      provider: "tiktok", id: m[1], url: u, embed: base,
      inline: `${base}&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&native_context_menu=0`,
      play: base,
      autoplay: true, poster: null,
    };
  }
  if (/^https?:\/\/.+\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(u) || u.startsWith("/api/")) {
    return { provider: "file", id: u, url: u, embed: u, inline: u, play: u, autoplay: true, poster: null };
  }
  return null;
}

/* ───────── moodboard (free canvas, Milanote-style) ───────── */

export const MOOD_TYPES = ["image", "note", "todo", "color", "link", "video", "text", "draw", "shape"];
export const SHAPES = ["rect", "ellipse", "triangle", "line", "arrow"];
const MOOD_SIZE = {
  image: [280, 210], note: [260, 140], todo: [280, 150], color: [170, 190], link: [280, 120],
  video: [200, 356], text: [240, 60], draw: [200, 200], shape: [160, 120],
};

export function cleanMoodItem(raw) {
  const type = MOOD_TYPES.includes(raw?.type) ? raw.type : "note";
  const [dw, dh] = MOOD_SIZE[type];
  const it = {
    id: str(raw?.id, 64) || newId("m_"),
    type,
    x: num(raw?.x) ?? 0,
    y: num(raw?.y) ?? 0,
    w: Math.max(16, num(raw?.w) ?? dw),
    h: Math.max(16, num(raw?.h) ?? dh),
  };
  for (const k of ["src", "caption", "text", "title", "name", "url", "video", "poster", "color", "fill", "size", "ref"]) {
    const v = str(raw?.[k], k === "src" ? 3_000_000 : 4000);
    if (v) it[k] = v;
  }
  if (type === "shape") it.shape = SHAPES.includes(raw?.shape) ? raw.shape : "rect";
  if (Array.isArray(raw?.items)) {
    it.items = raw.items.map((i) => (typeof i === "string" ? { text: i } : { text: str(i?.text, 300) ?? "", done: !!i?.done })).filter((i) => i.text).slice(0, 40);
  }
  if (Array.isArray(raw?.points)) it.points = raw.points.filter((n) => typeof n === "number" && Number.isFinite(n)).map((n) => Math.round(n * 10) / 10).slice(0, 8000);
  for (const k of ["vw", "vh", "stroke", "rot"]) {
    const v = num(raw?.[k]);
    if (v !== undefined) it[k] = v;
  }
  if (raw?.axis === "h" || raw?.axis === "v") it.axis = raw.axis;
  if (raw?.flipX) it.flipX = true;
  if (raw?.flipY) it.flipY = true;
  return it;
}

/** Adds moodboard items; ones without a position go into a tidy grid to the right of what is there. */
export function addMoodItems(board, list) {
  board.mood = board.mood ?? { items: [] };
  const items = board.mood.items;
  const ids = new Set(items.map((i) => i.id));
  const startX = items.length ? Math.max(...items.map((i) => i.x + i.w)) + 80 : 0;
  const colW = 300, gap = 28;
  const colY = [0, 0, 0, 0];
  const added = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const it = cleanMoodItem({ ...raw, id: raw?.id && !ids.has(raw.id) ? raw.id : undefined });
    if (it.type === "text" && it.text) {
      // Room for the lines the text will wrap into (same sizes as the app: sm 14 · md 20 · lg 34 · xl 60).
      const px = { sm: 14, md: 20, lg: 34, xl: 60 }[it.size ?? "md"] ?? 20;
      const perLine = Math.max(1, Math.floor(it.w / (px * 0.52)));
      const lines = it.text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
      it.h = Math.max(it.h, Math.ceil(lines * px * 1.15 + 8));
    }
    if ((num(raw?.x) === undefined || num(raw?.y) === undefined) && it.w > colW * 1.5) {
      // Wide items (titles, banners) take a full row across the columns.
      const top = Math.max(...colY);
      it.w = Math.min(it.w, colW * 4 - gap);
      it.x = startX;
      it.y = top;
      colY.fill(top + it.h + gap);
    } else if (num(raw?.x) === undefined || num(raw?.y) === undefined) {
      // Masonry: the shortest of four columns.
      const c = colY.indexOf(Math.min(...colY));
      if (it.w > colW - gap) {
        it.h = Math.round(it.h * ((colW - gap) / it.w));
        it.w = colW - gap;
      }
      it.x = startX + c * colW;
      it.y = colY[c];
      colY[c] += it.h + gap;
    }
    ids.add(it.id);
    items.push(it);
    added.push(it);
  }
  return added;
}

/* ───────── Instagram profiles mentioned in a board ───────── */

const IG_RESERVED = new Set(["p", "reel", "reels", "tv", "explore", "stories", "accounts", "direct", "about", "legal", "developer", "api", "embed", "s"]);

/**
 * Every Instagram link on the board, with where it appears. A link names its
 * profile directly (instagram.com/name/…) or only a post (instagram.com/reel/CODE),
 * whose author is looked up later.
 */
export function instagramLinks(board) {
  const out = new Map();
  const add = (raw, source) => {
    const re = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{1,30})(?:\/(reels?|p|tv)\/([A-Za-z0-9_-]+))?(?:\/([A-Za-z0-9_-]+))?/gi;
    for (const m of String(raw ?? "").matchAll(re)) {
      let user = m[1], type = m[2], code = m[3];
      if (IG_RESERVED.has(user.toLowerCase())) {
        // instagram.com/reel/CODE: no user in the link
        type = user.toLowerCase() === "reels" ? "reel" : user.toLowerCase();
        code = m[4] ?? (m[2] && !m[3] ? undefined : m[3]);
        if (!["reel", "p", "tv"].includes(type)) continue;
        user = undefined;
        // the second path segment is the shortcode
        const seg = /instagram\.com\/(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/i.exec(m[0]);
        code = seg?.[1];
        if (!code) continue;
      } else if (type) {
        type = type.toLowerCase() === "reels" ? "reel" : type.toLowerCase();
      }
      const key = code ? `code:${code}` : `user:${user.toLowerCase()}`;
      const entry = out.get(key) ?? { key, user: user?.toLowerCase(), code, type, url: m[0].startsWith("http") ? m[0] : `https://${m[0]}`, sources: [] };
      if (!entry.sources.some((s) => s.id === source.id)) entry.sources.push(source);
      out.set(key, entry);
    }
  };
  for (const n of board.nodes) for (const v of [n.video, n.url, n.text, n.subtitle, ...(n.items ?? []).map((i) => i.text)]) add(v, { kind: "node", id: n.id, title: n.title });
  for (const m of board.mood?.items ?? []) for (const v of [m.video, m.url, m.text, m.caption, m.title]) add(v, { kind: "mood", id: m.id, title: m.caption || m.title || m.type });
  for (const v of [board.idea, board.summary]) add(v, { kind: "board", id: board.id, title: board.title });
  return [...out.values()];
}

/* ───────── normalize ───────── */

const str = (v, max = 4000) => (typeof v === "string" ? v.slice(0, max) : v == null ? undefined : String(v).slice(0, max));
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function cleanNode(raw, fallbackId) {
  const kind = KINDS.includes(raw?.kind) ? raw.kind : "note";
  const n = { id: str(raw?.id, 64) || fallbackId || newId(), kind, title: str(raw?.title, 200) ?? "" };
  const text = str(raw?.text);
  if (text) n.text = text;
  for (const k of ["tag", "url", "file_type", "value", "by", "poster", "subtitle"]) {
    const v = str(raw?.[k], 2000);
    if (v) n[k] = v;
  }
  const video = str(raw?.video, 2000);
  if (video) n.video = video;
  if (kind === "video" && !n.video && n.url) n.video = n.url;
  if (Array.isArray(raw?.tags)) n.tags = raw.tags.map((t) => str(t, 40)).filter(Boolean).slice(0, 8);
  if (Array.isArray(raw?.images)) n.images = raw.images.map((t) => str(t, 4000)).filter(Boolean).slice(0, 12);
  if (Array.isArray(raw?.items)) {
    n.items = raw.items
      .map((it) => (typeof it === "string" ? { text: it } : { text: str(it?.text, 300) ?? "", done: !!it?.done, by: str(it?.by, 40) }))
      .filter((it) => it.text)
      .slice(0, 30);
  }
  const step = num(raw?.step);
  if (step !== undefined) n.step = step;
  const progress = num(raw?.progress);
  if (progress !== undefined) n.progress = Math.max(0, Math.min(100, progress));
  const x = num(raw?.x), y = num(raw?.y);
  if (x !== undefined && y !== undefined) { n.x = x; n.y = y; }
  // Size set by stretching the card (height is a minimum: the text always fits).
  const w = num(raw?.w), h = num(raw?.h);
  if (w !== undefined) n.w = Math.max(140, Math.min(1200, Math.round(w)));
  if (h !== undefined) n.h = Math.max(60, Math.min(2000, Math.round(h)));
  return n;
}

export function normalizeBoard(raw) {
  const now = Date.now();
  const b = {
    id: str(raw?.id, 64) || newId("b_"),
    title: str(raw?.title, 200) || "Untitled board",
    idea: str(raw?.idea) || "",
    accent: /^#[0-9a-f]{6}$/i.test(raw?.accent ?? "") ? raw.accent : "#e0512b",
    createdAt: num(raw?.createdAt) ?? now,
    updatedAt: num(raw?.updatedAt) ?? now,
    nodes: [],
    edges: [],
  };
  if (raw?.summary) b.summary = str(raw.summary);
  if (raw?.arranged) b.arranged = true;
  if (raw?.layout === "vertical") b.layout = "vertical";
  if (Array.isArray(raw?.mood?.items)) b.mood = { items: raw.mood.items.map((i) => cleanMoodItem(i)) };
  const seen = new Set();
  for (const n of Array.isArray(raw?.nodes) ? raw.nodes : []) {
    const c = cleanNode(n);
    if (seen.has(c.id)) c.id = newId();
    seen.add(c.id);
    b.nodes.push(c);
  }
  for (const e of Array.isArray(raw?.edges) ? raw.edges : []) {
    if (!seen.has(e?.from) || !seen.has(e?.to) || e.from === e.to) continue;
    b.edges.push({ id: str(e.id, 64) || newId("e_"), from: e.from, to: e.to, ...(e.label ? { label: str(e.label, 80) } : {}) });
  }
  return b;
}

/* ───────── layout: a left-to-right mind map ───────── */

/** Places nodes without a position (or every node with `all`). Roots are nodes nobody points to.
 *  board.layout: "horizontal" (default, left → right) or "vertical" (top → bottom). */
export function layoutBoard(board, all = false) {
  const nodes = board.nodes;
  if (!nodes.length) return board;
  const vertical = board.layout === "vertical";
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = new Map(nodes.map((n) => [n.id, []]));
  const hasParent = new Set();
  for (const e of board.edges) {
    if (!byId.has(e.from) || !byId.has(e.to) || hasParent.has(e.to)) continue;
    kids.get(e.from).push(e.to);
    hasParent.add(e.to);
  }
  for (const list of kids.values()) {
    list.sort((a, b) => (byId.get(a).step ?? 1e9) - (byId.get(b).step ?? 1e9));
  }
  const roots = nodes.filter((n) => !hasParent.has(n.id)).sort((a, b) => (a.kind === "idea" ? -1 : 0) - (b.kind === "idea" ? -1 : 0));
  const needs = (n) => all || n.x === undefined || n.y === undefined;
  if (!nodes.some(needs)) return board;
  if (!all && nodes.some((n) => !needs(n))) return placeNew(board, byId);

  // "Depth" runs along the flow (x when horizontal, y when vertical); "breadth" spreads siblings.
  const W = (n) => n.w ?? NODE_W[n.kind] ?? 280;
  const depthSize = (n) => (vertical ? estimateH(n) : W(n));
  const breadthSize = (n) => (vertical ? W(n) : estimateH(n));
  const DEPTH_GAP = vertical ? 110 : COL_GAP;
  const BREADTH_GAP = vertical ? 40 : ROW_GAP;

  const depth = new Map();
  const visited = new Set();
  const walkDepth = (id, d) => {
    if (visited.has(id)) return;
    visited.add(id);
    depth.set(id, d);
    for (const k of kids.get(id)) walkDepth(k, d + 1);
  };
  roots.forEach((r) => walkDepth(r.id, 0));
  const band = [];
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    band[d] = Math.max(band[d] ?? 0, depthSize(n));
  }
  const bandAt = [0];
  for (let i = 1; i < band.length; i++) bandAt[i] = bandAt[i - 1] + band[i - 1] + DEPTH_GAP;

  const sub = new Map();
  const span = (id, seen = new Set()) => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const own = breadthSize(byId.get(id));
    const total = kids.get(id).reduce((s, k, i) => s + span(k, seen) + (i ? BREADTH_GAP : 0), 0);
    const v = Math.max(own, total);
    sub.set(id, v);
    return v;
  };
  const place = (id, start, placed) => {
    if (placed.has(id)) return;
    placed.add(id);
    const n = byId.get(id);
    const s = sub.get(id) ?? breadthSize(n);
    if (needs(n)) {
      const along = bandAt[depth.get(id) ?? 0];
      const across = Math.round(start + s / 2 - breadthSize(n) / 2);
      if (vertical) {
        n.x = across;
        n.y = along;
      } else {
        n.x = along;
        n.y = across;
      }
    }
    const ch = kids.get(id);
    const total = ch.reduce((acc, k, i) => acc + (sub.get(k) ?? 0) + (i ? BREADTH_GAP : 0), 0);
    let at = start + s / 2 - total / 2;
    for (const k of ch) {
      place(k, at, placed);
      at += (sub.get(k) ?? 0) + BREADTH_GAP;
    }
  };
  let at = 0;
  const placed = new Set();
  for (const r of roots) {
    span(r.id);
    place(r.id, at, placed);
    at += (sub.get(r.id) ?? 0) + BREADTH_GAP * 3;
  }
  return board;
}

/** Cards added to an arranged board: after their parent along the flow, beside its other branches, never on top of another card. */
function placeNew(board, byId) {
  const vertical = board.layout === "vertical";
  const rect = (n) => ({ x: n.x, y: n.y, w: n.w ?? NODE_W[n.kind] ?? 280, h: estimateH(n) });
  const placed = board.nodes.filter((n) => n.x !== undefined && n.y !== undefined).map(rect);
  const hits = (r) => placed.some((p) => r.x < p.x + p.w + 24 && r.x + r.w + 24 > p.x && r.y < p.y + p.h + 24 && r.y + r.h + 24 > p.y);
  for (const n of board.nodes) {
    if (n.x !== undefined && n.y !== undefined) continue;
    const pe = board.edges.find((e) => e.to === n.id && byId.get(e.from)?.x !== undefined);
    const parent = pe ? byId.get(pe.from) : null;
    const r = { x: 0, y: 0, w: NODE_W[n.kind] ?? 280, h: estimateH(n) };
    if (parent) {
      const sibs = board.edges.filter((e) => e.from === parent.id && e.to !== n.id).map((e) => byId.get(e.to)).filter((s) => s?.x !== undefined);
      if (vertical) {
        r.y = sibs.length ? Math.min(...sibs.map((s) => s.y)) : parent.y + estimateH(parent) + 110;
        r.x = parent.x;
      } else {
        r.x = sibs.length ? Math.min(...sibs.map((s) => s.x)) : parent.x + (NODE_W[parent.kind] ?? 280) + COL_GAP;
        r.y = parent.y;
      }
    } else if (vertical) {
      r.y = Math.min(...placed.map((p) => p.y));
      r.x = Math.max(...placed.map((p) => p.x + p.w)) + 80;
    } else {
      r.x = Math.min(...placed.map((p) => p.x));
      r.y = Math.max(...placed.map((p) => p.y + p.h)) + ROW_GAP * 2;
    }
    for (let i = 0; i < 400 && hits(r); i++) {
      if (vertical) r.x += 32;
      else r.y += 32;
    }
    n.x = Math.round(r.x);
    n.y = Math.round(r.y);
    placed.push(r);
  }
  return board;
}

/* ───────── edits (used by the MCP tools) ───────── */

/** Adds nodes; each may name a `parent` (an existing id or the id of an earlier node in the list). */
export function addNodes(board, list) {
  const ids = new Set(board.nodes.map((n) => n.id));
  const added = [];
  for (const raw of Array.isArray(list) ? list : []) {
    let id = str(raw?.id, 64);
    if (!id || ids.has(id)) id = newId();
    const n = cleanNode({ ...raw, id });
    ids.add(n.id);
    board.nodes.push(n);
    added.push(n);
    const parents = [raw?.parent, ...(Array.isArray(raw?.parents) ? raw.parents : [])].filter(Boolean);
    for (const p of parents) {
      if (ids.has(p) && p !== n.id) board.edges.push({ id: newId("e_"), from: p, to: n.id, ...(raw?.edge_label ? { label: str(raw.edge_label, 80) } : {}) });
    }
  }
  // Until someone arranges the cards by hand, the whole map is re-laid out.
  layoutBoard(board, !board.arranged);
  return added;
}

export function connect(board, edges) {
  const ids = new Set(board.nodes.map((n) => n.id));
  const out = [];
  for (const e of Array.isArray(edges) ? edges : []) {
    if (!ids.has(e?.from) || !ids.has(e?.to) || e.from === e.to) continue;
    if (board.edges.some((x) => x.from === e.from && x.to === e.to)) continue;
    const edge = { id: newId("e_"), from: e.from, to: e.to, ...(e.label ? { label: str(e.label, 80) } : {}) };
    board.edges.push(edge);
    out.push(edge);
  }
  return out;
}

export function updateNode(board, id, patch) {
  const i = board.nodes.findIndex((n) => n.id === id);
  if (i < 0) return null;
  const merged = cleanNode({ ...board.nodes[i], ...patch, id, kind: patch?.kind ?? board.nodes[i].kind });
  board.nodes[i] = merged;
  return merged;
}

export function removeItems(board, nodeIds = [], edgeIds = []) {
  const drop = new Set(nodeIds);
  if (board.mood) board.mood.items = board.mood.items.filter((i) => !drop.has(i.id));
  board.nodes = board.nodes.filter((n) => !drop.has(n.id));
  board.edges = board.edges.filter((e) => !drop.has(e.from) && !drop.has(e.to) && !edgeIds.includes(e.id));
}

/** Point-to-point outline: idea → stages (by step) → what hangs under each stage. */
export function outline(board) {
  const byId = new Map(board.nodes.map((n) => [n.id, n]));
  const kids = (id) => board.edges.filter((e) => e.from === id).map((e) => byId.get(e.to)).filter(Boolean);
  const stages = board.nodes.filter((n) => n.kind === "stage").sort((a, b) => (a.step ?? 1e9) - (b.step ?? 1e9));
  const under = (id, seen = new Set()) => {
    const out = [];
    for (const k of kids(id)) {
      if (seen.has(k.id) || k.kind === "stage") continue;
      seen.add(k.id);
      out.push(k, ...under(k.id, seen));
    }
    return out;
  };
  const assigned = new Set(stages.flatMap((s) => [s.id, ...under(s.id).map((n) => n.id)]));
  return {
    stages: stages.map((s) => ({ stage: s, items: under(s.id) })),
    loose: board.nodes.filter((n) => !assigned.has(n.id) && n.kind !== "idea"),
  };
}

/* ───────── MCP (Streamable HTTP, stateless JSON-RPC) ───────── */

const NODE_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", description: "Optional short key (e.g. 'stage-1'). Lets later nodes in the same call use it as `parent`." },
    kind: { type: "string", enum: KINDS, description: "idea = the central card · stage = a funnel step · note = insight/copy/brief · media = image moodboard (images[]) · video = a reel to watch (video: Instagram/YouTube/TikTok/mp4 link) · asset = a file or link deliverable (file_type: pdf, link, doc, x, instagram, figma…) · list = checklist (items[]) · metric = KPI (value + title)" },
    title: { type: "string" },
    text: { type: "string", description: "Body text, a few sentences at most. Wrap key words in ==double equals== to highlight them: in the app, clicking a highlight lights up the card that names that word (so name a card's title, e.g. ==Território==)." },
    parent: { type: "string", description: "Id of the node this one branches from (draws a dotted connection)." },
    parents: { type: "array", items: { type: "string" }, description: "Extra parents, for nodes that join two branches." },
    edge_label: { type: "string" },
    step: { type: "number", description: "Order of a stage in the funnel (1 = top)." },
    tag: { type: "string", description: "One short chip, e.g. 'Topo', 'AI'." },
    tags: { type: "array", items: { type: "string" } },
    images: { type: "array", items: { type: "string" }, description: "https image URLs (media cards show up to 3 stacked)." },
    video: { type: "string", description: "Video link: instagram.com/reel/…, youtube.com/shorts/…, tiktok.com/…/video/…, or an .mp4 URL." },
    poster: { type: "string", description: "Optional cover image for a video card." },
    url: { type: "string" },
    file_type: { type: "string" },
    subtitle: { type: "string" },
    items: { type: "array", items: { type: "object", properties: { text: { type: "string" }, done: { type: "boolean" } }, required: ["text"] } },
    value: { type: "string", description: "Metric value, e.g. '3.2%' or '12k'." },
    progress: { type: "number", description: "0–100, shown on stage cards." },
    by: { type: "string", description: "Owner name; shows initials beside the card." },
    x: { type: "number" },
    y: { type: "number" },
  },
  required: ["kind", "title"],
};

const TOOLS = [
  {
    name: "list_boards",
    description: "List XLIDE boards (moodboard + mind map) with id, title, idea, node counts and link.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_board",
    description: "Read one board: every node, edge and the point-to-point outline (idea → funnel stages → items).",
    inputSchema: { type: "object", properties: { board_id: { type: "string" } }, required: ["board_id"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_board",
    description:
      "Create a board from an idea. Send the whole map in one call: one `idea` node, `stage` nodes with step 1..n and parent = the idea, " +
      "then notes, media, videos, assets, lists and metrics with parent = their stage. Positions are laid out automatically as a mind map. " +
      "Returns the board id and the link to open it live in XLIDE.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        idea: { type: "string", description: "The idea in one or two sentences, as the user gave it." },
        summary: { type: "string", description: "The strategy in a short paragraph." },
        accent: { type: "string", description: "Hex accent colour, default #e0512b." },
        layout: { type: "string", enum: ["horizontal", "vertical"], description: "Mind map direction: horizontal (left → right, default) or vertical (top → bottom)." },
        nodes: { type: "array", items: NODE_SCHEMA },
      },
      required: ["title", "idea"],
    },
  },
  {
    name: "add_nodes",
    description: "Expand a board: add cards (each may branch from an existing node via `parent`). Open boards update live.",
    inputSchema: { type: "object", properties: { board_id: { type: "string" }, nodes: { type: "array", items: NODE_SCHEMA } }, required: ["board_id", "nodes"] },
  },
  {
    name: "update_node",
    description: "Change fields of one card (title, text, images, video, items, progress, position…).",
    inputSchema: {
      type: "object",
      properties: { board_id: { type: "string" }, node_id: { type: "string" }, patch: { ...NODE_SCHEMA, required: [] } },
      required: ["board_id", "node_id", "patch"],
    },
  },
  {
    name: "connect_nodes",
    description: "Draw dotted connections between existing cards.",
    inputSchema: {
      type: "object",
      properties: {
        board_id: { type: "string" },
        edges: { type: "array", items: { type: "object", properties: { from: { type: "string" }, to: { type: "string" }, label: { type: "string" } }, required: ["from", "to"] } },
      },
      required: ["board_id", "edges"],
    },
  },
  {
    name: "remove_items",
    description: "Delete cards (and their connections) or single connections.",
    inputSchema: {
      type: "object",
      properties: { board_id: { type: "string" }, node_ids: { type: "array", items: { type: "string" } }, edge_ids: { type: "array", items: { type: "string" } } },
      required: ["board_id"],
    },
    annotations: { destructiveHint: true },
  },
  {
    name: "add_mood_items",
    description:
      "Add items to the board's moodboard: a free white canvas (like Milanote) next to the mind map. Types: image (src = https image URL, caption), " +
      "note (text), todo (title + items), color (color hex + name), link (url + title + text), video (video = Instagram/YouTube/TikTok/mp4 link), " +
      "text (a free label), shape (shape: rect|ellipse|triangle|line|arrow, color, fill). Without x/y the items are arranged in a masonry grid.",
    inputSchema: {
      type: "object",
      properties: {
        board_id: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: MOOD_TYPES.filter((t) => t !== "draw") },
              src: { type: "string" }, caption: { type: "string" }, text: { type: "string" }, title: { type: "string" },
              items: { type: "array", items: { type: "string" } }, color: { type: "string" }, name: { type: "string" },
              url: { type: "string" }, video: { type: "string" }, poster: { type: "string" }, shape: { type: "string", enum: SHAPES },
              fill: { type: "string" }, size: { type: "string", enum: ["sm", "md", "lg", "xl"] },
              stroke: { type: "number", description: "Line width for shapes, lines and arrows (2–14)." },
              axis: { type: "string", enum: ["h", "v"], description: "Lines/arrows: h = straight horizontal across w, v = straight vertical down h. Omit for a diagonal from the top-left to the bottom-right corner." },
              flipX: { type: "boolean", description: "Lines/arrows point the other way (right→left, or bottom-left→top-right for diagonals)." },
              flipY: { type: "boolean", description: "Lines/arrows point upwards (bottom→top)." },
              x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" },
            },
            required: ["type"],
          },
        },
      },
      required: ["board_id", "items"],
    },
  },
  {
    name: "update_board",
    description: "Rename a board, rewrite its idea/summary/accent, switch the mind map direction (layout), or re-run the layout (relayout: true).",
    inputSchema: {
      type: "object",
      properties: {
        board_id: { type: "string" }, title: { type: "string" }, idea: { type: "string" }, summary: { type: "string" }, accent: { type: "string" },
        layout: { type: "string", enum: ["horizontal", "vertical"], description: "Switch the mind map direction (re-lays out the map)." },
        relayout: { type: "boolean" },
      },
      required: ["board_id"],
    },
  },
];

export const MCP_INSTRUCTIONS =
  "XLIDE boards turn an idea into a visual strategy: a mind map (dotted connections) plus a moodboard and a point-to-point funnel view. " +
  "Workflow: 1) create_board with the whole first version in one call — the idea card at the centre, 3–5 funnel stages (step 1 = top of funnel), " +
  "and under each stage the insight (note), references (media images, video reels), deliverables (asset), tasks (list) and KPI (metric). " +
  "2) Share the returned link; the board updates live while it is open. 3) Expand with add_nodes, refine with update_node. " +
  "Use real https links for images and videos only — never invent URLs. Write in the user's language. " +
  "The moodboard (add_mood_items) is a free white canvas for references: images, notes, to-dos, colour swatches, links, reels, labels and shapes.";

function summarize(b, origin) {
  return { id: b.id, title: b.title, idea: b.idea, nodes: b.nodes.length, edges: b.edges.length, updatedAt: b.updatedAt, url: `${origin}/b/${b.id}` };
}

async function callTool(name, args, store, origin) {
  const load = async () => {
    const b = await store.get(String(args?.board_id ?? ""));
    if (!b) throw new Error(`Board not found: ${args?.board_id}. Use list_boards.`);
    return normalizeBoard(b);
  };
  const save = async (b) => {
    b.updatedAt = Date.now();
    await store.put(b);
    return b;
  };
  switch (name) {
    case "list_boards":
      return { boards: (await store.list()).map((b) => summarize(b, origin)).sort((a, b) => b.updatedAt - a.updatedAt) };
    case "get_board": {
      const b = await load();
      const o = outline(b);
      return {
        ...summarize(b, origin),
        summary: b.summary,
        accent: b.accent,
        outline: o.stages.map((s) => ({ step: s.stage.step, stage: s.stage.title, id: s.stage.id, items: s.items.map((n) => `${n.kind}: ${n.title} (${n.id})`) })),
        nodes: b.nodes,
        edges: b.edges,
        moodboard: (b.mood?.items ?? []).map((i) => ({ ...i, points: i.points ? `${i.points.length / 2} points` : undefined, src: i.src?.startsWith("data:") ? "(uploaded image)" : i.src })),
      };
    }
    case "create_board": {
      const b = normalizeBoard({ title: args?.title, idea: args?.idea, summary: args?.summary, accent: args?.accent, layout: args?.layout });
      const list = Array.isArray(args?.nodes) ? [...args.nodes] : [];
      if (!list.some((n) => n?.kind === "idea")) list.unshift({ id: "idea", kind: "idea", title: b.title, text: b.idea });
      addNodes(b, list);
      await save(b);
      return { ...summarize(b, origin), node_ids: b.nodes.map((n) => ({ id: n.id, kind: n.kind, title: n.title })) };
    }
    case "add_nodes": {
      const b = await load();
      const added = addNodes(b, args?.nodes);
      await save(b);
      return { added: added.map((n) => ({ id: n.id, kind: n.kind, title: n.title })), url: `${origin}/b/${b.id}` };
    }
    case "update_node": {
      const b = await load();
      const n = updateNode(b, String(args?.node_id), args?.patch ?? {});
      if (!n) throw new Error(`Node not found: ${args?.node_id}`);
      if (args?.patch?.parent) connect(b, [{ from: args.patch.parent, to: n.id }]);
      await save(b);
      return { node: n };
    }
    case "connect_nodes": {
      const b = await load();
      const added = connect(b, args?.edges);
      await save(b);
      return { added };
    }
    case "remove_items": {
      const b = await load();
      const before = [b.nodes.length, b.edges.length];
      removeItems(b, args?.node_ids ?? [], args?.edge_ids ?? []);
      await save(b);
      return { removed_nodes: before[0] - b.nodes.length, removed_edges: before[1] - b.edges.length };
    }
    case "add_mood_items": {
      const b = await load();
      const added = addMoodItems(b, args?.items);
      await save(b);
      return { added: added.map((i) => ({ id: i.id, type: i.type })), url: `${origin}/b/${b.id}` };
    }
    case "update_board": {
      const b = await load();
      if (args?.title) b.title = String(args.title).slice(0, 200);
      if (args?.idea) b.idea = String(args.idea);
      if (args?.summary !== undefined) b.summary = String(args.summary);
      if (/^#[0-9a-f]{6}$/i.test(args?.accent ?? "")) b.accent = args.accent;
      if (args?.layout === "vertical" || args?.layout === "horizontal") {
        if (args.layout === "vertical") b.layout = "vertical";
        else delete b.layout;
        args.relayout = true;
      }
      if (args?.relayout) {
        layoutBoard(b, true);
        b.arranged = false;
      }
      await save(b);
      return summarize(b, origin);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

/** One JSON-RPC message in, one response out (null for notifications). */
export async function handleMcpMessage(msg, store, origin) {
  const id = msg?.id;
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(-32600, "Invalid request");
  if (id === undefined || id === null) return null; // notification
  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      return reply({
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "xlide-boards", title: "XLIDE Boards", version: "1.0.0" },
        instructions: MCP_INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      try {
        const out = await callTool(msg.params?.name, msg.params?.arguments ?? {}, store, origin);
        return reply({ content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out, isError: false });
      } catch (e) {
        return reply({ content: [{ type: "text", text: String(e?.message ?? e) }], isError: true });
      }
    }
    case "resources/list":
      return reply({ resources: [] });
    case "prompts/list":
      return reply({ prompts: [] });
    default:
      return fail(-32601, `Method not found: ${msg.method}`);
  }
}

/** Handles a POST body (single message or batch). Returns { status, body }. */
export async function handleMcpBody(body, store, origin) {
  const parsed = typeof body === "string" ? safeParse(body) : body;
  if (parsed === undefined) return { status: 400, body: { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } } };
  if (Array.isArray(parsed)) {
    const out = (await Promise.all(parsed.map((m) => handleMcpMessage(m, store, origin)))).filter(Boolean);
    return out.length ? { status: 200, body: out } : { status: 202, body: null };
  }
  const out = await handleMcpMessage(parsed, store, origin);
  return out ? { status: 200, body: out } : { status: 202, body: null };
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Accepts `Authorization: Bearer <key>` or `?key=<key>`. */
export function mcpAuthorized(headers, query, key) {
  const auth = headers?.authorization || headers?.Authorization || "";
  const bearer = /^Bearer\s+(.+)$/i.exec(auth)?.[1];
  return bearer === key || query?.key === key;
}
