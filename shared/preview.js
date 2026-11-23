// Board previews as SVG (the server turns them into PNG for the MCP). Pure
// functions: no DOM. Mirrors the app's look closely enough for an AI (or a
// person) to judge layout, order and density at a glance.
import { estimateH, NODE_W, outline, parseVideo } from "./board.js";
import { luminance, parseWeights, WEIGHT_NAMES } from "./brand.js";

const INK = "#161615";
const MUTED = "#6f6e69";
const PAPER = "#f1f0ec";
const MOOD_PAPER = "#f3f2ee";
const FONT = "Inter";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s) => String(s ?? "").replace(/==([^=\n]+)==/g, "$1");

/** Greedy word wrap with an average glyph width (good enough for a preview). */
export function wrap(text, width, size, maxLines = 999) {
  const per = Math.max(4, Math.floor(width / (size * 0.53)));
  const out = [];
  for (const para of plain(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const next = line ? `${line} ${word}` : word;
      if (next.length > per && line) {
        out.push(line);
        line = word.length > per ? word.slice(0, per) : word;
      } else line = next.length > per ? next.slice(0, per) : next;
    }
    out.push(line);
  }
  if (out.length > maxLines) {
    const cut = out.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/.{0,2}$/, "…");
    return cut;
  }
  return out;
}

function textBlock(x, y, lines, size, color = INK, weight = 400, lh = 1.3, family = FONT, extra = "") {
  if (!lines.length) return { svg: "", h: 0 };
  const fam = family === FONT ? FONT : `'${family}', ${FONT}`;
  const svg = `<text x="${x}" y="${y + size}" font-family="${fam}" font-size="${size}" font-weight="${weight}" fill="${color}"${extra}>${lines
    .map((l, i) => `<tspan x="${x}" dy="${i ? size * lh : 0}">${esc(l)}</tspan>`)
    .join("")}</text>`;
  return { svg, h: size + (lines.length - 1) * size * lh };
}

/* ───────── mind map ───────── */

function nodeBox(n) {
  const w = n.w ?? NODE_W[n.kind] ?? 280;
  return { x: n.x ?? 0, y: n.y ?? 0, w, h: Math.max(n.h ?? 0, mapCardHeight(n, w)) };
}

function mapCardHeight(n, w) {
  const inner = w - 40;
  if (n.kind === "video") return Math.round(w * 16 / 9);
  if (n.kind === "media") return 230;
  if (n.kind === "asset") return 190;
  if (n.kind === "metric") return 110 + wrap(n.text ?? "", inner, 12).length * 16;
  const title = wrap(n.title, inner, n.kind === "idea" ? 26 : 16).length * (n.kind === "idea" ? 28 : 21);
  const text = n.text ? wrap(n.text, inner, 13).length * 17 + 10 : 0;
  const items = (n.items ?? []).reduce((s, it) => s + wrap(it.text, inner - 26, 13).length * 17 + 10, 0);
  return Math.max(estimateH(n) * 0.6, 44 + title + text + items + (n.kind === "stage" ? 46 : 0) + (n.kind === "idea" ? 40 : 0));
}

