// One function for the music helpers (the Vercel Hobby plan allows 12 functions):
//   GET  /api/music/lyrics?url=<YouTube URL or id>&lang=<caption language> -> { title, author, lines[] }
//   POST /api/music/translate { lines: string[], target: "nl", source?: "auto" } -> { lines: string[] }
//   GET  /api/music/backgrounds?q=<search> -> { videos: [...] } from Pexels
//   GET  /api/music/lyrics?url=…&format=srt -> a letra com tempos em SRT (download)
//   POST /api/music/song { youtube_url, lyrics?, lang?, translate_to?, lines_per_slide?, title? } -> cria a música (deck de letra) com os tempos
import { noStore } from "../_redis.js";
import { requireActor, runAs } from "../_auth.js";
import { callLiveTool } from "../_live.js";
import { getLyrics, searchBackgrounds, toSrt, translateLines } from "../_music.js";

export default async function handler(req, res) {
  noStore(res);
  const action = String(req.query.action ?? "");
  if (action === "song") {
    if (req.method !== "POST") return res.status(405).end();
    const actor = await requireActor(req, res, "edit");
    if (!actor) return;
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    try {
      return res.json(await runAs(actor, () => callLiveTool("create_song", body)));
    } catch (e) {
      return res.status(400).json({ error: "song_failed", detail: String(e?.message ?? e) });
    }
  }
  if (action === "lyrics" && req.query.format === "srt") {
    try {
      const r = await getLyrics(req.query.url, req.query.lang);
      if (!r.lines?.length || !r.times) return res.status(404).json({ error: r.error || "no_timing" });
      const name = String(r.title || r.id || "letra").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "letra";
      res.setHeader("Content-Type", "application/x-subrip; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${name}.srt"`);
      return res.send(toSrt(r.lines, r.times));
    } catch (e) {
      return res.status(502).json({ error: "youtube_failed", detail: String(e?.message ?? e) });
    }
  }
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
