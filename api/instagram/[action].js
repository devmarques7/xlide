// One function for Instagram (the Vercel Hobby plan allows 12 functions):
//   GET /api/instagram/author?code=<shortcode>&type=reel|p|tv -> { author, author_url, title }  (public oEmbed, cached 60 days)
//   GET /api/instagram/profile?user=<username> -> profile numbers from Meta Business Discovery (cached 6 h)
import { igGraphConfigured, instagramAuthor, instagramProfile } from "../_instagram.js";
import { hasRedis, redis } from "../_redis.js";

export default async function handler(req, res) {
  const action = String(req.query.action ?? "");
  if (action === "author") {
    const code = String(req.query.code ?? "");
    const key = `xlide:ig:${code}`;
    try {
      if (hasRedis) {
        const [hit] = await redis(["GET", key]);
        if (hit) {
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.json(JSON.parse(hit));
        }
      }
      const out = await instagramAuthor(code, String(req.query.type ?? "reel"));
      if (hasRedis) await redis(["SET", key, JSON.stringify(out), "EX", 60 * 60 * 24 * 60]);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(out);
    } catch (e) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({ error: String(e?.message ?? e) });
    }
  }
  if (action === "profile") {
    res.setHeader("Cache-Control", "no-store");
    if (!igGraphConfigured()) return res.status(501).json({ error: "not_configured" });
    const user = String(req.query.user ?? "").toLowerCase();
    const key = `xlide:igp:${user}`;
    try {
      if (hasRedis) {
        const [hit] = await redis(["GET", key]);
        if (hit) return res.json(JSON.parse(hit));
      }
      const out = await instagramProfile(user);
      if (hasRedis) await redis(["SET", key, JSON.stringify(out), "EX", 60 * 60 * 6]);
      return res.json(out);
    } catch (e) {
      const msg = String(e?.message ?? e);
      return res.status(msg === "not_business" ? 404 : 502).json({ error: msg });
    }
  }
  res.status(404).json({ error: "not_found" });
}
