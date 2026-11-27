// Catálogo de fontes do XLIDE: Fontsource (Google Fonts + outras abertas, ~2100 famílias), Fontshare (~100)
// e as fontes que a equipe importou (arquivo .woff2/.ttf/.otf por link), guardadas em xlide_kv "fonts".
// GET /api/fonts?q=lex&category=serif&limit=60 → { total, fonts: [{ family, category, source, weights }] }
// O MCP usa fontCatalog/searchFonts/addFont (search_fonts, add_font).
import { hasSupabase, rest } from "./_supabase.js";

const CATS = { "sans-serif": "sans", serif: "serif", display: "display", handwriting: "script", monospace: "mono", Sans: "sans", Serif: "serif", Display: "display", Handwritten: "script", Script: "script", Slab: "serif" };
let cache = null, cacheAt = 0;

async function getJson(url) {
  const r = await fetch(url, { headers: { "User-Agent": "XLIDE (https://xlide.vercel.app)" }, signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error(`${new URL(url).host}_${r.status}`);
  return r.json();
}

export async function customFonts() {
  if (!hasSupabase) return [];
  const r = await rest(`xlide_kv?select=value&key=eq.fonts`).catch(() => []);
  return (r[0]?.value?.custom || []).filter((f) => f && f.family && /^https:\/\//.test(f.url || ""));
}

/** Todas as famílias, sem repetir (Fontshare ganha de Fontsource no mesmo nome; importadas ganham de todas). */
export async function fontCatalog() {
  if (!cache || Date.now() - cacheAt > 6 * 3600e3) {
    const [fsrc, fshare] = await Promise.all([
      getJson("https://api.fontsource.org/v1/fonts").catch(() => []),
      getJson("https://api.fontshare.com/v2/fonts?limit=500").then((j) => j.fonts || j || []).catch(() => []),
    ]);
    const map = new Map();
    for (const f of fsrc) map.set(f.family.toLowerCase(), { family: f.family, category: CATS[f.category] || "sans", source: f.type === "google" ? "google" : "fontsource", id: f.id, weights: f.weights });
    for (const f of fshare) {
      const w = [...new Set((f.styles || []).map((s) => s.weight?.weight || s.weight).filter((n) => typeof n === "number"))].sort((a, b) => a - b);
      map.set(String(f.name).toLowerCase(), { family: f.name, category: CATS[f.category] || "sans", source: "fontshare", id: f.slug, weights: w.length ? w : [400, 700] });
    }
    if (map.size > 100) { cache = [...map.values()].sort((a, b) => a.family.localeCompare(b.family)); cacheAt = Date.now(); }
    else cache = cache || [...map.values()];
  }
  const custom = (await customFonts()).map((f) => ({ family: f.family, category: f.category || "display", source: "custom", url: f.url, weights: [f.weight || 400] }));
  const names = new Set(custom.map((f) => f.family.toLowerCase()));
  return [...custom, ...cache.filter((f) => !names.has(f.family.toLowerCase()))];
}

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, " ").trim();
/** Busca por nome (começo do nome primeiro) e categoria (sans, serif, display, script, mono). */
export async function searchFonts({ q = "", category = "", source = "", limit = 60 } = {}) {
  const all = await fontCatalog(), n = norm(q);
  let L = all.filter((f) => (!category || f.category === category) && (!source || f.source === source) && (!n || norm(f.family).includes(n)));
  if (n) L.sort((a, b) => Number(norm(b.family).startsWith(n)) - Number(norm(a.family).startsWith(n)) || a.family.length - b.family.length);
  return { total: L.length, of: all.length, fonts: L.slice(0, Math.max(1, Math.min(500, Number(limit) || 60))) };
}

/** Importa uma fonte por link (arquivo .woff2/.woff/.ttf/.otf em https) para todos usarem. */
export async function addFont({ family, url, category = "display", weight = 400 }) {
  const fam = String(family || "").trim().replace(/\s+/g, " ");
  if (!/^[\p{L}0-9][\p{L}0-9 \-]{0,59}$/u.test(fam)) throw new Error("Nome de fonte inválido.");
  if (!/^https:\/\/\S+\.(woff2?|ttf|otf)(\?\S*)?$/i.test(String(url || ""))) throw new Error("Mande o link https de um arquivo .woff2, .woff, .ttf ou .otf.");
  const r = await rest(`xlide_kv?select=value&key=eq.fonts`).catch(() => []);
  const v = r[0]?.value || {};
  const custom = (v.custom || []).filter((f) => f.family.toLowerCase() !== fam.toLowerCase());
  custom.unshift({ family: fam, url, category, weight: Number(weight) || 400, added: new Date().toISOString() });
  await rest("xlide_kv", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ key: "fonts", value: { ...v, custom } }]) });
  return { family: fam, url, category, source: "custom" };
}

export default async function handler(req, res) {
  try {
    const out = await searchFonts({ q: req.query.q, category: req.query.category, source: req.query.source, limit: req.query.limit || (req.query.all ? 5000 : 60) });
    res.setHeader("Cache-Control", req.query.q ? "public, s-maxage=3600" : "public, s-maxage=600, stale-while-revalidate=86400");
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: "fonts_failed", message: String(e.message || e) });
  }
}
