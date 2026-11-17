// GET ?user=<username> -> profile numbers from Meta's Business Discovery (cached 6 h).
import { igGraphConfigured, instagramProfile } from "../_instagram.js";
import { hasRedis, noStore, redis } from "../_redis.js";

export default async function handler(req, res) {
  noStore(res);
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
    res.json(out);
  } catch (e) {
    const msg = String(e?.message ?? e);
    res.status(msg === "not_business" ? 404 : 502).json({ error: msg });
  }
}