function mapCard(n, accent) {
  const b = nodeBox(n);
  const { x, y, w, h } = b;
  const pad = 20, inner = w - pad * 2;
  const parts = [];
  if (n.kind === "video") {
    const info = parseVideo(n.video);
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#111"/>`);
    parts.push(`<polygon points="${x + w / 2 - 12},${y + h / 2 - 16} ${x + w / 2 + 16},${y + h / 2} ${x + w / 2 - 12},${y + h / 2 + 16}" fill="#fff"/>`);
    parts.push(textBlock(x + 12, y + 10, [(info?.provider ?? "video").toUpperCase()], 10, "#bbb", 600).svg);
    parts.push(textBlock(x + 12, y + h - 50, wrap(n.title, w - 24, 13, 2), 13, "#fff", 600).svg);
    return { svg: parts.join(""), box: b };
  }
  const dark = n.kind === "idea";
  const fill = dark ? INK : n.kind === "note" ? "#e6e5e0" : "#ffffff";
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${dark ? INK : "#d6d5cf"}"/>`);
  let cy = y + pad;
  const fg = dark ? "#f1f0ec" : INK;
  if (n.kind === "stage") {
    parts.push(textBlock(x + pad, cy, [String(n.step ?? "·").padStart(2, "0")], 30, accent, 400).svg);
    cy += 46;
  }
  if (n.kind === "idea") {
    parts.push(textBlock(x + pad, cy, ["IDEA"], 10, "#9a9994", 600).svg);
    cy += 24;
  }
  if (n.kind === "metric") {
    parts.push(textBlock(x + pad, cy, wrap(n.title, inner, 11, 2).map((l) => l.toUpperCase()), 11, MUTED, 600).svg);
    cy += 22;
    parts.push(textBlock(x + pad, cy, [plain(n.value ?? "—")], 30, INK, 600).svg);
    cy += 40;
    if (n.text) parts.push(textBlock(x + pad, cy, wrap(n.text, inner, 12), 12, MUTED).svg);
    return { svg: parts.join(""), box: b };
  }
  const titleSize = n.kind === "idea" ? 26 : 16;
  const t = textBlock(x + pad, cy, wrap(n.kind === "stage" || n.kind === "idea" ? plain(n.title).toUpperCase() : n.title, inner, titleSize), titleSize, fg, 600, 1.1);
  parts.push(t.svg);
  cy += t.h + 10;
  if (n.text) {
    const tx = textBlock(x + pad, cy, wrap(n.text, inner, 13), 13, dark ? "#c9c8c2" : MUTED);
    parts.push(tx.svg);
    cy += tx.h + 10;
  }
  for (const it of n.items ?? []) {
    parts.push(`<rect x="${x + pad}" y="${cy + 2}" width="12" height="12" fill="${it.done ? accent : "none"}" stroke="${it.done ? accent : "#c9c8c2"}"/>`);
    const tx = textBlock(x + pad + 22, cy, wrap(it.text, inner - 22, 13), 13, it.done ? MUTED : INK);
    parts.push(tx.svg);
    cy += tx.h + 10;
  }
  if (n.kind === "asset") parts.push(`<rect x="${x + 8}" y="${y + 8}" width="${w - 16}" height="${(w - 16) * 0.6}" fill="${(n.file_type ?? "").toLowerCase().includes("pdf") ? accent : INK}"/>`);
  if (n.kind === "media") {
    parts.push(`<rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 50}" fill="#d9d8d2"/>`);
    parts.push(textBlock(x + 10, y + h - 34, wrap(n.title, w - 20, 13, 1), 13, INK, 600).svg);
  }
  return { svg: parts.join(""), box: b };
}

function edgePath(a, b, vertical) {
  if (vertical && b.y >= a.y + a.h * 0.6) {
    const s = [a.x + a.w / 2, a.y + a.h], d = [b.x + b.w / 2, b.y], k = Math.max(40, (d[1] - s[1]) / 2);
    return `M${s[0]},${s[1]} C${s[0]},${s[1] + k} ${d[0]},${d[1] - k} ${d[0]},${d[1]}`;
  }
  if (b.x >= a.x + a.w * 0.6) {
    const s = [a.x + a.w, a.y + a.h / 2], d = [b.x, b.y + b.h / 2], k = Math.max(50, (d[0] - s[0]) / 2);
    return `M${s[0]},${s[1]} C${s[0] + k},${s[1]} ${d[0] - k},${d[1]} ${d[0]},${d[1]}`;
  }
  if (b.x + b.w <= a.x) {
    const s = [a.x, a.y + a.h / 2], d = [b.x + b.w, b.y + b.h / 2], k = Math.max(50, (s[0] - d[0]) / 2);
    return `M${s[0]},${s[1]} C${s[0] - k},${s[1]} ${d[0] + k},${d[1]} ${d[0]},${d[1]}`;
  }
  const down = b.y > a.y;
  const s = [a.x + a.w / 2, down ? a.y + a.h : a.y], d = [b.x + b.w / 2, down ? b.y : b.y + b.h];
  const k = Math.max(40, Math.abs(d[1] - s[1]) / 2) * (down ? 1 : -1);
  return `M${s[0]},${s[1]} C${s[0]},${s[1] + k} ${d[0]},${d[1] - k} ${d[0]},${d[1]}`;
}

export function mapSvg(board) {
  const accent = board.accent || "#e0512b";
  const cards = board.nodes.map((n) => mapCard(n, accent));
  const boxes = new Map(board.nodes.map((n, i) => [n.id, cards[i].box]));
  const vertical = board.layout === "vertical";
  const edges = board.edges
    .map((e) => {
      const a = boxes.get(e.from), b = boxes.get(e.to);
      if (!a || !b) return "";
      return `<path d="${edgePath(a, b, vertical)}" fill="none" stroke="${INK}" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>`;
    })
    .join("");
  return frame([...boxes.values()], PAPER, edges + cards.map((c) => c.svg).join(""), `${board.title} — mind map`);
}

/* ───────── moodboard ───────── */

const TEXT_PX = { sm: 14, md: 20, lg: 34, xl: 60 };

