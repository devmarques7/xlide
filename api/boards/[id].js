import { boardStore } from "../_boards.js";
import { needRedis, noStore } from "../_redis.js";

export default async function handler(req, res) {
  noStore(res);
  if (needRedis(res)) return;
  const { id } = req.query;
  if (req.method === "GET") {
    const b = await boardStore.get(id);
    return b ? res.json(b) : res.status(404).json({ error: "not_found" });
  }
  if (req.method === "PUT") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || body.id !== id || !Array.isArray(body.nodes)) return res.status(400).json({ error: "invalid" });
    await boardStore.put(body);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    await boardStore.del(id);
    return res.json({ ok: true });
  }
  res.status(405).end();
}
