import { hasRedis, noStore } from "./_redis.js";

export default function handler(_req, res) {
  noStore(res);
  res.json({ name: "XLIDE", lan: [], port: 443, platform: "vercel", realtime: hasRedis ? "poll" : "none" });
}
