// GET ?code=<shortcode>&type=reel|p|tv -> { author, author_url, title }
import { instagramAuthor } from "../_instagram.js";
import { hasRedis, redis } from "../_redis.js";

export default async function handler(req, res) {
  const code = String(req.query.code ?? "");
  const type = String(req.query.type ?? "reel");
  const key = `xlide:ig:${code}`;
  try {
    if (hasRedis) {
      const [hit] = await redis(["GET", key]);
      if (hit) {
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.json(JSON.parse(hit));
      }
    }
    const out = await instagramAuthor(code, type);
    if (hasRedis) await redis(["SET", key, JSON.stringify(out), "EX", 60 * 60 * 24 * 60]);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json(out);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(e?.message ?? e) });
  }
}
