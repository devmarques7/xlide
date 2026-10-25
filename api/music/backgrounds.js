// GET ?q=<search> -> { videos: [{ id, thumb, url, duration, credit, page }] } from Pexels.
import { noStore } from "../_redis.js";
import { searchBackgrounds } from "../_music.js";

export default async function handler(req, res) {
  noStore(res);
  try {
    res.json(await searchBackgrounds(req.query.q, process.env.PEXELS_API_KEY));
  } catch (e) {
    res.status(502).json({ error: "pexels_failed", detail: String(e?.message ?? e), videos: [] });
  }
}