function moodItem(it, accent, images) {
  const { x, y, w } = it;
  let h = it.h;
  const parts = [];
  const card = (hh, fill = "#fff") => `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${fill}" filter="url(#sh)"/>`;
  switch (it.type) {
    case "image": {
      const src = images.get(it.src);
      const capH = it.caption ? 34 : 0;
      parts.push(card(h));
      parts.push(src ? `<image href="${src}" x="${x}" y="${y}" width="${w}" height="${h - capH}" preserveAspectRatio="xMidYMid slice"/>` : `<rect x="${x}" y="${y}" width="${w}" height="${h - capH}" fill="#e2e1dc"/>`);
      if (it.caption) parts.push(textBlock(x + 10, y + h - capH + 8, wrap(it.caption, w - 20, 12, 1), 12, MUTED).svg);
      break;
    }
    case "note": {
      const tt = it.title ? wrap(it.title, w - 32, 15) : [];
      const tx = wrap(it.text ?? "", w - 32, 14);
      h = Math.max(h, 32 + tt.length * 20 + (tt.length ? 6 : 0) + tx.length * 19);
      parts.push(card(h));
      if (it.color && it.color !== "#ffffff" && it.color !== INK) parts.push(`<rect x="${x}" y="${y}" width="${w}" height="4" fill="${it.color}"/>`);
      let cy = y + 16;
      if (tt.length) {
        const t = textBlock(x + 16, cy, tt, 15, INK, 600);
        parts.push(t.svg);
        cy += t.h + 10;
      }
      parts.push(textBlock(x + 16, cy, tx, 14, INK).svg);
      break;
    }
    case "todo": {
      const rows = (it.items ?? []).map((i) => ({ i, lines: wrap(i.text, w - 58, 13) }));
      h = Math.max(h, 50 + rows.reduce((s, r) => s + r.lines.length * 17 + 8, 0));
      parts.push(card(h));
      parts.push(textBlock(x + 16, y + 14, wrap(it.title || "To-do", w - 32, 15, 2), 15, INK, 600).svg);
      let cy = y + 44;
      for (const r of rows) {
        parts.push(`<rect x="${x + 16}" y="${cy + 2}" width="13" height="13" fill="${r.i.done ? accent : "none"}" stroke="${r.i.done ? accent : "#bdbcb6"}"/>`);
        const t = textBlock(x + 38, cy, r.lines, 13, r.i.done ? "#9a9994" : INK);
        parts.push(t.svg);
        cy += t.h + 8;
      }
      break;
    }
    case "color": {
      if (it.style === "dot") {
        const d = Math.min(w, h - 50), c = it.color ?? accent;
        parts.push(`<circle cx="${x + w / 2}" cy="${y + d / 2}" r="${d / 2 - 0.5}" fill="${c}"${luminance(c) > 0.8 ? ` stroke="#cfcec8"` : ""}/>`);
        parts.push(textBlock(x + w / 2, y + d + 12, wrap(it.name ?? "", w + 40, 13, 1), 13, INK, 600, 1.3, FONT, ` text-anchor="middle"`).svg);
        parts.push(textBlock(x + w / 2, y + d + 31, [String(c).toUpperCase()], 11, MUTED, 400, 1.3, FONT, ` text-anchor="middle"`).svg);
        break;
      }
      parts.push(card(h));
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h * 0.7}" fill="${it.color ?? accent}"/>`);
      parts.push(textBlock(x + 12, y + 10, [String(it.color ?? "").toUpperCase()], 11, "#fff", 600).svg);
      parts.push(textBlock(x + 12, y + h * 0.7 + 10, wrap(it.name ?? "", w - 24, 13, 3), 13, INK).svg);
      break;
    }
    case "link": {
      const tt = wrap(it.title || it.url || "", w - 32, 14, 3);
      h = Math.max(h, 50 + tt.length * 19 + (it.text ? 36 : 0));
      parts.push(card(h));
      parts.push(textBlock(x + 16, y + 14, [String(it.url ?? "").replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)], 11, "#9a9994").svg);
      parts.push(textBlock(x + 16, y + 36, tt, 14, accent, 600).svg);
      if (it.text) parts.push(textBlock(x + 16, y + 40 + tt.length * 19, wrap(it.text, w - 32, 12, 2), 12, MUTED).svg);
      break;
    }
    case "video": {
      const info = parseVideo(it.video);
      parts.push(card(h, "#111"));
      parts.push(`<polygon points="${x + w / 2 - 12},${y + h / 2 - 16} ${x + w / 2 + 16},${y + h / 2} ${x + w / 2 - 12},${y + h / 2 + 16}" fill="#fff"/>`);
      parts.push(textBlock(x + 10, y + 10, [(info?.provider ?? "video").toUpperCase()], 10, "#bbb", 600).svg);
      if (it.caption) parts.push(textBlock(x + 10, y + h - 46, wrap(it.caption, w - 20, 12, 2), 12, "#fff", 600).svg);
      break;
    }
    case "text": {
      const px = it.fontSize ?? TEXT_PX[it.size ?? "md"] ?? 20;
      const pad = it.bg ? Math.max(16, Math.round(w * 0.08)) : 0;
      const raw = it.upper ? String(it.text ?? "").toUpperCase() : it.text ?? "";
      const lines = wrap(raw, w - pad * 2, px * 1.05);
      const lh = 1.15, th = px + (lines.length - 1) * px * lh;
      if (it.bg) {
        h = Math.max(h, th + pad * 2);
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${it.bg}"${luminance(it.bg) > 0.85 ? ` stroke="#d6d5cf"` : ""}/>`);
      }
      const anchor = it.align === "center" ? "middle" : it.align === "right" ? "end" : "start";
      const tx = anchor === "middle" ? x + w / 2 : anchor === "end" ? x + w - pad : x + pad;
      const ty = it.bg ? y + (h - th) / 2 - px * 0.15 : y;
      const extra = (anchor !== "start" ? ` text-anchor="${anchor}"` : "") + (it.tracking ? ` letter-spacing="${(it.tracking * px).toFixed(2)}"` : "");
      parts.push(textBlock(tx, ty, lines, px, it.color ?? INK, it.weight ?? (px >= 34 ? 600 : 400), lh, it.font ?? FONT, extra).svg);
      break;
    }
    case "type": {
      const fam = it.font ?? FONT, c = it.color ?? INK, ws = parseWeights(it.weights);
      if (it.bg) parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${it.bg}"/>`);
      const left = w * 0.42, p = it.bg ? 20 : 0;
      parts.push(textBlock(x + p, y + p, wrap(fam, left - p, 40 * 1.05, 2), 40, c, 500, 1.05, fam).svg);
      ws.slice(0, 5).forEach((wt, i) => parts.push(textBlock(x + left + p, y + p + 4 + i * 24, [WEIGHT_NAMES[wt] ?? String(wt)], 18, c, wt, 1.3, fam).svg));
      const big = Math.min(150, h * 0.42);
      parts.push(textBlock(x + p, y + h - big * 1.2 - 26, ["Aa"], big, c, 400, 1, fam).svg);
      parts.push(textBlock(x + left + p, y + h - 120, ["abcdefghijklmn", "opqrstuvwxyz", "ABCDEFGHIJKLMN", "OPQRSTUVWXYZ", "0123456789!?&"], 14, c, 400, 1.35, fam).svg);
      if (it.name) parts.push(textBlock(x + p, y + h - 14, [String(it.name).toUpperCase()], 10, MUTED, 600, 1.3, FONT, ` letter-spacing="1.2"`).svg);
      break;
    }
    case "divider": {
      parts.push(`<line x1="${x}" y1="${y + 1}" x2="${x + w}" y2="${y + 1}" stroke="${it.color && it.color !== INK ? it.color : "#bebdb7"}" stroke-width="1"/>`);
      if (it.text) parts.push(textBlock(x + w / 2, y + 12, [String(it.text).toUpperCase()], 10, MUTED, 600, 1.3, FONT, ` text-anchor="middle" letter-spacing="1.5"`).svg);
      break;
    }
    case "draw": {
      const sx = w / (it.vw || w), sy = h / (it.vh || h);
      const p = it.points ?? [];
      if (p.length >= 4) {
        let d = `M${x + p[0] * sx},${y + p[1] * sy}`;
        for (let i = 2; i + 1 < p.length; i += 2) d += ` L${x + p[i] * sx},${y + p[i + 1] * sy}`;
        parts.push(`<path d="${d}" fill="none" stroke="${it.color ?? INK}" stroke-width="${it.stroke ?? 4}" stroke-linecap="round" stroke-linejoin="round"/>`);
      }
      break;
    }
    case "shape": {
      const c = it.color ?? INK, sw = it.stroke ?? 4, fill = it.fill ?? "none";
      const s = sw / 2;
      if (it.shape === "rect") parts.push(`<rect x="${x + s}" y="${y + s}" width="${Math.max(0, w - sw)}" height="${Math.max(0, h - sw)}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`);
      else if (it.shape === "ellipse") parts.push(`<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${Math.max(0, w / 2 - s)}" ry="${Math.max(0, h / 2 - s)}" fill="${fill}" stroke="${c}" stroke-width="${sw}"/>`);
      else if (it.shape === "triangle") parts.push(`<polygon points="${x + w / 2},${y + s} ${x + w - s},${y + h - s} ${x + s},${y + h - s}" fill="${fill}" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>`);
      else {
        let x1 = it.flipX ? w : 0, x2 = it.flipX ? 0 : w, y1 = it.flipY ? h : 0, y2 = it.flipY ? 0 : h;
        if (it.axis === "h") y1 = y2 = h / 2;
        if (it.axis === "v") {
          x1 = x2 = w / 2;
          y1 = it.flipY ? h : 0;
          y2 = it.flipY ? 0 : h;
        }
        parts.push(`<line x1="${x + x1}" y1="${y + y1}" x2="${x + x2}" y2="${y + y2}" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`);
        if (it.shape === "arrow") {
          const ang = Math.atan2(y2 - y1, x2 - x1), hd = Math.max(12, sw * 3.5);
          parts.push(`<polyline points="${x + x2 - hd * Math.cos(ang - 0.45)},${y + y2 - hd * Math.sin(ang - 0.45)} ${x + x2},${y + y2} ${x + x2 - hd * Math.cos(ang + 0.45)},${y + y2 - hd * Math.sin(ang + 0.45)}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
        }
      }
      break;
    }
  }
  return { svg: parts.join(""), box: { x, y, w, h } };
}

/** `images`: Map of image src → data URI (fetched by the caller; missing ones draw as grey). */
export function moodSvg(board, images = new Map()) {
  const accent = board.accent || "#e0512b";
  const items = (board.mood?.items ?? []).map((it) => moodItem(it, accent, images));
  if (!items.length) return frame([{ x: 0, y: 0, w: 800, h: 300 }], MOOD_PAPER, textBlock(40, 120, ["Moodboard is empty"], 28, MUTED).svg, `${board.title} — moodboard`);
  return frame(items.map((i) => i.box), MOOD_PAPER, items.map((i) => i.svg).join(""), `${board.title} — moodboard`);
}

/** Kanban: one column per funnel stage. */
export function kanbanSvg(board) {
  const accent = board.accent || "#e0512b";
  const o = outline(board);
  const colW = 300, gap = 28;
  const parts = [];
  const boxes = [];
  o.stages.forEach(({ stage, items }, i) => {
    const x = i * (colW + gap);
    parts.push(textBlock(x, 0, [String(stage.step ?? i + 1).padStart(2, "0")], 30, accent).svg);
    parts.push(textBlock(x + 52, 6, wrap(plain(stage.title).toUpperCase(), colW - 52, 14, 2), 14, INK, 600).svg);
    let y = 60;
    for (const n of items) {
      const lines = wrap(n.title, colW - 28, 14);
      const tx = n.text ? wrap(n.text, colW - 28, 12, 6) : [];
      const h = 28 + lines.length * 18 + (tx.length ? tx.length * 16 + 6 : 0);
      parts.push(`<rect x="${x}" y="${y}" width="${colW}" height="${h}" fill="${n.kind === "video" ? "#111" : "#fff"}" stroke="#d6d5cf"/>`);
      parts.push(textBlock(x + 14, y + 12, lines, 14, n.kind === "video" ? "#fff" : INK, 600).svg);
      if (tx.length) parts.push(textBlock(x + 14, y + 16 + lines.length * 18, tx, 12, MUTED).svg);
      y += h + 10;
    }
    boxes.push({ x, y: 0, w: colW, h: y });
  });
  return frame(boxes.length ? boxes : [{ x: 0, y: 0, w: 600, h: 200 }], PAPER, parts.join(""), `${board.title} — kanban`);
}

function frame(boxes, bg, body, title) {
  const minX = Math.min(...boxes.map((b) => b.x)) - 60, minY = Math.min(...boxes.map((b) => b.y)) - 90;
  const maxX = Math.max(...boxes.map((b) => b.x + b.w)) + 60, maxY = Math.max(...boxes.map((b) => b.y + b.h)) + 60;
  const W = maxX - minX, H = maxY - minY;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${minX} ${minY} ${W} ${H}" width="${W}" height="${H}">` +
      `<defs><filter id="sh" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.12"/></filter></defs>` +
      `<rect x="${minX}" y="${minY}" width="${W}" height="${H}" fill="${bg}"/>` +
      textBlock(minX + 30, minY + 24, [title], 18, MUTED, 600).svg +
      body +
      `</svg>`,
    width: W,
    height: H,
    bounds: { x: minX, y: minY, w: W, h: H },
  };
}
