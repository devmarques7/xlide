import { backend, hasRedis, noStore, redis } from "./_redis.js";

/** Health check: tells the app (and you) whether live sync can work here. */
export default async function handler(_req, res) {
  noStore(res);
  let ok = false;
  let error;
  if (hasRedis) {
    try {
      const [pong] = await redis(["PING"]);
      ok = pong === "PONG";
    } catch (e) {
      error = String(e?.message ?? e);
    }
  }
  res.json({ name: "XLIDE", lan: [], port: 443, platform: "vercel", storage: backend, realtime: ok ? "poll" : "none", error });
}
