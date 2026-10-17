import { needRedis, noStore, redis } from "../_redis.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res)) return;
  const { id } = req.query;
  const key = `xlide:p:${id}`;
  if (req.method === "GET") {
    const [v] = await redis(["GET", key]);
    return v ? res.json(JSON.parse(v)) : res.status(404).json({ error: "not_found" });
  }
  if (req.method === "PUT") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || body.id !== id) return res.status(400).json({ error: "invalid" });
    await redis(["SET", key, JSON.stringify(body)], ["SADD", "xlide:ids", id]);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await redis(["DEL", key], ["SREM", "xlide:ids", id]);
    return res.json({ ok: true });
  }
  res.status(405).end();
}
