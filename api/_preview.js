// Board preview → PNG (resvg, no browser), for the MCP and /api/boards/:id?preview=…
import { Resvg } from "@resvg/resvg-js";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kanbanSvg, mapSvg, moodSvg } from "../shared/preview.js";
import { fontCssUrl, moodFonts } from "../shared/brand.js";

const FONTS = [
  fileURLToPath(new URL("./_fonts/Inter_400Regular.ttf", import.meta.url)),
  fileURLToPath(new URL("./_fonts/Inter_600SemiBold.ttf", import.meta.url)),
];

/** Moodboard images inlined as data URIs (resvg does not fetch). */
async function loadImages(board, origin) {
  const srcs = [...new Set((board.mood?.items ?? []).filter((i) => i.type === "image" && i.src).map((i) => i.src))].slice(0, 30);
  const out = new Map();
  await Promise.all(
    srcs.map(async (src) => {
      try {
        if (src.startsWith("data:image/")) return out.set(src, src);
        const url = src.startsWith("/") ? origin + src : src;
        if (!/^https?:\/\//.test(url)) return;
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 5000);
        const res = await fetch(url, { signal: ctl.signal });
        clearTimeout(timer);
        const type = res.headers.get("content-type") ?? "";
        if (!res.ok || !/^image\/(png|jpe?g|webp|gif)/.test(type)) return;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 4_000_000) return;
        out.set(src, `data:${type.split(";")[0]};base64,${buf.toString("base64")}`);
      } catch {
        /* drawn as a grey box */
      }
    }),
  );
  return out;
}

/* Brand fonts (Google Fonts / Fontshare) as TTF files in the temp dir, so resvg
   can draw moodboard type in the real family. Cached per process. */
const fontCache = new Map();
const FONT_DIR = join(tmpdir(), "xlide-fonts");

async function fetchText(url, ms = 5000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    // No browser User-Agent: Google Fonts then serves TrueType, which resvg reads.
    const res = await fetch(url, { signal: ctl.signal });
    return res.ok ? await res.text() : null;
  } finally {
    clearTimeout(timer);
  }
}

async function familyFiles({ family, weights }) {
  const key = `${family}|${weights.join(",")}`;
  if (fontCache.has(key)) return fontCache.get(key);
  const job = (async () => {
    let css = await fetchText(fontCssUrl(family, weights).url);
    if (!css) css = await fetchText(fontCssUrl(family).url); // a weight the family lacks fails the whole request
    if (!css) return [];
    const urls = [...new Set([...css.matchAll(/url\((['"]?)([^'")]+\.ttf)\1\)/g)].map((m) => (m[2].startsWith("//") ? "https:" + m[2] : m[2])))].slice(0, 10);
    await mkdir(FONT_DIR, { recursive: true });
    const files = await Promise.all(
      urls.map(async (u) => {
        try {
          const file = join(FONT_DIR, createHash("sha1").update(u).digest("hex") + ".ttf");
          const ctl = new AbortController();
          const timer = setTimeout(() => ctl.abort(), 6000);
          const res = await fetch(u, { signal: ctl.signal });
          clearTimeout(timer);
          if (!res.ok) return null;
          await writeFile(file, Buffer.from(await res.arrayBuffer()));
          return file;
        } catch {
          return null;
        }
      }),
    );
    return files.filter(Boolean);
  })().catch(() => []);
  fontCache.set(key, job);
  return job;
}

async function loadFonts(board) {
  const list = moodFonts(board.mood?.items).slice(0, 8);
  return (await Promise.all(list.map(familyFiles))).flat();
}

/** view: "map" | "moodboard" | "kanban". Returns { png, width, height, bounds }. */
export async function renderPreview(board, view = "map", origin = "", maxWidth = 1600) {
  const frame = view === "moodboard" ? moodSvg(board, await loadImages(board, origin)) : view === "kanban" ? kanbanSvg(board) : mapSvg(board);
  const width = Math.round(Math.min(Math.max(400, maxWidth), 2400, Math.max(frame.width, 400)));
  const r = new Resvg(frame.svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: [...FONTS, ...(view === "moodboard" ? await loadFonts(board) : [])], loadSystemFonts: false, defaultFontFamily: "Inter" },
    background: "#ffffff",
  });
  const img = r.render();
  return { png: img.asPng(), width: img.width, height: img.height, bounds: frame.bounds };
}
