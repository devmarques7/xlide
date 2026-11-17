// Board preview → PNG (resvg, no browser), for the MCP and /api/boards/:id?preview=…
import { Resvg } from "@resvg/resvg-js";
import { fileURLToPath } from "node:url";
import { kanbanSvg, mapSvg, moodSvg } from "../shared/preview.js";

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

/** view: "map" | "moodboard" | "kanban". Returns { png, width, height, bounds }. */
export async function renderPreview(board, view = "map", origin = "", maxWidth = 1600) {
  const frame = view === "moodboard" ? moodSvg(board, await loadImages(board, origin)) : view === "kanban" ? kanbanSvg(board) : mapSvg(board);
  const width = Math.round(Math.min(Math.max(400, maxWidth), 2400, Math.max(frame.width, 400)));
  const r = new Resvg(frame.svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Inter" },
    background: "#ffffff",
  });
  const img = r.render();
  return { png: img.asPng(), width: img.width, height: img.height, bounds: frame.bounds };
}
