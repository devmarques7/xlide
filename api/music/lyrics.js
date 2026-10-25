// GET ?url=<YouTube URL or id>&lang=<preferred caption language> -> { title, author, lines[] }
import { noStore } from "../_redis.js";
import { getLyrics } from "../_music.js";

export default async function handler(req, res) {
  noStore(res);
  try {
    res.json(await getLyrics(req.query.url, req.query.lang));
  } catch (e) {
    res.status(502).json({ error: "youtube_failed", detail: String(e?.message ?? e) });
  }
}
