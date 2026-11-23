// Brand sheets on the moodboard: real fonts (Google Fonts / Fontshare), colour
// dots, type specimens, text and colour applications. Pure functions shared by
// the app (font links), the MCP (brand_sheet) and the PNG preview (font files).

/** Fontshare families (ITF). Everything else is looked up on Google Fonts. */
const FONTSHARE = new Set([
  "satoshi", "clash-display", "clash-grotesk", "general-sans", "switzer", "cabinet-grotesk", "zodiak", "gambetta", "erode",
  "sentient", "boska", "chillax", "panchang", "supreme", "ranade", "synonym", "author", "bespoke-serif", "bespoke-sans",
  "bespoke-slab", "tanker", "telma", "pally", "excon", "array", "stardom", "khand-fs", "rowan", "britney", "plus-jakarta-sans-fs",
  "melodrama", "neco", "bonny", "hoover", "technor", "quilon", "nippo", "familjen-grotesk-fs", "amulya", "aktura", "pilcrow-rounded",
]);

export const WEIGHT_NAMES = { 100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black" };

/** A safe font family name ("Space Grotesk"), or undefined. */
export function cleanFamily(v) {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return /^[A-Za-z0-9][A-Za-z0-9 \-]{0,59}$/.test(s) ? s : undefined;
}

/** "300, 400,700" | [300, 700] → [300, 400, 700] (sorted, 100–900). */
export function parseWeights(v, fallback = [400, 700]) {
  const list = (Array.isArray(v) ? v : String(v ?? "").split(/[\s,;]+/))
    .map((n) => Math.round(Number(n) / 100) * 100)
    .filter((n) => n >= 100 && n <= 900);
  const out = [...new Set(list)].sort((a, b) => a - b);
  return out.length ? out : fallback;
}

/** Where a family's CSS lives. `weights` omitted = the family's default style only. */
export function fontCssUrl(family, weights) {
  const slug = family.toLowerCase().replace(/\s+/g, "-");
  if (FONTSHARE.has(slug)) return { source: "fontshare", url: `https://api.fontshare.com/v2/css?f[]=${slug}@${(weights ?? [400]).join(",")}&display=swap` };
  const fam = encodeURIComponent(family).replace(/%20/g, "+");
  return { source: "google", url: `https://fonts.googleapis.com/css2?family=${fam}${weights ? `:wght@${weights.join(";")}` : ""}&display=swap` };
}

/** Every family (with the weights it is used in) on a board's moodboard. */
export function moodFonts(items) {
  const map = new Map();
  for (const it of items ?? []) {
    const fam = cleanFamily(it.font);
    if (!fam) continue;
    const set = map.get(fam) ?? new Set();
    if (it.type === "type") parseWeights(it.weights).forEach((w) => set.add(w));
    set.add(it.weight ?? 400);
    if (it.type === "text" && it.title) set.add(700);
    map.set(fam, set);
  }
  return [...map].map(([family, w]) => ({ family, weights: [...w].sort((a, b) => a - b) }));
}

/* ───────── colour ───────── */

const hex6 = (c) => (/^#[0-9a-f]{6}$/i.test(c ?? "") ? c : /^#[0-9a-f]{3}$/i.test(c ?? "") ? "#" + [...c.slice(1)].map((x) => x + x).join("") : null);

export function luminance(c) {
  const h = hex6(c);
  if (!h) return 0.5;
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** The palette colour that reads best on `bg` (falls back to near-black / white). */
export function bestOn(bg, palette) {
  const opts = palette.filter((c) => c.toLowerCase() !== bg.toLowerCase());
  let best = null, score = 0;
  for (const c of opts) {
    const k = contrast(bg, c);
    if (k > score) [best, score] = [c, k];
  }
  if (best && score >= 3) return best;
  return contrast(bg, "#161615") >= contrast(bg, "#ffffff") ? "#161615" : "#ffffff";
}

/* ───────── brand sheet (MCP: brand_sheet) ───────── */

const LABELS_EN = { logos: "Logotypes", palette: "Color palette", typography: "Typography", applications: "Applications", illustrations: "Illustrations" };

/**
 * Lays a full brand sheet out as moodboard items (ready for addMoodItems), in
 * labelled sections like a designer's brand board: logotypes, colour dots,
 * type specimens + a text application, colour/type applications, illustrations.
 * Every item carries group "brand" so a later sheet can replace it.
 */
export function brandSheet(brand, existing = []) {
  const W = Math.max(800, Math.min(2400, Number(brand?.width) || 1200));
  const gap = 32;
  const own = existing.filter((i) => i.group !== "brand");
  const x0 = Number.isFinite(brand?.x) ? brand.x : own.length ? Math.max(...own.map((i) => i.x + i.w)) + 160 : 0;
  let y = Number.isFinite(brand?.y) ? brand.y : own.length ? Math.min(...own.map((i) => i.y)) : 0;
  const L = { ...LABELS_EN, ...(brand?.labels ?? {}) };
  const ink = "#161615";
  const colors = (Array.isArray(brand?.colors) ? brand.colors : [])
    .map((c) => (typeof c === "string" ? { hex: c } : c))
    .map((c) => ({ hex: hex6(c?.hex ?? c?.color), name: String(c?.name ?? "").slice(0, 60) }))
    .filter((c) => c.hex)
    .slice(0, 10);
  const palette = colors.map((c) => c.hex);
  const primary = palette[0] ?? ink;
  const fonts = (Array.isArray(brand?.fonts) ? brand.fonts : [])
    .map((f) => (typeof f === "string" ? { family: f } : f))
    .map((f) => ({ family: cleanFamily(f?.family), role: String(f?.role ?? "").slice(0, 40), weights: parseWeights(f?.weights) }))
    .filter((f) => f.family)
    .slice(0, 4);
  const display = fonts[0]?.family;
  const body = fonts[1]?.family ?? display;
  const name = String(brand?.name ?? "").slice(0, 80);
  const items = [];
  const push = (it) => items.push({ group: "brand", ...it });
  const divider = (label) => {
    push({ type: "divider", text: label.toUpperCase(), color: ink, x: x0, y, w: W, h: 40 });
    y += 40 + gap * 1.5;
  };

  /* Logotypes: the wordmark(s) set in the display font, then any logo images. */
  const marks = Array.isArray(brand?.wordmarks) && brand.wordmarks.length ? brand.wordmarks : name ? [{ text: name }] : [];
  const logos = (Array.isArray(brand?.logos) ? brand.logos : []).filter((l) => typeof l?.src === "string" && /^(https?:|data:image\/|\/)/.test(l.src)).slice(0, 6);
  if (marks.length || logos.length) {
    let x = x0, rowH = 0;
    const markW = marks.length > 1 ? (W - gap * (marks.length - 1)) / marks.length : W * (logos.length ? 0.55 : 1);
    for (const m of marks.slice(0, 3)) {
      const text = String(m?.text ?? name).slice(0, 80);
      const px = Math.max(36, Math.min(120, Math.floor((markW / Math.max(4, text.length)) * 1.6)));
      push({ type: "text", text, font: cleanFamily(m?.font) ?? display, weight: m?.weight ?? 700, fontSize: px, color: hex6(m?.color) ?? primary, align: marks.length > 1 ? "center" : "left", x, y, w: markW, h: Math.round(px * 1.4) });
      x += markW + gap;
      rowH = Math.max(rowH, Math.round(px * 1.4));
    }
    if (logos.length) {
      const lw = (x0 + W - x - gap * (logos.length - 1)) / logos.length;
      for (const l of logos) {
        push({ type: "image", src: l.src, caption: l.caption ? String(l.caption).slice(0, 80) : undefined, x, y, w: Math.max(120, lw), h: Math.max(120, Math.min(220, lw)) });
        x += lw + gap;
        rowH = Math.max(rowH, Math.min(220, lw));
      }
    }
    y += rowH + gap;
    divider(L.logos);
  }

  /* Colour palette: dots with name + hex underneath. */
  if (colors.length) {
    const d = Math.min(150, Math.floor((W - gap * (colors.length - 1)) / colors.length));
    const step = (W - d) / Math.max(1, colors.length - 1);
    colors.forEach((c, i) => push({ type: "color", style: "dot", color: c.hex, name: c.name || undefined, x: Math.round(x0 + (colors.length > 1 ? i * step : 0)), y, w: d, h: d + 58 }));
    y += d + 58 + gap;
    divider(L.palette);
  }

  /* Typography: one specimen per family, then a heading + paragraph in the brand fonts. */
  if (fonts.length) {
    const per = Math.min(2, fonts.length);
    const sw = (W - gap * (per - 1)) / per;
    fonts.forEach((f, i) => {
      if (i && i % per === 0) y += 340 + gap;
      push({ type: "type", font: f.family, weights: f.weights.join(","), name: f.role || undefined, color: primary === "#ffffff" ? ink : primary, x: Math.round(x0 + (i % per) * (sw + gap)), y, w: Math.round(sw), h: 340 });
    });
    y += 340 + gap;
    const head = brand?.heading ?? (name ? `This is ${name}` : "Heading");
    const para = brand?.paragraph ?? "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.";
    push({ type: "text", text: String(head).slice(0, 200), font: display, weight: 700, fontSize: 40, color: primary, x: x0, y, w: W, h: 60 });
    y += 60 + 12;
    const paraH = Math.ceil(String(para).length / Math.max(20, W / (18 * 0.55))) * 28 + 8;
    push({ type: "text", text: String(para).slice(0, 1200), font: body, weight: 400, fontSize: 18, color: ink, x: x0, y, w: Math.min(W, 760), h: paraH });
    y += paraH + gap;
    divider(L.typography);
  }

  /* Applications: each colour as a ground, type in the colour that reads best on it. */
  const custom = Array.isArray(brand?.applications) ? brand.applications : [];
  const auto = palette.map((bg, i) => ({ bg, text: brand?.tagline || name || "Aa", font: i % 2 && body !== display ? body : display }));
  const apps = (custom.length ? custom : auto).slice(0, 8);
  if (apps.length && (palette.length || custom.length)) {
    const cols = Math.min(4, apps.length);
    const tw = (W - gap * (cols - 1)) / cols;
    apps.forEach((a, i) => {
      if (i && i % cols === 0) y += tw + gap;
      const bg = hex6(a?.bg) ?? palette[i % Math.max(1, palette.length)] ?? "#ffffff";
      const fg = hex6(a?.color) ?? bestOn(bg, palette.length ? palette : [ink, "#ffffff"]);
      const text = String(a?.text ?? brand?.tagline ?? name).slice(0, 160);
      const px = Math.max(20, Math.min(64, Math.floor((tw * 2.2) / Math.max(6, text.length))));
      push({ type: "text", text, font: cleanFamily(a?.font) ?? display, weight: a?.weight ?? 700, fontSize: px, color: fg, bg, align: "center", x: Math.round(x0 + (i % cols) * (tw + gap)), y, w: Math.round(tw), h: Math.round(tw) });
    });
    y += tw + gap;
    divider(L.applications);
  }

  /* Illustrations / patterns: images the caller supplies. */
  const ills = (Array.isArray(brand?.illustrations) ? brand.illustrations : []).filter((l) => typeof l?.src === "string" && /^(https?:|data:image\/|\/)/.test(l.src)).slice(0, 8);
  if (ills.length) {
    const cols = Math.min(4, ills.length);
    const iw = (W - gap * (cols - 1)) / cols;
    ills.forEach((l, i) => {
      if (i && i % cols === 0) y += iw + gap;
      push({ type: "image", src: l.src, caption: l.caption ? String(l.caption).slice(0, 80) : undefined, x: Math.round(x0 + (i % cols) * (iw + gap)), y, w: Math.round(iw), h: Math.round(iw) });
    });
    y += iw + gap;
    divider(L.illustrations);
  }
  return items;
}
