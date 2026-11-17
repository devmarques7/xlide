// One function for the music helpers (the Vercel Hobby plan allows 12 functions):
//   GET  /api/music/lyrics?url=<YouTube URL or id>&lang=<caption language> -> { title, author, lines[] }
//   POST /api/music/translate { lines: string[], target: "nl", source?: "auto" } -> { lines: string[] }
//   GET  /api/music/backgrounds?q=<search> -> { videos: [...] } from Pexels
import { noStore } from "../_redis.js";
import { getLyrics, searchBackgrounds, translateLines } from "../_music.js";

export default async function handler(req, res) {
  noStore(res);
  const action = String(req.query.action ?? "");
  if (action === "lyrics") {
    try {
      return res.json(await getLyrics(req.query.url, req.query.lang));
    } catch (e) {
      return res.status(502).json({ error: "youtube_failed", detail: String(e?.message ?? e) });
    }
  }
  if (action === "translate") {
    if (req.method !== "POST") return res.status(405).end();
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const lines = Array.isArray(body?.lines) ? body.lines.map(String).slice(0, 400) : null;
    if (!lines || !/^[a-zA-Z-]{2,8}$/.test(body?.target ?? "")) return res.status(400).json({ error: "bad_request" });
    try {
      return res.json({ lines: await translateLines(lines, body.target, body.source || "auto") });
    } catch (e) {
      return res.status(502).json({ error: "translate_failed", detail: String(e?.message ?? e) });
    }
  }
  if (action === "backgrounds") {
    try {
      return res.json(await searchBackgrounds(req.query.q, process.env.PEXELS_API_KEY));
    } catch (e) {
      return res.status(502).json({ error: "pexels_failed", detail: String(e?.message ?? e), videos: [] });
    }
  }
  res.status(404).json({ error: "not_found" });
}
